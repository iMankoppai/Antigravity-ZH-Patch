---
name: lookml-liquid
description: 使用本技能在 LookML 中使用 Liquid 变量实现动态 SQL、HTML
  和链接，包括用于查询优化的高级模式。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

1.  **语法**：
    *   `{{ value }}`：输出语法（插入文本）。
    *   `{% if condition %}`：标签语法（逻辑）。
2.  **常用变量**：
    *   `value`：来自数据库的原始值（最适合用于比较）。
    *   `rendered_value`：已格式化的值（最适合用于展示）。
    *   `_filters['view.field']`：用户选择的筛选值。
    *   `parameter_name._parameter_value`：所选的参数值。
3.  **最佳实践**：
    *   **SQL 注入**：在将用户输入（例如 `_filters`）插入到生成字符串字面量的 SQL 中时，始终使用 `| sql_quote`。
    *   **布尔值**：如果你的方言需要字面量 `TRUE`/`FALSE`（如 BigQuery），请为 `_in_query` 或 `_is_selected` 变量追加 `| sql_boolean`（例如 `{{ view.field._in_query | sql_boolean }}`）。
    *   **依赖感知**：请记住 `_in_query` 会检查字段是否用于 **SELECT、筛选器和 `required_fields`**。它并不限于可见列。
    *   **性能**：如果字段尚未出现在查询中，避免在 `link` 参数中引用 `{{ field._value }}`，因为这会强制 Looker 将该字段添加到 `GROUP BY` 子句，可能导致结果集扇出。如果你只需要浏览器结果行中的值，请改用 `row['view.field']`。

# 高级变量用法

## `_in_query` 与 `_is_selected`

| 变量 | 定义 | 关键区别（总计） |
| :--- | :--- | :--- |
| `_in_query` | 如果字段位于 SELECT 子句、筛选器或 `required_fields` 中，则返回 `true`。 | 在计算总计期间，如果该字段对查询有贡献，则**保持 `true`**。 |
| `_is_selected` | 如果字段位于 SELECT 子句或 `required_fields` 中，则返回 `true`。 | 计算维度总计（行/列/总计）期间**返回 `false`**，因为为计算总计会从查询中移除维度。 |

> [!WARNING]
> 如果你使用 `_is_selected` 为某个维度条件渲染逻辑，该逻辑在总计行中会**失败**（返回 false）。如果你需要该逻辑在总计中保持有效，请使用 `_in_query`；或者如果这是期望的行为，请显式处理总计中的 `false` 状态。

# Liquid 变量定义

下表描述了可与 LookML 一起使用的 Liquid 变量及其可用的位置。

**用法图例：**
*   **A**：`action`
*   **DV**：`default_value`（仪表板）
*   **DE**：`description`
*   **F**：`filters`（仪表板元素）
*   **H**：`html`
*   **LA**：标签参数（`label`、`view_label`、`group_label`、`group_item_label`）
*   **LI**：`link`
*   **S**：SQL 参数（`sql`、`sql_on`、`sql_table_name`）

| 变量 | 定义 | 用法 |
| :--- | :--- | :--- |
| `value` | 字段的原始值。 | A, H, LI |
| `rendered_value` | 字段的格式化值。 | A, H, LI |
| `filterable_value` | 为 URL 筛选格式化的值。 | A, H, LI |
| `link` | 默认的下钻链接 URL。 | A, H, LI, S |
| `linked_value` | 带默认格式化和链接的值。 | A, H, LI |
| `_filters['view.field']` | 应用于该字段的用户筛选器。 | A, DE, H, LA, LI |
| `{% date_start filter %}` | 日期筛选器的开始日期。 | S |
| `{% date_end filter %}` | 日期筛选器的结束日期。 | S |
| `{% condition filter %} sql {% endcondition %}` | 将筛选逻辑应用于 SQL。 | S |
| `{% parameter name %}` | 参数的值。 | DE, LA, S |
| `name._parameter_value` | 注入参数值（可安全用于逻辑）。 | DE, H, LA, LI, S |
| `_user_attributes['name']` | 用户属性值。 | A, DE, H, LA, LI, S, DV, F |
| `_model._name` | 模型名称。 | A, DE, H, LA, LI, S |
| `_view._name` | 视图名称。 | A, DE, H, LA, LI, S |
| `_explore._name` | 探索名称。 | A, DE, H, LA, LI, S |
| `_field._name` | 字段名称。 | A, DE, H, LA, LI, S |
| `view._in_query` | 如果查询了视图中的*任意*字段，则为 `true`。 | DE, LA, LI, S |
| `view.field._in_query` | 如果字段在查询/筛选器中，则为 `true`。 | DE, LA, LI, S |
| `view.field._is_selected` | 如果字段在 SELECT 中，则为 `true`。 | DE, LA, LI, S |
| `view.field._is_filtered` | 如果字段被筛选，则为 `true`。 | DE, LA, LI, S |

