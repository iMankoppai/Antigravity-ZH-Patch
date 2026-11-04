---
name: databricks-vector-search
description: "用于 RAG 和语义搜索的 Databricks Vector Search 端点与索引；涵盖索引类型、搜索模式、端到端 RAG 模式"
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks Vector Search

**首先**：使用父级 `databricks-core` 技能了解 CLI 基础、身份验证和 profile 选择。

用于 RAG 和语义搜索应用创建、管理和查询向量搜索索引的模式。

## 何时使用

在以下情况使用本技能：
- 构建 RAG（检索增强生成）应用
- 实现语义搜索或相似度匹配
- 从 Delta 表创建向量索引
- 在存储优化端点和标准端点之间选择
- 带过滤器查询向量索引

## 概述

Databricks Vector Search 提供托管向量相似度搜索，具有自动嵌入生成和 Delta Lake 集成。

| 组件 | 描述 |
|-----------|-------------|
| **端点** | 承载索引的计算资源（标准或存储优化） |
| **索引** | 用于相似度搜索的向量数据结构 |
| **Delta Sync** | 与源 Delta 表自动同步 |
| **Direct Access** | 对向量的手动 CRUD 操作 |

## 端点类型

| 类型 | 延迟 | 容量 | 成本 | 最适用于 |
|------|---------|----------|------|----------|
| **标准** | 20-50ms | 3.2 亿向量（768 维） | 较高 | 实时、低延迟 |
| **存储优化** | 300-500ms | 10 亿+ 向量（768 维） | 低 7 倍 | 大规模、成本敏感 |

## 索引类型

| 类型 | 嵌入 | 同步 | 用例 |
|------|------------|------|----------|
| **Delta Sync（托管）** | Databricks 计算 | 从 Delta 自动 | 最简单的设置 |
| **Delta Sync（自管理）** | 你提供 | 从 Delta 自动 | 自定义嵌入 |
| **Direct Access** | 你提供 | 手动 CRUD | 实时更新 |

## 快速开始

### 创建端点

```python
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Create a standard endpoint
endpoint = w.vector_search_endpoints.create_endpoint(
    name="my-vs-endpoint",
    endpoint_type="STANDARD"  # or "STORAGE_OPTIMIZED"
)
# Note: Endpoint creation is asynchronous; check status with get_endpoint()
```

### 创建 Delta Sync 索引（托管嵌入）

```python
# Source table must have: primary key column + text column
index = w.vector_search_indexes.create_index(
    name="catalog.schema.my_index",
    endpoint_name="my-vs-endpoint",
    primary_key="id",
    index_type="DELTA_SYNC",
    delta_sync_index_spec={
        "source_table": "catalog.schema.documents",
        "embedding_source_columns": [
            {
                "name": "content",  # Text column to embed
                "embedding_model_endpoint_name": "databricks-gte-large-en"
            }
        ],
        "pipeline_type": "TRIGGERED"  # or "CONTINUOUS"
    }
)
```

### 查询索引

```python
results = w.vector_search_indexes.query_index(
    index_name="catalog.schema.my_index",
    columns=["id", "content", "metadata"],
    query_text="What is machine learning?",
    num_results=5
)

for doc in results.result.data_array:
    score = doc[-1]  # Similarity score is last column
    print(f"Score: {score}, Content: {doc[1][:100]}...")
```

## 常见模式

### 创建存储优化端点

```python
# For large-scale, cost-effective deployments
endpoint = w.vector_search_endpoints.create_endpoint(
    name="my-storage-endpoint",
    endpoint_type="STORAGE_OPTIMIZED"
)
```

### 使用自管理嵌入的 Delta Sync

```python
# Source table must have: primary key + embedding vector column
index = w.vector_search_indexes.create_index(
    name="catalog.schema.my_index",
    endpoint_name="my-vs-endpoint",
    primary_key="id",
    index_type="DELTA_SYNC",
    delta_sync_index_spec={
        "source_table": "catalog.schema.documents",
        "embedding_vector_columns": [
            {
                "name": "embedding",  # Pre-computed embedding column
                "embedding_dimension": 768
            }
        ],
        "pipeline_type": "TRIGGERED"
    }
)
```

