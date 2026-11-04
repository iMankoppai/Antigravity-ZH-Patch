---
name: dt-obs-hosts
description: >-
  主机和进程指标，包括 CPU、内存、磁盘、网络、容器和进程级
  遥测。用于分析基础设施健康、资源利用率、进程消耗
  或主机发现。也用于构建可供分析工作流（如异常检测、预测或季节性分析）
  使用的主机指标时间序列查询。
  触发词："show hosts"、"CPU usage"、"memory utilization"、"disk space"、"high CPU"、
  "top hosts by CPU"、"top processes by memory"、
  "Linux hosts in AWS"、"what databases are running"、"infrastructure costs by cost center"、
  "hosts running EOL Java"、"container monitoring"、"listening ports"、
  "process resource consumption"、"CPU forecast"、"memory anomaly"、"host seasonality"、
  "OneAgent mode"、"OneAgent version"、"GCP hosts"。
  不用于解释现有查询、产品文档问题、
  Kubernetes Pod/工作负载查询（请使用 dt-obs-kubernetes）、AWS 云资源清点
  （请使用 dt-obs-aws），或服务级指标（请使用 dt-obs-services）。
license: Apache-2.0
---

# 基础设施主机技能

监控并管理主机和进程基础设施，包括 CPU、内存、磁盘、网络和技术清点。

## 何时使用此技能

当用户需要执行以下操作时使用此技能：

- **清点：**"显示我 AWS us-east-1 中的所有 Linux 主机"
- **代理清点：**"哪些主机运行 FULL_STACK、INFRASTRUCTURE 或 DISCOVERY 模式？"/"显示 OneAgent 版本分布"
- **监控：**"哪些主机 CPU 使用率高？"
- **故障排查：**"哪些进程消耗最多内存？"
- **发现：**"生产环境中运行着哪些数据库？"
- **规划：**"追踪 Kubernetes 版本分布以进行升级规划"
- **成本：**"按成本中心计算基础设施成本"
- **安全：**"查找所有监听 22 端口的进程"
- **合规：**"识别运行 EOL Java 版本的主机"
- **质量：**"检查 AWS 主机的数据完整性"
- **优化：**"根据利用率查找合理调整规模的候选对象"

---
> **需要跨源连接：** 如果查询必须将主机数据与日志或其他
> 遥测来源结合（例如"显示 Linux 主机的日志及其 IP 地址"）→ 在编写查询之前还要阅读
> `dt-dql-essentials/references/smartscape-topology-navigation.md`。
---

## 核心概念

### 实体
- **HOST** - 物理或虚拟机（云或本地）
- **PROCESS** - 运行中的进程和进程组
- **CONTAINER** - Kubernetes 容器
- **NETWORK_INTERFACE** - 主机网络接口
- **DISK** - 主机磁盘卷

### 指标类别
1. **主机指标** - `dt.host.cpu.*`、`dt.host.memory.*`、`dt.host.disk.*`、`dt.host.net.*`
2. **进程指标** - `dt.process.cpu.*`、`dt.process.memory.*`、`dt.process.io.*`、`dt.process.network.*`
3. **清点** - OS 类型、云提供商、技术栈、版本
4. **成本** - `dt.cost.costcenter`、`dt.cost.product`
5. **质量** - 元数据完整性、版本合规性

### 告警阈值
- **CPU/内存/磁盘：** 80% 警告，90% 严重
- **网络：** >70% 高，>85% 饱和
- **磁盘延迟：** >20ms 瓶颈
- **网络错误：** 丢包率 >1%，错误率 >0.1%
- **Swap：** >30% 警告，>50% 严重

---

## 关键工作流

### 1. 主机发现与分类

发现主机、按 OS/云分类、清点资源。

```dql
smartscapeNodes "HOST"
| fieldsAdd os.type, cloud.provider, host.logical.cpu.cores, host.physical.memory
| summarize host_count = count(), by: {os.type, cloud.provider}
| sort host_count desc
```

**OS 类型：** `LINUX`、`WINDOWS`、`AIX`、`SOLARIS`、`ZOS`

