---
name: wix-headless-kit
description: "通过接入随附、经过验证的 @wix/sdk 代码而非从配方自行编写集成，快速构建 Wix Headless 站点。每个 Wix 业务垂直领域都随附一个带类型的、与框架无关的 React 核心（返回普通 DTO 的数据层、hooks、无头组件）以及一个 Astro 覆盖层（预接线的、所有者可编辑 SEO 的 SSR 页面）和一个构建时 REST 种子脚本——智能体通过 Wix CLI 脚手架、部署随附代码、播种后端、在随附 hooks 上自行设计呈现层（产品卡/网格、PDP、首页、主题），并发布到 Wix 托管。可在 Wix 托管的 Astro（环境认证，默认）以及任何基于 React 的项目（Vite、非 Astro）上通过公共 OAuth 客户端 id 工作。垂直领域：stores/storefront（产品、类别、变体、购物车、托管结账）、bookings（服务、预约/课程时段、员工、预订表单、结账或占位）、rentals（按小时或按天的房间、车辆、装备：资源、客户选择的时长、定价报价、结账）、blog（文章、类别/标签、富内容）、cms（结构化内容集合）、forms（架构驱动的访客表单：渲染、验证、提交）、events（列表、RSVP、门票销售）、members（登录、受限页面、账户）、portfolio（项目集合、媒体画廊）、pricing-plans（计划网格、托管购买）、restaurants（菜单、在线点餐、餐桌预订）、faq（分类问答、搜索、每个问题一个链接）、donations（活动页面、目标进度、通过托管结账的一次性和经常性捐赠）。触发词：快速为我构建一个商店/博客/预订/租赁/活动/餐厅/作品集/FAQ/捐赠站点、快速接收预约、无头地出租房间/汽车/设备、无头地售票或销售会员计划、无头地收集捐赠、wix headless kit、用现成的 SDK 代码连接 Wix 业务应用。"
---

# Wix Headless Kit

在**随附、经过验证的代码而非自行编写集成**之上构建 Wix Headless 站点。
每个垂直领域都随附集成本身——一个带类型的数据层、hooks、组件、页面和一个种子脚本，
它们已经是正确的。在能运行它的技术栈上（Wix 托管的 Astro、任何 React 项目），代码被
**部署**，智能体的工作收窄为品牌、布局、文案和接线。在无法运行它的技术栈上（无打包器的
静态站点、另一种语言的服务端渲染应用），同一份代码是**参考**：其 REST 孪生为浏览器端部署，
而它所编码的规则正是智能体要移植的。无论哪种方式，决策都存在于代码中；不要重新争论它们。

**范围。** 针对 Wix 托管的 Astro 调优，且每个垂直领域只随附其解决方案的*一种*形态。
当任务简述不与之矛盾时按原样使用它。当简述要求该形态无法表达的内容——或一旦站点存在、
工作转向管理或扩展它——那就是 `wix-docs` 和 `wix-manage`，而非在此变通。

## 模型

- **随附代码就是实现。** 每个垂直领域随附在仓库的 `wix-headless-templates` 技能中
  （`skills/wix-headless-templates/<vertical>/`），而非本技能的文件夹中。
  `node <SKILL_ROOT>/install/templates.mjs` 打印该技能所在的位置：当它安装在本技能旁边时
  是同级文件夹 `<SKILL_ROOT>/../wix-headless-templates/`（冷启动会安装两者；插件可能不会），
  否则是一次性获取到 `<SKILL_ROOT>/templates/`（该技能仓库的 git 克隆，约一秒）；下面的每个
  脚本都以相同方式解析它。**本文档中的每个 `templates/...` 路径都相对于那个打印出的根**——
  当同级存在时，本技能内没有 `templates/` 文件夹。该文件夹随项目一起保留（只有组合后的
  `project/` 脚手架被排除在其仓库之外），因此之后的会话读取项目构建时所依据的版本。每个
  垂直领域包含：
  - `app/` —— 与框架无关的核心（TypeScript）：一个返回**普通、可序列化 DTO**（图像解析为
    https URL、价格预格式化）的数据层、React hooks，以及无路由的无头组件。可在 Astro islands、
    Vite SPA 和 Next 中工作。
  - `app-astro/` —— 一个轻薄的 Astro 覆盖层：通过核心获取并将 DTO 传给 islands 的 SSR 页面，
    预接线了所有者可编辑的项页面 SEO。
  - `seed/` —— 一个构建时 REST 种子脚本（输入纯数据计划，输出已创建内容）加上其 `SEED.md`
    契约。
  - `INSTRUCTIONS.md` —— 该垂直领域的操作手册：文件映射、你要构建什么、硬性规则。
  - `project/` —— 该垂直领域组合进 Wix CLI 的空白 Astro 脚手架，连同其锁文件：即 `wix create`
    为新站点复制的内容，因此第一个垂直领域无需解析即可安装。
- **一个认证接缝。** 所有随附代码通过 `src/wix/sdk.ts` 调用 Wix：在 Wix 托管的 Astro 上认证
  是环境的（无客户端、无 id）；在任何其他 React 设置上，同一文件基于 `src/wix/config.ts` 中的
  公共客户端 id 运行一个手动访客客户端。部署步骤配置此点——无需手工接线。
