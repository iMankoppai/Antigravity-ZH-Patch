'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const cases=require('./fixtures/v68-ui-cases.json');
const dictionary=require('../../src/AntigravityZhManager/Assets/dictionaries.json');
const catalogue=require('../../src/AntigravityZhManager/Assets/skill-details.json');
const runtime=fs.readFileSync('src/AntigravityZhManager/Assets/translate.js','utf8');
let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
(async()=>{const browser=await chromium.launch({executablePath:process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.abort());
 await page.setContent('<!doctype html><body><main id="ui"></main><div data-testid="planner-response-text" id="authored"></div><pre id="code">This field is required</pre><nav aria-label="Sidebar"><span id="time">23h</span><a href="/c/example" id="named-time">23h</a></nav><p id="bare-time">23h</p><button data-testid="model-selector-trigger" id="model">Gemini 3.8 Flash High</button>');
 await page.evaluate(cases=>{
  window.__calls=[];window.__originalAlert=function(...args){window.__calls.push(args);return 42;};window.alert=window.__originalAlert;
  const ui=document.getElementById('ui');
  for(const [i,c]of cases.entries()){const e=document.createElement('button');e.id='case-'+i;e.textContent=c.original;e.setAttribute('aria-label',c.original);ui.append(e);}
  document.getElementById('authored').textContent=cases.map(x=>x.original).join('\n');
  for(const padding of ['p-4','p-6']){const s=document.createElement('section');s.className=padding+' flex flex-col gap-4';s.id='settings-'+padding;s.innerHTML='<h2>Application</h2><div class="label">Keep In Menu Bar</div><p>Keep the app accessible from the menu bar and running in the background when all windows are closed.</p>';ui.append(s);}
  const models=document.createElement('section');models.className='p-4 flex flex-col gap-4';models.innerHTML='<h2>Models &amp; Usage</h2><span id="quota">Gemini 4 Argon Weekly Limit</span>';ui.append(models);
  for(const [id,context]of [['project','in this project'],['conversations','in these conversations']]){const p=document.createElement('p');p.id=id;const global=document.createElement('span');global.className='text-link';global.textContent='Global Permissions';global.onclick=()=>window.__globalClicks=(window.__globalClicks||0)+1;const link=document.createElement('a');link.href='https://example.com/permissions';link.textContent='Learn more';link.addEventListener('click',e=>e.preventDefault());p.append('Also includes',' ',global,' ','when working ',context,'.',' ',link,'.');ui.append(p);}
  const git=document.createElement('span');git.id='git';git.append(...['Commit ','3',' file',' ','changes',' to'].map(s=>document.createTextNode(s)));ui.append(git);window.__countNode=git.childNodes[1];
 },cases);
 const before=await page.locator('body').innerHTML();
 await page.evaluate(({d,c})=>{window.__antigravityZhPatchDictionary=d;window.__antigravityZhSkillDetails=c;},{d:dictionary,c:catalogue});await page.addScriptTag({content:runtime});await page.waitForFunction(()=>window.__antigravityZhPatchInstalled);await page.waitForTimeout(120);
 for(const [i,c]of cases.entries()){check(await page.locator('#case-'+i).textContent(),c.expected,'文本 '+c.original);check(await page.locator('#case-'+i).getAttribute('aria-label'),c.expected,'无障碍名称 '+c.original);}
 check(await page.locator('#authored').textContent(),cases.map(x=>x.original).join('\n'),'全部新增文案在作者正文中受保护');check(await page.locator('#code').textContent(),'This field is required','代码受保护');check(await page.locator('#model').textContent(),'Gemini 3.8 Flash High','模型原名受保护');
 for(const padding of ['p-4','p-6']){check(await page.locator('#settings-'+padding+' .label').textContent(),'保留在系统托盘','Windows 标题 '+padding);check(await page.locator('#settings-'+padding+' p').textContent(),'所有窗口关闭后，仍可从系统托盘访问应用并保持后台运行。','Windows 说明 '+padding);}
 check(await page.locator('#quota').textContent(),'Gemini 4 Argon 每周额度','额度后缀翻译且模型名不变');
 check(await page.locator('#time').textContent(),'23 小时前','侧栏相对时间');check(await page.locator('#named-time').textContent(),'23h','时间形状的对话名不改');check(await page.locator('#bare-time').textContent(),'23h','非侧栏数据不改');
 check(await page.locator('#project').textContent(),'在此项目中工作时，也会应用全局权限。了解更多。','项目权限整句语序');check(await page.locator('#conversations').textContent(),'在这些对话中工作时，也会应用全局权限。了解更多。','非项目权限语序');
 await page.locator('#project .text-link').click();check(await page.evaluate(()=>window.__globalClicks),1,'权限链接原事件保留');
 check(await page.locator('#project a').getAttribute('href'),'https://example.com/permissions','帮助链接保留');
 check(await page.locator('#git').textContent(),'将 3 个文件的更改提交到','提交整句语序');await page.evaluate(()=>window.__countNode.nodeValue='5');await page.waitForTimeout(100);check(await page.locator('#git').textContent(),'将 5 个文件的更改提交到','提交数量动态变化');
 const alerts=await page.evaluate(()=>[window.alert('Configuration saved successfully!'),window.alert('User diagnostic Copy'),window.alert()]);check(alerts,[42,42,42],'alert 返回值保持');check(await page.evaluate(()=>window.__calls),[['配置已成功保存！'],['User diagnostic Copy'],[]],'只翻译已知 alert，未知消息和无参数原样保留');
 await page.addScriptTag({content:runtime});await page.evaluate(()=>window.alert('Configuration saved successfully!'));check(await page.evaluate(()=>window.__calls.length),4,'重复注入不堆叠 alert');
 await page.evaluate(()=>window.__countNode.nodeValue='3');await page.waitForTimeout(80);await page.evaluate(()=>window.__antigravityZhPatchRestore());check(await page.evaluate(()=>window.alert===window.__originalAlert),true,'还原 alert 原函数');
 await page.evaluate(()=>document.querySelectorAll('script').forEach(e=>e.remove()));check(await page.locator('body').innerHTML(),before,'所有节点属性与文本精确还原');
 const result={cases:cases.length,checks,passed:true};fs.mkdirSync('work/v68',{recursive:true});fs.writeFileSync('work/v68/ui-test.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
