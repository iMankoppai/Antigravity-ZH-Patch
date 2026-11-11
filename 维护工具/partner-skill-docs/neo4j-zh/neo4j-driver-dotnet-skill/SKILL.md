---
name: neo4j-driver-dotnet-skill
description: Neo4j .NET Driver v6 —— IDriver 生命周期、依赖注入（DI）注册（单例）、ExecutableQuery
  流式 API、ExecuteReadAsync/ExecuteWriteAsync 托管事务、IResultCursor（FetchAsync/
  ToListAsync）、记录值访问（.Get<T>/As<T>）、空值安全、UNWIND 批处理、时间类型、
  await using、EagerResult、对象映射、CancellationToken、错误处理，以及常见陷阱。
  适用于编写连接 Neo4j 的 C# 或 .NET 代码。也会在出现 Neo4j.Driver、IDriver、
  ExecutableQuery、ExecuteReadAsync、ExecuteWriteAsync、IResultCursor、IAsyncSession，或 .NET/C# 中任何 Bolt/Aura
  相关工作时触发。不处理 Cypher 编写 —— 请使用 neo4j-cypher-skill。
  不涵盖驱动版本升级 —— 请使用 neo4j-migration-skill。
compatibility: .NET 8, 9, 10; Neo4j.Driver v6
allowed-tools: Bash WebFetch
version: 1.0.8
---

## 何时使用
- 编写连接 Neo4j 的 C# 或 .NET 代码
- 设置 `IDriver`、DI 注册，或会话/事务生命周期
- 关于 `ExecutableQuery`、`IResultCursor`、异步模式、结果映射的问题
- 在 .NET 中调试会话、类型映射、空值安全或错误处理

## 何时不使用
- **编写/优化 Cypher 查询** → `neo4j-cypher-skill`
- **从旧驱动版本升级** → `neo4j-migration-skill`

---

## 安装

```bash
dotnet add package Neo4j.Driver
```

| 包 | 用途 |
|---|---|
| `Neo4j.Driver` | 异步 API —— **使用此项** |
| `Neo4j.Driver.Simple` | 同步封装 |
| `Neo4j.Driver.Reactive` | System.Reactive 流 |

固定使用 `Neo4j.Driver >= 6.4.0` —— 修复了 `CustomAuthToken.ToString()` 以明文泄露凭据、证书验证器接受无证书的对端，以及连接池分配服务器已关闭的空闲连接等问题。

---

## 驱动生命周期

`IDriver` —— 线程安全、带连接池、创建开销大。**每个应用只创建一个。**

```csharp
using Neo4j.Driver;

// URI schemes:
//   neo4j+s://xxx.databases.neo4j.io   — TLS + cluster routing (Aura)
//   neo4j://localhost                   — unencrypted + cluster routing
//   bolt+s://localhost:7687             — TLS + single instance
//   bolt://localhost:7687               — unencrypted + single instance

await using var driver = GraphDatabase.Driver(
    "neo4j+s://xxx.databases.neo4j.io",
    AuthTokens.Basic("neo4j", "password"));

await driver.VerifyConnectivityAsync();   // fail fast on startup
```

`IDriver` 和 `IAsyncSession` 实现了 `IAsyncDisposable` —— 始终使用 `await using`，切勿使用普通 `using`。

```csharp
// ❌ Wrong — synchronous Dispose() may block thread pool
using var driver = GraphDatabase.Driver(uri, auth);

// ✅ Correct
await using var driver = GraphDatabase.Driver(uri, auth);
```

认证选项：`AuthTokens.Basic(u, p)` / `AuthTokens.Bearer(token)` / `AuthTokens.Kerberos(ticket)` / `AuthTokens.None`

---

## 环境变量

从环境变量 / `appsettings.json` 加载连接配置 —— 切勿硬编码凭据。

```json
// appsettings.json
{
  "Neo4j": {
    "Uri": "neo4j+s://xxx.databases.neo4j.io",
    "User": "neo4j",
    "Password": "secret",
    "Database": "neo4j"
  }
}
```

```csharp
// Access via IConfiguration (injected in Program.cs)
var uri      = builder.Configuration["Neo4j:Uri"];
var user     = builder.Configuration["Neo4j:User"];
var password = builder.Configuration["Neo4j:Password"];
var database = builder.Configuration["Neo4j:Database"] ?? "neo4j";
```

