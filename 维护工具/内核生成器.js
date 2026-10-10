'use strict';
// 内核生成器的唯一实现。包装器模板只在这里维护一份；
// 维护工具/重建汉化内核.js 与 scripts/build-bundle.js 都只是它的入口。
//
// 生成逻辑是确定性的：同样的 dictionaries.json 与 translate.js 必然得到
// 同样的 zh-bundle.js 字节，不含时间戳、随机数或环境相关内容。
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'src', 'AntigravityZhManager', 'Assets');
const dictPath = path.join(assets, 'dictionaries.json');
const translatePath = path.join(assets, 'translate.js');
const bundlePath = path.join(assets, 'zh-bundle.js');

function loadSources() {
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const translateSrc = fs.readFileSync(translatePath, 'utf8');
  for (const [key, value] of Object.entries(dict)) {
    if (!key || typeof value !== 'string' || !value) throw new Error('Invalid dictionary entry: ' + key);
  }
  new vm.Script(translateSrc);
  return { dict, translateSrc };
}

// 受审查的 Electron 包装器模板。改动这里等于改动运行时注入方式，必须单独审查。
function buildBundle(dict, translateSrc) {
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
    "    const isLocalHttps = parsed.protocol === 'https:' && parsed.hostname === '127.0.0.1';",
    "    const isData = parsed.protocol === 'data:';",
    "    if (!isLocalHttps && !isData) return;",
    "    allowedOrigin = isData ? 'data:' : parsed.origin;",
    "  } catch { return; }",
    "  ",
    "  const contents = win.webContents;",
    "  if (windows.has(contents)) return;",
    "  windows.add(contents);",
    "",
    "  const inject = () => {",
    "    if (contents.isDestroyed()) return;",
    "    try { const cur = new URL(contents.getURL()); const key = cur.protocol === 'data:' ? 'data:' : cur.origin; if (key !== allowedOrigin) return; } catch { return; }",
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
  return bundleLines.join('\n');
}

function describe(dict, translateSrc, bundleText, stale) {
  return {
    checkOnly: null,
    terms: Object.keys(dict).length,
    patchVersion: Number(translateSrc.match(/const patchVersion = (\d+)/)?.[1]),
    changed: stale,
    bundleSha256: crypto.createHash('sha256').update(bundleText).digest('hex')
  };
}

// 生成（或只检查）内核。返回摘要；检查模式下不同步会抛错。
function generate({ checkOnly = false } = {}) {
  const { dict, translateSrc } = loadSources();
  const desired = buildBundle(dict, translateSrc);
  new vm.Script(desired);
  const current = fs.readFileSync(bundlePath, 'utf8');
  const stale = current !== desired;
  if (checkOnly) {
    if (stale) throw new Error('zh-bundle.js 与源码不同步，请先运行规范生成入口重建内核。');
  } else if (stale) {
    fs.writeFileSync(bundlePath, desired, 'utf8');
  }
  return Object.assign(describe(dict, translateSrc, desired, stale), { checkOnly });
}

module.exports = { generate, buildBundle, loadSources, bundlePath, assets };
