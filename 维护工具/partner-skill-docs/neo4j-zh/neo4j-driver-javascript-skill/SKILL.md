---
name: neo4j-driver-javascript-skill
description: Neo4j JavaScript/TypeScript Driver v6 —— 驱动生命周期、executeQuery、
  托管事务（executeRead/executeWrite）、session.run、Integer 处理、JSON
  序列化、记录访问、async/await 模式、TypeScript 类型、错误处理，
  以及 Node.js 和浏览器的连接设置。适用于编写连接 Neo4j 的
  JS/TS 代码 —— neo4j.driver()、executeQuery、executeRead、executeWrite、session.run、
  neo4j.int、record.get、Integer、BookmarkManager、bolt://、neo4j+s://。
  不处理 Cypher 查询编写 —— 请使用 neo4j-cypher-skill。
  不涵盖驱动版本迁移 —— 请使用 neo4j-migration-skill。
compatibility: neo4j-driver v6; Node.js >=18; TypeScript supported via bundled types
version: 1.0.7
allowed-tools: Bash WebFetch
---

## 何时使用
- 编写连接 Neo4j（Node.js 或浏览器）的 JS/TS 代码
- 设置驱动、会话、事务或查询执行
- 调试 Integer 处理、结果消费、会话泄漏、异步错误
- 驱动对象的 TypeScript 类型标注

## 何时不使用
- **编写/优化 Cypher** → `neo4j-cypher-skill`
- **升级驱动版本** → `neo4j-migration-skill`
- **RxJS 会话 API** → [references/rxjs-session.md](references/rxjs-session.md)

---

## 安装

```bash
npm install neo4j-driver   # or: yarn add neo4j-driver
```

---

## 环境变量

从环境变量加载连接配置 —— 切勿硬编码凭据。

```bash
# .env file (add to .gitignore)
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=secret
NEO4J_DATABASE=neo4j
```

```javascript
// npm install dotenv (for Node.js < 20 or when .env auto-load is off)
import 'dotenv/config'   // or: require('dotenv').config()

const URI      = process.env.NEO4J_URI
const USER     = process.env.NEO4J_USERNAME
const PASSWORD = process.env.NEO4J_PASSWORD
const DATABASE = process.env.NEO4J_DATABASE ?? 'neo4j'
```

Node 20+ 使用 `--env-file .env` 原生加载 `.env`。Next.js / Vite 会自动加载 `.env` —— 无需导入 dotenv。

---

## 驱动生命周期

启动时创建**一个驱动实例**。处处共享。切勿每个请求创建。

```javascript
// CommonJS
const neo4j = require('neo4j-driver')
// ESM / TypeScript
import neo4j from 'neo4j-driver'

const driver = neo4j.driver(
  process.env.NEO4J_URI,                              // 'neo4j+s://xxx.databases.neo4j.io'
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)
await driver.verifyConnectivity()   // fail fast on startup if unreachable
// On shutdown:
await driver.close()
```

**URI 方案：**
| 方案 | 传输 | 用途 |
|---|---|---|
| `neo4j+s://` | TLS + 集群路由 | Aura；生产集群 |
| `neo4j://` | 明文 + 集群路由 | 本地开发集群 |
| `bolt+s://` | TLS，单实例 | 带 TLS 的单个 Neo4j 实例 |
| `bolt://` | 明文，单实例 | 本地单实例 |

**认证选项：**
```javascript
neo4j.auth.basic(user, password)   // username/password
neo4j.auth.bearer(token)           // SSO / JWT
neo4j.auth.kerberos(base64Ticket)  // Kerberos
neo4j.auth.none()                  // unauthenticated (dev only)
```

6.3.0+：不带 `scheme` 的自定义令牌对象会抛出 `Auth token is missing 'scheme'`（更早会静默发送 `none`）—— 使用 `neo4j.auth.*` 辅助函数或设置 `scheme`。

