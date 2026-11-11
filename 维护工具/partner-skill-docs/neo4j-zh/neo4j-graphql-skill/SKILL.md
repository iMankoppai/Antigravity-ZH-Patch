---
name: neo4j-graphql-skill
description: 使用 @neo4j/graphql v7（当前）或 v5（LTS）构建并配置由 Neo4j 支持的 GraphQL API。
  涵盖 Neo4jGraphQL 构造函数、getSchema()、assertIndexesAndConstraints()、带 @node 的类型定义、
  @relationship（IN/OUT/UNDIRECTED）、用于自定义解析器的 @cypher、用于 JWT/JWKS
  安全的 @authorization/@authentication、自动生成的查询/变更、OGM 编程访问、通过 CDC 的订阅以及 Apollo
  Federation。适用于编写 typeDefs、保护字段或将 Neo4j 接入 Apollo Server。
  不处理解析器之外的原始 Cypher——请使用 neo4j-cypher-skill。
  不涵盖 Spring Data Neo4j 实体映射——请使用 neo4j-spring-data-skill。
version: 1.0.5
allowed-tools: Bash WebFetch
---

## 何时使用

- 使用 `@neo4j/graphql` 从 Neo4j 图 schema 创建 GraphQL API
- 编写带 `@relationship`、`@cypher`、`@authorization` 指令的类型定义
- 使用 OGM 进行服务端编程式 Neo4j 访问（绕过 GraphQL 认证）
- 配置自动生成的查询、变更、订阅
- 使用基于 JWT 或 JWKS 的 `@authorization` 规则保护类型/字段
- 从 v5/v6 迁移到 v7（下方有破坏性变更）

## 何时不使用

- **GraphQL 解析器之外的原始 Cypher 查询** → `neo4j-cypher-skill`
- **Spring Data Neo4j / Java 实体映射** → `neo4j-spring-data-skill`
- **不含 Neo4j 的通用 GraphQL**——超出范围

---

## 版本矩阵

| 版本 | 状态 | 说明 |
|---|---|---|
| v7 | 当前——使用 ≥ 7.6.2 | 需要 `@node`；移除 `options`；显式 `eq` 语法 |
| v5 | LTS——使用 ≥ 5.12.15 | 旧语法；`options: {limit, offset, sort}` 仍有效 |

默认使用 v7，除非代码库基于 v5。在发布认证功能前先升级到这些安全补丁之后：

| 修复 | 修复于 |
|---|---|
| 订阅接受来自 WebSocket `connectionParams` 的未验证 JWT（认证/授权绕过） | 7.5.6 / 5.12.14 |
| 当操作类型也具有类型级 `@authentication` 时，根自定义解析器字段上的字段级 `@authentication` 被忽略（权限提升） | 7.6.0 / 5.12.15 |
| `@authorization` 规则未在创建关系操作上应用 | 7.6.2 |

---

## 步骤 1——安装

```bash
npm install @neo4j/graphql neo4j-driver graphql @apollo/server
```

对于订阅（需要 CDC）：
```bash
npm install ws graphql-ws express body-parser cors
```

---

## 步骤 2——最小服务器设置

```javascript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Neo4jGraphQL } from '@neo4j/graphql';
import neo4j from 'neo4j-driver';

const typeDefs = `#graphql
  type Movie @node {
    id: ID! @id
    title: String!
    actors: [Person!]! @relationship(type: "ACTED_IN", direction: IN)
  }

  type Person @node {
    id: ID! @id
    name: String!
    movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT)
  }
`;

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

const neoSchema = new Neo4jGraphQL({ typeDefs, driver });

// assertIndexesAndConstraints syncs @id → UNIQUE constraints; wrap in try/catch
await neoSchema.assertIndexesAndConstraints({ options: { create: true } });

const server = new ApolloServer({ schema: await neoSchema.getSchema() });

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => ({ token: req.headers.authorization }),
  listen: { port: 4000 },
});
```

---

## 关键指令

### @node（v7 必需）

```graphql
type Product @node {
  id: ID! @id
  name: String!
}

# Custom label (default = type name)
type Article @node(labels: ["Post", "Content"]) {
  title: String!
}
```

### @relationship——完整语法

