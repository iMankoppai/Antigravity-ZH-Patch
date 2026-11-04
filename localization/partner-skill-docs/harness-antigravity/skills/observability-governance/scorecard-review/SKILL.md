---
name: scorecard-review
description: 使用 Harness IDP 通过 MCP 审查服务成熟度评分卡和合规性。检查生产就绪、安全和文档得分。当用户说 "scorecard"、"service maturity"、"production readiness"、"compliance score"，或询问服务健康得分时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: IDP scorecards and service maturity review
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 评分卡审查

使用 Harness Internal Developer Portal（IDP）通过 MCP 审查服务成熟度和合规评分卡。

## 说明

### 步骤 1：列出目录实体

```
Call MCP tool: harness_list
Parameters:
  resource_type: "idp_entity"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：获取实体详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "idp_entity"
  resource_id: "<entity_id>"
```

### 步骤 3：获取评分卡得分

```
Call MCP tool: harness_list
Parameters:
  resource_type: "idp_score"
  org_id: "<organization>"
  project_id: "<project>"
```

获取特定实体得分：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "idp_score"
  resource_id: "<entity_id>"
```

### 步骤 4：检查文档

```
Call MCP tool: harness_list
Parameters:
  resource_type: "idp_tech_doc"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 5：审查工作流

```
Call MCP tool: harness_list
Parameters:
  resource_type: "idp_workflow"
  org_id: "<organization>"
  project_id: "<project>"
```

## 常见评分卡类别

- **生产就绪**——CI/CD、监控、告警、运行手册
- **安全合规**——漏洞扫描、密钥管理、访问控制
- **文档**——API 文档、架构图、运行手册
- **运维卓越**——SLO、事故响应、值班
- **开发者体验**——构建时间、测试覆盖率、引导

## 报告格式

```
## Service Scorecard Report

**Service:** <name>
**Overall Score:** X/100

### Category Scores
| Category | Score | Status |
|----------|-------|--------|
| Production Readiness | 85/100 | Pass |
| Security | 70/100 | Needs Work |
| Documentation | 45/100 | Failing |
| Operations | 90/100 | Pass |

### Failing Checks
1. Missing API documentation
2. No SBOM generation configured
3. Test coverage below 80%

### Improvement Actions
1. Add API docs to /docs endpoint
2. Enable SBOM in CI pipeline
3. Increase test coverage to 80%+
```

## IDP 资源类型

| 资源类型 | 操作 | 描述 |
|--------------|-----------|-------------|
| `idp_entity` | list, get | 目录实体 |
| `idp_score` | list, get | 评分卡得分 |
| `idp_tech_doc` | list, get | 技术文档 |
| `idp_workflow` | list, get | IDP 工作流 |

## 示例

- “api-gateway 的评分卡表现如何？”——获取实体的 idp_score
- “哪些服务未通过生产就绪？”——列出 idp_score，按未通过过滤
- “帮我改进 checkout-service 得分”——获取得分、识别未通过检查、建议修复
- “显示所有低于 80% 合规的服务”——列出并过滤 idp_score

## 性能注意事项

- 在推荐改进之前分析所有评分卡检查。不要跳过未通过的检查。
- 将未通过的检查与服务实际配置和文档交叉引用。
- 按影响优先排序建议——先关注影响生产就绪的检查。

## 故障排查

### 无可用得分
- 核实评分卡已在 IDP 设置中配置
- 检查实体已在目录中注册
- 确保数据源（CI/CD、监控）已连接

### 得分未更新
- 检查集成同步状态
- 核实数据源连通性
- 查看评分卡规则配置
