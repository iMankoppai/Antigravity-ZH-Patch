'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const box={module:{exports:{}},URL,WeakSet};
vm.runInNewContext(fs.readFileSync('src/AntigravityZhManager/Assets/zh-bundle.js','utf8'),box);
const translate=box.module.exports.translateContextMenuLabel;
let checks=0;const check=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const cases={
 'Copy Project Name':'复制项目名称','Project Settings':'项目设置',
 'Show in File Explorer':'在文件资源管理器中显示','Delete Project':'删除项目',
 Rename:'重命名',Pin:'置顶','Mark Unread':'标记为未读',Copy:'复制',Split:'分屏',Archive:'归档',Delete:'删除',
 'Mark Read':'标记为已读',Unpin:'取消置顶',Restore:'恢复','Delete Permanently':'永久删除',
 'Split Right':'向右分屏','Split Down':'向下分屏','Replace with New':'替换为新对话','Remove from Split':'从分屏中移除',
 'Conversation Name':'对话名称','Conversation ID':'对话 ID','Workspace Name':'工作区名称','Project Name':'项目名称',
 'Rename Group':'重命名分组','Move Up':'上移','Move Down':'下移','Sort By':'排序方式',
 'Last Updated':'最近更新','Last Prompt':'最近提示词','Custom Order':'自定义顺序',
 'Copy Workspace Name':'复制工作区名称','Workspace Settings':'工作区设置','Delete Workspace':'删除工作区',
 'Copy Image':'复制图片','Close Tab':'关闭标签页','Close Other Tabs':'关闭其他标签页',
 'Close Tabs to the Right':'关闭右侧标签页',
 'Save Video':'保存视频','Save Image':'保存图片','Open in Tab':'在标签页中打开','New Tab':'新建标签页',
 'See more results':'查看更多结果','Delete Hook':'删除钩子','Add Hook Card':'添加钩子卡片','Delete Handler':'删除处理程序',
 'Show Terminal':'显示终端','Hide Terminal':'隐藏终端',
 'Open Link in New Tab':'在新标签页中打开链接','Open Link in External Browser':'在外部浏览器中打开链接',
 'Copy Link Address':'复制链接地址','Open Image in New Tab':'在新标签页中打开图片','Copy Image Address':'复制图片地址',
 'Open in External Browser':'在外部浏览器中打开','Back':'返回','Forward':'前进','Reload':'重新加载',
 'Copy Message':'复制消息','Fork in Current Workspace':'在当前工作区中派生',
 'Fork in Shared Workspace':'在共享工作区中派生','Fork in New Workspace':'在新工作区中派生',
 'New Remote Project':'新建远程项目','Toggle Status Bar':'切换状态栏','Give Feedback':'提供反馈',
 'Pin Tab':'固定标签页','Unpin Tab':'取消固定标签页','Add to Chat':'添加到对话',
 'Copy File Path':'复制文件路径','Copy File Name':'复制文件名','Send Message':'发送消息',
 'Queue Message':'将消息加入队列','Send Immediately':'立即发送',
};
for(const [en,zh]of Object.entries(cases))check(translate(en,{id:'cmi-0'}),zh,en);
for(const name of ['Copy','Archive','Settings','Gemini 3.8 Flash High','我的项目','C:\\Work\\Copy']) {
 check(translate(name,{id:'group-123',type:'checkbox'}),name,'自定义分组原样保留');
}
for(const label of ['a2a (ttv2)','My Custom Project','C:\\Users\\Copy','https://example.com/Archive'])
 check(translate(label,{id:'cmi-0'}),label,'未知名称、标识和路径保持');

