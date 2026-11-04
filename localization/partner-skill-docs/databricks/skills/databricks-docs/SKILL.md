---
name: databricks-docs
description: "通过 llms.txt 索引访问 Databricks 文档参考。当其他技能未覆盖某个主题、需要查阅不熟悉的 Databricks 功能，或需要关于 API、配置或平台能力的权威文档时使用。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Databricks 文档参考

本技能通过 llms.txt 提供对完整 Databricks 文档索引的访问 —— 可将其作为**参考资源**，用于补充其他技能。

## 本技能的作用

这是一个**参考技能**，而非操作技能。用它来：

- 当其他技能未覆盖某个主题时查阅文档
- 获取关于 Databricks 概念和 API 的权威指导
- 查找详细信息，为 CLI 命令和 SDK 用法提供依据
- 发现你也许尚不了解的功能与能力

**执行操作始终优先使用 CLI/SDK**，**工作流则加载特定的技能**（databricks-python-sdk、databricks-spark-declarative-pipelines 等）。当你需要参考文档时使用本技能。

## 使用方法

获取 llms.txt 文档索引：

**URL：** `https://docs.databricks.com/llms.txt`

使用 WebFetch 检索该索引，然后：

1. 搜索相关的章节/链接
2. 获取特定文档页面以得到详细指导
3. 运用你学到的内容，使用合适的 CLI 命令或 SDK

## 文档结构

llms.txt 文件按类别组织：

- **概览与入门** - 基本概念与教程
- **数据工程** - Lakeflow、Spark、Delta Lake、管道
- **SQL 与分析** - 数仓、查询、仪表板
- **AI/ML** - MLflow、模型服务、GenAI
- **治理** - Unity Catalog、权限、安全
- **开发者工具** - SDK、CLI、API、Terraform

## 示例：补充其他技能

**场景：** 用户想要创建 Delta Live Tables 管道

1. 加载 `databricks-spark-declarative-pipelines` 技能以了解工作流模式
2. 若需要澄清特定 DLT 功能，使用本技能获取文档
3. 使用 `databricks pipelines create` CLI 命令创建管道

**场景：** 用户询问一个不熟悉的 Databricks 功能

1. 获取 llms.txt 以找到相关文档
2. 阅读特定文档以理解该功能
3. 确定适用的技能/工具，然后使用它们

## 相关技能

- **[databricks-python-sdk](../databricks-python-sdk/SKILL.md)** - 以编程方式访问 Databricks 的 SDK 模式
- **databricks-pipelines** - DLT / Lakeflow 管道工作流
- **[databricks-unity-catalog](../databricks-unity-catalog/SKILL.md)** - 治理与目录管理
- **databricks-model-serving** - 服务端点与模型部署
- **[databricks-mlflow-evaluation](../databricks-mlflow-evaluation/SKILL.md)** - MLflow 3 GenAI 评估工作流
