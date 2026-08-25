/* 呼吸/正念 — 3-4-7 / 4-4-4 / 4-7-8 引导，语音与动画跟随。助眠友好。 */
import { t } from "../i18n.js";
import { store } from "../state.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";

const MODES=[
  {id:"calm", ki:"b_calm", in:4, hold:4, out:4},
  {id:"deep", ki:"b_deep", in:4, hold:7, out:8},
  {id:"night",ki:"b_sleepy", in:3, hold:4, out:7},
];
const $=id=>document.getElementById(id);
let running=false, mode=MODES[0], cycles=0, phaseTimer=null, countIv=null;

function renderModes(){
  $("breatheModes").innerHTML=MODES.map(m=>`<button class="mode-btn ${m.id===mode.id?'active':''}" data-id="${m.id}">${t(m.ki)}</button>`).join("");
  $("breatheModes").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    if(running) return; sfx.click();
    mode=MODES.find(m=>m.id===b.dataset.id)||mode;
    renderModes();
    voice.say(t(mode.ki));
  }));
}
function setOrb(scale, sec){
  const orb=$("orb");
  orb.style.transition=`transform ${sec}s cubic-bezier(.45,0,.55,1)`;
  orb.style.transform=`scale(${scale})`;
}
function countdown(n){
  $("orbText").textContent=n;
  clearInterval(countIv);
  countIv=setInterval(()=>{ if(!running) return; n--; if(n<=0){n=0;} $("orbText").textContent=Math.max(0,n); },1000);
}
function phase(label, sec, scale, done, vtext){
  $("breatheStep").textContent=label; voice.say(vtext||label, {rate:0.70, pitch:1.4}); countdown(sec);
  setOrb(scale, sec);
  phaseTimer=setTimeout(done, sec*1000);
}
function cycle(){
  if(!running) return;
  cycles++;
  phase(t("b_in"), mode.in, 1, ()=>phase(t("b_hold"), mode.hold, 1, ()=>phase(t("b_out"), mode.out, 0.55, ()=>cycle()), t("b_vhold")) , t("b_vin"));
}
function start(){
  if(running) return;
  running=true; cycles=0;
  $("breatheStartBtn").style.display="none";
  $("breatheStopBtn").style.display="inline-block";
  $("breatheNote").textContent="";
  sfx.correct(); voice.say(t("b_vstart"), {rate:0.7, pitch:1.4});
  phase(t("b_in"), mode.in, 1, ()=>phase(t("b_hold"), mode.hold, 1, ()=>phase(t("b_out"), mode.out, 0.55, ()=>cycle()), t("b_vhold")), t("b_vin"));
}
function stop(){
  if(!running) return;
  running=false;
  clearTimeout(phaseTimer); clearInterval(countIv);
  $("breatheStopBtn").style.display="none";
  $("breatheStartBtn").style.display="inline-block";
  $("breatheStep").textContent="";
  $("orbText").textContent="4";
  setOrb(1, .4);
  store.record("breathe", {level:1, score:Math.max(1,cycles), ms:Math.round(cycles*(mode.in+mode.hold+mode.out)*1000)});
  $("breatheNote").textContent=t("b_done",{n:cycles});
  sfx.done();
}
export function initBreathe(){
  renderModes();
  $("breatheStartBtn").addEventListener("click",()=>{ sfx.click(); start(); });
  $("breatheStopBtn").addEventListener("click",()=>{ sfx.click(); stop(); });
}
window.addEventListener("ff:lang", renderModes);