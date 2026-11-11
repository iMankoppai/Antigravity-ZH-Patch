---
name: neo4j-agent-memory-skill
description: neo4j-agent-memory Python 包（一个构建在 Neo4j 之上、面向 AI 代理的图原生记忆系统）以及位于 memory.neo4jlabs.com 的托管服务（NAMS）的权威参考。只要用户提到 neo4j-agent-memory、基于 Neo4j 的代理记忆、上下文图、POLE+O 模型、MemoryClient/MemorySettings、memory MCP 服务器，或任何框架集成（LangChain、PydanticAI、CrewAI、AWS Strands、Google ADK、Microsoft Agent Framework、OpenAI Agents、LlamaIndex），就使用本技能。当用户提到位于 memory.neo4jlabs.com 的托管服务、NAMS、Neo4j Agent Memory Service、`nams_` API 密钥前缀或托管 MCP 端点时也使用本技能。在为该项目编写文档、博客文章、教程、PRD 或代码示例时，在比较代理记忆方案时，或在将图原生记忆与纯向量方案进行定位对比时，也使用本技能——即使用户没有明确点名该包。不处理 GraphRAG 流水线——请使用 neo4j-graphrag-skill。
version: 1.0.9
---

# neo4j-agent-memory

`neo4j-agent-memory` Python 包的权威参考——一个 Neo4j Labs 项目，在单个知识图中为 AI 代理提供三种不同的记忆层（短期、长期、推理）。

> ⚠️ **写作前先核实权威状态。** 版本号、extras、工具数量和 API 接口会随版本变化。本技能中的数值反映的是某一特定时间点。在发布任何对版本敏感的内容前，请对照 **PyPI**（`https://pypi.org/project/neo4j-agent-memory/`）和 **GitHub README**（`https://github.com/neo4j-labs/agent-memory`）进行确认。PyPI 是版本号的权威来源——绝不要靠推断。

## 何时使用

- 构建需要持久记忆（短期、长期、推理轨迹）并以 Neo4j 为后端的 AI 代理
- 使用 `neo4j-agent-memory` Python 包或位于 memory.neo4jlabs.com 的托管 NAMS 服务
- 将代理记忆与 LangChain、PydanticAI、CrewAI、AWS Strands、Google ADK、OpenAI Agents、LlamaIndex 或 Microsoft Agent Framework 集成
- 编写关于图原生代理记忆的文档、教程或定位内容
- 将图原生记忆与纯向量方案进行比较

## 何时不使用

- **普通 Neo4j 驱动连接**（不需要记忆层）→ 使用 `neo4j-driver-python-skill`
- **编写或优化 Cypher 查询** → 使用 `neo4j-cypher-skill`
- **GraphRAG 检索流水线** → 使用 `neo4j-graphrag-skill`

---

## 项目概览

| 字段 | 值 |
|-------|-------|
| 包 | `neo4j-agent-memory` |
| PyPI | https://pypi.org/project/neo4j-agent-memory/ |
| GitHub | https://github.com/neo4j-labs/agent-memory |
| 规范文档 | https://neo4j.com/labs/agent-memory/ |
| 托管服务 | https://memory.neo4jlabs.com（NAMS——抢先体验，尚未在官方项目页面记录） |
| 托管 MCP 端点 | https://memory.neo4jlabs.com/mcp（Streamable HTTP，bearer 认证） |
| 许可证 | Apache-2.0 |
| Python | 3.11+（3.10 已在 0.8.0 中移除） |
| Neo4j | 5.20+（向量索引所需） |
| 状态 | 实验性（Neo4j Labs，社区支持） |
| 当前版本（撰写时） | **0.8.0**（2026-10-22）——**引用前务必核实 PyPI** |

## 它是什么（一句话）

一个面向 AI 代理的图原生记忆系统，存储对话、构建知识图谱并记录代理推理——全部作为单个 Neo4j 数据库中相互连接的节点。

## 使用模式

`neo4j-agent-memory` 有两种交付模式。它们是同一个底层项目——区别在于你如何运行它、如何认证，以及为你托管了什么。

