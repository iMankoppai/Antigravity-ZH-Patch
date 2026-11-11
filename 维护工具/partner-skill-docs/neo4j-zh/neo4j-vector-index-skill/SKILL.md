---
name: neo4j-vector-index-skill
description: 创建和管理 Neo4j 向量索引，运行向量相似度搜索（ANN/kNN），
  在节点或关系上存储嵌入，使用 SEARCH 子句（Neo4j 2026.01+，首选）或
  db.index.vector.queryNodes() 过程（2026.04 弃用，在 2025.x 上仍可用），配置
  HNSW 和量化选项，选择相似度函数和嵌入提供方维度，以及
  批量更新嵌入。当任务涉及 CREATE VECTOR INDEX、vector.dimensions、
  cosine/euclidean 搜索、嵌入摄取流水线、语义或结构最近邻
  查找，或混合搜索（向量 + 全文、多个向量源，或图派生得分）时使用。
  不处理 GraphRAG retrieval_query 图遍历——请使用 neo4j-graphrag-skill。
  不处理仅全文/仅关键词搜索——请使用 neo4j-cypher-skill。
  不计算 GDS 图嵌入（FastRP、Node2Vec）——请使用 neo4j-gds-skill。
version: 1.0.18
compatibility: Neo4j >= 2025.01; vector SEARCH requires 2026.01+; fulltext SEARCH requires 2026.09+
allowed-tools: Bash WebFetch
---

## 何时使用
- 在节点或关系上创建向量索引（`CREATE VECTOR INDEX`）
- 运行向量相似度 / 最近邻搜索
- 在摄取期间将嵌入存储到图节点上
- 对已由 GDS 算法写入的嵌入建立索引/查询
- 选择相似度函数、维度、HNSW 参数或量化方式
- 使用 `SEARCH` 子句（2026.01+）或 `db.index.vector.queryNodes()`（2025.x）
- 模型变更后批量更新嵌入
- 将向量结果与即时图邻域相结合（完整 retrieval_query 流水线 → `neo4j-graphrag-skill`）
- 将向量结果与全文或其他排序来源相结合的混合搜索

## 何时不使用
- **GraphRAG 流水线**（VectorCypherRetriever、HybridCypherRetriever、retrieval_query）→ `neo4j-graphrag-skill`
- **仅全文 / 仅关键词搜索**（FULLTEXT INDEX、`db.index.fulltext.queryNodes`）→ `neo4j-cypher-skill`
- **计算 GDS 图嵌入**（FastRP、Node2Vec、GraphSAGE）→ `neo4j-gds-skill`
- **索引管理**（列出所有索引，删除 range/text/lookup 索引）→ `neo4j-cypher-skill`

---

## 预检 — 确定版本

```cypher
CALL dbms.components() YIELD versions RETURN versions[0] AS neo4j_version
```

| 版本 | 使用 |
|---|---|
| `2026.01` 或更高 | `SEARCH` 子句（索引内过滤，首选） |
| `2025.x` | `db.index.vector.queryNodes()` 过程（**2026.04 弃用** — 在 2026.x 上请使用 `SEARCH`） |
| Aura 上的 `5.27` | Aura 在 2026.12 LTS 之前无论引擎如何都报告 `5.27`（之后改用日历版本号）——Aura 运行最新的 2026.x → 使用 `SEARCH` |

---

## 步骤 1 — 创建向量索引

节点索引（单标签）：
```cypher
CYPHER 25
CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
FOR (c:Chunk) ON (c.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine',
    `vector.quantization.type`: 'SCALAR',
    `vector.hnsw.m`: 16,
    `vector.hnsw.ef_construction`: 100
  }
}
```

带**可过滤属性**的节点索引 [2026.01+]——`WITH` 声明哪些属性可用于 `SEARCH ... WHERE`：
```cypher
CYPHER 25
CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
FOR (c:Chunk) ON (c.embedding)
WITH [c.source, c.lang, c.published_year]  // stored as metadata; filterable in SEARCH WHERE
OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine' } }
```

带可过滤属性的多标签索引 [2026.01+]：
```cypher
CYPHER 25
CREATE VECTOR INDEX doc_embedding IF NOT EXISTS
FOR (n:Document|Article) ON n.embedding
WITH [n.author, n.published_year, n.lang]
OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine' } }
```

关系索引：
```cypher
CYPHER 25
CREATE VECTOR INDEX rel_embedding IF NOT EXISTS
FOR ()-[r:HAS_CHUNK]-() ON (r.embedding)
OPTIONS { indexConfig: { `vector.dimensions`: 768, `vector.similarity_function`: 'cosine' } }
```

