---
name: databricks-zerobus-ingest
description: "使用 Zerobus Ingest 将应用、服务、设备或脚本中的记录直接推送到 Unity Catalog Delta 表：SDK（Python、TypeScript、Go、Java、Rust、C++、.NET）、REST、OTLP、MQTT、Arrow Flight，或 Apache Kafka 兼容的生产者 API，无需运行消息总线。用于将近实时地将事件、遥测、日志、IoT 数据、CDC 或列式批次流式传入 Databricks；连接现有采集器和日志转发器（OpenTelemetry、Debezium、Vector、Telegraf、Cribl）；替换仅用于馈送湖仓的消息总线；或调试 Zerobus 认证、schema、吞吐或投递问题。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.2.0"
parent: databricks-core
---

# Zerobus Ingest

**Zerobus Ingest**（Lakeflow Connect 的一部分）是一个托管的、**基于推送**的摄取服务：生产者发送记录，记录落地到 **Unity Catalog 托管 Delta 表**中，无需运行代理或摄取集群。SDK 为你做实际工作：**OAuth**、**缓冲**、**偏移跟踪**、**持久性确认**，以及**自动恢复**（在瞬时失败后重放未确认的记录）。

**首先**：使用父级 `databricks-core` 技能进行 CLI 安装、身份验证和 profile 选择。

## 构建之前先决定

**推荐 Zerobus**，当数据从应用、服务或设备推送；目标是 Delta 表；工作负载是持续的或事件驱动的且需要减震器（Zerobus 约 5 秒落地数据，且当几分钟可接受时仍适合）；且有一个主要下游消费者（或 Apache Kafka、Amazon Kinesis、Azure Event Hubs、Google Cloud Pub/Sub 等消息总线只是通往湖仓的管道）。

**不要推荐 Zerobus**，当湖仓之外的许多独立消费者需要该数据（使用 Apache Kafka、Amazon Kinesis、Azure Event Hubs、Google Cloud Pub/Sub 等消息总线），或数据已在 Kafka 或其他总线中且必须拉入湖仓（使用 Lakeflow Connect 托管 Kafka 连接器或 Spark Structured Streaming）。解释原因并指出替代方案。在**排除 Zerobus** 用于文件、SaaS 应用或数据库之前，检查 [references/choose-an-interface.md](references/choose-an-interface.md)：列式数据批次可以通过 Arrow Flight，而能推送到 Zerobus 兼容 API 的 SaaS 应用可以使用 Zerobus。

**优先使用现成路径。** 如果源已经支持 **OpenTelemetry**、**Kafka** 或 **MQTT**，或运行 **Debezium、Vector、Telegraf 或 Cribl**，将用户指向该路径而非编写 SDK 代码。所有这些，加上完整决策树，都在 [references/choose-an-interface.md](references/choose-an-interface.md) 中。对于现有 **Kafka 生产者**，阅读 [references/kafka.md](references/kafka.md)；对于 **MQTT v5** 设备，[references/mqtt.md](references/mqtt.md)；对于**列式批次**（Parquet、Arrow、DataFrame），[references/arrow-flight.md](references/arrow-flight.md)；对于从 Kafka 或 Kafka 兼容系统迁移管道，阅读 [references/migration-from-kafka-compatible-systems.md](references/migration-from-kafka-compatible-systems.md)。

## 工作流

将请求视为对话：**一次问一个问题**，如果有可用的话使用选择题工具，并始终提供 **"Not sure, help me decide"**。跳过用户已回答的任何问题。

**许多用户不了解 Databricks。** 如果用户是刚接触 Databricks 的应用、DevOps 或平台工程师，在你第一次使用每个 Databricks 术语时用平实的语言解释它，映射到他们熟悉的东西（表名就像 Postgres 中的 `database.schema.table`；服务主体就像服务账号），并**主动提出为他们设置缺失的东西**。阅读 [references/new-to-databricks.md](references/new-to-databricks.md)。

### 步骤 0：展示你的计划
列出你将运行的步骤以及你将创建的内容（表、授权、生产者文件）。在创建任何 catalog、schema、表或服务主体之前询问；绝不假设用户想要一个新的。

