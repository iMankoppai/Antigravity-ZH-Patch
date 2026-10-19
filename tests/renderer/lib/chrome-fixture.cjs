'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
module.exports=async function withChromeFixture(html,run){
  let chrome,ws,server;const pending=new Map();let id=0;
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const profile=path.resolve('work/missing-ui-regression/chrome-'+Date.now()+'-'+process.pid);
  fs.mkdirSync(profile,{recursive:true});
  try{
    server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    chrome=spawn(process.env.ZH_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
      '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking',
      '--remote-debugging-port=0','--user-data-dir='+profile,
      `http://127.0.0.1:${server.address().port}/customizations/marketplaces/test/plugins/example`
    ],{windowsHide:true,stdio:'ignore'});
    const portFile=path.join(profile,'DevToolsActivePort');
    for(let i=0;i<100&&!fs.existsSync(portFile);i++){if(chrome.exitCode!==null)throw Error('Chrome exited');await pause(50);}
    if(!fs.existsSync(portFile))throw Error('Chrome debugger timeout');
    const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
    const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(5000)})).json();
    const target=pages.find(p=>p.type==='page');if(!target)throw Error('No fixture page');
    ws=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
    ws.addEventListener('message',e=>{const m=JSON.parse(e.data);pending.get(m.id)?.(m);});
    const evaluate=async expression=>{
      const m=await new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>{pending.delete(n);reject(Error('CDP timeout'));},15000);pending.set(n,m=>{clearTimeout(t);pending.delete(n);resolve(m);});ws.send(JSON.stringify({id:n,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}}));});
      if(m.error||m.result?.exceptionDetails)throw Error(JSON.stringify(m.error||m.result.exceptionDetails));return m.result.result.value;
    };
    let ready=false;
    for(let i=0;i<100;i++){if(await evaluate('document.readyState === "complete" && location.pathname.startsWith("/customizations/")')){ready=true;break;}await pause(30);}
    if(!ready)throw Error('Fixture navigation timeout');
    await run(evaluate,pause);
  }finally{
    ws?.close();chrome?.kill();if(server)await new Promise(r=>server.close(r));
  }
};