**`WITH` 属性类型**——仅允许标量类型：`INTEGER`、`FLOAT`、`STRING`、`BOOLEAN`、`DATE`、`ZONED DATETIME`、`LOCAL DATETIME`、`ZONED TIME`、`LOCAL TIME`、`DURATION`。不允许：`LIST`、`POINT`，或向量属性本身。

**索引配置参考：**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `vector.dimensions` | INTEGER 1–4096 | none | 必需；必须与嵌入模型完全匹配 |
| `vector.similarity_function` | STRING | `'cosine'` | `'cosine'` 或 `'euclidean'` |
| `vector.quantization.type` | STRING | `'binary'`（2026.08 之前为 `'scalar'`） | `'none'`、`'scalar'`、`'binary'` [2026.06+，2026.07 GA]；减少存储；binary 最小（每维 1 bit），最激进；需要 vector-2.0+（5.18+）；显式设置以获得与版本无关的行为 |
| `vector.quantization.enabled` | BOOLEAN | `true` | **2026.06 弃用** — 请使用 `vector.quantization.type`；在 2026.07 之前，`false` 但未配合 `vector.quantization.type: 'none'` 会导致索引创建失败 |
| `vector.default_search_expansion_factor` | FLOAT 1.0–10000.0 | `1.0` none / `1.5` scalar / `3.0` binary（2026.07 之前为 `2.0`） | [2026.06+，2026.07 GA]；量化向量上取值 >1.0 会启用使用全精度向量的自动重打分（High-Fidelity Quantized 搜索，HFQ）；不能在查询时设置；已有索引在重建之前保留其存储的取值 |
| `vector.hnsw.m` | INTEGER 1–512 | `16` | HNSW 图连接数；越高召回越好，内存越多 |
| `vector.hnsw.ef_construction` | INTEGER 1–3200 | `100` | 构建时候选数；越高召回越好，构建越慢 |

未量化的向量：单独设置 `vector.quantization.type: 'none'` 即可——在 2026.06 上，未配合它而设 `vector.quantization.enabled: false` 会报错（2026.07 修复）。

**相似度函数选择：**

| 使用场景 | 函数 |
|---|---|
| 归一化嵌入（OpenAI、Cohere、Voyage、Google） | `'cosine'` |
| 未归一化 / 原始距离重要 | `'euclidean'` |

**索引提供方** — 自动选择最新版本；在 Cypher 25 中不可指定。用 `SHOW VECTOR INDEXES YIELD name, indexProvider` 查看：

| 提供方 | 量化支持 |
|---|---|
| `vector-2026.08` | 针对 binary 的 High-Fidelity Quantized 搜索；默认 `'binary'` |
| `vector-2026.07` | 针对 scalar 和 binary 的 High-Fidelity Quantized 搜索 |
| `vector-2026.06` | scalar 和 binary；binary + 重打分所必需 |
| `vector-3.0`（2025.09+）/ `vector-2.0`（5.18+） | scalar |

更改量化类型、扩展因子或提供方需要 drop + 重建 + 重新填充。在 2026.08 之前构建且很少更新的索引：重建可获得 2026.09 的重打分 binary/scalar 加速（延迟和吞吐约 5×）。

**内存** — 向量索引文件位于 OS 文件系统缓存，而非页面缓存。请为以下内容留出 RAM：HNSW 图 ≈ 8 B × 向量数 × `vector.hnsw.m`，再加向量值（全精度 ≈ 4 B × 维度 × 向量数；scalar ÷4；binary ÷32）。仅当查询会返回或重新排序向量属性时，才为它们调整页面缓存大小。详情 → [Vector index memory configuration](https://neo4j.com/docs/operations-manual/current/performance/vector-index-memory-configuration/)。

---

## 步骤 2 — 等待索引变为 ONLINE

索引异步构建——在 ONLINE 之前不要查询：
```cypher
SHOW VECTOR INDEXES YIELD name, state, populationPercent
WHERE name = 'chunk_embedding'
RETURN name, state, populationPercent
```

每 5 秒轮询一次，直到 `state = 'ONLINE'` 且 `populationPercent = 100.0`。如果 `state = 'FAILED'` → 停止，检查日志。

Shell 轮询（cypher-shell）：
```bash
until cypher-shell -u neo4j -p "$NEO4J_PASSWORD" \
  "SHOW VECTOR INDEXES YIELD name, state WHERE name='chunk_embedding' RETURN state" \
  | grep -q ONLINE; do
  sleep 5
done
```

---

## 步骤 3 — 摄取嵌入

批量 UNWIND 模式（用于 > 100 个节点——切勿每个节点一个事务）：
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(uri, auth=(user, password))

def embed_batch(texts: list[str]) -> list[list[float]]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small", input=texts
    )
    return [r.embedding for r in response.data]

