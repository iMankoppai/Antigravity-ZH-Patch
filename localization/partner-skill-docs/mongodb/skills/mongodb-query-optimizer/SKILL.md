---
name: mongodb-query-optimizer
description: >-
  帮助进行 MongoDB 查询优化与索引设计。仅在用户请求优化或性能帮助时使用：“如何优化这个查询？”、“如何为这个建索引？”、“这个查询为什么慢？”、“你能修复我的慢查询吗？”、“我的集群上有哪些慢查询？”等。除非用户请求性能或索引方面的帮助，否则不要因一般的 MongoDB 查询编写而调用本技能。优先将索引作为优化策略。在有 MongoDB MCP 时使用它。
compatibility: >-
  配合 MongoDB MCP server 效果最佳。当连接字符串可用时使用 collection-indexes 和 explain；当配置了 Atlas API 时使用 Atlas Performance Advisor。若两者皆无，则仅根据查询形态建议索引。除非工具允许，否则索引由用户在 Atlas 或迁移中创建。
license: Apache-2.0
metadata:
  version: "1.0.0"
---

# MongoDB 查询优化器

## 何时调用本技能

仅在用户需要以下内容时调用：

- 查询/索引**优化**或**性能**帮助
- 查询**为什么**慢，或**如何加快**它
- 他们集群上的**慢查询**，和/或**如何优化它们**

对于常规的查询编写，**不要**调用，除非用户请求了优化、慢查询或索引方面的帮助。

## 高层工作流

### 通用性能帮助

如果用户想检查慢查询，或寻求通用性能建议（并非针对任何特定查询）：

- 使用 MongoDB MCP server 的 **atlas-get-performance-advisor** 工具获取慢查询日志和 performance advisor 输出
- 基于这些信息给出建议

如果未配置 Atlas MCP Server，或你没有足够的信息来针对正确的集群运行 **atlas-get-performance-advisor**，请告知用户通用性能分析需要配置带 API 凭据的 Atlas MCP Server，并建议他们进行配置，或改为询问某个特定查询。

### 针对特定查询提供帮助

如果用户在询问某个特定查询：

- 使用 **collection-indexes**、**explain** 和 **find** MCP 工具，获取集合上的现有索引、该查询的 explain() 输出，以及集合中的一个示例文档
- 使用 **atlas-get-performance-advisor MCP** 工具获取慢查询日志和 performance advisor 输出

然后基于收集到的信息、MongoDB 最佳实践以及参考文件中的示例，给出优化建议。尽可能优先创建能完全覆盖该查询的索引。如果你无法使用 MongoDB MCP Server，仍应尝试给出建议。

## MCP：可用工具

