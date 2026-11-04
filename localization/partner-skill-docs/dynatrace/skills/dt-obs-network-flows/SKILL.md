---
name: dt-obs-network-flows
description: >-
  Dynatrace 中跨三种来源的网络流分析：OneAgent 流
  （`default_network_flows` Grail 桶中主机/进程/Pod 到对端的连接）、NetFlow/IPFIX/sFlow（通过 OpenTelemetry Collector），
  以及云流日志（AWS VPC / Transit Gateway；Azure 和 GCP 计划中）。用于分析实体之间的流量、
  按带宽找出流量最大的对象、绘制通信依赖关系、
  调查连接健康度（重置、超时、重传、RTT），以及
  将对端解析为受监控实体。将每个问题路由到正确的来源；
  来源特定的 DQL 位于参考文件中。
  触发词："network flows"、"top talkers"、"traffic between hosts"、"connection
  resets"、"TCP retransmissions"、"RTT"、"pod connections"、"network dependencies"、
  "NetFlow"、"IPFIX"、"sFlow"、"VPC flow logs"、"cloud network traffic"。
  不用于主机网卡吞吐量或丢包（请使用 dt-obs-hosts）、服务
  请求速率或延迟（请使用 dt-obs-services），或合成/在线时长监控
  （请使用 dt-obs-ext-monitors）。
license: Apache-2.0
---

# 网络流技能

在 Dynatrace 中跨三种流数据来源分析网络流量。此技能涵盖网络流所支持的**用例**，并将每个问题路由到正确的来源和参考文件。详细的、来源特定的 DQL 位于参考文件中。

## 网络流能告诉你什么

网络流数据回答了指标和追踪无法回答的问题：

- **谁与谁通信** —— 主机、进程、Pod、服务和外部端点之间的通信依赖关系
- **流量最大的对象** —— 哪些实体产生最多流量，按字节数或连接数
- **连接健康度** —— 每个会话的重置、超时、重传和往返时间（RTT）
- **流量构成** —— 协议（TCP/UDP）、目标端口、方向（客户端 vs 服务器）
- **对端解析** —— 将原始 IP:port 对端映射回受监控实体（主机、进程、Pod、服务）或将它们标记为外部

---

## 三种流来源

根据**流量在哪里**以及**谁在捕获它**来选择来源。当多个来源都适用时，优先选择实体上下文最丰富的来源（通常是 OneAgent）。

| 来源 | 捕获者 | 数据位置 | 实体上下文 | 何时使用 |
|---|---|---|---|---|
| **OneAgent 流** | 主机上的 OneAgent 网络代理 | `default_network_flows` Grail 桶中的 **events** | 丰富 —— 捕获实体（客户端或服务器）解析为主机 / 进程 / Pod smartscape ID；远端对端为 IP:port | 到/来自 OneAgent 受监控主机、进程或 Kubernetes Pod 的流量。**默认且最详细的来源。** |
| **NetFlow / IPFIX / sFlow** | 网络设备（交换机、路由器），通过 OpenTelemetry Collector 摄取 | **logs**（`otel.scope.name == "otelcol/netflowreceiver"`；建议路由到专用桶） | 设备/接口级别 —— 原始 IP、导出器、接口；无 smartscape 实体 | 网络硬件看到的流量。覆盖网络层的横向和纵向流。 |
| **云流日志** | 云提供商（AWS VPC / TGW；Azure、GCP 尚未记录） | **logs**（`log.type == "aws.vpc"` / `"aws.tgw"`；建议路由到专用桶） | 云资源级别 —— VPC / 子网 / AZ / ENI、TGW 挂载；原始 IP，无 smartscape 实体 | 云网络内部/之间的流量，包括托管服务和无代理的资源。 |

### 路由逻辑

1. **流量是否到/来自 OneAgent 受监控的主机、进程或 Pod？** → OneAgent 流。参见 [references/oneagent-flows/oneagent-flows.md](references/oneagent-flows/oneagent-flows.md)。
2. **是设备级别的还是来自未监控主机？** → NetFlow。参见 [references/netflow/netflow.md](references/netflow/netflow.md)。
3. **是云网络 / 托管服务流量？** → 云流日志（按提供商）。AWS：[references/cloud-flows/aws/aws.md](references/cloud-flows/aws/aws.md)。

