---
name: dbops-changeset
description: >-
  通过结构化工作流生成 Liquibase 数据库变更集：
  解析 schema+instance（从上下文或通过 API 发现），
  确认数据库引擎类型，生成 Liquibase YAML，并提交
  HITL 审查，提供 Accept / Deny / Accept & Commit 操作。在
  要求以 Liquibase 变更集创建、修改或删除数据库表、列、索引
  或约束，生成数据库迁移，或修复失败的迁移时使用。支持更新模式
  （精修现有变更集）和错误恢复模式（修复失败的迁移）。
metadata:
  author: Harness
  version: 2.1.1
  mcp-server: harness-mcp-v2
  module: DBOPS
  summary: Generate, refine, review, and execute Liquibase changesets with Harness DBOPS
license: Apache-2.0
compatibility: >-
  Requires Harness MCP v2 `dbops` toolset
  (resource types: database_schema, database_instance, database_default_authoring_instance,
  database_snapshot_object, database_execute_llm_authoring_pipeline). Connector lookup uses
  the `connectors` toolset `connector` resource. Review is done in chat (Accept / Deny /
  Accept & Commit).
---

# DBOPS 变更集生成

从自然语言描述生成 Liquibase 数据库变更集，锚定到来自 Harness DBOPS 服务的真实 schema 和 instance。

## 何时使用

当用户要求：

- 以 Liquibase 变更集操作创建、添加、修改或删除表、列、索引、约束或视图
- 生成数据库迁移或变更集
- 修复失败的迁移或更新现有变更集
- 以 Liquibase YAML 应用 schema 更改

## 前置条件

技能工具会自动加载此文件（SKILL.md）——请勿再次读取它。

在生成 Liquibase YAML 之前，使用技能工具结果中列出的确切路径读取 `reference.md`。它包含所有 Liquibase YAML 规则、变更类型、回滚模式、批量迁移指南、MongoDB JSON 字符串要求和澄清问题策略。在步骤 4 生成变更集时应用这些规则。

## 完整工作流

### 步骤 0：检查预置上下文（务必先执行此步）

在对话开始时，初始消息可能包含一个由 Harness 前端 UI 注入的、带有预选标识符的 JSON 块：

```json
{
  "dbops_schema_id": "users-schema",
  "dbops_instance_id": "prod-instance"
}
```

在进行任何工具调用之前，**读取此 JSON 块**（如果存在）。


| 上下文中有什么                       | 该怎么做                                            |
| --------------------------------------- | ----------------------------------------------------- |
| `dbops_schema_id` + `dbops_instance_id` | 跳过步骤 1 和 2——但**立即获取实例元数据**，通过 `harness_get(resource_type="database_instance", resource_id="<dbops_instance_id>", dbschema_id="<dbops_schema_id>")` 获取 `connector`（步骤 3 需要）并检查 `hasSnapshot`（步骤 3-B 需要）。 |
| 仅有 `dbops_schema_id`                  | 跳过步骤 1——使用此 schema ID。然后前往步骤 2-A |
| 两者都没有                                 | 完整执行步骤 1 和 2                                    |


### 步骤 1：发现数据库 schema（如果上下文中已有 `dbops_schema_id` 则跳过）

调用 `harness_list` 获取可用的 schema：

```
harness_list(resource_type="database_schema")
```

响应是对象的纯 JSON 数组。每个对象具有：

- `identifier`——在后续调用中用作 schema ID
- `name`——人类可读的名称
- `migrationType`——`"Liquibase"` 或 `"Flyway"`（仅支持 Liquibase）
- `instanceCount`——关联的实例数
- `primaryDbInstanceId`——为 LLM 编写指定的实例（可能为空）。若非空，步骤 2-A 直接将其用作 `instance_id`，无需进一步发现。

**歧义处理：**

