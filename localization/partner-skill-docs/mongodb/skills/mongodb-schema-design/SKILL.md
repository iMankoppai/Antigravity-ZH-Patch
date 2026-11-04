---
name: mongodb-schema-design
description: MongoDB schema 设计模式与反模式。在设计数据模型、审查 schema、从 SQL 迁移，或排查由 schema 问题引起的性能问题时使用。触发词包括 "design schema"、"embed vs reference"、"MongoDB data model"、"schema review"、"unbounded arrays"、"one-to-many"、"tree structure"、"16MB limit"、"schema validation"、"JSON Schema"、"time series"、"schema migration"、"polymorphic"、"TTL"、"data lifecycle"、"archive"、"index explosion"、"unnecessary indexes"、"approximation pattern"、"document versioning"。
license: Apache-2.0
metadata:
  version: "1.0.0"
---

# MongoDB Schema 设计

MongoDB 的数据建模模式与反模式，由 MongoDB 维护。糟糕的 schema 是大多数 MongoDB 性能与成本问题的根本原因 —— 查询和索引无法修复根本错误的模型。

## 适用时机

在以下情况下参考这些指南：
- 从零设计新的 MongoDB schema
- 从 SQL/关系型数据库迁移到 MongoDB
- 审查现有数据模型的性能问题
- 排查慢查询或文档大小增长
- 在嵌入与引用之间做决定
- 对关系建模（一对一、一对多、多对多）
- 实现树/层级结构
- 看到 Atlas Schema Suggestions 或 Performance Advisor 警告
- 触及 16MB 文档上限
- 为现有集合添加 schema 验证

## 快速参考

### 1. Schema 反模式 - 3 条规则

- [antipattern-unnecessary-collections](references/antipattern-unnecessary-collections.md) - 将同质数据拆分到多个集合往往是一种反模式；参考此文件以确认是否属于这种情况。
- [antipattern-excessive-lookups](references/antipattern-excessive-lookups.md) - 当遇到过度规范化、相互引用的集合，或频繁且可能较慢的 $lookup 操作时，参考此文件以确认是否存在问题以及如何修复。
- [antipattern-unnecessary-indexes](references/antipattern-unnecessary-indexes.md) - 当索引重叠或未被查询使用时，参考此文件，以找出并移除只增加开销而无收益的多余索引。

### 2. Schema 基础 - 4 条规则

- [fundamental-embed-vs-reference](references/fundamental-embed-vs-reference.md) - 参考此文件了解对不同类型关系（1:1、1:few、1:many、many:many、树/层级数据）建模的方法，以及如何基于访问模式在嵌入与引用之间做决定。
- [fundamental-document-model](references/fundamental-document-model.md) - 文档模型的基础知识。当从 SQL 或其他规范化数据迁移到 MongoDB 这类文档数据库时，参考此文件。
- [fundamental-schema-validation](references/fundamental-schema-validation.md) - 在创建新集合或为现有集合添加验证时参考此文件，例如在发现文档结构不一致或数据质量问题之后。
- [fundamental-document-size](references/fundamental-document-size.md) - 当文档触及 16MB 硬上限，或因大文档导致访问比预期慢时，参考此文件。

### 3. 设计模式 - 11 条规则

- [pattern-approximation](references/pattern-approximation.md) - 对高频计数器使用近似值
- [pattern-archive](references/pattern-archive.md) - 将历史数据迁移到独立/冷存储以提升性能
- [pattern-attribute](references/pattern-attribute.md) - 将众多可选字段折叠为键值属性
- [pattern-bucket](references/pattern-bucket.md) - 将时间序列或 IoT 数据分组到桶中
- [pattern-computed](references/pattern-computed.md) - 预先计算开销大的聚合
- [pattern-document-versioning](references/pattern-document-versioning.md) - 跟踪文档变更，以支持历史查询和审计追踪
- [pattern-extended-reference](references/pattern-extended-reference.md) - 缓存来自相关实体的频繁访问数据
- [pattern-outlier](references/pattern-outlier.md) - 处理少数文档远大于其余文档的集合，防止离群值主导内存和索引开销
- [pattern-polymorphic](references/pattern-polymorphic.md) - 在同一集合中存储不同类型的实体，通常用于同一基础实体的不同类型（例如不同类型的用户或不同类型的产品）
- [pattern-schema-versioning](references/pattern-schema-versioning.md) - Schema 演进、防止漂移以及安全的在线迁移。当遇到文档结构不一致，或计划进行无法原子应用的 schema 变更时参考。
- [pattern-time-series-collections](references/pattern-time-series-collections.md) - 对高频时间序列数据使用原生时间序列集合

