---
name: manage-idp
description: >-
  通过 MCP 管理 Harness Internal Developer Portal（IDP）资源。创建服务目录模板、
  配置自助式环境预配工作流、生成服务文档、创建
  架构决策记录（ADR），并设计开发者引导工作流。在要求
  设置服务目录、创建自助工作流、生成服务文档、编写 ADR 或
  引导新开发者时使用。不要用于服务评分卡（请改用 scorecard-review）。触发
  短语：服务目录、自助、开发者门户、IDP、引导工作流、ADR、
  架构决策、服务文档、目录模板、开发者体验、backstage。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Service catalog, self-service workflows, documentation, and developer onboarding (IDP)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理 IDP

在 Harness Internal Developer Portal 中创建服务目录模板、自助工作流、文档、ADR 和开发者引导流程。

## 说明

### 步骤 1：确定范围

确认用户的 org 和 project 上下文。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "project"
  org_id: "<organization>"
```

### 步骤 2：识别 IDP 任务

确定用户需要哪个 IDP 工作流：

1. **服务目录模板**——带脚手架、CI/CD 和可观测性的标准化微服务模板
2. **自助式环境预配**——带 IaC 和 RBAC 控制的按需环境创建
3. **服务文档**——生成 catalog-info.yaml、API 文档和架构概览
4. **架构决策记录（ADR）**——结构化的决策文档
5. **开发者引导**——自动化的第 1 天引导工作流

### 步骤 3：创建服务目录模板

从用户处收集：
- 技术栈（Node.js、Java、Python、Go 等）
- 服务模式（REST API、gRPC、事件驱动等）
- Docker 镜像的容器镜像仓库
- 可观测性技术栈（Datadog、Prometheus 等）

要生成的模板组件：
1. 带标准依赖的应用脚手架
2. CI 流水线：构建、测试、安全扫描、Docker 构建和推送
3. CD 流水线：带审批部署到 dev、staging、production
4. 可观测性：健康端点、指标、结构化日志、仪表盘
5. 带所有权元数据和 SLO 链接的 catalog-info.yaml

```
Call MCP tool: harness_create
Parameters:
  resource_type: "template"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    name: "<stack>-microservice-template"
    identifier: "<stack>_microservice_template"
    versionLabel: "1.0.0"
    type: "Pipeline"
    yaml: |
      template:
        name: <stack>-microservice-template
        identifier: <stack>_microservice_template
        versionLabel: "1.0.0"
        type: Pipeline
        spec:
          stages:
            - stage:
                name: Build
                type: CI
                spec:
                  # Build, test, scan, push
            - stage:
                name: Deploy Dev
                type: Deployment
                spec:
                  # Deploy to dev environment
```

### 步骤 4：创建自助式环境预配

从用户处收集：
- 环境类型（dev、staging、QA、ephemeral）
- 云提供方和 IaC 工具（Terraform、Pulumi、CloudFormation）
- 每个开发者的最大并发环境数
- 临时环境的 TTL

设计工作流：
- 预批准的基础设施模块
- 带测试数据播种的数据库预配
- 从 Harness Secrets 或 Vault 注入密钥
- RBAC：开发者可以创建/销毁自己的环境
- 成本控制：基于 TTL 的自动清理、预算上限

### 步骤 5：生成服务文档

当要求创建文档时，收集：
- 服务名称、团队、类型（backend、frontend、data pipeline）
- 技术栈、repo URL、环境
- API 端点和依赖

生成：
1. **catalog-info.yaml**——Backstage 兼容的服务注册
2. **API 文档**——带请求/响应 schema 的端点清单
3. **架构概览**——组件图、数据流、依赖
4. **运维指南**——部署、监控、事故响应链接

### 步骤 6：创建架构决策记录（ADR）

从用户处收集：
- 决策标题和上下文
- 考虑过的选项及利弊
- 所做的决策和理由
- 后果和后续行动

格式化为标准 ADR：
- 状态（Proposed、Accepted、Deprecated、Superseded）
- Context、Decision、Consequences 部分
- 如适用，链接到相关 ADR

### 步骤 7：设计开发者引导工作流

从用户处收集：
- 新工程师的角色、团队和技术栈
- 所需的访问权限（代码仓库、环境、工具）
- 导师和结对项目详情

设计自助引导工作流：
- 访问预配（GitHub 组织、Harness 项目、云账户）
- 带预配置工作区的 CDE 设置
- 带引导式演练的第一个任务分配
- 第 1 周和第 2 周里程碑检查清单

## 示例

- “为我们的 Node.js 服务创建微服务模板”——生成带 CI/CD、可观测性和 catalog-info.yaml 的服务目录模板
- “为开发者设置自助环境”——创建用于按需环境预配的 IDP 工作流
- “为 checkout-service 生成文档”——创建 catalog-info.yaml、API 文档和架构概览
- “为我们的 REST 到 gRPC 迁移编写 ADR”——创建带上下文、决策和后果的结构化 ADR
- “为新后端工程师设计引导工作流”——创建带访问、CDE 和里程碑的第 1 天自助工作流

## 性能注意事项

- 服务目录模板在发布前应端到端测试——损坏的模板会降低开发者信任。
- 自助环境需要成本护栏（TTL、预算上限）以防止云支出超支。
- catalog-info.yaml 必须符合 Backstage 实体 schema——注册前校验。
- ADR 应引用 IDP 门户 URL，以便它们能与服务目录一起被发现。
- 引导工作流应是幂等的——重新运行不应创建重复资源。

## 故障排查

### 模板未出现在目录中
- 核实模板 YAML 有效且标识符与目录名匹配
- 检查模板已发布（非草稿）且已设置版本标签
- 确认用户对模板所在 org/project 有读取权限

### 自助工作流失败
- 检查 IaC 模块权限——service account 需要在目标云中具有创建/销毁权限
- 核实密钥引用在目标项目范围中可解析
- 检查 TTL 清理作业未与活动环境冲突

### 文档过时
- 当所有权或依赖变化时重新生成 catalog-info.yaml
- 将 API 文档链接到 CI 流水线，使其在合并时自动更新
