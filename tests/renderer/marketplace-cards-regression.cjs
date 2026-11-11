'use strict';
// 自定义项市场回归：分类标题/副标题、精选与第三方插件“描述”需汉化；
// 插件名称（专名）保留原文；第三方开发者工具免责声明自 2026-11-11 起汉化（隐私政策链接保持原样）；可整体还原。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const withFixture = require('./lib/chrome-fixture.cjs');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');

const cards = [
  ['Canva', 'Create, edit, review, resize, and brand-check Canva designs with the Canva MCP server.', '使用 Canva MCP 服务器创建、编辑、审阅、调整尺寸并检查 Canva 设计是否符合品牌规范。'],
  ['Figma', 'Turn Figma designs into production code, map components with Code Connect, and create or edit Figma files in Antigravity.', '将 Figma 设计转换为生产代码，使用 Code Connect 映射组件，并在 Antigravity 中创建或编辑 Figma 文件。'],
  ['Stripe', "Accept payments and grow your business. Stripe's official MCP server enables AI agents to manage customers, products, prices, payment links, invoices, subscriptions, and refunds, as well as search Stripe documentation.", '接受支付并发展业务。Stripe 官方 MCP 服务器让 AI 智能体能够管理客户、产品、价格、支付链接、发票、订阅和退款，并搜索 Stripe 文档。'],
  ['Gmail', 'Search, read, draft, and send emails in Gmail.', '在 Gmail 中搜索、阅读、起草和发送电子邮件。'],
  ['Looker', 'Connect to your managed Looker MCP server to explore data, run saved Looks, build dashboards, and validate LookML.', '连接到你托管的 Looker MCP 服务器，以探索数据、运行已保存的 Look、构建仪表板并验证 LookML。'],
  ['Arize AX', 'Query Arize AX projects, traces, datasets, and experiments from Antigravity, with skills for tracing, evals, and prompt optimization.', '在 Antigravity 中查询 Arize AX 的项目、追踪、数据集和实验，并提供用于追踪、评估和提示词优化的技能。'],
  ['invideo', "Connect your agent to invideo's AI-native video editor. It trims, grades and mixes on a real timeline while you watch every change land.", '将你的智能体连接到 invideo 的 AI 原生视频编辑器。它会在真实时间线上进行裁剪、调色和混音，让你亲眼看到每一处改动生效。'],
  ['Neo4j', 'Agent skills for Neo4j graph database — write Cypher queries, design graph models, use drivers, run imports, build GraphRAG pipelines, run GDS algorithms, and manage Aura instances.', '用于 Neo4j 图数据库的智能体技能——编写 Cypher 查询、设计图模型、使用驱动程序、执行导入、构建 GraphRAG 管道、运行 GDS 算法，并管理 Aura 实例。'],
  ['Spacefast', 'Turn an idea into a website, dashboard, report, or small web tool you can share. Build it in chat or bring your own work, and publish it with Spacefast.', '把想法变成一个可分享的网站、仪表板、报告或小型 Web 工具。在对话中构建或导入你自己的作品，然后通过 Spacefast 发布。'],
  ['CodeRabbit', 'AI-powered code review, review-comment autofix, and repository configuration, powered by CodeRabbit.', '由 CodeRabbit 驱动的 AI 代码审查、审查评论自动修复和代码仓库配置。'],
  ['Context7', "Up-to-date documentation lookup. Pull version-specific documentation and code examples directly from source repositories into your coding agent's context.", '获取最新的文档。将特定版本的文档与代码示例从源代码仓库直接拉取到你的编码智能体上下文中。'],
];
const heads = [
  ['Design, Creative & Media', '设计、创意与媒体'],
  ['Developer Tools', '开发者工具'],
  ['More Plugins', '更多插件'],
];
const subs = [
  ['Design, creative, and media tools.', '设计、创意与媒体工具。'],
  ['Explore other marketplace customizations', '探索市场中的其他自定义项'],
];

