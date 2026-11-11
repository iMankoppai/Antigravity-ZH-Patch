# 交接文档（HANDOFF）

写给接手本项目维护工作的人。目标：**不依赖任何口头交接，读完这份 + 按清单跑一遍，就能独立完成"官方更新后重新适配"的全流程**。

- 编写日期：2026-10-31（2026-11-04 随 v1.4.0 更新；2026-11-05 本机应用“短消息气泡单行”修复；2026-11-10 随 v1.5.0 适配 2.30.0；2026-11-10 晚随 v1.6.0 适配 2.31.0）。对应交接状态：管理器 v1.4.1 / 汉化内核 v80（2026-11-11 正式发布）/ 适配 Antigravity 2.31.0 / 词库 7,218 条。
- 当前基线（版本、哈希、最近验证）**只看一处**：根目录 [`当前状态.json`](当前状态.json)。本文件的数字是交接时点快照。
- 规范性流程（怎样才算做对、发布判定标准）在 [`docs/项目维护与交付指导书.md`](docs/项目维护与交付指导书.md)；本文件是实操手册，两者冲突时以指导书 + 实际门禁为准。

---

## 1. 这个项目是什么

Google Antigravity 官方 Windows 客户端的中文汉化。两条腿：

1. **管理器**（`src/AntigravityZhManager/`，C# .NET 8 WPF 单文件 EXE）：把翻译内核封包进客户端的 `resources/app.asar`（"永久安装"），支持还原英文、运行中热注入、健康检查、新版适配。
2. **汉化内核**（`src/AntigravityZhManager/Assets/`）：`translate.js`（渲染端运行时）+ `dictionaries.json`（词条）+ `skill-details.json`（140 份官方技能正文目录 + 44 个合作插件 494 篇技能正文的中文 `renderedHtml`）+ `native-ui.js`（主进程原生菜单/对话框），由 `维护工具/内核生成器.js` 确定性合成为 `Assets/zh-bundle.js`，作为 EmbeddedResource 打进管理器 EXE。

另有两条**可选增强**（均内嵌进 `zh-bundle.js`、可在管理器中开关）：
- **天青蓝对话气泡**（外观）：`Assets/theme-azure-bubble.css`；运行时 CDP 注入/移除，永久安装后 `attach()` 读 `%APPDATA%\Antigravity\zh-theme.json` 自动应用。
- **会话统计状态条**（DSH 风格）：`Assets/stats-hud.js`（渲染端）+ `Services/StatsHudService.cs`（管理器运行时）+ 主进程 `attach()` 内嵌采集；底栏三组内联（⏱ 轮/步·tok/s ｜ 🗄 总tok·缓存命中 ｜ ◔ 上下文%），在模型选择器与右侧控件之间的中间空白区居中；点击某一组只弹出对应的一张卡片（⏱ 会话统计 / 🗄 Token 用量 / ◔ 上下文已用），三卡独立不连体；开关存 `%APPDATA%\Antigravity\zh-stats.json`，**常驻后随 Antigravity 启动自动显示**。

**关键背景**：官方自动更新会整体替换 `app.asar` 并删除 `app.asar.bak` 备份——所以每次官方更新，补丁都会失效，需要走一遍第 4 节的适配流程。这是本项目最高频的任务。

## 2. 第一小时：环境验证

依赖：Windows x64、Node.js（≥20）、Google Chrome（渲染回归用，路径可 `ZH_CHROME_PATH` 覆盖）、gh CLI（发布用）。.NET SDK 在本机是 `C:\Users\24844\AppData\Local\dotnet\dotnet.exe`（PATH 里的 dotnet 可能只是 runtime，跑 SDK 命令务必用完整路径）。

```powershell
cd "C:\Users\24844\Desktop\Tool\Antigravity ZH"
pwsh -ExecutionPolicy Bypass -File scripts/check-current.ps1
```

预期：**36 项门禁全 PASS**（失败 0、跳过 0）。这跑通了，说明环境、词库、内核、打包一致性全部健康——之后任何改动都以"门禁仍然全绿"为底线。浏览器回归需要 Chrome；安装层比较默认指向本机客户端 `%LOCALAPPDATA%\Programs\antigravity\resources\app.asar`。

## 3. 架构速览

### 管理器 Services（`src/AntigravityZhManager/Services/`）

