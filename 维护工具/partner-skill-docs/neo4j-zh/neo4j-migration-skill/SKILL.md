---
name: neo4j-migration-skill
description: 将 Neo4j driver 代码和 Cypher 查询从旧版本（4.x、5.x）迁移到当前版本（2025.x/2026.x，Cypher 25）。涵盖 Python、JavaScript/Node.js、Java、.NET 和 Go driver —— 包重命名、移除的 API、版本要求、可直接 diff 的修复。也处理 Cypher 语法迁移 —— QPE 路径、CALL 子查询、id() → elementId()、PERIODIC COMMIT → CALL IN TRANSACTIONS，以及 Cypher 25 的所有移除项。不编写新的 Cypher 查询 —— 请使用 neo4j-cypher-skill。不涵盖 DB 管理或服务器运维 —— 请使用 neo4j-cli-tools-skill。不开通新的 Neo4j 实例 —— 请使用 neo4j-getting-started-skill。
allowed-tools: WebFetch Bash
version: 1.0.13
---

## 何时使用
- 将 driver 依赖从 4.x 或 5.x 升级到 6.x
- 将 Cypher 查询迁移到 Cypher 25 语法
- 在 driver 或 Neo4j 版本升级后修复弃用 API 警告
- 升级前审计代码库中已移除/已弃用的 Neo4j API

## 何时不使用
- **编写新的 Cypher 查询** → `neo4j-cypher-skill`
- **DB 管理**（备份、恢复、导入、cypher-shell）→ `neo4j-cli-tools-skill`
- **从零开始** → `neo4j-getting-started-skill`
- **GDS 算法迁移** —— 此处不涵盖；请查阅 GDS 发行说明

---

## 准入条件

开始之前，先询问：
1. **目标 Neo4j 版本** —— 用于选择 Cypher 方言和 driver 版本
2. **使用的语言** —— 扫描 `package.json`、`requirements.txt`、`pom.xml`、`*.csproj`、`go.mod`
3. **当前 driver 版本** —— 从依赖文件中读取；不要猜测

如果目标 >= 2025.06：询问将使用 Cypher 5 还是 Cypher 25 方言（两者都支持；Cypher 25 是新的默认）。

---

## 第 1 步 —— 扫描代码库

```bash
# Find Cypher strings (queries embedded in source)
grep -rn "MATCH\|MERGE\|CREATE\|CALL\|RETURN" --include="*.py" --include="*.js" \
  --include="*.ts" --include="*.java" --include="*.cs" --include="*.go" \
  --include="*.cypher" --include="*.cql" . | grep -v ".git"

# Find dependency files
find . -name "requirements*.txt" -o -name "package.json" -o -name "pom.xml" \
  -o -name "*.csproj" -o -name "go.mod" | grep -v ".git" | grep -v node_modules
```

在修改任何内容之前先收集发现。列出找到的所有弃用模式。

---

## 第 2 步 —— Cypher 迁移（4.x / 5.x → Cypher 25）

应用于每一个 Cypher 字符串、`.cypher` 文件、OGM/SDN `@Query` 注解以及模板字面量。

### 完整替换表

| 旧语法 | Cypher 25 替换 | 说明 |
|---|---|---|
| `[:REL*1..5]` | `(()-[:REL]->()){1,5}` | QPE 量词组 |
| `[:REL*]` | `(()-[:REL]->()){1,}` | 无界 QPE |
| `[:REL*0..5]` | `(()-[:REL]->()){0,5}` | 允许零跳 |
| `shortestPath((a)-[*]->(b))` | `SHORTEST 1 (a)(()-[]->()){1,}(b)` | QPE 最短路径 |
| `allShortestPaths((a)-[*]->(b))` | `ALL SHORTEST (a)(()-[]->()){1,}(b)` | QPE 全最短 |
| `id(n)` | `elementId(n)` | 返回字符串，而非 int |
| `CALL { WITH x ... }` | `CALL (x) { ... }` | 显式导入语法 |
| `PERIODIC COMMIT` | `CALL (...) { ... } IN TRANSACTIONS OF 1000 ROWS` | 批量写入 |
| `-- comment` | `// comment` | SQL 注释无效 |
| `SET n = r`（结构化值） | `SET n = properties(r)` | 先提取 map |
| `MERGE (a {x:1})-[:T]->(b {x:a.x})` | 重写 —— 不允许跨实体 MERGE 引用 | 拆分为 MATCH+MERGE |
| `CREATE INDEX ... OPTIONS { indexProvider: ... }` | 从 OPTIONS 中移除 `indexProvider` | provider 选择已移除 |
| `db.create.setVectorProperty(...)` | 使用原生 VECTOR 属性类型 | 过程已移除 |
| `dbms.upgrade()` / `dbms.upgradeStatus()` | 使用 `cypher-shell :sysinfo` | 过程已移除 |
| `USE composite.'1'` | `` USE `composite.1` `` | 对整个限定名使用反引号 |
| `RETURN 1 as my$Identifier` | `` RETURN 1 as `my$Identifier` `` | 未转义标识符中的 `$` 已移除 |

