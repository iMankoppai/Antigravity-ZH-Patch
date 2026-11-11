---
name: neo4j-kafka-skill
description: 配置并操作 Neo4j Connector for Kafka（sink + source）以及原生 Neo4j CDC API。涵盖 Cypher/Pattern/CUD 三种 sink 策略、基于 CDC 和基于查询的 source、exactly-once 语义、DLQ 错误处理、Confluent Cloud 托管连接器、schema registry（Avro/JSON），以及原生 db.cdc.query 游标循环模式（Neo4j 5.13+ 企业版/Aura BC/VDC）。适用于将 Kafka 事件流式写入 Neo4j、将 Neo4j 变更流式导出到 Kafka，或在不用 Kafka 的情况下查询 Neo4j 变更事件。不处理 Cypher 查询编写 —— 请使用 neo4j-cypher-skill。不处理批量 CSV/文件导入 —— 请使用 neo4j-import-skill。不处理 GDS 算法 —— 请使用 neo4j-gds-skill。
allowed-tools: Bash WebFetch
version: 1.0.4
---

# Neo4j Kafka Skill

## 何时使用

- 将 Kafka 事件写入 Neo4j（sink 连接器 —— Cypher、Pattern、CDC、CUD 策略）
- 将 Neo4j 变更流式传输到 Kafka topic（source 连接器 —— 基于 CDC 或基于查询）
- 不使用 Kafka，原生查询 Neo4j 变更事件（`db.cdc.query`）
- 配置 Confluent Cloud 托管的 Neo4j sink 连接器
- 为带类型的 Kafka 消息设置 schema registry（Avro/JSON Schema）
- 在 sink 上启用 exactly-once 语义或死信队列

## 何时不使用

- **Cypher 查询编写** → `neo4j-cypher-skill`
- **批量 CSV/JSON 文件导入** → `neo4j-import-skill`
- **GDS 算法** → `neo4j-gds-skill`
- **实时应用的写入模式** → `neo4j-cypher-skill`

---

## 决策表 —— 选择哪种连接器策略？

| 使用场景 | 策略 |
|---|---|
| 对 Kafka payload 进行自定义转换 → 图 | Sink：**Cypher** |
| 镜像另一个 Neo4j CDC 源 | Sink：**CDC**（schema 或 source-id 子策略） |
| 无需写代码，将 Kafka JSON 字段映射为图节点/关系 | Sink：**Pattern** |
| 消费预格式化的 CUD JSON 消息 | Sink：**CUD** |
| 将所有 Neo4j 变更流式传输到 Kafka（实时） | Source：**CDC**（Neo4j 5.13+ EE/Aura BC/VDC） |
| 按计划流式传输特定查询结果 | Source：**Query** |
| 在进程内消费 CDC 事件，不使用 Kafka | **原生 CDC API**（`db.cdc.query`） |

---

## 前置条件

