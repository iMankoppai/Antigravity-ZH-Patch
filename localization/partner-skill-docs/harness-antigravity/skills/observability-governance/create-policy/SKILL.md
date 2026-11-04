---
name: create-policy
description: >-
  通过 MCP 为 Harness 创建 OPA 治理策略。定义在
  流水线、服务、环境、功能标志、制品、代码仓库、模板、SBOM、
  安全测试、Terraform、GitOps、连接器、密钥等上执行合规规则的策略。在要求创建、编写、
  修复或解释 OPA 策略、Rego 规则、拒绝规则、治理策略、合规规则，或任何 Harness 实体的
  策略即代码时使用。触发短语：创建策略、OPA 策略、治理策略、
  合规规则、rego 策略、拒绝规则、执行策略、安全策略、供应链治理。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Create OPA governance policies for supply chain security
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建策略

通过 MCP 为 Harness Software Supply Chain Assurance（SCS）创建 OPA 治理策略。

## 说明

### 步骤 1：识别策略需求

确定策略应执行什么：
- 策略针对什么实体类型？（pipeline、service、environment、feature flag 等）
- 执行动作是什么（warn、deny）？
- 策略应应用于什么范围？
- 什么动作触发策略？（onrun、onsave、onstep 等）

**编写 Rego 策略时**，请参阅 `references/rego-writing-guide.md` 获取完整的 Rego 编写规则、实体类型、包名和常见模式。实体特定的 schema 和示例见该指南中列出的实体参考文件。

### 步骤 2：创建策略

```
Call MCP tool: harness_create
Parameters:
  resource_type: "policy"
  org_id: "<organization>"
  project_id: "<project>"
  body: <policy definition>
```

OPA 策略在 `governance` 工具集下管理——`resource_type: "policy"` 支持完整 CRUD（list、get、create、update、delete）。

### 步骤 3：验证合规结果

创建策略后，检查制品或代码仓库上的合规状态：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "scs_compliance_result"
  org_id: "<organization>"
  project_id: "<project>"
```

## 常见策略模式

### 要求生成 SBOM

强制所有制品在部署前具有 SBOM：

```rego
package harness.artifact

deny[msg] {
  not input.artifact.sbom
  msg := "Artifact must have an SBOM before deployment"
}
```

### 阻止严重漏洞

拒绝部署带有严重 CVE 的制品：

```rego
package harness.artifact

deny[msg] {
  vuln := input.artifact.vulnerabilities[_]
  vuln.severity == "CRITICAL"
  msg := sprintf("Critical vulnerability %s found in artifact", [vuln.cve_id])
}
```

### 强制使用已批准的基础镜像

将容器镜像限制为已批准的基础镜像：

```rego
package harness.artifact

approved_bases := {"alpine", "distroless", "ubuntu"}

deny[msg] {
  not approved_bases[input.artifact.base_image]
  msg := sprintf("Base image '%s' is not in the approved list", [input.artifact.base_image])
}
```

### 要求已签名制品

强制部署前对制品签名：

```rego
package harness.artifact

deny[msg] {
  not input.artifact.signed
  msg := "Artifact must be signed before deployment"
}
```

## 相关资源类型

| 资源类型 | 操作 | 描述 |
|--------------|-----------|-------------|
| `policy` | list, get, create, update, delete | OPA 治理策略（governance 工具集） |
| `policy_set` | list, get, create, update, delete | 将策略与执行动作分组 |
| `policy_evaluation` | list, get | 查看策略评估结果 |
| `scs_compliance_result` | list | 检查 SCS 策略合规状态 |
| `artifact_security` | list, get | 查看制品安全态势 |
| `code_repo_security` | list, get | 查看代码仓库安全态势 |
| `scs_chain_of_custody` | get | 验证制品来源 |

## Rego 策略参考文件

有关为任何 Harness 实体编写 Rego 策略，请参阅这些参考文件：

- [Rego 编写指南和规则](references/rego-writing-guide.md) — 实体类型、包名、Rego 模式、质量检查清单
- [流水线策略和 schema](references/entity-pipeline.md) — 流水线输入 schema、步骤/阶段嵌套、walk 模式
- [功能标志 / FME 策略](references/entity-feature-flag.md) — 功能标志、定义、FME 环境、segment schema
- [服务、环境、基础设施](references/entity-service-env-infra.md) — 服务、环境、基础设施 schema 和示例
- [安全测试策略](references/entity-security-tests.md) — 安全测试输出 schema、严重性/覆盖检查
- [SBOM 策略](references/entity-sbom.md) — 带 semver 比较的 SBOM 拒绝/允许列表模式
- [Terraform 和 Workspace](references/entity-terraform.md) — Terraform plan、成本、状态、workspace schema
- [GitOps 应用](references/entity-gitops.md) — GitOps 应用 schema、命名空间/标签/修订策略
- [代码仓库](references/entity-code-repository.md) — 代码仓库命名、可见性、分支策略
- [变量策略](references/entity-variable.md) — 变量 schema、基于角色的限制
- [覆盖策略](references/entity-override.md) — 覆盖 schema、配置文件和变量保护
- [连接器策略](references/entity-connector.md) — 连接器 schema、类型/认证/命名限制
- [密钥策略](references/entity-secret.md) — 密钥 schema、命名/类型/提供方限制
- [模板策略](references/entity-template.md) — 模板 schema、审批/版本/环境检查
- [Database DevOps 策略](references/entity-database.md) — SQL 语句治理、DDL 限制、事务限制
- [上游防火墙](references/entity-upstream-firewall.md) — 防火墙包 schema、CVE/许可证策略
- [高级模式](references/advanced-patterns.md) — 异常处理、walk、作用域引用、豁免

## 示例

- “创建阻止严重 CVE 的策略” —— 为严重性严重创建 OPA 拒绝规则
- “为所有制品强制生成 SBOM” —— 创建要求 SBOM 存在的策略
- “仅允许已批准的基础镜像” —— 创建带允许基础镜像列表的策略
- “生产前要求制品签名” —— 创建检查签名状态的策略
- “生产部署前要求审批” —— 带 Approval 阶段检查的流水线策略
- “在审批步骤上强制 disallowPipelineExecutor” —— 基于流水线 walk 的步骤检查
- “阻止超过 $100/月的 Terraform plan” —— Terraform plan 成本策略
- “要求功能标志描述” —— FME 功能标志 onsave 策略
- “防止向 kube-system 进行 GitOps 部署” —— GitOps 命名空间限制
- “检查哪些制品违反我们的策略” —— 列出 scs_compliance_result

## 性能注意事项

- 提交前校验 Rego 语法。常见问题：缺少包声明、拒绝规则没有 msg 返回。
- 确保策略包名遵循 `package harness.<domain>` 约定。
- 在创建前对照预期输入在脑中测试策略逻辑。

## 故障排查

### 策略未执行
- 核实策略已成功创建（通过 `resource_type: "policy"` 列出）
- 策略必须附加到带执行动作（warn/deny）的 `policy_set` 才会触发
- 检查策略范围与目标制品/代码仓库匹配
- 使用 `scs_compliance_result` 或 `policy_evaluation` 验证策略正在被评估

### 策略语法错误
- OPA 策略使用 Rego 语言——提交前校验语法
- 包名应遵循 `package harness.<domain>` 约定
- 拒绝规则必须返回解释违规的 `msg` 字符串

### 限制
- 策略在其创建所在的项目范围内应用
- 将策略附加到 `policy_set` 以激活执行
