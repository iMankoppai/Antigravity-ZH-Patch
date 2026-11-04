---
name: create-secret
description: >-
  生成 Harness 密钥定义并通过 MCP v2 工具管理密钥。支持 SecretText、
  SecretFile、SSHKey 和 WinRmCredentials 类型，可配置密钥管理器（Harness 内置、
  HashiCorp Vault、AWS Secrets Manager、Azure Key Vault、GCP Secret Manager）。在
  要求创建密钥、存储凭据、管理 API 密钥、设置 SSH 密钥、配置 WinRM 凭据、
  轮换密钥或在流水线中引用密钥时使用。触发短语：创建密钥、密钥文本、
  密钥文件、SSH 密钥、API 密钥、密码、凭据、密钥管理器、存储密钥。
metadata:
  author: Harness
  version: 1.0.0
  mcp-server: harness-mcp-v2
  summary: Manage secrets (SecretText, SecretFile, SSHKey, WinRM)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建密钥技能

生成 Harness 密钥定义并通过 MCP v2 工具管理密钥。

## 使用的 MCP v2 工具

| 工具 | 资源类型 | 用途 |
|------|--------------|---------|
| `harness_list` | `secret` | 列出现有密钥 |
| `harness_get` | `secret` | 获取密钥元数据（而非值） |
| `harness_create` | `secret` | 创建新密钥 |
| `harness_update` | `secret` | 更新密钥元数据或值 |
| `harness_delete` | `secret` | 删除密钥 |
| `harness_describe` | `secret` | 发现密钥资源 schema |

## 密钥类型

### SecretText

存储基于文本的密钥：密码、API 令牌、连接字符串。

```yaml
secret:
  identifier: my_api_key
  name: My API Key
  description: API key for external service
  type: SecretText
  spec:
    secretManagerIdentifier: harnessSecretManager
    valueType: Inline
    value: <secret_value>
```

有关其他密钥类型（SecretFile、带 KeyReference/KeyPath/Password 的 SSHKey、带 NTLM/Kerberos 的 WinRmCredentials）以及密钥管理器配置，请参阅 references/secret-types.md。

## 密钥范围

| 范围 | 可见性 | MCP 参数 |
|-------|-----------|----------------|
| 项目 | 仅在项目内 | `org_id` + `project_id` |
| 组织 | 该组织内的所有项目 | 仅 `org_id` |
| 账户 | 所有组织和项目 | 既不是 org_id 也不是 project_id |

## 说明

### 第 1 步：确定需求

- 密钥类型：SecretText、SecretFile、SSHKey 或 WinRmCredentials
- 密钥管理器：Harness 内置或外部
- 范围：项目、组织或账户
- 用于组织的标签和描述

### 第 2 步：检查现有密钥

```
harness_list(
  resource_type="secret",
  org_id="<org>",
  project_id="<project>",
  search_term="<keyword>"
)
```

### 第 3 步：创建密钥

```
harness_create(
  resource_type="secret",
  org_id="<org>",
  project_id="<project>",
  body={
    "secret": {
      "identifier": "my_api_key",
      "name": "My API Key",
      "type": "SecretText",
      "spec": {
        "secret_manager_identifier": "harnessSecretManager",
        "value_type": "Inline",
        "value": "<value>"
      }
    }
  }
)
```

### 第 4 步：验证创建

```
harness_get(
  resource_type="secret",
  resource_id="my_api_key",
  org_id="<org>",
  project_id="<project>"
)
```

## 在流水线中引用密钥

```yaml
# Project-level secret
<+secrets.getValue("my_api_key")>

# Org-level secret
<+secrets.getValue("org.my_api_key")>

# Account-level secret
<+secrets.getValue("account.my_api_key")>
```

在连接器配置中：

```yaml
connector:
  spec:
    authentication:
      spec:
        tokenRef: github_pat   # secret identifier
```

在服务变量中：

```yaml
variables:
  - name: DB_PASSWORD
    type: Secret
    value: <+secrets.getValue("db_password")>
```

## 命名约定

| 密钥类型 | 模式 | 示例 |
|-------------|---------|---------|
| API 密钥 | `{service}_api_key` | `github_api_key` |
| 密码 | `{system}_password` | `prod_db_password` |
| 令牌 | `{provider}_token` | `slack_token` |
| SSH 密钥 | `ssh_{purpose}` | `ssh_deploy_key` |
| 证书 | `{service}_cert` | `ssl_prod_cert` |

标识符必须匹配：`^[a-zA-Z_][0-9a-zA-Z_]{0,127}$`

## 示例

### 创建 GitHub PAT 密钥

```
/create-secret
Create a SecretText for a GitHub personal access token at the project level
using the Harness built-in secret manager
```

### 创建 SSH 凭据

```
/create-secret
Create an SSH key secret for deploying to production servers as the "deploy" user
```

### 创建引用 Vault 的密钥

```
/create-secret
Create a secret that references the database password stored in HashiCorp Vault
at secret/data/production/database#password
```

### 列出密钥

```
/create-secret
Show me all secrets in the payments project
```

### 创建 WinRM 凭据

```
/create-secret
Create WinRM NTLM credentials for the Windows deployment servers
```

## 错误处理

| 错误 | 原因 | 解决方法 |
|-------|-------|----------|
| 标识符重复 | 已存在相同 ID 的密钥 | 使用唯一标识符或更新现有 |
| 密钥管理器未找到 | 无效的 `secretManagerIdentifier` | 核实密钥管理器连接器存在 |
| 加密失败 | 密钥管理器连接问题 | 检查 delegate 到密钥管理器的连接 |
| 无效的密钥类型 | 不支持的类型字符串 | 使用 `SecretText`、`SecretFile`、`SSHKey` 或 `WinRmCredentials` |
| 无效的 valueType | 大小写不匹配 | 使用 `Inline` 或 `Reference`（区分大小写） |

## 性能注意事项

- 切勿在生成的 YAML 中包含实际密钥值。仅使用占位符引用。
- 创建前核实正确的范围（account、org、project）——范围错误的密钥将无法访问。
- 创建密钥之前，确认密钥管理器存在且可访问。

## 故障排查

### 密钥在流水线中无法访问

1. 检查范围——项目密钥无需前缀，组织密钥需要 `org.` 前缀，账户密钥需要 `account.` 前缀
2. 核实流水线所在项目有权访问该密钥的范围
3. 确认运行流水线的用户/service account 具有 `core_secret_view` 权限

### 外部密钥管理器错误

1. 核实密钥管理器连接器健康（对连接器执行 `harness_get`）
2. 对于 Vault：检查路径格式是否包含特定键的 `#key` 后缀
3. 对于 AWS SM：确保 IAM 权限允许 `secretsmanager:GetSecretValue`
4. Delegate 必须具有对此外部密钥管理器的网络访问

### SSH 密钥连接失败

1. 核实私钥为 PEM 格式
2. 检查目标服务器接受基于密钥的身份验证
3. 如果使用 KeyPath，确认密钥文件存在于 delegate 主机上
4. 先用 `credentialType: Password` 测试以隔离密钥特定的问题

## 安全最佳实践

- 对生产密钥使用外部密钥管理器（Vault、AWS SM）
- 尽可能缩小密钥范围——优先项目而非账户
- 切勿在流水线日志中输出密钥值
- 定期轮换密钥并更新引用
- 通过 `/audit-report` 技能审计密钥访问