| 文件 | 职责 | 接手人最需要知道的 |
|---|---|---|
| `AsarCleanPatcher.cs` | 永久安装/还原的核心。读 asar → 逐模块 String.Replace 注入 → 重排 payload → 写临时文件 → **回读校验后才替换** | 注入锚点必须恰好命中（`AssertInjectionApplied`），否则拒绝写入；安装前必须确认客户端已退出 |
| `ArchiveCompatibility.cs` / `BaselineManifest.cs` | 版本识别：当前归档是官方原版、已知补丁版还是未知版本；备份与版本匹配校验 | 数据源是 `localization/client-baselines.json`（EmbeddedResource 内嵌）。**新版适配必须先登记基线**，否则安装器拒绝写入 |
| `CdpHotPatcher.cs` | 运行中客户端的热注入（CDP `Runtime.evaluate`）；也承载外观主题注入（`SetThemeAsync`）与页面目标发现（`PageTargetsAsync`/`EvaluateAsync`，供统计条复用） | 注入前会先卸载旧实例（v72 修的 bug，见第 6 节）；健康检查要求 patchVersion/词库数完全一致 |
| `StatsHudService.cs` | 会话统计状态条：解析 `transcript.jsonl` 算 轮/步/tok/s/总token/缓存命中/TTL/上下文/距压缩/成本/配额，CDP 注入渲染 | 管理器勾选时写 `%APPDATA%\Antigravity\zh-stats.json` 并即时渲染；**永久路径由 `zh-bundle.attach()` 每 2s 采集渲染、随客户端启动自动显示**；只读日志、不外传 |
| `HealthChecker.cs` / `AntigravityDetector.cs` / `ClientProcessGuard.cs` | 环境诊断 / 安装路径定位 / 客户端进程守卫 | 安装器靠 ClientProcessGuard 拒绝"客户端运行中" |
| `LegacyCleaner.cs` / `LegacyOwnership.cs` | 清理历史遗留文件 | 只删能证明归本项目所有的对象 |
| `AppUpdater.cs` / `UpdateChecker.cs` / `CompatibilityRepairService.cs` | 自更新检查 /【新版汉化适配】按钮编排 | 适配按钮 = 运行中先热注入、退出后点第二次才永久安装，无自动重试 |

### 内核与门禁

- **生成**：`node 维护工具/重建汉化内核.js`（唯一实现是 `维护工具/内核生成器.js`，确定性生成，双次运行字节一致）。`scripts/build-bundle.js` 是 deprecated 转发。
- **外观补丁（天青蓝气泡）**：CSS 在 `src/AntigravityZhManager/Assets/theme-azure-bubble.css`，由内核生成器内嵌进 `zh-bundle.js`（`const themeCss`）。运行时由 `CdpHotPatcher.SetThemeAsync` 通过 CDP 注入/移除；永久安装后由 `zh-bundle.js` 的 `attach()` 在每次加载时读取 `%APPDATA%\Antigravity\zh-theme.json` 决定是否应用。开关偏好保存在管理器设置里。
- **统计状态条（可选，DSH 风格）**：数据来自 `%USERPROFILE%\.gemini\antigravity\brain\<会话id>\.system_generated\logs\transcript.jsonl`（字段 `input_tokens/cache_read_tokens/output_tokens/step_index/created_at`），算出 轮/步/tok/s/总token/缓存命中率/缓存TTL/上下文占用/距auto-compact约几步/成本估算/配额积分。
  - **口径**：上下文按 App 的**自动压缩上限**（实测 Gemini 3.8 Flash≈256k、Claude 4.6≈160k、GPT-OSS 120B≈80k，**不是模型理论 1M**）；成本=API 等价估算（GPT-OSS 无价显示 —）；配额/积分=页面 `fetch` 挂钩捕获 `GetUserStatus`（未拉取时显示 —）。
  - **UI**：渲染脚本 `Assets/stats-hud.js`，由 `StatsHudService` 与永久 `attach()` 共用。底栏三组内联（⏱ 轮/步·tok/s ｜ 🗄 总tok·缓存命中 ｜ ◔ 上下文%），**在模型选择器与右侧控件之间的中间空白区居中**，单色、数值常规字重、组内正常空格；**点击某一组只弹出对应的一张卡片**（⏱ 会话统计 / 🗄 Token 用量 / ◔ 上下文已用），三卡各自独立不连体，点击别处收起；同时保护模型名不被挤压截断。
  - **常驻**：开关 `%APPDATA%\Antigravity\zh-stats.json`（`{"enabled":true}`）；永久安装后 `attach()` 每 2s 读日志并 `executeJavaScript` 渲染，**随 Antigravity 启动自动显示**，管理器关闭也不影响；管理器取消勾选写 false 即关闭。
  - **注意**：`attach()` 每窗口一个定时器（`statsTimers` WeakMap），`dom-ready`/`did-finish-load` 会重建并清理旧定时器；页面跳转按 `contents.getURL()` 的 `/c/<uuid>` 跟随会话。全程只读日志、不外传。
