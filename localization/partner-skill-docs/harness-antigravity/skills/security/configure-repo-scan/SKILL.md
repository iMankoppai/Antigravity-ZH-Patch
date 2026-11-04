---
name: configure-repo-scan
description: >-
  使用 STO 安全扫描器在 Harness 流水线中配置代码扫描。帮助确定在哪里将
  SAST/SCA 扫描步骤注入现有流水线、推荐合适的扫描器，并使用
  正确的连接器引用进行配置。在要求添加代码扫描、配置安全扫描、设置 SAST/SCA、
  集成漏洞扫描或向流水线添加安全检查时使用。触发短语：添加代码扫描器、
  配置代码仓库扫描、设置 SAST、添加安全扫描、配置漏洞扫描、集成扫描器。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Configure code scanning in pipelines with STO security scanners
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 配置代码仓库扫描

使用 STO 安全扫描器向现有 Harness 流水线添加代码扫描步骤。

## 说明

### 步骤 1：确定范围和流水线上下文

如果尚不知道，向用户询问组织、项目和流水线标识符。此技能仅适用于现有流水线。

获得标识符后，获取流水线定义：

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：从流水线提取代码仓库连接器

解析步骤 1 中的流水线 YAML，自动识别流水线中使用的代码仓库连接器。

在流水线结构中查找连接器引用：
- 对于 v0 流水线：检查 `pipeline.properties.ci.codebase.connectorRef`
- 对于 v1 流水线：检查流水线配置中的 codebase 连接器

如果流水线中未找到连接器，告知用户该流水线没有 codebase 配置，无法进行代码仓库扫描。

### 步骤 3：分析流水线结构

解析步骤 1 中的流水线 YAML 以识别：
- 所有阶段（CI、Deployment、Approval、Custom）
- 每个阶段内的所有步骤
- 现有安全扫描步骤（如果有）

向用户呈现结构化视图：
```
Pipeline: <name>

Stage 1: <stage_name> (type: <stage_type>)
  - Step 1: <step_name> (type: <step_type>)
  - Step 2: <step_name> (type: <step_type>)
  ...

Stage 2: <stage_name> (type: <stage_type>)
  - Step 1: <step_name> (type: <step_type>)
  ...
```

询问用户希望在哪里插入代码扫描器步骤：
- "在哪个步骤之前？"或"在哪个步骤之后？"或"在哪个阶段末尾？"
- 提供建议（例如"我建议在构建步骤之后、部署之前添加"）

### 步骤 4：推荐扫描器类型

呈现 Harness STO 中支持的可用 SAST 扫描器：

**可用的 SAST 扫描器：**
- **Harness Code**（默认——Harness 原生扫描器）
- Bandit（开源，Python）
- Black Duck（by Synopsys）
- Brakeman（开源，Ruby）
- Checkmarx
- Checkmarx One
- Coverity（开源）
- CodeQL
- FOSSA
- GitHub Advanced Security
- Mend（原 WhiteSource）
- Semgrep（开源）
- Snyk
- SonarQube
- Veracode
- Wiz

**默认推荐：** 使用 **Harness Code** 作为 Harness 原生 SAST 扫描器。它提供集成安全扫描，配置最少，并与 Harness STO 无缝集成。

询问用户偏好哪个扫描器。如果未指定，使用 Harness Code 作为默认。

### 步骤 5：生成扫描器步骤配置

基于扫描器选择和步骤 2 的连接器，生成适当的步骤 YAML。扫描器步骤应为原生 Harness STO 步骤，而非 Run 步骤。

**对于 Harness Code（默认）：**

```yaml
- step:
    identifier: harness_code_scan
    name: Harness Code Scan
    type: HarnessSAST
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

**对于 Bandit（Python）：**

```yaml
- step:
    identifier: bandit_scan
    name: Bandit SAST
    type: Bandit
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

**对于 Semgrep：**

