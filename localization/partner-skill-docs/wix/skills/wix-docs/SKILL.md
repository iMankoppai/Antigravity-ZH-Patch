---
name: wix-docs
description: "在编写 Wix 代码之前查阅 Wix API/SDK 文档，以确认确切的端点、HTTP 方法、请求/响应形态、字段、枚举或错误——绝不从记忆中猜测 Wix API。一次查询是一个短流程：找到正确的页面，然后阅读它。两种方式：(1) 纯 `curl`（零依赖）——通过**语义搜索**（`POST /mcp-docs-search/v1/docs/search`，自然语言 `{ search_term, document_type(s) }`，含用于多步工作流的 SKILLS 配方语料）**或通过浏览**文档门户作为菜单——对 REST、SDK、CLI、Build Apps 和 Headless 门户进行结构化、带类型、带计数的浏览（`POST /mcp-docs-search/v1/docs/menu/browse`），或从 `llms.txt` 根获取任何界面的 `.md` 菜单树——然后通过在其 URL 后追加 `.md` 来阅读页面；(2) 在存在时使用 Wix MCP 文档工具。触发词：查阅 Wix API、查找 Wix 端点/方法、确认 Wix 请求正文或字段、验证 Wix API 形态、探索 Wix 文档、我该调用哪个 Wix API、读取 Wix 方法架构。"
---

# Wix Docs —— 查阅 Wix API/SDK 文档

获取关于某个 Wix API 的**确切**真相——端点、HTTP 方法、请求/响应正文、字段、枚举或错误。
**绝不从记忆中臆造 Wix 端点、路径、正文或枚举**——先在这里确认。这包括本技能中的示例端点：
它们仅用于说明机制，会像任何快照一样过时——在你依赖某个端点之前，先发现真正的契约。

一次查询是一个短流程：**找到正确的页面，然后阅读它。** 用 `curl`（默认，如下）或用你的
智能体拥有的 Wix MCP 文档工具（通道 2）来完成。无论哪种方式，都按你已经知道的内容来路由：

- **你有文档 URL** → 直接阅读它（§2）。不要为已经能命名的页面重新搜索。
- **一个多步工作流**（“将预订从服务设置进行到支付”）→ 在搜索中包含**配方**语料：
  `document_types: ["SKILLS", …]` 与步骤所在的 API 语料并列（§1A）。配方承载步骤顺序、
  跨步骤的坑，以及那个一举完成整个工作的随附端点——这些是任何单个方法页面都不会陈述的。
  没有返回相关配方 → 从同一结果集中已验证的各方法契约组装工作流。
- **一个特定的操作、字段或枚举** → 搜索其 API 语料（`REST` / `SDK`），然后阅读或对落到的内容
  做架构检查。

## 通道 1 —— `curl`（默认）

文档是一棵 markdown 页面树：**向任何 `https://dev.wix.com/docs/…` URL 追加 `.md`** 即可将该页面
作为 markdown 获取。无 SDK，无 MCP。

### 1. 找到页面——搜索、浏览或查询索引

到达正确页面的三种方式——使用合适的任意一种。

**A. 语义搜索。** 用自然语言（“让客户预约一个时间段”）描述你想要什么，而不只是关键字；命中会按
相关性排名返回。两个变体使用相同的 `POST` 正文：`search_term`（必需，1–500），`document_type`
（单个语料）或 `document_types`（数组——一次排序调用中的多个语料）**之一**；`maximum_results`
（1–20，默认 15，在合并结果集中计数），`lines_in_each_result`（0–200，默认 20；`0` = 每个命中
无行数上限）。语料：`REST`（默认）· `SDK` · `SKILLS` · `WIX_HEADLESS` · `BUSINESS_SOLUTIONS` ·
`VELO` · `WDS` · `BUILD_APPS` · `CLI` · `OVERVIEW`。`SKILLS` 是专门的**配方语料**——单 API 搜索
不会返回的多步工作流页面；`OVERVIEW` 是平台定位（用哪种开发方式、哪个 API 族）。

**在一次调用中搜索问题实际跨越的语料。** 服务会将它们一起排序并交错命中，因此它们按相关性竞争，
而不是由你猜测先试哪个——一次往返取代多次。没有固定组合：按问题选择。同时传入 `document_type`
和 `document_types` 是错误（*"Pass either document_type or document_types, not both"*），未知的
语料名称会被拒绝并给出有效列表。

两个变体——按你正在做的事情选择：

