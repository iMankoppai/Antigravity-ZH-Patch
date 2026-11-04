---
name: databricks-genie-agents
description: "创建、管理和查询 Databricks Genie Agents —— 面向特定数据、经过精选的自然语言智能体（原名 Genie Spaces）：构建、导出/导入、跨工作区迁移，并通过 Conversation API 向*特定的* Agent 提问。对于一般性数据问题或在你的工作区中查找数据，请改用 databricks-data-discovery（Genie One）。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
---

# Databricks Genie Agents

创建、管理和查询 Genie Agents（原名 Genie Spaces）—— 用于基于 SQL 的数据探索的自然语言接口。

## 概述

Genie Agents 允许用户就 Unity Catalog 中的结构化数据提出自然语言问题。系统将问题转换为 SQL 查询，在 SQL 数仓上执行，并以对话方式呈现结果。

Genie Agent 是一个**限定到特定数据、经过精选的智能体** —— 其表、示例问题和指令都是针对某个特定业务领域编写的。这与 **Genie One** / 通用的"ask Genie"数据探索路径（参见 `databricks-data-discovery` 技能）不同，后者无需一个经过精选的、按范围限定的智能体即可在你的数据上回答问题。

## Genie Agent 生命周期

| 阶段 | 参考 | 何时加载 | 典型 CLI |
|-------|-----------|-------------|-------------|
| **设计与创建** | [create-genie-agent.md](references/create-genie-agent.md) | **在创建或更新之前始终先加载。** 收集需求、剖析数据、设计界面、获取批准 —— 在任何 CLI 之前 | `discover-schema` → `create-space` / `update-space` |
| **查询 / 验证** | [query-genie-agent.md](references/query-genie-agent.md) | 通过 Conversation API 或 Agent mode API 查询；为 Metric View 数据源编写 SQL | `start-conversation` / `get-message` |
| **诊断** | [diagnose-genie-agent.md](references/diagnose-genie-agent.md) | 智能体给出错误/空答案 —— 先收集 space ID + 失败的问题 + 观察到的行为 | `get-space --include-serialized-space`；`system.query.history` |
| **优化** | [optimize-genie-agent.md](references/optimize-genie-agent.md) | 基准驱动的质量调优 —— 先收集 space ID + 优化目标 + 基准目标 | `genie-create-eval-run`；`update-space` |
| **导出 / 迁移** | [genie-agent-cicd.md](references/genie-agent-cicd.md) | 导出、导入、跨工作区迁移、批量迁移、DABs/CI-CD | `get-space` → remap → `create-space` |
| — | [serialized-space.md](references/serialized-space.md) | 构造或调试 `serialized_space` 负载 —— 字段 schema、约束、Python 辅助工具 | — |
| — | [uc-persistence.md](references/uc-persistence.md) | 为多轮优化历史设置 UC Delta 表 —— 仅 CREATE TABLE DDL | — |

典型流程：**创建 → 查询/验证 → 诊断 → 优化**。

## 前提条件

- **Unity Catalog 中的表** —— 存放数据的 bronze/silver/gold 表
- **SQL 数仓** —— 用于执行查询的数仓（若未指定则自动检测）

## 相关技能

- **[databricks-data-discovery](../databricks-data-discovery/SKILL.md)** - 跨你的数据进行通用自然语言数据探索 / "ask Genie"（Genie One）；当你并非针对某个特定的精选 Genie Agent 时使用
- **[databricks-metric-views](../databricks-metric-views/SKILL.md)** - 构建 Genie 所消费的受治理业务指标。参见 [SKILL.md](../databricks-metric-views/SKILL.md) 了解会影响 Genie 答案质量的 metric-view 设计规则，参见 [query-patterns.md](../databricks-metric-views/references/query-patterns.md) 了解 Genie 必须遵循的 `MEASURE()` 查询规则。
- **[databricks-agent-bricks](../databricks-agent-bricks/SKILL.md)** - 将 Genie Agents 用作 Supervisor Agents 内部的智能体
- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** - 管理 Genie 所查询的目录、schema 和表