def store_embeddings(records: list[dict], batch_size: int = 500):
    expected_dim = 1536  # must match vector.dimensions
    texts = [r["text"] for r in records]
    embeddings = embed_batch(texts)
    for emb in embeddings:
        assert len(emb) == expected_dim, f"Dim mismatch: {len(emb)} != {expected_dim}"
    rows = [{"id": r["id"], "embedding": emb}
            for r, emb in zip(records, embeddings)]
    for i in range(0, len(rows), batch_size):
        driver.execute_query(
            "UNWIND $rows AS row MATCH (c:Chunk {id: row.id}) SET c.embedding = row.embedding",
            rows=rows[i:i+batch_size]
        )
```

❌ 切勿在嵌入已存储之后再创建索引——始终先创建索引。
✅ 创建索引 → 轮询直到 ONLINE → 摄取嵌入。

---

## 步骤 4 — 运行向量搜索

### SEARCH 子句（2026.01+，首选）

```cypher
CYPHER 25
MATCH (c:Chunk)
  SEARCH c IN (
    VECTOR INDEX chunk_embedding
    FOR $queryEmbedding
    LIMIT 10
  ) SCORE AS score
RETURN c.text, score
ORDER BY score DESC
```

带索引内过滤 [2026.01+]——属性必须在创建索引时于 `WITH` 中声明：
```cypher
// Index must have been created with: WITH [c.source, c.lang, c.published_year]
CYPHER 25
MATCH (c:Chunk)
  SEARCH c IN (
    VECTOR INDEX chunk_embedding
    FOR $queryEmbedding
    WHERE c.source = $source AND c.lang = 'en' AND c.published_year >= 2024
    LIMIT 10
  ) SCORE AS score
RETURN c.text, c.source, score
ORDER BY score DESC
```

**过滤策略 — 选择一种：**

| 策略 | 何时使用 | 权衡 |
|---|---|---|
| 索引内 `WHERE` [2026.01+] | 对预先在 `WITH` 中声明的属性做过滤；在索引设计时已知 | 快，延迟稳定；属性必须预先声明 |
| 后置过滤（MATCH + 过程） | 任意 Cypher 谓词、图遍历、OR/NOT | 完全灵活；可能先过度获取再丢弃 |
| 前置过滤（先 MATCH，再 SEARCH） | 小的已知候选集；子集内的精确最近邻 | 确定性强；在大型候选集上较慢 |

**索引内 `WHERE` 硬性限制 [2026.01+]：**
- 属性必须在创建索引时列入 `WITH [...]` — 未声明的属性会静默回退到后置过滤
- 仅 AND 谓词 — 不支持 OR、NOT、字符串运算。允许 `IN` 列表成员判断 [2026.06+]
- 仅标量类型：`INTEGER`、`FLOAT`、`STRING`、`BOOLEAN`、时间类型 — 不支持 VECTOR/LIST/POINT

### 后置过滤模式（2025.x 或任意谓词）

```cypher
CYPHER 25
CALL db.index.vector.queryNodes('chunk_embedding', 50, $queryEmbedding)
YIELD node AS c, score
WHERE c.source = $source    // post-filter: fetch more, then filter
RETURN c.text, score
ORDER BY score DESC LIMIT 10
```

关系索引过程：
```cypher
CYPHER 25
CALL db.index.vector.queryRelationships('rel_embedding', 5, $queryEmbedding)
YIELD relationship AS r, score
RETURN r.text, score
```

**SEARCH 子句硬性限制（所有版本）：**
- 索引名不能是参数（不允许 `$indexName` — 使用字面字符串）
- 绑定变量必须来自外层 MATCH 模式
- 查询向量不能引用绑定变量

---

## 步骤 5 — 与图遍历结合（简单场景）

以向量搜索作为入口点，再进行图跳转：
```cypher
CYPHER 25
MATCH (c:Chunk)
  SEARCH c IN (
    VECTOR INDEX chunk_embedding
    FOR $queryEmbedding
    LIMIT 10
  ) SCORE AS score
