// 把题库 txt 里的长行折开, 方便在编辑器里看。用法:
//   node scripts/rewrap-bank.js 题库/阅读理解.txt
//
// 规则:
//   - 只在原有的空格处折, 折出来的续行缩进两个空格; build-questions.js 见到缩进
//     就把它接回上一行, 所以折前折后生成出来的 questions.js 逐字节相同。
//   - 中文行(参考译文)大多没有空格可折, 折不动就保持原样, 不硬切。
//   - 空格只出现在 ASCII 标点后面, 所以中文只在标点处断, 不会切在词中间。
//   - 注释行(#)、分节标题、选项、答案、【A】标记一律不动。
//   - 折完自己检查一遍可逆性, 拼不回原串就直接报错, 不改文件。
const fs = require('fs');
const file = process.argv[2];
if (!file) {
  console.error('用法: node scripts/rewrap-bank.js <题库 txt 路径>');
  process.exit(1);
}
const WIDTH = 100;
const INDENT = '  ';

const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const out = [];
let wrappedCount = 0;

function untouched(line) {
  const t = line.trim();
  return !t || t.startsWith('#') || /^练习/.test(t) || /^【[A-Za-z]】$/.test(t) || /^答案：/.test(t) || /^[A-D]\.\s/.test(t);
}

function wrapLine(line) {
  const words = line.split(' ');
  const parts = [];
  let cur = '';
  for (const w of words) {
    const limit = parts.length ? WIDTH - INDENT.length : WIDTH;
    if (cur && (cur + ' ' + w).length > limit) {
      parts.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) parts.push(cur);
  if (parts.join(' ') !== line) throw new Error('折行不可逆: ' + JSON.stringify(line));
  if (parts.length > 1) wrappedCount++;
  return parts.map((p, i) => (i === 0 ? p : INDENT + p));
}

for (const rawLine of src.split('\n')) {
  const line = rawLine.replace(/\s+$/, '');
  if (untouched(line)) {
    out.push(line);
    continue;
  }
  if (/^参考译文[:：]/.test(line)) {
    // 前缀不参与折行, 折的是冒号后面的正文
    const m = line.match(/^(参考译文[:：])(.*)$/);
    const body = m[2].replace(/^\s+/, '');
    const parts = wrapLine(body);
    parts[0] = m[1] + parts[0];
    out.push(...parts);
    continue;
  }
  out.push(...wrapLine(line));
}

fs.writeFileSync(file, out.join('\n') + '\n', 'utf8');
console.log('折行 ' + wrappedCount + ' 处长行, 共 ' + out.length + ' 行');