用环境变量覆盖（标准 .NET 行为）：`Neo4j__Uri=neo4j+s://...`（双下划线 = 冒号分隔符）。切勿提交含真实凭据的 `appsettings.json` —— 在 CI/生产中使用 `appsettings.Development.json`（已加入 .gitignore）或环境变量。

---

## DI 注册（ASP.NET Core）

将 `IDriver` 注册为**单例** —— 切勿使用 Scoped 或 Transient。切勿在 DI 中注册 `IAsyncSession`。

```csharp
// Program.cs
builder.Services.AddSingleton<IDriver>(_ =>
    GraphDatabase.Driver(
        builder.Configuration["Neo4j:Uri"],
        AuthTokens.Basic(
            builder.Configuration["Neo4j:User"],
            builder.Configuration["Neo4j:Password"])));

// Shutdown hook — dispose the singleton cleanly
builder.Services.AddHostedService<Neo4jShutdownService>();

// Neo4jShutdownService.cs
public class Neo4jShutdownService(IDriver driver, IHostApplicationLifetime lifetime)
    : IHostedService
{
    public Task StartAsync(CancellationToken _)
    {
        lifetime.ApplicationStopping.Register(() =>
            driver.DisposeAsync().AsTask().GetAwaiter().GetResult());
        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken _) => Task.CompletedTask;
}

// Inject into services — sessions opened per unit of work
public class PersonService(IDriver driver)
{
    public async Task<List<string>> GetNamesAsync(CancellationToken ct = default)
    {
        var (records, _, _) = await driver
            .ExecutableQuery("MATCH (p:Person) RETURN p.name AS name")
            .WithConfig(new QueryConfig(database: "neo4j"))
            .ExecuteAsync(ct);
        return records.Select(r => r.Get<string>("name")).ToList();
    }
}
```

---

## 选择合适的 API

| API | 何时使用 | 自动重试 | 流式 |
|---|---|---|---|
| `driver.ExecutableQuery()` | 大多数查询 —— 简单的默认选择 | ✅ | ❌ 立即（eager） |
| `session.ExecuteReadAsync/WriteAsync()` | 大结果集、单事务多查询 | ✅ | ✅ |
| `session.RunAsync()` | `LOAD CSV`、`CALL {} IN TRANSACTIONS` | ❌ | ✅ |
| `session.BeginTransactionAsync()` | 跨多个函数、外部协调 | ❌ | ✅ |

---

## ExecutableQuery —— 推荐的默认选择

流式构建器；自动管理会话、事务、重试和书签。

```csharp
// Read
var (records, summary, keys) = await driver
    .ExecutableQuery("MATCH (p:Person {name: $name})-[:KNOWS]->(f) RETURN f.name AS name")
    .WithParameters(new { name = "Alice" })
    .WithConfig(new QueryConfig(
        database: "neo4j",
        routing: RoutingControl.Readers))    // route reads to replicas
    .ExecuteAsync(cancellationToken);

foreach (var r in records)
    Console.WriteLine(r.Get<string>("name"));

// Use ResultConsumedAfter for wall-clock timing (ResultAvailableAfter = time-to-first-byte only)
Console.WriteLine($"{summary.ResultConsumedAfter.TotalMilliseconds} ms");

// Write
var (_, writeSummary, _) = await driver
    .ExecutableQuery("CREATE (p:Person {name: $name, age: $age})")
    .WithParameters(new { name = "Bob", age = 30 })
    .WithConfig(new QueryConfig(database: "neo4j"))
    .ExecuteAsync();
Console.WriteLine($"Created {writeSummary.Counters.NodesCreated} nodes");

// WithMap — project inline
var names = await driver
    .ExecutableQuery("MATCH (p:Person) RETURN p.name AS name")
    .WithConfig(new QueryConfig(database: "neo4j"))
    .WithMap(r => r["name"].As<string>())
    .ExecuteAsync();   // names.Result is IReadOnlyList<string>
```

切勿省略 `await`：`ExecuteAsync()` 返回 `Task` —— 缺少 `await` 能静默编译通过，但查询永远不会执行。

切勿对 Cypher 做字符串插值。始终使用 `WithParameters()` —— 防止注入，并启用执行计划缓存。

---

## 托管事务

用于大结果集（惰性流式）或每个事务执行多个查询。回调在瞬时故障时会自动重试 —— 保持其幂等，内部不要有副作用。

