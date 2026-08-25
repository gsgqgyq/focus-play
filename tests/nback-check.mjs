// 专项：N-back 刺激亮起 + 回合推进 + 计分无崩溃
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9223","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9223/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9223/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>(await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true})).result.value;
await send("Runtime.enable"); await send("Log.enable");
await ev(`location.href="http://localhost:8765/index.html"`); await sleep(1400);
await ev(`document.querySelector('.mainnav [data-nav="games"]').click()`); await sleep(200);
await ev(`document.querySelector('[data-game="nback"]').click()`); await sleep(600);
let litMax=0, turnSeen=new Set();
for(let k=0;k<18;k++){
  const s=await ev(`({lit:document.querySelectorAll('.nb-cell.lit').length, turn:document.querySelector('[data-c="turn"]')?.textContent, hits:document.querySelector('[data-c="hits"] b')?.textContent})`);
  litMax=Math.max(litMax,s.lit); if(s.turn) turnSeen.add(s.turn);
  await sleep(300);
}
// spam match clicks to exercise scoring path
await ev(`(()=>{ for(let k=0;k<8;k++) document.querySelector('.match-btn').click(); return true; })()`);
await sleep(1200);
const final=await ev(`({lit:document.querySelectorAll('.nb-cell.lit').length,hits:document.querySelector('[data-c="hits"] b')?.textContent,miss:document.querySelector('[data-c="miss"]')?.textContent,fa:document.querySelector('[data-c="fa"]')?.textContent,acc:document.querySelector('[data-c="acc"]')?.textContent})`);
const errs=[]; evts.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")) errs.push(JSON.stringify(e).slice(0,300)); });
console.log(JSON.stringify({litMax,turnsSeen:[...turnSeen],spam:final,consoleErrors:errs},null,2));
ws.close(); proc.kill();