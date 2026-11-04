---
name: databricks-spark-structured-streaming
description: "面向生产工作负载的 Spark Structured Streaming 全面指南。适用于构建流式管道、处理 Kafka 摄取、实现实时模式（RTM）、配置触发器（processingTime、availableNow）、使用水位线处理有状态操作、优化检查点、执行流-流或流-静态连接、写入多个接收端，或调优流式成本与性能时。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Spark Structured Streaming

使用 Spark Structured Streaming 构建生产就绪的流式管道。本技能提供到详细模式与最佳实践的导航。

## 快速开始

```python
from pyspark.sql.functions import col, from_json

# Basic Kafka to Delta streaming
df = (spark
    .readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "topic")
    .load()
    .select(from_json(col("value").cast("string"), schema).alias("data"))
    .select("data.*")
)

df.writeStream \
    .format("delta") \
    .outputMode("append") \
    .option("checkpointLocation", "/Volumes/catalog/checkpoints/stream") \
    .trigger(processingTime="30 seconds") \
    .start("/delta/target_table")
```

## 核心模式

| 模式 | 描述 | 参考 |
|---------|-------------|-----------|
| **Kafka 流式** | Kafka 到 Delta、Kafka 到 Kafka、实时模式 | 参见 [references/kafka-streaming.md](references/kafka-streaming.md) |
| **实时模式（RTM）** | 亚秒级端到端延迟 —— 集群设置、槽位计算、支持的操作（包括 DBR 18+ 上的流-流内连接）、`transformWithState`、可观测性、错误类别、投递语义 | 参见 [references/real-time-mode.md](references/real-time-mode.md) |
| **Lakebase 接收端** | 通过事务性 upsert 将流式记录写入 Lakebase Postgres。原生 `format("postgresql")` 接收端（DBR 18.3+）以及作为回退的手动 `foreach` 接收端 | 参见 [references/lakebase-sink-python.md](references/lakebase-sink-python.md) |
| **流连接** | 流-流连接、流-静态连接 | 参见 [references/stream-stream-joins.md](references/stream-stream-joins.md)、[references/stream-static-joins.md](references/stream-static-joins.md) |
| **多接收端写入** | 写入多个表、并行合并 | 参见 [references/multi-sink-writes.md](references/multi-sink-writes.md) |
| **合并操作** | MERGE 性能、并行合并、优化 | 参见 [references/merge-operations.md](references/merge-operations.md) |

## 配置

| 主题 | 描述 | 参考 |
|-------|-------------|-----------|
| **检查点** | 检查点管理与最佳实践 | 参见 [references/checkpoint-best-practices.md](references/checkpoint-best-practices.md) |
| **有状态操作** | 水位线、状态存储、RocksDB 配置 | 参见 [references/stateful-operations.md](references/stateful-operations.md) |
| **触发器与成本** | 触发器选择、成本优化、RTM | 参见 [references/trigger-and-cost-optimization.md](references/trigger-and-cost-optimization.md) |

## 最佳实践

| 主题 | 描述 | 参考 |
|-------|-------------|-----------|
| **生产检查清单** | 全面的最佳实践 | 参见 [references/streaming-best-practices.md](references/streaming-best-practices.md) |

## 生产检查清单

- [ ] 检查点位置是持久的（UC 卷，而非 DBFS）
- [ ] 每个流有唯一的检查点
- [ ] 固定规模的集群（流式不用自动扩缩容）
- [ ] 已配置监控（输入速率、延迟、批次时长）
- [ ] 已验证 exactly-once（txnVersion/txnAppId）
- [ ] 为有状态操作配置了水位线
- [ ] 流-静态连接用左连接（不用内连接）
