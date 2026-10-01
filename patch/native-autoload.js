'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const patchDir=__dirname,dictionaryDir=path.join(patchDir,'dictionaries');
const windows=new Map();let snapshot=null,watcher=null,reloadTimer=null,revision=0;
function log(message){try{fs.appendFileSync(path.join(patchDir,'native-autoload.log'),new Date().toISOString()+' '+message+'\n');}catch{}}
function enabled(){try{return JSON.parse(fs.readFileSync(path.join(patchDir,'config.json'),'utf8')).enabled===true;}catch{return false;}}
function loadDictionaries() {
  const errors = [];
  const warnings = [];

  let files;
  try {
    files = fs.readdirSync(dictionaryDir).filter((name) => name.toLowerCase().endsWith(".json")).sort();
  } catch (error) {
    return { ok: false, errors: [`无法读取词典目录 ${dictionaryDir}：${error.message}`], warnings, dictionary: {}, signature: "" };
  }
  if (files.length === 0) {
    return { ok: false, errors: [`词典目录中没有 .json 文件：${dictionaryDir}`], warnings, dictionary: {}, signature: "" };
  }

  const merged = new Map();
  const hash = crypto.createHash("sha256");

  for (const file of files) {
    const fullPath = path.join(dictionaryDir, file);
    let text;
    try {
      text = fs.readFileSync(fullPath, "utf8");
    } catch (error) {
      errors.push(`${file}：读取失败 - ${error.message}`);
      continue;
    }
    hash.update(file).update("\0").update(text).update("\0");

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      errors.push(`${file}：JSON 格式错误 - ${error.message}`);
      continue;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push(`${file}：顶层必须是 JSON 对象`);
      continue;
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string" || !value.trim()) {
        errors.push(`${file}：${JSON.stringify(key)} 的译文不是字符串`);
        continue;
      }
      if (key.trim() === "") {
        warnings.push(`${file}：存在空的原文字段，已忽略`);
        continue;
      }
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { value, file });
        continue;
      }
      if (existing.value === value) {
        warnings.push(`${file}：${JSON.stringify(key)} 与 ${existing.file} 重复且译文相同，可删除其中一处`);
        continue;
      }
      errors.push(`${file}：${JSON.stringify(key)} 与 ${existing.file} 译文冲突（${existing.file}=${JSON.stringify(existing.value)} / ${file}=${JSON.stringify(value)}）`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, dictionary: {}, signature: "" };
  }

  const result = Object.create(null);
  for (const key of [...merged.keys()].sort()) result[key] = merged.get(key).value;
  return { ok: true, errors, warnings, dictionary: result, signature: hash.digest("hex") };
}

function refresh(){
 try{
  const loaded=loadDictionaries();if(!loaded.ok){log('词典未更新：'+loaded.errors.join('；'));return;}
  const source=fs.readFileSync(path.join(patchDir,'translate.js'),'utf8');
  const signature=crypto.createHash('sha256').update(source).update(loaded.signature).digest('hex');
  if(snapshot?.signature===signature)return;
  revision++;snapshot={signature,source:'window.__antigravityZhPatchDictionary = '+JSON.stringify(loaded.dictionary)+';\n'+
   'window.__antigravityZhPatchDictionaryRevision = '+revision+';\n'+
   'window.__antigravityZhPatchDictionarySignature = '+JSON.stringify(signature)+';\n'+source};
  log('词典已加载：'+Object.keys(loaded.dictionary).length+' 条');
  for(const state of windows.values())inject(state);
 }catch(error){log('自动汉化准备失败：'+error.message);}
}
function inject(state){
 state.queue=state.queue.then(async()=>{
  if(!enabled()||!snapshot||state.contents.isDestroyed())return;
  const current=state.contents.getURL();let origin;try{origin=new URL(current).origin;}catch{return;}
  if(origin!==state.origin)return;
  const stamp=state.generation+':'+snapshot.signature;if(state.applied===stamp)return;
  const script='(()=>{if(location.origin!=='+JSON.stringify(state.origin)+')return;window.__antigravityZhNativeAutoload=true;\n'+snapshot.source+'\n})()';
  await state.contents.executeJavaScript(script,false);
  state.applied=stamp;log('窗口自动加载汉化：'+state.contents.id);
 }).catch(error=>{log('窗口汉化暂未完成：'+error.message);});
 return state.queue;
}
function attach(win,url){
 if(!enabled()||win.isDestroyed()||windows.has(win.webContents))return;
 let parsed;try{parsed=new URL(url);}catch{return;}
 if(parsed.protocol!=='https:'||parsed.hostname!=='127.0.0.1'||!parsed.port||parsed.username||parsed.password)return;
 const contents=win.webContents,state={contents,origin:parsed.origin,generation:0,applied:null,queue:Promise.resolve()};windows.set(contents,state);
 contents.on('did-start-navigation',(_event,_url,_inPlace,isMainFrame)=>{if(isMainFrame!==false){state.generation++;state.applied=null;}});
 contents.on('dom-ready',()=>inject(state));contents.on('did-finish-load',()=>inject(state));
 contents.once('destroyed',()=>windows.delete(contents));
 if(!watcher){
  refresh();
  try{watcher=fs.watch(dictionaryDir,{persistent:false},(_event,name)=>{
   if(name&&!String(name).toLowerCase().endsWith('.json'))return;
   clearTimeout(reloadTimer);reloadTimer=setTimeout(refresh,300);reloadTimer.unref?.();
  });watcher.on('error',error=>log('词典监听失败：'+error.message));}catch(error){log('词典监听失败：'+error.message);}
 }else inject(state);
}
module.exports={attach};
