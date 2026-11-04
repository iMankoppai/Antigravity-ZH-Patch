---
name: create-environment
description: >-
  为部署目标生成 Harness 环境 YAML 并通过 MCP 创建。支持 PreProduction 和
  Production 类型，带有环境变量、清单覆盖和多环境设置（dev、
  staging、prod）。在要求创建环境、设置预发、配置生产、定义
  部署目标或管理环境覆盖时使用。触发短语：创建环境、部署
  环境、设置 dev、设置 staging、设置生产、环境变量、环境覆盖。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Create environments (PreProduction, Production) with overrides
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建环境

生成 Harness 环境 YAML 并通过 MCP 推送到 Harness。

## 说明

1. **确定环境类型**——`PreProduction` 用于 dev/staging/QA，`Production` 用于实际运行环境
2. **定义变量和覆盖**——环境特定的配置值和清单覆盖
3. **生成 YAML**，使用下面的结构
4. **通过 MCP 创建**，使用 `harness_create`，resource_type 为 `environment`

## 环境结构

```yaml
environment:
  name: Staging
  identifier: staging
  orgIdentifier: default
  projectIdentifier: my_project
  type: PreProduction       # PreProduction or Production
  tags:
    tier: staging
  variables:
    - name: domain
      type: String
      value: staging.myapp.com
    - name: replicas
      type: Number
      value: "2"
    - name: db_password
      type: Secret
      value: <+secrets.getValue("staging_db_password")>
  overrides:
    manifests:
      - manifest:
          identifier: values_override
          type: Values
          spec:
            store:
              type: Github
              spec:
                connectorRef: github
                repoName: config
                branch: main
                paths: [values-staging.yaml]
```

## 环境类型

- `PreProduction`——开发、QA、预发、集成环境
- `Production`——实际生产环境（启用额外防护）

## 多环境设置

创建 dev、staging 和 prod：

```yaml
# Dev
environment:
  name: Development
  identifier: dev
  type: PreProduction
  variables:
    - name: domain
      type: String
      value: dev.myapp.com

# Staging
environment:
  name: Staging
  identifier: staging
  type: PreProduction
  variables:
    - name: domain
      type: String
      value: staging.myapp.com

# Production
environment:
  name: Production
  identifier: prod
  type: Production
  variables:
    - name: domain
      type: String
      value: myapp.com
```

## 通过 MCP 创建

```
Call MCP tool: harness_create
Parameters:
  resource_type: "environment"
  org_id: "<organization>"
  project_id: "<project>"
  body: <environment YAML>
```

列出环境：
```
Call MCP tool: harness_list
Parameters:
  resource_type: "environment"
  org_id: "<organization>"
  project_id: "<project>"
```

## 示例

- “创建 dev、staging 和 prod 环境”——生成 3 个具有适当类型的环境
- “设置带覆盖的生产环境”——Production 类型带清单覆盖

## 性能注意事项

- 创建多个环境（dev/staging/prod）时，确保每个环境的变量值各不相同。
- 创建之前，核实清单覆盖路径存在于被引用的代码仓库中。
- 仅对实际运行环境使用 Production 类型——它会启用部署冻结等额外防护。

## 故障排查

- `DUPLICATE_IDENTIFIER`——环境已存在；使用 `harness_update`
- Production 类型启用部署冻结和审批护栏
