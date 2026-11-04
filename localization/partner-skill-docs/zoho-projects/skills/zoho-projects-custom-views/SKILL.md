---
name: zoho-projects-custom-views
description: "Zoho Projects 已保存的自定义视图：在项目或 My Tasks 中列出、检查、创建、更新、克隆与删除任务视图；收藏与取消收藏视图；设置默认视图；列出问题视图、项目视图与阶段视图；保存阶段与项目视图。适用于已保存过滤、我的任务视图、创建高优先级任务视图、重命名视图、更改视图条件、克隆视图、删除视图、收藏视图、把此设为我的默认视图、存在哪些问题视图、视图未在项目中显示、Kindly provide a valid criteria、criteria_pattern 上的 PATTERN_NOT_MATCHED、View Configuration is not implemented for this module 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后 project_id（对于项目视图），然后来自 `get_modules` 的模块 ID（任务视图用 Task 模块的 `id`），然后来自某次列表调用的视图 ID。视图 ID 是门户范围的数字字符串；绝不要传视图名称。只使用本会话中某个工具返回的、或用户给出的 ID。
3. 路由到与请求匹配的参考：
   - 列出、读取、创建、更新、克隆或删除任务视图，以及构建视图条件：`references/views-tasks.md`
   - 收藏与默认视图：`references/views-favourites-defaults.md`
   - 问题视图、项目视图、阶段视图与 `create_or_update_view`：`references/views-other-modules.md`
4. 在任何 create、update、clone、delete、favourite 或 default 变更之前，向用户准确展示将发生什么更改（视图、字段、旧值、新值），并等待明确确认。用 `for_all_users: true` 设置默认会改变每个成员看到的内容；请单独确认该范围。除非用户按名称要求，否则绝不编辑或删除非用户创建的视图。
5. 写入之后验证它：用 `get_task_custom_view_details` 读取该视图，或用匹配的 `view_type` 列出视图。收藏、默认与删除调用只返回空的 204。

## 触发条件

在以下情况使用本技能：
- “列出我的任务视图”、“这个项目有哪些已保存视图”、“显示这个视图的条件”
- “创建我高优先级任务的视图”、“把这个过滤保存为视图”、“添加一个 My Tasks 视图”
- “重命名视图”、“更改视图的过滤条件”、“克隆这个视图”、“删除这个视图”
- “收藏这个视图”、“取消收藏”、“把此设为我的默认视图”、“为所有人设置默认视图”
- “存在哪些问题视图”、“列出项目视图”、“阶段视图”、“创建阶段视图”
- 视图已创建但在项目中不可见、仅在重命名后更新失败、克隆后的条件看起来不同
- “Kindly provide a valid criteria”、“Custom View criteria should not be empty”、`criteria_pattern` 上的 `PATTERN_NOT_MATCHED`、`project_ids` 上的 `INPUT_PARAMETER_MISSING`、501 “View Configuration is not implemented for this module”

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/views-tasks.md` | 任务视图列表与详情工具、`view_type`、条件字符串形状、条件与值格式、项目与 My Tasks 创建、更新、克隆、删除 |
| `references/views-favourites-defaults.md` | 项目与门户收藏标志、项目与门户默认视图、`for_all_users`、恢复先前的默认 |
| `references/views-other-modules.md` | 问题视图列表与详情、项目模块视图、`get_user_views_list`、用于阶段与项目视图的 `create_or_update_view` |
