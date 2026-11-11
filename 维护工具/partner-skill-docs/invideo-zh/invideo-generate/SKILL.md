---
name: invideo-generate
description: "为 invideo 视频生成图像、视频、配音、音乐、音效和 3D：选择并提示模型、定价、先做旁白、重试。"
---

# invideo 中的生成

先阅读 `/invideo`。生成用户文件和素材库无法提供的内容（`/invideo-media`）。

## 如何生成

- 从实时列表中挑选模型（`invideo gen models` / `find_models`）；它会随模型发布而变化。
- 使用 `invideo gen run … --dry-run` / `dry_run` 进行定价，说明费用，然后用 `--max-credits` / `max_credits` 运行。先制作一个样本，审阅后再制作其余的。
- 有旁白时，优先生成配音，读取其时长（`invideo media metadata` / `media`），再据此生成画面。
- 每个素材最多尝试三次，每次都要改变一些东西；之后停止并告知用户。只重做失败的部分。

## 需要阅读的内容

| 需求 | 阅读 |
|---|---|
| 选择和提示模型 | `references/models.md` |
| 按任务列出模型 id、试运行和退役规则 | https://docs.invideo.io/reference/models（markdown：加 `.md`） |
| 配音、音乐和音效技巧 | `/invideo-media` |
| 检查返回结果 | `/invideo-media` |
