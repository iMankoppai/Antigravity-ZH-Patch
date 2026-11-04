---
name: migrate-pipeline
description: >-
  通过 MCP 工具将 Harness 流水线从 v0 迁移到 v1 简化格式。将表达式从
  尖括号转换为 ${{ }} 语法、将类型名小写、简化结构，并保留变量、
  失败策略和条件逻辑。在要求迁移流水线、将 v0 转换为 v1、
  升级流水线格式、使流水线语法现代化或比较 v0 与 v1 时使用。触发短语：迁移
  流水线、转换为 v1、升级流水线、v0 to v1、使流水线现代化、简化格式。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Convert v0 pipelines to v1 format
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 迁移流水线

通过 MCP 将 Harness 流水线从 v0 转换为 v1 简化格式。

## 说明

### 步骤 1：获取当前 v0 流水线

```
Call MCP tool: harness_get
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

### 步骤 2：将 v0 转换为 v1

应用这些转换：

### 表达式映射

| v0 表达式 | v1 表达式 |
|--------------|---------------|
| `<+pipeline.variables.x>` | `${{ pipeline.variables.x }}` |
| `<+stage.variables.x>` | `${{ stage.variables.x }}` |
| `<+steps.id.output.outputVariables.x>` | `${{ steps.id.output.x }}` |
| `<+trigger.branch>` | `${{ trigger.branch }}` |
| `<+secrets.getValue("x")>` | `${{ secrets.x }}` |
| `<+pipeline.sequenceId>` | `${{ pipeline.sequenceId }}` |
| `<+input>` | `${{ input }}` |

### 结构变更

**v0 CI 阶段：**
```yaml
stages:
  - stage:
      identifier: build
      type: CI
      spec:
        cloneCodebase: true
        platform:
          os: Linux
          arch: Amd64
        runtime:
          type: Cloud
          spec: {}
        execution:
          steps:
            - step:
                identifier: run
                type: Run
                spec:
                  shell: Bash
                  command: npm test
```

**v1 等价：**
```yaml
stages:
  - name: build
    type: ci
    spec:
      steps:
        - name: run
          type: run
          spec:
            shell: bash
            run: npm test
```

**v1 的主要差异：**
- 阶段/步骤类型为小写：`ci`、`run`、`deployment`
- Run 步骤中的 `command` 变为 `run`
- `execution.steps` 简化为 `spec.steps`
- 平台/运行时被简化或隐式
- `identifier` 变为 `name`（或 `id`）

### 步骤 3：展示转换后的流水线

并排呈现 v0 和 v1 以供审查。

### 步骤 4：在 Harness 中更新（可选）

```
Call MCP tool: harness_update
Parameters:
  resource_type: "pipeline"
  resource_id: "<pipeline_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
  body: <v1 pipeline YAML>
```

## 迁移检查清单

- [ ] 表达式已从 `<+...>` 转换为 `${{ ... }}`
- [ ] 阶段类型已小写
- [ ] 步骤类型已正确映射
- [ ] 平台/运行时配置已简化
- [ ] 变量和输入已保留
- [ ] 失败策略已维护
- [ ] 通知规则已保留
- [ ] 条件执行逻辑已保留

## 示例

- “将 build-and-deploy 流水线迁移到 v1”——获取、转换、显示 diff
- “显示 ci-pipeline 在 v1 中会是什么样”——获取、转换、仅显示
- “转换项目中的所有流水线”——列出全部、逐个转换

## 性能注意事项

- 在开始迁移之前读取完整的 v0 流水线。缺少阶段或步骤会产出不完整的 v1 流水线。
- 核实所有表达式已从 `<+...>` 转换为 `${{ }}` 格式。
- 比较 v0 和 v1 输出以确认转换中没有丢失功能。

## 故障排查

### 不支持的 v0 特性
- 部分 v0 特定步骤类型可能尚无 v1 等价
- 复杂的失败策略可能需要手动调整
- 自定义阶段类型需要仔细映射

### 迁移后的校验错误
- 重新校验表达式语法
- 检查所有资源引用仍可解析
- 核实变量类型兼容
