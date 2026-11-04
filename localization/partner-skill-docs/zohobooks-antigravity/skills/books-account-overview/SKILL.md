---
name: books-account-overview
description: Zoho Books 组织概览 —— 组织详情、用户、期初余额、地点、会计科目表、应收/应付、损益式洞察、收入和主要支出。当用户询问业务经营状况、损益、哪些逾期、谁有访问权限，或想要进行组织/账户查询时使用。
---

## 操作说明
1. 调用 `list_organizations`；如果有多个，询问使用哪一个。使用 `get_organization` 获取基础货币和财务设置。使用 `get_current_user` 获取已登录用户。
2. 应收：`list_invoices` 按状态筛选（`overdue`、`unpaid`、`partially_paid`）；按客户和汇总统计总额。应付：`list_bills` 查询未付/逾期。说明货币和日期范围。
3. 活动：`list_customer_payments`、`list_vendor_payments`、`list_expenses` 查询指定期间。在合计之前先分页遍历（`page`/`per_page`）。
4. 查询：`list_bank_accounts`、`list_chart_of_accounts`、`list_users`、`list_locations`、`get_opening_balance`、`get_tags`。
5. 洞察（没有专门的报告工具）：从列表推导期间合计 —— 已开票（`list_invoices`）、已收款（`list_customer_payments`）、已支出（`list_expenses` + `list_bills`），以及主要客户/供应商。呈现一张简洁的表格。
6. 写入操作（`update_organization`、`create_user`/`invite_user`/`mark_user_active`/`mark_user_inactive`/`delete_user`、`create_opening_balance`/`update_opening_balance`/`delete_opening_balance`、`create_location`/`enable_locations`/`mark_location_primary`）需要明确的摘要和“是”。尽量不要创建额外的组织。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
