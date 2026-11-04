---
name: canva-bulk-create
description: 使用带自动填充字段的品牌模板从表格数据批量创建 Canva 设计，每行产出一个设计。当用户说“从这个 CSV 批量创建设计”、“每行生成一个设计”、“为每个产品创建一个设计”、“从模板批量生成”，或“从电子表格自动填充模板”时使用。接受任何表格数据来源——上传的文件、粘贴的表格、JSON 或 URL。
---

# Canva 批量设计创建

通过用数据标签自动填充品牌模板，为每行数据创建一个 Canva 设计。

## 工作流

### 步骤 1：获取数据

接受用户以任何形式提供的数据，并提取一个带具名列的行列表：

- **上传的文件**：读取文件并提取表头和行
- **粘贴的数据**：直接从聊天中解析 markdown 表格、制表符分隔值或 JSON 数组
- **URL**：抓取该资源并将响应解析为表格数据

若未提供任何数据，请用户以对他们方便的任意格式分享。

解析后，向用户展示：
- 找到的列表头
- 行数（= 将创建的设计数）
- 前几行的预览

### 步骤 2：选择品牌模板

若用户未指定模板，搜索支持自动填充的模板：

```
Canva:search-brand-templates  dataset=non_empty
```

展示结果并请用户选择一个。若他们已命名或描述了模板，则用该查询搜索。

### 步骤 3：检查模板 Schema

```
Canva:get-brand-template-dataset  template_id=<selected_id>
```

这会返回模板所期望的字段名称和类型（文本、图像、图表）。

### 步骤 4：将 CSV 列映射到模板字段

向用户呈现映射表：

| 模板字段 | 类型 | 匹配的 CSV 列 | 备注 |
|---|---|---|---|
| `product_name` | text | `Product Name` | 自动匹配 |
| `price` | text | `Price` | 自动匹配 |
| `hero_image` | image | *(无)* | 无匹配——图像字段需要素材 ID |

**匹配规则：**
- 在 CSV 表头与模板字段名之间做不区分大小写的模糊匹配
- 文本字段可直接从 CSV 字符串值填充
- 图像字段需要 Canva 素材 ID——见下方**图像字段处理**
- 图表字段需要结构化数据——视为高级，向用户请求澄清

在继续之前与用户确认映射，尤其是存在未映射字段或模糊匹配时。

#### 图像字段处理

CSV 有两种方式为图像类型的模板字段提供图像：

**模式 A——CSV 有 Canva 素材 ID 列**（例如 `image_asset_id`）：
在 `autofill-design` 调用中直接使用素材 ID 值：
```json
{ "image": { "type": "image", "asset_id": "<value from CSV column>" } }
```

**模式 B——CSV 有图像 URL 列**（例如 `image_url`）：
URL 不能直接传给 `autofill-design`。先使用 `Canva:upload-asset-from-url` 将每个 URL 上传到 Canva，捕获返回的素材 ID，然后在自动填充调用中使用它。请在创建该行设计之前立即执行上传，以便失败保持在局部。

**模式 C——CSV 中没有图像列：**
询问用户是跳过图像字段（保留模板默认图像）还是中止。跳过是安全的——只需从 `data` 载荷中完全省略图像键。

### 步骤 5：批量创建——每行一个设计

遍历每个 CSV 行，并为每个调用 `Canva:autofill-design`。**顺序**调用它们，而不是一次性全部调用——API 可能有速率限制，顺序调用更易调试。

对每一行：

1. 若该行有图像 URL 列（模式 B），先调用 `Canva:upload-asset-from-url` 获取 Canva 素材 ID。
2. 根据已确认的字段映射构建 `data` 载荷：

```json
{
  "text_field_name": { "type": "text", "text": "<value from CSV>" },
  "image_field_name": { "type": "image", "asset_id": "<asset ID>" }
}
```

3. 使用模板 ID、数据载荷以及使用行号或是有意义的列值（例如 `"Bulk Design - Row 3 - <identifier>"`）的描述性标题调用 `Canva:autofill-design`。

边进行边跟踪结果：

```
Row 1 / 50: Created — <design_url>
Row 2 / 50: Created — <design_url>
Row 3 / 50: Failed — <error>
```

### 步骤 6：报告结果

处理完所有行后，汇总：

- 尝试的总行数
- 成功项（附链接）
- 失败项（附行号和原因）

提议保存一份汇总 CSV，列为：`row`、`status`、`design_url`、`error`。

## 说明

- 自动填充需要 Canva Enterprise 套餐。
- 对于大型 CSV（50+ 行），事先警告用户这将发出 N 次 API 调用，可能需要一段时间。提议先在前 3 行上做一次测试运行，再继续完整批次。
- 若某些行失败，继续处理其余行——不要中止整个批次。
- 跳过所有已映射字段均为空的行，并向用户提示这些行。
- 若无 CSV 列匹配某个必填模板字段，请用户确认使用哪一列，或是否跳过该字段。
- 模板字段名在 API 中区分大小写——使用 `get-brand-template-dataset` 中的确切键。
- 没有“撤销批量创建”——在开始大型运行前提醒用户。
- 以此方式创建的设计是完整的 Canva 设计，用户可在其账户中进一步编辑。
