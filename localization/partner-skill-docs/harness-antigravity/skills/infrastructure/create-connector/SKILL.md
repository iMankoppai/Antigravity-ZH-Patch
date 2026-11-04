---
name: create-connector
description: 为集成生成 Harness 连接器 YAML 并通过 MCP 创建/测试。当用户说 "create connector"、"git connector"、"aws connector"、"docker connector"、"cloud connector"，或想将 Harness 连接到外部服务时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Create connectors (GitHub, AWS, GCP, Azure, Docker, K8s)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建连接器

生成 Harness 连接器 YAML 并通过 MCP 创建/测试。

## 说明

1. **确定连接器类型**——确定要连接的服务（Git 提供方、云提供方、容器镜像仓库、Kubernetes 集群）
2. **生成 YAML**，使用下面的模板，填写凭据和端点详情
3. **通过 MCP 创建**，使用 `harness_create`，resource_type 为 `connector`
4. **测试连接**，使用 `harness_execute`，action 为 `test_connection` 以进行验证

## Git 连接器

### GitHub
```yaml
connector:
  name: GitHub
  identifier: github_connector
  type: Github
  spec:
    url: https://github.com/myorg
    type: Account                    # Account or Repo
    authentication:
      type: Http
      spec:
        type: UsernameToken
        spec:
          username: myuser
          tokenRef: github_pat       # Secret reference
    apiAccess:
      type: Token
      spec:
        tokenRef: github_pat
    executeOnDelegate: false
```

### GitLab
```yaml
connector:
  name: GitLab
  identifier: gitlab_connector
  type: Gitlab
  spec:
    url: https://gitlab.com/myorg
    type: Account
    authentication:
      type: Http
      spec:
        type: UsernameToken
        spec:
          username: myuser
          tokenRef: gitlab_token
```

### Bitbucket
```yaml
connector:
  name: Bitbucket
  identifier: bitbucket_connector
  type: Bitbucket
  spec:
    url: https://bitbucket.org/myorg
    type: Account
    authentication:
      type: Http
      spec:
        type: UsernameToken
        spec:
          username: myuser
          tokenRef: bitbucket_app_password
```

## 云连接器

### AWS
```yaml
connector:
  name: AWS
  identifier: aws_connector
  type: Aws
  spec:
    credential:
      type: ManualConfig          # ManualConfig, InheritFromDelegate, Irsa, OidcAuthentication
      spec:
        accessKeyRef: aws_access_key
        secretKeyRef: aws_secret_key
    delegateSelectors: []         # Optional: target specific delegates
    executeOnDelegate: false
```

### GCP
```yaml
connector:
  name: GCP
  identifier: gcp_connector
  type: Gcp
  spec:
    credential:
      type: ManualConfig          # ManualConfig, InheritFromDelegate, OidcAuthentication
      spec:
        secretKeyRef: gcp_service_account_key
    executeOnDelegate: false
```

### Azure
```yaml
connector:
  name: Azure
  identifier: azure_connector
  type: Azure
  spec:
    credential:
      type: ManualConfig
      spec:
        auth:
          type: Secret
          spec:
            secretRef: azure_client_secret
        applicationId: <app_id>
        tenantId: <tenant_id>
    azureEnvironmentType: AZURE     # AZURE, AZURE_US_GOVERNMENT
    executeOnDelegate: false
```

## 镜像仓库连接器

### Docker Hub
```yaml
connector:
  name: Docker Hub
  identifier: dockerhub
  type: DockerRegistry
  spec:
    dockerRegistryUrl: https://index.docker.io/v2/
    providerType: DockerHub
    auth:
      type: UsernamePassword
      spec:
        username: myuser
        passwordRef: dockerhub_password
```

### AWS ECR
```yaml
connector:
  name: ECR
  identifier: ecr_connector
  type: Aws
  spec:
    credential:
      type: ManualConfig
      spec:
        accessKeyRef: aws_access_key
        secretKeyRef: aws_secret_key
```

## Kubernetes 连接器

```yaml
connector:
  name: K8s Cluster
  identifier: k8s_connector
  type: K8sCluster
  spec:
    credential:
      type: ManualConfig          # ManualConfig, InheritFromDelegate
      spec:
        masterUrl: https://k8s-api.example.com
        auth:
          type: ServiceAccount
          spec:
            serviceAccountTokenRef: k8s_sa_token
            caCertRef: k8s_ca_cert
```

