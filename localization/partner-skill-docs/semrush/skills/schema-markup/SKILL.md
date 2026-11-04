---
name: schema-markup
description: 审计一个页面实际声明的结构化数据，判断哪些实体应归属于该页面，并仅依据已核实的事实起草经过验证的 JSON-LD，把 Schema.org 有效性同 Google 富结果资格区分开。当用户询问 schema 标记、结构化数据、JSON-LD，或某页面是否有资格获得富结果时使用。
---

# Schema 标记

审计一个页面实际声明了什么，判断哪些实体归属于那里，并仅依据已核实的事实产出经过验证的 JSON-LD。绝不承诺排名、富结果、CTR 提升或 AI 引用。

## 规则来源

使用这些标签来解读材料性规则：

- **Semrush 支持的指引：** 引用的 Semrush 文章中所陈述的方法论。保留其场景和注意事项。
- **当前平台要求：** 当前 Google Search Central 或 Schema.org 的要求。这优先于过时的编辑性示例。
- **行业实施经验法则：** 一种站得住脚的实现实践，而不是搜索引擎要求或保证的结果。
- **可配置默认值：** 可随用户的系统和需求而变化的工作流或输出选择。

把证据来源与规则分类分开。Semrush MCP 数据、渲染页面证据、验证器输出、用户提供的事实和模型判断，在每一个结果中都必须保持可区分。

## 不可协商的护栏

- **Semrush 支持的指引：** 把 schema 当作机器可读的上下文和可能的富结果资格，而不是直接的排名因素。说明有效的标记并不保证富结果。
- **Semrush 支持的指引：** 把 AI 可见性影响视为不确定。不要声称 schema 会直接提升在 ChatGPT、Claude、Gemini 或其他 AI 系统中的可见性。
- **当前平台要求：** 要求标记与可见的页面内容和当前事实相符。当编辑性示例过时时，使用当前 Google Search Central 的要求和 Schema.org 词汇表。
- **当前平台要求：** 绝不编造评分、评论数、价格、可用性、日期、作者、地址、logo 或其他实体事实。
- **工作流安全规则：** 除非用户另行授权实施，绝不编辑或部署生产代码。

## 开始之前

一次性收集这些输入：

- **目标：** 确切的 URL、提供的标记，或一个带有既有 Semrush 项目的域名。
- **模式：** 审计、建议、起草、验证，或监控。
- **页面用途：** 首页、文章、产品、评论、视频、本地商家，或其他明确识别的类型。
- **证据访问：** 渲染后的浏览器、原始 HTML、Google 验证输出、Semrush MCP、Site Audit 导出，或用户提供的事实。
- **实施上下文：** 只有当用户想要放置指引时才需要 CMS 或框架。

如果页面类型或事实性实体数据不清楚，先做审计。不要从猜测中生成可部署的代码。

## 使用官方 Semrush MCP

遵循 发现 → schema → 执行。不要把产品 UI 的名称替换成公开 MCP 的报告标识符。

### 由项目支撑的 Site Audit 流程

1. 调用 `projects` 发现 `list_projects`。
2. 为 `list_projects` 调用 `get_report_schema`，然后 `execute_report` 找出该域名的既有项目。
3. 调用 `site_audit` 确认当前暴露的报告。
4. 获取当前 `snapshots` schema，用其必需参数（当前是 `id`，不是 `project_id`）传入项目标识符，然后选择最新的已完成审计并记录其日期。
5. 用 `meta_issues` 发现问题目录及其 ID 和描述。把这当作问题定义的元数据，而不是任何所列问题已在所选快照中发生的证据。
6. 只选择那些返回描述与标记或结构化数据有关的问题。
7. 获取当前 `issue_details` 的 schema，然后用其必需的项目、快照和问题参数配以一个小的结果上限来检索受影响的 URL。除非已发现的 schema 和执行都接受，否则不要发送可选的 `sort` 值；如果执行拒绝了可选排序，就省略它，而不是更改证据请求。
8. 对一个确切的被抓取 URL，用 `page_list` 获取候选页面 ID。规范化所请求和返回的 URL，选择确切匹配，不要假定第一个结果就是确切匹配，因为该报告可能返回前缀或近似匹配。然后用 `page_info` 获取页面级证据。

已核实的公开 MCP 不暴露名为 `markup` 的报告，也不暴露产品 UI 的 Markup 主题报告。绝不承诺该报告、某个标记评分或硬编码的问题 ID。

### MCP 约束

- Projects 访问是只读的。不要承诺项目创建、设置更改或新的抓取。
- 报告调用会消耗 API 单位。只请求所需的字段和行，然后在必要时扩展。
- 用 Site Audit 快照日期和抓取覆盖范围标注发现。
- 把 `issue_details` 行当作出现项证据。空结果意味着对该项目、快照和问题请求没有返回匹配行；它并不证明渲染页面有效或没有一切 schema 问题。
- 项目、campaign、快照、问题类型、字段、订阅或 API 单位余额缺失，是一种访问限制，而不是该站点没有 schema 问题的证据。

