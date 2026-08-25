/* 专注计时器 — 预设置、倒计时、完成时播报并累计专注时长。 */
import { t, applyI18n } from "../i18n.js";
import { store } from "../state.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";

const PRESETS=[5,10,15,25,40];
let secs=25*60, total=25*60, running=false, paused=false, iv=null;

const $=id=>document.getElementById(id);
function renderPresets(){
  $("timerPresets").innerHTML=PRESETS.map(m=>`<button class="preset-btn ${m===25?'active':''}" data-m="${m}">${m} ${t("min")}</button>`).join("");
  $("timerPresets").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    if(running&&!paused) return; setTime(+b.dataset.m*60);
    $("timerPresets").querySelectorAll("button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
  }));
}
function setTime(s){ total=secs=s; paint(); }
function paint(){
  const m=Math.floor(secs/60), s=secs%60;
  $("timerDisplay").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  $("timerBar").style.width= total? ((total-secs)/total*100)+"%" : "0";
}
function start(){
  if(running) return;
  running=true; paused=false;
  $("timerStartBtn").style.display="none";
  $("timerPauseBtn").style.display="inline-block";
  $("timerResetBtn").style.display="inline-block";
  $("timerNote").textContent=t("timer_running");
  sfx.tick(); voice.say(t("timer_start"));
  iv=setInterval(()=>{
    secs--; paint();
    if(secs<=0){ done(); }
  },1000);
}
function pause(){ if(!running||paused)return; paused=true; clearInterval(iv); $("timerPauseBtn").textContent=t("resume"); }
function resume(){ if(!running||!paused)return; paused=false; $("timerPauseBtn").textContent=t("timer_pause");
  iv=setInterval(()=>{ secs--; paint(); if(secs<=0){ done(); } },1000);
}
function done(){
  clearInterval(iv); running=false;
  const doneMs = total*1000;
  store.recordFocus(doneMs);
  $("timerNote").textContent=t("timer_done",{m:Math.round(total/60)});
  sfx.done(); voice.say(t("timer_done",{m:Math.round(total/60)}));
  $("timerStartBtn").style.display="inline-block";
  $("timerPauseBtn").style.display="none";
  $("timerResetBtn").style.display="none";
  $("timerBar").style.width="100%";
}
function reset(){ clearInterval(iv); running=false; setTime(total); $("timerStartBtn").style.display="inline-block"; $("timerPauseBtn").style.display="none"; $("timerResetBtn").style.display="none"; $("timerNote").textContent=""; }

let pauseBtnMode=false;
export function initTimer(){
  renderPresets();
  $("timerStartBtn").addEventListener("click",()=>{ sfx.click(); start(); });
  $("timerResetBtn").addEventListener("click",()=>{ sfx.click(); reset(); });
  $("timerPauseBtn").addEventListener("click",()=>{ sfx.click(); paused ? resume() : pause(); });
  paint();
}
window.addEventListener("ff:lang",()=>{ renderPresets(); paint(); });