```csharp
await using var session = driver.AsyncSession(conf => conf.WithDatabase("neo4j"));

// Read — routes to replicas
var names = await session.ExecuteReadAsync(async tx =>
{
    var cursor = await tx.RunAsync(
        "MATCH (p:Person) WHERE p.name STARTS WITH $prefix RETURN p.name AS name",
        new { prefix = "Al" });
    return await cursor.ToListAsync(r => r.Get<string>("name"));
    // Consume cursor INSIDE callback — invalid after callback returns
});

// Write — void, no async needed
await session.ExecuteWriteAsync(tx =>
    tx.RunAsync("MERGE (p:Person {name: $name})", new { name = "Carol" }));

// Write — async when needing counters
var summary = await session.ExecuteWriteAsync(async tx =>
{
    var cursor = await tx.RunAsync(
        "CREATE (p:Person {name: $name})", new { name = "Alice" });
    return await cursor.ConsumeAsync();   // drains cursor, returns IResultSummary
});
Console.WriteLine($"Created {summary.Counters.NodesCreated} nodes");
```

游标规则：
- 在回调**内部**使用 `ToListAsync()` 或 `FetchAsync()` 循环消费
- 从回调返回游标 → 事务关闭 → 游标失效 → 抛出异常

```csharp
// ❌ Returns cursor — tx closes immediately after lambda returns
var cursor = await session.ExecuteReadAsync(async tx =>
    await tx.RunAsync("MATCH (p:Person) RETURN p.name AS name"));
await cursor.FetchAsync();   // throws

// ✅ Consume inside
var names = await session.ExecuteReadAsync(async tx =>
{
    var cursor = await tx.RunAsync("MATCH (p:Person) RETURN p.name AS name");
    return await cursor.ToListAsync(r => r.Get<string>("name"));
});
```

异步 void 陷阱：
```csharp
// ❌ CS1998 warning — async with no await; RunAsync Task discarded
await session.ExecuteWriteAsync(async tx =>
    tx.RunAsync("MERGE (p:Person {name: $name})", new { name = "Alice" }));

// ✅ No async, return Task directly
await session.ExecuteWriteAsync(tx =>
    tx.RunAsync("MERGE (p:Person {name: $name})", new { name = "Alice" }));
```

---

## FetchAsync 循环

```csharp
var cursor = await tx.RunAsync("MATCH (p:Person) RETURN p.name AS name");

while (await cursor.FetchAsync())          // true while records remain
{
    Process(cursor.Current.Get<string>("name"));
}
// Do NOT use cursor.Current after the loop — it holds the last record, not null
// Do NOT call FetchAsync() again after it returned false — throws InvalidOperationException
```

游标消费方法：

| 方法 | 记录 | 摘要 | 用途 |
|---|---|---|---|
| `ToListAsync()` | ✅ 全部 | ❌ | 需要记录 |
| `ToListAsync(mapper)` | ✅ 已映射 | ❌ | 需要映射后的记录 |
| `FetchAsync()` 循环 | ✅ 每次一条 | ❌ 直到 ConsumeAsync | 大批量/惰性 |
| `ConsumeAsync()` | ❌ 丢弃 | ✅ | 需要计数器 |

`IResultSummary` 性能剖析 [v6.3.0+]：`summary.Profile` 已标记为 `[Obsolete]` → 请使用 `summary.QueryProfile`（`IQueryProfile`），其 `DbHits`、`Rows`、`Time`、`PageCacheHits`、`PageCacheMisses` 均为 `long?` —— `null` 表示未记录，与 `0` 不同。先判断 `summary.HasProfile`。
| `SingleAsync()` | ✅ 恰好 1 条 | ❌ | 期望一行 |

---

## 记录值访问

```csharp
// Two equivalent patterns — prefer .Get<T>()
string name = record.Get<string>("name");
int    age  = record.Get<int>("age");

string name2 = record["name"].As<string>();   // indexer + As<T>
string name3 = record[0].As<string>();        // by column index

// Null safety — .As<T>() on null graph value throws InvalidCastException
string? city = record["city"].As<string?>();  // ✅ nullable
int?    age2 = record["age"].As<int?>();      // ✅ nullable

// Absent key — throws KeyNotFoundException (typo or not in RETURN)
if (record.Keys.Contains("city"))
    var city3 = record.Get<string?>("city");
```

