---
name: lookml-view
description: 使用本技能创建或修改 LookML 视图。涵盖基本视图定义、
  sql_table_name、文件组织以及模式。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

## 1. 文件组织

-   **标准视图**：`views/[datasource_name]/[view_name].view.lkml`
-   **扩展视图**：`views/[datasource_name]/[view_name]_ext.view.lkml`
-   **Refinements**：`views/[datasource_name]/[view_name]_rfn.view.lkml`
-   **NDT**：`views/[datasource_name]/[view_name]_ndt.view.lkml`
-   **SDT**：`views/[datasource_name]/[view_name]_sdt.view.lkml`

## 2. 核心标准

1.  **sql_table_name**：标准视图**必需**。默认值较脆弱；请显式指定。
2.  **主键**：
    -   **约定**：为便于阅读，将主键放在第一个维度。
    -   必须有 `primary_key: yes` —— **原因**：对于[对称聚合](https://cloud.google.com/looker/docs/symmetric-aggregates)至关重要，Looker 使用它来正确处理 JOIN 行重复（防止多连接查询中的扇出）。
3.  **Refinements**：在视图名称前使用 `+`（例如 `view: +users`）来细化现有视图，而无需修改原始文件。
4.  **Extensions**：使用 `extends` 复用其他视图的逻辑。
5.  **派生表**：**评估并尽量引导使用原生派生表（NDT）**（`explore_source`）而非 SQL 派生表（`sql`）。在创建实体汇总或摘要事实（例如 `user_order_facts`）时，评估是否可由现有探索获取数据。推荐使用 NDT，因为它们能最小化代码漂移，并自动继承底层 LookML 的描述、格式和行级安全（RLS）。如果 NDT 过于复杂，或需要特定的 SQL 特性，SDT 也完全可以接受。

## 3. 最佳实践

-   **命名**：视图名称和文件名使用 `snake_case`。
-   **描述**：如果有助于说明视图用途，请为视图本身添加描述（例如"按地区汇总的日活跃用户"）。
-   **输出格式**：确保文件以换行符结尾。

## 4. 相关技能

-   **[lookml-refinements](../lookml-refinements/SKILL.md)**：`include`、refinements（`+`）以及枢纽与分支模式的逻辑。

# 示例

## 基本视图

```lookml
view: users {
  sql_table_name: `project.dataset.users` ;;

  dimension: user_id {
    primary_key: yes
    type: number
    sql: ${TABLE}.id ;;
    group_label: "IDs"
    description: "Unique internal user ID."
  }

  dimension: email {
    type: string
    sql: ${TABLE}.email ;;
    description: "User's email address."
  }
}
```

## 扩展视图

```lookml
include: "/views/base/users.view"

view: users_extended {
  extends: [users]

  dimension: lifetime_value {
    type: number
    sql: ${TABLE}.ltv ;;
    description: "Total lifetime value of the user."
  }
}
```

## Refinement（分层）

```lookml
include: "/views/users.view"

view: +users {
  label: "All Users (Refined)"
  
  dimension: email {
    # Adding a description to an existing field
    description: "Primary contact email."
  }
}
```

## 参考技能

- [派生表](references/derived_table.md)：标准（SDT）和原生（NDT）派生表的模式/物化。
