---
name: create-agent-template
description: >-
  为 AI 驱动的自动化智能体生成 Harness 智能体模板文件。产出 metadata.json、pipeline.yaml（v1 语法）
  和 wiki.MD 文件。智能体可自动化代码审查、安全扫描、测试生成和文档编写等任务。这是一个 YAML 生成技能。
  在要求创建智能体模板、构建 AI 智能体、创建自动化智能体、生成智能体流水线文件或设置 Harness 智能体时使用。
  触发短语：创建智能体模板、智能体模板、AI 智能体、自动化智能体、构建智能体、代码审查智能体、安全扫描器智能体、Harness 智能体。
metadata:
  author: Harness
  mcp-server: harness-mcp-v2
  version: 1.0.0
  summary: Generate AI agent templates (metadata.json, pipeline.yaml, wiki.MD)
license: Apache-2.0
compatibility: No MCP server required. Generates YAML files locally.
---

# 创建智能体模板技能

为 AI 驱动的自动化智能体生成 Harness 智能体模板文件。

## 说明

1. **确定智能体的用途**——智能体应自动化什么任务（代码审查、安全扫描、测试生成、文档编写）？
2. **定义输入和配置**——智能体需要哪些参数（repo、branch、connector、secrets）？
3. **生成三个文件**——metadata.json（模板元数据）、pipeline.yaml（v1 语法）和 wiki.MD（用户文档）
4. **校验一致性**——确保 pipeline.yaml 中的输入引用与 metadata.json 中的定义匹配

## 概述

智能体模板是封装 AI 驱动自动化的模块化流水线定义。每个模板产出三个文件：

| 文件 | 是否必需 | 用途 |
|------|----------|---------|
| `metadata.json` | 是 | 模板名称、描述、版本 |
| `pipeline.yaml` | 是 | 流水线定义（v1 语法） |
| `wiki.MD` | 推荐 | 面向用户的文档 |

## 目录结构

```
templates/<agent-name>/
  metadata.json
  pipeline.yaml
  wiki.MD
```

## metadata.json

```json
{
  "name": "Agent Name",
  "description": "Brief description of what this agent does (1-2 sentences)",
  "version": "1.0.0"
}
```

**规则：**
- `name`：句子式大小写（`Code Review`，而非 `code-review`）
- `description`：200 字符以内，清晰的价值主张
- `version`：语义化版本 `MAJOR.MINOR.PATCH`

## pipeline.yaml

### 核心结构

```yaml
version: 1
pipeline:
  clone:
    depth: 1
    ref:
      name: <+inputs.branch>
      type: branch
    repo: <+inputs.repo>
    connector: "<+inputs.gitConnector != null ? inputs.gitConnector.id : ''>"

  stages:
    - name: <stage-name>
      steps:
        - name: <step-name>
          run:
            container:
              image: <registry>/<image>:<tag>
            with:
              param: value
            env:
              SECRET_VAR: <+inputs.secretInput>
      platform:
        os: linux
        arch: arm64

  inputs:
    repo:
      type: string
      required: true
    branch:
      type: string
      default: main
    llmConnector:
      type: connector
    gitConnector:
      type: connector
```

### 克隆配置

**分支克隆：**

```yaml
clone:
  depth: 1
  ref:
    name: <+inputs.branch>
    type: branch
  repo: <+inputs.repo>
  connector: "<+inputs.gitConnector != null ? inputs.gitConnector.id : ''>"
```

**拉取请求克隆：**

```yaml
clone:
  depth: 1000
  ref:
    type: pull-request
    number: <+inputs.pullReq>
  repo: <+inputs.repo>
```

### 输入类型

| 类型 | 用途 | 示例 |
|------|-------|---------|
| `string` | 文本值 | repo 名称、分支、文件路径 |
| `secret` | 敏感值 | API 密钥、令牌 |
| `connector` | Harness 连接器 | Git 连接器、LLM 连接器 |

```yaml
inputs:
  repo:
    type: string
    required: true
  branch:
    type: string
    default: main
    description: Branch to analyze
  apiKey:
    type: secret
    default: account.my_secret
  llmConnector:
    type: connector
    description: LLM provider connector
  gitConnector:
    type: connector
    description: Git repository connector
```

### 步骤类型

**容器插件步骤：**

```yaml
- name: my-step
  run:
    container:
      image: registry/image:tag
    with:
      plugin_param: value
    env:
      API_KEY: <+inputs.apiKey>
```

**Shell 脚本步骤：**

```yaml
- name: shell-step
  run:
    shell: bash
    script: |-
      echo "Running script"
      git add -A
      git diff --cached
    env:
      MY_VAR: value
```

