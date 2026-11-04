---
name: forms-builder
description: |
  创建和编辑 monday.com WorkForms——把响应捕获为后端看板上新条目的公开
  受理表单。适用于请求受理、Bug 报告、线索捕获、活动报名、内部提交，
  以及任何把用户提交的表单变成受跟踪工作条目的流程。
  当用户要求“create a form”、“build an intake form”、“make a
  WorkForm”、“add a question to my form”、“edit form questions”、“publish
  a form”、“share a form link”、“set up a request form”、“add a form to a
  board”、“remove the monday branding from my form”或“deactivate the
  form”时使用。
license: MIT
metadata:
  author: monday.com
  version: "0.1.1"
---

# 表单构建器

创建、编辑并发布 monday.com WorkForms。每个 WorkForm 都与一个后端看板配对：每次表单提交都会成为该看板上的一个新条目，表单的问题映射到看板的列。表单是前门，看板是目的地。

## 核心约束——先读这个

**WorkForms 只会创建新条目。它们无法更新现有条目。** 这是平台的硬性约束，不是技能的限制。如果用户要求一个“让人更新其工单”或“编辑现有条目”的表单，请为他们改道：新提交可以通过一个连接看板的问题关联到现有条目，但提交表单始终会在表单的看板上创建新的一行。对于状态更新风格的流程，建议另一种方式（条目级更新字段、单独的更新跟踪看板，或一个按引用查找并更新的自动化）。

## 套餐层级说明

表单随每个 monday 套餐提供，包括 Free 与 Basic。**WorkForms 品牌（“Powered by monday.com”）默认显示，且只能在 Pro 及以上套餐移除。** 如果用户要求移除品牌，请先检查套餐或提醒他们：这需要 `updateAppearance` 配合 `hideBranding: true`，且会在 Free / Basic / Standard 上静默失败。

## 工作流：创建表单

### 步骤 1：确认目标工作区

表单必须位于某个工作区中。若未指定则询问，或使用用户的主工作区。如需选择，调用 `list_workspaces`。工作区 ID 是 `create_form` 唯一必需的参数。

### 步骤 2：确定表单的用途，然后调用 `create_form`

表单的用途决定问题集。常见形态：

- **Bug 报告：** 标题、严重程度、环境、复现步骤、截图上传、报告人邮箱。
- **功能请求：** 标题、描述、用例、业务影响、客户数量、链接。
- **线索捕获：** 姓名、工作邮箱、公司、角色、是什么把您带到这里。
- **活动报名：** 姓名、邮箱、饮食需求、场次偏好。
- **内部请求：** 请求人、请求类型（单选）、背景、截止日期、优先级。

调用 `create_form`，传入：
- `destination_workspace_id`（必需）
- `destination_name`（看板名称；省略时默认为表单标题）
- `destination_folder_id` 或 `destination_folder_name`，若用户想将看板放入特定文件夹
- `board_kind` 默认为 `public`；若表单的响应敏感则使用 `private`

记下返回的 `formToken`——后续每次编辑都需要它。

**`create_form` 不接受表单标题参数。** 表单页眉默认是“New Form”，与 `destination_name` 无关（后者只命名后端看板）。始终在 `create_form` 之后接一次 `update_form` 调用，使用 `action: "updateFormHeader"` 设置一个有意义的标题（以及可选的副标题/描述），然后再把 URL 展示给用户。跳过这一步会让每个表单在 WorkForms UI 中都标为“New Form”——对最终用户和浏览表单列表的表单所有者都很困惑。

### 步骤 3：构建问题集

对每个问题使用 `form_questions_editor` 配合 `action: "create"`。根据字段意图决定问题类型：