- **词条增量**：每版一个 `localization/vXX-ui-additions.json`（含 evidence/skipped 说明）+ `scripts/sync-vXX-localization.cjs` 合入 `Assets/dictionaries.json`。术语与占位符由 `tests/localization/dictionary-quality.cjs` 把关。
- **官方基线**：`localization/client-baselines.json` 每版一条：原版哈希/字节数、6 个注入目标模块哈希、5 个锚点（必须恰好命中 1 次）、已知补丁版哈希。门禁 `baseline-manifest` 会与本机客户端交叉核对。
- **测试**：`tests/localization/`（词库质量、正则安全、深层覆盖）、`tests/renderer/`（12 个 Playwright 回归套件，无头 Chrome，不碰真实客户端）、`tests/packaging/`（一致性 + `engine-tests/` C# 引擎回归）。

## 4. 核心任务 Playbook A：新版 Antigravity 适配

这是最高频任务。以 v74（2.28.2）为例，全程约 30–60 分钟。

1. **确认版本与取证**：`node work/v74/version-probe.cjs`（改路径复用）读新版 `package.json` 的 version；算新版 asar SHA256；复制到 `work/vXX/client/resources/app.asar` 作隔离工作副本。**备份 `app.asar.bak` 已被官方更新器删除，不用找。**
2. **主进程差分**：与上一版原版逐文件哈希对比（参考 `work/v72/asar-diff.cjs`）。两种结局：
   - **纯版本号更新**（只有 package.json 变，如 2.28.1/2.28.2）：内核零改动，直接跳到第 5 步。
   - **模块有变化**：核验 5 个锚点（`title: 'Open workspace'` / `title: 'Open workspaces'` / `void win.loadURL(newUrl);` / `void win.loadURL(url);` / `Menu.buildFromTemplate(actions)`）——全部恰好命中 1 次则引擎不用改；有锚点失配才需要改 `AsarCleanPatcher.cs`，此时按指导书第 6 节属于"需重新适配"，改动要配引擎测试。
3. **前端差分**（渲染端不在 asar 里）：
   - 首选：客户端运行时从本地服务下载 `https://127.0.0.1:<port>/main.js`（端口看 CDP `/json/list` 里 page target 的 URL）。
   - 客户端没运行：从 `%APPDATA%\Antigravity\Cache\Cache_Data` gzip 解码提取（参考 `work/v71/` 提取脚本），**必须交叉验证身份**——缓存里混着多个历史版本，用"上一版词典键保留率 ≥95%"或与活服务哈希比对确认。
   - **字面量差分用 `work/v72/` 里的状态机脚本**（先去重再解码，0.2 秒跑完）；不要用正则逐匹配解 JSON.parse——10MB 单行 bundle 会让正则回溯灾难（教训：卡 15 分钟）。