### Vector / 全文索引查询（按版本分支）

| 版本 | 语法 |
|---|---|
| Neo4j < 2026.01 | `CALL db.index.vector.queryNodes(idx, k, $emb) YIELD node, score` |
| Neo4j >= 2026.01 | `SEARCH n IN (VECTOR INDEX idx FOR $emb LIMIT k) SCORE AS score` |
| Neo4j < 2026.09 | `CALL db.index.fulltext.queryNodes(idx, $q) YIELD node, score` |
| Neo4j >= 2026.09 | `SEARCH n IN (FULLTEXT INDEX idx FOR $q LIMIT k) SCORE AS score` —— 过程于 2026.10 弃用 |

### Cypher 方言前缀规则

- 目标 >= 2025.06，方言 = Cypher 25：在每个顶层查询前加上 `CYPHER 25`
- 目标 >= 2025.06，方言 = Cypher 5：加上 `CYPHER 5`（使弃用形式继续可用）
- 目标 4.x 或 5.x：无需前缀；按 [references/cypher-queries.md](references/cypher-queries.md) 获取变更日志

### `id(n)` → `elementId(n)` 注意事项

`elementId()` 返回字符串（例如 `"4:abc123:0"`），而非整数。修复将其作为 `int` 存储或比较的下游代码。不要将 `elementId()` 的值用于数值运算。

```diff
- WHERE id(n) = $nodeId   # $nodeId was integer
+ WHERE elementId(n) = $nodeId  # $nodeId must now be string
```

---

## 第 3 步 —— Driver 迁移

选择与第 1 步中发现的语言相匹配的小节。

---

### Python Driver（5.x → 6.x）

**最低要求**：Python >= 3.10，`neo4j` 包（6.0+，2026 年 1 月 12 日发布）

#### 包重命名 —— 先做这个

```diff
# requirements.txt
- neo4j-driver>=5.0.0
+ neo4j>=6.0.0
```

`neo4j-driver` 包自 6.0 起弃用，不再接收后续更新。

#### 已移除的 API

| 旧 | 新 | 说明 |
|---|---|---|
| `session.read_transaction(fn)` | `session.execute_read(fn)` | |
| `session.write_transaction(fn)` | `session.execute_write(fn)` | |
| `session.last_bookmark()` | `session.last_bookmarks()` | 返回 `Bookmarks`（复数） |
| `Bookmark` 类 | `Bookmarks` 类 | |
| `TRUST_ALL_CERTIFICATES` | `trusted_certificates=TrustAll()` | |
| `TRUST_SYSTEM_CA_SIGNED_CERTIFICATES` | `trusted_certificates=TrustSystemCAs()` | |
| `neo4j.conf`、`neo4j.data` 模块 | 已移除 —— 使用顶层 `neo4j.*` | |

#### 资源管理变更

Driver 和 session 不再在 GC 时自动关闭。添加显式清理：

```diff
- driver = GraphDatabase.driver(URI, auth=(USER, PASS))
- # used without explicit close
+ with GraphDatabase.driver(URI, auth=(USER, PASS)) as driver:
+     with driver.session(database="neo4j") as session:
+         ...
```

或显式调用 `.close()`。重复调用 `.close()` 是无操作。

#### 错误处理变更

| 旧异常 | 新异常 | 触发条件 |
|---|---|---|
| `ClientError`（针对超时） | `ConnectionAcquisitionTimeoutError` | 获取超时 |
| `AuthError`（配置无效） | `ConfigurationError` | 认证参数无效 |
| 针对 `Query` 对象抛出的 `ValueError` | `TypeError` | 将 `Query` 传给 `Transaction.run` |

#### 保持不变的关键 API

`execute_query()`、`GraphDatabase.driver()`、`neo4j+s://` URI、`auth=(user, pw)`、session `run()`。

完整变更日志：[references/python-driver.md](references/python-driver.md)

---

### JavaScript / Node.js Driver（5.x → 6.x）

**最低要求**：Node.js >= 18（查看 driver 的 `package.json` 中的 `engines`）；包 `neo4j-driver`

#### 已移除的 API

