---
name: neo4j-graphrag-skill
description: 使用 neo4j-graphrag Python 包（v1.22.0+）在 Neo4j 上构建 GraphRAG
  检索流水线。涵盖检索器选择（VectorRetriever、HybridRetriever、
  VectorCypherRetriever、HybridCypherRetriever、Text2CypherRetriever、ToolsRetriever）、
  外部向量数据库检索器（Weaviate、Pinecone、Qdrant）、retrieval_query Cypher
  片段、query_params、filters、GraphRAG 流水线接线（GraphRAG + LLM + prompt）、
  所有 LLM 提供方（OpenAI、Anthropic、Gemini/VertexAI、Bedrock、Cohere、Mistral、Ollama）、
  embedder 设置、索引创建、token 使用量跟踪、Cypher 25 SEARCH 子句以及
  LangChain/LlamaIndex 集成。不处理 KG 构建——请使用
  neo4j-document-import-skill。不处理普通向量搜索——请使用
  neo4j-vector-index-skill。不处理 GDS 分析——请使用 neo4j-gds-skill。
  不处理代理记忆——请使用 neo4j-agent-memory-skill。
version: 1.1.2
status: active
allowed-tools: Bash WebFetch
---

# Neo4j GraphRAG 技能

## 何时使用

- 使用 `neo4j-graphrag` Python 包构建 GraphRAG 检索流水线
- 在 VectorRetriever、HybridRetriever、VectorCypherRetriever、HybridCypherRetriever 之间选择
- 编写 `retrieval_query` Cypher 片段以获取图增强上下文
- 将检索器 + LLM 接入 `GraphRAG` 流水线
- 使用 `ToolsRetriever` 进行由 LLM 路由的多检索器
- 调试检索质量偏低
- 将 Neo4j 与 LangChain、LlamaIndex 或 Haystack 集成

## 何时不使用

- **从文档构建 KG** → `neo4j-document-import-skill`
- **无图遍历的普通向量/语义搜索** → `neo4j-vector-index-skill`
- **结合向量与全文或其他排序来源的混合搜索** → `neo4j-vector-index-skill`
- **GDS 算法（PageRank、Louvain、节点嵌入）** → `neo4j-gds-skill`
- **代理长期记忆** → `neo4j-agent-memory-skill`
- **编写原始 Cypher 查询** → `neo4j-cypher-skill`

---

## 检索器选择

```
Has fulltext index?
  YES → Hybrid variants (HybridRetriever / HybridCypherRetriever)
  NO  → Vector variants (VectorRetriever / VectorCypherRetriever)

Need graph traversal after vector lookup?
  YES → Cypher variants (VectorCypherRetriever / HybridCypherRetriever)
  NO  → plain variants

Natural-language-to-Cypher?        → Text2CypherRetriever (no embedder needed)
LLM should route between retrievers? → ToolsRetriever
Vectors stored in external DB?      → WeaviateNeo4jRetriever / PineconeNeo4jRetriever / QdrantNeo4jRetriever
```

| 检索器 | 向量 | 全文 | 图 | 最适合 |
|---|:---:|:---:|:---:|---|
| `VectorRetriever` | ✓ | — | — | 基线语义搜索 |
| `HybridRetriever` | ✓ | ✓ | — | 更好召回，无图扩展 |
| `VectorCypherRetriever` | ✓ | — | ✓ | 无全文的 GraphRAG |
| `HybridCypherRetriever` | ✓ | ✓ | ✓ | **生产 GraphRAG——默认** |
| `Text2CypherRetriever` | — | — | ✓ | NL→Cypher，无 embedder |
| `ToolsRetriever` | 视情况 | 视情况 | 视情况 | LLM 路由的多检索器 |
| `WeaviateNeo4jRetriever` | ✓ | — | ✓ | 向量存于 Weaviate |
| `PineconeNeo4jRetriever` | ✓ | — | ✓ | 向量存于 Pinecone |
| `QdrantNeo4jRetriever` | ✓ | — | ✓ | 向量存于 Qdrant |

