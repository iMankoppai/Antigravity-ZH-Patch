---
name: zoho-projects-tasklists
description: "Zoho Projects 任务列表：列出、查找、创建、重命名、完成、重新打开、移到阶段、从阶段分离、克隆与将任务列表移入回收站；默认的 General 列表；内部与外部列表；任务列表评论与关注者；任务列表模板（把列表保存为模板、浏览模板及其任务、把模板应用到项目）。适用于项目 X 中有哪些任务列表、创建任务列表、把此列表放到里程碑下、克隆列表、把列表标记为已完成、评论任务列表、关注任务列表、保存为模板、从模板创建列表、shift_date 缺失、状态被 PATTERN_NOT_MATCHED 拒绝、milestone id 被拒绝、列表标记被更改、克隆返回 500 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后 project_id，然后任务列表 ID（路径变量 `tasklists_id`，复数）。对于模板，用 `get_task_lists_from_template` 解析模板 ID；它与生成它的任务列表是不同的 ID。ID 是数字字符串，绝不是名称；只使用本会话中某个工具返回的、或用户给出的 ID。关于列出、过滤、分页与详情，加载 `references/tasklists-basics.md`。
3. 路由到与请求匹配的参考：
   - 创建、重命名、完成、阶段变更、标记、标签、默认的 General 列表、移入回收站：`references/tasklists-create-update.md`
   - 任务列表上的评论与关注者：`references/tasklists-collaboration.md`
   - 保存为模板、浏览模板、克隆列表或应用模板：`references/tasklists-templates.md`
4. 在任何 create、update、clone、template、comment、follow 或 trash 之前，向用户准确展示将发生什么更改（任务列表、字段、旧值、新值），并等待明确确认。保存模板是门户范围的，且没有删除模板的工具；在询问之前说明这一点。
5. 写入之后，用 `get_task_list_details` 或 `get_all_project_task_lists` 确认结果，因为若干写入工具返回无正文的 204，而且失败的模板克隆仍可能留下一个新的空列表。

## 触发条件

在以下情况使用本技能：
- “列出项目 X 中的任务列表”、“哪些列表在此里程碑下”、“查找 Design 列表”、“跨所有项目的任务列表”
- “创建任务列表”、“重命名列表”、“把列表标记为已完成”、“重新打开列表”、“把此列表移到 Beta 阶段”、“把列表移出其阶段”
- “为客户创建一个外部列表”、“创建 General 列表”、“删除此任务列表”、“把列表移入回收站”
- “评论任务列表”、“编辑那条评论”、“关注此任务列表”、“谁关注此列表”
- “把此列表保存为模板”、“我们有哪些任务列表模板”、“模板中有哪些任务”、“克隆此列表”、“从模板创建列表”
- `status` 或 `pattern` 上的 `PATTERN_NOT_MATCHED`、`INVALID_PARAMETER_VALUE` “Please send valid milestone id”、`URL_RULE_NOT_CONFIGURED`、`shift_date` 上的 `INPUT_PARAMETER_MISSING`、`comment` 上的 `LESS_THAN_MIN_OCCURANCE`、403 “External task list cannot be associated with an internal Milestone”、来自 `clone_task_list` 的 500

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/tasklists-basics.md` | ID 解析、项目与门户列出、过滤、排序、分页、每个列表的任务计数、任务列表详情、未分配阶段哨兵值 |
| `references/tasklists-create-update.md` | 创建与更新列表、名称、状态、阶段、标记、标签、默认的 General 列表、移入回收站与恢复 |
| `references/tasklists-collaboration.md` | 任务列表评论（添加、读取、编辑、删除）与关注者（关注、取消关注、列出） |
| `references/tasklists-templates.md` | `make_task_list_as_template`、模板列出、模板任务、从活动列表或模板 `clone_task_list` |