## 证据阶梯

**可配置默认值：** 按以下顺序使用可用的最强证据并加以标注。当用户提供了更具权威性的第一方或平台证据时，改变这个顺序。

1. 既有 Semrush 项目和已完成的 Site Audit 快照。
2. 用户提供的 Site Audit 或结构化数据导出。
3. 浏览器渲染后的 DOM 检查。
4. Google Rich Results Test 或提供的验证器输出。
5. 原始 HTML 检查。
6. 用户提供的 schema 代码和已核实的页面事实。

原始 HTML 可能漏掉页面加载后注入的 JSON-LD。当 JavaScript 注入可能时，不要仅凭一次静态抓取就报告"未找到 schema"。

## 支持的 v1 schema 类型

**可配置的产品范围：** 以下类型定义了首个版本；它们并不是声称其他 Schema.org 类型不重要。

在生成代码之前重新核对当前 Google Search Central 文档，因为资格条件和属性要求会变化。

### 共享选择规则

- **Semrush 支持的指引：** 描述页面主要的可见实体，而不是页面所针对的关键词，并优先选择准确契合该实体的、最具体的有效类型。
- **当前平台要求：** 只有当属性值可见或经用户确认时才包含属性。不要仅仅为了满足验证器而添加评分、报价、作者、地址或媒体。
- **行业实施经验法则：** 复用稳定的 `@id` 值，以一致的方式在全站连接相同的实体。

### Organization

用于规范首页或定义组织的页面。核实 `name`、规范的 `url`、可抓取的 `logo`、稳定的 `@id` 和真实的 `sameAs` 资料页。让身份与发布者、售卖者或提供者引用保持一致。不要承诺知识面板（Knowledge Panel）。

