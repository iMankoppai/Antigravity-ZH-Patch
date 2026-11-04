# 合作插件技能正文（中文 markdown）— 交接说明

本目录存放 **44 个「自定义项」合作插件、共 494 篇 `SKILL.md`** 的简体中文译文，用于 Antigravity 2.29+ 的「命令/技能」弹窗（`[data-testid="doc-row-modal"]`）正文显示。

## 目录结构
- `localization/partner-skill-docs/<plugin-slug>/<相对路径>/SKILL.md`（与插件包内相对路径一致）
- 覆盖插件示例：harness-antigravity(71)、vercel-plugin(47)、netlify(45)、databricks(34)、dynatrace(34)、unity(32)、figma(32)、postman(17)、zohobooks-antigravity(17)、superpowers(15)、zoho-projects(13)…

## 它如何生效
`translate.js` 在弹窗里取 SKILL.md 正文（市场预览截断 24KB）算 fingerprint，去 `Assets/skill-details.json` 的 `additionalDocuments` 找 `markdownLength/markdownFingerprint`（或 `preview*`/`signature`）匹配项，命中后把区域替换成该条目的中文 `renderedHtml`。

因此维护分两步：
1. **翻译**：本目录的中文 markdown。
2. **接入**：运行 `维护工具/partner-skill-docs/integrate-plugin-docs.cjs <slug>`，读取“英文源 + 本目录中文”，用 marked 渲染中文为 `renderedHtml`、按英文正文算 fingerprint，追加/覆盖到 `skill-details.json` 的 `additionalDocuments`，并重算 `revision`。

## 重新生成（前提：需要英文源）
- 英文源 zip 清单：`维护工具/partner-skill-docs/partner-urls.json`（从 gstatic 重新下载）。
- 解压到 `work/2-29-0-probe/archives/<slug>/`（本机证据目录，git 忽略）。
- 依赖：Node + `marked`/`playwright`（脚本用 `C:/Users/24844/.cache/codex-runtimes/.../node_modules/`，换机需改路径或设 `ZH_*`）。
- 逐插件执行 integrate 后：`node 维护工具/重建汉化内核.js` 重建 bundle，再跑 `pwsh -File scripts/check-current.ps1`。

## ⚠️ 重要陷阱
`scripts/build-skill-detail-views.cjs`（官方技能详情构建）**只按官方 fixtures 重建 `skill-details.json`，会清空全部 partner `additionalDocuments`**。若必须重跑它，之后要对 44 个 slug 逐个再跑 `integrate-plugin-docs.cjs` 恢复。

## 范围说明
- 仅翻译自然语言正文；代码块/行内代码/命令/路径/URL/变量/API/占位符/HTML/链接目标保留英文；frontmatter 仅 `description` 译中文。
- 仅 frontmatter、无正文的技能（如 canva-cli）未入库（无正文可显示）。
- `coverage.js`：检查每个插件的源/译文数量与已完成状态（需 `work/.../archives` 与 `work/.../<slug>-zh`）。
- `verify-plugin-doc.cjs <slug> <skillRel>`：离线用真实 React fiber 机制验证某篇弹窗能命中并渲染中文。