- **数据原样；呈现由你负责。** 数据层、hooks 和购物车 chrome 按原样接线——绝不要重写其内部、
  通过 API 路由重新路由它们，或重新推导请求形态。当简述需要它们未表达的内容时，阅读拥有它的
  随附文件，并用 `wix-docs` 确认契约；绝不从生成的 SDK 类型、包文件或 `node_modules` 推断一个。
  一个正常的调用者允许的操作属于新的数据层函数。一个特权操作属于经过验证的服务端端点——见
  `templates/shared/CUSTOM_OPERATIONS.md`。呈现层**不随附**：该垂直领域的 INSTRUCTIONS 命名
  你要在随附 hooks 上自行设计和实现的表面，附带承载每个表面契约的骨架（对于 storefront：
  带其 islands 的 shop 和 PDP 页面，以及 home）。
- **绝不基于关于 Wix API 的训练数据或记忆工作。** 不是 URL、路径、版本、头、字段名称、筛选
  键或正文。你发起或编写的每一次 Wix 调用——在前端、在种子中、在对站点的构建时读取中——都
  来自此处安装的官方 Wix 技能、它们首先部署的代码，或当它们不覆盖该调用时来自通过
  `wix-docs` 的官方 Wix 文档。先在那里阅读它，然后编写调用。**测试，在每次请求之前：** 确切
  的路径和正文出现在本会话中你运行的某次文件读取或文档搜索的输出中，你从该输出复制它们。
  其他任何东西都是记忆：一个其输出在调用之前被截断的文件、一个你记得早些时候读过的来源、
  一个通过改动你确实找到的某个调用的一部分而构建的调用。一个返回 400 或什么都没有的猜测
  调用不是通向答案的一步；它是本规则要防止的失败，尝试下一个变体仍是猜测，而对未通过测试的
  调用返回的空或错误回复告诉你关于该调用的信息，绝不关于站点。在调用未确认时保持错误可见：
  不要 `2>/dev/null`，不要 `| echo`。随附代码针对实时站点测试；一个看起来相似的正文正是返回
  空内容的那个，而 API 很少说明原因。
- **绝不 mock，大声失败，购买经由 Wix。** 实时数据或诚实的空状态；显示错误，而非吞掉它们；
  结账/购买始终通过 Wix 重定向会话。
- **可选能力从计划部署。** 一个垂直领域可以加入某项共享能力而无需复制敏感代码。对于普通
  文件上传，向计划添加一个具名的 `capabilities.mediaUpload.policies` 条目；Fast 一次性随附其
  客户端辅助脚本、Astro 端点、依赖和生成的策略模块。在选择它之前阅读
  `templates/shared/CUSTOM_OPERATIONS.md`。智能体将辅助脚本接到产品 UI；它绝不编写或放宽该
  端点。对于全站搜索（一个带建议的头部框、一个覆盖已部署垂直领域的产品、服务、文章和活动的
  `/search?q=` 页面），添加一个 `capabilities.siteSearch` 条目；Fast 一次性随附其数据层、
  store、hooks、组件和搜索页面。启用它意味着 Wix Site Search 应用由种子步骤安装到站点
  （`install: true`；该能力的 `seed/install.mjs`，在内容种子之后运行）——索引在安装后约
  半分钟内填充。操作手册：`templates/shared/capabilities/site-search/INSTRUCTIONS.md`。

### 脚本

`<SKILL_ROOT>/install/` 存放普通 Node 脚本，无构建步骤，每个都有头部注释说明它做什么以及
如何调用。它们是运行中确定性的步骤：每个复制、组合、安装或播种，并打印一个 JSON 对象（或
每行一个 JSON 事件）说明它发现和做了什么。当你想在运行前了解某一步做什么，或当某一步输出
令你意外时，阅读它们中的任意一个；模板的种子模块是垂直领域所需 Wix 调用的参考，按可行的顺序。

| 脚本 | 作用 |
|---|---|
| `templates.mjs` | 找到随附代码（本技能旁的 `wix-headless-templates` 技能），或作为稀疏克隆一次性获取它；打印其文件夹。 |
| `context.mjs` | 读取 `wix.config.json` 和 `.env.local`，在 CLI 路由上缺失时拉取环境，并打印文件夹的形态、部署站点和内容站点、发布者（`cli` 或 `plugin`）、npm 是否可达注册表，以及上传工具的 S3 主机是否从此 shell 应答（`carrier.s3`）。不更改任何内容。 |
| `setup.mjs` | 从文件夹和简述一次调用得到准备好品牌层的项目：脚手架（或，带 `--site --app`，复制组合模板并写入配置和环境）、部署该垂直领域的代码、写入智能体配置文件、启动安装，并为其创建的站点播种。 |
| `attach.mjs` | 对已存在站点的 `setup.mjs`：针对给定的站点 id 执行 `wix create` 创建后所做的事（OAuth 应用、托管、环境、`wix.config.json`），然后脚手架、部署和安装；仅带 `--plan` 时播种；带 `--hosting self` 时，将给定来源放入 OAuth 应用的允许清单而非 Wix 托管。 |
| `deploy.mjs` | 将垂直领域的代码层组合进项目以适配技术栈（`astro`、`react`、`lib`、`static`），添加其依赖，并保持锁文件对 `npm ci` 有效（`lock.mjs`）。 |
| `install.mjs` | 唯一的依赖安装：根据锁文件和 `node_modules` 已持有内容决定不安装、`npm install` 或 `npm ci`；写入 `.install-exit`。 |
| `bootstrap.mjs` | 仅 CLI 路由：检查 Wix CLI 并运行设备代码登录，每行一个 JSON 事件。 |
| `check.mjs` | 将本已安装技能及其模板与其来源仓库比较；只读，打印将执行的更新命令。 |
| `agents-md.mjs`、`env-ignore.mjs` | 写入新项目的 `AGENTS.md`、`CLAUDE.md` 和 `.gemini/settings.json`；将 `.env.local` 排除在 git 之外。 |
| `proc.mjs`、`background.mjs`、`pins.json` | 在每个操作系统上以相同方式启动 npm 和 npx；分离的安装和种子；固定的 CLI 和模板版本。 |
| `templates/<vertical>/seed/seed-*.mjs`、`read-site.mjs` | 该垂直领域从计划的种子，以及对站点已持有内容的读取。它们旁边的 `SEED.md` 是计划的契约。 |

