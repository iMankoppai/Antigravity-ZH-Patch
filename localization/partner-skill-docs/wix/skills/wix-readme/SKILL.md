---
name: wix-readme
description: "Wix 插件包含什么，以及如何通过它使用 Wix：Wix MCP README 返回的流程、插件各技能及其作用的索引，以及 Wix MCP 各工具及其作用。当插件刚刚安装，或用户询问 Wix 插件能做什么、哪个技能或工具适合某项任务时使用。"
---

# Wix 插件

插件包含两样东西：技能——用于在 Wix 上构建的指令和随附代码文件夹，每个都在其根目录有一个 `SKILL.md`；以及位于 `https://mcp.wix.com/mcp` 的 Wix MCP 服务器，其工具读取并更改用户的 Wix 站点和账户。技能说明怎么做；工具负责执行。

## 如何通过插件使用 Wix

每个 Wix 任务都落在两个地方之一：现在用用户账户发起的一次调用，或用户保留下来、发起相同调用的代码（一个应用、一个无头站点、一个脚本）。到达那里的方式相同。

1. **从 `WixREADME` 开始**，每个对话一次。它完整返回此流程，以及该账户的站点及其已安装的应用。
2. **选择站点。** `siteId` 来自站点上下文；当有多个符合时，询问。某个业务解决方案的 API 仅在该站点安装了该应用时才有效，而应用的版本会改变其端点，因此先检查站点的应用。
3. **找到方法。** 第一个能提供它的来源：对话中较早的工具结果；否则是覆盖该任务的技能（下面的索引说明每个技能的用途），当其示例与情况匹配时，该示例就是模型；否则是文档，REST 用 `SearchWixRESTDocumentation` 或 `BrowseWixRESTDocsMenu`，代码用 SDK、CLI、无头和应用的搜索，然后对方法页面用 `ReadFullDocsArticle`。
4. **获取确切的形态。** 请求以与情况匹配的示例为蓝本：技能的配方或模板，或方法的文档页面，当其展示了情况所需的字段时。这就足够了。架构用于没有示例展示的内容：字段、枚举、筛选或排序键（每个方法一份封闭列表）。对方法的文档 URL 使用 `SearchWixAPISpec`，返回请求和响应架构、REST URL 以及 JavaScript SDK 调用；在其不可用时使用 `ReadFullDocsMethodSchema`。
5. **发起调用，或编写代码。** 现在要做的：`ExecuteWixAPI`，一个函数承载任务的所有步骤、读取及其驱动的写入。对于用户保留的代码：根据第 4 步找到的形态编写调用，REST 或 SDK。`wix-headless-templates` 就是那部分已编写并验证过的代码，每个业务解决方案一个文件夹，而 `wix-headless-kit` 在其上构建站点。

贯穿始终：不从记忆中取任何 Wix 特定的内容。每个 URL、id、设置位置、产品事实、请求形态和字段名称都来自技能、文档工具、较早的工具结果或用户。

## 创建站点

一个新的 Wix 站点以代码编写并上传。`StartDeployWebsite` 返回针对智能体编写或用户带来的文件的站点的指南；`StartHeadlessBuild` 返回针对需要 Wix 业务功能（商店、预订、CMS、会员、支付等）的站点的指南。每个指南都会创建站点、上传它，并说明接下来会发生什么；调用一个并遵循它。

指南建立在以下之上：

- **一个站点，只创建一次**，通过预置调用（`POST .../headless-business-setup/v1/headless-business/provision`，`origin: 'agent'`），它返回 `metaSiteId`，即之后每次调用都采用的 id。较早创建的站点用 `ListWixSites` 找到并再次上传；URL 永不改变。
- **静态页面被丢弃，Wix Astro 构建被发布。** 一次 drop 每次发送完整的文件集。一次构建（`dist/` 旁的 `.wix/build-metadata.json`）通过 `UploadHeadlessWebsiteFiles` 发布到 Wix 托管、服务端渲染：作为附件，或从一台可达互联网的 shell 中分两次调用（先用 zip 的 `size` 调用 `prepare: true`，然后 `uploadKey`）。项目的源代码随发布一起存储，之后的会话从它继续该站点。
- **`UploadHeadlessWebsiteFiles`** 接收 `siteId` 和文件，作为 `attachments` 或 `files` 文本包，并返回实时 URL 和仪表盘。在没有 MCP 的情况下，同样的 drop 是一个 `curl` multipart 调用，无论有无登录。
- **业务功能**来自 `wix-headless-kit` 在同一站点和 `appId` 上的运行：应用已安装且内容已播种，Astro 项目从 `wix-headless-templates` 构建，构建已发布。

