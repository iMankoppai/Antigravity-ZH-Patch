---
name: mongodb-qe-size-estimation
license: Apache-2.0
metadata:
  version: "1.0.0"
description: >
  估算在启用可查询加密（Queryable Encryption，QE）的集合中加密字段对存储和内存的影响。
  请勿用于使用客户端字段级加密（Client-Side Field Level Encryption，CSFLE）而非 QE 的集合。
---

# mongodb-qe-size-estimation

## 通用说明

- **关键：绝不要索取或接受示例数据。** QE 是一项加密功能，旨在保护敏感信息。不要索取示例数据，如果被提供，出于安全原因应拒绝。告知用户你不能接受示例文档，但可以接受加密 schema 作为输入，以查看哪些字段被加密、哪些允许查询，以及这些查询设置是什么。
- 任何形如（LLM Note: <content>）的括号内容仅供 LLM 使用。不要将其保存到 qe-sizing-calculations.md，也不要向用户提及。
- 语气：简洁，不要闲聊。除非某个步骤明确要求，不要重复先前交流中的信息。
- 除非步骤中明确指定，不要向文件写入任何内容。
- 本技能依赖问答流程来获取所有必需的输入。对于步骤 2-5，只要用户在提供有效输入，你的响应就应同时包含对输入的确认以及下一个问题。
- 用户可能会通过输入多个输入来推动流程。如果输入无法清晰地映射到某个字段及其配置，请请求澄清。否则验证它们，若有效则接受。
- 本技能目前没有针对 range 查询的公式，因此虽然它接受兼容 BSON 类型的 "range" 查询配置，但会用 0 作为估算值。


### 定义

- **field（字段）** 就本技能而言，“field”指启用 QE 的集合中，MongoDB 文档里的一个加密字段。
- **entry（条目）** 对于未建索引的字段，即为字段名。对于启用了一种或多种查询类型的字段，即为字段名与其已启用查询类型的组合。同时启用了前缀（prefix）和后缀（suffix）查询的字段只有一个条目，查询类型为 "prefix and suffix"。
- **unindexed（未建索引）** 描述字段未启用任何查询类型的状态；若使用加密 schema，则表现为缺少 "queries" 键。
- **indexed（已建索引）** 描述字段已启用查询的状态，且特定于查询类型。启用了相等（equality）查询的字段，即为针对相等查询建了索引。


### 验证

根据以下规则验证用户的输入（无论是手动输入还是通过加密 schema 提供）：

  加密字段可以是 "unindexed"，即未启用任何查询类型。BSON 类型为 object 或 array 的字段*仅*支持未建索引的加密，不过其他 BSON 类型也可以未建索引。除此之外，根据字段 BSON 类型，允许的查询类型为：

  - "equality"：除 object、array、decimal、double 之外的任意 BSON 类型
  - "range"：int、long、date、decimal、double
  - "prefix"、"suffix"、"substring"：仅限 string

  字符串字段可以同时启用 "prefix" 和 "suffix"，此时 "queries" 可以是包含两个对象的数组。这是一个字段针对多种查询类型建索引的唯一有效情形。

  不允许其他 BSON 类型 + 查询类型的组合。

  不要接受诸如 "suffixPreview" 之类的 "preview" 查询类型。它们来自这些查询类型早期的 Public Preview 版本，因此其 GA 版本的容量计算公式并不适用。

如果用户的输入违反上述任何规则，请拒绝。如果用户未指定 BSON 类型，只需检查每个字段要么未启用任何查询类型、要么恰好启用一个有效查询类型、要么恰好启用两个（prefix 和 suffix）。逐一列举验证失败项，列出允许的组合，在用户提供有效输入之前不要继续。


# 步骤

## 1. 准备工作目录

在操作系统临时目录（$TMPDIR，若未设置则为 /tmp）中创建一个空的 qe-sizing-calculations.md 文件。如果该位置已存在 qe-sizing-calculations.md 文件，请告知用户并请求确认删除它，再为新的计算创建新文件。

## 2. 说明目的并询问输入偏好

