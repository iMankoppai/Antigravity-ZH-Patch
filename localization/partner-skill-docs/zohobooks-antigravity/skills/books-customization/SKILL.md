---
name: books-customization
description: 配置 Zoho Books 自定义字段、自定义视图、自定义模块、相关列表、报告标签和 Web 标签页。当用户想要一个新字段、一个筛选视图、一条自定义模块记录或一个报告标签时使用。
---

## 操作说明
1. 先检查：针对该实体的 `list_custom_fields` / `get_entity_fields_meta` / `get_fields_meta`；`list_custom_modules` / `get_custom_module`；`list_custom_views`；`get_tags`；`list_related_lists`；`list_web_tabs`。
2. **字段：** `create_custom_field` 用于指定实体和数据类型。下拉选项更改：`update_field_dropdown_options`。激活/停用：`update_field_status`。重新排序：`reorder_custom_fields`。创建前确认实体、API 名称和类型 —— schema 更改会影响每一条记录。
3. **视图：** `create_custom_view` 使用 Zoho 筛选语法 —— 形如 entity.field_name 的美元花括号占位符（例如：invoice.status；自定义字段：invoice.cf_text_field）。要匹配空/null，使用值 PLACEHOLDER.EMPTY。公式字段：保存前用 `check_formula_syntax` 检查。
4. **模块/记录：** 仅当用户想要新模块时才使用 `create_custom_module`。记录：`list_custom_module_records` / `create_custom_module_record` / `update_custom_module_record` / `bulk_update_custom_module_records`。
5. **相关列表 / Web 标签页：** 确认放置位置后，使用创建/更新/重排/状态工具。
6. **报告标签：** `create_tag`（以草稿开始）；用 `active_tag` 启用它；`update_tag_options` / `active_tag_option`；`reorder_tags`；`mark_default_option`。
7. 任何写入之后，报告实体、名称和状态。删除字段、模块、视图、标签或标签页时须经明确确认。已用于交易的标签/字段通常不能删除。

完整工具名称：`${PLUGIN_ROOT}/references/mcp-tools.md`（只读匹配的章节）。
