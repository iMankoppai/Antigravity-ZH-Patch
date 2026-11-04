---
name: manage-roles
description: >-
  通过 MCP v2 工具管理 Harness RBAC 角色、角色分配、权限和资源组。
  列出、创建、更新和删除自定义角色。查看用户、组和 service account 的角色分配和权限。
  在需要管理访问控制、分配角色、检查权限、创建自定义角色、审查 RBAC 配置、入职用户或审计访问时使用。
  触发短语：管理角色、RBAC、角色分配、用户权限、访问控制、自定义角色、
  资源组、谁有访问权限、授予访问权限、撤销访问权限。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: RBAC roles, assignments, permissions, and resource groups
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理角色技能

通过 MCP v2 工具管理 Harness RBAC（基于角色的访问控制）。

## 使用的 MCP v2 工具

| 工具 | 资源类型 | 操作 |
|------|--------------|------------|
| `harness_list` | `role` | 列出所有角色 |
| `harness_get` | `role` | 获取角色详情 |
| `harness_create` | `role` | 创建自定义角色 |
| `harness_update` | `role` | 更新自定义角色 |
| `harness_delete` | `role` | 删除自定义角色 |
| `harness_list` | `role_assignment` | 列出角色分配 |
| `harness_get` | `role_assignment` | 获取分配详情 |
| `harness_list` | `permission` | 列出可用权限 |
| `harness_get` | `permission` | 获取权限详情 |
| `harness_list` | `resource_group` | 列出资源组 |
| `harness_get` | `resource_group` | 获取资源组详情 |
| `harness_describe` | `role` | 发现角色架构 |
| `harness_search` | -- | 搜索角色相关资源 |

有关内置角色（account/org/project/module）、资源组、常用权限和角色分配结构，请参阅 references/builtin-roles.md。

## 说明

### 第 1 步：理解需求

确定：
- **谁**需要访问（用户邮箱、组 ID 或 service account ID）
- **什么**级别的访问（admin、developer、viewer、executor、custom）
- **哪里**（account、org、project 范围）
- **哪些资源**（全部或特定资源组）

### 第 2 步：列出现有角色

```
harness_list(
  resource_type="role",
  org_id="<org>",           # optional
  project_id="<project>",   # optional
  search_term="<keyword>"   # optional
)
```

### 第 3 步：检查当前分配

```
harness_list(
  resource_type="role_assignment",
  org_id="<org>",
  project_id="<project>"
)
```

### 第 4 步：列出可用权限（用于自定义角色）

```
harness_list(resource_type="permission")
```

### 第 5 步：创建自定义角色（如需要）

```
harness_create(
  resource_type="role",
  org_id="<org>",
  project_id="<project>",
  body={
    "identifier": "custom_deployer",
    "name": "Custom Deployer",
    "description": "Can execute pipelines and view services",
    "permissions": [
      "core_pipeline_execute",
      "core_pipeline_view",
      "core_service_view",
      "core_environment_view"
    ]
  }
)
```

标识符必须匹配模式：`^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`

### 第 6 步：查看资源组

```
harness_list(resource_type="resource_group", org_id="<org>", project_id="<project>")
```

## 示例

### 列出项目中的所有角色

```
/manage-roles
Show me all roles available in the payments project
```

### 检查谁拥有管理员访问权限

```
/manage-roles
List all role assignments with admin privileges in the default org
```

### 创建自定义只读部署者角色

```
/manage-roles
Create a custom role called "release-manager" that can execute pipelines,
view services and environments, but cannot edit anything
```

### 审计某个用户的访问权限

```
/manage-roles
What roles does jane.smith@company.com have across all projects?
```

### 审查资源组

```
/manage-roles
Show me all resource groups and what they include
```

## 最佳实践

- **优先使用组而非单个用户**——将角色分配给 USER_GROUP 以便管理
- **遵循最小权限**——从 viewer 角色开始，按需添加权限
- **尽量缩小范围**——尽可能使用项目级角色而非账户级
- **优先使用内置角色**——仅在符合不了内置角色时才创建自定义角色
- **命名约定：** 标识符使用 `{role}_{principal}`（例如 `deployer_ops_team`）

## 错误处理

| 错误 | 原因 | 解决方法 |
|-------|-------|----------|
| 角色未找到 | 无效的角色标识符 | 内置角色以 `_` 开头——请核实确切的标识符 |
| 资源组未找到 | 无效的资源组 | 检查 `harness_list(resource_type="resource_group")` |
| 主体未找到 | 用户/组/SA 不存在 | 分配前先核实主体是否存在 |
| 标识符重复 | 已存在相同 ID 的角色 | 使用唯一标识符或更新现有角色 |
| 权限被拒绝 | 调用方缺少 RBAC 管理权限 | 需要 `core_role_view` / `core_role_edit` 权限 |

## 性能注意事项

- 创建新角色和资源组之前先列出现有的，以避免重复。
- 核实角色权限符合最小权限原则。
- 分配角色前确认用户/组标识符正确——错误的分配可能会授予意外的访问权限。

## 故障排查

### 用户无法访问资源

1. 列出该用户的角色分配，以确认已分配角色
2. 检查角色是否具有所需权限（对角色执行 `harness_get`）
3. 核实资源组范围包含目标资源
4. 检查分配未设置为 `disabled: true`

### 自定义角色不工作

1. 核实已包含所有必需权限（例如，`_edit` 旁边需要 `_view` 权限）
2. 检查角色是否在正确的范围（account/org/project）分配
3. 确认资源组与用户需要的资源匹配

### 管理角色时权限被拒绝

1. 调用方需要 `core_role_edit` 才能创建/更新角色
2. 调用方需要 `core_roleassignment_edit` 才能管理分配
3. 账户级操作需要账户管理员或同等权限