| 意图 | 类型 |
|---|---|
| 自由文本，单行 | `ShortText` |
| 自由文本，多行 | `LongText` |
| 是/否 | `Boolean` |
| 多选一 | `SingleSelect`（长列表设 `display: "Dropdown"`，短列表设 `Vertical`） |
| 多选多 | `MultiSelect` |
| 数值 | `Number` |
| 金额 / 数量 / 评分 | `Number` |
| 日期 | `Date` |
| 日期范围 | `DateRange` |
| 邮箱 | `Email` |
| 电话 | `Phone` |
| 网页 URL | `Link` |
| 国家 | `Country` |
| 地址 / 地图点 | `Location` |
| 文件上传 | `File` |
| 评分（1-5） | `Rating` |
| 人员 / 受派人 | `People` |
| 静态说明 | `DISPLAY_TEXT` |
| 分节标题 | `PAGE_BLOCK` |
| 关联现有条目 | `ConnectedBoards` |
| 提交人姓名 | `Name` |
| 评论 / 更新字段 | `Updates` |
| 电子签名 | `Signature` |

仅对真正阻止提交的字段设置 `required: true`。过多的必填字段会降低响应率。

对于 `SingleSelect` 与 `MultiSelect`，`options` 是必需的。每个选项需要一个 `label` 与一个稳定的 `value`。平台在创建时可能会把字符串 `value` 规范化为数字字符串（`"0"`、`"1"`、`"2"`……），因此你发送的 `value` 是尽力而为——务必在创建后调用 `get_form` 回读规范的选项值，然后再进行后续编辑。一旦表单有了实时提交，规范值就不得更改——更改它会破坏过往响应的数据完整性。

### 步骤 4：在发布前向用户展示问题集

所有问题创建完成后，用 markdown 表格或指向后端看板的 `show-table` 部件总结它们。包括问题文本、类型以及是否必填。在激活表单之前请用户确认或编辑。

### 步骤 5：确认公开访问并分享

表单创建时**默认处于活动状态**。`create_form` 返回时表单 URL 立即可用。如果用户想要草稿状态（问题仍在塑造中），立即用 `action: "deactivate"` 调用 `update_form`，完成问题后再在准备好时 `activate`。否则，按原样分享 URL。表单 URL 遵循以下模式：

```
https://forms.monday.com/forms/{formToken}?r=use1
```

在响应中包含表单 URL 与后端看板 URL。用户会需要两者——表单用于分享，看板用于监控提交。

### 步骤 6：建议后续步骤

以 2-3 个下一步建议结尾：

- **“要我把布局从 OneByOne 切换为 Classic 吗？”**——新表单默认是 OneByOne（每屏一个问题，Next 导航）。Classic（所有问题在一个可滚动页面上）对大多数运营与内部表单是更好的默认。每次都提示这个选择。布局更改目前无法通过 MCP 应用（见下文）；该建议把用户指向 monday UI 中的 Form Settings -> Layout。
- “要我把表单 URL 缩短吗？”
- “要我在表单上设置密码吗？”
- “要我把这个链接发送到某个 Slack 频道吗？”
- “要我设置提交上限或关闭日期吗？”
- “想移除 WorkForms 品牌吗？（仅 Pro+。）”

**已知 MCP 缺口：表单布局无法通过 API 更改。** `update_form` 配合 `action: "updateAppearance"` 接受 `layout.format` 且不报错，但该值会被静默忽略——表单保持 OneByOne。已在多种参数组合中确认。不要尝试该 API 调用并报告成功；更改不会持久。请把用户引导到表单编辑器中的 Form Settings -> Layout，并用平实语言带他们完成。把这一缺口反馈给 monday MCP 团队。

## 工作流：编辑现有表单

### 步骤 1：解析 formToken

如果用户粘贴表单 URL，提取令牌：`https://forms.monday.com/forms/{TOKEN}?r=use1` -> `{TOKEN}` 是 `/forms/` 与 `?` 之间的字母数字字符串。

如果用户说出表单名称，用 `search` 工具配合 `searchType: "BOARD"` 找到后端看板，然后针对任意候选令牌调用 `get_form`。（MCP 目前没有直接的表单搜索工具；表单可通过其支持的后端看板触及。若这阻塞了用户，请将其标记为已知缺口。）

### 步骤 2：获取当前状态

用 formToken 调用 `get_form`。这返回问题、结构、外观与功能标志。写之前始终先读——补丁是合并式的，缺少上下文会导致更新出错。

### 步骤 3：应用更改

选择正确的工具：

