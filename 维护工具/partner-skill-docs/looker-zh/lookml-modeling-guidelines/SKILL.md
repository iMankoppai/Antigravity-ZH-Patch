---
name: lookml-modeling-guidelines
description: LookML 建模与命令执行的准则。
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# LookML 建模准则

本指南提供使用 Looker CLI 协助完成 LookML 建模任务的说明。
它综合了 LookML 开发的最佳实践与有效的 CLI 用法。

## LookML 文件类型

了解 LookML 项目中不同文件类型的用途：

*   **项目清单（`manifest.lkml`）**：项目的全局配置，包括导入和常量。
*   **模型文件（`.model.lkml`）**：定义数据库连接和探索（视图如何连接）。
*   **视图文件（`.view.lkml`）**：数据的蓝图，定义维度、度量和派生表。
*   **仪表板文件（`.dashboard.lookml`）**：LookML 定义的仪表板（布局、可视化、筛选器）。
*   **专门化文件**：Refinement 文件（用于覆盖/修补）、数据测试文件（自动化逻辑检查）以及文档文件（`.md`）。

## 1. 分析需求

在编写任何 LookML 代码或进行修改之前，请分析用户的
请求，以确定所需的 LookML 元素。

*   **理解请求**：识别核心业务问题或技术需求。
*   **识别现有资源**：
    *   使用探索工具（见第 2 节）搜索现有的 LookML 项目。
    *   确定哪些现有列（维度）和度量最适合回答用户的提示。
    *   *不要重新创建已有的逻辑。* 尽可能复用现有元素。
*   **确定必要的添加项**：
    *   判断是否需要*新*的 LookML 元素来满足提示：
        *   **新视图**：我们是否引入了新表或派生表？
            （注意：如果创建派生表或 PDT，你**必须**查阅
            `lookml-pdt-guidelines` 技能）。
        *   **新维度**：我们是否需要暴露新列，或从现有列定义新逻辑？
        *   **新度量**：我们是否添加新的聚合（例如 `count`、
            `sum`、`average`）或计算指标？
        *   **其他元素**：我们是否需要在探索中添加新连接，或其他
            LookML 元素？

## 2. 探索与检查（CLI）

*   **项目映射**：使用以下 CLI 命令了解项目结构：
    *   列出项目：`looker-cli api project all_projects`
    *   列出模型：`looker-cli api lookmlmodel all_lookml_models`
    *   检查某个模型：`looker-cli api lookmlmodel lookml_model {model_name}`
*   **字段探索**：要查看某个探索中暴露了哪些维度和度量，请调用：`looker-cli api lookmlmodel lookml_model_explore {model_name}
    {explore_name}`（这比读取原始视图文件更清晰）。
*   **Schema 探索**：要检索数据库列和 schema，请使用：
    *   列出连接：`looker-cli connection ls`
    *   列出 schema：`looker-cli api metadata connection_schemas
        {connection_name}`
    *   列出表：`looker-cli api metadata connection_tables
        {connection_name}`
    *   列出表列：`looker-cli api metadata connection_columns
        {connection_name} --schema_name {schema_name} --table_names
        {table_name}`
*   **数据探索**：执行查询以检查数据结果：`looker-cli query
    runquery {query_id}`，或使用 `looker-cli api query
    run_inline_query` 运行内联查询。必须使用完全限定的字段（例如 `view.field`）。

## 3. 验证与测试（CLI）

始终验证你的 LookML 有效，并能生成预期的 SQL 或
结果。

*   **语法正确性：** 所有代码必须语法完美，花括号配对且参数正确。
    `sql` 参数必须匹配具体的数据库方言（例如 BigQuery、Snowflake）。
*   **运行查询**：使用 `looker-cli query runquery` 验证结果。
*   **类型安全**：确保 LookML 类型与数据库列类型匹配。
*   **SQL 验证**：运行 `looker-cli api query run_inline_query`，请求
    查询的 SQL 字段以检查生成的 SQL。