### 步骤 1：询问生产者在哪里运行
> 向 Zerobus 发送数据的生产者将在哪里运行？
> - **Databricks 之外**：一个服务、应用、设备或网关，或我的笔记本电脑
> - **Databricks 之内**：一个 Lakeflow Job 或一个 Databricks App
> - **不确定，帮我决定**

- **Databricks 之外**（最常见）：将生产者写为用户保留的本地文件；从环境变量读取凭证。
- **Databricks 之内**：阅读 [references/databricks-apps.md](references/databricks-apps.md)。Python SDK 在经典和**无服务器**计算上运行；将其安装为作业、集群或环境依赖。
- **不确定**：询问什么生成数据。数据几乎总是源自 Databricks 之外，所以默认在那里。

### 步骤 2：只问你还需要的那些问题
问题分为三组。**先问必需的问题**：它们是构建第一个客户端所需的全部。只有当用户提出该主题，或答案会改变你的推荐或部署时，才问高级问题。

**构建客户端所必需：**
1. **数据是什么，来自哪里？** 应用事件、日志、指标、trace、数据库 CDC、IoT 或传感器读数、点击流？这决定路线：trace、日志和指标通常适合 **OTLP**，数据库变更适合 **Debezium**，现有 Kafka 生产者适合 **Kafka 兼容 API**（[references/choose-an-interface.md](references/choose-an-interface.md)）。
2. **目标表**：三段式名称、是否已存在，以及记录具有什么形状（一个样本事件有帮助）。是否有任何字段必须始终存在，以及形状会随时间变化吗（[references/schema-management.md](references/schema-management.md)）？
3. **语言和运行时**：以及**环境能否使用预编译二进制 / 原生库？** Python、TypeScript、Java、Go（cgo）、C++ 和 .NET SDK 加载预构建的 Rust 核心。**如果用户不知道，假设允许预编译二进制**，只有当 SDK 无法安装或加载时才改变方向。**如果平台没有预构建二进制**（Alpine、Python 的 glibc 早于 2.34），**或用户想自己构建 SDK**，**从源码构建**，遵循该 SDK README 的构建步骤（[references/build-from-source.md](references/build-from-source.md)）。**如果不允许预编译二进制，使用纯 SDK：Rust 或纯 Go**（纯 C 尚不发送数据）。**Cloudflare Workers 或 Deno Deploy 等边缘运行时无法加载原生代码，因此在那里使用 REST**（[references/rest.md](references/rest.md)）。

如果用户未指定语言，默认用 **Python**。

**高级：Zerobus 是正确服务吗？** 当适配存疑时询问，例如当其他系统也读取数据或用户提到严格的容量或新鲜度需求时（[references/choose-an-interface.md](references/choose-an-interface.md)）：
- **谁消费它？** 湖仓是**唯一主要目的地**，还是几个独立系统读取相同数据？湖仓之外的许多消费者、重放或消费者组意味着**保留消息总线**（不要推荐 Zerobus 作为其替代）。
- **容量和延迟**：大致每秒记录数以及数据必须多新鲜。Zerobus 约 150 ms 使记录持久，约 5 秒可查询，且当几分钟可接受时仍适合。容量决定稍后开多少个流（[references/performance.md](references/performance.md)）；它不改变你如何构建第一个客户端。

**高级设置：在用户环境中运行需要什么。** 在部署超出笔记本电脑之前，或当连接或认证步骤失败时询问：
- **网络**：公共互联网、前端 PrivateLink、HTTP 代理，或本地（[references/networking.md](references/networking.md)）。
- **身份**：组织是否要求身份联合（例如 Entra ID）而非服务主体密钥（[references/authentication.md](references/authentication.md)）？

### 步骤 3：确认前提条件
细节在 [references/authentication.md](references/authentication.md) 中。每行都通过之前不要运行生产者。**如果缺少什么，主动提出创建它**：从样本事件设计表、创建服务主体、授予它，一次一个已批准的步骤（[references/new-to-databricks.md](references/new-to-databricks.md)）。

