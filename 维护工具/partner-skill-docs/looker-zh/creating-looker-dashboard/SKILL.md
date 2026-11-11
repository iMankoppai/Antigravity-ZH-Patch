---
name: creating-looker-dashboard
description: 'Looker 开发者入门：第 7 步（最后一步）。在项目中创建一个 LookML 仪表板，将其作为用户自定义仪表板
  (UDD) 导入 Looker，并根据用户反馈通过同步更改来迭代完善。仅在完成第
  6 步（使用 `creating-lookml-model` 进行模型设置）之后才执行此步骤。'
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 创建 Looker 仪表板与反馈循环

本技能引导你完成入门的最后一步：构建用户所请求的目标仪表板。你将
在项目中把仪表板定义为 LookML 仪表板文件，将其作为用户自定义仪表板
(UDD) 导入 Looker，并根据用户反馈迭代更新与同步。

## 前置条件

-   必须已安装并认证 Looker CLI（第 2 步和第 3 步）。
-   Looker 项目、连接、视图和模型必须已完全设置并通过验证（第 4、5、6 步）。

## 操作说明

### 1. 获取仪表板规格并确定目标文件夹

1.  回顾在**第 1 步（探索）**访谈中与用户确立的目标仪表板、表格、维度和度量
    （这些随后在**第 7 步（模型）**中创建），相关信息见对话历史。
    你必须回想这些规格，以确保仪表板展示正确的数据。
2.  定位用于放置仪表板的目标 Looker **文件夹 ID**。由于这是一个全新的
    Looker 实例，我们将按规定把仪表板放入默认的 **Shared** 文件夹：
    -   使用 Looker CLI 列出所有文件夹：`looker-cli folder ls`
    -   在输出中找到名为 `"Shared"` 的文件夹。在全新实例中，
        该文件夹始终存在，其 ID 几乎总是 `"1"`。
    -   确定该 `"Shared"` 文件夹的 ID，并将其用作目标文件夹 ID
        （该 ID 将在后续步骤中传给 `folder_id` 参数）。

### 2. 创建 LookML 仪表板文件（CLI）

你必须在项目中把仪表板结构定义为 LookML 仪表板文件：

1.  **创建 `dashboards` 目录**：如果项目中尚不存在 `dashboards/` 目录，
    请使用 Looker CLI 创建它：

    ```bash
    looker-cli project directory create {project_id} dashboards
    ```

2.  **生成仪表板 LookML**：在本地编写 LookML 仪表板定义
    （例如写入 `/tmp/{dashboard_name}.dashboard.lookml`）。确保文件使用
    `.dashboard.lookml` 扩展名。

3.  **上传仪表板文件**：将文件上传到 Looker 项目的
    dashboards 文件夹（路径约定为
    `dashboards/{dashboard_name}.dashboard.lookml`）：

    ```bash
    looker-cli project file create {project_id} dashboards/{dashboard_name}.dashboard.lookml /tmp/{dashboard_name}.dashboard.lookml
    ```

4.  **关键的包含步骤**：你**必须**在
    LookML 模型文件（`{model_name}.model.lkml`）中包含仪表板文件，以便项目校验器和
    CLI 导入/同步命令能够发现它们：

    ```lkml
    include: "/dashboards/**/*.dashboard.lookml"
    ```

5.  在仪表板文件内编写 LookML 仪表板定义，
    配置展示你在第 7 步中创建的维度和度量的图块（元素）。强烈建议使用
    **`layout: newspaper`**（它支持在
    24 列内使用网格坐标 `row`、`col`、`width` 和 `height`），以避免较旧的 `layout:
    grid` 行分组可能导致的导入错误。

*示例仪表板 LookML（`layout: newspaper`）：*

```yaml
- dashboard: sales_performance
  title: Sales Performance Overview
  layout: newspaper
  preferred_viewer: dashboards-next

  elements:
    - name: total_revenue_tile
      title: Total Revenue Over Time
      model: ecommerce
      explore: orders
      type: looker_line
      fields: [orders.created_date, orders.total_revenue]
      sorts: [orders.created_date desc]
      limit: 500
      row: 0
      col: 0
      width: 12
      height: 8

    - name: order_count_tile
      title: Top Countries by Orders
      model: ecommerce
      explore: orders
      type: looker_column
      fields: [users.country, orders.count]
      sorts: [orders.count desc]
      limit: 10
      row: 0
      col: 12
      width: 12
      height: 8
```

