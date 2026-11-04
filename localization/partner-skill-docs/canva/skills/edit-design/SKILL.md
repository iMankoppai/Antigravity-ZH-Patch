---
name: canva-edit-design
description: 对现有 Canva 设计进行编辑——更改或修正文本、替换/插入/删除图像和视频、重排文本格式（大小、字重、样式、颜色、对齐、列表、行高）、重新定位或调整元素尺寸，以及更新标题。当用户想更改、编辑、更新、修正、翻译、替换或重排某个特定 Canva 设计中的内容时使用。这是其他 Canva 技能（例如 implement-feedback）所依赖的安全编辑引擎。
---

# Canva 设计编辑

对现有 Canva 设计应用编辑的规范、安全方式。每个会修改设计的 Canva 技能都应遵循这一确切协议：**开始事务 → 执行操作 → 提交（需批准）**。更改在提交前仅为草稿，若未提交将**永久丢失**。

## 事务协议（始终按以下步骤执行）

1. **`Canva:start-editing-transaction`**——传入 `design_id`。记住返回的 `transaction_id` 和 `pages` 数组；两者都是后续调用所必需的。始终向用户展示此处返回的缩略图。
2. **`Canva:perform-editing-operations`**——应用编辑。传入 `transaction_id`、上一个响应中的 `pages` 数组、第一个被更改页面的 `page_index`，以及一个 `operations` 数组。尽可能将多个操作合并到单次调用中。
3. **`Canva:commit-editing-transaction`**——保存。见下方批准关卡。提交后，`transaction_id` 失效；新的编辑需要新的事务。
4. **`Canva:cancel-editing-transaction`**——丢弃草稿而不保存（例如用户拒绝预览，或你仅为检查设计而打开了事务）。

## 能力——API 能做与不能做的事

### 能做（`perform-editing-operations` 上的操作）
- **文本内容**：`replace_text`（整个元素）、`find_and_replace_text`（子串）
- **文本格式**（`format_text`）：字号、字重（normal/bold）、样式（normal/italic）、颜色、对齐、行高、下划线、删除线、链接、列表层级/标记
- **媒体**：`update_fill`（替换图像/视频）、`insert_fill`（添加图像/视频）、`delete_element`
- **布局**：`position_element`、`resize_element`
- **元数据**：`update_title`
- **自动填充映射**：`update_autofill_field`（仅固定页面设计）

### 不能做
- 更改字体**家族/字样**（只能改大小、字重、样式）
- 添加**新文本元素**（只能插入媒体，不能新增文本框）
- 更改背景颜色或渐变
- 添加、移除或重排页面/幻灯片
- 修改动画、过渡或元素不透明度（新插入的填充除外）
- 组合/取消组合元素，或重设形状样式（只有形状内的文字可编辑）

当请求的更改属于“不能做”清单时，告诉用户该更改必须在 Canva 编辑器中手动完成——不要尝试变通方案。

## 响应式页面——受限的操作集

某些页面返回时会标记 `is_responsive: true`。在这些页面上，仅允许以下操作：
`update_title`、`replace_text`、`update_fill`、`delete_element`、`find_and_replace_text`。

在调用 `perform-editing-operations` 之前，检查 `pages` 数组。若任何操作针对响应式页面且使用了不支持的操作（例如 `format_text`、`position_element`、`resize_element`、`insert_fill`），不要发起调用——告诉用户该页面不支持该操作，并提供替代方案。

## 提交批准关卡（必需）

`commit-editing-transaction` 会使更改永久生效。在提交前，你**必须**向用户准确展示更改了什么（以及预览缩略图）并获得明确批准——例如“这是预览。要将这些更改保存到你的设计吗？”等待明确的同意。

- 未经批准**不要**提交。
- 在提交调用成功之前，**不要**告诉用户更改已保存。
- 提交成功后，给用户一个可直接在 Canva 中打开该设计的链接。
- 若提交失败，所有更改都会丢失——开始新的事务以重试。

> 给组合技能编写者的说明：一个已为一批更改收集了单次前置批准的技能（例如 `canva-implement-feedback`）应将该批准视为覆盖提交，**不要**再次询问。遵循该技能自身的确认规则；上述关卡是直接、临时编辑的默认设置。

## 工作流

### 步骤 1：解析设计
- 短链接（`canva.link/...`）→ `Canva:resolve-shortlink` 获取 URL。
- 完整 Canva URL → 提取设计 ID（`/design/` 之后的片段）。
- 原始设计 ID（以 `D` 开头）→ 直接使用；不要搜索。
- 未提供任何内容 → 询问设计 ID 或链接。

### 步骤 2：开始事务并检查
调用 `Canva:start-editing-transaction`。展示缩略图。使用返回的内容定位你需要作为目标的准确 `element_id`。（若你只需查看，调用 `cancel-editing-transaction` 并停止。）

### 步骤 3：构建并执行操作
将用户请求转化为具体操作。当某个 `find_and_replace_text` 字符串可能在多个位置或上下文中匹配时，先确认范围——询问他们指的是哪些实例。尽可能将所有操作合并到一次 `perform-editing-operations` 调用中。

### 步骤 4：预览并提交
展示生成的缩略图以及一份平实语言描述更改内容的列表。请求批准，然后 `commit-editing-transaction`。分享编辑链接。

## 规则
- 始终在一个事务内记住并复用 `transaction_id` 和 `pages` 数组。
- 绝不在未告知用户其草稿已被丢弃的情况下让事务保持未提交状态。
- 对于破坏性操作（`delete_element`、大范围 `find_and_replace_text`），在执行前确认范围。
- 优先使用一次批量的 `perform-editing-operations` 调用，而非多次小调用。
