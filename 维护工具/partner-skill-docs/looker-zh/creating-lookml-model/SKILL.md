---
name: creating-lookml-model
description: 'Looker 开发者入门：第 6 步。根据用户的目标创建 LookML 视图和模型，
  映射模型连接、验证 LookML，并运行验证查询。仅在完成第 5 步（使用 `setting-up-looker-project` 进行项目设置）之后才执行此步骤。'
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 创建 LookML 模型、视图与编写 LookML

本技能引导你完成编写所有 LookML（视图文件和模型文件）的*过程*，
以准备用户在入门访谈中请求的仪表板，配置 Looker 中的连接映射，
验证 LookML 代码，并运行内联查询以验证其功能正常。

## 前置条件与参考

-   必须已安装并认证 Looker CLI（第 2 步和第 3 步）。
-   必须已创建 Looker 项目和 BigQuery 连接（第 4 步和第 5 步）。
-   **关键参考**：在编写和验证所有 LookML 元素时，你**必须**阅读并严格遵循
    **`lookml-modeling-guidelines`** 技能中的最佳实践、命名要求和约束。

## 操作说明

### 1. 获取入门目标与 Schema 规格

回顾在对话历史的**第 1 步（探索）**访谈中与用户确立的入门目标和
BigQuery 探索结果。你必须回想：1. 目标**仪表板目标**（例如销售
概览、支持指标等）。2. 已确认的具体 **GCP 项目**、**数据集**
和**表**（事实表和维度表）。3. 要使用的目标**指标**
（度量）和**维度**。

*注意：不要凭空编造或猜测这些细节。你的视图、字段、
探索和模型的名称必须直接对应你在第 1 步中发现的实际 schema 和表。*

### 2. 创建和编辑视图文件（CLI）

对于构建目标仪表板所需的每一个 BigQuery 表，你必须编写
LookML 视图定义并将其上传到项目中：

1.  **创建 `views` 目录**：如果项目中尚不存在 `views/` 目录，
    请使用 Looker CLI 创建它：

    ```bash
    looker-cli project directory create {project_id} views
    ```

2.  **生成视图内容**：从探索中获取表格列，并在本地编写
    LookML 视图文件内容（例如写入
    `/tmp/{table_name}.view.lkml`）。遵循主键和字段定义
    指南。

3.  **上传视图文件**：将文件上传到 Looker 项目的 views
    文件夹：

    ```bash
    looker-cli project file create {project_id} views/{table_name}.view.lkml /tmp/{table_name}.view.lkml
    ```

4.  **指南参考**：对于所有视图定义、主键规则和字段
    引用规范，你**必须**查阅并严格遵循 **`lookml-modeling-guidelines`** 技能中的视图
    创建最佳实践（第 4 节和第 6.C 节）。

### 3. 创建/更新模型文件（CLI）

编写 LookML 模型定义并将其上传到项目根目录：

1.  将模型 LookML 结构（定义探索、连接和包含）写入
    本地文件（例如 `/tmp/{model_name}.model.lkml`）。
    -   指定你的数据库连接：`connection: "{connection_name}"`。
    -   包含所需的具体视图文件（例如 `include:
        "/views/orders.view.lkml"`、`include: "/views/users.view.lkml"`）。避免
        使用 `"/views/**/*.view.lkml"` 这样的宽泛通配符，以防止
        性能膨胀和编译错误。
    -   **对仪表板至关重要**：如果计划创建 LookML 仪表板，
        你**必须**通过添加 `include:
        "/dashboards/**/*.dashboard.lookml"` 将其包含在模型文件中。
    -   定义探索和连接。
2.  将模型文件上传到 Looker 项目根目录：

    ```bash
    looker-cli project file create {project_id} {model_name}.model.lkml /tmp/{model_name}.model.lkml
    ```

3.  **指南参考**：对于所有 include 声明、探索结构和
    显式连接关系定义，你**必须**查阅并严格遵循 **`lookml-modeling-guidelines`** 技能中的模型
    和探索最佳实践（第 6.A 节和第 6.B 节）。

### 4. 在 Looker 中配置模型连接（CLI）

使用 Looker CLI 将你的 LookML 模型映射到 Looker 中允许的数据库连接。
**此步骤为强制要求**，以便 Looker 注册模型
配置映射并启用查询。

1.  将模型配置负载直接写入 `/tmp/model_config.json`：

    ```json
    {
      "name": "{model_name}",
      "project_name": "{project_id}",
      "allowed_db_connection_names": ["{connection_name}"]
    }
    ```

2.  **注册模型配置映射（强制步骤）**：

    ```bash
    looker-cli model import /tmp/model_config.json
    ```

3.  验证映射：

    ```bash
    looker-cli model cat {model_name}
    ```

    确保返回的 JSON 在 `allowed_db_connection_names` 中正确列出了你的连接。

### 5. 验证项目的 LookML（CLI）

验证 LookML 代码，确保没有语法或逻辑错误：

1.  使用 Looker CLI 触发项目验证：

    ```bash
    looker-cli api project validate_project {project_id}
    ```

2.  如果发现错误，请在本地文件中修复、使用 `looker-cli project file update`
    上传更新后的版本，并重新运行验证，直到无错误。
3.  **指南参考**：在我们的**零错误政策**下，严格
    禁止提交未通过验证的代码。详细的验证
    规则和反馈循环流程请参阅 **`lookml-modeling-guidelines`**（第 3 节和第 5 节）。

### 6. 通过运行查询进行验证（CLI）

通过运行验证查询来测试你的连接和 LookML 模型：

1.  使用 **`lookml-modeling-guidelines`**（第 2 节）中的探索工具来查找
    你所定义维度和度量的完全限定名称。
2.  将 JSON 查询负载直接写入 `/tmp/verify_query.json`
    （请求你的完全限定维度和度量，限制为 5 行）：

    ```json
    {
      "model": "{model_name}",
      "view": "{explore_name}",
      "fields": ["{explore_name}.{dimension_name}", "{explore_name}.{measure_name}"],
      "limit": 5
    }
    ```

3.  使用 Looker CLI 执行查询：

    ```bash
    looker-cli query runquery --file /tmp/verify_query.json --format json
    ```

4.  确认查询成功执行并返回数据，且没有数据库或 SQL 错误。
    验证指南请参阅 **`lookml-modeling-guidelines`**（第 3 节）。
