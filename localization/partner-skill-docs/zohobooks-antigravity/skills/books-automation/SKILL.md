---
name: books-automation
description: 配置 Zoho Books 工作流、webhooks、告警、自定义函数、调度器、按钮、字段更新和 blueprint。当用户想要自动化某个 Books 操作、检查失败的工作流，或管理某个 webhook 时使用。
---

## 操作说明
1. 先检查：`list_workflows`、`list_webhooks`、`list_alerts`、`list_custom_functions`、`list_custom_schedulers`、`list_custom_buttons`、`list_field_updates`、`list_blueprints`、`list_failed_workflows`、`list_upcoming_workflows`。
2. 工作流：用户说明模块、触发器和操作后，使用 `create_workflow`。用 `activate_workflow` / `deactivate_workflow` 激活/停用。手动运行：`trigger_workflow`。重新排序：`reorder_workflows`。
3. Webhooks：`create_webhook`；失败的投递用 `list_webhook_histories` / `resend_webhook` / `bulk_resend_webhooks`。创建前确认 URL 和事件。
4. 告警和推送：`create_alert` / `create_push_notification`。字段更新：`create_field_update`。自定义触发器：`create_custom_trigger` / `execute_custom_trigger` —— 重新生成密钥（`regenerate_custom_trigger_apikey`）会使旧密钥失效；先确认。
5. 函数：`create_custom_function` / `deploy_custom_function` / `execute_custom_function`。调度器：`create_custom_scheduler`。按钮/操作：`create_custom_button` / `create_custom_action`。Blueprint：`create_blueprint`。
6. 将自动化写入视为高影响操作。展示触发器、模块、操作以及任何 URL/代码摘要，并等待“是”。优先更新现有工作流，而不是创建重复项。
7. 任何写入之后，报告工作流或操作的名称和状态。删除工作流、webhooks、函数、按钮或 blueprint 时，必须经明确确认并指明该记录。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
