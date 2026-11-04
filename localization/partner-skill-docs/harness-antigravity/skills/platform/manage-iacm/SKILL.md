---
name: manage-iacm
description: >-
  通过 MCP 管理 Harness Infrastructure as Code Management（IaCM）。配置带远程状态和 RBAC 的
  Terraform 工作区，设置带自动修复的持续漂移检测，设计
  多层变更审批工作流，并在部署前估算基础设施成本。
  在要求管理 Terraform 工作区、检测基础设施漂移、为基础设施变更设置审批
  工作流或估算 Terraform 成本时使用。不要用于创建
  Harness 基础设施定义（请使用 create-infrastructure）或 OPA 策略
  （请使用 create-policy）。触发短语：terraform、workspace、漂移检测、
  基础设施成本、IaCM、状态管理、变更审批、terraform plan、infracost、
  基础设施治理。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Terraform workspaces, drift detection, cost estimation, and approval workflows
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理 IaCM

在 Harness Infrastructure as Code Management 中配置 Terraform 工作区、漂移检测、变更审批工作流和成本估算。

## 说明

### 步骤 1：确定范围

确认用户的 org、project、云提供方和环境。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "project"
  org_id: "<organization>"
```

### 步骤 2：识别 IaCM 任务

确定用户需要哪个工作流：

1. **工作区和状态管理**——工作区结构、远程状态、RBAC、模块注册表
2. **漂移检测**——带修复工作流的持续漂移扫描
3. **变更审批工作流**——基于风险的基础设施变更审批层级
4. **成本估算**——使用 Infracost 进行部署前成本影响分析

### 步骤 3：配置工作区和状态管理

从用户处收集：
- 云提供方（AWS、GCP、Azure、多云）
- 要管理的环境（dev、staging、prod）
- 工作区命名约定（例如 {project}-{env}-{region}）
- 状态后端偏好（S3+DynamoDB、GCS+Firestore、Azure Blob、Harness 内置）

设计工作区结构：
- 每账户每个环境一个工作区
- 带静态加密和状态锁定的远程状态后端
- 带版本控制和可配置保留的状态备份
- RBAC：Developer=仅 plan，Senior Dev=对 dev 的 plan+apply，Team Lead=staging，DevOps=全部但需生产审批

配置模块注册表：
- 模块的语义化版本
- 模块发布前的安全扫描（Checkov、tfsec、Terrascan）
- 新模块版本的审批工作流

### 步骤 4：设置漂移检测

从用户处收集：
- 要监控的环境
- 扫描频率（每小时、每 6 小时、每天）
- 要从漂移扫描中排除的资源

配置漂移检测：
- 按计划将实际云资源与 Terraform 状态比较
- 检测 Terraform 控制之外的添加、删除和修改
- 按严重性对漂移分类：critical（安全组变更、IAM）、warning（标签、描述）、info（元数据）

修复工作流：
- 自动修复低风险漂移（标签更正、描述更新）
- 对中风险漂移告警并创建工单
- 对关键漂移（安全相关变更）呼叫值班

### 步骤 5：设计变更审批工作流

从用户处收集风险类别：
- 低风险（例如标签变更、扩缩容调整）——同行审查后自动应用
- 中风险（例如新资源、配置变更）——团队负责人审批
- 高风险（例如安全组、IAM、数据库变更）——安全团队 + CAB 审批
- 紧急（break-glass）——需要实施后审查

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    pipeline:
      name: "terraform-change-approval"
      identifier: "terraform_change_approval"
      stages:
        - stage:
            name: Plan
            type: CI
            spec:
              # terraform plan + output change summary
        - stage:
            name: Cost Estimate
            type: CI
            spec:
              # infracost diff
        - stage:
            name: Approval
            type: Approval
            spec:
              # risk-based approval routing
        - stage:
            name: Apply
            type: CI
            spec:
              # terraform apply
```

### 步骤 6：估算基础设施成本

当要求成本估算时：
- 识别工作区和待处理的 Terraform 变更（PR 或 plan 输出）
- 对 plan 运行 Infracost 分析

呈现成本报告，包含：
- 当前月度成本 vs 预计月度成本
- 新/修改资源的按资源成本细分
- 成本优化建议（调整规格、预留实例）
- 预算影响评估

## 示例

- “为我们的 AWS 环境设置 Terraform 工作区”——配置带状态管理和 RBAC 的工作区结构
- “为生产基础设施启用漂移检测”——设置带严重性分类和修复的计划扫描
- “为基础设施变更创建审批工作流”——设计带高风险变更安全审查的基于风险审批层级
- “这个 Terraform 变更会花多少钱？”——运行 Infracost 分析并呈现成本影响报告
- “配置我们的 Terraform 模块注册表”——设置带安全扫描的版本化模块注册表

## 性能注意事项

- 工作区命名约定应尽早建立——重命名工作区需要状态迁移。
- 漂移检测扫描应避开高峰时段以最小化 API 速率限制冲突。
- 成本估算准确性取决于 Infracost 是否具有所有在用资源类型的定价数据。
- 变更审批工作流应包括应急的 break-glass 路径——阻止所有变更可能与没有控制一样危险。

## 故障排查

### 状态锁定冲突
- 检查失败运行留下的卡住锁——谨慎使用 `terraform force-unlock`
- 核实状态后端（DynamoDB、Firestore）可从运行器访问

### 漂移检测假阳性
- 排除由自动扩缩组或 Kubernetes operator 管理的资源
- 为频繁变化的元数据字段（最后修改时间戳）添加忽略规则
- 核实扫描针对正确的工作区/状态文件运行

### 成本估算缺少资源
- Infracost 可能不支持所有资源类型——检查支持的资源列表
- 确保 Terraform plan 输出包含所有变更的资源
- 自定义模块可能需要显式成本注解
