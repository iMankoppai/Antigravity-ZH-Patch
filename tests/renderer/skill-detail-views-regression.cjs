'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),fixture=require('./lib/chrome-fixture.cjs');
const cases=require('./fixtures/official-skill-bodies.json');
const catalogue=JSON.parse(fs.readFileSync('src/AntigravityZhManager/Assets/skill-details.json','utf8'));
const dictionary=JSON.parse(fs.readFileSync('src/AntigravityZhManager/Assets/dictionaries.json','utf8'));
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
const proseCode=require('../../localization/skill-detail-prose-code.json');
const proseBlocks=require('../../localization/skill-detail-prose-code-blocks.json');
const html='<!doctype html><style>.flex{display:flex}</style><body>'+cases.map((c,i)=>`<section id="skill-${i}"><div data-testid="doc-row-modal"><div class="leading-relaxed select-text flex" data-zh-skill-body>${c.html}</div></div></section>`).join('')+
 '<div id="unknown"><div data-testid="doc-row-modal"><div data-zh-skill-body><h1>My custom skill</h1><p>API key instructions for GEMINI_API_KEY</p><ul><li>Keep this custom content <code>EXACT_VALUE</code></li></ul></div></div></div>'+
 '<article aria-label="Agent response"><div data-testid="planner-response-text"><div data-testid="doc-row-modal"><div data-zh-skill-body><p id="authored">Before proceeding with any Google Antigravity tasks, ensure the environment is ready:</p></div></div></div></article>';
