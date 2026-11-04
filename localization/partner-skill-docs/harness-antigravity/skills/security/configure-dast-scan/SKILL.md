---
name: configure-dast-scan
description: >-
  使用 Harness STO 扫描器向现有 Harness 流水线添加动态应用安全测试（DAST）步骤。
  支持 API DAST / Traceable（默认）、Burp Suite Enterprise、ZAP（OWASP）、Nikto 和 Nmap。
  扫描运行中的应用实例以查找漏洞，包括 API 安全问题、注入缺陷、
  错误配置和暴露的服务。可将扫描步骤插入现有 CI 或 SecurityTests 阶段，
  或创建专用的 SecurityTests 阶段。
  在要求添加 DAST 扫描、配置动态应用测试、设置 API 安全扫描、
  扫描运行中的应用，或向流水线添加运行时安全测试时使用。
  触发短语：添加 DAST 扫描、动态应用安全测试、API DAST、配置 Traceable、
  扫描运行中的应用、添加 Burp Suite 扫描、添加 ZAP 扫描、添加 Nikto 扫描、运行时安全扫描、API 安全扫描。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Add DAST scanning to pipelines for runtime application security testing (Traceable, Burp Suite, ZAP, Nikto, Nmap)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 配置 DAST 扫描

使用 Harness STO 扫描器向现有 Harness 流水线添加动态应用安全测试（DAST）步骤。DAST 扫描器在运行时测试运行中的应用实例以查找安全漏洞。

## 说明

### 步骤 1：确定范围和流水线上下文

如果尚不知道，询问 org、project 和流水线标识符。此技能仅适用于现有流水线。

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：分析流水线结构

解析流水线 YAML 以识别：
- 所有阶段及其类型（`CI`、`SecurityTests`、`Deployment`、`Approval`）
- 是否已存在 `SecurityTests` 阶段
- 每个阶段中的现有步骤

向用户呈现结构：

```
Pipeline: <name>

Stage 1: <stage_name> (type: <stage_type>)
  - Step 1: <step_name> (type: <step_type>)
  ...
```

**询问用户希望在哪里添加 DAST 扫描器步骤：**

呈现可用的插入点：
- 任何现有 `SecurityTests` 阶段（扫描器步骤添加到该阶段的 `execution.steps`）
- 任何现有 `CI` 阶段（扫描器步骤直接添加到该阶段的 `execution.steps`）
- 新的 `SecurityTests` 阶段（追加到流水线）

**建议指导：**
- DAST 扫描针对**运行中的应用实例**——最好放在**部署之后**，以便目标正在运行
- 如果流水线有 Deployment 阶段，建议在部署阶段**之后**添加 `SecurityTests` 阶段
- 如果没有部署阶段，用户必须提供已运行实例的目标 URL
- 如果已存在 `SecurityTests` 阶段，添加到其中最简单

如果用户未指定，默认在流水线末尾添加新 `SecurityTests` 阶段（或在 Deployment 阶段之后，如果存在）。

### 步骤 3：推荐扫描器类型

呈现 Harness STO 中支持的可用 DAST 扫描器：

**可用的 DAST 扫描器：**
- **API DAST（Traceable）**（默认——Harness 原生 API 安全扫描器，前称 Traceable）
- **Burp Suite Enterprise**（商业，带爬取 + 审计的全面 Web 应用 DAST）
- **ZAP**（OWASP Zed Attack Proxy，开源 Web 应用扫描器）
- **Nikto**（开源，Web 服务器扫描器）
- **Nmap**（开源，带漏洞脚本的网络/端口扫描器）

**默认推荐：** 使用 **API DAST（Traceable）**——用于 API 安全测试的 Harness 原生 DAST 扫描器。它连接你的 Traceable 账户以针对现有扫描配置发起扫描，结果直接与 Harness STO 集成。

询问用户偏好哪个扫描器。如果未指定，使用 API DAST（Traceable）作为默认。

