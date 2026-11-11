---
name: lookml-fields
description: LookML 字段类型（Dimension、Measure、Filter、Parameter）概述，
  以及 `sql` 参数在各类字段中的作用。使用本技能为你的数据建模
  需求选择正确的字段类型。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

## 1. 字段类型概述

LookML 字段是数据模型的构建单元。每种类型在生成 SQL 时都有其特定用途。

| 字段类型 | 用途 | SQL 生成阶段 |
| :--- | :--- | :--- |
| **Dimension** | 描述数据（属性）。对结果分组。 | `SELECT` 和 `GROUP BY` 子句。 |
| **Measure** | 聚合数据（指标）。计算结果。 | `SELECT` 子句（含聚合）。 |
| **Filter** | 根据条件限制数据。 | `WHERE` 或 `HAVING` 子句（通过模板化筛选器）。 |
| **Parameter** | 捕获用户输入以用于动态逻辑。 | *不直接生成*（将值注入其他字段）。 |
| **Dimension Group** | 生成基于时间的维度（`type: time`）或计算日期差/时长（`type: duration`）。 | `SELECT` 和 `GROUP BY` 子句（多列）。 |

## 2. `sql` 参数的作用

`sql` 参数的行为严格取决于字段类型。

### 维度（Dimension）："是什么"
*   **作用**：定义在*任何聚合之前*对列的原始转换。
*   **SQL 上下文**：表达式直接放入 `GROUP BY` 子句。
*   **输入**：可以引用表列（`${TABLE}.col`）、其他维度（`${dim}`）或原始 SQL 函数。
*   **示例**：
    ```lookml
    dimension: full_name {
      sql: CONCAT(${first_name}, ' ', ${last_name}) ;;
    }
    -- Generates: CONCAT(table.first_name, ' ', table.last_name)
    ```

### 度量（Measure）："有多少"
*   **作用**：定义要聚合的值，*或*涉及其他聚合值的计算。
*   **SQL 上下文**：将表达式放在聚合函数*内部*（例如 `SUM(sql)`），或作为 `type: number` 的独立计算。
*   **输入**：
    *   对于 `type: sum/avg/min/max`：引用维度或列。
    *   对于 `type: number`：引用其他*度量*。
    *   对于 `type: count`：`sql` 被**忽略**（始终为 `COUNT(*)` 或 `COUNT(primary_key)`）。
*   **示例**：
    ```lookml
    measure: total_profit {
      type: sum
      sql: ${sale_price} - ${cost} ;; 
    }
    -- Generates: SUM(sale_price - cost)
    ```

### 筛选器（Filter）："哪一个"
*   **作用**：定义条件逻辑，*通常*用于派生表或 `sql_always_where` 中的模板化筛选器。
*   **SQL 上下文**：在现代 LookML 中，`filter` 字段中的 `sql` 参数**很少直接使用**。相反，筛选器的*输入*被用于 `{% condition %}` 标签中。
*   **最佳实践**：判断你需要的是 `filter` 字段，还是只需 `parameter` + `dimension`。
*   **示例（模板化筛选器）**：
    ```lookml
    filter: date_filter { type: date }
    -- Usage in Derived Table SQL:
    -- WHERE {% condition date_filter %} created_at {% endcondition %}
    ```

### 参数（Parameter）："用户输入"
*   **作用**：本身**不**生成 SQL。它保存用户选择的值，用于注入*其他*字段。
*   **SQL 上下文**：通过 Liquid 变量（`{% parameter name %}`）在维度、度量或派生表中访问。
*   **输入**：用户从 UI 列表中选择或输入值。
*   **示例**：
    ```lookml
    parameter: timeframe_selector {
      type: unquoted
      allowed_value: { value: "month" }
      allowed_value: { value: "year" }
    }
    dimension: dynamic_date {
      sql: DATE_TRUNC({% parameter timeframe_selector %}, ${created_raw}) ;;
    }
    ```

### 维度组（Dimension Group）："时间生成器与日期差计算器"
*   **作用**：对于 `type: time`，从源时间戳生成多个时间粒度。对于 `type: duration`，计算两个时间戳之间经过的时间/日期差（例如 `month_since_signup`、`datediff`）。
*   **SQL 上下文**：对列进行类型转换、截断或计算日期差。
*   **输入**：标准化的时间戳/日期表达式，或开始/结束时间戳列。
*   **示例**：
    ```lookml
    dimension_group: created {
      type: time
      timeframes: [date, month]
      sql: ${TABLE}.created_at ;;
    }
    -- Generates:
    -- created_date -> CAST(table.created_at AS DATE)
    -- created_month -> DATE_TRUNC(table.created_at, MONTH)
    ```

## 3. 差异总结

| 类型 | `sql` 引用... | 可引用度量？ | 是否聚合？ |
| :--- | :--- | :--- | :--- |
| **Dimension** | 列、其他维度 | **否** | 否 |
| **Measure (Agg)** | 列、维度 | **否** | 是 |
| **Measure (Num)** | **其他度量** | **是** | 是（已聚合） |
| **Filter** | （很少使用） | 否 | 不适用 |
| **Parameter** | （无） | 否 | 不适用 |

## 参考技能

关于特定字段类型的详细标准，请参阅：
- [维度](references/dimension.md)：命名、标签以及类型特定规则。
- [度量](references/measure.md)：聚合类型、筛选器和格式。
- [筛选器与参数](references/filter_parameter.md)：模板化筛选器和用户输入。
- [维度组](references/dimension_group.md)：时间粒度和间隔。
- [值格式](references/value_format.md)：命名和自定义货币/数字格式。