const disclaimerPrefix = 'Google does not control the availability or functionality of third party developer tools. Your data from third party developer tools connected to your Antigravity instance may be shared with Google. Google will protect any such data in accordance with the Google Privacy Policy, found here:';
const disclaimerZh = 'Google 不控制第三方开发者工具的可用性或功能。你从连接到 Antigravity 实例的第三方开发者工具产生的数据可能会与 Google 共享。Google 将按照 Google 隐私权政策保护任何此类数据，详见：';
const privacyUrl = 'https://policies.google.com/privacy';

// Gmail 插件详情页（概览/技能）的补充用例
const prompts = [
  ['Summarize my unread emails from today', '总结今天的未读邮件'],
  ['Draft a reply to the latest thread about launch readiness', '为最近关于上线就绪的邮件线程起草回复'],
  ['Find emails with attachments from last week', '查找上周带附件的邮件'],
];
const gmailDetail = ['Run your Gmail inbox. Search and summarize threads, draft replies, organize labels, and send messages with your approval.', '管理你的 Gmail 收件箱。搜索并总结邮件线程、起草回复、整理标签，并在你批准后发送邮件。'];
const gmailCommand = ["Read, search, send, and manage Gmail messages, drafts, labels, and emoji reactions using a Go CLI. Use when reading emails, searching inbox, sending messages, reacting to messages with emoji, managing drafts, forwarding, checking vacation responder, managing labels, downloading attachments, or decoding `mail.google.com` Web UI URLs. Don't use for Google Chat messages or Calendar invites.", '使用 Go CLI 读取、搜索、发送和管理 Gmail 邮件、草稿、标签及表情回应。适用于读取邮件、搜索收件箱、发送邮件、用表情回应邮件、管理草稿、转发、检查休假自动回复、管理标签、下载附件，或解码 `mail.google.com` Web UI 网址。请勿用于 Google Chat 消息或日历邀请。'];

const html = '<!doctype html><body>' +
  heads.map((h, i) => `<h2 data-testid="customizations-marketplace" id="h${i}">${h[0]}</h2>`).join('') +
  subs.map((s, i) => `<p data-testid="customizations-marketplace" id="s${i}">${s[0]}</p>`).join('') +
  cards.map((c, i) => `<div data-testid="customization-card" id="c${i}"><a href="#">${c[0]}</a><div class="text-xs text-muted-foreground truncate">${c[1]}</div></div>`).join('') +
  `<p data-testid="third-party-tools-disclaimer" id="disc">${disclaimerPrefix}<span class="inline"><a href="${privacyUrl}">${privacyUrl}</a></span></p>` +
  prompts.map((p, i) => `<div data-testid="plugin-suggested-prompt-row"><span id="p${i}">${p[0]}</span></div>`).join('') +
  `<p data-testid="plugin-detail" id="d0">${gmailDetail[0]}</p>` +
  `<span data-testid="plugin-detail" id="d1">${gmailCommand[0]}</span>` +
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
  check(await evaluate(`document.querySelector('#disc').textContent`), disclaimerZh + privacyUrl, '免责声明正文汉化、链接保留');
  check(await evaluate(`document.querySelector('#disc a').textContent`), privacyUrl, '隐私政策链接文字保留');
  for (const [i, p] of prompts.entries()) check(await evaluate(`document.querySelector('#p${i}').textContent`), p[1], '建议提示词 ' + p[0]);
  check(await evaluate(`document.querySelector('#d0').textContent`), gmailDetail[1], '插件长描述');
  check(await evaluate(`document.querySelector('#d1').textContent`), gmailCommand[1], '命令说明');
  await evaluate('window.__antigravityZhPatchRestore()');
  check(await evaluate('document.body.innerHTML'), before, '全部原始结构与文案精确还原');
  fs.mkdirSync('work/marketplace-cards-regression', { recursive: true });
  fs.writeFileSync('work/marketplace-cards-regression/result.json', JSON.stringify({ checks, passed: true }, null, 2));
  console.log('marketplace cards regression: ' + checks + ' PASS');
}).catch(error => { console.error(error); process.exitCode = 1; });
