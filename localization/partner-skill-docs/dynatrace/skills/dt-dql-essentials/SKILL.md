---
name: dt-dql-essentials
description: "核心 DQL 语法、陷阱、查询模式和查询优化。加载以编写、构建、修复或**优化** DQL 查询 —— 防止语法错误，并使查询更快、更高效、更便宜（扫描更少数据 = 每次运行更低的查询消耗/成本）。涵盖 fetch 命令、数据模型、字段命名空间、时间对齐、实体/smartscape 模式、指标发现，以及性能/成本优化（尽早过滤、桶过滤器、短时间范围、字段选择、采样、基数）。触发词：\"write/build/fix a DQL query\"、\"DQL syntax\"、\"query logs/spans/metrics\"、\"create a timeseries\"、\"optimize my DQL\"、\"make my query faster/cheaper\"、\"reduce DQL cost/consumption/scanned data\"、\"keep DQL cost under control\"。不要用于解释现有查询或回答产品问题。对于**监控**租户的**实际**查询消耗/账单（查询花费多少、谁扫描最多、成本趋势），使用 dt-platform-costs —— 此技能调优查询文本，而非账单数据。"
license: Apache-2.0
---

# DQL Essentials 技能

DQL 是一种基于管道的查询语言。查询用 `|` 链接命令以过滤、转换和聚合数据。DQL 的语法与 SQL 不同 —— 在编写任何 DQL 查询之前加载此技能。

______________________________________________________________________

## 何时加载参考

在着手特定任务之前，加载相关参考：

| 任务                                                                          | 必读                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 发现数据 | [references/discovery.md](references/discovery.md) |   
| 字段名、命名空间、数据模型、稳定性级别、查询模式        | [references/semantic-dictionary.md](references/semantic-dictionary.md)                       |
| 查询优化 —— 让查询更快 / 更高效 / 更便宜，减少消耗和扫描数据（尽早过滤、桶过滤器、时间范围、字段选择、采样、基数） | [references/optimization.md](references/optimization.md)                                     |
| 用于发现实体之间关系的 Smartscape 拓扑导航 | [references/smartscape-topology-navigation.md](references/smartscape-topology-navigation.md) |
| `summarize` 和 `makeTimeseries` 模式（分桶、日历月）        | [references/summarization.md](references/summarization.md)                                   |
| 数组和时间序列操作（`arrayFilter`、`collectArray`、迭代）  | [references/iterative-expressions.md](references/iterative-expressions.md)                   |
| 条件逻辑（`if/else` 链）、`coalesce`、字符串/日期辅助函数         | [references/useful-expressions.md](references/useful-expressions.md)                         |
| `in` 运算符（子查询）、完整的 `@` 时间对齐单位表                  | [references/operators.md](references/operators.md)                                           |
| `matchesValue`、`matchesPhrase`、`matchesPattern`、`in()` —— 字符串模式匹配、正则、数组匹配、通配符、大小写敏感性 | [references/string-matching.md](references/string-matching.md)                               |

______________________________________________________________________

## DQL 参考索引

使用此索引从函数组（例如时间函数、转换）路由到其详细规范，或从函数名路由到其规范文件。

