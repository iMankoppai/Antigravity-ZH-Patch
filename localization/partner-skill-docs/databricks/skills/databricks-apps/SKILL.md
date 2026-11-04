---
name: databricks-apps
description: "在 Databricks Apps 平台上构建应用。适用于被要求创建数据应用、分析工具或自定义交互可视化时。单纯的\"创建一个仪表板\"请求意味着一个托管的 AI/BI（Lakeview）仪表板 → 使用 databricks-aibi-dashboards，而非本技能。在脚手架化之前评估数据访问模式（分析 vs Lakebase 同步表）。在开始实现之前调用。"
compatibility: Requires databricks CLI (>= v0.294.0)
metadata:
  version: "0.1.3"
parent: databricks-core
---

# Databricks Apps 开发

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

**包管理器 —— 在下方任何安装或命令之前先解决这个问题：**

Databricks Apps 官方仅支持 **npm** 和 **pnpm**。

1. 按优先级顺序检测项目的管理器：项目说明 → `package.json` 的 `packageManager` 字段 → 锁文件（`pnpm-lock.yaml` → pnpm、`package-lock.json` → npm）。
2. 如果信号冲突，或检测到不受支持的管理器（yarn、bun 等），停下来询问用户使用哪个管理器再继续。
3. 只有在都未建立时，才默认使用 **pnpm**。

在本技能及其指南中，替换你解析出的结果：
- `<pm>` → 那个管理器，用于安装和包脚本（`<pm> install`、`<pm> run typegen`）。

`<pm>` 是一个文档占位符，不是 shell 变量 —— 展开它，不要原样敲。

**这到底是不是一个 Databricks App？** 不要假设应用是展示数据的唯一方式。对于简单的"带几个图表的仪表板"且无应用特定需求，托管 **AI/BI（Lakeview）仪表板**是更简单的路径 → 使用 `databricks-aibi-dashboards` 技能，而非本技能。只有当用户需要 AI/BI 无法提供的东西 —— 定制交互性/组件、写回、嵌入式或需认证的工作流、应用内的 Genie/聊天界面 —— 或明确要求应用时，才使用自定义 Databricks App。如果确实模棱两可，向用户呈现两个选项（托管 AI/BI 仪表板 vs 自定义应用）让用户选择，而不要默认用应用。一旦应用是正确的选择，本技能偏向基于应用的仪表板就没问题，而 `databricks-app-design` 涵盖如何把它做好。

**对于数据 UI 设计（任何展示数据的应用都必需）**：一旦确认用户想要自定义代码应用（而非托管 AI/BI 仪表板 —— 见上文），如果应用展示任何数据 —— KPI/概览页、报表、图表、表格、查询结果，或**对话式 / 聊天 / Genie 自然语言助手** —— 你必须使用 `databricks-app-design` 技能（与本技能一并）来决定布局、图表、KPI、语义色、必需状态和 AI 结果可信度，并将它们映射到 AppKit 组件。这包括聊天/Genie 应用，而不仅是静态数据视图 —— 有疑问就用它。

构建可部署到 Databricks Apps 平台的应用。

## 按阶段划分的必读

| 阶段 | 继续之前必读 |
|-------|------------------------|
| 脚手架化 | **⚠️ 停止 —— 在脚手架化之前审查状态存储指导并完成下方的数据访问决策门禁。** 父级 `databricks-core` 技能（认证、数仓发现）；然后运行 `databricks apps manifest` + `databricks apps init` 配合 `--features` 和 `--set`（参见下方 AppKit 章节） |
| 编写 SQL 查询 | [SQL 查询指南](references/appkit/sql-queries.md) |
| 编写 UI 组件 | [前端指南](references/appkit/frontend.md) |
| 使用 `useAnalyticsQuery` | [AppKit SDK](references/appkit/appkit-sdk.md) |
| 查询受治理的 UC 指标视图 | [指标视图指南](references/appkit/metric-views.md) |
| 添加 API 端点 | [自定义端点指南](references/appkit/custom-endpoints.md) |
| 使用 Lakebase（OLTP 数据库） | [Lakebase 指南](references/appkit/lakebase.md) |
| 添加 Genie 聊天 / Genie 驱动的应用 | [Genie 指南](references/appkit/genie.md) —— 遵循下方的 Genie 智能体工作流 |
| 使用 Model Serving（ML 推理） | [Model Serving 指南](references/appkit/model-serving.md) |
| 生成或编辑图像（文生图、图生图） | [图像生成指南](references/appkit/image-generation.md) |
| 托管 AI 智能体（使用工具的聊天机器人，**beta**） | [Agents 指南](references/appkit/agents.md) —— 从 `@databricks/appkit/beta` 导入 |
| 类型化数据契约（proto 优先设计） | [Proto-First 指南](references/appkit/proto-first.md) 和[插件契约](references/appkit/proto-contracts.md) |
| 管理 UC 卷中的文件 | [文件指南](references/appkit/files.md) |
| 从应用触发 / 监控 Lakeflow Jobs | [Jobs 指南](references/appkit/jobs.md) |
| 平台规则（权限、部署、限制） | [平台指南](references/platform-guide.md) —— 所有应用包括 AppKit 都要读 |
| 非 AppKit 应用（Streamlit、FastAPI、Flask、Gradio、Next.js 等） | [其他框架](references/other-frameworks.md) |

