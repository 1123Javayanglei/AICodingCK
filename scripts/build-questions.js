// 从各科目的题目 txt 生成 questions.js
// 用法: node scripts/build-questions.js
//
// 加新科目有两种方式:
//   1. 把 txt 放进 题库/ 目录, 文件名即科目名 (如 题库/数据结构.txt), 会自动收录;
//   2. 或在下面的 SUBJECTS 里显式加一行 (可指定文件路径和显示名)。
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'questions.js');
const AUTO_DIR = '题库';

// 显式登记的科目; id 会作为数据键, 改名会导致已存的错题/成绩对不上
// writing 是可选的作文文件, 格式和选择题不同 (见 parseEssays)
// extra 是要并进这个科目的其他题库文件: 它们自己不占一个科目页, 题并进来按题型分组。
// 每个 extra 要写 prefix (分节 id 前缀), 否则和主文件的 lx1/lx2 撞号
const SUBJECTS = [
  {
    id: 'english', name: '英语', file: '整理后的题目.txt', writing: '英语作文.txt',
    extra: [
      { file: '题库/阅读理解.txt', prefix: 'r' },
      { file: '题库/单句翻译.txt', prefix: 'st' },
    ],
  },
];

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

// 题型识别: 分节标题里出现关键词就用对应题型, 都没出现则默认单选题。
// 想加新题型, 在标题里写上关键词即可, 例如:
//   练习四（多选题）  /  练习五（判断题）  /  练习六（填空题）
//
// score: 这种题默认几分 (写作/翻译另有算法, 不在表里);
// exam:  false 表示这种题不进模拟考试 (阅读理解带短文, 单句翻译走首页勾选框, 只做练习);
// options: 这种题有几个选项, 不写就是四个 (单句翻译只有 A/B/C 三个);
// text: 没有选项也没有答案的文字题, 答案写在 `参考答案：` 行里, 由做题的人自评 (填空、名词解释)。
const TYPE_RULES = [
  { id: 'single', name: '单选题', keywords: ['单选', '单项选择'], score: 1 },
  { id: 'multi', name: '多选题', keywords: ['多选', '多项选择'], score: 1, exam: false },
  { id: 'judge', name: '判断题', keywords: ['判断'], score: 1, exam: false },
  { id: 'blank', name: '填空题', keywords: ['填空'], score: 1, exam: false, text: true },
  { id: 'term', name: '名词解释', keywords: ['名词解释'], score: 6, exam: false, text: true },
  { id: 'reading', name: '阅读理解', keywords: ['阅读', '完形'], score: 2, exam: false },
  { id: 'sentrans', name: '单句翻译', keywords: ['单句翻译'], score: 2, exam: false, options: 3 },
];
const DEFAULT_TYPE = 'single';

// 翻译题的题干一律以这句话开头, 解析器靠它认题型。
// 这种题没有选项也没有 A-D 答案, 原文写在题干下面的行里, 参考译文写 `参考译文：...`
const TRANSLATE_STEM = /^把上面用方括号/;

// 文字题 (填空 / 名词解释) 的参考答案行, 如: 参考答案：数据
// 和选择题的 `答案：X` 是两回事: 答案可能是任意文字, 也没法机判, 由做题的人自评
const TEXT_REF = /^参考答案[:：]\s*(.*)$/;

// txt 顶部可以写一行 "# 设置: 选择每题 2 分, 翻译每题 5 分, 不加入模拟考试",
// 不写就是全部 1 分、进模拟考试。
// typeScores 是"按题型给分"("单选每题 2 分, 填空每题 2 分, 名词解释每题 6 分"),
// randomPick 是首页"随机抽取 N 题"的题数 ("随机抽 10 题")。
const DEFAULT_SETTINGS = { examEnabled: true, mcqScore: 1, translateScore: 5, typeScores: {}, randomPick: 0 };

// 原始 txt 里标点前后常有多余空格 / 中文分号, 统一收拾一下
function cleanText(s) {
  return String(s)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[;；]\s*$/, '')
    .trim();
}

function detectType(headerText) {
  for (const rule of TYPE_RULES) {
    if (rule.keywords.some((k) => headerText.includes(k))) return rule.id;
  }
  return DEFAULT_TYPE;
}

