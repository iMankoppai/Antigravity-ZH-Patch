'use strict';
// 由 marketplace-dump.json（实机只读导出）+ 人工译文，生成 2.29.0 市场词条文件。
const fs = require('fs');
const path = require('path');
const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'marketplace-dump.json'), 'utf8'));

const headTitle = {
  'Design, Creative & Media': '设计、创意与媒体',
  'Productivity & Project Management': '效率与项目管理',
  'Cloud Hosting & Deployment': '云托管与部署',
  'Developer Tools': '开发者工具',
  'Business': '商务',
  'Featured': '精选',
};
const headSub = {
  'Design, creative, and media tools.': '设计、创意与媒体工具。',
  'Plan work, track issues, sign documents, and manage your notes and files.': '规划工作、跟踪问题、签署文档，并管理你的笔记与文件。',
  'Deploy and host your apps, sites, and their backends.': '部署并托管你的应用、站点及其后端。',
  'APIs, services, and tools to build, test, secure, and run your apps.': '用于构建、测试、保护和运行应用的 API、服务与工具。',
  'Payments, CRM, accounting, data, identity, customer support, marketing, and workflow automation.': '支付、CRM、会计、数据、身份、客户支持、营销与工作流自动化。',
};
// 按插件名称映射描述译文（名称本身是专名，保留英文）
const descByName = {
  Canva: '使用 Canva MCP 服务器创建、编辑、审阅、调整尺寸并检查 Canva 设计是否符合品牌规范。',
  Figma: '将 Figma 设计转换为生产代码，使用 Code Connect 映射组件，并在 Antigravity 中创建或编辑 Figma 文件。',
  Mobbin: '为你的 AI 智能体提供 600,000+ 真实应用界面，以及使用它们的技能。包含 Mobbin MCP 和一个技能：依照真实应用的落地模式、沿用你自己的设计系统重做你的界面，并为每处改动附上参考来源。',
  'Atlassian Teamwork Graph CLI': 'Teamwork Graph CLI 是 Atlassian 面向智能体的接口，连接你的整个工作上下文：Jira 问题、Confluence 页面、Bitbucket PR，以及已连接的第三方数据源。专为 Antigravity（终端或桌面）这类编码智能体打造，由 Atlassian 的上下文图谱驱动。试试：“根据这个 PR 起草一个 Jira 问题并把它关联到史诗。”安装后运行 /twg-setup 即可将 Atlassian Teamwork Graph CLI 连接到 Antigravity。',
  Dropbox: '将 Antigravity 连接到 Dropbox，以便搜索、查看、汇总、共享、收集上传、整理文件夹并清理文件，写操作前会有确认。',
  Linear: '面向团队与智能体的产品开发系统。可在 Antigravity 中管理你整个 Linear 工作区的问题、项目和文档。',
  'monday.com': '在 Antigravity 中规划和跟踪 monday.com 的工作：创建、更新和分配事项，编写文档，并构建将请求转化为事项的表单。',
  Notion: '通过 Notion MCP 服务器将 Antigravity 连接到你的 Notion 工作区，并提供研究、文档、会议准备、规格、跟踪器与项目更新等技能。',
  PandaDoc: '创建并发送提案、报价和合同以进行电子签名。跟踪签署进度，并找出需要跟进的文档。',
  Trello: '官方 Trello 插件，包含 Trello MCP 服务器，以及用于看板、列表、卡片、清单、收件箱和 Planner 的技能。',
  Netlify: '在 Netlify 上构建与部署：函数、边缘函数、Blobs、数据库、身份、表单、图片 CDN、缓存和 AI 网关，并包含 Netlify MCP 服务器。',
  Railway: '借助 Railway 的智能体技能和托管 MCP 服务器，在 Antigravity 中对 Railway 上的应用、数据库和基础设施进行部署、配置、监控和排障。',
  Vercel: '在 Vercel 上构建与部署 Web 应用和 AI 智能体，提供 Next.js、AI SDK 和云服务技能，并包含官方 Vercel MCP 服务器。',
  Wix: '借助 Wix CLI 技能和官方 Wix MCP 服务器，构建 Wix 应用与无头站点，并管理 Wix 商店、预订、CMS 等。',
  WordPress: '构建、发布并管理 WordPress.com 及接入 Jetpack 的站点。起草文章、编辑区块、查看流量统计、审核评论并管理插件。',
  Auth0: '为任意应用添加 Auth0 身份验证：登录、MFA、SSO、组织（Organizations）、RBAC、自定义域名和品牌定制。调试鉴权错误并从其他提供商迁移。',
  Base44: '构建并部署 Base44 全栈应用：CLI 项目管理、JavaScript/TypeScript SDK 开发，以及生产环境排障技能。',
  Browserbase: '为你的智能体提供真实浏览器：在本地或 Browserbase 云端浏览器中导航、点击、输入、截图，并从任意站点提取数据。',
  CodeRabbit: '由 CodeRabbit 提供支持的 AI 代码审查与审查评论自动修复。',
  Context7: '获取最新的文档检索。将特定版本文档与代码示例从源码仓库直接拉取到你的 LLM 上下文中。',
  'CrowdStrike Falcon': '使用官方 CrowdStrike 托管的 MCP 服务器在 Falcon 中开展工作：检测、案件、威胁情报、SIEM、主机、漏洞、云等。',
  Datadog: '通过预配置的 Datadog MCP 服务器，直接在 Antigravity 中使用 Datadog。通过自然对话查询日志、指标、链路追踪、仪表盘等。此插件为预览版。',
  Dynatrace: '借助技能和 MCP 服务器，使用真实的 Dynatrace 数据排查生产问题：问题与根因、日志、指标、链路追踪和漏洞。',
  'Endor Labs Agent Kit': '打包的工作流，涵盖 SCA 修复、AI SAST 分诊、CI/CD 态势、恶意软件响应、发现项审查、Endor Labs 设置等。',
  'Exabeam Agentic SOC': '端到端分诊 Exabeam New-Scale 告警与案件：收集证据、映射 MITRE、得出结论，并在审批环节之后记录结果。',
  Harness: '使用已连接的工具和可复用工作流技能，构建与调试流水线、管理部署、调查安全发现并操作 Harness。',
  Keenable: '使用 Keenable（专为 AI 智能体打造的搜索引擎）搜索网络，并以干净的 Markdown 阅读任意页面。无需密钥：无需注册或 API 密钥。',
  'Keenable SELECT': '向实时网络提问，返回一张表格。Keenable SELECT 会在一次调用中执行多次搜索、阅读页面并提取你需要的字段。需使用 Keenable 账号登录。',
  'Leapwork Play': '直接在 Antigravity 中创建、运行和调试 Leapwork Play 测试与运行列表，构建智能体，并将工作交给 Play 的 AI 工作流。',
  'MongoDB Atlas (Managed MCP)': 'MongoDB Atlas 的官方 Antigravity 插件（托管 MCP 服务器 + 技能）。连接到 MongoDB 托管的 Atlas MCP 服务器，探索数据、管理集合、优化查询、生成可靠代码、践行最佳实践、开发高级功能等。',
  Parallel: '使用 Parallel 托管的 MCP 服务器搜索实时网络并获取页面内容。免费使用，无需 Parallel 账号、API 密钥或 Parallel CLI。',
  PingOne: '用于 PingOne 多租户的智能体插件。包含技能和一个远程 MCP 服务器，让 AI 智能体配置和监控你的 PingOne 环境。',
  Postman: '为 Antigravity 配备覆盖完整 API 生命周期的专用 Postman 技能。通过面向智能体、文件系统优先的工作流来发现、设计、测试、编写文档、模拟、监控和改进 API。',
  Qodo: '设置 Qodo，探索代码与代码仓库历史，审查本地更改，并直接在 Antigravity 中解决 PR 发现项。',
  'SentinelOne Purple AI': '通过自托管、只读的 Purple AI MCP 服务器，从 Antigravity 查询你的 SentinelOne Singularity 控制台。需要有效的控制台部署、你的控制台 URL 和一个 API 令牌。',
  Sentry: '借助专家技能和来自你的 Sentry 项目的实时上下文，设置 Sentry 监控、排查生产错误，并配置告警与发布。',
  Supabase: 'Supabase 的官方 Antigravity 插件，包含 Supabase 技能与 MCP 访问，用于项目管理、数据库操作、鉴权、存储和 Postgres 最佳实践。',
  Superpowers: '让你的编码智能体成为更出色的工程师',
  Unity: 'Unity 的官方 Antigravity 插件，包含精选的游戏开发、商业变现和性能优化技能。',
  VirusTotal: '借助 VirusTotal 威胁情报、分析与提交恢复功能，调查文件、URL、域名和 IP 地址。',
  Bigin: '在 Antigravity 中管理你的 Bigin CRM：查看销售管道、查找联系人和交易、记录通话、规划跟进并向客户发送邮件。',
  Databricks: '面向 CLI、Apps、Lakebase、模型服务、Lakeflow 作业、Spark 声明式管道、声明式自动化包（DABs）以及经典到无服务器迁移的 Databricks 技能。',
  Intercom: '搜索 Intercom 对话、联系人和公司，识别支持趋势，并通过安全的身份验证安装 Intercom Messenger。',
  Semrush: '基于实时 Semrush 数据的 SEO 工作流：关键词研究、站点审计、反向链接、竞争对手、流量与市场分析、PPC 以及 AI 品牌可见度。',
  Stripe: "接受支付并发展业务。Stripe 官方 MCP 服务器让 AI 智能体能够管理客户、产品、价格、支付链接、发票、订阅和退款，并搜索 Stripe 文档。",
  'Wispr Flow': '搜索并阅读你的 Wispr Flow 会议记录、转录、便签和日历事件。仅对你的账号提供只读访问。',
  Zapier: '将 9,000+ 应用连接到你的 AI 工作流。直接从你的客户端发现、启用并执行 Zapier 操作与工作流。',
  'Zoho Books': '在 Antigravity 中运行 Zoho Books：发票、账单、银行、日记账、项目、商品、税费、自定义与自动化。',
  'Zoho CRM': '基于 Zoho CRM v8 构建：REST API、Deluge 函数、ClientScript、小组件、COQL 和连接，并通过你的 Zoho MCP 服务器访问实时 CRM 数据。',
  'Zoho Desk': 'Antigravity 的 Zoho Desk 插件。通过 Zoho Desk MCP 直接在 Antigravity 中审查、划分优先级并更新 Zoho Desk 工单，并包含一个用于分诊和优先级更新的工单优先级智能体。',
  'Zoho Projects': '将 Zoho Projects 连接到 Antigravity，把任务和问题转化为可运行的代码。获取项目上下文、排查缺陷，并在开发过程中更新工作项。',
};

