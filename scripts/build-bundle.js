'use strict';
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dictPath = path.join(rootDir, 'src/AntigravityZhManager/Assets/dictionaries.json');
const translatePath = path.join(rootDir, 'src/AntigravityZhManager/Assets/translate.js');
const outputPath = path.join(rootDir, 'src/AntigravityZhManager/Assets/zh-bundle.js');

console.log('📖 正在从核心 Assets 读取资源...');
const dictContent = fs.readFileSync(dictPath, 'utf8');
const dict = JSON.parse(dictContent);
const termCount = Object.keys(dict).length;
console.log(`✅ 词库加载成功，共 ${termCount} 条`);

const translateSrc = fs.readFileSync(translatePath, 'utf8');
console.log(`✅ 翻译脚本加载成功，大小 ${(translateSrc.length / 1024).toFixed(2)} KB`);

const bundleLines = [
  "'use strict';",
  "const dict = " + JSON.stringify(dict) + ";",
  "const translateCode = " + JSON.stringify(translateSrc) + ";",
  "const windows = new WeakSet();",
  "",
  "function attach(win, url) {",
  "  if (!win || win.isDestroyed()) return;",
  "  let allowedOrigin;",
  "  try {",
  "    const parsed = new URL(url);",
  "    if (parsed.protocol !== 'https:' || parsed.hostname !== '127.0.0.1') return;",
  "    allowedOrigin = parsed.origin;",
  "  } catch { return; }",
  "  ",
  "  const contents = win.webContents;",
  "  if (windows.has(contents)) return;",
  "  windows.add(contents);",
  "",
  "  const inject = () => {",
  "    if (contents.isDestroyed()) return;",
  "    try { if (new URL(contents.getURL()).origin !== allowedOrigin) return; } catch { return; }",
  "    const script = '(() => {\\n' +",
  "      '  window.__antigravityZhPatchDictionary = ' + JSON.stringify(dict) + ';\\n' +",
  "      '  window.__antigravityZhPatchDictionaryRevision = 1;\\n' +",
  "      '  window.__antigravityZhNativeAutoload = true;\\n' +",
  "      translateCode + '\\n' +",
  "      '})()';",
  "    contents.executeJavaScript(script, false).catch(() => {});",
  "  };",
  "",
  "  contents.on('dom-ready', inject);",
  "  contents.on('did-finish-load', inject);",
  "  inject();",
  "}",
  "",
  "module.exports = { attach };",
  ""
];

const bundleContent = bundleLines.join('\n');
fs.writeFileSync(outputPath, bundleContent, 'utf8');
console.log(`🎉 zh-bundle.js 构建成功并写入 Assets！文件大小: ${(bundleContent.length / 1024).toFixed(2)} KB`);