*   **验证**：在开发过程中频繁使用 `looker-cli api project validate_project {project_id}`。
*   **测试**：使用以下命令获取并运行测试：
    *   获取测试：`looker-cli api project all_lookml_tests {project_id}`
    *   运行测试：`looker-cli api project run_lookml_test {project_id}`

## 4. 创建新视图（CLI）

由于我们没有自动化的 CLI 视图生成子命令，你**必须**
手动创建视图。根据第 2 步中检索到的列 schema 从
零构建 LookML 视图定义结构，将内容保存到
本地文件（例如 `/tmp/my_view.view.lkml`），然后上传：

```bash
looker-cli project file create {project_id} views/{view_name}.view.lkml /tmp/my_view.view.lkml
```

### 命名与唯一性要求

*   **模型：** 要求实例范围内唯一（防止 URL 冲突和
    实例错误）。
*   **视图：** 要求项目范围内唯一（作为字段的命名空间）。
*   **探索：** 要求模型范围内唯一（查询起点）。
*   **字段：** 要求视图范围内唯一（维度/度量名称必须在
    视图内唯一）。

## 5. 反馈循环（验证）

对 LookML 文件进行任何更改后：

1.  运行 `looker-cli api project validate_project {project_id}` 检查
    语法和引用错误。
2.  如果发现错误，修复它们并重复第 1 步。
3.  如果定义了数据测试，运行 `looker-cli api project run_lookml_test
    {project_id}` 以确保它们仍然通过。
4.  在校验器返回无错误之前，**不要**认为任务已完成。

--------------------------------------------------------------------------------

## 6. 最佳实践

### A. 模型

*   **Includes**：使用具体、细粒度的 `include` 路径，而非宽泛的
    通配符，以防止性能膨胀、避免命名空间冲突并
    提高编译速度。
    *   **应做**：`include: "/views/users.view.lkml"`
    *   **不应做**：`include: "/views/*.view.lkml"`

### B. 探索

*   **连接**：始终显式指定 `relationship` 参数（例如
    `many_to_one`）。这对于 Looker 生成正确的 SQL 并
    避免扇出至关重要。
*   **细粒度探索**：优先选择小而专注的探索，而非单体式探索，
    以简化用户界面并便于排查问题。

### C. 视图

*   **主键**：每个代表表的视图都应定义主键。
    它必须是第一个维度，并带有 `primary_key: yes`。这
    对于对称聚合至关重要。
*   **字段引用**：度量应引用维度（例如
    `${dimension_name}`），而非直接引用表列（例如
    `${TABLE}.column_name`）。这可确保单一事实来源。
*   **字段描述**：始终为任何新维度或度量添加人类可读的 `description` 参数。
    这有助于最终用户在字段选择器中理解该字段。

### D. 通用

*   **DRY 原则与模块化：** 利用 `extends`、`refinements`（实现
    模块化、可扩展的代码）和 `sets` 来消除代码重复。
*   **Refinements 与 Extensions**：使用 **Refinements**（`+` 语法）在不重命名的前提下
    将更改叠加到现有对象上（例如自定义 Blocks）。
    使用 **Extensions**（`extends`）创建新的、专门化的变体，同时
    保持原始对象不变。

### 约束与护栏

*   **强制主键：** 在创建任何视图、派生表或 PDT 时，你必须始终定义
    带有 `primary_key: yes` 的维度。每个
    表都必须有显式主键。
*   **应用范围：** 本文件中的所有准则和最佳实践仅
    适用于为满足用户提示而新增的代码。除非明确要求或
    为使新代码正常工作所必需，否则不要重构或修改
    现有代码以符合这些准则。保持现有代码原样。
*   **零错误政策：** 严格禁止提交未通过
    LookML 校验器的代码。
*   **数据最小化：** 仅访问当前任务所需的数据和 schema。
*   **验证**：将验证范围限制在你自己的更改内。不要
    修复现有的验证错误。
