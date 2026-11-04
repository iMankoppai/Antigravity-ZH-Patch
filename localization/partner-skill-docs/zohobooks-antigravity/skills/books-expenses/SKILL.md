---
name: books-expenses
description: 记录、分类和分析 Zoho Books 费用、重复性费用和员工。当用户想要记录一笔费用、附加收据、按类别或供应商查看支出，或设置重复性费用时使用。
---

## 操作说明
1. 确定费用科目（`list_chart_of_accounts`）、付款账户（`list_bank_accounts`）、供应商（`list_contacts`）和税费（`list_taxes`）。员工：`list_employees`。
2. `create_expense`，含 `account_id`、`paid_through_account_id`、`date`、`amount`，可选 `vendor_id`、`tax_id`、`reference_number`、`description`、可计费标志。先确认摘要。用 `add_expense_attachment` 或 `create_expense_receipt` 附加文件。
3. 重复性：`create_recurring_expense`；`stop_recurring_expense` / `resume_recurring_expense`；通过 `list_child_expenses_of_recurring_expense` 查看子项。
4. 银行数据流：当匹配某条未分类的银行流水时，使用 `categorize_bank_transaction_as_expense`。
5. 分析：`list_expenses` 查询该期间（分页遍历），按科目或供应商分组，报告带货币的合计以及主要项目和异常值。
6. 员工：为员工记录费用时使用 `create_employee`；`delete_employee` 仅经明确确认后使用。
7. `update_expense` / `update_recurring_expense` 用于重新分类或更正。任何写入之后，报告费用 id 或编号、金额、科目和货币。`delete_expense` / `delete_recurring_expense` / `delete_expense_receipt` 仅在明确确认具体记录后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
