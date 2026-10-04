// 在临时目录里搭一个假的工程根, 完整跑一遍 build-questions.js
// 覆盖: 自动扫描 题库/ 目录、CJK 文件名、解析报错、多科目输出
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const REAL = path.join(__dirname, '..');
const ROOT = path.join(__dirname, 'qbtest');
const NODE = process.execPath;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra != null ? '  → ' + extra : '')); }
}
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function build() {
  try {
    const out = execFileSync(NODE, ['scripts/build-questions.js'], { cwd: ROOT, encoding: 'utf8' });
    return { code: 0, out: out };
  } catch (err) {
    return { code: err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}
function readBanks() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'questions.js'), 'utf8'), sandbox);
  return sandbox.window.QUESTION_BANKS;
}

/* ================= 场景 1: 只有显式登记的文件, 缺文件应报错 ================= */
rmrf(ROOT);
fs.mkdirSync(path.join(ROOT, 'scripts'), { recursive: true });
fs.copyFileSync(path.join(REAL, 'scripts/build-questions.js'), path.join(ROOT, 'scripts/build-questions.js'));

let r = build();
ok(r.code === 1, '缺文件时以退出码 1 结束', r.code);
ok(r.out.indexOf('整理后的题目.txt') >= 0, '错误信息里点出是哪个文件', r.out.trim().slice(0, 120));
ok(!fs.existsSync(path.join(ROOT, 'questions.js')), '报错时不生成 questions.js');

/* ================= 场景 2: 英语 + 题库/ 下的自动收录 ================= */
fs.copyFileSync(path.join(REAL, '整理后的题目.txt'), path.join(ROOT, '整理后的题目.txt'));
fs.copyFileSync(path.join(REAL, '英语作文.txt'), path.join(ROOT, '英语作文.txt'));
fs.mkdirSync(path.join(ROOT, '题库'), { recursive: true });

// 故意做几个容易被误判成"科目"的干扰项
fs.writeFileSync(path.join(ROOT, '题库', '说明.md'), '不是 txt, 应被忽略\n', 'utf8');
fs.writeFileSync(path.join(ROOT, '题库', '.gitkeep'), '', 'utf8');

fs.writeFileSync(path.join(ROOT, '题库', '数据结构.txt'), [
  '练习一（第 1–3 题）',
  '1. 栈的操作特点是 ____。',
  'A. 先进先出        B. 后进先出        C. 随机存取        D. 顺序存取',
  '答案：B',
  '2. 队列的操作特点是 ____。',
  'A. 先进先出        B. 后进先出        C. 随机存取        D. 顺序存取',
  '答案：A',
  '3. 二叉树第 3 层最多有 ____ 个结点。',
  'A. 2        B. 4        C. 8        D. 16',
  '答案：B',
  '',
  '练习二（判断题）',
  '1. 顺序表插入的时间复杂度是 O(1)。',
  'A. 正确        B. 错误        C. 不确定        D. 以上都不对',
  '答案：B',
].join('\n'), 'utf8');

// 英语的 SUBJECTS 里声明了 extra: 题库/阅读理解.txt, 这个文件必须存在, 而且不能被当成独立科目
fs.writeFileSync(path.join(ROOT, '题库', '阅读理解.txt'), [
  '练习一（阅读理解）',
  '【A】',
  'The electric eel is a strange fish.',
  'It lives in the rivers of South America.',
  '1. What is the electric eel?',
  'A. A fish        B. A bird        C. A snake        D. A plant',
  '答案：A',
  '2. Where does it live?',
  'A. In the sea        B. In rivers        C. In lakes        D. On land',
  '答案：B',
  '6. 把上面用方括号 [ ] 标出的那一段译成中文。',
  'The electric eel can produce',
  'electricity.',
  '参考译文：电鳗能产生电。',
  '【B】',
  'Another short passage here.',
  '1. What is this?',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：C',
].join('\n'), 'utf8');