### 表达式语法

```yaml
# Input references
<+inputs.variableName>

# Connector token
<+inputs.connectorName.token>

# Step outputs
<+pipeline.stages.STAGE.steps.STEP.output.outputVariables.VAR>

# Environment variables
<+env.HARNESS_ACCOUNT_ID>
<+env.HARNESS_ORG_ID>
<+env.HARNESS_PROJECT_ID>

# Alternative syntax for inputs in env blocks
${{inputs.repo}}
```

## wiki.MD

```markdown
# Agent Name

**Version:** 1.0.0
**Name:** Agent Name

## Overview

What this agent does and why it is useful.

---

## Key Capabilities

- **Capability 1**: Description
- **Capability 2**: Description

---

## How It Works

1. **Step 1**: Description
2. **Step 2**: Description
3. **Step 3**: Description

## Required Inputs

| Input | Type | Description | Default |
|-------|------|-------------|---------|
| `repo` | string | Repository identifier | -- |
| `branch` | string | Branch to analyze | main |

## Usage Example

\`\`\`yaml
inputs:
  repo: "my-org/my-repo"
  branch: "main"
\`\`\`

## Troubleshooting

### Common Issue 1
Solution description.
```

## 完整示例与常见模式

有关完整的智能体示例（代码审查、安全扫描器、文档生成器）和可复用模式（SCM 检测、编码智能体、PR 创建），请参阅 references/agent-examples.md。

## 示例

### 创建代码审查智能体

```
/create-agent-template
Create an agent template for code review that analyzes pull requests,
provides feedback, and posts review comments
```

### 创建安全扫描器智能体

```
/create-agent-template
Generate a security scanner agent that finds vulnerabilities and
creates a report
```

### 创建文档生成器

```
/create-agent-template
Create an agent that analyzes a codebase and generates documentation,
then opens a PR with the results
```

### 创建测试生成器

```
/create-agent-template
Build an agent template that generates unit tests to improve code coverage
```

## 错误处理

| 错误 | 原因 | 解决方法 |
|-------|-------|----------|
| 无效的元数据 | 缺少 name、description 或 version | 包含全部三个必需字段 |
| 无效的版本 | 不是 semver 格式 | 使用 `MAJOR.MINOR.PATCH`（例如 `1.0.0`） |
| 流水线校验错误 | 无效的 v1 YAML 语法 | 核实流水线结构遵循 v1 架构 |
| 连接器未找到 | 引用的连接器不存在 | 运行智能体前先创建连接器 |
| 未定义的输入引用 | 使用了 `<+inputs.x>` 但 `x` 未在 inputs 中定义 | 添加缺失的输入定义 |

## 性能注意事项

- 校验生成的全部三个文件（metadata.json、pipeline.yaml、wiki.MD）彼此一致。
- 确保流水线 YAML 使用正确的 v1 语法，类型小写并使用 ${{ }} 表达式。
- 测试流水线中的所有输入引用均与 metadata.json 中定义的输入匹配。

## 故障排查

### 智能体未执行

1. 核实所有 `required: true` 的输入都有值
2. 检查连接器输入有效且可访问
3. 确认容器镜像存在且可从构建基础设施访问

### SCM 提供方检测失败

1. 核实 `DRONE_REPO_SCM` 环境变量可用
2. 检查连接器令牌具有正确权限
3. 在添加多提供方逻辑之前，用已知的 SCM 提供方测试

### PR 创建失败

1. 确认存在 git 变更（`git diff --cached` 非空）
2. 核实令牌具有创建分支和 PR 的写访问权限
3. 检查 `PLUGIN_REPO` 格式符合 SCM 提供方的预期

### 输出变量不可用

1. 使用 `echo "KEY=value" >> $DRONE_OUTPUT` 写入输出
2. 使用 `echo "KEY=value" >> $HARNESS_OUTPUT_SECRET_FILE` 写入密钥输出
3. 使用完整路径引用：`<+pipeline.stages.STAGE.steps.STEP.output.outputVariables.KEY>`

## 最佳实践

- 切勿硬编码密钥——使用 `type: secret` 输入
- 使用 `type: connector` 进行身份验证，而非原始令牌
- 为所有输入包含有意义的描述
- 让各阶段专注于单一职责
- 始终包含 SCM 检测模式以支持多提供方
- 使用 `$HARNESS_OUTPUT_SECRET_FILE` 存储密钥输出，而非 `$DRONE_OUTPUT`
- 为 PR 克隆设置 `depth: 1000` 以确保完整 diff 历史
- 为分支克隆设置 `depth: 1` 以最小化克隆时间
