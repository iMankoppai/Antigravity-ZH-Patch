---
name: zoho-crm
description: 'Zoho CRM v8.0 编排层 —— 在所有 CRM 开发者工具之间进行原语选择、代码生成和校验：REST API、Deluge Functions、ClientScript、Widgets、COQL、Queries Workbench 和 Connections。无论是否连接 MCP 工具均可使用。当出现 "Zoho CRM"、"Deluge script"、"ClientScript"、"COQL"、"CRM widget"、"zoho.crm.*"、"invokeurl"、"CRM automation"、"CRM integration"、"CRM query"、"Queries Workbench"、"Blueprint"、"Workflow Rule" 或任何 CRM 模块操作时触发。不要用于 Catalyst、Zoho Creator 或其他 Zoho 产品 —— 请改用相应的产品技能。' 
argument-hint: 'Describe your Zoho CRM use case (e.g. "fetch all open leads", "write a Deluge script to update a field", "create a ClientScript for a custom button")'
metadata: 
  version: "0.0.2"
---

# zoho-crm

## 目的

给定任意用例，本技能会：
1. 选择正确的原语，加载相关的 DOU 节点 / 参考文档
2. 产出解决方案（通过已连接的 MCP 工具，或作为精确的请求负载）并校验输出

## 何时使用

| 用例 | 子技能 |
|----------|----------|
| 通过 HTTP 读取、创建、更新、删除 CRM 记录 | [API](./references/api.md) |
| 编写服务端自动化 / 自定义函数 | [函数 / Deluge](./references/functions.md) |
| 为记录页面 / 列表视图添加 UI 逻辑 | [ClientScript](./references/clientscript.md) |
| 构建嵌入式 UI 组件 | [小组件（Widgets）](./references/widgets.md) |
| 构建绑定到 Canvas 视图、Kiosk 或自定义相关内容列表的已保存查询（在 Workbench 中以 UI 方式编写） | [查询（Queries）](./references/queries.md) |
| 使用 COQL（CRM Object Query Language）查询 CRM 数据 | [COQL](./references/coql.md) |
| 通过 OAuth 连接到外部服务 | [连接（Connections）](./references/connections.md) |

## 逐步推理流程

### 步骤 1 — 理解目标

| 维度 | 提取内容 | 示例 |
|---|---|---|
| 动作 | 应该发生什么？ | fetch、create、update、trigger、display、query |
| 实体 | 哪个 CRM 模块或对象？ | Leads、Contacts、Deals、自定义模块 |
| 上下文 | 在哪里运行？ | 服务端、UI 页面、定时、事件触发 |

> **关卡**：如果上述任一维度无法从单一合理解释中无歧义地推断出来 —— 停下并询问，然后再进入步骤 2。只询问必要的内容；对于有清晰默认值的可选参数可以省略。

### 步骤 2 — 选择正确的原语

使用下面的**决策矩阵**作为主要路由依据。如果用例不匹配任何一行，则应用分层规则：**服务端**（无需浏览器访问）→ Function / REST API / COQL / Queries；**浏览器端** → Widget / Client Script。

#### 决策矩阵 —— 需求 → 使用

**服务端**

| 需求 | 使用 |
|---|---|
| 在 CRM 中运行 Deluge 后端代码 —— 处理记录、执行 CRUD 操作、调用 Zoho CRM API、发送邮件/短信，或执行任何服务端业务逻辑 | **Function** —— 通过 Workflow Rule、Blueprint、Schedule、Button、Validation Rule 或 Serverless Endpoint 触发 |
| 调用外部（非 Zoho）API 并将结果写入 CRM | 通过 Workflow Rule 或 Button 的 **Function**（使用命名的 Connection 进行身份验证） |
| 将自定义 Deluge 逻辑作为 REST API 暴露给外部系统 | 通过 Serverless Endpoint 的 **Function** |
| 在 CRM 内运行 cron 任务 | 通过 Scheduled Function 的 **Function** |
| 将自定义相关内容列表转换为 Function | 通过 `related_list.*` 类别的 **Function** —— 这是唯一能直接在记录详情页渲染数据的类别；除非明确说明使用不同的触发类型（按钮、工作流、API 端点），否则无需澄清 |
| 从外部系统或脚本读取 / 创建 / 更新 / 删除 CRM 记录，或执行任何 CRM 特有操作 | **REST API** |
| 从 Deluge、外部 API 调用方或临时代码以编程方式获取 CRM 数据 | **COQL** |
| 在 Canvas、Kiosk 或自定义相关内容列表中显示由查询驱动的数据 | **Queries**（在 Workbench UI 中构建 —— `Setup → Developer Hub → Queries`） |
| 从 Function 或 ClientScript 向外部 OAuth 服务进行身份验证 | **Connections**（在 `Setup → Developer Hub → Connections` 中创建；在 `invokeurl` 或 `ZDK.Apps.CRM.Connection.invoke` 中按链接名引用） |

