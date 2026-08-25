import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9228","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9228/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9228/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const rr=await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true}); if(rr.exceptionDetails) return {_ex:(rr.exceptionDetails.exception?.description||rr.exceptionDetails.text)}; return rr.result.value;};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await send("Page.navigate",{url:"https://focusplay.516278.xyz/?code=e2e-single-domain-777"}); await sleep(6000);
const res=await ev(`(async()=>{
  try{
    const r1=await fetch("/api/sync",{method:"PUT",headers:{"X-Sync-Code":"e2e-single-domain-777","Content-Type":"application/json"},body:JSON.stringify({records:{nback:{bestScore:99}},focus:{totalMs:90000}})});
    const txt=await r1.text();
    const r2=await fetch("/api/sync",{headers:{"X-Sync-Code":"e2e-single-domain-777"}});
    const back=await r2.text();
    return {putStatus:r1.status, putBody:txt, getStatus:r2.status, getBody:back.slice(0,160), origin:location.origin};
  }catch(e){ return {_ex:String(e)} }
})()`);
console.log(JSON.stringify(res,null,2));
ws.close(); proc.kill();