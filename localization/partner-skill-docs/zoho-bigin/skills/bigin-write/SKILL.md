---
name: bigin-write
description: 创建、更新、批量更新或 upsert Bigin 记录（联系人、公司、任意团队管道中的交易、产品、任务、事件、通话）、添加或编辑备注、创建或应用标签，并将通话或会议记录转化为备注、通话记录、交易更新和跟进任务——先解析元数据，仅在明确 YES 后执行。在用户想要更改 Bigin 数据或记录一次互动时使用，包括“如果 John 还不在就添加他”、“将 Acme 纳入入职管道”，或粘贴的通话记录。
---

# 更改 Bigin 数据

你创建并更新 Bigin 数据。你仅将搜索和获取作为内部步骤；向用户展示数据属于 `bigin-read`。**没有一次明确的 YES，不写入任何内容。**

在对话中首次写入之前，阅读 [Bigin 数据模型](../bigin-read/references/data-model.md)。在任何 Task、Event 或 Call 之前，还要阅读 [references/activity-fields.md](references/activity-fields.md)。

切勿猜测模块名、字段 API 名、记录 ID、查找 ID、布局 ID、阶段、管道或选项列表值。

## 意图

| 意图 | 工具 |
|---|---|
| **创建** | `Bigin_addRecords` |
| **更新** | 单条记录用 `Bigin_updateSpecificRecord`；多条记录用 `Bigin_updateRecords`，且仅在用户确认范围后 |
| **UPSERT**（“不存在则创建，存在则更新”） | `Bigin_upsertRecords`，用于 Contacts、Accounts 和 Products。`duplicate_check_fields` **必需**：Contacts→`Email`，Accounts→`Account_Name`，Products→`Product_Code`（若已设置，否则 `Product_Name`），除非用户指定其他唯一字段。不要 upsert Tasks、Events 或 Calls（无自然唯一键）。对于交易，不要基于 `Deal_Name` 进行 upsert（诸如“Renewal”的名称会在公司和管道之间重复）：在团队管道内搜索，然后按 ID 更新或创建。 |
| **备注** | 创建：`Bigin_addNotesToSpecificRecord`（`Note_Content` 必需，`Note_Title` 可选）。编辑：`Bigin_updateNotes`，发送 `{"id", ...changed fields}`。若备注 id 未知，从 `Bigin_getNotesFromSpecificRecord` 获取。 |
| **标签** | `Bigin_addTagsToSpecificRecord` / `Bigin_addTagsToMultipleRecords`。若标签尚不存在，先用 `Bigin_addNewTags` 创建它。要移除标签，使用 `Bigin_removeTagsFromSpecificRecord` / `Bigin_removeTagsFromMultipleRecords`。 |
| **关联** | `Bigin_updateRelatedListRecords` 用于关联现有记录（例如将联系人关联到交易） |
| **删除** | 不属于正常工作流。见下文*高影响工具*。若用户未明确要求删除，提供最接近的受支持操作，例如更新状态。 |

### 高影响工具（仅限明确请求）

仅在用户要求该确切操作时使用这些工具。照常在确认摘要中展示受影响的记录；Antigravity 也可能为其显示自己的确认提示。
- **删除：** `Bigin_deleteSpecificRecord`、`Bigin_deleteRecords`、`Bigin_deleteNotes`、`Bigin_deleteSpecificNote`、`Bigin_deleteSpecificAttachment`、`Bigin_deleteProfilePhoto`、`Bigin_deleteTag`。
- **所有权与取消关联：** `Bigin_changeRecordOwner`、`Bigin_changeMultipleRecordOwners`、`Bigin_delinkSpecificRelatedListRecord`、`Bigin_delinkMultipleRelatedListRecords`。
- **标签管理：** `Bigin_updateSpecificTag`、`Bigin_updateMultipleTags`。
- **Webhooks（管理员）：** `Bigin_enableNotifications`、`Bigin_updateNotificationDetails`、`Bigin_updateOrDisableANotifDetails`、`Bigin_disableNotifications`。
- **用户管理**（`Bigin_addNewUser`、`Bigin_updateSpecificUser`、`Bigin_updateUsersData`、`Bigin_deleteUser`）超出 CRM 工作范围。除非用户明确要求，否则引导用户前往 Bigin 的管理员设置。

## 创建流程

