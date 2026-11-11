---
name: setting-up-looker-project
description: 'Looker 开发者入门：第 5 步。创建一个新的 Looker 项目并
  配置 Git。仅在完成第 4 步（使用 `connecting-looker-to-bigquery` 建立 BigQuery 连接）之后才执行此步骤。'
license: Apache-2.0
metadata:
  publisher: google
  version: v1
---

# 设置 Looker 项目

创建一个新的 Looker 项目，并使用本地裸 Git 代码仓库对其进行配置。

## 前置条件

-   必须已安装并认证 Looker CLI（参见 `installing-looker-cli`
    和 `authenticating-looker-cli` 技能）。

## 操作说明

### 1. 切换到开发工作区

切换到 'dev' 工作区（创建或修改项目配置所必需）。
建议将其与项目操作串联，以保证开发工作区持久生效：

```bash
looker-cli session update dev
```

### 2. 创建项目

将项目名称负载写入 `/tmp/project_create.json`：

```json
{
  "name": "{project_id}"
}
```

使用项目导入命令创建 Looker 项目（与
`session update dev` 串联）：

```bash
looker-cli session update dev && looker-cli project import /tmp/project_create.json
```

> [!NOTE] 为 `{project_id}` 使用唯一的、URL 安全的名称（例如
> `my_new_project`）。

### 3. 配置本地裸 Git 代码仓库

将 Git 配置负载写入 `/tmp/project_git.json`：

```json
{
  "git_service_name": "bare"
}
```

将项目配置为使用本地裸 Git 代码仓库：

```bash
looker-cli session update dev && looker-cli project update {project_id} /tmp/project_git.json
```

> [!NOTE] 这会在 Looker 服务器上设置一个本地 Git 代码仓库，非常适合
> 无需外部 Git 托管的快速入门。

### 4. 验证项目设置

获取项目详情，以验证 Git 是否正确配置：

```bash
looker-cli project cat {project_id}
```

确保输出显示 `uses_git` 为 `true`，且 `git_remote_url`
不为 null（看起来像 `../../bare_models/{project_id}.git`）。

> [!NOTE] 更新 Git 后，Looker 服务器上可能有轻微的传播延迟。如果
> `project cat` 命令失败（例如出现 400 错误），
> 请等待几秒钟后重试。