*注意：确保每个图块上的 `model` 和 `explore` 属性与项目中所定义的
模型和探索名称一致，并且 `fields` 使用完全限定的 `view_name.field_name` 格式。*

### 3. 验证并提交 LookML

验证项目，以确保仪表板语法完美无误、没有引用错误：

```bash
looker-cli api project validate_project {project_id}
```

如果返回错误，请修复 LookML 仪表板定义并重新验证，直到无错误。

### 4. 将 LookML 仪表板导入为 UDD（CLI）

将 LookML 仪表板作为用户自定义仪表板 (UDD) 导入目标文件夹。
这会将静态文件转换为 Looker 中由数据库支持的仪表板。

1.  以 `{model_name}::{dashboard_name}` 格式构造 `lookml_dashboard_id`
    （例如 `ecommerce::sales_performance`）。
2.  **确保处于开发模式工作区上下文**：默认情况下，Looker CLI 会话
    在生产工作区中执行。由于你新建的仪表板
    仅存在于开发模式中，你**必须**在导入/同步之前立即将 CLI 会话切换到
    开发工作区。将会话更新命令与导入命令串联：

    ```bash
    looker-cli session update dev && looker-cli dashboard import lookml {model_name}::{dashboard_name} {folder_id}
    ```

3.  该命令将返回一个 JSON 对象，其中包含所导入 UDD 的详情。
    从响应中记录仪表板的数字 `id`（例如 `45`）或 `slug`。

### 5. 验证仪表板内容（SQL 查询验证检查）

Looker 的项目验证仅检查 LookML 语法——它**不会**验证
每个图块的 SQL 查询能否针对数据库成功执行。为确保在向用户展示之前
仪表板 100% 没有查询错误，你**必须**检索并执行每个仪表板图块
背后的查询：

1.  检索你新导入的 UDD 仪表板的仪表板元素详情
    （特别针对 `query_id`）：

    ```bash
    looker-cli dashboard cat {udd_id} --fields "dashboard_elements(query_id)"
    ```

2.  对于 JSON 结果中返回的每个唯一 `query_id`（排除文本图块的任何 null
    值），执行该查询以验证数据库正确性：

    ```bash
    looker-cli query runquery {query_id}
    ```

3.  验证每个查询都能成功执行并返回数据，且没有 SQL 或
    数据库错误。如果任何查询失败（表明存在数据库列不匹配、
    SQL 方言函数错误或 GCP 权限问题），你**必须**在 LookML 视图中
    解决问题、提交更改、重新运行 `looker-cli api
    project validate_project {project_id}`、使用 `looker-cli
    dashboard sync lookml` 进行同步，并重新验证此序列，直到所有查询
    都成功执行。

### 6. 呈现并与用户迭代（交互步骤）

1.  向用户展示所导入仪表板的链接：
    `{instance_url}/dashboards/{udd_id}`（或 `/dashboards-next/{udd_id}`）。
2.  **停下并询问**用户对布局、图表类型或
    标签的反馈：

    > "我已成功构建并导入你的新仪表板！你可以在这里查看：
    > {dashboard_url}
    >
    > 这看起来符合你的期望吗？如果你想让我更改任何
    > 图表类型、新增指标或调整布局，请告诉我！"

3.  **停下并等待**用户的回复。不要调用任何工具。

### 7. 完善并同步更改

如果用户请求对仪表板进行更改（例如"把订单数改成
条形图而不是柱形图"，或"添加一个筛选器"）：

1.  编辑本地 LookML 仪表板文件，并更新到 Looker 服务器：

    ```bash
    looker-cli project file update {project_id} dashboards/{dashboard_name}.dashboard.lookml /tmp/{dashboard_name}.dashboard.lookml
    ```

2.  验证项目：

    ```bash
    looker-cli api project validate_project {project_id}
    ```

3.  使用 CLI 同步命令，将更改直接传播到已导入的 UDD 仪表板：

    ```bash
    looker-cli dashboard sync lookml {model_name}::{dashboard_name}
    ```

4.  **重新运行查询验证**：再次运行查询验证检查，以确保你的
    完善没有引入任何新的 SQL 或数据库错误：

    -   再次获取 UDD 元素（以捕获任何新的图块查询）：`looker
        dashboard cat {udd_id} --fields "dashboard_elements(query_id)"`
    -   对于每个返回的 `query_id`，运行查询以验证 SQL 正确性：
        `looker-cli query runquery {query_id}`

5.  请用户刷新浏览器并查看更改。重复此
    循环，直到用户完全满意！