| 选项 | 它是什么 | 何时选择 |
|--------|------------|----------------|
| **自托管库** | `pip install neo4j-agent-memory` + 你自己的 Neo4j（本地 / Docker / Aura）。完整的 Python API、本地 MCP 服务器和框架集成在你的进程中运行。 | 开发、本地部署数据、自定义抽取流水线、完全控制、自带 embeddings / LLM。 |
| **托管（NAMS）** | 位于 `https://memory.neo4jlabs.com` 的托管服务。按工作区隔离的 Neo4j Aura 数据库、REST API、远程 MCP 端点、Web 控制台。 | 零基础设施试用、跨代理 / 机器共享记忆、演示、不想运行 Neo4j 的团队。 |

> ⚠️ **NAMS 可访问，但尚未在 GitHub README 或 `neo4j.com/labs/agent-memory/` 中被引用。** 请将其视为抢先体验 / 软发布。不要在发布内容中断言 SLA、定价或 GA 状态。详情见下文 **托管服务（NAMS）** 一节。

## 三种记忆类型

这是决定性的架构特征。每一份描述该项目的内容都应以这三者开篇。

| 记忆类型 | 存储内容 | 颜色约定 |
|-------------|--------|------------------|
| **短期** | 对话消息、会话历史、顺序消息链、元数据过滤搜索、LLM 驱动的摘要 | 绿色（`#B2F2BB` / `#2F9E44`） |
| **长期** | 实体（人物、地点、组织）、偏好、事实及其之间的关系——通过 POLE+O 模型从对话中自动构建 | 橙色/黄色（`#FFEC99` / `#F08C00`） |
| **推理** | 决策轨迹、工具调用来源、思考-行动-结果链——让代理能从自身过往的推理模式中学习 | 紫色（`#D0BFFF` / `#9C36B5`） |

**推理记忆是主要的竞争差异化点。** 大多数竞争系统覆盖短期和长期记忆，但把推理当作事后补充或完全省略。在做定位时应当以它打头。

## POLE+O 模型

长期记忆使用 POLE+O 实体框架——这是本项目的规范实体分类：

- **P**erson（人物）
- **O**rganization（组织）
- **L**ocation（地点）
- **E**vent（事件）
- **+O** Object（对象——任何不符合核心四类的实体：产品、概念、项目等）

在绘制数据模型图时，实体节点用椭圆表示，关系用带标签的箭头（UPPER_SNAKE_CASE）表示，与 Neo4j Browser 的约定保持一致。

## 安装

核心安装加 extras。extras 模式为 `pip install neo4j-agent-memory[<extra>]`。

```bash
pip install neo4j-agent-memory                  # Core
pip install neo4j-agent-memory[openai]          # + OpenAI embeddings
pip install neo4j-agent-memory[mcp]             # + MCP server
pip install neo4j-agent-memory[langchain]       # + LangChain
pip install neo4j-agent-memory[all]             # Everything
```

**完整 extras 列表**（可能变化——请核实 PyPI）：`all`, `anthropic`, `aws`, `bedrock`, `cli`, `crewai`, `extraction`, `full`, `fuzzy`, `gliner`, `google`, `google-adk`, `instructor`, `langchain`, `langchain-agents`, `litellm`, `llamaindex`, `mcp`, `microsoft-agent`, `nams`, `observability`, `openai`, `openai-agents`, `opentelemetry`, `opik`, `pydantic-ai`, `sentence-transformers`, `spacy`, `strands`, `vertex-ai`.

## Python API（快速开始）

规范的导入模式和基本用法。这是教程和示例中应复现的形态。

```python
import asyncio
from neo4j_agent_memory import MemoryClient, MemorySettings

async def main():
    settings = MemorySettings(
        neo4j={"uri": "bolt://localhost:7687", "password": "your-password"}
    )

    async with MemoryClient(settings) as memory:
        # Short-term: store a conversation message
        await memory.short_term.add_message(
            session_id="user-123",
            role="user",
            content="Hi, I'm John and I love Italian food!"
        )

        # Long-term: build the knowledge graph
        await memory.long_term.add_entity("John", "PERSON")
        await memory.long_term.add_preference(
            category="food",
            preference="Loves Italian cuisine"
        )

        # Get combined context for an LLM prompt
        context = await memory.get_context(
            "What restaurant should I recommend?",
            session_id="user-123"
        )
        print(context)

asyncio.run(main())
```

