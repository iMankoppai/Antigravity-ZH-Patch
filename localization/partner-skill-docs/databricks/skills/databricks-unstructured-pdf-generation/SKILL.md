---
name: databricks-unstructured-pdf-generation
description: "在 Databricks 上构建 RAG / 非结构化文档评估数据集和演示文档（例如用于 Knowledge Assistant）：在本地生成合成 PDF，上传到 Unity Catalog 卷，并为每个文档配上一组用于检索评估的测试问题。"
compatibility: Requires databricks CLI (>= v1.0.0)
metadata:
  version: "0.1.0"
parent: databricks-core
---

# 用于 Databricks 上演示与评估数据集的非结构化文档

生成**合成 PDF 文档 + 配对测试问题**作为驻留于 Unity Catalog 的数据集的工作流，用于 Databricks 上的演示和 RAG / 非结构化文档检索评估。PDF 生成步骤使用标准的本地 HTML → PDF 工具；Databricks 特有的价值在于工作流形态 —— UC 卷布局、配对的问题文件，以及与下游 Databricks 检索 / `ai_extract` / `ai_parse_document` 评估的集成。

## 工作流

1. 将 HTML 文件写入 `./raw_data/html/`（为提速可并行写入多个文件）—— 按领域塑造，以匹配你的检索管道在生产中将看到的那些文档。
2. 使用 `<SKILL_ROOT>/scripts/pdf_generator.py` 将 HTML → PDF（并行转换，封装 `plutoprint`）。
3. 通过 `databricks fs cp` 将 PDF 上传到 Unity Catalog 卷 —— 与你的生产管道将读取的卷形态相同。
4. 生成 `./raw_data/pdf/pdf_eval_questions.json`，将每个文档与检索评估问题配对；这将成为用于 `mlflow.genai.evaluate()` 或类似检索质量评分器的金标准数据集。

> 如果你只需要临时的 PDF（无需 Databricks 工作流），任何 HTML → PDF 工具（`weasyprint`、`wkhtmltopdf`、`playwright pdf`、`plutoprint`）都可直接使用 —— 本技能存在的原因是有 UC 上合成数据集的端到端形态，而非作为通用 PDF 生成器。

> **路径约定：** 下文的 `<SKILL_ROOT>` = 包含此 SKILL.md 的目录。解析为绝对安装路径（例如 `~/.claude/skills/databricks-unstructured-pdf-generation`）。`./raw_data/...` 路径相对于你自己的项目 cwd。

## 依赖

```bash
uv pip install plutoprint
```

## 步骤 1：编写 HTML 文件

```bash
mkdir -p ./raw_data/html
```

将 HTML 文档写入 `./raw_data/html/filename.html`。使用子目录来组织（结构会被保留）。

## 步骤 2：转换为 PDF

```bash
# Convert entire folder (parallel, 4 workers)
python <SKILL_ROOT>/scripts/pdf_generator.py convert --input ./raw_data/html --output ./raw_data/pdf
```

跳过那些 PDF 已存在且比 HTML 新的文件。使用 `--force` 重新转换全部。

## 步骤 3：上传到卷

`databricks fs` 即使对于 UC 卷路径也需要 `dbfs:` scheme 前缀。`-r` 会将源目录的*内容*复制到目标中（源目录名不会被保留），因此请把目标明确命名为 `raw_data/pdf`，以让 PDF 位于卷上它们自己的文件夹中。它们会落在 `raw_data/pdf/` 下 —— 即 `dbfs:/Volumes/my_catalog/my_schema/raw_data/pdf/report.pdf` —— 这样 Knowledge Assistant 或摄取管道就可以指向那一个文件夹。

```bash
databricks fs cp -r --overwrite ./raw_data/pdf dbfs:/Volumes/my_catalog/my_schema/raw_data/pdf
```

## 步骤 4：生成测试问题

创建 `./raw_data/pdf/pdf_eval_questions.json`，包含用于 Knowledge Assistant（KA）或 Supervisor Agent（原名 Multi-Agent Supervisor，MAS）评估的问题。把这个文件与 PDF 一起上传到卷上也没问题 —— 下游智能体可以使用它：

```json
{
  "api_errors_guide.pdf": {
    "question": "What is the solution for error ERR-4521?",
    "expected_fact": "Call /api/v2/auth/refresh with refresh_token before the 3600s TTL expires"
  },
  "installation_manual.pdf": {
    "question": "What port does the service use by default?",
    "expected_fact": "Port 8443 for HTTPS, configurable via CONFIG_PORT environment variable"
  }
}
```

这个 JSON 可用于构建 KA 测试用例并验证检索准确度。

## 文档内容准则

在为 Knowledge Assistant 测试或演示生成文档时：

- **多页文档**：每个 PDF 应有数页，内容充实
- **具体的错误代码与解决方案**：包含产品特有的错误代码、原因和解决步骤
- **技术细节**：API 端点、配置参数、版本号、具体命令
- **简单 CSS**：保持样式极简，以便快速创建 HTML 并可靠地转换为 PDF
- **可查询的事实**：包含 KA 必须阅读文档才能回答的细节（而非通用知识）

**好的文档类型：**
- 带有故障排查章节的产品用户手册
- API 错误参考指南（错误代码、原因、解决方案）
- 带有具体步骤的安装/配置指南
- 带有版本相关细节的技术规格

**示例内容：** 与其写笼统的"Connection failed"错误，不如写：
- "Error ERR-4521: OAuth token expired. Cause: Token TTL exceeded 3600s default. Solution: Call `/api/v2/auth/refresh` with your refresh_token before expiration. See Section 4.2 for token lifecycle management."

## CLI 参考

```
python <SKILL_ROOT>/scripts/pdf_generator.py convert [OPTIONS]

  --input, -i     Input HTML file or folder (required)
  --output, -o    Output folder for PDFs (required)
  --force, -f     Force reconvert (ignore timestamps)
  --workers, -w   Parallel workers (default: 4)
```

## 文件夹结构

子文件夹结构会被保留：

```
./raw_data/html/                    ./raw_data/pdf/
├── report.html             →       ├── report.pdf
├── quarterly/                      ├── quarterly/
│   └── q1.html             →       │   └── q1.pdf
└── legal/                          └── legal/
    └── terms.html          →           └── terms.pdf
```

## 捆绑脚本

本技能附带一个辅助脚本：

| 文件 | 描述 |
|------|-------------|
| [scripts/pdf_generator.py](scripts/pdf_generator.py) | HTML → PDF 转换器（封装 `plutoprint`）；带时间戳跳过的并行文件夹转换。由步骤 2 和 CLI 参考引用。 |

该脚本位于 `<SKILL_ROOT>/scripts/pdf_generator.py`。如果它缺失，请根据上方的 [CLI 参考](#cli-reference)重新创建它（一个 `convert` 子命令，接受 `--input`/`--output`/`--force`/`--workers`，封装 `plutoprint` 以实现 HTML → PDF）。

## 故障排查

| 问题 | 解决方案 |
|-------|----------|
| "plutoprint not installed" | `uv pip install plutoprint` |
| PDF 看起来不对 | 检查 HTML/CSS 语法 |
| "Volume does not exist" | `databricks volumes create CATALOG SCHEMA VOLUME_NAME MANAGED`（四个独立的位置参数，而非 `catalog.schema.volume`） |