| 描述 | 条目 |
|-------------|-------|
| [数据类型](references/dql/dql-data-types.md) | `array`、`binary`、`boolean`、`double`、`duration`、`long`、`record`、`string`、`timeframe`、`timestamp`、`uid` |
| [参数值类型](references/dql/dql-parameter-value-types.md) | `bucket`、`dataObject`、`dplPattern`、`entityAttribute`、`entitySelector`、`entityType`、`enum`、`executionBlock`、`expressionTimeseriesAggregation`、`expressionWithConstantValue`、`expressionWithFieldAccess`、`fieldPattern`、`filePattern`、`identifierForAnyField`、`identifierForEdgeType`、`identifierForFieldOnRootLevel`、`identifierForNodeType`、`joinCondition`、`jsonPath`、`metricKey`、`metricTimeseriesAggregation`、`namelessDplPattern`、`nonEmptyExecutionBlock`、`prefix`、`primitiveValue`、`simpleIdentifier`、`tabularFileExisting`、`tabularFileNew`、`url` |
| [命令](references/dql/dql-commands.md) | `append`、`data`、`dedup`、`describe`、`expand`、`fetch`、`fields`、`fieldsAdd`、`fieldsFlatten`、`fieldsKeep`、`fieldsRemove`、`fieldsRename`、`fieldsSnapshot`、`fieldsSummary`、`filter`、`filterOut`、`join`、`joinNested`、`limit`、`load`、`lookup`、`makeTimeseries`、`metrics`、`parse`、`search`、`smartscapeEdges`、`smartscapeNodes`、`sort`、`summarize`、`timeseries`、`traverse` |
| [函数 —— 聚合](references/dql/dql-functions-aggregation.md) | `avg`、`collectArray`、`collectDistinct`、`correlation`、`count`、`countDistinct`、`countDistinctApprox`、`countDistinctExact`、`countIf`、`max`、`median`、`min`、`percentRank`、`percentile`、`percentileFromSamples`、`percentiles`、`stddev`、`sum`、`takeAny`、`takeFirst`、`takeLast`、`takeMax`、`takeMin`、`variance` |
| [函数 —— 数组](references/dql/dql-functions-array.md) | `arrayAvg`、`arrayConcat`、`arrayCumulativeSum`、`arrayDelta`、`arrayDiff`、`arrayDistinct`、`arrayFirst`、`arrayFlatten`、`arrayIndexOf`、`arrayLast`、`arrayLastIndexOf`、`arrayMax`、`arrayMedian`、`arrayMin`、`arrayMovingAvg`、`arrayMovingMax`、`arrayMovingMin`、`arrayMovingSum`、`arrayPercentile`、`arrayRemoveNulls`、`arrayReverse`、`arraySize`、`arraySlice`、`arraySort`、`arraySum`、`arrayToString`、`vectorCosineDistance`、`vectorInnerProductDistance`、`vectorL1Distance`、`vectorL2Distance` |
| [函数 —— 位运算](references/dql/dql-functions-bitwise.md) | `bitwiseAnd`、`bitwiseCountOnes`、`bitwiseNot`、`bitwiseOr`、`bitwiseShiftLeft`、`bitwiseShiftRight`、`bitwiseXor` |
| [函数 —— 布尔](references/dql/dql-functions-boolean.md) | `exists`、`in`、`isFalseOrNull`、`isNotNull`、`isNull`、`isTrueOrNull`、`isUid128`、`isUid64`、`isUuid` |
| [函数 —— 类型转换](references/dql/dql-functions-cast.md) | `asArray`、`asBinary`、`asBoolean`、`asDouble`、`asDuration`、`asIp`、`asLong`、`asNumber`、`asRecord`、`asSmartscapeId`、`asString`、`asTimeframe`、`asTimestamp`、`asUid` |
| [函数 —— 常量](references/dql/dql-functions-constant.md) | `e`、`pi` |
| [函数 —— 转换](references/dql/dql-functions-conversion.md) | `toArray`、`toBoolean`、`toDouble`、`toDuration`、`toIp`、`toLong`、`toSmartscapeId`、`toString`、`toTimeframe`、`toTimestamp`、`toUid`、`toVariant` |
| [函数 —— 创建](references/dql/dql-functions-create.md) | `array`、`duration`、`ip`、`record`、`smartscapeId`、`timeframe`、`timestamp`、`timestampFromUnixMillis`、`timestampFromUnixNanos`、`timestampFromUnixSeconds`、`uid128`、`uid64`、`uuid` |
| [函数 —— 加密](references/dql/dql-functions-cryptographic.md) | `hashCrc32`、`hashMd5`、`hashSha1`、`hashSha256`、`hashSha512`、`hashXxHash32`、`hashXxHash64` |
| [函数 —— 实体](references/dql/dql-functions-entities.md) | `classicEntitySelector`、`entityAttr`、`entityName` |
| [函数 —— 表达式的时序聚合](references/dql/dql-functions-expression-timeseries.md) | `avg`、`count`、`countDistinct`、`countDistinctApprox`、`countDistinctExact`、`countIf`、`end`、`max`、`median`、`min`、`percentRank`、`percentile`、`percentileFromSamples`、`start`、`sum` |
| [函数 —— 流程](references/dql/dql-functions-flow.md) | `coalesce`、`if` |
| [函数 —— 通用](references/dql/dql-functions-general.md) | `jsonField`、`jsonPath`、`lookup`、`parse`、`parseAll`、`type` |
| [函数 —— 获取](references/dql/dql-functions-get.md) | `arrayElement`、`getEnd`、`getHighBits`、`getLowBits`、`getStart` |
| [函数 —— 迭代](references/dql/dql-functions-iterative.md) | `iAny`、`iCollectArray`、`iIndex` |
| [函数 —— 数学](references/dql/dql-functions-mathematical.md) | `abs`、`acos`、`asin`、`atan`、`atan2`、`bin`、`cbrt`、`ceil`、`cos`、`cosh`、`degreeToRadian`、`exp`、`floor`、`hexStringToNumber`、`hypotenuse`、`log`、`log10`、`log1p`、`numberToHexString`、`power`、`radianToDegree`、`random`、`range`、`round`、`signum`、`sin`、`sinh`、`sqrt`、`tan`、`tanh` |
| [函数 —— 网络](references/dql/dql-functions-network.md) | `ipIn`、`ipIsLinkLocal`、`ipIsLoopback`、`ipIsPrivate`、`ipIsPublic`、`ipMask`、`isIp`、`isIpV4`、`isIpV6` |
| [函数 —— Smartscape](references/dql/dql-functions-smartscape.md) | `getNodeField`、`getNodeName` |
| [函数 —— 字符串](references/dql/dql-functions-string.md) | `concat`、`contains`、`decodeBase16ToBinary`、`decodeBase16ToString`、`decodeBase64ToBinary`、`decodeBase64ToString`、`decodeUrl`、`encodeBase16`、`encodeBase64`、`encodeUrl`、`endsWith`、`escape`、`getCharacter`、`indexOf`、`lastIndexOf`、`levenshteinDistance`、`like`、`lower`、`matchesPattern`、`matchesPhrase`、`matchesRegex`、`matchesValue`、`punctuation`、`replacePattern`、`replaceString`、`splitByPattern`、`splitString`、`startsWith`、`stringLength`、`substring`、`trim`、`unescape`、`unescapeHtml`、`upper` |
| [函数 —— 时间](references/dql/dql-functions-time.md) | `formatTimestamp`、`getDayOfMonth`、`getDayOfWeek`、`getDayOfYear`、`getHour`、`getMinute`、`getMonth`、`getSecond`、`getWeekOfYear`、`getYear`、`now`、`unixMillisFromTimestamp`、`unixNanosFromTimestamp`、`unixSecondsFromTimestamp` |
| [函数 —— 指标的时序聚合](references/dql/dql-functions-timeseries.md) | `avg`、`count`、`countDistinct`、`end`、`max`、`median`、`min`、`percentRank`、`percentile`、`start`、`sum` |

