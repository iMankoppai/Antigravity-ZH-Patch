---
name: dt-obs-azure
description: Azure 云资源，包括 VM、VMSS、SQL Database、Storage、AKS、App Service、Functions、VNet 网络、负载均衡器、Event Hubs、Container Apps 和 Key Vault。监控 Azure 基础设施、分析资源使用、审计安全态势，并管理跨订阅和资源组的组织层级。
license: Apache-2.0
---

# Azure 云基础设施

使用 Dynatrace Smartscape 和 DQL 监控并分析 Azure 资源。查询 Azure 服务、审计安全、管理组织层级，并规划整个 Azure 基础设施的容量。

## 何时使用此技能

当用户需要在 Dynatrace 中处理 Azure 资源时使用此技能。根据任务类型加载参考文件：

| 任务 | 要加载的文件 |
|---|---|
| 清点和拓扑查询 | （无额外文件 —— 使用下面的核心模式） |
| 查询 Azure 指标时间序列（CPU、延迟、吞吐量） | 加载 `references/metrics-performance.md` |
| VNet 拓扑、子网、NSG、公共 IP、VPN、对等互连 | 加载 `references/vnet-networking-security.md` |
| Azure SQL、Cosmos DB、PostgreSQL、Redis 调查 | 加载 `references/database-monitoring.md` |
| Functions、App Service、AKS 基础设施、Container Apps | 加载 `references/serverless-containers.md` |
| Azure LB、Application Gateway、Front Door、API Management | 加载 `references/load-balancing-api.md` |
| WAF 规则分析、误报调查 | 加载 `references/load-balancing-api.md` |
| Event Hubs、Service Bus、Event Grid | 加载 `references/messaging-integration.md` |
| Storage Accounts、Blob、File、Queue、Table | 加载 `references/storage-monitoring.md` |
| 未附加资源、标签合规、生命周期 | 加载 `references/resource-management.md` |
| 成本节省、未使用资源、SKU 分析 | 加载 `references/cost-optimization.md` |
| 容量余量、VMSS 扩缩、配额 | 加载 `references/capacity-planning.md` |
| 安全审计、加密、公共访问、Key Vault | 加载 `references/security-compliance.md` |
| NSG 规则分析（0.0.0.0/0、开放端口） | 加载 `references/security-compliance.md` |
| 存储账户加密/公共访问审计 | 加载 `references/security-compliance.md` |
| 成本分配、成本分摊、归属 | 加载 `references/resource-ownership.md` |
| 确定编排上下文（AKS、VMSS、独立） | 加载 `references/workload-detection.md` |

---

## 核心概念

### 实体类型

Azure 资源使用 `AZURE_*` 前缀，可以用 `smartscapeNodes` 函数查询。所有 Azure 实体都会在 Dynatrace Smartscape 中自动发现和建模。实体类型名派生自 ARM 资源提供程序路径：`/Microsoft.Compute/virtualMachines` 变成 `AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES`。子资源用下划线追加：`/Microsoft.Sql/servers/databases` 变成 `AZURE_MICROSOFT_SQL_SERVERS_DATABASES`。

