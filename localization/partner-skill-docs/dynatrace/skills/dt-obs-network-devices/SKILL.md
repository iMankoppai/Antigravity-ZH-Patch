---
name: dt-obs-network-devices
description: >-
  在 Dynatrace 中分析受 SNMP 监控的网络设备（交换机、路由器、防火墙、负载
  均衡器）。三个数据层：Smartscape 拓扑
  （`EXT_NETWORK_DEVICE` / `EXT_NETWORK_INTERFACE` 节点、`belongs_to` 和
  `calls` 边）；`com.dynatrace.extension.network_device.*` 指标（CPU、
  内存、在线时长、吞吐量、饱和度、错误）；以及日志（SNMP trap、
  syslog、自动发现）。用于清点设备、查找宕机或饱和的
  接口、检查设备 CPU/内存/在线时长、绘制拓扑与邻居关系、
  检测接口错误，以及调查 trap 和 syslog 事件。
  触发词："network device"、"switch"、"router"、"firewall"、"SNMP"、
  "interface status"、"interface down"、"interface utilization"、
  "link saturation"、"device CPU"、"device memory"、"device uptime"、
  "device neighbors"、"LLDP"、"CDP"、"SNMP trap"、"syslog"。
  不用于网络流/流量或流量最大的对象（请使用 dt-obs-network-flows）、
  主机网卡吞吐量（请使用 dt-obs-hosts），或服务请求/延迟（请使用
  dt-obs-services）。
license: Apache-2.0
---

# 网络设备技能

在 Dynatrace 中分析受 SNMP 监控的网络基础设施 —— 交换机、路由器、防火墙、负载均衡器、接入点，以及任何由**网络设备扩展**（通用 SNMP 和厂商 SNMP 扩展）轮询的其他设备。此技能涵盖**设备与接口数据模型**，并将每个问题路由到正确的参考文件。所有 DQL 都位于参考文件中，并已使用 `dtctl query` 针对实时租户验证。

## 网络设备监控能告诉你什么

SNMP 扩展轮询网络硬件，并在 Dynatrace 中以**三个层**暴露它：

- **拓扑** —— 设备和其接口的清点，作为 Smartscape 节点（`EXT_NETWORK_DEVICE`、`EXT_NETWORK_INTERFACE`），带属性（厂商、型号、OS/固件、位置、联系人、IP、MAC、链路速度）和关系（哪个接口属于哪个设备；哪些设备通过 LLDP/CDP 是邻居）。
- **指标** —— 设备健康（CPU、内存、在线时长）和每接口健康（运行/管理状态、入/出吞吐量、错误、丢弃、数据包构成）的时间序列，位于 `com.dynatrace.extension.network_device.*` 命名空间下。
- **日志** —— 事件驱动的记录：SNMP trap（链路 up/down、硬件故障）、syslog 消息（配置变更、身份验证、接口事件）和自动发现活动（每个轮询周期发现的设备和邻居）。

这回答了如下问题：*哪些接口宕机？哪些链路饱和？这台路由器的 CPU 是否被打满？哪些设备重启过？这台交换机连接了什么？此设备发送了哪些 trap？哪些 syslog 错误在反复出现？*

## 三个层（以及它们如何连接）

| 层 | 查询方式 | 粒度 | 关键字段 |
|---|---|---|---|
| **拓扑** | `smartscapeNodes "EXT_NETWORK_DEVICE"` / `smartscapeNodes "EXT_NETWORK_INTERFACE"` | 每个设备 / 接口一行（当前清点） | `id`、`name`、`monitoring_mode`、`device_type`、`location`、`ip`、`speed`、通过 `belongs_to` / `calls` 的边 |
| **指标** | `timeseries … com.dynatrace.extension.network_device.*` | 每个设备 / 接口的时间序列 | 按 `dt.smartscape.ext_network_device` 分组，接口指标还按 `dt.smartscape.ext_network_interface` 分组 |
| **日志** | `fetch logs \| filter dt.openpipeline.source == "…"` | 单条日志记录（trap、syslog、发现） | 通过展开设备 `ip[]` 数组并匹配 `device.address` / `dt.ingest.source.ip` 连接到拓扑 —— 参见 [references/logs.md](references/logs.md) |

**连接的键是 Smartscape ID。** 每个指标都携带一个 `dt.smartscape.ext_network_device` 维度（接口指标还携带 `dt.smartscape.ext_network_interface`）。使用 `lookup [smartscapeNodes …]` 将人类可读的设备/接口名称附加到指标结果，并将实时指标附加到清点列表。两个参考文件都展示了这一模式。

## 监控模式决定存在哪些数据

每个设备都有一个 `monitoring_mode`。**这是首先要检查的** —— 它决定指标是否存在：

