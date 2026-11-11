---
name: lookml-access-grants
description: 使用本技能创建用于行级或对象级
  安全的 Access Grants。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 操作说明

1.  **定义 Access Grant**：
    *   在**模型**级别定义。
    *   将一个 `user_attribute` 链接到一组 `allowed_values`。
2.  **应用 Access Grant**：
    *   在探索、连接、视图或字段级别使用 `required_access_grants: [grant_name]`。
    *   用户必须匹配**所有**列出的 grant 才能看到该对象。
3.  **最佳实践**：
    *   **精确匹配**：`allowed_values` 必须唯一匹配用户属性值（不允许通配符/部分匹配）。
    *   **累加性**：Grant 是累加的。如果某个视图需要 Grant A，某个字段需要 Grant B，则用户需要*两者*才能看到该字段。

# 示例

## 基本 Access Grant

```lookml
# In model file
access_grant: can_view_finance {
  user_attribute: department
  allowed_values: ["finance", "executive"]
}

# In view file
view: finance_data {
  required_access_grants: [can_view_finance]
  # ...
}
```

## 字段级安全

```lookml
dimension: salary {
  type: number
  sql: ${TABLE}.salary ;;
  required_access_grants: [can_view_finance]
}
```