```graphql
type Person @node {
  # direction: OUT = (this)-[:KNOWS]->(other)
  friends: [Person!]! @relationship(type: "KNOWS", direction: OUT)

  # direction: IN = (other)-[:ACTED_IN]->(this)
  actedIn: [Movie!]! @relationship(type: "ACTED_IN", direction: IN)

  # direction: UNDIRECTED = matches both directions (use sparingly — double-counts)
  colleagues: [Person!]! @relationship(type: "COLLEAGUE_OF", direction: UNDIRECTED)

  # Relationship with properties — reference an @relationshipProperties interface
  reviews: [Movie!]! @relationship(type: "REVIEWED", direction: OUT, properties: "ReviewedProps")
}

interface ReviewedProps @relationshipProperties {
  rating: Int!
  date: Date
}
```

### 查询关系属性——Connection API

对于每个带 `properties:` 的关系，会自动生成一个 `{field}Connection` 字段。通过 `actorsConnection.edges.properties` 访问关系属性，而不是通过 `actors`：

```graphql
query {
  movies(where: { title: { eq: "The Matrix" } }) {
    title
    actorsConnection {
      edges {
        properties { role }   # maps to @relationshipProperties interface
        node { name }
      }
    }
  }
}
```

### @cypher——自定义解析器

```graphql
type Person @node {
  name: String!

  # columnName must exactly match the RETURN alias — mismatch returns null silently
  friendCount: Int
    @cypher(
      statement: "MATCH (this)-[:KNOWS]->(f:Person) RETURN count(f) AS friendCount"
      columnName: "friendCount"
    )

  recommendedMovies: [Movie!]!
    @cypher(
      statement: """
        MATCH (this)-[:WATCHED]->(m:Movie)<-[:WATCHED]-(o:Person)-[:WATCHED]->(rec:Movie)
        WHERE NOT (this)-[:WATCHED]->(rec)
        RETURN rec
      """
      columnName: "rec"
    )
}

# @cypher on Query field — custom top-level query
type Query {
  topRatedMovies(limit: Int = 10): [Movie!]!
    @cypher(
      statement: "MATCH (m:Movie) WHERE m.rating IS NOT NULL RETURN m ORDER BY m.rating DESC LIMIT $limit"
      columnName: "m"
    )
}
```

在字段级 @cypher 中，`this` 指当前节点。参数以 `$paramName` 传入。

### @cypher——字段参数与 extend type

```graphql
# extend type adds computed fields without modifying the base type definition
extend type Movie @node {
  avgRating: Float
    @cypher(statement: "MATCH (this)<-[r:RATED]-(:User) RETURN avg(r.rating) AS result", columnName: "result")

  # Field arguments passed as Cypher params; always provide default to avoid null
  recommended(limit: Int = 3): [Movie!]!
    @cypher(
      statement: "MATCH (this)<-[:RATED]-(u:User)-[:RATED]->(rec:Movie) WITH rec, COUNT(u) AS score ORDER BY score DESC RETURN rec LIMIT $limit"
      columnName: "rec"
    )
}
```

### @id 与 @timestamp

```graphql
type Post @node {
  id: ID! @id                          # auto-generates UUID; creates UNIQUE constraint
  createdAt: DateTime! @timestamp(operations: [CREATE])
  updatedAt: DateTime @timestamp(operations: [CREATE, UPDATE])
  title: String!
}
```

### @alias——将 GraphQL 字段映射到 Neo4j 属性

```graphql
type User @node {
  id: ID! @id
  email: String! @alias(property: "emailAddress")  # GraphQL: email → DB: emailAddress
}
```

### @fulltext 与 @vector

索引必须在使用前已存在于 Cypher 中。支持短语的 `@vector` 索引接受 `maxPhraseLength` [7.6.0] 以限制嵌入成本。缺少匹配的 `features.vector` 配置的 `provider` 会在 schema 构建时失败 [7.6.1]。完整语法、生成的查询形态、提供方配置：[references/search-directives.md](references/search-directives.md)。

---

## 安全——@authentication 与 @authorization

### 步骤 1：在构造函数中配置 JWT

```javascript
// Symmetric secret
const neoSchema = new Neo4jGraphQL({
  typeDefs,
  driver,
  features: {
    authorization: { key: process.env.JWT_SECRET },
  },
});

// JWKS endpoint (production)
const neoSchema = new Neo4jGraphQL({
  typeDefs,
  driver,
  features: {
    authorization: {
      key: { url: 'https://myapp.com/.well-known/jwks.json' },
    },
  },
});
```

