'use strict';

// Electron dialogs have no DOM. Clone only their UI fields, keeping window
// overloads, callback/Promise behavior, response IDs and the original options.
function createNativeUi(dictionary) {
  const installed = new WeakSet();
  function translateNative(value) {
    if (typeof value !== 'string') return value;
    if (Object.hasOwn(dictionary, value)) return dictionary[value];
    const match = value.match(/^The WSL distro "(.+)" is no longer installed\.$/);
    return match ? `WSL 发行版“${match[1]}”已不再安装。` : value;
  }
  function localizeOptions(options) {
    if (!options || typeof options !== 'object') return options;
    const next = { ...options };
    for (const key of ['title', 'message', 'detail', 'checkboxLabel']) {
      if (typeof next[key] === 'string') next[key] = translateNative(next[key]);
    }
    if (Array.isArray(next.buttons)) next.buttons = next.buttons.map(translateNative);
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
  ]);
  function translateContextMenuLabel(label, item) {
    if (typeof label !== 'string') return label;
    // Group names can equal UI words such as "Copy" or "Archive".
    if (item?.type === 'checkbox' && item.id?.startsWith('group-')) return label;
    return menuLabels.has(label) ? translateNative(label) : label;
  }
  function installNativeDialogs(dialog) {
    if (!dialog || installed.has(dialog)) return;
    for (const key of ['showMessageBox', 'showMessageBoxSync']) {
      const original = dialog[key];
      if (typeof original !== 'function') continue;
      dialog[key] = function (...args) {
        // Electron accepts (options) and (BrowserWindow, options).
        const index = args.length >= 2 && args[1] && typeof args[1] === 'object' ? 1 : 0;
        args[index] = localizeOptions(args[index]);
        return original.apply(this, args);
      };
    }
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