- 如果数组只有**一个 schema**，自动选择它。
- 如果数组有**多个 schema**，使用 `AskUserQuestion`（选择模式）：
为每个显示：`[<name> (<identifier>) — <migrationType>, <instanceCount> instances]`。
- 如果数组为**空**："在此项目中未找到数据库 schema。请先在 Harness DBOPS 中创建一个。"
- 如果 `migrationType` 为 `"Flyway"`："此技能仅支持 Liquibase schema。"

### 步骤 2-A：从 schema 解析实例（当仅已知 `dbops_schema_id` 时）

当你拥有 `schema_id` 但没有 `instance_id` 时（来自上下文或步骤 1 选择之后）：

1. 调用 `harness_get` 获取完整 schema：
   ```
    harness_get(resource_type="database_schema", dbschema_id="<schema_id>")
   ```
2. 检查响应中的 `primaryDbInstanceId` 字段：
   - **如果已设置**：将其用作 `instance_id`。告知用户：
    "正在使用主实例 `<primaryDbInstanceId>` 用于 schema `<name>`。"
   然后获取实例以获取步骤 3 所需的 `connector` 字段：
   ```
   harness_get(resource_type="database_instance", resource_id="<primaryDbInstanceId>",
               dbschema_id="<schema_id>")
   ```
   从响应中读取 `connector`。
   - **如果为空或缺失**：转入步骤 2-B。

### 步骤 2-B：自动选择最佳实例（当 `primaryDbInstanceId` 为空时）

使用 `database_default_authoring_instance` 资源让服务器挑选最佳
实例（有元数据快照的最旧实例；否则回退到最旧的整体实例）：

```
harness_get(resource_type="database_default_authoring_instance", dbschema_id="<schema_identifier>")
```

响应为 `{ identifier: string, name: string, hasSnapshot: boolean, connector: string }`。

**处理响应：**

- **如果工具调用返回结果：** 将 `identifier` 用作 `instance_id`，将 `connector` 用作步骤 3 的连接器标识符（无需单独获取实例详情）。告知用户：
"正在使用实例 `<name>`（`<identifier>`）用于 schema `<schema_name>`。"
如果 `hasSnapshot` 为 `true`，该实例有可用于快照查询的元数据——对**任何**变更集意图（创建、修改或删除）继续执行步骤 3-B。如果为 `false`，完全跳过步骤 3-B。
- **未找到（404 或空结果）：** 回复：*"未找到 schema `<schema_name>` 的实例。请先在 Harness DBOPS 中添加一个实例——打开 **Harness → DBOPS → Schemas → `<schema_name>` → Add Instance**。"*——停止。不要向用户索要连接器标识符。不要继续执行步骤 3。不要生成变更集。

### 步骤 3：从连接器解析数据库引擎类型

**不变式。** 到此时，你必须已从步骤 0（快速路径实例获取）、步骤 2-A 或步骤 2-B（以适用者为准）获得非空的 `connector` 值。如果没有——无论出于何种原因——停止并向用户呈现步骤 2 的“实例未找到”消息。绝不要要求用户直接提供连接器标识符；连接器始终从现有 DBOPS 实例派生。

使用在步骤 0、步骤 2-A 或步骤 2-B（以运行者为准）中获得的 `connector` 字段。获取连接器以确定引擎类型：

```
harness_get(resource_type="connector", resource_id="<connector>",
            org_id="<org_id>", project_id="<project_id>")
```

连接器始终是 JDBC 连接器。读取 `connector.spec.url` 并映射前缀：


| `connector.spec.url` 前缀          | 引擎     |
| ------------------------------------ | ---------- |
| `jdbc:mysql://` 或 `jdbc:mariadb://` | MySQL      |
| `jdbc:postgresql://`                 | PostgreSQL |
| `jdbc:oracle:thin:`                  | Oracle     |
| `jdbc:sqlserver://`                  | MSSQL      |
| `jdbc:mongodb://`                    | MongoDB    |
| `jdbc:cloudspanner:`                 | Spanner    |
| `jdbc:db2://`                        | DB2        |
| `jdbc:sybase:`                       | Sybase     |
| `jdbc:sqlite:`                       | SQLite     |


