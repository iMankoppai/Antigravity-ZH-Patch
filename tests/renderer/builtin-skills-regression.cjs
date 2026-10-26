'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),crypto=require('crypto');
const {chromium}=require(process.env.ZH_NODE_MODULES?process.env.ZH_NODE_MODULES+'/playwright':'C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fixtures=require('./fixtures/builtin-skill-bodies.json');
const catalogue=require('../../src/AntigravityZhManager/Assets/skill-details.json');
const dictionary=require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
const {fingerprint}=require('../../scripts/builtin-skill-documents.cjs');
let checks=0;function check(a,b,message){assert.deepEqual(a,b,message);checks++;}
(async()=>{const browser=await chromium.launch({executablePath:process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent('<!doctype html><style>.flex{display:flex}</style><body>'+fixtures.map((f,i)=>`<section id="s${i}"><div data-testid="doc-row-modal"><p>${f.description}</p><div class="leading-relaxed select-text flex" data-zh-skill-body>${f.html}</div></div></section>`).join('')+'<div id="changing"></div><div data-testid="planner-response-text" id="authored">This field is required</div>');
 await page.evaluate(fixtures=>fixtures.forEach((f,i)=>{document.querySelector('#s'+i+' [data-zh-skill-body]').__reactFiber$fixture={return:{memoizedProps:{markdown:f.markdown}}};}),fixtures);
 const before=await page.evaluate(()=>[...document.querySelectorAll('section[id^="s"]')].map(e=>e.innerHTML));
 const structure=await page.evaluate(fixtures=>fixtures.map(f=>{const e=document.createElement('div');e.innerHTML=f.normalizedHtml;return{codes:[...e.querySelectorAll('code')].map(e=>e.textContent).sort(),pre:[...e.querySelectorAll('pre code')].map(e=>e.textContent),links:[...e.querySelectorAll('a')].map(e=>e.getAttribute('href')).sort(),lists:e.querySelectorAll('li').length,tables:[...e.querySelectorAll('table')].map(t=>({columns:t.querySelectorAll('thead th').length,rows:t.querySelectorAll('tbody tr').length}))};}),fixtures);
 await page.evaluate(({d,c})=>{window.__antigravityZhPatchDictionary=d;window.__antigravityZhSkillDetails=c;},{d:dictionary,c:catalogue});await page.addScriptTag({content:runtime});
 await page.waitForFunction(()=>window.__antigravityZhPatchInstalled);await page.waitForTimeout(200);
 const after=await page.evaluate(()=>[...document.querySelectorAll('section[id^="s"]')].map(e=>{const source=e.querySelector('[data-zh-skill-body]'),view=e.querySelector('[data-antigravity-zh-detail-view]');if(!view)return null;const c=view.cloneNode(true);c.querySelectorAll('style,.zh-copy-code').forEach(e=>e.remove());return{html:c.innerHTML,hidden:getComputedStyle(source).display==='none',visible:getComputedStyle(view).display!=='none',codes:[...view.querySelectorAll('code')].map(e=>e.textContent).sort(),pre:[...view.querySelectorAll('pre code')].map(e=>e.textContent),links:[...view.querySelectorAll('a')].map(e=>e.getAttribute('href')).sort(),lists:view.querySelectorAll('li').length,tables:[...view.querySelectorAll('table')].map(t=>({columns:t.querySelectorAll('thead th').length,rows:t.querySelectorAll('tbody tr').length,valid:[...t.querySelectorAll('tbody tr')].every(r=>r.children.length===t.querySelectorAll('thead th').length)})),english:[...view.querySelectorAll('p,li,h1,h2,h3,h4,td,th')].filter(e=>!e.querySelector('p,li')).map(e=>{const c=e.cloneNode(true);c.querySelectorAll('code,a').forEach(x=>x.remove());return c.textContent;}).filter(s=>/\b[a-zA-Z]+(?:\s+[a-zA-Z]+){5,}\b/.test(s))};}));
 check(fixtures.length,9,'全部内置技能有冻结源样本');check(catalogue.builtinDocuments.length,9,'全部内置技能有译文');
 for(let i=0;i<fixtures.length;i++){
  const f=fixtures[i],a=after[i],doc=catalogue.builtinDocuments.find(d=>d.skill===f.skill);assert.ok(a,'缺少正文：'+f.skill);checks++;
  check(a.hidden&&a.visible,true,'只显示中文正文 '+f.skill);check(a.codes,structure[i].codes,'行内代码完整 '+f.skill);check(a.pre,structure[i].pre,'代码块完整 '+f.skill);check(a.links,structure[i].links,'链接地址完整 '+f.skill);check(a.lists,structure[i].lists,'嵌套列表完整 '+f.skill);check(a.tables.map(({valid,...t})=>t),structure[i].tables,'表格结构 '+f.skill);check(a.tables.every(t=>t.valid),true,'无伪续行 '+f.skill);check(a.html,doc.renderedHtml,'使用完整译文 '+f.skill);check(a.english,[],'无长英文说明残留 '+f.skill);check(doc.markdownFingerprint,fingerprint(f.markdown),'源指纹 '+f.skill);check(doc.requireExact,true,'内置正文必须精确匹配 '+f.skill);
  const translation=require('../../localization/builtin-documents/'+f.skill+'.json');check(translation.sourceSha256,f.sourceSha256,'译文绑定原件 '+f.skill);const values=translation.units;check(values.length,f.units.length,'完整段落数 '+f.skill);
  for(const u of f.units){check([...values[u.id].matchAll(/\{\{CODE(\d+)\}\}/g)].map(m=>Number(m[1])).sort((a,b)=>a-b),u.codes.map((_,i)=>i),'代码占位符 '+f.skill+'/'+u.id);}
 }
 check(await page.locator('#authored').textContent(),'This field is required','代理／用户正文不翻译');
  await page.evaluate(f=>{const e=document.querySelector('#changing');e.innerHTML='<div data-testid="doc-row-modal"><div data-zh-skill-body></div></div>';const source=e.querySelector('[data-zh-skill-body]');source.innerHTML=f.html+'<p id="custom-ui-word" title="New Browser">This field is required</p>';source.__reactFiber$fixture={return:{memoizedProps:{markdown:f.markdown+'\nUser custom change'}}};},fixtures[0]);await page.waitForTimeout(100);
 check(await page.locator('#changing [data-antigravity-zh-detail-view]').count(),0,'同标题但源已变化的自定义正文不覆盖');
  check(await page.locator('#custom-ui-word').textContent(),'This field is required','自定义技能中的已知 UI 词也不翻译');check(await page.locator('#custom-ui-word').getAttribute('title'),'New Browser','自定义技能原有属性不翻译');
 await page.evaluate(f=>{const s=document.querySelector('#changing [data-zh-skill-body]');s.__reactFiber$fixture.return.memoizedProps.markdown=f.markdown;s.innerHTML=f.html;},fixtures[0]);await page.waitForTimeout(150);
 check(await page.locator('#changing [data-antigravity-zh-detail-view]').count(),1,'源匹配后动态显示');
 await page.evaluate(f=>{const s=document.querySelector('#changing [data-zh-skill-body]');s.__reactFiber$fixture.return.memoizedProps.markdown=f.markdown;s.innerHTML=f.html;},fixtures.at(-1));await page.waitForTimeout(150);
 check(await page.locator('#changing [data-antigravity-zh-detail-view]').getAttribute('data-antigravity-zh-detail-view'),'builtin/'+fixtures.at(-1).skill,'复用详情窗口切换正文');
 await page.addScriptTag({content:runtime});check(await page.locator('[data-antigravity-zh-detail-view]').count(),10,'重复注入不重复正文');
 await page.evaluate(()=>window.__antigravityZhPatchRestore());
 check(await page.evaluate(()=>[...document.querySelectorAll('section[id^="s"]')].map(e=>e.innerHTML)),before,'原始正文与描述可精确还原');check(await page.locator('[data-antigravity-zh-detail-view]').count(),0,'还原移除全部译文');
 const result={documents:fixtures.length,paragraphs:fixtures.reduce((n,f)=>n+f.units.length,0),checks,passed:true,sourceFingerprint:crypto.createHash('sha256').update(JSON.stringify(fixtures)).digest('hex')};fs.mkdirSync('work/v68',{recursive:true});fs.writeFileSync('work/v68/builtin-test.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
