---
name: neo4j-driver-python-skill
description: Neo4j Python Driver v6 —— 驱动生命周期、execute_query、托管与显式
  事务、异步（AsyncGraphDatabase）、结果处理、数据类型映射、错误处理、
  UNWIND 批处理、连接池调优，以及因果一致性。适用于编写通过 GraphDatabase.driver、
  execute_query、execute_read、execute_write、AsyncGraphDatabase、neo4j.Result 或
  RoutingControl 连接 Neo4j 的 Python 代码。自 v6 起包名为 `neo4j`（不是 neo4j-driver）。
  需要 Python >=3.10。
  不处理 Cypher 查询编写 —— 请使用 neo4j-cypher-skill。
  不涵盖驱动升级或破坏性变更 —— 请使用 neo4j-migration-skill。
  不涵盖 GraphRAG 流水线（neo4j-graphrag 包）—— 请使用 neo4j-graphrag-skill。
version: 1.0.11
allowed-tools: Bash WebFetch
---

## 何时使用
- 编写连接 Neo4j 的 Python 代码
- 设置驱动、会话、事务或异步模式
- 调试结果处理、序列化或 UNWIND 批处理
- 审查 Python 代码中的 Neo4j 驱动用法

## 何时不使用
- **编写/优化 Cypher** → `neo4j-cypher-skill`
- **驱动版本升级** → `neo4j-migration-skill`
- **GraphRAG 流水线**（`neo4j-graphrag` 包）→ `neo4j-graphrag-skill`

---

## 安装

```bash
pip install neo4j                  # package name is `neo4j`, NOT `neo4j-driver` (deprecated since v6)
pip install neo4j-rust-ext         # optional: 3–10× faster serialization, same API
```

**v6.x 需要 Python >=3.10**。支持 Python 3.14 [6.1+]。[6.2+] 支持 Pandas 3 和 PyArrow 23/24。[6.3+] 支持 PyArrow 25 和 Bolt 6.1 的 `uuid.UUID` 值；驱动创建的 SSL 上下文会遵循 `SSLKEYLOGFILE` [6.3+]。[6.4+] 支持 Python 3.15。固定 `neo4j>=6.4.1` —— 6.4.0 在连接池获取时可能无限自旋，且通过 HTTP Query API 时会对 bearer 令牌重复编码。

Neo4j 2026.08+ 的 `UUID` 属性需要 `neo4j>=6.3` 才能以 `uuid.UUID` 往返。存储 UUID 需要 block store 格式（企业版）；社区版（aligned 格式）会失败：`storing properties of type UUID is not supported in aligned store format` —— 请存储 `str(uuid)`。

---

## 环境变量

从环境变量加载连接配置 —— 切勿硬编码凭据。

```python
import os
from dotenv import load_dotenv   # pip install python-dotenv

load_dotenv(".env")   # reads NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD / NEO4J_DATABASE

URI      = os.getenv("NEO4J_URI",      "neo4j://localhost:7687")
USER     = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD", "")
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")
```

`.env` 文件格式：
```
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=secret
NEO4J_DATABASE=neo4j
```

将 `.env` 加入 `.gitignore`。若不用 `python-dotenv`，在 shell 中使用 `export` 或直接 `os.getenv`。

---

## 驱动生命周期

**每个应用创建一个 Driver**。线程安全、创建开销大。切勿每个请求创建。

```python
from neo4j import GraphDatabase

URI  = "neo4j+s://xxx.databases.neo4j.io"   # Aura
AUTH = ("neo4j", "password")

# Context manager — preferred for scripts
with GraphDatabase.driver(URI, auth=AUTH) as driver:
    driver.verify_connectivity()
    # ... work ...

# Long-lived singleton (service / web app)
driver = GraphDatabase.driver(URI, auth=AUTH)
driver.verify_connectivity()
# on shutdown:
driver.close()
```

URI 方案：

| 方案 | 用途 |
|---|---|
| `neo4j+s://` | TLS + 集群路由 —— **Aura 默认** |
| `neo4j://` | 未加密 + 集群路由 |
| `bolt+s://` | TLS，单实例 |
| `bolt://` | 未加密，单实例 |
| `https://` / `http://`（例如 `https://host:7474/`） | 用 HTTP Query API 代替 Bolt [6.4+，预览] —— `pip install "neo4j[http]"` |

认证选项：`("user", "pass")` 元组、`basic_auth()`、`bearer_auth("jwt")`、`kerberos_auth("b64")`。

HTTP Query API [6.4+，预览 —— 无 semver 保证]：每次调用都传入 `database_=` / `database=`（不解析主数据库）；仅支持 `basic`（无 realm）或 `bearer` 认证。忽略/不支持：事务元数据 + 超时、`fetch_size`（无背压）、通知过滤；`VECTOR`、`UUID`、`UnsupportedType` 无法交换。其中任何一项都需要 Bolt → 使用 `neo4j+s://` / `bolt+s://`。