**如果 URL 前缀无法识别**，使用通用 ANSI SQL 继续。不要询问用户。

### 步骤 3-B（可选）：快照元数据检查

当 `hasSnapshot` 为 `true` 时，对**任何**变更集意图（创建、修改或删除）运行此步骤。

**目的：**
- 对于 **CREATE** 意图：核实目标对象尚不存在（冲突检查）。
- 对于**修改/删除**意图：将名称与最新快照对齐。
- 对于**外键**意图：从快照元数据解析列映射（步骤 3-B-4）。

#### 3-B-1：列出现有对象名称

使用 `dbschema_id`、`dbinstance_id` 和相关的 `object_type`（`"Table"`、`"Index"`、`"View"` 等）调用：

```
harness_list(
  resource_type="database_snapshot_object",
  filters={
    dbschema_id: "<schema_id>",
    dbinstance_id: "<instance_id>",
    object_type: "Table"
  }
)
```

返回 `{ data: string[] }`——当前快照中该类型对象的名称。

**如果列表 API 出错或返回空的 `data` 数组**，将快照视为过期——继续执行步骤 4，不阻塞用户（过期快照容错）。

#### 3-B-2：CREATE 意图的冲突检查

如果用户的意图是**创建**一个对象（新表、索引、视图等），且目标名称出现在上面返回的 `data` 列表中：

- **不要生成 CREATE 变更集。**
- 清晰告知用户：
  > "`<object_type>` `<name>` 已存在于实例 `<instance_name>` 的当前快照中。
  > CREATE 变更集将会失败。你是否想改为修改它？
  > 如果你描述所需的更改，我可以生成 **ALTER TABLE**（添加列 / 修改列 / 添加索引 / 添加约束）
  > 变更集。"
- **停止并等待用户响应。** 用户澄清后从步骤 4 继续。

如果名称**不在**列表中（真正新对象的预期情况），继续执行步骤 4。

#### 3-B-3：为修改/删除意图获取完整元数据

修改或删除**现有**对象时，获取其完整元数据（列、索引等）——需要**非空**的 `object_names`：

```
harness_get(
  resource_type="database_snapshot_object",
  resource_id="<instance_id>",
  params={
    dbschema_id: "<schema_id>",
    object_type: "Table",
    object_names: ["<table_name>"]
  }
)
```

如果修改/删除意图的目标名称**不在**快照列表中，仍然继续——快照可能过期；不要阻塞用户。

#### 3-B-4：解析外键列映射

当意图涉及添加或修改外键（`addForeignKeyConstraint`）时运行，
包括在 `createTable` 期间添加的 FK 约束。

在一次 `harness_get` 调用中获取快照元数据。包含哪些表取决于意图：

- **在现有表上的 `addForeignKeyConstraint`：** 获取**两个** `baseTableName` 和
  `referencedTableName`——用于两侧的快照名称对齐和列评分。
- **带内联 FK 约束的 `createTable`：** **仅**获取 `referencedTableName`——
  新的基表尚不在快照中；基列来自变更集定义。

```
harness_get(
  resource_type="database_snapshot_object",
  resource_id="<instance_id>",
  params={
    dbschema_id: "<schema_id>",
    object_type: "Table",
    object_names: ["<base_table>", "<referenced_table>"]
  }
)
```

对于带内联 FK 的 `createTable`，仅使用 `object_names: ["<referenced_table>"]`。

应用 `reference.md` → **Foreign Key Column Resolution** →
**Column resolution** 中的列解析规则。如果快照元数据不可用，仅使用用户提供的
名称继续。

**规范的 DBOPS `resource_type` 值**（参见 `dbops` 工具集）：`database_schema`、`database_instance`、`database_default_authoring_instance`、`database_snapshot_object`、`database_execute_llm_authoring_pipeline`。