// 验证渲染进程热加载下的 oRa 原生右键菜单拦截（无需重启主进程即可生效）
{
 const dict = JSON.parse(fs.readFileSync('src/AntigravityZhManager/Assets/dictionaries.json', 'utf8'));
 const translateSrc = fs.readFileSync('src/AntigravityZhManager/Assets/translate.js', 'utf8');
 const win = {
  __antigravityZhPatchDictionary: dict,
  addEventListener() {},
  removeEventListener() {},
  document: { documentElement: null, addEventListener() {}, removeEventListener() {} },
  navigator: { platform: 'Win32' },
  location: { pathname: '/' },
  Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
  NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
  Element: function Element() {},
 };
 win.window = win;
 vm.runInNewContext(translateSrc, win);
 const runMenuTest = vm.runInNewContext(`(() => {
  function oRa(a,b,c="cmi"){return a.map((e,f)=>{f=e.id||\`\${c}-\${f}\`;e.onClick&&b.set(f,e.onClick);var g={id:f,label:e.label,type:e.type&&e.type!=="item"&&e.type!=="label"?e.type:"normal",checked:e.checked,disabled:e.type==="label"?!0:e.disabled,accelerator:e.accelerator};e.items&&e.items.length>0&&(g.submenu=oRa(e.items,b,\`\${f}-sub\`));return g})}
  const callbacks = new Map();
  const projectMenu = oRa([
   { id: 'copy-name', label: 'Copy Project Name', onClick: () => 'copied' },
   { id: 'settings', label: 'Project Settings' },
   { type: 'separator' },
   { id: 'reveal', label: 'Show in File Explorer' },
   { id: 'delete', label: 'Delete Project' },
  ], callbacks);
  const convMenu = oRa([
   { id: 'rename', label: 'Rename' },
   { id: 'pin', label: 'Pin', accelerator: 'Ctrl+Shift+P' },
   { id: 'mark-read', label: 'Mark Unread' },
   { type: 'separator' },
   { id: 'copy', type: 'submenu', label: 'Copy', items: [{ id: 'copy-0', label: 'Conversation Name' }, { id: 'copy-1', label: 'Conversation ID' }] },
   { id: 'split', type: 'submenu', label: 'Split', items: [{ id: 'split-0', label: 'Split Right' }, { id: 'split-1', label: 'Split Down' }] },
   { id: 'group-abc', type: 'checkbox', label: 'Copy', checked: true },
   { id: 'archive', label: 'Archive' },
   { id: 'delete', label: 'Delete' },
  ], callbacks);
  window.__antigravityZhPatchController.stop();
  const afterStop = oRa([{ id: 'rename', label: 'Rename' }], new Map());
  return { projectMenu, convMenu, afterStop, copied: callbacks.get('copy-name')() };
 })()`, win);
 const { projectMenu, convMenu, afterStop, copied } = runMenuTest;
 check(projectMenu[0].label, '复制项目名称', '热加载项目菜单：复制项目名称');
 check(projectMenu[1].label, '项目设置', '热加载项目菜单：项目设置');
 check(projectMenu[3].label, '在文件资源管理器中显示', '热加载项目菜单：在文件资源管理器中显示');
 check(projectMenu[4].label, '删除项目', '热加载项目菜单：删除项目');
 check(copied, 'copied', '热加载项目菜单回调 ID 保持不变');
 check(convMenu[0].label, '重命名', '热加载对话菜单：重命名');
 check(convMenu[1].label, '置顶', '热加载对话菜单：置顶');
 check(convMenu[2].label, '标记为未读', '热加载对话菜单：标记为未读');
 check(convMenu[4].label, '复制', '热加载对话菜单：复制子菜单');
 check(convMenu[4].submenu[0].label, '对话名称', '热加载对话菜单：嵌套对话名称');
 check(convMenu[4].submenu[1].label, '对话 ID', '热加载对话菜单：嵌套对话 ID');
 check(convMenu[5].label, '分屏', '热加载对话菜单：分屏子菜单');
 check(convMenu[5].submenu[0].label, '向右分屏', '热加载对话菜单：嵌套向右分屏');
 check(convMenu[6].label, 'Copy', '热加载对话菜单：自定义分组名保持原样');
 check(convMenu[7].label, '归档', '热加载对话菜单：归档');
 check(convMenu[8].label, '删除', '热加载对话菜单：删除');
 check(afterStop[0].label, 'Rename', '停止补丁后原生菜单恢复英文');
}
// Optional integration mode executes the real installed IPC function rather
// than rebuilding its control flow inside this test.
const i=process.argv.indexOf('--asar');
if(i>=0){
 const archive=require('../packaging/lib/asar-reader.cjs').open(process.argv[i+1]);
 const code=archive.read('dist/ipcHandlers.js').toString();
 const {babelParse}=require('C:/Users/24844/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/lib/transform/babelBundle.js');
 const fn=babelParse(code,'ipcHandlers.js',true).program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='buildContextMenuTemplate');
 assert.ok(fn,'实际归档保留菜单构建函数');checks++;
 const nativeBox={require:()=>box.module.exports};
 vm.runInNewContext(code.slice(fn.start,fn.end)+'; this.build = buildContextMenuTemplate;',nativeBox);
 let selected;
 const input=Object.freeze([
  Object.freeze({id:'copy',label:'Copy',submenu:Object.freeze([Object.freeze({id:'copy-0',label:'Conversation ID'})])}),
  Object.freeze({type:'separator'}),Object.freeze({id:'split-0',label:'Split Right',disabled:true,accelerator:'Ctrl+R'}),
  Object.freeze({id:'group-123',label:'Archive',type:'checkbox',checked:true}),
 ]);
 const menu=nativeBox.build(input,id=>{selected=id;});
 check(menu[0].label,'复制','原生 IPC 子菜单标题');check(menu[0].submenu[0].label,'对话 ID','原生 IPC 嵌套标签');
 menu[0].submenu[0].click();check(selected,'copy-0','点击仍返回原始命令 ID');
 check(menu[1].type,'separator','分隔符保留');check(menu[2].enabled,false,'禁用项保留');
 check(menu[2].accelerator,'Ctrl+R','快捷键保留');check(menu[3].label,'Archive','同名自定义分组保留');
 check(menu[3].checked,true,'勾选状态保留');check(input[0].label,'Copy','调用方冻结数据未改写');
}
console.log(JSON.stringify({checks,passed:true,integration:i>=0}));