### Direct Access 索引

```python
import json

# Create index for manual CRUD
index = w.vector_search_indexes.create_index(
    name="catalog.schema.direct_index",
    endpoint_name="my-vs-endpoint",
    primary_key="id",
    index_type="DIRECT_ACCESS",
    direct_access_index_spec={
        "embedding_vector_columns": [
            {"name": "embedding", "embedding_dimension": 768}
        ],
        "schema_json": json.dumps({
            "id": "string",
            "text": "string",
            "embedding": "array<float>",
            "metadata": "string"
        })
    }
)

# Upsert data
w.vector_search_indexes.upsert_data_vector_index(
    index_name="catalog.schema.direct_index",
    inputs_json=json.dumps([
        {"id": "1", "text": "Hello", "embedding": [0.1, 0.2, ...], "metadata": "doc1"},
        {"id": "2", "text": "World", "embedding": [0.3, 0.4, ...], "metadata": "doc2"},
    ])
)

# Delete data
w.vector_search_indexes.delete_data_vector_index(
    index_name="catalog.schema.direct_index",
    primary_keys=["1", "2"]
)
```

### 用嵌入向量查询

```python
# When you have pre-computed query embedding
results = w.vector_search_indexes.query_index(
    index_name="catalog.schema.my_index",
    columns=["id", "text"],
    query_vector=[0.1, 0.2, 0.3, ...],  # Your 768-dim vector
    num_results=10
)
```

### 混合搜索（语义 + 关键词）

混合搜索结合向量相似度（ANN）与 BM25 关键词评分。当查询包含必须精确匹配的术语 —— SKU、错误代码、专有名词或技术术语 —— 而纯语义搜索可能错过关键词特定结果时使用它。关于在 ANN 和混合搜索之间选择的详细指导，参见 [references/search-modes.md](references/search-modes.md)。

```python
# Combines vector similarity with keyword matching
results = w.vector_search_indexes.query_index(
    index_name="catalog.schema.my_index",
    columns=["id", "content"],
    query_text="SPARK-12345 executor memory error",
    query_type="HYBRID",
    num_results=10
)
```

## 过滤

### 标准端点过滤器（字典）

```python
# filters_json uses dictionary format
results = w.vector_search_indexes.query_index(
    index_name="catalog.schema.my_index",
    columns=["id", "content"],
    query_text="machine learning",
    num_results=10,
    filters_json='{"category": "ai", "status": ["active", "pending"]}'
)
```

### 存储优化过滤器（类 SQL）

存储优化端点通过 `databricks-vectorsearch` 包的 `filters` 参数（接受一个字符串）使用类 SQL 的过滤语法：

```python
from databricks.vector_search.client import VectorSearchClient

vsc = VectorSearchClient()
index = vsc.get_index(endpoint_name="my-storage-endpoint", index_name="catalog.schema.my_index")

# SQL-like filter syntax for storage-optimized endpoints
results = index.similarity_search(
    query_text="machine learning",
    columns=["id", "content"],
    num_results=10,
    filters="category = 'ai' AND status IN ('active', 'pending')"
)

# More filter examples
# filters="price > 100 AND price < 500"
# filters="department LIKE 'eng%'"
# filters="created_at >= '2024-01-01'"
```

### 触发索引同步

```python
# For TRIGGERED pipeline type, manually sync
w.vector_search_indexes.sync_index(
    index_name="catalog.schema.my_index"
)
```

### 扫描所有索引条目

```python
# Retrieve all vectors (for debugging/export)
scan_result = w.vector_search_indexes.scan_index(
    index_name="catalog.schema.my_index",
    num_results=100
)
```

## 参考文件

