---
name: zoho-projects-custom-modules
description: "Zoho Projects 自定义模块及其记录：创建、重命名、激活、停用、移入回收站、恢复与删除自定义模块；创建、更新、列出、过滤、统计、移入回收站与恢复自定义模块记录；记录状态历史；记录评论。适用于创建自定义模块、添加 Vendors 或 Assets 模块、模块卡在草稿、列出自定义模块中的记录、添加记录、更改记录的状态、评论记录、Cannot Update Inactive Module、PROJECT_CHECK Invalid project、模块未与项目关联、创建模块时 500、记录上 RESOURCE_TRASHED 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后模块 `api_name`（来自 `get_modules`），然后项目级模块的 project_id，然后记录 `id`（entity_id）与 comment_id。ID 是数字字符串；模块键是其 `api_name`，绝不是其显示名称。只使用本会话中某个工具返回的、或用户给出的 ID。字段 API 名称与选项 ID 遵循 `zoho-projects` 技能、`references/fields-and-options.md`。
3. 路由到与请求匹配的参考：
   - 创建、重命名、激活、停用、移入回收站、恢复或删除模块：`references/modules-manage.md`
   - 创建、更新、列出、过滤、统计、移入回收站或恢复记录、记录状态历史：`references/modules-records.md`
   - 记录评论：`references/modules-record-comments.md`
   - 自定义模块的布局、字段、分节与选项列表选项：加载 `zoho-projects-layouts-fields` 技能。
4. 在任何 create、update、activate、deactivate、trash、restore、delete 或 comment 之前，向用户准确展示将发生什么更改（模块或记录、字段、旧值、新值），并等待明确确认。删除模块会移除其所有记录；请说明这一点，并在询问之前给出 `get_record_count` 的记录数。
5. 写入之后，用 `get_a_module` 或 `get_record_details` 确认结果。若干写入工具只返回“Empty response received from API ... 204”消息，它意味着成功但不携带数据。

## 触发条件

在以下情况使用本技能：
- “创建自定义模块”、“添加 Vendors 模块”、“重命名模块”、“让模块在项目 X 中可用”
- “激活模块”、“模块仍在草稿中”、“停用 Assets 模块”、“把这个模块移入回收站”、“恢复模块”、“删除模块”
- “列出 Risk 模块中的记录”、“有多少个未关闭的风险”、“添加记录”、“更改记录状态”、“更新这条记录”
- “把这条记录移入回收站”、“恢复已删除的记录”、“这条记录什么时候变更了状态”
- “评论这条记录”、“显示记录评论”、“编辑或删除记录评论”
- 401 `UNAUTHORIZED_ACCESS` “Cannot Update Inactive Module”、403 `PROJECT_CHECK` “Invalid project”、403 “The module is not associated with the provided project(s)”、403 “Module Name already exists”、410 `RESOURCE_TRASHED`、记录过滤上的 `PATTERN_NOT_MATCHED`、创建模块时 500 `INTERNAL_SERVER_ERROR`

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/modules-manage.md` | 模块创建与更新请求体、全局与项目级模块、草稿、活动与非活动状态、回收站、恢复、删除 |
| `references/modules-records.md` | 记录创建与更新请求体、状态与自定义字段值、列出、过滤、计数、状态时间线、回收站与恢复 |
| `references/modules-record-comments.md` | 列出、读取、添加、编辑与删除记录评论 |
