'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const fixture=require('./lib/chrome-fixture.cjs'),cases=require('./fixtures/plugin-readme-missing.json');
const dictionary=JSON.parse(fs.readFileSync('src/AntigravityZhManager/Assets/dictionaries.json','utf8'));
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
const html='<!doctype html><body>'+cases.map((c,i)=>`<section id="doc-${i}">${c.html}</section>`).join('');
let checks=0;
fixture(html,async(evaluate,pause)=>{
 await evaluate('window.__antigravityZhPatchDictionary='+JSON.stringify(dictionary));await evaluate(runtime);
 for(let i=0;i<100&&!await evaluate('window.__antigravityZhPatchInstalled');i++)await pause(30);
 const get=()=>evaluate(`Array.from(document.querySelectorAll('section[id]')).map(e=>({text:e.textContent.trim(),codes:[...e.querySelectorAll('code')].map(n=>n.textContent),links:[...e.querySelectorAll('a')].map(n=>({href:n.getAttribute('href'),text:n.textContent}))}))`);
 const translated=await get();
 for(let i=0;i<cases.length;i++){
  const c=cases[i],r=translated[i];assert.ok(r.text.startsWith(c.expectedPrefix),c.plugin+': '+c.source+' => '+r.text);checks++;
  assert.deepEqual(r.codes,c.codes,'代码保留');checks++;
  assert.deepEqual(r.links.map(a=>a.href),c.links.map(a=>a.href),'链接目标保留');checks++;
  assert.ok(r.links.every((l,j)=>!c.links[j].text.trim()||l.text.trim()),'链接文字不能被清空');checks++;
 }
 await evaluate('window.__antigravityZhPatchRestore()');const restored=await get();
 for(let i=0;i<cases.length;i++){assert.equal(restored[i].text.replace(/\s+/g,' '),cases[i].source,'文档还原');assert.deepEqual(restored[i].links,cases[i].links,'链接文字还原');checks+=2;}
 console.log('plugin README regression: '+checks+' PASS');
}).then(()=>fixture('<!doctype html>'+fs.readFileSync(__dirname+'/fixtures/gemini-native-readme.html','utf8'),async(evaluate,pause)=>{
 const before=await evaluate(`({html:document.body.innerHTML,codes:[...document.querySelectorAll('code')].map(e=>e.textContent),links:[...document.querySelectorAll('a')].map(e=>({href:e.getAttribute('href'),text:e.textContent}))})`);
 await evaluate(`(()=>{window.__antigravityZhPatchNodeOriginals=new WeakMap();for(const e of document.querySelectorAll('a,code')){const n=e.firstChild;if(n?.nodeType!==Node.TEXT_NODE)continue;window.__antigravityZhPatchNodeOriginals.set(n,{original:n.nodeValue,applied:''});n.nodeValue='';}})()`);
 await evaluate('window.__antigravityZhPatchDictionary='+JSON.stringify(dictionary));await evaluate(runtime);await pause(200);
 const after=await evaluate(`({codes:[...document.querySelectorAll('code')].map(e=>e.textContent),links:[...document.querySelectorAll('a')].map(e=>({href:e.getAttribute('href'),text:e.textContent})),rows:[...document.querySelectorAll('td')].map(e=>e.textContent),items:[...document.querySelectorAll('li')].filter(e=>!e.querySelector('li')).map(e=>e.textContent)})`);
 assert.deepEqual(after.codes,before.codes,'真实 README 的全部代码保持原样');
 assert.deepEqual(after.links.map(e=>e.href),before.links.map(e=>e.href),'真实 README 链接保持原样');
 assert.ok(after.links.every(e=>e.text.trim()),'原生图标链接的文字不清空');
 assert.equal(after.rows[3],'通过 WebSocket 和 Gemini Live API 构建低延迟、双向语音和视频应用。涵盖实时音视频流、后台深度推理、异步非阻塞工具调用、实时听写、实时语音翻译与会话管理。','拆分链接前后不重复整段译文');
 assert.ok(after.items.includes('API 密钥：设置 GEMINI_API_KEY 环境变量，密钥可从 Google AI Studio 获取。'),'API 密钥说明完整且无额外编号');
 assert.equal(after.items.find(x=>x.startsWith('gemini-api-docs')),'gemini-api-docs（https://gemini-api-docs-mcp.dev）：提供 gemini_search_docs 和 gemini_get_doc，让智能体直接搜索和阅读官方 Gemini API 文档，无需手动获取 URL。','MCP 拆分句完整且不重复');
 await evaluate('window.__antigravityZhPatchRestore()');assert.equal(await evaluate('document.body.innerHTML'),before.html,'真实 README 逐节点还原');
 console.log('native Gemini README: 7 PASS');
})).then(()=>fixture('<!doctype html>'+fs.readFileSync(__dirname+'/fixtures/google-cloud-native-readme.html','utf8'),async(evaluate,pause)=>{
 await evaluate('window.__antigravityZhPatchDictionary='+JSON.stringify(dictionary));await evaluate(runtime);await pause(200);
 assert.equal(await evaluate('document.querySelectorAll("p")[1].textContent'),'此插件将精选的智能体技能、路由规则，以及 Developer Knowledge MCP 服务器 的配置整合为一个便携式套件。','Google Cloud 概览强调整段不重复');
 assert.equal(await evaluate('document.querySelector("code").textContent'),'google-cloud-developer','插件标识保留在代码标签中');
 assert.equal(await evaluate('document.querySelector("li").textContent'),'finding-google-skills：从 Google Agent Skills 仓库发现并按需安装专业技能。','补齐技能发现说明');
 console.log('native Google Cloud README: 3 PASS');
})).catch(e=>{console.error(e);process.exitCode=1;});