// 单句翻译并进英语: 每题 3 个选项 (A/B/C), 题型自带 2 分
fs.writeFileSync(path.join(ROOT, '题库', '单句翻译.txt'), [
  '练习一（单句翻译）',
  '1. Thousands of reports have been scanned in.',
  'A. 甲',
  'B. 乙',
  'C. 丙',
  '答案：B',
  '2. Police can use big data.',
  'A. 甲',
  'B. 乙',
  'C. 丙',
  '答案：C',
  '',
  '练习二（单句翻译）',
  '1. Friends play an important part in our life.',
  'A. 甲',
  'B. 乙',
  'C. 丙',
  '答案：A',
].join('\n'), 'utf8');

r = build();
ok(r.code === 0, '两个科目都解析成功', r.out);

if (r.code === 0) {
  const banks = readBanks();
  ok(Object.keys(banks).join(',') === 'english,数据结构',
    'SUBJECTS 里的英语在前, 自动收录的在后 (阅读理解/单句翻译被 english 认领, 不单独成科目)',
    Object.keys(banks).join(','));
  ok(banks.english.questions.length === 47, '英语 40 题 + 阅读理解 4 题 + 单句翻译 3 题 = 47',
    banks.english.questions.length);
  ok(banks.english.types.map((t) => t.id).join(',') === 'single,reading,sentrans',
    '阅读理解和单句翻译的题型都并进英语的题型表', JSON.stringify(banks.english.types));
  ok(banks.english.types[1].exam === false, '阅读理解题型标了不进模拟考试',
    JSON.stringify(banks.english.types[1]));
  ok(banks.english.types[2].exam === false, '单句翻译题型标了不进模拟考试 (走首页勾选框)',
    JSON.stringify(banks.english.types[2]));
  ok(banks.english.sections.map((s) => s.id).join(',') === 'lx1,lx2,lx3,r1,st1,st2',
    '附带题库的分节加了 r/st 前缀, 不跟英语的 lx* 撞', banks.english.sections.map((s) => s.id).join(','));
  // 单句翻译: 3 个选项是题型自带的要求 (TYPE_RULES 里写的 options: 3), 分值 2 分
  const st = banks.english.questions.filter((q) => q.type === 'sentrans');
  ok(st.length === 3, '单句翻译 3 题', st.length);
  ok(st.every((q) => q.options.length === 3), '单句翻译每题 3 个选项',
    st.map((q) => q.options.length).join(','));
  ok(st[0].id === 'st1-1' && st[2].id === 'st2-1', '题目 id 带 st 前缀',
    st.map((q) => q.id).join(','));
  ok(st[0].score === 2, '单句翻译每题 2 分 (题型自带, 不用 # 设置 行)', st[0].score);
  ok(banks.english.passages.length === 2, '短文也并了进来', banks.english.passages.length);
  ok(banks['数据结构'].name === '数据结构', '科目名取自文件名', banks['数据结构'].name);
  ok(banks['数据结构'].questions.length === 4, '数据结构 4 题', banks['数据结构'].questions.length);
  ok(banks['数据结构'].questions[0].options.length === 4 &&
     banks['数据结构'].questions[0].options[1] === '后进先出', '选项切分正确',
     JSON.stringify(banks['数据结构'].questions[0].options));
  ok(banks['数据结构'].questions[2].answer === 1, '答案正确落位', banks['数据结构'].questions[2].answer);
  ok(banks['数据结构'].types.map((t) => t.id).join(',') === 'single,judge',
    '同一科目内混合题型都能识别', banks['数据结构'].types.map((t) => t.id).join(','));
  ok(banks['数据结构'].questions[3].type === 'judge', '判断题被标成 judge',
    banks['数据结构'].questions[3].type);
  ok(banks['数据结构'].sections[1].name === '练习二', '分节名解析正确', banks['数据结构'].sections[1].name);
  ok(banks['数据结构'].questions[0].id === 'lx1-1', '题目 id 规则不变', banks['数据结构'].questions[0].id);
  ok(banks.english.questions[0].id === 'lx1-13', '英语 id 没有被加前缀', banks.english.questions[0].id);
  // 作文: 标题、提纲、字数要求都得从题干里抠出来
  const es = banks.english.essays || [];
  ok(es.length === 2, '英语 2 篇作文', es.length);
  ok(es[0].id === 'w1' && es[1].id === 'w2', '作文 id 是 w1/w2', es.map((e) => e.id).join(','));
  ok(es[0].title === 'Media and Shopping', '作文标题从引号里提取', es[0].title);
  ok(es[1].title === 'Some Aged People Like to Live Alone', '第二篇标题也对', es[1].title);
  ok(es[0].outline.length === 3, '中文提纲 3 条', es[0].outline.length);
  ok(es[1].outline.length === 3, '英文提纲 3 条', es[1].outline.length);
  ok(es[0].minWords === 120 && es[1].minWords === 120, '字数要求 120', es.map((e) => e.minWords).join(','));
  ok(!banks['数据结构'].essays || banks['数据结构'].essays.length === 0,
    '没配作文的科目不会凭空多出 essays', JSON.stringify(banks['数据结构'].essays));
}