了解更多：配方 `wix-manage/references/sites/upload-static-site.md`（https://www.wix.com/skills/wix-manage/references/sites/upload-static-site.md）：每条路由的调用、drop 和 release、查找和更改站点、匿名路由、限制和失败。冷启动（https://www.wix.com/skills/headless-cold-start/headless-kit.md）：从冷环境到已发布站点的无头构建。

## 使用 Wix 的两种方式

### 带 Wix MCP 的插件

首选方式。插件的 MCP 配置连接位于 `https://mcp.wix.com/mcp` 的 Wix MCP 服务器；客户端在第一次调用时让用户登录，下面的工具就在工具列表中，无需安装。上述流程就在它们上运行：`WixREADME` 获取上下文，文档工具查找方法及其形态，`ExecuteWixAPI` 调用它，`StartDeployWebsite` 和 `StartHeadlessBuild` 配合 `UploadHeadlessWebsiteFiles` 创建站点并使其上线。技能从插件的文件夹中读取，当它们不在那里时，`ReadFullDocsArticle` 在线读取它们。

上下文优先：

| 工具 | 作用 |
|---|---|
| `WixREADME` | 每个其他工具都假设的上下文。在 Wix 任务之前每个对话调用一次；之后要处理另一个站点时，改用 `GetSiteContext`。 |
| `ListWixSites` | 列出用户的站点，可选名称筛选。不需要先调用 `WixREADME`。 |
| `GetSiteContext` | 某个站点的深度上下文，按名称或 id：其应用、设置和数据，以 markdown 呈现。 |

构建和部署站点：

| 工具 | 作用 |
|---|---|
| `StartDeployWebsite` | 返回在 Wix 上创建站点并放置文件的指南：HTML、CSS 和 JS、静态构建、zip、其他构建器的导出。更新会保留站点和 URL。无论有无 Wix 登录都可工作。 |
| `StartHeadlessBuild` | 返回无头指南，用于需要 Wix 业务功能的站点：商店、预订、活动、餐厅菜单、博客、定价计划、捐赠、表单、会员、CMS、支付。 |
| `UploadHeadlessWebsiteFiles` | 那两个指南的上传步骤：按 metaSiteId 将静态站点或 Wix Astro 构建放到现有的 Wix Headless 站点上，作为文件、作为附件，或用预签名 URL 分两次调用。 |
| `GetSuggestedDomains` | 站点的域名建议。 |

调用 Wix API：

| 工具 | 作用 |
|---|---|
| `ExecuteWixAPI` | 用一个 JavaScript 函数通过 Wix REST API 读取和更改站点或账户的数据：链式调用、分页、循环、为写入提供数据的读取。调用 Wix API 的首选方式。 |
| `SearchWixAPISpec` | 通过针对索引运行 JavaScript 来检查 Wix REST API 规范以及每个方法的 JavaScript SDK 调用：确切的请求和响应形态、枚举、SDK 导入和签名。 |

文档：

| 工具 | 作用 |
|---|---|
| `SearchWixRESTDocumentation` | 搜索 Wix REST API 文档。查找端点的起点。 |
| `BrowseWixRESTDocsMenu` | 以菜单形式浏览 REST 文档，逐类别。 |
| `SearchWixSDKDocumentation` | 搜索 Wix JavaScript SDK 文档。 |
| `SearchWixHeadlessDocumentation` | 搜索 Wix Headless 文档。 |
| `SearchWixCLIDocumentation` | 搜索 Wix CLI 文档：命令、本地开发、身份认证。 |
| `SearchWixWDSDocumentation` | 搜索 Wix Design System 文档。 |
| `SearchBuildAppsDocumentation` | 搜索 Wix Build Apps 文档。 |
| `SearchDevelopmentDocumentation` | 广泛的 Wix 开发者文档：平台概念和指南，在特定搜索无结果后使用。 |
| `SearchWixHelpCenter` | 搜索 Wix 帮助中心：站点所有者如何在仪表盘和编辑器中手动操作。 |
| `ReadFullDocsArticle` | 按 URL 完整读取一个页面：文档文章或方法页面、技能的 `SKILL.md` 或其任何文件、帮助中心文章。 |
| `ReadFullDocsMethodSchema` | 按文档 URL 读取某个方法的完整请求和响应架构。 |

媒体与反馈：

| 工具 | 作用 |
|---|---|
| `UploadImageToWixSite` | 将图片上传到站点的媒体管理器，并返回其 URL 和媒体 id。 |
| `PickImagesForWixMedia` | 向用户展示文件选择器，从其设备上传图片到媒体管理器。 |
| `ReportIssueToWix` | 在用户要求时，向 Wix 团队报告 Wix 工具、API 或文档中的一个问题。 |

### Wix CLI

另一种方式，从 shell。`@wix/cli` 是 Wix 的命令行工具：它登录 Wix 账户，在磁盘上创建和管理 Wix 项目（一个 Wix 应用或一个 Wix Headless 站点），构建它们并发布到 Wix，并为 REST 调用铸造令牌。其会话位于机器上。全部以 `npx @wix/cli@latest <command>` 形式：