## 运行

全程需要：Node ≥ 24.18、git、安装在本技能旁边的两个伴生技能 `wix-docs` 和 `wix-manage`，
以及两种使用 Wix 的方式之一。`node <SKILL_ROOT>/install/context.mjs` 以 `publisher` 打印
这台机器拥有哪一种：

- **`plugin`** —— 这台机器上没有 Wix CLI 会话；Wix MCP 的工具在你的工具列表中
  （`ExecuteWixAPI`、`UploadHeadlessWebsiteFiles`：一个连接了 Wix 插件或连接器）；且 `npm`
  可达注册表，因此 kit 在此运行。MCP 携带用户的登录。站点通过 `ExecuteWixAPI` 以配方
  `wix-manage/references/sites/create-headless-site.md` 预置，垂直领域放在 `seedOptions` 中
  使其应用随站点安装（预置调用返回 `metaSiteId` 和站点的 OAuth 客户端 `appId`）；第 3 步的
  setup 将两者作为 `--site` 和 `--app` 并运行无 CLI；种子是从该垂直领域的 `SEED.md` 编写的
  `ExecuteWixAPI` 脚本（`guides/api-run.md` 第 4 节）；发布是 `npx astro build`，然后构建用
  `UploadHeadlessWebsiteFiles`（第 5 步）上传，在客户端将 `attachments` 显示为本地路径时一次
  调用附上，或从一台可达互联网的 shell 用 `curl` 到第一次调用返回的 URL 分两次调用（URL 在
  Amazon S3 上；`curl -sI -m 25 https://s3.amazonaws.com` 在可用时以 S3 自己的头应答，
  `x-amz-request-id` 且通常 `Server: AmazonS3`，而限定到少数主机的沙箱会得到代理的拒绝，两者
  都没有）。该工具将构建发布到站点的 Wix 托管，将项目源代码存储在站点的 Code Store 仓库，
  并返回实时 URL。插件路由无需登录。**载体在构建之前确定**，依据 `context.mjs` 的
  `carrier.s3` 以及客户端是否将 `attachments` 作为文件交过来（工具的 `attachments` 描述
  命名了这样做的客户端）：两者都没有时，Astro 构建无法到达站点，运行即为
  `guides/api-run.md`——通过 `ExecuteWixAPI` 创建站点、应用和种子，前端作为几个小的静态页面
  以工具的 `files` 形式 drop，对照 kit 的 REST 孪生和核心作为参考编写（其第 5 步）；不运行
  compose，因为它写入的每个文件都必须作为文本写出来。
- **`cli`** —— Wix MCP 未连接，或这台机器上已有 Wix CLI 会话：一个已登录的 Wix CLI
  （`npx @wix/cli@latest whoami`；`npx @wix/cli@latest login` 是设备代码流：向用户呈现 URL
  和代码，绝不将令牌读入上下文）。`node <SKILL_ROOT>/install/bootstrap.mjs` 检查 CLI 并在
  没有时运行登录；`wix create`、`wix env pull` 和 `wix release` 执行下面步骤所说的内容。

冷启动页面 `https://www.wix.com/skills/headless-cold-start/headless-kit.md` 将一台什么都没有
（包括技能）的机器带到那一点。本次运行读取的四个技能（`wix-headless-kit`、
`wix-headless-templates`、`wix-docs`、`wix-manage`）在该安装之后位于磁盘上（`.agents/skills/`，
或插件的文件夹），或由客户端的技能工具提供（要读取的文本，而非文件：脚本和模板仅从磁盘运行），
或在线于 `https://www.wix.com/skills/<skill>/<path>`，其中 `<skill>.manifest.json` 列出每个
文件及其大小，文件夹的 `_content` 一次性返回其文件；下面的 `<SKILL_ROOT>` 是 kit 在磁盘上的
文件夹。在已经持有 `wix.config.json` 的文件夹中，先运行
`node <SKILL_ROOT>/install/context.mjs`：它在 `.env.local` 缺失时（在 CLI 路由上）运行
`wix env pull`，并打印文件夹的**形态**（`folder.shape`，第 3 步的各情况，附每个的 `next`）
以及项目拥有的两个身份——部署站点（配置，发布去向）和内容站点（环境，其 SDK 客户端以哪个
应用运行，及其仪表盘管理业务）。它们是同一个站点，除了在**迁移预览**上
（`guides/migration.md`），那里环境命名被迁移的站点。这里的每个脚本都读取该上下文；调用
所针对的站点绝不单从配置猜测。然后一次性获取随附代码：`node <SKILL_ROOT>/install/templates.mjs`。
它打印文件夹；下面的 `templates/…` 路径相对于该文件夹，绝不假定在 `<SKILL_ROOT>` 下。
`node <SKILL_ROOT>/install/check.mjs` 说明该技能或其模板是否有更新版本并打印更新命令；它
不更改任何内容。

在任何运行期间，让站点在每一步都保持工作，以便用户可随其成长而试用。只有站点所有者才能采取
的步骤绝不阻碍流程：草拟的内容是实时的，任何收取金钱的内容在支付连接之前都会到达 Wix 的
结账。所有者的步骤连同其链接放入结尾，作为用户可以采取或请求的后续步骤。