- **添加 / 更新 / 删除单个问题：** `form_questions_editor`。
- **重新排序问题：** `update_form` 配合 `action: "updateQuestionOrder"` 与问题 ID 的完整有序数组。
- **页眉（标题与描述）：** `update_form` 配合 `action: "updateFormHeader"`。
- **品牌、布局、颜色、徽标：** `update_form` 配合 `action: "updateAppearance"`。
- **提交规则（匿名、响应上限、关闭日期、需要登录、验证码）：** `update_form` 配合 `action: "updateFeatures"`。
- **激活 / 停用 / 缩短 URL / 设置密码：** 相应的操作。

### 步骤 4：确认

用平实语言总结：改了什么、什么保持不变，以及表单 URL。不要叙述 API 调用。

## 常见编辑

**在末尾添加一个问题：** `form_questions_editor` 配合 `action: "create"`，不带 `insert_after_question_id`。问题会追加。

**在两个现有问题之间插入一个问题：** 调用 `get_form` 获取前驱的 ID，然后用 `insert_after_question_id: "<predecessor_id>"` 创建。

**使字段必填：** `form_questions_editor` 配合 `action: "update"`、问题的 `id`、现有的 `type` 与 `required: true`。更新时始终必须发送 `type` 字段。

**更新选择题的选项而不丢失过往响应：** 先调用 `get_form`，把每个现有选项的 `value` 复制到更新中，然后只添加或修改标签。省略某个现有选项会删除它。

**有条件地显示/隐藏问题：** 对问题使用 `show_if_rules`。规则可用 AND/OR 组合，条件引用其他问题 ID 与答案值。

**重新排序问题：** `update_form` 配合 `action: "updateQuestionOrder"` 与完整有序列表——每个现有问题 ID 都必须出现，即使未改变。重排落地后，调用 `get_form` 重新同步问题 ID——任何 `PAGE_BLOCK`（分节标题）ID 都会在重排时由平台重新分配（例如 `page_block__classic_default` 变为 `page_block77dy0px4`）。若跳过重新同步，缓存的 PAGE_BLOCK ID 会在下次编辑时 404。

**同步问题标题与列名：** `update_form` 配合 `action: "updateFeatures"` 与 `monday.syncQuestionAndColumnsTitles: true`。当用户编辑后端看板并希望表单跟随变化时有用。

**移除 WorkForms 品牌（Pro+）：** `update_form` 配合 `action: "updateAppearance"` 与 `appearance.hideBranding: true`。

**关闭表单以拒绝新响应：** `update_form` 配合 `action: "deactivate"`。用 `action: "activate"` 重新激活。要在某个日期关闭，使用 `updateFeatures` 配合 `closeDate.enabled: true` 与 `closeDate.date: "<ISO timestamp>"`。

**为表单设置密码保护：** `update_form` 配合 `action: "setFormPassword"` 与 `formPassword: "<password>"`。单独传达密码——它不会出现在表单 URL 中。

## 明智的默认值

当用户未指定所有值时：

- **表单名称与看板名称：** 如果用户给表单命名，后端看板的名称默认与之匹配。在响应中说明该默认值。
- **工作区：** 若未提供则询问一次。不要猜。
- **必填标志：** 默认 false，除了显而易见的主标识符（线索表单上的邮箱、Bug 报告上的标题）。
- **问题顺序：** 用户列出的顺序，自上而下。
- **创建后表单处于活动状态：** 是——`create_form` 返回一个活动的、可公开访问的表单。如果用户想在响应进来之前先预览，立即调用 `deactivate`，准备好后再重新激活。
- **表单标题：** `create_form` 默认页眉为“New Form”。创建后始终通过 `update_form` 的 `action: "updateFormHeader"` 显式设置标题——使用用户声明的表单名称（若缺失，则用表单的用途，例如“Bug Intake”）。在确认中说明该标题。
- **布局：** 平台默认是 `OneByOne`（每问一卡）。对大多数运营与内部表单，`Classic`（单一滚动页面）是更好的默认——在步骤 6 的后续中提示这一点，不要静默依赖 OneByOne。该选择目前无法通过 MCP 触及；请把用户引导到表单编辑器中的 Form Settings -> Layout。
- **品牌：** 默认保留 WorkForms 品牌；把 Pro+ 移除作为后续提及，而不是自动切换。