MATCH (c)<-[:HAS_CHUNK]-(a:Article)
OPTIONAL MATCH (a)-[:MENTIONS]->(org:Organization)
RETURN c.text, a.title, score, collect(DISTINCT org.name) AS organizations
ORDER BY score DESC
```

对于完整的 retrieval_query 流水线、HybridCypherRetriever 或 `neo4j-graphrag` 库 → 交给 `neo4j-graphrag-skill`。

---

## 步骤 6 — 混合搜索

当单一信号遗漏有用候选时使用混合搜索：语义向量遗漏精确词项，词汇全文遗漏改写表达，结构图信号找到文本中不存在的拓扑。
常见模式是向量 + 全文，但同样的方法适用于多个向量索引、GDS 写入的嵌入、图遍历得分，或任意两种及以上排序/评分来源。
加载 [references/hybrid-search.md](references/hybrid-search.md) 并应用其中的查询形态。

规则：
- 各来源独立运行；各自按 `score DESC, stable_id ASC` 排序。
- 按排名合并，而非原始分数；全文分数和向量分数不可比较。
- 每个 `UNION ALL` 分支返回相同的列：匹配节点 + 贡献。
- 使用 `sourceK > finalK`；在最终限制之前进行合并。
- 按节点累加贡献；最终行按 `wrrf DESC, stable_id ASC` 排序。
- 用额外的 `UNION ALL` 分支和新的 `sourceWeights` 键添加更多来源。

---

## 嵌入提供方速查

| 提供方 / 模型 | 维度 | 相似度 | 说明 |
|---|---|---|---|
| OpenAI text-embedding-3-small | 1536 | cosine | 默认；可通过 `dimensions=` 参数降至 256–1536 |
| OpenAI text-embedding-3-large | 3072 | cosine | 可降至 256–3072 |
| OpenAI text-embedding-ada-002 | 1536 | cosine | 旧版；优先用 3-small |
| Cohere embed-v3（英文） | 1024 | cosine | 摄取时用 `input_type='search_document'`，查询时用 `'search_query'` |
| Voyage voyage-3-large | 1024 | cosine | 高质量；需要 `voyage-ai` 包 |
| Google text-embedding-004 | 768 | cosine | 通过 Vertex AI |
| Ollama nomic-embed-text | 768 | cosine | 本地开发/测试 |
| Ollama mxbai-embed-large | 1024 | cosine | 本地；生产质量 |

`vector.dimensions` 必须与模型输出完全匹配 — 不会自动截断。

---

## 向量函数

临时相似度计算（不用于 kNN 搜索 — 那要用索引）：
```cypher
MATCH (a:Chunk {id: $id1}), (b:Chunk {id: $id2})
RETURN vector.similarity.cosine(a.embedding, b.embedding) AS sim
// vector.similarity.euclidean(a, b) — same signature, 0–1 range

// vector_distance (2025.10+) — metrics: EUCLIDEAN, EUCLIDEAN_SQUARED, MANHATTAN, COSINE, DOT, HAMMING
// Returns distance (lower = more similar, inverse of similarity)
RETURN vector_distance(a.embedding, b.embedding, 'COSINE') AS dist

// vector_dimension_count (2025.10+)
RETURN vector_dimension_count(n.embedding) AS dims

// vector_norm (2025.20+) — metrics: EUCLIDEAN, MANHATTAN
RETURN vector_norm(n.embedding, 'EUCLIDEAN') AS norm
```

将 LIST 转换为带类型的 VECTOR：
```cypher
// vector(value, dimension, coordinateType)
// coordinateType: FLOAT64, FLOAT32, INTEGER8/16/32/64
WITH vector([1.0, 2.0, 3.0], 3, 'FLOAT32') AS v
RETURN vector_dimension_count(v)
```

---

## 索引管理

```cypher
// Show all vector indexes with config
SHOW VECTOR INDEXES YIELD name, state, populationPercent,
  labelsOrTypes, properties, indexConfig
RETURN name, state, populationPercent, labelsOrTypes, properties, indexConfig;

// Drop (node data unchanged — only index structure removed)
DROP INDEX chunk_embedding IF EXISTS;

