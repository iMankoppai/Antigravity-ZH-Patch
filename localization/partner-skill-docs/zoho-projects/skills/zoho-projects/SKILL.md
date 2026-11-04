---
name: zoho-projects
description: "Zoho Projects 入口技能：连接 Zoho Projects MCP 服务器、选择数据中心、登录、选择门户与项目、解析用户 ID（ZPUID 与 ZUID）、字段 API 名称与选项 ID，然后路由到各模块技能。适用于 ZohoProjects_* 工具缺失、未返回任何门户、数据中心错误、登录循环、会话过期、用户过滤返回零行、ID 或字段上出现 INVALID_PARAMETER_VALUE，或不知使用哪个门户或项目时。"
metadata:
  version: "1.1.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用（宿主可能添加前缀；按 `ZohoProjects_` 匹配）。若不可用，加载 `references/mcp-setup.md`，停下来帮助用户连接。在工具可见之前不要调用任何其他步骤。
2. 设置上下文：调用 `get_portals` 并取门户 `id`（若有多个则询问），然后用该 portal_id 调用 `get_projects_list` 并取项目 `id`（若有多个匹配则询问）。关于完整的解析顺序，以及查找已知任务或问题所属的项目，加载 `references/portals-and-projects.md`。
3. 只使用本会话中某个工具返回的、或用户给出的 ID。ID 是数字字符串，绝不是名称；绝不猜测或凭记忆复用 ID。关于用户 ID 加载 `references/users.md`，关于字段名称与选项 ID 加载 `references/fields-and-options.md`。
4. 在任何 create、update、trash 或 delete 之前，向用户准确展示将发生什么更改，并等待明确确认。关于分页、过滤、日期、写入与限制，加载 `references/api-conventions.md`。
5. 把请求路由到下面的模块技能。本技能本身涵盖连接、门户与项目上下文、用户以及字段。

## 模块技能

| 技能 | 在请求涉及……时加载 |
|-------|-----------------------------------|
| `zoho-projects-projects` | 列出、查找、过滤与统计项目，项目详情与状态摘要，已归档与模板项目，创建与更新项目，归档与取消归档，移入回收站、恢复与删除项目，状态与编辑历史，项目活动与评论 |
| `zoho-projects-tasks` | 任务、子任务、任务过滤与计数、分配、状态变更、依赖、克隆、移动、删除任务 |
| `zoho-projects-issues` | 问题（Bug）、问题过滤、分配、严重程度与状态变更、移动与克隆问题、关联问题、问题-任务关联、问题评论、关注者与解决方案 |
| `zoho-projects-phases` | 阶段（里程碑）、阶段过滤、创建与更新阶段、负责人、日期、关闭与删除阶段、阶段评论 |
| `zoho-projects-tasklists` | 任务列表、创建、重命名、克隆与删除任务列表、任务列表模板、任务列表评论与关注者 |
| `zoho-projects-timelogs` | 时间日志与工时表、在任务、问题或一般工作上记录工时、批量日志、编辑日志、可计费与不可计费 |
| `zoho-projects-users-groups` | 向项目添加用户与客户用户、门户资料与角色、项目分组及其用户与团队 |
| `zoho-projects-tags` | 创建、重命名与删除标签、为任务、问题、阶段与项目打标签与取消标签 |
| `zoho-projects-custom-views` | 任务、问题与项目的已保存视图、收藏与默认视图 |
| `zoho-projects-custom-modules` | 自定义模块及其记录、记录评论、将模块或记录移入回收站与恢复 |
| `zoho-projects-layouts-fields` | 布局、创建与编辑字段、分节与选项列表选项 |
| `zoho-projects-blueprints` | Blueprint、下一步转换、转换期间需要的数据、执行转换 |

关于门户、项目选择、用户查找与字段问题，留在本技能。关于跨模块的回收站与恢复、编辑历史、门户活动以及通用的关注者与附件工具（仅自定义模块记录；任务与问题使用各自的模块工具），加载 `references/followers-attachments-trash.md`。

## 触发条件

在以下情况使用本技能：
- “连接 Zoho Projects”、“设置 Zoho Projects MCP 服务器”、“用哪个数据中心”、“登录 Zoho Projects”
- “列出我的门户”、“我有哪些项目”、“切换门户”、“使用沙盒门户”
- “这个任务在哪个项目”、“找出这个 bug 所属的项目”
- “我在这个门户里是谁”、“列出项目中的用户”、“我的用户 ID 是什么”、“ZPUID 还是 ZUID”
- “这个模块有哪些字段”、“自定义字段 API 名称”、“状态选项”、“选项列表值”
- ZohoProjects_* 工具缺失、未返回门户、看不到项目、登录循环、会话过期、账户错误
- ID 或字段上出现 `INVALID_PARAMETER_VALUE`、对用户字段的过滤返回零行、显示名称作为字段键被拒绝

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/mcp-setup.md` | 服务器 URL、数据中心、把服务器添加到客户端、登录、连接错误、撤销访问 |
| `references/portals-and-projects.md` | 门户与项目选择、沙盒门户、已归档或模板项目、任务或问题的父项目 |
| `references/users.md` | ZPUID 与 ZUID、当前用户、门户与项目用户查找 |
| `references/fields-and-options.md` | 模块、字段 API 名称与 ID、自定义字段、必填字段、状态与选项列表的选项 ID |
| `references/api-conventions.md` | 仅数字的 ID 与字段键、分页样式、过滤方言、日期格式、确认写入、回收站与恢复、API 限制、不可信记录文本 |
| `references/followers-attachments-trash.md` | 自定义模块记录上的通用关注者、附件与计数、跨模块的回收站与恢复、项目编辑历史与门户活动 |