| 旧 | 新 | 说明 |
|---|---|---|
| `session.readTransaction(fn)` | `session.executeRead(fn)` | |
| `session.writeTransaction(fn)` | `session.executeWrite(fn)` | |
| `session.lastBookmark()` | `session.lastBookmarks()` | 返回数组 |
| `resultSummary.updateStatistics` | `resultSummary.counters` | |
| `driver.verifyConnectivity()` → `ServerInfo` | `driver.getServerInfo()` → `ServerInfo` | `verifyConnectivity()` 现在返回 `void` |

#### 6.0 中弃用（将在 7.0 移除）

| 旧 | 新 |
|---|---|
| `isRetriableError(err)` | `isRetryable(err)` |
| `neo4jError.retriable` | `neo4jError.retryable` |
| `notificationCategory` | `notificationClassification` |

#### 整数处理

Neo4j 整数映射为 `neo4j.Integer`（64 位）。使用 `.toNumber()` 或 `.toInt()` 进行算术运算。大值（> 2^53）会丢失精度 —— 用 `.toString()` 以字符串存储。

```javascript
// Safe pattern
const count = record.get('count').toNumber()
```

完整变更日志：[references/javascript-driver.md](references/javascript-driver.md)

---

### Java Driver（5.x → 6.x）

**最低要求**：Java 21；Maven `org.neo4j.driver:neo4j-java-driver:6.x`

#### Maven 坐标

```diff
<dependency>
  <groupId>org.neo4j.driver</groupId>
  <artifactId>neo4j-java-driver</artifactId>
- <version>5.x.x</version>
+ <version>6.0.0</version>
</dependency>
```

#### 已移除的 API

| 移除项 | 替代项 | 说明 |
|---|---|---|
| `RxSession` / `RxTransaction` | 使用异步 `AsyncSession` 或同步 `Session` | 响应式 API 已移除 |
| `Bookmark` 多值构造函数 | `Bookmark.from(iterable)` | |
| `session.readTransaction(fn)` | `session.executeRead(fn)` | |
| `session.writeTransaction(fn)` | `session.executeWrite(fn)` | |
| `TrustStrategy.certFile()` | `TrustStrategy.trustCustomCertificateSignedBy(path)` | |
| `Notification.severity()` | `Notification.severityLevel()` | 返回带类型的枚举 |

#### 依赖说明（BOM）

自 6.0.1 起，`neo4j-java-driver-bom` 不再导入 `netty-bom`。如果使用 Netty 原生传输，请显式添加 `netty-bom` 导入。

#### 日志

旧版 `Logging` API 已弃用 → 改为配置 `System.Logger`。

完整变更日志：[references/java-driver.md](references/java-driver.md)

---

### .NET Driver（5.x → 6.x）

**最低要求**：.NET 8、9 或 10（.NET Standard 2.1 已弃用）；NuGet `Neo4j.Driver 6.x`

#### NuGet 包

```diff
- <PackageReference Include="Neo4j.Driver" Version="5.*" />
+ <PackageReference Include="Neo4j.Driver" Version="6.*" />
```

`Neo4j.Driver.Signed` 不再接收更新 —— 改用 `Neo4j.Driver`（现已签名）。

#### 已移除的 API

| 移除项 | 替代项 | 说明 |
|---|---|---|
| `ILogger` | `INeo4jLogger` | 接口已重命名 |
| `ConfigBuilder.WithIpv6Enabled()` | 移除调用 —— IPv6 始终启用 | |
| `Config.Ipv6Enabled` 属性 | 移除 —— 始终为 true | |
| Simple driver | 使用标准 `IDriver` | 已完全移除 |

完整变更日志：[references/dotnet-driver.md](references/dotnet-driver.md)

---

### Go Driver（5.x → 6.x）

**最低要求**：Go 1.24；模块 `github.com/neo4j/neo4j-go-driver/v6`

#### go.mod 更新

```diff
- require github.com/neo4j/neo4j-go-driver/v5 v5.x.x
+ require github.com/neo4j/neo4j-go-driver/v6 v6.x.x
```

将所有 import 从 `/v5/` 更新为 `/v6/`。

#### 已移除的 API 与替代项

