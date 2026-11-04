---
name: books-fixed-assets
description: 跟踪 Zoho Books 固定资产 —— 取得、激活以计提折旧、预测、出售或核销。当用户想要添加资产、开始折旧、出售资产，或查看资产历史时使用。
---

## 操作说明
1. 类型：在添加新类别的资产之前，先 `get_fixed_asset_type` / `create_fixed_asset_type`。
2. `create_fixed_asset`，按用户指定的内容填写类型、名称、取得日期和金额、折旧方法/比率。先确认摘要。不要凭空编造折旧比率。
3. 生命周期：`mark_fixed_asset_draft` / `mark_fixed_asset_active`（开始折旧）/ `mark_fixed_asset_cancel`。处置：`sell_fixed_asset` 或 `write_off_fixed_asset` —— 确认处置收益和日期。
4. 查看：`list_fixed_assets` / `get_fixed_asset`；`get_fixed_asset_history`；`get_fixed_asset_forecast` 用于未来折旧。
5. `update_fixed_asset` / `update_fixed_asset_type` 在 get 之后进行。任何写入之后，报告资产名称、状态和带货币的金额。`delete_fixed_asset` / `delete_fixed_asset_type` 只在明确确认并指明资产后才执行。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