**注意异步上下文管理器模式**（`async with MemoryClient(settings) as memory:`）——这是规范形式。

## MCP 服务器

将记忆作为工具暴露给兼容 MCP 的 AI 助手（Claude Desktop、Claude Code、Cursor、VS Code Copilot）。

### 调用

权威的一行命令（无需安装）：

```bash
uvx "neo4j-agent-memory[mcp]" mcp serve --password <neo4j-password>
```

本地安装的替代方式：

```bash
neo4j-agent-memory mcp serve --password <pw>
```

### 传输方式与配置档

```bash
# stdio (default — Claude Desktop, Claude Code)
neo4j-agent-memory mcp serve --password <pw>

# Streamable HTTP (network; endpoint /mcp/). `--transport sse` deprecated — serves Streamable HTTP with warning
neo4j-agent-memory mcp serve --transport http --port 8080 --password <pw>

# Core profile — fewer tools, less context overhead
neo4j-agent-memory mcp serve --profile core --password <pw>

# Session continuity across conversations
neo4j-agent-memory mcp serve \
  --session-strategy per_day \
  --user-id alice \
  --password <pw>
```

### 工具配置档

| 配置档 | 工具数 | 内容 |
|---------|-------|----------|
| **core** | 6 | `memory_search`、`memory_get_context`、`memory_store_message`、`memory_add_entity`、`memory_add_preference`、`memory_add_fact` |
| **extended**（默认） | 16 | 核心 + 对话历史、实体详情、图导出、关系创建、推理轨迹、观察、只读 Cypher |

自 v0.1.1 起，`memory_add_fact` 接受 `metadata` 参数，与 `memory_add_entity` 保持一致。

### Claude Code 注册

```bash
claude mcp add neo4j-agent-memory -- \
  uvx "neo4j-agent-memory[mcp]" mcp serve --password <neo4j-password>
```

### Claude Desktop 配置

```json
{
  "mcpServers": {
    "neo4j-agent-memory": {
      "command": "uvx",
      "args": ["neo4j-agent-memory[mcp]", "mcp", "serve", "--password", "your-password"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

> 关于位于 `memory.neo4jlabs.com/mcp` 的**托管** MCP 端点，请参见下文 **托管服务（NAMS）** 一节——它使用 Streamable HTTP 传输和 bearer-token 认证，而不是本地 `uvx` 调用。

## 托管服务（NAMS）

**NAMS**——Neo4j Agent Memory Service——是 `neo4j-agent-memory` 在 `https://memory.neo4jlabs.com` 的托管部署。它捆绑了 REST API、MCP 服务器、Web 控制台以及按工作区隔离的 Neo4j Aura 数据库。

> ⚠️ **引用前先对照线上服务核实。** NAMS 未在 GitHub README 或 `neo4j.com/labs/agent-memory/` 中记录。端点形态、工具数量、认证流程和限制可能在没有发布说明的情况下变化。在发布任何 NAMS 相关的内容前，请重新检查线上站点以及位于 `/openapi.json` 的 OpenAPI 规范。

### 接口面

- **基础 URL：** `https://memory.neo4jlabs.com`
- **Web 控制台：** 根 URL——工作区管理、记忆浏览、实体可视化
- **REST API：** `https://memory.neo4jlabs.com/v1/`——OpenAPI 规范位于 `/openapi.json`；覆盖对话、实体、观察、推理轨迹和只读 Cypher
- **MCP 端点：** `https://memory.neo4jlabs.com/mcp`——Streamable HTTP 传输，暴露托管的工具集，bearer-token 认证

### 认证

- **API 密钥**，前缀为 `nams_`，在 Web 控制台中创建和轮换——用作 REST 和 MCP 的 bearer token
- **Auth0 OAuth2（PKCE）** + 作用域 JWT，用于交互式用户流程