**计算：** `AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES`、`AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINESCALESETS`、`AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINESCALESETS_VIRTUALMACHINES`、`AZURE_MICROSOFT_COMPUTE_DISKS`、`AZURE_MICROSOFT_COMPUTE_SSHPUBLICKEYS`、`AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES_EXTENSIONS`
**网络：** `AZURE_MICROSOFT_NETWORK_VIRTUALNETWORKS`、`AZURE_MICROSOFT_NETWORK_VIRTUALNETWORKS_SUBNETS`、`AZURE_MICROSOFT_NETWORK_NETWORKSECURITYGROUPS`、`AZURE_MICROSOFT_NETWORK_PUBLICIPADDRESSES`、`AZURE_MICROSOFT_NETWORK_NETWORKINTERFACES`、`AZURE_MICROSOFT_NETWORK_LOADBALANCERS`、`AZURE_MICROSOFT_NETWORK_APPLICATIONGATEWAYS`、`AZURE_MICROSOFT_NETWORK_VIRTUALNETWORKGATEWAYS`、`AZURE_MICROSOFT_NETWORK_CONNECTIONS`、`AZURE_MICROSOFT_NETWORK_EXPRESSROUTECIRCUITS`
**数据库：** `AZURE_MICROSOFT_SQL_SERVERS`、`AZURE_MICROSOFT_SQL_SERVERS_DATABASES`、`AZURE_MICROSOFT_CACHE_REDIS`、`AZURE_MICROSOFT_CACHE_REDISENTERPRISE`、`AZURE_MICROSOFT_DOCUMENTDB_DATABASEACCOUNTS`
**存储：** `AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS`、`AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS_BLOBSERVICES_CONTAINERS`、`AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS_FILESERVICES_SHARES`、`AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS_QUEUESERVICES_QUEUES`、`AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS_TABLESERVICES_TABLES`
**Kubernetes/容器：** `AZURE_MICROSOFT_CONTAINERSERVICE_MANAGEDCLUSTERS`、`AZURE_MICROSOFT_CONTAINERSERVICE_MANAGEDCLUSTERS_AGENTPOOLS`、`AZURE_MICROSOFT_CONTAINERREGISTRY_REGISTRIES`、`AZURE_MICROSOFT_APP_CONTAINERAPPS`、`AZURE_MICROSOFT_APP_MANAGEDENVIRONMENTS`、`AZURE_MICROSOFT_APP_JOBS`
**App Service：** `AZURE_MICROSOFT_WEB_SITES`、`AZURE_MICROSOFT_WEB_SERVERFARMS`、`AZURE_MICROSOFT_WEB_SITES_FUNCTIONS`
**消息：** `AZURE_MICROSOFT_EVENTHUB_NAMESPACES`、`AZURE_MICROSOFT_EVENTHUB_NAMESPACES_EVENTHUBS`、`AZURE_MICROSOFT_SERVICEBUS_NAMESPACES`、`AZURE_MICROSOFT_SERVICEBUS_NAMESPACES_QUEUES`、`AZURE_MICROSOFT_SERVICEBUS_NAMESPACES_TOPICS`、`AZURE_MICROSOFT_SERVICEBUS_NAMESPACES_TOPICS_SUBSCRIPTIONS`
**安全/身份：** `AZURE_MICROSOFT_KEYVAULT_VAULTS`、`AZURE_MICROSOFT_MANAGEDIDENTITY_USERASSIGNEDIDENTITIES`
**监控：** `AZURE_MICROSOFT_OPERATIONALINSIGHTS_WORKSPACES`、`AZURE_MICROSOFT_INSIGHTS_COMPONENTS`
**API 管理：** `AZURE_MICROSOFT_APIMANAGEMENT_SERVICE`

### Azure 组织层级

Azure 将资源组织为三层级层次结构：**租户 > 订阅 > 资源组**。每个资源恰好属于一个订阅内的一个资源组。使用这些字段限定查询范围：

```dql-snippet
filter azure.subscription == "08b9810e-..."
```

```dql-snippet
filter azure.resource.group == "my-rg"
```

```dql-snippet
filter azure.location == "eastus"
```

组合这些过滤器以进行精确范围限定：

```dql-template
smartscapeNodes "AZURE_*"
| filter azure.subscription == "<SUBSCRIPTION_ID>"
    and azure.resource.group == "<RESOURCE_GROUP>"
    and azure.location == "<REGION>"
| summarize count = count(), by: {type}
| sort count desc
```

查看整个环境的组织细分：

```dql
smartscapeNodes "AZURE_*"
| summarize resource_count = count(), by: {azure.subscription, azure.resource.group}
| sort resource_count desc
```

### 常见 Azure 字段

