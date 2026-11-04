---
name: canva-translate-design
description: 将 Canva 设计中的所有文本翻译成另一种语言，创建一份翻译副本。比在 Canva 编辑器中手动复制并编辑每个文本框更快。当用户说“把我的设计翻译成[语言]”、“做一个西班牙语/法语等版本”，或“本地化我的 Canva 设计”时使用。
---

# Canva 翻译

将 Canva 设计中的所有文本元素翻译成目标语言，创建一份内容已翻译的新副本。

## 工作流

### 1. 定位设计

若用户直接提供**设计 ID**（通常以 `D` 开头，例如 `DABcd1234ef`），则将其作为设计标识符；**不要**将其传给 `Canva:search-designs`（搜索用于标题，而非 ID）。

若用户提供 **URL**：从 URL 中提取设计 ID（格式：`https://www.canva.com/design/{design_id}/...`）。

若用户提供**名称**：使用 `Canva:search-designs` 按标题查找设计。若有多个匹配，请用户澄清。

### 2. 创建翻译副本

使用 `Canva:resize-design` 以相同尺寸创建一份副本。这会保持原始设计不被改动。

### 3. 开始编辑事务

在新的副本上使用 `Canva:start-editing-transaction` 以获得：
- 用于编辑的 `transaction_id`
- 所有文本元素及其 `element_id` 和当前文本内容

### 4. 翻译文本

对返回的每个文本元素：
1. 将文本翻译成目标语言（使用 Claude 的翻译能力）
2. 保留格式线索（换行、强调模式）
3. 酌情保留专有名词、品牌名称和技术术语

### 5. 应用翻译

对全部已翻译元素，使用 `Canva:perform-editing-operations` 配合 `replace_text` 操作。将所有替换批量放入单次调用。

同时更新设计标题以指示语言（例如追加“ (Spanish)”或使用翻译后的标题）。

### 6. 提交更改

在向用户展示翻译后的预览缩略图后：
1. 请求明确批准以保存
2. 使用 `Canva:commit-editing-transaction` 完成
3. 提供指向新翻译设计的链接

## 示例交互

**用户**：把我的“Summer Sale Poster”翻译成法语

**步骤**：
1. 搜索：用查询“Summer Sale Poster”调用 `Canva:search-designs`
2. 复制：`Canva:resize-design` 创建副本
3. 编辑：在副本上调用 `Canva:start-editing-transaction`
4. 将所有文本元素翻译成法语
5. 应用：`Canva:perform-editing-operations` 执行所有 `replace_text` 操作
6. 展示预览、获取批准、提交

## 重要说明

- 始终创建副本——绝不修改原始设计
- 将所有文本替换批量放入一次 `perform-editing-operations` 调用以提高效率
- 若翻译显著改变了文本长度，提醒用户可能需要在 Canva 中调整布局
- 对于多页设计，在同一事务中翻译所有页面
