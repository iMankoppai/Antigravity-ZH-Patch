---
name: create-agent
description: >-
  创建和更新 Harness AI 智能体实例——用于流水线中智能体化工作流的独立模板。在要求创建智能体、更新智能体、修改智能体 spec、构建自主系统或处理 AI 智能体时使用。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  module: global
  summary: Create and update Harness AI agent instances for agentic pipeline workflows
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 自定义 AI 智能体

创建和更新 Harness AI 智能体实例——用作流水线中构建块的独立模板，用于自动化代码、智能体化工作流和基础设施任务。

## 说明

遵循此工作流创建或更新智能体。**这是交互式的——展示 YAML 以供审查，并在创建/更新智能体之前等待确认。**

### 阶段 1：先检查现有解决方案

**重要：在创建新智能体之前，检查现有智能体能否解决该用例。**

1. **列出现有智能体**——使用 `resource_type="agent"` 调用 `harness_list`（如果限定到项目，请包含 `org_id` 和 `project_id`）
   - 检查是否已存在可处理此任务的系统或自定义智能体
   - 询问用户是否想使用/修改现有智能体而不是创建新智能体
2. **用于更新现有智能体**——使用 `resource_type="agent"` 和 `agent_id` 调用 `harness_get` 以获取当前智能体配置
   - 审查当前的 `spec`、`name`、`description` 和其他字段
   - 确定需要更改的内容（spec、name、description、wiki、logo）
   - 使用 `harness_update`（而非 `harness_create`）仅以需要修改的字段更新智能体

### 阶段 2：收集需求

如果要创建新智能体或更新现有智能体，在生成 YAML 之前收集以下内容：

#### 1. 智能体元数据
- **名称**：智能体的显示名称（例如 "Code Coverage Agent"、"PR Reviewer"）
- **描述**：智能体用途的简要描述（可选）
- **UID/UUID**：始终根据名称生成它，并显式传递给创建/更新 API。不要依赖创建 API 的回退。
  - 生成规则：前缀加 `ca_`，然后将名称转为小写，将空格和连字符（`-`）转换为 `_`，将任何剩余的连续非字母数字字符替换为 `_`，合并重复的 `_`，并从 slug 部分修剪首尾的 `_`（例如 "Code Coverage Agent" → `ca_code_coverage_agent`，"PR Reviewer" → `ca_pr_reviewer`）
  - 如果生成的 UID 与现有智能体冲突，询问用户是复用/更新该智能体还是附加一个短后缀

#### 2. 任务详情——交互式需求收集

**与用户询问并澄清以下内容：**

1. **智能体的确切目标**：智能体应达成什么具体成果？要具体——避免模糊的目标。
2. **智能体需要的输入**：代码仓库信息？执行上下文？配置？密钥？
3. **智能体产出的输出**：文件？外部操作？数据/指标？
4. **智能体处理的对象**：特定文件路径？外部服务？数据库/API？
5. **任务工作流**：分步工作流（先做 1，然后 2，然后 3，等等）
6. **约束与偏好**：限制、规则或编码标准（例如 “使用符合惯用法的 Go 代码”、“不要修改现有测试”）
7. **完成定义**：你如何知道智能体成功了？具体标准、产物或退出条件。

#### 3. 推荐配置

基于需求，向用户推荐并核实：

1. **任务指令**（`task` 字段）：
   - 将目标分解为详细的分步指令
   - 包含具体命令、文件路径和预期成果
   - 在 `PLUGIN_TASK` 和其他环境变量中使用 `${{inputs.fieldName}}` 语法引用输入
   - 在末尾添加 `## RULES` 部分，约束以 markdown 项目符号格式呈现

2. **运行时输入**（spec 中的 `inputs` 部分）：
   - 仅在用户确认需要运行时参数时添加
   - 将每个输入映射到智能体所需的内容（repo、branch、executionId、thresholds 等）
   - **始终为每个非必需输入设置 `default` 值**——如果 `PLUGIN_TASK` 或任何环境变量中引用了 `${{inputs.fieldName}}`，而运行时既未提供值也不存在默认值，则智能体将在执行时报错
   - 始终包含 `allowedDomains`，以便用户理解并控制非 LLM/非 MCP 的网络访问

