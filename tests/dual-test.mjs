// dual n-back 验证: 开声音->出现字母按钮+字母流计分; 关声音->纯视觉
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9234","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9234/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9234/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const rr=await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true}); if(rr.exceptionDetails) return {_ex:(rr.exceptionDetails.exception?.description||rr.exceptionDetails.text)}; return rr.result.value;};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await send("Page.navigate",{url:"http://localhost:8765/index.html"}); await sleep(2200);
// enable cue (dual) via localStorage pref then reload
await ev(`localStorage.setItem("ff.prefs", JSON.stringify({nbackCue:true})); location.reload()`); await sleep(2500);
const r=await ev(`(async()=>{
  document.querySelector('.mainnav [data-nav="games"]').click(); await new Promise(s=>setTimeout(s,300));
  document.querySelector('[data-game="nback"]').click(); await new Promise(s=>setTimeout(s,400));
  const intro={letterBtnOnIntro:false, how:/双通道|dual/.test(document.querySelector("#playHost")?.textContent||"")};
  document.getElementById("introGo").click(); await new Promise(s=>setTimeout(s,900));
  return {...intro,
    letterBtn:!!document.querySelector(".letter-btn"),
    laccHud:!!document.querySelector("[data-c='lacc']"),
    badge:(document.querySelector("#playLevelBadge")||{}).textContent};
})()`);
// let a few trials run & spam letter button to exercise scoring path
await ev(`(async()=>{ for(let k=0;k<6;k++){ const b=document.querySelector(".letter-btn"); b&&b.click(); await new Promise(s=>setTimeout(s,700)); } })()`);
const errs=[]; evts.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")) errs.push((e.params.exceptionDetails?.exception?.description||e.params.entry.text||"").slice(0,160)); });
console.log(JSON.stringify({r,errs},null,2));
ws.close(); proc.kill();