---
name: publish-wordpress-content
description: 在 WordPress.com 站点上起草、编辑、排期和管理文章、页面、自定义文章类型、媒体、评论、分类法、模板和导航。当创建或更新站点内容或站点结构时使用。
---

# 发布 WordPress 内容

## 1. 解析目标站点与编辑器上下文

1. 确定目标站点（`wpcom_site`）。如果未知，调用 `wpcom-user-sites` 列出用户可访问的站点。
2. 在创建或编辑区块内容之前，调用 `wpcom-mcp-site-editor-context`（`action: "get"`）以检查：
   - `blocks.allowed`：站点上可用的已注册区块类型。
   - `theme.presets` 和 `theme.styles`：当前主题的调色板、排版和间距预设。
3. 遵循 `edit-wordpress-block-content` 技能的规则，使所有生成的标记都保持为有效的、可编辑的 Gutenberg 区块标记，并使用已注册的区块和主题令牌。

## 2. 内容创作（`wpcom-mcp-content-authoring`）

配合 `wpcom_site` 和 `list` -> `describe` -> `execute` 工作流使用 `wpcom-mcp-content-authoring`：

- **文章与页面（`posts.*`、`pages.*`）**：
  - 使用 `posts.list`、`posts.get`、`pages.list` 或 `pages.get` 读取现有条目。
  - 除非用户明确要求发布或排期，否则优先将新文章和页面创建为草稿（`status: "draft"`）。
  - 绝不要把草稿报告为已发布；始终报告其实际返回的状态、ID 和 URL。
- **就地分节编辑（`page-sections.*`、`post-sections.*`）**：
  - 当更新现有页面或文章中的特定分节、CTA 按钮、标题或区块时，优先使用 `page-sections.*` 或 `post-sections.*`（先用 `list` 检查，再用 `replace`、`insert`、`move` 或 `remove`）来就地仅更改目标顶层区块，而不是重写整篇文章或页面。
- **自定义文章类型（`content-types.*`、`content-items.*`、`content-terms.*`）**：
  - 使用 `content-types.list` 发现自定义文章类型（例如 WooCommerce 产品或作品集项目），并用 `content-items.*` 和 `content-terms.*` 管理其条目和分类法。
- **媒体、评论、分类法与模式**：
  - 通过 `wpcom-mcp-content-authoring` 各自的操作为分类、标签、媒体库条目和评论审核进行管理。

## 3. 站点结构与导航（`wpcom-mcp-site-editing`）

配合 `wpcom_site` 使用 `wpcom-mcp-site-editing`，检查并更新全站的设计和结构：

- **模板与模板部件**：`templates.*` 和 `template-parts.*`
- **导航菜单**：`navigation.*`（经典导航菜单和区块导航菜单）
- **全局样式与主题**：`global-styles.*` 和 `themes.*`

由于站点编辑的写操作会影响全站所有访客，始终先总结拟议的结构性更改，并在执行前请求明确确认。

## 4. 确认与安全策略

- `wpcom-mcp-content-authoring` 和 `wpcom-mcp-site-editing` 中的每个创建、更新或删除操作都需要在执行前获得用户的明确确认。
- 呈现将创建、修改或删除内容的简明摘要，等待用户批准，并在调用 `action: "execute"` 时于 `params` 中传入 `user_confirmed: true`。
