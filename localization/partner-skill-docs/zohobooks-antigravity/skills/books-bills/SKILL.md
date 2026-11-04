---
name: books-bills
description: 记录、审批和查看 Zoho Books 供应商账单及重复性账单。当用户想要录入供应商账单、将采购订单转换为账单、应用供应商信用，或设置重复性账单时使用。
---

## 操作说明
1. 确定供应商（`list_contacts`）、项目（`list_items`）、费用/资产科目（`list_chart_of_accounts`）和税费（`list_taxes`）。
2. `create_bill`，含 `vendor_id`、`bill_number` 或自动编号、`date`、`due_date`、`line_items`。来自 PO：先 `convert_purchase_order_to_bill` 再 `create_bill`。先确认总额和货币。
3. 生命周期：`submit_bill` / `approve_bill`；`mark_bill_open` / `mark_bill_void`。评论/附件：`add_bill_comment`、`add_bill_attachment`。
4. 信用：`apply_credits_to_bill`（供应商信用或超额供应商付款）。查看 `list_bill_payments` / `list_bills_credited`。
5. 重复性：`create_recurring_bill`；`stop_recurring_bill` / `resume_recurring_bill`；`list_recurring_bills` / `get_recurring_bill`。
6. 用 `create_vendor_payment` 支付账单（books-vendor-settlements）。任何写入之后，报告账单编号、总额、状态和货币。
7. `update_bill` / `update_recurring_bill` 在 get 之后进行。已有付款的账单不能删除。`delete_bill` / `delete_recurring_bill` 只在明确确认账单编号后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