## 通用准则

- **应用名称**：平台 App 资源名最多允许 30 个小写字母、数字和连字符（无下划线）。对于用 `databricks apps init` 创建的 AppKit 项目，将基础名保持在 26 个字符以内，因为其开发工作流会添加 `dev-` 前缀。DABs 不添加该前缀。
- **验证**：部署前 `databricks apps validate --profile <PROFILE>`。
- **冒烟测试**（仅 AppKit）：在运行验证之前始终更新 `tests/smoke.spec.ts` 选择器。默认模板检查 "Minimal Databricks App" 标题和 "hello world" 文本 —— 这些在你的自定义应用中会失败。参见[测试指南](references/testing.md)。
- **冒烟测试选择器**：仅使用 Playwright 定位器 API —— `getByRole`、`getByText`、`getByPlaceholder`、`getByLabel`。`getByLabelText` 在 Playwright 中不存在（它是 React Testing Library 方法），运行时会抛 `TypeError`。参见[测试指南](references/testing.md)或 `npx playwright codegen`。
- **冒烟测试数据**：将结果集保持在 1 MB 分析事件负载上限以下。返回数千行的查询会导致 `INVALID_REQUEST: Event exceeds max size of 1048576 bytes` 和 `net::ERR_ABORTED`，使每个断言的 UI 元素缺失。使用 `LIMIT` 或聚合查询（例如 `COUNT(*) GROUP BY status`）—— 绝不要原始行转储。
- **AppKit 版本**：绝不要在 `package.json` 中覆盖 `@databricks/appkit` 或 `@databricks/appkit-ui` 版本 —— `databricks apps init` 设置正确版本。除非用户明确要求，不要安装这两个包的另一个版本。如果你需要不同版本，用 `databricks apps init --version <version>` 重新脚手架化。
- **身份验证**：由父级 `databricks-core` 技能涵盖。
- **AppKit API 接口面**：在编写调用 AppKit API（`createApp`、插件形状、`useAnalyticsQuery`、`useMetricView` 等）的代码之前，运行 `npx @databricks/appkit docs <section>` 并使用实际签名。训练数据有过时的形状；一个臆造的签名会在验证期间使 `tsc --noEmit` 失败。该文档随安装的 AppKit 一起提供，是权威来源。
- **TypeScript 强制转换**：绝不要使用 `as unknown as <T>` 双重断言 —— `appkit lint` 强制 `no-double-type-assertion`，一个违规就会使整个验证步骤失败。而应：用 Zod 收窄（`z.infer<typeof schema>`）、使用运行时类型守卫，或编写类型化映射函数。如果查询结果需要重塑，通过 queryKey 类型为行 schema 打类型，而非强制转换。

## 项目结构（`databricks apps init --features analytics` 之后）
- `client/src/App.tsx` —— 主 React 组件（从这里开始）
- `config/queries/*.sql` —— SQL 查询文件（queryKey = 不含 .sql 的文件名）
- `config/metric-views/definitions.json` —— 受治理的 UC 指标视图绑定（可选；参见[指标视图](references/appkit/metric-views.md)）
- `server/server.ts` —— 后端入口（`onPluginsReady` + Express 路由）
- `tests/smoke.spec.ts` —— 冒烟测试（⚠️ 必须为你的应用更新选择器）
- `client/src/appKitTypes.d.ts` —— 自动生成的类型（`<pm> run typegen`）