---

## 安装

```bash
pip install neo4j-graphrag[openai]        # OpenAI LLM + embeddings
pip install neo4j-graphrag[anthropic]     # Anthropic Claude
pip install neo4j-graphrag[google]        # Vertex AI / Gemini
pip install neo4j-graphrag[bedrock]       # Amazon Bedrock (boto3)
pip install neo4j-graphrag[cohere]        # Cohere
pip install neo4j-graphrag[mistralai]     # MistralAI
pip install neo4j-graphrag[ollama]        # Ollama (local)
pip install neo4j-graphrag[weaviate]      # Weaviate external retriever
pip install neo4j-graphrag[pinecone]      # Pinecone external retriever
pip install neo4j-graphrag[qdrant]        # Qdrant external retriever
```

要求：Python >= 3.10，`neo4j >= 5.17.0`（支持驱动 6.x）。

---

## 步骤 2——选择检索器

从上方[检索器选择](#检索器选择)表中选择。

对于 `neo4j-graphrag` 检索器 API 之外的自定义 Cypher 混合搜索，请使用 `neo4j-vector-index-skill`。

**向量后端选择 [v1.16+，自动]**：在 Neo4j 2026.01+ 上，当过滤器与 SEARCH 兼容（简单的 AND 比较）且所有过滤属性都已在索引的 `WITH [n.prop]` 列表中声明时，四种向量/混合检索器都会通过 Cypher 25 `SEARCH ... WHERE` 子句自动路由。`$or`、`$in`、`$like` 或未声明的属性 → 自动回退到 `db.index.vector.queryNodes()` 过程路径（带警告日志）。在 `create_vector_index()` 上通过 `filterable_properties=[...]` 声明可过滤属性。

---

## 步骤 3——创建索引（运行一次）

```cypher
// Vector index (all retrievers need this)
CREATE VECTOR INDEX chunk_embedding IF NOT EXISTS
FOR (c:Chunk) ON (c.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
} };

// Fulltext index (Hybrid retrievers only)
CREATE FULLTEXT INDEX chunk_fulltext IF NOT EXISTS
FOR (c:Chunk) ON EACH [c.text];

// Confirm ONLINE before ingesting:
SHOW INDEXES YIELD name, state
WHERE name IN ['chunk_embedding', 'chunk_fulltext']
RETURN name, state;
// Both must show state = 'ONLINE'
```

如果索引未处于 ONLINE：等待，每 5 秒轮询一次。在 ONLINE 之前不要开始导入。

---

## 步骤 4——核心模式（HybridCypherRetriever）

```python
from neo4j import GraphDatabase
from neo4j_graphrag.embeddings import OpenAIEmbeddings
from neo4j_graphrag.generation import GraphRAG
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.retrievers import HybridCypherRetriever

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
embedder = OpenAIEmbeddings(model="text-embedding-3-large")  # OPENAI_API_KEY from env

# retrieval_query: Cypher fragment executed after the vector/fulltext lookup.
# Auto-injected variables:  node  (matched node)   score  (similarity float)
# MUST include a RETURN clause.  score must appear in RETURN.
retrieval_query = """
MATCH (node)<-[:HAS_CHUNK]-(article:Article)
OPTIONAL MATCH (article)-[:MENTIONS]->(org:Organization)
RETURN node.text AS chunk_text,
       article.title AS article_title,
       collect(DISTINCT org.name) AS mentioned_organizations,
       score
"""

retriever = HybridCypherRetriever(
    driver=driver,
    vector_index_name="chunk_embedding",
    fulltext_index_name="chunk_fulltext",
    retrieval_query=retrieval_query,
    embedder=embedder,
)

llm = OpenAILLM(model_name="gpt-4.1", model_params={"temperature": 0})

rag = GraphRAG(
    retriever=retriever,
    llm=llm,
)

response = rag.search(
    query_text="Who does Alice work for?",
    retriever_config={"top_k": 5},
)
print(response.answer)
driver.close()
```

---

## VectorCypherRetriever

```python
from neo4j_graphrag.retrievers import VectorCypherRetriever

retriever = VectorCypherRetriever(
    driver=driver,
    index_name="chunk_embedding",
    retrieval_query=retrieval_query,
    embedder=embedder,
)

response = rag.search(
    query_text="What happened at Apple?",
    retriever_config={"top_k": 10},
)
```

---

## Text2CypherRetriever

使用 LLM 将自然语言转换为 Cypher。**不需要 embedder。**

> **安全（v1.16.0+）：** 每个由 LLM 生成的 Cypher 都会先经过 `EXPLAIN` 运行。
> 任何被归类为写入/破坏性的语句都会引发 `Text2CypherRetrievalError`，而不是
> 执行——以防止提示注入攻击。

```python
from neo4j_graphrag.retrievers import Text2CypherRetriever

retriever = Text2CypherRetriever(
    driver=driver,
    llm=OpenAILLM(model_name="gpt-4.1"),
    neo4j_schema=None,       # None = auto-fetch schema from DB; pass string to trim
    examples=[
        "Q: Who works at Neo4j? A: MATCH (p:Person)-[:WORKS_AT]->(c:Company {name:'Neo4j'}) RETURN p.name"
    ],
)
results = retriever.search(query_text="Which people work at Neo4j?")
```

---

## ToolsRetriever（LLM 路由的多检索器）

```python
from neo4j_graphrag.retrievers import ToolsRetriever

tools_retriever = ToolsRetriever(
    llm=llm,
    retrievers=[vector_retriever, text2cypher_retriever],
)
# LLM decides which retriever(s) to invoke per query

# Convert any retriever to a standalone Tool:
tool = vector_retriever.convert_to_tool()
```

---

## 过滤器（向量搜索前预过滤）

```python
results = retriever.search(
    query_text="quarterly earnings",
    top_k=5,
    filters={
        "date": {"$gte": "2024-01-01"},
        "source": {"$eq": "10-K"},
    },
)
# Operators: $eq  $ne  $lt  $lte  $gt  $gte  $between  $in  $like  $ilike
```

---

## query_params（参数化 retrieval_query）

```python
retrieval_query = """
MATCH (node)<-[:HAS_CHUNK]-(a:Article)-[:MENTIONS]->(org:Organization {name: $entity_name})
RETURN node.text, a.title, score
"""

# Pass via retriever.search directly:
results = retriever.search(
    query_text="What happened at Apple?",
    top_k=10,
    query_params={"entity_name": "Apple"},
)

# Or via GraphRAG.search:
response = rag.search(
    query_text="What happened at Apple?",
    retriever_config={"top_k": 10, "query_params": {"entity_name": "Apple"}},
)
```

---

## Cypher 25 SEARCH 子句（v1.16.0，Neo4j 2026.x+）

```python
# Enable SEARCH clause syntax in vector/hybrid retrievers (requires Neo4j 2026+)
retriever = VectorRetriever(
    driver=driver,
    index_name="chunk_embedding",
    embedder=embedder,
    use_search_clause=True,
)
```

自 v1.19 起，向量检索器和向量-Cypher 检索器会自动为 SEARCH 查询添加 `CYPHER 25`
前缀，并在 SEARCH 不受支持或失败时回退到基于过程的向量搜索。

---

## 组件导入（v1.19——破坏性变更，为 2.0 做准备）

所有组件都已移出 `experimental` 命名空间。旧导入仍可用，但会发出
DeprecationWarning，并将在 2.0 中移除：

```python
# v1.19+ — preferred
from neo4j_graphrag.components.text_splitters.fixed_size_splitter import FixedSizeSplitter

# deprecated (removed in 2.0)
from neo4j_graphrag.experimental.components.text_splitters.fixed_size_splitter import FixedSizeSplitter

# SimpleKGPipeline did NOT move — only valid path:
from neo4j_graphrag.experimental.pipeline.kg_builder import SimpleKGPipeline
```

`neo4j_graphrag.pipeline`（v1.21+）= 新的惰性数据流 DSL（`Pipeline`、`LocalInterpreter`、`Sink`），与 `SimpleKGPipeline` 背后的实验性任务图 `Pipeline` 无关。`neo4j_graphrag.pipeline.kg_builder` 不存在 → `ModuleNotFoundError`。

另外自 v1.19 起：`Component` / `RunContext` / `TaskProgressNotifierProtocol` 位于
`neo4j_graphrag.components.base`，格式错误的组件会引发 `ComponentDefinitionError`
（不再是 `PipelineDefinitionError`）。

---

## 数据流 Pipeline DSL + 观察器（v1.21）

惰性 `neo4j_graphrag.pipeline.Pipeline` + `LocalInterpreter(observers=[...])`；`TextSplitter.iter_chunks()`。完整 API → [references/pipeline-dsl.md](references/pipeline-dsl.md)。

---

## Cypher 检索器上的 ORDER BY（v1.16.0）

```python
results = retriever.search(
    query_text="...",
    top_k=10,
    order_by="score DESC",
)
```

如果 `neo4j_schema=None`：检索器会自动获取 schema。对于大型 schema，传入精简字符串以减小 LLM 提示词大小。

**破坏性查询防护 [v1.16+]**：`Text2CypherRetriever` 在执行前对生成的 Cypher 运行 `EXPLAIN`，并拒绝会产生写入（`CREATE`、`MERGE`、`DELETE`、`SET`、`REMOVE` 等）的查询。LLM 生成的写入绝不会针对图执行。


---

## 自定义提示词模板

```python
from neo4j_graphrag.generation.prompts import RagTemplate

template = RagTemplate(
    template="""Answer using ONLY the context below.
Context: {context}
Question: {query_text}
Answer:""",
    expected_inputs=["context", "query_text"],
)

rag = GraphRAG(retriever=retriever, llm=llm, prompt_template=template)
```

---

## return_context 与 response_fallback

```python
response = rag.search(
    query_text="...",
    retriever_config={"top_k": 5},
    return_context=True,                        # include raw retrieved chunks
    response_fallback="No relevant context.",   # skip LLM call if retriever returns nothing
)
print(response.answer)
print(response.retriever_result)    # RawSearchResult when return_context=True
```

---

## 消息历史（多轮）

```python
from neo4j_graphrag.message_history import InMemoryMessageHistory

history = InMemoryMessageHistory()
r1 = rag.search(query_text="Who is Alice?", message_history=history)
r2 = rag.search(query_text="Where does she work?", message_history=history)
```

---

## 外部检索器、LLM + Embedder 提供方

- Weaviate / Pinecone / Qdrant 构造函数 → [references/retrievers.md](references/retrievers.md#external-vector-db-retrievers)
- LLM 类（`OpenAILLM`、`AnthropicLLM`、`GeminiLLM`、`VertexAILLM`、`BedrockLLM`、……）、`base_url`、token 用量、`close()`；embedder 类 + 维度 → [references/providers.md](references/providers.md)

---

## 索引设置

```python
from neo4j_graphrag.indexes import create_vector_index

# Vector index — adjust dimensions to match your embedding model
create_vector_index(
    driver,
    name="chunk_embedding",
    label="Chunk",
    embedding_property="embedding",
    dimensions=1536,
    similarity_fn="cosine",       # or "euclidean"
)

# Fulltext index (run as Cypher)
# CREATE FULLTEXT INDEX chunk_fulltext IF NOT EXISTS
#   FOR (c:Chunk) ON EACH [c.text]
```

---

## Schema 检查

```python
from neo4j_graphrag.schema import get_schema, get_structured_schema

schema_str = get_schema(driver, sample=1000)           # human-readable string
schema_dict = get_structured_schema(driver, sample=1000)  # dict with labels/rels/props
```

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| `ModuleNotFoundError: neo4j_genai` | 旧包名 | `pip uninstall neo4j-genai && pip install neo4j-graphrag` |
| `retrieval_query` 返回 0 行 | 缺少 `MATCH` 或关系方向错误 | 对片段执行 `EXPLAIN`；检查 `CALL db.schema.visualization()` |
| 结果中出现 `KeyError: 'score'` | `retrieval_query` 的 RETURN 缺少 `score` | 在每个 `retrieval_query` 的 RETURN 子句中添加 `score` |
| 找不到 `score` 变量 | `score` 在 `retrieval_query` 中被重新声明 | 请**不要**重新声明 `score`——它是自动注入的 |
| `Text2CypherRetrievalError` | LLM 生成了写入语句 | 预期的安全行为（v1.16.0+）；优化提示词或 schema |
| `TypeError: coroutine` | 缺少 `await` / `asyncio.run()` | 包装异步调用：`asyncio.run(pipeline.run_async(...))` |
| HybridRetriever 返回空结果 | 全文索引未处于 ONLINE | `SHOW INDEXES YIELD name, state WHERE state <> 'ONLINE'` |
| `VectorCypherRetriever` + `filters` 抛出 "requires: node_label, embedding_node_property, …"（v1.19–1.22 名称不匹配 bug；已于 v1.23.0 修复） | `_fetch_index_infos` 设置 `self._embedding_node_property`，构造函数设置 `_node_embedding_property` | 升级 `neo4j-graphrag>=1.23.0`。固定 < 1.23 → 构造后打补丁：`r._node_embedding_property = r._embedding_node_property or "embedding"`；将过滤属性追加到 `r._filterable_properties` |
| 嵌入维度不匹配 | 索引维度 ≠ 模型维度 | 用正确的 `dimensions=` 值重建索引 |

---

## 验证清单

- [ ] 已安装 `neo4j-graphrag`（而非 `neo4j-genai`）；`neo4j >= 5.17.0` 驱动
- [ ] 导入嵌入或运行检索器前向量索引处于 ONLINE
- [ ] 使用混合变体时全文索引处于 ONLINE
- [ ] `create_vector_index` 中的嵌入维度与 embedder 输出匹配
- [ ] `retrieval_query` 在 RETURN 中返回 `node` 和 `score`（不重新声明）
- [ ] `query_params` 通过 `rag.search()` 上的 `retriever_config` 传入（不是在检索器构造函数上）
- [ ] API key 在环境变量中；绝不硬编码
- [ ] 完成后调用 `llm.close()` 以释放资源

---

## 参考资料

按需加载：
- [references/retrievers.md](references/retrievers.md)——各检索器构造函数参数、外部向量数据库检索器、`result_formatter`、预过滤操作符
- [references/providers.md](references/providers.md)——LLM + embedder 提供方类、extras、默认值
- [references/pipeline-dsl.md](references/pipeline-dsl.md)——数据流 `Pipeline` DSL、`Source`/`Sink`、阶段观察器 [v1.21]
- [references/kg-builder.md](references/kg-builder.md)——`SimpleKGPipeline` 构造函数、schema、切分器
- [references/knowledge-graph-construction.md](references/knowledge-graph-construction.md)——高级 KG 流水线定制
- [neo4j-graphrag 包文档](https://neo4j.com/docs/neo4j-graphrag-python/current/)
- [RAG 与 GraphRAG 用户指南](https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_rag.html)
- [KG Builder 用户指南](https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html)
- [GitHub——neo4j-graphrag-python](https://github.com/neo4j/neo4j-graphrag-python)
- [示例文件夹](https://github.com/neo4j/neo4j-graphrag-python/tree/main/examples)