| 旧 | 新 | 说明 |
|---|---|---|
| `neo4j.NewDriver(...)` | `neo4j.NewDriverWithContext(...)` | 上下文感知；或直接使用 `neo4j.NewDriver`（现在带上下文） |
| `neo4j.Config` 结构体 | `config.Config` | 导入 `github.com/neo4j/neo4j-go-driver/v6/neo4j/config` |
| `neo4j.ServerAddressResolver` | `config.ServerAddressResolver` | |
| `neo4j.LogLevel` / `neo4j.ERROR` 等 | `log.Level` / `log.ERROR` | 导入 `neo4j/log` 子包 |
| `log.Console` | `log.ToConsole` | |
| `log.Void` | `log.ToVoid` | |
| `neo4j.Single[T]` | `neo4j.SingleT[T]`（仍存在；优先使用上下文变体） | |
| `neo4j.Driver` 接口 | `neo4j.DriverWithContext` | `*WithContext` 变体现在是主要形式 |
| `neo4j.Session` 接口 | `neo4j.SessionWithContext` | |
| `Config.RootCAs` 字段 | `Config.TlsConfig` | 直接传入 `*tls.Config` |
| 通知常量（旧包） | `notifications.*` 对应项 | 导入 `neo4j/notifications` |

#### 上下文 API 整合

在 v6 中，`neo4j.NewDriverWithContext` 是规范构造函数。旧的 `*WithContext` 方法名已弃用（计划在 v7 移除）—— 基础名称现在默认包含上下文。

```diff
- driver, err := neo4j.NewDriver(uri, neo4j.BasicAuth(user, pass, ""))
+ driver, err := neo4j.NewDriverWithContext(uri, neo4j.BasicAuth(user, pass, ""))
```

完整迁移指南：[references/go-driver.md](references/go-driver.md)

---

## 第 4 步 —— 版本兼容性矩阵

| Neo4j 版本 | Cypher 方言 | Driver 6.x 兼容 | 说明 |
|---|---|---|---|
| 4.4 LTS | Cypher 4 | 是（bolt 兼容） | 支持于 2025 年 11 月结束 |
| 5.26 LTS | Cypher 5 | 是 | 支持至 2028 年 11 月 |
| 2025.01–2025.05 | Cypher 5 | 是 | CalVer 时代开始 |
| 2025.06+ | Cypher 5 或 25 | 是 | Cypher 25 成为新默认 |
| 2026.01+ | Cypher 25 | 是 | 可使用 `SEARCH` 子句 |
| 2026.07.0 | Cypher 25 | 是 | **跳过此补丁** —— 块格式 UTF-8 回归会导致 `trim()` 使查询失败并损坏已存储字符串；升级目标为 2026.07.1 |
| 2026.08+ | Cypher 25 | 是 | 新增 `UUID` 类型 + 字符串插值；`UUID` 属性要求 driver >= 6.2（Python >= 6.3）—— 旧 driver 返回占位符 `MAP` 并警告 `03N95`；2026.08 捆绑 Java driver 6.2.1；**跳过 2026.08.0**（查询失败缺陷）—— 目标 2026.08.1+ |
| 2026.09+ | Cypher 25 | 是 | `SEARCH` 子句接受 `FULLTEXT INDEX`；页面缓存启动时预留完整的 `server.memory.pagecache.size` |
| 2026.10+ | Cypher 25 | 是 | `db.index.fulltext.queryNodes` / `queryRelationships` 弃用 → `SEARCH ... FULLTEXT INDEX`；map 相加 `map1 + map2`；旧版 Browser 于 2026.11.0 从发行版中移除（仅新版 Browser） |
| 2026 LTS 之后的自托管 | Cypher 25 | 是 | 默认本机用户密码最小长度 8 → 16 字符（固定 `dbms.security.auth_minimum_password_length` 可保留旧值）；新安装默认查询日志格式 PLAIN → JSON（保留现有的 `server-logs.xml`）—— 更新日志解析器 |
| Aura 2026.12 LTS 之后 | Cypher 25 | 是 | `dbms.components()` 从固定的 `5.27` 切换为日历版本（例如 `2027.01`）—— 修复解析 `5.x` 字符串的代码（包括 Kafka/Spark/GraphQL 集成） |
| Aura 2027.01 | Cypher 25 | 是 | 创建/修改时本机用户密码最小长度 8 → 16 字符 |

存储格式：4.4 到 2026.x 之间无变化。对于新的企业版数据库，自 5.22 起默认使用 `block` 格式。`high_limit` 和 `standard` 在 5.23 弃用，在 2026 LTS 之后移除 —— 该 LTS 之后 Neo4j 拒绝在 `high_limit` 存储上启动；请在 LTS 当天或之前运行离线 `neo4j-admin database migrate --to-format=block <db>`。

服务器 JVM：2026.x 运行于 Java SE 21 或 25；Java 21 支持随 2026 LTS 结束 —— 将服务器迁移到 Java 25 [2026.08 弃用]。

