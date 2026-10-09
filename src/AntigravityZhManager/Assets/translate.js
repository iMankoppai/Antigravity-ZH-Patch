(() => {
  const patchVersion = 30;
  const dictionary = window.__antigravityZhPatchDictionary || {};
  const identity = window.__antigravityZhPatchDictionarySignature || JSON.stringify(dictionary);
  const guard = `${patchVersion}:${identity}`;
  if (window.__antigravityZhPatchGuard === guard && window.__antigravityZhPatchInstalled &&
      window.__antigravityZhPatchController && !window.__antigravityZhPatchController.stopped) return;

  window.__antigravityZhPatchController?.stop();
  window.__antigravityZhPatchObserver?.disconnect();
  window.__antigravityZhPatchInstalled = false;
  window.__antigravityZhPatchGuard = null;
  const translations = new Map(Object.entries(dictionary));
  const nodeOriginals = window.__antigravityZhPatchNodeOriginals ||= new WeakMap();
  const elementOriginals = window.__antigravityZhPatchElementOriginals ||= new WeakMap();
  const translationCache = new Map();
  const themePresetNames = new Set(['Catppuccin', 'Dracula', 'Monokai', 'One Light', 'One Dark Pro', 'Tokyo Night', 'Solarized Light', 'Solarized Dark', 'Vesper', 'Gruvbox Material', 'Gruvbox']);
  const diffSourceNames = new Set(['all agent edits', 'single edit', 'uncommitted', 'staged', 'branch changes', 'commit']);
  const MAX_CACHE_ENTRIES = 4000;

    function translateDuration(value) {
    return value
      .replace(/(\d+)\s+days?/gi, "$1 天")
      .replace(/(\d+)\s+hours?/gi, "$1 小时")
      .replace(/(\d+)\s+minutes?/gi, "$1 分钟")
      .replace(/(\d+)\s+seconds?/gi, "$1 秒")
      .replace(/,\s*/g, " ");
  }

  function translateToolSummaryItem(value) {
    return value
      .replace(/(\d+)\s+files?/gi, "$1 个文件")
      .replace(/(\d+)\s+folders?/gi, "$1 个文件夹")
      .replace(/(\d+)\s+searches?/gi, "$1 次搜索")
      .replace(/(\d+)\s+commands?/gi, "$1 个命令")
      .replace(/(\d+)\s+tasks?/gi, "$1 个任务")
      .replace(/(\d+)\s+pages?/gi, "$1 个页面")
      .replace(/(\d+)\s+browsers?/gi, "$1 个浏览器操作")
      .replace(/(\d+)\s+images?/gi, "$1 张图片")
      .replace(/(\d+)\s+actions?/gi, "$1 个操作")
      .replace(/(\d+)\s+artifacts?/gi, "$1 个成果");
  }

  function formatRuleTarget(raw) {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^['"](.*)['"]$/.test(trimmed)) {
      return `“${trimmed.slice(1, -1)}”`;
    }
    return `“${trimmed}”`;
  }

  const regexTranslations = [
    // 浏览器动作元素点击标题 (带动态目标) (§5.1 规则)
    [/^(Clicking|Clicked)\s+element\s+(.+)$/, (m) => `${m[1] === "Clicking" ? "正在点击元素" : "已点击元素"} ${m[2]}`],
    // Built-in skills descriptions fuzzy & robust matching
    [/^Build, package, run, and debug UI extensions for Antigravity[\s\S]*$/i, () => "为 Antigravity 构建、打包、运行和调试 UI 扩展：在侧边面板中显示的交互式 Web 面板，由使用内置 Sidecar SDK 的 Node.js Sidecar 提供服务。"],
    [/^Discover UI plugin panels relevant to the current task[\s\S]*$/i, () => "发现与当前任务相关的 UI 插件面板，并在对话中提供一键快捷按钮以在侧边栏打开（切换）。当运行中的 UI 插件面板对当前操作有帮助，或用户刚启用新 UI 插件面板需要快捷入口时使用。"],
    [/^Automatically migrate legacy workflows to modern skills[\s\S]*$/i, () => "自动将旧版工作流迁移为现代技能（涵盖全局与工作区配置）。扫描现有工作流，创建目标 SKILL.md 文件，并安全归档旧的工作流文件。"],
    [/^Guidelines for interacting with GitHub and request permissions[\s\S]*$/i, () => "与 GitHub 交互的指导原则，并在命令因代理环境限制而失败时向用户申请权限。"],
    [/^Comprehensive guide and reference for the Antigravity Customization System[\s\S]*$/i, () => "Antigravity 自定义系统的综合指南与参考。用于说明自定义项的工作方式、加载优先级和发现机制，并指导创建技能、规则、插件、钩子及 MCP 服务器。"],
    [/^How to manage and create plugins[\s\S]*$/i, () => "介绍如何管理和创建插件——插件是带命名空间的技能、代理、规则、MCP 服务器和钩子集合，可以作为一个整体安装、启用或禁用。当用户要启用、禁用、安装、卸载或创建插件，或需要把新自定义项打包成插件时使用，也可由 /plugin 命令触发。底层自定义系统、发现路径、加载优先级或独立技能等内容请参阅自定义指南。"],
    [/^How to render rich interactive HTML widgets inline[\s\S]*$/i, () => "介绍如何在对话中内嵌或作为独立成果呈现丰富的交互式 HTML 组件。适用于图表、数据可视化、交互控件、教学演示及其他超越纯文本和 Markdown 的视觉内容。"],
    [/^Interactive guide to design and create a scheduled background automation[\s\S]*$/i, () => "用于设计和创建定时后台自动化的交互式指南。当用户希望创建自动或周期性定时任务时使用，也可由 /automation 命令触发。"],
    [/^Provides a comprehensive guide, quick reference, and sitemap for Google Antigravity[\s\S]*$/i, () => "提供 Google Antigravity（AGY）的综合指南、快速参考和站点地图，涵盖 Antigravity CLI（agy）、Antigravity 2.0、Antigravity IDE、Python SDK、斜杠命令、快捷键及自定义项（技能、规则、MCP、Sidecar）。当用户询问如何使用、配置或自定义这些产品时启用。"],
    // Automations and Slash commands
    [/^Search automations\.\.\.$/i, () => "搜索自动化任务…"],
    [/^No automations configured\.$/i, () => "未配置自动化任务。"],
    [/^No automations found\.$/i, () => "未找到自动化任务。"],
    [/^(?:automation\s+)?Guide me through creating an automated task$/i, () => "引导我创建自动化任务"],
    // Workspace & developer platform descriptions
    [/^Connect to Google Workspace, including Docs[\s\S]*$/i, () => "连接至 Google Workspace，包括 Docs、Sheets、Slides、Drive 和 Calendar。"],
    [/^Build on Google's developer platforms[\s\S]*$/i, () => "基于 Google 开发者平台进行开发，涵盖 Android、Chrome、Gemini 和 Google Cloud。"],
    // Marketplace plugin cards robust/truncated descriptions matching
    [/^Build applications with the Gemini Interact[\s\S]*$/i, () => "使用 Gemini Interactions API 构建应用…"],
    [/^Prototype, build & run modern apps that user[\s\S]*$/i, () => "利用 Firebase 原型设计、构建并运行现代应用…"],
    [/^Curated collection of agent skills for science[\s\S]*$/i, () => "针对科学计算任务精选的代理技能合集…"],
    [/^Using the Google Antigravity Python SDK[\s\S]*$/i, () => "使用 Google Antigravity Python SDK 构建 AI 代理…"],
    [/^Search and retrieve official documentation[\s\S]*$/i, () => "搜索并检索 Google 开发者产品的官方文档…"],
    [/^Integration skill and tools for Google Maps[\s\S]*$/i, () => "Google Maps Platform API 的集成技能与工具…"],
    [/^Official plugin for Dart and Flutter[\s\S]*$/i, () => "Dart 与 Flutter 官方插件，安装技能、规则、自定义代理和 Dart MCP 服务器…"],
    [/^This plugin provides a specialized suite of skill[\s\S]*$/i, () => "为数据科学与分析提供专用的技能套件…"],
    [/^(\d+)\s+tasks?\s+running$/i, (match) => `${match[1]} 个任务正在运行`],
    [/^(\d+)\s+tasks?\s+completed$/i, (match) => `${match[1]} 个任务已完成`],
    [/^(\d+)\s+seconds?$/i, m => `${m[1]} 秒`],
    [/^(\d+)\s+minutes?$/i, m => `${m[1]} 分钟`],
    [/^(\d+)\s+hours?$/i, m => `${m[1]} 小时`],
    [/^(\d+)\s+days?$/i, m => `${m[1]} 天`],
    [/^Select (.+) Theme$/, m => `选择 ${m[1]} 主题`],
    [/^Invalid notebook JSON: ([\s\S]+)$/, m => `笔记本 JSON 格式无效：${m[1]}`],
    [/^Unable to load PDF: ([\s\S]+)$/, m => `无法加载 PDF：${m[1]}`],
    [/^Failed to load PDF: ([\s\S]+)$/, m => `PDF 加载失败：${m[1]}`],
    [/^Please fill in all required fields: ([\s\S]+)$/, m => `请填写全部必填字段：${m[1]}`],
    [/^Failed to save configuration: ([\s\S]+)$/, m => `保存配置失败：${m[1]}`],
    [/^(.+) header$/, m => translations.has(m[1]) ? `${translations.get(m[1])}标题栏` : m[0]],
    [/^(\d+) of (\d+\+?)$/, m => `${m[1]} / ${m[2]}`],
    [/^Show (\d+) breakdowns?$/, m => `展开 ${m[1]} 项明细`],
    [/^Rules: (\d+) tokens$/, m => `规则：${m[1]} Token`],
    [/^(\d+) files? changed$/, m => `${m[1]} 个文件已更改`],
    [/^Fold lines (\d+)-(\d+)$/, m => `折叠第 ${m[1]} 至 ${m[2]} 行`],
    [/^(\d+)\s+questions?$/i, m => `${m[1]} 个问题`],
    [/^Question\s+(\d+)$/i, m => `问题 ${m[1]}`],
    [/^Question\s+(\d+)\s+of\s+(\d+)$/i, m => `问题 ${m[1]} / ${m[2]}`],
    [/^Version\s+(.+)$/, (match) => `版本 ${match[1]}`],
    [/^Select model, current:\s*(.+)$/, (match) => `选择模型，当前：${match[1]}`],
    [/^Select project, current:\s*(.+)$/, (match) => `选择项目，当前：${match[1] === "No Project" ? "未选择项目" : match[1]}`],
    [/^You have used some of your weekly limit, it will fully refresh in (.+)\.$/, (match) => `你已使用部分每周额度，将在 ${translateDuration(match[1])}后完全恢复。`],
    [/^You have used some of your 5-hour limit, it will fully refresh in (.+)\.$/, (match) => `你已使用部分五小时额度，将在 ${translateDuration(match[1])}后完全恢复。`],
    [/^No more older messages, showing (\d+) of (\d+)$/, (match) => `没有更早的消息，当前显示 ${match[1]}/${match[2]} 条`],
    [/^Load older messages, showing (\d+) of (\d+)$/, (match) => `加载更早的消息，当前显示 ${match[1]}/${match[2]} 条`],
    [/^(Thought|Thinking)\s+for\s+((?:\d+(?:\.\d+)?\s*(?:h|hr|hrs|m|min|mins|s|sec|secs)\s*)+)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => {
      const isThinking = m[1].toLowerCase() === 'thinking';
      const time = m[2]
        .replace(/([\d.]+)\s*(?:h|hr|hrs)/gi, '$1 小时 ')
        .replace(/([\d.]+)\s*(?:m|min|mins)/gi, '$1 分钟 ')
        .replace(/([\d.]+)\s*(?:s|sec|secs)/gi, '$1 秒 ')
        .trim();
      return `${isThinking ? '正在思考' : '已思考'} ${time}`;
    }],
    [/^(Worked\s+for|Stopped\s+after)\s+((?:\d+(?:\.\d+)?\s*(?:h|hr|hrs|m|min|mins|s|sec|secs)\s*)+)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => {
      const isStopped = m[1].toLowerCase().startsWith('stopped');
      const time = m[2]
        .replace(/([\d.]+)\s*(?:h|hr|hrs)/gi, '$1 小时 ')
        .replace(/([\d.]+)\s*(?:m|min|mins)/gi, '$1 分钟 ')
        .replace(/([\d.]+)\s*(?:s|sec|secs)/gi, '$1 秒 ')
        .trim();
      return isStopped ? `已于 ${time} 后停止` : `已处理 ${time}`;
    }],
    // 命令运行具体步骤标题（优先匹配反引号与详细命令）
    [/^Ran\s+command:\s*(.+?)\s+\(`([^`]+)`\)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => "已运行命令：" + m[1] + " (`" + m[2] + "`)"],
    [/^Ran\s+command:\s*`([^`]+)`[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => "已运行命令：`" + m[1] + "`"],
    [/^Ran\s+command[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已运行命令'],
    [/^Running\s+command[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在运行命令'],

    // 复合动作汇总解析器（覆盖 pqb 生成的所有多动词或单动词+折叠角标组合）
    [/^(?:Exploring|Explored|Editing|Edited|Running|Ran|Analyzing|Analyzed|Searching|Searched|Reading|Read|Checking|Checked|Creating|Created|Viewing|Viewed|Writing|Wrote|Browsing|Browsed)(?:,\s*|[\s\w\d\-_./\\])+[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => {
      const raw = m[0];
      const clean = raw.replace(/[\s›❯>⌄▾▼\u203A\u2304]+$/, '').trim();
      const segments = clean.split(',').map(s => s.trim()).filter(Boolean);
      const actionMap = {
        'exploring': '正在探索',
        'explored': '已探索',
        'exploring file': '正在探索文件',
        'exploring files': '正在探索文件',
        'explored file': '已探索文件',
        'explored files': '已探索文件',
        'exploring artifact': '正在探索成果',
        'exploring artifacts': '正在探索成果',
        'explored artifact': '已探索成果',
        'explored artifacts': '已探索成果',
        'exploring workspace': '正在探索工作区',
        'editing': '正在编辑',
        'edited': '已编辑',
        'editing file': '正在编辑文件',
        'editing files': '正在编辑文件',
        'edited file': '已编辑文件',
        'edited files': '已编辑文件',
        'editing artifact': '正在编辑成果',
        'editing artifacts': '正在编辑成果',
        'edited artifact': '已编辑成果',
        'edited artifacts': '已编辑成果',
        'creating artifact': '正在创建成果',
        'creating artifacts': '正在创建成果',
        'created artifact': '已创建成果',
        'created artifacts': '已创建成果',
        'running command': '正在运行命令',
        'running commands': '正在运行命令',
        'ran command': '已运行命令',
        'ran commands': '已运行命令',
        'running task': '正在运行任务',
        'running tasks': '正在运行任务',
        'ran task': '已运行任务',
        'ran tasks': '已运行任务',
        'analyzing': '正在分析',
        'analyzed': '已分析',
        'analyzing file': '正在分析文件',
        'analyzing files': '正在分析文件',
        'analyzed file': '已分析文件',
        'analyzed files': '已分析文件',
        'searching': '正在搜索',
        'searched': '已搜索',
        'searching files': '正在搜索文件',
        'searched files': '已搜索文件',
        'searching code': '正在搜索代码',
        'searched code': '已搜索代码',
        'reading file': '正在读取文件',
        'reading files': '正在读取文件',
        'read file': '已读取文件',
        'read files': '已读取文件',
        'checking task': '正在检查任务',
        'checked task': '已检查任务',
        'writing file': '正在写入文件',
        'wrote file': '已写入文件',
        'viewing file': '正在查看文件',
        'viewed file': '已查看文件',
      };
      let allMatched = true;
      const translatedSegs = segments.map(seg => {
        const lower = seg.toLowerCase();
        if (actionMap[lower]) return actionMap[lower];
        const countMatch = lower.match(/^(exploring|explored|editing|edited|running|ran|analyzing|analyzed|searching|searched|reading|read)\s+(\d+)\s+(files?|commands?|tasks?|searches?|artifacts?)$/);
        if (countMatch) {
          const verbMap = {
            exploring: '正在探索', explored: '已探索',
            editing: '正在编辑', edited: '已编辑',
            running: '正在运行', ran: '已运行',
            analyzing: '正在分析', analyzed: '已分析',
            searching: '正在搜索', searched: '已搜索',
            reading: '正在读取', read: '已读取'
          };
          const nounMap = {
            file: '个文件', files: '个文件',
            command: '个命令', commands: '个命令',
            task: '个任务', tasks: '个任务',
            search: '次搜索', searches: '次搜索',
            artifact: '个成果', artifacts: '个成果'
          };
          return `${verbMap[countMatch[1]] || countMatch[1]} ${countMatch[2]} ${nounMap[countMatch[3]] || countMatch[3]}`;
        }
        const runCmdMatch = seg.match(/^(Running|Ran)\s+(.+)$/i);
        if (runCmdMatch) {
          return `${runCmdMatch[1].toLowerCase() === 'running' ? '正在运行' : '已运行'} ${runCmdMatch[2]}`;
        }
        if (translations.has(seg)) return translations.get(seg);
        allMatched = false;
        return seg;
      });
      return allMatched ? translatedSegs.join('，') : clean;
    }],

    // 工具动作折叠行与状态步骤标题（带可选尾标 › / ⌄ / ▾ / ▼ / > / ❯）
    [/^Listed\s+(\d+)\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已列出 ${m[1]} 个任务`],
    [/^Listed\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已列出任务'],
    [/^Listing\s+(\d+)\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在列出 ${m[1]} 个任务`],
    [/^Listing\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在列出任务'],
    [/^Killed\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已终止任务 ${m[1]}` : '已终止任务'],
    [/^Killing\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在终止任务 ${m[1]}` : '正在终止任务'],
    [/^Killed\s+all\s+tasks[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已终止所有任务'],
    [/^Checked\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已检查任务 ${m[1]}` : '已检查任务'],
    [/^Checking\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在检查任务 ${m[1]}` : '正在检查任务'],
    [/^Sent\s+input\s+to\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已向任务发送输入 ${m[1]}` : '已向任务发送输入'],
    [/^Sending\s+input\s+to\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在向任务发送输入 ${m[1]}` : '正在向任务发送输入'],

    [/^Listed\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已列出 ${m[1]} 个子代理`],
    [/^Listed\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已列出子代理'],
    [/^Listing\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在列出 ${m[1]} 个子代理`],
    [/^Listing\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在列出子代理'],
    [/^Killed\s+all\s+subagents[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已终止所有子代理'],
    [/^Killed\s+subagent(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已终止子代理 ${m[1]}` : '已终止子代理'],
    [/^Killing\s+subagent(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在终止子代理 ${m[1]}` : '正在终止子代理'],
    [/^Invoked\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已调用 ${m[1]} 个子代理`],
    [/^Invoked\s+subagent(?::\s*|\s+)(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已调用子代理：${m[1]}`],
    [/^Invoked\s+subagent[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已调用子代理'],
    [/^Invoking\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在调用 ${m[1]} 个子代理`],
    [/^Invoking\s+subagent(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在调用子代理 ${m[1]}` : '正在调用子代理'],

    [/^Scheduled\s+timer(?:\s+for)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已设定定时器：${m[1]}` : '已设定定时器'],
    [/^Scheduling\s+timer(?:\s+for)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在设定定时器：${m[1]}` : '正在设定定时器'],
    [/^Scheduled\s+(?:cron|task)(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已设定定时任务 ${m[1]}` : '已设定定时任务'],
    [/^Scheduling\s+(?:cron|task)(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在设定定时任务 ${m[1]}` : '正在设定定时任务'],
    [/^Created\s+schedule[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已创建定时计划'],
    [/^Creating\s+schedule[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在创建定时计划'],

    [/^Sent\s+message(?:\s+to)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已向 ${m[1]} 发送消息` : '已发送消息'],
    [/^Sending\s+message(?:\s+to)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在向 ${m[1]} 发送消息` : '正在发送消息'],

    [/^Asked\s+(\d+)\s+questions?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已提出 ${m[1]} 个问题`],
    [/^Asking\s+(\d+)\s+questions?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在提出 ${m[1]} 个问题`],
    [/^Asked\s+(?:user\s+a\s+)?question[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已向用户提问'],
    [/^Asking\s+(?:user\s+a\s+)?question[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在向用户提问'],

    [/^Viewed\s+file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已查看文件 ${m[1]}` : '已查看文件'],
    [/^Viewing\s+file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在查看文件 ${m[1]}` : '正在查看文件'],
    [/^Wrote\s+(?:to\s+)?file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已写入文件 ${m[1]}` : '已写入文件'],
    [/^Writing\s+(?:to\s+)?file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在写入文件 ${m[1]}` : '正在写入文件'],
    [/^Replaced\s+content\s+in(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已替换 ${m[1]} 中的内容` : '已替换文件内容'],
    [/^Replacing\s+content\s+in(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在替换 ${m[1]} 中的内容` : '正在替换文件内容'],

    [/^Searched\s+for\s+"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已搜索“${m[1]}”`],
    [/^Searched\s+for\s+files:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已搜索文件：${m[1]}`],
    [/^Code\s+search:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `代码搜索：“${m[1]}”`],
    [/^Internal\s+search:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `内部搜索：“${m[1]}”`],
    [/^Listed\s+directory\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已列出目录 ${m[1]}`],
    [/^Browser\s+task:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `浏览器任务：“${m[1]}”`],
    [/^Opened\s+browser:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已打开浏览器：${m[1]}`],
    [/^Read\s+URL:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已读取 URL：${m[1]}`],
    [/^Searched\s+web:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已搜索网络：“${m[1]}”`],
    [/^Used\s+MCP\s+tool:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已使用 MCP 工具：${m[1]}`],
    [/^Used\s+tool:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已使用工具：${m[1]}`],
    [/^Generated\s+image:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已生成图像：“${m[1]}”`],

    // 成果与文件动作
    [/^Created\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已创建 ${m[1]}`],
    [/^Deleted\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已删除 ${m[1]}`],
    [/^Edited\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已编辑 ${m[1]}`],
    [/^Viewed\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已查看 ${m[1]}`],

    // 任务与后台指示
    [/^(\d+)\s+background\s+tasks?\s+running$/i, (m) => `${m[1]} 个后台任务正在运行`],
    [/^(\d+)\s+subagents?\s+running$/i, (m) => `${m[1]} 个子代理正在运行`],
    [/^(\d+)\s+subagents?\s+completed$/i, (m) => `${m[1]} 个子代理已完成`],
    [/^(Running|Ran)\s+(&\s+.*|node\s+.*|[a-zA-Z0-9_\-\.\/\\]+\.(?:js|ts|py|sh|ps1|exe|bat|cmd).*)$/, (m) => `${m[1] === 'Running' ? '正在运行' : '已运行'} ${m[2]}`],
    [/^Opens external link:\s*(.+)$/, (match) => `打开外部链接：${match[1]}`],
    [/^See all\s*\((.+)\)$/, (match) => `查看全部 (${match[1]})`],
    [/^Media\s*\((.+)\)$/, (match) => `媒体 (${match[1]})`],
    [/^(?:Run\s+)?(.+)\s+finished$/i, (match) => `${match[1]} 已完成`],
    [/^(?:Run\s+)?(.+)\s+failed$/i, (match) => `${match[1]} 失败`],
    [/^Canceled edit to\s+(.+)$/, (match) => `已取消对 ${match[1]} 的编辑`],
    [/^Failed to add URL to allowlist:\s*(.+)$/, (match) => `将 URL 添加到允许名单失败：${match[1]}`],
    [/^Remove\s+(.+)$/, (match) => `移除 ${match[1]}`],
    // Permission modal regex pipeline (covering URL, Command, File, and MCP)
    [/^Save rule to always allow\s+([\s\S]+)\?$/i, (match) => `保存始终允许“${match[1]}”的规则吗？`],
    [/^Allow reading this URL\?$/i, () => '允许读取此 URL 吗？'],
    [/^Allow running this command\?$/i, () => '允许运行此命令吗？'],
    [/^Allow reading this file\?$/i, () => '允许读取此文件吗？'],
    [/^Allow editing this file\?$/i, () => '允许编辑此文件吗？'],
    [/^Allow\s+([\s\S]+)\?$/i, (match) => `允许执行“${match[1]}”吗？`],
    // 优先匹配带具体目标的权限规则 (R1 修复，保留动态命令/路径/工具名)
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+conversation$/i, (m) => `在本次对话中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+conversation$/i, (m) => `在本次对话中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+project$/i, (m) => `在本项目中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+project$/i, (m) => `在本项目中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+when\s+not\s+in\s+a\s+project$/i, (m) => `在非项目对话中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+when\s+not\s+in\s+a\s+project$/i, (m) => `在非项目对话中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+workspace$/i, (m) => `在此工作区中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+workspace$/i, (m) => `在此工作区中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+globally$/i, (m) => `全局始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+globally$/i, (m) => `全局保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"])$/i, (m) => `始终允许${formatRuleTarget(m[1])}（全局）`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"])$/i, (m) => `保存${formatRuleTarget(m[1])}的规则（全局）`],
    // 无具体目标的简写保底：
    [/^Yes,\s*allow(?:\s+this\s+time)?$/i, () => '仅本次允许'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+in\s+this\s+conversation$/i, () => '本次对话始终允许'],
    [/^Yes,\s*save\s+rule\s+in\s+this\s+conversation$/i, () => '在本次对话中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+in\s+this\s+project$/i, () => '本项目中始终允许'],
    [/^Yes,\s*save\s+rule\s+in\s+this\s+project$/i, () => '在本项目中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+when\s+not\s+in\s+a\s+project$/i, () => '非项目对话中始终允许'],
    [/^Yes,\s*save\s+rule\s+when\s+not\s+in\s+a\s+project$/i, () => '在非项目对话中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+in\s+this\s+workspace$/i, () => '此工作区中始终允许'],
    [/^Yes,\s*save\s+rule\s+in\s+this\s+workspace$/i, () => '在此工作区中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow$/i, () => '所有项目和对话中始终允许'],
    [/^Yes,\s*save\s+rule$/i, () => '全局保存规则'],
    [/^No\s*\([\s\S]*\)$/i, () => '否（告诉代理改做什么）'],
    [/^Skip\s*\([\s\S]*\)$/i, () => '跳过'],
    [/^Send feedback as (.+)$/, (match) => `以 ${match[1]} 的身份发送反馈`],
    [/^Cancel \((.+)\)$/, (match) => `取消（${match[1]}）`],
    [/^Select modes, current:\s*(.+)$/, (match) => `选择模式，当前：${match[1]}`],
    [/^Install (.+)$/, (match) => `安装 ${match[1]}`],
    [/^Open (.+) skill$/, (match) => `打开 ${match[1]} 技能`],
    [/^\+(\d+) attachments$/, (match) => `另有 ${match[1]} 个附件`],
    [/^Unmount workspace (.+)$/, (match) => `取消挂载工作区 ${match[1]}`],
    [/^Delete workspace (.+)$/, (match) => `删除工作区 ${match[1]}`],
    [/^Environment:\s*(.+)$/, (match) => `环境：${match[1]}`],
    [/^Updated\s+(\d+\s+(?:seconds?|minutes?|hours?|days?)\s+ago|just now|today|yesterday)$/i, (match) => `更新于 ${translateDuration(match[1]).replace(/\s+ago$/i, "前").replace(/^just now$/i, "刚刚").replace(/^today$/i, "今天").replace(/^yesterday$/i, "昨天")}`],
    [/^(\d+)\s*(s|m|h|d|w|mo|y)\s+ago$/i, (m) => {
      const n = m[1];
      const unit = (m[2] || '').toLowerCase();
      const map = { s: '秒', m: '分钟', h: '小时', d: '天', w: '周', mo: '个月', y: '年' };
      return `${n} ${map[unit] || unit}前`;
    }],
    [/^just now$/i, () => '刚刚'],
    [/^today$/i, () => '今天'],
    [/^yesterday$/i, () => '昨天'],
    [/^(Updated|Created|Edited|Modified)\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)$/i, (match) => {
      const map = { Updated: '更新于', Created: '创建于', Edited: '编辑于', Modified: '修改于' };
      return `${map[match[1]] || '更新于'} ${match[2]}`;
    }],
    [/^(Updated|Created|Edited|Modified)\s+(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})$/i, (match) => {
      const map = { Updated: '更新于', Created: '创建于', Edited: '编辑于', Modified: '修改于' };
      return `${map[match[1]] || '更新于'} ${match[2]}`;
    }],
    [/^Models within this group:\s*(.+)$/, (match) => `此组包含的模型：${match[1]}`],
    [/^Are you sure you want to mark all (\d+) conversations as read\? This action cannot be undone\.$/, (match) => `确定要将全部 ${match[1]} 个对话标记为已读吗？此操作无法撤销。`],
    [/^You have (\d+) conversations in progress\. Updating will interrupt them, and they will automatically resume once the update completes\.$/, (match) => `当前有 ${match[1]} 个对话正在进行。更新会将其中断，并在更新完成后自动恢复。`],
    [/^You have (\d+) conversations in progress\. Updating will cancel them and you'll need to manually restart them\.$/, (match) => `当前有 ${match[1]} 个对话正在进行。更新会将其取消，之后需要手动重新启动。`],
    [/^There was an error determining the code changes that this undo action will make:\s*(.+)$/, (match) => `无法确定此次撤销会造成哪些代码更改：${match[1]}`],
    // Labels that the app builds as `Label ${shortcut}` in one template string,
    // e.g. `Send message ${Q}` where Q is "Enter" or "↵". The label alone is a
    // dictionary entry, but the concatenated form never matches a lookup, so it
    // needs a rule of its own. The shortcut token is kept verbatim.
    [/^(Send message|Queue message|Send immediately)\s+(Enter|Alt\+Enter|Shift\+Enter|Ctrl\+Enter|Cmd\+Enter|⌘\+Enter|⌥\+Enter|↵|⌥↵|⏎)$/,
      (match) => `${translateValue(match[1])} ${match[2]}`],
    [/^(Record Audio|Stop Recording|Send message|Queue message)\s+(Ctrl\+[A-Za-z]|Alt\+[A-Za-z]|Shift\+[A-Za-z]|Cmd\+[A-Za-z]|⌘[A-Za-z]|⌥[A-Za-z])$/,
      (match) => `${translateValue(match[1])} ${match[2]}`],
    // Git 成功通知中的动态分支说明 (R7 修复)
    [/^Committed to (.+)\.$/i, (m) => `已提交到 ${m[1]}。`],
    [/^Amended commit on (.+)\.$/i, (m) => `已修改 ${m[1]} 上的提交。`],
    // 账号数量、方案限定提示与凭据名称 (R8 修复)
    [/^(\d+)\s+accounts$/i, (m) => `${m[1]} 个账号`],
    [/^Secret for (.+)$/i, (m) => `${m[1]} 的凭据`],
    [/^For (.+) accounts, this setting is disabled\.$/i, (m) => `${m[1]} 账号无法更改此设置。`],
    // 侧边面板入口卡片说明整句保底 (R6 辅助)
    [/^Stream and control\s+(.+)\s+directly in the side pane\.$/i, (m) => `在侧边面板中实时查看和控制 ${m[1]}。`],
    // 日志空状态保底 (R4 辅助)
    [/^No logs available\.?$/i, () => "暂无可用日志。"],
  ];



  const translatableAttributes = ["aria-label", "placeholder", "data-placeholder", "title", "alt"];
  const opaqueSelector = "script, style, code, pre, [data-antigravity-user-content='true'], " +
    ".monaco-editor .view-lines, .xterm-screen, .line-content, .token, " +
    ".rounded-xl.border.overflow-hidden.p-4.font-mono.text-sm.leading-relaxed, " +
    "[data-testid='breadcrumb-segment'], [data-testid='settings-nav-item-Account'], " +
    "[data-testid='commentable-content'] .leading-relaxed.select-text, " +
    "[data-testid='setup-script-output'], [data-testid='agent-embed']";
  // These identifiers come from Antigravity 2.18.1's renderer. UI buttons inside
  // a message stay translatable; authored prose, names and tool output do not.
  const conversationSelector = "[data-testid='user-input-step'], [data-testid='planner-response-text'], " +
    "[data-testid='pending-user-messages'], [role='article'][aria-label='User message'], " +
    "[role='article'][aria-label='用户消息'], [role='article'][aria-label='Agent response'], " +
    "[role='article'][aria-label='智能体回复']";
  const uiSelector = "button, [role='button'], [role='menuitem'], [data-antigravity-ui='true'], " +
    "label, [role='radio'], [role='checkbox'], [role='option'], [role='listbox'], " +
    "[data-testid$='-step'], [data-testid='agent-loading'], .animate-shimmer-text, [data-testid$='-collapsible'], " +
    "[data-testid$='-collapsible-trigger'], [data-testid='running-items-panel'], " +
    ".group.flex.w-full.min-w-0.items-center, [class*='select-none'][class*='min-h-8']";
  const identitySelector = 'a[href^="/c/"], [data-testid="conversation-row-history"] span.truncate.inline-block.text-left';

  function isOpaque(element) {
    if (isProjectIdentity(element)) return true;
    const root = element?.closest(opaqueSelector);
    // 日志空状态占位提示并非真实日志，特例放行 (R4 修复)
    if (root?.matches("pre") && /^No logs available\.?$/i.test(root.textContent?.trim() || "")) return false;
    // Code block action buttons (like Copy code) are UI controls, not code characters.
    if (root?.matches('pre, code') && element?.closest(uiSelector)) return false;
    // Only the application's gutter control is UI; every code character stays opaque.
    if (root?.matches('.line-content') && root.closest('.file-viewer-root') &&
        !root.closest('pre, code, [data-antigravity-user-content], [data-testid="agent-embed"]') &&
        (element === root || element.closest('button[data-testid="gutter-comment-button"]'))) return false;
    // Visit only terminal input metadata; screen rows and all terminal text stay protected.
    if (root?.matches('.xterm-screen') && element.matches('.xterm-screen, .xterm-helpers, textarea.xterm-helper-textarea')) return false;
    return Boolean(root);
  }
  function isConversationContent(element) {
    const root = element?.closest(conversationSelector);
    if (!root) return false;
    const control = element.closest(uiSelector);
    return !(control && root.contains(control));
  }
  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    return !parent || isOpaque(parent) || Boolean(parent.closest('.xterm-screen')) || parent.isContentEditable ||
      Boolean(parent.closest('.line-content') && !parent.closest('button[data-testid="gutter-comment-button"]')) ||
      Boolean(parent.closest("textarea, input")) || isConversationContent(parent) ||
      Boolean(parent.closest(identitySelector));
  }
  function translateValue(value) {
    if (!value) return value;
    if (translationCache.has(value)) return translationCache.get(value);
    const core = value.trim();
    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    let result = value;
    if (themePresetNames.has(core) || diffSourceNames.has(core) || ['Artifact', 'Schedule', 'Prompt'].includes(core)) return value;
    const normalizedCore = core.replace(/\s+/g, " ");
    if (translations.has(core)) result = leading + translations.get(core) + trailing;
    else if (translations.has(normalizedCore)) result = leading + translations.get(normalizedCore) + trailing;
    else for (const [pattern, replacement] of regexTranslations) {
      const match = core.match(pattern);
      if (match) { result = leading + replacement(match) + trailing; break; }
    }
    if (translationCache.size < MAX_CACHE_ENTRIES) translationCache.set(value, result);
    return result;
  }
  function originalText(node) {
    const saved = nodeOriginals.get(node);
    if (saved && node.nodeValue === saved.applied) return saved.original;
    if (saved) nodeOriginals.delete(node);
    return node.nodeValue;
  }
  function writeText(node, value, original = originalText(node)) {
    if (value === original) nodeOriginals.delete(node);
    else nodeOriginals.set(node, { original, applied: value });
    if (node.nodeValue !== value) node.nodeValue = value;
  }
  function translateTextNode(node) {
    if (shouldSkipTextNode(node)) return;
    const parent = node.parentElement;
    translateOnboardingContainer(parent);
    if (translateArchivedNotification(parent)) return;
    if (parent.childNodes.length > 1 && translateSplitNoPhrase(parent)) return;
    const original = originalText(node);
    // A bare "No" inside a split sentence is not a yes/no response.
    if (original?.trim() === "No" && !parent.closest("button, label, [role='button'], [role='option']")) return;
    let translated = translateValue(original);
    const core = original?.trim();
    translated = translateOnboardingFragment(parent, original, translated);
    translated = translateScheduledText(parent, original, translated);
    // 侧边面板入口前后片段翻译 (R6 修复)
    if (core === "Stream and control") translated = original.replace(core, "在侧边面板中实时查看和控制");
    if (core === "directly in the side pane.") translated = original.replace(core, "。");
    if ((core === 'project' || core === 'workspace') && isDeleteConfirmation(parent)) translated = original.replace(core, core === 'project' ? '项目' : '工作区');
    if (core === 'Artifact' && parent.closest('[aria-label="Artifact Viewer header"], [aria-label="成果查看器标题栏"]')) translated = original.replace(core, translations.get(core) || core);
    const fileTab = parent.closest('button[data-tab-id^="file__"]');
    if (fileTab) translated = translateFileTabLabel(fileTab, original);
    else if (parent.closest('[data-testid="diff-source-label"]')) translated = translateDiffSourceLabel(original);
    if (themePresetNames.has(core) && isThemePresetControl(parent) && translations.has(core)) translated = original.replace(core, translations.get(core));
    const screen = settingsScreen(parent);
    if (core === "Type" && parent.closest('[data-testid="plan-command-fyi-alert"]')) translated = original.replace("Type", "输入");
    if (core === "Plan" && parent.matches('h3') && screen === "Models & Usage") translated = original.replace("Plan", "订阅方案");
    if (screen === "Application" && /Win/.test(navigator.platform)) {
      if (core === "Keep In Menu Bar") translated = "保留在系统托盘";
      if (core === "Keep the app accessible from the menu bar and running in the background when all windows are closed.")
        translated = "所有窗口关闭后，仍可从系统托盘访问应用并保持后台运行。";
    }
    if (screen === "Conversations" && core === "when working in this project.") translated = "（用于非项目对话）。";
    if (parent.matches('.markdown-alert-title') || parent.closest('.markdown-alert-title')) {
      const alertMap = { 'NOTE': '注意', 'TIP': '提示', 'IMPORTANT': '重要', 'WARNING': '警告', 'CAUTION': '小心' };
      if (alertMap[core]) translated = original.replace(core, alertMap[core]);
    }
    if (parent.matches('title')) translated = original.replace(/ - Outside of Project - Antigravity$/, " - 项目之外 - Antigravity");
    writeText(node, translated, original);
    const themeControl = parent.closest('[role="combobox"], [role="option"]');
    if (themeControl && (themePresetNames.has(core) || elementOriginals.get(themeControl)?.get('title')?.themePreset)) updateThemePresetTooltip(themeControl);
  }
  function settingsScreen(element) {
    const wrapper = element.closest('.p-6.flex.flex-col.gap-4');
    const heading = wrapper?.querySelector('h2');
    if (!heading) return null;
    return originalElementText(heading);
  }
  function originalElementText(element) {
    if (!element) return '';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text = '', node;
    while ((node = walker.nextNode())) text += originalText(node);
    return text.trim();
  }
  function translateOnboardingFragment(parent, original, translated) {
    const core = original.trim();
    // 接收推广邮件复选框跨节点处理 (R5 修复)
    if (parent.matches("label, span, div") && originalElementText(parent).includes("Yes, I'd like to receive product updates, tips, and promotions from Google")) {
      const parts = {
        "Yes, I'd like to receive product updates, tips, and promotions from Google": "我愿意接收 Google ",
        " via email.": " 的产品更新、使用技巧和推广邮件。",
        "via email.": "的产品更新、使用技巧和推广邮件。",
      };
      if (parts[core]) return original.replace(core, parts[core]);
    }
    if (parent.matches('p') && originalText(parent.firstChild)?.trim().startsWith('Plugins are packaged collections')) {
      const raw = originalElementText(parent).replace(/\s+/g, ' ');
      if (raw === 'Plugins are packaged collections of skills and MCPs to help the Agent in Antigravity work with Google developer products. You can always change your choices in Settings.') {
        const parts = {
          'Plugins are packaged collections of skills and MCPs to help the Agent': '插件将技能与 MCP 工具打包，帮助代理',
          'in Antigravity': '在 Antigravity 中',
          'Plugins are packaged collections of skills and MCPs to help the Agent in': '插件将技能与 MCP 工具打包，帮助',
          'Antigravity': 'Antigravity 中的代理',
          'work with Google developer products. You can always change your choices in Settings.': '使用 Google 开发者产品。你可以随时在设置中更改选择。',
        };
        if (parts[core]) return original.replace(core, parts[core]);
      }
    }
    if (parent.matches('span') && parent.querySelector('a[href="https://antigravity.google/terms"]') &&
        parent.querySelector('a[href="https://policies.google.com/privacy"]') &&
        originalElementText(parent).startsWith('Yes, I agree to help improve Antigravity by allowing Google')) {
      const parts = {
        'Yes, I agree to help improve': '是的，我同意帮助改进',
        'by allowing Google to collect and use my Interactions data, subject to the': '，允许 Google 收集和使用我的交互数据，并遵守',
        'and': '和',
        '. I understand I can choose to opt out later whenever I want via my settings.': '。我了解以后可以随时在设置中选择退出。',
      };
      if (parts[core]) return original.replace(core, parts[core]);
    }
    return translated;
  }
  function translateOnboardingContainer(element) {
    const paragraph = element.closest('p');
    let consent = element.closest('span');
    while (consent && !consent.querySelector('a[href="https://antigravity.google/terms"]')) consent = consent.parentElement?.closest('span');
    for (const parent of [paragraph, consent]) {
      if (!parent || isOpaque(parent) || isConversationContent(parent) || parent.isContentEditable) continue;
      // Rescan only these known split UI sentences when a later fragment arrives.
      const prefix = parent.firstChild?.nodeType === Node.TEXT_NODE ? originalText(parent.firstChild).trim() : '';
      if (!prefix.startsWith('Plugins are packaged collections') && !prefix.startsWith('Yes, I agree to help improve') && !prefix.startsWith("Yes, I'd like to receive product updates")) continue;
      for (const node of parent.childNodes) if (node.nodeType === Node.TEXT_NODE) {
        const original = originalText(node);
        writeText(node, translateOnboardingFragment(parent, original, translateValue(original)), original);
      }
    }
  }
  function localizeProjectTutorial(element) {
    const card = element.closest('[data-testid="nux-card"]');
    if (!card || card.querySelector('[data-antigravity-zh-project-guide]') || isConversationContent(card) || isOpaque(card)) return;
    const title = card.querySelector('.text-base.font-medium.text-foreground');
    if (originalElementText(title) !== 'Creating a Project') return;
    const media = Array.from(card.children).find(child => child.matches('img, video'));
    if (!media) return;
    const guide = document.createElement('div');
    guide.setAttribute('data-antigravity-zh-project-guide', 'true');
    guide.setAttribute('role', 'img');
    guide.setAttribute('aria-label', '创建项目：在项目列表中点击加号，选择新建项目，然后填写项目信息。');
    guide.style.cssText = 'padding:24px 20px;background:var(--secondary);color:var(--foreground);font:14px/1.6 system-ui,sans-serif;';
    const heading = document.createElement('div'); heading.textContent = '创建你的第一个项目';
    heading.style.cssText = 'font-size:18px;font-weight:600;margin-bottom:16px;'; guide.append(heading);
    for (const text of ['① 在侧边栏找到“项目”，点击旁边的 ＋', '② 选择“新建项目”', '③ 填写项目信息，点击“创建项目”']) {
      const step = document.createElement('div'); step.textContent = text;
      step.style.cssText = 'padding:8px 12px;margin-top:8px;border:1px solid var(--border);border-radius:8px;background:var(--background);';
      guide.append(step);
    }
    const original = originalAttribute(media, 'style'); media.style.display = 'none';
    writeAttribute(media, 'style', media.getAttribute('style'), original);
    card.insertBefore(guide, media); controller.removables.add(guide);
  }
  function originalAttribute(element, attribute) {
    const current = element?.getAttribute(attribute);
    const record = elementOriginals.get(element)?.get(attribute);
    return record && current === record.applied ? record.original : current;
  }
  function isDeleteConfirmation(element) {
    return /^Delete (Project|Workspace)$/.test(originalElementText(element.closest('[role="dialog"]')?.querySelector('h2')));
  }
  function scheduledDialog(element) {
    const dialog = element.closest('[role="dialog"]');
    return dialog?.querySelector('[data-testid="new-sidecar-modal"]') ? dialog : null;
  }
  function translateScheduledText(parent, original, translated) {
    const dialog = scheduledDialog(parent);
    if (!dialog) return translated;
    const core = original.trim();
    if (core === 'Schedule' || core === 'Prompt') return original.replace(core, translations.get(core) || core);
    if (core === 'around') return original.replace(core, '约在');
    if (core === 'on') {
      const frequency = dialog.querySelector('[data-testid="schedule-frequency-trigger"]')?.getAttribute('data-frequency');
      return original.replace(core, frequency === 'custom' ? '规则' : '在');
    }
    // React splits this fixed sentence into three text nodes. Keep that structure.
    if (/^All (scheduled task|automation)s run as Flash\.$/.test(originalElementText(parent))) {
      const parts = {'All':'所有', 'scheduled task':'定时任务', 'automation':'自动化任务', 's run as Flash.':'均使用 Flash 模型运行。'};
      if (parts[core]) return parts[core];
    }
    const time = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(core);
    if (time && parent.closest('[role="combobox"], [role="option"]')) {
      const hour = Number(time[1]) % 12 + (time[3] === 'PM' ? 12 : 0);
      return original.replace(core, `${String(hour).padStart(2, '0')}:${time[2]}`);
    }
    return translated;
  }
  function isProjectIdentity(element) {
    if (!element) return false;
    const nav = element.closest('[data-testid^="settings-nav-item-"]');
    if (nav && /^(Projects?|Workspaces?)$/.test(originalElementText(nav.parentElement?.previousElementSibling?.querySelector('h2')))) return true;
    if (element.matches('span') && ['Edit project name', 'Edit workspace name'].includes(originalAttribute(element.parentElement?.querySelector(':scope > button[aria-label]'), 'aria-label'))) return true;
    if (element.matches('strong')) {
      const first = element.parentElement.firstChild;
      if ((first?.nodeType === Node.TEXT_NODE && originalText(first).trim() === 'Permanently delete') || isDeleteConfirmation(element)) return true;
    }
    // The scheduled-task selector shows the user's project names, including names
    // that happen to equal dictionary keys. Its popup is portalled into the dialog.
    if (element.matches('span.truncate:not(.text-muted-foreground)')) {
      const dialog = scheduledDialog(element);
      const modal = dialog?.querySelector('[data-testid="new-sidecar-modal"]');
      const label = modal && [...modal.querySelectorAll('label')].find(e => originalElementText(e) === 'Project');
      const picker = label?.parentElement.querySelector('[role="combobox"]');
      if (picker && (picker.contains(element) || element.closest('[role="listbox"]')?.id === `${picker.id}-list`)) return true;
    }
    return false;
  }
  function isThemePresetControl(element) {
    const control = element.closest('[role="combobox"], [role="option"]');
    if (!control) return false;
    if (control.matches('[role="combobox"]')) return settingsScreen(control) === 'Appearance';
    const listbox = control.closest('[role="listbox"]');
    return Boolean(listbox?.id && [...document.querySelectorAll('[role="combobox"][aria-controls]')]
      .some(trigger => trigger.getAttribute('aria-controls') === listbox.id && settingsScreen(trigger) === 'Appearance'));
  }
  function translateDiffSourceLabel(value) {
    return value.replace(/^(\s*)\(?([^()]+)\)?(\s*)$/, (full, leading, source, trailing) => {
      if (!diffSourceNames.has(source) || !translations.has(source)) return full;
      const text = translations.get(source);
      return leading + (value.trim().startsWith('(') ? `（${text}）` : text) + trailing;
    });
  }
  function translateFileTabLabel(tab, value) {
    const uri = tab.getAttribute('data-tab-id').slice(6);
    let name;
    try { name = decodeURIComponent(new URL(uri).pathname.split('/').pop()); } catch { return value; }
    for (const source of diffSourceNames) {
      if (translations.has(source) && value === `${name} (${source})`) return `${name}（${translations.get(source)}）`;
    }
    return value;
  }
  function updateThemePresetTooltip(element) {
    if (!element.matches('[role="combobox"], [role="option"]')) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let raw = '', node;
    while ((node = walker.nextNode())) raw += originalText(node);
    raw = raw.trim();
    const current = element.getAttribute('title');
    const saved = elementOriginals.get(element);
    const record = saved?.get('title');
    if (themePresetNames.has(raw) && isThemePresetControl(element) && translations.has(raw)) {
      writeAttribute(element, 'title', `原名：${raw}`, record && current === record.applied ? record.original : current);
      const next = elementOriginals.get(element)?.get('title');
      if (next) { next.literal = true; next.themePreset = true; }
    } else if (record?.themePreset) {
      if (current === record.applied) {
        if (record.original === null) element.removeAttribute('title');
        else element.setAttribute('title', record.original);
      }
      saved.delete('title');
      if (!saved.size) elementOriginals.delete(element);
    }
  }
  function translateArchivedNotification(element) {
    const paragraph = element.closest('p');
    const toast = paragraph?.closest('[data-testid="toast-notification"][data-notification-tag^="archive-conversation-"]');
    if (!toast || isOpaque(paragraph) || isConversationContent(paragraph)) return false;
    const link = paragraph.querySelector('a[href="notification://history"]');
    if (!link) return false;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const nodes = []; let node;
    while ((node = walker.nextNode())) nodes.push(node);
    if (nodes.map(originalText).join('').replace(/\s+/g, ' ').trim() !== 'View archived conversations in history.') return false;
    const start = nodes.findIndex(node => link.contains(node));
    const end = nodes.findLastIndex(node => link.contains(node));
    if (start <= 0 || end >= nodes.length - 1) return false;
    // Preserve the existing anchor and React nodes, including its click handler.
    nodes.forEach((node, index) => writeText(node,
      index === 0 ? '已归档的对话可在' : index === start ? '历史记录' : index === end + 1 ? '中查看。' : '', originalText(node)));
    return true;
  }
  function translateSplitNoPhrase(element) {
    if (element.childElementCount || !element.firstChild ||
        shouldSkipTextNode(element.firstChild)) return false;
    const nodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    if (!nodes.length) return false;
    const originals = nodes.map(originalText);
    const raw = originals.join("");
    const match = raw.match(/^(?:No|否) (matching )?(projects|项目|workspaces|工作区)( found| available)?$/);
    if (!match) return false;
    let applied = translations.get(raw);
    if (!applied) {
      const noun = /^(projects|项目)$/.test(match[2]) ? "项目" : "工作区";
      applied = match[1] ? `没有匹配的${noun}` : match[3] === " available" ? `没有可用的${noun}` : `没有找到${noun}`;
    }
    nodes.forEach((node, index) => writeText(node, index ? "" : applied, originals[index]));
    return true;
  }
  function writeAttribute(element, attribute, next, original) {
    let saved = elementOriginals.get(element);
    if (!saved) { saved = new Map(); elementOriginals.set(element, saved); }
    if (next === original) saved.delete(attribute);
    else saved.set(attribute, { original, applied: next });
    if (!saved.size) elementOriginals.delete(element);
    if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
  }
  function translateEmbeddedFrameMetadata(frame) {
    const current = frame.getAttribute('title');
    const record = elementOriginals.get(frame)?.get('title');
    const original = record && current === record.applied ? record.original : current;
    if (original === 'Inline Widget') writeAttribute(frame, 'title', translateValue(original), original);
  }
  function translateElement(element) {
    if (element instanceof Element && element.matches('iframe[data-testid="agent-embed-iframe"]') && element.closest('[data-testid="agent-embed"]')) {
      translateEmbeddedFrameMetadata(element);
      return;
    }
    if (element instanceof Element && element.matches('[data-testid="agent-embed"]')) {
      for (const frame of element.querySelectorAll('iframe[data-testid="agent-embed-iframe"]')) translateEmbeddedFrameMetadata(frame);
      return;
    }
    if (!(element instanceof Element) || isOpaque(element)) return;
    translateOnboardingContainer(element);
    localizeProjectTutorial(element);
    if (element.matches(identitySelector)) return;
    if (element.matches('[data-testid="fastpick-prefix-trigger"]')) {
      const current = element.getAttribute('style');
      const record = elementOriginals.get(element)?.get('style');
      const original = record && current === record.applied ? record.original : current;
      element.style.whiteSpace = 'nowrap'; element.style.flexShrink = '0';
      writeAttribute(element, 'style', element.getAttribute('style'), original);
    }
    if (element.matches('[role="article"][aria-label="User message"]')) {
      writeAttribute(element, 'aria-label', '用户消息', 'User message');
    }
    if (element.matches('[role="article"][aria-label="Agent response"]')) {
      writeAttribute(element, 'aria-label', '智能体回复', 'Agent response');
    }
    if (!isConversationContent(element)) {
      translateSplitNoPhrase(element);
      translateArchivedNotification(element);
    }
    // Translate UI metadata on editable controls, without touching their value or
    // editable descendants. Authored titles/alt text inside messages stay intact.
    if (isConversationContent(element)) return;
    updateThemePresetTooltip(element);
    if (element.matches('[data-testid="plan-command-fyi-alert"]')) {
      const icon = element.querySelector("svg");
      if (icon) {
        for (const [attribute, text] of [
          ["title", "在输入框中输入 / 并选择 plan，可让代理先生成计划再执行任务。若只想生成计划，也可以直接输入 /plan。"],
          ["aria-label", "计划模式使用说明"],
        ]) {
          const value = icon.getAttribute(attribute);
          const record = elementOriginals.get(icon)?.get(attribute);
          writeAttribute(icon, attribute, text, record && value === record.applied ? record.original : value);
          elementOriginals.get(icon)?.get(attribute) && (elementOriginals.get(icon).get(attribute).literal = true);
        }
        icon.style.removeProperty("cursor");
      }
    }
    for (const attribute of translatableAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const record = elementOriginals.get(element)?.get(attribute);
      if (record?.literal && current === record.applied) continue;
      const original = record && current === record.applied ? record.original : current;
      const fileTab = element.closest('button[data-tab-id^="file__"]');
      const fileLabel = fileTab && attribute === 'title' && (element === fileTab || element.matches('div.whitespace-nowrap[title]'));
      const imageLabel = attribute === 'alt' && element.matches('img[draggable="false"].object-contain') &&
        element.closest('[role="region"][aria-label="File Viewer"], [role="region"][aria-label="文件查看器"]') && original?.startsWith('Image: ');
      const next = fileLabel ? translateFileTabLabel(fileTab, original) : imageLabel ? original.replace(/^Image: /, '图片：') : translateValue(original);
      writeAttribute(element, attribute, next, original);
    }
  }
  const rootFilter = {
    acceptNode(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
      if (node.matches('[data-testid="agent-embed"]')) return NodeFilter.FILTER_ACCEPT;
      if (node.matches('iframe[data-testid="agent-embed-iframe"]') && node.closest('[data-testid="agent-embed"]')) return NodeFilter.FILTER_ACCEPT;
      if (isOpaque(node) || node.parentElement?.isContentEditable ||
          node.parentElement?.closest("textarea")) return NodeFilter.FILTER_REJECT;
      if (node.matches(uiSelector) || node.closest(uiSelector)) return NodeFilter.FILTER_ACCEPT;
      if (node.matches('[role="article"][aria-label="User message"], [role="article"][aria-label="用户消息"], [role="article"][aria-label="Agent response"], [role="article"][aria-label="智能体回复"]')) return NodeFilter.FILTER_ACCEPT;
      if (isConversationContent(node) && !node.querySelector(uiSelector)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  };
  function* nodesIn(root, filtered = true) {
    if (!root) return;
    if (!filtered || root.nodeType !== Node.ELEMENT_NODE || rootFilter.acceptNode(root) !== NodeFilter.FILTER_REJECT) {
      yield root;
      const walker = (root.ownerDocument || document).createTreeWalker(root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, filtered ? rootFilter : null);
      let node;
      while ((node = walker.nextNode())) yield node;
    }
  }
  function restoreNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const record = nodeOriginals.get(node);
      if (record && node.nodeValue === record.applied) node.nodeValue = record.original;
      nodeOriginals.delete(node);
    } else if (node instanceof Element) {
      const saved = elementOriginals.get(node);
      if (saved) for (const [attribute, record] of saved) {
        if (node.getAttribute(attribute) === record.applied) {
          if (record.original === null) node.removeAttribute(attribute);
          else node.setAttribute(attribute, record.original);
        }
      }
      elementOriginals.delete(node);
    }
  }

  const controller = {
    stopped: false, observer: null, timers: new Set(), frames: new Set(), removables: new Set(), badge: null, settingsClick: null,
    stop() {
      this.stopped = true;
      this.observer?.disconnect();
      if (this.settingsClick) document.removeEventListener('click', this.settingsClick, true);
      for (const id of this.timers) clearTimeout(id);
      for (const id of this.frames) cancelAnimationFrame(id);
      this.timers.clear(); this.frames.clear(); this.badge?.remove();
      for (const element of this.removables) element.remove();
      this.removables.clear();
    },
  };
  window.__antigravityZhPatchController = controller;
  function schedule(callback) {
    let done = false, frame, timer;
    const run = () => {
      if (done) return;
      done = true;
      if (timer !== undefined) { clearTimeout(timer); controller.timers.delete(timer); }
      if (frame !== undefined) { cancelAnimationFrame(frame); controller.frames.delete(frame); }
      if (!controller.stopped) callback();
    };
    if (typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(run); controller.frames.add(frame);
    }
    timer = setTimeout(run, 50); controller.timers.add(timer);
  }
  function start() {
    if (controller.stopped) return;
    if (!document.documentElement) {
      addEventListener("DOMContentLoaded", start, { once: true }); return;
    }
    controller.settingsClick = event => {
      const tab = event.target instanceof Element && event.target.closest('[data-testid^="settings-nav-item-"]');
      if (!tab || tab.classList.contains('bg-sidebar-secondary')) return;
      const dialog = tab.closest('[role="dialog"]');
      if (!dialog) return;
      schedule(() => {
        const scroller = dialog.querySelector('.flex.h-full.overflow-auto');
        if (scroller) scroller.scrollTop = 0;
      });
    };
    document.addEventListener('click', controller.settingsClick, true);
    const roots = new Set(), texts = new Set();
    let scheduled = false, job = null, initialPending = true;
    const clock = () => performance.now();
    function queueRoot(root) {
      if (!root?.isConnected) return;
      for (let parent = root.parentNode; parent; parent = parent.parentNode) if (roots.has(parent)) return;
      // Discard queued descendants when their ancestor arrives afterwards.
      for (const other of roots) if (root.contains(other)) roots.delete(other);
      for (const text of texts) if (root.contains(text)) texts.delete(text);
      roots.add(root);
    }
    function queueText(text) {
      if (!text?.isConnected) return;
      for (let parent = text.parentNode; parent; parent = parent.parentNode) if (roots.has(parent)) return;
      texts.add(text);
    }
    function requestDrain() { if (!scheduled) { scheduled = true; schedule(drain); } }
    function* initialJob() {
      // Restore earlier versions' records even in content that is now protected.
      // Both restoration and translation advance one DOM node per budget step.
      for (const node of nodesIn(document.documentElement, false)) yield { node, restore: true };
      for (const node of nodesIn(document.documentElement)) yield { node, restore: false };
    }
    function* translationJob(root) {
      for (const node of nodesIn(root)) yield { node, restore: false };
    }
    function completeInitial() {
      initialPending = false;
      document.documentElement.lang = "zh-CN";
      window.__antigravityZhPatchVersion = patchVersion;
      window.__antigravityZhPatchDictionarySize = translations.size;
      window.__antigravityZhPatchGuard = guard;
      window.__antigravityZhPatchInstalled = true;
      showBadge();
    }
    function drain() {
      scheduled = false;
      const deadline = clock() + 8;
      let count = 0;
      while (!controller.stopped && count < 400 && clock() < deadline) {
        if (!job) {
          if (texts.size) {
            const text = texts.values().next().value; texts.delete(text);
            if (text.isConnected) translateTextNode(text);
            count++; continue;
          }
          if (!roots.size) break;
          const root = roots.values().next().value; roots.delete(root);
          if (!root.isConnected) continue;
          job = translationJob(root);
        }
        const next = job.next();
        if (next.done) {
          job = null;
          if (initialPending) completeInitial();
          continue;
        }
        const { node, restore } = next.value;
        if (node.isConnected) {
          if (restore) restoreNode(node);
          else if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          else translateElement(node);
        }
        count++;
      }
      if (job || roots.size || texts.size) requestDrain();
    }
    controller.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const record = nodeOriginals.get(mutation.target);
          if (!record || mutation.target.nodeValue !== record.applied) queueText(mutation.target);
        } else if (mutation.type === "attributes") {
          const record = elementOriginals.get(mutation.target)?.get(mutation.attributeName);
          if (!record || mutation.target.getAttribute(mutation.attributeName) !== record.applied) queueRoot(mutation.target);
        } else for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) queueText(node);
          else queueRoot(node);
        }
      }
      if (texts.size || roots.size) requestDrain();
    });
    controller.observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: [...translatableAttributes, "class", "contenteditable", "data-testid", "data-antigravity-user-content"],
    });
    window.__antigravityZhPatchObserver = controller.observer;
    function showBadge() {
      if (!document.body || controller.stopped) return;
      const badge = document.createElement("div");
      badge.textContent = "中文补丁已加载";
      Object.assign(badge.style, { position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483647",
        padding: "8px 12px", borderRadius: "8px", color: "white", background: "rgba(25,110,65,.92)",
        font: "13px system-ui,sans-serif", pointerEvents: "none" });
      controller.badge = badge; document.body.appendChild(badge);
      const timer = setTimeout(() => { badge.remove(); controller.timers.delete(timer); }, 3500);
      controller.timers.add(timer);
    }
    window.__antigravityZhPatchRestore = () => {
      controller.stop(); window.__antigravityZhPatchInstalled = false; window.__antigravityZhPatchGuard = null;
      let count = 0;
      for (const node of nodesIn(document.documentElement, false)) { restoreNode(node); count++; }
      return count;
    };
    job = initialJob(); requestDrain();
  }
  start();
})();
