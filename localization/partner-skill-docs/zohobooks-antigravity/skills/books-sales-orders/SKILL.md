---
name: books-sales-orders
description: 创建、审批、履行和查看 Zoho Books 销售订单和交货单。当用户想要确认客户订单、发货、将交货单标记为已交付或已退回，或将订单转换为发票时使用。
---

## 操作说明
1. 确定客户（`list_contacts`，类型 customer）、项目（`list_items`）和税费（`list_taxes`）。如果有多个匹配项就询问。
2. **销售订单：** `create_sales_order`，含 `customer_id`、`date`、`shipment_date`、`line_items`。先确认总额和货币。
3. 生命周期：`submit_sales_order` / `approve_sales_order`；`mark_sales_order_as_open` / `mark_sales_order_as_void`；`update_sales_order_sub_status`。邮件：`email_sales_order`。从 SO 生成发票：`create_invoice_from_salesorder` 或 `map_invoice_with_salesorder`。
4. **交货单：** `create_delivery_challan`（需要客户）。状态：`mark_delivery_challan_as_open` / `mark_delivery_challan_as_delivered` / `mark_delivery_challan_as_undelivered` / `mark_delivery_challan_as_returned`。部分退货：`return_delivery_challans` / `undo_return_delivery_challans`。
5. 查看：`list_sales_orders` / `get_sales_order`；`list_delivery_challans` / `get_delivery_challan`。按需添加附件和评论。
6. `update_sales_order` / `update_delivery_challan` 在 get 之后进行。任何写入之后，报告单据编号、总额、状态和货币。`delete_sales_order` / `delete_delivery_challan` 只在明确确认单据编号后才执行。已开票的 SO 不能删除。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
