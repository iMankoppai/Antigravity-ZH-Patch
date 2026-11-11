---
name: neo4j-document-import-skill
description: 将非结构化和半结构化文档作为知识图谱摄入 Neo4j。
  适用于对 PDF、HTML、纯文本或 Markdown 进行分块；使用 LLM 从文本中抽取实体和关系
  （SimpleKGPipeline、neo4j-graphrag）；通过 apoc.load.json 加载 JSON；
  构建 Document→Chunk→Entity 图结构；或将 LangChain/LlamaIndex 文档
  加载器连接到 Neo4j。涵盖 neo4j-graphrag SimpleKGPipeline、LLM Graph Builder Web UI、实体
  消解、分块策略，以及面向 RAG 流水线的图模式设计。
  不处理结构化 CSV/关系型导入 —— 请使用 neo4j-import-skill。
  不处理摄入之后的 GraphRAG 检索 —— 请使用 neo4j-graphrag-skill。
  不处理向量索引创建 —— 请使用 neo4j-vector-search-skill。
version: 1.0.7
status: stable
allowed-tools: Bash WebFetch
---

# Neo4j 文档导入技能

## 何时使用

- 将 PDF、HTML、纯文本、Markdown 作为知识图谱摄入 Neo4j
- 对文档进行分块，并存储带嵌入的 `:Chunk` 节点
- 使用 LLM 从文本中抽取实体和关系
- 以编程方式使用 `SimpleKGPipeline`（neo4j-graphrag）
- 使用 Neo4j LLM Graph Builder（无代码 Web UI）
- 通过 `apoc.load.json` 加载半结构化 JSON
- 将 LangChain 或 LlamaIndex 文档加载器连接到 Neo4j

## 何时不使用

- **结构化 CSV / 关系型数据** → `neo4j-import-skill`
- **摄入之后的 GraphRAG 检索** → `neo4j-graphrag-skill`
- **向量索引创建** → `neo4j-vector-search-skill`
- **Cypher 查询编写** → `neo4j-cypher-skill`

---

## 方案决策表

| 情形 | 方案 |
|---|---|
| 无需代码；希望拖拽式体验 | LLM Graph Builder Web UI |
| 编程式流水线；PDF/文本 | `SimpleKGPipeline`（neo4j-graphrag） |
| JSON / REST API 响应 | `apoc.load.json` 或 Python + UNWIND |
| 技术栈中已有 LangChain | `Neo4jGraph` + 文档加载器 |
| 技术栈中已有 LlamaIndex | `Neo4jQueryEngine` / `Neo4jVectorStore` |
| 仅分块（不抽取实体） | 手工分块 + MERGE 模式 |

---

## 安装

```bash
pip install neo4j-graphrag                   # includes SimpleKGPipeline
pip install neo4j-graphrag[openai]           # + OpenAI LLM/embedder
pip install neo4j-graphrag[anthropic]        # + Anthropic Claude
pip install neo4j-graphrag[google]           # + Vertex AI / Gemini
pip install neo4j-graphrag[bedrock]          # + Amazon Bedrock (boto3) — added v1.15.0
pip install neo4j-graphrag[ollama]           # + Ollama (local)
pip install neo4j-graphrag[mistralai]        # + MistralAI
pip install neo4j-graphrag[fuzzy-matching]   # + FuzzyMatchResolver (rapidfuzz)
# spaCy entity resolver (Python <= 3.13 only — unsupported on 3.14+):
pip install neo4j-graphrag[nlp]
```

要求：`neo4j>=5.17.0`（支持 driver 6.x）、Python>=3.10、Neo4j>=5.18.1（Aura>=5.18.0）。

---

## 第 1 步 —— 定义图模式

模式决定了 LLM 抽取的内容。需在构建流水线之前定义。