| 命令 | 作用 |
|---|---|
| `login` | 用设备代码登录，并将会话写入 `~/.wix/auth/account.json`。 |
| `whoami` | 显示已登录的账户。 |
| `create` | 创建带站点的 Wix 项目：对于无头站点，创建站点、其 OAuth 应用和托管，以及项目的 `wix.config.json`（`siteId`、`appId`）。 |
| `env pull` | 将项目的环境写入 `.env.local`：站点的客户端 id 以及构建读取的值。 |
| `build` | 为 Wix 构建项目：对于 Astro 站点，`dist/` 和 `.wix/build-metadata.json`。 |
| `release` | 将构建发布到 Wix；站点保留其 URL。 |
| `token`、`token --site <siteId>` | 铸造一个管理员令牌，账户范围或站点范围，用于从 shell 发起 REST 调用：`Authorization: Bearer <token>`（`wix-docs/references/CALLING.md`）。 |

`wix-headless-kit` 通过 MCP 的工具或通过 CLI 构建 Wix Headless 站点；机器上已有的 CLI 会话使其运行成为 CLI 路由，其中 `install/setup.mjs` 运行 `create`，然后 `build` 再 `release` 使站点上线。

在没有 MCP 的情况下，每个工具都是对同一后端的普通 HTTP 调用。`wix-docs` 覆盖这些内容，附带请求正文，作为其 `curl` 通道：

| 工具 | 没有 MCP 时 |
|---|---|
| `SearchWixRESTDocumentation`、`SearchWixSDKDocumentation`、`SearchWixHeadlessDocumentation`、`SearchWixCLIDocumentation`、`SearchWixWDSDocumentation`、`SearchBuildAppsDocumentation`、`SearchDevelopmentDocumentation` | `POST https://www.wixapis.com/mcp-docs-search/v1/docs/search`（或 `/search/markdown`），带 `search_term` 和该语料的 `document_type`。 |
| `BrowseWixRESTDocsMenu` | `POST https://www.wixapis.com/mcp-docs-search/v1/docs/menu/browse`。 |
| `ReadFullDocsArticle` | 向任何 `https://dev.wix.com/docs/...` URL 追加 `.md`；技能的文件为 `https://www.wix.com/skills/<skill>/<path>`。 |
| `SearchWixAPISpec`、`ReadFullDocsMethodSchema` | `POST https://mcp.wix.com/api/code-mode/search`，带相同的 JavaScript。 |
| `ExecuteWixAPI` | REST 调用本身，发往 `https://www.wixapis.com`，带一个令牌：方法采用哪种身份以及如何铸造令牌见 `wix-docs/references/CALLING.md`。 |
| `StartDeployWebsite`、`StartHeadlessBuild`、`UploadHeadlessWebsiteFiles` | 从 shell 执行 `create`、`build` 和 `release`；`wix-manage` 配方 `references/sites/upload-static-site.md` 通过 REST 创建站点并 drop 文件。 |

## 技能

每个技能都是一个文件夹，根目录有一个 `SKILL.md`，说明它做什么以及在何时读取它的哪些文件。技能可能已经在磁盘上、在插件的文件夹中，或在 `npx skills add wix/skills` 之后的 `.agents/skills/<skill>/` 下，或由客户端的技能工具提供；从那里读取它。否则每个文件都在线于 `https://www.wix.com/skills/<skill>/<path>`，用 `ReadFullDocsArticle` 或 `curl` 读取；`https://www.wix.com/skills/<skill>/`（带尾斜杠）列出该技能的文件。下面的路径位于技能的文件夹内。

### wix-headless-kit

在线：https://www.wix.com/skills/wix-headless-kit/SKILL.md。磁盘上：插件的 `skills/wix-headless-kit/`，或 `.agents/skills/wix-headless-kit/`。

在随附、经过验证的 `@wix/sdk` 代码上构建 Wix Headless 站点：每个 Wix 业务解决方案一个带类型的数据层、hooks、组件、Astro 页面和一个种子脚本，来自 `wix-headless-templates`。智能体在这些 hooks 上设计呈现并发布到 Wix 托管。从 shell 以 CLI 流程运行，或通过 MCP 以 Wix API 调用运行。

