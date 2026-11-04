---
name: configure-secret-scan
description: >-
  使用 STO 安全扫描器向现有 Harness 流水线添加密钥检测扫描步骤。
  检测代码仓库中暴露的凭据、API 密钥、令牌和敏感数据。
  支持 Harness Code（默认、原生、统一的 SAST/SCA/密钥检测）、Gitleaks（独立
  密钥扫描器，开源）、Semgrep、Snyk、SonarQube、Checkmarx、Fossa、Aqua Trivy 和 Wiz。仅适用于已配置 codebase
  连接器的现有流水线。在要求添加密钥扫描、检测暴露的密钥、查找泄漏的
  API 密钥、配置密钥检测，或扫描代码中的凭据时使用。
  触发短语：添加密钥扫描、检测密钥、查找泄漏的凭据、配置密钥检测、
  扫描暴露的 API 密钥、添加 Gitleaks、密钥扫描流水线。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add secret detection scanning to pipelines to find exposed credentials and API keys (Gitleaks, Semgrep, Snyk, and more)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 配置密钥扫描

使用 Harness STO 向现有 Harness 流水线添加密钥检测扫描步骤。扫描代码仓库中暴露的凭据、API 密钥、令牌和其他敏感信息。

## 说明

### 步骤 1：确定范围和流水线上下文

如果尚不知道，向用户询问组织、项目和流水线标识符。此技能仅适用于现有流水线。

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：从流水线提取代码仓库连接器

解析流水线 YAML 以自动识别代码仓库连接器。

- 对于 v0 流水线：检查 `pipeline.properties.ci.codebase.connectorRef`
- 对于 v1 流水线：检查流水线配置中的 codebase 连接器

如果未找到连接器，告知用户该流水线没有 codebase 配置，无法进行密钥扫描。

### 步骤 3：分析流水线结构

解析流水线 YAML 以识别所有阶段、步骤以及任何现有密钥扫描步骤。

向用户呈现结构：

```
Pipeline: <name>

Stage 1: <stage_name> (type: <stage_type>)
  - Step 1: <step_name> (type: <step_type>)
  ...
```

询问在哪里插入密钥扫描步骤——在哪个步骤之前或之后，或在哪个阶段末尾。建议在 **CI 阶段早期**、构建步骤之前添加，以便在任何制品产出之前捕获密钥。

### 步骤 4：推荐扫描器类型

呈现 Harness STO 中支持的可用密钥检测扫描器：

**首选推荐：**
- **Harness Code**（默认——Harness 原生扫描器，零配置，在单个步骤中集成 SAST + SCA + 密钥检测）

**专用独立密钥扫描器：**
- **Gitleaks**（如果用户想要专用的仅密钥扫描器则推荐——开源，无付费许可，有内置扫描器）

**其他也会作为副作用检测密钥的扫描器**（结果出现在 "Secret" 问题类型下，与 SAST/SCA 结果并列）：
- Aqua Trivy（开源）
- Checkmarx（商业）
- Checkmarx One（商业）
- Fossa（商业）
- Semgrep（开源核心 / 商业）
- Snyk（商业）
- SonarQube（商业）
- Wiz（商业）

**默认推荐：** 使用 **Harness Code**——Harness 原生扫描器，提供统一的 SAST、SCA 和密钥检测，零配置并无缝集成 STO。如果用户明确想要专用的仅密钥扫描器，推荐 **Gitleaks** 作为独立选项。

询问用户偏好哪个扫描器。如果未指定，使用 Harness Code 作为默认。

**扫描器产品认证要求：**

| 扫描器 | `type` 字段 | 需要产品认证？ | 认证字段 |
|---------|-------------|----------------------|-------------|
| Gitleaks | `Gitleaks` | 否 | — |
| Harness Code | `HarnessSAST` | 否 | — |
| Aqua Trivy | `AquaTrivy` | 否 | — |
| Semgrep (OSS) | `Semgrep` | 否 | — |
| Semgrep (商业) | `Semgrep` | 是 | `access_token`（Semgrep API 令牌） |
| Snyk | `Snyk` | 是 | `access_token`（Snyk API 令牌） |
| SonarQube | `SonarQube` | 是 | `access_id`（主机 URL）、`access_token`（用户令牌） |
| Checkmarx | `Checkmarx` | 是 | `access_id`（用户名）、`access_token`（密码） |
| Checkmarx One | `CheckmarxOne` | 是 | `access_id`（客户端 ID）、`access_token`（客户端密钥） |
| Fossa | `Fossa` | 是 | `access_token`（FOSSA API 密钥） |
| Wiz | `Wiz` | 是 | `access_id`（客户端 ID）、`access_token`（客户端密钥） |

**如果用户选择商业扫描器：**
1. 告知用户需要扫描器产品凭据
2. 询问上表中的密钥引用——密钥必须已在 Harness 中存在
3. 格式为 `<+secrets.getValue("project.<secret_identifier>")>`
4. 如果密钥不存在，提示用户先通过 `/create-secret` 创建

### 步骤 5：生成扫描器步骤配置

**对于 Harness Code（默认——统一 SAST + SCA + 密钥检测）：**

```yaml
- step:
    type: HarnessSAST
    name: Harness_Code_Scan
    identifier: Harness_Code_Scan
    spec:
      mode: orchestration
      config: sast_sca
      target:
        type: repository
        detection: auto
      advanced:
        log:
          level: info
```

