import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const HS=process.env.HOME+"/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
const proc=spawn(HS,["--headless","--no-sandbox","--disable-gpu","--remote-debugging-port=9226","about:blank"],{stdio:"ignore"});
for(let i=0;i<75;i++){ try{ if((await fetch("http://127.0.0.1:9226/json")).ok) break; }catch{} await sleep(200); }
const t=await (await fetch("http://127.0.0.1:9226/json")).json();
const ws=new WebSocket(t.find(x=>x.type==="page").webSocketDebuggerUrl);
let id=0; const p=new Map(); const evts=[];
await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.id&&p.has(m.id)){p.get(m.id)(m.result);p.delete(m.id);} else if(m.method) evts.push(m);};
const send=(method,params={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async x=>{const rr=await send("Runtime.evaluate",{expression:x,awaitPromise:true,returnByValue:true}); if(rr.exceptionDetails) return {_ex:(rr.exceptionDetails.exception?.description||rr.exceptionDetails.text)}; return rr.result.value;};
await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
await send("Page.navigate",{url:"https://focusplay.516278.xyz/?code=e2e-single-domain-777"});
await sleep(6000);
const probe=await ev(`({len:document.body.innerHTML.length, syncCard:!!document.getElementById("syncCard"), mainnav:!!document.querySelector(".mainnav"), title:document.title})`);
const msgs=[]; evts.forEach(e=>{ if(e.method==="Runtime.exceptionThrown"||(e.method==="Log.entryAdded"&&e.params.entry.level==="error")) msgs.push((e.params.exceptionDetails?.exception?.description||e.params.entry.text||"").slice(0,200)); });
console.log(JSON.stringify({probe,msgs},null,2));
ws.close(); proc.kill();