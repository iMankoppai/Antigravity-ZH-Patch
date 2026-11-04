---
name: canva-branded-presentation
description: 根据大纲或简报创建符合品牌的 Canva 演示文稿。当用户要求创建品牌演示文稿、制作符合品牌的演示文稿、将大纲转化为幻灯片，或根据简报生成演示文稿时使用。输入可以是消息中的文本、Canva 设计 ID、按名称引用的 Canva 文档，或 Canva 设计链接（例如 https://www.canva.com/design/...）。
---

# Canva 品牌演示文稿创建器

根据用户提供的大纲或简报，在 Canva 中创建专业、符合品牌的演示文稿。

## 工作流

1. **获取内容来源**
   - 若用户直接提供文本，则将其作为大纲/简报
   - 若用户直接提供 **Canva 设计 ID**（通常以 `D` 开头，例如 `DABcd1234ef`），则将其作为 `design_id` 配合 `Canva:start-editing-transaction` 读取其内容；**不要**对原始 ID 使用 `Canva:search-designs`
   - 若用户提供 Canva 设计链接（例如 `https://www.canva.com/design/DAG.../...`），从 URL 中提取设计 ID，并使用 `Canva:start-editing-transaction` 读取其内容
   - 若用户按名称引用 Canva 文档，使用 `Canva:search-designs` 找到它，然后用 `Canva:start-editing-transaction` 读取其内容

2. **列出可用的品牌套件**
   - 调用 `Canva:list-brand-kits` 检索用户的品牌套件
   - 若只存在一个品牌套件，则自动使用它而无需询问
   - 若存在多个品牌套件，呈现选项并请用户选择一个

3. **生成演示文稿**
   - 调用 `Canva:generate-design`，参数为：
     - `design_type`：“presentation”
     - `brand_kit_id`：所选的品牌套件 ID
     - `query`：按下方演示文稿格式撰写的详细提示词
   - 向用户展示生成的候选

4. **完成**
   - 询问用户偏好哪个候选
   - 调用 `Canva:create-design-from-candidate` 创建可编辑的设计
   - 向用户提供其新演示文稿的链接

## 演示文稿查询格式

按以下章节为 `Canva:generate-design` 组织查询：

**演示文稿简报**
- 标题：演示文稿的工作标题
- 主题/范围：1-2 行描述主题
- 关键信息：3-5 个主要要点
- 风格指南：基于简报的语气和图像风格

**叙事弧线**
一段话描述故事流向（例如 Hook → Problem → Solution → Proof → CTA）。

**幻灯片计划**
对每张幻灯片包含：
- 幻灯片 N — “标题原文”
- 目标：一句话说明该幻灯片的用途
- 要点（3-6）：简短、平行措辞并附具体细节
- 视觉：明确的建议（图表类型、示意图、图像主题）
- 演讲者备注：2-4 句叙述性细节

## 说明

- 若存在多个品牌套件，在生成前确认选择；若只有一个，则自动使用
- 若大纲稀疏，将其扩展为包含合理内容的完整幻灯片计划
- 对于简报（叙述性描述），提取关键点并组织成幻灯片
- 力求清晰、以行动为导向的幻灯片标题
- 自动填充需要 Canva Enterprise 套餐