// 按 id 找题型规则
function typeRule(typeId) {
  return TYPE_RULES.filter(function (r) { return r.id === typeId; })[0];
}

// 这个题型该有几个选项: 表里没写 options 就是 4 个 (单句翻译表里写了 3)
function expectedOptions(typeId) {
  const rule = typeRule(typeId);
  return (rule && rule.options) || 4;
}

/* ---------------- 解析单个科目的 txt ---------------- */
function parseSubject(filePath, subjectName, opts) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  const sections = [];
  const questions = [];
  const passages = [];
  // typeScores 是对象, 得单独给一份, 否则各科目共用同一个 (DEFAULT_SETTINGS 会被改)
  const settings = Object.assign({}, DEFAULT_SETTINGS, { typeScores: {} });
  let mcqScoreSet = false;   // 设置行里明确写了"选择每题 N 分"才盖掉题型自带的分值
  let currentSection = null;
  let currentPassage = null;
  // 分节 id 前缀。默认 lx, 并进别的科目的文件换一个前缀, 免得和主文件撞号
  const idPrefix = (opts && opts.prefix) || 'lx';
  // 上一行写进了哪个位置, 缩进续行要接在它后面 (见下面 "缩进 = 续行")
  let lastSlot = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // 注释行整行忽略。设置行也从这里读, 所以写在文件哪个位置都行
    if (line.charAt(0) === '#') {
      const setMatch = line.match(/^#\s*设置\s*[:：]\s*(.*)$/);
      if (setMatch) {
        const body = setMatch[1];
        if (/不加入模拟考试|不进模拟考试|不参加模拟考试/.test(body)) settings.examEnabled = false;
        const mcq = body.match(/选择[^0-9]*(\d+)\s*分/);
        const tl = body.match(/翻译[^0-9]*(\d+)\s*分/);
        if (mcq) { settings.mcqScore = parseInt(mcq[1], 10); mcqScoreSet = true; }
        if (tl) settings.translateScore = parseInt(tl[1], 10);

        // 按题型给分: "单选每题 2 分, 填空每题 2 分, 名词解释每题 6 分"。
        // 老键"选择/翻译"走上面两条, 这里跳过; 认不出来的词忽略 (不报错, 免得
        // 一句话里掺个无关短语就构建不了)
        const picked = body.match(/([^\d,，]+?)每题\s*(\d+)\s*分/g) || [];
        for (const item of picked) {
          const m = item.match(/([^\d,，]+?)每题\s*(\d+)\s*分/);
          const word = m[1].trim();
          if (/翻译|选择/.test(word)) continue;
          const id = detectType(word);
          if (id === DEFAULT_TYPE && word.indexOf(typeRule(DEFAULT_TYPE).keywords[0]) < 0) continue;
          settings.typeScores[id] = parseInt(m[2], 10);
        }

        // 首页"随机抽取 N 题"的 N
        const rp = body.match(/随机抽[^0-9]*(\d+)\s*题/);
        if (rp) settings.randomPick = parseInt(rp[1], 10);
      }
      continue;
    }

    // 缩进 = 续行: 行首缩进两个及以上空格, 表示这一行接在上一行后面, 不新起一段。
    // 这样 txt 里可以按 ~100 列折行, 页面上仍然是完整的一段 (见题库/说明.md)。
    if (/^\s{2,}\S/.test(raw)) {
      const prev = questions.length ? questions[questions.length - 1] : null;
      if (lastSlot === 'passage' && currentPassage && currentPassage.text.length) {
        currentPassage.text[currentPassage.text.length - 1] += ' ' + cleanText(line);
      } else if (lastSlot === 'source' && prev) {
        prev.source += (prev.source ? ' ' : '') + cleanText(line);
      } else if (lastSlot === 'ref' && prev) {
        prev.ref += (prev.ref ? ' ' : '') + cleanText(line);
      } else if (lastSlot === 'stem' && prev) {
        prev.stem += ' ' + line;
      } else {
        throw new Error('缩进续行前面没有可接的内容: ' + line);
      }
      continue;
    }

    // 分节标题,如: 练习一（原书第 9–20 题，仅保留已作答题目）
    const secMatch = line.match(/^(练习[一二三四五六七八九十\d]+)/);
    if (secMatch) {
      const name = secMatch[1];
      const descMatch = line.slice(name.length).match(/[（(](.*)[）)]/);
      const numMatch = name.match(/\d+/);
      const no = numMatch ? parseInt(numMatch[0], 10) : CN_NUM[name.replace('练习', '')];
      currentSection = {
        id: idPrefix + no,
        name,
        desc: descMatch ? descMatch[1].trim() : '',
        type: detectType(line),
      };
      sections.push(currentSection);
      currentPassage = null;   // 短文不跨节
      lastSlot = null;
      continue;
    }

    // 文章标记,如: 【A】。后面到第一道题之间的行都是这篇短文的正文,
    // 题号从 1 重新开始, 所以篇号要编进题目 id, 否则同一节里会重号
    const passMatch = line.match(/^【([A-Za-z])】$/);
    if (passMatch) {
      if (!currentSection) throw new Error('文章标记前缺少分节标题: ' + line);
      const key = passMatch[1].toUpperCase();
      currentPassage = {
        id: currentSection.id + '-' + key,
        section: currentSection.id,
        key: key,
        text: [],
      };
      passages.push(currentPassage);
      lastSlot = null;
      continue;
    }

    // 题号行: 13. ____ you want ...
    const qMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (qMatch) {
      if (!currentSection) throw new Error('题目前缺少分节标题: ' + line);
      const stem = qMatch[2];
      const q = {
        id: (currentPassage ? currentPassage.id : currentSection.id) + '-' + qMatch[1],
        section: currentSection.id,
        type: currentSection.type,
        no: parseInt(qMatch[1], 10),
        stem: stem,
        options: [],
        answer: null,
      };
      if (currentPassage) q.passage = currentPassage.id;
      // 翻译题: 没有选项和答案, 原文和参考译文写在题干下面的行里
      if (TRANSLATE_STEM.test(stem)) {
        q.sub = 'translate';
        q.source = '';
      }
      // 填空/名词解释: 题干下面只写一行 `参考答案：...`, 前端让人对着自评
      const rule = typeRule(currentSection.type);
      if (rule && rule.text) {
        q.sub = 'text';
        q.ref = '';
      }
      questions.push(q);
      lastSlot = 'stem';
      continue;
    }

    // 参考译文行: 参考译文：电鳗是一块……
    const refMatch = line.match(/^参考译文[:：]\s*(.*)$/);
    if (refMatch) {
      const q = questions[questions.length - 1];
      if (!q) throw new Error('参考译文行前面没有题目: ' + line);
      q.ref = q.ref ? q.ref + ' ' + refMatch[1] : refMatch[1];
      lastSlot = 'ref';
      continue;
    }

    // 参考答案行 (填空/名词解释): 参考答案：数据。
    // 没这一支的话它会掉到最下面的兜底, 被悄悄拼进上一题题干
    const textRefMatch = line.match(TEXT_REF);
    if (textRefMatch) {
      const q = questions[questions.length - 1];
      if (!q) throw new Error('参考答案行前面没有题目: ' + line);
      if (q.sub !== 'text') throw new Error('参考答案行只用于填空/名词解释题: ' + line);
      q.ref = q.ref ? q.ref + ' ' + textRefMatch[1] : textRefMatch[1];
      lastSlot = 'ref';
      continue;
    }

    // 答案行: 答案：A
    const ansMatch = line.match(/^答案：([A-D])$/);
    if (ansMatch) {
      const q = questions[questions.length - 1];
      if (!q) throw new Error('答案行前面没有题目: ' + line);
      q.answer = ansMatch[1].charCodeAt(0) - 65;
      lastSlot = null;
      continue;
    }

    // 选项行(全部选项在一行,以 3 个以上空格分隔); 也兼容单选项分行的格式
    const optMatch = line.match(/^([A-D])\.\s+(.*)$/);
    if (optMatch) {
      const q = questions[questions.length - 1];
      if (!q) throw new Error('选项行前面没有题目: ' + line);
      const idx = optMatch[1].charCodeAt(0) - 65;
      const parts = line.split(/\s{3,}/).map((s) => s.replace(/^[A-D]\.\s*/, ''));
      if (parts.length === expectedOptions(q.type)) {
        q.options = parts; // 一行含全部选项
      } else {
        q.options[idx] = parts[0]; // 单选项分行
      }
      lastSlot = null;
      continue;
    }

    // 剩下的是折行的正文, 按当前位置归位
    const cur = questions.length ? questions[questions.length - 1] : null;
    // 短文正文优先判断: 标记之后、这篇的第一道题之前都算正文。要是排在翻译题
    // 后面, 上一篇的翻译题会把下一篇的正文当成自己的原文吞掉。
    const inPassageBody = currentPassage && (!cur || cur.passage !== currentPassage.id);
    if (inPassageBody) {
      currentPassage.text.push(cleanText(line));
      lastSlot = 'passage';
    } else if (cur && cur.sub === 'translate') {
      // 翻译题的原文
      cur.source += (cur.source ? ' ' : '') + cleanText(line);
      lastSlot = 'source';
    } else if (cur && cur.sub === 'text') {
      // 文字题底下只该有 "参考答案：" 行 (上面各支已经处理过)。串到这儿多半是把
      // 答案写成了选择题的 `答案：X`, 或者忘了写 "参考答案：" 四个字
      throw new Error('填空/名词解释题底下只认 "参考答案：" 行, 这一行接不上去: ' + line);
    } else if (cur) {
      // 题干的续行
      cur.stem += ' ' + line;
      lastSlot = 'stem';
    } else {
      // 以前这种行会被悄悄接到上一题题干上(甚至跨节), 出的错很难查, 直接报出来
      throw new Error('这一行既不属于短文也不属于任何题目: ' + line);
    }
  }

  // 分值统一在解析完之后贴, 这样 "# 设置:" 行写在文件哪个位置都算数。
  // 优先用"按题型给分"(# 设置: 单选每题 2 分), 没写就按题型默认分(下面 TYPE_RULES 里写),
  // 再没有就是 "# 设置: 选择每题 N 分" 的 N。
  for (const q of questions) {
    if (q.sub === 'translate') q.score = settings.translateScore;
    else if (settings.typeScores[q.type] != null) q.score = settings.typeScores[q.type];
    else {
      const rule = typeRule(q.type);
      q.score = (rule && rule.score != null && !mcqScoreSet) ? rule.score : settings.mcqScore;
    }
  }

  // 校验
  const errors = [];
  if (!sections.length) errors.push('没有解析到任何分节标题');
  if (!questions.length) errors.push('没有解析到任何题目');
  for (const q of questions) {
    if (q.sub === 'translate') {
      if (!q.source || !q.source.trim()) errors.push(`${q.id} 翻译题没写到原文`);
      if (!q.ref || !q.ref.trim()) errors.push(`${q.id} 翻译题缺少 "参考译文：" 行`);
      continue;
    }
    if (q.sub === 'text') {
      // 没有选项也没有答案, 参考答案是唯一的对照标准, 缺了这题就等于没答案
      if (!q.ref || !q.ref.trim()) errors.push(`${q.id} 填空/名词解释题缺少 "参考答案：" 行`);
      if (q.answer !== null) errors.push(`${q.id} 文字题不该有 "答案：" 行 (要写 "参考答案：")`);
      continue;
    }
    const want = expectedOptions(q.type);
    if (q.options.length !== want) errors.push(`${q.id} 选项数量异常 (${q.options.length}, 期望 ${want})`);
    else if (q.options.some((o) => !o || !o.trim())) errors.push(`${q.id} 有空选项`);
    if (q.answer === null) errors.push(`${q.id} 缺少答案`);
  }
  const secIds = {};
  for (const s of sections) {
    if (secIds[s.id]) errors.push(`分节 id 重复: ${s.id}`);
    secIds[s.id] = true;
  }
  const passIds = {};
  for (const p of passages) {
    if (passIds[p.id]) errors.push(`短文标记重复: ${p.id}`);
    passIds[p.id] = true;
    if (!p.text.length) errors.push(`${p.id} 短文没有正文`);
  }
  for (const q of questions) {
    if (q.passage && !passIds[q.passage]) errors.push(`${q.id} 指向了不存在的短文 ${q.passage}`);
  }
  if (errors.length) {
    const err = new Error(errors.join('\n    '));
    err.details = errors;
    throw err;
  }

  // 汇总本题库出现过的题型, 按首次出现顺序排列。exam: false 的题型前台不摆进考试
  const types = [];
  for (const s of sections) {
    if (!types.some((t) => t.id === s.type)) {
      const rule = TYPE_RULES.find((r) => r.id === s.type) || { id: s.type, name: s.type };
      const t = { id: rule.id, name: rule.name };
      if (rule.exam === false) t.exam = false;
      types.push(t);
    }
  }

  return { name: subjectName, settings, types, sections, passages, questions };
}