```python
# Option A — Simple string lists (LLM infers descriptions)
entities = ["Person", "Organization", "Location", "Product", "Event"]
relations = ["WORKS_AT", "LOCATED_IN", "KNOWS", "MENTIONS", "PART_OF"]
patterns = [
    ("Person", "WORKS_AT", "Organization"),
    ("Organization", "LOCATED_IN", "Location"),
    ("Person", "KNOWS", "Person"),
    ("Article", "MENTIONS", "Organization"),
]

# Option B — Rich GraphSchema (production; best extraction quality)
from neo4j_graphrag.components.schema import (
    GraphSchema, NodeType, RelationshipType, PropertyType, ConstraintType
)
schema = GraphSchema(
    node_types=[
        NodeType(
            label="Person",
            description="A human individual",
            properties=[
                PropertyType(name="name", type="STRING"),
                PropertyType(name="role", type="STRING"),
            ],
        ),
        NodeType(
            label="Organization",
            description="A company or institution",
            properties=[
                PropertyType(name="name", type="STRING"),
                PropertyType(name="industry", type="STRING"),
            ],
        ),
    ],
    relationship_types=[
        RelationshipType(label="WORKS_AT", description="Employment relationship"),
    ],
    patterns=[("Person", "WORKS_AT", "Organization")],
    # Optional: constraints emitted to ParquetWriter metadata (v1.15.0+)
    constraints=[
        ConstraintType(label="Person", property_name="name", type="UNIQUENESS"),
        ConstraintType(label="Organization", property_name="name", type="KEY"),
    ],
)

# Option C — Auto-extract schema from text (no constraints)
schema = "EXTRACTED"   # LLM infers types; noisier output
schema = "FREE"        # No schema guidance; most noise
```

生产环境使用 Option B；原型阶段使用 Option A；`"EXTRACTED"` 仅用于探索。

---

## 第 2 步 —— SimpleKGPipeline 设置

```python
import asyncio
from neo4j import GraphDatabase
from neo4j_graphrag.experimental.pipeline.kg_builder import SimpleKGPipeline
from neo4j_graphrag.llm import OpenAILLM
from neo4j_graphrag.embeddings import OpenAIEmbeddings

driver = GraphDatabase.driver(
    "neo4j+s://xxxx.databases.neo4j.io",
    auth=("neo4j", "password")
)

llm = OpenAILLM(
    model_name="gpt-4.1",
    model_params={"temperature": 0},
    # Note: SimpleKGPipeline auto-enables structured output for OpenAI/VertexAI LLMs (v1.14.0+)
    # Do NOT set response_format manually — it is managed by the pipeline
)
embedder = OpenAIEmbeddings()   # OPENAI_API_KEY from env

pipeline = SimpleKGPipeline(
    llm=llm,
    driver=driver,
    embedder=embedder,
    schema=schema,              # GraphSchema, dict, "FREE", or "EXTRACTED"
    from_file=True,             # False → pass text= instead of file_path=
    on_error="IGNORE",          # RAISE to surface extraction failures
    perform_entity_resolution=True,
    neo4j_database="neo4j",     # omit to use default
)
```

**LLM 备选**（相同接口）：
- `AnthropicLLM(model_name="claude-3-5-sonnet-20241022")`
- `VertexAILLM(model_name="gemini-2.0-flash")`
- `OllamaLLM(model_name="llama3")` —— 本地运行；无需 API 密钥
- `BedrockLLM(model_id="anthropic.claude-3-5-sonnet-20241022-v2:0")` —— Amazon Bedrock（v1.15.0+）

---

## 第 3 步 —— 运行流水线

```python
# From PDF file:
result = asyncio.run(pipeline.run_async(
    file_path="report.pdf",        # auto-dispatches to PdfLoader
    document_metadata={"source": "Q4 report", "year": 2025},
))

# From Markdown file (v1.15.0+):
result = asyncio.run(pipeline.run_async(
    file_path="notes.md",          # auto-dispatches to MarkdownLoader
    document_metadata={"source": "meeting notes"},
))

# Note: old `from_pdf=True` parameter is DEPRECATED since v1.15.0; use `from_file=True` instead
# pipeline = SimpleKGPipeline(..., from_file=True)   ← correct
# pipeline = SimpleKGPipeline(..., from_pdf=True)    ← deprecated

# From raw text:
result = asyncio.run(pipeline.run_async(
    text=document_text,
))

# Batch — process multiple files:
async def ingest_all(paths):
    for p in paths:
        await pipeline.run_async(file_path=str(p))

asyncio.run(ingest_all(list(pdf_dir.glob("*.pdf"))))
```

