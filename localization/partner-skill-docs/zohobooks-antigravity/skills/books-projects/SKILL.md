---
name: books-projects
description: 管理 Zoho Books 项目、任务和时间记录，包括计时器和项目用户。当用户想要创建项目、记录时间、开始或停止计时器，或为项目工作开票时使用。
---

## 操作说明
1. 当项目按客户计费时，确定客户（`list_contacts`）。用户：`list_users`。
2. 项目：`create_project`，含名称、客户（如果可计费）、计费类型和用户。先确认。`clone_project` 复制现有项目。`mark_project_active` / `mark_project_inactive`。
3. 用户：`add_project_user` / `invite_project_user` / `update_project_user` / `delete_project_user`。
4. 任务：`add_project_task` 或 `add_task`。状态：`mark_task_as_open` / `mark_task_as_ongoing` / `mark_task_as_completed`；`update_percentage_task`。按需添加评论/附件。
5. 时间：`create_time_entries`，含项目、任务、用户、日期和小时数（或开始/结束）。实时计时器：`get_running_timer`、`start_entry_timer`、`stop_entry_timer`。
6. 项目发票：`list_project_invoices`；使用项目/时间行项目通过 books-invoicing 创建。
7. 查看：`list_projects` / `get_project`；`list_time_entries` / `get_time_entry`。任何写入之后，报告项目或时间记录 id 以及小时数。删除（`delete_project`、`delete_task`、`delete_time_entry`）只在明确确认后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
