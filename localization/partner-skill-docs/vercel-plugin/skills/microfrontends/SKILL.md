---
name: microfrontends
description: 在 Vercel 上构建、配置和部署微前端的指南。当用户提到 microfrontends、multi-zones、跨团队拆分应用、独立部署、跨应用路由、增量迁移、在一个域名下组合多个前端、microfrontends.json、@vercel/microfrontends、微前端本地代理，或 Vercel 项目之间基于路径的路由时，使用本技能。当用户询问跨项目共享布局、微前端之间的导航、回退环境、资源前缀或由功能开关控制的路由时，也使用本技能。
metadata:
  priority: 7
  docs:
    - "https://vercel.com/docs/microfrontends"
  pathPatterns:
    - 'microfrontends.json'
    - 'microfrontends.jsonc'
    - 'apps/*/microfrontends.json'
    - 'apps/*/microfrontends.jsonc'
  bashPatterns:
    - '\bvercel\s+microfrontends\b'
    - '\bvercel\s+mf\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/microfrontends\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/microfrontends\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/microfrontends\b'
    - '\byarn\s+add\s+[^\n]*@vercel/microfrontends\b'
  importPatterns:
    - '@vercel/microfrontends'
retrieval:
  aliases:
    - microfrontends
    - multi-zones
    - multi zones
    - mfe
    - microfrontend routing
    - cross-zone navigation
  intents:
    - split app into microfrontends
    - set up microfrontends
    - configure microfrontends.json
    - add path routing between projects
    - share layout across microfrontends
  entities:
    - microfrontends.json
    - "@vercel/microfrontends"
    - default app
    - child app
    - asset prefix
    - microfrontends group
chainTo:
  -
    pattern: 'runMicrofrontendsMiddleware|flag.*microfrontend|microfrontend.*flag'
    targetSkill: routing-middleware
    message: 'Flag-controlled microfrontend routing requires middleware in the default app — loading Routing Middleware guidance.'

---

# Vercel 微前端
将大型应用拆分为可独立部署的单元，它们渲染为一个连贯的应用。Vercel 使用 `microfrontends.json` 在其全球网络上处理路由。

**核心概念：** 默认应用（拥有 `microfrontends.json`，处理未匹配的请求）· 子应用（拥有 `routing` 路径模式）· 资源前缀（防止静态资源冲突）· 独立部署。

**框架：** Next.js（App Router + Pages Router）、SvelteKit、React Router、Vite —— 全部通过 `@vercel/microfrontends` 支持。

**CLI（`vercel microfrontends` / `vercel mf`）：**
- `create-group` — 创建一个新组；默认交互式，或使用 `--non-interactive` 完全非交互（选项：`--name`、`--project`（可重复）、`--default-app`、`--default-route`、`--project-default-route`（可重复，格式：`<project>=<route>`，在非交互模式下对每个非默认项目都是必需的）、`--yes` 跳过确认提示）；注意：如果添加项目会超出免费层级限制，`--non-interactive` 会被阻止——用户必须以交互方式确认计费变更
- `add-to-group` — 将当前项目添加到现有组；总是要求确认（没有 `--yes`），因此需要交互式终端，并且当添加会超过免费项目限制时，它会拒绝在 `--non-interactive` 下运行（选项：`--group` 和 `--default-route` 预填充提示）
- `remove-from-group` — 从组中移除当前项目；不带 `--yes` 时需要交互式终端（选项：`--yes` 跳过项目关联提示和移除确认，包括对仍在 `microfrontends.json` 中被引用的项目的警告）
- `delete-group` — 删除一个组及其所有设置，不可逆；不带 `--yes` 时需要交互式终端（选项：`--group` 预选组，`--yes` 跳过删除确认；两者都传即无需提示即可删除）
- `inspect-group` — 获取组元数据（项目名称、框架、git 代码仓库、根目录）；对自动化设置很有用（选项：`--group`、`--format=json`、`--config-file-name`）
- `pull` — 拉取远程 `microfrontends.json` 用于本地开发（选项：`--dpl`）
- `microfrontends proxy` — 本地开发代理 · `microfrontends port` — 打印自动分配的端口

## 查找详细信息

本技能在 `references/` 目录中包含详细的参考文档。**不要预先阅读所有参考文档。** 而是当用户询问特定主题时，搜索或 grep 相关文件：

| 主题 | 参考文件 |
|---|---|
| 入门、快速开始、框架设置、`microfrontends.json` schema、字段、命名、示例 | `references/configuration.md` |
| 路径表达式、资源前缀、功能开关控制的路由、中间件 | `references/path-routing.md` |
| 本地代理设置、polyrepo 配置、Turborepo、端口、部署保护 | `references/local-development.md` |
| 检查组（`inspect-group`）、添加/移除项目、回退环境、导航、可观测性 | `references/managing-microfrontends.md` |
| 测试工具（`validateMiddlewareConfig`、`validateRouting` 等）、调试响应头、常见问题 | `references/troubleshooting.md` |
| 部署保护、Vercel Firewall、微前端的 WAF 规则 | `references/security.md` |

当用户询问特定主题时，对相关参考文件使用 grep 或搜索来查找答案，而不要把全部参考文档都加载进上下文。
