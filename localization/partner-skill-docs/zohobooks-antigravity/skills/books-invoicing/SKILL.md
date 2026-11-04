---
name: books-invoicing
description: 创建、更新、发送和查看 Zoho Books 发票、报价单、重复性发票、预付款发票、销售收据、客户借项通知单和客户付款。当用户想要向客户开票、发送报价、收取款项、核销余额，或设置重复性发票时使用。
---

## 操作说明
1. 用 `list_contacts` 确定客户（类型为 customer），用 `list_items` 确定项目，用 `list_taxes` 确定税费。如果有歧义就询问。用 `list_invoices` / `get_invoice` 查看现有单据。
2. **发票：** `create_invoice`，含 `customer_id`、`date`、`due_date`、`line_items`（item_id 或名称、数量、单价、tax_id）。来自 SO：`create_invoice_from_salesorder`。先确认摘要（客户、行项目、税费、总额、货币）。
3. 生命周期：`submit_invoice` / `approve_invoice`；`mark_invoice_sent` / `mark_invoice_draft` / `mark_invoice_void`。邮件：`email_invoice` 或 `email_invoices`（最多 10 个）。提醒：`remind_customer_for_invoice_payment`、`bulk_invoice_reminder`（最多 10 个，仅开放/逾期）。链接：`generate_invoice_payment_link`。核销：`write_off_invoice` / `cancel_write_off_invoice`。
4. **报价单：** `create_estimate`；`mark_estimate_sent` / `mark_estimate_accepted` / `mark_estimate_declined`；`email_estimate`。
5. **重复性发票：** `create_recurring_invoice`；`stop_recurring_invoice` / `resume_recurring_invoice`；用 `list_recurring_invoices` / `get_recurring_invoice` 查看。
6. **预付款：** `create_retainer_invoice`；通过 `get_unused_retainer_payments` 查看未使用的信用。**销售收据：** `create_sales_receipt` 用于即时付款。**借项通知单：** `create_customer_debit_note` 用于发票上的额外收费。
7. **付款：** `create_customer_payment`，含 `customer_id`、`amount`、`date`、`payment_mode` 和 `invoices`（`invoice_id`、`amount_applied`）。用 `apply_credits_to_invoice` 应用现有信用。用 `create_customer_payment_refund` 退还超额部分。
8. 更改：先 `get_*`，然后用 `update_*` 仅更新已更改的字段。已付款/已发送的单据可能会有限制。
9. 任何写入之后，报告单据编号、总额、状态和货币。
10. 删除（`delete_invoice`、`delete_estimate`、`delete_recurring_invoice`、`delete_retainer_invoice`、`delete_sales_receipt`、`delete_customer_debit_note`、`delete_customer_payment`）需要用户确认具体的记录编号。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