## Helm 仓库连接器

### HTTP Helm 仓库
```yaml
connector:
  name: Helm Repo
  identifier: helm_repo
  type: HttpHelmRepo
  spec:
    helmRepoUrl: https://charts.example.com
    auth:
      type: UsernamePassword      # UsernamePassword or Anonymous
      spec:
        username: myuser
        passwordRef: helm_password
    delegateSelectors: []
```

### OCI Helm 仓库
```yaml
connector:
  name: OCI Helm
  identifier: oci_helm
  type: OciHelmRepo
  spec:
    helmRepoUrl: oci://registry.example.com/charts
    auth:
      type: UsernamePassword
      spec:
        username: myuser
        passwordRef: oci_password
```

## 制品仓库连接器

### Nexus
```yaml
connector:
  name: Nexus
  identifier: nexus_connector
  type: Nexus
  spec:
    nexusServerUrl: https://nexus.example.com
    version: "3.x"               # "2.x" or "3.x"
    auth:
      type: UsernamePassword
      spec:
        username: admin
        passwordRef: nexus_password
```

### Artifactory
```yaml
connector:
  name: Artifactory
  identifier: artifactory_connector
  type: Artifactory
  spec:
    artifactoryServerUrl: https://artifactory.example.com
    auth:
      type: UsernamePassword
      spec:
        username: admin
        passwordRef: artifactory_password
```

## 工单连接器

### Jira
```yaml
connector:
  name: Jira
  identifier: jira_connector
  type: Jira
  spec:
    jiraUrl: https://mycompany.atlassian.net
    auth:
      type: UsernamePassword
      spec:
        username: user@company.com
        passwordRef: jira_api_token
```

### ServiceNow
```yaml
connector:
  name: ServiceNow
  identifier: servicenow_connector
  type: ServiceNow
  spec:
    serviceNowUrl: https://mycompany.service-now.com
    auth:
      type: UsernamePassword
      spec:
        username: admin
        usernameRef: snow_username
        passwordRef: snow_password
```

## 通过 MCP 创建和测试

创建连接器：
```
Call MCP tool: harness_create
Parameters:
  resource_type: "connector"
  org_id: "<organization>"
  project_id: "<project>"
  body: <connector YAML>
```

测试连接：
```
Call MCP tool: harness_execute
Parameters:
  resource_type: "connector"
  action: "test_connection"
  resource_id: "<connector_identifier>"
  org_id: "<organization>"
  project_id: "<project>"
```

浏览可用的连接器类型：
```
Call MCP tool: harness_list
Parameters:
  resource_type: "connector_catalogue"
```

## 示例

- “创建一个带 PAT 的 GitHub 连接器”——使用令牌认证的 Github 类型
- “设置 AWS 连接器”——使用访问密钥凭据的 Aws 类型
- “创建 Docker Hub 连接器”——DockerRegistry 类型
- “连接到我的 K8s 集群”——使用 service account 的 K8sCluster
- “创建 Helm 仓库连接器”——用于 chart 仓库的 HttpHelmRepo 类型
- “设置 Jira 连接器”——用于审批和工单集成的 Jira 类型
- “创建 Nexus 连接器”——用于制品仓库的 Nexus 类型

## 性能注意事项

- 创建后始终使用 `harness_execute`，action 为 `test_connection` 测试连接。
- 创建连接器之前，核实被引用的密钥存在。
- 对于云连接器，确认 IAM 权限与预期用途相符（只读与读写）。

## 故障排查

### 连接测试失败
- 核实凭据/令牌有效且未过期
- 检查网络连通性（delegate 可能需要访问权限）
- 确保云连接器具有正确的 IAM 权限

### 密钥引用
- 创建连接器之前密钥必须存在
- 对于账户级密钥使用格式：`account.secret_name`
- 对于项目级密钥仅使用 `secret_name`

### Delegate 选择器
- 使用 `delegateSelectors` 将连接器定位到特定的 delegate
- 当服务只能从特定网络位置访问时需要
- 精确匹配 delegate 标签（区分大小写）