### 步骤 4：生成变更集

生成有效的 Liquibase YAML 变更集。所有 YAML 生成规则（结构、
必需字段、回滚、前置条件、时间戳、批量迁移、MongoDB
格式、澄清问题）都在本目录的 `**reference.md`** 中——严格遵循它们。

**变更集作者：** 从 `.harness_context/user_context.json`（如果存在）或对话中的 `## User Context:` 块派生作者名称。按顺序应用这些规则：

1. **检查用户名：** 在用户上下文中查找 `user.display_name`、`uid` 或 `username`。
2. **规范化用户名：** 按顺序应用这些转换：
   - 转换为小写
   - 移除多余空格
   - 将内部空格转换为 `-`（连字符）
   - 移除所有特殊字符（仅保留 `a-z`、`0-9` 和 `-`）
3. **回退到邮箱：** 如果没有可用用户名，从 `email` 字段提取：
   - 取 `@` 符号之前的部分（例如 `john.doe@harness.io` → `johndoe`）
   - 应用上述相同的规范化规则
4. **最终回退：** 如果用户名和邮箱都不可用，使用 `harness-ai`。

**示例：**


| 上下文值                                 | 派生作者   |
| --------------------------------------------- | ---------------- |
| `display_name: "John Doe"`                    | `john-doe`       |
| `display_name: "Jane_Smith-123"`              | `jane-smith-123` |
| `email: "dev.user@company.com"`（无用户名） | `devuser`        |
| 两者都不可用                             | `harness-ai`     |


**多轮累积（后续提示词）：** 如果对话中已包含先前生成的
`databaseChangeLog` YAML（来自任何先前的轮次，无论已接受、已拒绝
还是仍在待审查），该 YAML 就是**运行基线**。在每个后续轮次中，你
必须产出**完整累积的 changelog**——而不仅仅是本轮的增量。

对用户的意图进行分类并相应地合并：

| 意图 | 合并行为 |
|---|---|
| **添加**新对象（新表、列、索引等） | 将一个或多个新的 `changeSet` 块追加到基线 `databaseChangeLog` 末尾 |
| **修改**基线中已有 `changeSet` 的对象 | 就地更新匹配的 `changeSet` 块；保留其 `id` 和 `author` |
| **删除/移除**基线中已有 `changeSet` 的对象 | 移除或将匹配的 `changeSet` 块替换为相应的 `dropTable` / `dropColumn` 等 changeSet |
| **撤销/清空/重新开始** | 丢弃整个基线；生成全新的 `databaseChangeLog` |

始终呈现**完整的、合并后的 `databaseChangeLog`**（所有累积的 `changeSet` 条目）
以供审查——绝不要只呈现新的增量。

**更新模式（精修单个 changeSet）：** 如果用户明确精修或纠正
基线下某个特定 changeSet（例如 "change the column type in the dog table
changeset"），就地对该 `changeSet` 块应用修改。保留该 changeSet 的 `id` 和
`author`，并应用所请求的修改。仍然呈现完整
累积的 changelog。

**错误恢复模式：** 参见下面的**错误恢复模式**部分。

---

## 步骤 5：提交审查

`present_for_review` 工具**不可用**。在聊天中提交变更以供审查：

1. 在围栏 `yaml` 代码块中展示生成的完整 Liquibase YAML。
2. 清晰要求用户选择以下三个选项中的**一个**：
   - **Accept**——仅保存变更集（不执行流水线）
   - **Accept & Commit**——保存并执行 DBOPS 编写流水线
   - **Deny**——丢弃/请求更改并重新生成

YAML 之后的示例提示词：

> 请审查上面的变更集，并回复以下之一：
> **Accept**、**Accept & Commit** 或 **Deny**。

**关键：**