来源：[Organization Schema](https://www.semrush.com/blog/schema-markup-for-company-corporations/)

### Article 和 BlogPosting

用于可见的编辑性内容。核实 `headline`、规范 URL 或 `@id`、有代表性的 `image`、真实的 `datePublished` 和 `dateModified`、已识别的 `author`，以及链接到站点 Organization 实体的 `publisher`。不要仅仅为了显得新鲜而更改日期，也不要编造作者资质。

来源：[Schema Markup](https://www.semrush.com/blog/schema-markup/)

### Product 和 merchant listing

用于某个具体的可购买产品。核实 `name`、图片、描述、产品标识符，以及可见的 `offers` 数据，如价格、货币、可用性、URL 和售卖者。只有当真实评论可见时才添加评分或评论。使用当前 Google 文档来区分产品摘要资格与商家列表要求。

来源：[Schema Markup](https://www.semrush.com/blog/schema-markup/) 和 [Rich Snippets](https://www.semrush.com/blog/rich-snippets/)

### Review 和 AggregateRating

只有当评论或聚合评分可见、且被评论的项目毫无歧义时才使用。核实 `itemReviewed`、作者、被呈现的评论正文、评分值和量表、真实的评分或评论计数，以及可见日期。查阅当前 Google 政策以了解支持的项目类型和自利性评论的限制。

来源：[Review Schema](https://www.semrush.com/blog/review-schema/)

### VideoObject

当视频是页面主要的、可观看的一部分时使用。核实 `name`、描述、可抓取的 `thumbnailUrl`、真实的 `uploadDate`、`contentUrl` 或 `embedUrl`，以及已知时的时长。只有当页面和视频支持时才添加片段或直播属性。

来源：[Video Schema](https://www.semrush.com/blog/video-schema/)

### LocalBusiness

用于某个实体的营业地点。优先选择最具体的准确子类型。核实名称、规范 URL、地址、公开电话、营业时间、已知时的坐标、相关影像，以及每个不同地点一个稳定的 `@id`。不要合并地址、营业时间或电话号码不同的地点。

本次审阅的英文资料库没有专门的当前 LocalBusiness 文章。发布前用规范的 Semrush schema 指南和当前 Google 文档核对本模块。

来源：[Schema Markup](https://www.semrush.com/blog/schema-markup/)

### 其他检测到的类型

在通用层面审计其他类型：语法、词汇、可见内容一致性、身份和重复。在生成代码之前，回顾当前 Schema.org 定义以及相应的 Google 功能文档（如果有）。

不要把 FAQPage 或 HowTo 生成列为 v1 的优先项。它们在 Google 搜索特性中的待遇已经改变，而本次审阅的英文 Semrush 资料库并未提供强有力的当前基础来把它们做成旗舰模块。

## 工作流

**行业工作流经验法则：** 用这个顺序让检测、类型选择、实现审查、起草和验证保持分离。当所选模式只需要工作流的一部分时，对它加以调整。

### 1. 清点既有标记

- 检查渲染后的 `script[type="application/ld+json"]` 块。
- 检查存在的 Microdata 和 RDFa。
- 解析 JSON-LD 对象、数组和 `@graph` 节点；报告解析失败，而不要悄悄修复证据。
- 记录每个实体的 `@type`、`@id`、关键属性、来源 URL 和提取方法。
- 识别重复的 ID、相互冲突的属性、断开的实体和过时的值。

把页面证据与 Semrush 抓取证据分开。一个 Site Audit 问题可以识别受影响的 URL，但它不能取代对最终渲染标记的检查。

### 2. 判断 schema 契合度

- 识别页面的主要实体和面向用户的用途。
- 只选择描述可见内容的 schema 类型。
- 把 Schema.org 有效性同某个 Google 搜索特性的资格区分开。
- 解释每个所提议的类型为何适用或不适用。
- 在生成上述类型之一之前，使用上面的受支持 v1 指引。

在可能时诊断其他检测到的类型，但在生成受支持范围之外的特定类型代码之前，回顾当前 Google 和 Schema.org 文档。

### 3. 审计实现质量

检查：

- JSON 语法和有效的 Schema.org 术语。
- 相关 Google 特性当前要求的和推荐的属性。
- 与可见的名称、价格、货币、可用性、评分、评论计数、日期、作者、logo、地址和媒体一致。
- 规范 URL、绝对资源 URL，以及稳定的 `@id` 值。
- 正确的实体嵌套和关系。
- 重复的、矛盾的、误导性的、隐藏的或过时的属性。
- 标记是否可抓取，且是否存在于渲染后的 DOM 中。

**行业实施经验法则：** 按技术有效性、政策风险、页面重要性和可能的搜索呈现影响来排优先级。不要编造普遍的打分区间。

### 4. 起草或修正 JSON-LD

- **当前平台推荐的：** 当站点的设置允许时，为新代码优先使用 JSON-LD。Google 也支持有效的 Microdata 和 RDFa。
- 只依据可见或经用户确认的事实生成。
- 在修正既有标记时，保留有效的标识符。
- 当多个实体需要明确的关系时，使用一个连贯的 `@graph`。
- 使用稳定的绝对 `@id` 值，通常是规范的 URL 片段，如 `#organization` 或 `#article`。
- 只包含相关的属性。更多标记并不自动更好。
- 如果缺少必需的事实，返回一份缺失信息清单，而不是可部署的代码。
- 如果模板仍然有用，清晰地标记每个占位符，并把这个块标注为不可部署。

### 5. 验证

**行业工作流经验法则：** 按这个顺序验证：

1. 解析 JSON-LD。
2. 对照 Schema.org 确认所有术语。
3. 把每一个事实性属性与可见页面内容比较。
4. 对 Google 支持的特性运行 Google Rich Results Test。
5. 实施后重新检查渲染页面。

不要把 Schema.org 有效的结果当作 Google 富结果资格的证明。不要把验证器警告当作错误，除非已检查过其含义。

### 6. 交接

提供适合用户 CMS 或框架的放置指引，但不要部署。当用户正在协调实施时，点明验证步骤和重测动作。

## 输出契约

**可配置默认值：** 只返回所选模式需要的章节：

1. **执行结论：** 通过、需要改进，或证据不足。
2. **使用的证据：** Semrush 快照、渲染页面、原始 HTML、验证器、提供的代码，以及用户事实。
3. **标记清单：** 实体、类型、关键属性、提取方法和来源 URL。
4. **问题表：** 优先级、问题、受影响的属性或 URL、证据、后果和修复。
5. **建议的 schema 映射：** 页面类型 → schema 类型 → 理由。
6. **修正后的 JSON-LD：** 只有当存在足够已核实的事实时。
7. **验证清单：** 语法、词汇、内容一致性、Google 资格，以及渲染确认。
8. **实施说明：** 放置位置、未解决的局限和重测动作。

让这些证据类别清晰分开：

- **Semrush MCP：** 项目和 Site Audit 快照数据。
- **页面证据：** 渲染后或原始的页面内容。
- **验证器证据：** Google 或 Schema.org 的验证输出。
- **用户提供的事实：** 直接提供的业务或实体信息。
- **模型判断：** 类型选择、优先级排序和建议的关系。

## 来源

Semrush 方法论：

- [Schema Markup](https://www.semrush.com/blog/schema-markup/)
- [Video Schema](https://www.semrush.com/blog/video-schema/)
- [Rich Snippets](https://www.semrush.com/blog/rich-snippets/)
- [Review Schema](https://www.semrush.com/blog/review-schema/)
- [Organization Schema](https://www.semrush.com/blog/schema-markup-for-company-corporations/)

技术真相来源：

- [Google: Introduction to structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Google: General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org vocabulary](https://schema.org/docs/schemas.html)
