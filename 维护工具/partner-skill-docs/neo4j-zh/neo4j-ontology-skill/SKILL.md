---
name: neo4j-ontology-skill
description: 编写并验证 Neo4j Ontology Graph Specification（本体图规范）文档。适用于以 YAML 或 JSON 编写或编辑本体、定义节点和带属性的关系、Neo4jType 数据类型、约束（key/unique/must_exist）、标签和端点基数，或依据实时解析的规范 schema 验证本体文档。不处理 Cypher 或将本体加载到数据库 —— 请使用 neo4j-cypher-skill。不涵盖通用图数据建模建议 —— 请使用 neo4j-modeling-skill。
compatibility: uv required to run scripts/validate.py (PEP 723 inline deps)
version: 1.0.1
---

## 何时使用

- 根据领域描述编写本体文档（Neo4j Ontology Graph Specification）
- 编辑现有的本体 YAML/JSON：节点、关系、属性、类型、约束、基数、扩展
- 依据规范 schema 验证本体文档

## 何时不使用

- **Cypher 查询，或将本体加载/应用到数据库** → `neo4j-cypher-skill`（本体的 Cypher 过程尚不存在 —— 属于那边的后续工作）
- **通用图建模建议（节点 vs 属性 vs 标签、反模式、超级节点）** → `neo4j-modeling-skill`

---

## 编写流程

### 第 1 步 —— 收集领域意图

识别正在建模的内容：实体类型（节点）、连接（关系 + 方向）、每个元素的属性、标识键、必填字段、基数。如果领域或所需形态不清晰，询问用户正在建模什么以及本体必须回答哪些问题。不要猜测领域。

### 第 2 步 —— 起草文档

按用户偏好选择 YAML 或 JSON；默认 YAML（更易读）。应用下面的核心要点。当需要超出最小示例的内容时，加载 [references/format-reference.md](references/format-reference.md)（完整的 `labels` 对象、约束对象、扩展、完整数据类型语法）。

### 第 3 步 —— 验证

```bash
# From the skill directory:
uv run scripts/validate.py <document.{yaml,yml,json}>
# From the repo root:
uv run neo4j-ontology-skill/scripts/validate.py <document.{yaml,yml,json}>
```

退出码 0 = 有效 · 退出码 1 = schema 违规（每个字段路径一行）· 退出码 2 = 解析/读取/获取错误。PEP 723 脚本 —— `uv` 自行解析依赖（jsonschema、pyyaml）。

验证器实时获取 schema —— 没有任何内置副本。解析顺序：`--schema <path-or-url>`（显式，无回退）→ 当文档自身的 `schema` 字段为 URL 时使用它 → 已发布的 `current` 别名 → 过渡性的 repo raw 回退。文档的 `schema` URL 决定其依据哪个版本验证：将其设为你正在编写的版本的已发布版本化 URL（旧版本依据其已发布的 schema 验证）。

### 第 4 步 —— 修复并重新验证

修复每个报告的错误；重新运行第 3 步。重复直到退出码为 0。验证是强制性的 —— 绝不在退出码非零的情况下将本体视为完成。

---

## 核心要点

- 必需的根字段：`schema`、`id`（唯一本体 id 字符串）、`version`（STRING —— 用户定义的修订标签；在 YAML 中加引号：`version: "1"`）。根拒绝未知字段（`additionalProperties: false`）。
- `schema` 值：正在编写的版本的已发布 URL，例如 `https://neo4j.com/docs/ontology-graph-spec/1.0.0/schema.json`。根键是普通的 `schema`，而非 `$schema`。
- `nodes` / `relationships` 是以**本地 ID**（而非标签/类型）为键的映射。标签位于 `label` 或 `labels.identifier`；关系类型位于 `type`。端点引用节点 id（`from.node` / `to.node`）—— 标签重命名绝不会破坏引用。
- `label: X` 是 `labels: {identifier: X}` 的简写。仅在存在 `implied` 或 `optional` 标签时才使用完整的 `labels` 对象。
- 类型标记严格取自 Neo4jType 枚举 —— 区分大小写。标记包括 `STRING`、`INTEGER`、`FLOAT`、`BOOLEAN`、`DATE`、`DURATION`、`POINT`、`UUID`；时间标记包含空格（`ZONED DATETIME`、`LOCAL TIME`）；参数化标记使用尖括号（`LIST<STRING>`、`VECTOR<FLOAT32>`）。`UUID` 和 `VECTOR<...>` 没有 LIST 分支。不支持联合类型，不支持嵌套列表。`dimension`（integer|null）位于属性上，与 VECTOR 类型配合使用。
- 约束 —— 两种形式：
  - 属性上的标志：`key: true`、`unique: true`、`must_exist: true`（snake_case —— 而非 `mustExist`）。单属性简写；`key` = 唯一 + 存在，符合 Neo4j 键约束语义。
  - 对象形式：`constraints` 是映射 id → 约束对象 `{type: EXISTS|KEY|PROPERTY_TYPE|UNIQUE, properties: [p1, ...], name: optional}` —— 复合约束（≥ 2 个属性）和可命名约束需要它。`properties` 必须引用**同一元素**上声明的属性。
