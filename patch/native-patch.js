// Patch only a recipient's verified Antigravity 2.18.1 archive. No app archive is distributed.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const ORIGINAL='3c03ce352dc3c1b43f357c27ead1f73c74d198a8ded89b1b3d6a2539e7a6ac5c';
const PATCHED='06144006816680ac983c05eaceccbf821ee6090f6ee9c4303f4c4e91af48879d';
const CLOSE_TO_TRAY='bd5309cf2a3eeef8fc6d6d45d90d22fd13eb605b5276f17e89ce2cae1a7b7136';
const TRAY_DOUBLE_CLICK='f8a121002774cb4fceb50c1a82051c861e309009d2e6e79114456b54b37cbe12';
const AUTOLOAD='ec43111b4c82466fb969c97a150f5b1d640335997fd0d7c7f5d1c4103492e5e4';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function parse(b){const len=b.readUInt32LE(12),base=8+b.readUInt32LE(4);if(len>base-16||base>b.length)throw new Error('应用资源格式无效。');return{header:JSON.parse(b.subarray(16,16+len)),base};}
function entries(h){const out=[];function walk(files,p=''){for(const[n,e]of Object.entries(files)){if(e.files)walk(e.files,p+n+'/');else out.push([p+n,e]);}}walk(h.files);return out;}
function info(file){const b=fs.readFileSync(file),{header,base}=parse(b),e=header.files['package.json'];const pkg=JSON.parse(b.subarray(base+Number(e.offset),base+Number(e.offset)+e.size)),sig=hash(b);return{version:pkg.version,hash:sig,nativeSupported:sig===ORIGINAL||!!variants[sig],nativeAutoload:!!variants[sig]?.autoload,features:variants[sig]||null};}
function permitsArchiveChange(exe){
 const b=fs.readFileSync(exe),marker=Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX'),i=b.indexOf(marker);
 if(i<0||b.indexOf(marker,i+1)!==-1)return false;
 const p=i+marker.length;return b[p]===1&&b[p+1]>=5&&b[p+2+4]===0x30;
}
function replace(file,data,expected){
 if(hash(fs.readFileSync(file))!==expected)throw new Error('资源文件发生变化，已停止写入。');
 const temp=path.join(path.dirname(file),'.zh-v26-'+process.pid+'.tmp');
 try {fs.writeFileSync(temp,data,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 assert.equal(hash(fs.readFileSync(file)),hash(data));
}
function backupFile(dir){return path.join(dir,'app-2.18.1-native-original.asar');}
const changes=require('./native-changes.json');
const variants={
  "06144006816680ac983c05eaceccbf821ee6090f6ee9c4303f4c4e91af48879d": {
    "close": false,
    "tray": false,
    "autoload": false
  },
  "bd5309cf2a3eeef8fc6d6d45d90d22fd13eb605b5276f17e89ce2cae1a7b7136": {
    "close": true,
    "tray": false,
    "autoload": false
  },
  "1392db6f3bdbabe7386147dbef9732dc12e45d49c4302f7089165c5a14d0e24f": {
    "close": false,
    "tray": true,
    "autoload": false
  },
  "f8a121002774cb4fceb50c1a82051c861e309009d2e6e79114456b54b37cbe12": {
    "close": true,
    "tray": true,
    "autoload": false
  },
  "ad5349e66d6c6904d5158d5352fa227b354ce5759c028e92f3481c40a6e183df": {
    "close": false,
    "tray": false,
    "autoload": true
  },
  "02bac5e1c0976d5fe3e6c6bfdec56b6f7f32f0e55e8dbb66dd7bc0c45429d5cc": {
    "close": true,
    "tray": false,
    "autoload": true
  },
  "93ad39de95f2c1043eb892ccdb6864c4177857ad3c9ec01ad8e22a83b748c206": {
    "close": false,
    "tray": true,
    "autoload": true
  },
  "2fa97bfa2f24f07b41a88027b75f322a11111eb6e9e2027b22395146717c8330": {
    "close": true,
    "tray": true,
    "autoload": true
  },
  "56ea62d5640999138bd377d025358a99cca5a984979e81d1938b9fc1cb3f9329": {
    "close": false,
    "tray": false,
    "autoload": false
  },
  "67194617944d3c50a2c34e0ac98bbb5c54c5f6b4db71f24c4a08aafc2773c06f": {
    "close": true,
    "tray": false,
    "autoload": false
  },
  "706e0fc80eb92ea954cf390bc65817ec3f29ccd4da62dbb9461a0f38b03c6307": {
    "close": false,
    "tray": true,
    "autoload": false
  },
  "c136c2ad183d2b7130d3f13d1a66b830c04dab29bee6f0981520ad9f1dcda2e8": {
    "close": true,
    "tray": true,
    "autoload": false
  },
  "352170ff1adcd7aef2207478dcf7568a83651c73fe16d73d666943df215b0a39": {
    "close": false,
    "tray": false,
    "autoload": true
  },
  "8818af80d20eda1289bf9c19bdc60ce7adb1afabbd0328ec68fbda549c997f28": {
    "close": true,
    "tray": false,
    "autoload": true
  },
  "8f5f261570ba19607a5ac4c195cac09965995b44f62b17497e58dda976d1b770": {
    "close": false,
    "tray": true,
    "autoload": true
  },
  "ec43111b4c82466fb969c97a150f5b1d640335997fd0d7c7f5d1c4103492e5e4": {
    "close": true,
    "tray": true,
    "autoload": true
  }
};
function prepare(original,features={close:true,tray:true,autoload:true}) {
 if(hash(original)!==ORIGINAL)throw Error('原始资源不匹配，已停止。');
 const {header,base}=parse(original),list=entries(header),modules=new Map();
 for(const feature of ['titles','close','tray','autoload'])if(feature==='titles'||features[feature])for(const op of changes[feature]){
  let text=modules.get(op.file);if(text===undefined){const e=list.find(([n])=>n===op.file)?.[1];if(!e)throw Error('找不到模块：'+op.file);text=original.subarray(base+Number(e.offset),base+Number(e.offset)+e.size).toString();}
  if(text.split(op.oldText).length!==2)throw Error('补丁定位不匹配：'+op.file);
  modules.set(op.file,text.replace(op.oldText,op.newText));
 }
 const updates=[...modules].map(([name,text])=>{const e=list.find(([n])=>n===name)[1];return{name,entry:e,offset:Number(e.offset),oldSize:e.size,data:Buffer.from(text)};}).sort((a,b)=>a.offset-b.offset);
 const parts=[];let cursor=0;for(const c of updates){parts.push(original.subarray(base+cursor,base+c.offset),c.data);cursor=c.offset+c.oldSize;}parts.push(original.subarray(base+cursor));
 for(const[n,e]of list){if(e.unpacked||e.link)continue;const before=Number(e.offset);e.offset=String(before+updates.filter(c=>c.offset+c.oldSize<=before).reduce((v,c)=>v+c.data.length-c.oldSize,0));const c=updates.find(c=>c.name===n);if(c){e.size=c.data.length;e.integrity.hash=hash(c.data);e.integrity.blocks=[];for(let i=0;i<c.data.length;i+=e.integrity.blockSize)e.integrity.blocks.push(hash(c.data.subarray(i,i+e.integrity.blockSize)));}}
 const json=Buffer.from(JSON.stringify(header)),size=Math.ceil((4+json.length)/4)*4,h=Buffer.alloc(4+size),prefix=Buffer.alloc(8);h.writeUInt32LE(size);h.writeUInt32LE(json.length,4);json.copy(h,8);prefix.writeUInt32LE(4);prefix.writeUInt32LE(h.length,4);return Buffer.concat([prefix,h,...parts]);
}
function originalFor(file,dir){const b=fs.readFileSync(file),sig=hash(b);if(sig===ORIGINAL)return b;if(!variants[sig])throw Error('应用资源已更新或不匹配，已停止，未覆盖资源。');const backup=backupFile(dir);if(!fs.existsSync(backup))throw Error('找不到本机原始备份；请先用旧补丁恢复英文后安装。');const original=fs.readFileSync(backup);if(hash(original)!==ORIGINAL)throw Error('本机原始备份校验失败。');return original;}
function preflight(file,dir,exe){originalFor(file,dir);if(!permitsArchiveChange(exe))throw Error('该安装启用了资源完整性保护，不能安装本次原生功能。');return{status:'ready'};}
function apply(file,dir,exe){preflight(file,dir,exe);const original=originalFor(file,dir),sig=hash(fs.readFileSync(file)),candidate=prepare(original);assert.equal(hash(candidate),AUTOLOAD);fs.mkdirSync(dir,{recursive:true});const backup=backupFile(dir);if(fs.existsSync(backup)){if(hash(fs.readFileSync(backup))!==ORIGINAL)throw Error('已有备份不匹配。');}else fs.writeFileSync(backup,original,{flag:'wx'});if(sig===AUTOLOAD)return{status:'already_patched',backup};replace(file,candidate,sig);return{status:'applied',backup};}
function restoreFeature(file,dir,feature){if(!['close','tray','autoload'].includes(feature))throw Error('未知功能。');const sig=hash(fs.readFileSync(file)),features=variants[sig];if(!features)throw Error('应用资源已变化，停止恢复，避免覆盖更新。');const original=originalFor(file,dir);const next={...features,[feature]:false};const data=prepare(original,next);if(hash(data)!==sig)replace(file,data,sig);return{status:'restored_feature',feature,features:next};}
function restore(file,dir){const sig=hash(fs.readFileSync(file));if(sig===ORIGINAL)return{status:'already_original'};const original=originalFor(file,dir);replace(file,original,sig);return{status:'restored'};}
module.exports={info,prepare,preflight,apply,restore,restoreFeature,permitsArchiveChange,ORIGINAL,PATCHED,AUTOLOAD,hash};
if(require.main===module){try{const[mode,file,dir,exe]=process.argv.slice(2);let r;if(mode==='inspect')r=info(file);else if(mode==='preflight')r=preflight(file,dir,exe);else if(mode==='apply')r=apply(file,dir,exe);else if(mode==='restore')r=restore(file,dir);else if(mode.startsWith('restore-'))r=restoreFeature(file,dir,mode.slice(8));else throw Error('未知操作。');console.log(JSON.stringify(r));}catch(e){console.error(e.message);process.exitCode=1;}}
