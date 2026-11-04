---
name: databricks-iceberg
description: "Databricks 上的 Apache Iceberg 表 —— Managed Iceberg 表、External Iceberg Reads（原名 Uniform）、兼容模式、Iceberg REST Catalog（IRC）、Iceberg v3、Snowflake 互操作、PyIceberg、OSS Spark、外部引擎访问和凭证分发。适用于创建 Iceberg 表、在 Delta 表上启用 External Iceberg Reads（uniform）（包括通过兼容模式为流式表和物化视图启用）、配置外部引擎通过 Unity Catalog IRC 读取 Databricks 表、与 Snowflake catalog 集成以读取 Foreign Iceberg 表时"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks 上的 Apache Iceberg

Databricks 提供多种方式使用 Apache Iceberg：原生托管 Iceberg 表、用于 Delta 到 Iceberg 互操作的 UniForm，以及用于外部引擎访问的 Iceberg REST Catalog（IRC）。

---

## 关键规则（始终遵循）

- **必须**使用 Unity Catalog —— 所有 Iceberg 功能都要求启用 UC 的工作区
- **不得**将 Iceberg 库安装到 Databricks Runtime 中（DBR 内置 Iceberg 支持；添加库会导致版本冲突）
- **不得**设置 `write.metadata.path` 或 `write.metadata.previous-versions-max` —— Databricks 会自动管理元数据位置；覆盖会导致损坏
- **必须**在编写代码之前确定哪种 Iceberg 模式适合此用例 —— 参见下方的[何时使用](#when-to-use)章节
- **必须**知道 `PARTITIONED BY` 和 `CLUSTER BY` 都会为外部引擎产生相同的 Iceberg 元数据 —— UC 维护一个 Iceberg 分区规范，其分区字段对应聚类键，因此通过 IRC 读取的外部引擎会看到一个分区化的 Iceberg 表（不是 Hive 风格，而是正规的 Iceberg 分区字段）并能在这些字段上剪枝；在内部，UC 将这些字段用作液体聚类键；两种语法之间的唯一区别是：(1) `PARTITIONED BY` 是标准 Iceberg DDL（任何引擎都能创建该表），而 `CLUSTER BY` 是仅 DBR 的 DDL；(2) `PARTITIONED BY` **自动处理** DV/行跟踪属性，而 `CLUSTER BY` 在 v2 上需要手动设置 TBLPROPERTIES
- **不得**在托管 Iceberg 表上对 `PARTITIONED BY` 使用基于表达式的分区转换（`bucket()`、`years()`、`months()`、`days()`、`hours()`）—— 只支持普通列引用；表达式转换会导致错误
- **必须**在 Iceberg v2 表上使用 `CLUSTER BY` 时禁用删除向量和行跟踪 —— 在 TBLPROPERTIES 中设置 `'delta.enableDeletionVectors' = false` 和 `'delta.enableRowTracking' = false`（Iceberg v3 会自动处理；`PARTITIONED BY` 在 v2 和 v3 上都会自动处理）

---

## 关键概念

| 概念 | 摘要 |
|---------|---------|
| **托管 Iceberg 表** | 用 `USING ICEBERG` 创建的原生 Iceberg 表 —— 在 Databricks 中及通过外部 Iceberg 引擎完全可读写 |
| **External Iceberg Reads（Uniform）** | 自动生成 Iceberg 元数据的 Delta 表 —— 外部以 Iceberg 读取，内部以 Delta 写入 |
| **兼容模式** | 用于 SDP 管道中流式表和物化视图的 UniForm 变体 |
| **Iceberg REST Catalog（IRC）** | Unity Catalog 内置的、实现 Iceberg REST Catalog 规范的 REST 端点 —— 让外部引擎（Spark、PyIceberg、Snowflake）访问 UC 管理的 Iceberg 数据 |
| **Iceberg v3** | 下一代格式（DBR 18 LTS+）—— 删除向量、VARIANT 类型、行血缘 |

---

## 快速开始

### 创建托管 Iceberg 表

```sql
-- No clustering
CREATE TABLE my_catalog.my_schema.events
USING ICEBERG
AS SELECT * FROM raw_events;

-- PARTITIONED BY (recommended for cross-platform): standard Iceberg syntax, works on EMR/OSS Spark/Trino/Flink
-- auto-disables DVs and row tracking — no TBLPROPERTIES needed on v2 or v3
CREATE TABLE my_catalog.my_schema.events
USING ICEBERG
PARTITIONED BY (event_date)
AS SELECT * FROM raw_events;

-- CLUSTER BY on Iceberg v2 (DBR-only syntax): must manually disable DVs and row tracking
CREATE TABLE my_catalog.my_schema.events
USING ICEBERG
TBLPROPERTIES (
  'delta.enableDeletionVectors' = false,
  'delta.enableRowTracking' = false
)
CLUSTER BY (event_date)
AS SELECT * FROM raw_events;

-- CLUSTER BY on Iceberg v3 (DBR-only syntax): no TBLPROPERTIES needed
CREATE TABLE my_catalog.my_schema.events
USING ICEBERG
TBLPROPERTIES ('format-version' = '3')
CLUSTER BY (event_date)
AS SELECT * FROM raw_events;
```

### 在现有 Delta 表上启用 UniForm

```sql
ALTER TABLE my_catalog.my_schema.customers
SET TBLPROPERTIES (
  'delta.columnMapping.mode' = 'name',
  'delta.enableIcebergCompatV2' = 'true',
  'delta.universalFormat.enabledFormats' = 'iceberg'
);
```

---

## 读/写能力矩阵

| 表类型 | Databricks 读 | Databricks 写 | 外部 IRC 读 | 外部 IRC 写 |
|------------|:-:|:-:|:-:|:-:|
| 托管 Iceberg（`USING ICEBERG`） | 是 | 是 | 是 | 是 |
| Delta + UniForm | 是（作为 Delta） | 是（作为 Delta） | 是（作为 Iceberg） | 否 |
| Delta + 兼容模式 | 是（作为 Delta） | 是 | 是（作为 Iceberg） | 否 |

---

## 参考文件

| 文件 | 摘要 | 关键词 |
|------|---------|----------|
| [references/1-managed-iceberg-tables.md](references/1-managed-iceberg-tables.md) | 创建和管理原生 Iceberg 表 —— DDL、DML、液体聚类、预测优化、Iceberg v3、限制 | CREATE TABLE USING ICEBERG、CTAS、MERGE、时间旅行、删除向量、VARIANT |
| [references/2-uniform-and-compatibility.md](references/2-uniform-and-compatibility.md) | 让 Delta 表可作为 Iceberg 读取 —— 常规表用 UniForm，流式表和 MV 用兼容模式 | UniForm、universalFormat、兼容模式、流式表、物化视图、SDP |
| [references/3-iceberg-rest-catalog.md](references/3-iceberg-rest-catalog.md) | 通过 IRC 端点将 Databricks 表暴露给外部引擎 —— 认证、凭证分发、IP 访问列表 | IRC、REST Catalog、凭证分发、EXTERNAL USE SCHEMA、PAT、OAuth |
| [references/4-snowflake-interop.md](references/4-snowflake-interop.md) | Snowflake-Databricks 双向集成 —— catalog 集成、外部 catalog、分发的凭证 | Snowflake、catalog 集成、外部卷、分发的凭证、REFRESH_INTERVAL_SECONDS |
| [references/5-external-engine-interop.md](references/5-external-engine-interop.md) | 通过 IRC 连接 PyIceberg、OSS Spark、AWS EMR、Apache Flink 和 Kafka Connect | PyIceberg、OSS Spark、EMR、Flink、Kafka Connect、pyiceberg.yaml |

---

## 何时使用

- **创建新的 Iceberg 表** → [references/1-managed-iceberg-tables.md](references/1-managed-iceberg-tables.md)
- **让现有 Delta 表可作为 Iceberg 读取** → [references/2-uniform-and-compatibility.md](references/2-uniform-and-compatibility.md)
- **让流式表或 MV 可作为 Iceberg 读取** → [references/2-uniform-and-compatibility.md](references/2-uniform-and-compatibility.md)（兼容模式章节）
- **在托管 Iceberg vs UniForm vs 兼容模式之间选择** → [references/2-uniform-and-compatibility.md](references/2-uniform-and-compatibility.md)中的决策表
- **通过 REST API 将 Databricks 表暴露给外部引擎** → [references/3-iceberg-rest-catalog.md](references/3-iceberg-rest-catalog.md)
- **将 Databricks 与 Snowflake 集成（任一方向）** → [references/4-snowflake-interop.md](references/4-snowflake-interop.md)
- **连接 PyIceberg、OSS Spark、Flink、EMR 或 Kafka** → [references/5-external-engine-interop.md](references/5-external-engine-interop.md)

---

## 常见问题

| 问题 | 解决方案 |
|-------|----------|
| **不支持变更数据馈送（CDF）** | 托管 Iceberg 表不支持 CDF。若需要 CDF，使用 Delta + UniForm。 |
| **UniForm 异步延迟** | Iceberg 元数据生成是异步的。写入后，外部引擎看到最新数据前可能有短暂延迟。用 `DESCRIBE EXTENDED table_name` 检查状态。 |
| **压缩编解码器变更** | 托管 Iceberg 表默认使用 `zstd` 压缩（而非 `snappy`）。不支持 zstd 的较旧 Iceberg 读取器会失败。核实读取器兼容性或将 `write.parquet.compression-codec` 设为 `snappy`。 |
| **Snowflake 1000 次提交上限** | Snowflake 的 Iceberg catalog 集成只能看到最近 1000 次 Iceberg 提交。高频写入者必须压缩元数据，否则 Snowflake 将失去对较旧数据的可见性。 |
| **UniForm 与删除向量** | UniForm 要求禁用删除向量（`delta.enableDeletionVectors = false`）。如果你的表启用了删除向量，在启用 UniForm 之前先禁用它们。 |
| **Iceberg 不支持浅克隆** | Iceberg 表不支持 `SHALLOW CLONE`。改用 `DEEP CLONE` 或 `CREATE TABLE ... AS SELECT`。 |
| **与外部引擎的版本不匹配** | 确保外部引擎使用的 Iceberg 库版本与你表的格式版本兼容。Iceberg v3 表要求 Iceberg 库 1.9.0+。 |

---

## 相关技能

- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** —— catalog/schema 管理、治理、系统表
- **databricks-pipelines** —— SDP 管道（流式表、带兼容模式的物化视图）
- **[databricks-python-sdk](../databricks-python-sdk/SKILL.md)** —— 用于 Databricks 操作的 Python SDK 和 REST API
- **[databricks-dbsql](../databricks-dbsql/SKILL.md)** —— SQL 数仓功能、查询模式

---

## 资源

- **[Iceberg 概览](https://docs.databricks.com/iceberg/)** —— Databricks 上 Iceberg 的中心
- **[UniForm](https://docs.databricks.com/delta/iceberg-reads)** —— Delta Universal Format
- **[Iceberg REST Catalog](https://docs.databricks.com/external-access/iceberg)** —— IRC 端点与外部引擎访问
- **[兼容模式](https://docs.databricks.com/external-access/compatibility-mode)** —— 用于流式表和 MV 的 UniForm
- **[Iceberg v3](https://docs.databricks.com/iceberg/iceberg-v3)** —— 下一代格式特性
- **[外部表](https://docs.databricks.com/tables/foreign)** —— 读取外部 catalog 数据
