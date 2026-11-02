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
  const detailCatalogue = JSON.parse(fs.readFileSync(path.join(assets, 'skill-details.json'), 'utf8'));
  const nativeSrc = fs.readFileSync(path.join(assets, 'native-ui.js'), 'utf8');
  new vm.Script(nativeSrc);
  const themeCss = fs.readFileSync(path.join(assets, 'theme-azure-bubble.css'), 'utf8');
  const statsHudSrc = fs.readFileSync(path.join(assets, 'stats-hud.js'), 'utf8');
  new vm.Script(statsHudSrc);
  const bundleLines = [
    "'use strict';",
    "const dict = " + JSON.stringify(dict) + ";",
    "const translateCode = " + JSON.stringify(translateSrc) + ";",
    "const skillDetails = " + JSON.stringify(detailCatalogue) + ";",
    "const themeCss = " + JSON.stringify(themeCss) + ";",
    "const statsRenderSrc = " + JSON.stringify(statsHudSrc) + ";",
    nativeSrc,
    "const nativeUi = createNativeUi(dict);",
    "const windows = new WeakSet();",
    "const statsTimers = new WeakMap();",
    "",
    "function agCollectStats(convId) {",
    "  try {",
    "    const fs = require('fs'), path = require('path');",
    "    const base = process.env.USERPROFILE || process.env.HOME || '';",
    "    if (!base) return null;",
    "    const p = path.join(base, '.gemini', 'antigravity', 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl');",
    "    if (!fs.existsSync(p)) return null;",
    "    const lines = fs.readFileSync(p, 'utf8').split(/\\r?\\n/);",
    "    let turns = 0; const recs = [];",
    "    for (const line of lines) {",
    "      if (!line) continue;",
    "      let o; try { o = JSON.parse(line); } catch (e) { continue; }",
    "      if (o.type === 'USER_INPUT') turns++;",
    "      if (typeof o.output_tokens === 'number') recs.push({ i: o.input_tokens || 0, c: o.cache_read_tokens || 0, o: o.output_tokens, t: Date.parse(o.created_at || '') || 0, st: o.status || '' });",
    "    }",
    "    if (!recs.length) return { turns: turns, steps: 0, inTok: 0, cacheTok: 0, outTok: 0, ctx: 0, avgGrowth: 0, lastAtMs: 0, status: '', tokPerSec: 0 };",
    "    let inTok = 0, cacheTok = 0, outTok = 0;",
    "    for (const r of recs) { inTok += r.i; cacheTok += r.c; outTok += r.o; }",
    "    const recent = recs.slice(-5); let tokPerSec = 0;",
    "    if (recent.length >= 2) { const a = recent[0].t, b = recent[recent.length - 1].t; const dt = (b - a) / 1000; if (dt > 0) { let so = 0; for (const r of recent) so += r.o; tokPerSec = so / dt; } }",
    "    const growth = [];",
    "    for (let i = Math.max(1, recs.length - 20); i < recs.length; i++) { const dd = (recs[i].i + recs[i].c) - (recs[i-1].i + recs[i-1].c); if (dd > 0) growth.push(dd); }",
    "    let avgGrowth = 0; if (growth.length) { let sg = 0; for (const g of growth) sg += g; avgGrowth = sg / growth.length; }",
    "    const last = recs[recs.length - 1];",
    "    return { turns: turns, steps: recs.length, inTok: inTok, cacheTok: cacheTok, outTok: outTok, ctx: last.i + last.c, avgGrowth: avgGrowth, lastAtMs: last.t, status: last.st, tokPerSec: tokPerSec };",
    "  } catch (e) { return null; }",
    "}",
    "",
    "function agStatsEnabled() {",
    "  try { const fs = require('fs'), path = require('path'); const base = process.env.APPDATA || ''; if (!base) return false; const cfg = JSON.parse(fs.readFileSync(path.join(base, 'Antigravity', 'zh-stats.json'), 'utf8')); return cfg && cfg.enabled === true; } catch (e) { return false; }",
    "}",
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
    "      '  window.__antigravityZhSkillDetails = ' + JSON.stringify(skillDetails) + ';\\n' +",
    "      '  window.__antigravityZhNativeAutoload = true;\\n' +",
    "      translateCode + '\\n' +",
    "      '})()';",
    "    contents.executeJavaScript(script, false).catch(() => {});",
    "    let themeOn = false;",
    "    try { const fs = require('fs'); const path = require('path'); const base = process.env.APPDATA || process.env.HOME || ''; if (base) { const cfg = JSON.parse(fs.readFileSync(path.join(base, 'Antigravity', 'zh-theme.json'), 'utf8')); themeOn = cfg && cfg.azureBubble === true; } } catch {}",
    "    const themeScript = '(() => {\\n' +",
    "      '  const id = \"ag-azure-bubble-style\";\\n' +",
    "      '  let el = document.getElementById(id);\\n' +",
    "      '  if (!' + themeOn + ') { if (el) el.remove(); window.__antigravityZhThemeEnabled = false; return; }\\n' +",
    "      '  if (!el) { el = document.createElement(\"style\"); el.id = id; (document.head || document.documentElement).appendChild(el); }\\n' +",
    "      '  const css = ' + JSON.stringify(themeCss) + ';\\n' +",
    "      '  if (el.textContent !== css) el.textContent = css;\\n' +",
    "      '  window.__antigravityZhThemeEnabled = true;\\n' +",
    "      '})()';",
    "    contents.executeJavaScript(themeScript, false).catch(() => {});",
    "    if (agStatsEnabled()) {",
    "      const prev = statsTimers.get(contents); if (prev) clearInterval(prev);",
    "      contents.executeJavaScript(statsRenderSrc, false).catch(() => {});",
    "      const timer = setInterval(() => {",
    "        if (contents.isDestroyed()) { clearInterval(timer); statsTimers.delete(contents); return; }",
    "        if (!agStatsEnabled()) { clearInterval(timer); statsTimers.delete(contents); try { contents.executeJavaScript('window.__agStatsRemove && window.__agStatsRemove()', false).catch(() => {}); } catch (e) { } return; }",
    "        try {",
    "          const cur = contents.getURL(); const mm = (cur || '').match(/\\/c\\/([0-9a-fA-F-]{36})/);",
    "          if (!mm) return;",
    "          const data = agCollectStats(mm[1]);",
    "          if (data) contents.executeJavaScript('window.__agStatsRender && window.__agStatsRender(' + JSON.stringify(data) + ')', false).catch(() => {});",
    "        } catch (e) { }",
    "      }, 2000);",
    "      statsTimers.set(contents, timer);",
    "      if (!contents.__agStatsDestroyHooked) { contents.__agStatsDestroyHooked = true; contents.once('destroyed', () => { const t = statsTimers.get(contents); if (t) clearInterval(t); statsTimers.delete(contents); }); }",
    "    }",
    "  };",
    "",
    "  contents.on('dom-ready', inject);",
    "  contents.on('did-finish-load', inject);",
    "  inject();",
    "}",
    "",
    "module.exports = { attach, installNativeDialogs: nativeUi.installNativeDialogs, translateContextMenuLabel: nativeUi.translateContextMenuLabel };",
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