---

## 选择合适的 API

| API | 何时使用 | 自动重试 | 流式 |
|---|---|---|---|
| `driver.execute_query()` | 大多数查询 —— 简单、安全的默认选择 | ✅ | ❌ 立即（eager） |
| `session.execute_read/write()` | 大结果集 / 单事务多查询 | ✅ | ✅ |
| `session.run()` | `LOAD CSV`、`CALL {} IN TRANSACTIONS`、脚本 | ⚠️ 一次性 [6.2+] | ✅ |
| `AsyncGraphDatabase` | asyncio 应用 | ✅ | ✅ |

`session.run()` 重试 [6.2+]：仅对 DBMS 标记为幂等的错误（当前为准入控制）做一次立即重试。可在驱动或会话级别用 `disable_auto_commit_retries=True` 禁用。

---

## `execute_query` —— 默认 API

```python
from neo4j import GraphDatabase, RoutingControl

# Tuple unpacking — most common
records, summary, keys = driver.execute_query(
    "MATCH (p:Person {name: $name})-[:KNOWS]->(f) RETURN f.name AS name",
    name="Alice",
    routing_=RoutingControl.READ,   # route reads to replicas
    database_="neo4j",              # always specify — saves a round-trip
)
for record in records:
    print(record["name"])
print(summary.result_available_after, "ms")

# Write — check counters
summary = driver.execute_query(
    "CREATE (p:Person {name: $name, age: $age})",
    name="Bob", age=30,
    database_="neo4j",
).summary
print(summary.counters.nodes_created)
```

**尾部下划线约定** —— 配置关键字参数以下划线 `_` 结尾（`database_`、`routing_`、`auth_`、`result_transformer_`、`bookmark_manager_`）。查询参数名不得以下划线结尾；这类参数通过 `parameters_={"key_": val}` 传入。

**切勿用 f-string 或 format 构造 Cypher。** 始终使用 `$param` —— 防止注入并启用执行计划缓存。

`result_transformer_` —— 返回前重塑结果：
```python
import neo4j
df      = driver.execute_query("MATCH (p:Person) RETURN p.name, p.age", database_="neo4j",
                                result_transformer_=neo4j.Result.to_df)
record  = driver.execute_query("MATCH (p:Person {name:$n}) RETURN p", n="Alice", database_="neo4j",
                                result_transformer_=neo4j.Result.single)   # None if 0 rows; first record + warning if 2+
```

`Result.single()` 默认 `strict=False`：**0** 行 → `None`；**2+** 行 → 首条记录 + 警告（不抛异常）。只有 `single(strict=True)` 会抛出 `ResultNotSingleError`（0 或 2+）。需要恰好一行时使用 `strict=True`，例如 `result_transformer_=lambda r: r.single(strict=True)`；否则检查是否为 `None`。

---

## 托管事务（`execute_read` / `execute_write`）

用于大结果集或单事务内多个查询。

```python
with driver.session(database="neo4j") as session:

    def get_people(tx):
        result = tx.run("MATCH (p:Person) WHERE p.name STARTS WITH $pfx RETURN p.name AS name",
                        pfx="Al")
        return [r["name"] for r in result]   # consume INSIDE callback — Result invalid after tx closes

    names = session.execute_read(get_people)

    def create_person(tx):
        tx.run("CREATE (p:Person {name: $name})", name="Carol")

    session.execute_write(create_person)
```

**结果生命周期** —— `Result` 是由打开事务支撑的惰性游标。未消费就返回会抛出 `ResultConsumedError`。始终在回调内收集为 `list`。

**回调可能重试**（瞬时失败时）—— 保持回调幂等；将副作用（HTTP 调用、邮件）移到回调外。

通过 `@unit_of_work` 设置超时/元数据（仅限具名函数 —— 不能装饰 lambda）：
```python
from neo4j import unit_of_work

@unit_of_work(timeout=5.0, metadata={"app": "svc", "user": user_id})
def get_people(tx):
    return [r["name"] for r in tx.run("MATCH (p:Person) RETURN p.name AS name")]

session.execute_read(get_people)
```

---

## 隐式事务（`session.run`）

仅用于 `LOAD CSV`、`CALL {} IN TRANSACTIONS` 或快速脚本。`session.run()` 仅对幂等（DBMS 标记的）错误做一次立即重试 [6.2+]；其他错误不重试。

