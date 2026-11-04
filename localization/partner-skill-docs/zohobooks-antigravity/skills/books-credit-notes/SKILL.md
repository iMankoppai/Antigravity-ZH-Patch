---
name: books-credit-notes
description: 开具、应用、退还和查看 Zoho Books 贷项通知单。当用户想要给客户开具贷记、将贷记应用到发票、退还贷记，或作废贷项通知单时使用。
---

## 操作说明
1. 确定客户（`list_contacts`）、项目（`list_items`）、税费（`list_taxes`）以及原始发票（`list_invoices` / `get_invoice`，当贷记与之相关时）。
2. `create_credit_note`，含客户、日期、行项目（退回的项目、超额付款或调整）。先确认总额和货币。
3. 生命周期：`submit_credit_note` / `approve_credit_note`；`mark_credit_note_open` / `mark_credit_note_draft` / `mark_credit_note_void`。邮件：`email_credit_note`。
4. 应用到发票：`apply_credit_note_to_invoice` 或 `apply_credits_to_invoice`。用 `list_invoices_of_credit_note` / `list_invoice_credits_applied` 查看应用情况。用 `delete_invoice_applied_credit` 移除。
5. 退款：`create_credit_note_refund`；银行数据流：`categorize_as_credit_note_refunds`。
6. `update_credit_note` 在 `get_credit_note` 之后进行。任何写入之后，报告贷项通知单编号、总额、状态和货币。`delete_credit_note` / `delete_credit_note_refund` 只在明确确认贷项通知单编号后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