/* ================= 场景 3: 一个文件坏了, 不能连累别的科目 ================= */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '1. 进程和线程的区别是 ____。',
  'A. 没关系        B. 共享地址空间        C. 不共享        D. 不知道',
  '答案：C',
  '2. 这题忘了写答案',
  'A. 甲        B. 乙        C. 丙        D. 丁',
].join('\n'), 'utf8');
const before = fs.readFileSync(path.join(ROOT, 'questions.js'), 'utf8');
r = build();
ok(r.code === 1, '坏文件导致退出码 1', r.code);
ok(r.out.indexOf('操作系统') >= 0, '错误里点名是操作系统的文件', r.out.trim().slice(0, 200));
ok(r.out.indexOf('lx1-2') >= 0 && r.out.indexOf('缺少答案') >= 0,
  '报出具体是哪道题的问题', r.out.trim().slice(0, 200));
ok(fs.readFileSync(path.join(ROOT, 'questions.js'), 'utf8') === before,
  '解析失败时保留上一次的 questions.js, 不会被写坏');

/* ================= 场景 4: 修好之后恢复正常 ================= */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '1. 进程和线程的区别是 ____。',
  'A. 没关系        B. 共享地址空间        C. 不共享        D. 不知道',
  '答案：C',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '修好后能生成', r.out);
if (r.code === 0) {
  const banks = readBanks();
  ok(Object.keys(banks).length === 3, '三个科目都在', Object.keys(banks).join(','));
  ok(banks['操作系统'].questions.length === 1, '操作系统 1 题');
}

/* ================= 场景 5: 选项分行写法 ================= */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '1. 分行的选项也应该能解析 ____。',
  'A. 选项甲',
  'B. 选项乙',
  'C. 选项丙',
  'D. 选项丁',
  '答案：D',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '分行选项能生成', r.out);
if (r.code === 0) {
  const q = readBanks()['操作系统'].questions[0];
  ok(q.options.join('|') === '选项甲|选项乙|选项丙|选项丁', '分行选项顺序正确', q.options.join('|'));
  ok(q.answer === 3, '分行选项的答案正确', q.answer);
}