- 始终呈现全部三个选项：Accept、Accept & Commit、Deny。
- 始终呈现完整的、合并后的 `databaseChangeLog`——绝不要只呈现新的增量。
- 在继续执行步骤 6 之前等待用户的选择。
- 如果用户在做出选择前编辑了 YAML，**始终使用他们编辑后的 YAML**，而非你最初的生成内容。

---

## 步骤 6：处理用户的操作

### `"accept"`——仅保存

确认变更集已保存。不要执行任何流水线。回复一条简短的确认消息，引用 schema 和 instance 名称。

### `"deny"`——丢弃

询问他们想更改什么，并从步骤 4 重新生成。不要重新运行 schema/instance 发现——schema 和 instance 已选好。

### `"accept_commit"`——保存 + 执行流水线

在用户接受之后：

**重要——使用已解析的标识符：** `schema_id`、`instance_id` 和
实例的 `connector` 已在步骤 1–2 中解析并仍在上下文中。**不要重新列出
schema、重新获取实例或列出连接器**——使用你已有的值。

**重要——变更集编码：** 将 `changeset` 字段作为**纯文本 YAML** 发送，与用户
接受时的内容完全一致。**不要对其进行 base64 编码。**。

**重要——`conversation_id`（在 `harness_execute` 之前必需）：** 为 `database_execute_llm_authoring_pipeline` 资源调用 `harness_execute` 时，始终显式传递 `conversation_id`。按以下顺序从智能体上下文解析它：

1. `conversation_id`——Harness chat / 平台注入的对话 ID（首选）
2. `session_id`——当智能体或系统上下文中存在会话 ID 时，将其用作 `conversation_id` 值
3. **Cursor chat / 智能体记录 ID**——在 Cursor 中运行且上述两者都未注入时，解析活动聊天 UUID 并将其用作 `conversation_id`，无需询问用户：
   - 如果存在任何 Cursor 注入的会话字段，优先使用（例如 `session_id`、`composerId`、`chatId`）。
   - 否则在项目的 `agent-transcripts/<uuid>/` 目录下定位此聊天的智能体记录（通常为 `~/.cursor/projects/<project-slug>/agent-transcripts/<uuid>/<uuid>.jsonl`）。匹配包含当前对话最近用户查询的记录（或此聊天最近更新的记录），并将该 `<uuid>` 用作 `conversation_id`。
   - **不要**虚构随机 UUID。该值必须来自 Cursor 的聊天/会话身份或**此**对话的记录元数据。

这是进行执行流水线工具调用之前的**硬性要求**。当同时存在 Harness `conversation_id` 和 Cursor 会话 ID 时，优先使用平台注入的 ID。绝不要凭空虚构 UUID——`conversation_id` 是计费/幂等键。仅当步骤 1–3 全部失败时，停止——**不要**调用 `harness_execute`。告知用户没有 conversation/session ID 则流水线执行无法继续。

**重要——聊天运行器门控协议。** 用户已通过
**Accept & Commit** 表示同意，但聊天运行器在转发 `harness_execute` 之前可能
渲染一个单独的权限提示。以确定性的方式处理它：

| 工具响应或系统事件包含…… | 该怎么做 |
|---|---|
| `waiting for user to confirm` / `waiting for user to review` / `awaiting confirmation` / `pending user approval`（不区分大小写） | 精确回复：*"流水线执行正在等待你的批准——请批准权限提示以触发运行。在你批准之前，我不会调用其他工具。"* 不要调用任何工具。每次重试都会叠加另一个提示。 |
| `user confirmed` / `user approved` / `run approved`（不区分大小写） | 用与门控前完全相同的参数（相同的 `schema_id`、`instance_id`、`changeset`、`conversation_id`、分支标志）**重新发起一次** `harness_execute`。不要重新执行步骤 A–E。如果在调用返回前收到重复的确认事件，忽略它。`harness_execute` 返回后，将本轮任何进一步的确认事件视为无操作——不要第三次调用 `harness_execute`。 |
| `user declined` / `user cancelled` / `request cancelled`（不区分大小写） | 不要调用 `harness_execute`。回复：*"流水线触发已取消。单击 Accept & Commit 再次重试，或先让我修改变更集。"* |