______________________________________________________________________

## 语法陷阱

| ❌ 错误 | ✅ 正确 | 问题 |
| --- | --- | --- |
| `filter field in ["a", "b"]` | `filter in(field, {"a", "b"})` | `[` 和 `]` 在 DQL 中包裹子查询，但不包裹**静态**数组字面量。静态值使用 `{}` 或 `array()`。 |
| `filter: { in(field, [sub-query]) }`（例如在 `timeseries filter:` 中） | `filter: { field in [sub-query] }` | `in()` 不接受执行块作为参数。当右侧是子查询（执行块）时，使用 `in` 运算符：`field in [execution block]`。 |
| `by: severity, status` | `by: {severity, status}` | 字段列表必须在 `by:` 子句（`summarize`、`makeTimeseries` 等）中用花括号分组。 |
| `contains(toLowercase(field), "err")` | `contains(field, "err", false)` | 不要为了不区分大小写匹配而包裹 `lower()`。`contains()` 有内置的第三个位置参数 `caseSensitive`（默认 `true`）。 |
| `filter name == "*serv*9*"` | `filter matchesValue(name, "*serv*") and matchesValue(name, "*9*")` | `==` 不支持通配符。`matchesValue()` 支持 `*` 通配符，但仅在模式的开始和/或结尾 —— 将字符串中间的通配符意图拆分为多次调用并用 `and` 组合。 |
| 在字符串字段上 `matchesValue(field, "prod")` | `contains(field, "prod")` | 没有通配符时，`matchesValue()` 执行精确（不区分大小写）匹配 —— 它不会找到 `"production"`。使用 `contains()` 进行子串匹配（或用 `matchesValue(field, "*prod*")` 进行通配符匹配）。 |
| `iAny(matchesValue(arr[], "x") OR matchesValue(arr[], "y"))` | `matchesValue(arr, {"x", "y"})` | `matchesValue` 在第一个参数接受数组字段，在第二个参数接受数组字面量 `{}` —— 无需 `iAny` 或 `[]`。对同一字段合并多个 `contains(f, x) OR contains(f, y)` 时同理：使用 `matchesValue(f, {"*x*", "*y*"})`。 |
| `iAny(matchesPhrase(arr[], "phrase"))` | `matchesPhrase(arr, "phrase")` | `matchesPhrase` 原生遍历数组字段 —— 去掉 `iAny(` 和 `[]`。注意：**第二个**参数必须是静态字符串；`matchesPhrase(f, array("a","b")[])` 是运行时错误。 |
| 在短或常见 token 上 `contains(field, "pip")` | `matchesPhrase(field, "pip")` | `contains` 是纯子串匹配 —— `"pip"` 也会命中 `"pipenv"`、`"gripping"`。`matchesPhrase` 对字符串分词并仅匹配整词，误报更少。 |
| `iAny(in(lower(arr[]), array("a", "b")))` | `matchesValue(arr, {"a", "b"}, caseSensitive: false)` | `matchesValue` 默认不区分大小写 —— 无需 `lower()`、`in()` 或 `iAny` 包裹。此处显式显示 `caseSensitive: false` 只是为了对应它所替代的 `lower()` 的意图。 |
| `iAny(f1[] == "a" AND f2[] == "b")` 遍历两个独立数组 | `in(f1, "a") AND in(f2, "b")` | 多数组 `iAny` 是**成对**的，不是笛卡尔积：`f1[]` 的元素 `i` 与 `f2[]` 的元素 `i` 进行测试。如果数组长度不同，结果为 `null`。改用独立的 `in()` 检查。参见 [references/iterative-expressions.md](references/iterative-expressions.md)。 |
| `toLowercase(field)` | `lower(field)` | 函数是 `lower()`，不是 `toLowercase()`。只有类型转换函数使用 `to` 前缀（`toString()`、`toLong()` 等）。 |
| `arrayAvg(field[])` 或 `arraySum(field[])` | `arrayAvg(field)` 或 `field[]` | `field[]` = 逐元素迭代表达式（数组→数组）；`arrayAvg(field)` = 折叠为标量（数组→单值）。绝不要混用 —— `arrayAvg(field[])` 在语义上是错误的。 |
| `lookup` 或 `join` 之后的 `my_field` | `lookup.my_field` / `right.my_field` | `lookup` 默认给添加的字段加 `lookup.` 前缀（可通过 `prefix:` 配置）。`join` 给右侧字段加 `right.` 前缀。 |
| `substring(field, 0, 200)` | `substring(field, from: 0, to: 200)` | 第一个参数（表达式）是位置参数，但 `from:` 和 `to:` 是命名可选参数，必须包含其名称。 |
| `filter host = "A"` | `filter host == "A"` | DQL 使用 `==` 进行相等比较，而非 `=`。单个 `=` 是赋值（例如在 `fieldsAdd`、summarize 别名中）。 |
| `fetch logs, from: toTimestamp('2026-01-01')` | `fetch logs, from: -24h` | `from:` / `to:` 接受持续时间字面量（例如 `-24h`、`-7d`）或 `now()` 表达式 —— 而不是 `toTimestamp()`。绝对范围使用 `timeframe: "start/end"`（ISO 8601）。 |
| `filter log.level == "ERROR"` | `filter loglevel == "ERROR"` | 日志严重程度字段是 `loglevel`（无点）—— `log.level` 不存在。 |
| `sort count() desc` | `` sort `count()` desc `` | 含特殊字符（如括号）的字段必须用反引号包裹。 |
| `length(field)` | `stringLength(field)` | DQL 字符串长度函数是 `stringLength` —— 没有 `length()`。 |
| `metrics dt.host.cpu.usage` | `timeseries avg(dt.host.cpu.usage)` | `metrics` 加载指标元数据，而非值 —— 数据使用 `timeseries`。 |
| `join [...], on:{left.a.b == right.a.b}` | `` join [...], on:{left[`a.b`] == right[`a.b`]} `` | join/lookup 条件中的带点字段名需要反引号方括号表示法。 |
| `fieldsSummary`（无参数） | `fieldsSummary field1, field2` | `fieldsSummary` 至少需要一个字段参数。 |
| `timeseries` 配合 `percentile`/`median`/`percentRank` —— 无结果 | 向 `timeseries` 命令添加 `rollup: avg`（或 `min`/`max`/`sum`） | 这三个函数在 gauge/count 指标上**需要 `rollup:`** —— 没有它会静默返回空。 |
| `summarize p95 = percentile(duration, 95, rollup: avg)` | `summarize p95 = percentile(duration, 95)` | `rollup:` 是**仅限 `timeseries`** 的参数。`summarize` 中对日志/跨度/事件的同名聚合会以 `UNKNOWN_PARAMETER_DEFINED` 拒绝它。仅在 `timeseries` 内聚合*指标*时才添加 `rollup:`。 |
| `filter array.contains(field, "v")` 或 `arrayContains(field, "v")` | `filter in(field, {"v"})` | DQL 中不存在这两个函数 —— 二者都是从 Python/Java/SQL 臆造的。`in()` 已原生匹配**数组类型**字段（例如 `dt.davis.problems` 上的 `k8s.namespace.name`）：如果 needles 的任一元素匹配 haystacks 的任一元素，则返回 true。参见 [references/iterative-expressions.md](references/iterative-expressions.md)。 |
| `filter k8s.namespace.name == "ns"`，而字段是数组类型 | `filter in(k8s.namespace.name, {"ns"})` | 对数组类型字段使用 `==` 匹配**什么都不会** —— 它返回零行且无错误，读起来像"无数据"而不是错误。`k8s.*` 字段在 `dt.davis.problems` 上是数组。使用 `in()` 进行精确成员判断，或 `matchesValue(field, {...})`。 |
| `parseJson(field)` 或 `extractJsonField(field, jsonPath: "$.x")` | `parse field, "JSON:parsed"` 然后 `parsed[x]` | 两个函数都不存在。嵌入字符串字段中的 JSON 用 `parse` 命令和 `JSON` DPL 匹配器解包，然后用方括号表示法访问。 |
| `filter hour(timestamp) == 4` / `minute(timestamp)` | `filter getHour(timestamp) == 4` / `getMinute(timestamp)` | 没有 `hour()`/`minute()` 函数。`get*` 家族返回**数字**，因此数值比较和范围有效。不要用 `formatTimestamp(timestamp, format: "HH")` 替代 —— 那返回*字符串*，因此 `== 4` 静默匹配不到任何内容。 |
| 在 `dt.entity.*` 上 `fields fromRelationships, toRelationships, containerImageTag` | 先 `describe dt.entity.<type>`，然后选择真实字段 | Classic 实体对象**不**暴露 Entities REST API 的属性名。字段名必须用 `describe <dataObject>` 发现，而不是从 API 负载中猜测。 |
| `by: {bin(timestamp, 1h)}` 然后 `` sort `bin(timestamp,1h)` `` | `by: {t = bin(timestamp, 1h)}` 然后 `sort t` | DQL 将自动生成的分组键名规范化为 `bin(timestamp, 1h)` —— 逗号后带一个空格，无论表达式如何书写。省略该空格的反引号引用会引发 `FIELD_DOES_NOT_EXIST`。始终为分组键起别名。 |
| `fetch spans \| ... by: {bin(timestamp, 1h)}` | `fetch spans \| ... by: {t = bin(start_time, 1h)}` | `spans` 没有 `timestamp` 字段 —— 其时间字段是 `start_time` 和 `end_time`。引用 `timestamp` 会报错或产生空值，取决于位置。 |
| `` lookup [...], fields: {`dotted.name`} `` | `lookup [...], fields: {dotted.name}` | 不要在 `lookup` 的 `fields:` 参数内使用反引号包裹字段名 —— 会导致 PARSE_ERROR。 |
| `data record(key: "val")` | `data record(key = "val")` | `record()` 对命名字段使用 `=`，而非 `:` —— `:` 用于命令参数，如 `rollup:`。 |
| `getNodeField(dt.smartscape.host, "tags")["tag.key"]` | `getNodeField(dt.smartscape.host, "tags")[tag.key]` | 在此标签映射访问模式中，方括号键必须使用未加引号的标识符语法；带引号的键会导致解析错误。 |
| `by: {dt.entity.host}` 或 `dt.entity.*` | `by: {dt.smartscape.host}` 或 `dt.smartscape.*` | `dt.entity.*` 已**弃用** —— 在新查询中始终使用 `dt.smartscape.*`。 |

