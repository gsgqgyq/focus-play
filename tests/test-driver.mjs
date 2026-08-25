// FocusPlay 端到端手势测试驱动器 — CDP over Chrome Headless Shell
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const HS = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const DBG = 9222;
const URL = "http://localhost:8765/index.html";

const proc = spawn(HS, ["--headless","--no-sandbox","--disable-gpu",
  `--remote-debugging-port=${DBG}`, "about:blank"], {stdio:"ignore"});

async function waitDebug(giveup=15000){
  for(let i=0;i<giveup/200;i++){
    try{ const r=await fetch(`http://127.0.0.1:${DBG}/json`); if(r.ok) return await r.json(); }catch(e){}
    await sleep(200);
  }
  throw new Error("debugger not up");
}
let ws;
function connect(wsurl){
  ws=new WebSocket(wsurl);
  let id=0; const pending=new Map(); const events=[];
  const ready=new Promise((res,rej)=>{ ws.onopen=res; ws.onerror=rej; });
  ws.onmessage=(ev)=>{ const m=JSON.parse(ev.data);
    if(m.id&&pending.has(m.id)){ const {res,rej}=pending.get(m.id); pending.delete(m.id); m.error?rej(new Error(JSON.stringify(m.error))):res(m.result); }
    else if(m.method){ events.push(m); } };
  return {
    send: async (method,params={})=>{ await ready; return new Promise((res,rej)=>{ const i=++id; pending.set(i,{res,rej}); ws.send(JSON.stringify({id:i,method,params})); }); },
    events, close(){ ws.close(); }
  };
}
async function untilLoad(cdp){
  for(let i=0;i<40;i++){ const ok=await cdp.send("Runtime.evaluate",{expression:"document.readyState==='complete'"});
    if(ok.result.value) return; await sleep(250); } throw new Error("load timeout");
}
async function ev(cdp, expression, requireValue=true){
  const r=await cdp.send("Runtime.evaluate",{expression, awaitPromise:true, returnByValue:true});
  return r.result.value;
}

const targets=await waitDebug();
const page=targets.find(t=>t.type==="page");
const cdp=connect(page.webSocketDebuggerUrl);
await cdp.send("Runtime.enable"); await cdp.send("Log.enable"); await cdp.send("Page.enable");
await ev(cdp, `window.location.href="${URL}"`); await sleep(1500);

const consoleErrors=[];
cdp.events.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")){
  const t=JSON.stringify(e).slice(0,400); consoleErrors.push(t); }});

const results={};
// helper: go to games view
async function openGame(id){
  await ev(cdp, `document.querySelector('.mainnav [data-nav="games"]').click()`); await sleep(250);
  await ev(cdp, `document.querySelector('[data-game="${id}"]').click()`); await sleep(700);
}
// force level 1 for a clean test
async function resetState(){
  await ev(cdp, `localStorage.clear(); location.reload();`); await sleep(1500);
}

// ---- N-back: opens & first presentation appears ----
try{
  await resetState(); await openGame("nback");
  const nbackOK = await ev(cdp, `(()=>{ const lit=document.querySelectorAll('.nb-cell.lit').length; const btn=document.querySelector('.match-btn')!=null; return {lit, btn, hud:!!document.querySelector('[data-c="turn"]')}; })()`);
  results.nback = {nbackOK, consoleErrors:[...consoleErrors]};
  await ev(cdp, `document.querySelector('.mainnav [data-nav="games"]').click()`);
}catch(e){ results.nback={error:String(e)}; }

// ---- Schulte: solve whole level 1 -> should record + unlock ----
try{
  await resetState(); await openGame("schulte");
  await sleep(300);
  const solved = await ev(cdp, `(async()=>{ 
    const n=document.querySelectorAll('.st-cell').length;
    for(let k=1;k<=n;k++){ const b=document.querySelector('.st-cell[data-n="'+k+'"]'); if(b) b.click(); await new Promise(r=>setTimeout(r,55)); }
    await new Promise(r=>setTimeout(r,500));
    const res={ cells:n, next:document.querySelector('[data-c="cur"]')?.textContent,
      resultText:(document.querySelector('#playHost')||{}).innerHTML?.slice(0,160) };
    return res;
  })()`);
  results.schulte = {solve:solved};
  const data = await ev(cdp, `(localStorage.getItem('ff.records'))`);
  results.schulte.state = data;
  await ev(cdp, `document.querySelector('.mainnav [data-nav="games"]').click()`);
}catch(e){ results.schulte={error:String(e)}; }

// ---- Stroop: renders word + 4 options, click advances ----
try{
  await resetState(); await openGame("stroop"); await sleep(400);
  results.stroop = await ev(cdp, `(()=>{ const word=document.querySelector('.stroop-word')?.textContent;
    const n=document.querySelectorAll('.stroop-opts .evt-btn').length;
    return {word,n, opts:!!document.querySelector('.stroop-opts')}; })()`);
  await ev(cdp, `document.querySelector('.stroop-opts .evt-btn').click()`); await sleep(150);
  results.stroop.afterClickTurn = await ev(cdp, `document.querySelector('[data-c="left"]')?.textContent`);
  await ev(cdp, `document.querySelector('.mainnav [data-nav="games"]').click()`);
}catch(e){ results.stroop={error:String(e)}; }

// ---- Go/No-Go: field shows, submits are wired ----
try{
  await resetState(); await openGame("gonogo"); await sleep(600);
  results.gonogo = await ev(cdp, `({field:document.querySelector('.gg-field')?.textContent, go:!!document.querySelector('.gg-field')})`);
  await ev(cdp, `window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}))`);
  await sleep(150);
  results.gonogo.hit = await ev(cdp, `document.querySelector('[data-c="hit"]')?.textContent`);
  await ev(cdp, `document.querySelector('.mainnav [data-nav="games"]').click()`);
}catch(e){ results.gonogo={error:String(e)}; }

// ---- final console error sweep ----
await sleep(500);
cdp.events.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")){
  const t=(e.params.exceptionDetails||e.params.entry.text||""); if(!consoleErrors.find(x=>x.includes(String(t).slice(0,60)))) consoleErrors.push("LATE:"+JSON.stringify(e).slice(0,400)); }});

console.log("=== RESULTS ===");
console.log(JSON.stringify(results, null, 2));
console.log("=== CONSOLE ERRORS ===");
console.log(consoleErrors.length? consoleErrors.join("\n") : "(none)");

cdp.close(); proc.kill();