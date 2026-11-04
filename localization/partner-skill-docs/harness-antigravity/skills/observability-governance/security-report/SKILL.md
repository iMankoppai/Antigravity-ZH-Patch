---
name: security-report
description: 使用 Harness SCS 和 STO 通过 MCP 生成安全合规报告。分析漏洞、SBOM 并管理豁免。当用户说 "security report"、"vulnerabilities"、"SBOM"、"security scan"、"compliance check"，或询问应用安全时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Security vulnerabilities, SBOMs, and compliance reports
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 安全报告

使用 Harness Software Supply Chain（SCS）和 Security Testing Orchestration（STO）通过 MCP 生成安全合规报告。

## 说明

### 步骤 1：列出漏洞

```
Call MCP tool: harness_list
Parameters:
  resource_type: "security_issue"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：获取漏洞详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "security_issue"
  resource_id: "<issue_id>"
```

### 步骤 3：列出 SBOM

```
Call MCP tool: harness_list
Parameters:
  resource_type: "scs_sbom"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 4：获取 SBOM 详情

```
Call MCP tool: harness_get
Parameters:
  resource_type: "scs_sbom"
  resource_id: "<sbom_id>"
```

### 步骤 5：检查制品组件

```
Call MCP tool: harness_list
Parameters:
  resource_type: "scs_artifact_component"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 6：获取修复指导

```
Call MCP tool: harness_list
Parameters:
  resource_type: "scs_artifact_remediation"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 7：检查合规

```
Call MCP tool: harness_list
Parameters:
  resource_type: "scs_compliance_result"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 8：管理豁免

列出现有豁免：
```
Call MCP tool: harness_list
Parameters:
  resource_type: "security_exemption"
  org_id: "<organization>"
  project_id: "<project>"
```

创建豁免：
```
Call MCP tool: harness_create
Parameters:
  resource_type: "security_exemption"
  org_id: "<organization>"
  project_id: "<project>"
  body: <exemption details>
```

批准或撤销豁免：
```
Call MCP tool: harness_execute
Parameters:
  resource_type: "security_exemption"
  action: "approve"    # or "revoke"
  resource_id: "<exemption_id>"
```

## 报告格式

```
## Security Compliance Report

**Date:** <date>
**Scope:** <project/artifact>

### Vulnerability Summary
| Severity | Count | New | Fixed |
|----------|-------|-----|-------|
| Critical | X     | X   | X     |
| High     | X     | X   | X     |
| Medium   | X     | X   | X     |
| Low      | X     | X   | X     |

### Top Critical Vulnerabilities
1. **CVE-XXXX-XXXXX** - <description> (Package: <name>)
   - Remediation: Upgrade to version X.Y.Z

### SBOM Status
- Artifacts with SBOMs: X/Y
- Compliance checks passing: X/Y

### Active Exemptions
- X exemptions active, Y pending review

### Recommendations
1. <prioritized fix action>
2. <next fix action>
```

## 安全资源类型

| 资源类型 | 操作 | 描述 |
|--------------|-----------|-------------|
| `security_issue` | list, get | 扫描发现的漏洞 |
| `security_exemption` | list, get, create, update | 豁免管理 |
| `scs_sbom` | list, get | 软件物料清单（SBOM） |
| `scs_artifact_component` | list | 制品中的组件 |
| `scs_artifact_remediation` | list | 修复建议 |
| `scs_compliance_result` | list | 策略合规结果 |
| `scs_opa_policy` | list | OPA 策略状态 |

## 示例

- “为 backend-service 生成安全报告”——列出按服务过滤的 security_issue
- “显示严重漏洞”——列出 security_issue，按严重性过滤
- “下载 api-service:v2.3 的 SBOM”——按制品获取 scs_sbom
- “为 CVE-2024-1234 创建豁免”——创建 security_exemption

## 性能注意事项

- 在汇总之前收集完整的漏洞列表。不要基于部分扫描结果报告。
- 将漏洞与 SBOM 数据交叉引用以准确归因组件。
- 安全报告的质量和准确性比速度更重要。

## 故障排查

### 未显示漏洞
- 核实流水线中已配置 STO 扫描
- 检查扫描工具连接器（Snyk、Aqua 等）
- 确保扫描结果正在被摄取

### SBOM 不可用
- 核实 CI 流水线中已启用 SBOM 生成
- 检查制品镜像仓库配置
