---
name: technical-seo-audit
description: 用 Semrush Site Audit 数据审计可抓取性、可索引性、HTTPS 与重定向、Core Web Vitals、移动端一致性、元数据、canonical、结构化数据和内部架构，把已确认的缺陷与分析师的判断分开。当用户要求技术 SEO 审计或站点健康检查、询问页面为何未被索引，或站点为何因技术原因正在失去搜索可见性时使用。
---

# 技术 SEO 审计

运行一次模块化的技术 SEO 审计，把已确认的缺陷与产品检查、外部测量和分析师判断分开。一个缺失的元描述和一个关键页面上意外的 `noindex` 并不等同。

## 规则来源

- **Semrush 支持的指引：** 可抓取性、可索引性、站点架构、HTTPS、重定向、移动端一致性、性能、规范化、元数据、结构化数据和渲染内容是核心技术 SEO 关注点。
- **MCP 契约要求：** 由项目支撑的发现来自官方 Semrush MCP 暴露的报告和字段。受测契约是基于问题的；它不暴露具名的产品 UI 主题报告。
- **当前平台标准：** 网站地图限制、Core Web Vitals 阈值、移动优先要求、爬虫控制和结构化数据资格，来自相关的一手平台文档。
- **行业经验法则：** 业务优先级、预期影响和整改顺序是判断，除非有第一方数据支撑。
- **用户可配置默认值：** URL 样本、分页上限和模块深度取决于范围和可用证据。不要使用固定的站点规模或流量截断值。

## 输入

一次性询问：

- 根域名、确切 URL 或 URL 集合；
- 全站、模板或页面级范围；
- 重要的页面类型，以及任何已知的迁移、渲染或索引事故；
- 访问一个既有 Semrush Site Audit 项目的权限；
- 提供的 Search Console、Analytics、CMS、爬虫、性能或服务器日志证据。

不要索取 Semrush API 密钥。官方 MCP 使用 Semrush 认证。

## 官方 Semrush MCP 工作流

1. 调用 `projects`，发现 `list_projects`，获取其 schema，并执行它。
2. 匹配所请求的域名，并确认 `siteaudit` 处于激活状态。
3. 调用 `site_audit`，然后为该项目发现并执行 `snapshots`。
4. 选择最新的已完成快照，并保留其 ID 和完成日期。
5. 执行 `info` 获取抓取状态、已抓取页面数、限制、问题总数、缺陷、重定向、被阻止/损坏计数、标记总数和深度分布。
6. 执行 `meta_issues` 获取当前的问题目录。定义不是当前的出现项。
7. 把 `info.defects` 与 `meta_issues` 关联。只对有当前计数的问题，用项目 ID、快照 ID、问题 ID 和一个受控上限执行 `issue_details`。
8. 对于确切 URL 的调查，用 `page_list` 获取被抓取的页面 ID，然后用 `page_info` 检索该页面的问题行。

Projects 访问是只读的。绝不承诺创建项目、更改抓取设置、连接集成或启动抓取。问题 ID 可能改变；重新发现它们，而不是硬编码一个永久清单。

## 证据与访问护栏

- 告诉用户 Semrush 查询可能消耗 API 单位。先用小的诊断批次，当要求彻底覆盖时分页。
- 说明该抓取配置的覆盖范围。"完整审计"意味着在其设置和限制内完成的抓取，而不是证明每个在线的或已索引的 URL 都被覆盖。
- 空的问题响应是"该问题和快照没有返回出现项"的有效证据。
- 不要把 Semrush 的 Error/Warning/Notice 标签翻译成 Google 处罚或排名保证。
- 把 Semrush 抓取数据、Search Console 证据、性能测量、直接的 HTTP/浏览器观察和模型推断分开。
- Search Console Performance 没有"最后修改"维度。发布和修改日期必须来自 CMS、网站地图、页面元数据，或其他提供的来源。
- `site:` 查询是一种粗略的观察，不是权威的索引计数。

## 回退阶梯

1. 既有 Semrush 项目和已完成的 Site Audit 快照。
2. 用户提供的 Semrush Site Audit 导出。
3. 提供的爬虫导出，加上 Search Console、性能、CMS 或日志数据。
4. 对一组有代表性的 URL 做直接的 HTTP 和渲染浏览器检查。
5. 用户提供的 URL 和证据。

除非所提供的数据集能确立完整覆盖，否则把第 3–5 级标注为抽样。

