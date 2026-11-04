---
name: zoho-projects-phases
description: "Zoho Projects 阶段（原里程碑）：列出、过滤、创建、更新、关闭、重排与删除阶段；阶段负责人、状态、开始与结束日期、标记、标签、预算；阶段评论。适用于项目中的里程碑、即将到来或已逾期的阶段、创建里程碑、更改阶段结束日期、关闭阶段、关闭阶段被 403 阻止、owner_zpuid 或 status_id 被拒绝、阶段随其任务列表一起被删除时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 先加载 `zoho-projects` 技能。它检查 MCP 连接、设置 portal_id 与 project_id，并持有关于 ID、用户（ZPUID 与 ZUID）、字段 API 名称、选项 ID、分页与确认写入的共享规则。不要在此重复该设置。
2. 从阶段列表调用或创建响应中解析 phase_id；用户所说的“milestone ID”就是阶段 ID。只使用本会话中某个工具返回的、或用户给出的 ID。关于列出、过滤与分页，加载 `references/phases-basics.md`。
3. 路由到与请求匹配的参考：
   - 创建、编辑、关闭、重排或删除阶段：`references/phases-create-update.md`
   - 阶段评论：`references/phases-comments.md`
4. 在任何 create、update、delete 或 comment 之前，向用户准确展示将发生什么更改（阶段、字段、旧值、新值），并等待明确确认。删除阶段也会影响其任务列表与任务；在询问之前说明这一点。
5. 写入之后，用 `get_phase_details` 确认结果，因为写入工具除一个确认外返回的内容很少。

## 触发条件

在以下情况使用本技能：
- “列出里程碑”、“项目 X 中的阶段”、“哪些阶段本月结束”、“已逾期的阶段”
- “创建里程碑”、“添加阶段”、“重命名阶段”、“移动阶段结束日期”、“更改阶段负责人”
- “关闭这个里程碑”、“重新打开阶段”、“把这个阶段放到最前”
- “删除这个阶段”、“把里程碑移入回收站”
- “评论阶段”、“显示阶段评论”
- 关闭阶段时 403、负责人或状态上的 `INVALID_PARAMETER_VALUE`、编辑已关闭阶段失败、名称过长

未涵盖：任务属于哪个阶段以及在阶段之间移动任务（使用 `zoho-projects-tasks`；任务的阶段来自其任务列表）、问题的发布与受影响阶段（使用 `zoho-projects-issues`）、阶段下的任务列表（使用 `zoho-projects-tasklists`）、给阶段打标签（使用 `zoho-projects-tags`）。

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/phases-basics.md` | 阶段 ID、门户与项目列出、分页、排序、过滤、自定义视图、阶段详情 |
| `references/phases-create-update.md` | 创建与更新阶段、负责人、状态、日期、标记、标签、顺序、模板与预算字段、关闭、删除 |
| `references/phases-comments.md` | 列出、添加、编辑与删除阶段评论 |
