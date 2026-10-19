'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const withFixture=require('./lib/chrome-fixture.cjs');
const cases=require('./fixtures/missing-ui.json');
const dictionary=JSON.parse(fs.readFileSync('src/AntigravityZhManager/Assets/dictionaries.json','utf8'));
const source=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
let checks=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const html='<!doctype html><html><head><title>Welcome to Antigravity</title></head><body>'+cases.map(c=>`<section id="${c.id}">${c.html}</section>`).join('')+
 '<div id="user-breadcrumb"><span data-testid="breadcrumb-segment"><span>Customizations</span></span></div>'+ 
 '<div data-testid="planner-response-text"><span id="user-name">Available AI Credits: 10</span><code>Play</code></div></body></html>';
withFixture(html,async(evaluate,pause)=>{
 const originals=await evaluate('document.documentElement.outerHTML');
 await evaluate('window.__antigravityZhPatchDictionary='+JSON.stringify(dictionary));await evaluate(source);
 for(let i=0;i<100&&!await evaluate('window.__antigravityZhPatchInstalled');i++)await pause(30);
 for(const c of cases){
  if(typeof c.expected==='string')check(await evaluate(`document.getElementById(${JSON.stringify(c.id)}).textContent`),c.expected,c.area);
  else for(const [attr,value]of Object.entries(c.expected))check(await evaluate(`document.querySelector('#${c.id} [${attr}]').getAttribute(${JSON.stringify(attr)})`),value,c.area+' '+attr);
 }
 check(await evaluate('document.title'),'欢迎使用 Antigravity','向导标题');
 check(await evaluate('document.querySelector("#user-breadcrumb span span").textContent'),'Customizations','后续同名用户面包屑仍受保护');
 check(await evaluate('document.querySelector("#user-name").textContent'),'Available AI Credits: 10','正文不套用动态模板');
 await evaluate(`document.querySelector('#project-count strong:last-child').textContent='12 active conversations and 0 archived conversations'`);await pause(80);
 check(await evaluate(`document.querySelector('#project-count strong:last-child').textContent`),'12 个活跃对话和 0 个已归档对话','删除卡片计数动态刷新');
 check(await evaluate(`document.querySelector('#project-count strong').textContent`),'Settings','同名项目名称不翻译');
 check(await evaluate(`document.querySelector('#marketplace-more button').getAttribute('aria-label')`),'查看更多“基于 Google 构建”内容','展开按钮无障碍提示');
 await evaluate(`document.querySelector('#zoom button').setAttribute('aria-label','Zoom 150%, reset to fit');document.querySelector('#credits label').textContent='Available AI Credits: 2,345';document.querySelector('#plugin-configure h2').textContent='Configure 我的插件';`);
 await pause(80);
 check(await evaluate('document.querySelector("#zoom button").getAttribute("aria-label")'),'缩放 150%，重置为适合窗口','动态缩放刷新');
 check(await evaluate('document.querySelector("#credits label").textContent'),'可用 AI 积分：2,345','动态余额刷新');
 check(await evaluate('document.querySelector("#plugin-configure h2").textContent'),'配置 我的插件','动态名称保持原样');
 await evaluate(`history.pushState({},'','/c/example');document.querySelector('#breadcrumb span span').firstChild.nodeValue='Customizations';`);await pause(80);
 check(await evaluate('document.querySelector("#breadcrumb span span").textContent'),'Customizations','会话路径中同名标题不翻译');
 await evaluate('window.__antigravityZhPatchRestore()');
 check(await evaluate('document.title'),'Welcome to Antigravity','还原标题');
 check(await evaluate('document.querySelector("#upload span").textContent'),'Hold Ctrl to upload','还原拆分提示');
 check(await evaluate('document.querySelector("#zoom button").getAttribute("aria-label")'),'Zoom 150%, reset to fit','还原最新动态值');
 check(await evaluate('document.querySelector("#credits label").textContent'),'Available AI Credits: 2,345','还原最新余额');
 fs.mkdirSync('work/missing-ui-regression',{recursive:true});fs.writeFileSync('work/missing-ui-regression/result.json',JSON.stringify({checks,passed:true,patchVersion:Number(source.match(/const patchVersion = (\d+)/)[1])},null,2));
 console.log('missing UI regression: '+checks+' PASS');
}).catch(e=>{console.error(e);process.exitCode=1;});
