'use strict';
// 通用：把某个 partner 插件的全部技能正文并入 skill-details.json 的 additionalDocuments。
// 用法: node integrate-plugin-docs.cjs <plugin-slug>
// 源: work/2-29-0-probe/archives/<slug>/**/SKILL.md
// 译: work/2-29-0-probe/<slug>-zh/**/SKILL.md（相对路径一致）
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const deps = 'C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const { chromium } = require(deps + 'playwright');
const { marked } = require(deps + 'marked');
const { normalizeSkillMarkdown } = require('../../scripts/skill-markdown.cjs');

const slug = process.argv[2];
if (!slug) { console.error('usage: integrate-plugin-docs.cjs <plugin-slug>'); process.exit(1); }
const ROOT = path.resolve(__dirname, '..', '..');
const sdPath = path.join(ROOT, 'src/AntigravityZhManager/Assets/skill-details.json');
const enRoot = path.join(__dirname, 'archives', slug);
const zhRoot = path.join(__dirname, slug + '-zh');
if (!fs.existsSync(enRoot)) { console.error('no en root', enRoot); process.exit(1); }
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return h.toString(16); }
function stripFm(raw) { return raw.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\s*/, '').trim(); }
function sha256(b) { return crypto.createHash('sha256').update(b).digest('hex'); }
function walk(d, out) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const st = fs.statSync(p); if (st.isDirectory()) walk(p, out); else if (f === 'SKILL.md') out.push(p); } return out; }

(async () => {
  const sd = JSON.parse(fs.readFileSync(sdPath, 'utf8'));
  const enFiles = walk(enRoot, []);
  const browser = await chromium.launch({ executablePath: process.env.ZH_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage(); await page.route('**/*', r => r.abort());
  async function finalizeHtml(html) {
    await page.setContent('<!doctype html><body>' + html);
    return page.evaluate(() => {
      for (const table of document.querySelectorAll('table')) { const s = document.createElement('div'); s.className = 'zh-table-scroll'; table.before(s); s.appendChild(table); }
      const alerts = { NOTE: '说明', TIP: '提示', IMPORTANT: '重要', WARNING: '警告', CAUTION: '注意', CRITICAL: '关键警告' };
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t;
      while (t = w.nextNode()) if (!t.parentElement.closest('pre,code')) t.nodeValue = t.nodeValue.replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CRITICAL)\]/gi, (a, k) => (alerts[k.toUpperCase()] || k) + '：');
      if (document.querySelector('script,style,iframe,object,embed')) throw Error('Unexpected active HTML');
      for (const e of document.querySelectorAll('*')) for (const a of e.attributes) if (/^on/i.test(a.name) || /^(?:javascript|data):/i.test(a.value)) throw Error('Unexpected active attr');
      return document.body.innerHTML;
    });
  }
  const entries = []; const missing = []; const skippedNoBody = [];
  for (const enFile of enFiles) {
    const rel = path.relative(enRoot, enFile);
    const zhFile = path.join(zhRoot, rel);
    if (!fs.existsSync(zhFile)) { missing.push(rel); continue; }
    const enRaw = fs.readFileSync(enFile, 'utf8'), zhRaw = fs.readFileSync(zhFile, 'utf8');
    const enBody = stripFm(enRaw), zhBody = stripFm(zhRaw);
    if (!enBody) { skippedNoBody.push(rel); continue; }
    const htmlEn = await finalizeHtml(marked.parse(normalizeSkillMarkdown(enBody).markdown));
    await page.setContent('<!doctype html>' + htmlEn);
    const signature = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' ').trim().slice(0, 220));
    const renderedHtml = await finalizeHtml(marked.parse(normalizeSkillMarkdown(zhBody).markdown));
    const heading = (enRaw.match(/^# (.+)$/m) || [])[1] || '';
    const skillRel = rel.split(path.sep).join('/');
    const entry = { plugin: slug, skill: skillRel, kind: 'skills', source: slug + '/' + skillRel, sourceSha256: sha256(Buffer.from(enRaw)), heading, signature, markdownLength: enBody.length, markdownFingerprint: fnv(enBody) };
    const bytes = Buffer.from(enBody);
    if (bytes.length > 24000) { const preview = bytes.subarray(0, 24000).toString('utf8') + '\n<truncated ' + (bytes.length - 24000) + ' bytes>'; entry.previewLength = preview.length; entry.previewFingerprint = fnv(preview); }
    entry.renderedHtml = renderedHtml; entries.push(entry);
  }
  await browser.close();
  sd.additionalDocuments = (sd.additionalDocuments || []).filter(d => !(d.plugin === slug && d.kind === 'skills'));
  sd.additionalDocuments.push(...entries);
  const revision = crypto.createHash('sha256').update(JSON.stringify({ documents: sd.documents, additionalDocuments: sd.additionalDocuments, builtinDocuments: sd.builtinDocuments, translations: sd.translations, readmeBlocks: sd.readmeBlocks, uiTemplates: sd.uiTemplates })).digest('hex');
  sd.revision = revision;
  fs.writeFileSync(sdPath, JSON.stringify(sd, null, 2) + '\n');
  console.log(JSON.stringify({ plugin: slug, enSkills: enFiles.length, added: entries.length, missing: missing.length, noBody: skippedNoBody.length, additionalTotal: sd.additionalDocuments.length, revision }, null, 2));
  if (missing.length) console.log('MISSING zh:', missing.join(', '));
  if (skippedNoBody.length) console.log('NO-BODY skipped:', skippedNoBody.join(', '));
})().catch(e => { console.error(e); process.exit(1); });
