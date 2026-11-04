---
name: template-usage
description: >-
  通过 MCP v2 工具跟踪 Harness 模板依赖、使用情况和采用情况。查找哪些流水线
  或其他模板引用了给定模板、分析更新影响、识别未使用的模板，
  并比较版本采用情况。在询问模板使用情况、模板引用、模板
  依赖、更新模板前的影响分析、查找未使用的模板，或跟踪
  跨项目模板采用时使用。触发短语：模板使用、谁使用模板、模板
  引用、模板依赖、模板影响、未使用模板、模板采用。不要用于
  创建或更新模板（请改用 create-template）。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Template dependency tracking, impact analysis, and adoption
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 模板使用技能

通过 MCP v2 工具跟踪跨 Harness 的模板依赖和使用情况。

## 使用的 MCP v2 工具

| 工具 | 资源类型 | 用途 |
|------|--------------|---------|
| `harness_search` | `template` | 跨组织/项目按关键词查找模板 |
| `harness_list` | `template` | 列出模板，按范围过滤 |
| `harness_get` | `template` | 获取模板详情、版本和使用引用 |
| `harness_describe` | `template` | 发现模板资源 schema 和字段 |

模板仅通过 `harness_list` 和 `harness_get` 管理。要创建或更新模板，请使用 `/create-template` 技能。

## 模板类型

| 类型 | 描述 |
|------|-------------|
| `Step` | 单步骤定义（构建、测试、部署动作） |
| `Stage` | 带步骤的完整阶段（CI 阶段、CD 阶段、审批） |
| `Pipeline` | 完整流水线定义 |
| `StepGroup` | 捆绑在一起的相关步骤组 |

## 模板范围

| 范围 | 可见性 | 查询参数 |
|-------|-----------|-----------------|
| 账户 | 所有组织和项目 | 无 org_id、无 project_id |
| 组织 | 该组织内的所有项目 | 仅 org_id |
| 项目 | 仅在项目内 | org_id + project_id |

## 说明

### 步骤 1：查找模板

按名称或关键词搜索：

```
harness_search(
  query="docker-build-push",
  resource_types=["template"],
  max_per_type=10,
  compact=true
)
```

或列出特定范围中的模板：

```
harness_list(
  resource_type="template",
  org_id="<org>",
  project_id="<project>",
  search_term="docker"
)
```

### 步骤 2：获取模板详情

```
harness_get(
  resource_type="template",
  resource_id="<template_identifier>",
  org_id="<org>",
  project_id="<project>"
)
```

返回模板定义、版本历史和元数据。

### 步骤 3：检查使用引用

```
harness_get(
  resource_type="template",
  resource_id="<template_identifier>",
  org_id="<org>",
  project_id="<project>"
)
```

解析响应中的 `referredEntities` 或使用数据。响应包含哪些流水线和其他模板引用了此模板。

### 步骤 4：分析并呈现

将发现整理成报告。

有关报告模板（Usage Report、Impact Analysis、Unused Templates），请参阅 references/report-templates.md。

## 示例

### 检查谁使用模板

```
/template-usage
Which pipelines are using the docker-build-push template?
```

### 更新前的影响分析

```
/template-usage
I want to make a breaking change to the k8s-deploy template. Show me what will be affected.
```

### 查找未使用的模板

```
/template-usage
Which templates in our account have no references? I want to clean up.
```

### 跟踪版本采用

```
/template-usage
Which version of the ci-stage template are different projects using?
```

### 跨项目使用

```
/template-usage
Show me all usages of account-level templates across all projects
```

### 依赖链

```
/template-usage
Show me the full dependency chain for the release-pipeline template --
what does it reference and what references it?
```

## 错误处理

| 错误 | 原因 | 解决方法 |
|-------|-------|----------|
| 模板未找到 | 标识符或范围错误 | 核实标识符并为模板范围使用正确的 org_id/project_id |
| 无使用数据 | 模板确实未使用或范围不匹配 | 在更宽范围搜索；账户模板可能在任何项目中使用 |
| 搜索结果为空 | 没有模板匹配查询 | 尝试更宽的搜索词或列出所有模板 |

## 性能注意事项

- 在生成影响报告之前分页遍历所有使用结果。大型模板可能有许多引用。
- 跨所有范围（account、org、project）检查使用情况以获得完整影响分析。
- 核实版本信息以区分使用当前版本与过时模板版本的团队。

## 故障排查

### 未返回使用数据

1. 模板可能确实没有引用
2. 查询范围必须与模板范围匹配——账户级模板不需要 org_id/project_id
3. 使用带更宽词条的 `harness_search` 先找到模板

### 使用列表不完整

1. 分页遍历结果——递增 `page` 直到检索到所有结果
2. 账户级模板可从任何 org/project 引用——检查所有范围
3. 同时检查流水线和模板引用（模板可以嵌套）

### 模板未找到

1. 核实确切标识符（区分大小写，用下划线而非连字符）
2. 标识符必须匹配模式：`^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`
3. 检查正确的范围——项目模板需要 org_id + project_id
