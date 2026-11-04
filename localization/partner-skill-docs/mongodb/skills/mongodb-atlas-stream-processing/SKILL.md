---
name: mongodb-atlas-stream-processing
description: "管理 MongoDB Atlas Stream Processing（ASP）工作流。处理工作区预配、数据源/数据汇连接、处理器生命周期操作、调试诊断以及层级（tier）大小设置。支持 Kafka、Atlas 集群、S3、HTTPS 和 Lambda 集成，用于流式数据工作负载与事件处理。不适用于一般 MongoDB 查询或 Atlas 集群管理。需要配备 Atlas API 凭据的 MongoDB MCP Server。"
license: Apache-2.0
metadata:
  version: "1.0.0"
  user-invocable: "true"
---

# MongoDB Atlas 流处理

使用 MongoDB MCP Server 的四个 MCP 工具来构建、运维和调试 Atlas Stream Processing（ASP）管道。

## 前提条件

本技能需要连接 **MongoDB MCP Server**，并配置：
- Atlas API 凭据（`apiClientId` 和 `apiClientSecret`）

这 4 个工具：`atlas-streams-discover`、`atlas-streams-build`、`atlas-streams-manage`、`atlas-streams-teardown`。

**所有操作都需要 Atlas project ID。** 如果未知，请先调用 `atlas-list-projects` 找到你的 project ID。

## 如果 MCP 工具不可用

如果 MongoDB MCP Server 未连接或缺少 streams 工具，请参见 [references/mcp-troubleshooting.md](references/mcp-troubleshooting.md) 了解诊断步骤和备用方案。

## 工具选择矩阵

### atlas-streams-discover —— 所有读操作
| 操作 | 使用时机 |
|--------|----------|
| `list-workspaces` | 查看一个项目中的所有工作区 |
| `inspect-workspace` | 查看工作区配置、状态、区域 |
| `list-connections` | 查看一个工作区中的所有连接 |
| `inspect-connection` | 检查连接状态、配置、健康状况 |
| `list-processors` | 查看一个工作区中的所有处理器 |
| `inspect-processor` | 检查处理器状态、管道、配置 |
| `diagnose-processor` | 完整健康报告：状态、统计、错误 |
| `get-networking` | PrivateLink 和 VPC peering 详情。可选：`cloudProvider` + `region` 以获取用于 PrivateLink 设置的 Atlas 账户详情 |

**分页**（所有 list 操作）：`limit`（1-100，默认 20）、`pageNum`（默认 1）。
**响应格式**：`responseFormat` —— `"concise"`（list 操作的默认值）或 `"detailed"`（inspect/diagnose 的默认值）。

### atlas-streams-build —— 所有创建操作
| 资源 | 关键参数 |
|----------|---------------|
| `workspace` | `cloudProvider`、`region`、`tier`（默认 SP10）、`includeSampleData` |
| `connection` | `connectionName`、`connectionType`（Kafka/Cluster/S3/Https/Kinesis/Lambda/SchemaRegistry/Sample）、`connectionConfig` |
| `processor` | `processorName`、`pipeline`（必须以 `$source` 开头，以 `$merge`/`$emit` 结尾）、`dlq`、`autoStart` |
| `privatelink` | `privateLinkConfig`（项目级，不绑定到特定工作区） |

**字段映射 —— 只填写所选资源类型对应的字段：**

- **resource = "workspace"：** 填写：`projectId`、`workspaceName`、`cloudProvider`、`region`、`tier`、`includeSampleData`。留空：所有 connection 和 processor 字段。
- **resource = "connection"：** 填写：`projectId`、`workspaceName`、`connectionName`、`connectionType`、`connectionConfig`。留空：所有 workspace 和 processor 字段。（类型特定的 schema 见 [references/connection-configs.md](references/connection-configs.md)。）
- **resource = "processor"：** 填写：`projectId`、`workspaceName`、`processorName`、`pipeline`、`dlq`（推荐）、`autoStart`（可选）。留空：所有 workspace 和 connection 字段。（管道示例见 [references/pipeline-patterns.md](references/pipeline-patterns.md)。）
- **resource = "privatelink"：** 填写：`projectId`、`privateLinkConfig`。注意：PrivateLink 是**项目级**，不是工作区级。`workspaceName` 不需要 —— 请省略。留空：所有 connection 和 processor 字段。