**`/docs/search/markdown` → 阅读它（从这里开始）。** 返回 JSON，单个 `content` 字段承载一个
LLM 就绪的 markdown 字符串（用 `jq -r '.content'` 提取），其中每个命中是一个**精简方法文档**：
API **端点**、**真实请求代码示例**、**响应形态**以及**方法描述**（含其坑）。命中是**预览，不是
完整页面**：精简格式每个章节有固定上限，因此提高 `lines_in_each_result` 不会扩展每个章节，而
`0` 只移除每个命中的行数上限——它绝不重现整个源页面。在基于某个命中构建之前，检查是否足够：
你是否有必需的输入、适用于你情况的条​​件，以及你需要的 REST 契约或 SDK 签名？如果有，继续——
无需额外获取。如果没有，进行一次**有针对性的后续操作**：阅读方法页面（§2）或拉取其架构（§C）。

```bash
curl -sS -X POST 'https://www.wixapis.com/mcp-docs-search/v1/docs/search/markdown' \
  -H 'Content-Type: application/json' \
  --data-raw '{"search_term":"create a booking","document_type":"REST","maximum_results":3}' \
  | jq -r '.content'      # no jq? → python3 -c 'import sys,json;print(json.load(sys.stdin)["content"])'
```

一个同时跨越工作流及其各个调用的问题会同时要求两个语料——配方和各方法契约在一次排序列表中到达：

```bash
curl -sS -X POST 'https://www.wixapis.com/mcp-docs-search/v1/docs/search/markdown' \
  -H 'Content-Type: application/json' \
  --data-raw '{"search_term":"end to end booking flow","document_types":["SKILLS","REST"],"maximum_results":6}' \
  | jq -r '.content'
```

**`/docs/search`（JSON）→ 据此路由。** 返回 `{ results: [ { title, url, content, relevance_score, kb_name, … } ] }`——结构化命中。当你想要**以编程方式选择/路由**时使用它：抓取命中的
`url` 以阅读该页面（§2）或将其送入架构查询（§C）。

**`kb_name` 告诉你每个命中是什么**——每个命中都携带一个，其种类决定你能用它做什么：只有方法
页面才有可拉取的架构（§C）；文章或配方作为散文阅读（§2）。

请求无法为你做这种区分。**一个语料混合了多种种类**——搜索 API 参考会返回方法页面*以及*它们周围的
散文——而且没有语料会只返回方法页面。因此用 `document_types` 选择语料，然后在输出时用 `kb_name`
区分种类。不要采取以下两种替代做法：不要从 `url` 的存在推断种类（每个命中都有，包括文章和配方），
也不要从你所请求的语料推断它。

大多数值会命名其种类（方法页面为 `…_METHODS_…`，散文为 `…_DOCS_…`，配方为 `SKILLS_KB_ID`）
但并非全部如此——SDK 的方法索引是 `API_REFERENCE_SDK_KB_ID`。因此列出你的搜索实际返回的标签，
然后据此操作，而不是对名称做模式匹配或硬编码 id 列表。

```bash
# see what came back — label, title, url
curl -sS -X POST 'https://www.wixapis.com/mcp-docs-search/v1/docs/search' \
  -H 'Content-Type: application/json' \
  --data-raw '{"search_term":"end to end booking flow","document_types":["REST","SKILLS","WIX_HEADLESS"],"maximum_results":10}' \
  | jq -r '.results[] | "\(.kb_name)\t\(.title)\t\(.url)"'
# no jq? → python3 -c 'import sys,json;[print(r.get("kb_name"),r["title"],r.get("url")) for r in json.load(sys.stdin)["results"]]'

# then take the kind you need, by the label you just saw
… | jq -r '.results[] | select(.kb_name == "REST_METHODS_KB_ID") | "\(.title)\t\(.url)"'
```

**B. 将文档树作为菜单浏览。** 两种方式：为受支持门户使用**结构化浏览端点**（在那里首选——带类型、
带计数、可筛选），以及为任何界面和阅读页面使用 **`.md` 菜单树**。

**B1. 结构化浏览——受支持的门户。** `POST /mcp-docs-search/v1/docs/menu/browse` 遍历门户的树，
返回每个子节点及其**种类**、**HTTP 动词**（对方法而言）和**子树计数**（“Catalog V3 — 121 methods,
32 articles”），因此你按形态选择正确的区域——约 2 KB，而不是一个需要 `grep` 的约 40 KB 菜单页面。
`include`、`name_filter` 和 `depth` 直接跳到你要的内容。

