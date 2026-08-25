/* Stroop — 字义与墨色冲突，选【字的颜色】。训练抑制控制。难度=数+限时。 */
import { t, lang } from "../i18n.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";

const COLORS=[{hex:"#e74c3c",zh:"红",en:"RED"},{hex:"#2ecc71",zh:"绿",en:"GREEN"},
  {hex:"#3498db",zh:"蓝",en:"BLUE"},{hex:"#f1c40f",zh:"黄",en:"YELLOW"}];

export const stroop = {
  id:"stroop", min:1, max:8, nameKey:"c_t", descKey:"c_d", howKey:"how_stroop",
  start(host,{level,end}){
    const trials=10+level*2;
    const windowMs=Math.max(900, 2600-level*200);
    host.innerHTML=`
      <div class="hud" style="margin-bottom:6px">
        <span>${t("c_pick")}</span><span>✓<b data-c="ok">0</b></span><span>✗<b data-c="bad">0</b></span>
        <span>${t("nb_turn",{n:"<b data-c='left'>"+trials+"</b>"})}</span>
      </div>
      <div class="stroop-word" data-c="word">RED</div>
      <div class="stroop-opts" data-c="opts"></div>`;
    const $=c=>host.querySelector(c);
    const optsBox=$('[data-c="opts"]');
    optsBox.innerHTML=COLORS.map(c=>`<button class="evt-btn" data-hex="${c.hex}" style="background:${c.hex};color:#fff">${c.zh}</button>`).join("");

    let idx=0, ok=0, bad=0, running=true, armed=null;
    const t0=performance.now();

    function next(){
      if(!running) return; if(idx>=trials) return finish();
      const word=COLORS[Math.floor(Math.random()*COLORS.length)];
      // ink differs from meaning ~80% of time (conflict emphasis)
      let ink=word; while(ink.hex===word.hex && Math.random()<0.8) ink=COLORS[Math.floor(Math.random()*COLORS.length)];
      const label = lang==="zh"? word.zh : word.en;
      $('[data-c="word"]').textContent=label;
      $('[data-c="word"]').style.color=ink.hex;
      $('[data-c="left"]').textContent=trials-idx;
      const answer=ink.hex;
      optsBox._answer=answer;
      clearTimeout(armed);
      armed=setTimeout(()=>{ if(!running)return; bad++; sfx.wrong(); idx++; update(); next(); }, windowMs);
    }
    function update(){ $('[data-c="ok"]').textContent=ok; $('[data-c="bad"]').textContent=bad; }
    function finish(){
      const acc= Math.round(100*ok/(ok+bad||1));
      const score=Math.max(0, ok*10 - bad*5);
      end({level, score, pass: ok>=Math.max(1,Math.ceil(trials*0.5)), ms:performance.now()-t0, summary:{ok,bad,acc}});
    }
    optsBox.addEventListener("click", e=>{
      const b=e.target.closest("button"); if(!b||!running) return;
      if(b.dataset.hex===optsBox._answer){ ok++; sfx.correct(); }
      else{ bad++; sfx.wrong(); }
      idx++; update(); next();
    });
    next();
    voice.say(`${t("c_t")}: ${t("c_pick")}`);
    return { abort(){ running=false; clearTimeout(armed); } };
  }
};