`document_metadata` 字典会作为属性存储在 `:Document` 节点上。

---

## 第 4 步 —— 分块配置

默认分割器：`FixedSizeSplitter(chunk_size=300, chunk_overlap=50)`。

```python
from neo4j_graphrag.components.text_splitters.fixed_size_splitter import FixedSizeSplitter

splitter = FixedSizeSplitter(
    chunk_size=512,       # tokens; 300–512 typical for GPT-4o
    chunk_overlap=50,     # ~10% of chunk_size; preserves boundary context
    approximate=True,     # respect sentence/word boundaries when possible
)

pipeline = SimpleKGPipeline(
    ...,
    text_splitter=splitter,
)
```

分块建议：
| 文档类型 | chunk_size | chunk_overlap |
|---|---|---|
| 高密度技术文本 | 256–512 | 50–80 |
| 叙事性 / 新闻文章 | 512–1024 | 80–128 |
| 法律 / 财务文档 | 256–384 | 40–64 |

规则：分块必须既能放入用于抽取的 LLM 上下文，也要在嵌入模型限制之内。GPT-4o：128k 上下文；`text-embedding-3-small`：8191 tokens。切勿将 chunk_size 设置为大于 2048。

---

## 第 5 步 —— 实体消解

在流水线运行之后合并重复抽取的实体。

```python
from neo4j_graphrag.components.resolver import (
    SinglePropertyExactMatchResolver,   # identical name → merge
    FuzzyMatchResolver,                  # Levenshtein similarity; needs rapidfuzz
    SpaCySemanticMatchResolver,          # cosine similarity; needs neo4j-graphrag[nlp]
)

# Exact match (fastest; good baseline)
resolver = SinglePropertyExactMatchResolver(driver)
asyncio.run(resolver.run())

# Fuzzy match (handles typos / alternate spellings)
from neo4j_graphrag.components.resolver import FuzzyMatchResolver
resolver = FuzzyMatchResolver(driver, threshold=0.9)
asyncio.run(resolver.run())

# Scope resolution to specific labels only:
resolver = SinglePropertyExactMatchResolver(
    driver,
    filter_query="WHERE n:Organization OR n:Person",
)
asyncio.run(resolver.run())
```

在摄入之后再运行解析器，不要内联执行——批量合并更快。

---

## 生成的图结构

流水线始终会生成这一词法图层：

```
(:Document {id, fileName, status, ...metadata})
    -[:HAS_CHUNK]->
(:Chunk {id, text, index, embedding, ...})
    -[:NEXT_CHUNK]->          ← linked list for ordered traversal
(:Chunk {...})

(:Chunk)-[:FROM_DOCUMENT]->(:Document)   ← back-pointer
```

实体抽取会额外添加：
```
(:Chunk)-[:MENTIONS]->(:Person {name, ...})
(:Chunk)-[:MENTIONS]->(:Organization {name, ...})
(:Person)-[:WORKS_AT]->(:Organization)
```

摄入后验证：
```cypher
CYPHER 25
MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
RETURN d.fileName, count(c) AS chunks LIMIT 10;

MATCH (c:Chunk)-[:MENTIONS]->(e)
RETURN labels(e)[0] AS type, count(*) AS cnt ORDER BY cnt DESC LIMIT 20;
```

---

## LLM Graph Builder（无代码 UI）

适用场景：非开发人员需要摄入文档；快速原型；没有 Python 环境。

**托管版**：https://llm-graph-builder.neo4jlabs.com/

**本地版**（Docker）：
```bash
git clone https://github.com/neo4j-labs/llm-graph-builder
cd llm-graph-builder
# Set OPENAI_API_KEY (or other provider keys) in .env
docker-compose up
# Opens at http://localhost:8080
```

支持的来源：PDF、纯文本、Markdown、图片、网页、YouTube 转写文本、S3/GCS 存储桶上传。

LLM 提供商：OpenAI、Gemini、Claude、Llama3、Diffbot、Qwen。

局限：对长篇幅英文文本效果最佳；对表格数据表现较差（CSV/Excel 请使用 `neo4j-import-skill`）；不会抽取可视化图表。

---

## APOC JSON 摄入（半结构化）

