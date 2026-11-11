---
name: neo4j-genai-plugin-skill
description: 使用 Neo4j GenAI 插件的 ai.text.* 函数和过程，在 Cypher 内完成
  嵌入生成、文本补全、结构化输出、聊天、分词以及批量导入。涵盖 ai.text.embed()、ai.text.embedBatch()、ai.text.completion()、
  ai.text.structuredCompletion()、ai.text.aggregateCompletion()、ai.text.chat()、
  ai.text.tokenCount()、ai.text.chunkByTokenLimit()，以及针对
  OpenAI、Azure OpenAI、VertexAI 和 Amazon Bedrock 的提供方配置。需要 CYPHER 25。替代
  已弃用的 genai.vector.encode()。适用于编写纯 Cypher GraphRAG、在图内嵌入
  节点、从提示生成结构化映射，或在
  Cypher 查询内调用 LLM。不处理 neo4j-graphrag Python 库流水线——请使用
  neo4j-graphrag-skill。不处理向量索引创建/搜索——请使用
  neo4j-vector-index-skill。
version: 1.0.7
status: active
allowed-tools: Bash WebFetch
---

## 何时使用
- 在 Cypher 内生成嵌入，无需外部 Python（`ai.text.embed()`）
- 在导入期间批量嵌入节点/分块（`ai.text.embedBatch()`）
- 在 Cypher 中直接调用 LLM 进行补全或 GraphRAG（`ai.text.completion()`）
- 在 Cypher 内从 LLM 提取结构化 JSON 映射（`ai.text.structuredCompletion()`）
- 对分组行聚合 LLM 摘要（`ai.text.aggregateCompletion()`）
- 在 Cypher 中进行有状态聊天会话（`ai.text.chat()`）
- 统计 token 数量或按 token 上限切分文本（`ai.text.tokenCount()`、`ai.text.chunkByTokenLimit()`）

## 何时不使用
- **基于 Python 的 GraphRAG 流水线**（VectorCypherRetriever、HybridCypherRetriever）→ `neo4j-graphrag-skill`
- **向量索引 CREATE / kNN 搜索 / SEARCH 子句** → `neo4j-vector-index-skill`
- **GDS 嵌入**（FastRP、Node2Vec）→ `neo4j-gds-skill`
- **全文/关键词搜索** → `neo4j-cypher-skill`

---

## 前置条件

所有 `ai.*` 函数**需要 CYPHER 25**。有两种启用方式：

```cypher
// Per-query prefix (self-managed, no admin rights needed):
CYPHER 25 MATCH (n:Chunk) ...

// Per-database default (admin; applies to all sessions):
ALTER DATABASE neo4j SET DEFAULT LANGUAGE CYPHER 25
```

**安装：**
- **Aura**：GenAI 插件默认启用——无需操作
- **自管理 JAR**：将插件 JAR 复制到 `plugins/` 目录
- **Docker**：`--env NEO4J_PLUGINS='["genai"]'`

---

## 提供方配置速查

所有 `ai.text.*` 函数都接受 `configuration :: MAP` 作为最后一个参数。

| 提供方字符串 | 必需键 | 说明 |
|---|---|---|
| `'openai'` | `token`、`model` | `token` = OpenAI API key |
| `'azure-openai'` | `token`、`resource`、`model` | `token` = OAuth2 bearer；`resource` = Azure 资源名 |
| `'vertexai'` | `model`、`project`、`region`、`token` 或 `apiKey` | `publisher` 默认为 `'google'` |
| `'bedrock-titan'` | `model`、`region`、`accessKeyId`、`secretAccessKey` | 仅嵌入 |
| `'bedrock-nova'` | `model`、`region`、`accessKeyId`、`secretAccessKey` | 仅补全 |

所有提供方可选：`vendorOptions :: MAP` 传递提供方特定的额外参数（例如 OpenAI 的 `{ dimensions: 1024 }`）。

❌ 切勿硬编码 API key 字面量。✅ 始终使用通过驱动参数字典传入的 `$param`。

完整提供方配置表 → [references/providers.md](references/providers.md)

---

## 嵌入

### 单条嵌入 [2025.11]

```cypher
CYPHER 25
MATCH (c:Chunk)
WHERE c.embedding IS NULL
WITH c
CALL {
  WITH c
  SET c.embedding = ai.text.embed(c.text, 'openai', {
    token: $openaiKey,
    model: 'text-embedding-3-small'
  })
} IN TRANSACTIONS OF 500 ROWS
```

`ai.text.embed()` 返回 `VECTOR`——可直接存储并在向量索引中查询。

### 批量嵌入过程 [2025.11]

```cypher
CYPHER 25
MATCH (c:Chunk) WHERE c.embedding IS NULL
WITH collect(c) AS chunks
UNWIND chunks AS c
WITH c.text AS text, c AS node
CALL ai.text.embedBatch(text, 'openai', { token: $openaiKey, model: 'text-embedding-3-small' })
YIELD index, resource, vector
MATCH (c:Chunk {text: resource})
SET c.embedding = vector
```

