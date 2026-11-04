---
name: manage-artifacts
description: >-
  通过 MCP 管理 Harness Artifact Registry（AR）。为 Docker、Helm、
  Maven、npm 和 PyPI 制品配置私有镜像仓库，设置用于缓存公共镜像的上游代理，配置
  RBAC 和跨区域复制，并定义带 CVE 阈值
  和许可证合规检查的安全扫描策略。在要求设置制品镜像仓库、配置 Docker
  或 Helm 仓库、管理制品安全扫描或设置复制时使用。不要用于
  创建到外部镜像仓库的连接器（请使用 create-connector）。触发短语：
  制品镜像仓库、docker registry、helm 仓库、制品安全、镜像扫描、
  私有镜像仓库、制品复制、CVE 阈值、许可证合规、SBOM。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Artifact registry setup, security scanning, and cross-region replication
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 管理制品

在 Harness Artifact Registry 中配置私有制品镜像仓库、安全扫描策略和跨区域复制。

## 说明

### 步骤 1：确定范围

确认用户的 org、project 和制品格式需求。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "project"
  org_id: "<organization>"
```

### 步骤 2：识别 AR 任务

确定用户需要哪个工作流：

1. **私有镜像仓库设置**——带 RBAC 的 Docker、Helm、Maven、npm、PyPI 仓库
2. **安全扫描策略**——带 CVE 阈值和许可证检查的漏洞扫描

### 步骤 3：配置私有镜像仓库

从用户处收集：
- 要支持的制品格式（Docker、Helm、Maven、npm、PyPI）
- 上游代理偏好（Docker Hub、ECR Public、GCR）
- 镜像签名要求（Cosign、Notary、无）
- 多架构支持需求

**Docker 镜像仓库：**
- 仓库名称和上游代理配置
- 使用 Cosign 或 Notary v2 进行镜像签名
- 多架构支持（amd64 + arm64）

**Helm Chart 仓库：**
- 推送时校验 chart
- 启用依赖解析

**其他格式（Maven、npm、PyPI）：**
- 每种格式单独仓库
- 快照/发布策略
- 公共镜像仓库的上游代理

**访问控制：**
- 读访问：org 范围中的所有开发者
- 推送访问：仅 CI/CD service account（无个人凭据）
- 管理员：平台团队
- 与身份提供方进行 LDAP/SAML 集成

**复制：**
- 主区域并复制到辅助区域
- 可配置的同步间隔（实时、15 分钟、每小时、每天）

### 步骤 4：配置安全扫描策略

从用户处收集：
- 要扫描的制品类型
- 安全扫描器（Aqua Trivy、Snyk、Grype、Prisma Cloud）
- CVE 严重性阈值（超过 N 个 CRITICAL 和 HIGH 时阻止）

配置扫描策略：
- 推送时扫描，并对已存储制品定期重扫
- 如果严重或高危 CVE 数量超过阈值则阻止下载
- 许可证合规：阻止带不允许许可证（GPL-3.0、AGPL）的制品
- SBOM 生成：每次扫描自动生成 CycloneDX 或 SPDX
- 豁免工作流：安全团队可批准带到期日的特定 CVE

```
Call MCP tool: harness_create
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
  body:
    pipeline:
      name: "artifact-security-scan"
      identifier: "artifact_security_scan"
      stages:
        - stage:
            name: Scan
            type: SecurityTests
            spec:
              # vulnerability scanning step
        - stage:
            name: Policy Gate
            type: Approval
            spec:
              # block if thresholds exceeded
```

## 示例

- “为我们的团队设置私有 Docker 镜像仓库”——配置带上游代理和 RBAC 的 Docker 仓库
- “向我们的制品镜像仓库添加 Helm chart 仓库”——配置带 chart 校验的 Helm 仓库
- “为我们的容器镜像配置漏洞扫描”——设置带 CVE 阈值和许可证检查的扫描
- “为我们的制品设置跨区域复制”——配置主区域和副本区域及同步间隔
- “阻止带严重 CVE 的镜像被部署”——创建带严重性闸门的安全扫描策略

## 性能注意事项

- 上游代理通过在本地缓存公共镜像显著减少构建时间——为所有格式启用。
- 推送时的安全扫描会增加推送操作的延迟——对于大镜像考虑异步扫描。
- 跨区域复制会线性增加存储成本——仅复制到制品被消费的区域。
- 镜像签名会为每次拉取增加验证步骤——确保签名基础设施高可用。

## 故障排查

### 推送被安全策略拒绝
- 检查触发阻止的特定 CVE 的扫描结果
- 使用豁免工作流批准已知误报
- 核实 CVE 阈值对制品的依赖树而言未设置过低

### 复制滞后
- 检查主区域和副本区域之间的网络连通性
- 核实同步间隔适合制品量
- 大型制品（多 GB 镜像）可能需要更长的同步窗口

### 镜像仓库身份验证失败
- 核实 service account 在目标仓库中具有推送权限
- 检查 LDAP/SAML 集成正在正确同步
- 确保 Docker 登录凭据未过期
