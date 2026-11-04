---
name: create-infrastructure
description: 为部署目标生成 Harness 基础设施定义 YAML 并通过 MCP 创建。当用户说 "create infrastructure"、"infrastructure definition"、"k8s cluster config"、"deployment target"，或想配置工作负载在哪里运行时使用。
metadata:
  author: Harness
  version: 2.0.0
  mcp-server: harness-mcp-v2
  summary: Define infrastructure (K8s, ECS, Serverless)
license: Apache-2.0
compatibility: Requires Harness MCP v2 server (harness-mcp-v2)
---

# 创建基础设施

生成 Harness 基础设施定义 YAML 并通过 MCP 推送。

## 说明

1. **确定基础设施类型**——KubernetesDirect、KubernetesGcp（GKE）、KubernetesAzure（AKS）、ECS 或 ServerlessAwsLambda
2. **确保前置条件存在**——环境及云/集群连接器必须先创建
3. **生成 YAML**，使用下面的模板，引用正确的连接器和环境
4. **通过 MCP 创建**，使用 `harness_create`，resource_type 为 `infrastructure`

## 基础设施类型

### KubernetesDirect
```yaml
infrastructureDefinition:
  name: K8s Production
  identifier: k8s_prod
  orgIdentifier: default
  projectIdentifier: my_project
  environmentRef: prod
  deploymentType: Kubernetes
  type: KubernetesDirect
  spec:
    connectorRef: k8s_connector
    namespace: my-app-prod
    releaseName: release-<+INFRA_KEY_SHORT_ID>
  allowSimultaneousDeployments: false
```

### KubernetesGcp (GKE)
```yaml
infrastructureDefinition:
  name: GKE Cluster
  identifier: gke_prod
  environmentRef: prod
  deploymentType: Kubernetes
  type: KubernetesGcp
  spec:
    connectorRef: gcp_connector
    cluster: my-gke-cluster
    namespace: my-app
    releaseName: release-<+INFRA_KEY_SHORT_ID>
```

### KubernetesAzure (AKS)
```yaml
infrastructureDefinition:
  name: AKS Cluster
  identifier: aks_prod
  environmentRef: prod
  deploymentType: Kubernetes
  type: KubernetesAzure
  spec:
    connectorRef: azure_connector
    subscriptionId: <subscription_id>
    resourceGroup: my-rg
    cluster: my-aks-cluster
    namespace: my-app
    releaseName: release-<+INFRA_KEY_SHORT_ID>
```

### ECS
```yaml
infrastructureDefinition:
  name: ECS Fargate
  identifier: ecs_prod
  environmentRef: prod
  deploymentType: ECS
  type: ECS
  spec:
    connectorRef: aws_connector
    region: us-east-1
    cluster: my-ecs-cluster
```

### ServerlessAwsLambda
```yaml
infrastructureDefinition:
  name: Lambda
  identifier: lambda_prod
  environmentRef: prod
  deploymentType: ServerlessAwsLambda
  type: ServerlessAwsLambda
  spec:
    connectorRef: aws_connector
    region: us-east-1
    stage: prod
```

### AzureWebApp
```yaml
infrastructureDefinition:
  name: Azure Web App
  identifier: azure_webapp_prod
  environmentRef: prod
  deploymentType: AzureWebApp
  type: AzureWebApp
  spec:
    connectorRef: azure_connector
    subscriptionId: <subscription_id>
    resourceGroup: my-rg
```

### Asg (Auto Scaling Group)
```yaml
infrastructureDefinition:
  name: ASG Production
  identifier: asg_prod
  environmentRef: prod
  deploymentType: Asg
  type: Asg
  spec:
    connectorRef: aws_connector
    region: us-east-1
```

### GoogleCloudFunctions
```yaml
infrastructureDefinition:
  name: Cloud Functions
  identifier: gcf_prod
  environmentRef: prod
  deploymentType: GoogleCloudFunctions
  type: GoogleCloudFunctions
  spec:
    connectorRef: gcp_connector
    region: us-central1
    project: my-gcp-project
```

### Pdc (Physical Data Center)
```yaml
infrastructureDefinition:
  name: On-Prem Servers
  identifier: pdc_prod
  environmentRef: prod
  deploymentType: Ssh
  type: Pdc
  spec:
    connectorRef: pdc_connector
    hosts:
      - host1.example.com
      - host2.example.com
```

## 通过 MCP 创建

```
Call MCP tool: harness_create
Parameters:
  resource_type: "infrastructure"
  org_id: "<organization>"
  project_id: "<project>"
  body: <infrastructure YAML>
```

## 示例

- “为 prod 创建 K8s 基础设施”——带 prod 命名空间的 KubernetesDirect
- “设置 GKE 基础设施”——带 GCP 连接器的 KubernetesGcp
- “创建 ECS Fargate 基础设施”——带 AWS 连接器的 ECS 类型
- “创建 Azure Web App 基础设施”——带订阅和资源组的 AzureWebApp 类型
- “设置本地基础设施”——带用于 SSH 部署主机列表的 Pdc 类型

## 性能注意事项

- 创建基础设施定义之前，核实被引用的连接器和环境存在。
- 确保命名空间和集群名称准确——拼写错误会导致部署失败。
- 在 releaseName 中使用 `<+INFRA_KEY_SHORT_ID>` 以保证跨部署的唯一性。

## 故障排查

- `CONNECTOR_NOT_FOUND`——先创建云/K8s 连接器
- `ENVIRONMENT_NOT_FOUND`——先创建环境
- `releaseName` 必须在每次部署中唯一；使用 `<+INFRA_KEY_SHORT_ID>`
- `deploymentType` 必须与服务定义的类型匹配（例如 Kubernetes 服务需要 KubernetesDirect infra）
- `allowSimultaneousDeployments: false` 是默认值；仅在并发部署安全时才设为 `true`
