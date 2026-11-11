---
name: invideo-media
description: "为 invideo 视频获取并检查媒体：用户上传、素材库视频、图像和音乐、版权，以及旁白、音乐、音效、清理和配音（dubbing）的技巧。"
---

# invideo 中的媒体

先阅读 `/invideo`。

## 来源，按优先级从高到低

1. **用户自己的文件：** 将它们上传到项目中（`invideo asset upload` / `start_upload`）。
2. **素材库：** 搜索库（`invideo library search` / `search_library`），并导入所选内容（`invideo asset add` / `add_media`）。
3. **生成：** 对于两者都没有的内容：`/invideo-generate`。

## 放入时间线之前

对每个文件进行探测、生成胶片条和波形（`invideo media metadata|video.frames|audio.waveform` / 带对应 `op` 的 `media`）。素材库内容以带水印的预览形式提供；导出时会渲染为无水印版本。检查素材库和生成媒体的商业使用版权。

## 需要阅读的内容

| 需求 | 阅读 |
|---|---|
| 旁白、音乐、音效、对白清理、配音（dubbing） | `references/voice-music.md` |
| 生成图像、视频、语音、音乐和音效 | `/invideo-generate` |
| 混音、闪避、响度 | `/invideo-timeline` |