过程签名：`CALL ai.text.embedBatch(resource, provider, config) YIELD index, resource, vector`

### 列出已配置的嵌入提供方

```cypher
CYPHER 25
CALL ai.text.embed.providers()
YIELD name, requiredConfigType, optionalConfigType, defaultConfig
RETURN name, requiredConfigType
```

---

## 文本补全 [2025.11]

```cypher
CYPHER 25
RETURN ai.text.completion(
  'Summarize: ' + $text,
  'openai',
  { token: $openaiKey, model: 'gpt-4o-mini' }
) AS summary
```

返回 `STRING`。

### 聚合补全——跨行摘要 [2026.03]

```cypher
CYPHER 25
MATCH (c:Chunk)-[:PART_OF]->(a:Article {id: $articleId})
RETURN ai.text.aggregateCompletion(
  c.text,
  'Summarize the following article chunks in 3 sentences',
  'openai',
  { token: $openaiKey, model: 'gpt-4o-mini' }
) AS summary
```

`value` 参数 = 每行传给 LLM 的 STRING。对非字符串值使用 `toString()`。

---

## 纯 Cypher GraphRAG 模式

嵌入问题 → 向量搜索 → 图遍历 → LLM 补全——全部在一个 Cypher 查询中完成：

```cypher
CYPHER 25
WITH ai.text.embed($question, 'openai', { token: $openaiKey, model: 'text-embedding-3-small' }) AS qEmbedding
MATCH (chunk:Chunk)
  SEARCH chunk IN (VECTOR INDEX chunk_embedding FOR qEmbedding LIMIT 10) SCORE AS score
// SEARCH preferred on 2026.x; db.index.vector.queryNodes() deprecated 2026.04 — SEARCH syntax → neo4j-vector-index-skill
MATCH (chunk)<-[:HAS_CHUNK]-(article:Article)
OPTIONAL MATCH path = shortestPath((article)-[*..3]-(other:Article))
WITH chunk, article, collect(DISTINCT other.title) AS related, score
ORDER BY score DESC LIMIT 5
WITH collect(chunk.text + '\n[Source: ' + article.title + ']') AS context, $question AS question
RETURN ai.text.completion(
  'Answer based on context:\n' + reduce(s='', c IN context | s + c + '\n') + '\nQuestion: ' + question,
  'openai',
  { token: $openaiKey, model: 'gpt-4o-mini' }
) AS answer
```

关键要点（Bergman）：种子节点之间的最短路径能揭示仅凭直接邻居无法看到的关系。

---

## 结构化输出 [2026.02]

返回 `MAP`——可直接存储为节点属性或在 Cypher 下游使用。

```cypher
CYPHER 25
MATCH (p:Product {id: $productId})
WITH p,
  ai.text.structuredCompletion(
    'Extract key attributes from: ' + p.description,
    {
      type: 'object',
      properties: {
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        priceRange: { type: 'string', enum: ['budget', 'mid', 'premium'] }
      },
      required: ['category', 'tags', 'priceRange'],
      additionalProperties: false
    },
    'openai',
    { token: $openaiKey, model: 'gpt-4o-mini' }
  ) AS extracted
SET p.category = extracted.category,
    p.priceRange = extracted.priceRange
WITH p, extracted.tags AS tags
UNWIND tags AS tag
MERGE (t:Tag {name: tag})
MERGE (p)-[:TAGGED]->(t)
```

### 聚合结构化补全——跨多行提取 [2026.03]

```cypher
CYPHER 25
MATCH (:User {id: $userId})-[:ORDERED]->(o:Order)-[:CONTAINS]->(p:Product)
RETURN ai.text.aggregateStructuredCompletion(
  p.name + ': ' + p.category,
  'Build a shopping profile for this user',
  {
    type: 'object',
    properties: {
      preferredCategories: { type: 'array', items: { type: 'string' } },
      spendingTier: { type: 'string', enum: ['economy', 'standard', 'premium'] }
    },
    required: ['preferredCategories', 'spendingTier']
  },
  'openai',
  { token: $openaiKey, model: 'gpt-4o-mini' }
) AS profile
```

---

## 聊天 [2025.12]

支持的提供方：仅 `openai` 和 `azure-openai`。

```cypher
// Start new conversation (chatId = null → new session)
CYPHER 25
WITH ai.text.chat(
  'Hello, who are you?',
  null,
  'openai',
  { token: $openaiKey, model: 'gpt-4o-mini' }
) AS result
RETURN result.message AS reply, result.chatId AS sessionId

// Continue conversation (pass returned chatId)
CYPHER 25
WITH ai.text.chat(
  'What did I just ask you?',
  $chatId,
  'openai',
  { token: $openaiKey, model: 'gpt-4o-mini' }
) AS result
RETURN result.message AS reply, result.chatId AS sessionId
```