### atlas-streams-manage —— 所有更新/状态操作
| 操作 | 说明 |
|--------|-------|
| `start-processor` | 开始计费。可选 `tier` 覆盖、`resumeFromCheckpoint` |
| `stop-processor` | 停止计费。保留状态 45 天 |
| `modify-processor` | 处理器必须先停止。更改 pipeline、DLQ 或名称 |
| `update-workspace` | 更改 tier 或 region |
| `update-connection` | 更新配置（网络配置不可变 —— 必须删除并重建） |
| `accept-peering` / `reject-peering` | VPC peering 管理 |

**字段映射** —— 始终填写 `projectId`、`workspaceName`，然后按操作填写：

- `"start-processor"` → `resourceName`。可选：`tier`、`resumeFromCheckpoint`、`startAtOperationTime`（ISO 8601 时间戳，用于从特定时间点恢复）
- `"stop-processor"` → `resourceName`
- `"modify-processor"` → `resourceName`。至少提供以下之一：`pipeline`、`dlq`、`newName`
- `"update-workspace"` → `newRegion` 或 `newTier`
- `"update-connection"` → `resourceName`、`connectionConfig`。**例外：网络配置（例如 PrivateLink）在创建后无法修改** —— 请删除并重建。
- `"accept-peering"` → `peeringId`、`requesterAccountId`、`requesterVpcId`
- `"reject-peering"` → `peeringId`

**状态前置检查：**
- `start-processor` → 若处理器已处于 STARTED 则报错
- `stop-processor` → 若已 STOPPED 或 CREATED 则不做任何操作（不算错误）
- `modify-processor` → 若处理器处于 STARTED 则报错（必须先停止）

**处理器状态：** `CREATED` → `STARTED`（通过 start）→ `STOPPED`（通过 stop）。运行时错误时也可能进入 `FAILED`。修改要求处于 STOPPED 或 CREATED 状态。

**拆除安全检查：**
- **删除处理器** → 删除前自动停止（无需先手动停止）
- **删除连接** → 若有任何正在运行的处理器引用它则阻止。请先停止/删除引用它的处理器。
- **删除工作区** → 见下方详细工作流（第 108-111 行）。

### atlas-streams-teardown —— 所有删除操作
| 资源 | 安全行为 |
|----------|----------------|
| `processor` | 删除前自动停止 |
| `connection` | 若被正在运行的处理器引用则阻止 |
| `workspace` | 级联删除所有连接和处理器 |
| `privatelink` / `peering` | 移除网络资源 |

**字段映射** —— 始终填写 `projectId`、`resource`，然后：

- `resource: "workspace"` → `workspaceName`
- `resource: "connection"` 或 `"processor"` → `workspaceName`、`resourceName`
- `resource: "privatelink"` 或 `"peering"` → `resourceName`（即 ID）。这些是项目级资源，不绑定到特定工作区。

**删除工作区之前**，先检查它：
1. `atlas-streams-discover` → `inspect-workspace` —— 获取连接/处理器数量
2. 向用户展示：“工作区 X 含有 N 个连接和 M 个处理器。删除将永久移除全部。是否继续？”
3. 在调用 `atlas-streams-teardown` 前等待确认

## 关键：创建处理器前先验证

**在编写任何处理器管道之前，你必须调用 `search-knowledge`。** 这不是可选项。
- **字段验证：** 以 sink/source 类型进行查询，例如 "Atlas Stream Processing $emit S3 fields" 或 "Atlas Stream Processing Kafka $source configuration"。这能捕获诸如 S3 `$emit` 中 `prefix` 与 `path` 之类的问题。
- **模式示例：** 使用 `dataSources: [{"name": "devcenter"}]` 查询可用的管道示例，例如 "Atlas Stream Processing tumbling window example"。

构建非平凡处理器时，还可从官方 ASP 示例仓库获取示例：**https://github.com/mongodb/ASP_example**（quickstarts、示例处理器、Terraform 示例）。从 `example_processors/README.md` 开始查看完整的模式目录。