不要把这些与自托管库的 `--password` Neo4j 凭据混用——它们服务于技术栈的不同侧。

### 存储模型

每个工作区由一个**隔离的 Neo4j Aura 数据库**支撑，按需预配。也支持自带 Neo4j（Bring-your-own-Neo4j）作为替代方案，按工作区配置。

### 速率限制

用量计数按 API 密钥 / 工作区跟踪。具体限制未公开记录——在向客户承诺数值之前，请检查控制台或重新对照服务核实。

### Claude Code 注册（托管 MCP）

```bash
claude mcp add --transport http neo4j-agent-memory-hosted \
  https://memory.neo4jlabs.com/mcp \
  --header "Authorization: Bearer <nams_api_key>"
```

### Claude Desktop 配置（托管 MCP）

```json
{
  "mcpServers": {
    "neo4j-agent-memory-hosted": {
      "url": "https://memory.neo4jlabs.com/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer nams_..."
      }
    }
  }
}
```

## 框架集成

所有集成位于 `neo4j_agent_memory.integrations.<framework>` 之下。安装对应的 extra。

| 框架 | 安装 Extra | 导入 |
|-----------|---------------|--------|
| LangChain | `[langchain]` | `from neo4j_agent_memory.integrations.langchain import Neo4jAgentMemory` |
| Pydantic AI | `[pydantic-ai]` | `from neo4j_agent_memory.integrations.pydantic_ai import MemoryDependency` |
| Google ADK | `[google-adk]` | `from neo4j_agent_memory.integrations.google_adk import Neo4jMemoryService` |
| AWS Strands | `[strands]` | `from neo4j_agent_memory.integrations.strands import context_graph_tools` |
| CrewAI | `[crewai]` | `from neo4j_agent_memory.integrations.crewai import Neo4jCrewMemory` |
| LlamaIndex | `[llamaindex]` | `from neo4j_agent_memory.integrations.llamaindex import Neo4jLlamaIndexMemory` |
| OpenAI Agents | `[openai-agents]` | `from neo4j_agent_memory.integrations.openai_agents import ...` |
| Microsoft Agent Framework | `[microsoft-agent]` | `from neo4j_agent_memory.integrations.microsoft_agent import Neo4jMicrosoftMemory` |

## 实体抽取流水线

多阶段抽取（成本/质量权衡，从最快 → 最准确）：

1. **spaCy**——快速的统计 NER，成本最低，覆盖广但不精确
2. **GLiNER**——带类型化 schema 的零样本实体抽取；关系用 `GLiREL`
3. **LLM 兜底**——最准确、成本最高；在结构丰富或歧义时使用

**丰富化**是一个独立的后台阶段：Wikipedia 和 Diffbot 可以用额外上下文补全抽取出的实体。

**去重**（v0.1.1+）通过主语/谓语匹配加 embedding 相似度（阈值约 0.95）自动合并重复的事实和偏好，并更新置信度而不是创建新节点。通过 `DeduplicationConfig` 调优。

需要了解的配置对象：`ExtractionConfig`、`DeduplicationConfig`、`MemoryIntegration`、`SessionStrategy`。

## 定位用语

这些措辞是关键的承载内容。尽可能逐字使用。

### 核心口号

- **“图负责理解，向量负责相似度。”**
- **“向量存储给你回忆，图给你理解。”**
- **“三种记忆类型，一个知识图。”**

### 品类定位

- 在论坛适合时，锚定 Foundation Capital 的 **“AI 的万亿美元机遇：上下文图”** 论题。
- `neo4j-agent-memory` 被定位为上下文图这一品类的**完整实现**——它覆盖全部三个记忆层，而不只是两个。
- 上下文图与领域数据共存于**同一个 Neo4j 实例**中（不是外挂的扩展系统）。这是架构图的一个关键概念/视觉要点。

### 应该说

- “图原生记忆”（graph-native memory）
- “上下文图”（context graph）
- “三种不同的记忆层”（three distinct memory layers）
- “推理轨迹作为一等图节点”（reasoning traces as first-class graph nodes）
- “从过去的推理中学习”（learn from past reasoning）
- “从对话中自动构建知识图谱”（build knowledge graphs automatically from conversations）
- “Neo4j Labs 项目” / “实验性” / “社区支持”

