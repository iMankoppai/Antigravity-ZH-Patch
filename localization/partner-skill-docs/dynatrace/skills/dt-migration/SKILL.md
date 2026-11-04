---
name: dt-migration
description: 将 Dynatrace classic 和 Gen2 基于实体的 DQL 迁移到 Smartscape 等价形式。涵盖三种场景。(1) 按 classic 实体条件过滤的海量数据查询 —— 优先迁移到直接维度过滤器，Smartscape 仅作后备；(2) 使用实体子查询进行过滤的海量数据查询 —— 同样的维度优先策略；(3) 纯实体列表查询 —— 将 fetch dt.entity.* 迁移到 smartscapeNodes。还处理 entityName、entityAttr、classicEntitySelector 以及 classic 关系模式。
license: Apache-2.0
---

# Smartscape 迁移技能

此技能将 Dynatrace classic 和 Gen2 基于实体的 DQL 查询与查询模式迁移到基于 Smartscape 的等价形式。

在编写最终 DQL 之前加载 **dt-dql-essentials** 技能，以便翻译后的查询也遵循当前的 DQL 语法规则。

此技能仅专注于面向 Smartscape 的 DQL 迁移。它不涵盖资产级迁移工作流。

## 查询用途分类

**从这里开始。** 正确的迁移策略取决于查询实际想要做什么 —— 而不仅仅是它使用了哪些 classic 构造。

有三种截然不同的情况：

| # | 情况 | Classic 反模式 | 迁移策略 |
| --- | --- | --- | --- |
| 1 | 按实体条件过滤的海量数据查询 | `classicEntitySelector(...)` 内联在 timeseries、logs 或 metrics 查询的 `filter:` 中 | 先将实体条件解析为原始数据维度。Smartscape 是后备，不是默认。 |
| 2 | 使用实体子查询进行过滤的海量数据查询 | `fetch dt.entity.*` 位于 `in [...]`、`lookup [...]` 或 `join [...]` 内部，用于过滤外层海量数据查询 | 同样的维度优先策略。改写为原始维度过滤器或 `in [smartscapeNodes ...]` 子查询。 |
| 3 | 纯实体列表查询 | `fetch dt.entity.*` 独立使用或作为主要结果来源 | `smartscapeNodes` 是唯一有效的路径。不存在原始维度替代方案。 |

**决策：**

- **情况 1 或 2** —— 加载 [references/mass-data-filtering-strategy.md](references/mass-data-filtering-strategy.md) 并完成**所有步骤**，包括字段发现（第 2 步）和等价性验证（第 4 步）。不要跳过 `fieldsSnapshot` 门 —— 它们决定哪种方法可行。仅当需要实体类型映射或关系遍历来完成 Smartscape 子查询时，才回退到下面的迁移工作流。
- **情况 3** —— 继续使用下面的迁移工作流和实体映射表。

> 注意：情况 3 有一个子情形，即 `classicEntitySelector` 用于过滤 `fetch dt.entity.*` 返回的实体。这很少见，且遵循相同的 `smartscapeNodes` 路径 —— 使用 [references/mass-data-filtering-strategy.md](references/mass-data-filtering-strategy.md) 第 1B 步解析选择器条件，然后将其作为 `smartscapeNodes` 中的节点过滤器应用。

## 迁移工作流

对于**情况 3**（纯实体列表查询）以及为情况 1 和 2 构造 Smartscape 子查询，请遵循以下顺序：

1. 识别 classic 输入模式：
   - `fetch dt.entity.*`
   - `classicEntitySelector(...)`
   - 关系字段访问，例如 `belongs_to[...]`、`runs[...]`、`instance_of[...]`
   - 使用 `dt.entity.*` 的信号或事件查询
2. 识别涉及的 classic 实体类型。
3. 在下面的核心实体映射表中查找 Smartscape 替代。
4. 检查哪些 classic DQL 构造需要显式迁移。
5. 使用 Smartscape 原语重写查询：
   - `smartscapeNodes`
   - `smartscapeEdges`
   - `traverse`
   - `references`
   - `getNodeName()`
   - `getNodeField()`
6. 检查特殊情况、不支持的实体或 ID 假设。
7. 加载针对特定实体族或迁移模式的匹配详细参考。

完整的迁移流程和输出预期，请加载 [references/migration-workflow.md](references/migration-workflow.md)。

## 核心实体映射表

常见迁移请先使用这个精简表。完整映射集请加载 [references/type-mappings.md](references/type-mappings.md)。