3. **连接器**：
   - 用于模型访问的 LLM 连接器（所有智能体必需）——用户必须通过 Harness UI 或 MCP 创建
   - 用于外部服务（GitHub、Slack、Harness 平台等）的 MCP 连接器——仅在需要时
   - 所有身份验证和密钥都在连接器内管理

**向用户展示此推荐配置，并迭代直到确认。**

#### 4. 默认配置与输入

**智能体结构：** 智能体使用 `agent.step.group.steps` 格式——运行步骤嵌套在一个具名步骤组内。

**默认结构：**
```yaml
version: 1
agent:
  step:
    group:
      steps:
        - name: Agent
          if: <+Always>
          id: agent
          run:
            container:
              image: pkg.harness.io/vrvdt5ius7uwygso8s0bia/harness-agents/harness-ai-agent:latest
            env:
              PLUGIN_TASK: |
                <step-by-step task instructions>
              PLUGIN_MAX_TURNS: 150
              PLUGIN_HARNESS_CONNECTOR: ${{inputs.llmConnector.id}}
              PLUGIN_ALLOWED_DOMAINS: ${{inputs.allowedDomains}}
```

**必需的环境变量：**
```yaml
env:
  PLUGIN_TASK: |                                   # Task instructions go here as a multiline string
    <step-by-step instructions>
  PLUGIN_MAX_TURNS: 150                            # Adjust 100-200 based on task complexity
  PLUGIN_HARNESS_CONNECTOR: ${{inputs.llmConnector.id}}  # References llmConnector input's id property
  PLUGIN_ALLOWED_DOMAINS: ${{inputs.allowedDomains}}      # Regexes for additional network access
```

**MCP 配置（仅在需要外部服务时）：**
```yaml
env:
  PLUGIN_MCP_FORMAT: harness
  PLUGIN_MCP_SERVERS: <+connectorInputs.resolveList(<+inputs.mcpConnectors>)>  # References mcpConnectors input
```

**可选的模型覆盖（仅在用户明确要求时）：**
```yaml
env:
  ANTHROPIC_MODEL: ${{inputs.modelName}}  # Only add when user insists on a modelName input
```

**必需输入（始终包含）：**
```yaml
agent:
  inputs:
    llmConnector:
      type: connector
      required: true
      default: your_llm_connector_id  # User must replace with actual connector ID
      ui:
        connectorCategories:
          - AI

    allowedDomains:
      type: string
      default: ""
```

**网络访问：** 智能体网络访问限于 LLM 连接器、已配置的 MCP 连接器，以及匹配 `allowedDomains` 的域。`allowedDomains` 接受以 `|` 分隔的正则表达式。如果用户未指定域，默认为空字符串；如果用户指定了域，请与其一起构建正确的正则表达式。

**可选输入（按需添加）：**
```yaml
    # MCP connectors - only if agent needs external services
    mcpConnectors:
      type: array
      default:
        - your_github_mcp_connector  # User must replace
        - your_slack_mcp_connector   # User must replace
      ui:
        component: array
        input:
          inputType: connector
          inputConfig:
            connectorTypes:
              - Mcp
    
    # Model name override - ONLY add if user explicitly requests it
    modelName:
      type: string
      default: your_model_arn_or_id  # User must replace with their model ARN or ID
    
    # Custom parameters
    repo_name:
      type: string
      default: my-org/my-repo
```

**`layout` 块（始终包含，仅列出作为输入存在的字段）：**

`layout` 块控制智能体配置 UI 中显示的内容。它包含**最多四项**——`llmConnector`、`allowedDomains`、`modelName` 和 `mcpConnectors`——且仅包含那些在 `inputs` 部分中作为一等输入字段存在的项。切勿在 layout 块中包含任何其他字段（例如 `repo_name` 之类的自定义输入）：

```yaml
agent:
  layout:
    - title: Agent Configuration
      items:
        - llmConnector          # always present
        - allowedDomains        # always present
        - modelName             # only if modelName input exists
        - mcpConnectors         # only if mcpConnectors input exists
```

**支持的输入类型：** `string`、`secret`、`boolean`、`connector`、`array`

**重要：** 用户必须在运行智能体之前，通过 Harness UI 或使用 `resource_type="connector"` 的 `harness_create` 创建连接器。

### 阶段 3：生成智能体 spec

