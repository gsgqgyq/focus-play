/* N-back — 单通道(位置)工作记忆训练。难度=回溯步数 N。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";
import { store } from "../state.js";

const COLS=3, STIM_MS=750, WINDOW_MS=3000;

function buildSeq(N, trials){
  const pos=new Array(trials);
  for(let i=0;i<trials;i++) pos[i]=Math.floor(Math.random()*9);
  for(let k=0;k<Math.round(trials*0.33);k++){
    const i=N+Math.floor(Math.random()*(trials-N));
    pos[i]=pos[i-N];  // force targets
  }
  return pos;
}

export const nback = {
  id:"nback", min:1, max:6, nameKey:"n_t", descKey:"n_d", howKey:"how_nback",
  start(host, {level, end}){
    const N=level, trials=18+N*4;
    const pos=buildSeq(N, trials);
    let cueOn=store.getPref("nbackCue", false);
    const $=c=>host.querySelector(c);
    host.innerHTML=`
      <div class="hud" style="margin-bottom:18px">
        <span>N=<b>${N}</b></span>
        <span data-c="hits">🎯<b>0</b></span>
        <span data-c="miss">漏<b>0</b></span>
        <span data-c="fa">误<b>0</b></span>
        <span data-c="acc">准<b>—</b></span>
        <span data-c="prog" style="min-width:90px;justify-content:center">1/${trials}</span>
        <span id="cueBtn" title="提示音" style="cursor:pointer;user-select:none">${cueOn?"🔊":"🔇"}</span>
      </div>
      <div class="nb-grid" style="grid-template-columns:repeat(${COLS},1fr);width:min(74vw,300px)">
        ${Array(COLS*COLS).fill(`<div class="nb-cell"></div>`).join("")}
      </div>
      <div class="nb-center" data-c="turn" style="text-align:center;color:var(--muted);padding:10px 0 4px">${t("nb_turn",{n:1})}</div>
      <div class="play-controls">
        <button class="btn primary big match-btn" style="width:min(90vw,260px)">🟰 ${t("nb_tap")}</button>
      </div>`;
    const cells=[...host.querySelectorAll(".nb-cell")];
    const matchBtn=host.querySelector(".match-btn");

    let i=0,hits=0,miss=0,fa=0, responded=false, running=true;
    const t0=performance.now(), timeouts=[];
    const later=(fn,ms)=>{ const id=setTimeout(fn,ms); timeouts.push(id); return id; };
    const clear=()=>timeouts.forEach(clearTimeout);
    const isTarget=idx=> idx>=N && pos[idx]===pos[idx-N];
    const accuracy=()=>{ const r=hits+fa; return r? Math.round(100*hits/r) : (fa?0:100); };
    const setHud=()=>{
      $('[data-c="hits"] b').textContent=hits;
      $('[data-c="miss"] b').textContent=miss;
      $('[data-c="fa"] b').textContent=fa;
      $('[data-c="acc"] b').textContent=accuracy()+"%";
    };

    function finish(){
      clear(); running=false;
      const acc=accuracy();
      const score=Math.max(0, hits*10 - fa*8 + (acc>=60?30:0));
      end({level:N, score, pass: acc>=55 && hits>=1, ms:performance.now()-t0, summary:{hits,miss,fa,acc}});
    }
    function present(idx){
      if(!running) return; if(idx>=trials) return finish();
      responded=false;
      $('[data-c="turn"]').textContent = t("nb_turn",{n:idx+1});
      $('[data-c="prog"]').textContent = `${idx+1}/${trials}`;
      if(cueOn) sfx.go();
      cells[pos[idx]].classList.add("lit");
      later(()=>cells[pos[idx]].classList.remove("lit"), STIM_MS);
      later(()=>{
        if(!running) return;
        if(isTarget(idx)){ responded?hits++:miss++; responded&&sfx.correct(); }
        else{ responded?fa++:0; responded&&sfx.wrong(); }
        setHud();
        present(idx+1);
      }, WINDOW_MS);
    }
    matchBtn.addEventListener("click", ()=>{
      if(!running||responded) return;
      responded=true;
      matchBtn.style.transform="scale(.96)"; later(()=>matchBtn.style.transform="",110);
    });
    const kb=e=>{ if(e.code==="Space"||e.code==="KeyJ"){ e.preventDefault(); matchBtn.click(); } };
    const cueBtn=host.querySelector("#cueBtn");
    cueBtn.addEventListener("click", ()=>{ sfx.click(); cueOn=!cueOn; store.setPref("nbackCue", cueOn); cueBtn.textContent=cueOn?"🔊":"🔇"; });
    window.addEventListener("keydown", kb);

    later(()=>present(0), 800);
    voice.say(`${t("n_t")} N = ${N}`);

    return { abort(){ running=false; clear(); window.removeEventListener("keydown",kb); } };
  }
};