### 步骤 2：在上下文中传递 token

```javascript
context: async ({ req }) => ({ token: req.headers.authorization }),
// Or pass pre-decoded JWT:
context: async ({ req }) => ({ jwt: myDecodeJwt(req.headers.authorization) }),
```

### 步骤 3：应用 @authentication 与 @authorization

```graphql
# Require auth on all operations for a type
type Post @node
  @authentication
  @authorization(filter: [{ where: { node: { author: { id: { eq: "$jwt.sub" } } } } }]) {
  title: String!
  author: User! @relationship(type: "AUTHORED", direction: IN)
}

# requireAuthentication: false = allow public access without JWT
type Article @node
  @authorization(filter: [
    { requireAuthentication: false, where: { node: { published: { eq: true } } } }
    { where: { node: { author: { id: { eq: "$jwt.sub" } } } } }
  ]) {
  title: String!
  published: Boolean!
}

# validate (throws error) vs filter (silently hides data)
type BankAccount @node
  @authorization(validate: [{
    when: [BEFORE],
    where: { node: { owner: { id: { eq: "$jwt.sub" } } } }
  }]) {
  balance: Float!
}

# Role-based with custom JWT claims
type JWT @jwt {
  roles: [String!]! @jwtClaim(path: "myApp.roles")
}

type AdminReport @node
  @authentication(operations: [READ], jwt: { roles: { includes: "admin" } }) {
  data: String!
}
```

**BEFORE 与 AFTER**：`CREATE` 仅支持 `AFTER`；`READ` 仅支持 `BEFORE`。

---

## 自动生成的操作

| 操作 | 生成的名称 | 示例 |
|---|---|---|
| 查询全部 | `{plural}` | `movies(where, sort, limit, offset)` |
| 游标分页 | `{plural}Connection` | `moviesConnection(first, after, where, sort)` |
| 创建 | `create{Plural}` | `createMovies(input: [MovieCreateInput!]!)` |
| 更新 | `update{Plural}` | `updateMovies(where, update)` |
| 删除 | `delete{Plural}` | `deleteMovies(where, delete)` |

### v7 过滤语法（显式 `eq`）

```graphql
# v7: explicit eq required
query {
  movies(where: { title: { eq: "The Matrix" } }) {
    title
    actors { name }
  }
}

# Sort and paginate (v7: direct args, not options wrapper)
query {
  movies(sort: [{ title: ASC }], limit: 10, offset: 0) {
    title
  }
}
```

### 嵌套变更

```graphql
mutation {
  createMovies(input: [{
    title: "Inception"
    actors: {
      create: [{ node: { name: "Leonardo DiCaprio" } }]
      connect: { where: { node: { name: { eq: "Joseph Gordon-Levitt" } } } }
    }
  }]) {
    movies { id title }
  }
}
```

---

## OGM——编程访问

OGM 会绕过 GraphQL 授权——仅在可信的服务端上下文中使用。

```javascript
import { OGM } from '@neo4j/graphql-ogm';

const ogm = new OGM({ typeDefs, driver });
await ogm.init();  // must await before using models

const Movie = ogm.model('Movie');

// find
const movies = await Movie.find({
  where: { title: { eq: 'The Matrix' } },
  selectionSet: `{ id title actors { name } }`,
});

// create
const { movies: created } = await Movie.create({
  input: [{ title: 'Dune', actors: { create: [{ node: { name: 'Timothée Chalamet' } }] } }],
});

// update
await Movie.update({
  where: { id: { eq: movieId } },
  update: { title: { set: 'Dune: Part One' } },
});

// delete
await Movie.delete({ where: { id: { eq: movieId } } });
```

单独安装：`npm install @neo4j/graphql-ogm`

---

## 订阅（需要 CDC）