// No ALTER VECTOR INDEX — to change dimensions or similarity function:
// 1. DROP INDEX old_index IF EXISTS
// 2. CREATE VECTOR INDEX new_index ... with new OPTIONS
// 3. Re-generate all embeddings with new model
// 4. Poll until ONLINE
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `IllegalArgumentException: Index dimension mismatch` | 存储的嵌入维度 ≠ `vector.dimensions` | 修正嵌入生成；用正确的维度 drop + 重建索引 |
| 搜索返回不完整结果 | 索引仍处于 `POPULATING` | 轮询直到 `state = 'ONLINE'` |
| `Unknown procedure db.index.vector.queryNodes` | Neo4j < 5.11 | 5.11 以下不支持向量索引；请升级 |
| `SEARCH clause not available` | Neo4j < 2026.01 | 使用 `queryNodes()` 过程 |
| `OR/NOT not allowed in SEARCH WHERE` | SEARCH 索引内过滤限制 | 将复杂谓词移到 SEARCH 之后的外层 WHERE |
| 正确的查询返回零结果 | 相似度函数错误或嵌入全为零 | 用 `vector.similarity.cosine()` 验证；检查嵌入调用是否成功 |
| 分数始终为 1.0 | 全零或相同向量 | 嵌入生成失败；在摄取前加维度断言 |
| `vector.quantization.enabled` / `.type` 选项被拒绝 | 提供方为 vector-1.0（Neo4j < 5.18） | 省略量化选项或升级到 5.18+ |
| `BINARY` 量化被拒绝 | 提供方早于 vector-2026.06 | 升级到 2026.06+；用 `SHOW VECTOR INDEXES YIELD name, indexProvider` 检查（`vector-2026.07` 增加 High-Fidelity Quantized 搜索） |

---

## 检查清单
- [ ] `vector.dimensions` 与嵌入模型输出完全匹配
- [ ] 在摄取嵌入之前创建向量索引
- [ ] 显式选择相似度函数（归一化用 `cosine`，基于距离用 `euclidean`）
- [ ] 首次查询前轮询索引至 `state = 'ONLINE'`
- [ ] 摄取前对每个嵌入验证维度
- [ ] 在 Neo4j >= 2026.01 上使用 `SEARCH` 子句（首选）；仅在 2025.x 上回退到过程（2026.04 弃用）
- [ ] SEARCH `WHERE` 使用仅有 AND 的谓词和标量类型
- [ ] 对 > 100 个节点使用批量 UNWIND 模式
- [ ] 若模型变更：drop 索引 → 用新维度重建 → 重新生成所有嵌入

---

## Cypher 内嵌生成 — ai.text.embed() [2025.12]

```cypher
// Syntax (requires CYPHER 25)
CYPHER 25
// ai.text.embed(resource :: STRING, provider :: STRING, configuration :: MAP) :: VECTOR
```

提供方字符串为小写（`'openai'`、`'vertexai'`、`'bedrock-titan'`、`'azure-openai'`）。完整提供方配置 → `neo4j-genai-plugin-skill`。

完整查询模式——查询时生成嵌入，立即搜索（2025.x 的过程回退）：
```cypher
CYPHER 25
WITH ai.text.embed(
    "What are good open source projects",
    "openai",
    { token: $openaiKey, model: 'text-embedding-3-small' }) AS userEmbedding
CALL db.index.vector.queryNodes('chunk_embedding', 6, userEmbedding)  // deprecated 2026.04
YIELD node AS c, score
RETURN c.text, score
ORDER BY score DESC
```

使用 SEARCH 子句（2026.01+）：
```cypher
CYPHER 25
WITH ai.text.embed("my query", "openai", { token: $openaiKey, model: 'text-embedding-3-small' }) AS userEmbedding
MATCH (c:Chunk)
  SEARCH c IN (VECTOR INDEX chunk_embedding FOR userEmbedding LIMIT 6) SCORE AS score
RETURN c.text, score
ORDER BY score DESC
```

切勿将 API 密钥作为字符串字面量传入——使用 `$openaiKey` 参数（通过驱动参数注入）或 `apoc.static.get()`。

**规则**：摄取时和查询时使用相同的模型 — 不同模型的嵌入不可比较。

**已弃用**（仍可用，但不要在新代码中使用）：
- `genai.vector.encode()` [已弃用] → 使用 `ai.text.embed()` [2025.12]
- `genai.vector.encodeBatch()` [已弃用] → 使用 `CALL ai.text.embedBatch()` [2025.12]
- `genai.vector.listEncodingProviders()` [已弃用] → 使用 `CALL ai.text.embed.providers()` [2025.12]

完整的 `ai.text.*` 参考（补全、结构化输出、对话、分词）→ `neo4j-genai-plugin-skill`。

---

