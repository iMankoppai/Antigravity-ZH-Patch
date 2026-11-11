---
name: lookml-tests
description: 编写 LookML 测试以确保数据
  完整性、准确性和逻辑验证的标准与最佳实践。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# LookML 测试标准

测试对于维持对数据的信任至关重要。LookML 测试使我们能够验证语义模型的行为符合预期，且底层数据符合我们的假设。

## 1. 文件组织

-   **位置**：在 `tests/[explore_name].test.lkml` 中定义测试。
-   **每个探索一个套件**：每个文件应包含特定探索的*所有*测试定义。
-   **命名约定**：`[explore_name].test.lkml`（例如 `orders.test.lkml`）。

## 2. 测试结构

每个测试由一个 `explore_source` 查询和一个 `assert` 语句组成。

```lookml
test: [test_name] {
  explore_source: [explore_name] {
    column: [column_name] { field: [view_name].[field_name] }
    filters: {
      field: [view_name].[field_name]
      value: "[value]"
    }
  }

  assert: [assertion_name] {
    expression: ${[view_name].[field_name]} [operator] [value] ;;
  }
}
```

## 3. 测试类型

### A. 完整性检查（关键）
验证主键在连接后仍保持唯一。这是防御因不正确的 `one_to_many` 连接定义所导致的"扇出"错误的最佳手段。

**示例：主键唯一性**
```lookml
test: orders_pk_is_unique {
  explore_source: orders {
    column: order_id {}
    column: count {}
    # Limit to recent data to save costs/time if table is large
    filters: {
      field: orders.created_date
      value: "last 7 days"
    }
  }

  assert: order_id_is_unique {
    expression: ${orders.count} = 1 ;;
  }
}
```

### B. 准确性测试
对照已知常量或预期值验证特定度量值。

**示例：营收为正**
```lookml
test: revenue_is_positive {
  explore_source: orders {
    column: total_revenue {}
    filters: {
      field: orders.created_date
      value: "yesterday"
    }
  }

  assert: revenue_greater_than_zero {
    expression: ${orders.total_revenue} >= 0 ;;
  }
}
```

### C. 业务逻辑验证
确保计算行为符合预期。例如，检查 `gross_margin` 从不大于 `revenue`，或活跃用户的 `lifetime_orders` 从不为 NULL。

**示例：逻辑检查**
```lookml
test: margin_less_than_revenue {
  explore_source: orders {
    column: total_revenue {}
    column: total_margin {}
  }
  
  assert: margin_is_valid {
    expression: ${orders.total_margin} <= ${orders.total_revenue} ;;
  }
}
```

## 4. 最佳实践

-   **描述性扩展**：为测试（`orders_pk_is_unique`）和断言（`order_id_is_unique`）使用信息量大的名称。
-   **性能**：对于大表，使用筛选器（例如 `last 7 days`）来限制扫描规模，除非需要验证完整历史。
-   **模型包含**：确保 `test` 文件包含在模型文件中（例如 `include: "/tests/*.test.lkml"`）。