## 项目结构（`databricks apps init --features lakebase` 之后）
- `server/server.ts` —— 带 Lakebase 池 + Express 路由的后端
- `client/src/App.tsx` —— React 前端
- `app.yaml` —— 带 `database` 资源声明的清单
- `package.json` —— 包含 `@databricks/lakebase` 依赖
- 注意：**没有 `config/queries/`** —— Lakebase 应用在 Express 路由中使用 `appkit.lakebase.query()`，而非 SQL 文件

## 数据发现

在编写任何 SQL 之前，使用父级 `databricks-core` 技能进行数据探索 —— 按关键词搜索 `information_schema`，然后为你需要的表批量 `discover-schema`。不要跳过这一步。

**状态存储指导（在决策门禁之前评估）：**

如果用户的应用描述涉及存储或持久化数据 —— 表单、CRUD 操作、用户提交、订单、待办事项或其他用户生成内容 —— 该应用可能需要 Lakebase 数据库。

1. 在脚手架化之前**询问用户**应用是否需要持久化存储（Lakebase）。不要悄悄添加 Lakebase。
2. 如果确认，**询问是复用现有 Lakebase 项目还是创建新项目**（与下方 Genie 流程相同）—— 绝不要悄悄创建。使用 **`databricks-lakebase`** 技能获取分支和数据库资源名：
   - **复用：** 用 `databricks postgres list-projects` 列出，然后 `list-branches` / `list-databases`，让用户选择项目、分支和数据库；确认应用将拥有哪个 schema（一个全新/专用的 schema 可避免服务主体所有权冲突）。
   - **创建：** 创建一个新项目（自动置备 `production` 分支 + `databricks_postgres` 数据库）。
3. 用 `--features lakebase` 脚手架化并传入 `--set lakebase.postgres.branch=<BRANCH_NAME> --set lakebase.postgres.database=<DATABASE_NAME>`。
4. 如果应用**也**从 Unity Catalog 表读取，继续下方的数据访问决策门禁，确定是添加 `--features analytics` 还是使用 Lakebase 同步表。

除非用户明确要求持久化写回存储，否则不要为分析、仪表板或可视化应用添加 Lakebase。只读数据展示、过滤器和偏好不需要数据库。

## 开发工作流（遵循此顺序）

**数据访问决策门禁（脚手架化之前必需）：**

如果应用从 Unity Catalog / 湖仓表读取，你必须向用户展示下方对比并请他们选择。不要跳过。不要替他们选择。

| | **(A) Lakebase 同步表** | **(B) 分析** |
|--|---|---|
| 速度 | 亚秒级响应 | 需要几秒 |
| 最适用于 | 全文搜索、预输入、自动补全、实时查找、运营应用 | 仪表板、图表、聚合、KPI、过滤查询、浏览 |
| 如何工作 | 数据从 Delta 同步到 Lakebase Postgres | 读取时在 SQL 数仓上运行查询 |

展示表格后，添加简短建议。对于大多数只读应用，默认推荐分析（B）—— 仪表板、图表、过滤查询、浏览和聚合。仅当应用需要亚秒级延迟用于全文搜索、预输入/自动补全、按 ID 实时查找或运营数据服务时，才推荐 Lakebase 同步表（A）。注意：提示词中的"搜索"或"过滤"通常指 SQL WHERE 子句（分析），而非全文搜索（Lakebase）。始终让用户做最终决定。

用户选择后：
- (A) Lakebase 同步表 → 用 `--features lakebase` 脚手架化。完整工作流见 [Lakebase 指南](references/appkit/lakebase.md)。
- (B) 分析 → 用 `--features analytics` 脚手架化。**在分析内**，如果数据是受治理的 UC **指标视图**（预定义的语义度量/维度），通过指标视图路径查询 —— 见[指标视图](references/appkit/metric-views.md) —— 否则编写 `config/queries/` SQL。
- 两者 → 如果应用需要两种模式，用 `--features analytics,lakebase` 脚手架化。
- 如果应用不读取 Unity Catalog 数据（纯 CRUD、Genie、Model Serving），跳过此门禁并用适当的 `--features` 标志脚手架化。

**分析应用**（`--features analytics`）：

