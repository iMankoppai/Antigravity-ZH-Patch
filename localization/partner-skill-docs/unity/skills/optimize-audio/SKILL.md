---
name: optimize-audio
description: 通过导入设置和混音器配置优化音频内存、CPU 成本和播放质量。用于被要求减少音频内存或 Audio Mixer 的 CPU 成本、更改剪辑的 Load Type、采样率或编解码器，或强制 3D 音频为单声道时。
---
## 关键规则

- 在向用户报告发现之前不要做出更改
- 严格按顺序遵循步骤；绝不跳步
- 在每个 `WAIT` 检查点停止并等待用户回应后再继续
- 质量比速度更重要：在每次更改前后进行测量
- 始终在设备构建中验证结果；编辑器的音频统计数据仅供参考

## 0. 设置执行路径

下面每个 C# 步骤都通过 Unity CLI 在实时编辑器中运行。**`unity-cli` 技能负责
带你到达那里**——安装 CLI、确认已连接的编辑器、添加项目的
`com.unity.pipeline` 包、区分真正缺失的编辑器与卡在安全模式中的编辑器，
以及发现编辑器的命令目录。先遵循它；不要在这里重新推导任何这些内容。

有两件事它无法替你了解：

- **你特别需要 `script eval`**，而不仅仅是一个可访问的编辑器。确认它出现在
  目录中。它的存在取决于 Pipeline 包版本，而不是 CLI，因此健康的
  安装仍可能缺少它——如果缺失，请说明并停止。
- **不要手动编辑 `.meta` 文件来更改导入设置。** 导入器值只有通过实时编辑器中的
  `SaveAndReimport()` 才会生效，因此无法访问的编辑器是停止信号，而不是直接编辑元数据的
  提示。

使用 `unity command script eval --caller plugin --skill optimize-audio --code '<snippet>'` 运行 C#。从
`unity command --format json` 发现参数形态，而不要假设。`unity command` 默认超时为
30 秒。

### 将 C# 传给 `script eval`

`script eval` 编译的是**语句块，而不是文件**。由此产生两个后果，两者都会导致编译
错误而非警告：

- **没有 `using` 指令。** 编译器会将 `using UnityEngine;` 读取为资源释放
  语句并拒绝它（`CS0210`）。
- **类型必须完全限定。** 裸的 `AssetDatabase` 或 `AudioImporter` 无法解析
  （`CS0246` / `CS0103`），而裸的 `Object` 会与 `object` 产生歧义（`CS0104`）。

[resources/audio-import-api.md](resources/audio-import-api.md) 中的配方以
完全限定的方式编写，因此可以按原样传给 `script eval`。

## 1. 预检：检测音频系统

在做任何其他事情之前，先建立音频环境：

1. **检测平台和采样率：** 使用 `script eval` 读取 `EditorUserBuildSettings.activeBuildTarget` 和 `AudioSettings.outputSampleRate`。输出采样率会影响覆盖剪辑采样率是否真的能节省内存。
2. **检测 AudioMixer 是否存在：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的 mixer-asset 查询配方查看是否存在混音器图。如果不存在，请注意路由和效果成本不是问题。
3. **检测 AudioListener：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的场景组件查询配方查找 `UnityEngine.AudioListener`，以确认恰好存在一个监听器。多个监听器会产生不正确的空间化；零个监听器会产生静音。
4. **仅在**确认平台和监听器状态后才继续。

## 2. 评估当前状态

在推荐任何更改之前，收集可观察的数据：

1. **查找所有 AudioSource：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的场景组件查询配方查找 `UnityEngine.AudioSource`。对每个结果，使用**一次** `script eval` 调用批量读取属性——参见 [resources/audio-import-api.md](resources/audio-import-api.md) 中的批量读取配方。
2. **检查混音器拓扑：** 如果预检中发现了混音器，使用 `script eval` 读取 AudioMixer 的公开参数和组数量。组数量超过约 8 个，或 Master 组上有特效，都是立即的警示信号。
3. **检查 DSP 缓冲区大小：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的 DSP 缓冲配方读取缓冲区大小。推荐值参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 DSP Buffer Size Guidelines。
4. **在做出更改之前报告发现：** 向用户汇总所有检测到的源、监听器数量和混音器深度。指出任何即时风险（例如带 `spatialBlend = 1` 的立体声剪辑、> 1 MB 剪辑上的 Decompress On Load、Master 组上的混响）。

**等待用户审查评估后再继续。**

## 3. 理解请求

根据用户需求路由到正确的部分：

