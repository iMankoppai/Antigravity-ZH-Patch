'use strict';

// Electron dialogs have no DOM. Clone only their UI fields, keeping window
// overloads, callback/Promise behavior, response IDs and the original options.
function createNativeUi(dictionary) {
  const installed = new WeakSet();
  const nativeOnly = { Yes: '是' };
  const nativeRegexes = [
    [/^The WSL distro "(.+)" is no longer installed\.$/, m => `WSL 发行版“${m[1]}”已不再安装。`],
    // 2.32.1 SSH 远程管理与提示对话框（需置于通用 Sign in to ... 之前）
    [/^Stop the Antigravity server on (.+)\?$/, m => `停止 ${m[1]} 上的 Antigravity 服务器吗？`],
    [/^Sign in to your organization for (.+)\?$/, m => `为 ${m[1]} 登录你的组织吗？`],
    [/^Not connected to (.+)$/, m => `未连接到 ${m[1]}`],
    [/^SSH: (.+)$/, m => `SSH：${m[1]}`],
    [/^(.+) asks:$/, m => `${m[1]} 请求确认：`],
    [/^(.+) reported: ([\s\S]+)$/, m => `${m[1]} 返回信息：${translateNative(m[2])}`],
    [/^Continue only if you just chose to sign in with your organization in this window\. (.+) will get access to your organization's Google Cloud account\.\n(?:Workforce pool: (.+)  Provider: (.+)|Identity provider: (.+))$/, m =>
      `仅当你刚刚在本窗口选择了“通过组织登录”时才可继续。${m[1]} 将获得你所在组织的 Google Cloud 账号访问权限。\n` +
      (m[2] !== undefined ? `员工池：${m[2]}  身份提供商：${m[3]}` : `身份提供商：${m[4]}`)],
    [/^Error code: (.+)$/, m => `错误代码：${m[1]}`],
    [/^Logs: (.+)$/, m => `日志路径：${m[1]}`],
    [/^File: (.+) on (.+)$/, m => `文件：${m[2]} 上的 ${m[1]}`],
    // 2.27.0 WebAuthn 登录提示（webauthn.js）：站点标识保留原样。
    [/^Sign in to (.+)$/, m => `登录 ${m[1]}`],
  ];
  function translateSingle(value) {
    if (Object.hasOwn(dictionary, value)) return dictionary[value];
    if (Object.hasOwn(nativeOnly, value)) return nativeOnly[value];
    for (const [pattern, format] of nativeRegexes) {
      const m = value.match(pattern);
      if (m) return format(m);
    }
    return value;
  }
  function translateNative(value) {
    if (typeof value !== 'string') return value;
    const direct = translateSingle(value);
    if (direct !== value || !value.includes('\n')) return direct;
    // 多行原生弹窗（如 detail + Error code + Logs）逐行本地化，仅保留不认识的原始错误行。
    return value.split('\n').map(translateSingle).join('\n');
  }
  function localizeOptions(options, keys) {
    if (!options || typeof options !== 'object') return options;
    const next = { ...options };
    for (const key of keys) {
      if (typeof next[key] === 'string') next[key] = translateNative(next[key]);
    }
    if (keys.includes('buttons') && Array.isArray(next.buttons)) next.buttons = next.buttons.map(translateNative);
    return next;
  }
  // Only the context-menu IPC calls this function. Do not wrap Menu globally:
  // application menus use English labels as lookup keys, and WSL/other lists
  // contain names supplied by the user.
  const menuLabels = new Set([
    'Copy', 'Cut', 'Paste', 'Select All', 'Undo', 'Redo', 'Rename', 'Pin', 'Unpin',
    'Mark Read', 'Mark Unread', 'Archive', 'Restore', 'Delete', 'Delete Permanently',
    'Fork', 'Split', 'Share', 'Stop', 'View Debug', 'Telemetry', 'Move to Group',
    'New Group', 'Remove from Group', 'Rename Group', 'Delete Group', 'Move Up', 'Move Down',
    'Sort By', 'Last Updated', 'Last Prompt', 'Custom Order',
    'Copy Project Name', 'Copy Workspace Name', 'Copy Worktree Name',
    'Project Settings', 'Workspace Settings', 'Worktree Settings',
    'Delete Project', 'Delete Workspace', 'Delete Worktree',
    'Archive Project', 'Archive Workspace', 'Archive Worktree',
    'Show in File Explorer', 'Reveal in Finder', 'Show in Finder', 'Open in File Manager',
    'Open in Cider', 'Conversation Name', 'Conversation ID', 'Trajectory ID',
    'Project Name', 'Workspace Name', 'Worktree Name',
    'Copy Conversation ID', 'Copy Conversation Name', 'Copy Trajectory ID',
    'Copy Link', 'Copy Path', 'Copy Relative Path', 'Open Link', 'Open in Browser',
    'Open in New Tab', 'Open in New Window', 'Open in New Conversation',
    'Split Right', 'Split Down', 'Replace with New', 'Remove from Split', 'New Conversation',
    'Copy Image', 'Close Tab', 'Close Other Tabs', 'Close Tabs to the Right',
    'New Project', 'New Workspace', 'Create Project', 'Create Cloud Project', 'Quick Start',
    'Group By Workspace', 'Group By Project', 'Undo to Here', 'Mention', 'Copy debug info',
    'About', 'Check for Updates', 'Command Palette', 'Toggle Fullscreen',
    'Zoom In', 'Zoom Out', 'Reset Zoom', 'Minimize', 'Maximize', 'Close',
    'Save Video', 'Save Image', 'Open in Tab', 'New Tab', 'See more results',
    'Delete Hook', 'Add Hook Card', 'Delete Handler', 'Show Terminal', 'Hide Terminal',
    'Open Link in New Tab', 'Open Link in External Browser', 'Copy Link Address',
    'Open Image in New Tab', 'Copy Image Address', 'Open in External Browser',
    'Back', 'Forward', 'Reload', 'Copy Message', 'Fork in Current Workspace',
    'Fork in Shared Workspace', 'Fork in New Workspace', 'New Remote Project',
    'Toggle Status Bar', 'Give Feedback', 'Pin Tab', 'Unpin Tab',
    'Add to Chat', 'Copy File Path', 'Copy File Name',
    'Send Message', 'Queue Message', 'Send Immediately',
    'Open in Side Panel', 'Side Panel', 'Side Panel (Default)',
  ]);
  function translateContextMenuLabel(label, item) {
    if (typeof label !== 'string') return label;
    // Group names can equal UI words such as "Copy" or "Archive".
    if (item?.type === 'checkbox' && item.id?.startsWith('group-')) return label;
    return menuLabels.has(label) ? translateNative(label) : label;
  }
  function installNativeDialogs(dialog) {
    if (!dialog || installed.has(dialog)) return;
    const wrapDialog = (methods, keys) => {
      for (const key of methods) {
        const original = dialog[key];
        if (typeof original !== 'function') continue;
        dialog[key] = function (...args) {
          // Electron accepts (options) and (BrowserWindow, options).
          const index = args.length >= 2 && args[1] && typeof args[1] === 'object' ? 1 : 0;
          args[index] = localizeOptions(args[index], keys);
          return original.apply(this, args);
        };
      }
    };
    wrapDialog(['showMessageBox', 'showMessageBoxSync'], ['title', 'message', 'detail', 'checkboxLabel', 'buttons']);
    wrapDialog(['showOpenDialog', 'showOpenDialogSync', 'showSaveDialog', 'showSaveDialogSync'], ['title', 'buttonLabel', 'message']);
    const originalError = dialog.showErrorBox;
    if (typeof originalError === 'function') {
      dialog.showErrorBox = function (title, content) {
        // Diagnostic bodies may contain source code, paths and arbitrary errors.
        // Translate only the fixed UI title on this overload.
        return originalError.call(this, translateNative(title), content);
      };
    }
    installed.add(dialog);
  }
  return { translateNative, translateContextMenuLabel, installNativeDialogs };
}

module.exports = { createNativeUi };