陈述：“本技能计算在集合上启用可查询加密所带来的最大存储影响。如果你想核对计算过程或查看每个字段的数值，相关数值会保存到 <path to qe-sizing-calculations.md> 文件中。请注意，对加密字段使用 prefix、suffix 和 substring 查询需要 MongoDB 9.0，早期版本不支持。

所有数值均为最坏情况。实践中你可能会看到更小的存储或内存影响。

你希望手动提供字段信息，还是使用加密 schema 文件？”

如果用户选择加密 schema，请要求其以粘贴内容或文件路径的方式提供，并期望 JSON 格式。根据本技能的“验证”一节验证该 schema。如果 schema 有效但包含启用了 "range" 查询的字段，请告知用户这些字段没有可用的计算公式，因此其影响按 0 估算。

## 3. 获取文档数量

询问用户该集合中有多少个文档包含加密字段。如果他们不知道，安全的默认值是该集合中文档的总数。将此值保存到 qe-sizing-calculations.md，格式为：

**N:** <value>

## 4. 获取条目数量

- 如果用户选择手动输入，询问：你要加密多少个不启用查询的字段？
- 如果用户选择加密 schema，统计未启用查询的加密字段数量。

将此值保存到 qe-sizing-calculations.md，格式为：

**numUnindexed:** <number of unindexed encrypted fields>

- 如果用户选择手动输入，询问：有多少个加密字段启用了查询？
- 如果用户选择加密 schema，统计启用查询的字段数量。

将此值保存到 qe-sizing-calculations.md，格式为：

**numIndexed:** <number of encrypted fields indexed for queries>

将 numUnindexed 与 numIndexed 之和保存到 qe-sizing-calculations.md，格式为：

**numEntries:** <sum of numUnindexed and numIndexed>

## 5. 获取每个字段的输入

向 qe-sizing-calculations.md 写入一个章节标题：

== FIELD VALUES ===============================================================

在你获取信息的过程中，按以下格式写入 qe-sizing-calculations.md，省略不适用的行。对于未建索引的字段，这意味着省略 Query Type。

**<Field Name>** <用户提供的名称；若取自加密 schema，则为点号表示法的 "path" 值>
**Query Type:** <equality、range、prefix、suffix、substring 或 "prefix and suffix">
**mlen:** <若 Query Type 为 substring 则包含。2-50（含）之间的整数>
**lb:** <若 Query Type 为 "prefix"、"suffix" 或 "substring" 则包含。prefix 和 suffix 查询为 1+ 的整数，substring 查询为 2+>
**ub:** <若 Query Type 为 "prefix"、"suffix" 或 "substring" 则包含。prefix 和 suffix 查询为 1+ 的整数，substring 查询为 2-6>
**lb_prefix:** <若 Query Type 为 "prefix and suffix" 则包含。1+ 的整数>
**ub_prefix:** <若 Query Type 为 "prefix and suffix" 则包含。1+ 的整数>
**lb_suffix:** <若 Query Type 为 "prefix and suffix" 则包含。1+ 的整数>
**ub_suffix:** <若 Query Type 为 "prefix and suffix" 则包含。1+ 的整数>
**v:** <若 Query Type 为 range 则省略，否则包含。表示该字段未加密值的平均字节长度的整数>

- 如果用户提供了加密 schema，执行一次：
  - 为每个未建索引的字段向 qe-sizing-calculations.md 添加一个条目，省略 "Query Type" 行。
  - 如果字段同时启用了 prefix 和 suffix 查询，无论顺序如何，都将其 "Query Type" 写为 "prefix and suffix"。
  - 为每个启用查询的字段添加一个条目。按如下方式将每个 "queries" 对象中的键映射到字段值，省略所有未列出的键：
    - strMaxLength（仅 substring）-> mlen
    - strMinQueryLength -> lb（若字段只有单一查询类型）。如果字段同时启用了 prefix 和 suffix 查询，则 prefix 查询的 strMinQueryLength 为 lb_prefix，suffix 查询的 strMinQueryLength 为 lb_suffix。
    - strMaxQueryLength -> ub（若字段只有单一查询类型）。如果字段同时启用了 prefix 和 suffix 查询，则 prefix 查询的 strMaxQueryLength 为 ub_prefix，suffix 查询的 strMaxQueryLength 为 ub_suffix。