适用于来源为 REST API、S3 或文件导出的 JSON。

```cypher
CYPHER 25
CALL apoc.load.json("https://example.com/articles.json") YIELD value
UNWIND value.articles AS article
CALL (article) {
  MERGE (d:Document {id: article.id})
  SET d.title = article.title, d.url = article.url, d.publishedAt = article.publishedAt
  FOREACH (tag IN article.tags |
    MERGE (t:Tag {name: tag})
    MERGE (d)-[:HAS_TAG]->(t)
  )
} IN TRANSACTIONS OF 1000 ROWS
```

本地文件：`apoc.load.json("file:///import/data.json")`。文件必须位于 `$NEO4J_HOME/import/` 下，或已配置 APOC `allowlist`。

检查 APOC 是否可用：`RETURN apoc.version()`。所有 Aura 档位均内置 APOC。

---

## LangChain 集成模式

```python
from langchain_community.graphs import Neo4jGraph
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from neo4j import GraphDatabase

graph = Neo4jGraph(
    url="neo4j+s://xxxx.databases.neo4j.io",
    username="neo4j",
    password="password",
)

loader = PyPDFLoader("report.pdf")
docs = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=64)
chunks = splitter.split_documents(docs)

embedder = OpenAIEmbeddings()
driver = GraphDatabase.driver(url, auth=("neo4j", "password"))

for i, chunk in enumerate(chunks):
    emb = embedder.embed_query(chunk.page_content)
    driver.execute_query(
        """
        MERGE (doc:Document {id: $doc_id})
        SET doc.source = $source
        CREATE (c:Chunk {id: $chunk_id, text: $text, embedding: $emb, index: $idx})
        CREATE (doc)-[:HAS_CHUNK]->(c)
        """,
        doc_id=chunk.metadata.get("source", "unknown"),
        source=chunk.metadata.get("source"),
        chunk_id=f"chunk-{i}",
        text=chunk.page_content,
        emb=emb,
        idx=i,
    )
```

使用 LangChain 进行实体抽取：使用 `LLMGraphTransformer`（来自 `langchain_experimental.graph_transformers`）。会生成相同的 `:Document`/`:Chunk`/实体模式。

---

## 约束与索引（在摄入前运行）

```cypher
CYPHER 25
// Prevent duplicate documents
CREATE CONSTRAINT doc_id_unique IF NOT EXISTS
  FOR (d:Document) REQUIRE d.id IS UNIQUE;

// Prevent duplicate chunks
CREATE CONSTRAINT chunk_id_unique IF NOT EXISTS
  FOR (c:Chunk) REQUIRE c.id IS UNIQUE;

// Entity deduplication
CREATE CONSTRAINT person_name_unique IF NOT EXISTS
  FOR (p:Person) REQUIRE p.name IS UNIQUE;
CREATE CONSTRAINT org_name_unique IF NOT EXISTS
  FOR (o:Organization) REQUIRE o.name IS UNIQUE;

// Vector index for chunk embeddings (adjust dims for your model)
CREATE VECTOR INDEX chunk_embeddings IF NOT EXISTS
  FOR (c:Chunk) ON c.embedding
  OPTIONS {indexConfig: {`vector.dimensions`: 1536, `vector.similarity_function`: 'cosine'}};

// Poll until index ONLINE:
// SHOW INDEXES YIELD name, state WHERE state <> 'ONLINE'
```

在所有索引处于 ONLINE 之前，不要开始摄入：
```cypher
SHOW INDEXES YIELD name, state WHERE state <> 'ONLINE';
```
若返回了行：稍等后重新运行。ONLINE = 可以安全摄入。

---

## 常见错误

