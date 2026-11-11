---
name: lookml-explore
description: 当你需要创建或修改 LookML 探索时使用本技能。这
  包括定义探索、连接、access grants 以及基本配置。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

## 1. 核心标准

1.  **命名约定**：探索名称使用 `snake_case`。
2.  **必需参数**：
    -   `description`：**100% 覆盖**。每个探索都必须有 description。
    -   `label`：探索在 UI 中的用户友好名称。
    -   `view_name`：默认为探索名称，但显式定义更安全。
3.  **连接**：
    -   `relationship`：**必需**（one_to_one、many_to_one）。
    -   `sql_on`：**必需**。使用 `${left.id} = ${right.id}` 语法。
    -   `type`：默认为 `left_outer`。如需要，显式使用 `inner` 或 `full_outer`。
4.  **格式**：
    -   不要仅为美观而使用 `from` 重命名视图。请改用 `view_label`。
    -   例外：多态连接、自连接、重新作用域扩展。

## 2. 高级配置

-   `always_filter`：用户可以更改但无法移除的特定筛选器。
-   `sql_always_where`：用户*无法*更改的特定限制。
-   `persist_with`：将探索缓存链接到 datagroup（例如 `default_datagroup`）。
-   `fields`：必要时使用包含式列表严格控制内容（`ALL_FIELDS*`、`-view.field`）。

## 3. 性能优化（聚合表）

聚合表（聚合感知）允许 Looker 查询更小的预聚合表，而非原始细粒度数据，从而大幅提升查询性能。

### 聚合表的结构

```lookml
explore: orders {
  aggregate_table: rollup_name {
    query: {
      dimensions: [created_date, status]
      measures: [total_revenue, count]
      filters: [orders.created_date: "6 months"]
    }
    materialization: {
      datagroup_trigger: ecommerce_etl
      # partition_keys: ["created_date"] # BigQuery/Presto optimization
      # increment_key: "created_date"    # Incremental builds
      # increment_offset: 3              # Rebuild last 3 periods
    }
  }
}
```

### 关键参数

1.  **Query**：定义 rollup 的"形状"。
    *   **Dimensions**：包含仪表板中常用的所有维度（包括筛选器）。
    *   **Measures**：包含基础度量（sum、count）。Looker 可以从 sum+count 推导出平均值。
    *   **Filters**：可选。将 rollup 限制到数据子集（例如"最近 6 个月"）。

2.  **Materialization**：
    *   **datagroup_trigger**：（推荐）在 ETL 作业完成时重建。
    *   **sql_trigger_value**：在 SQL 查询返回新值时重建。
    *   **increment_key**：（高级）追加新数据而非完整重建。最适合庞大的表。
    *   **indexes** / **partition_keys** / **cluster_keys**：方言特定的优化。

3.  **最佳实践**：
    *   **时间粒度**：包含所需的最细粒度（例如 `date`）。Looker 可以自动将 `date` 上卷到 `month` 或 `year`。
    *   **精确匹配**：用户查询必须是聚合表字段的*严格子集*，才能满足感知逻辑。
    *   **筛选器感知**：如果用户筛选的字段*不*在聚合表中，Looker 就无法使用它（除非是"精确匹配"的特殊情况）。请将常用筛选字段添加到 `dimensions` 列表中。

## 4. 扩展探索

*   **Extends**：使用 `extends: [base_explore]` 从另一个探索继承连接、字段和描述。
    *   **使用场景**：创建一个带通用连接的"基础"探索，然后为特定分析创建"扩展"探索（例如 `orders` -> `marketing_orders`）。

# 示例

## 基本探索

```lookml
explore: orders {
  label: "Orders"
  description: "Analyze order data, including user and product details."
  view_name: orders
  
  join: users {
    relationship: many_to_one
    sql_on: ${orders.user_id} = ${users.id} ;;
  }
}
```

## 带筛选器与缓存的探索

```lookml
explore: events {
  label: "Web Events"
  description: "User interaction events."
  persist_with: default_datagroup

  # Users can change this filter, but it defaults to '7 days'
  always_filter: {
    filters: [events.created_date: "7 days"]
  }

  # Users CANNOT change this filter.
  sql_always_where: ${events.is_test_data} = false ;;
  
  join: sessions {
    relationship: many_to_one
    sql_on: ${events.session_id} = ${sessions.session_id} ;;
  }
}
```

## 聚合表（高级）

```lookml
explore: orders {
  aggregate_table: monthly_sales_summary {
    query: {
      dimensions: [created_month, status, products.category]
      measures: [total_revenue, count]
      filters: [orders.created_date: "2 years"]
    }
    materialization: {
      datagroup_trigger: ecommerce_etl
      partition_keys: ["created_month"]
      increment_key: "created_month"
      increment_offset: 1 # Rebuild current and previous month
    }
  }
}
```

## 扩展探索

```lookml
explore: orders_extended {
  extends: [orders]
  label: "Orders (Marketing View)"
  view_name: orders
  
  # Add new joins specific to this view
  join: marketing_channels {
    sql_on: ${orders.channel_id} = ${marketing_channels.id} ;;
    relationship: many_to_one
  }
}
```

## 参考技能

对于更复杂的场景，请参阅以下专门化技能：
- [高级探索配置](references/advanced.md)：UNNEST 展开、横向展平以及行级安全。
- [连接深入解析](references/joins.md)：详细的连接类型、关系和别名。