### 不要说

- 不要在发布内容中**点名具体竞争对手**（Mem0、Zep、Letta、Cognee、Supermemory）。把比较重新围绕能力，而不是产品名称。
- 不要称其为“生产就绪”（它是 Labs 项目——完整语气指南见 `neo4j-labs-brand` 技能）。
- 不要说“官方支持”或暗示 SLA。

## 常见需注意的纠正

在编辑或审阅关于该项目的内容时，检查以下问题：

1. **过时的版本号**——今天写“v0.1.0”的人可能依据的是过时笔记；请核实 PyPI。
2. **错误的规范文档 URL**——应为 `neo4j.com/labs/agent-memory`，而不是某个 Vercel 预览 URL。
3. **推断出的 API 表面**——如果代码示例未经运行，请标注出来；优先采用来自 GitHub README 或官方示例的模式。
4. **缺少“Labs”定位**——应明确其为实验性/社区支持。
5. **与其他 Neo4j MCP 服务器混淆**——市面上有好几个（`mcp-neo4j-cypher`、`mcp-neo4j-memory`——旧的 knowledge graph memory 服务器等）。`neo4j-agent-memory` 的 MCP 服务器是独特的，并作为包的一部分以 `[mcp]` extra 交付。
6. **把 NAMS 与自托管库混淆**——同一个底层项目，不同的使用模式。连接字符串、认证和工具集都不同：自托管使用本地 `uvx` 调用和 Neo4j `--password`；NAMS 使用 Streamable HTTP MCP URL 和以 `nams_` 为前缀的 bearer token。不要混用。
7. **过度承诺 NAMS 的可用性**——托管服务尚未在 GitHub README 或 `neo4j.com/labs/agent-memory/` 中被引用。避免“官方支持”、SLA、定价声明或“生产就绪”的表述。将其视为抢先体验。

## 生态中的相关项目

这些项目常被提及；请识别它们并使用正确的名称。

| 项目 | 它是什么 |
|---------|------------|
| **create-context-graph** | CLI 脚手架工具（`uvx create-context-graph`），生成预先接好 neo4j-agent-memory 的全栈上下文图应用。规范文档：`create-context-graph.dev`。 |
| **Lenny's Podcast Memory Explorer** | 旗舰演示——299 集播客、知识图谱、地理空间地图、Wikipedia 丰富化。基于 PydanticAI。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/lennys-memory |
| **neo4j-agent-integrations** | 更广泛的框架集成总集，其中许多已以 `[<framework>]` extras 的形式打包回 `neo4j-agent-memory`。 |
| **agent-memory-tck** | 技术合规套件——用于多语言/多框架互操作（多语言）的行为规范。 |
| **Microsoft Learn 集成** | 官方 Microsoft Agent Framework 文档将 `neo4j-agent-memory` 引用为 Neo4j Memory Provider。 |

## 规范示例（来自 neo4j-labs/agent-memory 代码仓库）

引导用户使用上游示例，而不是杜撰示例。以下所有条目位于 https://github.com/neo4j-labs/agent-memory/tree/main/examples 的 `examples/` 目录下：

- lennys-memory —— 旗舰 PydanticAI 演示。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/lennys-memory
- full-stack-chat-agent —— 带 NVL 图可视化的 PydanticAI 新闻研究。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/full-stack-chat-agent
- financial-services-advisor/aws-financial-services-advisor —— AWS Strands 多代理 KYC/AML，带推理轨迹审计追踪。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/financial-services-advisor/aws-financial-services-advisor
- financial-services-advisor/google-cloud-financial-advisor —— Google ADK 多代理，带 Vertex AI embeddings + SSE 流式传输。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/financial-services-advisor/google-cloud-financial-advisor
- microsoft_agent_retail_assistant —— Microsoft Agent Framework，带 GDS 算法和上下文提供程序。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/microsoft_agent_retail_assistant
- domain-schemas —— 8 个 GLiNER2 抽取脚本。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/domain-schemas
- google_cloud_integration —— 渐进式教程，涵盖 Vertex AI、ADK、MCP 和 MemoryIntegration。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/google_cloud_integration
- google_adk_demo —— Neo4jMemoryService 的独立 ADK 演示。源码：https://github.com/neo4j-labs/agent-memory/tree/main/examples/google_adk_demo

