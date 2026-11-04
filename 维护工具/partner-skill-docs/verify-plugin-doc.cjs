'use strict';
// 通用验证：给定 plugin 与相对 skill，确认其正文能被匹配并渲染成中文。
// 用法: node verify-plugin-doc.cjs <plugin-slug> <skillRelPath>
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const withFixture = require('../../tests/renderer/lib/chrome-fixture.cjs');
const catalogue = require('../../src/AntigravityZhManager/Assets/skill-details.json');
const dictionary = require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const runtime = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');
const slug = process.argv[2], skillRel = process.argv[3];
const entry = catalogue.additionalDocuments.find(d => d.plugin === slug && d.skill === skillRel);
if (!entry) { console.error('no entry', slug, skillRel); process.exit(1); }
function stripFm(raw) { return raw.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\s*/, '').trim(); }
const enMarkdown = stripFm(fs.readFileSync(path.join(__dirname, 'archives', slug, skillRel), 'utf8'));
let checks = 0; const check = (a, e, l) => { assert.deepEqual(a, e, l); checks++; };
withFixture('<!doctype html><div id="react-root"></div>', async (evaluate, pause) => {
  for (const name of ['react', 'react-dom']) await evaluate(fs.readFileSync(path.join(__dirname, '../../tests/renderer/vendor/' + name + '.production.min.js'), 'utf8'));
  await evaluate(`window.ReactRoot=ReactDOM.createRoot(document.getElementById('react-root'));window.renderSkill=(markdown,html)=>{function Markdown(props){return React.createElement('div',{className:'leading-relaxed select-text',dangerouslySetInnerHTML:{__html:props.html}});}ReactDOM.flushSync(()=>ReactRoot.render(React.createElement('div',{'data-testid':'doc-row-modal'},React.createElement(Markdown,{markdown,html}))));};`);
  await evaluate(`renderSkill(${JSON.stringify(enMarkdown)}, '<h1>English</h1><p>original</p>')`);
  await evaluate('window.__antigravityZhPatchDictionary=' + JSON.stringify(dictionary) + ';window.__antigravityZhSkillDetails=' + JSON.stringify(catalogue) + ';');
  await evaluate(`document.querySelector('[data-testid="doc-row-modal"] > div').__reactFiber$fixture={return:{memoizedProps:{markdown:${JSON.stringify(enMarkdown)}}}};`);
  await evaluate(runtime);
  const want = slug + '/' + skillRel;
  for (let i = 0; i < 120 && !await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]')?.getAttribute('data-antigravity-zh-detail-view')===${JSON.stringify(want)}`); i++) await pause(20);
  check(await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]')?.getAttribute('data-antigravity-zh-detail-view')`), want, '命中文档');
  const txt = await evaluate(`document.querySelector('[data-antigravity-zh-detail-view]')?.textContent||''`);
  check(/[\u4e00-\u9fff]/.test(txt), true, '含中文');
  console.log('verify', want, checks, 'PASS', txt.replace(/\s+/g,' ').slice(0, 50));
}).catch(e => { console.error(e); process.exit(1); });