```yaml
- step:
    identifier: semgrep_scan
    name: Semgrep SAST
    type: Semgrep
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

**对于其他扫描器：** 参见 `references/scanner-types.md` 获取扫描器特定配置。

### 步骤 6：将步骤插入流水线 YAML

将生成的扫描器步骤 YAML 插入步骤 3 选择的位置。确保正确的缩进和结构。

**关键规则：**
- 扫描器步骤应添加到 CI 阶段（type: CI），而非 Deployment 或 Approval 阶段
- 扫描器步骤通常应在代码检出之后、部署之前运行
- 如果流水线有 `cloneCodebase: true` 设置，扫描器将能访问源代码
- 扫描器步骤应添加到所选阶段内的 `execution.steps` 数组

创建插入扫描器步骤后的更新流水线 YAML。

### 步骤 7：通过 MCP 更新流水线

用新扫描器步骤更新流水线：

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

向用户报告结果：

```
## Code Scanner Configured

**Pipeline:** <pipeline_name>
**Scanner:** <scanner_type>
**Location:** Stage "<stage_name>", <position description>
**Connector:** <connector_name>

**Pipeline URL:** https://app.harness.io/ng/account/<account_id>/module/ci/orgs/<org_id>/projects/<project_id>/pipelines/<pipeline_id>/pipeline-studio/

**Note:** The scanner step has been configured with default settings. You can review and modify the configuration in the pipeline studio if you need to customize scan behavior, add exclusions, or adjust other parameters.

### Next Steps
1. Run the pipeline to verify the scanner step executes successfully
2. View scan results in the Security Tests tab of the execution
3. Configure exemptions for false positives via `/security-report` skill
4. Set up policies to fail pipelines on critical vulnerabilities via `/create-policy` skill
```

## 示例

### 向现有流水线添加扫描器

```
/configure-repo-scan
I want to add code scanning to my backend-api pipeline in the platform project
```

### 为 Python 项目配置 SAST

```
/configure-repo-scan
Set up SAST scanning for my Python service. Use Bandit and add it after the test step.
```

### 向 CI 流水线添加 Harness Code 扫描

```
/configure-repo-scan
Add Harness Code scanner to my CI pipeline. Scan after build but before pushing to registry.
```

## 性能注意事项

- 尝试修改流水线之前始终核实流水线存在
- 从流水线配置自动提取代码仓库连接器，而非询问用户
- 解析完整流水线结构以提供准确的插入点建议
- 使用原生 STO 扫描器步骤（Harness Code、Bandit、Semgrep 等）而非带扫描器 CLI 命令的 Run 步骤
- 默认使用 Harness Code 扫描器，除非用户有特定扫描器偏好
- 确保扫描器步骤添加到带 `cloneCodebase: true` 的 CI 阶段，以便源代码可用
- 此技能仅适用于现有流水线；不要提供创建新流水线

## 故障排查

### 流水线未找到
- 核实 org_id 和 project_id 正确
- 检查流水线访问的 RBAC 权限
- 用 `harness_list`（resource_type: "pipeline"）确认流水线存在
- 告知用户此技能仅适用于现有流水线

### 流水线中未找到连接器
- 核实流水线具有带连接器引用的 codebase 配置
- 对于 v0 流水线检查 `pipeline.properties.ci.codebase.connectorRef`
- 告知用户流水线必须配置 codebase 连接器才能进行代码仓库扫描

### 扫描器步骤失败
- 核实 CI 阶段上设置了 `cloneCodebase: true`
- 检查连接器配置了正确的身份验证
- 确保扫描器镜像可访问（镜像仓库权限）
- 通过 `harness_diagnose` 查看执行日志以获取具体扫描器错误

### 流水线更新校验错误
- 核实 YAML 缩进正确（使用 2 个空格）
- 确保步骤标识符遵循模式 `^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`
- 检查步骤已添加到具有正确 `spec.execution.steps` 结构的有效阶段
- 确认扫描器类型是有效的 Harness STO 步骤类型

### 扫描后无安全结果
- 核实账户已启用 STO 模块
- 检查扫描输出日志中的错误或警告
- 确认扫描器目标配置与代码仓库结构匹配
- 确保扫描器具有访问依赖的适当权限