| Classic / Gen2 实体 | Smartscape 字段 | Smartscape 节点类型 | 说明 |
| --- | --- | --- | --- |
| `dt.entity.host` | `dt.smartscape.host` | `HOST` | 标准主机映射 |
| `dt.entity.service` | `dt.smartscape.service` | `SERVICE` | 标准服务映射 |
| `dt.entity.process_group_instance` | `dt.smartscape.process` | `PROCESS` | 进程实例直接映射 |
| `dt.entity.container_group_instance` | `dt.smartscape.container` | `CONTAINER` | 容器组实例直接映射 |
| `dt.entity.kubernetes_cluster` | `dt.smartscape.k8s_cluster` | `K8S_CLUSTER` | Kubernetes 集群 |
| `dt.entity.kubernetes_node` | `dt.smartscape.k8s_node` | `K8S_NODE` | Kubernetes 节点 |
| `dt.entity.kubernetes_service` | `dt.smartscape.k8s_service` | `K8S_SERVICE` | Kubernetes 服务 |
| `dt.entity.cloud_application` | 多个工作负载字段 | 多个 K8S 工作负载节点类型 | 映射到多个工作负载类型；加载云应用指南 |
| `dt.entity.cloud_application_instance` | `dt.smartscape.k8s_pod` | `K8S_POD` | classic 云应用实例变为 Pod |
| `dt.entity.cloud_application_namespace` | `dt.smartscape.k8s_namespace` | `K8S_NAMESPACE` | 命名空间映射 |
| `dt.entity.application` | `dt.smartscape.frontend` | `FRONTEND` | 前端应用映射 |
| `dt.entity.aws_lambda_function` | `dt.smartscape.aws.lambda_function` | `AWS_LAMBDA_FUNCTION` | 云函数实体映射 |

## 迁移期间需要检查的 DQL 构造

这些 classic 构造通常需要显式改写：

| Classic 构造 | 典型的 Smartscape 替代 | 说明 |
| --- | --- | --- |
| `entityName(x)` | `name` 或 `getNodeName(x)` | 直接查询节点时优先使用 `name` |
| `entityAttr(x, "...")` | 直接节点字段或 `getNodeField(x, "...")` | 可用时优先使用直接字段 |
| `classicEntitySelector(...)` | 节点过滤器加 `traverse` | 从受限的一侧开始；海量数据查询请先参见 mass-data-filtering-strategy.md |
| 信号查询中的 `dt.entity.*` | `dt.smartscape.*` | 适用于 `by`、`filter`、`fieldsAdd`、`expand` 和相关子句 |
| `belongs_to[...]`、`runs[...]`、`instance_of[...]` | `traverse` 或 `references[...]` | `references` 仅适用于静态边 |
| classic 实体 ID 过滤器 | Smartscape `id` | 不要直接复用 classic ID |
| `affected_entity_ids` 和 `affected_entity_types` | `smartscape.affected_entities` | 一个记录数组替代两个并行数组；每条记录有 `id`、`type` 和 `name` |

逐函数的详细指南请加载 [references/dql-function-migration.md](references/dql-function-migration.md)。

## 特殊情况

不要逐字翻译这些模式：

- **主机组** —— 没有独立的 Smartscape 实体；使用 `HOST` 上的字段
- **进程组** —— 没有独立的 Smartscape 实体；使用 `PROCESS` 上的字段
- **容器组** —— 没有独立的 Smartscape 实体；如需保留输出形态可用占位符
- **Classic ID** —— classic 实体 ID 不会自动延续到 Smartscape
- **计划中、缺失或未计划的映射** —— 在假定直接支持之前先检查完整映射表

在迁移这些模式之前加载 [references/special-cases.md](references/special-cases.md)。

## 面向实体的指南

当迁移聚焦于某个特定实体族时，加载匹配的详细指南：

- [references/entity-host.md](references/entity-host.md)
- [references/entity-service.md](references/entity-service.md)
- [references/entity-process.md](references/entity-process.md)
- [references/entity-container.md](references/entity-container.md)
- [references/entity-kubernetes.md](references/entity-kubernetes.md)
- [references/entity-cloud-application.md](references/entity-cloud-application.md)

每个指南解释：

- classic 实体代表什么
- Smartscape 替代是什么
- 哪些字段通常会变化
- 关系如何迁移
- 常见示例和陷阱

## 参考

- [references/README.md](references/README.md) —— 参考索引和阅读指南
- [references/mass-data-filtering-strategy.md](references/mass-data-filtering-strategy.md) —— **情况 1 和 2 从这里开始。** 强制步骤：解析条件、运行 fieldsSnapshot 发现、选择方法、编写查询、验证等价性
- [references/auto-tagging-field-mapping.md](references/auto-tagging-field-mapping.md) —— 将自动标记规则条件键映射到语义字典字段（海量数据和 Smartscape 节点属性）
- [references/entity-selector-predicates.md](references/entity-selector-predicates.md) —— `classicEntitySelector` 表达式的完整谓词词汇表
- [references/migration-workflow.md](references/migration-workflow.md) —— 端到端迁移流程和输出预期
- [references/type-mappings.md](references/type-mappings.md) —— 完整的 classic 到 Smartscape 类型和字段映射
- [references/dql-function-migration.md](references/dql-function-migration.md) —— 如何迁移 classic DQL 函数和模式
- [references/relationship-mappings.md](references/relationship-mappings.md) —— 有效的 Smartscape 边和遍历指导
- [references/special-cases.md](references/special-cases.md) —— 非字面和不支持的实体迁移
- [references/quick-reference.md](references/quick-reference.md) —— 精简规则和注意事项
- [references/examples.md](references/examples.md) —— 迁移前后示例
