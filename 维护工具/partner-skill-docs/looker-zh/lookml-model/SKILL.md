---
name: lookml-model
description: 当你需要创建或修改 LookML 模型文件
  (.model.lkml) 时使用本技能。这包括定义连接、include 以及配置模型级
  设置。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

1.  **定义模型文件**：模型文件通常对应一个数据库连接，并包含探索。
2.  **必需参数**：
    - `connection: "connection_name"`：必须匹配 Looker 管理后台中定义的连接。
    - `include: "pattern"`：指定模型可用的视图文件和仪表板文件。
3.  **最佳实践**：
    - **Includes**：尽量避免 `include: "*.view"`，以防止性能问题和命名空间混乱。使用具体路径或通配符，如 `include: "/views/users.view"` 或 `include: "/views/marketing/*.view"`。
    - **Label**：使用 `label:` 为模型在 UI 中提供用户友好名称。
    - **周起始日**：如果业务逻辑需要特定的起始日（例如 `monday`），请设置 `week_start_day:`。
    - **Datagroup 与缓存**：始终使用 datagroup 管理缓存策略，以使 Looker 与你的 ETL/ELT 流程对齐。

## 4. Datagroup 与缓存

Datagroup 是管理缓存策略的首选机制。

- **定义**：在模型文件中定义。
- **sql_trigger**：返回单个值（例如最大时间戳）的查询。如果该值变化，缓存即失效。
- **max_cache_age**：触发器不变时的回退时长。
- **persist_with**：将 datagroup 应用于探索或整个模型。

### Datagroup 与 `persist_for` 对比

| 特性        | Datagroup（推荐）                   | `persist_for`                         |
| :------------- | :----------------------------------------- | :------------------------------------ |
| **触发器**    | SQL 查询（智能）                          | 固定时间（呆板）                     |
| **对齐**  | 与 ETL/ELT 完成对齐             | 不对齐（凭猜测）                |
| **管理** | 集中在模型文件中                  | 分散在探索/模型中          |
| **使用场景**   | 生产仪表板、ETL 同步 | 临时查询、实时（<1 小时）需求 |

> [!TIP]
> 仅在需要每隔 X 分钟强制刷新缓存的实时仪表板（例如股票行情、快速变动的库存）中使用 `persist_for`。其他所有场景请使用 **Datagroup**。

## 5. Include 模式

使用严格的模式来控制作用域和性能。

| 模式 | 描述 | 使用场景 |
| :--- | :--- | :--- |
| `include: "/views/*.view"` | 特定文件夹中的所有视图 | 标准模块化 |
| `include: "/views/marketing/users.view"` | 特定文件 | 精确控制，避免冲突 |
| `include: "/**/*.view"` | **递归**（项目中的所有视图） | **避免**使用，除非项目很小 |
| `include: "/dashboards/*.dashboard"` | 文件夹中的所有仪表板 | 导入仪表板 |

# 示例

## 基本模型

```lookml
connection: "thelook"

# Include all views in the views/ folder
include: "/views/*.view"

# Include all dashboards
include: "/*.dashboard"

# Define an Explore (usually better to define in separate files for large projects, but acceptable here for small ones)
explore: orders {
  join: users {
    type: left_outer
    sql_on: ${orders.user_id} = ${users.id} ;;
    relationship: many_to_one
  }
}
```

## 带特定设置的模型

```lookml
connection: "snowlooker"

label: "eCommerce Analytics"

# Set valid week start day
week_start_day: monday

# Include specific folders
include: "/views/finance/*.view"
include: "/views/marketing/*.view"
```

## 带 Datagroup 的模型（最佳实践）

```lookml
connection: "thelook"

# Define the caching policy
datagroup: ecommerce_etl {
  description: "Triggers when the max created_at date changes in the events table."
  sql_trigger: SELECT MAX(created_at) FROM `project.dataset.events` ;;
  max_cache_age: "24 hours" # Fallback
}

# Apply default caching to all Explores in this model
persist_with: ecommerce_etl

include: "/views/*.view"

explore: orders {
  # This explore inherits 'persist_with: ecommerce_etl' from the model default
}

explore: real_time_dashboard {
  # Override with a different policy if needed
  persist_for: "5 minutes"
}
```