### 访问模式分析

在未理解更广泛上下文之前，不要立即推荐某种模式或 schema 变更。与用户一起分析访问模式，找出痛点与优化机会。

#### 工作流

**第 1 步：评估环境**
询问用户：
  - 这是全新设计，还是已有生产数据库、存在可分析的现有访问模式？
  - 如果有生产数据，它在 Atlas 上吗？如果在，是哪个层级？（M0/M2/M5 还是 M10+）

**第 2 步：确定工作负载类型**
工作负载是读多、写多还是均衡？这会影响哪些诊断数据源最为相关。
询问用户：
- 这些集合的主要工作负载是什么 —— 读多（分析、报表、搜索）、写多（日志、IoT 摄取、频繁更新），还是均衡？

用 `db.serverStatus().opcounters` 验证。

**第 3 步：与用户一起选择最佳数据源**
  针对他们的情况推荐最佳数据源，并说明取舍。对于 schema 设计决策，我们往往需要组合多个数据源才能获得完整图景。

**第 4 步：进行分析**
  只有在选定数据源之后，才获取数据或引导用户完成分析。

#### 数据源

- [Query statistics](references/source-query-stats.md) - 返回已记录查询的运行时统计，展示查询形态和频率。**限制**：目前仅捕获读操作（写模式需与其他数据源配合）。需要 Atlas M10+ 层级。
- [Atlas Slow Query Logs](references/source-slow-query-logs.md) - 审查慢查询（实际查询，而非形态）以找出性能瓶颈。捕获所有读写。需要 Atlas M10+ 层级。
- 代码库 - 检查应用代码中的实际查询以了解访问模式，尤其适用于新应用或工作负载变化的情况。可与查询统计结合使用以获得更完整的图景。
- 自然语言输入 - 请用户用自然语言描述其典型查询和访问模式。可作为唯一数据源，或用于补充和验证其他数据源 —— 用户可能拥有未体现在数据或代码库中的背景知识。

**组合查询统计与慢查询日志：**

将两者结合使用以进行全面分析：
1. 查询统计 → 找出频繁的访问模式（哪些查询运行最频繁）
2. 慢查询日志 → 找出性能瓶颈（哪些查询慢）
3. 将 schema 优化聚焦于既频繁又慢的查询（影响最大）

## 核心原则

> **“一起访问的数据应一起存储。”**

这是 MongoDB 的核心哲学。嵌入相关数据可消除连接、减少往返次数，并支持原子更新。只有在必须时才使用引用。

实现这一哲学的一个核心方式，是 MongoDB 提供**灵活的 schema**。这意味着你可以让不同文档拥有不同字段，甚至不同结构。这让你能以最贴合访问模式的方式对数据建模，而不受僵化 schema 的约束。例如，不同文档拥有不同的字段集合是完全没问题的，只要它服务于应用需求。你也可以使用 schema 验证来强制某些规则，同时仍保持灵活性。

这一核心原则的另一层含义是，关于预期读写工作负载的信息与 schema 设计密切相关。如果来自不同实体的若干信息经常被一起查询或更新，那么优先将这些数据共置于同一文档中可带来显著的性能收益。反之，如果某些信息很少一起访问，则将它们分开存储可能更合理，以避免加载不必要的过多数据。

#### Schema 基础总结