在任何运行期间：如果用户要求向 Wix 发送反馈、抱怨或变得沮丧，或运行遇到任何形式的摩擦：
任何比应有的代价更多轮次的事情，无论是否以错误告终（令人困惑的错误、文档缺口、不得不重跑的
种子、未能覆盖简述的随附文件、需读源码才能理解的操作手册行、不得不通过试错弄清楚的调用、
不得不发明的变通、缓慢或不稳定的步骤、平台门），按 `<SKILL_ROOT>/guides/feedback.md` 提议将
其转达给 Wix。默认是主动提供而非等待被要求；只在明确同意后发送，绝不自动发送。第 5 步以相同
的自检结束。

1. **解析技术栈。** 默认是 **Wix 托管的 Astro**——除非用户指定另一框架或目录已持有另一个，
   否则采用它。然后，根据随附代码在那里能运行什么：
   - **React**（Vite、Next 等）运行所有随附内容——数据层、hooks、组件：`--stack react`。
     智能体自己的文件可能是 JS；随附文件是 TypeScript 且在 JS 项目内原样构建——绝不要手工
     剥离它们；如果简述要求任何地方都没有 TypeScript，说明随附代码无法满足并询问后再继续。
     具名框架先用其自己的命令脚手架（`npm create vite@latest` 等），然后第 3 步在该文件夹中
     运行。
   - **另一种打包的 JS 框架**（Vue、Svelte、Solid、纯 Vite）：数据层和无框架 store 可运行
     （`src/wix/` 中没有 React），React hooks 和组件不适用：`--stack lib`。智能体绑定 store，
     并对照相同契约为其框架编写组件。
   - **无打包器，或另一种语言**——静态站点（纯 HTML/CSS/JS）、服务端渲染应用（Flask、Laravel、
     Rails 等）：**参考模式**（其下文章节，以及 `<SKILL_ROOT>/guides/reference-mode.md`）。
     `app/` 中的任何内容都不部署；REST 层为浏览器端部署，服务端为其读取移植它。

   **Wix 托管接受什么，以及每个技术栈要在那里发布需要什么。** `wix release` 上传
   `wix.config.json`（`site.outputDirectory`）中命名的文件夹并将其作为文件提供——无 SPA 回退、
   无目录索引、无重写：`/` 和真实文件可解析，干净的客户端路由在直接加载或分享时返回 404。
   服务端代码仅作为 Cloudflare Workers 构建运行，声明为 `outputDirectory: { client, server }`。
   - **托管 Astro** 是 Wix CLI 脚手架的技术栈：Wix Astro 集成（`@wix/astro`，环境认证）、托管
     适配器（`@wix/astro-wix-hosting-adapter`，Workers 构建）、用于随附组件的 React 18 的
     `@astrojs/react`，以及在 `astro.config.mjs` 中的 `integrations: [wix(), react()]`、
     `adapter: wixHostingAdapter()`、`output: "server"`、`security: { checkOrigin: false }`、
     带 `static.wixstatic.com` 的 `image.domains`。不用 CLI 制作的 Astro 项目没有这些；
     在部署前添加它，站点就会提供每条路由。该集成的当前主版本（`@wix/astro` 3，如本技能的
     模板）要求 **Astro 7**：较早主版本的项目先迁移到 7，或作为 React 宿主连接。
   - **React 和其他打包器**将其自己的构建作为文件发布。因此路由是哈希路由，或每条路由一个
     发出的 HTML 文件并通过其文件名链接——在编写第一条路由之前决定；任何作为返回目标交给
     Wix 的 URL 都必须是宿主能提供的。通过直接加载一个深层 URL 验证，而非从 `/` 导航。
   - **构建为服务器的框架**（Next、Nuxt、Remix、SvelteKit 等）仅作为静态导出发布（文件，
     上面的规则适用），或作为通过 `outputDirectory: { client, server }` 的 Workers 构建；
     否则它自托管，其域名在结账能返回之前被添加到 OAuth 应用的允许域名。
   - **静态**（无构建）：`outputDirectory` 指向页面所在文件夹；一条路由是一个页面加一个查询
     字符串 slug（参考模式）。
2. **种子计划。** 简述决定播种什么；本次运行创建的站点总是以内容开场：

   | 简述 | 计划 |
   |---|---|
   | 以任何形式提供内容：CSV、JSON 或电子表格、提示词中的列表、PDF 价格表、一个照片文件夹加一个文本文件、指向其当前目录的链接、任何命名内容的材料 | 那**就是**计划：按 `templates/shared/SUPPLIED-CONTENT.md` 和该垂直领域的 `SEED.md`（“Supplied content”）将其映射进 `plan.json`，每个条目、名称和价格逐字，其图像且仅其图像 |
   | 描述内容而不列出它（“一个手工浇筑蜡烛的商店，四支”、“三个组里的十几个 FAQ 问题”） | 按该垂直领域的 `SEED.md` 从描述草拟计划（此点仅读那个；把 `INSTRUCTIONS.md` 留给第 4 步） |
   | 对内容只字不提（“为我构建一个商店”） | 在本次运行为此创建的站点上（create、adopt、config-only）按该垂直领域的 `SEED.md` 草拟计划，使站点以内容开场——智能体自行决定的演示内容，无需被要求——并在结尾消息中说明它是占位内容以及所有者在哪里编辑它。在本次运行之前就存在的站点上：什么都不播种；它的内容属于它自己 |

   **现有站点没有自己的计划**：当简述按 id 命名站点，或文件夹的配置如此时，站点已经持有
   内容；前端读取那里已有的内容（第 3 步的 attach 路径），只有简述提供或描述的内容才被添加到
   其中。
