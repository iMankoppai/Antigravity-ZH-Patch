---
name: neo4j-driver-go-skill
description: 涵盖 Neo4j Go Driver v6 —— 驱动生命周期、ExecuteQuery、托管与
  显式事务、会话配置、错误处理、数据类型映射，以及连接
  调优。适用于编写连接 Neo4j 的 Go 代码、设置 NewDriver 或 ExecuteQuery、
  调试会话/事务/结果处理，或处理 neo4j-go-driver v5→v6 迁移。
  在出现 NewDriver、ExecuteQuery、SessionConfig、ManagedTransaction、neo4j-go-driver 时触发。
  不处理 Cypher 查询编写 —— 请使用 neo4j-cypher-skill。
  不涵盖驱动版本迁移步骤 —— 请使用 neo4j-migration-skill。
version: 1.0.8
allowed-tools: Bash WebFetch
---

## 何时使用
- 编写连接 Neo4j 的 Go 代码
- 设置 `neo4j.NewDriver()`、`ExecuteQuery()`，或会话/事务模式
- 调试连接错误、结果迭代、类型断言、因果一致性

## 何时不使用
- **编写/优化 Cypher** → `neo4j-cypher-skill`
- **v5→v6 迁移步骤** → `neo4j-migration-skill`

---

## 安装

```bash
go get github.com/neo4j/neo4j-go-driver/v6
```

导入：`github.com/neo4j/neo4j-go-driver/v6/neo4j`

**v5→v6 重命名**（弃用的别名仍可编译，请在 v7 之前移除）：

| v5 | v6 |
|----|----|
| `neo4j.NewDriverWithContext(...)` | `neo4j.NewDriver(...)` |
| `neo4j.DriverWithContext` | `neo4j.Driver` |

---

## 环境变量

```go
import "os"

uri      := getEnv("NEO4J_URI",      "neo4j://localhost:7687")
user     := getEnv("NEO4J_USERNAME", "neo4j")
password := getEnv("NEO4J_PASSWORD", "")
database := getEnv("NEO4J_DATABASE", "neo4j")

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" { return v }
    return fallback
}
```