返回 `MAP { message: STRING, chatId: STRING }`。存储 `chatId` 以继续会话。

---

## 分词与分块 [2026.04]

```cypher
// Count tokens before sending to LLM
CYPHER 25
RETURN ai.text.tokenCount($text, 'openai', { token: $openaiKey, model: 'gpt-4o-mini' }) AS tokenCount

// Chunk text by token limit (no external dependencies)
CYPHER 25
UNWIND ai.text.chunkByTokenLimit($longText, 512, 'gpt-4', 50) AS chunk
MERGE (c:Chunk { text: chunk })

// List providers supporting tokenCount
CYPHER 25
CALL ai.text.tokenCount.providers() YIELD name, requiredConfigType
RETURN name, requiredConfigType
```

签名：
- `ai.text.tokenCount(input, provider, configuration = {}) :: INTEGER`——提供方驱动的分词器；使用提供方配置（token/model）。`'openai'` 使用本地分词器（无 API 调用）；`'Bedrock'` 和 `'VertexAI'` 使用免费 API 调用。
- `ai.text.chunkByTokenLimit(input, limit, model = 'gpt-4', overlap = 0) :: LIST<STRING>`——基于 `model` 的本地 OpenAI 分词器；无提供方调用，无需 `token`。先按换行、再按空格、最后按 token 数切分。将 `limit` 设在提供方上限之下，为提示词开销预留空间。

`ai.text.embedBatch` [2026.04] 支持 `maxBatchSize`（配置键）以限制每次 API 请求的数据量——`'openai'` 和 `'azure-openai'` 默认为 `8192`；`'vertexai'` 无默认值（若遇到 token 上限错误请设置）。

---

## 写入关口

`SET node.embedding = ai.text.embed(...)` 和 `SET node.* = ai.text.structuredCompletion(...)` 会写入图。

批量写入前：
1. 先统计节点数：`MATCH (c:Chunk) WHERE c.embedding IS NULL RETURN count(c)`
2. 批量前用一个测试节点验证配置
3. 对超过 1000 个节点的批次使用 `CALL { ... } IN TRANSACTIONS OF 500 ROWS`
4. 执行前要求明确确认

---

## 已弃用——请勿使用

| 旧函数 | 替代 |
|---|---|
| `genai.vector.encode()` [已弃用] | `ai.text.embed()` |
| `genai.vector.encodeBatch()` [已弃用] | `CALL ai.text.embedBatch()` |
| `genai.vector.listEncodingProviders()` [已弃用] | `CALL ai.text.embed.providers()` |

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `Unknown function 'ai.text.embed'` | 缺少 CYPHER 25 前缀或插件未安装 | 添加 `CYPHER 25` 前缀；验证插件已安装 |
| `Cypher version not supported` | 在 Neo4j < 5.20 上使用 `CYPHER 25` 或缺少插件 | 升级 Neo4j；确保 GenAI 插件已加载 |
| `Configuration key 'token' missing` | 提供方配置映射不完整 | 检查提供方所需的键（见上表） |
| 嵌入返回 `null` | 模型名错误或提供方认证失败 | 用 `RETURN ai.text.embed('test', 'openai', {token:$k, model:'text-embedding-3-small'})` 单独测试 |
| `Unsupported provider` | 提供方字符串拼写错误（区分大小写，小写） | 使用 `'openai'` 而非 `'OpenAI'`；运行 `CALL ai.text.embed.providers()` |
| `ai.text.chat` 在 VertexAI 上失败 | 聊天仅在 openai/azure-openai 上支持 | 聊天请切换至 openai/azure-openai |

---

## 检查清单
- [ ] 每个 ai.text.* 查询都带有 `CYPHER 25` 前缀
- [ ] 已安装 GenAI 插件（Aura：自动；自管理：JAR 位于 plugins/）
- [ ] API key 以 `$param` 传入，绝不用字面量字符串
- [ ] 配置中显式指定 `model` 键（无隐式默认）
- [ ] 提供方字符串小写（`'openai'`、`'vertexai'`、`'bedrock-titan'`）
- [ ] 批量写入使用 `IN TRANSACTIONS OF 500 ROWS`；先统计目标节点数
- [ ] 以 `ai.text.embed()` 替代 `genai.vector.encode()` [2025.11+]
- [ ] 聊天会话：存储返回的 `chatId` 以便继续；仅支持 openai/azure-openai
- [ ] 结构化输出 schema 使用 `additionalProperties: false` 以防止幻觉键

---

## 参考资料
- [完整提供方配置](references/providers.md)——每个提供方的所有必需/可选键
- [官方文档](https://neo4j.com/docs/genai/plugin/current/)
- [API 参考](https://neo4j.com/docs/genai/plugin/current/reference/functions-procedures/)
