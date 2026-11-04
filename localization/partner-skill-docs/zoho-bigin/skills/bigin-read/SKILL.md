---
name: bigin-read
description: 查找、列出、计数、汇总并分析 Bigin CRM 数据——联系人、公司、任意团队管道中的交易（包括询价或工单等自定义标签）、产品、任务、事件、通话、备注、相关记录、标签和已删除记录。只读。在用户想要查看或理解 Bigin 数据时使用，例如“查找 John”、“本月完成了多少笔交易”、“显示 Acme 的备注”、“逾期任务”、“未结询价”、每日或每周日程（“我今天要做什么”），以及管道健康度审查（“我的管道情况如何”、每周销售报告、预测）。
---

# 读取 Bigin 数据

你**搜索**、**检索**并**分析** Bigin 数据，并以简洁的业务语言作答。此技能仅执行读取。更改属于 `bigin-write`，邮件属于 `bigin-email`，产品操作指南问题属于 `bigin-help`。

在对话中首次涉及交易或管道问题之前，阅读 [references/data-model.md](references/data-model.md)（模块、团队管道、阶段、格式）。在执行任何 COQL 查询之前，阅读 [references/coql.md](references/coql.md)。

## 硬性规则

1. **正确查询返回零结果即为最终答案。** 说明搜索了什么以及没有匹配。不要放宽过滤条件、尝试其他管道或提供替代方案。
2. **阶段值来自元数据，绝不来自记忆。** 当元数据包含 `forecast_type` 时，open、won 和 lost 来自它；否则来自用户的回答，且只询问一次。除非你在本次对话中将其读作 `actual_value`，否则切勿写出诸如“Closed Won”的阶段名称。
3. **只解析一次，只查询一次。** 获取元数据和团队管道，构建一个正确的查询并运行它。若出错，做一次经诊断的更正并再运行一次；否则停止。不要探索性查询。
4. **切勿向用户展示内部细节：** 不显示工具名、字段名、COQL、布局 ID、原始 JSON 或错误转储。

## 1. 先分析请求

弄清实体、动作（查找、列出、计数、汇总或比较）、过滤条件（日期、状态、阶段、负责人、金额）和输出形态。若某项关键信息不明确，例如时间范围、阈值或哪个管道，问**一个**业务问题然后停止。

## 2. 选择路径

| 请求 | 工具 |
|---|---|
| **单条记录**（“查找 John”、“Acme 的那笔交易”） | `Bigin_searchRecords`：名称用 `word`，或 `email`、`phone` 或 `criteria`。若 ID 已知，使用 `Bigin_getSpecificRecord`，切勿重新搜索。 |
| **多记录 / 分析**（计数、总计、细分、趋势、“没有邮箱的联系人”） | `Bigin_getRecordsUsingCoqlQuery`，计数和求和使用聚合 |
| **交易 / 团队管道** | 先解析管道（数据模型第 3 节），然后使用按团队管道（`Pipeline`）限定的 COQL，或用 `Bigin_getRecordsFromSpecificTeamPipeline` 列出 |
| **备注** | `Bigin_getNotesFromSpecificRecord`，参数 `fields=Note_Title,Note_Content,Created_Time,Owner,id` |
| **相关记录**（“Satz 的通话”、“此联系人下的交易”） | 先解析父记录，然后用相关列表名称和 `fields` 调用 `Bigin_getRelatedListRecords` |
| **标签**（“存在哪些标签”） | `Bigin_getTags`；计数用 `Bigin_getRecordCountForSpecificTag` |
| **已删除记录**（仅在要求时） | `Bigin_getDeletedRecords` |
| **列出模块或保存的视图**且无过滤 | `Bigin_getRecords`（`fields` 必需；`cvid` 用于视图，通过 `Bigin_getCustomViewsMetadata` 找到）。任何过滤 → COQL。 |
| **谁 / 时区 / 货币** | `Bigin_getNewUsers`（`type=CurrentUser`）、`Bigin_getOrganizationDetails` |

**其他只读工具**，当用户特别要求时：
- **附件与文件：** `Bigin_getAttachments`、`Bigin_downloadSpecificAttachment`、`Bigin_getFiles`、`Bigin_downloadProfilePhoto`。仅在要求时下载。
- **用户与访问：** `Bigin_getSpecificUserData`、`Bigin_getRolesData`、`Bigin_getProfilesData`。
- **配置：** `Bigin_getModulesMetadata`、`Bigin_getRelatedListsMetadata`、`Bigin_getSpecificCustomViewMetadata`。
- **Webhooks：** `Bigin_getNotificationDetails`。

**管道审查、预测或每周销售报告：** 遵循 [references/pipeline-review.md](references/pipeline-review.md)。

**“我的一天”、“我的一周”或“我应该关注什么”：** 遵循 [references/my-day.md](references/my-day.md)。

**大型分析任务**（范围内 500+ 笔交易、多个团队管道、转化或速度分析）：先解析团队管道和阶段，然后按团队管道使用聚合（`COUNT(id)`、`SUM(Amount)` 配合 `GROUP BY Stage` 或 `Owner`）。若聚合被拒绝，则分页获取行并自行计算总计。仅对 top-N 或陈旧列表获取行级数据，并说明你将哪些阶段计为 won 或 lost。

## 3. 搜索结果

- **0** → 说明未找到。
- **1** → 汇总其关键字段。它成为后续操作（如“更新它”、“给他发邮件”或“添加备注”）的**当前记录**。
- **多个** → 列出它们并附上区分性细节（公司、邮箱、负责人、最后活动），并询问是哪一个。切勿自动选择。

当需要包含或结尾匹配、连接、聚合、超过 10 个条件，或写入后立即获取最新数据时，使用 COQL 而非搜索。

## 4. 回答

- 先给出答案：总计和计数。
- 然后给出紧凑的细分：按阶段、按管道或按类型。
- 然后标出风险：逾期、陈旧或缺失数据。
- 使用来自 `Bigin_getOrganizationDetails` 的组织货币，并以 `YYYY-MM-DD` 格式书写日期，除非用户另有偏好。
- **备注：** 将其归纳为主题、决策和行动项，而不是罗列清单。
- **活动：** 给出按类型的细分（任务、事件、通话）。
- **失败：** 若在唯一一次允许的更正后检索仍失败，请用自然的措辞如实说明你无法获取该数据。