- 端点基数：`count` 精确，或 `min_count`/`max_count` 范围；缺省 = 不受约束（0..*）。
- 扩展：每个元素有固定的 `extensions` 形态 —— 节点：`indexes`/`display`/`custom`；关系：`indexes`/`custom`；根：`tables`/`mappings`/`custom`；标签/属性/约束/索引：仅 `custom`。拒绝未知扩展键。`custom` 是自由形式 —— 任意所有者数据，绝不由规范 schema 验证。
- 缺省即无 —— 绝不要写空映射/列表（`properties: {}`、`aliases: []`、`custom: {}`）；应省略它们。

## 最小示例

`library.ontology.yaml` —— 2 个节点，1 个关系：

```yaml
schema: "https://neo4j.com/docs/ontology-graph-spec/1.0.0/schema.json"
id: library
version: "1"
name: Library
nodes:
  author:
    label: Author
    properties:
      id: { type: STRING, key: true }
      name: { type: STRING, must_exist: true }
  book:
    label: Book
    properties:
      isbn: { type: STRING, key: true }
relationships:
  wrote:
    type: WROTE
    from: { node: author, max_count: 1 }
    to: { node: book }
```

经 `scripts/validate.py` 验证退出码为 0。完整的 YAML+JSON 可运行示例见 [references/format-reference.md](references/format-reference.md)。

---

## 参考资料

按需加载：

- [references/format-reference.md](references/format-reference.md) —— 完整字段参考：每个节点/关系/属性/端点字段、`labels` 对象、约束对象、扩展形态、数据类型语法、易错点、YAML+JSON 示例
- 已发布 schema 基址：`https://neo4j.com/docs/ontology-graph-spec/` —— 每个规范版本不可变的 `/<version>/schema.json`，以及移动别名 `/current/schema.json`

## 规范状态

已发布：上述 ONT-31 URL 已上线，是规范的 schema 来源。如果已发布的 host 不可达，验证器会回退到来自 `neo4j/ontology-graph-spec` main 分支的 raw schema（会移动）。本体 Cypher 过程尚不存在；将本体应用到数据库超出此处范围。

---

## 检查清单

- [ ] 存在根字段 `schema`、`id`、`version`；`version` 是带引号的字符串；`schema` = 普通 `schema` 键下的已发布版本化 URL
- [ ] 无未知根字段；无 `$schema`
- [ ] `nodes`/`relationships` 以本地 id 为键；关系的 `from`/`to` 引用节点 id
- [ ] 每个节点都有 `label` 或 `labels.identifier`
- [ ] 类型标记严格取自 Neo4jType 枚举（区分大小写；带空格的时间标记）；VECTOR 类型时 `dimension` 位于属性上
- [ ] 标志仅用于单属性约束；复合/命名使用对象形式（`type` ∈ EXISTS/KEY/PROPERTY_TYPE/UNIQUE）；约束的 `properties` 存在于同一元素上
- [ ] 扩展键匹配元素的固定形态；任意数据仅放在 `custom` 下
- [ ] 未写空映射/列表
- [ ] `uv run scripts/validate.py <file>` 退出码为 0（每个报告的错误都已修复并重新验证）