## 错误预防与补救

- **WorkForms 无法更新现有条目。** 若被要求，改道到内部条目更新字段、链接到现有条目的连接看板问题，或单独的更新跟踪工作流。不要承诺平台不支持的行为。
- **表单 URL 返回“form is not available”：** 表单已被停用、达到响应上限，或过了关闭日期。检查 `get_form` 的功能状态。用 `update_form` 的 `action: "activate"` 重新激活、提高响应上限，或延长关闭日期。
- **`updateQuestionOrder` 拒绝该调用：** 问题数组必须包含每个现有问题 ID。先调用 `get_form`，列出所有 ID，然后发送完整的有序列表。
- **PAGE_BLOCK 问题 ID 在 `updateQuestionOrder` 后会更改。** 平台在每次重排时都会重新分配 `PAGE_BLOCK` 分节标题问题的 ID（例如 `page_block__classic_default` 变为 `page_block77dy0px4`）。务必在 `updateQuestionOrder` 之后立即调用 `get_form`，并在下次编辑之前刷新任何缓存的 PAGE_BLOCK ID，否则后续引用旧 ID 的 `form_questions_editor` 调用会 404。
- **删除选择项是破坏性的：** 更新 `SingleSelect` 或 `MultiSelect` 并省略某个现有选项会删除它，破坏使用该选项的过往响应。编辑时始终发送所有选项。
- **`hideBranding: true` 不会生效：** 该账户的套餐低于 Pro。告诉用户该约束；不要重试。
- **问题类型在创建后无法更改：** 要“转换”问题类型，请删除并重新创建。原问题的过往响应会丢失。删除前请与用户确认。
- **`existing_column_id`：** 仅在用户明确要求该问题指向某个特定看板列时才设置。否则让表单自动创建列，以保持接线干净。

## 何时使用 MCP UI 部件

有选择地使用 `show-table`，而非默认使用：

- **发布前：** 当问题集超过 5 项时，用 `show-table` 渲染后端看板，让用户能在一个视图中浏览问题到列的映射。对于较短的问题集，纯文本总结更干净。
- **发布后：** 如果用户问“这周进来了什么”，针对后端看板配合日期过滤的 `show-table` 是正确答案。激活、停用与单问题编辑用纯文本确认即可。

不要用 `show-table` 确认单个编辑——表单 URL 加一行确认就足够了。

## 对破坏性操作保持保守

以下操作之前始终确认：

- 删除有先前提交的问题（数据会丢失）。
- 删除已被使用过的选择项（该选项的过往响应会变成孤儿）。
- 停用一个面向公众的表单（现有链接会失效）。
- 删除后端看板（也会删除表单）。

单问题创建与非破坏性编辑不需要额外确认——用户已经提出了要求。

## 使用的工具

- `list_workspaces` —— 若未提供则定位目标工作区
- `create_form` —— 创建表单及其后端看板（返回 `formToken`）
- `get_form` —— 按 formToken 读取当前表单状态（编辑前始终先读）
- `update_form` —— 11 个操作，涵盖页眉、外观、可访问性、功能、问题顺序、标签、激活、密码、URL 缩短
- `form_questions_editor` —— 创建 / 更新 / 删除单个问题
- `search` —— 当仅知道表单用途时按名称查找后端看板
- `get_user_context` —— 未指定时回退到用户的主工作区
- `show-table`（有选择地）—— 为问题集审查或响应浏览渲染后端看板

## 附加说明

- `formToken` 是表单 URL 中的字母数字片段：`https://forms.monday.com/forms/{TOKEN}?r=use1`。把它当作表单的主键。
- 后端看板的条目代表提交。编辑看板列不会编辑表单问题——表单侧请使用 `form_questions_editor`。`monday.syncQuestionAndColumnsTitles` 功能标志有助于让二者保持一致。
- 需要登录的表单（`features.requireLogin.enabled: true`）会把提交限制为同一账户中的 monday.com 用户。
- 对于多语言表单，通过 `update_form` 的 `action: "updateAccessibility"` 设置 `accessibility.language`。结合 `features.ai_translate.enabled: true` 以使用 AI 生成的翻译。