| `monitoring_mode` | 含义 | 有指标？ | 有完整属性？ |
|---|---|---|---|
| **`Extension`** | 由 SNMP 扩展直接轮询 | **是** —— 完整的 `com.dynatrace.extension.network_device.*` 集合 | 是 |
| **`Discovery`** | 在网络中发现但未被直接轮询 | **否** | 部分 |
| **`Neighbor`** | 仅因某台被轮询设备将其列为 LLDP/CDP 邻居而得知 | **否** | 极少（名称、机箱 MAC） |

> 如果设备没有指标，在假定存在数据缺口之前先检查其 `monitoring_mode` —— 只有 `Extension` 模式的设备才会被轮询。在列出"受监控设备"时，排除 `Neighbor`（通常也排除 `Discovery`）。

## 路由

1. **清点、属性或拓扑**（列出设备、查找设备的接口、绘制邻居、读取型号/固件/位置）→ [references/topology-model.md](references/topology-model.md)。
2. **健康或性能**（CPU、内存、在线时长、接口 up/down、吞吐量、饱和度、错误）→ [references/metrics.md](references/metrics.md)。
3. **事件驱动的信号**（SNMP trap、syslog 消息、发现活动）→ [references/logs.md](references/logs.md)。
4. 大多数真实问题会组合多个层（例如 *"核心路由器上哪些接口宕机"* = 过滤到单个设备的指标状态，连接到接口名称）。指标和日志参考文件展示了这些连接查询。

## 相关技能

网络设备监控是 Dynatrace 网络可观测性的一部分。当问题不是关于设备/接口健康或拓扑时，路由到其他地方：

| 用户想要…… | 使用 |
|---|---|
| 实体**之间**的流量、流量最大的对象、会话、连接健康度（**穿过**网络的流） | [dt-obs-network-flows](../dt-obs-network-flows/SKILL.md) —— 包括这些相同设备导出的 NetFlow/IPFIX/sFlow |
| **OneAgent 受监控主机**上的主机网卡吞吐量 / 丢包（非 SNMP 设备） | [dt-obs-hosts](../dt-obs-hosts/SKILL.md) → `references/host-metrics.md` |
| 服务请求速率、延迟、错误率 | [dt-obs-services](../dt-obs-services/SKILL.md) |
| 设置或配置扩展（此技能涵盖最终产生的**数据模型**，而非扩展编写） | [dt-obs-extensions](../dt-obs-extensions/SKILL.md) |
| 通用 Smartscape 遍历语法（`traverse`、`smartscapeEdges`、`references[…]`） | [dt-dql-essentials](../dt-dql-essentials/references/smartscape-topology-navigation.md) |

> **网络设备 vs. 网络流。** 此技能回答 *"这台箱子及其端口的状态如何"*（SNMP 设备/接口健康和拓扑）。`dt-obs-network-flows` 回答 *"网络上传送着哪些流量"*（会话、字节、通话者）。同一台路由器会同时出现在两者中：在这里是带接口计数器的 `EXT_NETWORK_DEVICE`，在那里是 NetFlow 导出器。未来可能有一个宏观技能 **`dt-obs-network`** 将它们统一；在此之前，交叉链接。

## 参考文件

- [references/topology-model.md](references/topology-model.md) —— **已验证。** Smartscape 模型：`EXT_NETWORK_DEVICE` 和 `EXT_NETWORK_INTERFACE` 节点类型，含完整字段参考、监控模式，以及 `belongs_to` / `calls` 边。用于设备清点（按模式/类型/位置/厂商过滤）、列出设备的接口、将接口解析为其设备，以及绘制设备/接口邻居拓扑的 DQL。
- [references/metrics.md](references/metrics.md) —— **已验证。** `com.dynatrace.extension.network_device.*` 指标目录，含单位、维度和字段类型规则。用于设备健康（CPU 最高值、带后备方案的内存 %、在线时长和重启检测）和接口健康（宕机接口、吞吐量与链路速度对比的饱和度、错误/丢弃计数、每设备接口明细）的 DQL，每个都连接到设备/接口名称。
- [references/logs.md](references/logs.md) —— **已验证。** 三种日志来源：SNMP trap（`extension:com.dynatrace.extension.snmp-traps-generic`）、syslog（`extension:syslog`）和自动发现活动（`extension:com.dynatrace.extension.snmp-auto-discovery`）。涵盖 IP 到 Smartscape 的连接模式（`device.address` / `dt.ingest.source.ip` → `snmp.ip`）、所有三种来源的字段参考，以及用于带设备名称的近期 trap、按 OID 的 trap 频率、错误 syslog、顶级事件模式、合并的按设备视图和 LLDP/CDP 邻居发现日志的 DQL。