4. **筛选与翻译**：新字面量过 UI 过滤器（`work/v72/ui-gaps.cjs`），逐条在 bundle 里查上下文（`context-probe.cjs`）确认是界面文案再收录。范围纪律见 [`docs/汉化范围说明-哪些不翻译.md`](docs/汉化范围说明-哪些不翻译.md)：内容、专名（模型/主题/通道/语音名）、React 内部标识、开发者诊断一律不收。落成 `localization/vXX-ui-additions.json` + sync 脚本。
5. **运行时调整**（仅当有新结构）：动态模板加进 `translate.js` 的 unshift 规则块；被链接切分的整句写结构函数（参考 `translateSplitHintSentence`）；新原生菜单项加进 `native-ui.js` 的 menuLabels。**同时更新 `Assets/translate.js` 的 `patchVersion`**。
6. **回归与门禁**：给当版回归套件补用例（参考 `tests/renderer/v228-ui-regression.cjs` 的夹具模式：正文保护、模型名、还原），重建内核，跑全量 `check-current.ps1`。
7. **基线登记**：`client-baselines.json` 加新版条目（pristine + targetSha256 + anchors）。
8. **隔离演习**：`ZH_PRISTINE_ASAR=work/vXX/client/resources/app.asar.bak` 跑 engine tests（含安装/重复安装/还原逐字节一致），再 `--install-target` 产出隔离验证归档，**核验归档内嵌 bundle 与源码逐字节一致**（提取公式见第 6 节第 3 条），哈希登记进 `knownPatchedSha256`。
9. **门禁**：`check-current.ps1 -AsarPath work/vXX/client/resources/app.asar`，全绿才算适配完成。
10. **真实安装**：客户端必须退出（先试优雅 taskkill；失败且客户端空闲时才强杀——需要用户授权）。`--apply-installed`。**装完核对真实安装归档 == 隔离归档（逐字节）**。
11. **实机验收**：启动客户端，`node work/v68/live-probe.cjs`（只读）：内核 installed、词库数、菜单栏中文、相对时间。深层面（新设置页、证书面板等）用 CDP 遍历工具（`work/v72/audit-driver.cjs`、`hover-sweep.cjs`）逐屏扫。
12. **发布**：见 Playbook C。

## 5. 核心任务 Playbook B：排查漏译（用户报"哪里没翻译"）

1. 实机扫描：`work/v72/live-scan.cjs`（当前屏可见英文）→ `audit-driver.cjs`（多界面巡航）→ `hover-sweep.cjs`（悬停 tooltip 遍历）。都是只读。
2. 逐条在 bundle 查上下文分类：界面文案 → 进词典；组合串（见第 6 节第 1 条）→ 加模板规则；内容/专名 → 记录为有意保留。
3. 修复后**热注入验证**：`--hot-inject`（现在会先卸载旧实例），在运行中的客户端直接确认修复，不用重装。
4. 给当版回归夹具补用例，重建、门禁、重装持久化。

## 6. 踩坑记录（教训，按代价排序）

1. **组合式 tooltip 是单文本节点**。base-ui 会把 JSX 子树序列化成一个文本节点：`Send Message Enter`、"新建对话Ctrl+N" 整串出现，词典精确匹配永远打不中。已翻译部分 + 动态后缀的组合要用整串模板规则（如 `/^(Send Message|Queue Message) ([A-Za-z⇧⌘+]+)$/`）。悬停遍历工具在 `work/v72/hover-sweep.cjs`。
2. **热注入必须先卸载旧实例**。对已注入的页面直接叠加新运行时，新旧两个 MutationObserver 会互相改写节点——旧词典把新译文"还原"回英文，表现为"词条明明加了却不生效"。已在 `CdpHotPatcher.InjectAsync` 修复（先调旧实例 `__antigravityZhPatchRestore()`）。
3. **asar payload 起点公式**：`base = 8 + buf.readUInt32LE(4)`（**不是** `16 + jsonLen`——jsonLen 未按 4 字节对齐）。取错会把 bundle 哈希算错，造成"内嵌与源码不一致"的虚惊。校验脚本一律用 `work/v72/version-probe.cjs` 的公式。
4. **内嵌资源可能陈旧**：`dotnet run` 增量编译偶发不重嵌 Assets。证据链要求"归档内嵌 bundle == 源码 bundle"，不一致时先 `rm -rf` engine-tests 与主项目的 `bin/obj` 再重装。另外注意：全文检索校验脚本自己也可能写错（曾把 payload base 算错过一次虚惊）——两个数字对不上时先怀疑脚本。
5. **release.js 的 tar 盘符问题**：GNU tar 把 `-f C:\...` 解析成远程主机（"Cannot connect to C:"）。已修复为相对路径传参；若再遇打包失败先想到这个。
6. **GitHub 上传大文件断连**：代理环境下 `gh release create` 连传两个 74MB 资产会被重置并**整体回滚**。改用：先建空 release → 小文件 → ZIP → EXE 分步 `gh release upload`。
7. **优雅关闭客户端可能被拒**（"只能强行终止"）：安装器会正确拒绝写入。客户端空闲（无未保存内容）时经用户授权 `taskkill /F`；不确定就问用户。
8. **官方更新删备份**：`app.asar.bak` 每次官方更新都会消失，这是常态不是事故；旧版备份不需要"找回"，重装时会按新版重建。
9. **文档里的"尚未发布"会过期**：叙事性文档别写"当前/最新"，写发布时点 + 让 `当前状态.json` 当唯一事实源（v1.3.4 文档整理时清掉了多处这类失实陈述）。
10. **渲染回归偶发 EBUSY**：`status-label-regression` 等无头 Chrome 用例偶发 `EBUSY ... DevToolsActivePort`（Chrome 临时 profile 句柄竞争）。单跑/复跑即过，不是代码问题；重跑全量即可。
11. **Antigravity 无法从 agent 会话启动**：本环境 `Start-Process Antigravity.exe` 会立即退出（拿不到窗口），验证 UI 必须由用户手动启动。装内核关闭客户端时，优雅关闭常失败（超时/APP_NOT_FOUND），需 `taskkill /F /T /IM Antigravity.exe`（客户端空闲且已获授权时）。
12. **统计条数据源是磁盘日志**：渲染层**没有** `require`/fs（已实测 `require=undefined`、`electronNative` 无文件 API），token 数据只能从 `transcript.jsonl` 读，只能在**主进程（`attach()`）或管理器侧**采集；不要在页面脚本里尝试读文件。
13. **短消息气泡折行是 max-width 逐级百分比叠加**：2.29 用户消息层级存在 80%（官方 `max-w-[80%]`）+ 82%（外层）+ 82%（气泡框）三级 `max-width`，再叠加外层 `width: fit-content`，短句可用宽度会被压到约 96px（≈4 汉字/行）而折成两行；长句因内容够宽看不出。修复见 `theme-azure-bubble.css` 第 8 节（最外层整列宽、只保留单一 53% 总上限、内层不再逐级收窄）。排查这类宽度问题，实机用 CDP 打印祖先链每一层的 `computed width / minWidth / maxWidth` 最快，不要只盯最终元素。回归：`tests/renderer/azure-theme-regression.cjs`（含 2.29 真实层级夹具）。
14. **官方会改注释措辞，锚点要留双份**：2.30.0 把 `dist/utils.js` 里 setAppDetails 的锚点注释从 `// Prevent the menu dropdown from being very wide due to long page titles` 改成 `// Truncation keeps the menu dropdown from being very wide.`。`AsarCleanPatcher` 现在先试新锚点、再回退旧锚点，避免旧版重装时静默跳过。新增/改锚点时，`tests/packaging/anchor-coverage.cjs` 的 needle 必须同步更新到当前装机的原版（该门禁用本机原版/备份交叉核对），否则会 0 命中失败。

