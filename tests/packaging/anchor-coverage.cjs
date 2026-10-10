'use strict';
// anchor-coverage.cjs - 注入锚点覆盖门禁。
// 针对本机官方原版备份，逐一核对引擎依赖的每个注入锚点是否“恰好命中 1 次”。
// 官方更新若改动或删除锚点，这里会先失败，而不是等到安装时才静默失效。
// 本机没有备份时跳过（不阻断；CI 用合成夹具）。
const fs = require('fs');
const path = require('path');
const reader = require('./lib/asar-reader.cjs');

const BACKUP = require('./lib/client-paths.cjs').pristinePath();
const failures = [];
const notes = [];

if (!BACKUP || !fs.existsSync(BACKUP)) {
  console.log(JSON.stringify({ skipped: true, reason: '未找到官方备份 ' + BACKUP }, null, 2));
  console.log('anchor coverage gate: SKIP');
  process.exit(0);
}

const archive = reader.open(BACKUP);
const text = (p) => { const b = archive.read(p); return b ? b.toString('utf8') : null; };

// 引擎实际使用的锚点（首个字符串参数），与 AsarCleanPatcher.cs 保持一致。
const anchors = [
  { file: 'dist/ipcHandlers.js', needle: "title: 'Open workspace'", label: '打开工作区标题' },
  { file: 'dist/ipcHandlers.js', needle: "title: 'Open workspaces'", label: '多工作区标题' },
  { file: 'dist/main.js', needle: 'const electron_1 = require("electron");', label: 'AppUserModelId 挂点' },
  { file: 'dist/main.js', needle: '    settingsService = new settingsService_1.SettingsService(storageManager);\n    // Handle deep link URL from command line arguments (All platforms)\n', label: '托盘后台挂点' },
  { file: 'dist/main.js', needle: '                        void win.loadURL(newUrl);', label: '主窗口注入挂点' },
  { file: 'dist/utils.js', needle: '    // Prevent the menu dropdown from being very wide due to long page titles', label: 'setAppDetails 挂点' },
  { file: 'dist/utils.js', needle: 'exports.showQuitConfirmation = false;\nfunction setShowQuitConfirmation(value) {\n', label: '关闭到托盘导出' },
  { file: 'dist/utils.js', needle: '    }\n    void win.loadURL(url);\n', label: '关闭到托盘事件' },
  { file: 'dist/utils.js', needle: '    void win.loadURL(url);', label: '工具窗口注入挂点' },
  { file: 'dist/tray.js', needle: 'let contextMenu = null;\n/**', label: '托盘菜单本地化' },
  { file: 'dist/tray.js', needle: '    contextMenu = electron_1.Menu.buildFromTemplate(actions);', label: '托盘菜单构建' },
  { file: 'dist/tray.js', needle: "    if (onClick && !(0, utils_1.isMacOS)()) {\n        tray.on('click', onClick);\n    }", label: '托盘双击唤醒' },
  { file: 'dist/tray.js', needle: '    contextMenu.insert(Math.min(position, contextMenu.items.length), new electron_1.MenuItem(options));\n    // Re-set the menu so the tray picks up the change.\n', label: '托盘菜单插入本地化' },
  { file: 'dist/tray.js', needle: "        if (countItem) {\n            countItem.label =\n                (count > 0 ? `${count}` : 'No') +\n                    ' agent' +\n                    (count === 1 ? '' : 's') +\n                    ' running';\n            tray.setContextMenu(contextMenu);\n", label: '托盘运行计数' },
  { file: 'dist/ideInstall/wizard.js', needle: '        void wizardWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);', label: '首次运行向导窗口' },
];

const cache = new Map();
for (const a of anchors) {
  if (!cache.has(a.file)) cache.set(a.file, text(a.file));
  const content = cache.get(a.file);
  if (content === null) { failures.push(`官方备份缺少文件：${a.file}`); continue; }
  const count = content.split(a.needle).length - 1;
  if (count !== 1) failures.push(`${a.label}（${a.file}）锚点命中 ${count} 次，期望恰好 1 次`);
}

// 备份应是官方原版（不含内核），否则锚点统计会失真。
if (archive.read('dist/zh-bundle.js') !== null) failures.push('备份不是官方原版（已含 zh-bundle.js），锚点统计不可信');

notes.push(`archive sha256=${archive.sha256}`);
notes.push(`anchors checked=${anchors.length}`);

const summary = { backup: BACKUP, anchors: anchors.length, failures: failures.length, notes };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('anchor coverage gate: PASS');