**Web 框架的单例** —— 创建一次，处处导入：
```javascript
// db.js
let _driver = null
export function getDriver() {
  if (!_driver) _driver = neo4j.driver(process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD))
  return _driver
}
export async function closeDriver() {
  if (_driver) { await _driver.close(); _driver = null }
}
```

**Serverless**（Lambda/Vercel/Workers）：保持 `maxConnectionPoolSize: 5`；没有保证的 `SIGTERM`。

---

## 选择合适的 API

| API | 何时使用 | 自动重试 | 结果 |
|---|---|---|---|
| `driver.executeQuery()` | 大多数查询的默认选择 | ✅ | 立即（全部记录） |
| `session.executeRead/Write()` | 大结果集、流式、单事务多查询 | ✅ | 惰性流 |
| `session.run()` | `LOAD CSV`、`CALL IN TRANSACTIONS`、脚本 | ❌ | 惰性流 |

---

## `executeQuery` —— 默认

```javascript
const { records, summary, keys } = await driver.executeQuery(
  'MATCH (p:Person {name: $name})-[:KNOWS]->(f) RETURN f.name AS name',
  { name: 'Alice' },
  { database: 'neo4j', routing: neo4j.routing.READ }
)
for (const record of records) {
  console.log(record.get('name'))   // use .get() — records are NOT plain objects
}

// Write and count results
const { summary: s } = await driver.executeQuery(
  'CREATE (p:Person {name: $name, age: $age})',
  { name: 'Bob', age: neo4j.int(30) },
  { database: 'neo4j' }
)
console.log(s.counters.updates().nodesCreated)   // ✅ must call .updates()
```

始终指定 `database` —— 省略会导致额外一次往返。

**❌ 切勿用模板字符串构造 Cypher：**
```javascript
// ❌ injection risk + disables plan caching
await driver.executeQuery(`MATCH (p:Person {name: '${name}'}) RETURN p`)
// ✅ parameterised
await driver.executeQuery('MATCH (p:Person {name: $name}) RETURN p', { name })
```

---

## 托管事务（`executeRead` / `executeWrite`）

瞬时故障时自动重试。**在回调内消费记录 —— 回调返回后流就不复存在了。**

```javascript
const session = driver.session({ database: 'neo4j' })
try {
  const names = await session.executeRead(async tx => {
    const result = await tx.run(
      'MATCH (p:Person) WHERE p.name STARTS WITH $prefix RETURN p.name AS name',
      { prefix: 'Al' }
    )
    // ✅ collect() while tx is open; return plain data
    return (await result.collect()).map(r => r.get('name'))
  })

  await session.executeWrite(async tx => {
    await tx.run('MERGE (p:Person {name: $name})', { name: 'Carol' })
  })
} finally {
  await session.close()   // always in finally
}
```

**关键：`await tx.run()` 返回的是流句柄，而不是记录。**
```javascript
// ❌ returns stream; tx closes; records = []
return await tx.run('MATCH (p:Person) RETURN p.name AS name')

// ✅ collect fully inside callback
const result = await tx.run('MATCH (p:Person) RETURN p.name AS name')
return (await result.collect()).map(r => r.get('name'))

// ✅ or stream with for-await
for await (const record of result) { names.push(record.get('name')) }
```

**回调可能执行不止一次**（瞬时故障时重试）—— 内部不要有副作用：
```javascript
// ❌ fetch() called on every retry
await session.executeWrite(async tx => {
  await fetch('https://api.example.com/notify')
  await tx.run('CREATE ...')
})
// ✅ side effects after confirmed commit
await session.executeWrite(async tx => { await tx.run('MERGE ...') })
await fetch('https://api.example.com/notify')
```

---

## `session.run` —— 隐式事务

不会自动重试。仅用于 `LOAD CSV` / `CALL IN TRANSACTIONS` / 脚本。

```javascript
const session = driver.session({ database: 'neo4j' })
try {
  const result = await session.run('CREATE (p:Person {name: $name}) RETURN p', { name: 'Alice' })
  console.log(result.summary.counters.updates().nodesCreated)
} finally {
  await session.close()
}
```

