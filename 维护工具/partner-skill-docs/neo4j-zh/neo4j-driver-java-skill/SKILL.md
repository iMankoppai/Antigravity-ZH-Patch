---
name: neo4j-driver-java-skill
description: Neo4j Java Driver v6 —— 驱动生命周期、Maven/Gradle 配置、executableQuery、
  executeRead/Write 托管事务、显式事务、异步/响应式模式、
  错误处理、数据类型映射、连接池调优、因果一致性/书签。
  适用于编写通过 GraphDatabase.driver、executableQuery、SessionConfig、executeRead、
  executeWrite 或 TransactionCallback 连接 Neo4j 的 Java 或 Kotlin 代码。
  不处理 Cypher 编写 —— 请使用 neo4j-cypher-skill。
  不涵盖驱动版本升级 —— 请使用 neo4j-migration-skill。
  不涵盖 Spring Data Neo4j（@Node、Neo4jRepository）—— 请使用 neo4j-spring-data-skill。
version: 1.0.12
allowed-tools: Bash WebFetch
---

## 何时使用
- 连接 Neo4j（Aura 或自托管）的 Java/Kotlin 代码
- 在 Maven/Gradle 项目中设置驱动、会话、事务
- 调试结果处理、错误恢复、连接池问题
- 异步（`CompletableFuture`）或响应式（Project Reactor / RxJava）Neo4j 访问

## 何时不使用
- **Cypher 查询编写/优化** → `neo4j-cypher-skill`
- **驱动版本升级** → `neo4j-migration-skill`
- **Spring Data Neo4j**（`@Node`、`@Relationship`、`Neo4jRepository`）→ `neo4j-spring-data-skill`

---

## 依赖

### Maven
```xml
<dependency>
    <groupId>org.neo4j.driver</groupId>
    <artifactId>neo4j-java-driver</artifactId>
    <version>6.3.0</version>
</dependency>
```

### Gradle
```groovy
implementation 'org.neo4j.driver:neo4j-java-driver:6.3.0'
```

查看最新版本：https://central.sonatype.com/artifact/org.neo4j.driver/neo4j-java-driver

6.2.0 [2026-06]：Neo4j `UUID` 类型 + Bolt 6.1 支持；结果摘要中的 `QueryProfile`。
6.2.1 [2026-08]：修复 `Value#asObject()` 处理 `UUID` 值的问题 —— 若要通用地读取 UUID 属性则必需。Neo4j 2026.08 服务器内置 6.2.1；2026.07 内置 6.2.0。
6.3.0 [2026-09]：属性加密预览 —— 属性值的客户端信封加密（`driver.propertyEncryption()`）→ [references/property-encryption.md](references/property-encryption.md)。

服务端 `UUID` 类型和 `uuid()` 构造函数随 Neo4j 2026.08 发布 —— 针对这些服务器请使用 driver >= 6.2.1。

---

## 环境变量

连接配置的标准模式 —— 切勿硬编码凭据：

```java
String uri      = System.getenv().getOrDefault("NEO4J_URI",      "neo4j://localhost:7687");
String user     = System.getenv().getOrDefault("NEO4J_USERNAME",  "neo4j");
String password = System.getenv().getOrDefault("NEO4J_PASSWORD",  "");
String database = System.getenv().getOrDefault("NEO4J_DATABASE",  "neo4j");
```

Spring Boot：通过 `@Value("${spring.neo4j.uri}")` 或 `application.properties` 注入：
```properties
spring.neo4j.uri=neo4j+s://xxx.databases.neo4j.io
spring.neo4j.authentication.username=neo4j
spring.neo4j.authentication.password=secret
```

---

## 驱动生命周期

每个应用一个 `Driver` —— 线程安全、创建开销大。实现 `AutoCloseable` 或使用 try-with-resources。

```java
// Long-lived singleton
var driver = GraphDatabase.driver(
    "neo4j+s://xxx.databases.neo4j.io",          // Aura TLS+routing
    AuthTokens.basic(user, password));
driver.verifyConnectivity();                      // fail fast

// Short-lived (tests / CLI)
try (var driver = GraphDatabase.driver(uri, AuthTokens.basic(user, password))) {
    driver.verifyConnectivity();
    // ...
}
```

URI 方案：

| URI | 用途 |
|---|---|
| `neo4j://localhost` | 未加密，集群路由 |
| `neo4j+s://xxx.databases.neo4j.io` | TLS + 集群路由（Aura） |
| `bolt://localhost:7687` | 未加密，单实例 |
| `bolt+s://localhost:7687` | TLS，单实例 |

认证选项：`AuthTokens.basic(u,p)` · `AuthTokens.bearer(token)` · `AuthTokens.kerberos(b64)` · `AuthTokens.none()`

---

## 选择合适的 API