## 7. 核心任务 Playbook C：发布

> **现状**：v1.4.0 已完成构建并发布到 GitHub Releases（<https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.4.0>）。再次发版时从本节第 1 步重走一遍。

1. `csproj` 三处版本号（Version/FileVersion/AssemblyVersion）→ README（徽章、头部、下载名、版本记录条目）→ `当前状态.json`（version/patchVersion/哈希/verification 块）。
2. `dotnet publish -c Release -r win-x64 --self-contained true` 到独立候选目录（首次需先 restore）。
3. `node scripts/release.js --exe <候选 EXE>`：暂存目录组装 → 临时 ZIP → 校验（CRC/文件集/中文名/EXE 字节）→ 生成 SHA256SUMS + release-metadata.json → **最后才替换** `dist/` 正式包，旧包归档 `dist/archive/`。
4. 根目录 `Antigravity汉化管理器.exe` 用候选 EXE 覆盖。
5. `version-consistency` + `release-consistency` 门禁全绿后提交。
6. GitHub：`gh release create vX.Y.Z --title ... --notes-file ... --latest` 带四个资产；上传失败按第 6 节第 6 条分步重试。发布后台账标 `released: true` 再补一次提交。
7. 收尾清理参照 v1.3.4 后的清理清单（编译缓存、`dist/archive`、旧 publish、重复 bundle）。

## 8. 文档地图