> 三种来源存在重叠。Pod 到 Pod 的流可能同时出现在 OneAgent 流（带完整 Pod 上下文）和云流日志（作为 ENI 到 ENI）中。以携带用户所需实体上下文的来源为主，只有当主要来源没有数据时才提及替代来源。

---

## Dynatrace 中的相关网络数据

网络流是 Dynatrace 网络可观测性的一部分。当问题不是关于流时，路由到以下内容：

| 用户想要…… | 使用 |
|---|---|
| 主机网卡吞吐量、链路利用率、丢包/错误 | [dt-obs-hosts](../dt-obs-hosts/SKILL.md) → `references/host-metrics.md`（网络监控部分） |
| 进程级网络 I/O 和 TCP 连接质量指标 | [dt-obs-hosts](../dt-obs-hosts/SKILL.md) → `references/process-monitoring.md` |
| Kubernetes Pod 连接和集群网络拓扑 | [dt-obs-kubernetes](../dt-obs-kubernetes/SKILL.md) |
| 服务请求速率、延迟、错误率 | [dt-obs-services](../dt-obs-services/SKILL.md) |
| 外部 / 合成在线时长和网络可用性监控 | [dt-obs-ext-monitors](../dt-obs-ext-monitors/SKILL.md) |
| 网络设备 —— 交换机、路由器、防火墙（SNMP/监控） | `dt-obs-network-devices` *（计划中 —— 尚不可用）* |

> 未来可能有一个宏观技能 **`dt-obs-network`** 连接所有网络概念（设备、主机/进程/Pod 指标、流、可用性监控、云网络监控）。在它存在之前，此技能承载上述流特定的交叉链接。

---

## 参考文件

- [references/oneagent-flows/oneagent-flows.md](references/oneagent-flows/oneagent-flows.md) —— **已验证。** `default_network_flows` 桶的数据模型、字段参考和 DQL：流量最大的对象、流量地图、协议/端口细分、连接健康度（重置/超时/重传/RTT）、以 bps 表示的带宽，以及流的哪一侧是对端。
- [references/peer-resolution/peer-resolution.md](references/peer-resolution/peer-resolution.md) —— **已验证。** 共享的 Smartscape 查找，将原始流 IP（以及可选端口）解析为受监控的主机、进程、Kubernetes Pod 或服务（主机 → Pod → 服务 → 外部）。OneAgent 流和 NetFlow 都会使用。
- [references/oneagent-flows/configuration.md](references/oneagent-flows/configuration.md) —— 启用和调优 `builtin:network-connection-monitoring`（生成 OneAgent 流数据的设置）。
- [references/netflow/netflow.md](references/netflow/netflow.md) —— **已验证。** 通过 OpenTelemetry Collector 摄取到 `logs` 的 NetFlow/IPFIX/sFlow：数据模型、方向语义（单向，无客户端/服务器角色），以及用于顶级会话/通话者/端口、协议细分、随时间变化的流量和按导出器/按接口视图的 DQL。
- [references/netflow/configuration.md](references/netflow/configuration.md) —— OTel Collector `netflow` 接收器摄取路径以及 netflow 日志的专用桶路由建议。
- [references/cloud-flows/aws/aws.md](references/cloud-flows/aws/aws.md) —— **已验证（AWS）。** 摄取到 `logs` 的 AWS VPC Flow Logs 和 Transit Gateway 流日志：`aws.vpc`/`aws.tgw` 字段模型（包括 `pkt_srcaddr` vs `srcaddr`、`log_status` 过滤），以及用于顶级会话/通话者/端口、被拒绝流量（安全）、出口 `traffic_path`、按 VPC/子网/AZ、VPC 间、随时间变化的流量和 TGW 丢包的 DQL。还包括 AWS 实体解析 —— 按 id 或 `aws.object` 中的 IP 解析 ENI/实例 —— 用于共享对端查找遗漏的无代理资源。
- [references/cloud-flows/aws/configuration.md](references/cloud-flows/aws/configuration.md) —— AWS 流日志的 Amazon Data Firehose 摄取路径以及专用桶路由建议。

  *（Azure NSG/VNet 和 GCP VPC 流日志尚未记录；当有租户数据时，将它们添加为同级 `cloud-flows/<provider>/` 文件夹。）*