______________________________________________________________________

## Fetch 命令 → 数据模型

DQL 查询以 `fetch <data_object>` 或 `timeseries` 开头。**没有 `fetch dt.metric`** —— 指标使用 `timeseries`。

| Fetch 命令 | 数据模型 | 关键字段 / 说明 |
|---------------|------------|--------------------|
| `fetch spans` | 分布式追踪 | `span.*`、`service.*`、`http.*`、`db.*`、`code.*`、`exception.*` |
| `fetch logs` | 日志事件 | `log.*`、`k8s.*`、`host.*` —— 消息体是 `content`，严重程度是 `loglevel`（不是 `log.level`） |
| `fetch events` | DAVIS / 基础设施事件 | `event.*`、`dt.smartscape.*` |
| `fetch bizevents` | 业务事件 | `event.*`、自定义字段 |
| `fetch security.events` | 安全事件 | `vulnerability.*`、`event.*` |
| `fetch user.sessions` | RUM 会话 | `dt.rum.*`、`browser.*`、`geo.*` |
| `fetch user.events` | RUM 单个事件 | 页面浏览、点击、请求、错误 |
| `fetch user.replays` | 会话回放录制 | |
| `fetch application.snapshots` | 应用快照 | |
| `fetch dt.davis.events` | Davis 检测到的事件 | |
| `fetch dt.davis.problems` | Davis 检测到的问题 | |
| `timeseries avg(metric.key)` | 指标 | 不是 `fetch` —— 带连字符的键需要反引号：`` timeseries sum(`my.metric-name`) `` |
| `smartscapeNodes "HOST"` | 拓扑 | 不是 `fetch` —— 类型：`HOST`、`SERVICE`、`K8S_CLUSTER` 等 |