| 文件 | 读者 | 内容 |
|---|---|---|
| `README.md` | 用户 | 是什么、怎么用、版本记录 |
| `HANDOFF.md`（本文件） | 接手人 | 现状、playbook、踩坑 |
| `docs/项目维护与交付指导书.md` | 维护者（规范） | 流程规范与发布判定标准 |
| `docs/维护执行清单.md` | 维护者 | 每次修改/发布的勾选清单 |
| `docs/汉化范围说明-哪些不翻译.md` | 所有人 | 什么故意不翻、为什么 |
| `docs/新版汉化适配.md` | 用户 | 适配按钮的使用说明 |
| `docs/现场验收清单.md` | 维护者 | 需人工在真实客户端验收的项 |
| `docs/history/` | 考古 | 逐版说明 + 状态台账归档（发布时点事实） |
| `localization/partner-skill-docs/` | 维护者 | 44 个合作插件 494 篇技能正文的中文 markdown（受版本管理，见其 README） |
| `维护工具/partner-skill-docs/` | 维护者 | 技能正文接入脚本：`integrate-plugin-docs.cjs`、`coverage.js`、`verify-plugin-doc.cjs`、`partner-urls.json` |
| `当前状态.json` | 机器与人 | 唯一当前事实源 |

## 9. 已知边界（截至交接）

- 需人工现场验收的项：`docs/现场验收清单.md` 中标"未测试"的深层界面（真实登录、语音通话往返、Passkey 弹窗等）。门禁只能证明"文案与规则在"，不能证明真实场景正确。
- macOS 专属流程不翻译不验收（caBLEv2 Passkey 二维码弹窗被 `platform !== 'darwin'` 门禁挡住）。
- 锚点依赖：`AsarCleanPatcher` 的注入靠 5 个字符串锚点，官方重构主进程时可能失配——失配时安装器会拒绝写入并报出具体锚点，按第 4 节第 2 步处理。
- `当前状态.json` 的历史块在 `docs/history/状态台账-归档-2026-10.json`；再过几个版本可以按同样方式把 v74 之前的块继续归档。
- `work/` 是 git 忽略的本机证据目录，换电脑即失效；台账里引用的哈希是可复核的最小事实，原始 bundle/asar 不保证长期存在。
- **统计条边界**：token/缓存来自 `transcript.jsonl`，官方改日志格式或路径会失效；成本/额度是**估算/账号级**（非精确账单）；缓存 TTL 按 5 分钟假设；UI 选择器依赖输入底栏 DOM（`input-footer`、`permissions-selector-trigger`），官方改版可能需更新 `stats-hud.js`。
- **技能正文边界**：弹窗正文按 SKILL.md 的 24KB 预览 fingerprint 匹配；官方改正文会导致失配、回退英文。bundle 因含 494 篇正文约 10.7MB，页面注入较重。`build-skill-detail-views.cjs` 重跑会清空 partner additionalDocuments，需用 `integrate-plugin-docs.cjs` 逐插件恢复；译文原文在 `localization/partner-skill-docs/`。
- **天青蓝气泡宽度选择器依赖 2.29 用户消息 DOM**：短句单行修复基于 `user-input-step > div.w-full > div`（官方 `max-w-[80%]` 包裹层）等层级；官方若重构该结构，需同步更新 `theme-azure-bubble.css` 第 8 节，`azure-theme-regression.cjs` 会兜住这一层。

## 10. 当前状态与技能正文（v1.4.1 / Antigravity 2.31.0）

**2026-11-11 续（内核 v80，本地）：补全设置页（常规/外观/浏览器/快捷键/对话）与自动化空状态「No automations yet」漏译（+26 词条，含多文本节点空状态处理）；已永久安装（安装归档 ce312eff…，内嵌 bundle == 源码 db94927a…）；已随 v1.4.1 发布 GitHub。详见 docs/v80-设置漏译补全.md。**

**2026-11-11 续（内核 v79，本地）：六插件 Gmail/Looker/Arize AX/invideo/Neo4j/Spacefast 共 90 篇 SKILL.md 技能正文已汉化并接入 skill-details（additionalDocuments 589）；已永久安装（安装归档 503ca1be…，内嵌 bundle == 源码 e222078…）；未发布。详见 docs/v79-自定义项技能正文汉化.md。**

**2026-11-11 续（内核 v78，本地）：已将 Gmail / Looker / Arize AX / invideo / Neo4j / Spacefast 六个插件详情页（概览、建议提示词、命令/技能描述，含 Looker/invideo 富文本指南）汉化；词条 7,192。已永久安装到本机 2.31.0（安装归档 `8a79f7ac…`，内嵌 bundle == 源码 `835d53e0…`）；未发布。详见 `docs/v78-自定义项插件详情汉化.md`。**

**2026-11-11 追加（内核 v77，本地）：自定义项市场（More Plugins）新增 6 个项目的卡片描述、分区标题与底部第三方开发者工具免责声明已汉化，并修 CodeRabbit/Context7 描述及 invideo 误译规则；词条 6,994。已永久安装到本机 2.31.0（安装归档 `766777bf…`，内嵌 bundle == 源码 `aded25a0…`）；未发布。详见 `docs/v77-自定义项市场补全.md`。**