```python
with driver.session(database="neo4j") as session:
    result = session.run("CREATE (p:Person {name: $name})", name="Alice")
    summary = result.consume()   # call consume() to guarantee commit before proceeding
    print(summary.counters.nodes_created)

# Opt out of one-shot retry [6.2+] — driver- or session-level
driver = GraphDatabase.driver(URI, auth=AUTH, disable_auto_commit_retries=True)
with driver.session(database="neo4j", disable_auto_commit_retries=True) as session:
    session.run("...")
```

---

## 异步 API

与同步 API 对应 —— 将 `GraphDatabase` 替换为 `AsyncGraphDatabase`，每次调用都 `await`。

```python
from neo4j import AsyncGraphDatabase
import asyncio

# Singleton — same rule as sync: never create per-request
driver = AsyncGraphDatabase.driver(URI, auth=AUTH)

async def main():
    records, _, _ = await driver.execute_query(
        "MATCH (p:Person) RETURN p.name AS name",
        database_="neo4j", routing_=RoutingControl.READ,
    )
    print([r["name"] for r in records])
    await driver.close()

asyncio.run(main())
```

FastAPI lifespan 模式：
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

_driver = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _driver
    _driver = AsyncGraphDatabase.driver(URI, auth=AUTH)
    await _driver.verify_connectivity()
    yield
    await _driver.close()

app = FastAPI(lifespan=lifespan)
```

使用 `asyncio.gather` 并行查询：
```python
results = await asyncio.gather(
    driver.execute_query("MATCH (a:Artist) RETURN a.name AS name", database_="neo4j"),
    driver.execute_query("MATCH (v:Venue)  RETURN v.name AS name",  database_="neo4j"),
)
```

**切勿在 asyncio 中使用同步 `GraphDatabase`** —— 会阻塞事件循环。

完整异步模式 → [references/async.md](references/async.md)

---

## 错误处理

```python
from neo4j.exceptions import (
    Neo4jError, ServiceUnavailable, TransientError,
    AuthError, ConstraintError,
)

try:
    driver.execute_query("...", database_="neo4j")
except AuthError:
    ...  # bad credentials
except ServiceUnavailable:
    ...  # no servers reachable
except ConstraintError as e:
    # unique/existence constraint violation — catch BEFORE Neo4jError (it's a subclass)
    print(e.code, e.message)
except TransientError as e:
    # raised only after retries exhausted (execute_query retries automatically)
    print(e.code)
except Neo4jError as e:
    print(e.code, e.message, e.gql_status)
```

在 `Neo4jError` 之前捕获 `ConstraintError` —— 它是子类，否则会被吞掉。

---

## 结果访问与空值安全

```python
record = records[0]
record["name"]               # by key — KeyError if absent
record[0]                    # by index
record.get("name")           # None for absent key OR graph null
record.get("name", "Unknown")
d = record.data()            # dict — Node → dict of properties, Relationship → tuple, Path → list; temporal values stay driver objects
```

`record.data()`：`Node` → 属性 `dict`，`Relationship` → `(start_props, type, end_props)` 元组（自身属性被丢弃），`Path` → list。`json.dumps` 能接受这些，但会丢失标签、元素 ID、关系属性。`neo4j.time.Date`/`Time`/`DateTime` 仍是驱动对象 → `json.dumps` 抛出 `TypeError`。在 Cypher 中投影所需的标量（时间类型用 `toString()`）；不要返回整个实体。

```python
# ❌ raises TypeError on json.dumps (temporal value)
records, _, _ = driver.execute_query("MATCH (p:Person) RETURN p.name AS name, p.created_at AS created_at", database_="neo4j")
json.dumps(records[0].data())

# ✅ project scalars
records, _, _ = driver.execute_query(
    "MATCH (p:Person) RETURN p.name AS name, p.age AS age, toString(p.created_at) AS created_at", database_="neo4j")
json.dumps(records[0].data())   # safe
```

Node/Relationship/时间类型访问：
```python
node = record["p"]           # neo4j.graph.Node
node.element_id              # stable within this transaction only
node.labels                  # frozenset({'Person'})
dict(node)                   # all properties as plain dict

rel  = record["r"]           # neo4j.graph.Relationship
rel.type                     # 'KNOWS'