`dt.entity.*` 已弃用 —— 新查询请使用 `dt.smartscape.*` 和 `smartscapeNodes`。

发现所有可用的数据对象：`fetch dt.system.data_objects | fields name, display_name, type`

→ 完整字段命名空间参见 [references/semantic-dictionary.md](references/semantic-dictionary.md)

______________________________________________________________________

## `samplingRatio` 参数

`fetch` 支持 `samplingRatio:` 参数以减少读取的数据量 —— 对提升大数据集上的查询性能有用。

```dql
fetch spans, samplingRatio:100   // reads ~1% of data
```

**允许的值：** 取决于具体数据对象，范围为 `1`、`10`、`100`、`1000`、`10000` 到 `100000`，最高级别仅对 `logs` 和 `spans` 可用。


对 `spans`、`user.events` 和 `user.sessions`，采样是**分层的**：在较高比率（例如 `100`）下包含的记录保证也会出现在较低比率（例如 `10`、`1`）下，但反之不然。这意味着不同比率下的结果是彼此的子集。所有其他非指标数据对象按记录独立采样，因此不同比率下的结果不是子集。

实际应用的比率可通过 `dt.system.sampling_ratio` 字段访问。用它可将采样计数外推回真实总数：

```dql
fetch logs, samplingRatio:10
| summarize count_extrapolated = sum(dt.system.sampling_ratio)
```
______________________________________________________________________

## 时间序列聚合函数

`timeseries` 命令仅支持这些聚合函数：

