---
name: manage-delegates
description: >-
  通过 MCP 监控并管理 Harness Delegate。列出 delegate 并检查健康状态、管理 delegate
  注册令牌（创建、撤销、删除），并查找哪些 delegate 与某个令牌关联。
  在询问 delegate 状态、delegate 健康、delegate 连通性、delegate 令牌，或
  排查 delegate 问题时使用。触发短语：delegate 状态、delegate 健康、列出 delegate、
  delegate 令牌、delegate 连通性、delegate 排查、delegate 宕机。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Monitor delegate health and manage registration tokens
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理 Delegate

通过 MCP 监控 delegate 健康并管理注册令牌。

## 说明

### 步骤 1：列出 Delegate

列出账户中的所有 delegate 以检查健康和连通性：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "delegate"
```

返回所有 delegate 及其状态、版本、连通性和最后心跳。Delegate 是账户范围的——不需要 org/project。

### 步骤 2：列出 Delegate 令牌

```
Call MCP tool: harness_list
Parameters:
  resource_type: "delegate_token"
  org_id: "<organization>"
  project_id: "<project>"
```

按名称或状态过滤：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "delegate_token"
  name: "prod-token"
  status: "ACTIVE"
```

### 步骤 3：获取令牌详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "delegate_token"
  resource_id: "<token_name>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 4：创建令牌

```
Call MCP tool: harness_create
Parameters:
  resource_type: "delegate_token"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    name: "prod-delegate-token"
```

### 步骤 5：查找令牌对应的 Delegate

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "delegate_token"
  action: "get_delegates"
  resource_id: "<token_name>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 6：撤销令牌

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "delegate_token"
  action: "revoke"
  resource_id: "<token_name>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 7：删除令牌

```
Call MCP tool: harness_delete
Parameters:
  resource_type: "delegate_token"
  resource_id: "<token_name>"
  org_id: "<organization>"
  project_id: "<project>"
```

## 资源类型

| 资源类型 | 范围 | 操作 | 描述 |
|--------------|-------|-----------|-------------|
| `delegate` | 账户 | list | 列出带健康状态的 delegate |
| `delegate_token` | 项目 | list、get、create、delete + revoke、get_delegates 操作 | 管理注册令牌 |

## 示例

- “所有 delegate 都健康吗？”——列出 delegate，检查状态和最后心跳
- “为 staging 项目创建新的 delegate 令牌”——创建项目范围的令牌
- “哪些 delegate 在使用 prod-token？”——对令牌执行 get_delegates 操作
- “撤销旧的注册令牌”——执行 revoke 操作
- “显示我所有活动的 delegate 令牌”——列出按状态 ACTIVE 过滤的令牌

## 性能注意事项

- 诊断 delegate 问题时，同时检查 delegate 列表（健康/心跳）和令牌状态（认证）。显示为断开连接的 delegate 可能其令牌已被撤销。
- 在排查流水线失败之前始终核实 delegate 连通性——许多执行错误源于不可用的 delegate。

## 故障排查

### Delegate 显示断开连接
1. 检查 delegate 的最后心跳时间戳——如果陈旧，delegate 进程可能已停止
2. 核实 delegate 令牌为 ACTIVE（未 REVOKED）
3. 检查 delegate 主机与 Harness SaaS 之间的网络连通性

### 流水线失败并提示 "No Delegates Available"
1. 列出 delegate 确认至少有一个已连接且健康
2. 检查流水线是否使用了不匹配任何活动 delegate 的 delegate 选择器
3. 核实 delegate 已安装所需工具（kubectl、helm、docker 等）

### 令牌问题
- 令牌是项目范围的——在项目 A 创建的令牌无法为项目 B 注册 delegate
- 撤销令牌会断开用它注册的所有 delegate
- 已删除的令牌无法恢复——创建新令牌并重新注册 delegate
