---
name: databricks-dabs
description: '创建、配置、验证、部署、运行和管理声明式自动化捆绑包（DABs，原名 Databricks Asset Bundles）。当你通过 DABs 处理 Databricks 资源（包括仪表板、作业、管道、告警、卷和应用）时使用。'
---

# 声明式自动化捆绑包（DABs）

任何与捆绑包相关的请求都使用本技能，包括通过 DABs 创建、配置、验证、部署、运行和管理 Databricks 资源。

## 参考文档

以下参考文件为特定的捆绑包任务提供详细指导：

- **[捆绑包结构](references/bundle-structure.md)** - 捆绑包结构、databricks.yml 配置、资源定义、路径解析、变量和多环境目标
- **[SDP 管道](references/sdp-pipelines.md)** - 面向 DABs 的 Spark Declarative Pipeline 配置
- **[SQL 告警](references/alerts.md)** - SQL 告警的 schema 与配置（关键 —— 其 API 与其他资源不同）
- **[部署与运行](references/deploy-and-run.md)** - 验证、部署、运行资源、监控日志和排查常见问题
- **[资源权限](references/resource-permissions.md)** - 捆绑包资源的权限级别与访问控制、按资源类型的级别、grants 与 permissions

## 何时使用本技能

任何涉及以下内容的请求都加载本技能：

- 创建新的捆绑包项目或资源
- 配置 databricks.yml 或资源 YAML 文件
- 设置多环境部署（dev/prod 目标）
- 部署或运行捆绑包资源
- 管理捆绑包资源的权限
- 排查捆绑包验证或部署错误
- 处理特定资源类型（仪表板、作业、管道、告警、卷、应用）

## 通用准则

1. **配置变更后始终进行验证** - 任何更改后都使用 `bundle validate --strict --target <target>`
2. **善用参考文档** - 查阅相应的参考文件以获取详细的模式和示例
3. **遵循命名约定** - 资源文件应使用 `<name>.<resource_type>.yml` 格式
4. **路径解析很关键** - 路径会因文件位置而异（参见捆绑包结构参考）
5. **保留既有结构** - 编辑 YAML 文件时保留用户的注释和结构
6. **使用变量** - 将 catalog、schema 和 warehouse 参数化以支持多环境
7. **为 App 名称划分命名空间** - App 名称是工作区全局的，且限制为 30 个字符。使用 Databricks CLI 0.270.0 或更高版本时，共享开发环境的默认值应包含 app 和 `${workspace.current_user.domain_friendly_name}`；生产环境用稳定名称覆盖，当默认值无效、发生冲突，或必须在同一工作区中区分多个非生产目标时，持久化一个显式的本地值。在较旧的 CLI 版本上，则要求显式的 `app_name` 值

## 应用完成契约（App Completion Contract）

在验证任何创建或更改 App 的捆绑包之前，重新阅读最终的捆绑包 YAML 并确认以下所有结构性要求：

- 每个 App 资源都使用专用的名称变量，例如 `name: ${var.app_name}`，同时在存在等效变量时保留该变量。
- 对于 Databricks CLI 0.270.0 或更高版本，每个 App 名称变量默认使用可识别的 App 前缀加上 `${workspace.current_user.domain_friendly_name}` 作为开发环境值，生产目标用稳定名称覆盖它。在较旧的 CLI 版本上，App 名称变量没有默认值，每位开发者都必须提供值。
- 任何开发环境 App 名称都不使用 `${workspace.current_user.short_name}`、裸 `${bundle.target}` 或硬编码的值。

只有在此检查之后，才运行 `databricks bundle validate --strict --target <target> --output json` 并检查每个解析后的 `resources.apps.<key>.name`。每个名称必须只包含小写字母、数字和连字符，且最多 30 个字符。如果解析出的名称无效、规范化后发生冲突，或多个非生产目标共享同一个工作区，则在未提交的 `.databricks/bundle/<target>/variable-overrides.json` 文件中持久化一个更短、不同的值并重新验证。仅验证成功并不能满足此契约，因为验证不会捕获每一个无效或未划分命名空间的 App 名称。

## 文档

- [声明式自动化捆绑包](https://docs.databricks.com/dev-tools/bundles/)
- [捆绑包示例代码仓库](https://github.com/databricks/bundle-examples) - 官方端到端示例捆绑包（作业、管道、仪表板、应用等）；可作为上述参考文件未涵盖的模式的可运行参考