3. **在项目的文件夹中设置项目**——一次确定性调用，对空文件夹和已存在于磁盘的项目都一样；
   **文件夹决定**它做什么，依据少数文件事实：`wix.config.json`、其 `site.outputDirectory`、
   `.env.local` 中的迁移变量、`package.json`、`index.html`（在根或 `public/` 中）、
   `src/pages/`。`node <SKILL_ROOT>/install/context.mjs` 打印它读取的形态及其 `next`。
   **简述就是指令**：它要求开启的内容会安装到文件夹命名的站点上，无需再次询问。仅当行动会为
   已有站点的文件夹创建第二个站点，或当似乎需要清理时才询问。

   ```bash
   node <SKILL_ROOT>/install/setup.mjs --vertical <vertical>[,<vertical>…] [--plan plan.json] [--business-name "<Brand>"] [--stack <stack>]
   ```

   在这一次调用中命名简述需要的每个垂直领域（带会员账户的商店是 `storefront,members`）：第一个
   垂直领域的模板脚手架项目；其余在同一次调用中部署，因此一次安装覆盖它们全部。安装开始后
   添加的垂直领域要花费第二次安装。

   | 文件夹持有 | 形态 | setup 做什么 | 由 setup 播种 |
   |---|---|---|---|
   | 什么都没有，或散落文件（一个 CSV、一个简述） | **empty** → create | 在此用该垂直领域的组合模板 `wix create`；`--business-name` 命名站点。在插件路由上，`--site <metaSiteId> --app <appId>`：预置调用为新站点返回的 id，或对于存在但无项目的站点（一个 drop 的站点），其 id 以及来自 `get-or-create` 的伴生应用 id（`guides/existing-site.md`）；组合模板被复制进来并为该站点写入 `wix.config.json` 和 `.env.local`，无 CLI | **是**，来自 `--plan`，在 CLI 路由上。在插件路由上 setup 不接受 `--plan` 也不播种：计划通过 `ExecuteWixAPI` 播种（`guides/api-run.md` 第 4 节） |
   | 一个前端，无配置（一个 `package.json`，或根处的 `index.html`：某人的 Astro、Vite、Next、纯 HTML） | **project** → adopt | 就地 `init` 给它一个新的空站点，然后部署；第 1 步的 `--stack` 是必需的；在之前或之后紧接着让项目成为该技术栈在 Wix 托管上所需的样子（第 1 步） | **是**，来自 `--plan` |
   | 一个配置，其 `.env.local` 声明了活跃的编辑器迁移（`EDITOR_MIGRATION_STATUS=ACTIVE`），有无下载携带的空白 Astro 起始器 | **migration** → migrate | 随附代码进入起始器（或围绕裸配置的组合模板），以被迁移站点的应用作为客户端部署，安装开始；`ready_for_brand_layer` 说 `mode: "migrate"`，父级为 `siteId`，子级为 `deploySiteId`（`guides/migration.md`） | 绝不 |
   | 一个配置，无前端 | **config-only** → 拒绝 | 站点存在且还没有前端：在 CLI 路由上 `attach.mjs`（如下）从配置取站点、复用其托管、脚手架并部署；在插件路由上 `setup.mjs --site --app` 用配置的 id，在空文件夹中，然后构建由 `UploadHeadlessWebsiteFiles` 发布（`guides/existing-site.md`）。该配置正是 `init` 留下的，而 `init` 总是创建站点：此站点是为本次运行创建的且为空 | **是**：像 create 一样草拟计划，然后 `attach.mjs --plan` |
   | 一个配置和一个前端（一个 `package.json`，或 `site.outputDirectory` 命名文件夹内的 `index.html`） | **wix-project** → 拒绝 | 迭代：绝不脚手架、`init` 或重播种。`deploy.mjs <vertical…> --stack <stack>` 添加一个解决方案（客户端 id 来自 `.env.local`，配置作为回退），然后一次安装 `node <SKILL_ROOT>/install/install.mjs`（当 `node_modules` 已满足锁文件时不做事）；一个更改是文件编辑；然后发布 | 否 |
   | 一个配置、一个 `package.json`、`public/index.html` 且无 `src/pages/`（通过 drop 流发布、在其 Wix Dev Machine 上的站点） | **static-in-astro** → 拒绝 | 页面保持为 `public/` 中的普通文件：`deploy.mjs <vertical…> --stack static --out public` 将 REST 层放入 `public/js/wix/`，页面就地接线（参考模式），不添加 Astro 页面；用 `build` 然后 `release` 发布，URL 保持 | 否 |
   | 一个配置和 CLI 的空白 Astro 起始器且无自己的工作（`wix-astro-blank`，仅空白模板的包：Dev Machine 从未发布的站点、一个裸 `wix create`） | **blank-starter** → 拒绝 | 在配置的站点上 `attach.mjs --business-name <brand> --vertical <v…> [--plan plan.json]`：该垂直领域的组合模板取代起始器（连同其锁文件），安装和种子分离启动；在它们运行时构建品牌层 | **是**，来自 `--plan`：站点是为本次运行创建的且为空，除非 `read-site.mjs` 显示内容 |
   | 一个配置、根处的 `index.html`、无 `package.json`（通过 drop 流发布并下载的站点） | **published-static** | 配置的站点，无 `init`：`site/` 成为上传，REST 层部署进 `site/js/wix/`；`next` 说要移入页面、样式和资产；发布保留 URL | 否 |

   没有行命名的文件夹是 **wix-project**：仅填充路径——绝不脚手架、`init`、重播种或删除；部署、
   编辑、发布。错误的猜测代价是一次更慢的运行，绝不是用户的工作。

   **谁决定种子：站点从哪里来，绝不是简述的措辞。** 为本次运行创建的站点在构造上为空，因此
   总是被播种——当简述提供或描述任何内容时用其内容，否则用智能体按该垂直领域的 `SEED.md`
   草拟的演示内容，无需被要求，使站点以有东西可看开场。为本次运行创建意味着：setup 创建了它
   （create、adopt），或文件夹只持有一个 `wix.config.json` 且无前端（config-only——该配置正是
   `init` 留下的，而 `init` 总是创建站点；attach 报告 `siteOrigin: "init"`）。在运行之前就
   存在的站点——由简述中的 id 或 `--site` 命名、链接到它的项目、迁移的父级（attach 报告
   `siteOrigin: "given"`）——持有运行未创建的内容：只播种简述**提供或要求添加**的内容
   （`attach.mjs --plan plan.json`，或从项目根运行该垂直领域的种子模块：
   `node <templates>/<vertical>/seed/seed-<vertical>.mjs plan.json`，`<templates>` 为
   `install/templates.mjs` 打印的文件夹），绝不为它臆造内容。“为我的玩具店创建一个新 storefront”
   描述业务，而非要添加的内容：不播种任何内容。无论哪种方式都先读取现有站点
   （`seed/read-site.mjs`）。种子按名称是增量和幂等的；站点上的任何内容绝不删除或覆盖，结果的
   `preexisting[]` 命名已存在的内容。

   - 简述按 id 命名站点 → 不是这次调用：阅读 `<SKILL_ROOT>/guides/existing-site.md` 并遵循它
     （读取站点，然后 `attach.mjs`，它针对给定站点执行 setup 所做之事，并仅带 `--plan` 播种，
     该指南说只在简述提供或要求添加内容时才传；自托管和已存在于磁盘的项目也在其中）。

   `--vertical` 是必需的，并选择部署哪些随附代码**以及**运行哪个种子。`ready_for_brand_layer`
   事件说明 `mode`（`create`、`adopt`、`migrate`、`published-static`）、`shape`、技术栈、
   `publisher`（`cli` 或 `plugin`），以及该技术栈的 `next`，包括它如何发布。

   setup 用 `--skip-git` 脚手架：它组合自己的步骤并将版本控制留给你 / 外层仓库，因此它**不**
   创建脚手架通常的 git 仓库 + 初始提交（否则如果项目落在某仓库内，会变成嵌套仓库的 gitlink）。

   项目**在当前目录中**创建——即入口让你工作的那个文件夹，它已持有已安装的技能——因此项目自
   包含，之后在其中打开的会话能找到一切。如果文件夹已持有脚手架将写入的文件，它拒绝。
   `--subfolder` 改为在按业务命名的新文件夹中创建它，用于必须保持原样的当前文件夹；技能于是
   位于项目上一级。

   它每行发出一个 JSON 事件并在**约 35 秒内**返回：从该垂直领域的组合模板**脚手架**项目
   （`wix create` 复制它：代码及其锁文件随脚手架到达），**部署**文件夹仍缺少的任何内容
   （用代码导入的每个依赖修补 `package.json`），然后**启动两个分离的后台作业**——依赖安装
   （`install/install.mjs`：当 `node_modules` 已满足锁文件时不做事，在已存在的树上
   `npm install --ignore-scripts`，否则 `npm ci --ignore-scripts || npm install --ignore-scripts`）
   和**种子**——它们的日志和完成标记在事件中。最终的 `ready_for_brand_layer` 事件携带项目目录、
   siteId、现成的仪表盘链接以及两个标记。转达值得注意的事件。在 `error` 事件上，仅通过下面的
   手动路径恢复那一步，然后继续。

   **恢复一步，或稍后添加一个解决方案：** 各部分从项目根自行运行——
   `node <SKILL_ROOT>/install/deploy.mjs <vertical…> --stack <stack>`（客户端 id 从
   `wix.config.json` 读取），一次 `node <SKILL_ROOT>/install/install.mjs`
   （**绝不要并发第二次 npm install**：一个 `node_modules` 中两个 npm 会竞争并重做彼此的
   工作；setup 已经启动了一个——等待其标记），该垂直领域的种子模块按其 `seed/SEED.md`。
   现有项目上的代码变更在它被**发布**（第 5 步）且实时 URL 显示它时才算完成——而不是当开发
   服务器或本地构建显示它时。管理变更（针对站点的配方）无需发布；前端实时读取它。
   通过上传工具发布的站点将其源代码保存在其 Code Store 仓库中：之后在任何会话中的更改都下载它
   （`guides/existing-site.md`），以下载的修订作为 `expectedHeadRevisionId` 编辑、构建并上传。
   一个站点保持一条写入路径：这样的站点不通过 `wix release` 或普通 drop 更改。

