---
name: canva-resize-for-social-media
description: 将 Canva 设计调整为多种社交媒体格式（Facebook 帖子、Facebook 快拍、Instagram 帖子、Instagram 快拍、LinkedIn 帖子）。当用户想要在一次操作中专门为多个社交媒体平台调整 Canva 设计尺寸，而不是手动调整为单一格式时，使用此技能。
---

# Canva 社交媒体尺寸调整

自动将单个 Canva 设计调整为多种社交媒体格式。

## 概述

此技能通过取用单个 Canva 设计并为其创建优化版本，实现快速的多平台内容分发：
- Facebook 帖子
- Facebook 快拍
- Instagram 帖子
- Instagram 快拍
- LinkedIn 帖子

所有调整后的版本都会附上 Canva 编辑链接，以便用户可直接在 Canva 中进一步编辑或下载。

## 工作流

### 步骤 1：识别源设计

确定用户想调整哪个 Canva 设计。可通过三种方式提供：

1. **直接设计 ID**：用户提供设计 ID（以“D”开头）
   - 示例：“resize design DABcd1234ef for all social media”
   - 直接使用设计 ID 配合 `get-design` 工具检索设计信息
   
2. **直接设计 URL**：用户提供 Canva 设计链接
   - 示例：“resize https://www.canva.com/design/DABcd1234ef/... for all social media”
   - 从 URL 中提取设计 ID（`/design/` 之后、下一个 `/` 或查询参数之前的部分）
   - 使用提取出的设计 ID 配合 `get-design` 工具
   
3. **按设计名称搜索**：使用 `search-designs` 工具，以设计名称作为查询
   - 示例：“resize my Demo Brand Template: Brix&Hart Flyer design for all social media”
   - 使用用户提供的准确名称/短语作为搜索查询
   - 若找到多个匹配，呈现选项并请用户选择一个
   
4. **当前上下文**：若用户刚在对话中创建或编辑了某个设计，使用该设计 ID

**实现说明**：按名称搜索时，将设计名称直接作为查询参数传给 `search-designs`。该工具将根据设计标题找到最佳匹配。

### 步骤 2：检索源设计信息

使用 `get-design` 工具配合设计 ID 以：
- 确认设计存在且可访问
- 获取设计标题（用于为调整后的版本命名）
- 验证设计类型兼容性

### 步骤 3：询问平台与格式

呈现可用格式并询问用户想要哪些：

```
Which platforms and formats would you like to resize for?

- Facebook post (1200×630)
- Facebook story (1080×1920)
- Instagram post (1080×1080)
- Instagram story (1080×1920)
- LinkedIn post (1200×627)
```

若用户说“all”或“all social media”，使用全部五种。否则仅调整他们选择的那些。

### 步骤 4：调整为所选格式

通过为每个所选格式调用一次 `resize-design` 工具，**并行**执行调整操作。使用以下确切规格：

**可用格式与尺寸：**

1. **Facebook 帖子**：1200 × 630 像素（自定义）
   ```
   design_type: { type: "custom", width: 1200, height: 630 }
   ```

2. **Facebook 快拍**：1080 × 1920 像素（自定义）
   ```
   design_type: { type: "custom", width: 1080, height: 1920 }
   ```

3. **Instagram 帖子**：1080 × 1080 像素（自定义）
   ```
   design_type: { type: "custom", width: 1080, height: 1080 }
   ```

4. **Instagram 快拍**：1080 × 1920 像素（自定义）
   ```
   design_type: { type: "custom", width: 1080, height: 1920 }
   ```

5. **LinkedIn 帖子**：1200 × 627 像素（自定义）
   ```
   design_type: { type: "custom", width: 1200, height: 627 }
   ```

**注意**：Facebook 快拍和 Instagram 快拍尺寸相同。创建两者，但告知用户它们尺寸相同。

**错误处理**：若某个调整操作失败，继续处理剩余格式，并在最后报告哪些格式成功、哪些失败。

### 步骤 5：呈现结果与编辑链接

**向用户呈现全面的结果：**

向用户提供一份摘要，包含：

1. **摘要**：确认哪些格式成功创建
2. **设计编辑链接**：每个调整后设计的 Canva 编辑器 URL，以便用户进一步编辑或直接从 Canva 下载
3. **关于重复的说明**：提及 Facebook 快拍和 Instagram 快拍尺寸相同

**呈现格式示例：**
```
✅ Successfully resized your design for all social media platforms!

Edit Links:

**Facebook Post** (1200×630)
- [Edit in Canva](edit_url)

**Facebook Story** (1080×1920)
- [Edit in Canva](edit_url)

**Instagram Post** (1080×1080)
- [Edit in Canva](edit_url)

**Instagram Story** (1080×1920)
- [Edit in Canva](edit_url)

**LinkedIn Post** (1200×627)
- [Edit in Canva](edit_url)

Note: Facebook Story and Instagram Story use the same dimensions (1080×1920).
```

**实现细节**：
- 设计编辑链接来自 `resize-design` 工具的响应（使用每个调整后设计的 `urls.edit_url` 字段）
- 将链接呈现为可点击的 URL，而不仅是纯文本
- 按平台组织以便于浏览

## 关键实现说明

- **兼容性**：检查当前 MCP 工具中是否可用 `resize-design`。若不可用，告知用户此技能需要当前宿主中的 Canva MCP resize 工具
- **并行执行**：调整操作应并行执行以提高效率
- **命名一致**：使用源设计标题加平台后缀为调整后的设计命名
- **错误韧性**：若任何操作失败，完成剩余操作并清楚报告成功/失败的内容
- **用户确认**：步骤之间不需要用户批准——除非发生错误，否则自动执行整个工作流
- **格式准确性**：始终使用上面为每个平台指定的确切像素尺寸
