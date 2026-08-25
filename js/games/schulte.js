/* 舒尔特方格 — 按顺序点击 1..N，训练视觉搜索。难度=格数+时间目标。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";

const SIZES=[3,3,4,4,4,5,5,5,6];

export const schulte = {
  id:"schulte", min:1, max:9, nameKey:"s_t", descKey:"s_d", howKey:"how_schulte",
  start(host,{level,end}){
    const size=SIZES[Math.min(level,9)-1], total=size*size;
    const timeTarget=total*1.6;
    const nums=Array.from({length:total},(_,k)=>k+1);
    for(let i=nums.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [nums[i],nums[j]]=[nums[j],nums[i]]; }
    host.innerHTML=`
      <div class="hud" style="margin-bottom:14px">
        <span>${t("s_cur")}：<b data-c="cur">1</b></span>
        <span>⏱<b data-c="time">0.0s</b></span>
        <span data-c="err">错<b>0</b></span>
      </div>
      <div class="schulte-table" style="grid-template-columns:repeat(${size},1fr)">
        ${nums.map((n,ix)=>`<button class="st-cell" data-i="${ix}" data-n="${n}">${n}</button>`).join("")}
      </div>`;
    const $=c=>host.querySelector(c);
    let next=1, errs=0, running=true;
    const t0=performance.now();
    const sT=setInterval(()=>{ if(running) $('[data-c="time"]').textContent=((performance.now()-t0)/1000).toFixed(1)+"s"; },100);
    const tmr=()=>performance.now()-t0;

    host.addEventListener("click", e=>{
      const btn=e.target.closest(".st-cell"); if(!btn||!running) return;
      const n=+btn.dataset.n;
      if(n===next){
        sfx.correct();
        btn.classList.add("done"); btn.disabled=true;
        next++;
        $('[data-c="cur"]').textContent=next<=total?next:"✓";
        if(next>total){
          running=false; clearInterval(sT);
          const sec=tmr()/1000;
          const score=Math.max(0, Math.round((timeTarget-sec)*10)) + size*10;
          end({level, score, pass: sec<=timeTarget*1.6, ms:tmr(), summary:{size,sec,errs}});
        }
      } else {
        errs++; sfx.wrong();
        btn.classList.add("wrong"); setTimeout(()=>btn.classList.remove("wrong"),220);
        $('[data-c="err"]').textContent=errs;
      }
    });
    voice.say(t("s_t"));
    return { abort(){ running=false; clearInterval(sT); } };
  }
};