关键 quickstart：
| Quickstart | 模式 |
|-----------|---------|
| `00_hello_world.json` | 使用内联 `$source.documents` 配合 `$match`（零基础设施、临时） |
| `01_changestream_basic.json` | 变更流 → 滚动窗口 → `$merge` 到 Atlas |
| `03_kafka_to_mongo.json` | Kafka 源 → 滚动窗口汇总 → `$merge` 到 Atlas |
| `04_mongo_to_mongo.json` | 链式处理器：汇总 → 归档到独立集合 |
| `05_kafka_tail.json` | 实时 Kafka topic 监控（无 sink，类似 `tail -f`） |

## 管道规则与警告

**非法构造** —— 以下内容在流式管道中无效：
- **`$$NOW`**、**`$$ROOT`**、**`$$CURRENT`** —— 在流处理中不可用。绝不要使用它们。请改用文档自身的时间戳字段或 `_stream_meta` 元数据来表示事件时间，而不是 `$$NOW`。
- **将 HTTPS 连接作为 `$source`** —— HTTPS 仅用于 `$https` 富化或作为 sink，不能用作数据源
- **不带 `topic` 的 Kafka `$source`** —— topic 字段是必需的
- **没有 sink 的管道** —— 已部署的处理器需要终端阶段（`$merge`、`$emit`、`$https` 或异步 `$externalFunction`）（无 sink 仅在通过 `sp.process()` 时可用）
- **将 Lambda 作为 `$emit` 目标** —— Lambda 使用 `$externalFunction`（管道中段富化），而不是 `$emit`
- **`$validate` 配合 `validationAction: "error"`** —— 会导致处理器崩溃；请改用 `"dlq"`

**各阶段的必填字段：**
- **`$source`（变更流）**：包含 `fullDocument: "updateLookup"` 以获取完整文档内容
- **`$source`（Kinesis）**：使用 `stream`（不是 `streamName` 或 `topic`）
- **`$emit`（Kinesis）**：必须包含 `partitionKey`
- **`$emit`（S3）**：使用 `path`（不是 `prefix`）
- **`$https`**：必须包含 `connectionName`、`path`、`method`、`as`、`onError: "dlq"`
- **`$externalFunction`**：必须包含 `connectionName`、`functionName`、`execution`、`as`、`onError: "dlq"`
- **`$validate`**：必须包含带 `$jsonSchema` 的 `validator` 以及 `validationAction: "dlq"`
- **`$lookup`**：包含 `parallelism` 设置（例如 `parallelism: 2`）以实现并发 I/O
- **AWS 连接**（S3、Kinesis、Lambda）：必须先通过 Atlas Cloud Provider Access 注册 IAM 角色 ARN。务必与用户确认此点。详情见 [references/connection-configs.md](references/connection-configs.md)。

各阶段字段示例（含 JSON 语法）见 [references/pipeline-patterns.md](references/pipeline-patterns.md)。

