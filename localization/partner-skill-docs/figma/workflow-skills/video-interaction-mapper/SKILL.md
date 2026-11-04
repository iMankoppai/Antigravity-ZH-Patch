---
name: video-interaction-mapper
description: >
  当用户要求分析 UI 屏幕录制并把交互状态映射到 Figma 时应使用此技能。触发请求如“put video frames
  in Figma”、“extract states from my recording”、“map interactions from video to
  Figma”、“analyze this screen recording”、“create a storyboard from my video”、
  “deconstruct this interaction in Figma”、“annotate the UI states in my recording”，
  或“pull the key moments from this video into Figma”。当用户将视频文件（.mp4、.mov、.webm、.avi）与
  Figma、设计审阅、交互分析、原型或 UI 状态一起引用时也触发。此技能从视频中提取关键视觉时刻，
  推断交互触发，并使用原生 Figma 注释和上传的截图素材构建带注释的 Figma Design 故事板。
---

# 视频交互映射器

把 UI 录制转化为静态、带注释的 Figma 故事板。提取重要的前/后状态，推断每次变化的触发原因，然后把干净的截图、蓝色交互标记和简洁注释放入 Figma Design 文件。

## 必需输入与工具

开始时需要：

- 本地视频文件路径（`.mp4`、`.mov`、`.webm` 或 `.avi`）。
- 机器上可用的 `ffmpeg` 和 `ffprobe`。
- 已安装 Pillow 的 Python。
- 可用的 Figma MCP 工具：`create_new_file`、`use_figma`、`upload_assets`，以及
  `get_screenshot` 或 `get_design_context`。

把 `scripts/` 中的捆绑文件作为可执行的工作流辅助运行。它们是技能实现的一部分，不是参考材料。仅在调试、适配不寻常环境或修改技能本身时才读取或修改它们。

使用 Figma Design 文件（`figma.com/design/...`）作为目标。生成的 Plugin API 代码创建页面和图像填充画框，这些是 Design 文件操作。如果用户提供 FigJam 或 Slides URL，请索取 Design 文件或创建一个新文件。

在任何 `use_figma` 调用之前，加载 Figma API 指导技能（若可用）（`figma-use`）。在创建新 Figma 文件之前，加载文件创建指导技能（若可用）（`figma-create-new-file`）。当客户端支持该参数时，在 `use_figma` 调用上传递 `skillNames: "figma-use,video-interaction-mapper"`。

## 工作流

### 1. 验证并准备

确认视频路径存在，然后检查 `ffmpeg -version`。如果缺少 Pillow，在活动 Python 环境中安装它：

```bash
pip install Pillow --break-system-packages -q
```

在创建或修改 Figma 文件之前先进行本地分析。只有在 `key_moments.json`、`upload_manifest.json` 和生成的 Figma 脚本就绪后才创建 Figma 文件，除非用户明确要求先创建文件。这避免在本地帧分析变化时留下不完整的页面。

### 2. 快速侦察时间线

从低分辨率侦察过程和联系表开始：

```bash
python <SKILL_DIR>/scripts/extract_key_frames.py \
  --input "<video_path>" \
  --output /tmp/vim_frames_<timestamp>/ \
  --mode scout
```

侦察过程默认以 1 fps 提取，把帧调整为 640 px 宽，对场景变化打分，写入 `<output_dir>/frames_manifest.json`，并创建 `<output_dir>/contact_sheet.jpg`。先检查联系表以识别可能的交互时刻。

仅当侦察过程不足时才使用较慢的完整提取：

```bash
python <SKILL_DIR>/scripts/extract_key_frames.py \
  --input "<video_path>" \
  --output /tmp/vim_frames_<timestamp>/full_frames/ \
  --mode full \
  --max-width 1600
```

对于非常长的视频，在处理整个录制之前询问是否聚焦特定时间范围。对于过多的关键帧，用更高的 `--scene-threshold`（例如 `0.4`）重新运行提取。

### 3. 分析关键时刻

读取 `frames_manifest.json` 并检查 `contact_sheet.jpg` 或相关提取帧。对每个有意义的转换，识别：

- 视觉变化：模态框、抽屉、下拉菜单、工具提示、snackbar、覆盖层、导航、加载内容、选中状态、校验状态、输入焦点或滚动位置。
- 触发：点击、点按、键盘输入、悬停、滚动、滑动、表单提交、自动/定时器，或当原因含糊时的未知触发。
- 当可见且有用时的交互目标和结果坐标。