| 用户说 | 路径 |
|-----------|------|
| "audio memory too high" / "memory profiler shows audio" | 第 4 节 —— 导入设置审计 |
| "load times slow" / "decompression stall" | 第 4 节 —— Load Type 审查 |
| "DSP spike" / "mixer CPU" / "audio CPU high" | 第 4B 节 —— 混音器审计 |
| "3D sound wrong" / "only left channel plays" / "stereo in 3D" | 第 4A 节 —— Force To Mono + 空间设置 |
| "quality artifacts" / "voice sounds bad" / "Vorbis crackling" | 第 4C 节 —— 压缩质量调优 |
| "mobile audio battery" / "mobile memory" | 第 4D 节 —— 移动端采样率覆盖 |
| "set import settings on all clips" / "batch audio settings" | 第 4 节 —— 批量导入审计 |
| "streaming" / "background loading" / "Addressables audio" | 第 4E 节 —— 流式传输和异步加载 |

如果症状有歧义，请询问："Is the problem audio memory usage, DSP CPU spikes, or audio playback quality?"

## 4. 主要诊断工作流

使用第 2 节的发现来确定适用哪个子节。可能同时适用多个。

### 4A. Force To Mono 和空间设置

对于任何 `spatialBlend > 0` 的 AudioSource（3D 定位声音）：

1. **检查剪辑通道数：** 使用 `script eval` 读取 `audioSource.clip.channels`。如果 `channels == 2` 且 `spatialBlend == 1`，则只有左声道播放——这是 bug，不是特性。
2. **推荐 Force To Mono：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的读取导入器配方检查当前设置，然后使用 force-to-mono 配方应用 Force To Mono。
3. **应用并重新导入：** 向用户报告更改前后的通道数。
4. **验证空间混合：** 使用 `script eval` 确认 `audioSource.spatialBlend` 为 `1.0`（完全 3D）且 `audioSource.rolloffMode` 设置为适当的曲线。

### 4B. AudioMixer 审计

1. **测量组深度：** 使用 `script eval` 遍历混音器的组树并统计层数。超过 3 层（Master → SFX / Music / Voice → 子总线）会每帧增加路由开销，即使子组是静音的。
2. **检查静音组上的特效：** 使用 `script eval` 查询每个组的特效列表。诸如 `AudioReverbFilter` 的特效即使没有 AudioSource 路由到该组，也会以全成本运行其 DSP。
3. **标记父组上的 SFX Reverb：** 这是最昂贵的内置特效。如果在 Master 或高层级组上发现，请明确标记。
4. **向用户呈现建议：**
   - 移除或旁路没有活动源的组上的特效。
   - 使用**快照**切换混音状态（战斗 / 探索 / 暂停），而不是在运行时切换特效。
   - 压平不必要的子总线；将源重定向到更浅的祖先。

   **等待用户批准混音器更改后再应用。**

5. **验证 DSP 缓冲区大小：** 如果预检中的 `bufferLength` 非常小（< 256），建议增大它——参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 DSP Buffer Size Guidelines。

### 4C. 压缩质量调优

1. **读取当前压缩格式：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的读取导入器配方，为用户报告的剪辑读取 `compressionFormat` 和 `quality`。
2. **应用平台矩阵：** 参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 Compression Format Matrix 获取各平台建议。
3. **警告有损源：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的有损源检查配方。如果原始文件是 MP3，请警告用户有损源质量在 Unity 重新编码后会永久丢失。建议使用 WAV 或 AIFF 源。

### 4D. 移动端采样率覆盖

1. **识别移动端目标上的 SFX 剪辑：** 使用 `UnityEngine.AudioSource` 的场景组件查询配方，并筛选非音乐、非对话剪辑。
2. **读取当前采样率设置：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的读取导入器配方为每个剪辑读取 `sampleRateSetting` 和 `sampleRateOverride`。
3. **应用移动端覆盖：** 使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的采样率覆盖配方。按用例的速率参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 Sample Rate Recommendations。
4. **报告节省：** 将采样率减半可将 PCM 内存成本减半。报告每个已更改剪辑的估计节省。

### 4E. Load Type 和流式传输

1. **按剪辑审计 Load Type：** 使用 `script eval` 为第 2 节中找到的每个剪辑读取 `clip.loadType`。
2. **应用决策规则：** 参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 Load Type Decision Table。
3. **标记不匹配：** 参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 Load Type Mismatch Flags。向用户报告两种类型的不匹配。
4. **为任何 Streaming 剪辑应用 `Load In Background`**——使用 [resources/audio-import-api.md](resources/audio-import-api.md) 中的 Load In Background 配方。

## 5. 验证

在任何导入设置或混音器更改之后：