**分支锁定。** 一旦步骤 A 选定自定义还是默认，该决定就锁定，
直到 `harness_execute` 返回结果或用户取消——绝不要在门控事件之后重新评估
它，即使 NG 设置可能已更改。

**参数因上下文压缩而丢失。** 如果收到 `user confirmed` 事件但
你的上下文不再保留原始 `harness_execute` 参数，回复：
*"已收到批准，但我需要重新生成。你能在变更集上重新确认 Accept & Commit 吗？"*——不要推测性地重建参数。

**仅**在 `harness_execute` 返回非空 `executionId` 后**发布成功消息**。

#### 步骤 A——读取 NG 设置以选择分支

```
harness_list(resource_type="setting", filters={ category: "DBOPS", scope: "project" }, compact=false)
```

查找 `identifier == "dbops_llm_authoring_pipeline"` 的条目。读取其 `value` 字段。

- 如果 `value` 是**非空字符串** → **自定义流水线分支**（继续步骤 B）。
- 如果 `value` 为**空**或该设置为**缺失** → **默认流水线分支**（跳到步骤 E）。

---

#### 步骤 B——获取流水线的运行时输入模板（仅自定义流水线分支）

```
harness_get(
  resource_type="runtime_input_template",
  resource_id="<value from Step A>",
  account_id="<account>", org_id="<org>", project_id="<project>"
)
```

响应中的 `inputSetTemplateYaml` 列出管理员流水线声明的每个 `<+input>` 令牌。此技能负责这三个保留令牌（服务器期望这些确切的 YAML 键——参见 dbops `database_execute_llm_authoring_pipeline` 资源 schema）：

- `dbSchema`——自动填充为 `schema_id`。
- `dbInstance`——自动填充为 `instance_id`。
- `changeset`——自动填充为纯文本变更集 YAML。

流水线的 `stepGroupInfra.spec.connectorRef` 也是一个 `<+input>` 令牌，但由**服务器端**从 DBOPS 实例填充——此技能从不发送值，也从不向用户索要。

**如果模板字段的名称与上述任何规范名称或别名都不匹配，将其视为非保留字段，并在步骤 C 中征询。** 不要从名称相似的上下文值中静默地自动填充它（例如名为 `schema` 或 `db_schema` 的模板字段是非保留的——询问用户）。

#### 步骤 C——对比并征询剩余的必需输入（仅自定义流水线分支）

> **服务器端说明（当前状态）：** db-devops-service 执行端点目前会
> 拒绝任何非空的 `runtime_inputs` 映射，并报错 `"custom runtimeInputs are not yet supported (pipeline-service contract pending)"`。在该契约落地之前，**如果
> 模板声明了保留集之外的任何必需字段，请停止并告知用户
> 所配置的流水线与聊天执行不兼容**。完全跳过下面的征询循环。
> 一旦服务器支持自定义输入，移除此说明并按记录的循环执行。

对于每个非保留的模板字段，通过 `AskUserQuestion` 向用户询问值——
将所有此类字段视为必需（我们无法可靠地从模板推断可选性）。

- 使用原始字段名作为提示标签。
- 每个字段一个问题——`AskUserQuestion` 设计为单问题；不要批量。
- 不要尝试从模板解析默认值；始终重新征询。

将响应收集到 `runtime_inputs` 映射中。

**取消规则。** 如果以下任一条件成立，停止且不要调用步骤 D：

- `AskUserQuestion` 返回取消（无答案，用户关闭了提示）。
- 响应为空或仅含空白。
- 响应匹配 `cancel`、`skip`、`stop` 或 `abort`（不区分大小写的整词）。

任何其他自由格式文本都是真实答案——原样复制到 `runtime_inputs` 映射中。
不要用不完整的映射继续步骤 D。