## 基于 Cypher 的嵌入摄取 — db.create.setNodeVectorProperty

通过 Cypher 设置向量属性（例如在 LOAD CSV 或 MERGE 流水线中）：
```cypher
LOAD CSV WITH HEADERS FROM 'https://example.com/data.csv' AS row
MERGE (q:Question {text: row.question})
WITH q, row
CALL db.create.setNodeVectorProperty(q, 'embedding', apoc.convert.fromJsonList(row.question_embedding))
```

`apoc.convert.fromJsonList()` 将 `"[0.1,0.2,...]"` STRING 转换为 `LIST<FLOAT>`。Python 生成的嵌入 → 使用 UNWIND 批量模式（步骤 3）。

---

## 相似度函数 — 扩展指引

**根据训练损失函数选择：**
- 查看嵌入模型文档——用 cosine 损失训练的模型 → 使用 `'cosine'`
- 用 L2/Euclidean 损失训练的模型 → 使用 `'euclidean'`
- 当文档未说明时：默认 `'cosine'`（所有主流托管 API 都用它）

**常见陷阱 — 相似度函数错误：**
```
❌ Created index with 'euclidean' but model outputs L2-normalized vectors
   → scores are mathematically correct but rankings differ from expected cosine order
   → no error thrown; wrong results silently returned
✅ Verify: run vector.similarity.cosine(a.embedding, b.embedding) manually on known
   similar pairs — score should be > 0.9 for near-duplicate text
```

**索引创建后的健全性检查查询：**
```cypher
MATCH (c:Chunk) WITH c LIMIT 2
WITH collect(c) AS nodes
RETURN vector.similarity.cosine(nodes[0].embedding, nodes[1].embedding) AS cosine_check,
       vector.similarity.euclidean(nodes[0].embedding, nodes[1].embedding) AS euclidean_check
```
如果两者都返回 `null` → 嵌入未设置。如果 cosine 返回 `1.0` → 向量相同（嵌入调用失败）。

---

## 陷阱 — 扩展

| 陷阱 | 详情 | 修复 |
|---|---|---|
| 摄取时索引不在 ONLINE | 在索引存在之前插入节点是合法的——索引会自动填充。但在 `POPULATING` 期间查询会返回部分结果 | 首次查询前始终轮询 `state = 'ONLINE'` |
| 维度错误——静默失败 | 存储的向量维度 ≠ `vector.dimensions` → 在查询时（而非摄取时）抛 `IllegalArgumentException` | 在每次 `SET c.embedding` 之前断言 `len(emb) == expected_dim` |
| 摄取与查询使用不同模型 | 无报错；对明显相似的文本 cosine 分数仅 ~0.3–0.5 | 两者使用相同的模型字符串/版本；将模型名存为节点元数据 |
| 查询时缺少模型 | 提供方配置错误时 `ai.text.embed` 会静默返回 `null` | 单独测试 encode 调用；在嵌入到流水线前先检查 `CYPHER 25 RETURN ai.text.embed(...)` |
| 单个大事务摄取 | 1 万个节点一个事务 → OOM 或超时 | 使用 `UNWIND $rows ... CALL IN TRANSACTIONS OF 500 ROWS` 或 Python 批量循环 |
| 未设置分块重叠 | 相邻分块无重叠 → 边界处上下文丢失 → 跨段落查询召回差 | 设置 `chunk_overlap` ≥ `chunk_size` 的 10% |

---

## 参考资料
按需加载：
- [Hybrid search](references/hybrid-search.md) - 用 WRRF/RRF 结合语义、词汇、结构或其他排序来源
- [Vector index docs](https://neo4j.com/docs/cypher-manual/25/indexes/semantic-indexes/vector-indexes/)
- [SEARCH clause docs](https://neo4j.com/docs/cypher-manual/25/clauses/search/)
- [Vector functions docs](https://neo4j.com/docs/cypher-manual/25/functions/vector/)
- [ai.text.embed() / GenAI plugin docs](https://neo4j.com/docs/genai/plugin/current/) [2025.12] — 取代已弃用的 `genai.vector.encode()`
- [db.create.setNodeVectorProperty docs](https://neo4j.com/docs/operations-manual/current/reference/procedures/)
- [Chunking strategy, batch embed+store, splitter patterns](../neo4j-document-import-skill/SKILL.md) — 见 document import skill
- [Vector search with filters — 2026.01 preview](https://neo4j.com/blog/genai/vector-search-with-filters-in-neo4j-v2026-01-preview/)
