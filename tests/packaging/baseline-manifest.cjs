'use strict';
// baseline-manifest.cjs - 官方基线清单门禁。
// 校验清单结构自洽，并在本机存在客户端时交叉核对实际哈希，
// 防止清单与真实客户端漂移（例如官方升级后仍套用旧基线）。
const fs = require('fs');
const path = require('path');
const reader = require('./lib/asar-reader.cjs');

const root = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(root, 'localization', 'client-baselines.json');
const failures = [];
const notes = [];

if (!fs.existsSync(manifestPath)) {
  console.error('缺少基线清单：' + manifestPath);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const baselines = Array.isArray(manifest.baselines) ? manifest.baselines : [];
if (baselines.length === 0) failures.push('基线清单没有任何版本条目');

const seenVersions = new Set();
for (const b of baselines) {
  const tag = b.productVersion || '(无版本号)';
  if (!b.productVersion) failures.push('存在缺少 productVersion 的基线条目');
  if (seenVersions.has(b.productVersion)) failures.push(`基线清单存在重复版本：${b.productVersion}`);
  seenVersions.add(b.productVersion);

  if (b.pristine?.sha256) {
    if (!/^[0-9a-f]{64}$/.test(b.pristine.sha256)) failures.push(`${tag} 的官方原版 SHA256 格式非法`);
    if (!b.pristine.bytes || b.pristine.bytes <= 0) failures.push(`${tag} 的官方原版字节数非法`);
  } else {
    failures.push(`${tag} 缺少官方原版哈希（pristine.sha256）；逐版识别依赖它`);
  }

  if (b.missingTargets?.length) failures.push(`${tag} 记录了缺失注入目标：${b.missingTargets.join(', ')}`);

  for (const anchor of b.requiredAnchors || []) {
    if (!anchor.target || typeof anchor.text !== 'string' || !anchor.text) failures.push(`${tag} 存在无效锚点记录`);
    if (anchor.count !== 1) failures.push(`${tag} 的锚点命中数不是 1：${anchor.target} :: ${JSON.stringify((anchor.text || '').slice(0, 40))} -> ${anchor.count}`);
  }
  for (const [target, present] of Object.entries(b.requiredEntries || {})) {
    if (present !== true) failures.push(`${tag} 声明必需但实际缺失的目标：${target}`);
  }
}

// 交叉核对本机客户端（存在时）
const clientPaths = require('./lib/client-paths.cjs');
const asarPath = clientPaths.asarPath();
const backupPath = clientPaths.backupPath();
if (asarPath && fs.existsSync(asarPath)) {
  const a = reader.open(asarPath);
  const version = JSON.parse(a.read('package.json').toString('utf8').replace(/^\uFEFF/, '')).version;
  const entry = baselines.find((b) => b.productVersion === version);
  if (!entry) failures.push(`本机客户端版本 ${version} 不在基线清单中；请先运行 维护工具/生成基线清单.js`);
  else {
    const isPatched = entry.knownPatchedSha256?.some((p) => p.sha256 === a.sha256);
    const isPristine = entry.pristine?.sha256 === a.sha256;
    if (!isPatched && !isPristine) failures.push(`本机 app.asar 哈希未登记（版本 ${version}）：${a.sha256.slice(0, 16)}…；请重新生成基线清单`);
    else notes.push(`本机 app.asar 已登记为 ${isPatched ? '已知补丁版' : '官方原版'}（${version}）`);
  }
  if (fs.existsSync(backupPath)) {
    const bk = reader.open(backupPath);
    const e2 = baselines.find((b) => b.pristine?.sha256 === bk.sha256);
    if (!e2) failures.push(`本机备份哈希未登记为任何版本的官方原版：${bk.sha256.slice(0, 16)}…`);
    else notes.push(`本机备份与 ${e2.productVersion} 的官方原版一致`);
  }
} else {
  notes.push('本机未安装 Antigravity，跳过交叉核对');
}

const summary = { baselines: baselines.length, versions: [...seenVersions], failures: failures.length, notes };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('baseline manifest gate: PASS');