| 函数 | 描述 |
|----------|-------------|
| `sum` | 每个时间槽的指标数据点之和 |
| `avg` | 每个时间槽的指标数据点平均值 |
| `min` | 每个时间槽的指标数据点最小值 |
| `max` | 每个时间槽的指标数据点最大值 |
| `count` | 每个时间槽的指标数据点计数 |
| `percentile(metric, N)` | 每个时间槽的第 N 百分位数。**需要 `rollup:`** —— 见下文。 |
| `median(metric)` | 每个时间槽的第 50 百分位数（= `percentile(metric, 50)`）。**需要 `rollup:`**。 |
| `percentRank(metric, value)` | 每个时间槽中某值的百分位排名。**需要 `rollup:`**。 |
| `countDistinct(metric)` | 每个时间槽的近似不同计数（仅限基数指标；不**接受** `rollup:`）。 |

辅助函数（与聚合一起使用）：`start()`、`end()`。

**`timeseries` 不支持：** `countIf`、`collectArray`、`stddev`、`variance`、`takeAny`、`takeFirst`、`takeLast` —— 请使用 `summarize` 或 `makeTimeseries`。

### `rollup:` 参数

指标在摄取时已预先聚合。`rollup:` 控制原始数据点如何按时间槽组合。`percentile`、`median`、`percentRank` 需要它 —— 没有它会静默返回无结果。`avg`/`min`/`max`/`sum`/`count` 无需 `rollup:`。

`rollup:` 是**仅限 `timeseries`** 的参数 —— 它属于指标聚合，不属于其他任何东西。对事件数据（日志、跨度、事件）在 `summarize` 中可用的同名聚合函数**不**接受它：`summarize p95 = percentile(duration, 95, rollup: avg)` 会以 `UNKNOWN_PARAMETER_DEFINED` 失败。在 `summarize` 中，使用不带 `rollup:` 的 `percentile(field, N)`。

单聚合 —— `rollup:` 在命令级别。`{}` 中的多聚合 —— `rollup:` 必须**放在每个函数调用内部**（命令级 `rollup:` 会导致 `UNKNOWN_PARAMETER_DEFINED`）：

```dql
timeseries p90 = percentile(dt.process.handles.file_descriptors_percent_used, 90), rollup: avg
```

```dql
timeseries {
  p90 = percentile(dt.process.handles.file_descriptors_percent_used, 90, rollup: avg),
  med = median(dt.process.handles.file_descriptors_percent_used, rollup: avg),
  avg_val = avg(dt.process.handles.file_descriptors_percent_used)
}, by: {dt.smartscape.host}
```

值：`avg`（gauge）、`min`、`max`、`sum`（counter）、`total`。

### 时间序列到标量的转换

有两种方式将时间序列折叠为标量。当你只需要单个聚合值时，优先使用 `scalar:true` 参数 —— 它更高效，因为不物化数组。当你在同一查询中既需要完整序列又需要派生的标量时，回退到数组函数。

**首选：在聚合函数上使用 `scalar:true`**

向任何时间序列聚合函数传入 `scalar:true`。结果字段包含单个值而不是数组，且不分配中间数组：

```dql
timeseries avg_cpu = avg(dt.host.cpu.usage, scalar:true), by:{dt.smartscape.host}
```

```dql
timeseries {
  avg_cpu = avg(dt.host.cpu.usage, scalar:true),
  max_cpu = max(dt.host.cpu.usage, scalar:true)
}, by:{dt.smartscape.host}
```

**后备：在 `fieldsAdd` 中使用数组函数**

当你需要完整时间序列数组以及派生的标量时，在后续 `| fieldsAdd` 中使用数组函数：

| 函数 | 描述 |
|----------|-------------|
| `arrayAvg(arr)` | 数组中所有值的平均值 |
| `arraySum(arr)` | 所有值之和 |
| `arrayMin(arr)` | 最小值 |
| `arrayMax(arr)` | 最大值 |
| `arrayMedian(arr)` | 中位数 |
| `arrayPercentile(arr, N)` | 第 N 百分位数（0–100） |
| `arrayLast(arr)` | 最后一个非空值（最新数据点） |
| `arrayFirst(arr)` | 第一个非空值（最早数据点） |

```dql
timeseries cpu = avg(dt.host.cpu.usage), by:{dt.smartscape.host}
| fieldsAdd avg_cpu = arrayAvg(cpu), max_cpu = arrayMax(cpu)
```

______________________________________________________________________

## 时间对齐（@ 运算符）

`@` 运算符将时间戳对齐到边界 —— 智能体经常弄错这一点。

| 表达式   | 含义                                                     |
| ------------ | ----------------------------------------------------------- |
| `now()@h`    | 当前时间，对齐到小时边界                  |
| `now()@d`    | 今天午夜                                              |
| `now()@w1`   | 本周星期一                                            |
| `now()-2h@h` | 2 小时前，对齐到小时（先偏移，再对齐） |

**规则：**

- 顺序：偏移先于对齐 —— `now()-2h@h`，而非 `now()@h-2h`
- `@` 与单位之间不留空格 —— `now()@h` 而非 `now() @h`
- `m` = 分钟，`M` = 月 —— 不要混淆

→ `timeseries` 聚合和 `rollup:` 规则的完整列表，参见 [references/dql/dql-functions-timeseries.md](references/dql/dql-functions-timeseries.md)
→ `arrayAvg` / `arrayMax` / `arrayPercentile` / …… 规范，参见 [references/dql/dql-functions-array.md](references/dql/dql-functions-array.md)

