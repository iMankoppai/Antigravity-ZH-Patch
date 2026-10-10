'use strict';
// 生成/更新官方基线与备份清单（localization/client-baselines.json）。
//
// 清单记录每个受支持客户端版本的“官方原版”哈希与必需注入目标，以及本项目
// 产出过的“已知补丁版”哈希。安装与还原据此识别未知版本和错版备份，避免误覆盖。
//
// 用法：
//   node 维护工具/生成基线清单.js
//   node 维护工具/生成基线清单.js --asar <path> --backup <path> --version <客户端版本>
const fs = require('fs');
const path = require('path');
const reader = require('../tests/packaging/lib/asar-reader.cjs');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, 'localization', 'client-baselines.json');

function arg(name, fallback) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const norm = (p) => p.split('/').filter(Boolean).join('/');
const parsePkg = (buf) => JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, ''));

const asarPath = arg('--asar', 'C:/Users/24844/AppData/Local/Programs/antigravity/resources/app.asar');
const backupPath = arg('--backup', 'C:/Users/24844/AppData/Local/Programs/antigravity/resources/app.asar.bak');
const versionOverride = arg('--version', null);

// 注入所需的目标文件与锚点（英文原文）。锚点用于判定官方结构是否仍然匹配。
const requiredTargets = ['dist/ipcHandlers.js', 'dist/main.js', 'dist/utils.js', 'dist/tray.js'];
const requiredAnchors = [
  { target: 'dist/ipcHandlers.js', text: "title: 'Open workspace'" },
  { target: 'dist/ipcHandlers.js', text: "title: 'Open workspaces'" },
  { target: 'dist/main.js', text: 'void win.loadURL(newUrl);' },
  { target: 'dist/utils.js', text: 'void win.loadURL(url);' },
  { target: 'dist/tray.js', text: 'Menu.buildFromTemplate(actions)' },
];

function countOccurrences(haystack, needle) { return haystack.split(needle).length - 1; }

function inspect(p) {
  const a = reader.open(p);
  const text = {};
  for (const t of requiredTargets) { const b = a.read(t); text[t] = b ? b.toString('utf8') : null; }
  const missingTargets = requiredTargets.filter((t) => text[t] === null);
  const anchors = requiredAnchors.map((a2) => ({ ...a2, count: text[a2.target] === null ? -1 : countOccurrences(text[a2.target], a2.text) }));
  return { archive: a, pkg: parsePkg(a.read('package.json')), text, missingTargets, anchors, zh: a.read('dist/zh-bundle.js') };
}

if (!fs.existsSync(asarPath)) { console.error('未找到目标 ASAR：' + asarPath); process.exit(1); }
const installed = inspect(asarPath);
const version = versionOverride || installed.pkg.version;

let manifest = { version: 1, purpose: '官方客户端基线哈希清单；用于识别未知版本与错版备份。', baselines: [] };
if (fs.existsSync(outPath)) { try { manifest = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch { } }
if (!Array.isArray(manifest.baselines)) manifest.baselines = [];

let baseline = manifest.baselines.find((b) => b.productVersion === version) || { productVersion: version, platform: process.platform, arch: process.arch };
baseline.platform = baseline.platform || process.platform;
baseline.arch = baseline.arch || process.arch;

// 1) 官方原版（以备份为准，缺失时用未打补丁的目标归档推断）
let pristine = null;
if (fs.existsSync(backupPath)) {
  const b = inspect(backupPath);
  if (b.zh === null) {
    pristine = b;
    baseline.pristine = {
      sha256: b.archive.sha256, bytes: b.archive.bytes, productVersion: b.pkg.version,
      source: 'backup', path: backupPath.replace(/\\/g, '/'), recordedAt: new Date().toISOString(),
    };
  }
} else if (installed.zh === null) {
  pristine = installed;
  baseline.pristine = {
    sha256: installed.archive.sha256, bytes: installed.archive.bytes, productVersion: installed.pkg.version,
    source: 'target', path: asarPath.replace(/\\/g, '/'), recordedAt: new Date().toISOString(),
  };
}
const structSource = pristine || installed;
baseline.requiredTargets = requiredTargets;
baseline.requiredEntries = Object.fromEntries(structSource.archive.entries
  .map((e) => [norm(e.path), e])
  .filter(([p]) => requiredTargets.includes(p))
  .map(([p]) => [p, true]));
for (const t of requiredTargets) if (!(norm(t) in baseline.requiredEntries)) baseline.requiredEntries[norm(t)] = false;
baseline.requiredAnchors = structSource.anchors;
baseline.missingTargets = structSource.missingTargets;

// 2) 已知补丁版哈希：记录本项目产出过的安装结果
const patched = baseline.knownPatchedSha256 || [];
if (installed.zh !== null) {
  const entry = { sha256: installed.archive.sha256, kernelSha256: reader.sha256(installed.zh), bytes: installed.archive.bytes, recordedAt: new Date().toISOString() };
  const idx = patched.findIndex((x) => x.sha256 === entry.sha256);
  if (idx >= 0) entry.recordedAt = patched[idx].recordedAt;
  baseline.knownPatchedSha256 = patched.filter((x) => x.sha256 !== entry.sha256).concat(entry);
} else {
  baseline.knownPatchedSha256 = patched;
}

manifest.baselines = manifest.baselines.filter((b) => b.productVersion !== version).concat(baseline);
manifest.baselines.sort((a, b) => String(a.productVersion).localeCompare(String(b.productVersion), undefined, { numeric: true }));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  out: outPath, productVersion: version,
  pristineSha256: baseline.pristine?.sha256 || null,
  knownPatched: baseline.knownPatchedSha256.length,
  missingTargets: baseline.missingTargets,
  anchorsAllOne: baseline.requiredAnchors.every((a) => a.count === 1),
  baselines: manifest.baselines.length,
}, null, 2));
