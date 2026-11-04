---
name: databricks-mlflow-evaluation
description: "MLflow 3 GenAI 智能体评估。适用于编写 mlflow.genai.evaluate() 代码、创建 @scorer 函数、使用内置评分器（Guidelines、Correctness、Safety、RetrievalGroundedness）、从 trace 构建评估数据集、设置 trace 摄取和生产监控、根据领域专家反馈用 MemAlign 校准评审器，或用 GEPA 运行 optimize_prompts() 以自动改进提示词时。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# MLflow 3 GenAI 评估

## 与上游 `mlflow/skills` 的范围对比

OSS `mlflow/skills` 代码仓库提供 [`agent-evaluation`](https://github.com/mlflow/skills/tree/main/agent-evaluation) 及相关技能（`instrumenting-with-mlflow-tracing`、`analyze-mlflow-trace`、`retrieving-mlflow-traces`、`querying-mlflow-metrics`），涵盖通用的 MLflow GenAI 评估工作流 —— `mlflow.genai.evaluate()`、评分器/评审器、数据集、trace 设置，以及 5 步评估循环。

本技能**在该工作流之上叠加 Databricks 特有的模式**，而非复述它。当你需要以下任何一项时使用本技能：

- **Unity Catalog trace 摄取** —— 写入 UC 表的生产 trace、基于日志的监控（`patterns-trace-ingestion.md`）。
- **通过 UC SME 标注会话进行 MemAlign 评审器校准** —— 依据在 Databricks 中收集的领域专家反馈来校准自定义评审器（`patterns-judge-alignment.md`）。
- **`optimize_prompts()` GEPA 循环** —— 在 UC 数据集上运行的 Databricks 自动提示词优化驱动程序（`patterns-prompt-optimization.md`）。
- **Databricks 风格的评分器/数据集模式** —— 由 UC 表支撑的数据集、在 Databricks UI 中为纳入而给 trace 打标签（`patterns-datasets.md`、`patterns-scorers.md`）。

对于其他一切 —— 通用的 `mlflow.genai.evaluate()` 调用、评分器编写模式、Databricks 之外的数据集创建、不受 UC 表约束的 MLflow trace 设置 —— 上游 `mlflow/skills/agent-evaluation` 技能是权威来源，并由 MLflow 团队持续更新。

## 在编写任何代码之前

1. **阅读 GOTCHAS.md** - 15+ 个会导致失败的常见错误
2. **阅读 CRITICAL-interfaces.md** - 确切的 API 签名和数据模式

## 端到端工作流

根据你的目标遵循这些工作流。每一步指明要阅读哪些参考文件。

### 工作流 1：首次评估设置

适用于初次接触 MLflow GenAI 评估或为新智能体设置评估的用户。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 理解要评估什么 | `user-journeys.md`（旅程 0：策略） |
| 2 | 学习 API 模式 | `GOTCHAS.md` + `CRITICAL-interfaces.md` |
| 3 | 构建初始数据集 | `patterns-datasets.md`（模式 1-4） |
| 4 | 选择/创建评分器 | `patterns-scorers.md` + `CRITICAL-interfaces.md`（内置列表） |
| 5 | 运行评估 | `patterns-evaluation.md`（模式 1-3） |

### 工作流 2：生产 Trace -> 评估数据集

适用于从生产 trace 构建评估数据集。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 搜索和筛选 trace | `patterns-trace-analysis.md`（MCP 工具章节） |
| 2 | 分析 trace 质量 | `patterns-trace-analysis.md`（模式 1-7） |
| 3 | 为纳入而给 trace 打标签 | `patterns-datasets.md`（模式 16-17） |
| 4 | 从 trace 构建数据集 | `patterns-datasets.md`（模式 6-7） |
| 5 | 添加预期/基准真相 | `patterns-datasets.md`（模式 2） |

### 工作流 3：性能优化

适用于调试缓慢或昂贵的智能体执行。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 按 span 剖析延迟 | `patterns-trace-analysis.md`（模式 4-6） |
| 2 | 分析 token 用量 | `patterns-trace-analysis.md`（模式 9） |
| 3 | 检测上下文问题 | `patterns-context-optimization.md`（第 5 节） |
| 4 | 应用优化 | `patterns-context-optimization.md`（第 1-4、6 节） |
| 5 | 重新评估以衡量影响 | `patterns-evaluation.md`（模式 6-7） |

### 工作流 4：回归检测

适用于比较智能体版本并发现回归。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 建立基线 | `patterns-evaluation.md`（模式 4：命名运行） |
| 2 | 运行当前版本 | `patterns-evaluation.md`（模式 1） |
| 3 | 比较指标 | `patterns-evaluation.md`（模式 6-7） |
| 4 | 分析失败的 trace | `patterns-trace-analysis.md`（模式 7） |
| 5 | 调试具体失败 | `patterns-trace-analysis.md`（模式 8-9） |

### 工作流 5：自定义评分器开发

适用于创建项目特有的评估指标。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 理解评分器接口 | `CRITICAL-interfaces.md`（评分器章节） |
| 2 | 选择评分器模式 | `patterns-scorers.md`（模式 4-11） |
| 3 | 多智能体评分器 | `patterns-scorers.md`（模式 13-16） |
| 4 | 通过评估进行测试 | `patterns-evaluation.md`（模式 1） |

### 工作流 6：Unity Catalog Trace 摄取与生产监控

适用于将 trace 存储在 Unity Catalog 中、为应用埋点，并启用持续的生产监控。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 将 UC schema 关联到实验 | `patterns-trace-ingestion.md`（模式 1-2） |
| 2 | 设置 trace 目标 | `patterns-trace-ingestion.md`（模式 3-4） |
| 3 | 为你的应用埋点 | `patterns-trace-ingestion.md`（模式 5-8） |
| 4 | 配置 trace 来源（Apps/Serving/OTEL） | `patterns-trace-ingestion.md`（模式 9-11） |
| 5 | 启用生产监控 | `patterns-trace-ingestion.md`（模式 12-13） |
| 6 | 查询和分析 UC trace | `patterns-trace-ingestion.md`（模式 14） |

### 工作流 7：使用 MemAlign 校准评审器

适用于让 LLM 评审器与领域专家偏好相匹配。校准良好的评审器能改善每一个下游用途：评估准确度、生产监控信号和提示词优化质量。此工作流本身就有价值，独立于提示词优化。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 用 `make_judge` 设计基础评审器（任意反馈类型） | `patterns-judge-alignment.md`（模式 1） |
| 2 | 运行 evaluate()，给成功的 trace 打标签 | `patterns-judge-alignment.md`（模式 2） |
| 3 | 构建 UC 数据集 + 创建 SME 标注会话 | `patterns-judge-alignment.md`（模式 3） |
| 4 | 标注完成后用 MemAlign 校准评审器 | `patterns-judge-alignment.md`（模式 4） |
| 5 | 将校准后的评审器注册到实验 | `patterns-judge-alignment.md`（模式 5） |
| 6 | 用校准后的评审器重新评估（基线） | `patterns-judge-alignment.md`（模式 6） |

### 工作流 8：使用 GEPA 自动优化提示词

适用于用 `optimize_prompts()` 自动改进已注册的系统提示词。可与任何评分器配合，但与校准后的评审器（工作流 7）配对能给出最贴合领域的信号。关于结合校准与优化的完整端到端循环，参见 `user-journeys.md` 旅程 10。

| 步骤 | 操作 | 参考文件 |
|------|--------|-----------------|
| 1 | 构建优化数据集（输入 + 预期） | `patterns-prompt-optimization.md`（模式 1） |
| 2 | 用 GEPA + 评分器运行 optimize_prompts() | `patterns-prompt-optimization.md`（模式 2） |
| 3 | 注册新版本，有条件地提升 | `patterns-prompt-optimization.md`（模式 3） |

## 参考文件快速查找

| 参考 | 用途 | 何时阅读 |
|-----------|---------|--------------|
| `GOTCHAS.md` | 常见错误 | 编写代码之前**始终先读** |
| `CRITICAL-interfaces.md` | API 签名、模式 | 编写任何评估代码时 |
| `patterns-evaluation.md` | 运行评估、比较 | 执行评估时 |
| `patterns-scorers.md` | 创建自定义评分器 | 内置评分器不够用时 |
| `patterns-datasets.md` | 构建数据集 | 准备评估数据时 |
| `patterns-trace-analysis.md` | trace 调试 | 分析智能体行为时 |
| `patterns-context-optimization.md` | token/延迟修复 | 智能体缓慢或昂贵时 |
| `patterns-trace-ingestion.md` | UC trace 设置、监控 | 设置 trace 存储或生产监控时 |
| `patterns-judge-alignment.md` | MemAlign 评审器校准、标注会话、SME 反馈 | 将评审器与领域专家偏好校准时 |
| `patterns-prompt-optimization.md` | GEPA 优化：构建数据集、optimize_prompts()、提升 | 运行自动提示词改进时 |
| `user-journeys.md` | 高层工作流、完整的领域专家优化循环 | 启动新的评估项目或运行完整的校准 + 优化循环时 |

## 关键 API 事实

- **使用：** `mlflow.genai.evaluate()`（不是 `mlflow.evaluate()`）
- **数据格式：** `{"inputs": {"query": "..."}}`（要求嵌套结构）
- **predict_fn：** 接收 `**unpacked kwargs`（不是 dict）
- **MemAlign：** 与评分器无关（适用于任何 `feedback_value_type` —— float、bool、分类）；在嵌入模型上 token 消耗大，因此要显式设置 `embedding_model`
- **标签 schema 名称匹配：** 标注会话中的标签 schema `name` 必须与 `evaluate()` 中使用的评审器 `name` 匹配，`align()` 才能配对分数
- **校准后的评审器分数：** 可能低于未校准评审器的分数 —— 这是预期之内的，意味着评审器现在更准确了，而不是智能体退化了
- **GEPA 优化数据集：** 每条记录必须同时具有 `inputs` 和 `expectations`（与评估数据集不同）
- **情景记忆：** 惰性加载 —— 在首次使用评审器之前，`get_scorer()` 的结果在打印时不会显示情景记忆
- **optimize_prompts：** 要求 MLflow >= 3.5.0
- **UC 模型服务评审器模型：** `databricks:/system.ai.<model>` 评审器/评分器 URI 需要版本下限，可能会遇到 404（旧客户端）或 403（旧端点名）—— 版本、确切错误文本和修复见 `GOTCHAS.md` -> "Custom Judge Model Format"

完整列表见 `GOTCHAS.md`。

## 相关技能

- **[databricks-docs](../databricks-docs/SKILL.md)** - 通用 Databricks 文档参考
- **databricks-model-serving** - 将模型和智能体部署到服务端点
- **[databricks-agent-bricks](../databricks-agent-bricks/SKILL.md)** - 构建可用本技能评估的智能体
- **[databricks-python-sdk](../databricks-python-sdk/SKILL.md)** - 与 MLflow API 搭配使用的 SDK 模式
- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** - 用于托管评估数据集的 Unity Catalog 表
