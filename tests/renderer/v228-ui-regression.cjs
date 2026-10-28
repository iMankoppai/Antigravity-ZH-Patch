'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const cases=require('./fixtures/v228-ui-cases.json');
const dictionary=require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const catalogue=require('../../src/AntigravityZhManager/Assets/skill-details.json');
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
(async()=>{const browser=await chromium.launch({executablePath:process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent(`<!doctype html><body><main id="ui"></main>
  <div data-testid="planner-response-text" id="authored"></div>
  <pre id="code">Waiting for your approval</pre>
  <button data-testid="model-selector-trigger" id="model">Gemini 3.8 Flash High</button>
  <span id="prose">Repo Details Click Middle Click Connections Not secure Stable Tahoe Alabaster</span>
  <div data-testid="ephemeral-tool-status" id="eph"><span id="eph-text">Waiting for your approval</span></div>
  <span id="about-btn" aria-label="About Antigravity">Antigravity</span>
  <div id="cert"><p id="cert-detail">You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.</p></div>
  <nav id="row"><a data-testid="conversation-row-sidebar" href="/c/a"><span class="text-xs text-foreground opacity-60 min-w-4" id="row-time">17h</span></a></nav>
  <a id="named-time-echo" href="/c/x">17h</a>`);
 await page.evaluate(cases=>{
  const ui=document.getElementById('ui');
  for(const [i,c]of cases.entries()){const e=document.createElement('button');e.id='case-'+i;e.textContent=c.original;e.setAttribute('aria-label',c.original);ui.append(e);}
  document.getElementById('authored').textContent=cases.map(x=>x.original).join('\n');
 },cases);
 const before=await page.locator('body').innerHTML();
 await page.evaluate(({d,c})=>{window.__antigravityZhPatchDictionary=d;window.__antigravityZhSkillDetails=c;},{d:dictionary,c:catalogue});await page.addScriptTag({content:runtime});await page.waitForFunction(()=>window.__antigravityZhPatchInstalled);await page.waitForTimeout(120);
 for(const [i,c]of cases.entries()){check(await page.locator('#case-'+i).textContent(),c.expected,'文本 '+c.original);check(await page.locator('#case-'+i).getAttribute('aria-label'),c.expected,'无障碍名称 '+c.original);}
 check(await page.locator('#authored').textContent(),cases.map(x=>x.original).join('\n'),'全部新增文案在作者正文中受保护');
 check(await page.locator('#code').textContent(),'Waiting for your approval','代码受保护');
 check(await page.locator('#model').textContent(),'Gemini 3.8 Flash High','模型原名受保护');
 check(await page.locator('#prose').textContent(),'Repo Details Click Middle Click Connections Not secure Stable Tahoe Alabaster','普通正文中的单词与主题名不改');
 check(await page.locator('#eph-text').textContent(),'等待你的批准','临时工具状态文本翻译');
 check(await page.locator('#about-btn').getAttribute('aria-label'),'关于 Antigravity','产品按钮 aria 模板');
 check(await page.locator('#cert-detail').textContent(),'请勿在此网站输入任何敏感信息（例如密码或信用卡信息），否则可能被攻击者窃取。','证书警告整句翻译');
 check(await page.locator('#row-time').textContent(),'17 小时前','既有会话行相对时间不回归');
 check(await page.locator('#named-time-echo').textContent(),'17h','普通链接里的时间形状不改');
 // 恢复
 await page.evaluate(()=>window.__antigravityZhPatchRestore());
 await page.evaluate(()=>{document.querySelectorAll('script').forEach(e=>e.remove());});
 check(await page.locator('body').innerHTML(),before,'所有节点属性与文本精确还原');
 console.log('v228 2.28.0 网页回归: '+checks+' PASS');
}catch(final){throw final}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
