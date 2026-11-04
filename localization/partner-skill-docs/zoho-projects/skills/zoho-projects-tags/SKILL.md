---
name: zoho-projects-tags
description: "Zoho Projects 标签：列出门户标签与项目中使用的标签、创建、重命名、重新着色与删除标签、为任务及其他记录打标签与取消标签。适用于存在哪些标签、此项目中使用的标签、创建标签、重命名或更改标签颜色、删除标签、给此任务打标签、移除标签、打标签清掉了其他标签、EXISTING_TAGS、DUPLICATE_TAG、INVALID_TAG_COLOR、LESS_THAN_MIN_LENGTH、关联时 6404 Resource Not Found 或 6500 General Error 时。需要 ZohoProjects_* MCP 工具。"
metadata:
  version: "1.0.0"
---

## 工作原理

1. 检查 ZohoProjects_* MCP 工具是否可用。若不可用，停下来并加载 `zoho-projects` 技能进行连接设置。
2. 按顺序解析 ID：portal_id，然后 project_id（仅用于关联、取消标签与项目标签列表），然后 tag_id 与实体 ID。标签是门户范围的；标签 ID 来自 `get_all_tags`、`get_project_tags` 或创建响应，绝不来自标签名称。ID 是数字字符串；只使用本会话中某个工具返回的、或用户给出的 ID。
3. 路由到与请求匹配的参考：
   - 列出、创建、重命名、重新着色或删除标签：`references/tags-manage.md`
   - 为任务或其他记录打标签或取消标签：`references/tags-associate.md`
4. 在任何 create、update、associate、disassociate 或 delete 之前，向用户准确展示将发生什么更改（标签、记录、旧标签、新标签），并等待明确确认。`associate_tags_to_entity` 会替换记录的整个标签列表，而 `delete_tag` 会从使用该标签的每条记录中移除它；在询问之前说明这一点。
5. 写入之后验证它：回读该记录（对于任务，用 `get_task_details` 及其 `tags` 数组）或再次列出标签。关联、取消关联与删除工具只返回一个空的 204 确认，而且未知的标签 ID 会被接受而不报错。

## 触发条件

在以下情况使用本技能：
- “列出所有标签”、“此项目中使用了哪些标签”、“查找名为 X 的标签”
- “创建标签”、“添加 red 和 urgent 标签”、“重命名此标签”、“更改标签颜色”
- “删除此标签”、“从门户移除标签”
- “给此任务打上 urgent 标签”、“给这些任务添加标签”、“从此任务移除标签”、“替换任务的标签”
- 打标签移除了其他标签、标签已创建但 `tags` 数组为空、取消标签没有作用
- `EXISTING_TAGS`、`DUPLICATE_TAG`、`INVALID_TAG_COLOR`、`LESS_THAN_MIN_LENGTH`、关联或取消关联时错误码 6404 或 6500、取消标签时 404 `RESOURCE_NOT_FOUND`

## 参考

| 参考 | 在查询涉及……时加载 |
|-----------|---------------------------------|
| `references/tags-manage.md` | 门户与项目标签列表、过滤、分页、创建标签、颜色分类、重命名、重新着色、删除、标签错误 |
| `references/tags-associate.md` | 为记录打标签与取消标签、`entityType` 代码、替换语义、每次调用一个实体、ID 编码、任务更新上的添加/删除替代方案 |
