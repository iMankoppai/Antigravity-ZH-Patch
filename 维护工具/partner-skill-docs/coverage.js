'use strict';
const fs = require('fs'), path = require('path');
const base = path.join(__dirname, 'archives');
const sd = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src/AntigravityZhManager/Assets/skill-details.json'), 'utf8'));
const covered = new Set(sd.additionalDocuments.filter(d => d.kind === 'skills').map(d => d.plugin));
function count(dir) { let n = 0; (function w(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) w(p); else if (f === 'SKILL.md') n++; } })(dir); return n; }
const rows = [];
for (const slug of fs.readdirSync(base)) {
  const dir = path.join(base, slug); if (!fs.statSync(dir).isDirectory()) continue;
  const n = count(dir); if (!n) continue;
  const zhp = path.join(__dirname, slug + '-zh');
  const zh = fs.existsSync(zhp) ? count(zhp) : 0;
  rows.push({ slug, n, zh, done: covered.has(slug) });
}
rows.sort((a, b) => b.n - a.n);
console.log('plugins with skills:', rows.length);
for (const r of rows) console.log(`${r.slug}\tsrc=${r.n}\tzh=${r.zh}\t${r.done ? 'DONE' : (r.zh ? (r.zh >= r.n ? 'READY' : 'PARTIAL') : 'TODO')}`);
console.log('TOTAL skills:', rows.reduce((s, r) => s + r.n, 0), 'DONE plugins:', rows.filter(r => r.done).length);
