---
name: dt-obs-kubernetes
description: >-
  Kubernetes 集群、Pod、节点和工作负载监控。用于分析 K8s 健康、资源
  优化、Pod 失败、OOMKill、调度或安全态势。也用于 Kubernetes
  运维事件，如 Pod 重启、OOM 事件、驱逐和集群事件历史。
  触发词："Kubernetes pods"、"K8s cluster health"、"OOMKill"、"pod restarts"、"container CPU"、
  "namespace resource usage"、"over-provisioned pods"、"privileged containers"、
  "pod placement"、"K8s node capacity"、"running containers by cluster"、
  "workload scheduling"、"pod evictions"、"K8s labels and annotations"、
  "kubernetes events"、"pod restart events"、"OOM events"、"K8s event history"。
  不用于解释现有查询、产品文档问题、
  AWS 特定资源查询、服务级 RED 指标、分布式追踪或
  日志分析 —— 请改用相关技能。
license: Apache-2.0
---

# 基础设施 Kubernetes

使用 Dynatrace DQL 监控并分析 Kubernetes 基础设施。查询
集群资源、监控工作负载健康、分析 Pod 放置、优化
成本并评估安全态势。

## 何时使用此技能

- 监控 Kubernetes 集群健康和容量
- 分析 Pod 和容器资源利用率
- 调查 Pod 失败、OOMKill、驱逐或崩溃循环
- 调试退化的部署、卡住的发布或节点压力
- 优化 Kubernetes 资源成本
- 评估安全态势和合规性
- 排查工作负载调度和放置
- 审计入口路由和网络策略
## 知识库结构

### 核心监控（从这里开始）

1. **集群清点** → `references/cluster-inventory.md` - 集群、
   命名空间、资源分布
2. **节点监控** - 节点容量、CPU/内存使用、Pod 密度
3. **Pod 监控** - Pod CPU、内存、生命周期事件
4. **工作负载监控** - Deployment、StatefulSet、DaemonSet 资源

### 高级主题

1. **配置分析** → `references/labels-annotations.md` - 解析
   k8s.object、标签、注解
2. **调度与放置** → `references/pod-node-placement.md` - 节点
   选择器、亲和性、污点、HA
3. **成本优化** - 规模调整、浪费检测、效率评分
4. **安全与合规** - 特权容器、安全上下文

## 关键概念

### 实体类型

**工作负载：** `K8S_DEPLOYMENT`、`K8S_STATEFULSET`、`K8S_DAEMONSET`、
`K8S_JOB`、`K8S_CRONJOB`、`K8S_HORIZONTALPODAUTOSCALER`  
**基础设施：** `K8S_CLUSTER`、`K8S_NAMESPACE`、`K8S_NODE`、`K8S_POD`  
**配置：** `K8S_SERVICE`、`K8S_CONFIGMAP`、`K8S_SECRET`、
`K8S_PERSISTENTVOLUMECLAIM`、`K8S_PERSISTENTVOLUME`、`K8S_INGRESS`、
`K8S_NETWORKPOLICY`

> **注意：** HPA、Job、CronJob 和配置实体类型仅为
> 清点查询而列出。HPA 扩缩分析参见 `references/workload-health.md`；
> PVC/PV 参见 `references/pv-pvc.md`；Ingress/NetworkPolicy 参见
> 相应参考文件。

### 查询类型

**smartscapeNodes** - 查询 K8s 实体（当前状态，无需时间范围）：

```dql
smartscapeNodes K8S_POD
| filter k8s.namespace.name == "production"
| fields k8s.cluster.name, k8s.pod.name
```

**timeseries** - 随时间监控指标（始终指定 `from:` 范围）：

```dql
timeseries cpu = sum(dt.kubernetes.container.cpu_usage),
  by: {k8s.pod.name, k8s.namespace.name},
  from: now()-1h
| fieldsAdd avg_cpu = arrayAvg(cpu)
```