- **嵌入 vs 引用**：根据访问模式选择嵌入或引用：当数据总是被一起访问时嵌入（1:1、1:few、有界数组、需要原子更新）；当数据被独立访问、关系为多对多，或数组可能无界增长时引用。
- **一起访问的数据一起存储**：MongoDB 的核心原则：围绕查询而非实体设计 schema。嵌入相关数据以消除跨集合连接并减少往返。识别你的 API 端点/页面，列出每个端点/页面返回的数据，然后据此塑造文档以匹配这些查询。
- **拥抱文档模型**：不要把 SQL 表 1:1 地照搬为 MongoDB 集合。而应将连接的表反规范化为丰富的文档，以实现单次查询读取和原子更新。从 SQL 迁移时，找出那些总是被一起连接的表，将其合并为单个文档。
- **Schema 验证**：使用 MongoDB 内置的 `$jsonSchema` 验证器在数据库层面捕获无效数据（类型检查、必填字段、枚举约束、数组大小限制）。对现有集合从 `validationLevel: "moderate"` 和 `validationAction: "warn"` 开始，然后收紧为 `strict`/`error`。
- **16MB 文档上限**：MongoDB 文档不能超过 16MB —— 这是硬上限，不是建议值。常见原因：无界数组、大型内嵌二进制、深度嵌套对象。可通过将无界数据迁移到独立集合，并用 `$bsonSize` 监控文档大小来缓解。

## 嵌入/引用决策框架

| 关系 | 基数 | 访问模式 | 建议 |
|-------------|-------------|----------------|----------------|
| 一对一 | 1:1 | 总是一起访问 | 嵌入 |
| 一对少 | 1:N (N < 100) | 通常一起访问 | 嵌入数组 |
| 一对多 | 1:N (N > 100) | 常常分开访问 | 引用 |
| 多对多 | M:N | 视情况而定 | 双向引用 |

这是一份**粗略**的指南，究竟嵌入还是引用取决于你的具体访问模式、数据规模以及读写频率。务必结合实际工作负载进行验证。

## 如何使用

上面列出的每个参考文件都包含详细说明和代码示例。使用快速参考中的描述来判断哪些文件与你当前的任务相关。

每个参考文件包含：
- 关于其为何重要的简要说明
- 错误代码示例及说明
- 正确代码示例及说明
- “何时不应使用”的例外
- 性能影响与指标
- 验证诊断

---

## 这些规则如何运作

### MongoDB MCP 集成

如需自动验证，请连接 [MongoDB MCP Server](https://github.com/mongodb-js/mongodb-mcp-server)。

如果 MCP server 正在运行并已连接，我可以自动运行验证命令，检查你的实际 schema、文档大小、数组长度、索引使用情况、慢查询日志等。这使我能够基于你的真实数据（而不只是代码模式）提供量身定制的建议。

**⚠️ 安全**：为安全起见使用 `--readOnly`。仅在你需要写操作时才去掉它。

连接后，我可以自动：
- 通过 `mcp__mongodb__collection-schema` 推断 schema
- 通过 `mcp__mongodb__aggregate` 测量文档/数组大小
- 通过 `mcp__mongodb__db-stats` 检查集合统计信息

### ⚠️ 操作策略

**未经你的明确批准，我绝不会执行写操作。**

在通过 MCP 执行任何写入或破坏性操作之前，我将：(1) 概述确切的操作（集合、索引/验证器、预计受影响的文档数），并 (2) 请求明确确认（是/否）。我不会在部分或含糊的批准下继续。

| 操作类型 | MCP 工具 | 动作 |
|---------------|-----------|--------|
| **读（安全）** | `find`、`aggregate`、`collection-schema`、`db-stats`、`count` | 我可以自动运行以进行验证 |
| **写（需要批准）** | `update-many`、`insert-many`、`create-collection` | 我会展示命令并等待你的“是” |
| **破坏性（需要批准）** | `delete-many`、`drop-collection`、`drop-database` | 我会警告你并要求明确确认 |

当我建议 schema 变更或数据修改时：
1. 我会解释我想做**什么**以及**为什么**
2. 我会向你展示**确切的命令**
3. 我会在执行前**等待你的批准**
4. 只有你说“继续”或“是”时，我才会运行它

**你的数据库，你做决定。** 我的职责是提供建议，而不是单方面行动。

### 协作方式

如果你对某项建议不确定：
1. 运行我提供的验证命令
2. 将输出分享给我
3. 我会根据你的真实数据调整建议

我们是一个团队 —— 让我们一起把它做对。
