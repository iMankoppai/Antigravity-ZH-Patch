---
name: custom-domain
description: "通过 Spacefast 表单查找、检查并注册域名。将用户拥有域名连接到 Space，检查 DNS 和 HTTPS，或将其网站迁移到 Spacefast。在新目标可用之前，保留现有站点。"
---

# 查找或连接域名

使用已连接的 Spacefast 工具。在代码仓库中工作时，保留无关的文件和改动。

如果任务需要某个现有 Space 且其身份不明确，调用 `choose_space`。将选中的 Space 作为目标。选中并不代表批准发布或其他改动。

在执行管理操作前，阅读 [references.md](references.md) 中的 MCP 调用、审批与工作模式规则。

1. 要查找或检查域名，或重新查看注册状态，调用 `show_domains`。
2. 对于域名搜索或注册，阅读 [references.md](references.md) 中的**查找并注册域名（Find and register domains）**，包括针对没有 `show_domains` 的服务器的回退方案。域名归属于团队；它不需要 Space。将所有者详情保留在 App 或仪表盘表单中。
3. 如果用户仅要求注册，以注册状态收尾。仅当用户请求连接时，才继续执行 Space 设置。
4. 对于用户请求的 Space 连接，确定该 Space 和域名。打开 Space 的域名视图以读取其当前状态。
5. 阅读 [references.md](references.md) 中的**设置自定义域名（Set up a custom domain）**。使用 Spacefast 返回的 DNS 值。
6. 对于现有的生产域名，在更改其目标之前还要阅读**迁移 DNS（Migrate DNS）**。
7. 当结果提供 Domain Connect 时使用它。否则，说明确切的域名提供商变更，而不要声称变更已经发生。
8. 只有在 DNS、HTTPS 和代表性内容检查均成功之后，才将域名报告为已上线。
