'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const bundle=fs.readFileSync('src/AntigravityZhManager/Assets/zh-bundle.js','utf8');
const box={module:{exports:{}},URL,WeakSet,console};vm.runInNewContext(bundle,box);
const calls=[];const promise=Promise.resolve({response:1,checkboxChecked:true});
const dialog={showMessageBox(...args){calls.push({receiver:this,args});return promise;},showMessageBoxSync(...args){calls.push({receiver:this,args});return 1;},showOpenDialog(...args){calls.push({receiver:this,args});return promise;},showOpenDialogSync(...args){calls.push({receiver:this,args});return ['C:\\x'];},showErrorBox(...args){calls.push({receiver:this,args});return 'error-return';}};
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
// 2.32.1 SSH 远程管理弹窗、多行组织授权提示、确认按钮 "Yes"（原生限定）与 showOpenDialog 本地化
{
 const stopOpts=Object.freeze({type:'warning',buttons:Object.freeze(['Stop Server','Cancel']),defaultId:1,cancelId:1,title:'Stop SSH server',message:'Stop the Antigravity server on prod-box?',detail:'Agents running on this host will stop and its window will close. The server starts again the next time you connect.'});
 dialog.showMessageBox(win,stopOpts);
 const a1=calls.at(-1).args[1];
 check(a1.title,'停止 SSH 服务器','停止 SSH 弹窗标题');
 check(a1.message,'停止 prod-box 上的 Antigravity 服务器吗？','停止 SSH 弹窗消息');
 check(a1.buttons[0],'停止服务器','停止服务器按钮');
 check(a1.buttons[1],'取消','取消按钮');
 check(stopOpts.message,'Stop the Antigravity server on prod-box?','停止 SSH 冻结选项不改写');
}
{
 const orgOpts={type:'question',buttons:['Sign In','Cancel'],title:'Sign in',message:'Sign in to your organization for remote-1?',detail:"Continue only if you just chose to sign in with your organization in this window. remote-1 will get access to your organization's Google Cloud account.\nWorkforce pool: my-pool  Provider: my-oidc"};
 dialog.showMessageBox(win,orgOpts);
 const a2=calls.at(-1).args[1];
 check(a2.title,'登录','组织登录标题');
 check(a2.message,'为 remote-1 登录你的组织吗？','组织登录消息');
 check(a2.detail,"仅当你刚刚在本窗口选择了“通过组织登录”时才可继续。remote-1 将获得你所在组织的 Google Cloud 账号访问权限。\n员工池：my-pool  身份提供商：my-oidc",'组织登录详情保留标识');
 check(a2.buttons[0],'登录','组织登录按钮');
}
{
 const promptOpts={type:'question',title:'SSH: dev-box',message:'dev-box asks:',detail:'Continue connecting (yes/no)?',buttons:['Yes','No']};
 dialog.showMessageBox(win,promptOpts);
 const a3=calls.at(-1).args[1];
 check(a3.title,'SSH：dev-box','SSH 提示标题');
 check(a3.message,'dev-box 请求确认：','SSH 提示主语');
 check(a3.detail,'Continue connecting (yes/no)?','未知交互文本保留原文');
 check(a3.buttons[0],'是','原生弹窗 Yes 按钮');
 check(a3.buttons[1],'否','原生弹窗 No 按钮');
}
{
 const errOpts={title:'SSH connection failed',message:'The SSH connection closed. Check your network connection, then reconnect.',detail:'host-1 reported: Connection reset\nError code: CONNECTION_CLOSED\nLogs: C:\\Users\\test\\main.log'};
 dialog.showMessageBox(win,errOpts);
 const a4=calls.at(-1).args[1];
 check(a4.title,'SSH 连接失败','SSH 错误标题');
 check(a4.message,'SSH 连接已关闭。请检查网络连接，然后重新连接。','SSH 错误主句');
 check(a4.detail,'host-1 返回信息：Connection reset\n错误代码：CONNECTION_CLOSED\n日志路径：C:\\Users\\test\\main.log','SSH 多行错误代码与日志路径');
}
{
 const openOpts=Object.freeze({title:'Choose an SSH config file',defaultPath:'C:\\Users\\test\\.ssh',buttonLabel:'Select'});
 check(dialog.showOpenDialog(win,openOpts),promise,'showOpenDialog Promise 原样返回');
 const openActual=calls.at(-1).args[1];
 check(openActual.title,'选择 SSH 配置文件','SSH 配置选择器标题');
 check(openActual.defaultPath,'C:\\Users\\test\\.ssh','文件选择器路径原样保留');
 check(openOpts.title,'Choose an SSH config file','文件选择器冻结选项不改写');
 check(dialog.showOpenDialogSync({title:'Select Download Folder'})[0],'C:\\x','同步文件选择器返回值保留');
 check(calls.at(-1).args[0].title,'选择下载文件夹','下载文件夹选择器标题');
}
console.log('native UI regression: '+checks+' PASS');