需要在 `FULL` 模式下启用 Neo4j CDC。参见 [CDC 文档](https://neo4j.com/docs/cdc/current/)。

```javascript
const neoSchema = new Neo4jGraphQL({
  typeDefs,
  driver,
  features: { subscriptions: true },
});
```

使用 WebSocket 上下文中已验证的 `token` 对订阅进行认证；预解码的 `jwt` 仅当在服务端设置时才可信（7.5.6 / 5.12.14 起不再信任客户端提供的 `connectionParams` JWT）。

```graphql
subscription {
  movieCreated(where: { title: { eq: "The Matrix" } }) {
    createdMovie { title }
  }
}
# Also: movieUpdated, movieDeleted
```

---

## Schema 控制指令

```graphql
type ReadOnlyData @node @mutation(operations: []) { value: String! }  # disable mutations

type HeavyDoc @node {
  id: ID! @id
  content: String! @filterable(byValue: false) @sortable(enabled: false)  # perf guard
  title: String!
}

type Series @node @plural(value: "seriesList") { title: String! }  # irregular plural fix
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `Type 'X' not found` | 类型缺少 `@node`（v7） | 为每个节点类型添加 `@node` |
| `@cypher` 字段返回 null | `columnName` 与 RETURN 别名不匹配 | 使 `columnName` 与 RETURN 别名完全一致 |
| 关系方向不匹配 | 两侧声明了相同方向 | 反向：若 A 有 `direction: OUT`，B 必须有 `direction: IN` |
| `assertIndexesAndConstraints` 抛出异常 | 数据库中不存在 `@id` 约束 | 添加 `{ options: { create: true } }` 或手动运行 `CREATE CONSTRAINT` |
| 认证未应用 | JWT 不在上下文中 | 在上下文函数中传入 `token: req.headers.authorization` |
| 数据有效但 0 结果 | v7 过滤器缺少 `eq` | 使用 `{ field: { eq: value } }` 而非 `{ field: value }` |
| `connectOrCreate not found` | v7 中已移除 | 分别使用 `connect` + `create` |
| 大型变更出现内存错误 | 复杂的 Cypher 生成 | 分批变更；增大 `server.memory.heap.max_size` |
| `@subscription` 未生成 | v7 需要显式启用 | 在构造函数中添加 `features: { subscriptions: true }` |

---

## v6 → v7 破坏性变更摘要

| v6 | v7 |
|---|---|
| `@node` 可选 | 每个节点类型都必须有 `@node` |
| `options: { limit, sort }` | `limit`、`sort` 作为直接参数 |
| `{ field: value }` 过滤器 | `{ field: { eq: value } }` |
| `connectOrCreate` 嵌套变更 | 已移除——使用 `connect` + `create` |
| 查询上的 `directed` 参数 | `@relationship` 中的 `queryDirection` |
| 单关系字段 `actor: Person` | 必须使用列表 `actors: [Person!]!` |
| `@private` 指令 | 已移除 |
| `@unique` 指令 | 已移除 |

---

## 参考资料

- [Neo4j GraphQL 文档](https://neo4j.com/docs/graphql/current/)——完整指令参考、迁移指南
- [GraphAcademy：GraphQL 基础](https://graphacademy.neo4j.com/courses/graphql-basics/)——实操课程
- [GitHub：@neo4j/graphql](https://github.com/neo4j/graphql)——更新日志、issue
- [CDC 设置](https://neo4j.com/docs/cdc/current/)——订阅所需
- [references/search-directives.md](references/search-directives.md)——`@fulltext`、`@vector`、`maxPhraseLength`

---

## 检查清单

- [ ] 每个代表 Neo4j 节点的 GraphQL 类型都有 `@node`（v7 硬性要求）
- [ ] 身份字段上有 `@id`（通过 `assertIndexesAndConstraints` 触发 `CREATE CONSTRAINT`）
- [ ] 启动时以 try/catch 调用 `assertIndexesAndConstraints`
- [ ] `@relationship` 方向正确：`OUT` = 箭头离开本节点，`IN` = 箭头进入
- [ ] 关系两侧都以相反方向声明
- [ ] `@cypher` 的 `columnName` 与 RETURN 别名完全一致
- [ ] `features.authorization.key` 中有 JWT secret 或 JWKS URL；token 在上下文中传递
- [ ] 有意选择 `@authorization` filter 还是 validate（静默隐藏 vs 抛出错误）
- [ ] v7：过滤器使用显式 `{ field: { eq: value } }` 语法
- [ ] v7：`limit`/`sort` 作为直接查询参数传入（不是 `options` 包装）
- [ ] OGM：在任何 `ogm.model()` 使用前调用 `await ogm.init()`
- [ ] 订阅：启用 `features.subscriptions` 前在 FULL 模式下启用 CDC
- [ ] `@neo4j/graphql` ≥ 7.6.2（v7）或 ≥ 5.12.15（LTS）——更早版本存在认证绕过
- [ ] `.env` 保存凭据；`.env` 在 `.gitignore` 中