| 错误 | 原因 | 修复 |
|---|---|---|
| LLM 抽取了模式中不存在的节点类型 | 模式过于宽松或处于 `"EXTRACTED"` 模式 | 显式定义 `entities` + `patterns`；使用 Option B 模式 |
| `MissingEmbedderError` | 省略了 `embedder=` | 即使不做向量搜索也要始终传入 `embedder=`——流水线会将嵌入存储到 Chunk 节点上 |
| 抽取到零个实体 | LLM 上下文溢出 | 减小 `chunk_size`；改用上下文更大的模型 |
| 摄入后出现重复实体节点 | 未运行实体消解 | 在批量摄入后运行 `SinglePropertyExactMatchResolver` |
| `apoc.load.json` 权限被拒绝 | 未配置 APOC 允许列表 | 将 URL 添加到 `apoc.import.file.enabled=true` 和 `dbms.security.allow_csv_import_from_file_urls=true` |
| 分块在中途截断句子 | `approximate=False`（默认）按精确 token 数切割 | 在 `FixedSizeSplitter` 中设置 `approximate=True` |
| `chunk_size` 过大 → LLM 超时 | 抽取提示词 + 分块超出上下文 | GPT-4o 抽取时保持 chunk_size ≤ 512；绝对上限 ≤ 2048 |
| `SpaCySemanticMatchResolver` 在 Python 3.14 上失败 | spaCy 不支持 3.14+ | 使用 `FuzzyMatchResolver` 或降级到 Python 3.13 |
| 找不到 `neo4j-driver` 包 | 自 6.0 起包名已废弃 | 使用 `neo4j` 包：`pip install neo4j>=5.17.0` |
| 无属性的 `NodeType` 报 `ValidationError` | 自 v1.13.0 起 `NodeType` 至少需要 1 个属性 | 至少添加 `PropertyType(name="name", type="STRING")`；字符串列表标签会自动获得它 |
| `from_pdf` 弃用警告 | `from_pdf=True` 在 v1.15.0 中已移除 | 改用 `from_file=True` |
| `model_params` 中的 `response_format` 被忽略 | `SimpleKGPipeline` 会为 OpenAI/VertexAI 自动启用结构化输出（v1.14.0+） | 从 `model_params` 中移除 `response_format`；由流水线管理 |

---

## 验证清单

- [ ] 摄入开始前，约束已创建并处于 ONLINE
- [ ] 存储嵌入之前已创建向量索引
- [ ] `chunk_size` 在嵌入模型限制之内（≤2048；抽取时 ≤512）
- [ ] `chunk_overlap` 设置为 chunk_size 的 10–15%
- [ ] 使用了 `Document`→`HAS_CHUNK`→`Chunk` 模式（便于在检索中做图遍历）
- [ ] `document_metadata` 已填入来源标识符
- [ ] 批量摄入后已运行实体解析器
- [ ] 若使用 `apoc.load.json`，已确认 `apoc.version()`
- [ ] `.env` 中包含 API 密钥；`.env` 已加入 `.gitignore`
- [ ] 验证结构：`MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk) RETURN count(c)`
- [ ] 验证实体：`MATCH (c:Chunk)-[:MENTIONS]->(e) RETURN labels(e)[0], count(*)`

---

## GraphSchema —— 当前 API（≥1.8.0）

`entities`/`relations`/`potential_schema` 均已弃用。请使用 `schema=GraphSchema(...)`。

```python
from neo4j_graphrag.components.schema import (
    GraphSchema, NodeType, RelationshipType, PropertyType,
    ConstraintType, GraphConstraintType,
)

schema = GraphSchema(
    node_types=[
        NodeType(label="Person", properties=[PropertyType(name="name", type="STRING")]),
        NodeType(label="Organization", properties=[PropertyType(name="name", type="STRING")]),
    ],
    relationship_types=[RelationshipType(label="WORKS_AT")],
    patterns=[("Person", "WORKS_AT", "Organization")],
    # Constraints (v1.15.0+) — emitted to ParquetWriter metadata and enforce schema; one NodeType per label (duplicates rejected v1.23.0)
    constraints=[
        # UNIQUENESS — property must be unique across nodes of that label
        ConstraintType(label="Person", property_name="name", type=GraphConstraintType.UNIQUENESS),
        # KEY — uniqueness + existence (null not allowed)
        ConstraintType(label="Organization", property_name="name", type=GraphConstraintType.KEY),
        # EXISTENCE — property must be non-null (replaces deprecated PropertyType.required)
        ConstraintType(label="Event", property_name="date", type=GraphConstraintType.EXISTENCE),
        # Composite KEY (v1.15.0+)
        ConstraintType(
            label="Person",
            property_names=("first_name", "last_name"),
            type=GraphConstraintType.KEY,
        ),
    ],
)
pipeline = SimpleKGPipeline(llm=llm, driver=driver, embedder=embedder, schema=schema)
```

