---
name: wix-app
description: "构建并审查 Wix CLI 应用扩展——仪表盘页面、模态框、插件、菜单插件、自定义元素微件、Editor React 组件、站点插件、嵌入脚本、后端 API、后端事件、服务插件、数据集合以及 App Market 就绪性。在为 Wix CLI 应用构建任何功能或扩展，或为 App Market 审查准备 Wix 应用时使用。触发词：add、build、create、implement、help me、dashboard、widget、plugin、backend、API、event、collection、embedded script、service plugin、Editor React component、checkout、shipping、tax、discount、SPI、CMS、schema、tracking、popup、admin panel、menu item、modal、validate、test、verify、register extension、App Market、app review、submission readiness。"
compatibility: requires `@wix/cli` >= 1.1.192.
---

# Wix App Builder

帮助为 Wix CLI 应用构建扩展。涵盖所有扩展类型：仪表盘页面、模态框、插件、菜单插件、
自定义元素微件、Editor React 组件、站点插件、嵌入脚本、后端 API、事件、服务插件和数据集合。

**脚手架由 Wix CLI 负责。** 对每种受支持的类型使用 `wix generate --params`。它生成文件，
并在适用时生成构建器样板、UUID 以及 `src/extensions.ts` 注册。HTTP 端点从文件中被发现，
无需注册。本技能提供决策逻辑、API 指南、配置语义和业务逻辑模式，用来填充生成的存根。

## ⚠️ 强制性工作流检查清单 ⚠️

**在向用户报告完成之前，所有复选框都必须勾选：**

