/* 刷题 —— 纯前端, 数据存 localStorage */
(function () {
  'use strict';

  /* ============ 题库 ============ */
  // window.QUESTION_BANKS = { english: { name, types, sections, questions }, ... }
  // 科目之间彻底隔离: 错题本、成绩记录都按科目分桶存放, 互不干扰。
  const BANKS = window.QUESTION_BANKS || {};
  const SUBJECTS = Object.keys(BANKS).map(function (id) {
    return { id: id, name: (BANKS[id] && BANKS[id].name) || id };
  });
  const SUBJECT_NAME = {};
  SUBJECTS.forEach(function (s) { SUBJECT_NAME[s.id] = s.name; });

  const LETTERS = ['A', 'B', 'C', 'D'];
  const MAX_SAMPLE = 20;    // "随机抽题"最多抽多少道

  // 当前科目的题库, 由 loadSubject() 填入
  let currentId = null;
  let QUESTIONS = [], SECTIONS = [], TYPES = [], ESSAYS = [], PASSAGES = [];
  let SECTION_NAME = {}, TYPE_NAME = {}, BY_ID = {}, PASSAGE_BY_ID = {};
  let TOTAL = 0, TOTAL_SCORE = 0;
  let EXAM_TOTAL = 0;                          // 其中会进模拟考试的题数
  // 模拟考试勾了"加入阅读理解"时要随机抽的短文: 普通篇和带翻译题的篇分两组各抽 2 篇
  let READING_NORMAL = [], READING_TL = [];
  // 模拟考试勾了"加入单句翻译"时要随机抽的题
  let SENTRANS_POOL = [];
  // 模拟考试勾了"加入填空题 / 加入名词解释"时要随机抽的题
  let BLANK_POOL = [], TERM_POOL = [];
  let TYPE_EXAM = {};                          // 题型 id -> 不进考试 (题库里标了 exam:false)
  // 科目级设置 (题库 txt 顶部的 "# 设置:"), 缺省就是老科目那套: 每题 1 分、进模拟考试
  let SETTINGS = { examEnabled: true, mcqScore: 1, translateScore: 5, typeScores: {}, randomPick: 0 };

  // 每题多少分。老题库没有 score 字段, 一律按 1 分
  function qScore(q) { return (q && q.score) || 1; }
  function sumScore(list) {
    return list.reduce(function (a, q) { return a + qScore(q); }, 0);
  }

  // 解析与释义 (explanations.js), 缺省则该题不显示解析
  const EXPLANATIONS = window.QUESTION_EXPLANATIONS || {};
  // 作文评分要点 + 范文 (essay-rubrics.js), 缺省则内容分只能粗估、没有范文看
  const ESSAY_RUBRICS = window.ESSAY_RUBRICS || {};
  const ESSAY_MODELS = window.ESSAY_MODELS || {};
  // 单词释义 (dict.js), 练习模式悬停即译; 缺省则没有悬停功能
  const WORD_DICT = window.WORD_DICT || {};

  // 抽题/考试都按"进考试的题"算: 阅读理解的短文靠勾选框整篇追加, 不占这里的题号。
  // 抽几道默认 20, 题库里写了 "# 设置: 随机抽 N 题" (settings.randomPick) 就听它的
  function sampleSize() { return Math.min(SETTINGS.randomPick || MAX_SAMPLE, EXAM_TOTAL); }
  // 题库不够抽的就不显示抽题选项
  function canSample() { return EXAM_TOTAL > sampleSize(); }

  /* ---- 模拟考试里的阅读理解: 随机 4 篇 (普通 2 篇 + 带翻译题的 2 篇), 整篇的题全进卷 ---- */
  const READING_PICK = 2;     // 每组抽几篇
  // 两组都够抽才摆这个勾选框
  function canReading() {
    return READING_NORMAL.length >= READING_PICK && READING_TL.length >= READING_PICK;
  }
  function readingSample() {
    return pickRandom(READING_NORMAL, READING_PICK).concat(pickRandom(READING_TL, READING_PICK));
  }
  // 首页那句说明上的题数/满分: 题库里同类型的短文题数一样, 按每组第一篇估。
  // 真算分时按实际抽到的题走 (见 buildResult), 不靠这个数
  function readingExamQuestions() {
    if (!canReading()) return 0;
    return READING_NORMAL[0].length * READING_PICK + READING_TL[0].length * READING_PICK;
  }
  function readingExamFull() {
    if (!canReading()) return 0;
    return sumScore(READING_NORMAL[0]) * READING_PICK + sumScore(READING_TL[0]) * READING_PICK;
  }
  // 阅读部分一句话分值说明, 如 "阅读 22 题 50 分 (选择 2 分 · 翻译 5 分)"
  function readingScoreDesc() {
    const mcq = READING_NORMAL[0].filter(function (q) { return !isTranslate(q); })[0];
    const tl = READING_TL[0].filter(isTranslate)[0];
    return '阅读 ' + readingExamQuestions() + ' 题 ' + readingExamFull() + ' 分' +
      (mcq && tl ? ' (选择 ' + qScore(mcq) + ' 分 · 翻译 ' + qScore(tl) + ' 分)' : '');
  }

  /* ---- 模拟考试里的单句翻译: 随机抽 5 道 ---- */
  const SENTRANS_PICK = 5;
  // 题够抽才摆这个勾选框
  function canSentrans() { return SENTRANS_POOL.length >= SENTRANS_PICK; }
  function sentransSample() { return pickRandom(SENTRANS_POOL, SENTRANS_PICK); }
  // 首页那句说明上的满分 (每题 2 分 × 5 题); 真算分按实际抽到的题走
  function sentransExamFull() { return qScore(SENTRANS_POOL[0]) * SENTRANS_PICK; }
  // 单句翻译部分一句话分值说明, 如 "单句翻译 5 题 10 分 (每题 2 分)"
  function sentransScoreDesc() {
    return '单句翻译 ' + SENTRANS_PICK + ' 题 ' + sentransExamFull() + ' 分 (每题 ' +
      qScore(SENTRANS_POOL[0]) + ' 分)';
  }

  /* ---- 模拟考试里的填空题 / 名词解释题: 各随机抽几道 ---- */
  // 这两种题在练习里是自评文字题(见 isTextQ), 考试里同样当场自评, 判完才给参考答案
  const BLANK_PICK = 10;
  const TERM_PICK = 5;
  function canBlank() { return BLANK_POOL.length >= BLANK_PICK; }
  function canTerm() { return TERM_POOL.length >= TERM_PICK; }
  function blankSample() { return pickRandom(BLANK_POOL, BLANK_PICK); }
  function termSample() { return pickRandom(TERM_POOL, TERM_PICK); }
  // 首页那句说明上的满分 (道数 × 每题分); 真算分按实际抽到的题走
  function blankExamFull() { return qScore(BLANK_POOL[0]) * BLANK_PICK; }
  function termExamFull() { return qScore(TERM_POOL[0]) * TERM_PICK; }
  // 一句话分值说明, 如 "填空题 10 题 20 分 (每题 2 分)"
  function blankScoreDesc() {
    return '填空题 ' + BLANK_PICK + ' 题 ' + blankExamFull() + ' 分 (每题 ' +
      qScore(BLANK_POOL[0]) + ' 分)';
  }
  function termScoreDesc() {
    return '名词解释 ' + TERM_PICK + ' 题 ' + termExamFull() + ' 分 (每题 ' +
      qScore(TERM_POOL[0]) + ' 分)';
  }

  /* ============ 本地存储 ============ */
  // v2 按科目分桶: { english: {...}, '数据结构': {...} }
  const KEY_WRONG = 'qb_wrong_v2';
  const KEY_HISTORY = 'qb_history_v2';
  const KEY_PREFS = 'qb_prefs_v1';        // 偏好是全局的, 不分科目
  const OLD_KEY_WRONG = 'qb_wrong_v1';    // v1 只有英语一个科目, 扁平存放
  const OLD_KEY_HISTORY = 'qb_history_v1';
  const HISTORY_MAX = 50;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const val = JSON.parse(raw);
      return val == null ? fallback : val;
    } catch (err) {
      console.warn('读取本地数据失败:', key, err);
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('保存本地数据失败:', key, err);
    }
  }

  let wrongStore = loadJSON(KEY_WRONG, {});      // { [subjectId]: wrongBook }
  let historyStore = loadJSON(KEY_HISTORY, {});  // { [subjectId]: history }
  // 用户偏好 (打乱选项等), 记住上次的选择
  let prefs = loadJSON(KEY_PREFS, { shuffleOptions: false });

  // 当前科目的数据, 由 loadSubject() 绑定; 直接改这两个引用即可
  // wrongBook: { [qid]: { count, lastAnswer, lastAt } }
  let wrongBook = {};
  // history: [{ at, mode, total, correct, seconds, wrongIds }] 最近在前
  let history = [];

  function saveWrong() {
    if (currentId) wrongStore[currentId] = wrongBook;
    saveJSON(KEY_WRONG, wrongStore);
  }
  function saveHistory() {
    if (currentId) historyStore[currentId] = history;
    saveJSON(KEY_HISTORY, historyStore);
  }

  // v1 只有一个科目(英语, 即 SUBJECTS[0]), 数据是扁平的, 整体搬到它名下。
  // 只在 v2 键还不存在时跑一次; 旧的 v1 键原样留着, 万一要回退还能用。
  function migrateLegacy() {
    if (!SUBJECTS.length) return;
    const owner = SUBJECTS[0].id;
    if (!localStorage.getItem(KEY_WRONG)) {
      const old = loadJSON(OLD_KEY_WRONG, null);
      if (old && typeof old === 'object' && Object.keys(old).length) {
        wrongStore[owner] = old;
        saveJSON(KEY_WRONG, wrongStore);
      }
    }
    if (!localStorage.getItem(KEY_HISTORY)) {
      const old = loadJSON(OLD_KEY_HISTORY, null);
      if (Array.isArray(old) && old.length) {
        historyStore[owner] = old;
        saveJSON(KEY_HISTORY, historyStore);
      }
    }
  }

  function wrongCount() { return Object.keys(wrongBook).length; }

  function markWrong(qid, chosen) {
    const entry = wrongBook[qid] || { count: 0 };
    entry.count += 1;
    entry.lastAnswer = chosen;
    entry.lastAt = Date.now();
    wrongBook[qid] = entry;
    saveWrong();
  }
  function markRight(qid) {
    if (wrongBook[qid]) {
      delete wrongBook[qid];
      saveWrong();
    }
  }

  /* ============ 科目切换 ============ */
  // 把某个科目的题库和它的错题本/成绩绑到当前变量上, 之后所有视图都读这一份
  function loadSubject(id) {
    const b = BANKS[id] || {};
    currentId = id;
    QUESTIONS = b.questions || [];
    SECTIONS = b.sections || [];
    TYPES = b.types || [];
    ESSAYS = b.essays || [];
    PASSAGES = b.passages || [];
    SETTINGS = Object.assign({ examEnabled: true, mcqScore: 1, translateScore: 5, typeScores: {}, randomPick: 0 },
      b.settings || {});
    TOTAL = QUESTIONS.length;
    TOTAL_SCORE = sumScore(QUESTIONS);

    PASSAGE_BY_ID = {};
    PASSAGES.forEach(function (p) { PASSAGE_BY_ID[p.id] = p; });

    SECTION_NAME = {};
    SECTIONS.forEach(function (s) { SECTION_NAME[s.id] = s.name; });
    TYPE_NAME = {};
    TYPE_EXAM = {};
    TYPES.forEach(function (t) {
      TYPE_NAME[t.id] = t.name;
      if (t.exam === false) TYPE_EXAM[t.id] = false;
    });
    EXAM_TOTAL = QUESTIONS.filter(isExamable).length;
    BY_ID = {};
    QUESTIONS.forEach(function (q) { BY_ID[q.id] = q; });

    // 按短文给题目分组, 组里带翻译题的算"带翻译的篇"(考试抽 2 篇这种)
    const groups = {}, order = [];
    QUESTIONS.forEach(function (q) {
      if (!q.passage || !PASSAGE_BY_ID[q.passage]) return;
      if (!groups[q.passage]) { groups[q.passage] = []; order.push(q.passage); }
      groups[q.passage].push(q);
    });
    READING_NORMAL = [];
    READING_TL = [];
    order.forEach(function (pid) {
      const list = groups[pid];
      (list.some(isTranslate) ? READING_TL : READING_NORMAL).push(list);
    });
    SENTRANS_POOL = QUESTIONS.filter(function (q) { return q.type === 'sentrans'; });
    BLANK_POOL = QUESTIONS.filter(function (q) { return q.type === 'blank'; });
    TERM_POOL = QUESTIONS.filter(function (q) { return q.type === 'term'; });

    wrongBook = wrongStore[id] || {};
    history = historyStore[id] || [];

    document.title = (SUBJECT_NAME[id] || id) + '刷题 · 考前突击';
  }

  /* ============ 会话状态 ============ */
  const state = {
    view: 'home',      // home | exam | practice | result | wrongbook
    session: null,     // { mode, questions, answers, revealed, index, startAt }
    result: null,
    timerId: null,
    filterWrongOnly: true,
    shuffleOptions: !!prefs.shuffleOptions,  // 仅对模拟考试生效
    sampleQuestions: !!prefs.sampleQuestions,
    withEssay: !!prefs.withEssay,            // 模拟考试是否加一篇作文
    withReading: !!prefs.withReading,        // 模拟考试是否随机加 4 篇阅读理解
    withSentrans: !!prefs.withSentrans,      // 模拟考试是否随机加 5 道单句翻译
    withBlank: !!prefs.withBlank,            // 模拟考试是否随机加 10 道填空题
    withTerm: !!prefs.withTerm,              // 模拟考试是否随机加 5 道名词解释
  };

  /* ============ 选项乱序 ============
     打乱后 answer 会重新指向新位置, 同时记录 origOrder:
     origOrder[新下标] = 原下标。写错题本时必须换算回原下标,
     否则换一次顺序错题本里记的选项就对不上了。            */
  function shuffleQuestion(q) {
    const order = q.options.map(function (_, i) { return i; });
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    const copy = Object.assign({}, q);
    copy.options = order.map(function (origIdx) { return q.options[origIdx]; });
    copy.answer = order.indexOf(q.answer);   // 正确答案在新顺序里的位置
    copy.origOrder = order;                  // 新下标 -> 原下标
    return copy;
  }

  // 把本次会话里的选项下标换算回题目的原始下标
  function toOriginalIndex(q, idx) {
    if (idx == null) return null;
    return q.origOrder ? q.origOrder[idx] : idx;
  }

  // 随机抽取 n 道题 (洗牌后取前 n 道, 顺带把题目顺序也打散)
  function pickRandom(list, n) {
    const pool = list.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    return pool.slice(0, Math.min(n, pool.length));
  }

  // 进模拟考试的题: 题型没标 exam:false, 而且不是翻译题
  // (阅读理解带短文、题型标了 exam:false, 走不了这里; 勾选后由 buildExamQuestions 整篇追加)
  function isExamable(q) {
    return !isTranslate(q) && TYPE_EXAM[q.type] !== false;
  }

  // 组装本次模拟考试的题目: 先单选, 依次追加 单句翻译 / 阅读理解 / 填空题 / 名词解释
  // (卷面顺序就是这么定的: 选择在前, 填空、名词解释垫后)
  function buildExamQuestions() {
    let list = QUESTIONS.filter(isExamable);
    if (state.sampleQuestions && canSample()) {
      list = pickRandom(list, sampleSize());
    }
    if (withSentransNow()) {
      list = list.concat(sentransSample());
    }
    if (state.withReading && canReading()) {
      readingSample().forEach(function (group) {
        list = list.concat(group);
      });
    }
    if (withBlankNow()) {
      list = list.concat(blankSample());
    }
    if (withTermNow()) {
      list = list.concat(termSample());
    }
    return list;
  }

  const root = document.getElementById('app');

  /* ============ DOM 小工具 ============ */
  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  // 把题干里的 ____ 渲染成填空样式
  function stemNode(text, className) {
    const p = h('p', className || 'stem');
    const parts = String(text).split(/(_{2,})/);
    parts.forEach(function (part) {
      if (/^_{2,}$/.test(part)) p.appendChild(h('span', 'blank', '______'));
      else if (part) p.appendChild(document.createTextNode(part));
    });
    return p;
  }

  // 阅读理解的短文。正文里用 [ ] 框住的那一段是书上标的"翻译这一段", 渲染成高亮
  function passageNode(id) {
    const p = PASSAGE_BY_ID[id];
    if (!p) return null;
    const box = h('div', 'passage');
    const head = h('div', 'passage-head');
    head.appendChild(h('span', 't', '短文 ' + p.key));
    head.appendChild(h('span', 'd', 'Passage ' + p.key));
    box.appendChild(head);
    p.text.forEach(function (para) {
      const el = h('p');
      const re = /\[([^\]]+)\]/g;
      let last = 0, m;
      while ((m = re.exec(para))) {
        if (m.index > last) el.appendChild(document.createTextNode(para.slice(last, m.index)));
        el.appendChild(h('span', 'tl-seg', m[1]));
        last = m.index + m[0].length;
      }
      if (last < para.length) el.appendChild(document.createTextNode(para.slice(last)));
      box.appendChild(el);
    });
    return box;
  }

  /* ============ 悬停释义 ============ */
  // 练习模式里鼠标停在英文单词上就弹出中文。考试进行中不给 —— 那等于开卷。
  //
  // 只能按白名单标注, 不能整页扫: 选项前面的字母 A. 会被当成单词 a, 悬停弹"一个"。
  const GLOSS_SEL = [
    '.stem',           // 题干
    '.option .text',   // 选项正文 (.letter 是 A/B/C/D, 不能碰)
    '.feedback',       // 答错时回显的正确答案
    '.explain .body',  // 解析与句意
    '.review-line',    // 交卷后逐题回顾
    '.essay-prompt',   // 作文题目
    '.essay-model p',  // 范文
    '.passage p',      // 阅读理解的短文
    '.tl-source',      // 翻译题的待译原文
    '.tl-ref p',       // 参考译文 (中文, 扫不到英文词也无妨)
  ].join(',');
  const WORD_RE = /[A-Za-z][A-Za-z'-]*/g;
  const HAS_WORD_RE = /[A-Za-z]/;

  // 查词: 先原样查, 再剥所有格。johnsons' / student's / students' 都落回原形
  function glossOf(raw) {
    let w = String(raw).toLowerCase();
    // 单个字母只有 a / i 是词。解析里"排除 C、D 两个选项"、"attribute A to B"
    // 里的字母是选项编号, 当单词查会弹出莫名其妙的东西
    if (w.length < 2) return (w === 'a' || w === 'i') ? (WORD_DICT[w] || '') : '';
    if (WORD_DICT[w]) return WORD_DICT[w];
    return WORD_DICT[w.replace(/'s?$/, '')] || '';
  }

  // 把 el 里的文本节点拆开, 认识的词包一层 <span class="w">
  function annotate(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const targets = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && HAS_WORD_RE.test(node.nodeValue)) targets.push(node);
    }
    targets.forEach(function (textNode) {
      // 词汇那一行本来就是"单词 中文"的对照表, 再挂一层是叠床架屋
      const parent = textNode.parentElement;
      if (parent && parent.closest('.words')) return;

      const text = textNode.nodeValue;
      const frag = document.createDocumentFragment();
      let last = 0, hit = false, m;
      WORD_RE.lastIndex = 0;
      while ((m = WORD_RE.exec(text))) {
        const gloss = glossOf(m[0]);
        if (!gloss) continue;   // 不认识的词留在外面的普通文本里
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = h('span', 'w', m[0]);
        span.setAttribute('data-gloss', gloss);
        frag.appendChild(span);
        last = m.index + m[0].length;
        hit = true;
      }
      if (!hit) return;         // 一个都没命中就别动原节点
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  // 考试进行中不给释义; 交卷之后(结果页)随便看, 所以只认 session 的模式
  function glossOn() {
    const s = state.session;
    return !s || s.mode !== 'exam';
  }

  function glossAll(container) {
    hideGloss();   // 页面换了, 别让浮层留在原地
    if (!glossOn()) return;
    const list = container.querySelectorAll(GLOSS_SEL);
    for (let i = 0; i < list.length; i++) {
      // 选择器之间可能嵌套(比如 .feedback 里带着选项原文), 只认最外层
      if (list[i].closest(GLOSS_SEL) !== list[i]) continue;
      annotate(list[i]);
    }
  }

  // 浮层全页只有一个, 跟着鼠标移到哪个词就重算位置
  let glossTip = null;
  function tipEl() {
    if (!glossTip) {
      glossTip = h('div', 'gloss-tip');
      glossTip.setAttribute('role', 'tooltip');
      document.body.appendChild(glossTip);
    }
    return glossTip;
  }

  function showGloss(span) {
    const tip = tipEl();
    tip.textContent = span.getAttribute('data-gloss');
    tip.classList.add('on');
    // 先量再算位置。visibility:hidden 的元素照样有布局, 量得到尺寸
    const r = span.getBoundingClientRect();
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    const below = r.bottom + ht + 10 < window.innerHeight;   // 底下放不下就翻到上方
    tip.style.top = ((below ? r.bottom + 8 : r.top - ht - 8) + window.scrollY) + 'px';
    // 左右夹一下别顶出屏幕; 词贴着边时按边对齐
    const left = r.left + r.width / 2 - w / 2;
    tip.style.left = Math.max(window.scrollX + 8,
      Math.min(left, window.scrollX + window.innerWidth - w - 8)) + 'px';
  }
  // 悬停后等一小会儿再弹。扫读一段话时鼠标会从十几个词上划过去, 不延迟的话
  // 浮层跟着闪一路, 什么都看不清。停住不动才认为你是真的想看这个词。
  const GLOSS_DELAY = 120;
  let glossTimer = null;

  function cancelGloss() {
    if (glossTimer) { clearTimeout(glossTimer); glossTimer = null; }
  }
  function hideGloss() {
    cancelGloss();
    if (glossTip) glossTip.classList.remove('on');
  }

  document.addEventListener('mouseover', function (e) {
    const t = e.target;
    if (!t || !t.classList || !t.classList.contains('w') || !glossOn()) return;
    cancelGloss();
    glossTimer = setTimeout(function () { showGloss(t); }, GLOSS_DELAY);
  });
  document.addEventListener('mouseout', function (e) {
    const t = e.target;
    if (t && t.classList && t.classList.contains('w')) hideGloss();
  });

  function fmtTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDate(ms) {
    const d = new Date(ms);
    const pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  // 模拟考试的名称, 带上乱序/抽题标记
  function examLabel(rec) {
    const tags = [];
    // 抽的是单选题; 老记录没有 singles 字段, 那时 total 就是单选题数
    if (rec.sampled) tags.push('抽' + (rec.singles || rec.total) + '题');
    if (rec.withSentrans) tags.push('含单句翻译');
    if (rec.withReading) tags.push('含阅读');
    if (rec.withBlank) tags.push('含填空');
    if (rec.withTerm) tags.push('含名词解释');
    if (rec.essayFull) tags.push('含作文');
    if (rec.shuffled) tags.push('乱序');
    return '模拟考试' + (tags.length ? '(' + tags.join('·') + ')' : '');
  }

  // 一条历史记录的得分 / 满分 (老记录没有作文字段, 按 0 处理;
  // 分值不统一的科目才有 points/full, 老记录退回题数即分数)
  function recScore(rec) {
    return (rec.points != null ? rec.points : rec.correct) + (rec.essayScore || 0);
  }
  function recFull(rec) {
    return (rec.full != null ? rec.full : rec.total) + (rec.essayFull || 0);
  }

  // 题目上方的标注, 如 "单选题 · 练习一 · 第 13 题" / "阅读理解 · 练习一 B 篇 · 第 3 题"
  function qmetaText(q) {
    const type = TYPE_NAME[q.type];
    const pass = q.passage ? PASSAGE_BY_ID[q.passage] : null;
    return (type ? type + ' · ' : '') + SECTION_NAME[q.section] +
      (pass ? ' ' + pass.key + ' 篇' : '') + ' · 第 ' + q.no + ' 题';
  }

  // 题型卡上那句分值说明: 每题分值一样就写"每题 N 分",
  // 阅读这种选择+翻译混着的分开列 (分值从题上读, 不猜设置)
  function typeScoreDesc(typeQs, typeScore) {
    const mcq = typeQs.filter(function (q) { return !isTranslate(q); })[0];
    const tl = typeQs.filter(isTranslate)[0];
    if (mcq && tl) {
      return '选择 ' + qScore(mcq) + ' 分 · 翻译 ' + qScore(tl) + ' 分 · 满分 ' + typeScore + ' 分';
    }
    const per = typeQs.length ? qScore(typeQs[0]) : 0;
    return (per && typeScore === typeQs.length * per ? '每题 ' + per + ' 分 · ' : '') +
      '满分 ' + typeScore + ' 分';
  }

  // 首页那句分值说明: 全科一样就"每题 N 分", 不一样只报满分
  // (各题型多少分, 练习设置的题型卡上写着)
  function scoreDesc() {
    if (TOTAL_SCORE === TOTAL) return '每题 1 分 · 满分 ' + TOTAL_SCORE + ' 分';
    return '满分 ' + TOTAL_SCORE + ' 分';
  }

  function optionText(q, idx) {
    if (idx == null || idx < 0) return '未作答';
    return LETTERS[idx] + '. ' + q.options[idx];
  }

  /* ============ 计时器 ============ */
  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }
  function startTimer() {
    stopTimer();
    state.timerId = setInterval(function () {
      const node = document.getElementById('timer');
      if (!node || !state.session) return;
      node.textContent = fmtTime(Math.floor((Date.now() - state.session.startAt) / 1000));
    }, 1000);
  }
  function elapsedSeconds() {
    if (!state.session) return 0;
    return Math.max(1, Math.round((Date.now() - state.session.startAt) / 1000));
  }

  /* ============ 作文评分 ============
     纯离线估算。它读不懂你写的意思, 只能数出客观可量的东西:
     词数、段落、提纲要点的关键词覆盖、句式与连接词、常见拼写错误。
     所以分数只能当参考, 别拿它当真实水平 —— 界面上也标了这一点。 */

  const ESSAY_FULL = 20;

  // 衔接词: 命中得越多说明段落之间扣得越紧
  const CONNECTIVES = [
    'however', 'moreover', 'furthermore', 'in addition', 'besides', 'therefore',
    'thus', 'consequently', 'on the other hand', 'on the contrary', 'in contrast',
    'what is more', 'as a result', 'for example', 'for instance', 'firstly',
    'first of all', 'secondly', 'finally', 'in conclusion', 'to sum up', 'in short',
    'in a word', 'all in all', 'meanwhile', 'nevertheless', 'otherwise', 'apart from',
  ];

  // 从句引导词, 用来估句式复杂度 (不含 who/that 这种太容易误伤的)
  const SUBORDINATORS = [
    'although', 'though', 'even though', 'because', 'since', 'unless', 'while',
    'whereas', 'if', 'when', 'whenever', 'as long as', 'so that', 'in order to',
    'which', 'whom', 'whose', 'whether', 'as if', 'even if', 'no matter', 'after',
    'before', 'until',
  ];

  // 高频拼写错误, 命中就点名
  const TYPOS = {
    alot: 'a lot', becuase: 'because', becouse: 'because', thier: 'their',
    recieve: 'receive', enviroment: 'environment', goverment: 'government',
    seperate: 'separate', definately: 'definitely', occured: 'occurred',
    untill: 'until', wich: 'which', teh: 'the', adress: 'address',
    beleive: 'believe', sucess: 'success', sucessful: 'successful',
    tommorow: 'tomorrow', convinient: 'convenient', accomodation: 'accommodation',
    grammer: 'grammar', writting: 'writing', begining: 'beginning',
    diffrent: 'different', familar: 'familiar', foriegn: 'foreign',
    neccessary: 'necessary', oppurtunity: 'opportunity', particulary: 'particularly',
    prefered: 'preferred', realy: 'really', reccomend: 'recommend',
    usefull: 'useful', wierd: 'weird', allready: 'already', allways: 'always',
    buisness: 'business', commitee: 'committee', excercise: 'exercise',
    experiance: 'experience', immediatly: 'immediately', knowlege: 'knowledge',
    libary: 'library', similiar: 'similar', studing: 'studying', throught: 'through',
    wheather: 'whether', writen: 'written', greatful: 'grateful',
    independant: 'independent', personel: 'personal', responsability: 'responsibility',
  };

  // 高频功能词, 统计重复用词时要排掉
  const STOP_WORDS = {
    the: 1, a: 1, an: 1, and: 1, or: 1, but: 1, to: 1, of: 1, in: 1, on: 1, at: 1,
    for: 1, with: 1, by: 1, as: 1, is: 1, are: 1, am: 1, was: 1, were: 1, be: 1,
    been: 1, being: 1, do: 1, does: 1, did: 1, have: 1, has: 1, had: 1, will: 1,
    would: 1, can: 1, could: 1, should: 1, may: 1, might: 1, must: 1, this: 1,
    that: 1, these: 1, those: 1, it: 1, its: 1, they: 1, them: 1, their: 1,
    we: 1, our: 1, us: 1, you: 1, your: 1, he: 1, she: 1, his: 1, her: 1, i: 1,
    my: 1, me: 1, not: 1, no: 1, so: 1, if: 1, when: 1, while: 1, also: 1,
    more: 1, most: 1, some: 1, any: 1, all: 1, other: 1, such: 1, than: 1,
    then: 1, there: 1, here: 1, from: 1, into: 1, out: 1, up: 1, about: 1,
  };

  function escapeRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // 关键词按词首对齐匹配, 所以写词干就能带上各种变形: convenien → convenient/convenience
  function hasKeyword(lowerText, kw) {
    return new RegExp('(^|[^a-z])' + escapeRe(kw) + '[a-z]*').test(lowerText);
  }
  function hasAny(lowerText, list) {
    return list.some(function (kw) { return hasKeyword(lowerText, kw); });
  }

  function countWords(s) {
    const m = String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g);
    return m ? m.length : 0;
  }
  function pad(text) { return ' ' + String(text || '').toLowerCase() + ' '; }

  function splitParagraphs(text) {
    // 优先按空行分段; 整篇没有空行时按单个换行分(在 textarea 里更常见)
    const byBlank = String(text || '').split(/\n\s*\n/)
      .map(function (s) { return s.trim(); }).filter(Boolean);
    if (byBlank.length > 1) return byBlank;
    return String(text || '').split(/\n+/)
      .map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function splitSentences(text) {
    return String(text || '').split(/[.!?]+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return countWords(s) > 0; });
  }
  function round1(n) { return Math.round(n * 10) / 10; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function essayRubric(essay) {
    const forSubject = ESSAY_RUBRICS[currentId];
    return (forSubject && forSubject[essay.id]) || null;
  }

  // 评分报告里只有 essayId, 所以按 id 查; 作文数据对象也走这里
  function essayModelById(id) {
    const forSubject = ESSAY_MODELS[currentId];
    const m = forSubject && forSubject[id];
    return (m && m.paras && m.paras.length) ? m : null;
  }
  function essayModel(essay) { return essay ? essayModelById(essay.id) : null; }

  // 范文块。练习模式里默认折叠, 免得还没写就先看见答案。
  function modelBlock(model, folded) {
    const box = h('div', 'essay-model');
    const paras = model.paras;
    if (folded) box.style.display = 'none';

    const head = h('div', 'essay-model-head');
    head.appendChild(h('span', 't', '范文'));
    head.appendChild(h('span', 'd',
      countWords(paras.join(' ')) + ' 词 · 初中水平, 短句好背'));
    box.appendChild(head);

    paras.forEach(function (t) { box.appendChild(h('p', null, t)); });
    return box;
  }

  // 返回 { score, full, title, words, paragraphs, sentences, parts[], issues[], errors[], empty }
  function gradeEssay(text, essay) {
    const raw = String(text || '').replace(/\r/g, '');
    const lower = pad(raw);
    const words = countWords(raw);
    const paragraphs = splitParagraphs(raw);
    const sentences = splitSentences(raw);
    const paraWords = paragraphs.map(countWords);
    const sentLens = sentences.map(countWords);
    const rubric = essayRubric(essay);
    const points = (rubric && rubric.points) || [];

    const parts = [];
    const issues = [];
    const errors = [];

    /* ---- 内容切题 8 分 ---- */
    let content = 0;
    if (points.length) {
      const per = 8 / points.length;
      const detail = [];
      points.forEach(function (facets, i) {
        let hit = 0;
        facets.forEach(function (group) {
          if (hasAny(lower, group)) hit++;
        });
        content += per * (hit / facets.length);
        detail.push('要点' + (i + 1) + ' ' + hit + '/' + facets.length);
      });
      // 跑题兜底: 要点里混着不少通用词(nowadays / i think / should), 只看要点覆盖率
      // 的话, 一篇写做饭的文章也能蹭到六成内容分。所以先查主题词出现过没有。
      const anchors = rubric.anchors || [];
      const offTopic = anchors.length > 0 && !hasAny(lower, anchors);
      if (offTopic) content = Math.min(content, 8 * 0.25);
      parts.push({ name: '内容切题', got: round1(content), max: 8, note: detail.join(' · ') });
      if (offTopic) {
        issues.push('通篇没有出现和题目主题相关的说法, 有偏题嫌疑 —— 先确认自己写的是题目要求的那个话题。');
      } else if (content < 8 * 0.35 && words >= 40) {
        issues.push('提纲里的要点几乎都没写到, 有偏题风险 —— 动笔前先把三个要点各列一句。');
      }
    } else {
      // 兜底: 没有人工评分表时, 只看标题里的词有没有出现, 意义有限
      const keys = String(essay.title || '').toLowerCase().split(/[^a-z]+/)
        .filter(function (w) { return w.length > 3; });
      let hit = 0;
      keys.forEach(function (k) { if (hasKeyword(lower, k)) hit++; });
      content = keys.length ? 8 * (hit / keys.length) : 4;
      parts.push({ name: '内容切题', got: round1(content), max: 8, note: '没有评分要点表, 只比对了标题关键词' });
      issues.push('这篇作文还没配评分要点(essay-rubrics.js), 内容分只能粗估。');
    }

    /* ---- 篇章结构 4 分 ---- */
    const want = points.length || 3;
    let struct = 0;
    const sNotes = [];
    const pn = paragraphs.length;
    if (pn === want || pn === want + 1) struct += 2;
    else if (pn === want - 1) struct += 1.2;
    else if (pn === 1) struct += 0.4;
    else struct += 0.8;
    sNotes.push(pn + ' 段 / 提纲 ' + want + ' 个要点');

    const INTRO = ['nowadays', 'recently', 'today', 'in recent years', 'with the development',
      'at present', 'currently', 'it is common', 'as we all know', 'no one can deny',
      'these days', 'in modern society', 'as society'];
    const OUTRO = ['in conclusion', 'to sum up', 'in short', 'in a word', 'all in all',
      'therefore', 'in my opinion', 'i think', 'i believe', 'as far as i am concerned',
      'personally', 'to conclude', 'from what has been discussed', 'my view'];

    if (pn > 1) {
      if (hasAny(pad(paragraphs[0]), INTRO)) { struct += 0.5; sNotes.push('开头有引入'); }
      else issues.push('开头段没有引入背景, 可以试试 Nowadays / With the development of ...');
      if (hasAny(pad(paragraphs[pn - 1]), OUTRO)) { struct += 0.5; sNotes.push('结尾有收束'); }
      else issues.push('结尾段没有总结句, 可以试试 In conclusion / To sum up ...');
    }

    const shortest = paraWords.length ? Math.min.apply(null, paraWords) : 0;
    if (shortest >= 15) struct += 1;
    else if (shortest >= 8) struct += 0.5;
    else if (pn) issues.push('有一段只有 ' + shortest + ' 个词, 太单薄 —— 每个要点至少展开两三句。');
    parts.push({ name: '篇章结构', got: round1(struct), max: 4, note: sNotes.join(' · ') });

    /* ---- 语言表达 5 分 ---- */
    const complexCount = sentences.filter(function (s) { return hasAny(pad(s), SUBORDINATORS); }).length;
    const complexRatio = sentences.length ? complexCount / sentences.length : 0;
    const mean = sentLens.length ? sentLens.reduce(function (a, b) { return a + b; }, 0) / sentLens.length : 0;
    const sd = sentLens.length > 1
      ? Math.sqrt(sentLens.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / sentLens.length)
      : 0;

    let variety = 0;
    if (complexRatio >= 0.30) variety += 1;
    else if (complexRatio >= 0.15) variety += 0.6;
    else if (complexRatio > 0) variety += 0.3;
    if (sd >= 5) variety += 1;
    else if (sd >= 3) variety += 0.7;
    else if (sd >= 1.5) variety += 0.4;
    else if (sentLens.length) variety += 0.2;

    const usedConn = CONNECTIVES.filter(function (k) { return hasKeyword(lower, k); });
    let cohesion = 0;
    if (usedConn.length >= 5) cohesion = 1.5;
    else if (usedConn.length >= 3) cohesion = 1.1;
    else if (usedConn.length >= 1) cohesion = 0.6;

    const tokens = raw.toLowerCase().match(/[a-z][a-z'’\-]*/g) || [];
    const longRatio = tokens.length
      ? tokens.filter(function (w) { return w.length >= 7; }).length / tokens.length : 0;
    let lexis = 0;
    if (longRatio >= 0.12) lexis = 1.0;
    else if (longRatio >= 0.08) lexis = 0.7;
    else if (longRatio >= 0.05) lexis = 0.4;
    else lexis = 0.15;

    const freq = {};
    tokens.forEach(function (w) { if (!STOP_WORDS[w] && w.length > 3) freq[w] = (freq[w] || 0) + 1; });
    let top = 0, topWord = '';
    Object.keys(freq).forEach(function (w) { if (freq[w] > top) { top = freq[w]; topWord = w; } });
    const topRatio = tokens.length ? top / tokens.length : 0;

    if (complexRatio < 0.1 && words >= 60) {
      issues.push('几乎没有从句, 全是一个个短句 —— 试着用 because / although / which 把句子接起来。');
    }
    if (usedConn.length < 3 && words >= 60) {
      issues.push('连接词只用了 ' + usedConn.length + ' 个, 段落之间缺少衔接(however / moreover / therefore / in addition)。');
    }
    if (topRatio > 0.07 && words >= 60) {
      lexis -= 0.4;
      issues.push('"' + topWord + '" 反复出现 ' + top + ' 次, 换个说法或换代词。');
    }

    /* ---- 基础错误: 每命中一类在语言分里扣 0.3, 最多扣 1.8 ---- */
    const bareI = (raw.match(/(^|[^A-Za-z])i([^A-Za-z]|$)/g) || []).length;
    if (bareI) errors.push('有 ' + bareI + ' 处小写的 "i", 作人称代词时必须大写。');

    const spaceBefore = (raw.match(/\s+[,.;:!?]/g) || []).length;
    if (spaceBefore) errors.push('有 ' + spaceBefore + ' 处标点前面多了空格。');

    const cnPunct = (raw.match(/[，。；！？、：（）“”‘’]/g) || []).length;
    if (cnPunct) errors.push('混进了 ' + cnPunct + ' 个中文标点。');

    const repeat = raw.match(/\b([A-Za-z]{2,})\s+\1\b/gi) || [];
    if (repeat.length) errors.push('疑似重复写了两遍: ' + repeat.slice(0, 3).join(', '));

    let noCap = 0;
    sentences.forEach(function (s) { if (/^[a-z]/.test(s)) noCap++; });
    if (noCap) errors.push('有 ' + noCap + ' 句开头没有大写。');

    const misspelled = Object.keys(TYPOS).filter(function (w) {
      return new RegExp('(^|[^a-z])' + w + '\\b', 'i').test(raw);
    });
    if (misspelled.length) {
      errors.push('拼写: ' + misspelled.map(function (w) { return w + ' → ' + TYPOS[w]; }).join('; '));
    }
    if (words >= 20 && !/[.!?]\s*$/.test(raw.trim())) errors.push('最后一句没有句号。');

    const penalty = Math.min(1.8, errors.length * 0.3);
    lexis = clamp(lexis, 0, 1.5);
    const lang = clamp(variety + cohesion + lexis - penalty, 0, 5);
    parts.push({
      name: '语言表达',
      got: round1(lang),
      max: 5,
      note: '句式 ' + round1(variety) + '/2 · 衔接 ' + round1(cohesion) + '/1.5 · 词汇 ' +
        round1(lexis) + '/1.5' + (penalty ? ' · 错误 -' + round1(penalty) : ''),
    });

    /* ---- 词数 3 分 ---- */
    const need = essay.minWords || 120;
    const ratio = need ? words / need : 1;
    let lengthScore;
    if (ratio >= 1) lengthScore = 3;
    else if (ratio >= 0.9) lengthScore = 2.2;
    else if (ratio >= 0.75) lengthScore = 1.5;
    else if (ratio >= 0.5) lengthScore = 0.8;
    else lengthScore = 0.3;
    if (ratio < 1) {
      issues.push('词数 ' + words + ', 还差 ' + (need - words) + ' 个才够 ' + need + ' 词。');
    } else if (ratio > 2.5) {
      lengthScore = Math.max(0, lengthScore - 0.5);
      issues.push('篇幅到要求的两倍半以上了, 考试里既写不完也容易跑题, 收一收。');
    }
    parts.push({
      name: '词数要求',
      got: round1(lengthScore),
      max: 3,
      note: words + ' 词 / 要求 ' + need + ' 词',
    });

    const total = clamp(parts.reduce(function (a, p) { return a + p.got; }, 0), 0, ESSAY_FULL);
    return {
      essayId: essay.id,
      title: essay.title || ('作文 ' + essay.no),
      score: Math.round(total * 2) / 2,     // 保留到 0.5 分
      full: ESSAY_FULL,
      raw: round1(total),
      words: words,
      paragraphs: pn,
      sentences: sentences.length,
      avgSentence: sentences.length ? round1(mean) : 0,
      connectives: usedConn.length,
      parts: parts,
      issues: issues,
      errors: errors,
      empty: words === 0,
    };
  }

  // 输入框下方的实时字数
  function essayCountText(text, essay) {
    const w = countWords(text);
    const need = essay.minWords || 120;
    return '已写 ' + w + ' 词 · 要求 ' + need + ' 词' + (w >= need ? ' ✓' : '');
  }

  /* ============ 首页 ============ */
  // 本次模拟考试考多少道单选题 (阅读理解的题另算)
  function examSingles() {
    return (state.sampleQuestions && canSample()) ? sampleSize() : EXAM_TOTAL;
  }
  // 单选题每题几分: 老题库 1 分, 数据结构那种写着 "单选每题 2 分" 的按题走
  function examSingleScore() {
    const first = QUESTIONS.filter(isExamable)[0];
    return qScore(first);
  }
  // 本次模拟考试加不加阅读理解的题
  function withReadingNow() { return state.withReading && canReading(); }
  // 本次模拟考试加不加单句翻译的题
  function withSentransNow() { return state.withSentrans && canSentrans(); }
  // 本次模拟考试加不加填空题 / 名词解释题
  function withBlankNow() { return state.withBlank && canBlank(); }
  function withTermNow() { return state.withTerm && canTerm(); }

  // 本次模拟考试实际会考多少题
  function examSize() {
    return examSingles() + (withSentransNow() ? SENTRANS_PICK : 0) +
      (withReadingNow() ? readingExamQuestions() : 0) +
      (withBlankNow() ? BLANK_PICK : 0) + (withTermNow() ? TERM_PICK : 0);
  }

  // 这个科目有没有模拟考试: 题库没关掉, 而且确实有能考的题
  function hasExam() {
    return SETTINGS.examEnabled !== false && EXAM_TOTAL > 0;
  }

  // 本次模拟考试的满分
  function examFull() {
    return examSingles() * examSingleScore() + (withSentransNow() ? sentransExamFull() : 0) +
      (withReadingNow() ? readingExamFull() : 0) +
      (withBlankNow() ? blankExamFull() : 0) + (withTermNow() ? termExamFull() : 0) +
      (state.withEssay && ESSAYS.length ? ESSAY_FULL : 0);
  }

  function examDesc() {
    const n = examSingles();
    const sampling = state.sampleQuestions && canSample();
    const parts = [
      (sampling ? '从 ' + EXAM_TOTAL + ' 题中随机抽 ' + n + ' 题' : '全部 ' + EXAM_TOTAL + ' 题') +
        (withSentransNow() ? ' + 单句翻译 ' + SENTRANS_PICK + ' 题' : '') +
        (withReadingNow() ? ' + 阅读理解 ' + READING_PICK * 2 + ' 篇' : '') +
        (withBlankNow() ? ' + 填空题 ' + BLANK_PICK + ' 题' : '') +
        (withTermNow() ? ' + 名词解释 ' + TERM_PICK + ' 题' : '') +
        (state.withEssay && ESSAYS.length ? ' + 作文 1 篇' : ''),
      '满分 ' + examFull() + ' 分',
    ];
    if (withSentransNow()) parts.push(sentransScoreDesc());
    if (withReadingNow()) parts.push(readingScoreDesc());
    if (withBlankNow()) parts.push(blankScoreDesc());
    if (withTermNow()) parts.push(termScoreDesc());
    if (state.withEssay && ESSAYS.length) {
      parts.push('每题 ' + examSingleScore() + ' 分, 作文 ' + ESSAY_FULL + ' 分');
    }
    if (state.shuffleOptions) parts.push('选项乱序');
    return parts.join(' · ');
  }

  function hintText(key) {
    if (key === 'shuffle') {
      return state.shuffleOptions ? '每题内选项顺序随机打乱' : '不勾选则保持原顺序';
    }
    if (key === 'reading') {
      return withReadingNow()
        ? '随机抽 ' + READING_PICK * 2 + ' 篇短文 (普通 ' + READING_PICK + ' 篇 + 带翻译 ' + READING_PICK +
          ' 篇), 整篇的题全考; 短文和题目一页一篇'
        : '不勾选则考试里没有阅读理解';
    }
    if (key === 'sentrans') {
      return withSentransNow()
        ? '随机抽 ' + SENTRANS_PICK + ' 道单句翻译 (每题 ' + qScore(SENTRANS_POOL[0]) + ' 分), 一题一页'
        : '不勾选则考试里没有单句翻译';
    }
    if (key === 'blank') {
      return withBlankNow()
        ? '随机抽 ' + BLANK_PICK + ' 道填空题 (每题 ' + qScore(BLANK_POOL[0]) + ' 分), 一题一页, 自己判对错'
        : '不勾选则考试里没有填空题';
    }
    if (key === 'term') {
      return withTermNow()
        ? '随机抽 ' + TERM_PICK + ' 道名词解释 (每题 ' + qScore(TERM_POOL[0]) + ' 分), 一题一页, 自己判对错'
        : '不勾选则考试里没有名词解释';
    }
    if (key === 'essay') {
      return state.withEssay
        ? '从 ' + ESSAYS.length + ' 篇里随机抽 1 篇, 放在最后一题'
        : '不勾选则只考选择题';
    }
    return state.sampleQuestions
      ? '每次开考都重新抽题 (只影响单选题)'
      : '不勾选则考全部 ' + EXAM_TOTAL + ' 题';
  }

  // 勾选后只刷新文字, 不整体重渲染, 避免勾选框失焦
  function refreshHomeHints() {
    const desc = document.querySelector('[data-action="start-exam"] .d');
    if (desc) desc.textContent = examDesc();
    document.querySelectorAll('.mode-opt .hint').forEach(function (el) {
      el.textContent = hintText(el.getAttribute('data-hint'));
    });
  }

  function checkRow(action, label, hintKey, checked) {
    const row = h('label', 'mode-opt');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = checked;
    cb.setAttribute('data-action', action);
    row.appendChild(cb);
    row.appendChild(h('span', null, label));
    const hint = h('span', 'hint', hintText(hintKey));
    hint.setAttribute('data-hint', hintKey);
    row.appendChild(hint);
    return row;
  }

  // 科目切换标签, 只有一个科目时不显示
  function subjectTabs() {
    if (SUBJECTS.length < 2) return null;
    const bar = h('div', 'subject-tabs');
    SUBJECTS.forEach(function (s) {
      const btn = h('button', 'subject-tab' + (s.id === currentId ? ' active' : ''), s.name);
      btn.setAttribute('data-action', 'switch-subject');
      btn.setAttribute('data-subject', s.id);
      bar.appendChild(btn);
    });
    return bar;
  }

  function viewHome() {
    const wrap = h('div');

    const tabs = subjectTabs();
    if (tabs) wrap.appendChild(tabs);

    const hero = h('div', 'hero');
    hero.appendChild(h('h1', null, (SUBJECT_NAME[currentId] || '') + '刷题'));
    hero.appendChild(h('p', null,
      (TYPES.length ? TYPES.map(function (t) { return t.name; }).join(' / ') + ' · ' : '') +
      '共 ' + TOTAL + ' 题 · ' + scoreDesc()));
    wrap.appendChild(hero);

    const lastRec = history.length ? history[0] : null;
    // 平铺的 "35 分" 就够读了; 只有带作文的记录分母不固定(20 或 60), 才需要写成 35 / 60
    const lastScore = lastRec
      ? (lastRec.essayFull ? recScore(lastRec) + ' / ' + recFull(lastRec) : recScore(lastRec) + ' 分')
      : null;
    const stats = h('div', 'stat-row');
    [['题库总数', String(TOTAL)], ['错题本', String(wrongCount())],
     ['最近得分', lastScore === null ? '—' : lastScore]].forEach(function (pair) {
      const box = h('div', 'stat');
      box.appendChild(h('b', null, pair[1]));
      box.appendChild(h('span', null, pair[0]));
      stats.appendChild(box);
    });
    wrap.appendChild(stats);

    const grid = h('div', 'mode-grid');

    // 题库里写了 "# 设置: ... 不加入模拟考试" 的科目不摆考试入口;
    // 一科里全是阅读理解这种只做练习的题型时, 同样没有考试可摆
    if (hasExam()) {
      const examBlock = h('div', 'mode-block');
      const examBtn = h('button', 'mode-card primary');
      examBtn.setAttribute('data-action', 'start-exam');
      examBtn.appendChild(h('span', 't', '模拟考试'));
      examBtn.appendChild(h('span', 'd', examDesc()));
      examBlock.appendChild(examBtn);

      examBlock.appendChild(checkRow('toggle-shuffle', '选项位置随机打乱', 'shuffle', state.shuffleOptions));
      if (canSample()) {
        examBlock.appendChild(checkRow('toggle-random', '随机抽取 ' + sampleSize() + ' 题', 'random', state.sampleQuestions));
      }
      if (canBlank()) {
        examBlock.appendChild(checkRow('toggle-blank',
          '加入填空题 (随机 ' + BLANK_PICK + ' 道, ' + blankExamFull() + ' 分)', 'blank', state.withBlank));
      }
      if (canTerm()) {
        examBlock.appendChild(checkRow('toggle-term',
          '加入名词解释 (随机 ' + TERM_PICK + ' 道, ' + termExamFull() + ' 分)', 'term', state.withTerm));
      }
      if (ESSAYS.length) {
        examBlock.appendChild(checkRow('toggle-essay', '加入写作 (随机 1 篇, ' + ESSAY_FULL + ' 分)', 'essay', state.withEssay));
      }
      if (canReading()) {
        examBlock.appendChild(checkRow('toggle-reading',
          '加入阅读理解 (随机 ' + READING_PICK * 2 + ' 篇, ' + readingExamFull() + ' 分)', 'reading', state.withReading));
      }
      if (canSentrans()) {
        examBlock.appendChild(checkRow('toggle-sentrans',
          '加入单句翻译 (随机 ' + SENTRANS_PICK + ' 题, ' + sentransExamFull() + ' 分)', 'sentrans', state.withSentrans));
      }

      grid.appendChild(examBlock);
    }

    const pracBtn = h('button', 'mode-card' + (hasExam() ? '' : ' primary'));
    pracBtn.setAttribute('data-action', 'goto-practice');
    pracBtn.appendChild(h('span', 't', '练习模式'));
    pracBtn.appendChild(h('span', 'd', '边做边看答案, 可选择分节练习'));
    grid.appendChild(pracBtn);

    const wrongBtn = h('button', 'mode-card');
    wrongBtn.setAttribute('data-action', 'open-wrongbook');
    wrongBtn.appendChild(h('span', 't', '错题本 · ' + wrongCount() + ' 题'));
    wrongBtn.appendChild(h('span', 'd', '重做错题, 答对后自动移出 (含未作答的题)'));
    grid.appendChild(wrongBtn);

    wrap.appendChild(grid);

    if (history.length) {
      wrap.appendChild(h('div', 'section-title', '最近记录'));
      const list = h('div', 'history-list');
      history.slice(0, 5).forEach(function (rec) {
        const item = h('div', 'history-item');
        const rate = recFull(rec) ? recScore(rec) / recFull(rec) : 0;
        const scoreCls = rate >= 0.8 ? 'good' : (rate >= 0.6 ? '' : 'bad');
        item.appendChild(h('span', null, fmtDate(rec.at) + ' · ' +
          (rec.mode === 'exam' ? examLabel(rec) : (rec.essayFull ? '写作练习' : '练习')) +
          ' · 用时 ' + fmtTime(rec.seconds)));
        item.appendChild(h('span', 'score ' + scoreCls, recScore(rec) + ' / ' + recFull(rec)));
        list.appendChild(item);
      });
      wrap.appendChild(list);
    }

    return wrap;
  }

  /* ============ 练习模式设置 ============ */
  function viewPracticeSetup() {
    const wrap = h('div');
    const bar = h('div', 'topbar');
    const back = h('button', 'ghost', '← 返回');
    back.setAttribute('data-action', 'home');
    bar.appendChild(back);
    bar.appendChild(h('div', 'title', '选择练习范围'));
    bar.appendChild(h('span'));
    wrap.appendChild(bar);

    const grid = h('div', 'mode-grid');

    // 按题型分组: 题型作为一组的总入口, 组内再列出各分节
    const groups = [];
    TYPES.forEach(function (t) {
      groups.push({ type: t, sections: SECTIONS.filter(function (s) { return s.type === t.id; }) });
    });
    // 数据里出现但 types 没登记的题型, 兜底成一组
    SECTIONS.forEach(function (s) {
      if (!groups.some(function (g) { return g.type.id === s.type; })) {
        groups.push({ type: { id: s.type, name: TYPE_NAME[s.type] || s.type }, sections: [] });
        groups[groups.length - 1].sections.push(s);
      }
    });

    groups.forEach(function (group) {
      const typeQs = QUESTIONS.filter(function (q) { return q.type === group.type.id; });
      const card = h('div', 'type-card');

      const head = h('button', 'type-head');
      head.setAttribute('data-action', 'start-practice');
      head.setAttribute('data-scope', 'type:' + group.type.id);
      const typeScore = sumScore(typeQs);
      head.appendChild(h('span', 't', group.type.name + ' · 全部 ' + typeQs.length + ' 题'));
      head.appendChild(h('span', 'd', typeScoreDesc(typeQs, typeScore)));
      card.appendChild(head);

      // 只有该题型下有多个分节时才列出分节, 否则没有意义
      if (group.sections.length > 1) {
        const sub = h('div', 'type-sub');
        group.sections.forEach(function (s) {
          const list = QUESTIONS.filter(function (q) { return q.section === s.id; });
          const score = sumScore(list);
          const row = h('button', 'sub-row');
          row.setAttribute('data-action', 'start-practice');
          row.setAttribute('data-scope', s.id);
          row.appendChild(h('span', 't', s.name));
          // 每题 1 分的科目就别写"6 题 · 6 分"了, 数字重复看着累
          row.appendChild(h('span', 'd', list.length + ' 题' +
            (score === list.length ? '' : ' · ' + score + ' 分')));
          sub.appendChild(row);
        });
        card.appendChild(sub);
      }

      grid.appendChild(card);
    });

    // 写作单独一块: 它不是选择题, 点进去是写作文而不是答题
    if (ESSAYS.length) {
      const card = h('div', 'type-card');
      const head = h('button', 'type-head');
      head.setAttribute('data-action', 'start-practice');
      head.setAttribute('data-scope', 'writing');
      head.appendChild(h('span', 't', '写作 · 随机 1 篇'));
      head.appendChild(h('span', 'd', '共 ' + ESSAYS.length + ' 篇 · 满分 ' + ESSAY_FULL + ' 分'));
      card.appendChild(head);

      const sub = h('div', 'type-sub');
      ESSAYS.forEach(function (es) {
        const row = h('button', 'sub-row');
        row.setAttribute('data-action', 'start-practice');
        row.setAttribute('data-scope', 'essay:' + es.id);
        row.appendChild(h('span', 't', es.title || ('第 ' + es.no + ' 篇')));
        row.appendChild(h('span', 'd', es.minWords + ' 词'));
        sub.appendChild(row);
      });
      card.appendChild(sub);
      grid.appendChild(card);
    }

    wrap.appendChild(grid);

    wrap.appendChild(h('div', 'empty',
      '练习模式下每选一个选项立刻显示对错, 答错的题会进入错题本。'));
    return wrap;
  }

  /* ============ 答题界面 (考试 / 练习 / 重做) ============ */
  function isPracticeLike(mode) { return mode === 'practice' || mode === 'redo'; }

  // 考试一篇一页时, "当前题"看当前页: 单选页就是那一题, 短文页/作文页没有单题
  function currentQuestion() {
    const s = state.session;
    if (!s) return null;
    if (isPassageMode(s)) {
      const page = s.pages[s.page];
      if (!page || page.essay) return null;
      return page.qs.length === 1 ? page.qs[0] : null;
    }
    return s.questions[s.index];
  }

  function optionButton(q, idx, ctx) {
    const btn = h('button', 'option');
    btn.setAttribute('data-action', 'pick');
    btn.setAttribute('data-opt', String(idx));
    btn.appendChild(h('span', 'letter', LETTERS[idx]));
    btn.appendChild(h('span', 'text', q.options[idx]));

    const chosen = ctx.chosen === idx;
    const isAnswer = q.answer === idx;

    if (ctx.revealed) {
      btn.disabled = true;
      if (isAnswer) btn.classList.add('correct');
      else if (chosen) btn.classList.add('wrong');
    } else if (chosen) {
      btn.classList.add('chosen');
    }
    return btn;
  }

  // 解析数据有两种写法:
  //   分科目: { english: { 'lx1-13': {...} } }  —— 推荐, 新科目一律用这个
  //   扁平:   { 'lx1-13': {...} }               —— 早期只有英语时的格式, 只归英语
  function explanationFor(q) {
    const nested = EXPLANATIONS[currentId];
    if (nested && typeof nested === 'object') return nested[q.id] || null;
    if (currentId === 'english') return EXPLANATIONS[q.id] || null;
    return null;
  }

  // 解析面板: 考点 / 解析 / 句意 / 词汇
  function explainPanel(q) {
    const data = explanationFor(q);
    if (!data) return null;

    const box = h('div', 'explain');

    if (data.key) {
      const head = h('div', 'explain-head');
      head.appendChild(h('span', 'key', '考点 · ' + data.key));
      box.appendChild(head);
    }

    function row(label, content) {
      const wrap = h('div', 'explain-row');
      wrap.appendChild(h('span', 'label', label));
      const body = h('div', 'body');
      if (content instanceof Node) body.appendChild(content);
      else body.textContent = content;
      wrap.appendChild(body);
      box.appendChild(wrap);
    }

    if (data.explain) row('解析', data.explain);
    if (data.translation) row('句意', data.translation);

    if (data.words && data.words.length) {
      const list = h('div', 'words');
      data.words.forEach(function (pair) {
        const item = h('span', 'word');
        item.appendChild(h('b', null, pair[0]));
        item.appendChild(document.createTextNode(' ' + pair[1]));
        list.appendChild(item);
      });
      row('词汇', list);
    }

    return box;
  }

  /* ---- 作文在会话里是最后一步, 所以下标可以等于 questions.length ---- */
  function sessionSteps(s) { return s.questions.length + (s.essay ? 1 : 0); }
  // 一篇一页时作文是最后一页 (页里有 essay 标记); 逐题模式仍看下标
  function onEssayStep(s) {
    if (!s.essay) return false;
    if (!isPassageMode(s)) return s.index >= s.questions.length;
    const page = s.pages[s.page];
    return !!(page && page.essay);
  }
  function essayWritten(e) { return !!e && e.text.trim().length > 0; }
  // 练习模式里"已答" = 选择已揭晓; 作文只有评过分才算
  function essayDone(s) {
    if (!s.essay) return false;
    return s.mode === 'exam' ? essayWritten(s.essay) : !!s.essay.result;
  }

  function renderProgress(container) {
    const s = state.session;
    const prog = h('div', 'progress-wrap');
    const bar = h('div', 'progress-bar');
    const fill = h('i');

    // 一篇一页: 练习按篇算; 考试里单选一题一页, 只能按页算
    if (isPassageMode(s)) {
      fill.style.width = (s.page + 1) / s.pages.length * 100 + '%';
      bar.appendChild(fill);
      prog.appendChild(bar);
      prog.appendChild(h('span', null, onEssayStep(s) ? '作文'
        : (s.mode === 'exam' ? '第 ' + (s.page + 1) + ' / ' + s.pages.length + ' 页'
                             : '第 ' + (s.page + 1) + ' / ' + s.pages.length + ' 篇')));
      if (s.mode === 'exam') {
        const done = h('span', null, '已答 ' + answeredCount(s));
        done.id = 'answered-count';
        prog.appendChild(done);
      }
      container.appendChild(prog);
      return;
    }

    const steps = sessionSteps(s);
    fill.style.width = (steps ? (s.index + 1) / steps * 100 : 0) + '%';
    bar.appendChild(fill);
    prog.appendChild(bar);
    prog.appendChild(h('span', null,
      onEssayStep(s) ? '作文' : '第 ' + (s.index + 1) + ' / ' + steps + ' 题'));
    if (s.mode === 'exam') {
      const done = h('span', null, '已答 ' + answeredCount(s));
      done.id = 'answered-count';
      prog.appendChild(done);
    }
    container.appendChild(prog);
  }

  // 一道题答了没有: 自评文字题不进 answers(没有选项可存), 以自评为准
  function qDone(s, q) {
    return isTextQ(q) ? !!s.revealed[q.id] : s.answers[q.id] != null;
  }

  function answeredCount(s) {
    let n = 0;
    s.questions.forEach(function (q) { if (qDone(s, q)) n += 1; });
    return n + (essayDone(s) ? 1 : 0);
  }

  function renderNavigator(container) {
    const s = state.session;
    if (s.mode !== 'exam') return;
    const details = h('details', 'navigator');
    details.appendChild(h('summary', null, '答题卡'));
    const grid = h('div', 'nav-grid');

    // 一篇一页: 单选一页一格(写题号), 短文整页一格, 作文一格
    if (isPassageMode(s)) {
      s.pages.forEach(function (page, i) {
        let b;
        if (page.essay) {
          b = h('button', 'nav-btn', '作文');
          b.style.gridColumn = 'span 2';
          if (essayDone(s)) b.classList.add('answered');
        } else if (page.passage) {
          const left = page.qs.filter(function (q) { return !qDone(s, q); }).length;
          const doneN = page.qs.length - left;
          // 一道没做就只写篇名, 做了一部分才标 "3/6"
          b = h('button', 'nav-btn',
            '短文 ' + page.passage.key + (doneN ? ' · ' + doneN + '/' + page.qs.length : ''));
          if (!left) b.classList.add('answered');
          else if (doneN) b.classList.add('partial');
        } else {
          const item = page.qs[0];
          b = h('button', 'nav-btn', String(s.questions.indexOf(item) + 1));
          if (qDone(s, item)) b.classList.add('answered');
        }
        if (i === s.page) b.classList.add('current');
        b.setAttribute('data-action', 'goto');
        b.setAttribute('data-index', String(i));
        grid.appendChild(b);
      });
      details.appendChild(grid);
      container.appendChild(details);
      return;
    }

    s.questions.forEach(function (item, i) {
      const b = h('button', 'nav-btn', String(i + 1));
      if (qDone(s, item)) b.classList.add('answered');
      if (i === s.index) b.classList.add('current');
      b.setAttribute('data-action', 'goto');
      b.setAttribute('data-index', String(i));
      grid.appendChild(b);
    });
    if (s.essay) {
      const b = h('button', 'nav-btn', '作文');
      b.style.gridColumn = 'span 2';
      if (essayDone(s)) b.classList.add('answered');
      if (onEssayStep(s)) b.classList.add('current');
      b.setAttribute('data-action', 'goto');
      b.setAttribute('data-index', String(s.questions.length));
      grid.appendChild(b);
    }
    details.appendChild(grid);
    container.appendChild(details);
  }

  // 评分报告
  function essayReport(r) {
    const box = h('div', 'essay-report');
    box.id = 'essay-report';

    const head = h('div', 'essay-score');
    head.appendChild(h('span', 'num', r.score + ' 分'));
    head.appendChild(h('span', 'of', '满分 ' + r.full + ' 分'));

    if (r.empty) {
      head.firstChild.className = 'num bad';
      box.appendChild(head);
      box.appendChild(h('div', 'essay-empty', '没有写内容, 记 0 分。'));
      return box;
    }

    const ratio = r.score / r.full;
    head.firstChild.className = 'num ' + (ratio >= 0.8 ? 'good' : (ratio >= 0.6 ? 'mid' : 'bad'));
    box.appendChild(head);

    const stats = h('div', 'essay-stats');
    [['词', r.words], ['段', r.paragraphs], ['句', r.sentences],
     ['平均句长', r.avgSentence], ['连接词', r.connectives]].forEach(function (p) {
      const item = h('span');
      item.appendChild(h('b', null, String(p[1])));
      item.appendChild(document.createTextNode(' ' + p[0]));
      stats.appendChild(item);
    });
    box.appendChild(stats);

    const parts = h('div', 'essay-parts');
    r.parts.forEach(function (p) {
      const row = h('div', 'essay-part');
      const head2 = h('div', 'part-head');
      head2.appendChild(h('span', 'name', p.name));
      head2.appendChild(h('span', 'val', p.got + ' / ' + p.max));
      row.appendChild(head2);
      const bar = h('div', 'part-bar');
      const fill = h('i');
      const pr = p.max ? p.got / p.max : 0;
      fill.style.width = (pr * 100) + '%';
      fill.className = pr >= 0.8 ? 'good' : (pr >= 0.5 ? 'mid' : 'bad');
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(h('div', 'part-note', p.note));
      parts.appendChild(row);
    });
    box.appendChild(parts);

    if (r.issues.length) {
      box.appendChild(h('div', 'essay-sub', '可以改进的地方'));
      const ul = h('ul', 'essay-list');
      r.issues.forEach(function (t) { ul.appendChild(h('li', null, t)); });
      box.appendChild(ul);
    }
    if (r.errors.length) {
      box.appendChild(h('div', 'essay-sub', '基础错误'));
      const ul = h('ul', 'essay-list err');
      r.errors.forEach(function (t) { ul.appendChild(h('li', null, t)); });
      box.appendChild(ul);
    }

    box.appendChild(h('div', 'essay-caveat',
      '离线机器估算: 只数了词数、段落、提纲关键词覆盖、句式和拼写, 读不懂你写的意思。' +
      '分数仅供参考, 别当成真实水平。'));

    // 评完分就把范文摆出来对照
    const model = essayModelById(r.essayId);
    if (model) box.appendChild(modelBlock(model, false));
    return box;
  }

  function renderEssayStep(container) {
    const e = state.session.essay;
    const d = e.data;
    const card = h('div', 'qcard');
    card.appendChild(h('div', 'qmeta', '写作 · ' + ESSAY_FULL + ' 分'));

    card.appendChild(h('h2', 'essay-title', d.title || ('作文 ' + d.no)));
    card.appendChild(h('p', 'essay-prompt', d.prompt));
    if (d.outline.length) {
      const ol = h('ol', 'essay-outline');
      d.outline.forEach(function (t) { ol.appendChild(h('li', null, t)); });
      card.appendChild(ol);
    }
    card.appendChild(h('div', 'essay-req',
      '不少于 ' + (d.minWords || 120) + ' 词 · 提纲 ' + d.outline.length + ' 个要点, 建议一段写一个'));

    const ta = document.createElement('textarea');
    ta.id = 'essay-input';
    ta.className = 'essay-input';
    ta.value = e.text || '';
    ta.placeholder = '在这里写作文...';
    ta.rows = 12;
    card.appendChild(ta);

    const count = h('div', 'essay-count');
    count.id = 'essay-count';
    count.textContent = essayCountText(e.text, d);
    card.appendChild(count);

    // 范文只在练习模式给, 考试里给就是送答案了
    const model = state.session.mode === 'exam' ? null : essayModel(d);
    if (model) {
      const bar = h('div', 'model-bar');
      const toggle = h('button', 'ghost', '看范文');
      toggle.setAttribute('data-action', 'toggle-model');
      toggle.setAttribute('data-open', '0');
      bar.appendChild(toggle);
      bar.appendChild(h('span', 'hint', '先自己写, 写完再对照'));
      card.appendChild(bar);
      card.appendChild(modelBlock(model, true));
    }

    container.appendChild(card);

    if (e.result) container.appendChild(essayReport(e.result));
  }

  // 作文步骤的操作栏
  function renderEssayActions(container) {
    const s = state.session;
    const e = s.essay;
    const actions = h('div', 'actions');

    const prev = h('button', null, '上一题');
    prev.setAttribute('data-action', 'prev');
    prev.disabled = isPassageMode(s) ? s.page === 0 : s.index === 0;
    actions.appendChild(prev);

    const next = h('button', null, '作文是最后一步');
    next.setAttribute('data-action', 'next');
    next.disabled = true;
    actions.appendChild(next);
    actions.appendChild(h('span', 'spacer'));

    if (s.mode === 'exam') {
      // 考试里不立刻给分, 交卷时统一评
      const submit = h('button', 'primary', '提交试卷');
      submit.setAttribute('data-action', 'submit-exam');
      actions.appendChild(submit);
    } else {
      const grade = h('button', e.result ? null : 'primary', e.result ? '重新评分' : '提交并评分');
      grade.setAttribute('data-action', 'grade-essay');
      actions.appendChild(grade);
      const finish = h('button', e.result ? 'primary' : null, '完成练习');
      finish.setAttribute('data-action', 'finish-practice');
      actions.appendChild(finish);
    }
    container.appendChild(actions);
  }

  /* 自评文字题: (原文) + 输入框 + 自评按钮。
     没有标准答案可判, 所以让做题的人自己判; 判完才给参考答案对照 ——
     顺序反了就等于先把答案摆在眼前。
     翻译题下面挂着要译的原文, 填空/名词解释题没有原文, 直接写答案。 */
  function translateBody(card, q, s, revealed) {
    const isTl = q.sub === 'translate';
    if (q.source) card.appendChild(h('div', 'tl-source', q.source));

    const text = s.transTexts[q.id] || '';
    const ta = document.createElement('textarea');
    ta.id = 'tl-input';
    ta.className = 'tl-input';
    ta.rows = 5;
    ta.placeholder = isTl ? '写出你的译文...' : '写出你的答案...';
    ta.value = text;
    ta.disabled = revealed;
    card.appendChild(ta);

    if (!revealed) {
      const has = !!text.trim();
      const bar = h('div', 'tl-actions');
      const okBtn = h('button', 'primary',
        (isTl ? '我翻对了' : '我答对了') + ' (+' + qScore(q) + ' 分)');
      okBtn.id = 'tl-ok';
      okBtn.setAttribute('data-action', 'self-ok');
      okBtn.disabled = !has;
      const noBtn = h('button', null, isTl ? '我翻错了' : '我答错了');
      noBtn.id = 'tl-bad';
      noBtn.setAttribute('data-action', 'self-bad');
      noBtn.disabled = !has;
      bar.appendChild(okBtn);
      bar.appendChild(noBtn);
      bar.appendChild(h('span', 'hint', isTl ? '译完自己判, 判完给参考译文对照'
        : '写完自己判, 判完给参考答案对照'));
      card.appendChild(bar);
      return;
    }

    card.appendChild(h('div', 'feedback ' + (s.selfOk[q.id] ? 'ok' : 'no'),
      s.selfOk[q.id] ? '✓ 自评正确' : '✗ 自评错误, 已记入错题本'));

    // 参考答案只在自己判完之后给 (考试里也一样): 这类题没有选择题那种"标准答案",
    // 不给参考就没法自评, 而上面这个 return 已经挡住了"没判就看答案"
    if (q.ref) {
      const ref = h('div', 'tl-ref');
      ref.appendChild(h('div', 'tl-ref-head', isTl ? '参考译文' : '参考答案'));
      ref.appendChild(h('p', null, q.ref));
      card.appendChild(ref);
    }
  }

  // 一张题卡: 标注 + 题干 + 选项(或自评文字题) + 判分反馈 + 解析。
  // 逐题翻页和一篇一页共用, 所以题目从参数进来, 不读"当前题"
  function questionCard(q, s) {
    const card = h('div', 'qcard');
    card.setAttribute('data-qid', q.id);
    card.appendChild(h('div', 'qmeta', qmetaText(q) + ' · ' + qScore(q) + ' 分'));

    card.appendChild(stemNode(q.stem));

    const revealed = !!s.revealed[q.id];

    if (isTextQ(q)) {
      translateBody(card, q, s, revealed);
    } else {
      const opts = h('div', 'options');
      for (let i = 0; i < q.options.length; i++) {
        opts.appendChild(optionButton(q, i, { chosen: s.answers[q.id], revealed: revealed }));
      }
      card.appendChild(opts);

      if (revealed && s.answers[q.id] != null) {
        const ok = s.answers[q.id] === q.answer;
        const fb = h('div', 'feedback ' + (ok ? 'ok' : 'no'),
          ok ? '✓ 回答正确' : '✗ 回答错误, 正确答案是 ' + LETTERS[q.answer] + '. ' + q.options[q.answer]);
        card.appendChild(fb);
      } else if (revealed) {
        card.appendChild(h('div', 'feedback no',
          '未作答, 正确答案是 ' + LETTERS[q.answer] + '. ' + q.options[q.answer]));
      }
    }

    // 解析与释义只在练习/重做模式下展示, 考试中不显示
    if (revealed && isPracticeLike(s.mode)) {
      const panel = explainPanel(q);
      if (panel) card.appendChild(panel);
    }

    return card;
  }

  // 一篇一页: 短文摆上面, 它名下的题目挨着排下去, 一道一道即时判分
  function renderPassagePage(container) {
    const s = state.session;
    const page = currentPage(s);

    renderProgress(container);

    const pn = page.passage && passageNode(page.passage.id);
    if (pn) container.appendChild(pn);

    page.qs.forEach(function (q) { container.appendChild(questionCard(q, s)); });

    const actions = h('div', 'actions');
    const prev = h('button', null, '上一篇');
    prev.setAttribute('data-action', 'prev');
    prev.disabled = s.page === 0;
    actions.appendChild(prev);

    const last = s.page >= s.pages.length - 1;
    const nextPage = last ? null : s.pages[s.page + 1];
    const next = h('button', 'primary', last ? '完成练习'
      : '下一篇 → ' + (nextPage.passage ? '短文 ' + nextPage.passage.key : ''));
    // 最后一篇没有下一篇, 直接换成完成练习 (没做完的题按答错收尾, 见 forceClosePage)
    next.setAttribute('data-action', last ? 'finish-practice' : 'next');
    actions.appendChild(next);
    container.appendChild(actions);
  }

  // 考试勾了阅读理解: 单选一题一页 + 短文一篇一页 + 作文一页。
  // 交卷、答题卡、进度都照旧, 只是翻页的单位从"题"变成了"页"
  function renderExamPage(container) {
    const s = state.session;
    const page = currentPage(s);

    renderProgress(container);
    renderNavigator(container);

    if (page.essay) {
      renderEssayStep(container);
      renderEssayActions(container);
      return;
    }

    const pn = page.passage && passageNode(page.passage.id);
    if (pn) container.appendChild(pn);
    page.qs.forEach(function (q) { container.appendChild(questionCard(q, s)); });

    const actions = h('div', 'actions');
    const prev = h('button', null, '上一题');
    prev.setAttribute('data-action', 'prev');
    prev.disabled = s.page === 0;
    actions.appendChild(prev);

    const last = s.page >= s.pages.length - 1;
    const nextPage = last ? null : s.pages[s.page + 1];
    const next = h('button', last ? null : 'primary', last ? '这是最后一题'
      : (nextPage.essay ? '下一篇 → 作文'
        : (nextPage.passage ? '下一篇 → 短文 ' + nextPage.passage.key : '下一题')));
    next.setAttribute('data-action', 'next');
    next.disabled = last;
    actions.appendChild(next);

    actions.appendChild(h('span', 'spacer'));
    // 考试里翻页不强制收尾: 没答的题交卷时算"未答", 提交前会提示还剩几题
    const submit = h('button', 'primary', '提交试卷');
    submit.setAttribute('data-action', 'submit-exam');
    actions.appendChild(submit);
    container.appendChild(actions);
  }

  function renderQuestionArea(container) {
    const s = state.session;
    if (isPassageMode(s)) {
      if (s.mode === 'exam') renderExamPage(container);
      else renderPassagePage(container);
      return;
    }

    const q = currentQuestion();
    if (!q && !onEssayStep(s)) return;

    renderProgress(container);
    renderNavigator(container);

    if (onEssayStep(s)) {
      renderEssayStep(container);
      renderEssayActions(container);
      return;
    }

    // 短文摆在题卡上面 —— 做题时要一直看得见
    if (q.passage) {
      const pn = passageNode(q.passage);
      if (pn) container.appendChild(pn);
    }

    container.appendChild(questionCard(q, s));

    // 操作栏
    const actions = h('div', 'actions');
    const prev = h('button', null, '上一题');
    prev.setAttribute('data-action', 'prev');
    prev.disabled = s.index === 0;
    actions.appendChild(prev);

    const last = s.index === sessionSteps(s) - 1;
    const next = h('button', last ? null : 'primary', last ? '这是最后一题' : '下一题');
    next.setAttribute('data-action', 'next');
    next.disabled = last;
    actions.appendChild(next);

    actions.appendChild(h('span', 'spacer'));

    if (s.mode === 'exam') {
      const submit = h('button', 'primary', '提交试卷');
      submit.setAttribute('data-action', 'submit-exam');
      actions.appendChild(submit);
    } else if (last || Object.keys(s.revealed).length === s.questions.length) {
      // 全部答完(或已到最后一题)即可收尾, 不必翻到末尾
      const finish = h('button', 'primary', '完成练习');
      finish.setAttribute('data-action', 'finish-practice');
      actions.appendChild(finish);
    }
    container.appendChild(actions);
  }

  function viewSession() {
    const s = state.session;
    const wrap = h('div');

    const bar = h('div', 'topbar');
    const exit = h('button', 'ghost', '← 退出');
    exit.setAttribute('data-action', 'exit-session');
    bar.appendChild(exit);
    const titleBox = h('div', 'title');
    titleBox.appendChild(document.createTextNode(
      s.mode === 'exam' ? '模拟考试' : (s.mode === 'redo' ? '重做错题' : '练习模式')));
    const tags = [];
    // 抽题抽的是单选题, 别把这轮加进来的阅读题也算进去
    if (s.sampled) tags.push('随机抽题 ' + examSingles());
    if (s.withSentrans) tags.push('单句翻译 ' + SENTRANS_PICK + ' 题');
    if (s.withReading) tags.push('阅读 ' + READING_PICK * 2 + ' 篇');
    if (s.withBlank) tags.push('填空 ' + BLANK_PICK + ' 题');
    if (s.withTerm) tags.push('名词解释 ' + TERM_PICK + ' 题');
    if (s.essay) tags.push('作文 ' + ESSAY_FULL + ' 分');
    if (s.shuffled) tags.push('选项乱序');
    if (tags.length) titleBox.appendChild(h('span', 'badge', tags.join(' · ')));
    bar.appendChild(titleBox);
    const timer = h('span', 'timer', '00:00');
    timer.id = 'timer';
    bar.appendChild(timer);
    wrap.appendChild(bar);

    renderQuestionArea(wrap);
    return wrap;
  }

  /* ============ 结算 ============ */
  // 翻译题没有选项也没有标准答案: 判对错的人是自己, "答了没答"看自评了没有
  function isTranslate(q) { return q.sub === 'translate'; }

  // 自评文字题: 翻译题(把原文译成中文)和填空/名词解释题(自己写答案, 对照参考答案)。
  // 两者的答题流程一模一样 —— 写一段文字, 自己判对错, 判完才给参考答案 ——
  // 所以共用一套 UI 和会话状态 (transTexts / selfOk / revealed)。
  // 阅读相关的几处仍只认 isTranslate: 那边的题有选项, 是选择题那一套。
  function isTextQ(q) { return q.sub === 'translate' || q.sub === 'text'; }

  function buildResult(session) {
    const entries = session.questions.map(function (q) {
      if (isTextQ(q)) {
        return {
          q: q,
          chosen: null,
          ok: !!session.selfOk[q.id],
          graded: !!session.revealed[q.id],
          text: session.transTexts[q.id] || '',
        };
      }
      const chosen = session.answers[q.id];
      return { q: q, chosen: chosen == null ? null : chosen, ok: chosen === q.answer };
    });
    // 翻篇时被强制收尾的题 (revealed 了但没选) 算"答错", 不算"未答"
    const answered = function (e) {
      return isTextQ(e.q) ? e.graded : (e.chosen !== null || !!session.revealed[e.q.id]);
    };
    // 记在条目上: 题型明细也要按"错"和"未答"分开数
    entries.forEach(function (e) { e.skipped = !e.ok && !answered(e); });
    const correct = entries.filter(function (e) { return e.ok; }).length;
    const skipped = entries.filter(function (e) { return e.skipped; }).length;
    return {
      mode: session.mode,
      shuffled: !!session.shuffled,
      sampled: !!session.sampled,
      // 这次抽了多少道单选 (total 里还含单句翻译/阅读/填空的题), 成绩单标题要用
      singles: examSingles(),
      withSentrans: !!session.withSentrans,
      withReading: !!session.withReading,
      withBlank: !!session.withBlank,
      withTerm: !!session.withTerm,
      entries: entries,
      total: entries.length,
      correct: correct,
      skipped: skipped,
      wrong: entries.length - correct - skipped,
      // 分值不统一的科目按题上标的分数算分, 全 1 分时 points === correct
      points: entries.reduce(function (a, e) { return a + (e.ok ? qScore(e.q) : 0); }, 0),
      full: sumScore(session.questions),
      essay: session.essay ? session.essay.result : null,
      seconds: elapsedSeconds(),
    };
  }

  // 历史记录里的作文部分 (没写作文就是空的)
  function essayRecord(rec) {
    if (!rec) return null;
    return {
      essayScore: rec.score,
      essayFull: rec.full,
      essayTitle: rec.empty ? null : rec.title,
    };
  }

  function applyGrading(result) {
    // 错题本规则: 答错或未作答 → 加入/累加; 答对且已在错题本中 → 移出
    result.entries.forEach(function (e) {
      if (e.ok) markRight(e.q.id);
      // chosen 是本次会话的下标, 要换算回原始下标再存, chosen 为 null 表示未作答
      else markWrong(e.q.id, toOriginalIndex(e.q, e.chosen));
    });
  }

  function viewResult() {
    const r = state.result;
    const wrap = h('div');

    // 作文分和客观题分并到一张成绩单里
    const essayGot = r.essay ? r.essay.score : 0;
    const essayFull = r.essay ? r.essay.full : 0;
    const got = r.points + essayGot;
    const full = r.full + essayFull;
    const rate = full ? got / full : 0;
    const cls = rate >= 0.8 ? 'good' : (rate >= 0.6 ? 'mid' : 'bad');

    const card = h('div', 'score-card');
    card.appendChild(h('div', 'score-num ' + cls, got + ' 分'));
    card.appendChild(h('div', 'score-sub',
      (r.mode === 'exam' ? examLabel(r) : (r.mode === 'redo' ? '错题重做' : '练习')) +
      ' · 满分 ' + full + ' 分 · 得分率 ' + Math.round(rate * 100) + '% · 用时 ' + fmtTime(r.seconds)));

    const detail = h('div', 'score-detail');
    const detailRows = [['正确', r.correct, 'good'], ['错误', r.wrong, 'bad'], ['未答', r.skipped, '']];
    if (r.essay) detailRows.push(['作文', essayGot + '/' + essayFull, '']);
    detailRows.forEach(function (row) {
      const box = h('div');
      const b = h('b', row[2] ? row[2] : null, String(row[1]));
      if (row[2]) b.style.color = row[2] === 'good' ? 'var(--green)' : 'var(--red)';
      box.appendChild(b);
      box.appendChild(h('span', null, row[0]));
      detail.appendChild(box);
    });
    card.appendChild(detail);

    // 模拟考试: 再按题型拆一遍, 每类对了几道错了几道 (作文不在这张表里)。
    // 顺序跟着卷面走 (单选 -> 单句翻译 -> 短文), 不按题库题型表排
    if (r.mode === 'exam' && r.total) {
      const order = [], stat = {};
      r.entries.forEach(function (e) {
        if (!stat[e.q.type]) { stat[e.q.type] = { total: 0, ok: 0, skip: 0 }; order.push(e.q.type); }
        stat[e.q.type].total += 1;
        if (e.ok) stat[e.q.type].ok += 1;
        else if (e.skipped) stat[e.q.type].skip += 1;
      });
      const types = h('div', 'score-types');
      order.forEach(function (typeId) {
        const s = stat[typeId];
        const bad = s.total - s.ok - s.skip;
        const row = h('div', 'type-row');
        row.setAttribute('data-type', typeId);
        row.appendChild(h('span', 'name', TYPE_NAME[typeId] || typeId));
        row.appendChild(h('span', 'num' + (s.ok ? ' good' : ' zero'), '对 ' + s.ok));
        row.appendChild(h('span', 'num' + (bad ? ' bad' : ' zero'), '错 ' + bad));
        // 未答和"错"分开数, 没未答就不摆这一列 (上面的总览也是这么分的)
        if (s.skip) row.appendChild(h('span', 'num zero', '未答 ' + s.skip));
        types.appendChild(row);
      });
      card.appendChild(types);
    }
    wrap.appendChild(card);

    // 作文评分报告
    if (r.essay) {
      wrap.appendChild(h('div', 'section-title', '作文 · ' + (r.essay.title || '')));
      wrap.appendChild(essayReport(r.essay));
    }

    // 操作
    const actions = h('div', 'actions');
    actions.style.marginBottom = '18px';
    if (r.mode === 'redo') {
      const remain = wrongCount();
      const again = h('button', 'primary', remain ? '继续重做剩余 ' + remain + ' 题' : '错题本已清空');
      again.setAttribute('data-action', 'redo-wrong');
      again.disabled = !remain;
      actions.appendChild(again);
    } else {
      const wrongOnes = r.entries.filter(function (e) { return !e.ok; });
      const again = h('button', 'primary', '只做错题 (' + wrongOnes.length + ')');
      again.setAttribute('data-action', 'practice-wrong-now');
      again.disabled = !wrongOnes.length;
      actions.appendChild(again);
    }
    const home = h('button', null, '返回首页');
    home.setAttribute('data-action', 'home');
    actions.appendChild(home);
    wrap.appendChild(actions);

    // 只写作文的练习没有客观题可回顾
    if (!r.total) return wrap;

    // 题目回顾
    const head = h('div', 'section-title');
    head.style.display = 'flex';
    head.style.justifyContent = 'space-between';
    head.style.alignItems = 'center';
    head.appendChild(h('span', null, '答题回顾'));

    const toggleWrap = h('label');
    toggleWrap.style.fontWeight = '400';
    toggleWrap.style.fontSize = '13px';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = state.filterWrongOnly;
    toggle.setAttribute('data-action', 'toggle-wrong-only');
    toggleWrap.appendChild(toggle);
    toggleWrap.appendChild(document.createTextNode(' 只看错题/未答'));
    head.appendChild(toggleWrap);
    wrap.appendChild(head);

    const list = h('div');
    r.entries.forEach(function (e) {
      if (state.filterWrongOnly && e.ok) return;
      // 自评文字题没有选项, "未答"要看有没有自评过
      const answered = isTextQ(e.q) ? e.graded : e.chosen !== null;
      const item = h('div', 'review-item ' + (e.ok ? '' : (answered ? 'wrong' : 'skipped')));
      const tag = h('span', 'tag ' + (e.ok ? 'ok' : (answered ? 'no' : 'skip')),
        e.ok ? '正确' : (answered ? '错误' : '未答'));
      const meta = h('div');
      meta.appendChild(tag);
      meta.appendChild(h('span', 'qmeta', qmetaText(e.q)));
      item.appendChild(meta);
      item.appendChild(stemNode(e.q.stem, 'stem'));

      if (isTextQ(e.q)) {
        const isTl = e.q.sub === 'translate';
        if (e.q.source) item.appendChild(h('div', 'tl-source', e.q.source));
        const myTl = h('div', 'review-line');
        myTl.appendChild(document.createTextNode(isTl ? '你的译文: ' : '你的答案: '));
        myTl.appendChild(h('b', (e.ok ? 'good' : 'bad') + ' tl-text', e.text || '未作答'));
        item.appendChild(myTl);
        const refTl = h('div', 'review-line');
        refTl.appendChild(document.createTextNode(isTl ? '参考译文: ' : '参考答案: '));
        refTl.appendChild(h('b', 'good tl-text', e.q.ref || ''));
        item.appendChild(refTl);
        list.appendChild(item);
        return;
      }

      const mine = h('div', 'review-line');
      mine.appendChild(document.createTextNode('你的答案: '));
      const m = h('b', e.ok ? 'good' : 'bad', optionText(e.q, e.chosen));
      mine.appendChild(m);
      item.appendChild(mine);

      if (!e.ok) {
        const right = h('div', 'review-line');
        right.appendChild(document.createTextNode('正确答案: '));
        right.appendChild(h('b', 'good', optionText(e.q, e.q.answer)));
        item.appendChild(right);
      }
      list.appendChild(item);
    });
    if (!list.childNodes.length) {
      list.appendChild(h('div', 'empty', '全部正确, 没有错题 🎉'));
    }
    wrap.appendChild(list);

    return wrap;
  }

  /* ============ 错题本 ============ */
  function viewWrongBook() {
    const wrap = h('div');

    const bar = h('div', 'topbar');
    const back = h('button', 'ghost', '← 返回');
    back.setAttribute('data-action', 'home');
    bar.appendChild(back);
    bar.appendChild(h('div', 'title', '错题本'));
    bar.appendChild(h('span'));
    wrap.appendChild(bar);

    const ids = Object.keys(wrongBook);
    if (!ids.length) {
      wrap.appendChild(h('div', 'empty', '错题本是空的。去考试或练习吧!'));
      return wrap;
    }

    const actions = h('div', 'actions');
    actions.style.marginBottom = '18px';
    const redo = h('button', 'primary', '重做全部错题 (' + ids.length + ')');
    redo.setAttribute('data-action', 'redo-wrong');
    actions.appendChild(redo);
    const clear = h('button', 'danger', '清空错题本');
    clear.setAttribute('data-action', 'clear-wrongbook');
    actions.appendChild(clear);
    wrap.appendChild(actions);

    wrap.appendChild(h('div', 'empty',
      '答错或未作答的题会进入错题本; 答对一题即自动移出, 答错则保留并累计错误次数。'));

    // 按最近出错时间排序
    const sorted = ids
      .map(function (id) { return BY_ID[id]; })
      .filter(Boolean)
      .sort(function (a, b) { return (wrongBook[b.id].lastAt || 0) - (wrongBook[a.id].lastAt || 0); });

    sorted.forEach(function (q) {
      const entry = wrongBook[q.id];
      const item = h('div', 'review-item wrong');

      const meta = h('div');
      meta.appendChild(h('span', 'tag no', '错 ' + entry.count + ' 次'));
      meta.appendChild(h('span', 'qmeta', qmetaText(q)));
      item.appendChild(meta);
      item.appendChild(stemNode(q.stem, 'stem'));

      // 自评文字题没有选项也没有"上次选了哪个": 翻译题给原文和参考译文,
      // 填空/名词解释给参考答案就够了
      if (isTextQ(q)) {
        const isTl = q.sub === 'translate';
        if (q.source) item.appendChild(h('div', 'tl-source', q.source));
        const ref = h('div', 'review-line');
        ref.appendChild(document.createTextNode(isTl ? '参考译文: ' : '参考答案: '));
        ref.appendChild(h('b', 'good tl-text', q.ref || ''));
        item.appendChild(ref);
      } else {
        const right = h('div', 'review-line');
        right.appendChild(document.createTextNode('正确答案: '));
        right.appendChild(h('b', 'good', optionText(q, q.answer)));
        item.appendChild(right);

        const mine = h('div', 'review-line');
        mine.appendChild(document.createTextNode('上次: '));
        mine.appendChild(h('b', 'bad',
          entry.lastAnswer == null ? '未作答' : optionText(q, entry.lastAnswer)));
        item.appendChild(mine);
      }

      const rm = h('button', 'ghost danger', '已掌握, 移出');
      rm.style.marginTop = '10px';
      rm.style.padding = '4px 12px';
      rm.style.fontSize = '13px';
      rm.setAttribute('data-action', 'remove-wrong');
      rm.setAttribute('data-qid', q.id);
      item.appendChild(rm);

      wrap.appendChild(item);
    });

    return wrap;
  }

  /* ============ 渲染 ============ */
  let lastRenderKey = null;

  function render() {
    if (state.view !== 'exam' && state.view !== 'practice') stopTimer();

    let node;
    switch (state.view) {
      case 'exam':
      case 'practice':
        node = viewSession();
        break;
      case 'practice-setup':
        node = viewPracticeSetup();
        break;
      case 'result':
        node = viewResult();
        break;
      case 'wrongbook':
        node = viewWrongBook();
        break;
      default:
        node = viewHome();
    }
    root.replaceChildren(node);
    glossAll(root);   // 标注是要在真 DOM 上做的, 所以得等挂上去之后

    // 只有切换视图或翻页时才回到顶部, 选答案时保持当前位置
    const key = state.view + '#' + (state.session
      ? (isPassageMode(state.session) ? 'p' + state.session.page : state.session.index)
      : '');
    if (key !== lastRenderKey) {
      lastRenderKey = key;
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // 刚评完作文的话, 直接滚到报告那里
    if (state.session && state.session.essay && state.session.essay.scrollToReport) {
      state.session.essay.scrollToReport = false;
      const report = document.getElementById('essay-report');
      if (report) report.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  /* ============ 会话控制 ============ */
  // essay 传 null 就是没有作文; 传作文对象则作为最后一步
  function startSession(mode, questions, essay) {
    // 选项乱序只在模拟考试生效; 练习/重做保持原顺序, 便于对照错题本。
    // 自评文字题没有选项, 洗不得 —— 空 options 会让 shuffleQuestion 把 answer 洗成 -1
    const shuffled = mode === 'exam' && state.shuffleOptions;
    const list = shuffled
      ? questions.map(function (q) { return isTextQ(q) ? q : shuffleQuestion(q); })
      : questions;
    // 考卷里有没有阅读理解: 有就一篇一页混排 (单选仍是逐题一页)
    const withReading = mode === 'exam' && state.withReading && canReading();
    state.session = {
      mode: mode,
      questions: list,
      shuffled: shuffled,
      // 抽题只影响单选题, 拿它跟题库里的单选数比 (加进来的阅读题不算)
      sampled: mode === 'exam' && state.sampleQuestions && canSample(),
      withSentrans: mode === 'exam' && withSentransNow(),
      withReading: withReading,
      withBlank: mode === 'exam' && withBlankNow(),
      withTerm: mode === 'exam' && withTermNow(),
      // 阅读理解练习一篇一页; 考试勾了阅读是一篇一页混排; 其余的会话 pages 为 null, 照旧逐题翻
      pages: mode === 'practice' ? buildPassagePages(list)
        : (withReading ? buildExamPages(list, !!essay) : null),
      page: 0,
      essay: essay ? { data: essay, text: '', result: null } : null,
      answers: {},
      revealed: {},   // 练习/重做: 已揭示答案的题目
      selfOk: {},     // 自评文字题: 自己判的对错
      transTexts: {}, // 自评文字题: 写下的译文/答案
      index: 0,
      startAt: Date.now(),
    };
    state.view = (mode === 'exam') ? 'exam' : 'practice';
    if (mode === 'exam') startTimer();
    render();
  }

  // 一篇短文一页: 练习模式下题目全来自短文时, 按短文归组 (顺序跟着题库走)。
  // 只要混进一道没有短文的题 (比如错题重做里掺了单选题) 就返回 null, 退回逐题翻页。
  function buildPassagePages(list) {
    if (!list.length) return null;
    if (!list.every(function (q) { return q.passage && PASSAGE_BY_ID[q.passage]; })) return null;
    const pages = [];
    const seen = {};
    list.forEach(function (q) {
      if (!seen[q.passage]) {
        seen[q.passage] = { passage: PASSAGE_BY_ID[q.passage], qs: [] };
        pages.push(seen[q.passage]);
      }
      seen[q.passage].qs.push(q);
    });
    return pages;
  }

  // 考试的页: 单选一题一页, 短文一篇一页 (顺序跟着选题走), 作文摆在最后一页
  function buildExamPages(list, hasEssay) {
    const pages = [];
    const seen = {};
    list.forEach(function (q) {
      if (!q.passage || !PASSAGE_BY_ID[q.passage]) { pages.push({ passage: null, qs: [q] }); return; }
      if (!seen[q.passage]) {
        seen[q.passage] = { passage: PASSAGE_BY_ID[q.passage], qs: [] };
        pages.push(seen[q.passage]);
      }
      seen[q.passage].qs.push(q);
    });
    if (hasEssay) pages.push({ essay: true, qs: [] });
    return pages;
  }

  function isPassageMode(s) { return !!(s && s.pages && s.pages.length); }
  function currentPage(s) { return isPassageMode(s) ? s.pages[s.page] : null; }

  // 翻篇时把本页还没做的题按答错收尾。不记 lastAnswer, 错题本里显示"未作答"
  function forceClosePage(s, pageIdx) {
    const page = isPassageMode(s) ? s.pages[pageIdx] : null;
    if (!page) return;
    page.qs.forEach(function (q) {
      if (s.revealed[q.id]) return;
      s.revealed[q.id] = true;
      if (isTextQ(q)) s.selfOk[q.id] = false;
      markWrong(q.id, null);
    });
  }

  // 随机抽一篇作文
  function pickEssay() {
    if (!ESSAYS.length) return null;
    return pickRandom(ESSAYS, 1)[0];
  }

  // 点到的元素属于哪道题: 题卡上带 data-qid, 一篇一页时一页好几张卡, 不能靠"当前题"猜。
  // 找不到就退回当前题 (逐题翻页的老路径)
  function questionFrom(el) {
    const s = state.session;
    const host = el && el.closest ? el.closest('[data-qid]') : null;
    const qid = host && host.getAttribute('data-qid');
    if (!qid || !s) return currentQuestion();
    // 从会话里找, 不能查 BY_ID —— 考试乱序时选项顺序是改过的副本
    return s.questions.filter(function (q) { return q.id === qid; })[0] || currentQuestion();
  }

  function pickOption(q, optIndex) {
    const s = state.session;
    if (!s || !q) return;

    if (isPracticeLike(s.mode) && s.revealed[q.id]) return; // 已揭示, 不能改

    s.answers[q.id] = optIndex;

    if (isPracticeLike(s.mode)) {
      s.revealed[q.id] = true;
      // 练习模式即时计入错题本 (存原始下标, 与错题本展示的顺序一致)
      if (optIndex === q.answer) markRight(q.id);
      else markWrong(q.id, toOriginalIndex(q, optIndex));
    }
    render();
  }

  /* 自评文字题判对错: 点完就当作交了这一题, 展开参考答案。
     判错时 lastAnswer 只能传 null —— 没有选项下标可存, 错题本里也不显示"上次选了哪个" */
  function selfGrade(q, ok) {
    const s = state.session;
    if (!s || !q || !isTextQ(q) || s.revealed[q.id]) return;
    const text = (s.transTexts[q.id] || '').trim();
    if (!text) return;   // 按钮在没写字时是禁用的, 这里再兜一次
    s.revealed[q.id] = true;
    s.selfOk[q.id] = ok;
    // 考试统一在交卷时 applyGrading 里记账, 这里再记一遍就重复了
    if (s.mode !== 'exam') {
      if (ok) markRight(q.id);
      else markWrong(q.id, null);
    }
    render();
  }

  function finishSession() {
    const s = state.session;
    // 考试模式写作是交卷时才评的; 练习模式可能已经评过了
    if (s.essay && !s.essay.result) {
      s.essay.result = gradeEssay(s.essay.text, s.essay.data);
    }
    const result = buildResult(s);
    if (s.mode === 'exam') {
      applyGrading(result);
      history.unshift(Object.assign({
        at: Date.now(),
        mode: 'exam',
        shuffled: !!result.shuffled,
        sampled: !!result.sampled,
        withSentrans: !!result.withSentrans,
        withReading: !!result.withReading,
        withBlank: !!result.withBlank,
        withTerm: !!result.withTerm,
        singles: examSingles(),   // 这次抽了多少道单选 (total 里还含单句翻译/阅读题)
        total: result.total,
        correct: result.correct,
        points: result.points,
        full: result.full,
        seconds: result.seconds,
        wrongIds: result.entries.filter(function (e) { return !e.ok; }).map(function (e) { return e.q.id; }),
      }, essayRecord(result.essay)));
      history = history.slice(0, HISTORY_MAX);
      saveHistory();
    } else {
      history.unshift(Object.assign({
        at: Date.now(),
        mode: 'practice',
        total: result.total,
        correct: result.correct,
        points: result.points,
        full: result.full,
        seconds: result.seconds,
        wrongIds: [],
      }, essayRecord(result.essay)));
      history = history.slice(0, HISTORY_MAX);
      saveHistory();
    }
    state.result = result;
    state.session = null;
    stopTimer();
    state.view = 'result';
    state.filterWrongOnly = s.mode === 'exam';
    render();
  }

  /* ============ 事件 ============ */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');

    switch (action) {
      case 'start-exam':
        startSession('exam', buildExamQuestions(), state.withEssay ? pickEssay() : null);
        break;

      case 'goto-practice':
        state.view = 'practice-setup';
        render();
        break;

      case 'start-practice': {
        const scope = el.getAttribute('data-scope') || 'all';

        // 写作是另一个流程: 只有一篇作文, 没有选择题
        if (scope === 'writing') {
          const essay = pickEssay();
          if (!essay) { window.alert('题库里还没有作文'); return; }
          startSession('practice', [], essay);
          return;
        }
        if (scope.indexOf('essay:') === 0) {
          const id = scope.slice(6);
          const essay = ESSAYS.filter(function (x) { return x.id === id; })[0];
          if (!essay) { window.alert('找不到这篇作文'); return; }
          startSession('practice', [], essay);
          return;
        }

        let list;
        if (scope === 'all') list = QUESTIONS.slice();
        else if (scope.indexOf('type:') === 0) {
          const type = scope.slice(5);
          list = QUESTIONS.filter(function (q) { return q.type === type; });
        } else list = QUESTIONS.filter(function (q) { return q.section === scope; });
        if (!list.length) { window.alert('该范围内没有题目'); return; }
        startSession('practice', list);
        break;
      }

      case 'grade-essay': {
        const s = state.session;
        if (!s || !s.essay) break;
        s.essay.result = gradeEssay(s.essay.text, s.essay.data);
        s.essay.scrollToReport = true;
        render();
        break;
      }

      case 'toggle-model': {
        // 直接改 DOM, 不走 render(): 重渲染会丢掉输入框里的光标和滚动位置
        const card = el.closest('.qcard');
        const box = card && card.querySelector('.essay-model');
        if (!box) break;
        const open = el.getAttribute('data-open') === '1';
        box.style.display = open ? 'none' : '';
        el.setAttribute('data-open', open ? '0' : '1');
        el.textContent = open ? '看范文' : '收起范文';
        break;
      }

      case 'open-wrongbook':
        state.view = 'wrongbook';
        render();
        break;

      case 'home':
        state.session = null;
        stopTimer();
        state.view = 'home';
        render();
        break;

      case 'exit-session':
        if (window.confirm('退出后本次作答不会计分, 确定退出吗?')) {
          state.session = null;
          stopTimer();
          state.view = 'home';
          render();
        }
        break;

      case 'pick':
        pickOption(questionFrom(el), parseInt(el.getAttribute('data-opt'), 10));
        break;

      case 'self-ok':
      case 'self-bad':
        selfGrade(questionFrom(el), action === 'self-ok');
        break;

      case 'prev':
        if (isPassageMode(state.session)) {
          if (state.session.page > 0) { state.session.page -= 1; render(); }
          break;
        }
        if (state.session.index > 0) { state.session.index -= 1; render(); }
        break;

      case 'next':
        if (isPassageMode(state.session)) {
          // 练习翻篇前把本页没做的题按答错收尾, 不留半拉子状态;
          // 考试不强制收尾 (没答的交卷时算"未答", 提交前会提示还剩几题)
          if (state.session.mode !== 'exam') forceClosePage(state.session, state.session.page);
          if (state.session.page < state.session.pages.length - 1) {
            state.session.page += 1; render();
          }
          break;
        }
        // 上限用 sessionSteps, 否则翻不到最后的作文那一步
        if (state.session.index < sessionSteps(state.session) - 1) {
          state.session.index += 1; render();
        }
        break;

      case 'goto': {
        // 一篇一页时答题卡给的是页下标, 逐题模式给的是题下标
        const target = parseInt(el.getAttribute('data-index'), 10);
        if (isPassageMode(state.session)) state.session.page = target;
        else state.session.index = target;
        render();
        break;
      }

      case 'submit-exam': {
        const s = state.session;
        const left = s.questions.filter(function (q) {
          return isTextQ(q) ? !s.revealed[q.id] : s.answers[q.id] == null;
        }).length;
        const msgs = [];
        if (left) msgs.push('还有 ' + left + ' 题未作答');
        if (s.essay && !essayWritten(s.essay)) msgs.push('作文还没写');
        const msg = msgs.length ? (msgs.join(', ') + ', 确定提交?') : '确定提交试卷?';
        if (window.confirm(msg)) finishSession();
        break;
      }

      case 'finish-practice':
        if (window.confirm('结束本次练习并查看结果?')) {
          if (isPassageMode(state.session)) forceClosePage(state.session, state.session.page);
          finishSession();
        }
        break;

      case 'practice-wrong-now': {
        const ids = state.result.entries.filter(function (en) { return !en.ok; })
          .map(function (en) { return en.q.id; });
        const list = ids.map(function (id) { return BY_ID[id]; }).filter(Boolean);
        if (list.length) startSession('redo', list);
        break;
      }

      case 'redo-wrong': {
        const list = Object.keys(wrongBook).map(function (id) { return BY_ID[id]; }).filter(Boolean);
        if (!list.length) { window.alert('错题本已空'); return; }
        startSession('redo', list);
        break;
      }

      case 'remove-wrong': {
        const qid = el.getAttribute('data-qid');
        if (window.confirm('确认把这题移出错题本?')) {
          markRight(qid);
          render();
        }
        break;
      }

      case 'clear-wrongbook':
        if (window.confirm('确定清空错题本? 此操作不可恢复。')) {
          wrongBook = {};
          saveWrong();
          render();
        }
        break;

      case 'switch-subject': {
        const id = el.getAttribute('data-subject');
        if (!id || id === currentId || !BANKS[id]) break;
        state.session = null;
        stopTimer();
        loadSubject(id);
        prefs.subject = id;
        saveJSON(KEY_PREFS, prefs);
        state.view = 'home';
        state.filterWrongOnly = true;
        lastRenderKey = null;   // 强制回到顶部
        render();
        break;
      }
    }
  });

  document.addEventListener('change', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (action === 'toggle-wrong-only') {
      state.filterWrongOnly = el.checked;
      render();
    } else if (action === 'toggle-shuffle') {
      state.shuffleOptions = el.checked;
      prefs.shuffleOptions = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    } else if (action === 'toggle-random') {
      state.sampleQuestions = el.checked;
      prefs.sampleQuestions = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    } else if (action === 'toggle-essay') {
      state.withEssay = el.checked;
      prefs.withEssay = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    } else if (action === 'toggle-reading') {
      state.withReading = el.checked;
      prefs.withReading = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    } else if (action === 'toggle-sentrans') {
      state.withSentrans = el.checked;
      prefs.withSentrans = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    } else if (action === 'toggle-blank') {
      state.withBlank = el.checked;
      prefs.withBlank = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    } else if (action === 'toggle-term') {
      state.withTerm = el.checked;
      prefs.withTerm = el.checked;
      saveJSON(KEY_PREFS, prefs);
      refreshHomeHints();
    }
  });

  // 自评文字题的输入: 同上, 只存内存 + 切换自评按钮的可用状态
  document.addEventListener('input', function (e) {
    const s = state.session;
    if (!s || !s.transTexts || e.target.id !== 'tl-input') return;
    const q = questionFrom(e.target);
    if (!q || !isTextQ(q)) return;
    s.transTexts[q.id] = e.target.value;
    const has = !!e.target.value.trim();
    // 按题卡找按钮, 别用 getElementById —— 一页多张卡时 id 会撞
    const card = e.target.closest ? e.target.closest('.qcard') : null;
    const okBtn = card && card.querySelector('[data-action="self-ok"]');
    const badBtn = card && card.querySelector('[data-action="self-bad"]');
    if (okBtn) okBtn.disabled = !has;
    if (badBtn) badBtn.disabled = !has;
  });

  // 作文输入: 只更新字数和内存里的文本, 不重渲染(否则输入框会失焦)
  document.addEventListener('input', function (e) {
    const s = state.session;
    if (!s || !s.essay || e.target.id !== 'essay-input') return;
    s.essay.text = e.target.value;
    const count = document.getElementById('essay-count');
    if (count) count.textContent = essayCountText(s.essay.text, s.essay.data);
    // "已答"也要跟着走, 不然要等下次翻页才更新
    const done = document.getElementById('answered-count');
    if (done) done.textContent = '已答 ' + answeredCount(s);
  });

  // 键盘: A-D / 1-4 选答案, ←→ 切换, Enter 下一题
  document.addEventListener('keydown', function (e) {
    if (!state.session) return;
    // 正在输入框/文本域里打字时不要抢快捷键, 否则作文里敲个 a 就选中了选项 A
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    const key = e.key.toUpperCase();
    let idx = -1;
    // 必须先限定单字符, 否则 ArrowRight/Backspace/Ctrl/Delete 首字母落在 A-D 区间会被误判
    if (key.length === 1 && key >= 'A' && key <= 'D') idx = key.charCodeAt(0) - 65;
    else if (key.length === 1 && key >= '1' && key <= '4') idx = parseInt(key, 10) - 1;

    if (idx >= 0) {
      // 一篇一页时一页好几道题, 键盘没法猜是哪道, 只能点;
      // 考试里单选一题一页, currentQuestion 仍指向它, 键盘照常可用
      if (isPassageMode(state.session) && !currentQuestion()) return;
      const q = currentQuestion();
      if (q && idx < q.options.length) { e.preventDefault(); pickOption(q, idx); }
      return;
    }
    if (e.key === 'ArrowLeft') {
      const prevBtn = document.querySelector('[data-action="prev"]:not([disabled])');
      if (prevBtn) { e.preventDefault(); prevBtn.click(); }
    }
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      const nextBtn = document.querySelector('[data-action="next"]:not([disabled])');
      if (nextBtn) { e.preventDefault(); nextBtn.click(); }
    }
  });

  window.addEventListener('beforeunload', function (e) {
    if (state.session) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ============ 启动 ============ */
  migrateLegacy();
  if (!SUBJECTS.length) {
    root.appendChild(h('div', 'empty', '题库为空, 请先运行 node scripts/build-questions.js 生成 questions.js'));
  } else {
    // 上次用的科目还在就用它, 否则退回第一个
    loadSubject(BANKS[prefs.subject] ? prefs.subject : SUBJECTS[0].id);
    render();
  }
})();