## 审计模块

先运行可抓取性和可索引性。运行用户范围所需的其他模块，然后合并发现。

### 1. 可抓取性与可索引性

检查：

- 重要 URL 的 HTTP 状态和重定向行为；
- 影响重要页面或资源的 robots.txt 语法和规则；
- XML 网站地图的可用性、解析、规范 URL 格式，以及所列 URL 是否被有意设为可索引；
- robots meta 和 `X-Robots-Tag` 指令；
- canonical 目标和冲突；
- 提供时的 Search Console 索引证据；
- Site Audit 返回的被阻止、未抓取、4xx、5xx、网站地图、canonical 和重复内容问题。

robots.txt 阻止会阻止抓取，但不保证取消索引。缺少 robots.txt 文件并不自动是 SEO 失败。在 robots.txt 中引用网站地图有用，但不是网站地图生效所必需的。

Google 的 XML 网站地图限制是每个文件 50,000 个 URL 或 50 MB（未压缩）。把这些当作平台限制，而不是 Semrush 经验法则。

### 2. HTTP、HTTPS 与重定向

审阅：

- 证书有效性和主机名匹配；
- 一致的偏好 HTTPS/主机版本；
- 内部混合内容链接和资源；
- 4xx/5xx 出现项以及暴露它们的来源 URL；
- 重定向链、循环和可避免的内部重定向跳转；
- 永久与临时重定向意图。

对真正永久的移动使用 301/308，对临时移动使用 302/307。不要声称临时重定向本质上无法传递链接权重。对于一个被有意移除的内容，404 可能是正确的；当导航、业务重要性、反向链接或替代意图证明修复有其合理性时，它就变得可行动了。

### 3. Core Web Vitals 与性能

在可用时使用当前的 Chrome UX Report/PageSpeed 字段数据，并把它与 Lighthouse 实验室数据区分开。按第 75 百分位应用 Google 当前的"良好"、"需要改进"和"差"阈值：

| 指标 |     良好 |  需要改进 |     差 |
| ------ | -------: | -----------------: | -------: |
| LCP    |  ≤ 2.5 s |   > 2.5 s 至 4.0 s |  > 4.0 s |
| INP    | ≤ 200 ms | > 200 ms 至 500 ms | > 500 ms |
| CLS    |    ≤ 0.1 |      > 0.1 至 0.25 |   > 0.25 |

不要仅凭指标就猜测原因。在给出图像、JavaScript、字体、缓存或布局修复之前，使用诊断或实现证据。如果字段数据不可用，把实验室结果标注为合成的、且针对特定页面。

### 4. 移动端一致性与渲染

因为 Google 使用移动优先索引，比较移动端和桌面端在以下方面：

- 主要内容；
- 标题和元描述；
- robots 指令和 canonical 标签；
- 内部链接；
- 图像和 alt 文本；
- 结构化数据；
- 可渲染的资源和依赖交互的内容。

当 JavaScript 提供关键内容或链接时，比较原始 HTML 与渲染后的 DOM。不要仅凭一张桌面截图推断一致性。把视口、被阻止资源、JavaScript/CSS 和移动可用性发现当作要调查的证据，而不是自动的排名处罚。

### 5. 标题、描述、标题和 canonical

使用当前 Site Audit 问题行加上页面级检查。

- **标题标签：** Semrush 推荐简洁、具描述性、与意图一致的标题，约 550 像素或更少——通常 50–60 个字符——同时指出搜索和 AI 系统并不强制最大值。把它当作显示指引，而不是排名保证或自动失败。
- **元描述：** Semrush 当前的编辑性建议是目标为最大约 135 个字符，以降低截断风险。元描述不是直接的排名因素，可能被改写，应基于准确性和有用性而非仅凭长度来判断。
- **H1/标题：** 推荐一个清晰的主标题和一个合乎逻辑的 H1/H2/H3 层级。把一个 H1 当作一项编辑惯例，而不是普遍排名要求。标题和 H1 应在页面用途上保持一致，而不必完全匹配。
- **Canonical：** 核实语法、目标状态、可索引性、主机/协议一致性、重复意图，以及与重定向、网站地图、hreflang 或内部链接的冲突。Canonical 是信号，不是命令。
- **图像：** 要求信息性图像有有用的 alt 文本、装饰性图像有空 alt 文本。不要把每个空 alt 都标记为错误。

