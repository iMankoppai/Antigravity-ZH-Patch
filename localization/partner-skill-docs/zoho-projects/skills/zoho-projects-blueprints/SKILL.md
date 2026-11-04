---
name: zoho-projects-blueprints
description: "Zoho Projects blueprint：列出门户中的任务 blueprint、预览某个 blueprint 的状态与转换、查找任务上可用的下一步转换、读取转换要求的字段、执行转换，以及读取问题的状态转换历史。适用于哪个 blueprint 适用于此任务、下一步是什么、把任务移到下一阶段、到关闭的路径、为什么我不能更改状态、转换需要必填字段、Entity not mapped with any Blueprint、转换被拒绝时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后从 `zoho-projects-tasks` 技能获取任务（entity_id），然后从 `get_blueprints_list` 获取 blueprint_id，然后从 `get_next_transitions` 或 `preview_blueprint` 获取 transition_id。ID 是数字字符串，绝不是名称。只使用本会话中某个工具返回的、或用户给出的 ID。
3. 对每个请求都加载 `references/blueprints-transitions.md`。它涵盖 blueprint 适用于哪些任务、预览、下一步转换、转换期间字段、执行转换以及问题状态历史。
4. 执行转换会更改任务状态，可能设置字段并运行自动化。执行前，向用户展示任务、其当前状态、转换名称、目标状态以及将要提交的每个字段值，并等待明确确认。绝不凭推断执行转换，也绝不一次确认后串联多个转换。
5. 转换之后，用 `get_task_details` 确认新状态，并再次调用 `get_next_transitions` 展示接下来是什么。

## 触发条件

在以下情况使用本技能：
- “我们有哪些 blueprint”、“显示这个布局的 blueprint”、“这个 blueprint 有哪些阶段”
- “我这个任务接下来能做什么”、“把这个任务移到下一阶段”、“关闭这个任务需要什么”
- “为什么我不能更改这个任务的状态”、“转换要求填写字段”
- “执行 Approve 转换”、“运行下一个 blueprint 步骤”
- “这个 bug 的状态历史”、“谁把这个问题移到了 Closed”
- 403 “Entity not mapped with any Blueprint”、blueprint 上的 404 `RESOURCE_NOT_FOUND`、转换因缺少字段被拒绝、blueprint 下任务的状态更改被阻止

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/blueprints-transitions.md` | Blueprint 列表与预览、布局范围、下一步转换、转换期间数据、执行转换、问题状态转换历史 |
