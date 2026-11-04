---
name: books-items-taxes
description: 管理 Zoho Books 项目、价格表、税费、税组、税务机关和免税。当用户想要添加或更改产品或服务、设置价格表，或记录用户指定的税费时使用。
---

## 操作说明
1. 项目：`list_items` / `get_item` / `list_item_details`。创建之前，先搜索是否有现有匹配项。`create_item` 含 `name`、`rate`、`product_type`（`goods` 或 `service`），可选 `sku`、`description`、`unit`、`tax_id`。`mark_item_active` / `mark_item_inactive`。CRM：当 Books–CRM 产品同步开启时，使用 `import_item_using_crm_product_id`。
2. 价格表：`list_pricebooks`；`create_pricebook` / `update_pricebook`；`mark_pricebook_active` / `mark_pricebook_inactive`。创建价格表前先确认。
3. 税费：`list_taxes` / `get_tax`；`create_tax` 含 `tax_name` 和 `tax_percentage`。税组：`create_tax_group`。税务机关/免税：`create_tax_authority` / `create_tax_exemption`（必须启用销售税）。不要就税率提供建议 —— 只记录用户指定的内容。使用中的税费通常不能编辑或删除。
4. 任何写入之后，报告项目或税费名称和状态。
5. `delete_item` / `delete_pricebook` / `delete_tax`（以及税组/税务机关/免税）只在明确确认具体记录后才执行。有交易记录的项目不能删除。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