> `timeseries` 将每个指标返回为时间桶数组。要在下游 `fieldsAdd` 中将其折叠为
> 标量，使用 `arrayAvg(series)` 或 `arraySum(series)`
> —— 在 `timeseries {}` 块之外对序列字段调用 `avg()` 或 `sum()`
> 不受支持。

**fetch logs** - 分析日志事件：

```dql
fetch logs
| filter k8s.namespace.name == "production" and loglevel == "ERROR"
```

### 核心字段

- `k8s.cluster.name`、`k8s.namespace.name`、`k8s.pod.name`、`k8s.node.name`
- `k8s.workload.name`、`k8s.workload.kind`、`k8s.container.name`
- `k8s.object` - 用于深度检查的完整 JSON 配置
- `tags[label]` - 访问标签和注解

**`k8s.workload.kind` 值**（在 DT 中始终为小写 —— 而非 K8s API 中的 Pascal 大小写）：
`"deployment"`、`"statefulset"`、`"daemonset"`、`"replicaset"`、`"job"`、`"cronjob"`

**`k8s.object` 可用性：**

| 实体类型 | `k8s.object` 可用？ |
|---|---|
| `K8S_POD` | 是 |
| `K8S_NAMESPACE` | 是 |
| `K8S_NODE` | 是 |
| 工作负载类型（`K8S_DEPLOYMENT` 等） | 是 |
| `K8S_CLUSTER` | **否** |

### 可用指标

**CPU：** `dt.kubernetes.container.cpu_usage`、`cpu_throttled`、`limits_cpu`、
`requests_cpu`  
**内存：** `dt.kubernetes.container.memory_working_set`、`limits_memory`、
`requests_memory`  
**操作：** `dt.kubernetes.container.restarts`、`oom_kills`  
**节点：** `dt.kubernetes.node.pods_allocatable`、`cpu_allocatable`、
`memory_allocatable`、`dt.kubernetes.pods`

> **requests/limits 的聚合规则：** 聚合 `requests_cpu`、`limits_cpu`、
> `requests_memory` 或 `limits_memory` 时，始终使用 `sum()` —— 绝不用 `avg()`。
> `avg()` 返回每个容器的平均值，并会静默
> 少计多容器 Pod 和多副本工作负载。对于 DaemonSet
> （每个节点一个 Pod），此错误与集群规模成正比。

### 实体消歧

`K8S_POD` vs `CONTAINER`：这些是 Dynatrace 中不同的实体类型。

- **`K8S_POD`** —— K8s 原生实体，带 `k8s.object` JSON、调度状态、条件和 K8s 指标。使用此技能。
- **`CONTAINER`** —— 主机级容器清点（镜像、生命周期、主机分配）。改用 `dt-obs-hosts` 技能。

smartscape 边是 `CONTAINER --(is_part_of)--> K8S_POD`。要从 Pod 到达容器，向后遍历：

```dql-template
smartscapeNodes K8S_POD
| filter k8s.namespace.name == "<namespace>"
| traverse edgeTypes: {is_part_of}, targetTypes: {CONTAINER}, direction: backward, fieldsKeep: {id}
| fields k8s.cluster.name, k8s.namespace.name, k8s.pod.name, container.id=id
```

### Service → K8S_POD 关联

