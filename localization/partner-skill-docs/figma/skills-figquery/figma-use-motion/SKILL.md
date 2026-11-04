---
name: figma-use-motion
description: "`use_figma` MCP 工具的动作/动画上下文——通过手动关键帧、动画样式、缓动和时间线时长来为 Figma 节点做动画。只要任务涉及为节点添加、编辑或检查动画，就与 figma-use 一起加载。"
disable-model-invocation: false
---

# use_figma —— 用于 Motion 的 Figma Plugin API 技能

`use_figma` MCP 工具的 Motion 上下文。[figma-use](../figma-use/SKILL.md) 涵盖基础的 Plugin API 规则——两者一起加载。

**在调用 `use_figma` 进行动作工作时，务必传入 `skillNames: "figma-use-motion"`（与 `figma-use` 一起逗号分隔）。** 仅用于日志。

## 运行时分流

Motion API 受 `metronome` 用户功能标志门控。当调用用户没有它时，本技能引用的每个 motion 属性和辅助函数都会抛出 `"<name>" is not a supported API`。

**遇到该错误时快速退出。** 不要重试；告诉用户其未启用 motion 并停止。否则你会浪费调用，并用重复的相同失败让用户困惑。

## 何时使用此技能

无论何时 `use_figma` 任务涉及以下内容，都加载此技能：

- 在节点上添加、编辑或移除关键帧（`manualKeyframeTracks`、`applyManualKeyframeTrack`、`removeManualKeyframeTrack`）。
- 随时间对填充或描边颜色做动画。
- 应用、编辑或移除动画样式（`applyAnimationStyle`、`removeAnimationStyle`、`animationStyles`）。
- 通过 `node.timelines` / `node.setTimelineDuration(id, seconds)` 读取或写入时间线时长。
- 为上述任何一项选择缓动。

静态设计工作（创建形状、组件、变量、布局）仅通过 [figma-use](../figma-use/SKILL.md) 完成——此技能只用于时间维度。

## 暴露的 motion API 面

- `node.manualKeyframeTracks` —— 读/写手动关键帧（包括填充、描边和效果轨道）。
- `node.applyManualKeyframeTrack(field, track)` / `node.removeManualKeyframeTrack(field)` —— 添加、替换或移除一条手动关键帧轨道，而无需重写整个对象。
- `node.animationStyles` —— 读/写应用于节点的动画样式元数据。
- `node.applyAnimationStyle(styleId, presetData?)` / `node.removeAnimationStyle(id)` —— 应用一个已发现的样式，并按返回/读回的 `id` 移除已应用的样式实例。
- `node.timelines` —— 所属顶层画框的只读时间线列表，时长以秒为单位。
- `node.setTimelineDuration(id, durationSeconds)` —— 写入所属顶层画框的时间线时长。
- `node.animations` —— 只读的已解析关键帧数据（目前仅手动轨道——见 [motion-patterns.md](references/motion-patterns.md)）。
- `figma.motion.figmaAnimationStyles()` —— Figma 第一方动画样式的只读列表。

编写自定义 `"figma:motion"` 预设模块源代码超出范围。如果用户想要一个全新的动画样式，照实说明并停止；不要编造一个。

## 参考文档

根据任务涉及的内容按需加载这些：

| 文档 | 何时加载 | 涵盖内容 |
|-----|-------------|----------------|
| [motion-patterns.md](references/motion-patterns.md) | 添加/编辑动作动画 | 手动关键帧、动画填充/描边、应用动画样式、时间线时长 |
| [motion-easing.md](references/motion-easing.md) | 设置动画缓动 | 关键帧缓动对象、自定义 cubic/spring、`HOLD`、在动画样式内应用缓动 |

## 验证动画

`get_screenshot` 只显示时间线的**静止状态**，从不显示动作。要检查动作，用 `export_video` 并采样帧——但它在服务端渲染且**缓慢且昂贵（约 10 秒到数分钟）**，所以让每次渲染都有价值。

**渲染前先规划——成本随像素 × 帧数增长，所以让两者都不超过帧所需：**

1. **先挑时刻。** 你需要每个*阶段*一帧（例如每个交错步，或开始/中段/稳定），而不是平滑播放——通常 4–6 帧。该数量决定你的 fps。
2. **按必须读取的内容设定尺寸。** 从小开始——`constraint: { type: 'WIDTH', value: 320 }`、`quality: "low"`——但文本和小元素在那里会模糊，所以当你需要判断精细细节时提高 `WIDTH`（768+）。省略 `constraint` = 全尺寸（1x；服务端钳制为 10x / 4096px）。
3. **把 fps 设到刚好够落到那些帧：** `fps: 5` 覆盖少量帧；10 是上限。更高只会使渲染臃肿。

**机制：** `export_video` 仅在**顶层画框**上有效，其子节点承载动画（传该画框，而不是你设关键帧的后代）。它返回一个 `jobId` 且 `status: "processing"`——用 `{ fileKey, jobId }` 再次调用以轮询。然后用 `ffmpeg -ss <t> -i anim.mp4 -frames:v 1 frame_<t>.png` 在本地提取帧——提取是免费的，所以一旦你为渲染付了费，就从中挖掘每一帧能告诉你的信息，而不是重新导出。没有像 `ffmpeg` 这样的帧提取器时，跳过导出并改为推理关键帧。

**迭代直到正确。** 导出是诊断，不是签核：如果帧不对（顺序错误、时序偏差、缺少元素、蒙版使合成发白），修正关键帧/样式并重新导出。读取*所有*帧并在重新渲染前把所有修正批量合并为一次——每次渲染都有真实开销，所以让每次都有价值，而不是每做一个小改动就重新导出。

对于琐碎或自明的更改完全跳过导出。

## 预飞检查清单

除 [figma-use 预飞检查清单](../figma-use/SKILL.md#8-pre-flight-checklist)之外，验证：

- [ ] 缓动使用公共的 `{ type: 'EASE_OUT', easingFunctionCubicBezier?: …, easingFunctionSpring?: … }` 形状——而不是 `OUT_CUBIC` 这样的内部场景图名称。
- [ ] 缓入缓出使用确切的公共枚举 `EASE_IN_AND_OUT`（或 `EASE_IN_AND_OUT_BACK`）；绝不要输出无效别名 `EASE_IN_OUT`。
- [ ] 被做动画的节点不是顶层画框（页面的直接子级）。改为对后代做动画。
- [ ] 时间线值在公共 Plugin API 中以秒为单位。通过 `setTimelineDuration` 延长；除非用户要求，绝不要缩短。
- [ ] 变换关键帧字段使用公共名称（`TRANSLATION_X`、`TRANSLATION_Y`、`ROTATION`、`SCALE_X`、`SCALE_Y`、`SCALE_XY`），而不是内部 `MOTION_*` 场景图名称。
- [ ] 手动关键帧字段来自 [motion-patterns.md](references/motion-patterns.md#animatable-fields) 中的公共允许列表；生成的/内部场景图字段会被有意抛出。
- [ ] 返回被修改的节点 ID（依据 `figma-use` 规则 15）。
- [ ] 当动作正确性不自明且帧提取器（`ffmpeg`）可用时，通过 `export_video` + 帧采样验证——小尺寸渲染、低 `fps`、迭代直到正确（见上文验证动画一节）。`get_screenshot` 只显示静止状态。
