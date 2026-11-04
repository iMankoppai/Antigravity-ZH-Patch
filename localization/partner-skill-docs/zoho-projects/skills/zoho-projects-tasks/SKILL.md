---
name: zoho-projects-tasks
description: "Zoho Projects 任务：列出、过滤、统计、创建、分配、更新、关闭、克隆、移动、重排与删除任务、子任务、依赖与状态历史。适用于我的任务、已逾期任务、截止日期变更、任务分配、被阻塞或依赖链接、任务计数、诸如 PATTERN_NOT_MATCHED 的任务过滤错误、状态名称被拒绝、更新后负责人被移除时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.1.0"
---

## 工作原理

1. 先加载 `zoho-projects` 技能。它检查 MCP 连接、设置 portal_id 与 project_id，并持有关于 ID、用户（ZPUID 与 ZUID）、字段 API 名称、选项 ID、分页与确认写入的共享规则。不要在此重复该设置。
2. 从任务列表调用或创建/克隆响应中解析 task_id；只使用本会话中某个工具返回的、或用户给出的 ID。关于列出、分页、排序与“我的任务”，加载 `references/tasks-basics.md`。
3. 路由到与请求匹配的参考：
   - 过滤、按条件统计、逾期、过滤错误：`references/tasks-filters.md`
   - 创建、分配、编辑、关闭或删除任务：`references/tasks-create-update.md`
   - 前置任务、后继任务、被阻塞的任务：`references/tasks-dependencies.md`
   - 子任务、克隆、在列表之间移动、排序、状态历史：`references/tasks-structure.md`
   - 评论、关注者、附件、论坛、关联问题：`references/tasks-collaboration.md`
4. 在任何 create、update、delete、clone、move、reorder 或 dependency 变更之前，向用户准确展示将发生什么更改（任务、字段、旧值、新值），并等待明确确认。除非用户批准完整列表，否则绝不在一次确认后批处理多个写入。
5. 写入之后，用 `get_task_details` 确认结果，因为若干写入工具只返回 ID 或一个裸的确认。

## 触发条件

在以下情况使用本技能：
- “显示我的任务”、“什么已逾期”、“本周到期的任务”、“项目 X 中未关闭的任务”
- “创建任务”、“把此任务分配给”、“添加负责人”、“更改截止日期”、“关闭任务”、“标记为完成”
- “把此设为子任务”、“克隆此任务”、“把任务移到另一个列表”、“把此任务放到最前”
- “任务 A 被任务 B 阻塞”、“添加依赖”、“哪些任务被阻塞”
- “有多少任务”、“任务计数与列表不符”、“此任务什么时候变更了状态”
- “评论任务”、“关注此任务”、“把 Priya 添加为关注者”、“把文件附加到任务”、“把这个 bug 链接到任务”、`zp.followers.alreadyexist`、`zp.followers.projectuser`
- `PATTERN_NOT_MATCHED`、`INVALID_PARAMETER_VALUE`、`JSON_PARSE_ERROR`、`CANT_COPY_SUBTASK`、“Time values are not supported”、过滤返回零行、更新后共同负责人被移除

未涵盖：问题（Bug）过滤与问题链接，它们使用不同的规则（使用 `zoho-projects-issues`）、阶段记录（使用 `zoho-projects-phases`）、任务列表记录与模板（使用 `zoho-projects-tasklists`）、在任务上记录工时（使用 `zoho-projects-timelogs`）、给任务打标签（使用 `zoho-projects-tags`）以及已保存的任务视图（使用 `zoho-projects-custom-views`）。

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/tasks-basics.md` | 列出任务、项目与门户范围、分页、排序、自定义视图、我的任务、任务详情、任务论坛 |
| `references/tasks-filters.md` | 构建 `filter` JSON、按字段类型的条件、值编码、日期宏、逾期、自定义字段过滤、过滤错误 |
| `references/tasks-create-update.md` | 创建、更新、分配负责人、状态、日期、优先级、计费、重复、提醒、自定义字段、删除 |
| `references/tasks-dependencies.md` | 添加、更改或移除依赖、读取 dependency_info、查找被阻塞的任务 |
| `references/tasks-structure.md` | 子任务、clone_a_task、move_task、reorder_tasks、get_status_timeline |
| `references/tasks-collaboration.md` | 任务评论、关注者、附件、论坛链接、关联问题（Bug） |
