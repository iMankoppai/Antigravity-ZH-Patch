---
name: gitops-status
description: 通过 Harness MCP 监控 GitOps 应用健康、同步状态并管理 ArgoCD 部署。当用户说 "gitops status"、"argocd status"、"application sync"、"gitops health"、"is my app in sync"，或询问 GitOps 应用时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: GitOps application health, sync status, and pod logs
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# GitOps 状态

通过 MCP 监控 GitOps 应用健康并管理同步操作。

## 说明

### 步骤 1：概览仪表盘

```
Call MCP tool: harness_get
Parameters:
  resource_type: "gitops_dashboard"
```

### 步骤 2：列出应用

```
Call MCP tool: harness_list
Parameters:
  resource_type: "gitops_application"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 3：获取应用详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "gitops_application"
  resource_id: "<app_name>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 4：检查资源树

```
Call MCP tool: harness_get
Parameters:
  resource_type: "gitops_app_resource_tree"
  resource_id: "<app_name>"
```

### 步骤 5：获取 Pod 日志（调试）

```
Call MCP tool: harness_get
Parameters:
  resource_type: "gitops_pod_log"
  resource_id: "<pod_name>"
```

### 步骤 6：检查事件

```
Call MCP tool: harness_list
Parameters:
  resource_type: "gitops_app_event"
```

### 步骤 7：触发同步

```
Call MCP tool: harness_execute
Parameters:
  resource_type: "gitops_application"
  action: "sync"
  resource_id: "<app_name>"
  org_id: "<organization>"
  project_id: "<project>"
```

## 其他资源类型

```
Call MCP tool: harness_list
Parameters:
  resource_type: "gitops_agent"        # ArgoCD agents
  resource_type: "gitops_cluster"      # Connected clusters
  resource_type: "gitops_repository"   # Git repositories
  resource_type: "gitops_applicationset"  # ApplicationSets
  resource_type: "gitops_managed_resource"  # K8s resources
```

## GitOps 资源类型

| 资源类型 | 操作 | 描述 |
|--------------|-----------|-------------|
| `gitops_agent` | list, get | ArgoCD 实例 |
| `gitops_application` | list, get, sync | 应用 |
| `gitops_applicationset` | list, get | ApplicationSet |
| `gitops_cluster` | list, get | K8s 集群 |
| `gitops_repository` | list, get | Git 代码仓库 |
| `gitops_app_event` | list | 应用事件 |
| `gitops_pod_log` | get | Pod 日志 |
| `gitops_managed_resource` | list | K8s 资源 |
| `gitops_app_resource_tree` | get | 资源树 |
| `gitops_dashboard` | get | 概览仪表盘 |

## 应用健康状态

- **Healthy**——所有资源运行并通过健康检查
- **Degraded**——部分资源未通过健康检查
- **Progressing**——资源正在创建/更新
- **Suspended**——应用已暂停
- **Missing**——未找到资源
- **Unknown**——无法确定健康状态

## 同步状态

- **Synced**——实时状态与 Git 中的期望状态匹配
- **OutOfSync**——实时状态与 Git 不同（需要同步）
- **Unknown**——无法确定同步状态

## 示例

- “显示我所有 GitOps 应用”——列出 gitops_application
- “api-gateway 同步了吗？”——获取 gitops_application，检查同步状态
- “同步 payment-service”——执行同步操作
- “获取失败服务的 Pod 日志”——获取 gitops_pod_log
- “显示我应用的资源树”——获取 gitops_app_resource_tree

## 性能注意事项

- 在汇总健康状态之前，检查所请求范围中的所有应用。
- 对于不同步的应用，检查资源树以识别具体的漂移。
- 在诊断问题之前，为失败资源收集 Pod 日志。

## 故障排查

### 应用 OutOfSync
- 检查 git 代码仓库的近期变更
- 如果预期，核实已启用自动同步
- 在事件中查看同步错误
- 如需要，触发手动同步

### 应用 Degraded
- 检查 Pod 日志中的应用错误
- 查看资源树中失败的 Pod
- 检查资源限制和配额

### Agent 未连接
- 核实 ArgoCD agent 正在运行
- 检查网络连通性
- 查看 agent 配置