/* ---------------- 解析作文文件 ----------------
   格式:
     1.You are to write a composition on the topic " Media and Shopping ."
     (1）第一个要点
     (2) 第二个要点
     2.下一篇作文...
   题号行开新篇, (n) 开头的行是提纲要点, 其余行接在题干后面。   */
function parseEssays(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const essays = [];
  let cur = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const point = line.match(/^[（(]\s*(\d+)\s*[）)]\s*(.*)$/);
    if (point && cur) {
      cur.outline.push(cleanText(point[2]));
      continue;
    }

    const head = line.match(/^(\d+)\s*[.、]\s*(.*)$/);
    if (head) {
      cur = {
        id: 'w' + head[1],
        no: parseInt(head[1], 10),
        prompt: head[2].trim(),
        outline: [],
        title: '',
        minWords: 120,
      };
      essays.push(cur);
      continue;
    }

    if (cur) cur.prompt += ' ' + line;   // 题干换行的情况
  }

  const warnings = [];
  for (const e of essays) {
    // 标题: 题干里第一个引号短语
    const t = e.prompt.match(/[“”"]([^“”"]+)[“”"]/);
    if (t) {
      e.title = cleanText(t[1]).replace(/[.,;:!?]+$/, '');
    } else {
      warnings.push(`${e.id} 没能从题干里认出标题, 首页只会显示题号`);
    }
    // 字数要求, 如 "at least 120 words"
    const w = e.prompt.match(/(\d+)\s*words/i);
    if (w) e.minWords = parseInt(w[1], 10);
    if (!e.outline.length) warnings.push(`${e.id} 没有提纲要点, 内容分只能靠关键词兜底`);
  }

  if (!essays.length) throw new Error('没有解析到任何作文题目');

  return { essays, warnings };
}

