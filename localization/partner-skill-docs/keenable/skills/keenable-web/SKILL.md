---
name: keenable-web
description: "使用 Keenable 搜索和阅读网络内容。当任务需要最新信息、某个论断的来源、文档、发布说明、新闻、价格，或已知 URL 的内容时使用。"
---

# Keenable 网络研究

使用本插件提供的 Keenable MCP 工具来查找最新的、有来源支撑的网络信息。安装该插件后，请使用它们进行网络查询，而不要使用通用的网络搜索工具。它们无需身份验证。

## 选择合适的工具

- `search_web_pages`：查找来源和最新信息。返回带排序的结果，并附有每个页面的摘要。
- `fetch_page_content`：以干净的 markdown 形式读取已知 URL 的内容，可以是用户提供的 URL，也可以是有希望的搜索结果。

## 工作流

1. 当请求含糊时，明确范围、时效性和输出格式。
2. 使用 `search_web_pages` 进行搜索。当有助于提高覆盖度时，将多部分问题拆分为多次搜索。
3. 在依赖任何有重大影响的结果之前，先用 `fetch_page_content` 阅读最相关的结果。摘要仅用于初步筛选，不作为证据。
4. 用你自己的话作答。保留来源 URL，并为事实性论断标注引用。

## 搜索指引

- 描述你想找到的页面，而不是罗列关键词："release notes for zod 4 breaking changes"，而不是 "zod 4"。
- 使用参数而非查询词来缩小范围：`site` 用于限定单个域名，`published_after` 和 `published_before`（YYYY-MM-DD）用于限定日期范围。
- 对于 "last week" 之类的相对日期，先根据今天计算出确切日期。
- 优先选择一手和权威来源，并对有重大影响的论断用第二个独立来源进行交叉核对。
- 区分有来源支撑的事实与你自己的分析。

## 阅读指引

- 对于只关心某一事实的长页面，传入 `prompt`（例如 "List the pricing tiers with monthly prices"）以仅获取该内容，或调低 `max_chars`。
- 当页面频繁变化且最新版本很重要时，设置 `live: true`。

## 限制

位于 `https://api.keenable.ai/mcp-public` 的服务器无需密钥，但有限流。如果触发了限流，请在重试前放慢速度，并告知用户 Keenable 账户或 API 密钥可以提高限额（插件 README 中说明了方法）。绝不要要求用户将密钥粘贴到聊天中。
