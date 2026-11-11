---
name: connecting-looker-to-bigquery
description: 'Looker 开发者入门：第 4 步。在 Looker 中创建到 Google BigQuery 的数据库连接。仅在完成第
  3 步（使用 `authenticating-looker-cli` 进行 CLI 身份验证）之后才执行此步骤。'
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 将 Looker 连接到 BigQuery

在 Looker 中创建到 Google BigQuery 的数据库连接。本说明使用
**应用默认凭证（ADC）**，这是运行在 Google Cloud 中的 Looker Core
实例所推荐的、最安全的方式，因为它无需管理服务账号密钥。

## 前置条件

-   必须已安装并认证 Looker CLI（参见 `installing-looker-cli` 和
    `authenticating-looker-cli` 技能）。
-   Looker Core 实例的服务账号必须在 BigQuery 项目上具备所需的 IAM 角色。

## 操作说明

### 1. 确定 GCP 项目与数据集

从第 1 步（探索）中确定以下参数：

-   **GCP 项目 ID**：包含 BigQuery 数据集的 GCP 项目（允许包含连字符）。
-   **数据集 ID**：你想探索的 BigQuery 数据集（必须仅包含字母数字/下划线，不能有连字符）。

### 2. 预检：Looker 服务账号的 IAM 角色

验证 Looker Core 服务账号在目标 GCP 项目上具备所需的 IAM
角色（`BigQuery Data Viewer`、`BigQuery Job User` 和 `Service Usage Consumer`）：

> [!IMPORTANT] 从 Looker 实例通过 BigQuery 连接运行查询时，Google Cloud
> 要求 Looker 服务账号在 BigQuery 计费所在的项目内拥有计算/使用资源的权限。
> 如果没有 `roles/serviceusage.serviceUsageConsumer` 角色（该角色包含
> `serviceusage.services.use`），Looker 就无法认证或向 BigQuery 派发查询作业，
> 从而导致 `400 Bad Request` 错误。

1.  运行 IAM 预检脚本，传入 Looker GCP 项目 ID（Looker Core 实例所在的项目）
    和 BigQuery GCP 项目 ID：

    ```bash
    ./skills/onboarding-preflight-check/scripts/preflight_check.sh \
      --mode iam \
      --looker-project {looker_gcp_project_id} \
      --bq-project {bigquery_gcp_project_id}
    ```

2.  如果检查因缺少角色而失败，请先获取 Looker GCP 项目编号（或从预检
    错误输出中复制准确的服务账号邮箱）：

    ```bash
    project_number=$(gcloud projects describe {looker_gcp_project_id} --format="value(projectNumber)")
    ```

    然后运行以下命令，为 Looker 服务账号授予所需角色：

    ```bash
    gcloud projects add-iam-policy-binding {bigquery_gcp_project_id} \
      --member="serviceAccount:service-${project_number}@gcp-sa-looker.iam.gserviceaccount.com" \
      --role="roles/bigquery.dataViewer"

    gcloud projects add-iam-policy-binding {bigquery_gcp_project_id} \
      --member="serviceAccount:service-${project_number}@gcp-sa-looker.iam.gserviceaccount.com" \
      --role="roles/bigquery.jobUser"

    gcloud projects add-iam-policy-binding {bigquery_gcp_project_id} \
      --member="serviceAccount:service-${project_number}@gcp-sa-looker.iam.gserviceaccount.com" \
      --role="roles/serviceusage.serviceUsageConsumer"
    ```

### 3. 创建连接负载文件

为避免 CLI 在解析复杂参数时出错，请将连接规格直接写入
工作区中的 `./connection_config.json`。

> [!IMPORTANT] 对于 BigQuery JDBC 驱动：- **`host`** 必须设置为你的
> **GCP 项目 ID**（支持连字符）。- **`database`** 和 **`schema`**
> 都必须设置为你的 **数据集 ID**（严格仅限字母数字/下划线）。
> 将 `database` 设置为含连字符的项目 ID 会导致查询立即执行失败。

```json
{
  "name": "{connection_name}",
  "dialect_name": "bigquery_standard_sql",
  "uses_application_default_credentials": true,
  "host": "{gcp_project_id}",
  "database": "{dataset_name}",
  "schema": "{dataset_name}"
}
```

### 4. 在 Looker 中注册连接

执行连接导入 CLI 命令，指向你的负载文件：

```bash
looker-cli connection import ./connection_config.json
```

### 5. 验证连接

获取连接详情，确认其已正确创建：

```bash
looker-cli connection cat {connection_name}
```