/* ---------------- 收集要生成的科目 ---------------- */
function discoverSubjects() {
  const list = SUBJECTS.slice();
  const dir = path.join(ROOT, AUTO_DIR);

  // 写进 extra 的文件已经有了归宿, 不能再自成一科
  const claimed = {};
  list.forEach((s) => (s.extra || []).forEach((e) => { claimed[e.file.replace(/\\/g, '/')] = true; }));

  let files = [];
  try {
    files = fs.readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith('.txt'))
      .sort();
  } catch (e) {
    files = [];   // 题库目录不存在就跳过, 不算错误
  }

  for (const f of files) {
    const rel = AUTO_DIR + '/' + f;
    if (claimed[rel]) continue;   // 已指定并进某个科目
    const id = path.basename(f, path.extname(f));
    if (list.some((s) => s.id === id)) continue;   // 已显式登记, 不重复收录
    list.push({ id, name: id, file: rel });
  }
  return list;
}

/* ---------------- 生成 ---------------- */
function stringify(value, indent) {
  const pad = ' '.repeat(indent);
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : pad + line))
    .join('\n');
}

function main() {
  const subjects = discoverSubjects();
  if (!subjects.length) {
    console.error('没有找到任何题库 txt 文件');
    process.exit(1);
  }

  // 先把每个文件都解析一遍, 把问题一次报全, 而不是碰到第一个错就退出
  const banks = [];
  const failures = [];
  const warnings = [];
  for (const s of subjects) {
    const filePath = path.join(ROOT, s.file);
    if (!fs.existsSync(filePath)) {
      failures.push(`[${s.name}] 文件不存在: ${s.file}`);
      continue;
    }
    let bank;
    try {
      bank = parseSubject(filePath, s.name);
    } catch (err) {
      failures.push(`[${s.name}] ${s.file} 解析失败:\n    ` + err.message);
      continue;
    }

    bank.essays = [];
    if (s.writing) {
      const wPath = path.join(ROOT, s.writing);
      if (!fs.existsSync(wPath)) {
        failures.push(`[${s.name}] 作文文件不存在: ${s.writing}`);
        continue;
      }
      try {
        const parsed = parseEssays(wPath);
        bank.essays = parsed.essays;
        parsed.warnings.forEach((w) => warnings.push(`[${s.name}] ` + w));
      } catch (err) {
        failures.push(`[${s.name}] ${s.writing} 解析失败:\n    ` + err.message);
        continue;
      }
    }

    // 附带题库并进来 (SUBJECTS 里的 extra)。题目排在主文件后面, 前台按题型分组,
    // 各文件的分节 id 用各自前缀错开
    let extraFailed = false;
    for (const e of (s.extra || [])) {
      const ePath = path.join(ROOT, e.file);
      if (!fs.existsSync(ePath)) {
        failures.push(`[${s.name}] 附带题库不存在: ${e.file}`);
        extraFailed = true;
        continue;
      }
      let eb;
      try {
        eb = parseSubject(ePath, s.name, { prefix: e.prefix });
      } catch (err) {
        failures.push(`[${s.name}] ${e.file} 解析失败:\n    ` + err.message);
        extraFailed = true;
        continue;
      }
      bank.sections = bank.sections.concat(eb.sections);
      bank.passages = bank.passages.concat(eb.passages);
      bank.questions = bank.questions.concat(eb.questions);
      for (const t of eb.types) {
        if (!bank.types.some(function (x) { return x.id === t.id; })) bank.types.push(t);
      }
    }
    if (extraFailed) continue;

    banks.push({ id: s.id, bank });
  }

  if (failures.length) {
    // 有任何一个科目有问题就整体不生成, 避免悄悄丢掉一个科目
    console.error('发现 ' + failures.length + ' 个问题, 未生成文件:\n');
    failures.forEach((f) => console.error('  ' + f + '\n'));
    process.exit(1);
  }
  warnings.forEach((w) => console.warn('警告: ' + w));

  const body = banks.map(({ id, bank }) =>
    `  ${JSON.stringify(id)}: {\n` +
    `    name: ${JSON.stringify(bank.name)},\n` +
    `    settings: ${stringify(bank.settings, 4)},\n` +
    `    types: ${stringify(bank.types, 4)},\n` +
    `    sections: ${stringify(bank.sections, 4)},\n` +
    `    passages: ${stringify(bank.passages, 4)},\n` +
    `    questions: ${stringify(bank.questions, 4)},\n` +
    `    essays: ${stringify(bank.essays, 4)}\n` +
    `  }`
  ).join(',\n');

  fs.writeFileSync(OUT,
    '// 本文件由 scripts/build-questions.js 自动生成, 请勿手动编辑。\n' +
    '// 修改题目请编辑对应的 txt, 然后运行: node scripts/build-questions.js\n' +
    'window.QUESTION_BANKS = {\n' + body + '\n};\n', 'utf8');

  console.log('生成完成: questions.js');
  for (const { id, bank } of banks) {
    const perType = {};
    for (const q of bank.questions) perType[q.type] = (perType[q.type] || 0) + 1;
    console.log(`  [${id}] ${bank.name}: ${bank.questions.length} 道题, ${bank.sections.length} 个分节`);
    for (const t of bank.types) console.log(`      ${t.name}: ${perType[t.id]} 道`);
    if (bank.passages.length) console.log(`      短文: ${bank.passages.length} 篇`);
    const full = bank.questions.reduce((a, q) => a + q.score, 0);
    if (full !== bank.questions.length) {
      // 分值不统一时列一下分布, 别只说一句"每题 N 分"把人带偏
      const dist = {};
      bank.questions.forEach((q) => { dist[q.score] = (dist[q.score] || 0) + 1; });
      const detail = Object.keys(dist).sort((a, b) => a - b)
        .map((s) => `${s} 分 ${dist[s]} 题`).join(' / ');
      console.log(`      满分 ${full} 分 (${detail})` +
        (bank.settings.examEnabled ? '' : ' · 不进模拟考试'));
    }
    if (bank.essays.length) {
      console.log(`      作文: ${bank.essays.length} 篇`);
      bank.essays.forEach((e) =>
        console.log(`        ${e.id} ${e.title || '(无标题)'} · ${e.outline.length} 个要点 · 不少于 ${e.minWords} 词`));
    }
  }
}

main();