**步骤类型映射和扫描器认证要求：**

| 扫描器 | `type` 字段 | 需要产品认证？ | 认证字段 |
|---------|-------------|----------------------|-------------|
| API DAST (Traceable) | `Traceable` | 是 | `domain`（Traceable 平台 URL）、`access_token`（API 令牌） |
| Burp Suite Enterprise | `BurpEnterprise` | 是 | `domain`（Burp Enterprise URL）、`access_token`（API 密钥） |
| ZAP | `Zap` | 否 | — |
| Nikto | `Nikto` | 否 | — |
| Nmap | `Nmap` | 否 | — |

**如果用户选择需要认证的扫描器（API DAST、Burp Suite）：**

1. 告知用户需要扫描器产品凭据
2. 询问上表所需的密钥引用——这些必须已作为 Harness 密钥存在
3. 将它们格式化为 `<+secrets.getValue("project.<secret_identifier>")>`
4. 这些放入步骤 spec 的 `auth` 块

给用户的示例提示词：
> "API DAST (Traceable) requires a platform domain and access token. Please provide:
> 1. Your Traceable platform URL (e.g., `https://api.traceable.ai/`)
> 2. The Harness secret identifier for your Traceable API token (e.g., `traceable_api_token`). I'll reference it as `<+secrets.getValue("project.traceable_api_token")>`."

如果密钥尚不存在，建议先通过 `/create-secret` 创建再继续。

### 步骤 4：选择扫描模式（仅 API DAST / Traceable）

**此步骤仅适用于 API DAST（Traceable）。** 对于其他扫描器（Burp Suite、ZAP、Nikto、Nmap），默认 `orchestration` 并跳到步骤 5。

呈现三个可用扫描模式并询问用户想要哪一个：

**可用的扫描模式：**

- **Orchestration**（默认）——在现有 Traceable Scan 中触发新的扫描运行。结果自动保存在 STO 中。需要 Traceable 中有活动 runner。
- **Extraction**——从现有 Traceable Scan 检索最新扫描结果并将其导入 STO。不触发新扫描——适用于从按计划或外部运行的扫描拉取结果。
- **Ingestion**——从本地 JSON 文件读取扫描结果并将其导入 STO。用户必须单独获取结果（例如通过带 Traceable API 调用的 Run 步骤）。步骤本身不需要 Traceable 凭据。

如果用户未指定，默认 **Orchestration**。

**每种模式所需字段：**

| 字段 | Orchestration | Extraction | Ingestion |
|-------|:---:|:---:|:---:|
| Domain（Traceable URL） | 是 | 是 | 否 |
| Access Token | 是 | 是 | 否 |
| Scan Name (Suite ID) | 是 | 是 | 否 |
| Runner Selection | 可选 | 否 | 否 |
| Ingestion File path | 否 | 否 | 是 |
| Target Name（手动） | 否 | 否 | 是 |
| Target Variant（手动） | 否 | 否 | 是 |

**对于 Ingestion 模式**，告知用户需要一个前置的 **Run 步骤**从 Traceable 的 API 获取结果并保存为 JSON 文件。Run 步骤的示例命令：

```
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.traceable.ai/graphql/scans/$SCAN_ID/vulnerabilities" \
  -o /harness/vulnerabilities.json
```

ingestion 文件路径（例如 `/harness/vulnerabilities.json`）必须配置为阶段中的共享路径。

### 步骤 5：收集目标实例详情

DAST 扫描需要运行中的应用目标。根据扫描器收集不同字段：

---

**对于 API DAST（Traceable）：**

Traceable 使用其在 Traceable 平台中管理的扫描配置。根据步骤 4 选择的扫描模式收集：