所有 Azure 实体都包括：
- `azure.subscription` — Azure 订阅 GUID
- `azure.resource.group` — 资源组名称
- `azure.location` — Azure 区域（例如 `eastus`、`polandcentral`）
- `azure.resourceType` — ARM 资源类型（例如 `microsoft.compute/virtualmachines`）
- `azure.provisioning_state` — 预配状态（例如 `Succeeded`）
- `azure.object` — 完整的 ARM 资源 JSON（参见 [配置解析](#configuration-parsing-with-azureobject)）
- `cloud.provider` — 始终为 `azure`
- `tags` — 资源标签（使用 `` tags[`key`] ``）

某些实体类型还有：
- `azure.resourceId` — 完整 ARM 资源 ID（VM 及某些其他）
- `azure.resourceName` — 资源名称（VM 及某些其他）
- `azure.availabilityZones` — 可用区列表（VM）

### 关系类型

Azure 实体关系可以使用 `traverse` 遍历。Azure 实体的 `dt.traverse.relationship` 字段**不会**填充，因此在所有遍历命令中必须使用 `"*"` 作为关系名称。

关键遍历对：
- **VM → 磁盘：** `traverse "*", "AZURE_MICROSOFT_COMPUTE_DISKS"`
- **VM → NIC：** `traverse "*", "AZURE_MICROSOFT_NETWORK_NETWORKINTERFACES"`
- **VM → VMSS：** `traverse "*", "AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINESCALESETS"`
- **VM → 可用区：** `traverse "*", "AZURE_MICROSOFT_RESOURCES_LOCATIONS_AVAILABILITYZONES"`
- **VM ← 扩展：** `traverse "*", "AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES_EXTENSIONS", direction:backward`
- **VMSS → AKS 集群：** `traverse "*", "AZURE_MICROSOFT_CONTAINERSERVICE_MANAGEDCLUSTERS"`
- **VMSS → 子网：** `traverse "*", "AZURE_MICROSOFT_NETWORK_VIRTUALNETWORKS_SUBNETS"`
- **VMSS → NSG：** `traverse "*", "AZURE_MICROSOFT_NETWORK_NETWORKSECURITYGROUPS"`
- **VMSS → LB 后端池：** `traverse "*", "AZURE_MICROSOFT_NETWORK_LOADBALANCERS_BACKENDADDRESSPOOLS"`
- **子网 → VNet：** `traverse "*", "AZURE_MICROSOFT_NETWORK_VIRTUALNETWORKS"`
- **子网 → NSG：** `traverse "*", "AZURE_MICROSOFT_NETWORK_NETWORKSECURITYGROUPS"`
- **子网 ← VMSS：** `traverse "*", "AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINESCALESETS", direction:backward`
- **NSG ← NIC：** `traverse "*", "AZURE_MICROSOFT_NETWORK_NETWORKINTERFACES", direction:backward`
- **NSG ← 子网：** `traverse "*", "AZURE_MICROSOFT_NETWORK_VIRTUALNETWORKS_SUBNETS", direction:backward`
- **LB → 后端池：** `traverse "*", "AZURE_MICROSOFT_NETWORK_LOADBALANCERS_BACKENDADDRESSPOOLS"`
- **LB → 前端 IP：** `traverse "*", "AZURE_MICROSOFT_NETWORK_LOADBALANCERS_FRONTENDIPCONFIGURATIONS"`
- **LB → LB 规则：** `traverse "*", "AZURE_MICROSOFT_NETWORK_LOADBALANCERS_LOADBALANCINGRULES"`
- **SQL Server ← SQL 数据库：** `traverse "*", "AZURE_MICROSOFT_SQL_SERVERS_DATABASES", direction:backward`
- **存储账户 ← Blob 容器：** `traverse "*", "AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS_BLOBSERVICES_CONTAINERS", direction:backward`
- **存储账户 ← 文件共享：** `traverse "*", "AZURE_MICROSOFT_STORAGE_STORAGEACCOUNTS_FILESERVICES_SHARES", direction:backward`
- **AKS ← VMSS：** `traverse "*", "AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINESCALESETS", direction:backward`
- **AKS ← 代理池：** `traverse "*", "AZURE_MICROSOFT_CONTAINERSERVICE_MANAGEDCLUSTERS_AGENTPOOLS", direction:backward`
- **AKS ← NSG：** `traverse "*", "AZURE_MICROSOFT_NETWORK_NETWORKSECURITYGROUPS", direction:backward`
- **AKS ← 公共 IP：** `traverse "*", "AZURE_MICROSOFT_NETWORK_PUBLICIPADDRESSES", direction:backward`
- **AKS → 公共 IP：** `traverse "*", "AZURE_MICROSOFT_NETWORK_PUBLICIPADDRESSES"`
- **Web Site → App Service 计划：** `traverse "*", "AZURE_MICROSOFT_WEB_SERVERFARMS"`
- **Web Site ← Functions：** `traverse "*", "AZURE_MICROSOFT_WEB_SITES_FUNCTIONS", direction:backward`
- **Container App → 托管环境：** `traverse "*", "AZURE_MICROSOFT_APP_MANAGEDENVIRONMENTS"`
- **EventHub 命名空间 ← Event Hubs：** `traverse "*", "AZURE_MICROSOFT_EVENTHUB_NAMESPACES_EVENTHUBS", direction:backward`
- **ServiceBus 命名空间 ← 队列：** `traverse "*", "AZURE_MICROSOFT_SERVICEBUS_NAMESPACES_QUEUES", direction:backward`
- **ServiceBus 命名空间 ← 主题：** `traverse "*", "AZURE_MICROSOFT_SERVICEBUS_NAMESPACES_TOPICS", direction:backward`
- **ServiceBus 主题 ← 订阅：** `traverse "*", "AZURE_MICROSOFT_SERVICEBUS_NAMESPACES_TOPICS_SUBSCRIPTIONS", direction:backward`
- 使用 `fieldsKeep:{field1, field2}` 在多跳遍历中携带字段
- **单跳**遍历后，使用 `dt.traverse.history[0][id]` 获取源实体 ID，然后用 `lookup` 解析源实体名称：
  ```dql-snippet
  | fieldsAdd sourceId = dt.traverse.history[0][id]
  | lookup [smartscapeNodes "SOURCE_TYPE" | fields name, id], sourceField: sourceId, lookupField: id, prefix: "src."
  ```
- **多跳**遍历后，`dt.traverse.history[-N]` 适用于通过 `fieldsKeep` 携带的字段

### Azure 指标命名约定

Dynatrace 摄取 Azure Monitor 指标并使用以下命名模式暴露它们：

```
cloud.azure.<provider_namespace>.<resource_type>.<MetricName>
```

`<provider_namespace>` 在命名空间内使用下划线（例如 `microsoft_compute`），`<resource_type>` 为小写（例如 `virtualmachines`）。层级用点分隔：`microsoft_sql.servers.databases`。`<MetricName>` 是 Azure Monitor 指标名称。

**示例：**

| Azure Monitor 指标 | Dynatrace 指标键 |
|---|---|
| VM `Percentage CPU` | `cloud.azure.microsoft_compute.virtualmachines.PercentageCPU` |
| SQL DB `cpu_percent` | `cloud.azure.microsoft_sql.servers.databases.cpu_percent` |
| 存储 `Ingress` | `cloud.azure.microsoft_storage.storageaccounts.Ingress` |
| Event Hub `IncomingMessages` | `cloud.azure.microsoft_eventhub.namespaces.IncomingMessages` |
| Service Bus `IncomingMessages` | `cloud.azure.microsoft_servicebus.namespaces.IncomingMessages` |
| App Service `HttpResponseTime` | `cloud.azure.microsoft_web.sites.HttpResponseTime` |
| 负载均衡器 `ByteCount` | `cloud.azure.microsoft_network.loadbalancers.ByteCount` |
| AKS `node_cpu_usage_percentage` | `cloud.azure.microsoft_containerservice.managedclusters.node_cpu_usage_percentage` |
| Cosmos DB `TotalRequestUnits` | `cloud.azure.microsoft_documentdb.databaseaccounts.TotalRequestUnits` |
| Redis `serverLoad` | `cloud.azure.microsoft_cache.redis.serverLoad` |
| App Gateway `TotalRequests` | `cloud.azure.microsoft_network.applicationgateways.TotalRequests` |

查询指标：

```dql-template
timeseries cpu = avg(cloud.azure.microsoft_compute.virtualmachines.PercentageCPU),
           by: {dt.smartscape_source.id},
  from: now()-1h
| limit 10
```

**重要：** 在输出中绝不要将这些称为"Azure Monitor 告警"或"Azure Monitor 指标"。Dynatrace 通过其 Azure 集成原生监控 Azure 资源 —— 这些是从 Azure 摄取的 **Dynatrace 指标**。

### 使用 azure.object 进行配置解析

`azure.object` 字段包含完整的 ARM 资源 JSON。使用 `azjson` 别名解析它：

```dql-snippet
parse azure.object, "JSON:azjson"
```

JSON 包裹在 `configuration` 键中：

```json
{
  "configuration": {
    "id": "<ARM resource ID>",
    "name": "<resource name>",
    "type": "<ARM resource type>",
    "location": "<region>",
    "sku": { ... },
    "properties": { ... },
    "zones": [...]
  },
  "tags": { ... }
}
```

访问模式：
- 属性：`azjson[configuration][properties][field]`
- SKU：`azjson[configuration][sku][name]`
- 类型：`azjson[configuration][kind]`
- 区域：`azjson[configuration][zones]`

按服务的常见配置字段：
- **VM：** `properties.hardwareProfile.vmSize`、`properties.storageProfile.imageReference.offer`、`properties.storageProfile.osDisk.osType`、`properties.extended.instanceView.powerState.displayStatus`
- **VMSS：** `sku.name`（VM 大小）、`sku.capacity`（实例数）、`tags.aks-managed-poolName`
- **NSG：** `properties.securityRules[]`（自定义规则数组）、`properties.securityRules[].properties.direction`、`properties.securityRules[].properties.access`、`properties.securityRules[].properties.sourceAddressPrefix`
- **存储账户：** `kind`（例如 StorageV2）、`sku.name`、`properties.accessTier`、`properties.supportsHttpsTrafficOnly`、`properties.allowBlobPublicAccess`、`properties.encryption.keySource`
- **SQL Server：** `properties.fullyQualifiedDomainName`、`properties.publicNetworkAccess`、`properties.minimalTlsVersion`
- **SQL Database：** `sku.name`（层级）、`sku.capacity`（DTU/vCore）、`properties.status`、`properties.zoneRedundant`
- **AKS：** `properties.kubernetesVersion`、`properties.powerState.code`、`properties.networkProfile.networkPlugin`、`properties.enableRBAC`
- **Web Site：** `kind`（例如 `functionapp,linux`）、`properties.state`、`properties.defaultHostName`、`properties.siteConfig.linuxFxVersion`
- **Container App：** `properties.runningStatus`、`properties.template.containers[].image`、`properties.template.scale.minReplicas`、`properties.template.scale.maxReplicas`
- **Event Hub 命名空间：** `sku.name`、`properties.kafkaEnabled`、`properties.zoneRedundant`
- **Service Bus 命名空间：** `sku.name`（Basic/Standard/Premium）、`properties.zoneRedundant`、`properties.minimumTlsVersion`、`properties.publicNetworkAccess`、`properties.disableLocalAuth`、`properties.status`
- **Service Bus 队列：** `properties.maxSizeInMegabytes`、`properties.enablePartitioning`、`properties.deadLetteringOnMessageExpiration`、`properties.maxDeliveryCount`、`properties.lockDuration`、`properties.requiresDuplicateDetection`、`properties.status`
- **Key Vault：** `properties.enableRbacAuthorization`、`properties.enableSoftDelete`、`properties.publicNetworkAccess`
- **Redis：** `properties.sku.name`、`properties.hostName`、`properties.redisVersion`、`properties.enableNonSslPort`
- **Cosmos DB：** `kind`（例如 GlobalDocumentDB）、`properties.EnabledApiTypes`、`properties.consistencyPolicy.defaultConsistencyLevel`
- **负载均衡器：** `sku.name`、`tags.aks-managed-cluster-name`
- **App Gateway：** `properties.sku.name`、`properties.sku.tier`、`properties.operationalState`、`properties.webApplicationFirewallConfiguration.enabled`、`properties.webApplicationFirewallConfiguration.firewallMode`（Detection/Prevention）、`properties.webApplicationFirewallConfiguration.ruleSetType`、`properties.webApplicationFirewallConfiguration.ruleSetVersion`、`properties.webApplicationFirewallConfiguration.disabledRuleGroups[]`、`properties.webApplicationFirewallConfiguration.exclusions[]`、`properties.firewallPolicy.id`

---

## 查询模式

所有 Azure 查询都建立在四个核心模式之上。掌握它们并适配到任何实体类型。

### 模式 1：资源发现

按类型列出资源，按订阅/资源组/区域/标签过滤，汇总计数：

```dql-template
smartscapeNodes "AZURE_*"
| filter azure.subscription == "<SUBSCRIPTION_ID>" and azure.location == "<REGION>"
| summarize count = count(), by: {type}
| sort count desc
```

要列出特定类型，将 `"AZURE_*"` 替换为实体类型（例如 `"AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES"`）。添加 `| fields name, azure.subscription, azure.resource.group, azure.location, ...` 以选择特定列。使用 `` tags[`TagName`] `` 进行基于标签的过滤。

### 模式 2：配置解析

解析 `azure.object` JSON 以获取详细配置字段：

```dql-template
smartscapeNodes "AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINES"
| parse azure.object, "JSON:azjson"
| fieldsAdd vmSize = azjson[configuration][properties][hardwareProfile][vmSize],
            osType = azjson[configuration][properties][storageProfile][osDisk][osType]
| summarize vm_count = count(), by: {vmSize, osType, azure.location}
```

### 模式 3：关系遍历

沿资源之间的关系遍历。使用 `"*"` 作为关系名称，因为 Azure 不会填充 `dt.traverse.relationship`：

```dql-template
smartscapeNodes "AZURE_MICROSOFT_NETWORK_LOADBALANCERS"
| parse azure.object, "JSON:azjson"
| fieldsAdd lbSku = azjson[configuration][sku][name]
| traverse "*", "AZURE_MICROSOFT_NETWORK_LOADBALANCERS_BACKENDADDRESSPOOLS", fieldsKeep:{lbSku, name, id}
| fieldsAdd backendPoolName = name
| traverse "*", "AZURE_MICROSOFT_COMPUTE_VIRTUALMACHINESCALESETS", direction:backward, fieldsKeep:{backendPoolName, id}
| fieldsAdd loadBalancerName = dt.traverse.history[-2][name],
            loadBalancerId = dt.traverse.history[-2][id],
            backendPoolId = dt.traverse.history[-1][id]
```

与 AWS 遍历的关键区别：
- 始终使用 `"*"` 作为关系名称（Azure 的关系类型名称为空）
- Azure 关系主要遵循父子层次结构：子资源向后链接到父资源
- AKS 是主要的关系枢纽，有来自 VMSS、NSG、LB、公共 IP、代理池和托管标识的后向链接

### 模式 4：基于标签的归属

按任意标签对资源分组，用于归属/成本分摊：

```dql-template
smartscapeNodes "AZURE_*"
| filter isNotNull(tags[`<TAG_NAME>`])
| summarize resource_count = count(), by: {tags[`<TAG_NAME>`], type}
| sort resource_count desc
```

常见 Azure 标签：`` tags[`ACE:CREATED-BY`] ``、`` tags[`dt_owner_email`] ``、`` tags[`dt_owner_team`] ``、`` tags[`project`] ``、`` tags[`managed-by`] ``。将 `"AZURE_*"` 替换为特定类型以限定到一个服务。

查找未标记的资源：`| filter arraySize(tags) == 0`

---

## 参考指南

当上面的核心模式需要服务特定的适配时，加载参考文件以获取详细查询。

| 参考 | 何时加载 | 关键内容 |
|---|---|---|
| [vnet-networking-security.md](references/vnet-networking-security.md) | VNet 拓扑、子网、NSG、公共 IP、VPN、对等互连 | VNet/子网映射、NSG 爆炸半径、公共 IP 检测 |
| [database-monitoring.md](references/database-monitoring.md) | Azure SQL、Cosmos DB、Redis Cache | 服务层级分布、区域冗余、公共访问检查 |
| [serverless-containers.md](references/serverless-containers.md) | Functions、App Service、AKS 基础设施、Container Apps | 运行时分布、App Service 计划映射、AKS 节点池 |
| [load-balancing-api.md](references/load-balancing-api.md) | 负载均衡器、Application Gateways、API Management | LB 后端池遍历、App Gateway 路由、APIM 配置 |
| [messaging-integration.md](references/messaging-integration.md) | Event Hubs、Service Bus、Event Grid | 命名空间清点、Kafka 启用、吞吐量单位分析 |
| [storage-monitoring.md](references/storage-monitoring.md) | Storage Accounts、Blob、File、Queue、Table | SKU 分布、访问层、加密审计、公共访问 |
| [resource-management.md](references/resource-management.md) | 资源审计、标签合规、生命周期 | 未附加磁盘、标签覆盖、预配状态分析 |
| [cost-optimization.md](references/cost-optimization.md) | 成本节省、未使用资源、规模调整 | VM SKU 分析、未附加磁盘、已取消分配的 VM |
| [capacity-planning.md](references/capacity-planning.md) | 容量分析、扩缩、利用率 | VMSS 余量、子网 IP 计数、AKS 节点池规模 |
| [security-compliance.md](references/security-compliance.md) | 安全审计、加密、公共访问、Key Vault | NSG 规则分析、TLS 版本审计、公共端点检测、加密检查 |
| [resource-ownership.md](references/resource-ownership.md) | 成本分摊、归属、成本分配 | 基于标签的分组、订阅/资源组摘要 |
| [workload-detection.md](references/workload-detection.md) | 确定编排上下文和解决路径 | AKS 节点、VMSS 成员、独立 VM 检测以进行爆炸半径分析 |
| [metrics-performance.md](references/metrics-performance.md) | 查询特定资源的指标时间序列 | 用于 VM、SQL、Storage、Event Hub、LB、App Service、AKS、Cosmos DB、Redis、App Gateway 的 DQL 时间序列模式 |

---

## 最佳实践

### 查询优化
1. 尽早按订阅、资源组和区域过滤
2. 使用具体的实体类型（尽可能避免 `"AZURE_*"` 通配符）
3. 探索时用 `| limit N` 限制结果
4. 在访问嵌套字段之前使用 `isNotNull()` 检查

### 配置解析
1. 始终使用 JSON 解析器解析 `azure.object`：`parse azure.object, "JSON:azjson"`
2. 使用一致的字段命名：`fieldsAdd configField = azjson[configuration][properties][field]`
3. 通过 `azjson[configuration][sku][name]` 访问 SKU（不在 `properties` 内）
4. 解析后检查空值 —— 并非所有实体类型都有相同的属性结构
5. 对复杂嵌套对象使用 `toString()`

### 组织层级
1. 在多订阅环境中始终按 `azure.subscription` 限定查询
2. 使用 `azure.resource.group` 收窄到团队或应用边界
3. 结合 `azure.location` 进行区域特定分析
4. 使用 `summarize ... by: {azure.subscription, azure.resource.group}` 进行组织细分

### 标记策略
1. 使用 `` tags[`key`] `` 进行过滤（反引号引用键名）
2. 对未标记资源检查 `arraySize(tags)`
3. 用 summarize 操作追踪标签覆盖率
4. 常见归属标签：`dt_owner_email`、`dt_owner_team`、`ACE:CREATED-BY`

---

## 限制与说明

### Smartscape 限制
- Azure object 配置需要用 `parse azure.object, "JSON:azjson"` 解析
- Azure 指标以 Dynatrace 指标形式提供，使用 `cloud.azure.*` 命名约定（参见 [Azure 指标命名约定](#azure-metric-naming-convention)）
- 资源发现取决于 Dynatrace 中的 Azure 集成配置
- 标签同步可能有轻微延迟

### 关系遍历
- **Azure 关系类型名称为空** —— 在 `traverse` 命令中始终使用 `"*"` 作为关系名称
- 对反向关系（例如子资源到父资源）使用 `direction:backward`
- 使用 `fieldsKeep` 在遍历中保留重要字段
- 单跳时使用 `dt.traverse.history[0][id]` 访问遍历历史以获取源实体 ID；使用 `lookup` 解析源实体名称
- 多跳遍历时，`dt.traverse.history[-N]` 访问通过 `fieldsKeep` 携带的字段
- Azure 关系主要遵循父子层次模式
- AKS 是主要的关系枢纽 —— 预计许多后向关系汇聚到 AKS 集群实体

### AKS 覆盖
- 此技能仅涵盖 AKS **基础设施层**实体（集群、代理池、VMSS、网络）
- 对于 Kubernetes **工作负载层**可观测性（Pod、部署、服务、命名空间），请遵循 `dt-obs-kubernetes` 技能

### 通用提示
- 使用 `getNodeName()` 获取人类可读的资源名称
- 使用 `isNotNull()` 和 `isNull()` 优雅处理空值
- 对于大型环境，结合订阅、资源组和区域过滤器
- 使用 `countDistinct()` 统计唯一资源数
- `azure.resourceType` 字段是小写 ARM 格式（例如 `microsoft.compute/virtualmachines`）—— 可用于过滤，但不用于实体类型匹配
