---
name: manage-users
description: >-
  通过 MCP 管理 Harness 用户、用户组和 service account。列出和搜索用户，创建并管理用于团队访问的用户组，
  创建用于 API 自动化的 service account，并查看可用权限。在要求列出用户、创建用户组、管理 service account、
  检查谁有访问权限或设置团队权限时使用。不要用于角色分配或资源组（请改用 manage-roles）。
  触发短语：列出用户、用户组、service account、谁有访问权限、团队权限、将用户添加到组、创建 service account。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Manage users, user groups, and service accounts
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理用户

通过 MCP 管理用户、用户组和 service account。

## 说明

### 第 1 步：列出用户

```
Call MCP tool: harness_list
Parameters:
  resource_type: "user"
  search_term: "<name or email>"
```

用户是账户范围的。使用 `search_term` 按名称或邮箱筛选。

### 第 2 步：获取用户详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "user"
  resource_id: "<user_id>"
```

### 第 3 步：管理用户组

列出组：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "user_group"
  org_id: "<organization>"
  project_id: "<project>"
  search_term: "<group name>"
```

获取组详情：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "user_group"
  resource_id: "<group_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

创建组：

```
Call MCP tool: harness_create
Parameters:
  resource_type: "user_group"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    identifier: "backend_team"
    name: "Backend Team"
    description: "Backend engineering team"
    users:
      - "<user_id_1>"
      - "<user_id_2>"
```

删除组：

```
Call MCP tool: harness_delete
Parameters:
  resource_type: "user_group"
  resource_id: "<group_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 第 4 步：管理 service account

列出 service account：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "service_account"
  org_id: "<organization>"
  project_id: "<project>"
```

创建 service account：

```
Call MCP tool: harness_create
Parameters:
  resource_type: "service_account"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    identifier: "ci_bot"
    name: "CI Bot"
    description: "Service account for CI pipeline automation"
    email: "ci-bot@harness.io"
```

删除 service account：

```
Call MCP tool: harness_delete
Parameters:
  resource_type: "service_account"
  resource_id: "<service_account_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 第 5 步：列出可用权限

```
Call MCP tool: harness_list
Parameters:
  resource_type: "permission"
```

这会返回所有平台权限。用它来了解可以通过角色分配哪些权限。

## 资源类型

| 资源类型 | 范围 | 操作 | 描述 |
|--------------|-------|-----------|-------------|
| `user` | 账户 | list, get | 平台用户（只读） |
| `user_group` | 项目 | list, get, create, delete | 用于 RBAC 的用户组 |
| `service_account` | 项目 | list, get, create, delete | API 自动化账户 |
| `permission` | 账户 | list | 可用权限（只读） |

## 与 /manage-roles 的关系

本技能管理**主体（principal）**（用户、组、service account）。使用 `/manage-roles` 为这些主体分配**角色**和**资源组**：

1. `/manage-users`——创建用户组或 service account
2. `/manage-roles`——为该主体分配角色 + 资源组

## 示例

- “列出账户中的所有用户”——列出无筛选的用户
- “查找用户 john.doe”——使用 search_term "john.doe" 列出用户
- “为平台团队创建用户组”——使用成员用户 ID 创建 user_group
- “为 CI 自动化创建 service account”——创建 service_account
- “有哪些可用权限？”——列出权限
- “删除旧的 test-bot service account”——删除 service_account

## 性能注意事项

- 更改前先核实用户邮箱地址和组标识符。
- 创建之前列出现有组和 service account 以避免重复。
- 对于 service account，确认令牌过期时间和范围与预期用途相符。

## 故障排查

### 用户未找到
- 用户是账户范围的——不需要 org/project
- 尝试按邮箱地址而非显示名称搜索
- 用户必须先被邀请到账户中才会出现

### 无法创建用户
- 无法通过 API 创建用户——必须通过 Harness UI 或 SCIM 预配进行邀请
- 使用用户组和 service account 进行编程访问

### service account 没有访问权限
- 仅创建 service account 并不会授予权限
- 使用 `/manage-roles` 为 service account 分配角色
- 通过 Harness UI 为 service account 生成 API 密钥