**Orchestration 模式：**

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Traceable Domain | 是 | 平台 URL，例如 `https://api.traceable.ai/` 或 `https://api-staging.traceable.ai/` |
| Access Token | 是 | Traceable API 令牌（Harness 密钥引用） |
| Scan Name (Suite ID) | 是 | 扫描 URL 中的 Traceable Scan ID（例如 `b35b11b4-3e87-47df-8c2e-a5ceb5ea764c`） |
| Runner Selection | 否 | `auto`（默认）或手动 Runner ID——runner 必须在 Traceable 中活动 |

**Extraction 模式：**

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Traceable Domain | 是 | 平台 URL，例如 `https://api.traceable.ai/` |
| Access Token | 是 | Traceable API 令牌（Harness 密钥引用） |
| Scan Name (Suite ID) | 是 | 要从中拉取最新结果的 Traceable Scan ID |

**Ingestion 模式：**

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Ingestion File | 是 | JSON 结果文件的路径，例如 `/harness/vulnerabilities.json` |
| Target Name | 是 | 手动目标标识符（例如 `my-api-service`） |
| Target Variant | 是 | 手动变体标签（例如 `1.0.0` 或 `staging`） |

---

**对于 Burp Suite Enterprise：**

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Burp Domain | 是 | Burp Enterprise 服务器 URL |
| Access Token | 是 | Burp API 密钥（Harness 密钥引用） |
| Instance Domain | 是 | 目标应用 URL，例如 `https://myapp.io` |
| Instance Protocol | 否 | `https`（默认）或 `http` |
| Instance Port | 否 | TCP 端口（例如 `443`、`8080`） |
| Instance Path | 否 | 要追加的路径（例如 `/api/v1`） |
| Scan Configuration | 否 | 默认是 `Crawl and audit lightweight`。选项见步骤 5 |

---

**对于 ZAP、Nikto、Nmap（实例扫描器）：**

| 字段 | 必需 | 描述 |
|-------|----------|-------------|
| Instance Domain | 是 | 目标应用域，例如 `https://myapp.io` |
| Instance Protocol | 否 | `https`（默认）或 `http` |
| Instance Port | 否 | TCP 端口（例如 `443`、`8080`、`3000`） |
| Instance Path | 否 | 要追加的路径（例如 `/portal/us`） |

---

### 步骤 6：生成扫描器步骤 YAML

使用步骤 3 扫描器映射中的步骤 `type`。

**对于 API DAST / Traceable（默认——Orchestration 模式）：**

```yaml
- step:
    type: Traceable
    name: API_DAST_Scan
    identifier: API_DAST_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: instance
        detection: auto
      auth:
        domain: <traceable_platform_url>
        access_token: <+secrets.getValue("project.traceable_api_token")>
      tool:
        suite_id: <traceable_scan_id>
      advanced:
        log:
          level: info
```

**对于 API DAST / Traceable（Extraction 模式）：**

```yaml
- step:
    type: Traceable
    name: API_DAST_Scan
    identifier: API_DAST_Scan
    spec:
      mode: extraction
      config: default
      target:
        type: instance
        detection: auto
      auth:
        domain: <traceable_platform_url>
        access_token: <+secrets.getValue("project.traceable_api_token")>
      tool:
        suite_id: <traceable_scan_id>
      advanced:
        log:
          level: info
```

**对于 API DAST / Traceable（带手动 runner 的 Orchestration）：**

```yaml
- step:
    type: Traceable
    name: API_DAST_Scan
    identifier: API_DAST_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: instance
        detection: auto
      auth:
        domain: <traceable_platform_url>
        access_token: <+secrets.getValue("project.traceable_api_token")>
      tool:
        suite_id: <traceable_scan_id>
        runner_id: <traceable_runner_id>
      advanced:
        log:
          level: info
```

**对于 API DAST / Traceable（Ingestion 模式）：**

```yaml
- step:
    type: Traceable
    name: API_DAST_Scan
    identifier: API_DAST_Scan
    spec:
      mode: ingestion
      config: default
      target:
        type: instance
        name: <target_name>
        variant: <target_variant>
      ingestion:
        file: <ingestion_file_path>
      advanced:
        log:
          level: info
```

