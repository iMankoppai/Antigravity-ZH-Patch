---
name: databricks-app-design
parent: databricks-apps
description: '设计自定义代码 Databricks Apps（AppKit/React）数据界面的用户体验 —— KPI/概览页、报表、图表、表格和 Genie/聊天数据助手 —— 映射到具体的 AppKit 组件。当构建或审查一个展示数据或回答数据问题的 AppKit/React 应用 UI 时使用：选择体裁、布局、图表、KPI、语义色、必需状态（加载/空/错误）、IBCS 记法和 AI 结果可信度（为 Genie/聊天展示生成的 SQL/来源）。单纯的"创建一个仪表板"请求意味着一个托管的 AI/BI（Lakeview）仪表板 → 使用 databricks-aibi-dashboards，而非本技能。也不适用于非数据前端（表单、设置、认证、营销）或脚手架/构建/部署（→ databricks-apps）。它补充 databricks-apps；只要自定义应用包含图表、表格、KPI、报表或 Genie/聊天/AI 界面，就一并使用。'
metadata:
  version: 0.1.0
---

# 数据应用设计

打造沟通清晰、并能编译为真实 AppKit 代码的 Databricks 数据 + AI 应用。本技能融合了两套知识体系，并将其绑定到实现：

- **构图** —— 展示什么、抽象到何种程度、如何布局 → `references/dashboard-patterns.md`
- **记法** —— 让可比的事物看起来可比；诚实的刻度；情景标记 → `references/ibcs-notation.md`
- **实现** —— 要使用的确切 AppKit 组件、hooks 和 tokens → `references/appkit-cheatsheet.md`

对于包脚本和项目本地的 CLI 工具，使用[父技能的包管理器选择和命令占位符](../databricks-apps/SKILL.md)。

不指名真实组件的设计建议是不完整的。始终以组件方案收尾。

## 何时使用 / 何时不用
- 用于：自定义代码 Databricks App（AppKit/React）的数据界面 —— 概览/KPI 页、报表、指标/本体页、差异分析、图表、表格和 Genie/NL 数据界面 —— 设计*或*评判。
- 不用于：编写托管的 **AI/BI（Lakeview）仪表板**（→ `databricks-aibi-dashboards`）、通用前端（表单、认证、设置、营销），或脚手架/构建/部署（→ `databricks-apps`）。**单纯的"创建一个仪表板" / "构建一个仪表板"请求（没有 app / AppKit / React / 自定义代码信号）意味着一个托管的 AI/BI（Lakeview）仪表板 → 使用 `databricks-aibi-dashboards`，而非本技能。** 如果请求是"添加一个表单"、"部署这个"或"构建一个 Lakeview / AI-BI 仪表板"，本技能不应触发。
- 关系：`databricks-apps` 构建/运行应用；本技能决定数据界面应该长什么样，以及用哪些原语来实现它们。

## 工作流
1. **框定** —— 受众、决策/问题、刷新节奏、设备、主要任务。一句话。
2. **体裁** —— 从 `dashboard-patterns.md` 中选择最接近的（静态 / 分析型 / 杂志型 / 信息图型 / 存储库型 / 嵌入式迷你型）。明确说明。
3. **构图** —— 选择内容 + 构图模式（数据抽象、元信息、布局、交互、颜色）。明确说明取舍：哪些被汇总、隐藏、分页或交互化 —— 以及为什么。
4. **应用记法** —— 运行相关的 `ibcs-notation.md` 规则：标题即信息、情景标记（actual/PY/plan/forecast）、诚实的刻度、语义色。在任何图表词汇冲突时，**IBCS 优先**（参见该文件中的冲突说明）。
5. **绑定到组件** —— 将每个元素映射到实际**从 `@databricks/appkit` / `@databricks/appkit-ui` 导出**的原语（参见 `appkit-cheatsheet.md`）；绝不要引用 AppKit 并未提供的组件。没有预构建的 KPI/趋势/分布卡片 —— 从原语组合这些，遵循记法规则。使用 `colorPalette` + 语义 tokens，绝不用硬编码的十六进制色值。用 `useAnalyticsQuery`/`queryKey` + `sql.*` 参数绑定数据。
6. **覆盖状态** —— 每个数据视图都必须处理加载 / 空 / 错误 / 部分（参见检查清单）。
7. **审查** —— 运行两个参考文件中的检查清单；评判时先讲影响最大的理解性或完整性问题，引用受影响的组件/文件。

