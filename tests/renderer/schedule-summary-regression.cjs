'use strict';
// 计划/自动化编辑器的 “on” 连接词回归：
// 2.28.x 用 schedule-frequency-trigger[data-frequency]，2.29+ 换成 schedule-repeat
// 下拉（当前选项在触发按钮首个 span）。两种结构都要能把 custom -> “规则”、其余 -> “在”，
// 且非计划容器内的 “on” 不得被翻译；可整体还原。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const withFixture = require('./lib/chrome-fixture.cjs');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');

const cases = [
  { id: 'legacy-custom', trigger: '<button data-testid="schedule-frequency-trigger" data-frequency="custom"></button>', expect: '规则' },
  { id: 'legacy-daily', trigger: '<button data-testid="schedule-frequency-trigger" data-frequency="daily"></button>', expect: '在' },
  { id: 'new-custom-en', trigger: '<button data-testid="schedule-repeat" aria-label="How often"><span>Custom</span></button>', expect: '规则' },
  { id: 'new-custom-zh', trigger: '<button data-testid="schedule-repeat" aria-label="How often"><span>自定义</span></button>', expect: '规则' },
  { id: 'new-daily-en', trigger: '<button data-testid="schedule-repeat" aria-label="How often"><span>Every day</span></button>', expect: '在' },
  { id: 'new-daily-zh', trigger: '<button data-testid="schedule-repeat" aria-label="How often"><span>每天</span></button>', expect: '在' },
];

const html = '<!doctype html><body>' + cases.map((c) => `
  <div data-testid="schedule-editor-panel" id="${c.id}">${c.trigger}<span class="join">on</span></div>`).join('') +
  '<div id="outside"><span class="join">on</span></div></body>';

let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
withFixture(html, async (evaluate, pause) => {
  const before = await evaluate('document.body.innerHTML');
  await evaluate('window.__antigravityZhPatchDictionary=' + JSON.stringify(dictionary));
  await evaluate(runtime);
  await pause(150);
  await evaluate('window.__antigravityZhPatchController.badge?.remove()');
  for (const c of cases) {
    check(await evaluate(`document.querySelector('#${c.id} .join').textContent`), c.expect, c.id);
  }
  check(await evaluate("document.querySelector('#outside .join').textContent"), 'on', '计划容器外 on 不翻译');
  await evaluate('window.__antigravityZhPatchRestore()');
  check(await evaluate('document.body.innerHTML'), before, '全部原始结构与文案精确还原');
  fs.mkdirSync('work/schedule-summary-regression', { recursive: true });
  fs.writeFileSync('work/schedule-summary-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('schedule summary regression: ' + checks + ' PASS');
}).catch(error => { console.error(error); process.exitCode = 1; });