---

## 关闭会话 —— 始终放在 `finally`

```javascript
// ❌ session leaks if executeRead rejects
session.executeRead(async tx => { ... })
  .then(result => doSomething(result))
  .then(() => session.close())

// ✅ guaranteed close
try {
  const result = await session.executeRead(async tx => { ... })
  doSomething(result)
} finally {
  await session.close()
}

// ✅ promise-chain equivalent
session.executeRead(async tx => { ... })
  .then(doSomething)
  .catch(handleError)
  .finally(() => session.close())
```

---

## Integer 处理

Neo4j 整数是 64 位；JS `Number` 是 IEEE 754（安全范围到 2^53−1）。驱动默认返回自定义 `Integer`。

**三种模式：**
```javascript
// Mode 1 (default): Integer class — safe for all values, requires conversion
const driver1 = neo4j.driver(URI, auth)
// record.get('count') → Integer { low: 42, high: 0 }

// Mode 2: native JS number — only safe within Number.MAX_SAFE_INTEGER
const driver2 = neo4j.driver(URI, auth, { disableLosslessIntegers: true })
// record.get('count') → 42

// Mode 3: BigInt — precise but breaks JSON.stringify
const driver3 = neo4j.driver(URI, auth, { useBigInt: true })
// record.get('count') → 42n
```

**使用 Integer 类：**
```javascript
const count = record.get('count')        // Integer { low: 42, high: 0 }
neo4j.isInt(count)                       // true
neo4j.integer.inSafeRange(count)         // check before toNumber()
count.toNumber()                         // 42  (only safe within MAX_SAFE_INTEGER)
count.toString()                         // '42' (always safe)
count.toBigInt()                         // 42n

// Send integer parameter — plain JS number sends as FLOAT
await driver.executeQuery('CREATE (p:Person {age: $age})', { age: neo4j.int(30) })
```

**JSON 序列化陷阱：**
```javascript
// ❌ Integer → {"low":42,"high":0}
JSON.stringify({ age: record.get('age') })
// ❌ BigInt → TypeError: Do not know how to serialize a BigInt
// ✅ convert first
JSON.stringify({ age: record.get('age').toNumber() })
// ✅ or use disableLosslessIntegers: true
// ❌ temporal types → {} silently
JSON.stringify({ dt: record.get('created') })
// ✅
JSON.stringify({ dt: record.get('created').toString() })
```

---

## 记录访问

记录**不是普通对象** —— 使用 `.get()`：

```javascript
const record = records[0]
record.get('name')    // ✅ by key
record.get(0)         // ✅ by index
record.keys           // ['name', 'age']
record.has('name')    // true
record.name           // ❌ undefined
record['name']        // ❌ undefined
```

`record.toObject()` 返回普通 JS 键，**但值仍是驱动类型**（Integer、时间类型）。未经转换不是 JSON 安全的。

---

## 错误处理

```javascript
import { Neo4jError, SERVICE_UNAVAILABLE, SESSION_EXPIRED } from 'neo4j-driver'

try {
  await driver.executeQuery('...', {}, { database: 'neo4j' })
} catch (err) {
  if (err instanceof Neo4jError) {
    if (err.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') { /* unique constraint */ }
    if (err.code === SERVICE_UNAVAILABLE) { /* unreachable */ }
    if (err.code === SESSION_EXPIRED)     { /* open a new session */ }
    if (err.retriable) { /* transient — executeQuery already retried to exhaustion */ }
  }
}
```

`executeQuery` 和 `executeRead/Write` 会自动重试可重试错误。`session.run` 不会。

---

## TypeScript

