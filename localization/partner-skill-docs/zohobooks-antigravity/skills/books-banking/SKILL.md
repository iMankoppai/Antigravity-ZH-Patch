---
name: books-banking
description: 管理 Zoho Books 银行和信用卡账户、数据流、规则和核对 —— 匹配、分类、排除或恢复交易。当用户想要核对某条银行流水、导入对账单，或设置银行规则时使用。
---

## 操作说明
1. 账户：`list_bank_accounts` / `get_bank_account`。确认名称、类型和货币后，用 `create_bank_account` 创建（银行账户或信用卡）。`mark_bank_account_active` / `mark_bank_account_inactive`。
2. 交易：`list_bank_transactions` / `get_bank_transaction`。核对时优先处理未分类的。
3. 匹配现有的 Books 活动：`get_matching_bank_transactions`，然后 `match_bank_transaction`。用 `unmatch_bank_transaction` 撤销。
4. 对新的流水进行分类：`categorize_bank_transaction`，或使用带类型的辅助工具 —— `categorize_bank_transaction_as_customer_payment`、`categorize_bank_transaction_as_vendor_payment`、`categorize_bank_transaction_as_expense`、`categorize_bank_transaction_as_payment_refund`、`categorize_as_credit_note_refunds`、`categorize_as_vendor_credit_refunds`。用 `uncategorize_bank_transaction` 还原。
5. 用 `exclude_bank_transaction` 排除噪声；用 `restore_bank_transaction` 恢复。
6. 规则：`list_bank_account_rules`；对重复性的存款/取款或退款/扣款模式使用 `create_bank_account_rule`。先确认规则条件。
7. 对账单：`import_bank_statements`；检查 `get_last_imported_bank_statement`；只有在明确确认后才用 `delete_last_imported_bank_statement` 撤销导入。
8. 匹配或分类之后，报告银行流水、操作以及匹配到的 Books 记录。删除银行账户/交易/规则（`delete_bank_account` / `delete_bank_transaction` / `delete_bank_account_rule`）时，必须经明确确认并指明账户或交易。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