# 高级用例

## 1. 聚合感知（动态表选择）
当用户不请求细粒度详情时，使用 `_in_query` 将查询路由到更小的预聚合表。这会显著提升查询性能。

```lookml
view: orders {
  sql_table_name:
    {% if orders.created_date._in_query or orders.created_hour._in_query %}
      orders_daily_summary  -- Fallback to daily partition if granular date used
    {% elsif orders.created_month._in_query %}
      orders_monthly_summary -- Use monthly summary for high-level queries
    {% else %}
      orders_all_transactions -- Default/Detail table
    {% endif %} ;;
}
```

## 2. 动态连接（`sql_on`）
在连接中使用 `_in_query`，以避免在用户选择并不真正需要时连接繁重的表。

```lookml
explore: order_items {
  join: users {
    type: left_outer
    sql_on: ${order_items.user_id} = ${users.id} ;;
    relationship: many_to_one
  }

  join: user_facts {
    type: left_outer
    sql_on: ${users.id} = ${user_facts.user_id} ;;
    relationship: one_to_one
    # Only join user_facts if a field from it is actually selected/filtered
    sql_where: {% if user_facts._in_query %} 1=1 {% else %} 1=0 {% endif %} ;;
  }
}
```
*注意：在某些方言中，`sql_where` 技巧是强制丢弃连接的一种方式，但如果受支持，使用 `{% if %}` 的标准 `sql_on` 逻辑更干净。*

## 3. 列特定逻辑（动态分母）
根据查询中出现的其他字段来更改计算。

```lookml
measure: dynamic_rate {
  type: number
  sql:
    {% if users.traffic_source._is_selected %}
      ${total_revenue} / NULLIF(${traffic_source_count}, 0)
    {% else %}
      ${total_revenue} / NULLIF(${total_users}, 0)
    {% endif %} ;;
}
```

# 示例

## 动态 HTML（条件格式）

```lookml
dimension: status {
  html:
    {% if value == 'complete' %}
      <span style="color: green">{{ rendered_value }}</span>
    {% else %}
      <span style="color: red">{{ rendered_value }}</span>
    {% endif %} ;;
}
```

## 模板化筛选器（派生表）

```lookml
view: customer_facts {
  derived_table: {
    sql:
      SELECT customer_id, SUM(amount)
      FROM orders
      WHERE {% condition order_date %} created_at {% endcondition %}
      GROUP BY 1 ;;
  }
}
```

## 复杂逻辑（循环与拆分）

LookML Liquid 可以处理字符串操作和循环，这对于解析复杂筛选参数或展开值很有用。这虽不常用，但在复杂的建模任务中非常便利。

```lookml
view: brand_category_item {
  parameter: filter { type: unquoted }
}

explore: complex_filter_parsing {
  # Example: Parsing a string like "Brand1..Category1__Brand2..Category2"
  # This logic splits the string by '__' then '..' to generate OR conditions
  sql_where:
    {% assign items = brand_category_item.filter._parameter_value | split: '__' %}
    {% for item in items %}
      {% assign parts = item | split: '..' %}
      {% if forloop.first %} ( {% else %} OR ( {% endif %}
        ${products.brand} = '{{ parts[0] }}' AND ${products.category} = '{{ parts[1] }}'
      )
    {% endfor %}
    {% if items.size == 0 %} 1=1 {% endif %}
  ;;
}
```
