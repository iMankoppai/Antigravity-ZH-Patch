---
name: books-purchases
description: 创建、审批、通过邮件发送和查看 Zoho Books 采购订单，包括将 PO 转换为账单。当用户想要向供应商订购、查看未结 PO，或将 PO 标记为已开票时使用。
---

## 操作说明
1. 确定供应商（`list_contacts`，类型 vendor）、项目（`list_items`）和税费（`list_taxes`）。如果有多个匹配项就询问。
2. `create_purchase_order`，含 `vendor_id`、`date`、`delivery_date`、`line_items`。先确认总额和货币。
3. 生命周期：`submit_purchase_order` / `approve_purchase_order` / `reject_purchase_orders`；`mark_purchase_order_open` / `mark_purchase_order_cancelled` / `mark_purchase_order_billed`。邮件：`email_purchase_order`。
4. 转换为账单：`convert_purchase_order_to_bill`（从 PO id 获取 payload，然后 `create_bill`）。
5. 查看：`list_purchase_orders` / `get_purchase_order`；评论和附件通过 `list_purchase_order_comments`、`add_purchase_order_comment`、`add_purchase_order_attachment`。
6. `update_purchase_order` 在 `get_purchase_order` 之后仅更新已更改的字段。任何写入之后，报告 PO 编号、总额、状态和货币。`delete_purchase_order` 只在明确确认 PO 编号后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