#### 步骤 D——触发流水线（自定义流水线分支）

调用整合的 dbops 资源（单次工具调用——服务器触发执行并以原子方式记录
计费事件）：

```
harness_execute(
  resource_type="database_execute_llm_authoring_pipeline",
  action="run",
  schema_id="<schema_id>",
  instance_id="<instance_id>",
  conversation_id="<conversation_id or session_id from agent context>",
  changeset="<plain-text accepted YAML>",
  pipeline_identifier="<value from Step A>",
  runtime_inputs={ <field>: <value>, ... }   # OMIT this key entirely when no fields were elicited; do NOT pass {}
)
```

**如果调用返回错误或超时**，原样呈现确切的错误消息并停止。
不要自动重试，也不要回退到默认流水线分支。
不要虚构导航路径、执行状态声明或重试邀请。
`openInHarness` 链接**必须**仅在响应提供时展示——绝不要手动构建它。

跳到步骤 F。

---

#### 步骤 E——触发流水线（默认流水线分支）

```
harness_execute(
  resource_type="database_execute_llm_authoring_pipeline",
  action="run",
  schema_id="<schema_id>",
  instance_id="<instance_id>",
  conversation_id="<conversation_id or session_id from agent context>",
  changeset="<plain-text accepted YAML>",
  use_default_pipeline=true
)
```

服务器在首次使用时对 `dbops_default_pipeline` 执行获取或创建，然后触发
执行。服务器从 DBOPS 实例的连接器解析步骤组基础设施的 K8s 连接器——
此技能不发送任何基础设施提示。

**如果调用返回错误或超时**，原样呈现确切的错误消息并停止。
不要虚构导航路径、执行状态声明或重试邀请。
`openInHarness` 链接**必须**仅在响应提供时展示——绝不要手动构建它。

继续执行步骤 F。

---

#### 步骤 F——显示实时执行链接

两个分支都返回：

```
{ executionId, pipelineIdentifier, openInHarness }
```

立即发布——**仅当响应中 `openInHarness` 为非空字符串时**：

```
Pipeline started — <a href="{openInHarness}" target="_blank">view execution</a>
```

如果 `openInHarness` 缺失或为空，改为发布：

```
Pipeline started — execution ID: `<executionId>`.
```

**不要手动构建 URL。** 链接必须来自响应。

**不要主动轮询。** 当用户询问状态时，调用
`harness_get(resource_type="execution", execution_id="<executionId>")` 一次——这会命中
支撑 `openInHarness` 链接的同一 pipeline-service 执行端点。

**状态分诊：**

- **Running / Queued / Paused / Waiting**——报告："运行中——步骤 `<stepName>` 为 `<stepStatus>`"。
- **Success**——"变更集应用成功"——如果 `openInHarness` 存在，追加 `— <a href="{openInHarness}" target="_blank">view execution</a>`。不要手动构建 URL。
- **Failed / Aborted / Expired**——读取失败的步骤名称和 `failureInfo.responseMessages[0].message`。
  - 如果失败的步骤名称包含 `changeset`/`liquibase`/`migration`，或消息
  包含这些关键词或 `checksum` / `precondition` / `validation error`——这是
  **变更集错误**。提供错误恢复：进入错误恢复模式（参见下面的**错误
  恢复模式**部分）并重新生成纠正后的变更集。
  - 对于任何其他步骤失败（基础设施、连接器、K8s、网络、权限）——原样报告
  错误并停止。不要自动调试。回复："流水线在步骤 `<stepName>` 失败：
  `<message>`——<a href="{openInHarness}" target="_blank">view execution</a>。这是
  基础设施或配置问题——请检查你的 Harness 流水线设置。"

---

## 重要规则