组装完整的智能体 YAML 规范（`spec` 字段）：

1. 以 `version: 1` 和 `agent:` 结构开始
2. 创建 `agent.step.group.steps` 块，包含单个步骤条目：
   - `name: Agent`, `if: <+Always>`, `id: agent`
   - `run.container.image: pkg.harness.io/vrvdt5ius7uwygso8s0bia/harness-agents/harness-ai-agent:latest`
   - `run.env` 部分（所有任务配置都作为环境变量放在这里）：
     - `PLUGIN_TASK:`——包含分步指令和 `## RULES` 部分的多行字符串
     - `PLUGIN_MAX_TURNS: 150`（根据复杂度调整 100-200）
     - `PLUGIN_HARNESS_CONNECTOR: ${{inputs.llmConnector.id}}`
     - `PLUGIN_ALLOWED_DOMAINS: ${{inputs.allowedDomains}}`
     - `PLUGIN_MCP_FORMAT: harness`（仅在需要 MCP 时）
     - `PLUGIN_MCP_SERVERS: <+connectorInputs.resolveList(<+inputs.mcpConnectors>)>`（仅在需要 MCP 时）
     - `ANTHROPIC_MODEL: ${{inputs.modelName}}`（**仅**在用户明确要求 `modelName` 输入时）
3. 添加 `agent.inputs` 部分，包含：
   - `llmConnector`（必需），带有 `ui.connectorCategories: [AI]`
   - `allowedDomains`（默认 `""`），使用正则表达式允许额外的网络域
   - `mcpConnectors`（可选——仅在需要时），带有 `ui.component: array`、`ui.input.inputType: connector` 和 `ui.input.inputConfig.connectorTypes: [Mcp]`
   - `modelName`（可选——**仅**在用户明确要求时）
   - 自定义输入（按需）
4. 添加 `agent.layout` 块——仅包含作为输入存在的项：
   - 始终包含 `llmConnector`
   - 始终包含 `allowedDomains`
   - 仅在该输入存在时包含 `modelName`
   - 仅在该输入存在时包含 `mcpConnectors`

**始终提醒用户在运行智能体之前创建连接器并替换占位符 ID。**

### 阶段 4：提交审查

向用户展示完整的智能体配置：
- 智能体元数据（name、description、uid）
- 完整的 spec YAML
- 必需的连接器

**在创建/更新智能体之前等待明确确认。**

### 阶段 5：创建或更新智能体

仅在确认之后，使用 `harness_create` 创建新智能体或使用 `harness_update` 更新现有智能体：

#### 创建新智能体

```
Call MCP tool: harness_create
Parameters:
  resource_type: "agent"
  org_id: "<organization>"
  project_id: "<project>"
  body: {
    uid: "<generated_from_agent_name>",
    name: "<Agent Display Name>",
    description: "<Brief description of agent purpose>",
    spec: "<agent YAML spec as a string>",
    wiki: "<optional: markdown documentation>"
  }
```

**创建的关键字段：**
- `uid`（必需）：唯一标识符。始终根据 `name` 生成为 `ca_<slug>` 并显式发送（例如 "Code Coverage Agent" → `ca_code_coverage_agent`）。不要省略它或依赖 API 端自动生成。
- `name`（必需）：智能体的显示名称
- `description`（可选）：简要描述
- `spec`（必需）：作为字符串的完整智能体 YAML 规范（包含 `version: 1`、`agent:`、`agent.step.group.steps`、`agent.inputs` 和 `agent.layout`）
- `wiki`（可选）：智能体的 Markdown 文档

#### 更新现有智能体

```
Call MCP tool: harness_update
Parameters:
  resource_type: "agent"
  resource_id: "<agent_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: {
    name: "<Updated Display Name>",           # optional
    description: "<Updated description>",     # optional
    spec: "<updated agent YAML spec>",        # optional
    wiki: "<updated markdown docs>"           # optional
  }
```

**更新的关键说明：**
- body 中的所有字段都是可选的——只提供你想更新的字段
- 只有自定义智能体（role='custom'）可以更新；系统智能体不可修改
- 提供时，`spec` 字段会替换整个智能体规范
- 更新前先使用 `harness_get` 获取当前智能体配置

## 示例：代码审查智能体