**浏览器端**

| 需求 | 使用 |
|---|---|
| 在 CRM 内渲染或嵌入自定义 HTML 或第三方 UI 组件 | **Widget** |
| 根据另一个字段的值隐藏某个字段，或对记录页面进行任何其他 Web UI 自定义 | **Client Script** |
| 在 CRM Web UI 中保存记录前校验字段输入 | **Client Script**（即时 UI 反馈）或通过 Validation Rule 的 **Function**（服务端强制校验）—— 默认选择 **Client Script**，除非用户明确要求服务端强制校验 |
| 在 Web UI 中按钮操作前显示确认对话框 | **Client Script**（对话框）+ **Function**（后端操作） |

> **决胜规则**：默认选择列在前面的选项；仅当用户的上下文明确倾向于第二项时才覆盖。

> **检查**：确认所选原语与步骤 1 中的动作 + 实体 + 上下文相匹配。若不匹配 —— 重新检查矩阵，或返回澄清环节。

> **通用约束**：所有模块和字段引用都使用 API 名称 —— 绝不使用显示标签。

## 权威来源层级

**当对语法、签名或限制有疑问时，按以下顺序查阅来源**（而非依据偏好或记忆）：

1. **DOU 节点**（`assets/`）—— 当前的方法签名、参数、返回类型和关键失败模式。**代码生成时首先使用它。**
2. **Zoho 官方公开文档**（zoho.com/deluge/help/、zoho.com/crm/api/）—— 当 DOU 节点不完整或缺失时使用。
3. **参考文件 + 内联示例**（api.md、functions.md 等）—— 精选摘要；可能落后于 DOU 或官方文档。
4. **记忆中的知识** —— 可信度最低；务必与 DOU 交叉核对。

> **关键规则**：参考文件是精选摘要，并非权威。DOU 节点是事实基准。如果参考文件示例与 DOU 节点冲突，以 DOU 节点为准。

### 步骤 3 — 加载所选原语的参考文件

打开上文“何时使用”表中匹配的原语所对应的参考文件，并遵循其**执行说明**。（特殊情况：如果原语是源类型为 COQL 的 **Queries**，还需打开 [references/coql.md](./references/coql.md)。）

> 如果某个参考文件无法访问，请告知用户，说明缺失的是哪个文件，并且不要生成依赖其内容的代码。

### 步骤 4–5 — 执行与校验

遵循步骤 3 中参考文件里的**执行说明**。在呈现解决方案后，运行其**校验清单**；以通俗语言解释浮现的错误，如果目标仅部分达成，则建议后续步骤。

## 身份验证与范围参考

**始终从 OAS 规范文件中推导范围**（依据 [api.md](./references/api.md) 步骤 6，操作级别的 `security` 字段）。对于所有标准范围，使用 OAS 规范 —— 下表仅涵盖不显而易见的特殊情况。

| 范围 | 说明 |
|-------|------|
| `ZohoCRM.coql.READ` 和 `ZohoCRM.modules.{module}.READ` | COQL 查询 —— **需要两个独立的范围**；仅 `coql.READ` → `OAUTH_SCOPE_MISMATCH` |

基础 URL：`https://www.zohoapis.com/crm/v8/`
