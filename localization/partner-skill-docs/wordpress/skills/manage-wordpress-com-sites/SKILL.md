---
name: manage-wordpress-com-sites
description: 发现、开通并管理 WordPress.com 和已连接 Jetpack 的站点。当列出站点、创建新站点、查看流量统计、更新站点设置、管理插件或用户，或配置域名与 DNS 时使用。
---

# 管理 WordPress.com 站点

## 1. 站点发现

- 当目标站点 URL 或博客 ID 尚未解析，或用户询问其可管理哪些站点时，先调用 `wpcom-user-sites`。
- 只报告为已认证账户返回的站点，并附上其返回的名称、URL（`primary_domain` 或 `site_url`）、平台（`simple`、`atomic`、`jetpack`）和 `mcp_access` 状态。绝不要臆造站点，或暗示可以访问响应中不存在的站点。
- 如果某站点报告 `mcp_access.status` 为 `unavailable` 或 `limited`，请将 `mcp_access.message` 和 `mcp_access.activation_steps`（或 `upgrade_url`）转达给用户。

## 2. 渐进式操作发现（`list` -> `describe` -> `execute`）

多操作的 WordPress.com MCP 工具（`wpcom-mcp-site`、`wpcom-mcp-create-site`、`wpcom-mcp-plugin-management`、`wpcom-mcp-user-management`、`wpcom-mcp-account`）采用三步操作模式：

1. **`list`**：以 `action: "list"` 调用，当你无法确定哪个操作名称适用时，用于发现可用的操作。
2. **`describe`**：以 `action: "describe"` 和 `operation: "<resource.action>"` 调用，在执行前检查所需的参数模式。
3. **`execute`**：以 `action: "execute"`、`operation: "<resource.action>"`、顶层 `wpcom_site`（用于站点范围工具）和 `params` 调用。

## 3. 创建新站点（`wpcom-mcp-create-site`）

1. 以 `action: "execute"` 和 `operation: "site.instructions"` 调用 `wpcom-mcp-create-site`，加载站点创建操作手册并核验预检状态。
2. 根据操作手册从请求的站点标题推导候选子域名 slug，并使用 `operation: "subdomain.check"` 检查可用性。
3. 向用户呈现建议的标题和返回的 `would_be_url`，并等待明确批准。
4. 仅在用户确认后，才以确认的 `title`、可选的 `description` 和 `user_confirmed: true` 调用 `operation: "site.provision"`。

## 4. 流量统计与站点设置（`wpcom-mcp-site`）

- **流量与分析**：在 `wpcom-mcp-site` 上使用 `operation: "statistics.get"`，并将 `wpcom_site` 设为目标站点。在比较时间段（例如本月与上月）时，将当前自然月标注为“月初至今”，报告工具返回的确切浏览量和访客数，并在计算百分比变化时防止除以零。
- **设置与主题**：使用 `settings.get` / `settings.update` 处理站点标题、副标题和一般选项，使用 `theme.list` / `theme.set` 进行主题管理。始终显示当前值和建议值，并在以 `user_confirmed: true` 调用写操作之前获得用户的明确确认。

## 5. 插件、协作者与域名

- **插件（`wpcom-mcp-plugin-management`）**：使用 `plugin.search`（账户级）或站点范围的 `plugin.list`、`plugin.install`、`plugin.activate`、`plugin.deactivate`、`plugin.update` 和 `plugin.uninstall`。在任何写操作之前请求用户明确批准。
- **协作者（`wpcom-mcp-user-management`）**：使用 `user.list` 和 `user.pending-invites` 检查访问权限，并在用户批准后，以 `user_confirmed: true` 使用 `user.invite`、`user.change-role`、`user.cancel-invite`、`user.resend-invite` 或 `user.remove-access`。仅支持 WordPress 内置角色（`administrator`、`editor`、`author`、`contributor`、`subscriber`）。
- **域名、DNS 与套餐**：
  - 使用 `wpcom-domain-purchase` 检查域名的可用性和价格，使用 `wpcom-plans-list` / `wpcom-checkout-url` 查看套餐或生成结账链接。购买由用户在浏览器中通过返回的 `checkout_url` 完成。
  - 仅在向用户确认拟议的 DNS 更改后，才使用 `wpcom-domain-update-dns-records`、`wpcom-domain-restore-default-dns-records`、`wpcom-domain-update-nameservers` 和 `wpcom-domain-set-mail-service`。

## 6. 平台边界

- 托管的 WordPress.com MCP 工具不提供直接的服务器文件系统编辑（例如编辑 `wp-config.php`）或原始 SQL 查询执行（`SELECT * FROM wp_options`）。清晰地解释这些边界，不要调用无关工具或伪造结果。