```yaml
version: 1
agent:
  step:
    group:
      steps:
        - name: Agent
          if: <+Always>
          id: agent
          run:
            container:
              image: pkg.harness.io/vrvdt5ius7uwygso8s0bia/harness-agents/harness-ai-agent:latest
            env:
              PLUGIN_TASK: |
                Review the pull request for repository ${{inputs.repo_name}} on branch ${{inputs.branch}}.

                1. Analyze code changes for security vulnerabilities
                2. Check for code quality issues
                3. Verify test coverage
                4. Post review comments using GitHub MCP tools

                ## RULES
                - Focus on critical security issues first
                - Be constructive in feedback
                - Suggest specific code improvements
              PLUGIN_MAX_TURNS: 150
              PLUGIN_HARNESS_CONNECTOR: ${{inputs.llmConnector.id}}
              PLUGIN_ALLOWED_DOMAINS: ${{inputs.allowedDomains}}
              PLUGIN_MCP_FORMAT: harness
              PLUGIN_MCP_SERVERS: <+connectorInputs.resolveList(<+inputs.mcpConnectors>)>

  inputs:
    llmConnector:
      type: connector
      required: true
      default: your_llm_connector_id  # User must replace with actual connector ID
      ui:
        connectorCategories:
          - AI

    allowedDomains:
      type: string
      default: ""

    mcpConnectors:
      type: array
      default:
        - your_github_mcp_connector  # User must replace with actual connector ID
      ui:
        component: array
        input:
          inputType: connector
          inputConfig:
            connectorTypes:
              - Mcp

    repo_name:
      type: string
      default: my-org/my-repo

    branch:
      type: string
      default: main

  layout:
    - title: Agent Configuration
      items:
        - llmConnector
        - allowedDomains
        - mcpConnectors
```

## 在流水线中使用智能体

智能体创建后，会作为模板发布，可在流水线中使用。智能体可在 v0 和 v1 流水线 YAML 格式中被引用。

### v1 流水线 YAML（基于模板）

在 v1 流水线中，智能体模板暴露其自定义输入（不包括 `llmConnector` 和 `mcpConnectors`，它们由内部处理）。

**示例：在 v1 流水线中使用代码审查智能体**

假设你创建了一个带有自定义输入 `repo_name` 和 `branch` 的 "Code Review Agent"：

```yaml
pipeline:
  identifier: code_review_pipeline
  name: Code Review Pipeline
  inputs:
    repo_name:
      type: string
      default: my-org/my-repo
    branch:
      type: string
      default: feature/new-feature
  stages:
    - name: Code Review
      steps:
        - name: review_pr
          template:
            uses: ca_code_review_agent@1.0.0
            with:
              repo_name: <+inputs.repo_name>
              branch: <+inputs.branch>
```

**关键点：**
- 流水线级的 `inputs:` 部分定义运行时参数
- `uses: <agent_uid>@<version>` 引用已发布的智能体模板
- `with:` 块使用 `<+inputs.variableName>` 语法为智能体的自定义输入提供值
- `llmConnector` 和 `mcpConnectors` 默认在智能体级别配置
- `modelName` 是可选的——仅在用户明确要求时才存在于智能体中
- 可选地，如有需要，你可以在流水线级别覆盖 `llmConnector`（以及若存在的 `modelName`）
- 流水线中只传递自定义输入（如 `repo_name`、`branch`、thresholds 等）

### v0 流水线 YAML（Agent 步骤类型）

在 v0 流水线中，使用 `Agent` 步骤类型引用智能体，它在内部引用 v1 模板。该步骤会展开 v1 模板并将其转换为 v0 Run Step。

**示例：在 v0 流水线中使用代码审查智能体**

```yaml
pipeline:
  stages:
    - stage:
        type: Deployment
        spec:
          execution:
            steps:
              - stepGroup:
                  stepGroupInfra:
                    type: KubernetesDirect
                  steps:
                    - step:
                        type: Agent
                        name: ReviewPRAgent
                        identifier: ReviewPRAgent
                        spec:
                          agentName: ca_code_review_agent
                          agentSettings: |-
                            {
                              "repo_name": "my-org/my-repo",
                              "branch": "feature/new-feature",
                              "llmConnector": "your_llm_connector_id",
                              "modelName": "your_model_arn_or_id",
                              "mcpConnectors": ["your_github_mcp_connector", "your_slack_mcp_connector"]
                            }
                          llmConnector: your_llm_connector_id
                          mcpConnectors:
                            - your_github_mcp_connector
```

