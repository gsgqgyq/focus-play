// 验证6项: lang切换 / N-back(鲜明+声音开关) / 计时器全局倒计时 / 呼吸柔和语音 / 音乐按钮已移除
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9231","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9231/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9231/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const rr=await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true}); if(rr.exceptionDetails) return {_ex:(rr.exceptionDetails.exception?.description||rr.exceptionDetails.text)}; return rr.result.value;};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await send("Page.navigate",{url:"http://localhost:8765/index.html"}); await sleep(2500);
// 1) lang toggle
const langTest=await ev(`(async()=>{ const before=document.querySelector('[data-nav="games"]').textContent; document.getElementById("langBtn").click(); await new Promise(s=>setTimeout(s,300)); const after=document.querySelector('[data-nav="games"]').textContent; document.getElementById("langBtn").click(); await new Promise(s=>setTimeout(s,200)); return {before,after,musicBtnGone:!document.getElementById("musicBtn")}; })()`);
// 2) timer global pill + pill starts
const timerTest=await ev(`(async()=>{
  document.querySelector('.mainnav [data-nav="timer"]').click(); await new Promise(s=>setTimeout(s,300));
  document.querySelector('#timerPresets [data-m="5"]').click();
  document.getElementById("timerStartBtn").click(); await new Promise(s=>setTimeout(s,2600));
  const pill=document.getElementById("focusPill");
  const pillTxt= pill.style.display!=="none" ? pill.textContent : null;
  return {pillShown:pill.style.display!=="none", pillTxt, tabTitle:document.title};
})()`);
// stop timer to avoid dangling
await ev(`document.getElementById("timerResetBtn").click()`);
// 3) n-back vivid + cue button
const nbackTest=await ev(`(async()=>{
  document.querySelector('.mainnav [data-nav="games"]').click(); await new Promise(s=>setTimeout(s,300));
  document.querySelector('[data-game="nback"]').click(); await new Promise(s=>setTimeout(s,400));
  document.getElementById("introGo").click(); await new Promise(s=>setTimeout(s,700));
  const lit=[...document.querySelectorAll(".nb-cell")].filter(c=>c.classList.contains("lit"));
  return {cueBtn:!!document.querySelector("#cueBtn"), litNow:lit.length, litBg: lit.length? getComputedStyle(lit[0]).backgroundImage.slice(0,40):null};
})()`);
const errs=[]; evts.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")) errs.push((e.params.exceptionDetails?.exception?.description||e.params.entry.text||"").slice(0,160)); });
console.log(JSON.stringify({langTest,timerTest,nbackTest,errs},null,2));
ws.close(); proc.kill();