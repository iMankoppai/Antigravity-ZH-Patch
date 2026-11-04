---
name: zoho-projects-issues
description: "Zoho Projects 问题（Bug）：列出、过滤、创建、分配、更新、关闭、移动、克隆与删除问题；严重程度、分类、状态、截止日期、标记、提醒；关联问题；问题-任务关联；评论、关注者、解决方案、附件、活动与状态历史。适用于我的 bug、按严重程度列出的未关闭问题、记录一个 bug、分配或关闭问题、关联重复问题、把问题与任务关联、问题过滤错误、状态或严重程度名称被拒绝、问题落到错误项目时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 先加载 `zoho-projects` 技能。它检查 MCP 连接、设置 portal_id 与 project_id，并持有关于 ID、用户（ZPUID 与 ZUID）、字段 API 名称、选项 ID、分页与确认写入的共享规则。不要在此重复该设置。
2. 从问题列表调用或创建/克隆响应中解析 issue_id，绝不要从标题或诸如 `ZP-I12` 的显示前缀解析；只使用本会话中某个工具返回的、或用户给出的 ID。关于列出、分页、排序与“我的问题”，加载 `references/issues-basics.md`。
3. 路由到与请求匹配的参考：
   - 过滤问题、过滤错误：`references/issues-filters.md`
   - 创建、分配、编辑、关闭、移动、克隆或删除问题：`references/issues-create-update.md`
   - 把问题相互关联、把问题与任务关联：`references/issues-links-and-tasks.md`
   - 评论、关注者、解决方案、附件：`references/issues-collaboration.md`
4. 在任何 create、update、move、clone、link、association、resolution、comment 或 delete 之前，向用户准确展示将发生什么更改（问题、字段、旧值、新值），并等待明确确认。除非用户批准完整列表，否则绝不在一次确认后批处理多个写入。
5. 写入之后，用 `get_issue` 确认结果，因为若干写入工具只返回 ID 或一个裸的确认。

## 触发条件

在以下情况使用本技能：
- “显示我的 bug”、“项目 X 中未关闭的问题”、“本周到期的严重问题”、“分配给 Y 的问题”
- “记录一个 bug”、“创建问题”、“把这个 bug 分配给”、“更改严重程度”、“关闭问题”、“重新打开这个 bug”
- “把这个问题移到另一个项目”、“克隆这个 bug”、“删除这个问题”
- “把这些问题关联为重复”、“哪些问题与这个关联”、“把这个 bug 与任务关联”、“哪些任务修复了这个问题”
- “给这个 bug 添加评论”、“关注这个问题”、“添加解决方案”、“给问题附加文件”
- “这个问题什么时候变更了状态”、“问题活动”、“谁更改了这个 bug”
- 问题过滤上的 `PATTERN_NOT_MATCHED` 或被拒绝的模式、状态或严重程度上的 `INVALID_PARAMETER_VALUE`、`INVALID_STATUS_TRANSITION`、对受派人的过滤返回零行

未涵盖：任务过滤与任务依赖（使用 `zoho-projects-tasks`）、阶段记录本身（使用 `zoho-projects-phases`）、在问题上记录工时（使用 `zoho-projects-timelogs`）、给问题打标签（使用 `zoho-projects-tags`）、已保存的问题视图（使用 `zoho-projects-custom-views`）以及 blueprint 转换（使用 `zoho-projects-blueprints`）。

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/issues-basics.md` | 问题 ID、门户与项目列出、分页、排序、自定义视图、我的问题、问题详情、描述、活动、状态历史 |
| `references/issues-filters.md` | 构建问题 `filter` 对象、条件、值编码、日期、自定义字段过滤、过滤错误 |
| `references/issues-create-update.md` | 创建与更新问题、状态、严重程度、分类、受派人、报告人、截止日期、标记、提醒、标签、自定义字段、移动、克隆、删除、导出 |
| `references/issues-links-and-tasks.md` | 问题到问题的链接与链接类型、问题到任务的关联 |
| `references/issues-collaboration.md` | 评论、关注者、关注与取消关注、解决方案、附件 |