`SERVICE` 和 `K8S_POD` 之间不存在直接的 smartscape 边。关联键是共享维度 `k8s.workload.name`。完整的两步模式参见 `references/pod-debugging.md` 中的 [Service → Pod Drill-Down](references/pod-debugging.md#service--pod-drill-down)。

## 常见工作流

### 1. 集群健康检查

列出所有集群：

```dql
smartscapeNodes K8S_CLUSTER
| fields k8s.cluster.name, k8s.cluster.version, k8s.cluster.distribution
```

检查节点容量：

```dql
timeseries {
  current_pods = avg(dt.kubernetes.pods),
  max_pods = avg(dt.kubernetes.node.pods_allocatable)
}, by: {k8s.node.name, k8s.cluster.name},
from: now()-1h
| fieldsAdd pod_capacity_pct = (arrayAvg(current_pods) / arrayAvg(max_pods)) * 100
| filter pod_capacity_pct > 80
```

识别处于非 Running 状态的 Pod：

```dql
smartscapeNodes K8S_POD
| parse k8s.object, "JSON:config"
| fieldsAdd phase = config[status][phase]
| filter not(in(phase, {"Running", "Succeeded"}))
| fields k8s.cluster.name, k8s.namespace.name, k8s.pod.name, phase
```

> `Succeeded` 是已完成 Job Pod 的健康终态 —— 排除它
> 可避免误报。如果你特别想审计已完成的 Job，请调整。

### 2. 资源优化

**Pod 级** —— 查找过度配置的 Pod（使用率 < 30%）：

```dql
timeseries {
  cpu_usage = sum(dt.kubernetes.container.cpu_usage),
  cpu_requests = sum(dt.kubernetes.container.requests_cpu)
}, by: {k8s.pod.name, k8s.namespace.name, k8s.cluster.name},
from: now()-7d
| fieldsAdd usage_pct = (arrayAvg(cpu_usage) / arrayAvg(cpu_requests)) * 100
| filter usage_pct < 30 and arrayAvg(cpu_requests) > 0
```

**工作负载级** —— 跨所有副本聚合（DaemonSet 正确核算所必需）：

```dql
timeseries {
  cpu_usage = sum(dt.kubernetes.container.cpu_usage),
  cpu_requests = sum(dt.kubernetes.container.requests_cpu)
}, by: {k8s.workload.name, k8s.workload.kind, k8s.namespace.name, k8s.cluster.name},
from: now()-7d
| fieldsAdd
    avg_usage = arrayAvg(cpu_usage),
    avg_requests = arrayAvg(cpu_requests)
| fieldsAdd usage_pct = (avg_usage / avg_requests) * 100
| filter usage_pct < 30 and avg_requests > 0
| sort usage_pct asc
```

> 在每个聚合层级对 `cpu_usage` 和 `cpu_requests` 都使用 `sum()`。
> 一个在 50 个节点上运行的 DaemonSet 有 50× 的每 Pod 请求总量；`avg()`
> 会报告真实预留容量的 1/50。

识别没有限制的容器：

```dql
smartscapeNodes K8S_POD
| parse k8s.object, "JSON:config"
| expand container = config[spec][containers]
| fieldsAdd
    container_name = container[name],
    cpu_limit = container[resources][limits][cpu],
    memory_limit = container[resources][limits][memory]
| filter isNull(cpu_limit) or isNull(memory_limit)
```

### 3. 排查 Pod 问题

Pod 故障排查受益于将**指标**（timeseries）与
**Kubernetes 事件**（事件流）结合起来以获得完整画面。

#### 基于指标的故障排查

查找有 OOMKill 的 Pod：

```dql
timeseries oom_kills = sum(dt.kubernetes.container.oom_kills),
  by: {k8s.pod.name, k8s.namespace.name, k8s.cluster.name},
  from: now()-1h
| filter arraySum(oom_kills) > 0
| fieldsAdd total_oom_kills = arraySum(oom_kills)
| sort total_oom_kills desc
```

分析 Pod 重启模式：

```dql
timeseries restarts = sum(dt.kubernetes.container.restarts),
  by: {k8s.pod.name, k8s.namespace.name, k8s.cluster.name},
  from: now()-1h
| fieldsAdd total_restarts = arraySum(restarts)
| filter total_restarts > 5
```

#### 基于事件的故障排查

对于运维事件（Pod 重启、OOM 终止、驱逐、调度失败），
Kubernetes 事件提供比仅指标更丰富的上下文 —— 包括事件
原因、消息和时间戳。

**何时使用 Kubernetes 事件而非指标：**
- 用户询问最近的运维事件（"显示我 Pod 重启事件"）
- 用户想要像原因和消息这样的事件详情
- 用户询问特定时间窗口内的事件（"最近 48 小时"）
- 用户想将事件与根因关联

**Kubernetes 事件**可通过 `get-events-for-kubernetes-cluster`
工具（一个 Dynatrace MCP 工具）获得。用 `findAllK8Events: true` 调用以获取所有集群的事件，
或用 `findAllK8Events: false` 并带上 `clusterId`
（`k8s.cluster.uid`）或 `kubernetesEntityId`（`dt.entity.kubernetes_cluster`）以
限定到一个集群。使用 `history` 设置回看窗口（例如 `"1h"`、
`"24h"`、`"7d"`；最大 `"60d"`）。
当用户询问 OOM 事件、Pod 重启、
驱逐或集群级事件历史时，**优先使用此工具**。如果工具不可用，回退到下面的 `fetch events` DQL
模式。

**重要：过滤结果时区分事件类型。** Kubernetes 事件
涵盖许多类别。当用户询问特定事件类型时，相应地过滤
结果 —— 不要报告无关事件：

| 用户询问 | 相关事件原因 | 无关 |
|-----------------|----------------------|-------------|
| Pod 重启 | `BackOff`、`CrashLoopBackOff`、`Killing` | 就绪探针失败、CPU 限流 |
| OOM 事件 | `OOMKilling`、`OOMKilled` | 内存压力警告 |
| 驱逐 | `Evicted`、`Preempting` | 节点压力 |
| 调度失败 | `FailedScheduling`、`Unschedulable` | 资源配额 |

**要得到完整答案**，结合两种方法：
1. 使用**事件工具**获取事件详情（发生了什么、何时、为何）
2. 使用**时间序列指标**展示定量影响（多少次重启、
   随时间变化的 OOM 终止计数）

#### 通过 DQL 获取 Kubernetes 事件

Pod 重启和运维事件也可以通过 DQL 从事件
表查询：

```dql
fetch events
| filter event.kind == "K8S_EVENT"
| filter event.type == "Warning"
| fields timestamp, k8s.cluster.name, k8s.namespace.name, k8s.pod.name,
    event.reason, event.message
| sort timestamp desc
| limit 50
```

过滤特定事件原因：

```dql
fetch events
| filter event.kind == "K8S_EVENT"
| filter in(event.reason, {"OOMKilling", "BackOff", "Evicted", "FailedScheduling"})
| fields timestamp, k8s.cluster.name, k8s.namespace.name, k8s.pod.name,
    event.reason, event.message
| sort timestamp desc
```

**`fetch events` 中的字段名：** 使用 `event.reason` 和 `event.message` —— 而不是
`dt.kubernetes.event.reason`。`dt.kubernetes.*` 前缀用于时间序列指标，
而非事件表。使用错误前缀的查询会返回零结果。

### 4. 安全评估

识别特权容器：

```dql
smartscapeNodes K8S_POD
| parse k8s.object, "JSON:config"
| expand container = config[spec][containers]
| fieldsAdd
    container_name = container[name],
    privileged = container[securityContext][privileged]
| filter privileged == true
```

查找以 root 运行的容器：

```dql
smartscapeNodes K8S_POD
| parse k8s.object, "JSON:config"
| expand container = config[spec][containers]
| fieldsAdd
    container_name = container[name],
    run_as_user = container[securityContext][runAsUser],
    run_as_non_root = container[securityContext][runAsNonRoot]
| filter (isNull(run_as_user) or run_as_user == 0) and run_as_non_root != true
```

### 5. 调度分析

验证 Deployment 和 StatefulSet 的 Pod 分布（HA 合规性）：

```dql
smartscapeNodes K8S_POD
| filter in(k8s.workload.kind, {"deployment", "statefulset"})
| summarize pod_count = count(),
            node_count = countDistinct(k8s.node.name),
            by: {k8s.cluster.name, k8s.namespace.name, k8s.workload.name, k8s.workload.kind}
| fieldsAdd ha_compliant = node_count > 1
| filter pod_count >= 2 and not ha_compliant
```

> DaemonSet 被有意排除 —— 按设计每个 Pod 恰好运行在一个节点上，
> 因此单节点放置对它们而言不是 HA 违规。

### 6. 影响 K8s 实体的 DAVIS 问题

查找影响 K8s 实体的活跃 DAVIS 问题：

```dql
fetch dt.davis.problems, from:now() - 2h
| filter not(dt.davis.is_duplicate) and event.status == "ACTIVE"
| filter iAny(startsWith(smartscape.affected_entities[][type], "K8S_"))
| fields display_id, event.name, event.category, affected_entity_ids = smartscape.affected_entities[][id]
```

`smartscape.affected_entities` 是记录数组；每条记录有 `id`、`type` 和 `name`。使用
`[][id]` 获取 Smartscape ID 数组以查找受影响实体，或在
`expand smartscape.affected_entities` 后使用 `[id]`。没有前置 `expand` 时，`[id]` 会
静默返回 `null`。`filter` 不能接受裸迭代表达式，因此用 `iAny(...)` 包裹它。

## 最佳实践

### 选择正确的数据来源

| 用户问题 | 最佳方法 | 原因 |
|---------------|---------------|-----|
| "显示我 OOM 事件" | 事件工具 + 指标 | 事件提供原因/消息；指标展示趋势 |
| "显示我 Pod 重启事件" | 事件工具 + 时间序列指标 | 事件揭示原因（BackOff、Killing、CrashLoopBackOff）；`dt.kubernetes.container.restarts` 指标给出实际重启次数 |
| "Pod 重启多少次？" | 时间序列指标 | 随时间的定量数据 |
| "过去 48 小时我的 Pod 发生了什么？" | 事件工具 | 带上下文的运维事件历史 |
| "哪些 Pod 使用最多 CPU？" | 时间序列指标 | 资源利用率分析 |
| "列出所有集群/命名空间" | smartscapeNodes | 实体发现和清点 |
| "有调度失败吗？" | 事件工具 | 事件原因说明原因 |
| "哪些工作负载过度配置？" | 时间序列指标，工作负载级 | 必须对请求使用 `sum()`；按 `k8s.workload.name` 分组 |

### 时间范围

- **`smartscapeNodes`** —— 无时间范围；始终返回当前实体状态。
- **`timeseries`** —— 始终添加 `from: now()-<window>`。默认窗口由
  系统决定，通常对趋势分析来说太短。推荐默认值：
  最近尖峰用 `now()-1h`，每日模式用 `now()-24h`，每周趋势用 `now()-7d`。
- **`fetch events`** —— 建议添加 `from:` 以获得可复现的结果；
  没有它则应用系统默认窗口。
- **`fetch dt.davis.problems`** —— 活跃问题使用 `from: now()-2h`；扩展到
  `now()-7d` 以包含最近关闭的问题。

### 查询性能

1. **尽早过滤** - 立即应用集群/命名空间过滤器
2. **使用具体实体类型** - 避免通配符
3. **限制结果集** - 探索时使用 `limit`
4. **缓存集群列表** - 存储在变量中
5. **除非需要，否则省略 `k8s.object`** - 解析它会显著增加查询成本

### 监控建议

1. 为所有容器设置资源限制
2. 监控 OOMKill 并调整内存限制
3. 追踪 CPU 限流并调整 CPU 限制
4. 定期审视资源效率（目标 70-80%）
5. 实施安全最佳实践（非 root、只读文件系统）
6. 使用具体镜像标签（避免 :latest）

### 配置标准

1. 使用标签组织（app、environment、team）
2. 设置资源请求和限制
3. 配置健康检查（liveness/readiness 探针）
4. 为所有 ingress 资源使用 TLS
5. 用注解记录

## 故障排查

| 问题 | 原因 | 解决方案 |
|---------|-------|----------|
| 未返回 Pod 数据 | 实体类型错误或缺少集群过滤器 | 使用 `K8S_POD`（不是 `POD`）；添加 `k8s.cluster.name` 过滤器 |
| `k8s.object` 解析错误 | 复杂 JSON 结构 | 使用 `parse k8s.object, "JSON:config"` 然后访问嵌套字段 |
| Pod 网络指标不可用 | 在 Grail 中不可用 | 使用服务网格指标或主机级网络指标 |
| 结果集很大 | 无时间范围或集群过滤器 | 提早添加时间范围并按集群/命名空间过滤 |
| 输出中缺少标签 | 标签访问方式错误 | 使用 `tags[label_name]` 访问标签 |
| `k8s.workload.kind` 过滤器不返回结果 | 值为 Pascal 大小写（例如 `"Deployment"`） | DT 中的值为小写：`"deployment"`、`"statefulset"`、`"daemonset"` |

## 限制

**不可用的指标：**

- Pod 网络指标（rx_bytes、tx_bytes）在 Grail 中**不可用**
- 变通方案：使用服务网格指标或主机级网络指标

**查询注意事项：**

- 尽量减小结果集大小：如果不需要，不要包含 `k8s.object` 字段
- 保持结果集尽可能简单：解析 k8s.object 会增加查询复杂度
- 大型集群可能需要分页或时间范围限制
- 某些 K8s 状态字段异步更新

## 何时加载参考

### 何时加载 cluster-inventory.md：
- 进行集群、命名空间或资源分布分析
- 审计跨集群的工作负载计数

→ [references/cluster-inventory.md](references/cluster-inventory.md)

### 何时加载 labels-annotations.md：
- 按标签或注解过滤
- 解析 `k8s.object` 以进行详细配置检查

→ [references/labels-annotations.md](references/labels-annotations.md)

### 何时加载 pod-node-placement.md：
- 分析调度约束（亲和性、污点、容忍）
- 验证 HA 合规性和 Pod 分布

→ [references/pod-node-placement.md](references/pod-node-placement.md)

### 何时加载 pod-debugging.md：
- 调查 Pod 退出码、崩溃循环或 init 容器失败
- 诊断镜像拉取错误或服务到 Pod 的连通性问题
- 从服务问题下钻到 Pod 级细节

→ [references/pod-debugging.md](references/pod-debugging.md)

### 何时加载 workload-health.md：
- 调查退化的部署或卡住的发布
- 检查节点条件、CPU 限流或 HPA 扩缩
- 分析 StatefulSet 顺序或 DaemonSet 覆盖

→ [references/workload-health.md](references/workload-health.md)

### 何时加载 pv-pvc.md：
- 处理持久存储（PVC/PV 生命周期、孤立卷）
- 检查 StorageClass 配置

→ [references/pv-pvc.md](references/pv-pvc.md)

### 何时加载 ingress.md：
- 分析入口路由规则或 TLS 证书
- 审计入口控制器配置

→ [references/ingress.md](references/ingress.md)

### 何时加载 network-policies.md：
- 列出或审计网络策略
- 检查命名空间隔离配置

→ [references/network-policies.md](references/network-policies.md)

## 参考

- [cluster-inventory.md](references/cluster-inventory.md) —— 集群、命名空间和资源分布分析
- [labels-annotations.md](references/labels-annotations.md) —— 标签/注解过滤和 k8s.object 解析
- [pod-node-placement.md](references/pod-node-placement.md) —— 调度、亲和性、污点和 HA 模式
- [pod-debugging.md](references/pod-debugging.md) —— 退出码、Pod 条件、init 容器、镜像拉取错误、日志、服务到 Pod 下钻
- [workload-health.md](references/workload-health.md) —— 退化的部署、卡住的发布、节点条件、CPU 限流、HPA、StatefulSet 顺序
- [pv-pvc.md](references/pv-pvc.md) —— PVC/PV 生命周期、阶段参考、孤立卷、StorageClass
- [ingress.md](references/ingress.md) —— 路由规则解析、TLS 审计
- [network-policies.md](references/network-policies.md) —— 策略列表、命名空间隔离审计

## 相关技能

- **dt-obs-problems** —— 用于与 Kubernetes 集群关联的问题（使用 `dt.smartscape_source.id` 配合 K8S_ 前缀过滤器）
- **dt-dql-essentials** —— 核心 DQL 语法和查询结构
- **dt-obs-hosts** —— K8s 节点的主机级指标