**关键字段说明：**

- `type: Agent`——v0 流水线的步骤类型，引用一个 v1 智能体模板
- `name`（必需）——流水线 UI 中步骤的显示名称
- `identifier`（必需）——步骤在流水线内的唯一标识符
- `agentName`（必需）——通过 `harness_create` 创建的智能体 UID（v1 模板标识符）
- `agentSettings`（可选）——包含智能体模板输入的 JSON 字符串：
  - **自定义输入**：智能体特定字段，如 `repo_name`、`branch`、thresholds 等
  - **llmConnector**：LLM 连接器 ID（覆盖智能体默认值和一等字段）
  - **modelName**：模型 ARN 或 ID——仅当智能体创建时带有 `modelName` 输入才存在
  - **mcpConnectors**：MCP 连接器 ID 数组（覆盖智能体默认值和一等字段）
- `llmConnector`（可选）——用于在流水线级别指定 LLM 连接器 ID 的一等字段
- `mcpConnectors`（可选）——用于在流水线级别指定 MCP 连接器 ID 的一等数组字段

**优先级规则：**
1. `agentSettings` JSON 中的值具有**最高优先级**——它们会覆盖智能体默认值和一等字段
2. 一等字段（`llmConnector`、`mcpConnectors`）覆盖智能体默认值
3. 如果两者都未提供，则使用来自模板的智能体默认配置

## 关键准则

**这些是你在创建/更新智能体时必须遵循的基本规则：**

| 准则                  | 规则                                                                                                                                     |
| ----------------------------| ------------------------------------------------------------------------------------------------------------------------------------------|
| **先检查现有**   | 创建新智能体之前，始终调用 `harness_list(resource_type="agent")` 查看现有智能体能否解决该用例                                                     |
| **更新智能体**        | 使用 `harness_get` 获取当前配置，然后使用 `harness_update`（而非 `harness_create`）修改。只有自定义智能体可以更新。                                     |
| **生成 UID**           | 始终将 `uid` 派生为 `ca_<slug>`（例如 "Code Coverage Agent" → `ca_code_coverage_agent`）——与平台 UI 的 `nameToUid()` 一致。显式传递它；不要依赖创建 API 的回退。 |
| **智能体 spec 格式**      | `spec` 字段使用 `agent.step.group.steps` 结构——运行步骤嵌套在一个具名组内，带有 `name: Agent`、`if: <+Always>`、`id: agent`                     |
| **任务放在 env 中**            | 任务指令放入 `PLUGIN_TASK` 环境变量（多行字符串）。最大轮次在 `PLUGIN_MAX_TURNS`。没有 `with:` 块。                                                |
| **表达式语法**      | 在环境变量值内使用 `${{inputs.fieldName}}`。使用 `<+connectorInputs.resolveList(...)>` 解析 MCP 服务器。                                                          |                |
| **modelName 是可选的**  | 默认不要添加 `modelName` 输入或 `ANTHROPIC_MODEL` 环境变量——仅在用户明确要求时添加                                                         |
| **允许的域**       | 始终包含 `PLUGIN_ALLOWED_DOMAINS: ${{inputs.allowedDomains}}`、一个默认值为 `""` 的 `allowedDomains` 字符串输入，以及 layout 中的 `allowedDomains`。如果用户指定了域，帮助构建正则表达式。 |
| **输入默认值**         | 每个通过 `${{inputs.fieldName}}` 引用的非必需输入**必须有 `default` 值**——若遗漏，在调用方未提供值时会导致运行时错误  |
| **连接器占位符** | 始终使用 `your_llm_connector_id` 和 `your_mcp_connector_id` 之类的占位符，并提醒用户在运行智能体之前将 LLM 和 MCP 连接器 ID 都替换为实际值 |
| **不要 clone/platform**      | 不要添加 `clone`、`platform`、`os`、`arch` 或 `allowed_tools` 部分——智能体是简化的独立结构                                                  |
| **质量优先**          | 智能体质量至关重要——创建前核实 YAML 结构、校验所有引用、确保任务指令完整                                                |