`schema="FREE"`（无引导）或 `schema="EXTRACTED"`（由 LLM 推断类型）——仅用于探索，输出噪声更大。

### 从文本自动抽取模式（v1.15.0+）

当未向 `SimpleKGPipeline` 传入 `schema` 时，`SchemaFromTextExtractor` 会自动运行。
如需显式运行：

```python
from neo4j_graphrag.components.graph_schema_extraction import (
    SchemaFromTextExtractor,
    SchemaFromExistingGraphExtractor,
)

# Infer schema from sample text
extractor = SchemaFromTextExtractor(llm=llm, use_structured_output=True)
schema = asyncio.run(extractor.run(text=sample_text))

# Derive schema from an existing Neo4j graph
extractor = SchemaFromExistingGraphExtractor(driver=driver)
schema = asyncio.run(extractor.run())
```

### Parquet 导出（实验性，v1.14.0+）

```python
from neo4j_graphrag.components.parquet_output import ParquetWriter

# Use ParquetWriter instead of KGWriter inside a Pipeline to export to Parquet files
writer = ParquetWriter(output_dir="/data/kg_export/")
# Produces one Parquet file per node label and per relationship type
# Metadata includes UNIQUENESS, EXISTENCE, KEY constraints (v1.15.0/1.16.0); pin >=1.23.0 — earlier fails on mixed-type LIST props, emits extra KEY(__id__) → Data Importer re-import error 22N41
```

---

## LexicalGraphConfig —— 自定义标签

覆盖默认词法层标签（除非要与既有图集成，否则保留默认值）：
```python
from neo4j_graphrag.components.types import LexicalGraphConfig
# All fields have sensible defaults — only override what differs from your graph's conventions
config = LexicalGraphConfig(
    document_node_label="Article",             # default: "Document"
    chunk_node_label="Passage",                # default: "Chunk"
    node_to_chunk_relationship_type="HAS_ENTITY",  # default: "MENTIONS"
    chunk_text_property="content",             # default: "text"
)
pipeline = SimpleKGPipeline(..., lexical_graph_config=config)
```

---

## 自定义文档加载器

默认 `file_loader` 按扩展名自动分派（`.pdf`→`PdfLoader`，`.md`→`MarkdownLoader`）。
支持 fsspec URI（`s3://`、`gcs://`）。对 HTML/网页/自定义格式，可继承 `DataLoader`：

```python
from neo4j_graphrag.components.data_loader import DataLoader
from neo4j_graphrag.components.types import DocumentInfo, LoadedDocument

class WebPageLoader(DataLoader):
    async def run(self, filepath, metadata=None):
        import httpx
        text = httpx.get(filepath).text   # strip HTML in real impl
        return LoadedDocument(text=text,
            document_info=DocumentInfo(path=filepath, metadata=metadata))

pipeline = SimpleKGPipeline(..., file_loader=WebPageLoader(), from_file=True)
```

按用例划分的分块策略及完整解析器配置：[references/kg-construction.md](references/kg-construction.md)。

---

## 参考资料

按需加载：
- [neo4j-graphrag KG Builder 指南](https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html)
- [neo4j-graphrag 库概览](https://neo4j.com/docs/neo4j-graphrag-python/current/)
- [LLM Graph Builder（托管版）](https://llm-graph-builder.neo4jlabs.com/)
- [LLM Graph Builder GitHub](https://github.com/neo4j-labs/llm-graph-builder)
- [APOC 加载过程](https://neo4j.com/docs/apoc/current/import/)
- [GraphAcademy：使用 LLM 构建知识图谱](https://graphacademy.neo4j.com/courses/llm-knowledge-graph-construction/)
- [LangChain Neo4j 集成](https://python.langchain.com/docs/integrations/graphs/neo4j_cypher/)
- [LlamaIndex Neo4jQueryEngine](https://docs.llamaindex.ai/en/stable/examples/index_structs/knowledge_graph/Neo4jKGIndexDemo/)
- [扩展的 KG 构建参考](references/kg-construction.md)