**对于 Burp Suite Enterprise（Orchestration 模式）：**

```yaml
- step:
    type: BurpEnterprise
    name: Burp_Suite_Scan
    identifier: Burp_Suite_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: instance
        detection: auto
      auth:
        domain: <burp_enterprise_url>
        access_token: <+secrets.getValue("project.burp_api_key")>
      instance:
        domain: <target_app_url>
        protocol: https
        port: <port>
        path: <path>
      advanced:
        log:
          level: info
```

**Burp Suite 扫描配置选项（用于 `config` 字段）：**
- `default`（同 Crawl and Audit - Lightweight）
- `Never stop Crawl due to application errors`
- `Never stop audit due to application errors`
- `Minimize false positives`
- `Minimize false negatives`
- `Crawl strategy most complete`
- `Crawl strategy more complete`
- `Crawl strategy fastest`
- `Crawl strategy faster`
- `Crawl limit 60 minutes`
- `Crawl limit 30 minutes`
- `Crawl limit 10 minutes`
- `Crawl and audit lightweight`
- `Crawl and audit fast`
- `Crawl and audit deep`
- `Crawl and audit balanced`
- `Audit coverage thorough`
- `Audit coverage maximum`
- `Audit checks medium active`
- `Audit checks light active`
- `Audit checks critical issues only`
- `Audit checks all except time based detection methods`
- `Audit checks all except java script analysis`

**对于 ZAP（开源）：**

```yaml
- step:
    type: Zap
    name: ZAP_DAST_Scan
    identifier: ZAP_DAST_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: instance
        detection: auto
      instance:
        domain: <target_app_url>
        protocol: https
        port: <port>
        path: <path>
      advanced:
        log:
          level: info
```

**对于 Nikto（开源）：**

```yaml
- step:
    type: Nikto
    name: Nikto_DAST_Scan
    identifier: Nikto_DAST_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: instance
        detection: auto
      instance:
        domain: <target_app_url>
        protocol: https
        port: <port>
        path: <path>
      advanced:
        log:
          level: info
```

**对于 Nmap（开源网络扫描器）：**

```yaml
- step:
    type: Nmap
    name: Nmap_Scan
    identifier: Nmap_Scan
    spec:
      mode: orchestration
      config: default
      target:
        type: instance
        detection: auto
      instance:
        domain: <target_app_url>
        protocol: https
        port: <port>
        path: <path>
      advanced:
        log:
          level: info
```

**Nmap 扫描配置选项：**
- `default`（带脚本的常见端口扫描）
- `No Default CLI Flags`（用于自定义标志的空白起点）
- `Firewall Bypass`
- `Unusual Port`
- `SMB Security Mode`
- `Vuln`
- `Exploit`

### 步骤 7：收集基础设施详情（如需要）

**仅在添加新 `SecurityTests` 阶段时必需。** 如果插入现有阶段，跳过此步骤。

询问用户的基础设施类型：

**选项 A——Harness Cloud（推荐，简单）：**

```yaml
platform:
  os: Linux
  arch: Amd64
runtime:
  type: Cloud
  spec: {}
```

**选项 B——Kubernetes Direct：**

询问：
- **Delegate 连接器**（例如 `account.mydelegate`）
- **命名空间**（例如 `harness-delegate-ng`）

```yaml
infrastructure:
  type: KubernetesDirect
  spec:
    connectorRef: <delegate_connector>
    namespace: <namespace>
    automountServiceAccountToken: true
    nodeSelector: {}
    os: Linux
```

如果用户未指定，默认 Harness Cloud 基础设施。

### 步骤 8：构建更新后的流水线 YAML

**场景 A——添加到现有 `SecurityTests` 或 `CI` 阶段：**

将步骤插入所选阶段的 `spec.execution.steps`。该阶段已有自己的基础设施。只需追加步骤。

**场景 B——创建新 `SecurityTests` 阶段（Harness Cloud）：**