1. 在 `config/queries/` 中创建 SQL 文件
2. 运行 `<pm> run typegen` —— 核实所有查询显示 ✓
3. 阅读 `client/src/appKitTypes.d.ts` 查看生成的类型
4. **然后**用生成的类型编写 `App.tsx`
5. 更新 `tests/smoke.spec.ts` 选择器
6. 运行 `databricks apps validate --profile <PROFILE>`

**不要**在运行 typegen 之前编写 UI 代码 —— 类型不会存在，你会浪费时间在编译错误上。

**Lakebase 应用**（`--features lakebase`）：无 SQL 文件或 typegen。关于 `onPluginsReady` 模式，参见 [Lakebase 指南](references/appkit/lakebase.md)：启动时初始化 schema，在 `server/server.ts` 中注册 Express 路由，然后构建 React 前端。

## 何时使用什么

完成上方决策门禁后，使用此路由表：

- **读取分析数据 → 在图表/表格中展示**：使用带 `queryKey` prop 的可视化组件
- **读取分析数据 → 自定义展示（KPI、卡片）**：使用 `useAnalyticsQuery` hook
- **读取分析数据 → 展示前需要计算**：仍使用 `useAnalyticsQuery`，客户端转换
- **读取受治理的 UC 指标视图（语义层）**：使用 `useMetricView` hook + `config/metric-views/definitions.json` —— 见[指标视图](references/appkit/metric-views.md)
- **低延迟读取湖仓数据（查找、搜索、目录）**：使用 Lakebase 同步表 —— 见 [Lakebase 指南](references/appkit/lakebase.md)
- **读取/写入持久数据（用户、订单、CRUD 状态）**：通过 `onPluginsReady` 中的 Express 路由使用 Lakebase —— 见 [Lakebase 指南](references/appkit/lakebase.md)
- **对表的自然语言查询界面（Genie）**：使用 `genie()` 插件 —— 见 [Genie 指南](references/appkit/genie.md)
- **调用 ML 模型端点**：使用 `serving()` 插件 —— 见 [Model Serving 指南](references/appkit/model-serving.md)
- **调用基础模型 / UC 模型服务（`system.ai.*`）**：声明 `uc_securable`（`MODEL_SERVICE`）资源，并在 `/ai-gateway/mlflow/v1` 上调用服务名 —— 见[Unity Catalog 模型服务](references/appkit/model-serving.md#unity-catalog-model-services)和 `databricks-unity-gateway` 技能（不是 `serving()`，后者接受服务端点名）
- **从提示词生成或编辑图像**：流式 Express 路由（或聊天 UI 的 `agents` 工具）+ 原生 `fetch` 到支持图像的基础模型 —— 见[图像生成指南](references/appkit/image-generation.md)
- ***调用工具*（SQL、文件、Genie、MCP）、委托给子智能体，或流式多轮聊天并带人工审批的 AI 智能体**：使用 `agents()` 插件（从 `@databricks/appkit/beta` 导入，**beta**）—— 见 [Agents 指南](references/appkit/agents.md)
- **从应用触发或监控 Lakeflow Job**：使用 `jobs()` 插件 —— 见 [Jobs 指南](references/appkit/jobs.md)
- **⚠️ 绝不要添加自定义端点来对数仓运行 SELECT 查询** —— 始终使用 `config/queries/` 中的 SQL 文件
- **⚠️ 绝不要对 Lakebase 数据使用 `useAnalyticsQuery`** —— 它只查询 SQL 数仓

## 框架

### AppKit（推荐）

带类型安全 SQL 查询和内置组件的 TypeScript/React 框架。

**官方文档** —— 所有 API 细节的权威来源。使用来自已安装 `@databricks/appkit` 包的项目本地 `appkit` CLI：

```bash
npx @databricks/appkit docs                            # ← ALWAYS start here to see available pages
npx @databricks/appkit docs <query>                    # view a section by name or doc path
npx @databricks/appkit docs --full                     # full index with all API entries
npx @databricks/appkit docs "appkit-ui API reference"   # example: section by name
npx @databricks/appkit docs ./docs/plugins/analytics.md  # example: specific doc file
```

**不要猜测文档路径。** 先不带参数运行，从索引中选择。`<query>` 参数同时接受章节名（来自索引）和文件路径。文档是组件 props、hook 签名和服务器 API 的权威 —— 技能文件只涵盖反模式和陷阱。

**应用清单与脚手架化**

**脚手架化的智能体工作流：先获取清单，再构建 init 命令。**

1. **获取清单**（描述插件及其资源的 JSON schema）：
   ```bash
   databricks apps manifest --profile <PROFILE>
   # See plugins available in a specific AppKit version:
   databricks apps manifest --version <VERSION> --profile <PROFILE>
   # Custom template:
   databricks apps manifest --template <GIT_URL> --profile <PROFILE>
   ```
   输出定义了：
   - **插件**：每个有一个 key（用于 `--features` 的插件 ID），加上 `requiredByTemplate` 和 `resources`。
   - **requiredByTemplate**：如果为 **true**，该插件对此模板是**强制**的 —— **不要**将它添加到 `--features`（它会自动包含）；你仍必须通过 `--set` 提供其所有必需资源。如果为 **false** 或缺失，该插件是**可选**的 —— 只有当用户提示词表明他们想要该能力（例如分析/SQL）时才将其添加到 `--features`，然后通过 `--set` 提供其必需资源。
   - **资源**：每个插件有 `resources.required` 和 `resources.optional`（数组）。每个条目有 `resourceKey` 和 `fields`（对象：字段名 → 描述/环境）。对于你包含的每个插件的每个必需资源字段，使用 `--set <plugin>.<resourceKey>.<field>=<value>`。

2. **脚手架化**（仅使用 Databricks CLI）：
   ```bash
   databricks apps init --name <NAME> --features <plugin1>,<plugin2> \
     --set <plugin1>.<resourceKey>.<field>=<value> \
     --set <plugin2>.<resourceKey>.<field>=<value> \
     --description "<DESC>" --run none --profile <PROFILE>
   # --run none: skip auto-run after scaffolding (review code first)
   # With custom template:
   databricks apps init --template <GIT_URL> --name <NAME> --features ... --set ... --profile <PROFILE>
   ```
   可选使用 `--version <VERSION>` 指定特定 AppKit 版本。
   - **必需**：`--name`、`--profile`。名称：≤26 字符，仅小写字母/数字/连字符。`--features` 只用于用户想要的**可选**插件（`requiredByTemplate: false` 或缺失的插件）；强制插件不得列在 `--features` 中。
   - **资源**：为 (1) 所有 `requiredByTemplate: true` 的插件，以及 (2) 你添加到 `--features` 的任何可选插件，为每个必需资源（`resources.required` 中的每个字段）传递 `--set`。仅当用户请求时才为 `resources.optional` 添加 `--set`。
   - **发现**：使用父级 `databricks-core` 技能解析 ID（例如数仓：`databricks warehouses list --profile <PROFILE>` 或 `databricks experimental aitools tools get-default-warehouse --profile <PROFILE>`）。

**不要猜测**插件名、资源键或属性名 —— 始终从 `databricks apps manifest` 输出推导。例如：如果清单显示插件 `analytics` 有一个必需资源 `resourceKey: "sql-warehouse"` 和 `fields: { "id": ... }`，则包含 `--set analytics.sql-warehouse.id=<ID>`。

**执行身份（认证模式）** 要求 **databricks CLI `>= v1.20.0`**（首个带 auth-mode 特性的版本；`v1.19.0` 或更早版本中没有）。在没有它的 CLI 上这些标志不存在；每个资源都绑定到服务主体，下述标志不得使用。默认每个资源仍绑定到服务主体（SP），省略这些标志产生的输出与之前完全相同。

- `--auth-mode obo|sp` 设置应用范围的默认值。`sp` 是默认值。`--auth-mode obo` 仅适用于**能够**代表用户运行的资源；不能的（例如 `secret`、Lakebase）留在 SP 上，CLI 会打印列出它们的说明。`--auth-mode both` 在应用级别无效。
- `--set <plugin>.<resourceKey>.authMode=obo|sp|both` 设置一个资源的身份并覆盖应用范围的默认值。`both` 仅在这里按资源有效。
- 在无法运行 OBO 的资源上设置显式 `authMode` 是**错误**（CLI 会命名该资源和修复方法）。
- 交互式认证提示（服务主体 / 代表用户 / 混合）**仅**出现在完全交互式流程中。传入 `--features` 或 `--set` 意味着无提示并使用默认 SP。

每种模式发出什么，以及 `databricks apps validate` 的 OBO 检查，在[平台指南](references/platform-guide.md#execution-identity-per-resource)中。**默认用 SP；只有当应用必须强制查看用户自己的权限（行级或按用户数据访问）时才选择 OBO。** 混合很常见，例如分析数仓 OBO 加一个作为 SP 的作业。

**脚手架规则协议** —— `databricks apps manifest` 可能在模板级（顶层 `scaffolding.rules`）和各插件（`plugins[].scaffolding.rules`）发出 `scaffolding.rules`。每个块有 `must` / `should` / `never` 的简短指令字符串数组。按如下方式消费它们：

1. **收集** —— 对于你最终 `--features` 列表中的每个插件**以及**每个 `requiredByTemplate: true` 的插件，阅读 `plugins[].scaffolding.rules`。将它们与顶层模板 `scaffolding.rules` 合并成一个工作集，按来源（模板 vs `<plugin>`）标记。
2. **优先级** —— 清单规则覆盖烘焙进本技能的指令。当清单对某主题沉默时，本技能的内容是底线。
3. **阶段排序** —— 文本以 `Before init` 开头的规则必须在 `databricks apps init` **之前**执行。以 `After init` 开头的规则必须在 init 完成后执行（例如迁移、typegen、连接检查）。没有阶段前缀的规则在整个脚手架/开发循环中适用。
4. **冲突检测** —— 如果某个插件 `must` 规则在同一目标上与模板 `never` 规则矛盾（或反之），停下来询问用户遵循哪个再继续。不要悄悄选一个。将同一操作上的 `must` vs `never` 视为冲突；`should` 是建议性的，不阻止。
5. **报告** —— 在运行 `databricks apps init` 之前，将合并后的工作集按阶段（Before init / After init / Always）和按严重性（must / should / never）分组呈现给用户，使活动护栏明确。

**阅读 [AppKit 概览](references/appkit/overview.md)** 了解项目结构、工作流和实现前检查清单。

**Genie 智能体工作流** —— 当用户想要 Genie 驱动的应用时，**不要**从询问 Genie Space ID 开始。而是：

1. 询问应用应查询哪些 Unity Catalog 表（完全限定：`catalog.schema.table`）。
2. 询问是复用现有 Genie space 还是创建新的。
3. 如果创建：发现数仓，然后用 `databricks genie create-space` 创建空间（语法和序列化空间格式见 [Genie 指南](references/appkit/genie.md)）。
4. 如果复用：用 `databricks genie list-spaces --profile <PROFILE>` 发现现有空间并让用户选择。
5. 脚手架化或将 space ID 接入应用 —— 从 `databricks apps manifest` 推导 `--set` 键。

阅读 [Genie 指南](references/appkit/genie.md) 了解配置、SSE 端点和前端集成。

### 常见脚手架化错误

```bash
# ❌ WRONG: name is NOT a positional argument
databricks apps init --features analytics my-app-name
# → "unknown command" error

# ✅ CORRECT: use --name flag
databricks apps init --name my-app-name --features analytics --set "..." --profile <PROFILE>
```

### 目录命名

`databricks apps init` 以与 app 名称匹配的 kebab-case 创建目录。
应用名称必须为小写且仅用连字符（≤26 字符）。

### 其他框架（Streamlit、FastAPI、Flask、Gradio、Dash、Next.js 等）

Databricks Apps 支持任何作为 HTTP 服务器运行的框架。LLM 已了解这些框架 —— 挑战在于 Databricks 平台集成。

**在构建任何非 AppKit 应用之前阅读[其他框架指南](references/other-frameworks.md)。** 它涵盖端口/主机配置、`app.yaml` 和 `databricks.yml` 设置、依赖管理、网络和框架特定的陷阱。

### 部署后验证

部署后，验证应用正在运行：

```bash
databricks apps get <app-name> --profile <PROFILE> -o json   # Check app_status.state: RUNNING; the `url` field is the app's URL
databricks apps logs <app-name> --follow --profile <PROFILE>  # Stream live logs (Ctrl+C to stop)
```

> **注意：** `databricks apps logs` 需要 OAuth 身份验证，不适用于 PAT。如果使用 PAT 认证，用 `databricks apps get` 做状态检查。