**如何调用。** 调用 **MongoDB MCP server** 时，将**确切的工具名**作为 `toolName`，并以单个**参数对象**作为 `arguments`。不要把工具名作为选项、查询参数或嵌套键传入；应将其作为 MCP 工具名传入，参数作为 arguments 对象传入。完整的 MCP Server 工具参考：[MongoDB MCP Server Tools](https://www.mongodb.com/docs/mcp-server/tools/)。

**数据库工具**（当 MCP 集群连接可用时）：

| 工具名（确切） | 参数对象 |
| :---- | :---- |
| `collection-indexes` | `{ "database": "<db>", "collection": "<coll>" }` —— 两者均为必填字符串。 |
| `explain` | `{ "database": "<db>", "collection": "<coll>", "method": [ { "name": "find", "arguments": { "filter": {...}, "sort": {...}, "limit": N } } ], "verbosity": "executionStats" }`。`method` 是只含一个对象的数组：`name` 为 `"find"`、`"aggregate"` 或 `"count"`；`arguments` 保存该方法自身的参数（例如 find：`filter`、`sort`、`limit`；aggregate：`pipeline`；count：`query`）。可选 `verbosity`：`"queryPlanner"`（默认）、`"executionStats"`、`"queryPlannerExtended"`、`"allPlansExecution"`。 |
| `find` |  `{ "database": "<db>", "collection": "<coll>", "filter": {...}, "projection": {...}, "sort": {...}, "limit": N }` —— `database`、`collection` 和 `filter` 为必填。可选：`projection`、`sort`、`limit`。 |

**Atlas 工具**（当配置了 Atlas API 凭据时）：

| 工具名（确切） | 参数对象 |
| :---- | :---- |
| `atlas-list-projects` | `{}` 或 `{ "orgId": "<24-char hex>" }`。返回各项目及其 ID；用于获取 Performance Advisor 所需的 `projectId`。 |
| `atlas-get-performance-advisor` | **必填：** `"projectId"`（24 字符的十六进制字符串）、`"clusterName"`（字符串，1–64 个字符，字母数字/下划线/连字符）。**可选：** `"operations"` —— 取值为 `"suggestedIndexes"`、`"dropIndexSuggestions"`、`"slowQueryLogs"`、`"schemaSuggestions"` 的字符串数组（只请求你需要的）；仅对 slowQueryLogs：`"since"`（ISO 8601 日期时间）、`"namespaces"`（`"db.coll"` 字符串数组）。 |

对于用户的问题，尝试同时从连接字符串和 Atlas API 获取与你正在优化的查询相关的信息。

### 1\. 数据库连接字符串可用于 MongoDB MCP

典型流程：调用 `collection-indexes` → `explain` → `find`（示例文档）。

- **`collection-indexes`** —— 使用结果中的 `classicIndexes`（每个包含 `name`、`key`）查看查询是否已能使用现有索引。
- **`explain`** —— 先以 `"queryPlanner"` 模式运行以检查是否 COLLSCAN。如果查询使用了索引或集合非常小，再用 `"executionStats"`（10 秒超时）运行，以获得扫描文档数与返回文档数。

### 2\. Atlas API 访问可用于 MongoDB MCP

如果你需要 project ID，先调用 `atlas-list-projects`。然后只带上你需要的 `operations` 调用 `atlas-get-performance-advisor`：

| 操作值 | 使用时机 |
| :---- | :---- |
| `slowQueryLogs` | 获取慢查询——**按最慢和最频繁优先**。可选：`namespaces` 限定到某个集合；`since` 指定时间窗口。 |
| `suggestedIndexes` | 获取集群索引建议 |
| `dropIndexSuggestions` | 用户询问移除什么或降低索引开销 |
| `schemaSuggestions` | 用户在索引之外还寻求 schema/查询结构方面的建议 |

不要把 MCP 工具名作为 `operations` 的值传入——`operations` 是一个单独的参数，列出要获取的数据。

## 示例工作流 1（针对特定查询提供帮助）

**用户：** “这个查询为什么慢？`db.orders.find({status: 'shipped', region: 'US'}).sort({date: -1})`”

**如果配置了 MCP db 连接，且数据库 + 集合名已知**，执行步骤 1–3。否则跳到步骤 4。

1. **检查集合现有索引：**
   - 调用 `collection-indexes`，database=`store`，collection=`orders`
   - 结果显示：`{_id: 1}`、`{status: 1}`、`{date: -1}`

2. **运行 explain：**
   - 调用 `explain`，method=`find`，filter=`{status: 'shipped', region: 'US'}`，sort=`{date: -1}`，verbosity=`queryPlanner` 和 `executionStats`
   - 结果：使用 `{status: 1}` 索引，随后进行内存内 SORT，`totalKeysExamined: 50000`，`nReturned: 100`

3. **运行 find：**
   - 调用 `find`，limit=1，获取一个示例文档以推断 schema。

**如果配置了 MCP Atlas 连接**，执行步骤 4。否则跳到步骤 5。

4. **运行 atlas-get-performance-advisor：**
   - 尝试从 MCP 连接字符串获取集群名，或向用户询问 projectId/clusterName
   - 使用 slowQueryLogs 获取过去 24 小时内 database=`store`、collection=`orders` 的慢查询日志
   - 使用 suggestedIndexes 检查该查询的索引建议

5. **诊断：** 根据 explain 输出和慢查询日志，该查询目标为 100 个文档，却扫描了 5 万个索引条目（选择性差：0.002）。内存内排序带来额外开销。索引无法同时支撑两个过滤字段或排序。

6. **建议：** 按照 ESR 原则（两个相等字段，然后排序）创建复合索引 `{status: 1, region: 1, date: -1}`。这消除了内存内排序，并通过同时按 status 和 region 过滤提高了选择性。

如果未设置 MongoDB MCP server，请遵循最佳索引实践。

## 示例工作流 2（通用数据库性能帮助）

**用户：** “你能帮我优化集群上的慢查询吗？”

1. **运行 atlas-get-performance-advisor：**
   - 尝试从连接字符串获取集群名，并推断你在 atlas-list-projects 中需要的项目名；如果不确定，就向用户询问集群名和 project id。
   - 使用 slowQueryLogs 获取过去 24 小时的慢查询日志
   - 使用 suggestedIndexes
   - 使用 dropIndexSuggestions
   - 使用 schemaSuggestions
2. **诊断与建议：** 根据慢查询日志和 performance advisor 的建议，你可以在 `db.orders` 集合上创建复合索引 `{status: 1, region: 1, date: -1}`，以优化诸如 `find({status: 'shipped', region: 'US'}).sort({date: -1})` 的查询

检查所有 performance advisor 输出以及慢查询日志。说明正在改进什么以及原因，并聚焦于可能产生最大影响的建议（例如影响最多查询的索引，或性能最差的查询）。

## 加载参考文件

在开始诊断和建议之前，加载参考文件。

始终加载：

- `references/core-indexing-principles.md`
- `references/antipattern-examples.md`

按条件加载这些文件：

- **如果诊断聚合管道** → `references/aggregation-optimization.md`
- **如果诊断会更改文档的查询，如 replaceOne、findOneAndUpdate 等** → `references/update-query-examples.md`，了解对 oplog 高效的更新及常见更新反模式

## 输出

- 保持回答简短清晰：用几句话说明索引和优化建议及其背后的理由（例如通用索引原则、对集群慢查询日志的观察，或在 Performance Advisor 中看到的建议）
- 聚焦于影响最大的索引或优化 —— 如果你省略了某些优化，告知用户，并在被询问时呈现。
- 不要使用绝对的措辞，例如说“你应该创建这些索引，它们一定能提升应用性能” \- 解释这些是针对某些查询的建议，并给出其背后的理由。
- 考虑集合上已存在多少索引（若已知） \- 通常不应超过 20 个
- 仅当建议来自 Atlas Performance Advisor 时才建议移除索引
- 除非用户批准，不要直接通过 MCP 创建索引