门户（`document_type`）：`REST`（默认——`api-reference` 门户）· `FRONTEND_SDK`（`sdk`）·
`CLI`（`wix-cli`）· `BUILD_APPS`（`build-apps`）· `WIX_HEADLESS`（`go-headless`）。**仅在浏览中**，
`SDK` 是 `REST` 的别名（API 参考在每个页面都记录两个视图）——它**不会**选择 `FRONTEND_SDK`，
且该别名不适用于语义搜索。要发现门户的区域，省略 `menu_url`——你会得到门户根；将受支持门户的
URL 作为 `menu_url` 传入也会为你推断门户。

正文：`menu_url?`（绝对文档 URL；门户根可省略）、`document_type?`、`depth?`（1，最大 6）、
`include?`（`CATEGORY`·`RESOURCE`·`METHOD`·`ARTICLE`·`WEBHOOK`·`OBJECT`·`SKILL`）、`deprecated?`
（`HIDE` 默认·`SHOW`·`ONLY`）、`name_filter?`、`max_nodes?`、`format?`（`MARKDOWN` 默认 →
`content` 字符串；`STRUCTURED` → 带 `url`/`http_method`/`resource_id`/`child_counts` 的 JSON 树，
外加 `counts_by_type`、`truncated`、`deprecated_counts_by_type`）。

两个响应信号要据此行动，而非忽视：

- **`truncated: true`** ——节点上限截断了列表。收窄范围而不是重读：浏览更深的 `menu_url`，收紧
  `include`/`name_filter`，或降低 `depth`。
- **弃用过滤** ——弃用条目**默认隐藏**；`deprecated_counts_by_type` 报告被过滤掉多少。浏览中缺失
  的 API 可能已弃用，而非不存在——用 `deprecated: "SHOW"`（或 `"ONLY"`）重新浏览以检查它，
  并在有记载时遵循其替换指针。

```bash
# a vertical's structure, with per-child subtree counts
curl -sS -X POST 'https://www.wixapis.com/mcp-docs-search/v1/docs/menu/browse' \
  -H 'Content-Type: application/json' \
  --data-raw '{"menu_url":"https://dev.wix.com/docs/api-reference/business-solutions/stores"}' \
  | jq -r '.content'

# jump straight to a method by name — no multi-level grep
curl -sS -X POST 'https://www.wixapis.com/mcp-docs-search/v1/docs/menu/browse' \
  -H 'Content-Type: application/json' \
  --data-raw '{"menu_url":"https://dev.wix.com/docs/api-reference/business-solutions/bookings","include":["METHOD"],"name_filter":"cancel","depth":4}' \
  | jq -r '.content'

# a non-REST portal: the CLI docs, from the portal root
curl -sS -X POST 'https://www.wixapis.com/mcp-docs-search/v1/docs/menu/browse' \
  -H 'Content-Type: application/json' \
  --data-raw '{"document_type":"CLI","depth":2}' | jq -r '.content'
```

仅浏览：它交给你页面 **URL**——通过追加 `.md` 阅读它（§2），并从 §C 获取确切的架构。

**B2. `.md` 菜单树——任何界面，以及你阅读页面的方式。** 每个文档路径都有一个 `.md` 孪生，
因此你可以零依赖地导航任何界面；对结构化浏览不覆盖的界面（例如 Velo）以及阅读叶子节点使用它。
`curl https://dev.wix.com/docs/llms.txt` 是顶层地图；其下的门户：

