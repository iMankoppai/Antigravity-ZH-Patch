// Patch only a recipient's verified Antigravity 2.18.1 archive. No app archive is distributed.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const ORIGINAL='3c03ce352dc3c1b43f357c27ead1f73c74d198a8ded89b1b3d6a2539e7a6ac5c';
const PATCHED='06144006816680ac983c05eaceccbf821ee6090f6ee9c4303f4c4e91af48879d';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function parse(b){const len=b.readUInt32LE(12),base=8+b.readUInt32LE(4);if(len>base-16||base>b.length)throw new Error('应用资源格式无效。');return{header:JSON.parse(b.subarray(16,16+len)),base};}
function entries(h){const out=[];function walk(files,p=''){for(const[n,e]of Object.entries(files)){if(e.files)walk(e.files,p+n+'/');else out.push([p+n,e]);}}walk(h.files);return out;}
function info(file){const b=fs.readFileSync(file),{header,base}=parse(b),e=header.files['package.json'];if(!e)throw new Error('找不到应用版本信息。');const pkg=JSON.parse(b.subarray(base+Number(e.offset),base+Number(e.offset)+e.size));return {version:pkg.version,hash:hash(b),nativeSupported:[ORIGINAL,PATCHED].includes(hash(b))};}
function prepare(original){
 if(hash(original)!==ORIGINAL)throw new Error('资源文件与已验证的 2.18.1 不匹配，已跳过原生标题适配。');
 const {header,base}=parse(original),list=entries(header),target=list.find(([n])=>n==='dist/ipcHandlers.js')[1];
 const raw=original.subarray(base+Number(target.offset),base+Number(target.offset)+target.size).toString();
 assert.equal(raw.split("title: 'Open workspace'").length,2);assert.equal(raw.split("title: 'Open workspaces'").length,2);
 const replacement=Buffer.from(raw.replace("title: 'Open workspace'","title: '打开工作区'").replace("title: 'Open workspaces'","title: '选择多个工作区'"));
 const offset=Number(target.offset),oldEnd=offset+target.size,delta=replacement.length-target.size;
 for(const[n,e]of list)if(!e.unpacked&&!e.link&&Number(e.offset)>=oldEnd)e.offset=String(Number(e.offset)+delta);
 target.size=replacement.length;target.integrity.hash=hash(replacement);target.integrity.blocks=[];
 for(let i=0;i<replacement.length;i+=target.integrity.blockSize)target.integrity.blocks.push(hash(replacement.subarray(i,i+target.integrity.blockSize)));
 const json=Buffer.from(JSON.stringify(header)),size=Math.ceil((4+json.length)/4)*4,h=Buffer.alloc(4+size),s=Buffer.alloc(8);
 h.writeUInt32LE(size);h.writeUInt32LE(json.length,4);json.copy(h,8);s.writeUInt32LE(4);s.writeUInt32LE(h.length,4);
 const result=Buffer.concat([s,h,original.subarray(base,base+offset),replacement,original.subarray(base+oldEnd)]);
 assert.equal(hash(result),PATCHED);return result;
}
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
function apply(file,dir,exe){
 const b=fs.readFileSync(file),sig=hash(b);if(sig===PATCHED)return{status:'already_patched'};
 const candidate=prepare(b);if(!permitsArchiveChange(exe))throw new Error('该安装版本不允许本次资源适配，已跳过；页面汉化可正常使用。');
 fs.mkdirSync(dir,{recursive:true});const backup=backupFile(dir);
 if(fs.existsSync(backup)){if(hash(fs.readFileSync(backup))!==ORIGINAL)throw new Error('已有原生备份不匹配，已停止。');}
 else fs.writeFileSync(backup,b,{flag:'wx'});
 replace(file,candidate,ORIGINAL);return{status:'applied',backup};
}
function restore(file,dir){
 const sig=hash(fs.readFileSync(file));if(sig===ORIGINAL)return{status:'already_original'};
 if(sig!==PATCHED)throw new Error('应用已更新或资源被其他修改，不能用旧备份覆盖。原生资源未改动。');
 const backup=backupFile(dir);if(!fs.existsSync(backup))throw new Error('找不到本机原生资源备份，原生资源未改动。');
 const b=fs.readFileSync(backup);if(hash(b)!==ORIGINAL)throw new Error('本机原生资源备份校验失败。');
 replace(file,b,PATCHED);return{status:'restored'};
}
module.exports={info,prepare,apply,restore,permitsArchiveChange,ORIGINAL,PATCHED,hash};
if(require.main===module){try{const[mode,file,dir,exe]=process.argv.slice(2);let r;if(mode==='inspect')r=info(file);else if(mode==='apply')r=apply(file,dir,exe);else if(mode==='restore')r=restore(file,dir);else throw new Error('未知操作。');console.log(JSON.stringify(r));}catch(e){console.error(e.message);process.exitCode=1;}}
