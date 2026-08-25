// 验证新流程：intro 说明+开始按钮 -> 点开始后游戏正常(以 N-back N2 为例)
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9229","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9229/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9229/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const rr=await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true}); if(rr.exceptionDetails) return {_ex:(rr.exceptionDetails.exception?.description||rr.exceptionDetails.text)}; return rr.result.value;};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await send("Page.navigate",{url:"http://localhost:8765/index.html"}); await sleep(2500);
// go to games > nback > level 2
const r=await ev(`(async()=>{
  document.querySelector('.mainnav [data-nav="games"]').click(); await new Promise(s=>setTimeout(s,300));
  document.querySelector('[data-game="nback"]').click(); await new Promise(s=>setTimeout(s,500));
  const lvl2=[...document.querySelectorAll(".lvl-dot")].find(b=>b.dataset.l==="2"); lvl2.click(); await new Promise(s=>setTimeout(s,500));
  const intro={hasIntro: !!document.getElementById("introGo"), how:(document.querySelector("#playHost h3")?.textContent||""), badge:(document.querySelector("#playLevelBadge")?.textContent||"")};
  // click start
  document.getElementById("introGo").click(); await new Promise(s=>setTimeout(s,800));
  const playing={hudN:document.querySelector("[data-c='hits']")!=null, btn:!!document.querySelector(".match-btn"), turn:document.querySelector("[data-c='turn']")?.textContent, prog:document.querySelector("[data-c='prog']")?.textContent, litFromStart:false};
  return {intro, playing};
})()`);
const errs=[]; evts.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")) errs.push((e.params.exceptionDetails?.exception?.description||e.params.entry.text||"").slice(0,160)); });
console.log(JSON.stringify({r,errs},null,2));
ws.close(); proc.kill();