使用相对于截图从 `0` 到 `1` 的归一化坐标。像 `45` 或 `94` 这样的百分比式值会被生成的 Figma 脚本接受并转换为 `0.45` 或 `0.94`。坐标是用于标记放置的机器元数据。不要在可见注释文本、时刻标签或用户摘要中包含坐标值。

仅当该点落在清晰可见的 UI 元素或状态上时才添加标记坐标。如果目标是推断的、位于可见控件之间，或主要基于光标位置，用 `inferred: true`、`uncertain: true`、`visible: false` 或 `confidence: "medium"`/`"low"` 标记它。生成的脚本默认抑制这些点的标记，以免画布在空白 UI 上显示一个自信的脉冲。如果目标或结果无法有效定位，把 `interaction` 设为 `null`。

仅当标记应当被绘制时才使用 `confidence: "high"` 或省略 `confidence`。仅当不确定的点仍值得标记时才使用 `show_marker: true`；生成的标记对这些强制的未确定标记使用替代样式。

目标为 5 到 15 个关键时刻。优先选择高场景分数和真正不同的状态，而不是微小的视觉变化。

把分析作为数组写入 `<output_dir>/key_moments.json`。使用侦察流程时，先提供时间戳；在下一步解析高质量帧文件。

```json
[
  {
    "moment_index": 1,
    "timestamp_s": 3.4,
    "before_timestamp_s": 3.2,
    "after_timestamp_s": 3.4,
    "trigger": "Click",
    "trigger_emoji": "",
    "short_label": "Dropdown menu opens",
    "annotation": "The account avatar is activated. A menu appears below it with profile, billing, and sign-out actions.",
    "interaction": {
      "target_frame": "before",
      "target": {
        "x": 0.91,
        "y": 0.08,
        "label": "Account avatar",
        "confidence": "high"
      },
      "result_frame": "after",
      "result": {
        "x": 0.86,
        "y": 0.2,
        "label": "Opened account menu"
      },
      "annotation": "Activating the avatar opens the account menu."
    }
  }
]
```

保持注释人类可读：`Target: Account avatar`，而不是带原始坐标后缀的标签。坐标隐藏在 JSON 中，仅作为视觉标记放置出现。

如果绘制了标记，原生 Figma 注释附加到该标记节点上，而不是截图帧。如果因点不确定或不可见而抑制了标记，注释仍附加到截图帧。

### 4. 解析选定的帧

如果 `key_moments.json` 使用时间戳，只以更高质量提取选定的前/后帧：

```bash
python <SKILL_DIR>/scripts/resolve_moment_frames.py \
  --video "<video_path>" \
  --moments-file /tmp/vim_frames_<timestamp>/key_moments.json \
  --output /tmp/vim_frames_<timestamp>/key_moments_resolved.json \
  --frames-dir /tmp/vim_frames_<timestamp>/selected_frames/ \
  --max-width 1600
```

在后续步骤中使用 `key_moments_resolved.json`。如果完整提取已产生精确的 `before_frame_path` 和 `after_frame_path` 值，可跳过此步骤。

### 5. 准备可上传的截图素材

压缩并调整前/后截图大小以便上传：

```bash
python <SKILL_DIR>/scripts/prepare_upload_frames.py \
  --manifest /tmp/vim_frames_<timestamp>/frames_manifest.json \
  --moments-file /tmp/vim_frames_<timestamp>/key_moments_resolved.json \
  --output /tmp/vim_frames_<timestamp>/upload_manifest.json
```

该脚本把优化后的 JPEG 写入 `<output_dir>/upload_assets/` 下并创建 `upload_manifest.json`。默认为横屏录制 1440 px 宽、竖屏录制 900 px 宽，JPEG 质量 75。它记录图像尺寸、实际 JPEG 质量、文件大小，以及每个资产是否满足上传预算。

### 6. 生成 Figma 调用文件

生成自包含的 Plugin API 脚本：

```bash
python <SKILL_DIR>/scripts/generate_figma_calls.py \
  --prepared /tmp/vim_frames_<timestamp>/upload_manifest.json \
  --output-dir /tmp/vim_frames_<timestamp>/figma_calls/
```

这会写入：

