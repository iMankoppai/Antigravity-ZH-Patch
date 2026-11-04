---
name: books-journals
description: 创建和查看 Zoho Books 手工日记账和会计科目表条目，包括发布草稿日记账。当用户想要一条日记账分录、一个新的分类账科目，或查看科目活动时使用。
---

## 操作说明
1. 用 `list_chart_of_accounts` / `get_chart_of_account` 确定科目。绝不要猜测科目 ID。
2. 日记账：`create_journal`，含日期、备注和平衡的 `line_items`（account_id、借或贷）。借方必须等于贷方，且以组织的基础货币计。先确认分录表格。
3. 用 `mark_journal_published` 发布草稿。评论/附件：`add_journal_comment`、`add_journal_attachment`。
4. 会计科目表：`create_chart_of_account` 含科目类型和名称；`mark_chart_of_account_active` / `mark_chart_of_account_inactive`。用 `list_chart_of_account_transactions` 查看活动。
5. 查看：`list_journals` / `get_journal`。`update_journal` / `update_chart_of_account` 在 get 之后进行。
6. 任何写入之后，报告日记账编号或科目名称和货币。`delete_journal` / `delete_chart_of_account` 只在明确确认后才执行。已用于交易或项目的科目不能删除。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
