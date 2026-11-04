'use strict';
// 自定义项市场回归：分类标题/副标题、精选与第三方插件“描述”需汉化；
// 插件名称（专名）与免责声明保持原文；可整体还原。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const withFixture = require('./lib/chrome-fixture.cjs');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');

const cards = [
  ['Canva', 'Create, edit, review, resize, and brand-check Canva designs with the Canva MCP server.', '使用 Canva MCP 服务器创建、编辑、审阅、调整尺寸并检查 Canva 设计是否符合品牌规范。'],
  ['Figma', 'Turn Figma designs into production code, map components with Code Connect, and create or edit Figma files in Antigravity.', '将 Figma 设计转换为生产代码，使用 Code Connect 映射组件，并在 Antigravity 中创建或编辑 Figma 文件。'],
  ['Stripe', "Accept payments and grow your business. Stripe's official MCP server enables AI agents to manage customers, products, prices, payment links, invoices, subscriptions, and refunds, as well as search Stripe documentation.", '接受支付并发展业务。Stripe 官方 MCP 服务器让 AI 智能体能够管理客户、产品、价格、支付链接、发票、订阅和退款，并搜索 Stripe 文档。'],
];
const heads = [
  ['Design, Creative & Media', '设计、创意与媒体'],
  ['Developer Tools', '开发者工具'],
];
const subs = [
  ['Design, creative, and media tools.', '设计、创意与媒体工具。'],
];

const html = '<!doctype html><body>' +
  heads.map((h, i) => `<h2 data-testid="customizations-marketplace" id="h${i}">${h[0]}</h2>`).join('') +
  subs.map((s, i) => `<p data-testid="customizations-marketplace" id="s${i}">${s[0]}</p>`).join('') +
  cards.map((c, i) => `<div data-testid="customization-card" id="c${i}"><a href="#">${c[0]}</a><div class="text-xs text-muted-foreground truncate">${c[1]}</div></div>`).join('') +
  '<p data-testid="third-party-tools-disclaimer" id="disc">Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google.</p>' +
  '</body>';

let checks = 0;
const check = (a, e, l) => { assert.deepEqual(a, e, l); checks++; };
withFixture(html, async (evaluate, pause) => {
  const before = await evaluate('document.body.innerHTML');
  await evaluate('window.__antigravityZhPatchDictionary=' + JSON.stringify(dictionary));
  await evaluate(runtime);
  await pause(150);
  await evaluate('window.__antigravityZhPatchController.badge?.remove()');
  for (const [i, h] of heads.entries()) check(await evaluate(`document.querySelector('#h${i}').textContent`), h[1], '分类标题 ' + h[0]);
  for (const [i, s] of subs.entries()) check(await evaluate(`document.querySelector('#s${i}').textContent`), s[1], '分类副标题 ' + s[0]);
  for (const [i, c] of cards.entries()) {
    check(await evaluate(`document.querySelector('#c${i} a').textContent`), c[0], '名称保留 ' + c[0]);
    check(await evaluate(`document.querySelector('#c${i} div').textContent`), c[2], '描述汉化 ' + c[0]);
  }
  check(await evaluate(`document.querySelector('#disc').textContent`),
    'Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google.', '免责声明保持原文');
  await evaluate('window.__antigravityZhPatchRestore()');
  check(await evaluate('document.body.innerHTML'), before, '全部原始结构与文案精确还原');
  fs.mkdirSync('work/marketplace-cards-regression', { recursive: true });
  fs.writeFileSync('work/marketplace-cards-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('marketplace cards regression: ' + checks + ' PASS');
}).catch(error => { console.error(error); process.exitCode = 1; });