---

## 类型映射

| Cypher | .NET 默认 | 说明 |
|---|---|---|
| `Integer` | `long` | 安全：`int`、`long?`、`int?` |
| `Float` | `double` | 安全：`float`、`double?` |
| `String` | `string` | 可空时使用 `string?` |
| `Boolean` | `bool` | |
| `List` | `IReadOnlyList<object>` | |
| `Map` | `IReadOnlyDictionary<string,object>` | |
| `Node` | `INode` | `.Labels`、`.Properties`、`.ElementId` |
| `Relationship` | `IRelationship` | `.Type`、`.StartNodeElementId` |
| `Date` | `LocalDate` | `.ToDateOnly()`（.NET 6+） |
| `DateTime` | `ZonedDateTime` | `.ToDateTimeOffset()`（毫秒精度） |
| `LocalDateTime` | `LocalDateTime` | |
| `Duration` | `Duration` | `.ToTimeSpan()` 在含月/天时抛出异常 |
| `UUID` | `System.Guid` | [driver 6.2+、Bolt 6.1、Neo4j 2026.08+]；对象映射也可与 `string` 互转 |
| `null` | `null` | 使用可空类型 |

`ElementId` 仅在一个事务内稳定 —— 不要用它跨事务进行 MATCH。

```csharp
// Pass CLR types as params — driver converts automatically
await driver.ExecutableQuery("CREATE (e:Event {at: $ts})")
    .WithParameters(new { ts = DateTimeOffset.UtcNow })
    .WithConfig(new QueryConfig(database: "neo4j"))
    .ExecuteAsync();
```

---

## UNWIND 批处理

```csharp
// ❌ One transaction per record — high overhead
foreach (var item in items)
    await driver.ExecutableQuery("MERGE (n:Node {id: $id})")
        .WithParameters(new { id = item.Id })
        .WithConfig(new QueryConfig(database: "neo4j"))
        .ExecuteAsync();

// ✅ Single transaction via UNWIND — anonymous types only (custom classes don't serialize)
var rows = items.Select(i => new { id = i.Id, name = i.Name }).ToArray();
await driver.ExecutableQuery(@"
    UNWIND $rows AS row
    MERGE (n:Node {id: row.id})
    SET n.name = row.name")
    .WithParameters(new { rows })
    .WithConfig(new QueryConfig(database: "neo4j"))
    .ExecuteAsync();
```

为 UNWIND 传给 `WithParameters` 的自定义类实例不会被序列化 —— 使用 `new object[] { new { ... } }` 或 `Dictionary<string, object>`。

---

## 对象映射（预览 API）

```csharp
using Neo4j.Driver.Preview.Mapping;   // REQUIRED — without this, AsObject<T>() is CS1061

public record Person(string Name, int Age);   // C# records work well here

var result = await driver
    .ExecutableQuery("MATCH (p:Person) RETURN p.name AS name, p.age AS age")
    .WithConfig(new QueryConfig(database: "neo4j"))
    .ExecuteAsync();

var person = result.Result[0].AsObject<Person>();   // RETURN keys map to record properties

// Bulk mapping
var (people, _, _) = await driver
    .ExecutableQuery("MATCH (p:Person) RETURN p.name AS name, p.age AS age")
    .WithConfig(new QueryConfig(database: "neo4j"))
    .AsObjectsAsync<Person>();
```

---

## 错误处理

```csharp
try
{
    await driver.ExecutableQuery("...")
        .WithConfig(new QueryConfig(database: "neo4j"))
        .ExecuteAsync();
}
catch (AuthenticationException ex)      { /* bad credentials */ }
catch (ServiceUnavailableException ex)  { /* database unreachable */ }
catch (ClientException ex)
    when (ex.Code == "Neo.ClientError.Schema.ConstraintValidationFailed")
{
    // Unique/existence constraint violation — catch BEFORE Neo4jException
}
catch (Neo4jException ex)               { /* all other server errors */ }
```

在 `Neo4jException` 之前捕获 `ClientException` —— 它是子类；通用处理器会把它吞掉。

`ex.GqlStatus` —— 稳定的 GQL 状态码；优先于对 `ex.Code` 做字符串匹配。

显式事务回滚本身也可能抛出异常 —— 将其隔离：
```csharp
catch (Exception original)
{
    try { await tx.RollbackAsync(); }
    catch (Exception ex) { logger.LogError(ex, "Rollback failed"); }
    throw;
}
```