开发时使用 [godotenv](https://github.com/joho/godotenv) 加载 `.env`：`godotenv.Load()`。`.env` 加入 `.gitignore`。

---

## 驱动生命周期

每个应用一个 `Driver`。协程安全（goroutine-safe）、带连接池、创建开销大。

```go
func NewNeo4jDriver(uri, user, password string) (neo4j.Driver, error) {
    driver, err := neo4j.NewDriver(
        uri, // "neo4j+s://xxx.databases.neo4j.io" for Aura
        neo4j.BasicAuth(user, password, ""),
    )
    if err != nil {
        return nil, fmt.Errorf("create driver: %w", err)
    }
    ctx := context.Background()
    if err := driver.VerifyConnectivity(ctx); err != nil {
        driver.Close(ctx)
        return nil, fmt.Errorf("verify connectivity: %w", err)
    }
    return driver, nil
}

// In main / app teardown:
defer driver.Close(ctx)
```

❌ 切勿为每个请求创建驱动。在启动时创建一次；在多个 goroutine 间共享。

URI 方案：`neo4j+s://`（Aura/TLS+路由）、`neo4j://`（明文+路由）、`bolt+s://`（TLS+单实例）、`bolt://`（明文+单实例）。

---

## 选择合适的 API

| API | 何时使用 | 自动重试 | 惰性结果 |
|-----|----------|:----------:|:------------:|
| `neo4j.ExecuteQuery()` | 大多数查询 —— 简单的默认选择 | ✅ | ❌ 立即（eager） |
| `session.ExecuteRead/Write()` | 大结果集 / 流式处理 | ✅ | ✅ |
| `session.BeginTransaction()` | 跨多个函数 / 外部协调 | ❌ | ✅ |
| `session.Run()` | 仅 `CALL IN TRANSACTIONS` / 自动提交 | ❌ | ✅ |

`CALL { … } IN TRANSACTIONS` 和 `USING PERIODIC COMMIT` 自行管理事务 —— 使用 `session.Run()`。它们在托管事务内会失败。

---

## ExecuteQuery（推荐的默认选择）

自动管理会话、事务、重试和书签。

```go
result, err := neo4j.ExecuteQuery(ctx, driver,
    `MATCH (p:Person {name: $name})-[:KNOWS]->(friend)
     RETURN friend.name AS name`,
    map[string]any{"name": "Alice"},
    neo4j.EagerResultTransformer,
    neo4j.ExecuteQueryWithDatabase("neo4j"),       // always specify
    neo4j.ExecuteQueryWithReadersRouting(),         // for read queries
)
if err != nil {
    return fmt.Errorf("query people: %w", err)
}

for _, record := range result.Records {
    name, _ := record.Get("name")
    fmt.Println(name)
}
fmt.Println(result.Summary.Counters().NodesCreated())
```

关键选项：
```go
neo4j.ExecuteQueryWithDatabase("mydb")          // required for performance
neo4j.ExecuteQueryWithReadersRouting()           // route reads to replicas
neo4j.ExecuteQueryWithImpersonatedUser("jane")  // impersonate
neo4j.ExecuteQueryWithoutBookmarkManager()       // opt out of causal consistency
```

❌ 切勿将用户输入拼接进查询字符串。始终使用 `map[string]any` 参数。

结构体参数 [v6.2.0+，对象映射预览] —— `params` 中的结构体（或指针）会作为 Cypher map 发送；`Session.Run`、`ManagedTransaction.Run`、`ExplicitTransaction.Run` 中的规则相同：
```go
type Person struct {
    Name     string `neo4j:"name"`
    Age      int    `neo4j:"age,omitempty"`  // zero value dropped
    Internal string `neo4j:"-"`              // never sent
}
_, err := neo4j.ExecuteQuery(ctx, driver,
    "MERGE (p:Person {name: $person.name}) SET p += $person",
    map[string]any{"person": Person{Name: "Alice", Age: 30}},
    neo4j.EagerResultTransformer,
    neo4j.ExecuteQueryWithDatabase("neo4j"),
)
```

---

## 托管事务（基于会话）

用于惰性流式（大结果集）或回调级控制。

```go
session := driver.NewSession(ctx, neo4j.SessionConfig{
    DatabaseName: "neo4j", // always specify
    AccessMode:   neo4j.AccessModeRead,
})
defer session.Close(ctx)

result, err := session.ExecuteRead(ctx,
    func(tx neo4j.ManagedTransaction) (any, error) {
        res, err := tx.Run(ctx,
            `MATCH (p:Person) RETURN p.name AS name LIMIT $limit`,
            map[string]any{"limit": 100},
        )
        if err != nil {
            return nil, err
        }
        var names []string
        for res.Next(ctx) { // lazy — don't Collect() on large sets
            name, _ := res.Record().Get("name")
            names = append(names, name.(string))
        }
        return names, res.Err()
    },
)
```

❌ 回调中不要有副作用 —— 瞬时故障时会重试。
`ExecuteRead` → 副本。`ExecuteWrite` → 集群 leader。

---

## 显式事务

当事务工作跨多个函数或需要外部协调时使用。

```go
session := driver.NewSession(ctx, neo4j.SessionConfig{DatabaseName: "neo4j"})
defer session.Close(ctx)

tx, err := session.BeginTransaction(ctx)
if err != nil {
    return err
}
if err := doPartA(ctx, tx); err != nil {
    tx.Rollback(ctx)
    return err
}
if err := doPartB(ctx, tx); err != nil {
    tx.Rollback(ctx)
    return err
}
return tx.Commit(ctx)
```

❌ 不会自动重试。由调用方处理重试。除非需要显式控制，否则优先使用托管事务。

---

## 错误处理

```go
result, err := neo4j.ExecuteQuery(...)
if err != nil {
    var neo4jErr *neo4j.Neo4jError
    if errors.As(err, &neo4jErr) {
        slog.Error("database error", "code", neo4jErr.Code, "msg", neo4jErr.Msg)
    }
    var connErr *neo4j.ConnectivityError
    if errors.As(err, &connErr) {
        slog.Error("connectivity error", "err", connErr)
    }
    return fmt.Errorf("execute query: %w", err)
}
```

辅助函数：
```go
neo4j.IsNeo4jError(err)                // server-side Cypher/database error
neo4j.IsTransactionExecutionLimit(err) // managed tx retries exhausted
```

在托管事务回调中：返回错误 → 若是瞬时错误，驱动会重试。
启动时的 `ConnectivityError`：检查 URI 方案、凭据、防火墙。

---

## 数据类型

| Cypher | Go |
|--------|----|
| `Integer` | `int64` |
| `Float` | `float64` |
| `String` | `string` |
| `Boolean` | `bool` |
| `List` | `[]any` |
| `Map` | `map[string]any` |
| `Node` | `neo4j.Node` |
| `Relationship` | `neo4j.Relationship` |
| `Path` | `neo4j.Path` |
| `Date` | `neo4j.Date` |
| `DateTime` | `neo4j.Time` |
| `Duration` | `neo4j.Duration` |
| `UUID` | `neo4j.UUID`（= `dbtype.UUID`，`[16]byte` RFC 9562）—— v6.2.0+、Bolt 6.1；用 `dbtype.ParseUUID(s)` 解析，用 `.String()` 渲染 |
| `null` | `nil` |

时间类型写入请固定使用 v6.4.0+：更早版本会把 1970 年之前的 `Date` 发送为次日、在夏令时切换日把 `dbtype.Time` 偏移一小时、以及当区名在那一时刻解析不同时导致 `time.Time` 时区偏移错误。

```go
// Typed extraction (v6+, preferred):
neo4j.GetRecordValue[string](record, "name")

// Manual extraction:
rawAge, ok := record.Get("age")
if !ok { return errors.New("missing 'age' field") }
age := rawAge.(int64) // Neo4j integers → int64

// Node access:
rawNode, _ := record.Get("p")
node := rawNode.(neo4j.Node)
name := node.Props["name"].(string)
labels := node.Labels // []string
```

❌ 在类型断言之前始终检查 `record.Get()` 返回的 `ok` —— 键缺失时会 panic。
❌ 惰性 `for res.Next(ctx)` 循环之后，始终检查 `res.Err()`。

---

## 关键模式

### Context —— 始终传播

```go
ctx, cancel := context.WithTimeout(parentCtx, 5*time.Second)
defer cancel()
// pass ctx to all driver calls
```

`context.Background()` 没有截止时间 —— 慢查询会无限期阻塞。

### 批量写入

```go
// Bad: one transaction per record
for _, item := range items {
    neo4j.ExecuteQuery(ctx, driver, writeQuery, item, ...)
}

// Good: UNWIND batch in one transaction
neo4j.ExecuteQuery(ctx, driver,
    `UNWIND $items AS item
     MERGE (n:Node {id: item.id})
     SET n += item`,
    map[string]any{"items": items},
    neo4j.EagerResultTransformer,
    neo4j.ExecuteQueryWithDatabase("neo4j"),
)
```

### 泛型辅助函数（v6+）

优先使用类型安全的辅助函数，而非手工断言：

```go
// GetRecordValue[T] — extract + cast in one call
name, isNil, err := neo4j.GetRecordValue[string](record, "name")
// isNil=true when OPTIONAL MATCH returned null; err != nil when key absent or wrong type

// CollectTWithContext — map all records to a slice
people, err := neo4j.CollectTWithContext(ctx, result, func(record *neo4j.Record) (Person, error) {
    name, _, err := neo4j.GetRecordValue[string](record, "name")
    age, _, _   := neo4j.GetRecordValue[int64](record, "age")
    return Person{Name: name, Age: int(age)}, err
})

// SingleTWithContext — expect exactly one record (error if 0 or 2+)
person, err := neo4j.SingleTWithContext(ctx, result, func(record *neo4j.Record) (Person, error) {
    name, _, _ := neo4j.GetRecordValue[string](record, "name")
    return Person{Name: name}, nil
})

// GetProperty — typed property from Node or Relationship
node, _, _ := neo4j.GetRecordValue[neo4j.Node](record, "p")
nameVal, err := neo4j.GetProperty[string](node, "name")
```

结果映射 [v6.3.0+，对象映射预览] —— 将记录映射到带 `neo4j` 标签的结构体（与结构体参数相同的标签）：
```go
type Person struct {
    Name string `neo4j:"name"`
    Age  int    `neo4j:"age"`   // INTEGER converted; lossy conversion → error, not truncation
}

// EagerResult from ExecuteQuery
res, err := neo4j.ExecuteQuery(ctx, driver,
    "MATCH (p:Person) RETURN p.name AS name, p.age AS age LIMIT 25",
    nil, neo4j.EagerResultTransformer, neo4j.ExecuteQueryWithDatabase("neo4j"))
people, err := neo4j.CollectRecordsAs[Person](res.Records)

// Streaming Result inside a transaction
all, err := neo4j.CollectAs[Person](ctx, result)      // all records
person, err := neo4j.SingleAs[Person](ctx, result)    // exactly one record
p, err := neo4j.As[Person](record)                    // single record
```
映射规则：某一列包含节点、关系或 map → 其属性映射到字段；否则列按名称映射。缺失/null → 零值；多余列被忽略。

### 空间类型

```go
// 2D Cartesian (SRID 7203), 3D Cartesian (SRID 9157)
pt2d := neo4j.Point2D{X: 1.23, Y: 4.56, SpatialRefId: 7203}
pt3d := neo4j.Point3D{X: 1.23, Y: 4.56, Z: 7.89, SpatialRefId: 9157}

// 2D WGS-84 (SRID 4326), 3D WGS-84 (SRID 4979)
london := neo4j.Point2D{X: -0.118092, Y: 51.509865, SpatialRefId: 4326}
shard  := neo4j.Point3D{X: -0.0865, Y: 51.5045, Z: 310, SpatialRefId: 4979}

// Pass as parameter
result, err := neo4j.ExecuteQuery(ctx, driver,
    "CREATE (p:Place {location: $loc})",
    map[string]any{"loc": london},
    neo4j.EagerResultTransformer,
    neo4j.ExecuteQueryWithDatabase("neo4j"),
)

// Read from result — assert to Point2D or Point3D
raw, _ := record.Get("location")
if p2d, ok := raw.(neo4j.Point2D); ok {
    fmt.Printf("lon=%f lat=%f srid=%d\n", p2d.X, p2d.Y, p2d.SpatialRefId)
}

// Distance (same SRID only)
result, _ = neo4j.ExecuteQuery(ctx, driver,
    "RETURN point.distance($p1, $p2) AS distance",
    map[string]any{"p1": pt2d, "p2": neo4j.Point2D{X: 10, Y: 10, SpatialRefId: 7203}},
    neo4j.EagerResultTransformer, neo4j.ExecuteQueryWithDatabase("neo4j"),
)
dist, _ := result.Records[0].Get("distance")
fmt.Println(dist.(float64))
```

### 始终指定数据库

```go
neo4j.ExecuteQueryWithDatabase("neo4j")    // in ExecuteQuery
neo4j.SessionConfig{DatabaseName: "neo4j"} // in sessions
```

省略会为解析主数据库而在每次调用时多一次网络往返。

### 因果一致性

`ExecuteQuery` 自动管理书签 —— 顺序调用无需任何操作。
跨会话（并行 worker）：显式合并书签 —— 参见 [references/repository-pattern.md](references/repository-pattern.md)。

---

## 常见错误

| 错误 / 症状 | 原因 | 修复 |
|-----------------|-------|-----|
| 启动时 `ConnectivityError` | URI 错误 / TLS 不匹配 / 防火墙 | 检查方案（Aura 用 `neo4j+s://`）、凭据、端口 7687 |
| 运行中 `ConnectivityError` | 连接池耗尽 | 增大 `MaxConnectionPoolSize`；检查是否有会话泄漏 |
| 类型断言时 panic | `record.Get()` 返回 nil/类型错误 | 使用 `neo4j.GetRecordValue[T]()` 或先检查 `ok` |
| 循环后 `res.Err()` 非 nil | 流中途网络错误 | 处理错误；重新运行事务 |
| 回调意外被重试 | 托管事务内有副作用 | 将副作用移到回调外 |
| 超过上下文截止时间 | 上下文未设置超时 | 使用 `context.WithTimeout` |
| 结果为 0，查询看似正确 | `DatabaseName` 错误 | 在配置中始终设置 `DatabaseName` |
| `CALL IN TRANSACTIONS` 失败 | 在托管事务内运行 | 使用 `session.Run()`（自动提交） |

---

## 参考资料

按需加载：
- [references/advanced-config.md](references/advanced-config.md) —— 连接池调优、自定义地址解析器、通知配置、Bolt 日志、认证选项、URI 方案表、已弃用的结果摘要访问器（`Profile()` → `QueryProfile()`）
- [references/repository-pattern.md](references/repository-pattern.md) —— 代码仓库封装模式、使用书签的跨会话因果一致性
- [references/property-encryption.md](references/property-encryption.md) —— 属性加密预览 [v6.4.0+]：`EnvelopeProfile`、本地密钥封装、用户密钥代码仓库、`EncryptWithAAD` / `DecryptWithAAD`

## WebFetch

| 需求 | URL |
|------|-----|
| Go 驱动手册 | `https://neo4j.com/docs/go-manual/current/` |
| API 参考 | `https://pkg.go.dev/github.com/neo4j/neo4j-go-driver/v6/neo4j` |

---

## 检查清单
- [ ] 启动时创建一个驱动；在多个 goroutine 间共享；`defer driver.Close(ctx)`
- [ ] 启动时调用 `driver.VerifyConnectivity(ctx)`
- [ ] 在所有 `SessionConfig` / `ExecuteQueryWithDatabase` 中设置 `DatabaseName`
- [ ] 生产环境查询使用 `context.WithTimeout`
- [ ] 使用 `map[string]any` 参数 —— 无字符串插值
- [ ] 只读 `ExecuteQuery` 调用使用 `ExecuteQueryWithReadersRouting()`
- [ ] 惰性 `for result.Next(ctx)` 循环后检查 `res.Err()`
- [ ] 类型断言已做防护（使用 `GetRecordValue[T]` 或检查 `ok`）
- [ ] 托管事务回调内无副作用
- [ ] `CALL IN TRANSACTIONS` / 自动提交查询使用 `session.Run()`
- [ ] 使用 `defer session.Close(ctx)` 关闭会话
