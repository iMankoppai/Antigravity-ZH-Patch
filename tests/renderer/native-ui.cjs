'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const bundle=fs.readFileSync('src/AntigravityZhManager/Assets/zh-bundle.js','utf8');
const box={module:{exports:{}},URL,WeakSet,console};vm.runInNewContext(bundle,box);
const calls=[];const promise=Promise.resolve({response:1,checkboxChecked:true});
const dialog={showMessageBox(...args){calls.push({receiver:this,args});return promise;},showMessageBoxSync(...args){calls.push({receiver:this,args});return 1;},showErrorBox(...args){calls.push({receiver:this,args});return 'error-return';}};
box.module.exports.installNativeDialogs(dialog);const wrapped=dialog.showMessageBox;box.module.exports.installNativeDialogs(dialog);assert.equal(wrapped,dialog.showMessageBox);
let checks=1;
const check=(a,b,label)=>{assert.equal(a,b,label);checks++;};
const win={id:7};
for(const [message,expected]of [['Are you sure you want to quit?','确定要退出吗？'],['No updates available','暂无可用更新'],['The WSL distro "Ubuntu-24.04" is no longer installed.','WSL 发行版“Ubuntu-24.04”已不再安装。'],['Folder is on the Windows filesystem','文件夹位于 Windows 文件系统中']]){
 const opts=Object.freeze({type:'warning',title:'Confirm Quit',message,detail:'There may be agents or background tasks running.',buttons:Object.freeze(['Cancel','Quit']),defaultId:1,cancelId:0,checkboxChecked:true});
 check(dialog.showMessageBox(win,opts),promise,'Promise 原样返回');const call=calls.at(-1),actual=call.args[1];
 check(call.receiver,dialog,'原始 this');check(call.args[0],win,'父窗口原样保留');check(actual.message,expected,'原生文案翻译');check(actual.title,'确认退出','标题翻译');check(actual.detail,'可能仍有智能体或后台任务正在运行。','详情翻译');check(actual.buttons[0],'取消','取消按钮');check(actual.buttons[1],'退出','退出按钮');check(actual.defaultId,1,'默认按钮编号');check(actual.cancelId,0,'取消按钮编号');check(opts.message,message,'冻结选项不改写');
 check(dialog.showMessageBoxSync(opts),1,'同步响应编号保持');check(calls.at(-1).args[0].message,expected,'无父窗口重载');
}
const opts={message:'Unexpected diagnostic Example.txt'};dialog.showMessageBox(opts);check(calls.at(-1).args[0].message,opts.message,'未知错误和路径保持');
for(const [title,translated]of [['Cannot open folder','无法打开文件夹'],['Binary not found','未找到可执行文件'],['WSL setup failed','WSL 设置失败'],['Startup failed','启动失败']]){
 const detail='Startup failed: C:\\Copy\\Delete\\trace.js';
 check(dialog.showErrorBox(title,detail),'error-return','错误弹窗返回值');
 check(calls.at(-1).receiver,dialog,'错误弹窗 this');check(calls.at(-1).args[0],translated,'错误弹窗标题');check(calls.at(-1).args[1],detail,'技术诊断不翻译');
}
dialog.showErrorBox('Custom diagnostic Copy','Unknown content');check(calls.at(-1).args[0],'Custom diagnostic Copy','未知错误标题保持');
// 2.27.0 WebAuthn（webauthn.js）通行密钥选择弹窗
{
 const opts={type:'question',title:'Choose a Passkey',message:'Sign in to example.com',detail:'Select a passkey account to continue:',buttons:['alice@example.com','bob@example.com','Cancel'],defaultId:0,cancelId:2};
 dialog.showMessageBox(win,opts);
 const actual=calls.at(-1).args[1];
 check(actual.title,'选择通行密钥','通行密钥弹窗标题');
 check(actual.message,'登录 example.com','登录提示前缀翻译且站点保留');
 check(actual.detail,'选择一个通行密钥账号以继续：','通行密钥详情');
 check(actual.buttons[0],'alice@example.com','账号按钮保留');
 check(actual.buttons[2],'取消','取消按钮');
 check(opts.message,'Sign in to example.com','原选项不改写');
}
for(const [message,expected]of [['Sign in to this site','登录此网站'],['Sign in to Example Corp','登录 Example Corp'],['Sign into something else','Sign into something else']]){
 dialog.showMessageBox({message});
 check(calls.at(-1).args[0].message,expected,'登录提示变体：'+message);
}
console.log('native UI regression: '+checks+' PASS');