- 在聊天中提交变更集以供审查，并始终提供全部三个选项：**Accept**、**Accept & Commit**、**Deny**。
- 始终在审查消息中包含完整的 YAML。
- 使用用户接受/编辑后的 YAML——如果用户更改了它，则不要使用你最初的生成内容。
- 在针对 `database_execute_llm_authoring_pipeline` 进行任何 `harness_execute` 之前，从智能体上下文解析 `conversation_id`（`conversation_id`，否则 `session_id`，否则 Cursor chat/记录 UUID）。没有它不要执行；当记录 UUID 可在本地解析时，不要向用户索要 Cursor chat ID。
- 对于 `accept_commit`，发布 `openInHarness` 链接（如果存在）并停止。不要主动轮询——服务器异步核对状态。如果用户之后询问状态，按步骤 F 所述调用一次 `harness_get`。
- 对于 `deny`，跳过重新发现——schema 和 instance 已已知。
- 对于错误恢复，在呈现纠正后的 YAML 之前先解释修复。
- 如果 DBOPS 服务在 schema/instance 发现期间返回错误，清晰报告错误，并建议用户检查其 Harness DBOPS 项目设置。

## 错误恢复模式

**触发条件：** 仅针对变更集/Liquibase 失败进入此模式：
- `FAILED` 流水线状态事件恢复对话（自动轮询路径），或
- 用户要求修复失败的迁移，或报告 Liquibase / checksum / precondition / OPA 错误

**不要因基础设施或配置失败而进入此模式**（连接器损坏、K8s 调度失败、
密钥缺失、流水线配置错误等）。对于这些，原样报告错误并回复："流水线在步骤 `<stepName>` 失败：`<message>`——这是基础设施或配置问题——请检查你的 Harness 流水线设置。" 不要尝试重新生成变更集。

**不要重新运行步骤 1–2（schema/instance 发现）。** `schema_id`、`instance_id` 和
`connector` 已从原始会话解析。直接跳到下面的步骤。

### 步骤

**1. 从上下文提取失败详情：**
- 从系统事件（自动路径）：`failed_step`、`failure_message`、`execution_id`、`open_in_harness` 链接。
- 从用户消息（手动路径）：用户粘贴或描述的错误文本。
如果系统事件提供了 `execution_id` 但没有 `failure_message`，调用：
```
harness_diagnose(resource_type="execution", execution_id="<execution_id>")
```
从响应中读取完整步骤日志以获取 Liquibase 错误文本，然后再进行根因分析。

**1a. 在继续之前对失败进行分类：**
| 失败包含 | 分类 | 操作 |
|-----------------|----------------|--------|
| `liquibase`、`changeset`、`checksum`、`precondition`、`validation`、`OPA policy`、`migration` | 变更集错误 | 继续下面步骤 2 |
| 连接器错误、K8s / pod 失败、密钥未找到、网络超时、流水线配置 | 基础设施错误 | 原样报告 + 停止。不要重新生成。 |
| 模糊 | 视为基础设施错误——不要猜测变更集根因 |

**2. 确定根因。**
阅读 `reference.md` → "Author, Update Mode, and Error Recovery" 部分。常见原因：
- 缺少 `rollback` 块
- 目标引擎的非法或保留表/列名
- 目标引擎的数据类型错误（例如 `DATETIME2` 与 `TIMESTAMP`）
- changelog 内重复的 `changeSet` id
- 无效的前置条件语法或缺少 `onFail`
- OPA 策略违规——原样提取策略的错误文本，纠正变更集以满足策略

**3. 修补有问题的 changeSet：**
- 仅修复错误所需的内容。保留 `id`、`author` 和所有未受影响的 changeSet。
- 产出完整累积的 `databaseChangeLog`（绝不要只输出增量）。

**4. 在呈现纠正后的 YAML 之前，用文本消息解释修复：**
说明：错误是什么、受影响的 changeSet 是哪个，以及为修复做了哪些更改。

**5. 提交纠正后的 YAML 以供审查（步骤 5）**，提供全部三个选项：Accept、Accept & Commit、Deny。