**不支持降级** —— 任何服务器升级前请先备份。

---

## 第 5 步 —— 迁移后测试

```bash
# Python: run with dev mode to surface all deprecation warnings
python -W error::DeprecationWarning -m pytest tests/

# JS: run tests
npm test

# Java
mvn test

# .NET
dotnet test

# Go
go test ./...
```

测试运行后：如果出现任何 `DeprecationWarning` 或弃用 API 日志，按 ERROR 处理 —— 继续之前先修复。

对于 Cypher：先让每个迁移后的查询通过 `EXPLAIN` 运行：

```bash
# Via Query API v2
curl -X POST https://<host>/db/<database>/query/v2 \
  -u <user>:<password> -H "Content-Type: application/json" \
  -d '{"statement": "EXPLAIN <your query>"}'
```

---

## 常见迁移错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `id(n)` 返回字符串，int 比较失败 | `elementId()` 返回字符串 | 将存储的 ID 更新为字符串；修复 WHERE 子句 |
| `Cannot merge node using null property value` | MERGE 键解析为 null | MERGE 前校验参数 |
| `Neo4j.Driver.Exceptions.AuthenticationException` | .NET 重命名后凭据配置错误 | 更新 `INeo4jLogger` 用法；验证配置 |
| `TypeError: neo4j-driver is deprecated` | 安装了旧包 | 在 requirements 中替换为 `neo4j>=6.0.0` |
| `AttributeError: 'Session' has no 'read_transaction'` | Python 5→6，方法已移除 | 替换为 `execute_read()` |
| `RxSession not found` | Java 6.x，响应式 API 已移除 | 迁移到异步或同步 session |
| `undefined is not a function (.readTransaction)` | JS 6.x，方法已移除 | 替换为 `executeRead()` |
| Go：`undefined: neo4j.Config` | 仍存在 v5 导入路径 | 将所有 import 更新为 `/v6/` |
| `PERIODIC COMMIT not supported` | Cypher 25，子句已移除 | 使用 `CALL (...) IN TRANSACTIONS` |
| `Unknown function id()` | id() 在 Cypher 25 中移除 | 替换为 `elementId()` |

---

## 参考资料

按需加载 —— 发现率高，因为它们被显式链接：
- [references/cypher-queries.md](references/cypher-queries.md) —— 按版本分支的 Cypher 变更日志选择（4.x、5.x、2025.x）
- [references/python-driver.md](references/python-driver.md) —— Python 变更日志 URL、完整版本历史
- [references/javascript-driver.md](references/javascript-driver.md) —— 按版本的 JS 变更日志 URL
- [references/java-driver.md](references/java-driver.md) —— 按版本的 Java 变更日志 URL
- [references/dotnet-driver.md](references/dotnet-driver.md) —— 按版本的 .NET 变更日志 URL
- [references/go-driver.md](references/go-driver.md) —— 含 5.0 和 6.0 章节的 Go 迁移指南

对于上述未涵盖的任何语法，请获取：
`https://neo4j.com/docs/cypher-manual/25/deprecations-additions-removals-compatibility/`

---

## 检查清单

- [ ] 已确认目标 Neo4j 版本；已选择 Cypher 方言（Cypher 5 或 25）
- [ ] 已扫描依赖文件；已识别所有 driver 版本
- [ ] 已将 Cypher 替换表应用到代码库中的每个查询
- [ ] 已修复 `id(n)` → `elementId(n)` 及下游的 int→string 转换
- [ ] 所有批量写入中 `PERIODIC COMMIT` → `CALL IN TRANSACTIONS`
- [ ] 所有子查询中 `CALL { WITH x ... }` → `CALL (x) { ... }`
- [ ] 已完成包重命名（Python：`neo4j-driver` → `neo4j`）
- [ ] 已替换弃用的 session 方法（`read_transaction`/`readTransaction` → `execute_read`/`executeRead`）
- [ ] 已在缺失处添加资源清理（Python：上下文管理器或 `.close()`）
- [ ] 已更新 Bookmark API（`last_bookmark` → `last_bookmarks`，`Bookmark` → `Bookmarks`）
- [ ] 已将 Go import 从 `/v5/` 更新为 `/v6/`；`neo4j.Config` → `config.Config`
- [ ] Java：已确认 Java 21；已移除 RxSession 用法
- [ ] .NET：`ILogger` → `INeo4jLogger`；`Neo4j.Driver.Signed` → `Neo4j.Driver`
- [ ] 测试通过且无 DeprecationWarnings
- [ ] 已对所有迁移后的 Cypher 查询运行 `EXPLAIN`；无错误
