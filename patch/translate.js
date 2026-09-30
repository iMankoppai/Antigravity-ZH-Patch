(() => {
  const patchVersion = 26;
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
  const themePresetNames = new Set(['Catppuccin', 'Dracula', 'Monokai', 'One Light', 'One Dark Pro', 'Tokyo Night', 'Solarized Light', 'Solarized Dark', 'Vesper']);
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

  const regexTranslations = [
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
    [/^Worked for ((?:\d+(?:\.\d+)?[hms]\s*)+)$/, m => '处理了 '+m[1].replace(/([\d.]+)h/g,'$1 小时').replace(/([\d.]+)m/g,'$1 分钟').replace(/([\d.]+)s/g,'$1 秒')],
    [/^Version\s+(.+)$/, (match) => `版本 ${match[1]}`],
    [/^Select model, current:\s*(.+)$/, (match) => `选择模型，当前：${match[1]}`],
    [/^Select project, current:\s*(.+)$/, (match) => `选择项目，当前：${match[1] === "No Project" ? "未选择项目" : match[1]}`],
    [/^You have used some of your weekly limit, it will fully refresh in (.+)\.$/, (match) => `你已使用部分每周额度，将在 ${translateDuration(match[1])}后完全恢复。`],
    [/^You have used some of your 5-hour limit, it will fully refresh in (.+)\.$/, (match) => `你已使用部分五小时额度，将在 ${translateDuration(match[1])}后完全恢复。`],
    [/^No more older messages, showing (\d+) of (\d+)$/, (match) => `没有更早的消息，当前显示 ${match[1]}/${match[2]} 条`],
    [/^Load older messages, showing (\d+) of (\d+)$/, (match) => `加载更早的消息，当前显示 ${match[1]}/${match[2]} 条`],
    [/^Thought for (\d+)s$/, (match) => `思考了 ${match[1]} 秒`],
    [/^Worked for (\d+)s$/, (match) => `处理了 ${match[1]} 秒`],
    [/^Opens external link:\s*(.+)$/, (match) => `打开外部链接：${match[1]}`],
    [/^Remove\s+(.+)$/, (match) => `移除 ${match[1]}`],
    [/^Allow\s+(.+)\?$/, (match) => `允许执行“${match[1]}”吗？`],
    [/^Yes, and always allow '(.+)' in this conversation$/, (match) => `是，并在本次对话中始终允许“${match[1]}”`],
    [/^Yes, and always allow '(.+)' when not in a project$/, (match) => `是，并在非项目对话中始终允许“${match[1]}”`],
    [/^Yes, and always allow '(.+)'$/, (match) => `是，并始终允许“${match[1]}”`],
    [/^Send feedback as (.+)$/, (match) => `以 ${match[1]} 的身份发送反馈`],
    [/^Cancel \((.+)\)$/, (match) => `取消（${match[1]}）`],
    [/^Select modes, current:\s*(.+)$/, (match) => `选择模式，当前：${match[1]}`],
    [/^Install (.+)$/, (match) => `安装 ${match[1]}`],
    [/^Open (.+) skill$/, (match) => `打开 ${match[1]} 技能`],
    [/^\+(\d+) attachments$/, (match) => `另有 ${match[1]} 个附件`],
    [/^Unmount workspace (.+)$/, (match) => `卸载工作区 ${match[1]}`],
    [/^Delete workspace (.+)$/, (match) => `删除工作区 ${match[1]}`],
    [/^Environment:\s*(.+)$/, (match) => `环境：${match[1]}`],
    [/^Updated\s+(\d+\s+(?:seconds?|minutes?|hours?|days?)\s+ago|just now|today|yesterday)$/i, (match) => `更新于 ${translateDuration(match[1]).replace(/\s+ago$/i, "前").replace(/^just now$/i, "刚刚").replace(/^today$/i, "今天").replace(/^yesterday$/i, "昨天")}`],
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
    "[role='article'][aria-label='用户消息']";
  const uiSelector = "button, [role='button'], [role='menuitem'], [data-antigravity-ui='true']";
  const identitySelector = 'a[href^="/c/"], [data-testid="conversation-row-history"] span.truncate.inline-block.text-left';

  function isOpaque(element) {
    if (isProjectIdentity(element)) return true;
    const root = element?.closest(opaqueSelector);
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
    if (translations.has(core)) result = leading + translations.get(core) + trailing;
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
    if (parent.childNodes.length > 1 && translateSplitNoPhrase(parent)) return;
    const original = originalText(node);
    // A bare "No" inside a split sentence is not a yes/no response.
    if (original?.trim() === "No" && !parent.closest("button, label, [role='button'], [role='option']")) return;
    let translated = translateValue(original);
    const core = original?.trim();
    translated = translateScheduledText(parent, original, translated);
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
    if (!isConversationContent(element)) {
      translateSplitNoPhrase(element);
      // Preserve the original text nodes and link rather than replacing children.
      if (element.matches("p") && element.textContent?.trim() === "View archived conversations in history.") {
        const link = element.querySelector('a[href="notification://history"]');
        if (link) {
          if (link.previousSibling?.nodeType === Node.TEXT_NODE) writeText(link.previousSibling, "已归档的对话可在");
          for (const text of link.childNodes) if (text.nodeType === Node.TEXT_NODE) writeText(text, "历史记录");
          if (link.nextSibling?.nodeType === Node.TEXT_NODE) writeText(link.nextSibling, "中查看。");
        }
      }
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
      if (node.matches('[role="article"][aria-label="User message"], [role="article"][aria-label="用户消息"]')) return NodeFilter.FILTER_ACCEPT;
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
    stopped: false, observer: null, timers: new Set(), frames: new Set(), badge: null, settingsClick: null,
    stop() {
      this.stopped = true;
      this.observer?.disconnect();
      if (this.settingsClick) document.removeEventListener('click', this.settingsClick, true);
      for (const id of this.timers) clearTimeout(id);
      for (const id of this.frames) cancelAnimationFrame(id);
      this.timers.clear(); this.frames.clear(); this.badge?.remove();
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