| 门户 | 从这里开始查询 |
|---|---|
| [`api-reference.md`](https://dev.wix.com/docs/api-reference.md) | **所有后端 / 业务解决方案 API——主门户。** 每个页面记录其 REST **和** SDK 用法（SDK 视图用 `.md?apiView=SDK`）。 |
| [`sdk.md`](https://dev.wix.com/docs/sdk.md) | **API 参考中没有的仅 SDK 界面：** 客户端设置（`createClient`、`OAuthStrategy`）、核心模块（`@wix/sdk`、`@wix/essentials`）、宿主模块（`dashboard`/`editor`/`site`）以及前端模块（`members`、`pay`、`seo`、`storage`、`pricing-plans` 等）。 |
| [`go-headless.md`](https://dev.wix.com/docs/go-headless.md) | 无头设置、认证、托管、框架集成。 |
| [`build-apps.md`](https://dev.wix.com/docs/build-apps.md) | 构建 Wix 应用 / 扩展。 |
| [`wix-cli.md`](https://dev.wix.com/docs/wix-cli.md) · [`velo.md`](https://dev.wix.com/docs/velo.md) | Wix CLI 命令；Velo 站点编码 API。 |

**像菜单一样深入**——向任何路径追加 `.md`（*章节* → 子链接菜单，*叶子* → 内容/方法页面）；
截断以向上，扩展以向下。**也要阅读同级的介绍 / “About …” / 流程文章**，而不只是方法页面。
示例——深入到 create-booking 方法，为下一个链接 grep 每个菜单：

```bash
curl -sS https://dev.wix.com/docs/api-reference/business-solutions.md            | grep -i bookings   # → .../bookings.md
curl -sS https://dev.wix.com/docs/api-reference/business-solutions/bookings.md   | grep -iE 'bookings|flow'  # → resource/flow pages
curl -sS https://dev.wix.com/docs/api-reference/business-solutions/bookings/bookings.md | grep -i create      # → the create method leaf
curl -sS https://dev.wix.com/docs/api-reference/business-solutions/bookings/bookings/bookings-writer-v2/create-booking.md  # read it
```

API 参考门户的二级地图（所有垂直领域，向下一个层级）位于 `references/EXTRACTING.md`。

**C. 查询 API 索引——一次调用，结构化。** `code-mode` 搜索端点在一个 JS 函数上运行 `lightIndex`
（整个 REST API 规范：每个资源 + 方法，带 `operationId`、`httpMethod`、`menuPath`、`docsUrl`
以及可执行的 `publicUrl`）。最适合当你想要**以编程方式枚举/筛选方法**时——浏览某个垂直领域，
或跨*所有*方法 grep——并一次性拿回 `docsUrl` + `publicUrl`，无需菜单深入：

```bash
# pinpoint a method by keyword across the whole index → its docsUrl + executable publicUrl
curl -sS -X POST 'https://mcp.wix.com/api/code-mode/search' -H 'Content-Type: application/json' \
  --data-raw '{"code":"async function(){ return lightIndex.flatMap(r=>r.methods).filter(m=>/createBooking$/i.test(m.operationId)).map(m=>({op:m.operationId, httpMethod:m.httpMethod, publicUrl:m.publicUrl, docsUrl:m.docsUrl})); }"}'
```

**窄范围筛选并只返回你需要的字段**——索引很大，未筛选的转储会非常庞大。范围：**REST 界面**。
`lightIndex` 索引 REST **方法**；一个同级的 `articles` 索引加上 `getArticleContentByUrl(docsUrl)` /
`getArticleContent(resourceId)` 覆盖 REST 门户的**散文**（介绍、配方、流程页面）。仅 SDK 界面和
其他门户不在这里——对它们使用 A/B，并注意返回的架构是 REST 契约，而非 SDK 签名（同一方法的 SDK
视图位于其文档页面，§2）。更多示例（浏览某个垂直领域、`menuPath` 遍历、资源架构）以及架构/文章
读取器 → **`references/API_SPEC_SEARCH.md`**。

如果 Wix MCP 存在，它将相同的这些能力暴露为原生工具（无需 `curl`/JSON 样板）——通道 2。

### 2. 阅读你落到的内容

向 URL 追加 `.md` 会得到**三种页面之一**。知道你在看哪一种，并相应处理：

- **菜单页面**——一个*章节*路径（来自浏览，§1B）。子链接列表，常有数十 KB——**不要整页读取；
  对它 `grep`** 你想要的子节点，然后深入该页面：

  ```bash
  curl -sS 'https://dev.wix.com/docs/api-reference/business-solutions/bookings.md' | grep -i 'booking'
  ```

- **文章 / 指南**——介绍、概念、示例流程页面。散文 markdown，通常较小——**整页读取**：

  ```bash
  curl -sS 'https://dev.wix.com/docs/api-reference/business-solutions/bookings/bookings/introduction.md'
  ```

- **方法页面**——一个 API 方法，也是沉重的那个：它同时携带 REST 和 JavaScript SDK 部分、完整的
  请求/响应架构以及代码示例——常有 100 KB+。**不要吞下整页**——先绘制它，然后拉取你需要的部分
  （示例通常足以建模一次调用）：

  ```bash
  curl -sS "$URL.md" | grep -nE '^#{1,3} '                                              # 1. map the outline
  curl -sS "$URL.md" | awk '/^## REST API/{r=1} r&&/^### Examples/{f=1} /^## JavaScript SDK/{f=0} f'  # 2. just the REST examples
  curl -sS "$URL.md" | grep -nE 'name: (selectedPaymentOption|totalParticipants)'       # 3. grep specific schema fields
  ```

  更多配方（拆分 REST 与 SDK、解析枚举）→ `references/EXTRACTING.md`。

  对于确切的**结构化**架构和枚举值，不要手工切片 markdown——用 `curl` `POST` 到
  `https://mcp.wix.com/api/code-mode/search` 查询 API 规范（MCP `SearchWixAPISpec` 的免 MCP
  等价物）。`code` 是一个 JS 函数，作用域内有 `lightIndex` 和 `getResourceSchemaByUrl(docsUrl)`；
  只返回你需要的内容。

  `getResourceSchemaByUrl` 限定于你传入的 URL：**方法 URL** 返回一个 `methods` 数组仅含该方法的
  架构——将其作为 `methods[0]` 读取，不要通过比较 `m.docsUrl` 与你输入来选取它（读取器会规范化
  URL）。**资源 URL**（方法 URL 去掉其最后一段）返回**整个资源**——当你需要同级操作或共享资源
  上下文时获取它。

  ```bash
  # find a method by keyword → its docsUrl + executable publicUrl
  curl -sS -X POST 'https://mcp.wix.com/api/code-mode/search' -H 'Content-Type: application/json' \
    --data-raw '{"code":"async function(){ return lightIndex.flatMap(r=>r.methods).filter(m=>/createBooking$/i.test(m.operationId)).map(m=>({op:m.operationId, httpMethod:m.httpMethod, publicUrl:m.publicUrl, docsUrl:m.docsUrl})); }"}'

  # a METHOD URL → that one method's contract (resolve $circular refs via s.components.schemas)
  curl -sS -X POST 'https://mcp.wix.com/api/code-mode/search' -H 'Content-Type: application/json' \
    --data-raw '{"code":"async function(){ const s=await getResourceSchemaByUrl(\"https://dev.wix.com/docs/api-reference/business-solutions/bookings/bookings/bookings-writer-v2/create-booking\"); const m=s.methods[0]; return { publicUrl:m.publicUrl, requestBody:m.requestBody, responses:m.responses }; }"}'
  ```

  信封是 `{ "result": … }` 或 `{ "error": "<message>" }`——**两者都以 HTTP 200 到达**，因此检查
  正文，而非状态。错误文本会指明修复方法：文章 URL → 切换到 `getArticleContentByUrl`；未知 URL
  → 按关键字搜索 `lightIndex`。不要重发完全相同的失败查询——根据错误做出更改，若发现仍然失败，
  报告限制而不是猜测契约。

  完整示例集（资源列表、部分 URL 解析、枚举/嵌套引用展开）→ `references/API_SPEC_SEARCH.md`。

## 通道 2 —— Wix MCP 文档工具（仅当你的智能体拥有它们时）

如果 Wix MCP 已连接，这些是与通道 1 **相同的后端**（文档搜索服务和 API 规范索引）封装为原生工具
——架构已验证、响应大小已处理，无需 `curl`/JSON 样板。是 curl 通道之上的便利，**而非更丰富的数据
源**；在存在时使用它们，不存在时回退到通道 1。可选——如果工具不存在，跳过此通道。

| 工具 | 用于 |
|---|---|
| `SearchWixRESTDocumentation` | 按关键字查找 REST 方法/配方 |
| `SearchWixSDKDocumentation` | 查找 SDK 方法（暴露模块菜单隐藏的运行时函数） |
| `SearchWixAPISpec` → `getResourceSchemaByUrl` | 结构化架构——**方法 URL** 得到该方法契约，**资源 URL** 得到整个资源 |
| `ReadFullDocsArticle` | 完整阅读配方/流程/文章页面 |
| `BrowseWixRESTDocsMenu` | 遍历菜单树深入到方法 |

- **为契约获取方法；为上下文获取资源。** 方法 URL 恰好给出该方法。当某项要求可能位于*同级*方法上
  （例如 `memberId` 在单条创建上必需，但在批量创建页面上省略），改为获取**资源** URL——资源视图
  携带每个方法加上共享对象架构。
- 本技能顶部的**配方优先路由**在此也适用：对于多步工作流，在组装各方法调用之前搜索配方语料
  （许多垂直领域在 `…/business-solutions/<vertical>/skills` 节点下发布配方）。

## `.md` 后缀

仅当直接 `curl` 一个页面时才追加 `.md`。MCP 工具和搜索端点采用**不带** `.md` 的普通文档 URL
——绝不要将 `.md` URL 送入 MCP 工具。

## 从文档到调用

理解契约是本技能的职责；执行它需要一个身份。方法接受哪些身份是你所读内容的一部分——在调用前
检查方法页面的权限和身份说明，并确认你的令牌的站点/账户作用域匹配。令牌铸造（CLI 管理员令牌、
访客令牌）、身份模型以及动态站点上下文报告 → **`references/CALLING.md`**。

## 在你编写代码之前

在页面上——而非从记忆中——确认端点、HTTP 动词、请求正文形态、必填字段以及任何枚举值。然后编写
调用。如果你要扩展某技能随附的客户端，保持技能现有的传输/辅助风格；你是在添加一个调用，而不是
重新架构。