- Neo4j Connector for Kafka ≥ 5.5.2（从 [neo4j.com/labs/kafka](https://neo4j.com/labs/kafka/) 或 Confluent Hub 下载）—— 5.5.2 按分区而非按 topic 处理传入消息；5.5.1 会在生成的查询中强制使用静态标签
- Kafka Connect ≥ 3.x 或 Confluent Platform ≥ 7.x
- 使用 CDC source/sink 时：Neo4j 5.13+ 企业版、AuraDB Business Critical 或 AuraDB VDC
- 使用 query source 时：任意 Neo4j 版本
- Java 11+

---

## 核心连接配置（所有连接器）

```json
{
  "neo4j.uri": "neo4j+s://your-instance.databases.neo4j.io:7687",
  "neo4j.authentication.type": "BASIC",
  "neo4j.authentication.basic.username": "neo4j",
  "neo4j.authentication.basic.password": "${file:/opt/secrets.properties:neo4j.password}",
  "neo4j.database": "neo4j"
}
```

认证类型：`BASIC` | `BEARER` | `KERBEROS` | `CUSTOM` | `NONE`

切勿硬编码密码 —— 使用 Kafka Connect 的 secrets provider（`${file:...}` 或 `${env:...}`）。

---

## Sink 连接器

### 策略 1 —— Cypher

连接器会自动前置 `UNWIND $events AS __value` —— 使用 `__value` 编写查询：

```json
{
  "connector.class": "org.neo4j.connectors.kafka.sink.Neo4jConnector",
  "topics": "person-creates,person-updates",
  "neo4j.uri": "neo4j+s://...",
  "neo4j.authentication.type": "BASIC",
  "neo4j.authentication.basic.username": "neo4j",
  "neo4j.authentication.basic.password": "secret",
  "neo4j.cypher.topic.person-creates":
    "MERGE (p:Person {id: __value.id}) SET p += __value.properties",
  "neo4j.cypher.topic.person-updates":
    "MATCH (p:Person {id: __value.id}) SET p += __value.properties",
  "neo4j.cypher.bind-value-as": "__value",
  "neo4j.cypher.bind-key-as": "__key",
  "neo4j.cypher.bind-header-as": "__header"
}
```

MERGE 模式 —— 幂等 upsert：
```cypher
MERGE (p:Person {id: __value.id})
ON CREATE SET p.createdAt = datetime(), p += __value.properties
ON MATCH  SET p.updatedAt = datetime(), p += __value.properties
```

### 策略 2 —— Pattern

无需 Cypher —— 通过 pattern 语法将消息字段映射为图：

```json
{
  "neo4j.pattern.topic.users": "(:User{!userId, name, email})",
  "neo4j.pattern.topic.friendships":
    "(:User{!userId: from.userId})-[:KNOWS{since}]->(:User{!userId: to.userId})"
}
```

Pattern 规则：
- `!prop` = 键属性（用于 MERGE）
- `prop: field.path` = 从嵌套消息字段映射
- `*` = 映射全部消息字段
- `-prop` = 排除属性（不能与包含项混用）

### 策略 3 —— CDC（镜像另一个 Neo4j）

```json
{
  "neo4j.cdc.schema.topics": "neo4j-cdc-events"
}
```

或使用 source-id 跟踪（将 elementId 存储为属性）：
```json
{
  "neo4j.cdc.source-id.topics": "neo4j-cdc-events",
  "neo4j.cdc.source-id.label-name": "SourceEvent",
  "neo4j.cdc.source-id.property-name": "sourceId"
}
```

### Exactly-Once 语义（EOS）

要求：连接器 ≥ 5.3.0（Cypher/Pattern/CDC 策略）、连接器 ≥ 5.3.1（CUD 策略）、Kafka broker 支持 EOS，以及一个 NODE KEY 约束。

第 1 步 —— 创建约束：
```cypher
CREATE CONSTRAINT kafka_offset_key IF NOT EXISTS
FOR (n:__KafkaOffset)
REQUIRE (n.strategy, n.topic, n.partition) IS NODE KEY;
```

第 2 步 —— 添加到连接器配置：
```json
{
  "neo4j.eos-offset-label": "__KafkaOffset"
}
```

未启用 EOS 时：连接器提供 at-least-once —— 编写幂等的 Cypher（用 MERGE，而非 CREATE）。

### 错误处理 / DLQ

```json
{
  "errors.tolerance": "all",
  "errors.log.enable": "true",
  "errors.log.include.messages": "true",
  "errors.deadletterqueue.topic.name": "neo4j-dlq",
  "errors.deadletterqueue.context.headers.enable": "true",
  "errors.deadletterqueue.topic.replication.factor": "3"
}
```

`errors.tolerance=none`（默认）—— 遇到第一个错误即停止。生产环境请使用 `all` + DLQ。

---

## Source 连接器

### 基于 CDC 的 Source（推荐，Neo4j 5.13+）

```json
{
  "connector.class": "org.neo4j.connectors.kafka.source.Neo4jConnector",
  "neo4j.uri": "neo4j+s://...",
  "neo4j.authentication.type": "BASIC",
  "neo4j.authentication.basic.username": "neo4j",
  "neo4j.authentication.basic.password": "secret",
  "neo4j.source-strategy": "CDC",
  "neo4j.start-from": "NOW",
  "neo4j.cdc.poll-interval": "1s",
  "neo4j.cdc.poll-duration": "5s",
  "neo4j.cdc.topic.person-creates.patterns.0.pattern": "(:Person)",
  "neo4j.cdc.topic.person-creates.patterns.0.operation": "CREATE",
  "neo4j.cdc.topic.person-updates.patterns.0.pattern": "(:Person)",
  "neo4j.cdc.topic.person-updates.patterns.0.operation": "UPDATE",
  "neo4j.cdc.topic.person-deletes.patterns.0.pattern": "(:Person)",
  "neo4j.cdc.topic.person-deletes.patterns.0.operation": "DELETE"
}
```

`neo4j.start-from` 选项：`NOW` | `EARLIEST` | 特定的游标字符串

每个 topic 可配置多个 pattern —— 以 0、1、2…… 索引：
```json
{
  "neo4j.cdc.topic.all-changes.patterns.0.pattern": "(:Person)",
  "neo4j.cdc.topic.all-changes.patterns.1.pattern": "(:Organization)"
}
```

游标警告：从备份恢复数据库后，CDC 游标会失效。请重新配置 `neo4j.start-from`。

### 基于查询的 Source（旧版 / 任意版本）

```json
{
  "neo4j.source-strategy": "QUERY",
  "neo4j.query": "MATCH (p:Person) WHERE p.updatedAt > $lastCheck RETURN p.id AS id, p.name AS name, p.updatedAt AS updatedAt",
  "neo4j.query.streaming-property": "updatedAt",
  "neo4j.query.topic": "person-changes",
  "neo4j.query.polling-interval": "5s",
  "neo4j.query.polling-duration": "10s"
}
```

`$lastCheck` 由连接器自动注入。`neo4j.query.streaming-property` 必须由查询返回，并且应建立索引。

---

## 原生 CDC API（无需 Kafka）

要求：Neo4j 5.13+ 企业版、AuraDB BC 或 AuraDB VDC。

先启用 CDC（自托管 —— 在 neo4j.conf 中设置）：
```
db.cdc.enabled=true
```
在 Aura 上：符合条件的层级默认启用。

### 游标引导

```cypher
// Get cursor for "right now" — start tracking from this point forward
CALL db.cdc.current() YIELD id RETURN id AS cursor;

// Get earliest available cursor (replay from history start)
CALL db.cdc.earliest() YIELD id RETURN id AS cursor;
```

游标是排他性的：`db.cdc.current()` 不包含它所指向的那笔事务。

### 查询变更

```cypher
// All changes since cursor
CALL db.cdc.query($cursor, []) YIELD id, txId, seq, metadata, event
RETURN id, txId, seq, metadata, event
ORDER BY txId, seq;
```

带过滤 —— 标签为 Person 的节点，仅 CREATE：
```cypher
CALL db.cdc.query($cursor, [
  {select: 'n', labels: ['Person'], operation: 'c'}
]) YIELD id, txId, seq, event
RETURN id, event.state.after.properties AS newProps
ORDER BY txId, seq;
```

带过滤 —— 特定关系类型并跟踪属性变更：
```cypher
CALL db.cdc.query($cursor, [
  {select: 'r', type: 'KNOWS', changesTo: ['since', 'strength']}
]) YIELD id, txId, seq, event
RETURN id, event.state.before AS before, event.state.after AS after;
```

### 选择器参考

| 字段 | 取值 | 适用于 |
|---|---|---|
| `select` | `'e'`（全部）、`'n'`（节点）、`'r'`（关系） | 两者皆可 |
| `operation` | `'c'`（创建）、`'u'`（更新）、`'d'`（删除） | 两者皆可 |
| `labels` | `['Label1','Label2']`（节点必须拥有全部标签） | 节点 |
| `type` | `'REL_TYPE'` | 关系 |
| `elementId` | 特定的元素 ID 字符串 | 两者皆可 |
| `key` | `{propName: value}`（需要键约束） | 两者皆可 |
| `changesTo` | `['prop1','prop2']`（AND —— 必须全部变更） | 两者皆可 |
| `authenticatedUser` | 用户名字符串 | 两者皆可 |
| `executingUser` | 用户名字符串 | 两者皆可 |
| `txMetadata` | `{key: value}` | 两者皆可 |

### 事件结构

```
{
  id:       STRING,           // cursor for this event (use as next $cursor)
  txId:     INTEGER,          // transaction ID
  seq:      INTEGER,          // ordering within transaction
  metadata: {
    executingUser:     STRING,
    authenticatedUser: STRING,
    captureMode:       STRING,  // "DIFF" or "FULL"
    txStartTime:       DATETIME,
    txCommitTime:      DATETIME,
    txMetadata:        MAP
  },
  event: {
    elementId:  STRING,
    eventType:  STRING,         // "n" or "r"
    operation:  STRING,         // "c", "u", "d"
    labels:     [STRING],       // nodes only
    type:       STRING,         // relationships only
    keys:       MAP,
    state: {
      before: { properties: MAP },  // null on CREATE
      after:  { properties: MAP }   // null on DELETE
    }
  }
}
```

### 游标循环模式（Python）

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("neo4j+s://...", auth=("neo4j", "password"))

def poll_changes(cursor: str, selectors: list) -> tuple[list, str]:
    records, _, _ = driver.execute_query(
        "CALL db.cdc.query($cursor, $selectors) YIELD id, txId, seq, event "
        "RETURN id, txId, seq, event ORDER BY txId, seq",
        cursor=cursor, selectors=selectors,
        database_="neo4j"
    )
    events = [r.data() for r in records]
    # Advance cursor to last event id; keep current if no events
    next_cursor = events[-1]["id"] if events else cursor
    return events, next_cursor

# Bootstrap
with driver.session(database="neo4j") as s:
    cursor = s.run("CALL db.cdc.current() YIELD id RETURN id").single()["id"]

selectors = [{"select": "n", "labels": ["Person"]}]

import time
while True:
    events, cursor = poll_changes(cursor, selectors)
    for e in events:
        print(e["event"]["operation"], e["event"]["elementId"])
    time.sleep(1)
```

---

## Confluent Cloud 托管连接器

Confluent Cloud 以完全托管服务的形式托管 Neo4j Sink 连接器（无需上传 JAR）。

与自托管的配置差异：
- 没有 `connector.class` 字段 —— 在 UI/API 中选择
- 凭据通过 Confluent Cloud secret manager 或直接 JSON 提供
- 支持私有端点（AWS PrivateLink、Azure Private Link、GCP PSC）
- 托管升级 —— 如有需要可显式固定连接器版本

必需的 Confluent Cloud 字段：
```json
{
  "kafka.auth.mode": "KAFKA_API_KEY",
  "kafka.api.key": "...",
  "kafka.api.secret": "...",
  "input.data.format": "JSON",
  "neo4j.uri": "neo4j+s://...",
  "neo4j.authentication.type": "BASIC",
  "neo4j.authentication.basic.username": "neo4j",
  "neo4j.authentication.basic.password": "..."
}
```

每个 topic 只能使用一种策略 —— 不能在同一 topic 上混用 Cypher 和 Pattern。

---

## Schema Registry（Avro / JSON Schema）

Source 连接器始终生成支持 schema 的消息 —— 必须配置 converter：

```json
{
  "key.converter": "io.confluent.connect.avro.AvroConverter",
  "key.converter.schema.registry.url": "https://your-schema-registry",
  "value.converter": "io.confluent.connect.avro.AvroConverter",
  "value.converter.schema.registry.url": "https://your-schema-registry"
}
```

对于 JSON Schema：
```json
{
  "value.converter": "io.confluent.connect.json.JsonSchemaConverter",
  "value.converter.schema.registry.url": "https://..."
}
```

Sink converter 必须与 source 匹配 —— Avro sink 无法消费 JSON schema source 消息。

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `CDC is not enabled` | 未设置 `db.cdc.enabled` / 层级不符 | 在 neo4j.conf 中启用，或升级到 EE/BC/VDC |
| 数据库恢复后 `Invalid cursor` | 备份使游标失效 | 将 `neo4j.start-from` 重置为 `NOW` 或 `EARLIEST` |
| `Cannot merge node using null` | 消息中缺少键属性 | 校验消息 schema；在 Cypher 中加空值检查 |
| 重启后消息被重放 | 未配置 EOS | 添加 `neo4j.eos-offset-label` + NODE KEY 约束 |
| 连接器因坏消息停止 | `errors.tolerance=none`（默认） | 设置 `errors.tolerance=all` + DLQ topic |
| sink 上出现 `SchemaException` | source/sink 的 converter 不匹配 | 在两端匹配 key/value converter |
| `db.cdc.query` 返回空事件 | 游标指向当前 | 使用 `db.cdc.earliest()` 重放；等待新的 txns |

---

## 参考资料

- [完整连接器配置参考](references/sink-config.md) —— 所有 neo4j.* 属性、默认值、类型
- [CDC API 模式](references/cdc-api.md) —— 游标循环、选择器示例、事件结构细节
- [Neo4j Connector for Kafka 文档](https://neo4j.com/docs/kafka/current/)
- [CDC 文档](https://neo4j.com/docs/cdc/current/)

---

## 检查清单

- [ ] 若使用 CDC source 或 sink，已确认 CDC 可用性（Neo4j 5.13+ EE / Aura BC / VDC）
- [ ] 在 sink 导入前已创建唯一性/NODE KEY 约束（MERGE 会用到它们）
- [ ] 若使用 `neo4j.eos-offset-label`，已创建 EOS 约束
- [ ] 凭据通过 secrets provider 提供 —— 未硬编码在配置中
- [ ] Cypher sink 查询使用 MERGE（而非 CREATE）以保证幂等
- [ ] 生产 sink 已配置 `errors.tolerance=all` + DLQ
- [ ] Source：`neo4j.query.streaming-property` 已建立索引
- [ ] schema registry converter 在 source 和 sink 两端匹配
- [ ] 数据库恢复后：已重新配置 CDC 游标（`neo4j.start-from`）
- [ ] CDC 游标循环：仅在成功处理后推进游标
