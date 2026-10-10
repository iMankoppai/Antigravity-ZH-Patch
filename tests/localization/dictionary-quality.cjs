'use strict';
// dictionary-quality.cjs - localization quality gate for the runtime dictionary.
// Fails (non-zero exit) on: duplicate keys, placeholder drift, forbidden
// core-term variants, or undocumented key===value entries.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const dictPath = path.join(root, 'src', 'AntigravityZhManager', 'Assets', 'dictionaries.json');
const contextPath = path.join(root, 'localization', 'dictionary-context.json');
const raw = fs.readFileSync(dictPath, 'utf8');
const dict = JSON.parse(raw);
const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));

const failures = [];
const warnings = [];

// --- duplicate top-level keys (JSON.parse would silently keep the last) ---
function topLevelKeys(text) {
  const keys = [];
  let i = 0, depth = 0, expectKey = false;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '{') { depth++; if (depth === 1) expectKey = true; i++; continue; }
    if (ch === '[') { depth++; i++; continue; }
    if (ch === '}' || ch === ']') { depth--; i++; continue; }
    if (ch === ',') { if (depth === 1) expectKey = true; i++; continue; }
    if (ch === '"') {
      let j = i + 1, s = '';
      while (j < n) {
        if (text[j] === '\\') { s += text[j] + text[j + 1]; j += 2; continue; }
        if (text[j] === '"') break;
        s += text[j]; j++;
      }
      if (depth === 1 && expectKey) {
        let k = j + 1;
        while (k < n && /\s/.test(text[k])) k++;
        if (text[k] === ':') { keys.push(JSON.parse('"' + s + '"')); expectKey = false; }
      }
      i = j + 1; continue;
    }
    i++;
  }
  return keys;
}
const scanned = topLevelKeys(raw);
const seen = new Map();
for (const k of scanned) seen.set(k, (seen.get(k) || 0) + 1);
for (const [k, n] of seen) if (n > 1) failures.push(`重复键 ${JSON.stringify(k)} 出现 ${n} 次；JSON.parse 会静默丢弃前者`);
const keys = Object.keys(dict);

// --- placeholder multiset parity, longest form first ---
const PH = /\{\{\s*[\w.]+\s*\}\}|\$\{[^}]*\}|%(?:\d+\$)?[sdif@]|\{[0-9]+\}|\{[A-Za-z_][\w.]*\}/g;
function placeholders(s) {
  const out = [];
  let m;
  PH.lastIndex = 0;
  while ((m = PH.exec(s))) out.push(m[0].replace(/\s+/g, ''));
  return out;
}
function multiset(arr) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return m;
}
for (const k of keys) {
  const v = dict[k];
  const a = multiset(placeholders(k));
  const b = multiset(placeholders(v));
  if (a.size !== b.size) { failures.push(`占位符种类不一致：${JSON.stringify(k)} => ${JSON.stringify(v)}`); continue; }
  for (const [tok, n] of a) if (b.get(tok) !== n) failures.push(`占位符数量/名称不一致：${JSON.stringify(k)} => ${JSON.stringify(v)} (${tok}: ${n} vs ${b.get(tok) || 0})`);
}

// --- core terminology: scope by the English source key, then check the residual ---
let terminologyScoped = 0;
for (const [en, spec] of Object.entries(context.coreTerminology || {})) {
  const re = new RegExp(spec.match, 'i');
  const scoped = keys.filter((k) => re.test(k));
  terminologyScoped += scoped.length;
  for (const k of scoped) {
    const residual = (spec.rejected || []).reduce((v, bad) => v, dict[k]).split(spec.canonical).join('');
    for (const bad of spec.rejected || []) {
      if (residual.includes(bad)) failures.push(`术语禁用变体：${en} 统一为“${spec.canonical}”，但 ${JSON.stringify(k)} => ${JSON.stringify(dict[k])} 残留“${bad}”`);
    }
  }
}

// --- key === value must be documented ---
const identity = context.identityEntries || {};
const sameKeys = keys.filter((k) => dict[k] === k);
for (const k of sameKeys) if (!identity[k]) failures.push(`未登记的未翻译条目：${JSON.stringify(k)}（key === value）；请在 localization/dictionary-context.json 补充 kind 与 reason`);
for (const k of Object.keys(identity)) {
  if (!(k in dict)) failures.push(`来源清单登记了不存在的词条：${JSON.stringify(k)}`);
  else if (dict[k] !== k) warnings.push(`来源清单把 ${JSON.stringify(k)} 标为未翻译，但当前译为 ${JSON.stringify(dict[k])}`);
}

// --- punctuation / spacing advisories (non-blocking) ---
const CJK = '[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]';
const missingSpace = new RegExp('(' + CJK + ')[A-Za-z0-9]|[A-Za-z0-9](' + CJK + ')');
const spacingExamples = [];
for (const k of keys) {
  const v = dict[k];
  if (placeholders(v).length) continue;
  if (missingSpace.test(v)) spacingExamples.push(`${JSON.stringify(k)} => ${JSON.stringify(v)}`);
}

const summary = {
  terms: keys.length,
  scannedKeys: scanned.length,
  duplicateKeys: [...seen.values()].filter((n) => n > 1).length,
  placeholderEntriesChecked: keys.length,
  terminologyScopedEntries: terminologyScoped,
  identityEntries: sameKeys.length,
  documentedIdentityEntries: sameKeys.filter((k) => identity[k]).length,
  punctuationSpacingAdvisories: spacingExamples.length,
  failures: failures.length,
  warnings: warnings.length,
};
console.log(JSON.stringify(summary, null, 2));
if (warnings.length) console.log('[warn]\n' + warnings.join('\n'));
if (spacingExamples.length) console.log('[advisory:cjk-latin-space] 前 20 条\n' + spacingExamples.slice(0, 20).join('\n'));
if (failures.length) { console.error('[fail]\n' + failures.join('\n')); process.exit(1); }
console.log('dictionary quality gate: PASS');