```yaml
- stage:
    name: DAST Scan
    identifier: DAST_Scan_Stage
    type: SecurityTests
    spec:
      cloneCodebase: false
      platform:
        os: Linux
        arch: Amd64
      runtime:
        type: Cloud
        spec: {}
      execution:
        steps:
          - step:
              type: Traceable
              name: API_DAST_Scan
              identifier: API_DAST_Scan
              spec:
                mode: orchestration
                config: default
                target:
                  type: instance
                  detection: auto
                auth:
                  domain: <traceable_platform_url>
                  access_token: <+secrets.getValue("project.traceable_api_token")>
                tool:
                  suite_id: <traceable_scan_id>
                advanced:
                  log:
                    level: info
```

**场景 C——创建新 `SecurityTests` 阶段（Kubernetes Direct）：**

```yaml
- stage:
    name: DAST Scan
    identifier: DAST_Scan_Stage
    type: SecurityTests
    spec:
      cloneCodebase: false
      infrastructure:
        type: KubernetesDirect
        spec:
          connectorRef: <delegate_connector>
          namespace: <namespace>
          automountServiceAccountToken: true
          nodeSelector: {}
          os: Linux
      execution:
        steps:
          - step:
              type: Traceable
              name: API_DAST_Scan
              identifier: API_DAST_Scan
              spec:
                mode: orchestration
                config: default
                target:
                  type: instance
                  detection: auto
                auth:
                  domain: <traceable_platform_url>
                  access_token: <+secrets.getValue("project.traceable_api_token")>
                tool:
                  suite_id: <traceable_scan_id>
                advanced:
                  log:
                    level: info
```

### 步骤 9：通过 MCP 更新流水线

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: { yamlPipeline: "<updated pipeline YAML string>" }
```

### 步骤 10：提供摘要和下一步

```
## DAST Scanner Configured

**Pipeline:** <pipeline_name>
**Scanner:** <scanner_name> (<scanner_type>)
**Stage:** <stage_name> (SecurityTests)
**Target:** <target_instance_url_or_scan_name>
**Mode:** <orchestration | extraction | ingestion>

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/sto/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

