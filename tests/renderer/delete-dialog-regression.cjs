'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const withFixture = require('./lib/chrome-fixture.cjs');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');
const cases = [];
for (const kind of ['Project', 'Workspace']) {
  for (const [active, archived] of [[0, 1], [0, 2], [1, 0], [2, 0], [1, 1], [2, 3]]) {
    const source = [active && `${active} active conversation${active === 1 ? '' : 's'}`,
      archived && `${archived} archived conversation${archived === 1 ? '' : 's'}`].filter(Boolean).join(' and ');
    const target = [active && `${active} 个活跃对话`, archived && `${archived} 个已归档对话`].filter(Boolean).join('和 ');
    cases.push({ kind, source, target });
  }
}
// Match the real nUb dialog, including its h2 and two separate paragraphs.
// Previous count fixtures omitted the dialog, bypassing project-name protection.
const html = '<!doctype html><body>' + cases.map((c, i) => `
  <div role="dialog" id="case-${i}"><h2>Delete ${c.kind}</h2>
    <p>Are you sure you want to delete the ${c.kind.toLowerCase()} <strong><span>Settings</span></strong>?</p>
    <p>This will permanently delete <strong>${c.source}</strong> within it.</p>
    <button>Cancel</button><button>Delete</button></div>`).join('') +
  '<div data-testid="planner-response-text"><strong>1 archived conversation</strong></div></body>';
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
withFixture(html, async (evaluate, pause) => {
  const splitQuestion = `for (const p of document.querySelectorAll('[role="dialog"] p:first-of-type')) {
    const kind = p.firstChild.splitText('Are you sure you want to delete the '.length);
    kind.splitText(kind.nodeValue.trim().length);
  }`;
  await evaluate(splitQuestion);
  const before = await evaluate('document.body.innerHTML');
  await evaluate('window.__antigravityZhPatchDictionary=' + JSON.stringify(dictionary));
  await evaluate(runtime);
  await pause(100);
  await evaluate('window.__antigravityZhPatchController.badge?.remove()');
  for (const [i, c] of cases.entries()) {
    check(await evaluate(`document.querySelector('#case-${i} p:nth-of-type(2)').textContent`),
      `这将永久删除 ${c.target} 。`, `${c.kind}: ${c.source}`);
    check(await evaluate(`document.querySelector('#case-${i} strong span').textContent`), 'Settings', '嵌套项目名保持原文');
    check(await evaluate(`document.querySelector('#case-${i} p:first-of-type').textContent`),
      `确定要删除这个 ${c.kind === 'Project' ? '项目' : '工作区'} Settings?`, '确认问题中的固定类型翻译');
  }
  check(await evaluate('document.querySelector("[data-testid=planner-response-text]").textContent'),
    '1 archived conversation', '同文案出现在正文时不翻译');
  const initial = await evaluate('document.body.innerHTML');
  await evaluate(`document.querySelector('#case-0 p:first-of-type strong').textContent='1 archived conversation';
    document.querySelector('#case-0 p:nth-of-type(2) strong').textContent='3 active conversations and 1 archived conversation'`);
  await pause(100);
  check(await evaluate(`document.querySelector('#case-0 p:first-of-type strong').textContent`),
    '1 archived conversation', '名称恰好等于计数文案仍受保护');
  check(await evaluate(`document.querySelector('#case-0 p:nth-of-type(2) strong').textContent`),
    '3 个活跃对话和 1 个已归档对话', '数量动态刷新');
  // Revert the simulated React updates, then verify byte-exact original HTML.
  await evaluate(`document.body.innerHTML=${JSON.stringify(html.slice(html.indexOf('<body>') + 6, -7))};${splitQuestion}`);
  await pause(100);
  check(await evaluate('document.body.innerHTML'), initial, '重新挂载对话框后译文一致');
  await evaluate('window.__antigravityZhPatchRestore()');
  check(await evaluate('document.body.innerHTML'), before, '全部原始结构与文案精确还原');
  fs.mkdirSync('work/delete-dialog-regression', { recursive: true });
  fs.writeFileSync('work/delete-dialog-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('delete dialog regression: ' + checks + ' PASS');
}).catch(error => { console.error(error); process.exitCode = 1; });