/* ============ 场景 6: 阅读理解的题型分值 / id / 短文 (附在英语下面) ============ */
r = build();
ok(r.code === 0, '阅读理解能生成', r.out);
if (r.code === 0) {
  const b = readBanks().english;
  const rd = b.questions.filter((q) => q.type === 'reading');
  ok(rd.length === 4, '英语里挑得出 4 道阅读题', rd.length);
  ok(rd.map((q) => q.id).join(',') === 'r1-A-1,r1-A-2,r1-A-6,r1-B-1',
    '短文里的题号编进了 id (每篇都从 1 开始, 否则会重号)',
    rd.map((q) => q.id).join(','));
  ok(rd.every((q) => b.sections.filter((s) => s.id === q.section)[0].type === 'reading'),
    '阅读题的 section 挂的是阅读分节');
  ok(rd[0].passage === 'r1-A' && rd[3].passage === 'r1-B',
    '题目挂到了各自的短文上', rd[0].passage + '/' + rd[3].passage);
  ok(rd[0].score === 2 && rd[1].score === 2, '选择题 2 分 (题型自带, 不用 # 设置 行)',
    rd[0].score + '/' + rd[1].score);
  ok(b.questions[0].score === 1, '英语单选题仍是 1 分, 没被阅读带偏', b.questions[0].score);
  const tl = rd[2];
  ok(tl.sub === 'translate' && tl.score === 5, '翻译题被认出来且计 5 分',
    tl.sub + '/' + tl.score);
  ok(tl.source === 'The electric eel can produce electricity.', '原文续行接起来了', tl.source);
  ok(tl.ref === '电鳗能产生电。', '参考译文落位', tl.ref);
  ok(b.passages.length === 2, '2 篇短文', b.passages.length);
  ok(b.passages[0].id === 'r1-A' && b.passages[0].key === 'A', '短文 id / 篇号',
    b.passages[0].id + '/' + b.passages[0].key);
  ok(b.passages[0].text.join(' ') === 'The electric eel is a strange fish. It lives in the rivers of South America.',
    '短文正文按段收好, 没把题干的续行混进去', b.passages[0].text.join(' '));
  ok(b.passages[1].text.join(' ') === 'Another short passage here.',
    '第二篇正文没被上一篇的翻译题吞掉', b.passages[1].text.join(' '));
  ok(b.questions.length === 47 && b.questions[0].id === 'lx1-13',
    '阅读题/单句翻译接在英语单选题后面, 老题的 id 没变',
    b.questions.length + '/' + b.questions[0].id);
}

/* ============ 场景 7: 翻译题缺参考译文 / 游离行都要报错 ============ */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '1. 正常题目 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
  '2. 把上面用方括号 [ ] 标出的那一段译成中文。',
  'Some English here.',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1, '翻译题缺"参考译文："时报错', r.code);
ok(r.out.indexOf('参考译文') >= 0 && r.out.indexOf('lx1-2') >= 0,
  '报错点出是哪道翻译题', r.out.trim().slice(0, 200));

fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '这行不属于任何题目, 也不在任何短文里',
  '1. 正常题目 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1, '游离的正文行不再被悄悄粘到题干上', r.code);
ok(r.out.indexOf('既不属于短文也不属于任何题目') >= 0, '报错说明了原因',
  r.out.trim().slice(0, 200));

fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '1. 正常题目 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
].join('\n'), 'utf8');

/* ========== 场景 8: 缩进 = 续行 (txt 里折行用) + 独立科目仍能用 # 设置 ========== */
fs.writeFileSync(path.join(ROOT, '题库', '线性代数.txt'), [
  '# 设置: 选择每题 2 分, 翻译每题 5 分, 不加入模拟考试',
  '练习一（阅读理解）',
  '【A】',
  'First sentence of the paragraph.',
  '  continued on the next line.',
  '  and one more line.',
  '1. A question whose stem is',
  '  wrapped across lines?',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
  '6. 把上面用方括号 [ ] 标出的那一段译成中文。',
  'English source line one',
  '  and source line two.',
  '参考译文：第一行译文,',
  '  第二行译文。',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '缩进续行能正常生成', r.out);
if (r.code === 0) {
  const b = readBanks()['线性代数'];
  ok(b.passages[0].text.length === 1, '缩进行没在短文里多分出一个自然段', b.passages[0].text.length);
  ok(b.passages[0].text[0] === 'First sentence of the paragraph. continued on the next line. and one more line.',
    '短文续行按空格接回上一段', b.passages[0].text[0]);
  ok(b.questions[0].stem === 'A question whose stem is wrapped across lines?',
    '题干续行接回题干', b.questions[0].stem);
  ok(b.questions[1].source === 'English source line one and source line two.',
    '翻译原文续行接回原文', b.questions[1].source);
  ok(b.questions[1].ref === '第一行译文, 第二行译文。', '参考译文续行接回译文', b.questions[1].ref);
  // 独立科目 (没被 extra 认领) 的 # 设置 行照旧生效
  ok(b.settings.examEnabled === false && b.settings.mcqScore === 2 && b.settings.translateScore === 5,
    '独立科目的 # 设置 行照旧生效', JSON.stringify(b.settings));
  ok(b.questions[0].score === 2 && b.questions[1].score === 5, '设置行盖住题型自带的分值',
    b.questions[0].score + '/' + b.questions[1].score);
}

// 缩进却没有可接的内容 → 报错, 别猜
fs.writeFileSync(path.join(ROOT, '题库', '线性代数.txt'), [
  '练习一',
  '  一上来就缩进, 前面什么都没有',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1 && r.out.indexOf('缩进续行前面没有可接的内容') >= 0,
  '悬空的缩进行报错', r.out.trim().slice(0, 160));

/* ======== 场景 9: 单句翻译的选项数按题型校验 (3 个), 多写少写都报错 ======== */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一（单句翻译）',
  '1. 选项数写错的句子。',
  'A. 甲',
  'B. 乙',
  'C. 丙',
  'D. 丁',
  '答案：D',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1 && r.out.indexOf('选项数量异常 (4, 期望 3)') >= 0,
  '单句翻译写成 4 个选项会报错, 报错里写明期望 3 个', r.out.trim().slice(0, 200));

// 把上一步故意弄坏的线性代数修回来, 否则它会把整个构建拖失败
fs.writeFileSync(path.join(ROOT, '题库', '线性代数.txt'), [
  '练习一',
  '1. 正常题目 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
].join('\n'), 'utf8');
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一（单句翻译）',
  '1. 一行三个选项的写法也应该能解析 ____。',
  'A. 甲        B. 乙        C. 丙',
  '答案：C',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '单句翻译一行写三个选项能生成', r.out);