- 如果用户未提供加密 schema，则对每个字段执行：
  - 只有当用户提供了字段的 BSON 类型时，才根据允许的查询类型验证 BSON 类型。否则，不要询问或验证字段的 BSON 类型。
  - 询问字段名，以及它是未建索引还是启用了查询（LLM Note: 如果它有查询类型，有效选项为："equality"、"range"、"prefix"、"suffix"、"substring" 或 "prefix and suffix"。拒绝其他值或组合。如果用户指定 "range"，警告他们没有可用于计算的公式）
  - 如果用户仅为一个同时启用 prefix 和 suffix 查询的字段提供单个下界和上界值，则将下界同时用于 lb_prefix 和 lb_suffix，将上界同时用于 ub_prefix 和 ub_suffix。
  - 验证输入。

对每个字段执行以下操作：

  检查下方列表，向用户询问尚未填充的值。将所有值写入 qe-sizing-calculations.md 文件。

  **mlen:**（LLM Note: 仅当未提供 schema 且 Query Type 为 substring 时包含）Max Length，字符串允许的最大长度。
  **lb:**（LLM Note: 仅当未提供 schema 且 Query Type 为 "prefix"、"suffix" 或 "substring" 时包含）Lower Bound，可搜索的最小字符数。
  **ub:**（LLM Note: 仅当未提供 schema 且 Query Type 为 "prefix"、"suffix" 或 "substring" 时包含）Upper Bound，可搜索的最大字符数。
  **lb_prefix:**（LLM Note: 仅当未提供 schema 且 Query Type 为 "prefix and suffix" 时包含）prefix 查询的 Lower Bound，可搜索的最小字符数。
  **ub_prefix:**（LLM Note: 仅当未提供 schema 且 Query Type 为 "prefix and suffix" 时包含）prefix 查询的 Upper Bound，可搜索的最大字符数。
  **lb_suffix:**（LLM Note: 仅当未提供 schema 且 Query Type 为 "prefix and suffix" 时包含）suffix 查询的 Lower Bound，可搜索的最小字符数。
  **ub_suffix:**（LLM Note: 仅当未提供 schema 且 Query Type 为 "prefix and suffix" 时包含）suffix 查询的 Upper Bound，可搜索的最大字符数。
  **v:**（LLM Note: 若 Query Type 为 range 则跳过，因为对此没有计算公式；否则每个字段需要一次）。该字段未加密值的平均字节长度。如果用户提供的是字符长度，视为等价接受。

  根据本步骤开头的格式片段验证取值。验证 lb ≤ ub ≤ mlen（若存在）。验证 lb_prefix ≤ ub_prefix 且 lb_suffix ≤ ub_suffix（若存在）。如果某个值超出允许范围，拒绝它并告知用户。没有有效值就不要继续。
  
  如果 mlen < v，警告用户完整字段值不可查询，但仍将其视为有效接受。

重复上述过程，直到你在 qe-sizing-calculations.md 中填充了完整的条目数量 numEntries。

## 6. 向 qe-sizing-calculations.md 添加公式和结果

本步骤将计算信息（包括中间步骤）填充到文件中。

对于 qe-sizing-calculations.md 中的每个条目：

