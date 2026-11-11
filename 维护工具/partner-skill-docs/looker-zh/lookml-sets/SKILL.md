---
name: lookml-sets
description: 使用 LookML set 对字段分组、控制可见性以及
  管理下钻路径的指南。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# LookML Sets

Set 是在视图或模型中定义的可复用字段列表（维度、度量和筛选器）。它们主要用于将字段分组，以实现各种目的，例如下钻路径、探索字段可见性等。

## 语法

```lookml
set: set_name {
  fields: [field_name1, field_name2, view_name.field_name3, ...]
}
```

### 关键特性

*   **可复用性**：定义一次字段列表，即可在多处使用。
*   **组合**：
    *   **包含全部**：`[set_name*]` 包含另一个 set 中的所有字段。
    *   **排除**：`[-field_name]` 排除特定字段。
    *   **外部引用**：`view_name.set_name*` 引用另一个视图中的 set（确保视图已连接）。

## 使用场景

### 1. 下钻字段（主要用途）

Set 是定义用户点击度量值时所发生情况的标准方式。无需反复列出字段，只需定义一个 set 并引用它。

```lookml
view: orders {
  # ... dimensions ...

  set: order_details {
    fields: [id, created_date, status, user.email]
  }

  measure: count {
    type: count
    drill_fields: [order_details*]
  }
}
```

### 2. 控制探索可见性（字段选择器）

你可以在探索级别使用 set，显式定义哪些字段对用户可见。这是精心组织探索的最佳实践。

```lookml
explore: orders {
  fields: [ALL_FIELDS*]         # Start with everything (default)
  # OR
  fields: [orders.order_details*, users.user_info*] # Allowlist specific sets
}
```

### 3. 排除字段

使用 set 从探索中排除特定字段，而不在视图级别隐藏它们（视图级别会全局隐藏）。

```lookml
explore: orders {
  fields: [ALL_FIELDS*, -users.password_hash]
}
```

## 最佳实践

### 1. `detail` Set

理想情况下，每个视图都应有一个默认 set（通常命名为 `detail` 或 `drill_set`），其中包含用于从该视图下钻到记录的最相关字段。

```lookml
view: users {
  dimension: id { primary_key: yes ... }
  dimension: name { ... }
  dimension: email { ... }

  # Standard set for drilling
  set: detail {
    fields: [id, name, email]
  }
}
```

### 2. 命名约定

*   set 名称使用 `snake_case`。
*   使用描述性名称，如 `user_info`、`financial_metrics`、`drill_detail`。

### 3. 避免视图 Set 中的跨视图依赖

虽然你*可以*在视图的 set 中引用 `other_view.field`，但这会创建依赖关系。请确保每当使用该 set 时 `other_view` *始终*被连接。
*   **更好**：定义视图局部的 set（仅包含其自身字段）。
*   **探索级别**：在探索级别组合来自不同视图的 set（例如 `fields: [orders.detail*, users.detail*]`）。

### 4. 累积 Set

你可以在其他 set 之上构建 set。

```lookml
set: basic_info {
  fields: [id, name]
}

set: extended_info {
  fields: [basic_info*, email, created_date]
}
```