if (r.code === 0) {
  const q = readBanks()['操作系统'].questions[0];
  ok(q.options.join('|') === '甲|乙|丙' && q.answer === 2, '一行三选项切分正确',
    q.options.join('|') + '/' + q.answer);
}

/* ======== 场景 10: 填空/名词解释 (自评文字题) ======== */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一（填空题）',
  '1. 计算机能直接执行的程序是 ____。',
  '参考答案：机器语言程序',
  '2. 参考答案也可以折行, 题干也一样,',
  '  这是题干的第二行。',
  '参考答案：前半句,',
  '  后半句。',
  '',
  '练习二（名词解释）',
  '1. 数据结构',
  '参考答案：数据元素之间存在的一种或多种特定关系的集合。',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '填空/名词解释能生成', r.out);
if (r.code === 0) {
  const b = readBanks()['操作系统'];
  ok(b.types.map((t) => t.id).join(',') === 'blank,term', '两种文字题都认出来了',
    b.types.map((t) => t.id + ':' + t.name).join(','));
  const q1 = b.questions[0];
  ok(q1.sub === 'text' && q1.ref === '机器语言程序', '参考答案落位到 ref',
    q1.sub + '/' + q1.ref);
  ok(q1.stem === '计算机能直接执行的程序是 ____。',
    '题干干净 —— 参考答案没被悄悄拼进题干', q1.stem);
  ok(q1.options.length === 0 && q1.answer === null, '文字题没有选项, 也没有答案下标',
    q1.options.length + '/' + q1.answer);
  ok(q1.score === 1 && b.questions[2].score === 6, '题型默认分: 填空 1 分, 名词解释 6 分',
    q1.score + '/' + b.questions[2].score);
  ok(b.questions[2].stem === '数据结构' && b.questions[2].type === 'term',
    '名词解释的题干就是那个术语', b.questions[2].stem);
  ok(b.questions[1].stem === '参考答案也可以折行, 题干也一样, 这是题干的第二行。',
    '题干缩进续行', b.questions[1].stem);
  ok(b.questions[1].ref === '前半句, 后半句。', '参考答案缩进续行', b.questions[1].ref);
}

// 缺参考答案 → 报错 (文字题没有别的对照标准)
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一（填空题）',
  '1. 忘了写参考答案 ____。',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1 && r.out.indexOf('缺少 "参考答案：" 行') >= 0,
  '文字题缺参考答案时报错', r.out.trim().slice(0, 200));