______________________________________________________________________

## 实体与 Smartscape 模式

实体字段按类型限定范围 —— `entity.id` 不存在。拓扑查询使用 `smartscapeNodes`。

| 实体      | 数据中的 ID 字段             | `smartscapeNodes` 类型 |
| ----------- | ---------------------------- | ---------------------- |
| 主机        | `dt.smartscape.host`         | `"HOST"`               |
| 服务     | `dt.smartscape.service`      | `"SERVICE"`            |
| 进程     | `dt.smartscape.process`      | `"PROCESS"`            |
| K8s 集群 | `dt.smartscape.k8s_cluster`  | `"K8S_CLUSTER"`        |

使用 `toSmartscapeId()` 从字符串转换 ID（必需！）。

→ [references/smartscape-topology-navigation.md](references/smartscape-topology-navigation.md)

______________________________________________________________________

## makeTimeseries 命令

`makeTimeseries` 从事件数据（日志、跨度、bizevents）构建按时间分桶的序列。与 `timeseries`（查询预先摄取的指标）不同，`makeTimeseries` 在管道中聚合数据。

**不要将 `timeseries` 直接管道到 `makeTimeseries`** —— 它会以 `INVALID_IMPLICIT_TIME_DEFAULT` 失败。要重新聚合指标数据，使用 `start()` + expand（参见 [references/summarization.md](references/summarization.md)）。

```dql
fetch logs
| makeTimeseries
    total = count(),
    errors = countIf(loglevel == "ERROR"),
    interval: 5m,
    by: {k8s.cluster.name}
| fieldsAdd error_rate = errors[] * 100.0 / total[]
```

关键参数：`interval:`、`by:{}`、`from:`/`to:`、`bins:`、`time:`（时间戳字段）、`spread:`（仅用于 `count`/`countIf`）、`nonempty:`。

→ 完整的 `makeTimeseries` 模式和 `summarize` 分桶，参见 [references/summarization.md](references/summarization.md)
→ 时间序列数组操作，参见 [references/iterative-expressions.md](references/iterative-expressions.md)

______________________________________________________________________

## 字符串匹配函数

DQL 有四个主要的字符串和数组模式匹配函数。完整指南和快速参考表参见 [references/string-matching.md](references/string-matching.md)。

- **`matchesValue(field, {"pattern*", "*other*"})`** —— 通配符匹配（`*` 在开始/结尾）。第一个参数接受数组字段，第二个参数接受数组字面量 `{}` —— 无需 `iAny` 或 `[]`。默认不区分大小写（`caseSensitive: true` 强制区分大小写匹配）。替代 `contains()` + `iAny` 链和 `lower()` 变通方案。
- **`matchesPhrase(field, "token")`** —— 对字符串分词并匹配整词，不同于 `contains()` 的裸子串匹配。第一个参数原生接受数组字段；第二个参数必须是**静态字符串**（数组解包会导致运行时错误）。
- **`in(field, array("a", "b"))`** —— 集合成员判断。两个参数都接受数组，使其成为重叠/交集检查。

______________________________________________________________________

## 链式 Lookup 模式


每个不带 `fields` 参数的 `lookup` 命令在添加新字段之前会**删除所有以该前缀开头的现有字段（默认：`lookup.`）**。当链式多个 lookup 时，使用 `fields` 参数或自定义前缀以保留结果：

**选项 1（默认）**：所需的字段已知。
```dql
fetch bizevents
// Step 1: First lookup — enrich orders with product info
| lookup [fetch bizevents
    | filter event.type == "product_catalog"
    | fields product_id, category],
  sourceField: product_id, lookupField: product_id, fields: {product_id, product_category = category}

// Step 2: Second lookup — specify fields with a different name
| lookup [fetch bizevents
    | filter event.type == "warehouse_stock"
    | fields category, warehouse_region],
  sourceField: product_category, lookupField: category, fields: {warehouse_region, warehouse_category = category}

```
所有 4 个 lookup 字段 product_id、product_category、warehouse_region 和 warehouse_category 都可用。
没有 `fields:{...}` 参数时，字段会被加上 `lookup.` 前缀，第二个 lookup 命令会删除第一个 lookup 添加的字段。

**选项 2**：保留 lookup 的所有字段。
```dql
fetch bizevents
// Step 1: First lookup — enrich orders with product info
| lookup [fetch bizevents
    | filter event.type == "product_catalog"
    | fields product_id, category],
  sourceField: product_id, lookupField: product_id, prefix: "product."

// Step 2: Second lookup — specify fields with a different prefix
| lookup [fetch bizevents
    | filter event.type == "warehouse_stock"
    | fields category, warehouse_region],
  sourceField: product_category, lookupField: category, prefix: "warehouse."

```
新字段为：`product.product_id`、`product.category`、`warehouse.category`、`warehouse.warehouse_region`。
所有以 `product.` 或 `warehouse.` 开头的字段会从原始源中被移除。
没有专用的 `prefix`，两个 `lookup` 命令都会使用相同前缀（`lookup.`），第二个 `lookup` 会丢弃第一个 lookup 的结果 —— 产生空字段。