**2026-11-10 晚更新：v1.6.0 适配 Antigravity 2.31.0**
- 客户端 **2.31.0** 原版 `03f3d094…`（5,274,972 字节）；相对 2.30.0 无新增/删除模块，仅 `ipcHandlers.js`、`webviewBrowser.js`、`webviewDownloadRouting.js`、`preload.js`、`guestPermissionPolicy.js`、`package.json` 变化；**16 个注入锚点全部恰好命中 1 次 → AsarCleanPatcher 零改动**。证据在 `work/2-31-0-probe/`。
- 前端 renderer 经 CDP 拉取（11,871,831 字节）；新增字面量 2,373 个，UI 候选 76 条，核对后新增 **37 条**词条（`localization/v76-ui-additions.json` + `scripts/sync-v76-localization.cjs`，协调器/授权代码/环境等），并新增命名问候语与登录相关动态规则。
- 内核 `patchVersion` **75 → 76**；词条 **6,984**；bundle `2a94893b…`；隔离/永久安装归档 `1f09c0e6…`（15,991,515 字节）；manager EXE v1.6.0。统一门禁 36/36、引擎 41/41。
- 实机热加载验证：首页可见英文只剩「Antigravity / 项目名 / 分支名 / 模型名」等有意保留项。
- **未发布 GitHub**（本地构建）。实机验收需人工启动客户端。

**以下为 v1.5.0 / 2.30.0 历史细节，保留作参考**

**2026-11-10 更新：v1.5.0 适配 Antigravity 2.30.0**
- 客户端 **2.30.0** 原版 `00153a89…`（5,242,783 字节）；主进程新增 20 个浏览器/访客框架模块、改动 369 个文件，但 **16 个注入锚点全部恰好命中 1 次**；唯一失配是 `dist/utils.js` 的 setAppDetails 注释（旧 `// Prevent the menu dropdown…` → 新 `// Truncation keeps the menu dropdown…`），`AsarCleanPatcher` 已改为新旧双锚点兼容，引擎结构零其它改动。证据在 `work/2-30-0-probe/`。
- 前端 renderer 通过 CDP 从本地服务 `/main.js` 拉取（11,717,794 字节）；新增字面量 4,117 个，UI 过滤候选 306 条，逐条上下文核对后新增 **113 条**词条（`localization/v75-ui-additions.json` + `scripts/sync-v75-localization.cjs`），并新增 4 条动态规则（MCP 启动失败计数、远程模式文件上传限制、LSP 引用计数、成员数）。
- 内核 `patchVersion` **74 → 75**；词条 **6,947**；bundle `584471f8…`；隔离/永久安装归档 `405f4fe7…`（15,955,974 字节）；manager EXE `16612bc5…`。统一门禁 36/36、引擎 41/41。
- **未发布 GitHub**（本地构建）。实机验收需人工启动客户端。

**以下为 v1.4.0 / 2.29.0 历史细节，保留作参考**

**状态**：管理器 v1.4.0（内核 v74）已构建、永久写入本机客户端（Antigravity 2.29.0），并**已发布到 GitHub Releases**。2026-11-05 另在本机应用「短消息气泡单行」修复（bundle `0f29e10f…`、安装归档 `7d6b2c74…`），该修复**未发布**——当前哈希以 `当前状态.json` 的 `localFix20261105` 为准。

