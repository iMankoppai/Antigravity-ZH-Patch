---
name: zoho-projects-timelogs
description: "Zoho Projects 时间日志（工时表）：在任务、问题或作为一般条目记录工时、批量添加日志、代他人记录工时、标记可计费或不可计费、编辑日志、按项目或门户、日、周、月或自定义日期范围读取日志、每日与每周合计、我本周的工时表、通过回收站移除错误日志。适用于在此任务上记录 2 小时、添加我的工时表、我本周记录了多少小时、把此日志改为可计费、删除时间日志、重复日志、Please enter time in the 24 hour format、Log name cannot be empty、Daily log hours are restricted to 24:00、Time log is allowed for 0 day(s) from current date、Time log cannot be added for unconfirmed users、log_object 上的 JSON_PARSE_ERROR、TIMESHEET_ADD、TIMESHEET_BULK_ADD、RANGE_NOT_SATISFIABLE 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置以及 ID、用户与分页规则。
2. 按顺序解析 ID：portal_id，然后 project_id，然后记录工时对应的 task_id 或 issue_id，然后现有日志的 timelog_id。负责人取 ZPUID（来自 `get_all_users_in_a_project` 的 `id`），绝不是 ZUID。只使用本会话中某个工具返回的、或用户给出的 ID。关于读取日志、日期范围与合计，加载 `references/timelogs-basics.md`。
3. 路由到与请求匹配的参考：
   - 读取日志、view_type、日期范围、合计、“我本周的工时表”：`references/timelogs-basics.md`
   - 添加单个或批量日志、代他人、可计费状态、编辑日志、避免重复、移除日志：`references/timelogs-create-update.md`
4. 在任何 add、bulk add、update 或 trash 之前，向用户准确展示将写入什么（条目、日期、小时数或开始与结束时间、可计费状态、负责人、备注），并等待明确确认。绝不虚构或四舍五入小时数；如果小时数是推断的，先询问。先读取同一条目与日期的现有日志，因为服务器会不加警告地接受完全重复的内容。
5. 写入之后，用 `get_time_logs_by_time_log_id`（传匹配的 `type`）或通过 `get_time_logs_by_project` 重新读取当天来确认结果。

## 触发条件

在以下情况使用本技能：
- “在任务 X 上记录 2 小时”、“给这个 bug 添加 30 分钟”、“为团队会议记录一个一般条目”
- “填写我本周的工时表”、“批量记录这些小时”、“为 Priya 记录工时”
- “我本周记录了多少小时”、“显示此项目十月份的时间日志”、“本月的可计费小时”
- “把此日志改为可计费”、“修正昨天日志的小时数”、“重命名一般日志”
- “删除此时间日志”、“我记录了两次”、“恢复时间日志”
- `TIMESHEET_ADD`、`TIMESHEET_BULK_ADD`、“Please enter time in the 24 hour format”、“Please enter duration in hours”、“Log name cannot be empty”、“Daily log hours are restricted to 24:00 hour(s)”、“Time log is allowed for 0 day(s) from current date and time”、“Time log cannot be added for unconfirmed users”、`log_object` 上的 `JSON_PARSE_ERROR`、日期、小时数或 bill_status 上的 `PATTERN_NOT_MATCHED`、`RANGE_NOT_SATISFIABLE`、来自时间日志调用的 500

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/timelogs-basics.md` | 读取工具、`module` 参数、view_type 与日期范围、响应形状与合计、分页、过滤、我的工时表、按 ID 获取单个日志 |
| `references/timelogs-create-update.md` | `add_time_log`、`add_bulk_time_logs`、`update_single_time_log`、小时格式、开始与结束时间、可计费状态、任务、问题或一般条目、代他人、重复、移除日志（无删除工具） |