| API | 何时使用 | 自动重试 | 流式 |
|---|---|:---:|:---:|
| `driver.executableQuery()` | 大多数查询的默认选择 | ✅ | ❌ 立即（eager） |
| `session.executeRead/Write()` | 大结果集、回调控制 | ✅ | ✅ |
| `session.beginTransaction()` | 跨多个方法、外部协调 | ❌ | ✅ |
| `session.run()` | 自管理查询（`CALL IN TRANSACTIONS`） | ⚠️ 一次性 [6.1+] | ✅ |
| `driver.asyncSession()` | 非阻塞 `CompletableFuture` | ✅ | ✅ |
| `driver.rxSession()` | Reactor/RxJava 背压 | ✅ | ✅ |

`CALL { … } IN TRANSACTIONS` 和 `USING PERIODIC COMMIT` 自行管理事务 —— 只能使用 `session.run()`。`executableQuery` 和 `executeRead/Write` 对这些查询会失败。

`session.run()` 重试 [6.1+]：仅对幂等错误做一次立即重试（默认启用）。可按驱动或按会话禁用：

```java
// Driver-level — disable for all sessions
var config = Config.builder().withAutoCommitRetriesDisabled(true).build();

// Session-level — overrides driver
var sessionConfig = SessionConfig.builder()
    .withAutoCommitRetriesMode(AutoCommitRetriesMode.DISABLED)  // DEFAULT = follow driver
    .build();
```

---

## `executableQuery` —— 默认

```java
// Read — route to replicas
var result = driver.executableQuery("""
        MATCH (p:Person {name: $name})-[:KNOWS]->(friend)
        RETURN friend.name AS name
        """)
    .withParameters(Map.of("name", "Alice"))
    .withConfig(QueryConfig.builder()
        .withDatabase("neo4j")            // always specify — avoids home-db round-trip
        .withRouting(RoutingControl.READ)
        .build())
    .execute();

result.records().forEach(r -> System.out.println(r.get("name").asString()));
long ms = result.summary().resultAvailableAfter(TimeUnit.MILLISECONDS);

// Write
driver.executableQuery("CREATE (p:Person {name: $name, age: $age})")
    .withParameters(Map.of("name", "Bob", "age", 30))
    .withConfig(QueryConfig.builder().withDatabase("neo4j").build())
    .execute();
```

切勿对 Cypher 做字符串插值。始终使用 `.withParameters(Map.of(...))`。

---

## 托管事务（`executeRead` / `executeWrite`）

会话**不是**线程安全的 —— 每个请求/线程一个，始终关闭。

```java
try (var session = driver.session(SessionConfig.builder()
        .withDatabase("neo4j").build())) {

    // Read → replica routing
    var names = session.executeRead(tx -> {
        var result = tx.run(
            "MATCH (p:Person) WHERE p.name STARTS WITH $prefix RETURN p.name AS name",
            Map.of("prefix", "Al"));
        return result.stream().map(r -> r.get("name").asString()).toList(); // collect INSIDE
    });

    // Write → leader routing
    session.executeWriteWithoutResult(tx ->
        tx.run("CREATE (p:Person {name: $name})", Map.of("name", "Carol"))
    );
}
```

### 结果必须在回调**内部**消费

`Result` 是绑定到打开事务的惰性游标。回调返回时事务关闭 —— 之后的任何读取都会抛出 `ResultConsumedException`。

```java
// ❌ Returns Result — already closed by the time caller uses it
var result = session.executeRead(tx ->
    tx.run("MATCH (p:Person) RETURN p.name AS name"));
result.stream().forEach(...); // throws ResultConsumedException

// ✅ Collect to List inside callback
var names = session.executeRead(tx ->
    tx.run("MATCH (p:Person) RETURN p.name AS name")
      .stream().map(r -> r.get("name").asString()).toList());
```

### 回调规则

- 在下一次 `tx.run()` 之前消费每个 `Result` —— 多个打开的游标 = 未定义行为。
- 不要有副作用（HTTP、邮件、指标自增）—— 回调在瞬时错误时可能被重试。
- 重试安全的写入使用 `MERGE`（幂等），而非 `CREATE`。
- `executeRead` → 副本；`executeWrite` → leader。

### TransactionConfig —— 超时与元数据

```java
var config = TransactionConfig.builder()
    .withTimeout(Duration.ofSeconds(5))
    .withMetadata(Map.of("app", "myService", "user", userId))  // visible in SHOW TRANSACTIONS
    .build();
session.executeRead(tx -> { /* ... */ }, config);
```

---

## 显式事务

当工作跨多个方法或需要外部协调时使用。不会自动重试。