4. **在安装完成时设计并构建呈现层**——在 `ready_for_brand_layer` 事件的项目目录中，按该垂直
   领域的 `INSTRUCTIONS.md`：设置 `@theme` 标记、为 chrome 品牌化，并在随附 hooks 上自行实现
   该垂直领域的创意表面（对于 storefront：你的产品卡 + 网格、shop 表面、PDP 表面和首页）——
   设计以贴合简述，而非从参考组件复制。现在（而非更早——它们的契约仅从本步起才重要）阅读
   INSTRUCTIONS 和共享底线——`templates/shared/DESIGN.md` + `templates/shared/CONTENT.md`；
   hook/DTO 契约内联在那里，因此不要打开随附文件本身。
   **已存在的前端获得最小值。** 当运行接线在此运行之前就存在的页面（一个 drop 的 mock、一个
   adopted 站点、一个已发布的静态站点）时，做使它们工作的最少工作：将页面显示的每个控件连接到
   随附代码，只添加控件无法工作所必需的内容。该垂直领域提供的其他任何内容仅在简述要求时才添加；
   在结尾消息中命名它。
   如果简述需要随附代码未覆盖的核心操作，在编写它之前阅读
   `templates/shared/CUSTOM_OPERATIONS.md`。使用一条文档化路径并实现它；不要逆向工程 SDK 内部。
