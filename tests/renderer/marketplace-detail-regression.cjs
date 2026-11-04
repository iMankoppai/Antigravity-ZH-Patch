'use strict';
// 自定义项插件详情页回归：建议提示词、技能/代理/规则描述需汉化；技术路径/代码保持原文；可还原。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const withFixture = require('./lib/chrome-fixture.cjs');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const additions = require('../../localization/v74-marketplace-detail-additions.json');
const detail = JSON.parse(fs.readFileSync('work/2-29-0-probe/detail-strings.json', 'utf8'));
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');

const pick = (type) => detail.todo.find((x) => x.type === type && additions.dictionary[x.text]);
const samples = ['suggestedPrompt', 'skill.description', 'agent.description', 'rule.description'].map(pick).filter(Boolean);
if (samples.length < 4) { console.error('缺少样本'); process.exit(1); }
const pathSample = 'C:\\Users\\demo\\.gemini\\cache\\rules\\Agent.md';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = '<!doctype html><body><div data-testid="plugin-detail">' +
  samples.map((s, i) => `<p id="p${i}">${esc(s.text)}</p>`).join('') +
  `<p id="path">${esc(pathSample)}</p>` +
  '</div></body>';

let checks = 0;
const check = (a, e, l) => { assert.deepEqual(a, e, l); checks++; };
withFixture(html, async (evaluate, pause) => {
  const before = await evaluate('document.body.innerHTML');
  await evaluate('window.__antigravityZhPatchDictionary=' + JSON.stringify(dictionary));
  await evaluate(runtime);
  await pause(150);
  await evaluate('window.__antigravityZhPatchController.badge?.remove()');
  for (const [i, s] of samples.entries()) {
    check(await evaluate(`document.querySelector('#p${i}').textContent`), additions.dictionary[s.text], s.type);
  }
  check(await evaluate("document.querySelector('#path').textContent"), pathSample, '技术路径保持原文');
  await evaluate('window.__antigravityZhPatchRestore()');
  check(await evaluate('document.body.innerHTML'), before, '全部原始结构精确还原');
  fs.mkdirSync('work/marketplace-detail-regression', { recursive: true });
  fs.writeFileSync('work/marketplace-detail-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('marketplace detail regression: ' + checks + ' PASS');
}).catch(error => { console.error(error); process.exitCode = 1; });
