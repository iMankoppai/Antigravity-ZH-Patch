'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const deps=process.env.ZH_NODE_MODULES||'C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/';
const {chromium}=require(deps+'playwright');
const fixtures=require('./fixtures/official-plugin-readmes.json');
const dictionary=require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const catalogue=require('../../src/AntigravityZhManager/Assets/skill-details.json');
const additions=require('../../localization/ui-audit-additions.json');
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
(async()=>{const browser=await chromium.launch({executablePath:process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});let checks=0;try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent('<!doctype html><body>'+fixtures.map((f,i)=>'<article id="r'+i+'"><div class="leading-relaxed select-text">'+f.html+'</div></article>').join(''));
 const snapshot=()=>page.evaluate(()=>({html:document.body.innerHTML,codes:[...document.querySelectorAll('code')].map(c=>c.textContent),links:[...document.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent}))}));
 const before=await snapshot();
 // Tag the exact reviewed source blocks before localization, without relying
 // on generated Chinese text to locate the assertions.
 const found=await page.evaluate(plans=>{const counts=[];for(let i=0;i<plans.length;i++){
  const matches=[...document.querySelectorAll('p,li,td,h1,h2,h3,h4,h5,h6')].filter(e=>e.textContent.replace(/\s+/g,' ').trim()===plans[i].source);
  matches.forEach(e=>e.dataset.reviewedReadme=i);counts.push(matches.length);
 }return counts;},catalogue.readmeBlocks);
 assert.ok(found.every(n=>n>0),'每个复核段落都必须在官方 README 样本中出现');checks++;
 const taggedBefore=await snapshot();
 await page.evaluate(({d,c})=>{window.__antigravityZhPatchDictionary=d;window.__antigravityZhSkillDetails=c;},{d:dictionary,c:catalogue});
 await page.addScriptTag({content:runtime.replace('  function originalText(node) {','  window.__testTranslate = translateValue;\n  function originalText(node) {')});await page.waitForTimeout(400);
 const after=await snapshot();assert.deepEqual(after.codes,before.codes,'全部 README 行内代码与命令块逐项保留');checks++;
 assert.deepEqual(after.links.map(l=>l.href),before.links.map(l=>l.href),'全部链接目标逐项保留');checks++;
 assert.ok(after.links.every((l,i)=>!before.links[i].text.trim()||l.text.trim()),'链接文字不得清空');checks++;
 const translated=await page.evaluate(()=>[...document.querySelectorAll('[data-reviewed-readme]')].map(e=>({index:+e.dataset.reviewedReadme,text:e.textContent})));
 for(const item of translated){assert.equal(item.text.trim(),catalogue.readmeBlocks[item.index].translated.join('').trim(),'完整复核译文，不得重复或被短标识截获');checks++;}
 const templates=Object.entries(additions.templates).map(([s,t])=>{const sub=(_,n)=>n==='1'?'s':n==='2'?'origin/main':'Plan';return {source:s.replace(/\{(\d+)\??\}/g,sub),target:t.replace(/\{(\d+)\}/g,sub)};});
 const outputs=await page.evaluate(rows=>rows.map(r=>window.__testTranslate(r.source)),templates);
 templates.forEach((r,i)=>{assert.equal(outputs[i],r.target,'动态文案及用户名称完整保留：'+r.source);checks++;});
 await page.evaluate(()=>window.__antigravityZhPatchRestore());assert.equal((await snapshot()).html,taggedBefore.html,'全部 README 原生节点与文本可完整还原');checks++;
 await page.setContent('<!doctype html><body><div id="counter"></div>');
 await page.evaluate(()=>document.querySelector('#counter').append(document.createTextNode('3'),document.createTextNode(' insertion'),document.createTextNode('s'),document.createTextNode(' (+)')));
 await page.addScriptTag({content:runtime});await page.waitForTimeout(100);
 assert.equal(await page.locator('#counter').textContent(),'3 行新增 (+)','React 拆分的新增行计数与复数后缀');checks++;
 console.log(JSON.stringify({readmes:fixtures.length,reviewedParagraphs:catalogue.readmeBlocks.length,codeElements:before.codes.length,links:before.links.length,templates:templates.length,checks,passed:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