```java
try (var session = driver.session(SessionConfig.builder().withDatabase("neo4j").build())) {
    var tx = session.beginTransaction();
    try {
        doPartA(tx);
        doPartB(tx);
        tx.commit();
    } catch (Exception e) {
        try { tx.rollback(); } catch (Exception rb) { e.addSuppressed(rb); }
        throw e;
    }
}
```

`tx.rollback()` 是一次网络调用 —— 包在它自己的 try/catch 中，并使用 `addSuppressed`，以免丢失原始异常。

**提交不确定性**：若 `tx.commit()` 抛出 `ServiceUnavailableException`，提交可能成功也可能未成功。将写入设计为幂等（`MERGE` + 唯一约束），以便重试安全。

选择显式还是托管事务：
- 需要自动重试 → `executeRead` / `executeWrite`
- 工作跨多个方法 → 显式（将 `tx` 作为参数传递）
- 与外部 I/O 协调 → 显式（仅在 I/O 成功后提交）

---

## 错误处理

```java
try {
    driver.executableQuery("...").execute();
} catch (ServiceUnavailableException e) {
    // No servers — check connection
} catch (SessionExpiredException e) {
    // Server closed session — open new one
} catch (TransientException e) {
    // Managed txns retry automatically; explicit txns need manual retry
} catch (Neo4jException e) {
    // Cypher/constraint error — e.code() gives GQL status code
}
```

托管事务会自动重试 `TransientException` —— 无需捕获。

---

## 数据类型与取值

| Cypher 类型 | Java 访问器 |
|---|---|
| `Integer` | `value.asLong()` / `value.asInt()` |
| `Float` | `value.asDouble()` |
| `String` | `value.asString()` |
| `Boolean` | `value.asBoolean()` |
| `List` | `value.asList()` |
| `Map` | `value.asMap()` |
| `Node` | `value.asNode()` |
| `Relationship` | `value.asRelationship()` |
| `Date` | `value.asLocalDate()` |
| `DateTime` | `value.asZonedDateTime()` |
| `UUID` | `value.asUUID()` → `java.util.UUID` [6.2+, Neo4j 2026.08+] |

```java
var record = result.records().get(0);
String name = record.get("name").asString();
long age    = record.get("age").asLong();

var node = record.get("p").asNode();
String label = node.labels().iterator().next();
Map<String,Object> props = node.asMap();
```

### 空值安全 —— 两种不同情况

| 情形 | `record.get(key)` | `.asString()` |
|---|---|---|
| 键存在，值非 null | 该值 | 返回 string |
| 键存在，值为图 null | `.isNull()` = true 的 `Value` | **抛出** `Uncoercible` |
| 键不存在（拼写错误 / 未投影） | `Value.NULL` 哨兵值 | **抛出** `NoSuchElementException` |

```java
// Graph null — use default overload (safe only if key is always projected):
String city = record.get("city").asString("Unknown");

// Absent key — check containsKey first:
if (record.containsKey("city") && !record.get("city").isNull()) {
    String city = record.get("city").asString();
}
```

---

## 对象映射

直接将查询结果映射到 Java record/类 —— 免去手工访问器调用。

```java
// Domain record — field names match RETURN aliases (case-sensitive)
public record Person(String name, long age) {}

// Map single record
var person = driver.executableQuery("MATCH (p:Person {name: $name}) RETURN p.name AS name, p.age AS age")
    .withParameters(Map.of("name", "Alice"))
    .withConfig(QueryConfig.builder().withDatabase("neo4j").build())
    .execute()
    .records()
    .stream()
    .map(r -> r.get("name").asString())   // or: r.as(Person.class) — see note
    .findFirst()
    .orElseThrow();

// Using .as(Person.class) — maps RETURN keys to record fields by name
var person2 = driver.executableQuery("""
        MATCH (p:Person {name: $name})
        RETURN p.name AS name, p.age AS age
        """)
    .withParameters(Map.of("name", "Tom Hanks"))
    .withConfig(QueryConfig.builder().withDatabase("neo4j").build())
    .execute()
    .records()
    .stream()
    .map(record -> record.get("p").as(Person.class))
    .findFirst()
    .orElseThrow(() -> new RuntimeException("Person not found"));
```

嵌套映射 —— 返回 map 投影，并为列表包含 `COLLECT {}`：

```java
public record Movie(String title, List<Person> actors) {}

var movieCypher = """
    MATCH (movie:Movie)
    LIMIT 1
    RETURN movie {
        .title,
        actors: COLLECT {
            MATCH (actor:Person)-[:ACTED_IN]->(movie)
            RETURN actor
        }
    }
    """;

var movie = driver.executableQuery(movieCypher)
    .withConfig(QueryConfig.builder().withDatabase("neo4j").build())
    .execute()
    .records()
    .stream()
    .map(r -> r.get("movie").as(Movie.class))
    .findFirst()
    .orElseThrow();
```

只会填充 record 中定义的已映射属性 —— Cypher 返回的多余属性会被忽略。