若 `CommitAsync()` 抛出网络错误，提交可能成功也可能未成功 —— 使用 `MERGE` + 唯一约束将写入设计为幂等。

---

## 常见错误

| 错误 | 修复 |
|---|---|
| `using var driver` | `await using var driver` —— `IDriver` 是 `IAsyncDisposable` |
| `using var session` | `await using var session` |
| DI 中将 `IDriver` 注册为 Scoped/Transient | 注册为 Singleton |
| 在 DI 中注册 `IAsyncSession` | 绝不 —— 按工作单元打开 |
| `ExecuteAsync()` 缺少 `await` | Task 静默地永不执行 |
| `async tx => tx.RunAsync(...)` 内部无 await | 移除 `async`，直接返回 Task |
| 在 `QueryConfig`/`AsyncSession` 中省略 `database` | 始终指定 —— 节省一次往返 |
| Web 应用中无 `CancellationToken` | 传播 `HttpContext.RequestAborted` |
| 对 null 图值使用 `.As<string>()` | 使用 `.As<string?>()` —— 不可空类型会抛异常 |
| `record["key"]` 键不存在 | 先检查 `record.Keys.Contains()` |
| FetchAsync 循环后使用 `cursor.Current` | 为最后一条记录而非 null —— 循环后不要使用 |
| `FetchAsync()` 返回 `false` 后再调用 | 抛出异常 —— 停止循环，不要再调用 |
| 从托管事务回调返回游标 | 在回调内用 `ToListAsync()` 消费 |
| 需要从会话写入获取计数器 | 使用 `await cursor.ConsumeAsync()` |
| `AsObject<T>()` 报 CS1061 编译错误 | 添加 `using Neo4j.Driver.Preview.Mapping;` |
| 用 `ResultAvailableAfter` 计算总耗时 | 使用 `ResultConsumedAfter`（完整墙钟时间） |
| 为 UNWIND 在 `WithParameters` 中使用自定义类 | 使用匿名类型或 `Dictionary<string,object>` |
| 改了 C# 参数名但没改 Cypher 的 `$param` | 匿名属性名必须与 `$param` 名一致 |
| 用 `ExecuteWriteAsync` 做读取 | 使用 `ExecuteReadAsync` —— 路由到副本 |
| 托管事务回调内有副作用 | 移到外部 —— 失败时回调会重试 |
| 对含月/天的 `Duration.ToTimeSpan()` | 仅对纯秒/纳秒时长的安全 |
| 在 `ClientException` 之前捕获 `Neo4jException` | `ClientException` 是子类 —— 先捕获它 |

---

## 参考资料

按需加载：
- [references/transactions.md](references/transactions.md) —— 显式事务、`BeginTransactionAsync`、回滚、提交不确定性、`TransactionConfig`（超时、元数据）、因果一致性与书签
- [references/performance.md](references/performance.md) —— 空间类型（Point/WGS-84/Cartesian）、连接池调优、`WithFetchSize`、会话配置选项、`CancellationToken` 模式、大结果集流式处理
- [references/object-mapping.md](references/object-mapping.md) —— `AsObject<T>`、blueprint 映射、lambda 映射、`AsObjectsAsync<T>`、代码仓库模式示例

---

## 检查清单
- [ ] `IDriver` 在 DI 中注册为单例（短生命周期应用使用 `await using`）
- [ ] 驱动和会话使用 `await using`（而非普通 `using`）
- [ ] 在 `QueryConfig` / `AsyncSession` 配置中指定 `database`
- [ ] 简单查询使用 `ExecutableQuery`；流式/多查询使用 `ExecuteReadAsync`/`ExecuteWriteAsync`
- [ ] 游标在托管事务回调内消费（不返回）
- [ ] 任何可能为 null 的图值都使用可空类型（`string?`、`int?`）
- [ ] 使用 `WithParameters()`（无字符串插值）
- [ ] UNWIND 批处理使用匿名类型（而非自定义类实例）
- [ ] 在 Web 应用处理器中传播 `CancellationToken`
- [ ] 在 `Neo4jException` 之前捕获 `ClientException`
- [ ] 写入幂等（`MERGE` + 约束）以确保重试安全
- [ ] `ExecuteReadAsync`/`ExecuteWriteAsync` 回调内无副作用
