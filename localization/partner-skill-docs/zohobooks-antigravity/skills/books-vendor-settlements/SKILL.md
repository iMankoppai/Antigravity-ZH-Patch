---
name: books-vendor-settlements
description: 在 Zoho Books 中记录供应商付款和供应商信用 —— 支付账单、应用信用、退还超额款项，或开具供应商信用。当用户想要向供应商付款、应用供应商信用，或退还供应商超额付款时使用。
---

## 操作说明
1. 确定供应商（`list_contacts`）和未结账单（`list_bills`）。对于信用，按需确定项目/科目。
2. **供应商付款：** `create_vendor_payment`，含 `vendor_id`、`amount`、`date`、`payment_mode` 以及要应用的账单（`bill_id`、`amount_applied`）。先确认分配。邮件收据：`email_vendor_payment`（用 `get_vendor_payment_email_content` 预览）。
3. **供应商信用：** `create_vendor_credit` 用于退货、超额付款或调整。生命周期：`submit_vendor_credit` / `approve_vendor_credit`；`mark_vendor_credit_open` / `mark_vendor_credit_void`。应用：`apply_credits_to_bill` / `apply_credits_to_a_bill`。
4. 退款：`refund_excess_vendor_payment` 或 `refund_vendor_credit`。银行数据流：`categorize_bank_transaction_as_vendor_payment`、`categorize_as_vendor_payment_refund`、`categorize_as_vendor_credit_refunds`。
5. 查看：`list_vendor_payments` / `get_vendor_payment`；`list_vendor_credits` / `get_vendor_credit`。
6. `update_vendor_payment` / `update_vendor_credit` 在 get 之后进行。任何写入之后，报告付款或信用编号、金额、状态和货币。`delete_vendor_payment` / `delete_vendor_credit` / `bulk_delete_vendor_payments` 只在明确确认具体付款或信用编号后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
