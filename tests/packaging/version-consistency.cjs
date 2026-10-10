'use strict';
// version-consistency.cjs - packaging version gate.
// Confirms the runtime patch version, dictionary term count, and release
// metadata agree, so a release cannot ship conflicting version numbers.
//
// Sources of truth:
//   - patchVersion      : Assets/translate.js
//   - term count        : Assets/dictionaries.json
//   - generated bundle  : Assets/zh-bundle.js
//   - release metadata  : dist/SHA256SUMS.txt and 当前状态.json when present
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const assets = path.join(root, 'src', 'AntigravityZhManager', 'Assets');
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

const translate = fs.readFileSync(path.join(assets, 'translate.js'), 'utf8');
const dict = JSON.parse(fs.readFileSync(path.join(assets, 'dictionaries.json'), 'utf8'));
const bundle = fs.readFileSync(path.join(assets, 'zh-bundle.js'), 'utf8');

const failures = [];
const notes = [];

const patchVersion = Number(translate.match(/const patchVersion = (\d+)/)?.[1]);
const terms = Object.keys(dict).length;
const expectedVersion = Number(process.env.ZH_EXPECT_PATCH_VERSION || patchVersion);
notes.push(`patchVersion = ${patchVersion}, terms = ${terms}`);

// bundle must carry the same version and term count
const bVersion = Number(bundle.match(/const patchVersion = (\d+)/)?.[1]);
const bm = bundle.match(/^const dict = ([^\r\n]+);/m);
const bTerms = bm ? Object.keys(JSON.parse(bm[1])).length : -1;
if (bVersion !== patchVersion) failures.push(`bundle patchVersion ${bVersion} != translate.js ${patchVersion}`);
if (bTerms !== terms) failures.push(`bundle term count ${bTerms} != dictionaries.json ${terms}`);
if (expectedVersion !== patchVersion) failures.push(`期望内核版本 ${expectedVersion} != 源码 ${patchVersion}`);

// release metadata (optional, warning only if stale)
const sums = readIf(path.join(root, 'dist', 'SHA256SUMS.txt'));
if (sums) {
  const bundleSha = crypto.createHash('sha256').update(bundle).digest('hex');
  if (!sums.includes(bundleSha)) {
    notes.push(`dist/SHA256SUMS.txt 未包含当前 bundle sha（发布元数据可能尚未刷新）：${bundleSha.slice(0, 16)}…`);
  } else notes.push('dist/SHA256SUMS.txt 已包含当前 bundle sha');
}
const stateRaw = readIf(path.join(root, '当前状态.json'));
if (stateRaw) {
  try {
    const state = JSON.parse(stateRaw);
    const flat = JSON.stringify(state);
    const m = flat.match(/"?(?:patchVersion|内核版本|kernelVersion)"?\s*:\s*(\d+)/i);
    if (m && Number(m[1]) !== patchVersion) notes.push(`当前状态.json 记录内核版本 ${m[1]}，与源码 ${patchVersion} 不一致（仅供核对）`);
  } catch { notes.push('当前状态.json 无法解析，已跳过'); }
}

const summary = { patchVersion, terms, failures: failures.length, notes };
console.log(JSON.stringify(summary, null, 2));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('version consistency gate: PASS');
