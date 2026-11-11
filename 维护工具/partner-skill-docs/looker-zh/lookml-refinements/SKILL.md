---
name: lookml-refinements
description: 深入探讨 LookML include、refinements（分层）以及项目结构
  最佳实践。掌握 Looker 面向对象能力所必需。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

## 1. Include 机制

`include` 使 Open LookML 对象（视图、探索、仪表板）在当前文件中可用。

-   **通配符（`*`）**：匹配任意字符串。
    -   `/views/*.view`：绝对 `/views` 目录中的所有视图。
    -   `*.view`：**当前**目录中的所有视图。
    -   `/**/*.view`：（递归）当前目录及**任意**子目录中的所有视图。
    -   `//project-name/views/*.view`：远程项目导入（需要项目清单）。

-   **最佳实践**：保持具体，以避免命名空间冲突和性能膨胀。
    -   **不好**：`include: "/**/*.view"`（导入所有位置的所有内容。缓慢且风险高）。
    -   **好**：`include: "/views/users.view"`（显式）。
    -   **好**：`include: "/views/finance/*.view"`（限定到某个领域）。

## 2. Refinements（分层）

Refinements 允许你在不更改原始文件的情况下修改现有视图或探索。这对于以下场景至关重要：
1.  **枢纽与分支（Hub & Spoke）**：为核心"枢纽"模型适配特定的"分支"用例。
2.  **供应商 Blocks**：在不分叉的情况下自定义只读 blocks（例如 Google Analytics）。

### 语法
-   **原始**：`view: users { ... }`
-   **Refinement**：`view: +users { ... }`
-   **要求**：在找到原始文件之前，你**必须** `include` 它。

### 使用规则
1.  **最后 include 者胜出**：如果多个文件细化 `+users`，`include` 的顺序决定最终状态。
2.  **增量添加**：新参数会被添加。
3.  **覆盖**：现有参数会被替换。
    -   *例外*：列表参数（如 `drill_fields`）通常是**被替换**而非合并，具体取决于实现。显式重述列表更安全。
4.  **字段修改**：
    -   要修改字段，请用**完全相同的名称**重新声明它。
    -   你只需指定想要更改的参数（例如添加 `description` 或 `label`）。

## 3. "每个探索一个文件"模式

对于可维护、企业规模的 LookML，请遵循使用 `.explore.lkml` 文件的**每个探索一个文件**模式。

### 结构
-   **文件**：`explores/orders.explore.lkml`
-   **内容**：
    1.  仅 `include` *此*探索所需的视图。
    2.  定义 `explore: orders { ... }`。
-   **模型文件**：`models/my_model.model.lkml`
    -   `include: "/explores/orders.explore.lkml"`
    -   *模型文件本身不含 `explore` 定义。*

### 优势
-   **性能**：连接仅解析所请求探索所需的内容。
-   **命名空间卫生**：视图命名冲突被隔离到包含它们的特定探索文件中。
-   **协作**：开发者可以处理不同的探索，而不会在模型文件中产生合并冲突。

# 示例

## 场景：修改供应商视图

**原始**（只读）：`//lkr_block/users.view`
```lookml
view: users {
  dimension: id { primary_key: yes }
  dimension: name {}
}
```

**Refinement**：`views/users_rfn.view`
```lookml
include: "//lkr_block/users.view"

view: +users {
  # 1. New Dimension
  dimension: email {
    sql: ${TABLE}.email ;;
  }

  # 2. Modify Existing Dimension
  dimension: name {
    label: "Full Name"
    description: "Legal name of the user."
  }
}
```

## 场景：探索特定逻辑

**文件**：`explores/marketing_orders.explore.lkml`
```lookml
include: "/views/orders.view"
include: "/views/users.view"

# Refine users ONLY for this explore to add marketing-specific fields
view: +users {
  dimension: acquisition_channel {
    sql: ${TABLE}.utm_source ;;
  }
}

explore: marketing_orders {
  view_name: orders
  from: orders # mapping 'orders' view to 'orders' alias (standard)
  
  join: users {
    sql_on: ${orders.user_id} = ${users.id} ;;
  }
}
```