- [ ] **第 1 步：** 确定了所需的扩展类型
  - [ ] 在需求不明确时提出了澄清问题
  - [ ] **🛑 SDK 优先门（任何数据集合之前强制）：** 确认数据不属于现有的 Wix 应用——如果属于，则使用其 SDK 模块，绝不用 CMS（见 [SDK-First Rule](#sdk-first-rule-existing-wix-app-data-is-never-cms)）
  - [ ] 检查了是否存在隐式的数据集合需求——除非用户直接提供了集合 ID（见 [Data Collection Inference](#data-collection-inference)）
  - [ ] 如果正在创建数据集合扩展，获取了应用命名空间
  - [ ] 如果正在创建数据集合扩展，确定了完整的带范围集合 ID（见 [Collection ID Coordination](#collection-id-coordination)）
  - [ ] 用理由解释了建议
- [ ] **第 2 步：** 阅读所选类型的扩展参考文件和项目级 [CODE_QUALITY.md](references/CODE_QUALITY.md)
  - [ ] **仪表盘页面 UI：** 在选择组件之前将提示词转化为工作流——用户必须理解、聚焦、调查、操作和看到确认的内容。见 [UX Success Model](references/dashboard-page/UX_SUCCESS_MODEL.md)，以及已安装包自带的 `Collection Toolkit.md` 指南以了解哪个组件满足每种需求（[The Discovery Chain](references/WIX_PATTERNS_DOCS.md#the-discovery-chain)）。
    - [ ] **除非请求要求，否则不用 `SummaryBar`**——提示词中要有具名总计、计数，或“多少 / 多少钱”的数字。不是“页面似乎想要一个”：一个未被邀请的条会把行往下推，并在屏幕上放一个没人要求其正确的数字。当请求确实要求时，该数字必须来自实际计数（[QUERY_AND_PAGING.md](references/dashboard-page/QUERY_AND_PAGING.md#what-fetchtotal-is-allowed-to-call)），并通过 `useSelector` 读取，因为状态是 MobX（[TABLE_STATE.md](references/dashboard-page/TABLE_STATE.md#reading-state-outside-the-table-it-is-mobx)）。
    - [ ] **用户可打开的行，作为一个页面——默认可编辑**——`navigateToEntityPage` 到一个带可用表单和保存的 `EntityPage`，CMS 和垂直 SDK 数据皆然；三个只读情况在 [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md#2-choose-then-read-the-chosen-templates-page)。除非提示词明确是报告或导出。**绝不用 `SidePanel`**：在 Cairo 中它承载页面自己的面板。
    - [ ] **每个筛选条件都到达查询**：在集合 hook 的 `filters` 中声明，并在 `fetchData` 内读取。从不收窄行的筛选 UI 是一个看起来像功能的缺陷。

    一个没有下钻、没有可用筛选条件的筛选表格，正是没人陈述需求时被构建出来的东西——那是生成的仪表盘最常见的令人失望之处。聚合是判断性决策；下钻和筛选条件则不是。
  - [ ] **🛑 模板优先门（强制，仅仪表盘 UI，先于编写任何 shell/provider/router）：** 遵循 [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md)：找到已安装的 `@wix/patterns` 随附的页面模板，用其 `Page Templates.md` 指南选择一个——上述工作流需要哪些页面，**以及行从哪里来**（你自己的 fetch，或 CMS 集合）——阅读该模板的页面，并复制 `--templates` 为其列出的每个文件。当模板已经展示了页面 shell、provider 嵌套或 router 接线时却从头组合，正是此门存在的失败模式——下面的 Patterns/Component Docs 门是用于模板未覆盖的内容，而非替代从那里开始。反过来也成立：模板替代组合 shell，绝不替代发现链，因此它未展示的每个符号仍要经过下一道门。
  - [ ] **🛑 Patterns 文档门（任何仪表盘页面 UI 强制）：** 在**第一条触及 `node_modules/@wix/patterns` 的命令之前**阅读 [WIX_PATTERNS_DOCS.md](references/WIX_PATTERNS_DOCS.md)——其发现链（`pkg-root.cjs`、索引、一次性阅读 `Composition and Providers.md`、为哪个组件满足某项需求而阅读 `Collection Toolkit.md`）只存在于该文件中，而这一行是其第 1 步的摘要，不能替代打开它。然后用**一次** `node <pkgRoot>/bin/patterns-lookup.cjs <name…>` 调用解析你计划编写的每个 patterns 名称：对每个名称，它打印导入、示例和那一个 props 文件。如果缺少 `dist/docs/index.json`，升级 `@wix/patterns`。Patterns API 事实只来自已发布的 `dist/docs/`（页面）、`dist/examples/`（完整调用）、`dist/dts-bundle/`（类型）和 `dist/templates/`（整页）树——绝不来自包内的 `src/`、`dist/esm/`、`dist/types/` 或任何其他路径。某个 bundle 存根化的 prop 在其存根所命名的文件中（`Reading the Doc Indices.md`）。
  - [ ] **🛑 组件文档门（强制，仅仪表盘 UI）：** 对你即将编写的每个 patterns 符号，**从查询输出**决定哪一个单一工件回答你实际拥有的问题——导入行、示例或 props 文件——并且只读那一个，依据 [Component Selection Order](#component-selection-order) 的“简短版本”。在 JSX 的第一行之前，说明每个符号你读了哪个工件以及为什么。为同一个符号读一份文档*和*它的 bundle，或为查询已给你的导入行打开一个页面，正是此门存在的失败点。

    对于 `useTableCollection()` 返回的对象，阅读 [TABLE_STATE.md](references/dashboard-page/TABLE_STATE.md)——一个你接收而非构造的状态对象，其成员不显而易见且若干看似合理的成员并不存在。
- [ ] **第 3 步：** 检查了 API 参考；在**一次** `sdk-lookup.cjs` 调用中解析了每个垂直实体（[SDK lookup](#sdk-lookup-one-call-for-every-vertical-entity)）；仅将文档用于它不打印的内容
  - [ ] **基于 Wix 数据的仪表盘页面：** 从查询中取用方法，并对照它所指向的声明（`type … file:line`）验证每个映射字段——见 [DATA_SOURCES.md](references/dashboard-page/DATA_SOURCES.md)，以及在编写 `fetchData` 之前阅读 [QUERY_AND_PAGING.md](references/dashboard-page/QUERY_AND_PAGING.md)。一个标记为 `@deprecated` 的字段仍能编译并渲染出看似合理但错误的内容。
  - [ ] **垂直 SDK 前置条件——对于页面触及的每个 `@wix/*` 垂直领域，包括稍后添加的：** 确认该包实际是依赖（若非如此则安装它），并记下读取所需的 Dev Center 权限范围——缺少范围会产生一个能构建、能挂载但什么都不显示的页面。两者都在 [DATA_SOURCES.md](references/dashboard-page/DATA_SOURCES.md#two-things-to-settle-before-you-write-the-page)；范围放在 [Manual Steps Required](#-manual-steps-required) 下。**在第 4b 步期间添加的第二个垂直领域也需要此检查，且其失败不得拖垮页面**——见 [A second vertical is a second scope](references/dashboard-page/DATA_SOURCES.md#a-second-vertical-is-a-second-scope)。
  - [ ] **以 SDK 而非 REST 页面为模型来建模调用：** 命名空间名称、`_id` 与 `id`、重载方法上没有 `ReturnType`、`PagingMetadataV2` 上没有 `hasNext`——见 [The SDK is not the REST API](references/dashboard-page/DATA_SOURCES.md#the-sdk-is-not-the-rest-api)。
  - [ ] 仅站点/编辑器扩展：默认将 SDK 调用保留在扩展中，仅将访客确实无法调用的业务级方法路由出去（见 [Identity and Elevation Requirement](#identity-and-elevation-requirement)）
- [ ] **第 4a 步：** 通过 `wix generate --params` 为每个 CLI 支持的扩展脚手架
- [ ] **第 4b 步：** 在生成的文件中填充业务逻辑
  - [ ] **边写边编译：** 在第一个导入 `@wix/patterns` 的文件之后运行 `npx tsc --noEmit`，而不只在第 5 步。Patterns 的状态和筛选 API 是最常见的错误来源，在页面写完后一次性发现二十个错误，比尽早发现两个代价大得多。
  - [ ] **🛑 组件选择门（强制，仅仪表盘 UI）：** 对于仪表盘页面上的每个 UI 元素，在伸手拿 `@wix/design-system` 之前先对 `@wix/patterns` 解析它——并且绝不手工编写任一库已提供的组件。见 [Component Selection Order](#component-selection-order)。
  - [ ] 仅在编辑第一个导入 `@wix/design-system` 的 `.tsx`/`.jsx` 文件之前调用 `wix-design-system` 技能。对仅后端或仅数据的扩展跳过。
  - [ ] **渲染图像时，对每个集合来源：** 遵循 [IMAGE_RENDERING.md](references/dashboard-page/IMAGE_RENDERING.md)。保留架构图像渲染器和原始表单值；自定义 WDS/原生图像必须在选择回退或空状态之前规范化实际的 SDK 图像值。SDK 解码可能将 REST 图像对象替换为 URI 字符串。验证已加载集合缩略图和详情预览，否则报告浏览器验证不可用。
  - [ ] WDS：设计系统样式表在每个应用中恰好在一个地方导入——仪表盘表面为 `BusinessManagerTheme.tsx`（见下一项），或站点/编辑器扩展为主组件入口文件。绝不在子级、标签页或辅助文件中，也绝不两次。
  - [ ] **🛑 Business Manager 主题（每个仪表盘表面——页面、模态框以及插件）：** 编写一次 `BusinessManagerTheme.tsx`（两个样式表，包括 `themes/odeditor.global.css`，加上 `WixDesignSystemProvider` → `WixDesignSystemIconThemeProvider` → `IconThemeProvider theme="odeditor"` → `WixDesignSystemDefaultPropsProvider`），并**每个**扩展的根都包裹在其中——在 `WixPatternsProvider` 之上以及 `CustomModalLayout` 之上。每个扩展都是独立的 iframe，不继承任何重设计，因此给页面设置主题对它打开的模态框或插槽中的插件毫无作用；每个都需要自己的包装器。另外：每个图标来自 `@wix/wix-ui-icons-common/lazy`，并使用 `--wds-*` 标记或 `skin`/`size` props，而非硬编码的颜色、字号或内联 `style`（[BUSINESS_MANAGER_TOKENS.md](references/BUSINESS_MANAGER_TOKENS.md)——注意该主题将 `SP*` 间距单位从 6px 重设为 4px）。`tsc`、`wix build` 和 `wix preview` 在未设置主题的表面上都会通过——只有实际查看它才能发现这一点。见 [BUSINESS_MANAGER_THEME.md](references/BUSINESS_MANAGER_THEME.md)。
- [ ] **第 4c 步（仅仪表盘页面 UI）：** 重新打开并阅读刚写入的页面文件——而非回忆意图——并对照实际代码确认：除非请求要求，否则没有 `SummaryBar`；每一行都有路由下钻（`navigateToEntityPage`）且没有 `SidePanel` 被用作下钻；每个声明的筛选名称也出现在 `fetchData` 内；以及——对于每个带 router 的模板——入口文件既传递又守护 `location`。见 [UX Completeness Self-Audit](#step-4c-ux-completeness-self-audit)。
- [ ] **第 5 步：** 运行验证（见 [Validation](#validation)）
  - [ ] 依赖已安装
  - [ ] TypeScript 已编译
  - [ ] 构建成功
  - [ ] 预览已部署
- [ ] **第 6 步：** 收集并向用户呈现所有手动操作项

**🛑 停止：** 如果任何复选框未勾选，不要进入下一步。

---

## 快速决策助手

1. **你试图构建什么？**
   - 管理界面 → 仪表盘扩展
   - 后端逻辑 → 后端扩展
   - 数据存储 / CMS 集合 → 数据集合（仅应用拥有的数据——见 [SDK-First Rule](#sdk-first-rule-existing-wix-app-data-is-never-cms)）
   - Editor React 组件 → 站点扩展（仅应用项目）

2. **谁将看到它？**
   - 仅管理员用户 → 仪表盘扩展
   - 站点访客 → 站点扩展
   - 仅服务端 → 后端扩展

3. **它将在哪里出现？**
   - 仪表盘侧边栏/页面 →
     - 完整管理屏幕：仪表盘页面——UI 用 `@wix/patterns` + `@wix/design-system` 构建（见 [Component Selection Order](#component-selection-order)）。**不能使用 `<Modal />`**——改用单独的仪表盘模态框扩展和 `dashboard.openModal()`。
     - 弹窗/表单：仪表盘模态框
   - 现有 Wix 应用仪表盘（微件）→ 仪表盘插件
   - 现有 Wix 应用仪表盘（菜单项、更多操作/批量操作菜单）→ 仪表盘菜单插件
   - 站点任意位置，独立 → 自定义元素微件
   - 站点任意位置，带编辑器清单（样式/内容/元素）→ Editor React 组件
   - Wix 业务解决方案页面上的固定槽位 → 站点插件
   - 仅脚本/分析，无 UI → 嵌入脚本
   - 在业务流程中（结账/配送/税费）→ 服务插件
   - 将工具暴露给 Wix AI 助手 → 应用工具（需要 `APP_TOOLS` 声明 + `TOOLS_PROVIDER_CONFIG` 处理器——见 [APP_TOOLS.md](references/APP_TOOLS.md)）
   - 事件发生后（webhook/同步）→ 后端事件扩展
   - 自定义 HTTP 端点 → 后端 API

---

## 组件选择顺序

**对于页面 shell、provider 嵌套和路由——每个仪表盘页面都需要的那部分——从 [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md) 开始，而非本节。** 它找到已安装的 `@wix/patterns` 随附的页面模板（只读列表、带创建/编辑的列表、仅设置、以及基于其架构的 CMS 集合）；复制与请求匹配的那个并调整它。本节下面的内容用于模板尚未展示的单个 UI 元素——一个筛选类型、一个列渲染器、一个请求需要但模板中没有的组件。

Wix 的仪表盘页面由两个库构建。对于模板尚未覆盖的**每个** UI 元素，按此顺序解析并停在第一个命中。绝不跳过步骤，也绝不从记忆中判定某个组件缺失——要检查。

### 1. `@wix/patterns`——页面结构和数据集合

Patterns 拥有页面 shell 以及所有集合形态的东西：页面 shell 及其 header / content / footer 子部分、
表格和网格及其间的切换、文件夹视图、集合状态（分页、排序、选择、加载）、筛选条件、搜索、视图
预设、行和批量操作、拖放、扩展内路由、与集合绑定的覆盖层，以及针对单个列出项的添加 / 编辑 /
查看页面。如果你需要其中之一，它归 patterns——查阅它，而不是从 WDS 部件组装它。

**哪个组件满足某项需求是库自己的答案，而非本技能的答案。** 它以指南形式随附在已安装包内，
其中每个组件名称在构建时对照真实包校验。逐一走读它们：[The Discovery Chain](references/WIX_PATTERNS_DOCS.md#the-discovery-chain)。

整页也归该包：多页扩展的 router 接线，以及**字段由 CMS 拥有的集合**——来自 `@wix/patterns-cms`
的 `useCmsSchemaSource`，配合 `@wix/patterns/schema`，其中架构提供 fetch、筛选条件、列和表单——
两者都作为页面模板随附。见 [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md)。

简短版本：列出你计划编写的每个 patterns 名称，用**一次** `node <pkgRoot>/bin/patterns-lookup.cjs <name…>` 调用将它们全部解析，而不是每个名称一次索引探测。其输出给出每个名称的导入行（无需阅读）、其完整示例，以及保存其 props 的那一个文件。阅读你当前问题需要的那一个工件。每个会话解析一次 `<pkgRoot>`（[Prerequisites](references/WIX_PATTERNS_DOCS.md#prerequisites)）并复用它。

**从集合打开一个项默认使用可编辑的 `EntityPage`；创建/编辑流也使用 `EntityPage`，绝不用仪表盘模态框**——见 [Entity create and edit](#entity-create-and-edit)，以及包中的 `Collection to Entity Flow.md` 了解流程本身。

**因为查询不方便就落到第 2 步，是仪表盘页面最终全部用 WDS 构建的最常见方式。** 缺少索引意味着查询尚未发生，而不是 patterns 缺少该组件。

### 2. `@wix/design-system`——shell 内的一切

patterns 不拥有的叶子级 UI：输入、按钮、表单字段、文本、布局原语、卡片、徽章、工具提示、toast、
图标。通过查询而非回忆来选择组件——调用 **`wix-design-system` 技能**，其捆绑的辅助脚本读取已安装包：

```bash
node <wix-design-system-skill-dir>/scripts/wds.cjs search <keyword>
node <wix-design-system-skill-dir>/scripts/wds.cjs component <Name>
```

**如果该技能未安装**——它是一个单独的技能，某些宿主随附 `wix-app` 时未随附它——**不要**落到从记忆中编写 WDS，也不要将缺失的技能视为手工编写组件的许可。改为阅读已安装包，那本来就是技能会读取的地方：

```bash
ls node_modules/@wix/design-system/dist/types/            # the component inventory
cat node_modules/@wix/design-system/dist/types/<Name>/<Name>.d.ts   # its real props
```

在使用组件之前命名你读取的文件，正如组件文档门对 patterns 的要求。缺失技能降低的是便利性，而非标准。

### 3. 自定义 React——仅在两者都为空之后

从 WDS 布局原语（`Box`、`Card`、`Text`）组合。不要添加第三个 UI 依赖，也不要重设 patterns 或 WDS 内部的样式。

### 重叠与范围

- 当两个库都随附相同的概念（页面头、页面容器）时，**patterns** 的那个在 patterns 页面内胜出——它是接入 shell 布局和集合状态的那一块。仅在 patterns 页面 shell 之外使用 WDS 等价物。
- **Patterns 有自己的覆盖层。** `PickerModal` / `usePickerModal` 和 `bulkActionModal` 覆盖与集合相关的覆盖层。“这是个模态框”不是离开 patterns 的理由。
- **仪表盘插件**渲染在 patterns 页面 shell 之外，因此那里默认用 WDS。当此类表面显示数据集合时，patterns 集合组件仍然适用。

### 实体的创建和编辑

**打开由集合页面列出的记录，默认使用可编辑的 `EntityPage`，无论记录来自 CMS 还是垂直 SDK。** 请求一个表格或列表就足够了；用户无需另外要求编辑。三个只读情况在 [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md#2-choose-then-read-the-chosen-templates-page)；只读详情页面仍作为路由打开，绝不用仪表盘模态框或侧面板。

**针对所列记录的任何创建或编辑表单都是 `EntityPage`，而非仪表盘模态框。** 创建 / “添加新项”表单包含在内：它写入记录，因此即使尚未编辑任何内容，它也是 `EntityPage`。“它是简单的数据录入对话框，不是实体编辑”是对本规则的错误解读。

一个不列出任何内容的页面——设置页面、嵌入脚本配置页面——不承担 `EntityPage` 义务。但“我没有用 `@wix/patterns` 构建该列表”不是例外：列出记录的页面应是 `CollectionPage`。

这是选择顺序最常被丢弃的地方：集合用 patterns 正确构建，然后“添加项”流程被手工构建为模态框中的 WDS 表单。

文档化的流程：

1. 从集合页面的操作单元格或主操作，调用 `usePatternsNavigate()` 中的 `navigateToEntityPage({ path, entity })`。（patterns 文档给出了这个确切的用例——“在集合页面的操作单元格点击时导航到实体页面”——并且它会在 fetch 解析之前立即渲染实体头。）在**创建**路由上没有记录可传：省略 `entity` 并阅读 `<pkgRoot>/dist/docs/useEntityPage.md` 的 **Create route** 部分，整个“添加新项”流程就取决于它。
2. 用 `PatternsReactRouter` 内的 `PatternsReactRoute` 注册路由。
3. 遵循所选模板的实体 hook：对于 SDK/API 数据，`useEntityPage({ fetch, onSave })` 负责获取、保存、验证、脏状态、加载骨架和错误状态；对于 CMS，架构变体从源派生读取和写入。表单状态来自 `@wix/patterns/form`。使用所选模板文档化的签名，并将保存接到真实源，而非本地状态或空操作。
4. 从 `EntityPage.Header`、`EntityPage.MainContent`、`EntityPage.AdditionalContent` 和 `EntityPage.Card` 组合正文。**WDS 放在这些卡片内部**——各个字段用 `FormField`、`Input`、`Text`。

对于既不写入也不显示所列记录的对话框，使用仪表盘模态框：删除或丢弃确认、未保存变更提示、信息性通知，或任何不列出任何内容的页面上的对话框。对话框大小和字段数量不是例外——针对所列记录的单字段创建表单仍是 `EntityPage`。因为交互不持久任何内容而伸手拿模态框，绝不因为“表单应在模态框中打开”。

---

## 扩展类型参考表

| 扩展类型 | 类别 | `extensionType`（用于 `wix generate --params`） | 参考文件 |
| --- | --- | --- | --- |
| 仪表盘页面 | Dashboard | `DASHBOARD_PAGE` | [DASHBOARD_PAGE.md](references/DASHBOARD_PAGE.md) |
| 仪表盘模态框 | Dashboard | `DASHBOARD_MODAL` | [DASHBOARD_MODAL.md](references/DASHBOARD_MODAL.md) |
| 仪表盘插件 | Dashboard | `DASHBOARD_PLUGIN` | [DASHBOARD_PLUGIN.md](references/DASHBOARD_PLUGIN.md) |
| 仪表盘菜单插件 | Dashboard | `DASHBOARD_MENU_PLUGIN` | [DASHBOARD_MENU_PLUGIN.md](references/DASHBOARD_MENU_PLUGIN.md) |
| 服务插件 | Backend | `SERVICE_PLUGIN` | [SERVICE_PLUGIN.md](references/SERVICE_PLUGIN.md) |
| 应用工具（AI 助手工具） | Backend | `APP_TOOLS`，然后用 `pluginType: TOOLS_PROVIDER_CONFIG` 的 `SERVICE_PLUGIN` | [APP_TOOLS.md](references/APP_TOOLS.md) |
| 后端事件扩展 | Backend | `EVENT` | [BACKEND_EVENT.md](references/BACKEND_EVENT.md) |
| 后端 API（HTTP 端点） | Backend | `HTTP_ENDPOINT` | [BACKEND_API.md](references/BACKEND_API.md) |
| 数据集合 | Backend | `DATA_COLLECTION` | [DATA_COLLECTION.md](references/DATA_COLLECTION.md) |
| Editor React 组件 | Site | `EDITOR_REACT_COMPONENT` | [EDITOR_REACT_COMPONENT.md](references/EDITOR_REACT_COMPONENT.md) |
| 自定义元素微件 | Site | `CUSTOM_ELEMENT` | [CUSTOM_ELEMENT_WIDGET.md](references/CUSTOM_ELEMENT_WIDGET.md) |
| 站点插件 | Site | `SITE_PLUGIN` | [SITE_PLUGIN.md](references/SITE_PLUGIN.md) |
| 嵌入脚本 | Site | `EMBEDDED_SCRIPT` | [EMBEDDED_SCRIPT.md](references/EMBEDDED_SCRIPT.md) |

**关键约束：**
- 仪表盘页面不能使用 `<Modal />`；使用单独的仪表盘模态框和 `dashboard.openModal()`。

> **HTTP 端点：** 用 `extensionType: "HTTP_ENDPOINT"`（而非 `BACKEND_API`）生成。有关项目特定目录、处理器类型和前端 URL，见 [BACKEND_API.md](references/BACKEND_API.md)。

## 跨领域参考

| 主题 | 参考 |
| --- | --- |
| 代码质量要求（适用于所有生成的代码） | [CODE_QUALITY.md](references/CODE_QUALITY.md) |
| 扩展注册 | [EXTENSION_REGISTRATION.md](references/EXTENSION_REGISTRATION.md) |
| 应用验证 | [APP_VALIDATION.md](references/APP_VALIDATION.md) |
| App Market 审查 | [APP_MARKET_REVIEW.md](references/APP_MARKET_REVIEW.md) |
| 应用标识符（命名空间、代码 ID） | [APP_IDENTIFIERS.md](references/APP_IDENTIFIERS.md) |
| Wix Stores 版本化（V1/V3） | [STORES_VERSIONING.md](references/STORES_VERSIONING.md) |
| 官方文档链接 | [DOCUMENTATION.md](references/DOCUMENTATION.md) |
| Wix Patterns 仪表盘页面 | [WIX_PATTERNS_DOCS.md](references/WIX_PATTERNS_DOCS.md) |
| Business Manager 主题——每个仪表盘页面、模态框和插件都需要的包装器 | [BUSINESS_MANAGER_THEME.md](references/BUSINESS_MANAGER_THEME.md) |
| Business Manager 标记——`--wds-*` 替代、重设的间距单位、按组件调整 | [BUSINESS_MANAGER_TOKENS.md](references/BUSINESS_MANAGER_TOKENS.md) |
| 仪表盘 UX 成功模型（好的仪表盘包含什么） | [UX_SUCCESS_MODEL.md](references/dashboard-page/UX_SUCCESS_MODEL.md) |
| 草稿模板——任何仪表盘页面从这里开始：查找、复制和调整该包的页面模板 | [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md) |
| `useTableCollection()` 返回的状态对象 | [TABLE_STATE.md](references/dashboard-page/TABLE_STATE.md) |
| 查找页面背后的 SDK 方法和字段名称 | [DATA_SOURCES.md](references/dashboard-page/DATA_SOURCES.md) |
| 来自任何集合来源的图像——CMS、垂直 SDK 和自定义数据 | [IMAGE_RENDERING.md](references/dashboard-page/IMAGE_RENDERING.md) |
| 筛选路径、WQL 运算符和游标分页 | [QUERY_AND_PAGING.md](references/dashboard-page/QUERY_AND_PAGING.md) |

---

## SDK 优先规则（现有 Wix 应用的数据绝不用 CMS）

**关键：** 由现有 Wix 业务应用拥有的数据通过该应用的 SDK 模块读写——绝不要建模为新的 CMS 数据集合。为此类数据创建自定义集合会从空开始，并与真实记录保持断开（例如，构建在 CMS 上的“退款仪表盘”会在 Wix eCommerce 中存在退款订单时显示空状态）。

在[实体 → SDK 模块映射](references/SDK_MODULE_MAP.md)中找到用户提到的实体并使用该包；然后 [SDK lookup](#sdk-lookup-one-call-for-every-vertical-entity) 命名命名空间和方法。如果实体未列出且查询无果，为其运行 `SearchWixSDKDocumentation`——**两者之一未做前绝不要下结论用 CMS**。CMS 仅用于你的应用自身引入的、没有任何 Wix 应用管理的数据（配置、规则、应用特定记录）。

**SDK 类型：** 通过你导入的命名空间访问它们，形式为 `<namespace>.<TypeName>`，使用文档中显示的任何类型名称——绝不从 `@wix/<pkg>` 根按名称导入类型。

```ts
import { orders } from '@wix/ecom';
const rows: orders.Order[] = [];              // ✅
// import type { Order } from '@wix/ecom';    // ❌ has no exported member 'Order'
```

**以 SDK 枚举为键的映射：** 字段的类型为 `<Enum>WithLiterals`（枚举或其字符串值）。`Partial<Record<bookings.BookingStatusWithLiterals, V>>` 无法用状态索引（TS7053）。使用 `Record<…WithLiterals, V>` 并为每个值提供一个条目，或用字符串值作为部分映射的键：`` Partial<Record<`${bookings.BookingStatus}`, V>> ``。

---

## 数据集合推断

**关键：** 数据集合常常是隐式需要的——不要等用户明确说“创建一个 CMS 集合”。自动推断该需求。

**⚠️ 先应用 [SDK 优先规则](#sdk-first-rule-existing-wix-app-data-is-never-cms)**——下面的指标仅适用于你的应用自身拥有的数据，不适用于 Wix 应用已管理的实体。

**如果用户直接提供集合 ID 则跳过本节**（例如，现有的站点级集合）。在这种情况下，按原样使用所提供的 ID——无需数据集合扩展或命名空间范围。

**当以下任一为真时，始终包含数据集合扩展：**

| 指标 | 示例 |
| --- | --- |
| 用户提到保存/存储/持久化应用特定的数据 | “保存费用金额”、“存储产品推荐” |
| 仪表盘页面将**管理**（CRUD）领域实体 | “管理费用的仪表盘”、“编辑规则的管理页面” |
| 服务插件在运行时读取应用配置的数据 | “结账时获取费用规则”、“查找运费费率” |
| 用户提到“专用数据库/集合” | “保存到专用数据库集合” |
| 多个扩展引用相同的自定义数据 | 仪表盘管理费用 + 服务插件读取费用 |

**为何重要：** 没有数据集合扩展，集合在应用安装时不会被创建，Wix Data API 可能无法工作（代码编辑器未启用），且集合 ID 不会被正确限定到应用命名空间。

**如果推断出数据集合，请遵循 [App Namespace Requirement](#app-namespace-requirement) 在继续之前获取命名空间。**

### 应用命名空间要求

创建数据集合时，你必须向用户索取其在 Wix Dev Center 中的应用命名空间。这是一个必需的参数，必须从用户的 Dev Center 仪表盘获取，不能建议或猜测。

如果用户尚未提供其应用命名空间，阅读 [APP_IDENTIFIERS.md](references/APP_IDENTIFIERS.md) 并向用户提供获取它的说明。

### 集合 ID 协调

**仅在创建数据集合扩展时适用。** 如果用户直接提供集合 ID，按原样使用——无需命名空间范围，无需数据集合扩展。

当数据集合与引用相同集合的其他扩展一起创建时：

1. **获取应用命名空间**（见上文 App Namespace Requirement）
2. **确定每个集合的 `idSuffix`**（数据集合参考记录了完整 ID 格式）
3. **使用完整的带范围集合 ID**（`<app-namespace>/<idSuffix>`）在所有通过 Wix Data API 调用引用该集合的扩展中

---

## Wix Stores 版本化要求

**在使用任何 Wix Stores API 时适用**（产品、库存、订单等）：

1. **阅读 Stores 版本化参考**——见 [STORES_VERSIONING.md](references/STORES_VERSIONING.md)。它包含模块映射、权限速查表、可复制粘贴的双目录配方（列出/获取/创建/更新/删除产品、库存、类别）、V1→V3 字段映射、webhook 映射以及主要的 V3 坑。**在搜索 SDK 文档之前使用它**——它覆盖了常见的 80%。
2. **所有 Stores 操作必须先用 `getCatalogVersion()` 检查目录版本**
3. **根据版本使用正确的模块**：`productsV3`（V3）与 `products`（V1）
4. **应用必须同时支持 V1 和 V3**——单版本应用无法在 App Market 中上架，并在新站点上出问题
5. **为每个 Stores 操作请求 V1 和 V3 权限范围**

这是不可协商的——V1 和 V3 不向后兼容。

---

## 身份与提升要求

**每当扩展调用 Wix SDK 方法时适用。** 在编写调用之前决定它在哪里运行。

扩展以何种身份运行决定下面的一切——[扩展类型参考表](#extension-types-reference-table) 中的“类别”列告诉你你拥有哪一种：

- **站点和编辑器扩展**——自定义元素微件、站点插件、Editor React 组件、嵌入脚本——以站点访客或成员身份运行，绝不以应用身份运行。
- **仪表盘扩展**以 Wix 用户身份运行——不是以站点访客身份，也不是以应用身份。
- **后端扩展**——后端 API、后端事件、服务插件——以应用身份运行。

**`auth.elevate` 仅在后台代码中有效。** 在站点、编辑器或仪表盘扩展中它完全无效。

**默认：直接从扩展调用 SDK。** 路由一个并不需要它的调用不是无害的额外一跳——它是能工作的功能出问题的方式。按调用为谁行动来排序，绝不按其范围名称：

- **为当前访客或成员行动**——他们的购物车、结账、预订、订单、预约或配置档：`currentCartV2.*`、`cartV2.placeOrder`、`bookings.createBooking`、`members.getCurrentMember`（REST *Get My Member*），以及任何操作“我的”或“当前”实体的其他方法。这些从调用者会话解析行动者，因此提升会以应用身份运行它们，并将结果与发起请求的人脱钩——一个没有买家的订单、一个没有参加者的预订。
- **平台按调用者筛选结果**——提升的调用会返回直接调用所扣留的内容，因此针对稀疏结果的“修复”会变成泄漏。Wix Data `items.*` 遵循集合的 `dataPermissions`（脚手架默认值：`itemRead: 'ANYONE'`，写入 `'PRIVILEGED'`——用权限修复写入，而非路由；见 [DATA_COLLECTION.md](references/DATA_COLLECTION.md)）。目录读取向任何人返回基础字段，扣留 `MERCHANT_DATA` 和非可见产品，除非应用持有 `SCOPE.STORES.PRODUCT_READ_ADMIN`。`members.getMember`/`queryMembers` 向访客和成员调用者扣留 `PRIVATE` 成员。

**仅当方法对整个业务行动时才路由出去**，这是访客或成员确实无法做到的：`archiveLocation`、`queryLocations`、目录和库存写入、`bookings.confirmBooking`、订单管理。**当方法的文档显示调用是提升的时候，将其路由出去并在那里提升**——从任何宿主，包括仪表盘，因为 `auth.elevate` 仅在后台代码中有效，因此端点是文档化模式唯一能运行的地方。

**当你在站点、编辑器或仪表盘扩展中不确定时，直接调用它并让它失败。** 站点扩展不可调用的方法会返回你立即看到的权限错误；被错误路由并提升的方法会*成功*并悄悄地返回错误数据或为错误的人行动。有些方法页面带有散文说明可定夺——`get-my-member`：“此方法需要访客或成员身份认证。”存在时即为权威（SDK 查询将其打印为方法的 `note`），但只有少数页面有，因此其缺失不能决定任何事。

两个信号永远不能定夺：范围名称——其范围名称指向错误方向的方法在 [sdk-curated.json](scripts/sdk-curated.json) 中是规则，[SDK lookup](#sdk-lookup-one-call-for-every-vertical-entity) 将其打印为 `note`——以及 SDK 架构行的客户端前缀，它对同一方法随文档渠道而变化，因此不携带任何信息，不值得重新推导。

路由出去意味着一个后端 API 端点，它提升并通过 `httpClient.fetchWithAuth()` 到达。提升会绕过 Wix 的权限检查，因此端点必须自己重新检查调用者——见 [Identity and Authorization](references/BACKEND_API.md#identity-and-authorization) 了解每个宿主实际能验证什么，以及为什么仅所有者的操作属于仪表盘扩展。

**某些扩展或 SDK 调用需要的权限范围是 `wix generate` 不会自动添加的。** 添加一个是 Dev Center 账户变更，不是智能体做的事——告诉用户要添加哪个范围：在 `https://manage.wix.com/apps/<appId>/home` 打开他们的应用，在左侧菜单中选择 **Develop > Permissions**，然后 **Add Permissions**，然后在 [Manual Steps Required](#-manual-steps-required) 下报告它。如果应用已安装到某站点，所有者还必须通过安装/更新流重新批准它——重新访问同一应用页面的“Test App”流（或发布输出中的安装链接）并接受“Agree & Update”——然后该范围才会在那里生效。

---

## App Market 审查

**当用户想将其应用提交到 Wix App Market、公开上架、为 App Market 审查做准备、审计拒绝风险或修复 App Market 审查反馈时适用。** 私有应用或常规版本发布不需要。

阅读 [APP_MARKET_REVIEW.md](references/APP_MARKET_REVIEW.md)——它包含完整的技术检查清单、带 Wix 文档链接的实现说明，以及用于可追溯性的审查分类 ID。

---

## 实现工作流

### 第 1 步：提出澄清问题（如需）

仅在实现要进行时**绝对必要**的情况下才询问配置值。如果某个值可以稍后配置或作为手动步骤添加，不要因此受阻。

如果方法不明确（放置位置、可见性、配置、集成），提出澄清问题。如果答案可能改变扩展类型，在继续之前等待回复。否则，以最合适的扩展类型继续。

### 第 2 步：给出你的建议

使用上文扩展类型参考表和决策内容。说明扩展类型以及简要理由（放置位置、功能、集成）。

### 第 3 步：阅读扩展参考、检查 API 参考，然后发现（如需）

**工作流：阅读扩展参考 → 检查 API 参考 → 对垂直实体进行 SDK 查询 → 仅对查询不打印的内容查阅文档。**

1. **阅读扩展参考文件**，针对上表中选定的扩展类型
2. **从用户需求中识别所需 API**
3. **检查相关 API 参考文件：**
   - 后端事件 → `references/backend-event/COMMON-EVENTS.md`
   - Wix Data → `references/data-collection/WIX_DATA.md`
   - 仪表盘 SDK → `references/dashboard-page/DASHBOARD_API.md`
   - 服务插件 SPI → 阅读 `references/SERVICE_PLUGIN.md`，然后阅读其 References 表链接的 SPI 文件
   - 应用工具（AI 助手工具）→ 阅读 `references/APP_TOOLS.md`；它链接到 `references/app-tools/TOOLS.md`（声明）和 `references/service-plugin/TOOLS_PROVIDER.md`（处理器）
4. **在参考中验证特定方法/事件存在**
5. **对于垂直实体，用每个实体运行一次 [SDK lookup](#sdk-lookup-one-call-for-every-vertical-entity)**；仅对参考和查询都无法回答的内容使用 MCP 发现

**平台 API（绝不发现——在参考中）：**
- Wix Data、仪表盘 SDK、事件 SDK（常见事件）、服务插件 SPI

**垂直 API（如需要则发现）：**
- Wix Stores（**⚠️ 必须使用 Stores 版本化参考**——需要 V1/V3 目录检查）、Wix eCommerce、Wix Bookings、Wix Members、Wix Pricing Plans、第三方集成——先在 [SDK 优先规则](#sdk-first-rule-existing-wix-app-data-is-never-cms) 模块映射中找到正确的 `@wix/*` 包，安装它，然后从 [SDK lookup](#sdk-lookup-one-call-for-every-vertical-entity) 获取命名空间和方法

**决策表：**

| 用户需求                     | 检查参考 / 需要发现？ | 理由 / 参考文件                             |
| ------------------------------------ | ------------------------------------ | --------------------------------------------------- |
| “显示商店产品”             | ✅ 是（SDK 查询）                  | Wix Stores API——**包含 Stores 版本化参考** |
| “订单 / 退款仪表盘”     | ✅ 是（SDK 查询）                  | Wix eCommerce API（`@wix/ecom`）——**绝不用 CMS 集合** |
| “显示预订日历”              | ✅ 是（SDK 查询）                  | Wix Bookings API（`@wix/bookings`）；SPI 叶子仅覆盖服务插件 |
| “向用户发送邮件”             | ✅ 是（先 SDK 查询，再 MCP）        | Wix Triggered Emails 不在参考文件中         |
| “获取成员信息”              | ✅ 是（SDK 查询）                  | Wix Members API 不在参考文件中              |
| “监听购物车事件”             | 检查 `COMMON-EVENTS.md`             | 仅当事件在参考中缺失时才 MCP 发现    |
| “将数据存储到集合”           | WIX_DATA.md ✅ 找到                 | ❌ 跳过发现（参考已覆盖）             |
| “为我的应用创建 CMS 集合”  | 数据集合参考            | ❌ 跳过发现（专门参考已覆盖）   |
| “显示仪表盘 toast”               | DASHBOARD_API.md ✅ 找到            | ❌ 跳过发现                                   |
| “显示 toast / 导航”              | DASHBOARD_API.md ✅ 找到            | ❌ 跳过发现                                   |
| “仅 UI（表单、输入）”            | 不适用（无外部 API）                | ❌ 跳过发现                                   |
| “带表单输入的设置页面”     | 不适用（仅 UI，无外部 API）       | ❌ 跳过发现                                   |
| “带本地状态的仪表盘页面”    | 不适用（无外部 API）                | ❌ 跳过发现                                   |

#### SDK 查询：每个垂直实体一次调用

```bash
node <this-skill-dir>/scripts/sdk-lookup.cjs contacts orders --intent search   # search | read | write | event | all
```

在垂直包安装后，从应用目录运行它，将**功能触及的每个实体放在一次调用中**。从功能中一次性选择意图。仪表盘集合页面默认编辑其记录（[DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md#2-choose-then-read-the-chosen-templates-page)），因此它使用 `all`：那包含 `search` 和 `write` 行，搜索方法在前。仅对只读页面使用 `search`（带搜索框）或 `read`，对只写入的功能使用 `write`。不要将输出通过管道传给 `head`。对每个实体它打印：

- 要使用的命名空间及原因（一条精选规则；在一个包内，搜索用 `search*` 方法，然后最高 API 版本；在导出相同名称的多个包之间，用模块映射的包，否则用与其同名的包），以及其他命名空间——跨包时，每个都带其实体描述，因此当功能匹配另一个时切换；
- 导入行；
- `shape`：为该意图要编写的那一次调用，附其理由，对于搜索则附词条去向；
- 该意图的每个方法，附其调用形态（`search`、`query-builder`、`query` 等）、权限、必填字段（`revision`）及其文档说明（`note`，附更新时的字段规则：缺失字段会做什么，以及如何清除一个字段）；当某个选项决定返回哪些字段时用 `fieldsets`（members 默认为 `PUBLIC`，不含 `loginEmail` 或 `contact`：请求包含你显示的每个字段的集合）；对于搜索、查询或列表方法还用 `arg` 和 `returns`，即其参数的键（`cursorPaging`、`filter`、`sort`、`search`）和其响应的键（`pagingMetadata.cursors.next`）；仅当包声明了筛选列表时才提供（否则方法文档页面列出字段）——不包括谁可调用它：那属于 [身份与提升要求](#identity-and-elevation-requirement)；
- 实体类型为 `file:line`——用于验证字段的声明（[DATA_SOURCES.md](references/dashboard-page/DATA_SOURCES.md#confirming-a-field--the-part-that-ships-bugs)）；
- 每个方法自己的声明为 `decl file:line`——在那里读取 `arg` 和 `returns` 背后的类型，而非搜索类型定义；
- 该实体的精选规则（`note`），例如 Stores V1/V3 检查。

从其输出取用命名空间、方法和调用形态；不要从类型定义重新推导它们，并遵循 `shape` 下的行。当查询打印 `site` 时，选择取决于站点（Stores：调用 `getCatalogVersion()` 并同时支持两者）。`not installed` 打印安装命令：安装，然后再次运行查询。它不认识的名称以退出码 1 退出并给出接近匹配。

它从包自身的声明中打印每个搜索和查询方法的封闭筛选列表（自由文本字段、每字段的运算符、排序）。仅当包声明时它才打印方法的**权限范围 ID**；当输出说 `scope: not in the package` 时，从方法的文档页面（下一个列表）获取范围。

**用于发现的 MCP 工具（用于查询不打印的内容）：**

- `SearchWixSDKDocumentation`——SDK 方法和 API（**始终使用 maxResults: 5**）
- `ReadFullDocsMethodSchema`——特定 SDK 方法的完整类型架构（参数、返回类型、权限）
- `ReadFullDocsArticle`——仅散文指南和概念文章（不用于 SDK 方法签名）

### 第 4a 步：通过 CLI 脚手架

对每种受支持的类型，包括 HTTP 端点，运行 `npx wix generate --params '<json>'`。成功时命令返回 `{"success":true,"extensionType":"...","newFiles":[...]}`。

如果命令因未知或无效参数失败，运行 `npx wix schema generate --type <extensionType>` 打印该扩展类型的 JSON Schema，修正 `--params` 载荷并重试。不要回退到手动脚手架。唯一的例外是 CLI 早于 1.1.243 时的 `HTTP_ENDPOINT`，它早于该生成器但仍支持该扩展：按 [BACKEND_API.md](references/BACKEND_API.md#generate-for-the-project-type) 所述手工创建端点文件。

**CLI 自动做什么：**
- 创建文件夹和存根文件
- 对于已注册的扩展，生成新的 UUID 并用导入和 `.use()` 调用更新 `src/extensions.ts`
- 对于 HTTP 端点，创建路由文件而不更改 `src/extensions.ts`
- 强制命名规则（kebab-case、自定义元素要求连字符等）

**HTTP 端点：** 运行 `npx wix generate --params '{"extensionType":"HTTP_ENDPOINT","name":"hello"}'`，然后在返回的文件中实现处理器。遵循 [BACKEND_API.md](references/BACKEND_API.md)；如果路由不响应，其故障排查提示展示如何从构建输出确认发现。

### 第 4b 步：填充业务逻辑

打开 `newFiles` 中返回的每个路径，并用用户的实际逻辑替换存根化的处理器体 / UI / 查询，受扩展参考文件的 API 和配置部分指导。

- ⚠️ 使用 WDS 时强制：在**编辑第一个导入 `@wix/design-system` 的 `.tsx`/`.jsx` 文件之前**调用 `wix-design-system` 技能。不要为仅后端或仅数据的工作预先调用它——它会向上下文添加大量你不会用到的内容。
- ⚠️ 使用数据集合时强制：使用来自 `idSuffix` 的确切集合 ID（区分大小写）。如果 `idSuffix` 是 `"product-recommendations"`，使用 `<app-namespace>/product-recommendations` 而非 `productRecommendations`。

### 第 4c 步：UX 完整性自审

**仅仪表盘页面 UI。** `tsc`、`wix build` 和 `wix preview` 都检查代码能否编译和运行——它们都不检查它是否是 [UX Success Model](references/dashboard-page/UX_SUCCESS_MODEL.md) 所描述的仪表盘。一个带有裸露、无摘要、不可打开的表格的页面能干净地编译，却仍不满足要求——那个缺口正是生成的仪表盘通过所有技术检查却仍然令人失望的原因。实测运行确认了这一点：一个页面可以干净编译，却仍然缺少下面三项中的任何一项，因为先前的检查清单条目只是陈述的意图，而非对实际落地的代码重新检查。

在进入第 5 步之前，重新打开你刚写的每个页面文件并检查实际代码——而非你打算包含的内容：

- [ ] **仅当请求要求时页面才有 `SummaryBar`。** 用 grep 检查它：一个未被邀请的条是缺陷，而非额外奖励，删除它就是修复。如果请求*确实*要求，则每个指标都要赢得其位置，且标题统计**匹配筛选条件**的内容（`state.collection.total`，由 `fetchTotal` 提供），而非已分页进来的内容——任何从 `keyedItems` 派生的指标都要如此标注。
- [ ] **如果 `SummaryBar` 的数字由 `fetchTotal` 提供，跟踪该函数到它所发起的调用并确认该调用计数。** 一个解析为 `undefined` 的 `fetchTotal`——通常原因是 `pagingMetadata.total`，游标分页的响应不携带它——会让条在一个满是行的表格旁报告 `0`，而它还能编译、运行并通过本列表上的所有其他检查。它必须从计数端点解析一个数字（`items.query(id)…count()`、垂直领域自己的计数，或带 `returnTotalCount: true` 的偏移分页）；如果 API 没有，删除 `fetchTotal` 并将指标标注为已加载行。见 [TABLE_STATE.md](references/dashboard-page/TABLE_STATE.md#a-fetchtotal-that-resolves-undefined-shows-0-not-the-rows)。
- [ ] **每一行默认打开可编辑实体页面**：`onRowClick` 调用 `navigateToEntityPage`，且目标有 `EntityPage`、可用表单和真实保存操作。只读路由由 [DRAFT_TEMPLATE.md](references/dashboard-page/DRAFT_TEMPLATE.md#2-choose-then-read-the-chosen-templates-page) 中的三个情况之一证明，最终响应指明是哪一个；仅报告/仅导出的请求无需下钻。保存调用源的真实更新方法并让失败的调用抛出，使页面显示其错误——没有空操作、仅本地状态的保存，或吞掉失败的 `catch`。如果 Preview 可用，更改一个字段、重新加载以确认已保存，再改回；否则将保存报告为未验证。集合页面文件中的 `SidePanel` 正是此检查要取代的缺陷。`grep -n "<SidePanel" <page files>` 应不返回任何内容——匹配 JSX 标签，而非裸词，否则模板自己的“绝不用 SidePanel”注释会让检查失败，并诱使某人“修复”正确的代码。
- [ ] 工具栏中声明的每个筛选名称也出现在 `fetchData` 的查询构造内——如不确定，在两处都用 grep 搜索该名称。
- [ ] 表格接入了 `errorState`——没有它，失败的查询与缓慢的查询无法区分，而你刚发布的页面无法告诉你它是哪一种。
- [ ] **仅路由模板（除设置那个外的所有）——入口文件既传递又守护 `location`。** `PatternsReactRouter` 在 `location` 缺失*或*首次渲染时仍为 `undefined` 时会在打开时抛出，而 `tsc`、`wix build` 甚至绿色构建都会通过。两半都是必需的——`location={location}` prop **以及** 其周围的 `location ? … : null` 守护，因为首次渲染时 `observeState` 尚未触发。用 grep 检查入口文件，而非相信回忆：

  ```bash
  grep -n "observeState\|location={location}\|location ?" src/extensions/dashboard/pages/<page>/<page>.tsx  # the file the builder's `component` points at
  ```

  三个命中是正确的。缺失守护是实际已发布的失败模式：一次实测运行产生了一个管道看起来齐备却仍在打开时崩溃的页面，而同一提示词的重跑产生了一个可用的页面——所以这是间歇性的，重跑不是检查。
- [ ] 页面的 api 模块导入的每个 `@wix/*` 垂直领域都是已声明的依赖，且每一个的范围都列在手动步骤下。对**次要**垂直领域（一次充实查询、一个筛选条件的选项、一个被解析为 id 的搜索词）的任何调用都被包装，使它的失败降级该功能而非让页面失败。

如果某项未通过且没有例外适用，现在就添加缺失的部分。不要让“它能编译”代替“它满足检查清单”——第 5 步检查前者，本步检查后者，它们相互独立。

### 第 5 步：运行验证

运行下面 [Validation](#validation) 中的四个步骤。**在验证通过之前不要向用户报告完成**——如果失败，修复错误并重新验证直到通过。

### 第 6 步：报告完成

仅在验证通过后，在响应顶部提供**简洁的摘要部分**：

```markdown
## ✅ Implementation Complete

[1-2 sentence description of what was built]

**Extensions Created:**
- [Extension 1 Name] - [Brief purpose]
- [Extension 2 Name] - [Brief purpose]

**Build Status:**
- ✅ Dependencies: [Installed / status message]
- ✅ TypeScript: [No compilation errors / status]
- ✅ Build: [Completed successfully / status]
- ✅/⚠️ Preview: [Created — Dashboard URL / Failed - reason]

**⚠️ IMPORTANT: [X] manual step(s) required to complete setup** (see "Manual Steps Required" section below)
```

- 如果没有手动步骤，说明：“✅ 无需手动步骤——你已准备就绪！”

### 第 7 步：呈现手动操作项

呈现用户必须执行的任何手动步骤（例如，在 Wix 仪表盘中配置设置、启用权限、设置外部服务）。

**格式：**

```markdown
## 🔧 Manual Steps Required

The following actions need to be done manually by you:

### 1. [Action Category/Title]
[Detailed description with specific instructions]

### 2. [Action Category/Title]
[Detailed description]
```

---

## 扩展注册

`wix generate --params` 会为已注册的扩展自动更新 `src/extensions.ts`。HTTP 端点无需导入或 `.use()` 调用；运行时发现它们的文件。有关背景、故障排查，以及 `src/extensions.ts` 漂移时的手动恢复模式，见 [EXTENSION_REGISTRATION.md](references/EXTENSION_REGISTRATION.md)。

---

## 验证

在所有实现完成后按顺序执行这些步骤。完整指南见 [APP_VALIDATION.md](references/APP_VALIDATION.md)。仪表盘页面 UI：先运行 [第 4c 步的 UX 完整性自审](#step-4c-ux-completeness-self-audit)——下面的检查验证代码能运行，而非验证它是提示词所要求的仪表盘。

1. **包安装**——检测包管理器，运行安装
2. **TypeScript 编译**——`npx tsc --noEmit -p .`
3. **构建**——`npx wix build`
4. **预览**——`npx wix preview`，在前台且不通过管道：它上传、打印预览 URL 并自行退出，因此不要 `timeout`、后台化、`sleep` 或 `| tail`。如果你的 shell 还是把它移到后台，说明它停滞了：读取它打印的内容和 `.wix/debug.log` 一次，然后报告预览未完成。不要轮询，也不要承诺一个 URL

如果任何步骤失败，停止并报告错误。失败时检查 `.wix/debug.log`。

---

## 文档

有关所有扩展类型的官方 Wix CLI 文档链接，见 [DOCUMENTATION.md](references/DOCUMENTATION.md)。