| # | 前提条件 | 验证 |
|---|--------------|--------|
| 1 | 位于**受支持区域**的工作区 | 区域列在 [quotas 页面](https://docs.databricks.com/ingestion/zerobus-quotas) 的可用性下 |
| 2 | **Zerobus 端点**，例如 `https://<workspace-id>.zerobus.<region>.cloud.databricks.com`（AWS） | 使用数字工作区 ID 和工作区的区域 |
| 3 | 预先创建的**托管 Delta 表**。Zerobus 从不创建或更改表 | `databricks experimental aitools tools discover-schema <catalog.schema.table> --profile <PROFILE>` 显示预期的列 |
| 4 | 具有 OAuth client ID 和 secret 的**服务主体** | `databricks service-principals list --profile <PROFILE>` 列出它 |
| 5 | 授权：`USE CATALOG`、`USE SCHEMA` 和**直接在表上**的 `MODIFY` + `SELECT`。`ALL PRIVILEGES` 不够；显式授予这四个 | `SHOW GRANTS ON TABLE <catalog.schema.table>` 列出该服务主体具 `MODIFY` 和 `SELECT` |
| 6 | 从生产者到端点和工作区的**出站 HTTPS（443）** | [references/networking.md](references/networking.md) 中的连接性检查 |

### 步骤 4：构建生产者
阅读所选语言的 SDK 参考。对于生产，优先用 **Protobuf** 而非 JSON（[references/protobuf-schema.md](references/protobuf-schema.md)）。**绝不要硬编码密钥。**

**始终编写非阻塞生产者。** 使用此阶梯，只有当用户需要时才进一步向下：

| 需求 | 使用 | 阻塞？ |
|------|-----|---------|
| **发送记录（默认）** | `ingest_record_offset()` / `ingest_records_offset()`：入队并返回；SDK 在后台发送并跟踪 ack | 否 |
| **在摄取运行时行动**：指标、日志、进度、错误、检查点 | **ack 回调**（`on_ack` / `on_error`） | 否 |
| **持久性边界**：有界批次的末尾、关闭之前 | `flush()` 一次，然后 `close()` | 是，一次 |
| **高级：在某个特定记录持久之前不得继续** | `wait_for_offset(offset)` | 是。**绝不**逐记录或在循环中 |

Ack 回调存在于 **Python、Java、Rust、C++ 和纯 Go** 中。TypeScript、CGO Go 和 .NET SDK 没有记录一个；在那里，按间隔调用 `flush()` 以获取进度。方法名因语言而异；使用 SDK 参考。

最小 Python 生产者（API 来自 SDK README），带用于进度和错误的 ack 回调：
```python
import os
from zerobus.sdk.sync import ZerobusSdk
from zerobus.sdk.shared import AckCallback, StreamConfigurationOptions, TableProperties

class Progress(AckCallback):
    def on_ack(self, offset: int):  # runs on an SDK background thread; keep it fast
        print(f"durable through offset {offset}")

    def on_error(self, offset: int, error_message: str):
        print(f"error at offset {offset}: {error_message}")

sdk = ZerobusSdk(os.environ["ZEROBUS_SERVER_ENDPOINT"], os.environ["DATABRICKS_WORKSPACE_URL"])
stream = sdk.create_stream(
    os.environ["DATABRICKS_CLIENT_ID"],
    os.environ["DATABRICKS_CLIENT_SECRET"],
    TableProperties(os.environ["ZEROBUS_TABLE_NAME"]),
    StreamConfigurationOptions(ack_callback=Progress()),
)
try:
    for i in range(100):
        stream.ingest_record_offset({"device_name": f"sensor-{i % 10}", "temp": 20 + (i % 15)})  # queues, returns
    stream.flush()  # durability boundary: blocks once until everything queued is acknowledged
finally:
    stream.close()
```

### 步骤 5：发送一小批测试数据
先发送 10 到 100 条记录。**持久性确认**（一个 `on_ack` 回调，或 `flush()` 返回）意味着 Zerobus 安全地存储了记录。它**不**意味着它们已可查询。

### 步骤 6：验证行已落地
在确认后等待约 5 秒（记录在发送后约 5 秒变为可查询），然后运行：
```bash
databricks experimental aitools tools query \
  "SELECT count(*) AS row_count, max(<timestamp_column>) AS latest FROM <catalog.schema.table>" \
  --profile <PROFILE>
```
**预期：** `row_count` 增加了你发送的记录数，且 `latest` 接近发送时间。如果不是，阅读 [references/troubleshooting.md](references/troubleshooting.md)。

### 步骤 7：为生产加固
在用户扩大规模之前，使用下方的参考地图覆盖 schema 演进、重复、吞吐、网络和监控。

## 关键事实

- **表优先。** 在更新生产者之前更新表 schema。不匹配的字段可以进入**救援列**（Beta，仅 JSON）。
- **持久不等于可查询。** Zerobus 将已确认数据作为单独步骤物化到 Delta 表：约 150 ms 持久，约 5 秒可查询（[how-it-works.md](references/how-it-works.md#the-data-path)）。
- **至少一次投递。** 恢复或客户端重试可能重发记录，因此可能出现少量重复。大多数工作负载接受它们；不要默认添加去重，且**绝不声称 exactly-once**。如果用户需要唯一行，参见 [how-it-works.md](references/how-it-works.md#delivery-and-duplicates)。
- **排序仅按流。** 跨流没有全局排序（[how-it-works.md](references/how-it-works.md#ordering)）。
- **默认非阻塞。** 摄取调用入队并返回。使用 **ack 回调**在摄取运行时对 ack 和错误采取行动，仅在边界处 `flush()`，仅在代码必须阻塞于某条记录的高级情况下使用 `wait_for_offset()`。
- **摄取仅在背压时阻塞。** 记录在内存中的在途缓冲区等待直到 ack；摄取调用仅在缓冲区满时阻塞（[references/how-it-works.md](references/how-it-works.md#how-the-sdk-processes-records)）。
- **恢复内置。** SDK 重新连接并重放未 ack 的记录。不要手工编写重试循环；自定义恢复是高级主题（[references/recovery.md](references/recovery.md)）。
- **TIMESTAMP 列接受 epoch 微秒**（整数），而非字符串。
- **配额是可调整的默认值**，按流和按表设置。在请求增加之前先添加流（[performance.md](references/performance.md#quotas)）。

## 常见问题

| 症状 | 修复 |
|---------|-----|
| 连接被拒绝或超时 | 检查端点的云、区域和工作区 ID，然后检查 443 上的出口防火墙（[networking.md](references/networking.md)） |
| 错误 4024 / `authorization_details` | **直接在表上**授予 `MODIFY` 和 `SELECT`；继承的 schema 授权和 `ALL PRIVILEGES` 不够 |
| 认证失败或 token 错误 | 检查 client ID 和 secret，以及工作区 URL 的 OAuth 端点可达（[authentication.md](references/authentication.md)） |
| 记录被拒绝 / schema 不匹配 | 将字段名和类型匹配到表，或添加救援列（[schema-management.md](references/schema-management.md)） |
| 收到 ack 但无行 | 等待约 5 秒再查询；持久尚不可查询 |
| 摄取调用停滞 | 背压：在途缓冲区已满。检查网络和配额，然后添加流（[how-it-works.md](references/how-it-works.md#how-the-sdk-processes-records)） |
| 流永久失败 | 救援未 ack 的记录并重建流（[recovery.md](references/recovery.md)） |
| 重复行 | 重试后偶尔预期（至少一次投递）。通常没问题；如果用例需要唯一行，在下游构建去重表（[how-it-works.md](references/how-it-works.md#delivery-and-duplicates)） |
| 吞吐平台期或生产者缓慢 | 移除任何逐记录 `wait_for_offset()` 或每请求 `flush()`；非阻塞摄取并用回调观察 ack；然后添加流（[performance.md](references/performance.md)） |
| `pip install` 从 `.tar.gz` 构建并失败（Alpine、glibc 早于 2.34） | 该平台没有 wheel。用 Rust 工具链从源码构建（[build-from-source.md](references/build-from-source.md)），或使用纯 SDK |
| 不允许预编译二进制（策略、平台、cgo 禁用） | 使用纯 SDK：**Rust** 或**纯 Go**（`purego`）。纯 C 尚不发送数据（[choose-an-interface.md](references/choose-an-interface.md)） |
| SDK 在边缘运行时加载失败 | 运行时无法加载原生库；切换到 REST（[rest.md](references/rest.md)） |
| REST 调用约一小时后 401 失败 | OAuth token 过期。缓存它并在过期前刷新，并在 401 时重试一次（[authentication.md](references/authentication.md#table-scoped-tokens-rest-kafka-mqtt-grpc)） |

## SDK：记录格式和可运行示例

每个 SDK 支持哪些记录格式，来自 SDK 仓库的 [Ingestion APIs 表](https://github.com/databricks/zerobus-sdk/tree/main#ingestion-apis)（权威来源；检查它了解更新发布）。不要给 SDK 附加发布状态；使用此表。**当用户询问在某一语言中如何做特定事情时**（Protobuf、Arrow、批处理、异步、特定 API），在编写代码之前打开该 SDK 的 examples 文件夹获取可运行程序。大多数文件夹按记录格式拆分（`json/`、`proto/`、`arrow/`）。

| SDK | JSON / Protobuf | Avro（Beta） | Arrow Flight | 可运行示例 |
|-----|-----------------|-------------|--------------|------------------|
| Python | 可用 | Beta | 自 1.8.0 起可用 | [python/examples](https://github.com/databricks/zerobus-sdk/tree/main/python/examples)（同步和异步：JSON、Protobuf、Arrow、Avro、身份联合） |
| Rust | 可用 | Beta | 自 2.8.0 起可用 | [rust/examples](https://github.com/databricks/zerobus-sdk/tree/main/rust/examples) |
| Go（cgo） | 可用 | 开发中 | 自 1.6.0 起可用 | [go/examples](https://github.com/databricks/zerobus-sdk/tree/main/go/examples) |
| 纯 Go | 可用 | 开发中 | 不可用 | [purego/examples](https://github.com/databricks/zerobus-sdk/tree/main/purego/examples) |
| TypeScript | 可用 | 开发中 | 自 1.3.0 起可用 | [typescript/examples](https://github.com/databricks/zerobus-sdk/tree/main/typescript/examples) |
| Java | 可用 | 开发中 | 自 1.6.0 起可用 | [java/examples](https://github.com/databricks/zerobus-sdk/tree/main/java/examples)（`legacy/` 使用已弃用的工厂方法；优先其他的） |
| C++ | 可用 | 开发中 | 自 0.3.0 起可用 | [cpp/examples](https://github.com/databricks/zerobus-sdk/tree/main/cpp/examples) |
| .NET（C#） | 可用 | 开发中 | 不可用 | [dotnet/examples](https://github.com/databricks/zerobus-sdk/tree/main/dotnet/examples) |

纯 C 不在表中：它尚不发送数据（其[示例](https://github.com/databricks/zerobus-sdk/tree/main/purec/examples)仅验证输入），因此不要用它投递数据。

## 参考地图：只读任务所需

这些参考持有每条路线的决策、陷阱和经过测试的最小示例。对于完整 API 接口面、其他记录类型和最新 SDK 版本，**抓取每个文件 Sources 中链接的 SDK README**（原始 Markdown）；对于可运行代码，使用上表中的 examples 文件夹。docs.databricks.com 页面是 HTML。MQTT 和原始 gRPC API 的长可运行程序在 [examples/](examples/) 中。

| 阅读 | 何时 |
|------|------|
| [new-to-databricks.md](references/new-to-databricks.md) | **用户不了解 Databricks**：平实语言词汇表，以及有引导的首次设置（选择 catalog 和 schema、从样本事件设计表、创建服务主体、授权、保存设置） |
| [choose-an-interface.md](references/choose-an-interface.md) | 不确定是用 Zerobus、SDK、REST 还是协议/工具路径；检查运行时兼容性 |
| [how-it-works.md](references/how-it-works.md) | **Zerobus 如何工作**：流、数据路径（异步 ack 循环，然后批量提交到 Delta）、持久 vs 可查询、SDK 如何处理记录（在途缓冲区、累积 ack、背压）、排序、投递与重复、扩缩 |
| [recovery.md](references/recovery.md) | 流失败、可重试 vs 致命错误、**高级自定义恢复**（`get_unacked_records`、`recreate_stream`）、持久回退重处理 |
| [authentication.md](references/authentication.md) | 每云端点、服务主体 OAuth（官方）、**Entra ID / 身份联合**（SDK 支持，文档待定）、授权、环境变量、本地 vs 已部署凭证、用于 REST、Kafka、MQTT 和 gRPC 的**表范围 token**（铸造和刷新）、认证错误 |
| [python-sdk.md](references/python-sdk.md) | Python 生产者：安装和平台、Protobuf 生产者、ack 回调；链接到 README 了解异步和其他 API |
| [typescript-sdk.md](references/typescript-sdk.md) | Node.js 生产者和原生二进制要求 |
| [go-sdk.md](references/go-sdk.md) | 带 cgo（`go/`）或纯 Go（`purego/`）的 Go 生产者 |
| [java-sdk.md](references/java-sdk.md) | JVM 生产者 |
| [other-sdks.md](references/other-sdks.md) | Rust、C++、C#/.NET |
| [kafka.md](references/kafka.md) | 现有 Kafka 生产者：Apache Kafka 兼容生产者 API（Beta）、连接设置、token 回调、限制、错误 |
| [mqtt.md](references/mqtt.md) | MQTT v5 设备和网关：连接设置、CONNECT 认证、限制、错误；[examples/mqtt_producer.py](examples/mqtt_producer.py) 中带重连时 token 刷新的可运行**非阻塞 QoS 1 发布者** |
| [arrow-flight.md](references/arrow-flight.md) | **列式批次**（Parquet 文件、Arrow、pandas 或 Polars DataFrame）：schema 匹配、非阻塞 Python 生产者、其他语言的链接、调优、恢复 |
| [migration-from-kafka-compatible-systems.md](references/migration-from-kafka-compatible-systems.md) | 将管道从 Kafka 或 Kafka 兼容系统迁移到 Delta：何时迁移、四种途径、分步切换、回滚 |
| [build-from-source.md](references/build-from-source.md) | **用户想自己构建 SDK，或没有预构建二进制**（Alpine/musl、较旧 glibc、其他 CPU）：每个 SDK 提供的平台、每个 SDK README 的源码构建步骤（Python wheel 通过 `make build`、TypeScript、带 JNI 的 Java、Go、.NET、C++、Rust）、Alpine Dockerfile、构建错误 |
| [grpc-api.md](references/grpc-api.md) | **从零构建客户端**对接 gRPC API：`.proto`、stub 生成、`EphemeralStream` 消息、认证标头、异步 ack 循环、恢复；[examples/grpc_client.py](examples/grpc_client.py) 中的可运行 Python 客户端 |
| [rest.md](references/rest.md) | Databricks 之外的边缘运行时和无服务器函数（Cloudflare Workers、Deno Deploy）、没有 SDK 的语言、低容量发送者。使用来自 [authentication.md](references/authentication.md#table-scoped-tokens-rest-kafka-mqtt-grpc) 的表范围 token（token 约一小时后过期） |
| [protobuf-schema.md](references/protobuf-schema.md) | 从表生成 `.proto`、类型映射 |
| [schema-management.md](references/schema-management.md) | 表作为契约：记录如何匹配、三种严格性场景、**救援列**（设置、标记、路由规则）、安全 schema 演进、Protobuf 规则 |
| [performance.md](references/performance.md) | 批处理、流数量、配额、表布局 |
| [networking.md](references/networking.md) | 每个接口的端口和 TLS、前端 PrivateLink、**本地生产者和 HTTP 代理**、防火墙存储、跨区域、连接性检查 |
| [observability.md](references/observability.md) | **监控仪表板捆绑包**（安装）、ack 回调、系统表、**延迟**（ack 和端到端新鲜度）、错误、告警 |
| [troubleshooting.md](references/troubleshooting.md) | 任何错误或数据缺失 |
| [databricks-apps.md](references/databricks-apps.md) | 在 Databricks App 或 Lakeflow Job 中运行生产者 |

## 相关技能

- **databricks-core**：CLI、profile、auth，以及用于验证的临时 SQL
- **databricks-unity-catalog**：catalog、schema、表和授权
- **databricks-pipelines**：摄取数据的下游处理，包括用 AUTO CDC 构建的去重表
- **databricks-lakeflow-connect**：当 Databricks 应从源**拉取**时的托管连接器
- **databricks-apps** / **databricks-apps-python**：构建托管生产者的 Databricks App
- **databricks-dabs**：用声明式自动化捆绑包部署生产者作业
- **databricks-aibi-dashboards**：在所摄取的事件或遥测之上构建仪表板