| 主题 | 文件 | 描述 |
|-------|------|-------------|
| 索引类型 | [references/index-types.md](references/index-types.md) | Delta Sync（托管/自管理）vs Direct Access 的详细比较 |
| 端到端 RAG | [references/end-to-end-rag.md](references/end-to-end-rag.md) | 完整演练：源表 → 端点 → 索引 → 查询 → 智能体集成 |
| 搜索模式 | [references/search-modes.md](references/search-modes.md) | 何时使用语义（ANN）vs 混合搜索，决策指南 |
| 运维 | [references/troubleshooting-and-operations.md](references/troubleshooting-and-operations.md) | 监控、成本优化、容量规划、迁移 |

## CLI 快速参考

```bash
# List endpoints
databricks vector-search-endpoints list-endpoints

# Create endpoint (positional args: NAME ENDPOINT_TYPE)
databricks vector-search-endpoints create-endpoint my-endpoint STANDARD

# List indexes on endpoint (positional arg: ENDPOINT_NAME)
databricks vector-search-indexes list-indexes my-endpoint

# Get index status (positional arg: INDEX_NAME)
databricks vector-search-indexes get-index catalog.schema.my_index

# Sync index (positional arg: INDEX_NAME)
databricks vector-search-indexes sync-index catalog.schema.my_index

# Delete index (positional arg: INDEX_NAME)
databricks vector-search-indexes delete-index catalog.schema.my_index
```

## 常见问题

| 问题 | 解决方案 |
|-------|----------|
| **索引同步缓慢** | 使用存储优化端点（索引快 20 倍） |
| **查询延迟高** | 使用标准端点以获得 <100ms 延迟 |
| **filters_json 不工作** | 存储优化通过 `databricks-vectorsearch` 包的 `filters` 参数使用类 SQL 字符串过滤器 |
| **嵌入维度不匹配** | 确保查询和索引的维度匹配 |
| **索引不更新** | 检查 pipeline_type；对于 TRIGGERED 使用 sync_index() |
| **容量不足** | 升级到存储优化（10 亿+ 向量） |
| **`query_vector` 被截断** | 大向量（例如 1024 维）在序列化为 JSON 时可能被截断。改用 `query_text`（对于托管嵌入索引），或使用 Databricks SDK 传递原始向量 |

## 嵌入模型

Databricks 提供内置嵌入模型：

| 模型 | 维度 | 上下文窗口 | 用例 |
|-------|------------|----------------|----------|
| `databricks-gte-large-en` | 1024 | 8192 token | 英文文本，高质量 |
| `databricks-bge-large-en` | 1024 | 512 token | 英文文本，通用目的 |

```python
# Use with managed embeddings
embedding_source_columns=[
    {
        "name": "content",
        "embedding_model_endpoint_name": "databricks-gte-large-en"
    }
]
```

## 备注

- **存储优化较新** —— 除非你需要 <100ms 延迟，否则对大多数用例更好
- **推荐 Delta Sync** —— 对大多数场景比 Direct Access 更容易
- **混合搜索** —— Delta Sync 和 Direct Access 索引都可用
- **`columns_to_sync` 很重要** —— 只有已同步的列在查询结果中可用；包含你需要的所有列
- **过滤语法因端点而异** —— 标准使用字典格式过滤器，存储优化使用类 SQL 字符串过滤器。使用 `databricks-vectorsearch` 包的 `filters` 参数，它接受两种格式
- **管理与运行时** —— CLI 和 SDK 处理生命周期管理；对于运行时智能体工具调用，使用 `VectorSearchRetrieverTool`

## 相关技能

- **databricks-model-serving** - 部署使用 VectorSearchRetrieverTool 的智能体
- **[databricks-agent-bricks](../databricks-agent-bricks/SKILL.md)** - Knowledge Assistants 对已索引文档使用 RAG
- **[databricks-unstructured-pdf-generation](../databricks-unstructured-pdf-generation/SKILL.md)** - 生成要在 Vector Search 中索引的文档
- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** - 管理支撑 Delta Sync 索引的 catalog 和表
- **databricks-pipelines** - 构建用作 Vector Search 源的 Delta 表