**SchemaRegistry 连接：** `connectionType` 必须是 `"SchemaRegistry"`（不是 `"Kafka"`）。Schema 类型值区分大小写（使用小写 `avro`，而不是 `AVRO`）。必填字段和认证类型见 [references/connection-configs.md](references/connection-configs.md#schemaregistry)。

## MCP 工具行为

**引导式收集（Elicitation）：** 创建连接时，build 工具会通过 MCP elicitation 自动收集缺失的敏感字段（密码、bootstrap servers）。不要向用户索要这些内容 —— 让工具去收集。

**自动规范化：**
- `bootstrapServers` 数组 → 自动转换为逗号分隔的字符串
- `schemaRegistryUrls` 字符串 → 自动包装为数组
- `dbRoleToExecute` → 对于 Cluster 连接，默认为 `{role: "readWriteAnyDatabase", type: "BUILT_IN"}`

**工作区创建：** `includeSampleData` 默认为 `true`，会自动创建 `sample_stream_solar` 连接。

**区域命名：** `region` 字段使用 Atlas 特有的名称，因云服务商而异。使用错误的格式会返回令人费解的 `dataProcessRegion` 错误。

| 云服务商 | 云区域 | Streams `region` 取值 |
|----------|-------------|----------------------|
| **AWS** | us-east-1 | `VIRGINIA_USA` |
| **AWS** | us-east-2 | `OHIO_USA` |
| **AWS** | eu-west-1 | `DUBLIN_IRL` |
| **GCP** | us-central1 | `US_CENTRAL1` |
| **GCP** | europe-west1 | `EUROPE_WEST1` |
| **Azure** | eastus | `eastus` |
| **Azure** | westeurope | `westeurope` |

完整的区域映射表见 [references/connection-configs.md](references/connection-configs.md)。如果不确定，用 `atlas-streams-discover` → `inspect-workspace` 检查一个现有工作区，查看 `dataProcessRegion.region`。

## 连接能力 —— 源/汇参考

在创建管道之前，先了解每种连接类型能做什么：

| 连接类型 | 作为源（$source） | 作为汇（$merge / $emit） | 管道中段 | 说明 |
|-----------------|---------------------|--------------------------|--------------|-------|
| **Cluster** | ✅ 变更流 | ✅ $merge 到集合 | ✅ $lookup | 变更流监控 insert/update/delete/replace 操作 |
| **Kafka** | ✅ Topic 消费者 | ✅ $emit 到 topic | ❌ | 源必须包含 `topic` 字段 |
| **Sample Stream** | ✅ 示例数据 | ❌ 无效 | ❌ | 仅用于测试/演示 |
| **S3** | ❌ 无效 | ✅ $emit 到存储桶 | ❌ | 仅作汇 —— 使用 `path`、`format`、`compression`。支持 AWS PrivateLink。 |
| **Https** | ❌ 无效 | ✅ $https 作为汇 | ✅ $https 富化 | 可用于管道中段做富化，或作为最终汇阶段 |
| **AWSLambda** | ❌ 无效 | ✅ $externalFunction（仅异步） | ✅ $externalFunction（同步或异步） | **汇：** 必须 `execution: "async"`。**管道中段：** `execution: "sync"` 或 `"async"` |
| **AWS Kinesis** | ✅ 流消费者 | ✅ $emit 到流 | ❌ | 与 Kafka 模式类似 |
| **SchemaRegistry** | ❌ 无效 | ❌ 无效 | ✅ Schema 解析 | **仅元数据** —— 供 Kafka 连接用于 Avro schema |

**应避免的常见连接使用错误：**
- ❌ 将 `$externalFunction` 作为汇且 `execution: "sync"` → 汇阶段必须使用 `execution: "async"`
- ❌ 忘记变更流的存在 → Atlas 集群是强大的源，不只是汇
- ❌ 对 Kafka 使用 `$merge` → Kafka 汇请使用 `$emit`

按类型划分的详细连接配置 schema 见 [references/connection-configs.md](references/connection-configs.md)。

## 核心工作流

### 从零搭建
1. `atlas-streams-discover` → `list-workspaces`（检查现有工作区）
2. `atlas-streams-build` → `resource: "workspace"`（区域靠近数据，开发用 SP10）
3. `atlas-streams-build` → `resource: "connection"`（每个源/汇/富化各一个）
4. **验证连接：** 对每个连接执行 `atlas-streams-discover` → `list-connections` + `inspect-connection` —— 核对名称与目标一致，向用户呈现摘要
5. 调用 `search-knowledge` 验证字段名。从 https://github.com/mongodb/ASP_example 获取相关示例
6. `atlas-streams-build` → `resource: "processor"`（配置 DLQ）
7. `atlas-streams-manage` → `start-processor`（提醒计费）

### 工作流模式

**渐进式管道开发（推荐）：**
完整的 5 阶段生命周期见 [references/development-workflow.md](references/development-workflow.md)。
1. 从基础的 `$source` → `$merge` 管道开始（验证连通性）
2. 添加 `$match` 阶段（验证过滤）
3. 添加 `$addFields` / `$project` 转换（验证重塑）
4. 添加窗口或富化（验证聚合逻辑）
5. 添加错误处理 / DLQ 配置

**修改处理器管道：**
1. `atlas-streams-manage` → `action: "stop-processor"` —— **处理器必须先停止**
2. `atlas-streams-manage` → `action: "modify-processor"` —— 提供新管道
3. `atlas-streams-manage` → `action: "start-processor"` —— 重启

**调试故障处理器：**
1. `atlas-streams-discover` → `diagnose-processor` —— 一次性健康报告。务必先调用它。
2. **确定一个具体根因。** 将症状与诊断模式匹配：
   - **错误 419 + "no partitions found"** → Kafka topic 不存在或拼写错误
   - **状态：FAILED + 多次重启** → 连接级错误（绕过 DLQ），检查连接配置
   - **状态：STARTED + 零输出 + 窗口管道** → 可能是空闲 Kafka 分区阻塞了窗口关闭；为 Kafka `$source` 添加 `partitionIdleTimeout`（例如 `{"size": 30, "unit": "second"}`）
   - **状态：STARTED + 零输出 + 非窗口** → 检查源是否有数据；检查 Kafka offset 滞后
   - **memoryUsageBytes 较高且逼近层级上限** → 存在 OOM 风险；建议使用更高层级
   - **DLQ 数量上升** → 逐文档错误；在 DLQ 集合上使用 MongoDB `find`
   完整模式表见 [references/output-diagnostics.md](references/output-diagnostics.md)。
3. 在解读输出量之前，先判断处理器类型（告警型 vs 转换型 vs 过滤型）。
4. 针对诊断出的根因给出具体、有序的修复步骤。不要罗列假设性的场景。
5. 如需详细日志，引导用户前往 Atlas UI：**Atlas → Stream Processing → Workspace → Processor → Logs 标签页**。

### 链式处理器（多汇模式）
**关键：单个管道只能有一个终端汇**（`$merge` 或 `$emit`）。当用户请求多个输出目标时（例如“写入 Atlas 并且 emit 到 Kafka”），你必须说明单汇约束，并提议使用中间目标串联处理器。完整模式与示例见 [references/pipeline-patterns.md](references/pipeline-patterns.md)。

## 部署前与部署后检查清单

完整的部署前质量检查清单（连接验证、管道验证）与部署后验证工作流见 [references/development-workflow.md](references/development-workflow.md)。

## 层级大小与性能

层级规格、并行度公式、复杂度评分和性能优化策略见 [references/sizing-and-parallelism.md](references/sizing-and-parallelism.md)。

## 故障排查

涵盖处理器故障、API 错误、配置问题和性能问题的完整故障排查表见 [references/development-workflow.md](references/development-workflow.md)。

## 计费与成本

**Atlas Stream Processing 没有免费层级。** 所有已部署的处理器在运行时都会持续产生费用。

- 按小时计费，按秒计算，仅当处理器运行时产生
- `stop-processor` 停止计费；已停止的处理器免费保留状态 45 天
- **无需计费的原型验证：** 在 mongosh 中使用 `sp.process()` —— 临时运行管道而无需部署处理器
- 层级定价与成本优化策略见 `references/sizing-and-parallelism.md`

## 安全规则

- `atlas-streams-teardown` 和 `atlas-streams-manage` 需要用户确认 —— 不得绕过
- **在针对某个工作区调用 `atlas-streams-teardown` 之前**，你必须先用 `atlas-streams-discover` 检查该工作区，统计连接和处理器数量，然后在请求确认前向用户呈现这些信息
- **在创建任何处理器之前**，你必须按照 [references/development-workflow.md](references/development-workflow.md) 中“部署前验证”一节的说明验证所有连接
- 删除工作区将永久移除所有连接和处理器
- 停止处理器后，状态保留 45 天 —— 之后检查点将被丢弃
- `resumeFromCheckpoint: false` 会丢弃所有窗口状态 —— 先警告用户
- 不支持在工作区之间移动处理器（必须重建）
- 不支持 dry-run / 模拟 —— 说明你将做什么并请求确认
- 启动处理器前务必提醒用户注意计费
- 将 API 认证凭据存放在连接设置中，绝不要在处理器管道中硬编码

## 参考文件

| 文件 | 阅读时机 |
|------|-------------|
| [`references/pipeline-patterns.md`](references/pipeline-patterns.md) | 构建或修改处理器管道时 |
| [`references/connection-configs.md`](references/connection-configs.md) | 创建连接时（类型特定 schema） |
| [`references/development-workflow.md`](references/development-workflow.md) | 遵循生命周期管理或调试决策树时 |
| [`references/output-diagnostics.md`](references/output-diagnostics.md) | 处理器输出异常时（为零、偏低或错误） |
| [`references/sizing-and-parallelism.md`](references/sizing-and-parallelism.md) | 选择层级、调优并行度或优化成本时 |
