---
name: pr-analysis
description: >-
  通过 MCP 分析拉取请求对 Harness 流水线的影响。通过识别哪些流水线、服务和环境
  受代码变更影响来评估 PR 流水线影响。
  执行以安全为重点的 PR 审查，检查密钥、漏洞和合规性。
  跟踪 PR 从合并到部署再到生产验证的整个过程。在要求
  分析 PR 影响、审查 PR 安全性或跟踪 PR 到生产时使用。触发短语：
  PR 影响、拉取请求分析、PR 安全审查、PR 到生产、合并影响、
  部署跟踪、代码变更影响、PR 流水线、哪些流水线受影响。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: PR pipeline impact, security review, and PR-to-production tracking
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# PR 分析

分析拉取请求的流水线影响、运行以安全为重点的审查，并跟踪 PR 从合并到生产部署的整个过程。

## 说明

### 步骤 1：确定范围

确认服务、代码仓库和 PR 详情。

```
Call MCP tool: harness_list
Parameters:
  resource_type: "pipeline"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：识别 PR 分析任务

确定用户需要哪种分析：

1. **PR 流水线影响分析**——哪些流水线、服务和环境受影响
2. **以安全为重点的 PR 审查**——检查密钥、漏洞和合规问题
3. **PR 到生产跟踪器**——跟踪 PR 从合并到部署和验证的整个过程

### 步骤 3：PR 流水线影响分析

从用户处收集：
- 服务名称和代码仓库
- PR 描述和变更组件（修改的文件/目录）

识别受影响的资源：

```
Call MCP tool: harness_list
Parameters:
  resource_type: "trigger"
  org_id: "<organization>"
  project_id: "<project>"
```

分析影响：
- **触发的流水线：** 合并时将触发哪些 CI/CD 流水线（基于触发器和路径过滤器）
- **受影响的服务：** 哪些 Harness 服务引用了变更的代码或清单
- **到达的环境：** 哪些环境将收到该变更（dev、staging、prod）
- **下游影响：** 依赖变更服务的其他服务
- **基础设施变更：** 任何 Terraform、Helm 或 Kubernetes 清单变更

呈现发现为：
- DIRECT IMPACT：直接触发的流水线和服务
- INDIRECT IMPACT：下游服务和依赖部署
- RISK LEVEL：Low（仅测试/文档）、Medium（应用代码）、High（基础设施/安全/配置）

### 步骤 4：以安全为重点的 PR 审查

从用户处收集：
- 服务名称和代码仓库
- PR 描述和变更组件

安全检查清单：

**密钥和凭据：**
- 扫描 diff 中硬编码的密钥、API 密钥、令牌或密码
- 检查应使用 Harness Secrets 的新环境变量
- 核实没有密钥被记录或在错误消息中暴露

**依赖变更：**
- 检查带已知 CVE 的新依赖
- 核实新依赖的许可证兼容性
- 标记来自不受信任或已弃用来源的依赖

**配置安全：**
- 检查过于宽松的 RBAC 或 IAM 变更
- 核实网络策略和安全组修改
- 审查对身份验证或授权逻辑的任何变更

**合规：**
- 核实变更不违反 Harness 中配置的 OPA 策略
- 检查变更是否需要额外的安全审查或审批
- 标记对合规敏感代码路径（PII 处理、加密）的变更

呈现结构化安全报告，每个类别为 PASS/FAIL/WARNING。

### 步骤 5：PR 到生产跟踪器

从用户处收集：
- 服务名称、PR 标题和目标环境
- 预期部署窗口

跟踪 PR 生命周期：

**阶段 1——合并：**
- PR 合并到目标分支
- CI 流水线触发

**阶段 2——构建：**
```
Call MCP tool: harness_list
Parameters:
  resource_type: "execution"
  org_id: "<organization>"
  project_id: "<project>"
```
- 构建流水线状态和耗时
- 测试结果和覆盖率差异
- 安全扫描结果

**阶段 3——部署到 Staging：**
- Staging 部署流水线状态
- Staging 中的验证结果

**阶段 4——生产部署：**
- 生产流水线状态
- 金丝雀或蓝绿部署进度
- 部署后健康检查结果

**阶段 5——验证：**
- 错误率比较：部署前 vs 部署后
- 延迟比较：部署前 vs 部署后
- SLO 合规检查

呈现显示 PR 旅程及每个阶段状态和耗时的视图。

## 示例

- “此 PR 将触发哪些流水线？”——分析触发器、路径过滤器和下游服务以识别所有受影响的流水线
- “合并前审查此 PR 的安全问题”——运行覆盖密钥、依赖、RBAC 和合规的安全检查清单
- “跟踪我的 PR 从合并到生产”——通过构建、staging 部署、生产部署和验证监控 PR
- “此代码变更的爆炸半径是什么？”——识别所有受影响的服务、环境和流水线

## 性能注意事项

- 流水线影响分析取决于正确配置的触发器——错误配置的路径过滤器可能漏掉受影响的流水线。
- 安全审查应在 CI 流水线中自动化，而非仅手动进行——使用 Harness STO 持续扫描。
- PR 跟踪对关键变更最有用——常规 PR 可能不需要完整的生命周期跟踪。
- 跟踪 PR 到生产的周期时间以识别流程瓶颈（DORA Lead Time for Changes 的一部分）。

## 故障排查

### 流水线影响与实际触发器不符
- 检查触发器路径过滤器——glob 模式可能不匹配实际更改的文件路径
- 核实触发器上的分支条件（例如仅 main vs 所有分支）
- 查找同样部署相同服务的手动触发器或定时流水线

### 安全审查假阳性
- 常见假阳性：带虚拟凭据的测试 fixture、文档示例
- 为测试目录和示例文件添加例外
- 核实密钥扫描规则匹配实际使用的密钥格式

### PR 跟踪在合并后失去可见性
- 核实 CI 触发器在合并到目标分支时触发
- 检查跟踪器中的流水线标识符与实际流水线名称匹配
- 确保部署流水线具有正确的制品引用来拾取新构建
