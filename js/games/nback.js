/* N-back — 双通道(位置+字母)工作记忆训练。难度=回溯步数 N。
   声音开：每回合朗读一个字母，字母流独立计分（双通道 dual n-back）。
   声音关：纯位置单通道。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";
import { store } from "../state.js";

const COLS=3, STIM_MS=750, WINDOW_MS=3000;
const LETTERS=["C","H","K","L","Q","R","S","T"];  // 易分辨、不与数字混淆

function buildSeq(N, trials){
  const pos=new Array(trials), letIdx=new Array(trials);
  for(let i=0;i<trials;i++){ pos[i]=Math.floor(Math.random()*9); letIdx[i]=Math.floor(Math.random()*LETTERS.length); }
  for(let k=0;k<Math.round(trials*0.33);k++){
    const i=N+Math.floor(Math.random()*(trials-N));
    if(k%2===0) pos[i]=pos[i-N]; else letIdx[i]=letIdx[i-N];   // 一半位置匹配一半字母匹配
  }
  return {pos, letIdx};
}

export const nback = {
  id:"nback", min:1, max:6, nameKey:"n_t", descKey:"n_d", howKey:"how_nback",
  start(host, {level, end}){
    const N=level, trials=18+N*4;
    const seq=buildSeq(N, trials);
    const dual=store.getPref("nbackCue", false);   // 🔊 = 双通道(带字母语音)
    const $=c=>host.querySelector(c);
    host.innerHTML=`
      <div class="hud" style="margin-bottom:18px">
        <span>N=<b>${N}</b>${dual?" · 🔤":""}</span>
        <span data-c="hits">🎯<b>0</b></span>
        <span data-c="miss">漏<b>0</b></span>
        <span data-c="fa">误<b>0</b></span>
        <span data-c="acc">准<b>—</b></span>
        ${dual?`<span data-c="lacc">🔤<b>—</b></span>`:""}
        <span data-c="prog" style="min-width:90px;justify-content:center">1/${trials}</span>
        <span id="cueBtn" title="${t("nb_cue")}" style="cursor:pointer;user-select:none">${dual?"🔊":"🔇"}</span>
      </div>
      <div class="nb-grid" style="grid-template-columns:repeat(${COLS},1fr);width:min(74vw,300px)">
        ${Array(COLS*COLS).fill(`<div class="nb-cell"></div>`).join("")}
      </div>
      <div class="nb-center" data-c="turn" style="text-align:center;color:var(--muted);padding:10px 0 4px">${t("nb_turn",{n:1})}</div>
      <div class="play-controls">
        <button class="btn primary big match-btn" style="flex:1;min-width:120px">🟰 ${t("nb_tap")}</button>
        ${dual?`<button class="btn big letter-btn" style="flex:1;min-width:120px;background:var(--bg3)">🔤 ${t("nb_letter")}</button>`:""}
      </div>`;
    const cells=[...host.querySelectorAll(".nb-cell")];
    const matchBtn=host.querySelector(".match-btn");
    const letterBtn=host.querySelector(".letter-btn");

    let hits=0,miss=0,fa=0, lHits=0,lMiss=0,lFa=0;
    let responded=false, letterResponded=false, running=true;
    let idx=0;
    const t0=performance.now(), timeouts=[];
    const later=(fn,ms)=>{ const id=setTimeout(fn,ms); timeouts.push(id); return id; };
    const clear=()=>timeouts.forEach(clearTimeout);
    const isTarget=i=> i>=N && seq.pos[i]===seq.pos[i-N];
    const isLetterTarget=i=> i>=N && seq.letIdx[i]===seq.letIdx[i-N];
    const acc=()=>{ const r=hits+fa; return r? Math.round(100*hits/r) : (fa?0:100); };
    const lAcc=()=>{ const r=lHits+lFa; return r? Math.round(100*lHits/r) : (lFa?0:100); };
    const setHud=()=>{
      $('[data-c="hits"] b').textContent=hits;
      $('[data-c="miss"] b').textContent=miss;
      $('[data-c="fa"] b').textContent=fa;
      $('[data-c="acc"] b').textContent=acc()+"%";
      const la=$('[data-c="lacc"] b'); if(la) la.textContent=lAcc()+"%";
    };

    function finish(){
      clear(); running=false;
      const a=acc(), la=dual? lAcc():100;
      const score=Math.max(0, hits*10 + (dual?lHits*10:0) - fa*8 - (dual?lFa*8:0) + (a>=60&&la>=60?30:0));
      end({level:N, score, pass: a>=55 && la>=55 && hits>=1,
        ms:performance.now()-t0,
        summary: dual?{hits,miss,fa,posAcc:a,letterHits:lHits,letterMiss:lMiss,letterFa:lFa,letterAcc:la}
                     :{hits,miss,fa,acc:a}});
    }
    function present(i){
      if(!running) return; if(i>=trials) return finish();
      idx=i; responded=false; letterResponded=false;
      $('[data-c="turn"]').textContent = t("nb_turn",{n:i+1});
      $('[data-c="prog"]').textContent = `${i+1}/${trials}`;
      cells[seq.pos[i]].classList.add("lit");
      if(dual) voice.say(LETTERS[seq.letIdx[i]], {rate:1.0});
      later(()=>cells[seq.pos[i]].classList.remove("lit"), STIM_MS);
      later(()=>{
        if(!running) return;
        // position stream
        if(isTarget(i)){ responded?hits++:miss++; responded&&sfx.correct(); }
        else{ responded?fa++:0; responded&&sfx.wrong(); }
        // letter stream
        if(dual){
          if(isLetterTarget(i)){ letterResponded?lHits++:lMiss++; }
          else{ letterResponded?lFa++:0; }
        }
        setHud();
        present(i+1);
      }, WINDOW_MS);
    }
    matchBtn.addEventListener("click", ()=>{
      if(!running||responded) return;
      responded=true;
      matchBtn.style.transform="scale(.96)"; later(()=>matchBtn.style.transform="",110);
    });
    if(letterBtn) letterBtn.addEventListener("click", ()=>{
      if(!running||letterResponded) return;
      letterResponded=true;
      letterBtn.style.transform="scale(.96)"; later(()=>letterBtn.style.transform="",110);
    });
    const kb=e=>{
      if(e.code==="Space"||e.code==="KeyJ"){ e.preventDefault(); matchBtn.click(); }
      if(e.code==="KeyK"&&letterBtn){ e.preventDefault(); letterBtn.click(); }
    };
    const cueBtn=host.querySelector("#cueBtn");
    cueBtn.addEventListener("click", ()=>{ sfx.click(); location.reload(); });
    window.addEventListener("keydown", kb);

    later(()=>present(0), 800);
    voice.say(`${t("n_t")} N = ${N}${dual?" "+t("nb_dual_on"):t("nb_dual_off")}`);

    return { abort(){ running=false; clear(); window.removeEventListener("keydown",kb); } };
  }
};