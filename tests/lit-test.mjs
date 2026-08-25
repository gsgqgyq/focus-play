import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9232","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9232/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9232/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map();
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);}};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const rr=await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true}); if(rr.exceptionDetails) return {_ex:(rr.exceptionDetails.exception?.description||rr.exceptionDetails.text)}; return rr.result.value;};
await send("Runtime.enable"); await send("Page.enable");
await send("Page.navigate",{url:"http://localhost:8765/index.html"}); await sleep(2200);
await ev(`document.querySelector('.mainnav [data-nav="games"]').click()`); await sleep(300);
await ev(`document.querySelector('[data-game="nback"]').click()`); await sleep(400);
await ev(`document.getElementById("introGo").click()`);
let found=null;
for(let k=0;k<30 && !found;k++){
  found=await ev(`(()=>{ const L=[...document.querySelectorAll(".nb-cell")].filter(c=>c.classList.contains("lit")); if(!L.length) return null; const cs=getComputedStyle(L[0]); return {bg:cs.backgroundImage.slice(0,60), shadow:!!cs.boxShadow&&cs.boxShadow!=="none", transform:cs.transform}; })()`);
  if(!found) await sleep(180);
}
console.log(JSON.stringify({litStyle:found},null,2));
ws.close(); proc.kill();