1. **解析模块。** 非标准标签是交易模块内的团队管道。静默解析它；切勿询问“那是交易吗？”。
2. **获取元数据**（按模块缓存）。对于交易，使用团队管道的布局。
3. **对来自元数据的每个字段应用字段规则：**
   - 只读字段（`api_create` 和 `api_update` 均为 false，例如 `Created_By`、`Modified_Time`、`Full_Name`、`Last_Activity_Time`）永不出现在载荷中。
   - `api_create=false` → 永不出现在创建中。`api_update=false` → 永不出现在更新中。
   - `system_mandatory=true` → 必需。若该值无法解析，询问该**一个**字段。
   - 切勿包含元数据排除的字段，即使用户提到了它。
4. **静默地先解析再询问。** 不要宣告查找。
   - 重复或存在性检查：`Bigin_searchRecords`。
   - 阶段：按含义将用户的措辞匹配到最接近的 `actual_value`。
   - 负责人：名称 → id，通过 `Bigin_getNewUsers`（`AllUsers`/`ActiveUsers`，匹配 `full_name`）。若未给出负责人，省略 `Owner`；它默认为当前用户。
   - 公司和联系人查找：`Bigin_searchRecords`。
   - 仅询问确实无法解析的值，一次一个问题。
5. **重复检查（仅 Contacts 和 Accounts）**，当载荷包含邮箱或电话时。搜索一次。若存在匹配，展示它并询问是否改为更新它。
   - **条件创建**（“如果不存在就添加 X”）是同一流程：一次搜索，然后一次确认。
   - 复用本次对话中较早的搜索结果，切勿单独询问“我可以添加它吗？”。
6. **交易（`Pipelines`）：**
   - 设置 `Sub_Pipeline`；它必需。若未给出，使用团队管道的默认子管道；若没有，则询问。
   - 设置属于该子管道的 `Stage`。若未给出，使用其第一个阶段。
   - 始终将 `Pipeline: {"name", "id"}` 设置为已解析的团队管道，以免交易意外落入默认管道。
   - `Closing_Date` 为 `YYYY-MM-DD`；`Amount` 为数字。
   - 将 `Contact_Name` 和 `Account_Name` 关联为 `{"id"}`。
7. **活动：** 遵循 `references/activity-fields.md`，包括链接字段配对（通话仅关联到交易或公司；联系人放在其自己的字段中）。
8. **校验**日期、日期时间（带偏移）、选项列表、查找和数字。将相对日期转换为绝对日期。
9. **确认**，使用下方格式。仅在 **YES** 后调用工具，载荷以数组形式传入。

## 更新流程

1. 解析模块和元数据。
2. 用 `Bigin_searchRecords` 找到目标；其结果携带当前值。若对话早些时候有当前记录，则改复用它。若多条记录匹配，询问是哪一条。
3. 仅对**已更改的字段**展示 `Field: current → new`，并附上记录 ID。
4. 确认，然后写入。

**交易：**
- 新的 `Stage` 必须属于该记录的团队管道。
- “移动到管道 X”意味着新的 `Pipeline`（团队管道）**加上**对其有效的 `Sub_Pipeline` 和 `Stage`。在同一团队管道内移动仅更改 `Sub_Pipeline` 和 `Stage`。
- `$append_values` 会向多选字段追加而非替换。

## 多操作请求

**通话或会议记录**（用户粘贴记录、说刚见完客户，或要求记录一次互动）：遵循 [references/call-notes.md](references/call-notes.md)。

分解整个请求，并在**一个**摘要中确认**所有**操作。例如，“将 Acme 的 John Mathew 纳入入职管道，并注明他需要 L1 支持”变为：
1. 创建联系人（在重复检查之后）；
2. 在该团队管道中创建交易，关联到联系人和公司；
3. 添加备注。

在单次 YES 之后按依赖顺序执行。

## 确认格式（每个变更集一次）

```
Action: Create deal (+ note)
Module / pipeline: Pipelines → Customer Onboarding › Standard (stage: Kickoff)
Records: Contact John Mathew (existing, 6685838000001234001)
Payload: Deal_Name "Acme – Onboarding", Closing_Date 2026-11-15, Amount 12,000 …
Checks: duplicate search done · stage from pipeline metadata · dates absolute
Please confirm to proceed — YES or NO?
```

- “继续”或“做吧”**只有在**摘要已展示后才算作 YES。
- 若用户实质性更改了载荷，请再次展示。

## 写入之后

- 报告创建或更改的每个记录及其 ID。它成为当前记录。
- **出错时：** 识别失败的字段或值。若修复是确定的，更正它，若载荷实质性更改则重新确认，并重试**一次**。否则如实解释。
  - 日期时间上的 `INVALID_DATA` 通常意味着缺少偏移。
  - `MANDATORY_NOT_FOUND` 通常意味着缺少必填字段或未配对的 `Related_To` / `$related_module`。
- 除非用户要求，切勿暴露原始错误或载荷内部细节。
