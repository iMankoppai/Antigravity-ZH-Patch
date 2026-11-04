---
name: canva-design-feedback
description: 读取 Canva 设计并返回结构化、可执行的设计反馈——视觉层级、文案/信息、布局与间距、一致性、可读性和无障碍性。只读；不更改设计。当用户要求“审查我的设计”、“给我这个的反馈”、“点评我的演示文稿/海报/传单”、“我如何改进这个设计”，或“这张幻灯片有什么问题”时使用。
---

# 获取设计反馈

作为设计评审者：按设计实际呈现的样子阅读它，然后返回用户可执行的具体、有优先级的反馈。此技能是**只读**的——它绝不编辑设计。当用户希望做出更改时，交给 `canva-edit-design` 或 `canva-implement-feedback`。

## 你实际能读到什么（以及需要知道的缺口）

- **`Canva:get-design-content`** 只返回文本（`richtexts`）——适合文案、标题和措辞，但不包含颜色、字体、字号或元素位置。
- **`Canva:get-design-thumbnail`** 给你渲染后的图像——这是你“看到”布局、层级、平衡、颜色和对比度的方式。始终拉取它；视觉点评依赖于此。
- **元素位置、尺寸和文本**可从**只读**编辑事务中可靠获取：`Canva:start-editing-transaction`，检查返回的 `richtexts`/`fills`，然后 `Canva:cancel-editing-transaction`（绝不提交——你没有在更改任何东西）。用于布局/间距/对齐细节。
- **颜色和字体不会被可靠暴露。** 经测试：事务载荷常常只为每个元素返回文本 + 位置 + 尺寸，没有颜色或字体属性。因此将**缩略图视为任何颜色、对比度或排版判断的主要来源**，并将事务样式数据视为尽力而为（存在时使用，不要依赖它）。除非载荷确实包含，否则绝不要把具体十六进制值/字体当作事实报告。

## 工作流

### 步骤 1：解析设计
短链接 → `Canva:resolve-shortlink`；完整 URL → 提取 ID；原始 `D...` ID → 直接使用；否则询问。

### 步骤 2：读取设计
- `Canva:get-design` 获取标题和页数。
- `Canva:get-design-thumbnail`（和/或 `Canva:get-design-pages`）查看每一页。
- `Canva:get-design-content` 获取文本。
- 可选（排版/颜色细节）：如上所述的只读事务，然后取消它。

### 步骤 3：跨维度评估
根据以下视角评估设计。跳过不适用于该设计类型的任何视角：

- **视觉层级**——目光是否首先落在最重要的东西上？标题/副标题/正文的对比。
- **布局与间距**——对齐、平衡、拥挤、一致的边距/栏间距。
- **文案与信息**——清晰度、长度、语气、拼写错误、行话，每页一个清晰的要点。
- **一致性**——跨页面重复的字体、字号、颜色和间距。
- **可读性与对比度**——文本大小 vs. 观看场景、图像上文字的可读性、颜色对比度。
- **无障碍性**——对比度、替代文本、不单靠颜色传达的文字。
- **契合目的**——是否适合所述渠道/受众（幻灯片 ≠ Instagram 帖子 ≠ 传单）？

### 步骤 4：返回结构化反馈
按**页面**组织发现，每项都带**严重程度**和**具体的修复**：

```
## Feedback — "<design title>" (N pages)

### Top priorities
1. [High] Page 2 — Title competes with the body text (same size/weight).
   Fix: bump the title to ~1.5× and bold it so it reads first.
2. [High] Page 4 — White caption over a light photo is hard to read.
   Fix: darken the image or add a scrim; or move the caption to a solid band.

### Page-by-page
**Page 1** — [Med] Three different accent colors; pick one. [Low] "recieve" → "receive".
**Page 2** — ...

### What's working
- Consistent margins; strong cover image.
```

使用**高 / 中 / 低**的严重程度。先列少数最高影响项，然后是逐页细节。要具体且定位明确（页面 + 元素），而非泛泛（“让它更吸引人”）。

### 步骤 5：提议行动
结尾提议通过 **`canva-edit-design`** 实现 API 可修复的项，并指出哪些项需要在 Canva 中手动完成（例如 API 无法触及的字体家族或背景更改——完整的“不能做”清单见 `canva-edit-design`）。

## 规则
- 绝不编辑或提交任何东西——此技能严格只读。若你打开事务以检查，始终 `cancel-editing-transaction`。
- 将每一点都建立在你在缩略图或内容中实际观察到的东西上——不要泛泛的建议。
- 排定优先级。一份排名的短清单胜过用户不会读完的详尽清单。
- 坦诚但有建设性；始终将问题与具体的修复配对。