5. **当两个后台作业都已完成时**——安装的标记（`.install-exit`，含 `0`）和种子的标记
   （`.seed-exit`）都存在——**验证种子成功**（`.seed-exit` 含 `0`；`seed-result.json` 有
   你所写摘要的已创建计数——若非零，读取 `seed.log` 并手工重跑种子模块）。那两个种子文件
   **仅在 setup 启动了种子时**存在（attach 不运行任何：只等待安装标记）。当你自己运行了
   `seed-store.mjs`（adopt、iterate 和 published-static 运行、参考模式），没有可等待的标记：
   进程的退出码就是结果，其 stdout 就是 JSON——等待进程（前台运行，或对其 pid `wait`），而非
   等待文件。然后**构建并发布一次**（托管），如 `ready_for_brand_layer` 事件的 `next` 为该
   技术栈和发布者所述：CLI 路由上的 Astro → `npx @wix/cli@latest build` 然后
   `npx @wix/cli@latest release`；插件路由上的 Astro → 从项目根 `npx astro build`，然后用站点
   的 `siteId` 调 `UploadHeadlessWebsiteFiles`，以下两种形式之一（`next` 携带 zip 命令，在没有
   `zip` 二进制处用 Python 的 `zipfile`）：
   - **附上**，一次调用：项目不带 `node_modules` 地压缩（其中含 `.wix/build-metadata.json`
     和 `dist/`），作为 `attachments` 传入。构建被发布，且同一 zip 中的源代码被存储。
   - **两次调用**，从一台可达互联网的 shell（上传 URL 在 Amazon S3 上：
     `curl -sI -m 25 https://s3.amazonaws.com` 在可用时以 S3 自己的头应答，
     `x-amz-request-id` 且通常 `Server: AmazonS3`；限定到少数主机的沙箱会得到代理的拒绝，两者
     都没有，且无法以这种方式发布构建）：构建 zip（`zip -qr build.zip dist .wix`）和源代码
     zip，项目不带 `node_modules`、`dist`、`.wix`、`.astro`、`.env*`、`.agents`
     （`zip -qr source.zip . -x 'node_modules/*' 'dist/*' '.wix/*' '.astro/*' '.agents/*' '.env*' 'build.zip'`）。
     先 `{ siteId, prepare: true, size }`，`size` 为 `wc -c < build.zip`：回复给出
     `curl -X PUT ... --data-binary @build.zip "<putUrl>"`，站点仓库接受源代码 zip 时再给一个，
     仓库的 `headRevisionId`，以及确切的第二次调用。按给定运行 curls，然后
     `{ siteId, uploadKey, sourceUploadId, expectedHeadRevisionId }`。

   服务部署、将源代码提交到站点的 Code Store 仓库，然后发布；被拒绝的提交不发布任何内容。
   `expectedHeadRevisionId` 是项目起始的修订：它被下载时的那个，或对本次运行开始的项目，
   prepare 返回的 `headRevisionId`。省略时，仅在尚无任何内容的仓库上发布有效；否则它应答
   `EXPECTED_HEAD_REQUIRED` 且不发布任何内容。409 `CODE_STORE_HEAD_CHANGED` 意味着仓库此后
   移动了：再次下载它（`guides/existing-site.md`）、迁移更改、构建并上传。第二次调用上的 404
   意味着上传过期：重新 prepare。结果携带实时 URL；发布替换此前 drop 到站点上的静态页面，
   URL 相同。否则：
   React 或其他打包器 → 项目自己的构建，然后对 `wix.config.json` 中命名的构建文件夹
   `npx @wix/cli@latest release`（深层 URL 必须直接应答 200，第 1 步）；静态 → 仅 `release`。
   如果安装失败，再运行一次然后构建。不要在流程中途 build+release；后端内容在运行时获取，
   因此重新发布绝不“刷新”已播种的数据。运行仅在站点被发布后才算完成——以实时 URL 和仪表盘
   链接 `https://manage.wix.com/dashboard/<siteId>` 收尾（`ready_for_brand_layer` 事件的
   `siteId`：在迁移预览上那是被迁移站点的仪表盘，发布 URL 是预览的，原站点未变，他们在批准
   后你完成迁移（`guides/migration.md`）——三者都说）。告诉用户如何将他们自己的域名放到站点上，
   按 `wix-manage` 配方 `references/domains/domain-search-purchase-and-connect.md`
   （安装在本技能旁，否则 `https://www.wix.com/skills/wix-manage/references/domains/domain-search-purchase-and-connect.md`）：
   通过 Wix 购买，或他们已拥有的域名。当站点通过托管结账收取金钱（购物车、付费预订或租赁、
   门票、计划、捐赠）且没有任何东西说明支付已设置好时，说明访客在结账时会遇到什么直到它们
   被设置——“我们无法接受在线支付。请联系我们获取订单帮助。”——并交付两个修复链接：
   **Accept payments** `https://manage.wix.com/dashboard/<siteId>/wix-cashier/payments`
   （连接支付方式；“手动支付”对于免费和当面支付流程就足够）和 **Upgrade the plan**
   `https://www.wix.com/upgrade/website?metaSiteId=<siteId>`（在线支付需要高级计划）。两者都是
   所有者的步骤，而非站点的缺陷。当运行从所有者自己的页面开始时，命名那些页面承诺但已发布站点
   未做到的内容。**从发布输出（CLI 的，或上传工具的结果）逐字复制实时 URL——绝不从记忆中重新
   键入**（一个记错的子域会给用户一个 404）。在你签收之前，对整个会话运行反馈自检
   （`guides/feedback.md`）：任何比应有的代价更多轮次的事情，包括你默默恢复的内容，都是信号；
   如果有任何符合，在交付链接时提议转达，并只在明确同意后发送。

