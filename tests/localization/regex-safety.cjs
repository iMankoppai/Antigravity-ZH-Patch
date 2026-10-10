'use strict';
// regex-safety.cjs - 运行时正则安全门禁（静态 + 动态）。
//
// 静态：找出“可空组的嵌套量词”，例如 (a*)* / (?:x?)+，这是灾难性回溯的经典来源。
//       组内至少需要一个字符的嵌套量词，例如 \d+(?:\.\d+)?\s* 的重复，记为提示。
// 动态：把运行时里真实用到的正则逐条编译，对一组对抗性输入计时，
//       任何单条超过预算即失败，用来兜住静态分析抓不到的回溯。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(path.join(root, 'src', 'AntigravityZhManager', 'Assets', 'translate.js'), 'utf8');

const failures = [];
const advisories = [];

// ---- 提取正则字面量（跳过字符串、注释、字符类）----
function extractRegexLiterals(text) {
  const out = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch; i++;
      while (i < n) { if (text[i] === '\\') { i += 2; continue; } if (text[i] === quote) { i++; break; } i++; }
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (ch === '/' && text[i + 1] === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    if (ch === '/') {
      const prev = text.slice(0, i).trimEnd().slice(-1);
      const isRegex = prev === '' || /[=(,:\[!&|?{};+*%<>~^]/.test(prev) || /\breturn$/.test(text.slice(0, i).trimEnd());
      if (isRegex) {
        let j = i + 1, body = '', inClass = false, ok = false;
        while (j < n) {
          const c = text[j];
          if (c === '\\') { body += c + (text[j + 1] || ''); j += 2; continue; }
          if (c === '[') inClass = true;
          else if (c === ']') inClass = false;
          else if (c === '/' && !inClass) { ok = true; break; }
          else if (c === '\n') break;
          body += c; j++;
        }
        if (ok) {
          let k = j + 1, flags = '';
          while (k < n && /[a-z]/.test(text[k])) { flags += text[k]; k++; }
          out.push({ body, flags, line: text.slice(0, i).split('\n').length });
          i = k; continue;
        }
      }
    }
    i++;
  }
  return out;
}

function hasVariableQuantifier(fragment) {
  return /(^|[^\\])(\*|\+|\{\d+,\d*\})/.test(fragment);
}
function scanNestedQuantifiers(body) {
  const hits = [];
  let i = 0, inClass = false;
  const stack = [];
  const n = body.length;
  while (i < n) {
    const c = body[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '[') { inClass = true; i++; continue; }
    if (c === ']') { inClass = false; i++; continue; }
    if (inClass) { i++; continue; }
    if (c === '(') { stack.push(i); i++; continue; }
    if (c === ')') {
      const start = stack.pop();
      if (start === undefined) { i++; continue; }
      const inner = body.slice(start + 1, i);
      let j = i + 1, outer = '';
      if (body[j] === '*' || body[j] === '+') { outer = body[j]; j++; }
      else if (body[j] === '{') { const m = body.slice(j).match(/^\{\d+,(?:\d*)\}/); if (m) { outer = m[0]; j += m[0].length; } }
      if (outer && hasVariableQuantifier(inner)) hits.push({ group: inner, outer });
      i++;
      continue;
    }
    i++;
  }
  return hits;
}
function canMatchEmpty(fragment) {
  try { return new RegExp('^(?:' + fragment + ')$').test(''); } catch { return false; }
}

const literals = extractRegexLiterals(source);
let broadWildcardCount = 0;
for (const lit of literals) {
  for (const h of scanNestedQuantifiers(lit.body)) {
    if (canMatchEmpty(h.group)) failures.push(`L${lit.line} 可空组的嵌套量词 /(${h.group.slice(0, 50)}…)${h.outer}/ 存在灾难性回溯风险`);
    else advisories.push(`L${lit.line} 嵌套量词但组不可为空：/(${h.group.slice(0, 40)}…)${h.outer}/`);
  }
  const unboundedWild = (lit.body.match(/\[\^?[^\]]*\]\*|\.\*/g) || []).length;
  if (unboundedWild >= 3) { broadWildcardCount++; advisories.push(`L${lit.line} 正则含 ${unboundedWild} 处无界通配：/${lit.body.slice(0, 70)}/`); }
}

// ---- 动态：真实正则 + 对抗输入计时 ----
const probes = [
  '1'.repeat(2000),
  ' '.repeat(2000),
  'a'.repeat(2000),
  ('1s'.repeat(500)),
  ('1 s '.repeat(500)),
  ('Thought for ' + '1s'.repeat(400) + 'z'),
  ('Yes, always allow for ' + 'x'.repeat(1500)),
  ('Ran command: `' + 'y'.repeat(1500)),
  '\u4e2d'.repeat(2000),
  ('files '.repeat(300)),
];
// 预算取“与机器无关的宽松上限”，避免把 JIT 预热或慢机器误判为回溯失败。
const BUDGET_MS = 150;
let worst = { ms: 0, line: -1 };
let compiled = 0, skipped = 0;
for (const lit of literals) {
  let re;
  try { re = new RegExp(lit.body, lit.flags.replace(/[gy]/g, '')); } catch { skipped++; continue; }
  compiled++;
  // 预热：先让引擎完成编译与 JIT，第二次调用才计时。
  try { re.test(''); re.test('Thought for 11s'); re.test('x'); } catch { }
  for (const probe of probes) {
    const t = process.hrtime.bigint();
    try { re.test(probe); } catch { /* 个别正则在特定输入抛错不影响计时 */ }
    const ms = Number(process.hrtime.bigint() - t) / 1e6;
    if (ms > worst.ms) worst = { ms, line: lit.line };
    if (ms > BUDGET_MS) { failures.push(`L${lit.line} 正则耗时 ${ms.toFixed(1)}ms 超过预算 ${BUDGET_MS}ms（输入长度 ${probe.length}）`); break; }
  }
}

const summary = {
  regexLiterals: literals.length,
  regexCompiled: compiled,
  regexSkipped: skipped,
  catastrophicNestedQuantifiers: failures.length,
  advisories: advisories.length,
  broadWildcardAdvisories: broadWildcardCount,
  perfBudgetMs: BUDGET_MS,
  worstCaseMs: Number(worst.ms.toFixed(3)),
  worstCaseLine: worst.line,
};
console.log(JSON.stringify(summary, null, 2));
if (advisories.length) console.log('[advisory]\n' + advisories.join('\n'));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('regex safety gate: PASS');