const dictionary = {};
const missing = [];
for (const c of dump.cards) {
  if (!descByName[c.name]) continue;
  if (!c.desc) { missing.push('无描述: ' + c.name); continue; }
  dictionary[c.desc] = descByName[c.name];
}
for (const f of dump.featured || []) if (descByName[f.title] && f.desc) dictionary[f.desc] = descByName[f.title];
for (const h of dump.heads || []) {
  if (headTitle[h.title]) dictionary[h.title] = headTitle[h.title];
  if (h.sub && headSub[h.sub]) dictionary[h.sub] = headSub[h.sub];
}
// 分类标题/副标题：dump.heads 为空时按已知文本补（仍以实机扫描文本为准）
for (const [k, v] of Object.entries(headTitle)) dictionary[k] = v;
for (const [k, v] of Object.entries(headSub)) dictionary[k] = v;
dictionary['Featured'] = '精选';

const payload = {
  notes: {
    date: '2026-11-04',
    scope: '自定义项（Customizations）市场：分类标题/副标题、精选卡片描述、第三方插件卡片描述',
    evidence: 'work/2-29-0-probe/marketplace-dump.json（实机 CDP 只读导出，68 张卡片含展开项；插件名称作为专名保留英文）',
    skipped: [
      '插件/产品名称（Canva、Figma、Notion、Stripe…）按专名不翻译。',
      '第三方工具免责声明整段（third-party-tools-disclaimer）为法律文本且含隐私政策链接，保持原文。',
      'Google Workspace 分组标题为产品品牌，保留英文。'
    ]
  },
  dictionary,
};
const out = path.join(__dirname, '..', '..', 'localization', 'v74-marketplace-additions.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 2) + '\n');
console.log('marketplace entries:', Object.keys(dictionary).length, 'missing:', missing.length);
if (missing.length) console.log(missing.join('\n'));