**对于 Gitleaks（独立密钥扫描器——Built-in）：**

```yaml
- step:
    type: Gitleaks
    name: Gitleaks_Secret_Scan
    identifier: Gitleaks_Secret_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: repository
        detection: auto
      advanced:
        log:
          level: info
```

**对于 Semgrep（OSS，无认证）：**

```yaml
- step:
    type: Semgrep
    name: Semgrep_Secret_Scan
    identifier: Semgrep_Secret_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: repository
        detection: auto
      advanced:
        log:
          level: info
```

**对于商业扫描器——添加带扫描器产品凭据的 `auth` 块：**

```yaml
- step:
    type: Snyk                        # or SonarQube, Checkmarx, CheckmarxOne, Fossa, Wiz
    name: Snyk_Secret_Scan
    identifier: Snyk_Secret_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: repository
        detection: auto
      auth:
        access_id: <+secrets.getValue("project.scanner_access_id")>   # omit if not required
        access_token: <+secrets.getValue("project.scanner_token")>
      advanced:
        log:
          level: info
```

使用步骤 4 中扫描器表的 `auth` 字段名称。仅对需要 `access_id` 的扫描器包含它。

### 步骤 6：将步骤插入流水线 YAML

将生成的步骤插入步骤 3 选择的位置。确保正确的缩进和结构。

**关键规则：**
- 密钥扫描步骤必须在带 `cloneCodebase: true` 的 CI 阶段（`type: CI`）中——源代码必须可用
- **尽早**放置密钥扫描——在构建步骤之前，以便在制品产出之前捕获密钥
- 不要添加到 Deployment 或 Approval 阶段
- 添加到所选阶段的 `spec.execution.steps`

### 步骤 7：通过 MCP 更新流水线

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<updated pipeline YAML string>" }
```

### 步骤 8：提供摘要和下一步

```
## Secret Scanner Configured

**Pipeline:** <pipeline_name>
**Scanner:** <scanner_name> (<scanner_type>)
**Location:** Stage "<stage_name>", <position description>
**Connector:** <connector_name>

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/sto/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** Secret detection findings appear under the "Secret" issue type in the Security Tests tab.

### Next Steps
1. Run the pipeline to verify the scanner step executes successfully
2. View secret detection results in the Security Tests tab under the "Secret" issue type
3. Remediate found secrets — rotate any exposed credentials immediately
4. Configure exemptions for false positives via `/security-report` skill
5. Enforce pipeline gates on detected secrets via `/create-policy` skill
```

## 示例

### 向现有 CI 流水线添加 Gitleaks

```
/configure-secret-scan
Add secret scanning to my backend-api pipeline in the platform project
```

### 使用 Semgrep 进行密钥检测

```
/configure-secret-scan
I already use Semgrep for SAST — configure it to also detect secrets in my CI pipeline
```

### 在流水线早期添加密钥扫描

```
/configure-secret-scan
Add Gitleaks before the build step in my payment-service pipeline so we catch leaked keys before building
```

## 性能注意事项

- 仅适用于**现有流水线**——不要提供创建新流水线
- 从流水线自动提取代码仓库连接器；不要向用户询问
- 将密钥扫描步骤放在**构建步骤之前**——尽早捕获密钥可防止它们被烘焙进制品
- 默认使用 **Harness Code**，除非用户明确想要专用的仅密钥扫描器——此时推荐 **Gitleaks** 作为独立选项
- 对于商业扫描器，生成 YAML 之前始终询问 `auth` 凭据——缺少认证会导致运行时失败
- 如果所需密钥不存在，在继续之前提示用户通过 `/create-secret` 创建
- CI 阶段必须有 `cloneCodebase: true`——密钥扫描器需要访问源代码

## 故障排查

### 流水线未找到
- 核实 `org_id` 和 `project_id` 正确
- 用 `harness_list`（resource_type: "pipeline"）确认流水线存在
- 此技能仅适用于现有流水线

### 流水线中未找到连接器
- 核实流水线具有带连接器引用的 codebase 配置
- 对于 v0 流水线检查 `pipeline.properties.ci.codebase.connectorRef`
- 流水线必须配置 Git 连接器才能启用密钥扫描

### 扫描器步骤失败
- 核实 CI 阶段上设置了 `cloneCodebase: true`——密钥扫描器需要源代码访问
- 检查 Git 连接器配置了正确的身份验证
- 通过 `harness_diagnose` 查看执行日志以获取具体扫描器错误

### 扫描器认证失败（商业扫描器）
- 核实 `auth.access_token`（以及需要时的 `auth.access_id`）引用有效的 Harness 密钥
- 确认密钥标识符精确匹配——用 `harness_get(resource_type="secret")` 检查
- 对于 Snyk 和 Semgrep：仅需 `access_token`
- 对于 SonarQube、Checkmarx One、Wiz、Fossa：`access_id` 和 `access_token` 都需要
- 如果密钥不存在，先通过 `/create-secret` 创建

### 扫描后无密钥结果
- 核实账户已启用 STO 模块
- 检查扫描输出日志中的错误或警告
- 确认扫描器的目标配置指向正确的代码仓库
- 注意：没有结果意味着未发现密钥——这是期望的结果