1. 将以下各行追加到 qe-sizing-calculations.md 的 FIELD VALUES 部分中每个现有条目之后。务必逐字复制公式模板，以避免级联问题。执行计算时，请借助可用的数学解析工具，并确保运算顺序正确。

  - 对于没有 Query Type 的字段：

    **T:** 0
    **Document Storage (bytes):** <执行计算：71 + ceil((v+6)/16) * 16>

  - 对于 Query Type 为 "equality" 的字段：

    **T:** 1
    **Document Storage (bytes):** <执行计算：1.2 * (255 * T + 122 + ceil((v + 6) / 16) * 16)>

  - 对于 Query Type 为 "range" 的字段，目前没有公式，因此记录一个值为 0 的条目：

    **T:** 0
    **Document Storage (bytes):** 0

  - 对于 Query Type 为 "prefix" 或 "suffix" 的字段：

    **T formula:** T = 1 + (ub - lb + 1)
    **T calculation:** <已用该字段的取值填充所有占位符、但尚未计算的 T 公式模板>
    **T:** <执行 "T calculation" 中的计算，并将结果写在此处>
    **Document Storage (bytes):** <执行计算：1.2 * (255 * T + 122 + ceil((v + 6) / 16) * 16)>


  - 对于 Query Type 为 "prefix and suffix" 的字段：
  
    **T formula:** T = 1 + (ub_prefix - lb_prefix + 1) + (ub_suffix - lb_suffix + 1)
    **T calculation:** <已用该字段的取值填充所有占位符、但尚未计算的 T 公式模板>
    **T:** <执行 "T calculation" 中的计算，并将结果写在此处>
    **Document Storage (bytes):** <执行计算：1.2 * (255 * T + 122 + ceil((v + 6) / 16) * 16)>

  - 对于 Query Type 为 "substring" 的字段：

    **T formula:** T = 1 + (ub - lb + 1) * (2 * mlen + 2 - ub - lb) / 2
    **T calculation:** <已用该字段的取值填充所有占位符、但尚未计算的 T 公式模板>
    **T:** <执行 "T calculation" 中的计算，并将结果写在此处>
    **Document Storage (bytes):** <执行计算：1.2 * (255 * T + 122 + ceil((v + 6) / 16) * 16)>

2. 静默复核一遍，确认你刚添加的信息使用了正确的 T 公式或静态值，以及 T calculation 的正确取值，然后继续。

## 7. 计算索引存储、总磁盘存储和内存

这些值是集合级的，按所有条目汇总计算。

在 qe-sizing-calculations.md 文件的末尾，静默写入以下各行：

== COLLECTION-LEVEL TOTALS ====================================================
**N:** <将文件顶部的 N 值复制到本节，便于阅读>
**T_Total:** <所有 T 值之和。>
**Index Storage (bytes):** <执行计算：1.2 * (67 * T_Total + 640)>
**Total Disk Storage (bytes):** <执行计算：N * (Index Storage + (所有 Document Storage 值之和))>
**Memory (bytes):** <执行计算：N * (52 * T_Total + 17)>

## 8. 汇总总结果并报告结论

输出以下内容，并包含单位：

**Total Disk Storage Impact:** <qe-sizing-calculations.md 中的 Total Disk Storage 值，转换为十进制 GB（1000³ 字节）>
**Required Memory:** <qe-sizing-calculations.md 中的 Memory 值，转换为二进制 GiB（1024³ 字节）>
**Fields by Impact (descending):** <将 qe-sizing-calculations.md 中所有字段按 T 降序排序，然后按如下格式列出：名称（<查询类型，或 unindexed>）：T>

如果加密 schema 或手动输入包含启用了 range 查询的字段，列出这些字段并提醒用户其影响未进行计算。

## 9. 解读结果

给出建议。不要提供用户已明确拒绝的任何建议，例如当用户坚持某字段需要允许 substring 查询时，不要建议改用其他查询类型。只提出问题，若某项通过了所有检查就不要提及。如果你建议将某个值改为特定数字，请用建议的取值填充该查询类型在步骤 6 中的 T 公式模板，用可用的数学工具计算，并只引用该结果。

- （LLM Note: 仅当启用 substring 查询的字段数量大于 floor(5000 万/N) 时才执行此项检查。借助可用的数学解析工具以确保计算正确）告知用户将可做 substring 查询的字段数量限制为不超过：floor(5000 万/<集合中的文档数>)。告知他们不要对超过 5000 万文档的集合使用 substring 查询。
- （LLM Note: 仅当存在一个或多个可做 substring 查询的字段时才执行此项检查）检查为 substring 建索引的字段是否可能更适合改用 prefix 或 suffix 查询，并向用户建议。例如，针对加密 "name" 字段的查询常常可以用 prefix 代替 substring，不过对于连字符姓氏等情况这确实存在缺点。
- （LLM Note: 仅当这些建议适用于用户的输入，且改动不会使修改后的值超出允许范围时才给出）告知用户考虑提高 lb、降低 ub 或降低 mlen 值。

同时告知用户 qe-sizing-calculations.md 文件的路径，并询问他们是否想查看数据或删除临时文件。提醒他们该临时文件包含加密字段的名称及其平均明文长度，完成后应删除。