## 必需状态与数据真实性（对数据应用不可妥协）
- **加载** → `Skeleton`；**空** → `Empty` 并给出有用的下一步操作；**错误** → 内联消息，绝不留空白面板；**部分/过期** → 展示你已有的数据 + 一条新鲜度说明。
- 每个 KPI 都显示单位 + 周期 + 对比 + **新鲜度/来源**（与指标定义一致；不要展示没有出处的数字）。
- 大表格 → 服务端分页/排序/筛选，而非在巨大结果集上做客户端处理。
- 长时间运行的查询 → 乐观加载 + 超时/错误 UX。

## AI / Genie 界面（"AI"那一半）
**门禁：** 本节**仅**当应用具有 Genie / 聊天 / 自然语言 / "ask your data" 界面时才适用。对于没有对话式输入的纯仪表板 / KPI / 报表应用，**完全跳过本节和 `references/genie-ai-trust.md`。** 当它确实适用时，实现全部五项（代码见 `references/genie-ai-trust.md`）：
只有当用户能看到 Genie/聊天/NL 答案是如何产生、以及以谁的身份运行时，该答案才可信。"使用 `GenieChat` + 一个旋转图标"并不够 —— 对于任何 Genie/聊天界面，都要交付全部五项（从参考文件复制确切的代码片段）：
1. **身份** —— 一条 `/api/whoami` 路由（真实的 `x-forwarded-email`/`x-forwarded-user` 标头）+ 在 `Badge` 中显示已登录用户。**仅当 `user_api_scopes: [dashboards.genie]` 已接入时**才声明 OBO；否则披露查询以应用的服务主体（service principal）身份运行。
2. **生成的 SQL** —— 在可检查的"Generated SQL" `Card` 中渲染 `attachments[].query`；绝不要隐藏答案是如何计算出来的。
3. **流式/状态** —— 反映 `useGenieChat().status`（`streaming`/`error`），绝不用冻结的旋转图标。
4. **免责声明** —— 每个答案都附一条持久的"AI 生成 —— 请核实"说明。
5. **治理 + 状态** —— `genie()` 空间配置 + 一条如实的执行身份说明（用户范围时用 OBO，否则服务主体）+ 空/错误/歧义处理（`Empty`、`Alert`）。

## 输出格式

**设计方案：**
```markdown
## Direction
[Genre, audience, primary task, design intent.]
## Pattern & notation choices
- Composition: [data info, meta info, layout, interaction, color]
- Notation: [message, scenario marks, scales, semantic color]
## Component plan        ← the part that makes it buildable
- [element] → [AppKit component] (queryKey/props), [token/palette], states handled
## Tradeoffs & risks
[What's summarized/hidden/paginated/interactive; overload, scale, a11y, maintenance risks.]
```

**评判：** 先讲最重要的理解性/完整性问题，引用组件/文件，然后按影响列出
发现，每条都给出具体的修复（要改哪个组件/token/状态）。

## 反模式
- 产出没有组件方案的设计备忘。
- "使用语义色"却不指名 token/调色板。
- 提名 AppKit 并未导出的组件（例如预构建的 `KpiCard`）—— 而应从已发布的原语组合出复合组件。
- 添加任务并不需要的交互、页面或密度（对 mock 优先的应用过度设计）。
- 忘记加载/空/错误状态，或 KPI 没有新鲜度/来源。
