---
name: databricks-metric-views
description: "Unity Catalog 指标视图：在 YAML 中定义、创建、查询和管理受治理的业务指标。适用于构建标准化 KPI、收入指标、订单分析，或任何需要跨团队和工具保持一致定义的、可复用的业务指标时。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# Unity Catalog 指标视图

在 YAML 中定义可复用的、受治理的业务指标，将度量定义与维度分组分离，以实现灵活查询。

## 何时使用

在以下情况使用本技能：
- 定义**标准化的业务指标**（收入、订单数、转化率）
- 构建跨仪表板、Genie 和 SQL 查询共享的 **KPI 层**
- 创建具有**复杂聚合**的指标（比率、去重计数、带筛选的度量）
- 定义**窗口度量**（移动平均、累计合计、环比/同比、YTD）
- 在指标定义中用 join 对**星型或雪花模式**进行建模
- 为预计算的指标聚合启用**物化**

## 首先：这到底能不能是一个指标视图？（决策门禁）

**在编写之前，先确认该度量在查询时能重新聚合。** 可加的 `SUM`/`COUNT`、按单元格重算的 `COUNT(DISTINCT)`、`MEASURE()` 比率（最后相除），以及受支持的**窗口度量**（滚动 / 累计 / 环比同比 —— [模式 8](references/create-patterns.md#pattern-8-window-measures)）都能正确重新聚合，是有效的指标视图度量；此列表并不详尽。下面的门禁是关于*排除*某些形状 —— 如果以下**任何**一条成立，它就**不是**指标视图：改为编写一个**受治理的 Unity Catalog SQL 函数**（用 `databricks-dbsql` 构建），并作为可信注册的 SQL 函数暴露给 Genie（设计优先级界面 #11），而不是强行把它塞进一个视图或一个预聚合的辅助视图：

- **在所查询的粒度上不可加** —— 跨维度对它求和会导致重复计数。去重实体计数是典型的陷阱：一个实体若出现在两个属性值下，仍是**一个**实体而非两个，因此按单元格的去重计数不能在任意多属性交叉上求和。
- **先按实体计算、再聚合**，而按实体的那一步不是求和/计数/和之比 —— 例如跨两个周期的按实体最小/最大值，或按实体去重计数上的阈值。
- **依赖选择** —— 结果会随用户的筛选而重新分配（一个"所有其他"桶会改变每个单元格）。
- **迭代式** —— 重复直到收敛（例如面板重新加权）。
- **返回一组表**，而非单一度量（例如一个来源×目标矩阵加每行净额）。

一个度量可以*大体上*是指标视图，只把某一部分提升到函数中（渗透率 = 可加购买者 ÷ 基数，最后相除 —— 但一个短窗口修正，或任意的多属性交叉 / 按实体阈值，则放进函数里）。**把棘手的那一步预计算进基础/辅助视图，只是针对*固定*定义的修法** —— 这是一种性能选择，一次性为所有切片确定。如果该度量必须在 Genie 中响应用户的运行时选择（任意交叉、某个参数，或会变动的分母），它就是*即时*计算的，无法预计算 —— 它需要一个**参数化的**受治理 SQL 函数，而非预聚合视图。完整规则 + 两个实例（渗透率、品牌转换的收益与流失）：[metric-view-advisor.md §When a metric view is not the right tool](references/metric-view-advisor.md#when-a-metric-view-is-not-the-right-tool--governed-function)。在对照某个参照方法对 Genie 到函数的复现路由进行基准测试之前，先验证它与参照达到 N 位小数的**一致性** —— 参见 `databricks-genie-agents` 技能。

## 前提条件

- **Databricks Runtime 17.2+**（用于 YAML 版本 1.1）；**17.3+** 用于语义元数据（`synonyms` / `display_name` / `format`）
- 具有 `CAN USE` 权限的 SQL 数仓
- 对源表的 `SELECT`、目标 schema 中的 `CREATE TABLE` + `USE SCHEMA`

## 指标视图生命周期

| 任务 | 参考 | 何时加载 |
|------|-----------|-----------|
| **创建** | [metric-view-advisor.md](references/metric-view-advisor.md) | 任何创建任务 —— advisor 处理完整工作流（剖析 schema、分析源、建议、部署）。同时加载 [create-patterns.md](references/create-patterns.md) 作为 YAML 规范和模式参考。 |
| **YAML 规范 / 模式** | [create-patterns.md](references/create-patterns.md) | 模式 1–12、完整的 YAML 字段参考、格式陷阱、部署错误、快速参考。是 advisor 的配套；也可直接加载以查找模式。 |
| **查询** | [query-patterns.md](references/query-patterns.md) | 针对指标视图编写 SQL —— `MEASURE()` 基础、过滤器、join 汇总、窗口度量、规则 1–3。 |
| **Genie 集成** | [metric-view-advisor.md §Genie Design Rules](references/metric-view-advisor.md#genie-design-rules) | 单一事实源规则、基础视图、领域组织、命名。智能体元数据字段（`comment`、`synonyms`、`display_name`、`format`）在 [create-patterns.md §YAML Field Reference](references/create-patterns.md#yaml-field-reference)中。 |

典型流程：**advisor → 创建 → 查询/验证 → Genie 集成（如果加入某个 Genie Agent）**。

### 使用声明式自动化捆绑包的源码控制部署

要对某个指标视图进行源码控制，提交其完整的 SQL 定义，并通过捆绑包管理的 SQL 作业执行它。DABs 没有原生的指标视图资源，但捆绑包管理的 SQL 作业可以应用一个已提交的定义：

```yaml
# databricks.yml
bundle:
  name: orders_metrics

variables:
  catalog: { default: main }
  schema:  { default: default }
  warehouse_id: { default: "" }

resources:
  jobs:
    deploy_orders_metrics:
      name: deploy_orders_metrics
      parameters:
        - name: catalog
          default: ${var.catalog}
        - name: schema
          default: ${var.schema}
      tasks:
        - task_key: create_metric_view
          sql_task:
            warehouse_id: ${var.warehouse_id}
            file:
              path: ../src/orders_metrics.metric_view.sql
```

部署并运行：

```bash
databricks bundle deploy --target <TARGET> --profile <PROFILE>
databricks bundle run deploy_orders_metrics --target <TARGET> --profile <PROFILE>
```

参见官方[指标视图捆绑包示例](https://github.com/databricks/bundle-examples/tree/main/knowledge_base/metric_view)。

## 相关技能

- **[databricks-genie-agents](../databricks-genie-agents/SKILL.md)** —— 创建、管理和验证消费此处构建的指标视图的 Genie Agents。面向 Genie 的指标视图设计规则在 [advisor §Genie Design Rules](references/metric-view-advisor.md#genie-design-rules)中；查询规则在 [query-patterns.md](references/query-patterns.md)中。
- **[databricks-aibi-dashboards](../databricks-aibi-dashboards/SKILL.md)** —— 在指标视图之上构建 AI/BI 仪表板。
- **[databricks-data-discovery](../databricks-data-discovery/SKILL.md)** —— 在创建指标视图之前探索数据；跨你的工作区回答问题。
- **[databricks-dabs](../databricks-dabs/SKILL.md)** —— 通过捆绑包管理的作业对指标视图 SQL 定义进行源码控制和部署。

## 资源

- [指标视图文档](https://docs.databricks.com/uc-semantics/metric-views)
- [YAML 语法参考](https://docs.databricks.com/uc-semantics/metric-views/yaml-reference)
- [连接](https://docs.databricks.com/uc-semantics/metric-views/basic-modeling)
- [窗口度量](https://docs.databricks.com/uc-semantics/metric-views/advanced-techniques#window-measures)
- [物化](https://docs.databricks.com/uc-semantics/metric-views/materialization)
- [MEASURE() 函数](https://docs.databricks.com/sql/language-manual/functions/measure)
