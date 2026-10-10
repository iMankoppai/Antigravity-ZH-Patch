'use strict';
// bundle-consistency.cjs - packaging consistency gate.
// Compares the canonical sources with every delivery layer that exists locally,
// from the generated bundle up to the installed ASAR entry.
//
// Usage:
//   node tests/packaging/bundle-consistency.cjs
//   node tests/packaging/bundle-consistency.cjs --asar "<app.asar path>"
//
// Layers checked (each is skipped with an explicit note when absent):
//   1. Assets/dictionaries.json + Assets/translate.js  <->  Assets/zh-bundle.js
//   2. Assets/zh-bundle.js                             <->  installed app.asar!dist/zh-bundle.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const assets = path.join(root, 'src', 'AntigravityZhManager', 'Assets');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function parseAsarHeader(buf) {
  const marker = buf.indexOf(Buffer.from('{"files"'));
  if (marker < 0) throw new Error('未找到 ASAR JSON 头');
  const jsonLen = buf.readUInt32LE(marker - 4);
  const json = JSON.parse(buf.slice(marker, marker + jsonLen).toString('utf8'));
  // ASAR 的 JSON 头按 4 字节对齐；填充字节数取决于 jsonLen，不能写死成 2。
  const pad = (4 - (jsonLen % 4)) % 4;
  const dataStart = marker + jsonLen + pad;
  return { json, dataStart };
}
function findEntry(node, target) {
  const parts = target.split('/');
  let cur = node;
  for (const p of parts) { if (!cur.files || !cur.files[p]) return null; cur = cur.files[p]; }
  return cur;
}

const failures = [];
const notes = [];

// ---- layer 1: sources vs generated bundle ----
const dict = JSON.parse(fs.readFileSync(path.join(assets, 'dictionaries.json'), 'utf8'));
const translate = fs.readFileSync(path.join(assets, 'translate.js'), 'utf8');
const bundle = fs.readFileSync(path.join(assets, 'zh-bundle.js'), 'utf8');
const m = bundle.match(/^const dict = ([^\r\n]+);\r?\nconst translateCode = ([^\r\n]+);/m);
if (!m) failures.push('zh-bundle.js 未包含预期的 dict/translateCode 常量块');
else {
  if (JSON.stringify(JSON.parse(m[1])) !== JSON.stringify(dict)) failures.push('zh-bundle.js 内嵌词库与 dictionaries.json 不一致');
  if (JSON.parse(m[2]) !== translate) failures.push('zh-bundle.js 内嵌运行时与 translate.js 不一致');
}
const bundleSha = sha256(Buffer.from(bundle));
notes.push(`bundle sha256 = ${bundleSha}`);

// ---- layer 2: bundle vs installed asar ----
const asarArgIndex = process.argv.indexOf('--asar');
let asarPath = asarArgIndex >= 0 ? process.argv[asarArgIndex + 1]
  : require('./lib/client-paths.cjs').asarPath();
if (asarPath && fs.existsSync(asarPath)) {
  const buf = fs.readFileSync(asarPath);
  const { json, dataStart } = parseAsarHeader(buf);
  const entry = findEntry(json, 'dist/zh-bundle.js');
  if (!entry) failures.push('已安装 app.asar 中未找到 dist/zh-bundle.js');
  else if (entry.unpacked) notes.push('dist/zh-bundle.js 被标记为 unpacked，跳过字节比较');
  else {
    const content = buf.slice(dataStart + Number(entry.offset), dataStart + Number(entry.offset) + entry.size);
    const installedSha = sha256(content);
    notes.push(`installed asar sha256 = ${installedSha}`);
    if (content.length !== Buffer.byteLength(bundle)) failures.push(`安装内 bundle 长度 ${content.length} 与源码 ${Buffer.byteLength(bundle)} 不一致`);
    else if (!content.equals(Buffer.from(bundle))) failures.push('安装内 bundle 与源码 zh-bundle.js 字节不一致（三方不同步）');
  }
} else {
  notes.push(`未找到 ASAR（${asarPath}），跳过安装层比较`);
}

const summary = { bundleSha256: bundleSha, terms: Object.keys(dict).length, failures: failures.length, notes };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('bundle consistency gate: PASS');