→ 云特定属性，参见 [references/inventory-discovery.md](#cloud-specific-attributes)

### 2. 资源利用率监控

监控主机间的 CPU、内存、磁盘、网络。

```dql
timeseries {
  cpu = avg(dt.host.cpu.usage),
  memory = avg(dt.host.memory.usage),
  disk = avg(dt.host.disk.used.percent)
}, by: {dt.smartscape.host}
| fieldsAdd host_name = getNodeName(dt.smartscape.host)
| filter arrayAvg(cpu) > 80 or arrayAvg(memory) > 80
| sort arrayAvg(cpu) desc
```

**高利用率阈值：** 80% 警告，90% 严重

**关键 CPU 指标：**
- `dt.host.cpu.usage` — 总 CPU 利用率（0-100%）
- `dt.host.cpu.idle` — CPU 空闲时间（使用率的倒数；对异常检测有用）
- `dt.host.cpu.user` — 用户模式下的 CPU 时间
- `dt.host.cpu.system` — 内核模式下的 CPU 时间
- `dt.host.cpu.iowait` — 等待 I/O 的 CPU（仅 Linux）

→ 详细 CPU 分析，参见 [references/host-metrics.md](references/host-metrics.md#cpu-monitoring)  
→ 内存细分，参见 [references/host-metrics.md](references/host-metrics.md#memory-monitoring)

#### 磁盘可用空间 —— 查找可用磁盘最多/最少的主机

```dql
timeseries disk_used_pct = avg(dt.host.disk.used.percent), by: {dt.smartscape.host}
| fieldsAdd host_name = getNodeName(dt.smartscape.host)
| fieldsAdd avg_disk_used = arrayAvg(disk_used_pct),
    free_pct = 100 - arrayAvg(disk_used_pct)
| sort free_pct desc
| limit 10
```

### 3. 进程资源分析

在进程级别识别资源消耗最大的对象。

```dql
timeseries {
  cpu = avg(dt.process.cpu.usage),
  memory = avg(dt.process.memory.usage)
}, by: {dt.smartscape.process}
| fieldsAdd process_name = getNodeName(dt.smartscape.process)
| filter arrayAvg(cpu) > 50
| sort arrayAvg(cpu) desc
| limit 20
```

→ 进程 I/O 分析，参见 [references/process-monitoring.md](references/process-monitoring.md#process-io)  
→ 进程网络指标，参见 [references/process-monitoring.md](references/process-monitoring.md#process-network)

### 4. 技术栈清点

发现并追踪软件技术及其版本。

```dql
smartscapeNodes "PROCESS"
| fieldsAdd process.software_technologies
| expand tech = process.software_technologies
| fieldsAdd tech_type = tech[type], tech_version = tech[version]
| summarize process_count = count(), by: {tech_type, tech_version}
| sort process_count desc
```

**常见技术：** Java、Node.js、Python、.NET、数据库、Web 服务器、消息系统

→ 版本合规性检查，参见 [references/inventory-discovery.md](references/inventory-discovery.md#technology-inventory)

### 5. 通过端口进行服务发现

将监听端口映射到服务，用于安全和清点。

```dql
smartscapeNodes "PROCESS"
| fieldsAdd process.listen_ports, dt.process_group.detected_name
| filter isNotNull(process.listen_ports) and arraySize(process.listen_ports) > 0
| expand listen_port = process.listen_ports
| summarize process_count = count(), by: {listen_port, dt.process_group.detected_name}
| sort toLong(listen_port) asc
| limit 50
```

**知名端口：** 80（HTTP）、443（HTTPS）、22（SSH）、3306（MySQL）、5432（PostgreSQL）

→ 全面的端口映射，参见 [references/inventory-discovery.md](references/inventory-discovery.md#port-discovery)

### 6. 容器和 Kubernetes 监控

追踪容器分布和 K8s 工作负载类型。

```dql
smartscapeNodes "CONTAINER"
| fieldsAdd k8s.cluster.name, k8s.namespace.name, k8s.workload.kind
| summarize container_count = count(), by: {k8s.cluster.name, k8s.workload.kind}
| sort k8s.cluster.name, container_count desc
```

**工作负载类型：** `deployment`、`daemonset`、`statefulset`、`job`、`cronjob`

**注意：** 容器镜像名称/版本在 smartscape 中不可用。

→ K8s 版本追踪，参见 [references/container-monitoring.md](references/container-monitoring.md#kubernetes-versions)  
→ 容器生命周期，参见 [references/container-monitoring.md](references/container-monitoring.md#container-inventory)

### 7. 成本归因与成本分摊

按成本中心计算基础设施成本。

```dql
smartscapeNodes "HOST"
| fieldsAdd dt.cost.costcenter, host.logical.cpu.cores, host.physical.memory
| filter isNotNull(dt.cost.costcenter)
| fieldsAdd memory_gb = toDouble(host.physical.memory) / 1024 / 1024 / 1024
| summarize 
    host_count = count(),
    total_cores = sum(toLong(host.logical.cpu.cores)),
    total_memory_gb = sum(memory_gb),
    by: {dt.cost.costcenter}
| sort total_cores desc
```

→ 产品级成本追踪，参见 [references/inventory-discovery.md](references/inventory-discovery.md#cost-attribution)

### 8. 基础设施健康关联

关联主机和进程指标以进行跨层分析。

```dql
timeseries {
  host_cpu = avg(dt.host.cpu.usage),
  host_memory = avg(dt.host.memory.usage),
  process_cpu = avg(dt.process.cpu.usage)
}, by: {dt.smartscape.host, dt.smartscape.process}
| fieldsAdd
    host_name = getNodeName(dt.smartscape.host),
    process_name = getNodeName(dt.smartscape.process)
| filter arrayAvg(host_cpu) > 70
| sort arrayAvg(host_cpu) desc
```

**健康评分：** 任何资源 >90% 为严重，>80% 为警告

→ 多资源饱和检测，参见 [references/host-metrics.md](references/host-metrics.md#resource-saturation)

### 9. OneAgent 清点

按 OneAgent 监控模式、版本或云区域统计并列出主机。

**ONEAGENT 实体：** OneAgent 是一个单独的 smartscape 实体类型（`smartscapeNodes "ONEAGENT"`）。通过从 HOST 沿 `monitors` 边向后遍历访问它（该边是 ONEAGENT → HOST，因此 HOST→ONEAGENT 是 `direction: backward`）。

**关键 ONEAGENT 字段：**
- `dt.agent.monitoring_mode` — 监控覆盖级别：`FULL_STACK` / `INFRASTRUCTURE` / `DISCOVERY`
- `dt.agent.module.version` — 已安装版本字符串，例如 `1.347.0.20260809-172428`

**按监控模式计数：**

```dql
smartscapeNodes "HOST"
| traverse edgeTypes: {monitors}, targetTypes: {ONEAGENT}, direction: backward
| fieldsAdd oa_mode = `dt.agent.monitoring_mode`
| summarize host_count = count(), by: {oa_mode}
| sort host_count desc
```

**按代理版本计数：**

```dql
smartscapeNodes "HOST"
| traverse edgeTypes: {monitors}, targetTypes: {ONEAGENT}, direction: backward
| fieldsAdd oa_version = `dt.agent.module.version`
| summarize host_count = count(), by: {oa_version}
| sort host_count desc
```

**组合：模式 + 版本**（用于升级规划）：

```dql
smartscapeNodes "HOST"
| traverse edgeTypes: {monitors}, targetTypes: {ONEAGENT}, direction: backward
| fieldsAdd oa_mode = `dt.agent.monitoring_mode`, oa_version = `dt.agent.module.version`
| summarize host_count = count(), by: {oa_mode, oa_version}
| sort host_count desc
```

**监控模式：** `FULL_STACK`（完整代码级监控 + 基础设施）、`INFRASTRUCTURE`（仅基础设施指标，无代码级监控）、`DISCOVERY`（拓扑发现和基本主机监控）

→ 按模式/版本列出主机，参见 [references/inventory-discovery.md](references/inventory-discovery.md#oneagent-inventory)

---

## 响应构建

当用户请求数据检索或 DQL 查询（例如"显示我按 CPU 排序的顶级主机"）时，
**在响应中包含 DQL 查询**，与结果并列。用户想要
查看并复用查询 —— 它是交付物，而不仅仅是获取结果的手段。

当用户请求分析（异常检测、预测、季节性）时，
分析结果是交付物。专注于清晰地呈现发现：
- **优先呈现指标级发现**，而非数据收集的产物。如果某个分析
  工具在报告实际异常的同时报告数据缺口，先呈现用户所询问的指标行为，
  仅将缺口作为补充上下文提及。
- **包含主机名称**（不仅是 ID），使用 `getNodeName(dt.smartscape.host)` 或
  `get-entity-name` 工具。
- **说明所分析的时间范围**以及使用的工具/参数。

---

## 分析工作流

主机指标查询通常作为分析工具（异常检测、
预测、季节性分析）的输入。此技能帮助构建正确的 DQL 查询；
实际分析由专用工具执行。

### 异常检测和模式分析

当用户询问主机指标中的"异常行为"、"异常"、"尖峰"或"突然变化"时，
工作流是：

1. **使用此技能的模式构建时间序列查询**
2. **将其传给适当的分析工具**（异常检测器、新颖性检测）

**在检测器之间选择：**
- **`adaptive-anomaly-detector`** —— 当用户询问*幅度*时使用："尖峰"、
  "突然变化"、"超出正常范围的值"、"突然跳变"。它回答"这个
  指标是否越过了意外的阈值？"并报告告警持续时间和峰值。
- **`timeseries-novelty-detection`** —— 当用户询问*行为变化*时使用：
  "异常模式"、"某些东西变了"、"趋势"、"新行为"。它回答"信号的
  形态是否改变了？"，而不暗示越过了特定阈值。

**异常结果的响应格式：** 同时包含主机**名称**（通过
`getNodeName(dt.smartscape.host)` 或 `get-entity-name` 解析）和主机**实体 ID**，以及时间戳和值。
仅实体 ID 对用户是不透明的；仅名称会妨碍后续查询。

**新颖性类型选择规则：** 使用新颖性检测时，默认将
`analysisNoveltyType` 仅设置为 `[SPIKE, CHANGE_IN_VALUES, TREND_IN_VALUES]`。
**排除** `GAP_WITH_MISSING_VALUES` 和 `CHANGE_IN_MISSING_VALUES`，除非用户
明确询问数据缺口或监控覆盖。数据缺口是基础设施
问题，而不是指标行为异常 —— 在用户询问 CPU
或内存模式时报告它们是不正确的。

分析工具查询应使用简单的 `timeseries` 格式，含单个
聚合指标和适当的时间范围：

```dql
timeseries avg(dt.host.cpu.idle), by: {dt.smartscape.host}
```

```dql
timeseries avg(dt.host.memory.usage), by: {dt.smartscape.host}
```

避免添加会减少数据的过滤器或字段转换 —— 分析
工具在完整时间序列数据下效果最佳。


### 预测

当用户要求"预测"、"预见"或"估计未来"的主机指标时：

1. **构建具有足够历史数据的时间序列查询**（例如短期为 7 天，
   较长预测为 30 天）
2. **传给具有所需预测期的预测工具**

**预测期**（提前多远预测）和**历史窗口**（模型训练所用
的过去数据量）是独立的。像"预测未来 2 小时"这样的请求
将预测期设为 2h —— 它并未说明回看窗口。无论预测期多短，
始终使用至少 7 天的历史数据。训练数据点太少
会导致预测模型失败并回退到原始历史值。

```dql
timeseries avg(dt.host.cpu.usage), by: {dt.smartscape.host}
```

### 季节性检测

当用户询问"季节性"、"每周模式"或"重复行为"时：

1. **使用更长的时间范围**（每周至少 14 天，每月 30 天以上）
2. **传给季节性基线异常检测器**

**季节性分析的响应格式：** 呈现结果时包含：
- 是否检测到季节性异常（是/否）
- 所分析的时间范围和参数
- 对每个受影响的主机：主机名称（不仅是 ID）、违规时间戳、违规
  计数、基线值 vs 实际值，以及上/下界
- 如果涉及多个主机，按主机组织结果

### 范围边界 —— 服务级 vs 主机级指标

此技能仅涵盖**主机和进程基础设施指标**。如果用户询问
服务级指标（请求速率、响应时间、错误率、每分钟服务调用次数、
吞吐量），改用 `dt-obs-services` —— 即使问题涉及这些指标的
预测或异常检测。

**将这些重定向到 `dt-obs-services`：**"每分钟服务调用数"、"请求速率"、
"按服务的响应时间"、"按端点的错误率"、"服务吞吐量预测"。

---

## 常见查询模式

### 模式 1：Smartscape 发现
使用 `smartscapeNodes` 发现并分类实体。
```dql-template
smartscapeNodes "HOST"
| fieldsAdd <attributes>
| filter <conditions>
| summarize <aggregations>
```

### 模式 2：时间序列性能
使用 `timeseries` 分析随时间变化的指标。
```dql-template
timeseries metric = avg(dt.host.<metric>), by: {dt.smartscape.host}
| fieldsAdd <calculations>
| filter <thresholds>
```

### 模式 3：跨层关联
关联主机和进程指标。
```dql
timeseries {
  host_cpu = avg(dt.host.cpu.usage),
  process_cpu = avg(dt.process.cpu.usage)
}, by: {dt.smartscape.host, dt.smartscape.process}
```

### 模式 4：使用 Lookup 进行实体富化
用实体属性富化数据。在 `lookup` 之后，用 `lookup.` 前缀引用字段。
```dql
timeseries cpu = avg(dt.host.cpu.usage), by: {dt.smartscape.host}
| lookup [
    smartscapeNodes HOST
    | fields id, cpuCores, memoryTotal
  ], sourceField:dt.smartscape.host, lookupField:id
| fieldsAdd cores = lookup.cpuCores, mem_gb = lookup.memoryTotal / 1024 / 1024 / 1024
```

---

## 标签和元数据

### 重要说明
- 通用 `tags` 字段在 smartscape 查询中**不会**填充
- 使用特定的标签字段：`tags:azure[*]`、`tags:environment`
- 使用自定义元数据：`host.custom.metadata[*]`

### 可用标签
- **Azure 标签：** `tags:azure[dt_owner_team]`、`tags:azure[dt_cloudcost_capability]`
- **环境：** `tags:environment`
- **自定义元数据：** `host.custom.metadata[OperatorVersion]`、`host.custom.metadata[Cluster]`
- **成本：** `dt.cost.costcenter`、`dt.cost.product`

→ 完整的标签参考，参见 [references/inventory-discovery.md](references/inventory-discovery.md#tags-and-metadata)

---

## 云特定属性

### AWS
- `cloud.provider == "aws"`
- `aws.region`、`aws.availability_zone`、`aws.account.id`
- `aws.resource.id`、`aws.resource.name`
- `aws.state`（running、stopped、terminated）

### Azure
- `cloud.provider == "azure"`
- `azure.location`、`azure.subscription`、`azure.resource.group`
- `azure.status`、`azure.provisioning_state`
- `azure.resource.sku.name`（VM 大小）

### GCP
- `cloud.provider == "gcp"`
- `gcp.region`、`gcp.zone`、`gcp.location`
- `gcp.project.id`（注意：两个点）
- `gcp.resource.type`（例如 `gce_instance`）、`gcp.asset.type`（例如 `compute.googleapis.com/Instance`）

### Kubernetes
- `k8s.cluster.name`、`k8s.cluster.uid`
- `k8s.namespace.name`、`k8s.node.name`、`k8s.pod.name`
- `k8s.workload.name`、`k8s.workload.kind`

→ 多云分析，参见 [references/inventory-discovery.md](references/inventory-discovery.md#multi-cloud-hosts)

---

## 最佳实践

1. 延迟使用百分位数（p95、p99）；限制使用 `max()`；趋势使用 `avg()`
2. 设置多级阈值（警告 80%，严重 90%）
3. 在管道中尽早过滤；用 `| limit N` 限制结果
4. 在富化（lookup）之前进行聚合
5. 使用 `getNodeName(dt.smartscape.host)` 获取人类可读的主机名；进程使用 `getNodeName(dt.smartscape.process)`
6. 将字节转换为 GB：`/ 1024 / 1024 / 1024`；用 `round(value, decimals: 1)` 取整

**时间窗口：** 实时：5-15 分钟 | 趋势：1-7 天 | 容量规划：30-90 天

### 限制
- `dt.host.cpu.iowait` 仅在 Linux 上可用
- 通用 `tags` 字段在 smartscape 中**不会**填充（使用特定的标签命名空间）
- 容器镜像名称在 smartscape 中**不可用**

---

## 故障排查

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| `smartscapeNodes "HOST"` 未返回主机 | 缺少时间范围或未部署 OneAgent | 验证 OneAgent 已安装；为查询添加时间范围 |
| `tags` 字段始终为空 | 通用 `tags` 在 smartscape 中不会填充 | 使用特定的标签命名空间：`tags:azure[*]`、`tags:environment`、`dt.cost.costcenter` |
| 以字节为单位的内存值难以阅读 | 原始指标单位是字节 | 除以 `1024 / 1024 / 1024` 并使用 `round(value, decimals: 1)` |
| `dt.host.cpu.iowait` 不返回数据 | 指标仅限 Linux | 检查 `os.type`；iowait 在 Windows、AIX、Solaris 上不可用 |
| 缺少容器镜像名称 | 在 smartscape 中不可用 | 使用 `k8s.object` 解析获取镜像详情；参见 dt-obs-kubernetes 技能 |
| `process.software_technologies` 为空 | 进程未被深度代码级监控监控 | 验证该进程组启用了 OneAgent 深度监控 |
| `dt.agent.monitoring_mode` 始终为空 | 字段名使用下划线，而非点 | 使用 `dt.agent.monitoring_mode`；`dt.agent.monitoring.mode`（点）始终返回空 |
| `gcp.project.id` 始终为空 | 使用了错误的字段名 | GCP 项目使用两个点：`gcp.project.id` 而非下划线，`gcp.project_id` 始终返回空 |

---

## 何时加载参考

此技能使用**渐进式披露**。从这里开始可覆盖 80% 的用例。需要时加载参考文件以获取详细规范。

### 何时加载 host-metrics.md：
- 分析 CPU 组件细分（user、system、iowait、steal）
- 调查内存压力和 swap 使用
- 排查磁盘 I/O 延迟
- 诊断网络丢包或错误

### 何时加载 process-monitoring.md：
- 分析进程级 I/O 模式
- 调查 TCP 连接质量
- 检测资源耗尽（文件描述符、线程）
- 追踪 GC 暂停时间

### 何时加载 container-monitoring.md：
- 分析容器生命周期和更替
- 追踪 Kubernetes 版本分布
- 管理 OneAgent operator 版本
- 规划 K8s 集群升级

### 何时加载 inventory-discovery.md：
- 通过端口发现进行安全审计
- 实施成本归因和成本分摊
- 验证数据质量和元数据完整性
- 管理多云基础设施
- 按 OneAgent 模式/版本列出或过滤主机

---

## 参考

- [host-metrics.md](references/host-metrics.md) - 详细的主机 CPU、内存、磁盘和网络监控
- [process-monitoring.md](references/process-monitoring.md) - 进程级 CPU、内存、I/O 和网络分析
- [container-monitoring.md](references/container-monitoring.md) - 容器清点、Kubernetes 版本和 operator 管理
- [inventory-discovery.md](references/inventory-discovery.md) - 主机/进程发现、技术清点、成本归因和数据质量

---