- `figma_storyboard.js`：一个合并的故事板创建调用。
- `figma_apply_fills_template.js`：用于上传图像哈希的填充过程模板。
- `figma_manifest.json`：执行顺序和上传说明。
- `run_manifest.json`：可恢复状态、选定时刻、预期上传、节点 ID、图像哈希、填充状态和验证状态。

生成的 JavaScript 不嵌入图像字节，也不调用 `figma.createImage`。故事板脚本在单次调用中创建所有截图容器、标签、原生注释和标记覆盖层，然后返回包含 Figma 节点 ID 和本地 JPEG 路径的 `uploadTargets`。在新创建的空白文件中，脚本复用并重命名默认页面，而不是创建第二个页面。

### 7. 在 Figma 中执行并上传素材

现在创建新的 Figma Design 文件或打开目标 Design 文件。运行 `figma_manifest.json` 中生成的文件：

1. 读取 `figma_storyboard.js`。
2. 用完整的 JavaScript 内容对目标 Design 文件调用 `use_figma`。
3. 如可行保存结果 JSON，然后更新运行清单：

```bash
python <SKILL_DIR>/scripts/update_run_manifest.py \
  --run-manifest /tmp/vim_frames_<timestamp>/figma_calls/run_manifest.json \
  --storyboard-result /tmp/vim_frames_<timestamp>/storyboard_result.json
```

对每个返回的 `uploadTargets` 项：

- 用目标 `fileKey`、`count: 1`、`nodeId` 和 `scaleMode: "FILL"` 调用 `upload_assets`。
- 把位于 `target.path` 的本地文件 POST 到返回的上传 URL。
- 在 uploads JSON 文件中记录 `{ "nodeId": "...", "imageHash": "...", "scaleMode": "FILL" }`。

生成并运行填充过程：

```bash
python <SKILL_DIR>/scripts/update_run_manifest.py \
  --run-manifest /tmp/vim_frames_<timestamp>/figma_calls/run_manifest.json \
  --uploads-file /tmp/vim_frames_<timestamp>/uploaded_images.json \
  --write-fill-script /tmp/vim_frames_<timestamp>/figma_calls/figma_apply_fills.js
```

用 `use_figma` 运行一次 `figma_apply_fills.js`。这种显式的图像哈希填充过程更受青睐，因为它使上传的截图在生成的容器中可靠渲染。

### 8. 验证

运行 `get_screenshot`、`download_assets` 或 `get_design_context` 以验证：

- 截图可见且非空白。
- 蓝色标记环位于预期的目标/结果位置。
- 原生注释使用人类标签，不暴露坐标值。
- 含糊或推断的目标被抑制，除非用 `show_marker: true` 显式强制。

在可用时用验证产物更新 `run_manifest.json`：

```bash
python <SKILL_DIR>/scripts/update_run_manifest.py \
  --run-manifest /tmp/vim_frames_<timestamp>/figma_calls/run_manifest.json \
  --verification-screenshot /tmp/vim_frames_<timestamp>/figma_storyboard.png \
  --verification-notes "Screenshots and markers verified"
```

## 输出预期

故事板布局从左到右：

```text
[Title block]

[Before] [After]   [Before] [After]   [Before] [After]
moment 1           moment 2           moment 3

"Before state"     "01 Dropdown menu opens"
                   Annotation text...
```

当坐标可用且可信时，蓝色环/点覆盖层显示目标和结果位置。当标记存在时，原生 Figma 注释附加到标记节点；否则附加到相关的前/后截图节点。注释标签应命名 UI 元素或状态变化，绝不使用原始坐标百分比。

回报：

- 映射的关键时刻数量。
- Figma 文件 URL。
- 任何触发含糊的时刻。
- 任何失败的上传或帧。
- 验证状态以及任何推断/不确定的标记。

## 边界情况

- 长视频：询问时间范围或警告处理可能更久。
- 过多时刻：提高 `--scene-threshold` 或手动保留最有意义的 5 到 15 个转换。
- 移动端录制：保持 900 px 的竖屏默认宽度，使文字在没有超大素材的情况下仍可读。
- 缺少触发证据：使用 `Unknown trigger` 而不是猜测。
- 素材上传失败：重试单个 `upload_assets` 目标；生成的截图容器仍留在文件中并可复用。
- `upload_assets` 成功但图像不渲染：用返回的图像哈希运行生成的填充过程。
- `upload_assets` 不可用：警告后备路径更慢，因为它必须直接在 `use_figma` 调用中嵌入图像数据。