let checks=0;
fixture(html,async(evaluate,pause)=>{
 const before=await evaluate(`[...document.querySelectorAll('section[id^="skill-"]')].map(e=>e.innerHTML)`);
 const unknown=await evaluate('document.getElementById("unknown").innerHTML');
 await evaluate(`(${JSON.stringify(cases.map(c=>c.markdown))}).forEach((markdown,i)=>{document.querySelector('#skill-'+i+' [data-zh-skill-body]').__reactFiber$fixture={return:{memoizedProps:{markdown}}};})`);
 const expected=await evaluate(`(${JSON.stringify(cases.map(c=>c.normalizedHtml))}).map(html=>{const root=document.createElement('div');root.innerHTML=html;const proseCode=${JSON.stringify(proseCode)},proseBlocks=${JSON.stringify(proseBlocks)};for(const code of root.querySelectorAll('code:not(pre code)'))if(Object.hasOwn(proseCode,code.textContent))code.textContent=proseCode[code.textContent];for(const code of root.querySelectorAll('pre code')){const original=code.textContent,key=original.trim();if(Object.hasOwn(proseBlocks,key))code.textContent=original.replace(key,()=>proseBlocks[key]);}return {codes:[...root.querySelectorAll('code')].map(e=>e.textContent).sort(),pre:[...root.querySelectorAll('pre code')].map(e=>e.textContent),hrefs:[...root.querySelectorAll('a')].map(e=>e.getAttribute('href')).sort(),tables:[...root.querySelectorAll('table')].map(t=>({columns:t.querySelectorAll('thead th').length,rows:t.querySelectorAll('tbody tr').length})),lists:root.querySelectorAll('li').length};})`);
 const sdkIndex=cases.findIndex(c=>c.skill==='google-antigravity-sdk');
 await evaluate(`(()=>{window.__antigravityZhPatchNodeOriginals=new WeakMap();const root=document.getElementById('skill-${sdkIndex}');const target=[...root.querySelectorAll('li')].find(e=>e.textContent.includes('GEMINI_API_KEY')&&e.querySelector('li'));const w=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);let n,i=0;while(n=w.nextNode()){const original=n.nodeValue,applied=i++?'':'旧版简化说明';window.__antigravityZhPatchNodeOriginals.set(n,{original,applied});n.nodeValue=applied;}})()`);
 await evaluate('window.__antigravityZhPatchDictionary='+JSON.stringify(dictionary)+';window.__antigravityZhSkillDetails='+JSON.stringify(catalogue));await evaluate(runtime);
 for(let i=0;i<200&&!await evaluate('window.__antigravityZhPatchInstalled');i++)await pause(30);
 const after=await evaluate(`[...document.querySelectorAll('section[id^="skill-"]')].map(root=>{const source=root.querySelector('[data-zh-skill-body]'),view=root.querySelector('[data-antigravity-zh-detail-view]');if(!view)return null;const clone=view.cloneNode(true);clone.querySelectorAll('style,.zh-copy-code').forEach(e=>e.remove());return {html:clone.innerHTML,hidden:getComputedStyle(source).display==='none',visible:getComputedStyle(view).display!=='none',codes:[...view.querySelectorAll('code')].map(e=>e.textContent).sort(),pre:[...view.querySelectorAll('pre code')].map(e=>e.textContent),hrefs:[...view.querySelectorAll('a')].map(e=>e.getAttribute('href')).sort(),tables:[...view.querySelectorAll('table')].map(t=>({columns:t.querySelectorAll('thead th').length,rows:t.querySelectorAll('tbody tr').length,widths:[...t.querySelectorAll('tbody tr')].map(r=>r.children.length)})),lists:view.querySelectorAll('li').length,brokenCells:[...view.querySelectorAll('td,th')].filter(c=>/^\\s*:\\s*:\\s*:/.test(c.textContent)).length,text:clone.textContent};})`);
 for(let i=0;i<cases.length;i++){
  const a=after[i],e=expected[i],name=cases[i].plugin+'/'+cases[i].skill;
  assert.ok(a,name+' 应展示完整段落译文');checks++;
  assert.ok(a.hidden&&a.visible,name+' 只展示译文且不受 flex 类影响');checks++;
  assert.deepEqual(a.codes,e.codes,name+' 行内代码完整保留，允许中文语序重排');checks++;
  assert.deepEqual(a.pre,e.pre,name+' 代码块逐字不变');checks++;
  assert.deepEqual(a.hrefs,e.hrefs,name+' 链接地址完整保留');checks++;
  assert.deepEqual(a.tables.map(t=>({columns:t.columns,rows:t.rows})),e.tables,name+' 表格符合已合并的源表');checks++;
  assert.ok(a.tables.every(t=>t.widths.every(w=>w===t.columns)),name+' 每行单元格数一致');checks++;
  assert.equal(a.brokenCells,0,name+' 没有冒号续行伪单元格');checks++;
  assert.equal(a.lists,e.lists,name+' 列表条目完整');checks++;
  const doc=catalogue.documents.find(d=>d.plugin===cases[i].plugin&&d.skill===cases[i].skill);
  assert.equal(a.html,doc.renderedHtml,name+' 使用完整段落译文');checks++;
 }
 const slides=cases.findIndex(c=>c.plugin==='gslides');
 assert.ok(after[slides].text.includes('关键字段')&&!after[slides].text.includes('奥普'),'截图表头含义正确');checks++;
 assert.equal(await evaluate(`(()=>{const v=document.querySelector('#skill-${slides} [data-antigravity-zh-detail-view]');return [...v.querySelectorAll('table')].find(t=>t.querySelectorAll('th').length===3&&t.textContent.includes('set-background')).querySelectorAll('tbody tr').length;})()`),27,'27 种批量操作各占一行');checks++;
 assert.equal(await evaluate('document.getElementById("unknown").innerHTML'),unknown,'未知文档保护');checks++;
 assert.equal(await evaluate('document.getElementById("authored").textContent'),'Before proceeding with any Google Antigravity tasks, ensure the environment is ready:','用户/智能体正文保护');checks++;
 assert.equal(await evaluate(`(()=>{const source=document.querySelector('[data-zh-skill-body] a[href]');let clicked=0;source.addEventListener('click',e=>{e.preventDefault();clicked++});const view=source.closest('[data-zh-skill-body]').nextElementSibling;[...view.querySelectorAll('a')].find(a=>a.getAttribute('href')===source.getAttribute('href')).click();return clicked;})()`),1,'链接沿用原有事件处理');checks++;
 assert.ok(await evaluate(`(async()=>{let copied=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});const pre=document.querySelector('[data-antigravity-zh-detail-view] pre'),text=pre.querySelector('code').textContent;pre.querySelector('button').click();await Promise.resolve();return copied===text;})()`),'代码复制原文');checks++;
 await evaluate(runtime);assert.equal(await evaluate('document.querySelectorAll("[data-antigravity-zh-detail-view]").length'),140,'重复注入不重复正文');checks++;
 await evaluate(`(()=>{const root=document.createElement('section');root.id='reuse';root.innerHTML='<div data-testid="doc-row-modal"><div class="leading-relaxed select-text" data-zh-skill-body></div></div>';root.querySelector('[data-zh-skill-body]').innerHTML=${JSON.stringify(cases[0].html)};document.body.appendChild(root);})()`);
 for(let i=0;i<80&&!await evaluate('Boolean(document.querySelector("#reuse [data-antigravity-zh-detail-view]"))');i++)await pause(20);
 assert.ok(await evaluate('Boolean(document.querySelector("#reuse [data-antigravity-zh-detail-view]"))'),'动态打开详情');checks++;
 const replacement=cases.find(c=>c.plugin==='gslides');
 await evaluate(`document.querySelector('#reuse [data-zh-skill-body]').innerHTML=${JSON.stringify(replacement.html)}`);
 for(let i=0;i<80&&!await evaluate('document.querySelector("#reuse [data-antigravity-zh-detail-view]")?.getAttribute("data-antigravity-zh-detail-view")==="gslides/gslides"');i++)await pause(20);
 assert.equal(await evaluate('document.querySelector("#reuse [data-antigravity-zh-detail-view]")?.getAttribute("data-antigravity-zh-detail-view")'),'gslides/gslides','复用原节点切换文档时更新正文');checks++;
 await evaluate('document.querySelector("#reuse [data-zh-skill-body]").remove()');await pause(50);
 assert.equal(await evaluate('document.querySelectorAll("#reuse [data-antigravity-zh-detail-view]").length'),0,'React 移除正文时清理译文');checks++;
 await evaluate('document.getElementById("reuse").remove();window.__antigravityZhSkillDetails={...window.__antigravityZhSkillDetails,revision:"regression-refresh"}');await evaluate(runtime);
 for(let i=0;i<80&&!await evaluate('window.__antigravityZhPatchInstalled&&document.querySelectorAll("[data-antigravity-zh-detail-view]").length===140');i++)await pause(20);
 assert.equal(await evaluate('document.querySelectorAll("[data-antigravity-zh-detail-view]").length'),140,'更新正文目录后无重复和丢失');checks++;
 await evaluate('window.__antigravityZhPatchRestore()');
 const restored=await evaluate(`[...document.querySelectorAll('section[id^="skill-"]')].map(e=>e.innerHTML)`);
 for(let i=0;i<cases.length;i++){assert.equal(restored[i],before[i],cases[i].skill+' 原始节点完整还原');checks++;}
 assert.equal(await evaluate('document.querySelectorAll("[data-antigravity-zh-detail-view]").length'),0,'还原移除译文视图');checks++;
 await evaluate(`(()=>{const source=document.querySelector('#skill-0 [data-zh-skill-body]');source.__reactFiber$fixture.return.memoizedProps.markdown+=String.fromCharCode(10)+'Custom change';})()`);await evaluate(runtime);
 for(let i=0;i<80&&!await evaluate('window.__antigravityZhPatchInstalled');i++)await pause(20);
 assert.equal(await evaluate('document.querySelectorAll("#skill-0 [data-antigravity-zh-detail-view]").length'),0,'源文件变化时不覆盖为旧的完整译文');checks++;
 await evaluate('window.__antigravityZhPatchRestore()');
 const result={skills:cases.length,plugins:new Set(cases.map(c=>c.plugin)).size,checks,passed:true,patchVersion:Number(runtime.match(/const patchVersion = (\d+)/)[1]),repairedContinuationRows:cases.reduce((n,c)=>n+c.repairedContinuations,0)};
 fs.mkdirSync('work/skill-details-regression',{recursive:true});fs.writeFileSync('work/skill-details-regression/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}).catch(e=>{console.error(e);process.exitCode=1;});