______________________________________________________________________

## makeTimeseries 命令

`makeTimeseries` 从事件数据（日志、跨度、bizevents）构建按时间分桶的序列。与 `timeseries`（查询预先摄取的指标）不同，`makeTimeseries` 在管道中聚合数据。

**不要将 `timeseries` 直接管道到 `makeTimeseries`** —— 它会以 `INVALID_IMPLICIT_TIME_DEFAULT` 失败。要重新聚合指标数据，使用 `start()` + expand（参见 [references/summarization.md](references/summarization.md)）。

```dql
fetch logs
| makeTimeseries
    {total = count(),
    errors = countIf(loglevel == "ERROR")},
    interval: 5m,
    by: {k8s.cluster.name}
| fieldsAdd error_rate = errors[] * 100.0 / total[]
```

关键参数：`interval:`、`by:{}`、`from:`/`to:`、`bins:`、`time:`（时间戳字段）、`spread:`（仅用于 `count`/`countIf`）、`nonempty:`。→ 完整规范参见 [references/dql/dql-commands.md](references/dql/dql-commands.md)。

使用 `spread:` 的实体存在时间线：

```dql
smartscapeNodes "HOST"
| makeTimeseries concurrently_existing_hosts = count(), spread: lifetime
```

→ 时间序列数组操作，参见 [references/iterative-expressions.md](references/iterative-expressions.md)

______________________________________________________________________

## 时间范围规范

访问数据需要指定时间范围。
可以在 UI 中指定，作为 REST API 参数，或在 DQL 查询中使用一对参数显式指定：`from:` 和 `to:`（如果省略一个则默认为 `now()`），或使用单个 `timeframe:` 参数。
时间范围可以用绝对值或相对于当前时间的相对表达式表示。时间对齐运算符（`@`）可用于将时间戳舍入到时间单位边界 —— 完整详情参见 [references/operators.md](references/operators.md)。

### 示例

```dql-snippet
from:now()-1h@h, to:now()@h     // last complete hour
```
```dql-snippet
from:now()-1d@d, to:now()@d     // yesterday complete
```
```dql-snippet
from:now()@M                    // this month so far, till now
```
```dql-snippet
from:now()-2h@h                 // go back 2 hours, then align to hour boundary
```

完整的 `@` 对齐单位表（包括 `m` vs. `M`、星期变体 `w1`–`w7`，以及像 `@3h` 这样的因子规则）参见 [references/operators.md](references/operators.md)。

### 绝对时间戳

使用 ISO 8601 格式：

```dql-snippet
from:"2024-01-15T08:00:00Z", to:"2024-01-15T09:00:00Z"
```

______________________________________________________________________

## 修改时间

### 关键概念

- DQL 有 3 个与时间相关的专用类型：
    - **timestamp** —— 内部保持为自纪元起的纳秒数，但以特定时区作为日期/时间暴露
    - **timeframe** —— 一对 2 个时间戳（开始和结束）
    - **duration** —— 内部保持为纳秒数，但以缩放到合理因子（例如 ms、分钟、天）的持续时间暴露

### 规则

- 时间戳相减产生持续时间：`timestamp - timestamp → duration`
- 持续时间除以持续时间产生 double：例如 `2h / 1m` = `120.0`
- 标量乘以持续时间产生持续时间：例如 `no_of_h * 1h → duration`
- 提取时间元素（小时、月中的天等）：
    - ✅ 使用[时间函数](references/dql/dql-functions-time.md)。它们正确支持日历和时区，包括 DST。
    - ❌ 避免使用 `formatTimestamp` 提取时间组件。
    - ❌ 避免将时间戳和持续时间转换为 double/long 并使用除法、取模和以纳秒表示时间单位的常量。

## 参考

- **[references/useful-expressions.md](references/useful-expressions.md)** —— DQL 中的有用表达式
- **[references/semantic-dictionary.md](references/semantic-dictionary.md)** —— Dynatrace 语义字典：字段命名空间、数据模型、稳定性级别、查询模式和最佳实践
- **[references/summarization.md](references/summarization.md)** —— summarize 和 makeTimeseries 命令的各种应用
- **[references/iterative-expressions.md](references/iterative-expressions.md)** —— 使用 DQL 进行数组和时间序列操作（创建、修改、在过滤器中使用）
- **[references/smartscape-topology-navigation.md](references/smartscape-topology-navigation.md)** —— Smartscape 拓扑导航语法和模式
- **[references/optimization.md](references/optimization.md)** —— DQL 查询优化：使查询运行更快、更高效、更便宜（每次执行更低的消耗/扫描数据）—— 过滤器放置、桶过滤器、时间范围、字段选择、采样、基数和性能最佳实践
- **[references/operators.md](references/operators.md)** —— `in` 运算符（子查询语法）和完整的 `@` 时间对齐单位参考
- **[references/discovery.md](references/discovery.md)** —— 发现数据