## 图示约定（交叉引用）

为本项目绘图时，将本技能与以下内容结合使用：

- **`excalidraw` 技能**——JSON 格式及项目的图示管理脚本
- **`neo4j-styleguide` 技能**——Cypher 代码风格和 Neo4j 品牌色
- **`neo4j-labs-brand` 技能**——Labs 紫色（`#6366F1`）、状态徽章、免责声明用语

记忆类型颜色（在所有图中一致使用）：

```
Short-Term:  #B2F2BB fill / #2F9E44 stroke  (green)
Long-Term:   #FFEC99 fill / #F08C00 stroke  (orange/yellow)
Reasoning:   #D0BFFF fill / #9C36B5 stroke  (purple)
Neo4j/Store: #A5D8FF fill / #1971C2 stroke  (blue)
Labs accent: #6366F1 (purple, for Labs branding elements)
```

## 文档结构（交叉引用）

`neo4j.com/labs/agent-memory` 上的规范文档遵循 **Diataxis** 框架（详情见本项目的 `diataxis` 技能）：

- **教程**——构建你的第一个带记忆的代理
- **操作指南**——实体抽取、去重、丰富化、集成
- **参考**——配置、CLI、MCP 工具、API
- **说明**——POLE+O 模型、记忆类型、抽取流水线

添加新内容时，将其放到正确的象限。

## 权威事实快速核对清单

在发布任何关于该项目的内容前，核实：

- [ ] 版本号按 PyPI 为最新（不是从笔记推断）
- [ ] 规范文档链接指向 `neo4j.com/labs/agent-memory`
- [ ] 三种记忆类型命名正确（短期、长期、推理）
- [ ] POLE+O 模型命名一致（不是 POLEO，不是 POLE-O）
- [ ] 如相关，已说明 Python ≥ 3.11 和 Neo4j ≥ 5.20 要求
- [ ] README/落地页内容带有 Labs 免责声明
- [ ] 发布定位中没有竞争对手名称
- [ ] 推理记忆被作为差异化点突出
- [ ] 导入路径使用 `neo4j_agent_memory.integrations.<framework>`（下划线，snake_case）
- [ ] 若引用 NAMS，清楚区分其与自托管库，并重新对照线上服务核实端点（尚未在 README 中镜像）

## 资源

- **PyPI（版本权威）：** https://pypi.org/project/neo4j-agent-memory/
- **GitHub：** https://github.com/neo4j-labs/agent-memory
- **规范文档：** https://neo4j.com/labs/agent-memory/
- **CHANGELOG：** https://github.com/neo4j-labs/agent-memory/blob/main/CHANGELOG.md
- **NAMS（托管服务）：** https://memory.neo4jlabs.com
- **NAMS REST API：** https://memory.neo4jlabs.com/v1/（OpenAPI 位于 `/openapi.json`）
- **NAMS MCP 端点：** https://memory.neo4jlabs.com/mcp（Streamable HTTP）
- **create-context-graph（脚手架工具）：** https://create-context-graph.dev
- **社区论坛：** https://community.neo4j.com
- **Microsoft Learn 集成页面：** https://learn.microsoft.com/en-us/agent-framework/integrations/neo4j-memory

---

## 核对清单

- [ ] 版本：引用前检查 PyPI
- [ ] 使用模式：自托管 vs NAMS
- [ ] 安装了正确的 extras（`neo4j-agent-memory[<extra>]`）
- [ ] `MemoryClient` 作为异步上下文管理器
- [ ] 三种类型命名：短期 / 长期 / 推理
- [ ] POLE+O 一致（不是 POLEO 或 POLE-O）
- [ ] NAMS：抢先体验定位；无 SLA/定价
- [ ] 凭据未硬编码；NAMS bearer token 与 Neo4j `--password` 分开