重复或长度相关的元数据问题值得审查；它们本身并不证明蚕食、处罚或流量损失。

### 6. 结构化数据

使用 Site Audit 标记计数和当前结构化数据问题出现项作为筛查证据。仅静态 HTML 可能漏掉 JavaScript 注入的标记。

把实体选择、渲染标记检查、JSON-LD 起草和验证委托给 `schema-markup` 技能。在本审计中只保留已确认的问题摘要和优先级。有效的标记并不保证富结果，无效或不匹配的标记也不自动是排名处罚。

### 7. 架构与内部链接

使用抓取深度分布和当前问题，处理孤立页面、损坏的内部链接、重定向、缺失/不具描述性的锚文本、nofollow 内部链接和链接不足的页面。

把详细的整改计划委托给 `internal-link-audit`。Semrush Site Audit 可能标记深于三次点击的 URL，但那个产品检查不是普遍的排名法则。用页面重要性、用户旅程、抓取证据和提供的第一方性能数据来优先处理架构变更——而不是固定的关键词搜索量或流量阈值。

### 8. AI 爬虫访问

阅读当前 robots.txt 规则和主要爬虫文档。

- `OAI-SearchBot` 控制为纳入 ChatGPT 搜索结果而进行的自动抓取。
- `GPTBot` 控制内容是否可被用于训练 OpenAI 的生成式 AI 基础模型。
- `ChatGPT-User` 是由用户发起的，不是搜索纳入的控制项。
- `Google-Extended` 控制指定的 Gemini 训练和 grounding 用途；它不影响 Google 搜索纳入或排名。

对照发布者的目标评估每一个用户代理。不要把阻止训练爬虫标注为技术 SEO 缺陷。对于其他 AI 爬虫，在做出断言之前先核实当前的一手文档。

## 优先级排序

用这个基于证据的顺序排优先级：

1. 已确认的影响重要 URL 的访问、可索引性、安全、重定向循环或服务器故障；
2. 已确认的、具有明确用户或搜索后果的模板级问题；
3. 字段性能问题和移动/渲染一致性问题；
4. 元数据、结构化数据和内部链接改进；
5. 需要验证的抽样或推断发现。

没有用户的第一方基线和明确的模型，不要估算流量、收入、恢复时间或排名影响。

## 输出

从覆盖情况开始：

| 证据类别 | 来源 | 范围 | 快照/日期 | 局限 |
| -------------- | ------ | ----- | ------------- | ----------- |

然后提供一份整改表：

| 优先级 | 模块 | 受影响的 URL 或模式 | 检索到的证据 | 解读 | 操作 | 置信度 |
| -------- | ------ | ----------------------- | ------------------ | -------------- | ------ | ---------- |

对每一行：

- 报告确切返回的值、问题 ID 或观察到的行为；
- 区分已确认的缺陷、Semrush 产品检查、平台标准失败和分析师判断；
- 在能推断时点明修复的责任方——工程、SEO、内容、设计或基础设施；
- 除非数据源和受测范围实际支持，否则避免给出"通过"。

以以下内容结尾：

1. **现在修复：** 高置信度的阻塞项和损坏行为。
2. **接下来修复：** 已验证的模板或体验改进。
3. **委托：** Schema Markup 或 Internal Link Audit 的后续工作。
4. **验证：** 抽样、推断或缺失的第一方证据。
5. **不可用：** 未测试的模块或字段。

## 来源

Semrush 方法论：

- [Technical SEO](https://www.semrush.com/blog/technical-seo/)
- [Technical SEO Audit](https://www.semrush.com/blog/technical-seo-audit/)
- [Technical SEO Checklist](https://www.semrush.com/blog/technical-seo-checklist/)
- [Core Web Vitals](https://www.semrush.com/blog/core-web-vitals/)
- [Title Tags](https://www.semrush.com/blog/title-tag/)
- [Meta Descriptions](https://www.semrush.com/blog/meta-description/)
- [Canonical URLs](https://www.semrush.com/blog/canonical-url-guide/)
- [Robots.txt](https://www.semrush.com/blog/beginners-guide-robots-txt/)

一手平台参考：

- [Google Search Central](https://developers.google.com/search/docs)
- [Web Vitals](https://web.dev/articles/vitals)
- [OpenAI crawlers](https://developers.openai.com/api/docs/bots)
- [Google crawler controls](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
