'use strict';
// deep-interface-coverage.cjs - 深层界面文案覆盖门禁。
//
// 按指导书第 5.3 节列出的场景分类，检查 dictionaries.json 与 translate.js
// 的模板规则是否仍覆盖这些场景。任一分类跌破下限即失败，避免后续改动
// 悄悄删掉某一类文案。无法在无界面环境触发的场景由报告列出，供现场验收。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const assets = path.join(root, 'src', 'AntigravityZhManager', 'Assets');
const dict = JSON.parse(fs.readFileSync(path.join(assets, 'dictionaries.json'), 'utf8'));
const runtime = fs.readFileSync(path.join(assets, 'translate.js'), 'utf8');
const keys = Object.keys(dict);

// 每个分类：英文匹配 + 最低覆盖数 + 说明
const categories = [
  { id: 'permission-request', min: 8, re: /\b(allow|permission|requesting permission|approve)\b/i, note: '权限申请与批准' },
  { id: 'external-tool-approval', min: 4, re: /\b(?:tool|mcp)\b/i, note: '外部工具/MCP 批准（工具相关文案）' },
  { id: 'sandbox-warning', min: 2, re: /\bsandbox/i, note: '沙箱警告' },
  { id: 'auth-failure', min: 4, re: /\b(api key|authenticat|sign in|unauthoriz|credential|token expired)\b/i, note: 'API Key / 鉴权失败' },
  { id: 'context-compaction', min: 2, re: /compact|compress|summar|context window|context limit/i, note: '上下文压缩' },
  { id: 'rules-demoted', min: 1, re: /\b(demoted|excluded from context|rules budget|customization budget)\b/i, note: 'Token 预算超限降级' },
  { id: 'branch-worktree', min: 4, re: /\b(branch|worktree|work tree|fork)\b/i, note: '分支/工作树' },
  { id: 'share', min: 3, re: /\bshar(e|ing|ed)\b/i, note: '分享/协作' },
  { id: 'empty-state', min: 6, re: /\b(no results?|no matches|no items|empty|nothing (here|yet)|none found)\b/i, note: '空状态与无结果' },
  { id: 'context-menu', min: 1, re: /\b(context menu|right[- ]click|more actions|overflow menu)\b/i, note: '右键/上下文菜单' },
  { id: 'background-task', min: 3, re: /\b(background task|running|completed|queued)\b/i, note: '后台任务状态' },
  { id: 'undo-redo', min: 2, re: /\b(undo|redo|revert|discard)\b/i, note: '撤销与放弃改动' },
];

const failures = [];
const report = [];
for (const c of categories) {
  const dictHits = keys.filter((k) => c.re.test(k));
  // 运行时模板规则：把匹配到的英文片段也算作覆盖（例如 demoted 走正则而非词库）
  const runtimePatterns = (runtime.match(/\/\^[^\n]*?(demoted|excluded from context|rules budget)[^\n]*?\//gi) || []).length;
  const runtimeBoost = c.id === 'rules-demoted' ? (runtimePatterns > 0 ? 1 : 0) : 0;
  const total = dictHits.length + runtimeBoost;
  report.push({ id: c.id, note: c.note, dictEntries: dictHits.length, runtimeRules: runtimeBoost, required: c.min, ok: total >= c.min,
    sample: dictHits.slice(0, 3) });
  if (total < c.min) failures.push(`${c.id}（${c.note}）覆盖不足：需要 ≥${c.min}，实际 ${total}`);
}

// 需要现场验收、无法在无界面环境触发的场景清单（随报告输出）
const manualScenarios = [
  '权限申请弹窗的实际出现与按钮文案',
  '外部工具批准的按钮与撤销',
  '沙箱警告的实际触发',
  'API Key 鉴权失败的真实提示',
  '上下文压缩发生时的界面表现',
  'Rules demoted 提示的显示',
  '分支/分享入口与结果页',
  '搜索无结果与空列表',
  '右键快捷菜单全部项',
];

const summary = {
  categories: report.length,
  covered: report.filter((r) => r.ok).length,
  failures: failures.length,
  totalDictEntries: keys.length,
};
console.log(JSON.stringify({ summary, report }, null, 2));
console.log('\n[需现场验收的场景（本环境无法触发）]\n' + manualScenarios.map((s) => '- ' + s).join('\n'));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('\ndeep interface coverage gate: PASS');
