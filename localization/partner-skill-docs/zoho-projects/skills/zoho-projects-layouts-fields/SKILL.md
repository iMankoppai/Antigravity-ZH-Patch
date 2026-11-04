---
name: zoho-projects-layouts-fields
description: "Zoho Projects 布局、自定义字段、分节与选项列表选项：列出、读取、创建、重命名与删除布局；查找默认布局以及哪些项目使用某布局；创建、重命名、移动、取消关联与删除字段；创建、重命名与删除分节；添加、重命名、取消关联与删除选项列表选项；检查字段类型限制。适用于添加自定义字段、添加带选项的选项列表、为团队新建布局、哪些布局使用此字段、从布局移除字段、重命名分节、还剩多少个自定义字段、ALREADY_NAME_EXISTS、OPTION_ALREADY_EXISTS、NOT_EMPTY_SECTION、创建字段时 500、选项上缺少 layout_id 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后模块（来自 `get_modules` 的 `api_name` 或 `id`），然后 layout_id，然后 section_id、field_id 与选项 ID。ID 是数字字符串，绝不是名称。只使用本会话中某个工具返回的、或用户给出的 ID。关于读取字段与选项 ID，见 `zoho-projects` 技能、`references/fields-and-options.md`；本技能涵盖更改它们。
3. 路由到与请求匹配的参考：
   - 列出、读取、创建、重命名或删除布局、默认布局、使用某布局的项目：`references/layouts-manage.md`
   - 创建、重命名、移动、取消关联或删除字段与分节、字段类型限制：`references/layouts-fields-sections.md`
   - 添加、重命名、取消关联或删除选项列表与状态选项：`references/layouts-picklist-options.md`
4. 布局、字段、分节与选项的变更会影响使用它们的每个项目与记录。在任何写入之前，向用户准确展示将发生什么更改（模块、布局、分节、字段或选项、旧值、新值）以及哪些布局与项目受影响（`get_associated_layouts`、`get_associated_entities_of_layout`），然后等待明确确认。除非用户点名并确认，否则绝不更改默认布局或默认字段。
5. 写入之后，用 `get_layout_details` 或 `get_fields` 确认结果。删除与取消关联工具只返回“Empty response received from API ... 204”消息。

## 触发条件

在以下情况使用本技能：
- “给任务添加自定义字段”、“创建下拉字段”、“给选项列表添加选项”、“重命名字段”、“把这个字段设为必填”
- “从这个布局移除字段”、“删除自定义字段”、“哪些布局使用此字段”
- “为支持团队创建布局”、“复制默认布局”、“重命名布局”、“删除布局”、“哪些项目使用此布局”、“默认布局是什么”
- “添加分节”、“重命名分节”、“把分节移到顶部”、“删除分节”
- “重命名选项”、“移除选项”、“我能添加多少个选项列表字段”
- 403 `ALREADY_NAME_EXISTS`、403 `OPTION_ALREADY_EXISTS`、403 `NOT_EMPTY_SECTION`、400 `INPUT_PARAMETER_MISSING` `layout_id`、来自 `create_or_update_field` 或 `update_a_layout` 的 500 `INTERNAL_SERVER_ERROR`

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/layouts-manage.md` | 布局列表与详情、默认布局、通过克隆创建、重命名、项目关联、删除布局 |
| `references/layouts-fields-sections.md` | 字段创建与更新请求体、`field_property`、字段类型与限制、分节、取消关联与删除字段 |
| `references/layouts-picklist-options.md` | 创建、重命名、取消关联与删除选项列表与状态选项 |