```typescript
import neo4j, { Driver, Session, ManagedTransaction, Record, Node, Integer } from 'neo4j-driver'

const driver: Driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
const session: Session = driver.session({ database: 'neo4j' })

const names: string[] = await session.executeRead(
  async (tx: ManagedTransaction): Promise<string[]> => {
    const result = await tx.run('MATCH (p:Person) RETURN p.name AS name')
    return (await result.collect()).map((r: Record) => r.get('name') as string)
  }
)

// Typed node — Integer generic changes with disableLosslessIntegers
const node = record.get('p') as Node<Integer>
const age: number = node.properties.age.toNumber()
// With disableLosslessIntegers: true → Node<number>; age is already number
```

---

## 用 UNWIND 批量写入

```javascript
// ❌ one transaction per item
for (const p of people) { await driver.executeQuery('CREATE ...', p) }

// ✅ single transaction
await driver.executeQuery(
  `UNWIND $people AS person
   MERGE (p:Person {name: person.name})
   SET p.age = person.age`,
  { people },   // array of plain objects; numeric fields must be JS numbers, not neo4j.int()
  { database: 'neo4j' }
)
```

---

## 常见错误

| 错误 | 修复 |
|---|---|
| 模板字符串构造 Cypher | 使用 `$param` 占位符 |
| `record.name` / `record['name']` | `record.get('name')` |
| 对 Integer 调用 `JSON.stringify` | `.toNumber()` 或 `disableLosslessIntegers` |
| 对时间类型调用 `JSON.stringify` | 先 `.toString()` |
| `summary.counters.nodesCreated` | `summary.counters.updates().nodesCreated` |
| 省略 `database` | 始终 `{ database: 'neo4j' }` |
| 从事务回调返回 `result` | 返回 `await result.collect()` 或映射后的数据 |
| `.then(() => session.close())` | `try/finally { await session.close() }` |
| 事务回调内有副作用 | 移到外部 —— 回调可能重试 |
| 每个请求新建驱动 | 启动时创建一次 |
| 浏览器中使用 `bolt://` 或 `neo4j://` | 使用 `neo4j+s://`（WSS） |
| UNWIND 数组中有 Integer | 先转换为普通 JS `Number` |
| serverless 中 `maxConnectionPoolSize: 100` | 每个函数实例使用 5–10 |

---

## 参考资料

按需加载：
- [references/data-types.md](references/data-types.md) —— 完整类型映射表、时间类型、图类型（Node/Relationship/Path）、空间类型（Point/WGS-84/Cartesian）、`neo4j.UUID` [6.2+]、`toNative()` 转换辅助
- [references/advanced-patterns.md](references/advanced-patterns.md) —— 显式事务、因果一致性/书签、连接池调优、结果转换器、惰性流式、代码仓库模式
- [references/browser-usage.md](references/browser-usage.md) —— WebSocket URI、CORS、打包器配置、安全指引
- [references/rxjs-session.md](references/rxjs-session.md) —— RxJS 会话 API（`rxSession.run()`、observable 模式）
- [references/property-encryption.md](references/property-encryption.md) —— 属性加密预览 [6.3.0+]：`EnvelopeEncryptionProfile`、本地密钥封装、用户密钥代码仓库、使用 AAD 的 `driver.encryption.encrypt/decrypt`

---

## 检查清单
- [ ] 启动时创建一个驱动实例；处处共享
- [ ] 每个查询/会话都指定 `database`
- [ ] 启动时调用 `await driver.verifyConnectivity()`
- [ ] 在 `finally` 块中调用 `session.close()`
- [ ] 记录用 `.get()` 访问 —— 不用点/方括号语法
- [ ] JSON 序列化前调用 Integer 的 `.toNumber()` / `.toString()`
- [ ] JSON 序列化前调用时间类型的 `.toString()`
- [ ] 访问计数字段前调用 `summary.counters.updates()`
- [ ] 使用 `$param` 占位符 —— Cypher 中无字符串拼接
- [ ] 事务回调返回普通数据（非流）；副作用在回调外
- [ ] 写入时为整数参数使用 `neo4j.int()`
- [ ] 读取用 `executeRead`；写入用 `executeWrite`
- [ ] 浏览器：`neo4j+s://` URI（WebSocket）
