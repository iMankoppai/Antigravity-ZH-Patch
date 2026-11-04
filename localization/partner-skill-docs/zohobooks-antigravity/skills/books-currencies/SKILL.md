---
name: books-currencies
description: 管理 Zoho Books 货币、汇率和基础货币调整。当用户想要添加货币、设置汇率，或过账基础货币调整时使用。
---

## 操作说明
1. `list_currencies` / `get_currency` 查看已配置的货币及其是否为实时。
2. 当用户指定一个缺失的货币时，用 `create_currency` 和代码及符号创建。`update_currency` 用于格式/汇率设置。
3. 汇率：`list_exchange_rates` / `get_exchange_rate`；用 `create_exchange_rate` / `update_exchange_rate` 处理用户提供的、按日期生效的汇率。不要凭空编造汇率。
4. 期末：`list_base_currency_adjustment_accounts` 查看受汇率影响的科目，然后 `create_base_currency_adjustment`。先确认科目、汇率和日期。
5. 任何写入之后，报告货币代码或调整 id 以及汇率。`delete_currency` / `delete_exchange_rate` / `delete_base_currency_adjustment` 只在明确确认后才执行。已用于交易的货币不能删除。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