**适配现状要点**
- 主进程：新增 7 个模块（`wcvBrowserRegistry`/`wcvIpcHandlers`/`guestDialogController`/`webviewDownloadRouting`/`windowState`/`externalUrl`/`wcvZOrderController`），`utils/main/ipcHandlers/preload/scriptJail/updater` 等变更；但 anchor-coverage 的 **16 个锚点全部恰好命中 1 次 → AsarCleanPatcher 零改动**。
- 前端：2.29 renderer 字面量新增 4,296，收录 **787 条**新词条（210 条 2.29 新 UI：`v74-ui-additions.json`；62 条「自定义项」市场卡片：`v74-marketplace-additions.json`；515 条「自定义项」插件详情页：`v74-marketplace-detail-additions.json` + `sync-v74-marketplace-detail.cjs`）。
- 内核：`translate.js` patchVersion **73 → 74**；词条 **6,834**；发布时 bundle sha `d48b2f5d…`（含技能正文后约 10.7MB）；本机当前 bundle `0f29e10f…`（含短句单行修复）。
- 自定义项市场：实机 CDP 只读导出 68 张插件卡片（含“再查看”展开项）+ 5 个分类；并从 51 个 partner 插件包（`marketplace.json` + 各 zip）提取详情页的建议提示词/技能/代理/规则描述逐条汉化；产品名等专名、代码/路径/URL、免责声明保留英文。新增 `marketplace-cards-regression.cjs`（11 项）与 `marketplace-detail-regression.cjs`（6 项），均纳入门禁。
- 计划编辑器结构适配：2.29.0 用 `schedule-repeat` 下拉取代了 `schedule-frequency-trigger[data-frequency]`；`on` 连接词判断改为两种结构兼容（custom→“规则”、其余→“在”），补 `hours/week/month` 单位词条，并新增 `tests/renderer/schedule-summary-regression.cjs`（8 项，已纳入统一门禁）。
- 技能正文（SKILL.md 全文）：把「命令/技能」弹窗（`[data-testid="doc-row-modal"]`，正文为 SKILL.md markdown，市场预览截断 24KB）汉化。`translate.js` 按正文 fingerprint/签名从 `skill-details.json` 匹配并替换成 `renderedHtml`；已把 **44 个合作插件、494 篇 SKILL.md** 全文译成中文，接入 `skill-details.additionalDocuments`（共 **499** 条，含原 6 条；其中 493 条为 partner 正文，1 篇 canva-cli 仅 frontmatter 无正文跳过）。官方 140 篇沿用原目录。
  - 译文源与映射：中文 markdown 已固化到 `localization/partner-skill-docs/<slug>/<相对路径>`（44 目录 / 494 文件 / 约 5.9MB，受版本管理）；生成脚本在 `维护工具/partner-skill-docs/`（`integrate-plugin-docs.cjs`、`coverage.js`、`verify-plugin-doc.cjs`、`partner-urls.json`）。
  - 每条 additionalDocument 含 `markdownLength/markdownFingerprint`（英文正文 fingerprint）+ `signature` + 中文 `renderedHtml`，弹窗按此精确命中。
  - ⚠️ 维护陷阱：`scripts/build-skill-detail-views.cjs` 只按官方 fixtures 重建 `skill-details.json`，**重跑会丢掉全部 partner additionalDocuments**；若必须重跑，之后要对 44 个 slug 逐个再跑 `integrate-plugin-docs.cjs` 恢复。
  - 注：bundle 因容纳正文增至约 10.7MB，页面注入略重；若实测卡顿，可改为按技能懒加载。
- 基线：2.29.0 已登记（原版 `290e1b7a…`；已知补丁版 `a32e0d93…` / `8e822fc8…` / `779388c0…` / `f775a0a4…` / `568409e5…` / `7d6b2c74…`（短句修复后安装版））。
- 验证：统一门禁 **36/36**（失败 0、跳过 0），引擎 41/41；本机当前安装归档 `7d6b2c74…`，内嵌 bundle == 源码 `0f29e10f…`（含短句单行修复）。已永久安装 v74 / 6,834 条 + 494 篇技能正文到本机客户端。
- 交付：根目录 `Antigravity汉化管理器.exe` 已替换为本机构建（sha `2bec719b…`，含短句单行修复）；已发布 ZIP 仍为 v1.4.0（sha `bf3e6322…`）；Release：<https://github.com/iMankoppai/Antigravity-ZH-Patch/releases/tag/v1.4.0>。

**下一步（接手人）**
1. 手动启动 Antigravity 2.29.0 实机验收：汉化、天青蓝气泡（**重点看短消息是否单行、长句是否仍安全折行**）、统计状态条、**命令/技能弹窗正文**（如 `/mongodb-connection`、`/figma-use`、harness/vercel 任意技能），以及新版自动化/语音/连接器/下载等界面。
2. 若再发版：按 Playbook C 打包并 `gh release create`（EXE 约 79MB，按第 6 节第 6 条分步上传）。
3. 注意：`scripts/check-current.ps1` 含中文且无 BOM，**必须用 pwsh 7**（5.1 会按 ANSI 读成乱码并报解析错误）。
4. 技能正文再生/维护见上方"技能正文"小节与 `localization/partner-skill-docs/README.md`。

