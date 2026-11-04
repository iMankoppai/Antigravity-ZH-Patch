---
name: manage-supply-chain
description: >-
  通过 MCP 管理 Harness Software Supply Chain Assurance（SSCA）。配置以 CycloneDX 或 SPDX 格式
  自动生成 SBOM，使用 Cosign 设置制品签名和证明，
  使用 OPA 定义供应链安全策略，并跟踪 SLSA 来源级别。
  在要求生成 SBOM、签名制品、执行供应链策略、跟踪
  软件来源或管理 SLSA 合规时使用。不要用于 OPA 流水线治理
  策略（请使用 create-policy）或漏洞扫描（请使用 security-report）。
  触发短语：SBOM、软件物料清单、供应链安全、SLSA、制品
  签名、cosign、来源、证明、CycloneDX、SPDX、供应链策略。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: SBOM generation, artifact signing, and supply chain policy enforcement
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理供应链

在 Harness SSCA 中配置 SBOM 生成、制品签名、供应链策略执行和 SLSA 来源跟踪。

## 说明

### 步骤 1：确定范围

确认用户的 org、project、服务和构建工具。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "project"
  org_id: "<organization>"
```

### 步骤 2：识别 SSCA 任务

确定用户需要哪个工作流：

1. **SBOM 生成**——每次构建时自动创建 SBOM，并带签名和证明
2. **供应链策略执行**——用于制品来源、签名和合规的 OPA 策略

### 步骤 3：配置 SBOM 生成

从用户处收集：
- 服务名称、构建工具和语言
- 要附加 SBOM 生成的流水线
- SBOM 格式：CycloneDX 1.5（JSON）或 SPDX 2.3（JSON）
- SBOM 范围：直接依赖、传递依赖或完整（OS + 语言 + 传递依赖）
- 签名密钥提供方：Cosign keyless（Sigstore）、Cosign with KMS、AWS KMS、GCP KMS

在 CI 流水线中配置 SBOM 生成：
- 在每次成功构建或容器推送时触发
- 以所选格式生成 SBOM
- 用配置的密钥提供方对 SBOM 签名
- 作为 OCI 制品附加在容器镜像旁
- 部署到受保护环境前要求有效的签名验证

**供应链风险分析：**
- 标记带超过 CVSS 阈值（默认 7.0）的已知 CVE 的依赖
- 检测许可证冲突（例如 GPL-3.0、AGPL-3.0）
- 标记过时超过 N 个月的依赖
- 标记来自不受信任镜像仓库的依赖

**合规映射：**
- 目标 SLSA 级别（Level 1、2 或 3）
- 映射到合规框架：NIST SSDF、EO 14028、SOC2

### 步骤 4：配置供应链策略执行

从用户处收集执行点（构建、推送、部署或所有阶段）。

定义 OPA 策略：
1. **制品来源**——要求所有容器镜像具有有效的 Cosign 签名
2. **SLSA 级别**——对生产部署强制执行最低 SLSA 级别
3. **SBOM 要求**——如果 SBOM 缺失或未签名则阻止部署
4. **依赖限制**——阻止带禁用许可证或已知恶意包的制品
5. **镜像仓库允许列表**——仅允许来自已批准镜像仓库的制品

```
Call MCP tool: harness_create
Parameters:
  resource_type: "policy"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    name: "supply-chain-enforcement"
    identifier: "supply_chain_enforcement"
    rego: |
      package harness.supply_chain

      deny[msg] {
        not input.artifact.signed
        msg := "Artifact must be signed with Cosign before deployment"
      }

      deny[msg] {
        not input.artifact.sbom_attached
        msg := "SBOM must be generated and attached to artifact"
      }
```

### 步骤 5：设置 SBOM 存储和仪表盘

配置 SBOM 存储：
- 存储在 Harness AR 中与镜像一起，或存储在 S3/GCS/Dependency-Track
- 设置保留期（默认 365 天）

启用 SSCA 门户仪表盘以查看：
- 跨所有服务的实时组件清单
- 随时间的漏洞趋势
- 许可证合规状态
- 每个服务的 SLSA 级别跟踪

## 示例

- “为我们的 payment-service 构建生成 SBOM”——在 CI 流水线中配置带 Cosign 签名的 CycloneDX SBOM 生成
- “为生产部署执行制品签名”——创建要求有效 Cosign 签名的 OPA 策略
- “设置 SLSA Level 2 合规跟踪”——配置来源跟踪和 SBOM 证明
- “阻止带 GPL-3.0 依赖的部署”——创建带许可证限制的供应链策略
- “跟踪我们的软件供应链风险”——启用带 CVE、许可证和过时分析的 SSCA 仪表盘

## 性能注意事项

- SBOM 生成会为构建增加 10-30 秒，具体取决于依赖数量——对大多数流水线可接受。
- Cosign keyless 签名（Sigstore）比 KMS 支持的密钥更易设置，但需要互联网访问。
- SLSA Level 3 需要密闭构建——这可能需要大量流水线重构。
- SBOM 存储成本很小（JSON 文件），但保留策略可防止无限增长。

## 故障排查

### SBOM 生成失败
- 核实构建工具受 SBOM 生成器（Syft、Trivy、cdxgen）支持
- 检查容器镜像在 SBOM 生成运行时是否可访问
- 对于 monorepo，确保 SBOM 范围设置为正确的子目录

### Cosign 签名错误
- 对于 keyless：核实 OIDC 提供方（Sigstore/Fulcio）可达
- 对于 KMS：核实 service account 对该密钥具有签名权限
- 检查 Cosign 二进制版本与镜像格式兼容

### 策略阻止部署
- 检查触发拒绝的具体策略规则
- 对已知误报使用豁免工作流
- 核实策略正在评估来自流水线的正确输入字段
