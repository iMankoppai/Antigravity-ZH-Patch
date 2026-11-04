---
name: books-contacts
description: 查找、创建和更新 Zoho Books 客户和供应商，包括联系人、地址、门户访问、对账单、1099 跟踪和 CRM 导入。当用户要求查找某个联系人、添加客户或供应商、通过邮件发送对账单，或从 CRM 同步时使用。
---

## 操作说明
1. 用 `list_contacts` 搜索（名称、邮箱、公司、状态）。使用 `get_contact` 获取余额、地址和条款。`list_contact_persons` / `get_contact_person` 用于该联系人下的个人。
2. 创建之前，先搜索是否有匹配项；如果找到，展示它并询问是否复用它。
3. `create_contact` 需要 `contact_name` 和 `contact_type`（`customer` 或 `vendor`）。在给出时，包含公司、邮箱、电话、货币、付款条款、税费以及账单/收货地址。用 `create_contact_person` 添加个人；用 `add_contact_address` 添加额外地址。
4. 更新：确认后，用 `update_contact` / `update_contact_person` / `update_contact_address` 仅更新已更改的字段。`mark_contact_active` / `mark_contact_inactive`。在被要求时使用 `mark_contact_person_primary`。
5. 对账单和邮件：`email_contact_statement`（用 `get_contact_statement_mail` 预览）；`email_contact` 用于一次性消息。门户：`enable_contact_portal`。提醒：`enable_contact_payment_reminder` / `disable_contact_payment_reminder`。
6. 美国 1099：仅当组织所在国家是美国且用户要求时，才使用 `track_contact_1099` / `untrack_contact_1099`。
7. CRM 导入（需要 Books–CRM 同步）：`import_customer_using_crm_contact_id`、`import_customer_using_crm_account_id`、`import_vendor_using_crm_vendor_id`。
8. 任何写入之后，报告联系人名称、类型和 id。删除联系人/个人/地址（`delete_contact` / `delete_contact_person` / `delete_contact_address`）时，必须经明确确认并指明该记录。有交易记录的联系人可能会被拒绝删除。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