## 参考模式——静态站点，或另一种语言的服务端渲染应用

随附数据层作为基于 `fetch` 的 **REST 层**存在第二份，用于无法运行 `app/` 的技术栈：无打包器的
静态站点，或另一种语言的服务端渲染应用（Flask、Laravel、Rails）。REST 层为浏览器端部署；
服务端为其读取移植它。当第 1 步解析到这些技术栈之一时，在第 3 步之前阅读
`<SKILL_ROOT>/guides/reference-mode.md`：它包含机制（`site/` 布局及 setup 在其中的部分、
浏览器与服务器各运行什么、自托管来源的 OAuth 允许清单、预渲染输出）以及如何结束这样一次运行。
一个公开站点仍更适合托管 Astro；在你收尾时说明这一点。

在 kit 不运行的地方（无 npm 路由、无 Node），或当安装、CLI 或登录在你所在处被阻止时，阅读
`<SKILL_ROOT>/guides/api-run.md`：同样的运行，一步一步，作为脚本发起的 Wix API 调用，以及
本技能旁边承载契约的文件。在插件路由上，同一指南是通过 `ExecuteWixAPI` 进行的调用（预置调用、
种子）的参考；构建和发布是本技能的第 5 步。

## 垂直领域

候选清单。将简述与第一列匹配；当它命名了一个此处没有的 Wix 产品或功能、当两行都可能适合、
当请求听起来像本技能不随附的东西（会议、礼品卡、忠诚度、群组）时，阅读
`<SKILL_ROOT>/guides/capabilities.md`：每个 Wix 产品、它覆盖什么、这里哪个垂直领域随附它以及
什么未随附。

| 用户想要…                                                                              | 垂直领域          | 操作手册                                   |
| -------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------ |
| 在线商店：产品、类别、变体、购物车、结账                                 | **storefront**    | `templates/storefront/INSTRUCTIONS.md`    |
| 预约/课程：服务、时段、员工、预订、结账                         | **bookings**      | `templates/bookings/INSTRUCTIONS.md`      |
| 租赁：按小时或按天租的房间、车辆、装备，客户选择的时长，结账 | **rentals**       | `templates/rentals/INSTRUCTIONS.md`       |
| 博客：文章流、类别/标签、富内容文章页面                                    | **blog**          | `templates/blog/INSTRUCTIONS.md`          |
| 结构化内容集合（目录、食谱、列表）及按架构设计的页面 | **cms**           | `templates/cms/INSTRUCTIONS.md`           |
| 任何访客可填的表单：联系/问询、注册、申请、调查——从实时架构渲染 | **forms**         | `templates/forms/INSTRUCTIONS.md`         |
| 活动：列表、活动页面、免费 RSVP、通过托管结账售票                    | **events**        | `templates/events/INSTRUCTIONS.md`        |
| 会员账户：自定义应用内登录/注册、受限页面、账户页面                      | **members**       | `templates/members/INSTRUCTIONS.md`       |
| 作品集/展示：项目集合、带媒体画廊的项目页面              | **portfolio**     | `templates/portfolio/INSTRUCTIONS.md`     |
| 会员/订阅计划：定价页面、计划详情、托管购买                    | **pricing-plans** | `templates/pricing-plans/INSTRUCTIONS.md` |
| 餐厅：带照片的菜单、在线点餐、餐桌预订                            | **restaurants**   | `templates/restaurants/INSTRUCTIONS.md`   |
| FAQ：按类别分组的问题、搜索、可展开答案、每个问题一个链接         | **faq**           | `templates/faq/INSTRUCTIONS.md`           |
| 捐赠：活动页面、目标进度、通过托管结账的一次性和经常性捐赠   | **donations**     | `templates/donations/INSTRUCTIONS.md`     |

垂直领域可组合：一个跨越多个的简述（一个带博客的餐厅、一个带会员账户的商店）在 setup 调用中
命名它们全部（`--vertical restaurants,blog`），因此一次安装覆盖它们；每个垂直领域的种子用其
自己的计划运行。在已构建的项目上，从项目根
`node <SKILL_ROOT>/install/deploy.mjs <vertical…>` 添加一个，然后一次 `npm install`，然后
其种子。不匹配任何随附垂直领域的请求没有随附代码：一行说明这一点，然后通过 `wix-docs` 从
Wix API 参考构建它（先搜索，然后方法页面），与每次其他调用相同的规则，在同一项目和栈上，
当存在时从最接近的随附垂直领域开始（`guides/capabilities.md` 说明是哪一个）。