### Next Steps
1. Run the pipeline to verify the DAST scan step executes successfully
2. View scan results in the Security Tests tab of the execution
3. Set failure thresholds using `fail_on_severity` (CRITICAL, HIGH, MEDIUM, LOW) in the step's Advanced tab
4. Configure exemptions for false positives via `/security-report` skill
5. Enforce pipeline gates on severity via `/create-policy` skill
```

## 示例

### 添加带 Traceable 的 API DAST 扫描（orchestration）

```
/configure-dast-scan
Add an API DAST scan to my backend-deploy pipeline. My Traceable domain is https://api.traceable.ai/ and the scan ID is b35b11b4-3e87-47df-8c2e-a5ceb5ea764c.
```

### 以 extraction 模式添加 Traceable

```
/configure-dast-scan
I want to pull the latest DAST results from my Traceable scan into STO. Use extraction mode.
The scan ID is abc123-def456 and my Traceable token secret is traceable_token.
```

### 添加 Burp Suite Enterprise 扫描

```
/configure-dast-scan
Add Burp Suite Enterprise scanning to my pipeline targeting https://staging.myapp.io:8443/api.
Use the "Crawl and audit deep" configuration for thorough coverage.
```

### 在部署后添加 ZAP 扫描

```
/configure-dast-scan
Add a ZAP DAST scan after the deployment stage in my frontend-deploy pipeline.
Target the deployed app at https://staging.example.com
```

### 添加 Nikto Web 服务器扫描

```
/configure-dast-scan
Add Nikto scanning to check my web server at https://myapp.io:443 for common vulnerabilities.
Add it to the existing SecurityTests stage.
```

### 添加 Nmap 网络扫描

```
/configure-dast-scan
Add an Nmap vulnerability scan against my service at 10.0.1.50 port 8080.
Use the Vuln scan configuration.
```

## 性能注意事项

- 仅适用于**现有流水线**——不要提供创建新的独立流水线
- 始终询问用户想要哪个扫描器——呈现完整列表；未指定则默认 **API DAST（Traceable）**
- DAST 扫描针对**运行中的应用实例**——它们不需要源代码访问，因此 SecurityTests 阶段始终设置 `cloneCodebase: false`
- 尽可能将 DAST 扫描放在**部署阶段之后**——目标应用必须正在运行且可访问
- 对于 API DAST（Traceable），扫描必须已存在于 Traceable 平台——orchestration 模式发起现有扫描的运行，不能创建新扫描
- 对于 Traceable orchestration 模式，确保 runner 已在 Traceable 中创建并活动——步骤不能创建 runner
- 对于商业扫描器（API DAST、Burp Suite），生成 YAML 之前始终询问扫描器产品凭据（`auth.domain` / `auth.access_token`）
- 如果所需密钥尚不存在，在继续之前提示用户通过 `/create-secret` 创建
- 对于 ZAP、Nikto 和 Nmap，无需产品认证——仅需目标实例详情
- 默认 `mode: orchestration` 和 `config: default`，除非用户另有指定
- 默认 `target.detection: auto`——它会从扫描设置目标名称，从时间戳设置变体
- 对于新的 SecurityTests 阶段，默认 Harness Cloud 基础设施，除非用户指定 Kubernetes Direct
- Nmap 主要是网络扫描器——推荐用于端口/服务发现和网络层漏洞，而非应用层 DAST
- Burp Suite 提供最全面的 Web 应用 DAST，具备爬取 + 审计能力

## 故障排查

### 流水线未找到
- 核实 `org_id` 和 `project_id` 正确
- 用 `harness_list`（resource_type: "pipeline"）确认流水线存在

### API DAST（Traceable）扫描无法启动
- 核实 Scan ID（`suite_id`）正确——在 Traceable 扫描 URL 中找到它
- 确保 Traceable 访问令牌有效且有权触发扫描
- 对于 orchestration 模式：确认 runner 在 Traceable 中活动——步骤不能创建 runner
- 核实 Traceable domain URL 正确（例如 `https://api.traceable.ai/` vs `https://api-staging.traceable.ai/`）

### Burp Suite 认证失败
- 核实 `auth.domain` 指向你的 Burp Enterprise 服务器 URL
- 确认 `auth.access_token` 引用包含 Burp API 密钥的有效 Harness 密钥
- 确保 Burp Enterprise 服务器可从流水线基础设施访问

### 目标实例不可达
- 核实实例 domain、protocol 和 port 正确
- 确保目标应用正在运行且可从流水线基础设施（delegate 或 Harness Cloud）访问
- 对于内部/私有应用，确保 delegate 具有到目标的网络连通性
- 检查防火墙规则和安全组允许从扫描器到目标的流量

### 扫描器认证失败（商业扫描器）
- 核实 `auth.access_token`（以及 `auth.domain`）引用有效 Harness 密钥
- 确认密钥标识符精确匹配——用 `harness_get(resource_type="secret")` 检查
- 如果密钥不存在，先通过 `/create-secret` 创建然后重新运行技能

### Security Tests 标签中无结果
- 确认账户已启用 STO 模块
- 检查执行日志中的扫描器错误
- 对于 API DAST（Traceable）：核实扫描在 Traceable 平台中成功完成
- 对于 Burp Suite：确保爬取完成——非常大的应用可能因严格爬取限制而超时

### 流水线更新校验错误
- 核实 YAML 缩进（全程 2 个空格）
- 确保步骤 `identifier` 匹配模式 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`
- 确认 `SecurityTests` 阶段具有有效基础设施块（Harness Cloud 或带工作 delegate 的 KubernetesDirect）
- 确保 SecurityTests 阶段设置 `cloneCodebase: false`（DAST 不需要源代码）