**冷启动**，`wix-headless-cold-start/headless-kit.md`（https://www.wix.com/skills/headless-cold-start/headless-kit.md，即 `StartHeadlessBuild` 返回的内容），将冷环境带到 wix-headless-kit 可运行的位置，然后交给其 `SKILL.md`。它衡量三个事实：工具列表中是否有 Wix MCP 的工具；Node 24.18 或更高版本且 `npm` 能访问注册表；一种将构建送达 `UploadHeadlessWebsiteFiles` 的方式，作为附件或通过 `curl` 到其上传 URL。这些事实选择路由：三者齐备，插件路由（通过 `ExecuteWixAPI` 创建站点、在此进行 Astro 构建、通过上传工具发布）；有 MCP 但无法发布构建，API 调用指南（`guides/api-run.md`，静态页面放在上传工具的 `files` 中）；机器上有 Wix CLI 会话，CLI 路由。项目文件夹优先创建，任何移交的文件都解压到其中。磁盘上的技能直接在其所在位置使用；否则运行 `CI=1 npx skills@latest add wix/skills --skill wix-headless-kit --skill wix-docs --skill wix-manage --yes`，然后为模板运行 `node .agents/skills/wix-headless-kit/install/templates.mjs`，并在 CLI 路由上运行 `install/bootstrap.mjs`。

- `SKILL.md`：一次构建的步骤和业务解决方案表。
- `guides/api-run.md`：通过 MCP 以 Wix API 调用进行的完整运行，用于封闭沙箱——其中 kit 无法运行，因为 `npm` 无法访问注册表。冷启动将智能体发送到这里。
- `guides/capabilities.md`：哪个 Wix 产品拥有哪个功能，以及为其随附的内容。
- `guides/existing-site.md`：为一个已有内容的 Wix 站点构建新前端，以及继续在较早会话中构建的站点。
- `guides/migration.md`：在其仪表盘中“Go Headless”之后迁移到代码的站点。
- `guides/reference-mode.md`：无法运行随附 React 代码的技术栈。
- `guides/feedback.md`：发送用户对使用 Wix 构建的反馈。
- `install/`：一次运行的脚本（`setup.mjs`、`attach.mjs`、`deploy.mjs`、`install.mjs`、`templates.mjs`、`context.mjs`、`bootstrap.mjs`、`check.mjs`）以及 `pins.json`（固定的 CLI 和模板版本）。

### wix-headless-templates

在线：https://www.wix.com/skills/wix-headless-templates/SKILL.md。磁盘上：插件的 `skills/wix-headless-templates/`，或 `.agents/skills/wix-headless-templates/`。

wix-headless-kit 构建所依据的代码，每个业务解决方案一个文件夹：`storefront`、`bookings`、`rentals`、`blog`、`cms`、`forms`、`members`、`events`、`restaurants`、`donations`、`pricing-plans`、`portfolio`、`faq`，外加 `blank` 和 `shared`。每个文件夹包含：

- `INSTRUCTIONS.md`：操作手册，附带契约。
- `app/`：基于 `@wix/sdk` 的带类型的、与框架无关的数据层、React hooks 和参考组件。
- `app-astro/`：带所有者可编辑 SEO 的 Astro 页面。
- `rest/`：作为普通 REST 调用的同一数据层，用于没有打包器的站点。
- `seed/`：从计划填充站点的种子脚本，`SEED.md` 作为计划的契约，以及一个读取站点已有内容的读取器。
- `project/`：组合进 CLI 的 Astro 脚手架中的解决方案。

根目录的 `compose.mjs` 将解决方案的各层组合进一个项目。

### wix-manage

在线：https://www.wix.com/skills/wix-manage/SKILL.md。磁盘上：插件的 `skills/wix-manage/`，或 `.agents/skills/wix-manage/`。

用于配置和管理站点业务解决方案的 REST 配方，每个任务一个配方，含确切的端点、请求正文和步骤顺序。`SKILL.md` 是按区域列出的每个配方的索引，每个都是一个链接。配方位于 `references/<area>/` 下：`app-installation`、`stores`、`ecommerce`、`bookings`、`calendar`、`donations`、`get-paid`、`pricing-plans`、`restaurants`、`events`、`blog`、`cms`、`rich-content`、`forms`、`contacts`、`automations`、`marketing`、`google-ads`、`google-business-profile`、`analytics`、`seo`、`media`、`sites`、`domains`、`site-properties`、`collaborators`、`custom-apps`、`dashboard-navigation`、`accessibility`。每个配方也是其 API 部分下的文档文章。

### wix-docs

在线：https://www.wix.com/skills/wix-docs/SKILL.md。磁盘上：插件的 `skills/wix-docs/`，或 `.agents/skills/wix-docs/`。

在编写 Wix 代码之前查找 Wix API 和 SDK 文档，以确认端点、方法、请求和响应形态、字段、枚举或错误。`SKILL.md` 有两个通道，普通 `curl` 和 MCP 的文档工具，附有搜索、浏览和读取请求。`references/API_SPEC_SEARCH.md`：规范索引及其查询。`references/CALLING.md`：调用以何种身份运行以及每个令牌如何铸造。`references/EXTRACTING.md`：用 `curl` 和 `grep` 仅读取大型菜单或方法页面所需的部分。

### wix-readme

本索引。
