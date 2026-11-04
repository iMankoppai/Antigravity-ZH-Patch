---
name: zoho-projects-projects
description: "Zoho Projects 项目：列出、查找、过滤、统计、读取、创建与更新项目，项目详情、状态、负责人、日期、进度、任务、问题与里程碑计数、预算、已归档与模板项目；将项目移入回收站、恢复与永久删除；状态历史、编辑历史、活动流与项目评论。从头创建、从模板创建、作为副本创建或作为模板创建；重命名、重新安排日期、更改负责人或状态、关闭、归档或取消归档、转换为模板、移动分组、更改布局、标签、预算与自定义字段。适用于我有哪些项目、查找项目 X、项目状态摘要、已逾期项目、创建项目、从模板新建项目、归档此项目、更改项目负责人、延长结束日期、负责人不被接受、项目在列表中找不到、模板缺失、更新后标签丢失、删除项目、恢复已移入回收站的项目、谁更改了项目状态、评论项目、START_END_CONSISTENCY、STATUS_CHECK、删除或恢复时 RESOURCE_NOT_FOUND 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.1.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后 project_id。ID 是数字字符串，绝不是名称。项目的 `key` 是其显示编号，不是其 ID。只使用本会话中某个工具返回的、或用户给出的 ID；绝不猜测或凭记忆复用 ID。关于解析步骤、列出、分页、视图与项目详情，加载 `references/projects-basics.md`。
3. 路由到与请求匹配的参考：
   - 列出、按名称查找、统计、已归档或模板项目、我的项目、项目详情、状态摘要：`references/projects-basics.md`
   - 按状态、日期、负责人或自定义字段过滤项目：`references/projects-filters.md`
   - 创建项目、从模板、作为副本、作为模板、带负责人、预算、标签或自定义字段：`references/projects-create.md`
   - 重命名、重新安排日期、更改负责人或状态、关闭、归档、取消归档、转换为模板、移动分组、更改布局、标签、预算或自定义字段：`references/projects-update.md`
   - 将项目移入回收站、恢复与永久删除：`references/projects-trash-restore.md`
   - 状态历史、编辑历史、活动流与项目评论：`references/projects-history-comments.md`
4. 在任何 create、update、trash、restore、delete 或 comment 之前，向用户准确展示将发生什么更改（项目、字段、旧值、新值），并等待明确确认。绝不凭推断创建或更改项目，也绝不填写用户未给出的字段。项目名称并不唯一，因此请按 ID 确认。永久删除无法撤销；请与移入回收站步骤分开询问。
5. 创建或更新之后，用 `get_project_detail` 确认结果。创建之后，保留新的 project_id 作为本会话的项目上下文。

## 触发条件

在以下情况使用本技能：
- “列出我的项目”、“我有哪些项目”、“查找名为 X 的项目”、“有多少个活动项目”
- “显示已归档项目”、“列出项目模板”、“我拥有的项目”、“Y 拥有的项目”
- “项目详情”、“项目 X 进展如何”、“所有项目的状态摘要”、“哪些项目已逾期”、“本月结束的项目”
- “项目 X 的预算”、“计划与实际成本”、“项目 X 中未关闭的任务与问题”
- “创建项目”、“从入职模板新建项目”、“复制项目 X”、“把这个保存为模板”
- “重命名项目”、“延长结束日期”、“更改项目负责人”、“把项目标记为已完成”、“归档此项目”、“取消归档”、“把它设为私有”、“把它移到 Clients 分组”、“添加标签”、“增加预算”
- “删除项目”、“把这个项目移入回收站”、“恢复已删除的项目”、“项目状态何时更改的”、“谁编辑了这个项目”、“项目活动”、“评论项目”
- 负责人不被接受、项目在列表中缺失、模板未找到、“zp.projset.ungroupproj” 显示为分组名、自定义字段被拒绝、更新后标签丢失、`START_END_CONSISTENCY`、`STATUS_CHECK`、状态上的 `UNABLE_TO_PARSE_DATA_TYPE`、410 `RESOURCE_TRASHED`、来自删除或恢复的 404 `RESOURCE_NOT_FOUND`

未涵盖：项目用户与项目分组（使用 `zoho-projects-users-groups`）、项目内的任务列表（使用 `zoho-projects-tasklists`）与任务（使用 `zoho-projects-tasks`）。

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/projects-basics.md` | ID 解析、列出项目、分页、排序、已归档与模板视图、我的项目、按名称查找项目、统计、项目详情、读取响应、状态与预算摘要 |
| `references/projects-filters.md` | 为 `get_projects_list` 构建 `filter` 对象、按字段类型的条件、日期宏、打开与关闭状态、过滤错误 |
| `references/projects-create.md` | 创建项目、必填与可选字段、负责人、日期、状态、布局、分组、标签、模板、复制、预算、自定义字段、验证结果 |
| `references/projects-update.md` | 更新项目：名称、描述、日期、负责人、状态、归档与取消归档、模板转换、可见性、分组、布局、标签、预算、自定义字段、验证结果 |
| `references/projects-trash-restore.md` | `trash_project`、`restore_project`、`delete_project`、查找已移入回收站的项目、410 与 404 错误 |
| `references/projects-history-comments.md` | `get_project_status_timeline`、`get_edits`、`get_project_edit_details`、`get_project_activity`、项目评论工具 |