1. **重新读取剪辑统计数据：** 使用 `script eval` 重新读取 `clip.loadType`、`clip.channels`、`AudioSettings.outputSampleRate` 以及导入器的 `compressionFormat`，以确认更改在重新导入后已应用。
2. **确认 AudioSource 路由：** 使用 `UnityEngine.AudioSource` 的场景组件查询配方，并在任何混音器重构后验证 `audioSource.outputAudioMixerGroup` 按预期分配。
3. **报告差值：** 说明每个更改设置的更改前后值。不要在未回读已应用的导入器值的情况下假设更改已生效。
4. **迭代限制：** 最多 3 个调整-验证循环，然后暂停并询问用户反馈。

## 6. 故障排除

### 3D AudioSource 上的立体声剪辑——只有左声道可听

1. 确认 `audioSource.spatialBlend == 1`。
2. 确认 `audioSource.clip.channels == 2`。
3. 在 AudioClip 导入器中启用 `forceToMono` 并重新导入。Unity 在导入时将两个声道混合为单声道，通过 `normalize = true`（保持开启）保留电平。
4. 如果用户不想重新导入：设置 `audioSource.panStereo = 0` 作为运行时变通方案，但警告这不会恢复立体声信息。

### Decompress On Load 剪辑导致内存尖峰

1. 确认 `clip.loadType == AudioClipLoadType.DecompressOnLoad` 且 `clip.length` 很长（> 5 秒）。
2. 如果是音乐或环境音，切换到 `Streaming`；如果仅偶尔播放，切换到 `CompressedInMemory`。
3. 如果剪辑很短但仍然很大：检查 `clip.channels`（立体声浪费双倍内存）和 `clip.frequency`（移动端目标上的高采样率浪费内存）。应用 Force To Mono 和/或采样率覆盖。

### AudioMixer CPU 尖峰——DSP 线程过热

1. 使用 mixer-asset 查询配方确认混音器图存在。
2. 使用 `script eval` 列出所有组及其附加的特效。查找高层级组上的混响、合唱或 EQ。
3. 将昂贵的特效下移到仅在源播放时才活动的叶子组。
4. 使用快照在听不到它们的游戏状态下旁路特效链（例如在菜单期间旁路混响）。
5. 如果 DSP 缓冲区很小（64 或 128 采样），提高它——参见 [resources/platform-settings.md](resources/platform-settings.md) 中的 DSP Buffer Size Guidelines。

### 对话上的 Vorbis 质量伪影

1. 确认 `defaultSampleSettings.compressionFormat == AudioCompressionFormat.Vorbis`。
2. 确认 `defaultSampleSettings.quality`——默认是 0.5，在语音上通常可听。提高到 0.7–0.85。
3. 在 iOS 上：改用 AAC 而非 Vorbis（硬件解码，等效比特率下质量更好）。
4. 确认源文件是无损的（WAV 或 AIFF）。MP3 源无法恢复在 Unity 重新编码之前丢失的质量。

### AudioListener 数量不是恰好一个

- **零个监听器：** 所有音频将静音。使用 `script eval` 向主相机添加 `AudioListener` 组件：`UnityEngine.Camera.main.gameObject.AddComponent<UnityEngine.AudioListener>()`。
- **多个监听器：** Unity 使用最后启用的那个，产生不可预测的空间化。使用 `UnityEngine.AudioListener` 的场景组件查询配方，并禁用除预期之外的所有监听器。

### `Load In Background` 导致首次播放静音

这是预期行为：首次调用 `Play()` 时剪辑尚未完成加载。通过以下方式缓解：
1. 在场景开始时通过在其需要之前调用 `clip.LoadAudioData()` 预加载剪辑。
2. 使用带轻微延迟的 `AudioSource.PlayScheduled()` 以允许异步加载完成。
3. 对于必须立即播放的 AudioSource：切换到 `CompressedInMemory`（首次播放时同步）而非带后台加载的 `Streaming`。

## 7. 完成

在完成审计或优化后：

- 汇总每个更改的设置及更改前后值。
- 列出仍需要关注的任何剪辑或组（例如需要在设备上测量以确认节省的剪辑）。
- 如果用户需要运行时内存测量，请指向 Memory Profiler 包，它按运行时字节成本报告最大的 AudioClip。
- 如果审计后混音器 CPU 仍然很高，请指向 Unity Profiler 的 Audio 模块进行 DSP 线程分析。

## 详细参考

- **平台设置、压缩矩阵、加载类型、采样率：** [resources/platform-settings.md](resources/platform-settings.md)
- **AudioImporter API 配方和代码模式：** [resources/audio-import-api.md](resources/audio-import-api.md)

## 另请参阅

- **Memory Profiler 包** —— 按运行时字节成本查找最大的 AudioClip。
- **Unity Profiler，Audio 模块** —— DSP CPU 标记和帧时间预算。
- `audio-setup-mixers` —— 创建混音器并将 Audio Source 路由到组。