---

## 性能模式

**始终指定数据库** —— 省略会在每次调用时触发主数据库往返。

**将读取路由到副本** —— 在 `QueryConfig` 中使用 `RoutingControl.READ`，或使用 `executeRead`。

**用 `UNWIND` 批量写入** —— 传入 `List<Map<String,Object>>`（仅纯 map；自定义对象会失败）：

```java
List<Map<String, Object>> rows = people.stream()
    .map(p -> Map.<String, Object>of("name", p.name(), "age", p.age()))
    .toList();

driver.executableQuery("UNWIND $items AS item MERGE (p:Person {name: item.name}) SET p.age = item.age")
    .withParameters(Map.of("items", rows))
    .withConfig(QueryConfig.builder().withDatabase("neo4j").build())
    .execute();
```

参数 map 中允许的叶子类型：`String`、`Long`/`Integer`/`Short`/`Byte`、`Double`/`Float`、`Boolean`、`List<?>`、`Map<String,?>`、`null`。自定义对象和 `LocalDate` 必须先转换。

**在一个事务中分组写入** —— 用一个带循环的 `executeWrite`，而不是每次迭代一个 `executeWrite`。

**连接池** —— 默认 100 个连接。耗尽时进行调优：
```java
Config.builder()
    .withMaxConnectionPoolSize(50)
    .withConnectionAcquisitionTimeout(30, TimeUnit.SECONDS)
    .build()
```

---

## 常见错误

| 错误 | 修复 |
|---|---|
| 对 Cypher 参数做字符串插值 | 始终使用 `.withParameters(Map.of(...))` |
| 省略数据库名 | 每次都设置 `QueryConfig` / `SessionConfig` |
| 每个请求新建 `Driver` | 启动时创建一次；处处共享 |
| 跨线程共享 `Session` | 每个请求/线程一个会话 |
| 从事务回调返回 `Result` | 在回调内收集为 `List`/`Map` |
| 下次 `tx.run()` 前让 `Result` 保持打开 | 在下一次调用前消费 |
| 托管事务回调内有副作用 | 移到外部 —— 回调可能重试 |
| 向 UNWIND 参数传自定义对象 | 转换为 `List<Map<String,Object>>` |
| 对图 null 使用 `asString()` | 使用 `.asString("default")` 或检查 `.isNull()` |
| 对不存在的键使用 `asString()` | 可选访问前先 `containsKey()` |
| catch 中裸调用 `tx.rollback()` | 用 try/catch 包裹；使用 `addSuppressed` |
| 假设 `commit()` 失败 = 未提交 | 提交不确定性 —— 将写入设计为幂等 |
| 在异步回调内阻塞（`.join()`） | 用 `thenCompose` 链接 |
| 在异步错误路径中跳过会话关闭 | 用 `exceptionallyCompose` 关闭后重新抛出 |
| 循环中每次写入一个事务 | 用 `UNWIND` 批处理或在一个回调中分组 |
| 用 `executeWrite` 做读取 | 使用 `executeRead` —— 路由到副本 |

---

## 参考资料

按需加载：
- [references/async-reactive.md](references/async-reactive.md) —— 完整的异步 `CompletableFuture` 模式、使用 `Flux.usingWhen` 的响应式 `RxSession`、死锁避免
- [references/property-encryption.md](references/property-encryption.md) —— 属性加密预览 [6.3.0+]：信封配置档（envelope profile）、密钥封装服务（本地、AWS KMS、Azure Key Vault、GCP KMS）、密钥管理器、使用 AAD 加密/解密
- [references/advanced-config.md](references/advanced-config.md) —— 完整的 `Config.builder()` 选项、TLS、通知过滤、会话级认证、用户模拟、跨会话书签、空间类型（Values.point/WGS-84/Cartesian）

文档：
- Java Driver 手册：https://neo4j.com/docs/java-manual/current/
- API 参考：https://neo4j.com/docs/api/java-driver/current/

---

## 检查清单
- [ ] 启动时创建一个 `Driver` 实例；关闭时释放
- [ ] 创建驱动后调用 `verifyConnectivity()`
- [ ] 在每个 `QueryConfig` / `SessionConfig` 中指定数据库名
- [ ] 使用参数（绝不对 Cypher 做字符串插值）
- [ ] 在托管事务回调内消费 `Result`
- [ ] `executeRead/Write` 回调内无副作用
- [ ] 通过 try-with-resources 关闭会话
- [ ] 异步会话在成功和错误路径中都关闭（`exceptionallyCompose`）
- [ ] 提交时的 `ServiceUnavailableException` 按提交不确定处理
- [ ] `UNWIND` 参数为 `List<Map<String,Object>>`（无自定义对象）
- [ ] 访问可选结果列前检查 `containsKey()`