// 底下接了行不属于任何位置的内容 → 报错, 不能猜
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一（填空题）',
  '1. 底下接了一行不该有的 ____。',
  '这一行谁也不是',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1 && r.out.indexOf('只认 "参考答案：" 行') >= 0,
  '文字题底下的游离行报错, 不会被当成题干续行', r.out.trim().slice(0, 200));

// 答案写成了选择题那一套 → 报错, 提示改写参考答案
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一（填空题）',
  '1. 答案写成了选择题的格式 ____。',
  '答案：A',
].join('\n'), 'utf8');
r = build();
ok(r.code === 1 && r.out.indexOf('文字题不该有 "答案：" 行') >= 0,
  '文字题里写"答案：A"报错并给出正确写法', r.out.trim().slice(0, 200));

fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '练习一',
  '1. 正常题目 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
].join('\n'), 'utf8');

/* ======== 场景 11: 按题型给分 + 随机抽 N 题 (数据结构那套 # 设置) ======== */
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '# 设置: 单选每题 2 分, 填空每题 2 分, 名词解释每题 6 分, 随机抽 10 题',
  '练习一（单选题）',
  '1. 单选一 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
  '练习二（填空题）',
  '1. 填空一 ____。',
  '参考答案：甲',
  '练习三（名词解释）',
  '1. 名词解释一',
  '参考答案：乙',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '按题型给分能生成', r.out);
if (r.code === 0) {
  const banks = readBanks();
  const b = banks['操作系统'];
  ok(b.settings.typeScores.single === 2 && b.settings.typeScores.blank === 2 &&
    b.settings.typeScores.term === 6, '三种题型的分值都读出来了',
    JSON.stringify(b.settings.typeScores));
  ok(b.settings.randomPick === 10, '"随机抽 10 题"读成 randomPick 10', b.settings.randomPick);
  ok(b.questions.map((x) => x.score).join(',') === '2,2,6', '每题分值跟着题型走',
    b.questions.map((x) => x.score).join(','));
  ok(b.settings.examEnabled === true, '没写"不加入模拟考试"就是进考试');
  // 另一个科目没写设置行, 不能被上一条的设置带到
  const c = banks['线性代数'];
  ok(JSON.stringify(c.settings.typeScores) === '{}' && !c.settings.randomPick,
    '没写设置行的科目不受影响', JSON.stringify(c.settings));
  ok(c.questions[0].score === 1, '没写设置行的单选还是 1 分', c.questions[0].score);
}

// 认不出来的词忽略 (不报错), 不影响别的题型
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '# 设置: 简答每题 8 分, 单选每题 3 分',
  '练习一',
  '1. 单选一 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '设置行里有认不出的题型也不报错', r.out);
if (r.code === 0) {
  const b = readBanks()['操作系统'];
  ok(b.questions[0].score === 3, '"单选每题 3 分"照样生效', b.questions[0].score);
  ok(b.settings.typeScores.single === 3 && !b.settings.typeScores.judge,
    '"简答"这种不认识的词不落进 typeScores', JSON.stringify(b.settings.typeScores));
}

// 老写法 (选择每题 N 分) 继续管用, 只是不进 typeScores
fs.writeFileSync(path.join(ROOT, '题库', '操作系统.txt'), [
  '# 设置: 选择每题 4 分',
  '练习一',
  '1. 单选一 ____。',
  'A. 甲        B. 乙        C. 丙        D. 丁',
  '答案：A',
].join('\n'), 'utf8');
r = build();
ok(r.code === 0, '老写法能生成', r.out);
if (r.code === 0) {
  const b = readBanks()['操作系统'];
  ok(b.questions[0].score === 4 && JSON.stringify(b.settings.typeScores) === '{}',
    '"选择每题 4 分"走老路, 不写进 typeScores',
    b.questions[0].score + '/' + JSON.stringify(b.settings.typeScores));
}

console.log('\n==== ' + pass + ' passed, ' + fail + ' failed ====');
rmrf(ROOT);
process.exit(fail ? 1 : 0);