dt = record["created_at"]    # neo4j.time.DateTime
dt.to_native()               # datetime.datetime (loses sub-µs precision)
```

完整类型映射表 → [references/data-types.md](references/data-types.md)

---

## 用 UNWIND 批量写入

传入 `list[dict]` —— 这是驱动能正确序列化给 `UNWIND` 的唯一形态。

```python
people = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
driver.execute_query(
    "UNWIND $rows AS row MERGE (p:Person {name: row.name}) SET p.age = row.age",
    rows=people,
    database_="neo4j",
)
```

自定义对象和 dataclass 在作为参数传入前必须转换为 `dict`。

---

## 性能

- 始终设置 `database_` / `database=` —— 省略会在每次调用时触发主数据库往返。
- `execute_read` 自动路由到副本；与 `execute_query` 配合时使用 `routing_=RoutingControl.READ`。
- 批量写入：整个列表用一个 `execute_write` 回调，优于每项一个事务。
- 大结果集：在 `execute_read` 回调内惰性流式；`execute_query` 始终是立即求值。

连接池调优：
```python
driver = GraphDatabase.driver(URI, auth=AUTH,
    max_connection_pool_size=50,        # default 100
    connection_acquisition_timeout=30,  # seconds to wait for free connection
    max_connection_lifetime=3600,       # seconds; recycles stale connections
    connection_timeout=15,
    keep_alive=True,
)
```

会话耗尽：每个打开的会话都会占用一个连接。始终使用 `with driver.session(...) as session`。

完整性能模式 → [references/performance.md](references/performance.md)

---

## 常见错误

| 错误 | 修复 |
|---|---|
| 用 f-string / `.format()` 构造 Cypher 参数 | 始终使用 `$param` 占位符 |
| 参数名以下划线 `_` 结尾 | 通过 `parameters_={"key_": val}` 传入 |
| 省略 `database_` | 始终设置 —— 每次调用节省一次往返 |
| 从事务回调返回 `Result` | 在回调内消费为 `list` |
| `execute_read/write` 回调内有副作用 | 移到外部 —— 回调可能重试 |
| 传 dataclass/Pydantic 作为参数 | 先转换为 `dict` |
| `UNWIND` 传对象列表 | 仅 `list[dict]` |
| 用 `record.get()` 检测键不存在 | 不存在用 `"key" in record.keys()`；`.get()` 对不存在和图 null 都返回 `None` |
| `session.run()` 后没有 `.consume()` | 提交时机不确定；调用 `.consume()` |
| 在 asyncio 内使用同步驱动 | 使用 `AsyncGraphDatabase` —— 同步会阻塞事件循环 |
| 每个请求创建异步驱动 | 单例 —— 启动时创建一次 |
| 会话泄漏 | 始终 `with driver.session(...) as session` |
| 用 `json.dumps(record.data())` 处理含时间类型的值 | 抛 `TypeError` —— 在 Cypher 中用 `toString()` 或转换。整个节点/关系能序列化但丢失标签、ID、关系属性 —— 投影标量 |
| 对 `EagerResult` 使用 `result["name"]` | 索引 `result.records[0]["name"]` 或解包 `records, _, _ = ...` |
| 假设 `Result.single()` 在 0 或 2+ 行时抛异常 | 默认 `strict=False`：`None`（0 行）或首条记录 + 警告（2+）。`single(strict=True)` 会抛出 |
| 对 lambda 使用 `@unit_of_work` | 使用具名函数 |
| 在 `ConstraintError` 之前捕获 `Neo4jError` | 先捕获 `ConstraintError` —— 它是子类 |
| 使用 `neo4j-driver` 包名 | 自 v6 起包名为 `neo4j`；`neo4j-driver` 已弃用 |

---

## 参考资料

按需加载：
- [references/async.md](references/async.md) —— 完整异步模式：托管事务、结果方法、并发
- [references/data-types.md](references/data-types.md) —— 完整的 Python↔Cypher 类型映射、时间类型转换、图对象 API、空间类型（CartesianPoint/WGS84Point）
- [references/performance.md](references/performance.md) —— 连接池、惰性流式、线程 vs asyncio、书签/因果一致性
- [references/transactions.md](references/transactions.md) —— 显式事务、回滚、提交不确定性、`unit_of_work` 细节

文档：
- https://neo4j.com/docs/python-manual/current/
- https://neo4j.com/docs/api/python-driver/current/

---

## 检查清单
- [ ] 包以 `neo4j` 安装（不是 `neo4j-driver`）
- [ ] 启动时创建一个 Driver 实例；处处共享
- [ ] 启动时调用 `verify_connectivity()`
- [ ] 每次调用都设置 `database_` / `database=`
- [ ] 使用 `$param` 占位符 —— 不用 f-string 或 `.format()`
- [ ] 在事务回调内消费结果（不原样返回）
- [ ] 会话作为上下文管理器使用（`with driver.session(...) as session`）
- [ ] 在 `Neo4jError` 之前捕获 `ConstraintError`
- [ ] asyncio 代码使用 `AsyncGraphDatabase`（非同步驱动）
- [ ] 异步驱动在应用启动时创建一次（非每请求）
- [ ] 副作用在 `execute_read/write` 回调之外
- [ ] UNWIND 批处理使用 `list[dict]`
