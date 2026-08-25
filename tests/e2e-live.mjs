// 线上端到端: 首页加载 + 输入同步码 -> 保存 -> 状态变 ok; 再验证 D1 里真有数据
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9224","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9224/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9224/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>(await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true})).result.value;
await send("Runtime.enable"); await send("Log.enable");
await ev(`location.href="https://focusplay.516278.xyz/"`); await sleep(3000);
const title=await ev(`document.title`);
// enter sync code and save
const r1=await ev(`(async()=>{
  document.getElementById("syncInput").value="e2e-test-code-9527";
  document.getElementById("syncSave").click();
  await new Promise(r=>setTimeout(r,4000));
  return {status:document.getElementById("syncStatus").textContent, cls:document.getElementById("syncStatus").className};
})()`);
// record a game session locally then push
const r2=await ev(`(async()=>{
  const mod=await import("/js/state.js");
  mod.store.record("nback",{level:2,score:88,ms:30000,pass:true});
  await new Promise(r=>setTimeout(r,2500));
  return localStorage.getItem("ff.records");
})()`);
const errs=[]; evts.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")) errs.push(JSON.stringify(e).slice(0,200)); });
console.log(JSON.stringify({title,sync:r1,localState:r2,consoleErrors:errs},null,2));
ws.close(); proc.kill();