/* Go/No-Go — 对 GO 反应、对 NO-GO 忍住。训练冲动控制。难度=反应窗口缩短。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";

export const gonogo = {
  id:"gonogo", min:1, max:8, nameKey:"g_t", descKey:"g_d", howKey:"how_gonogo",
  start(host,{level,end}){
    const trials=16+level*2;
    const holdMs=Math.max(820, 1800-level*110);
    const ISI=320, firstDelay=900;
    // ~78% GO
    const kinds=Array.from({length:trials},(_,i)=> Math.random()<0.78?1:0);
    // mix it: exactly 25% no-go for stability
    const noGo=Math.max(2,Math.round(trials*0.22));
    for(let k=0;k<noGo;k++) kinds[k]=0;
    for(let i=trials-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [kinds[i],kinds[j]]=[kinds[j],kinds[i]]; }

    host.innerHTML=`
      <div class="hud" style="margin-bottom:14px">
        <span>GO<b data-c="hit">0</b></span><span>漏<b data-c="miss">0</b></span><span>误触<b data-c="fa">0</b></span>
      </div>
      <div class="gg-field" data-c="field">GO</div>
      <p style="color:var(--muted);font-size:.85rem;text-align:center;margin-top:14px">
        🏓 ${t("g_prompt")}
      </p>`;
    const $=c=>host.querySelector(c);
    const field=$('[data-c="field"]');

    let idx=0, hit=0, miss=0, fa=0, running=true, active=false, responded=false;
    const t0=performance.now(), timeouts=[];
    const later=(fn,ms)=>{ const id=setTimeout(fn,ms); timeouts.push(id); return id; };
    const clear=()=>timeouts.forEach(clearTimeout);

    function respond(){
      if(!running||!active||responded) return false;
      responded=true;
      if(kinds[idx]===1){ hit++; sfx.correct(); }
      else { fa++; sfx.wrong(); }
      return true;
    }
    function trial(){
      if(!running) return; if(idx>=trials) return finish();
      const isGo=kinds[idx]===1;
      active=true; responded=false;
      field.style.visibility="visible";
      field.classList.add("showing");
      if(isGo){ field.textContent=t("g_go"); field.className="gg-field gogo"; sfx.go(); }
      else { field.textContent=t("g_stop"); field.className="gg-field stop"; sfx.nogo(); }
      later(()=>{ field.classList.remove("showing"); },100);
      later(()=>{
        if(!running) return;
        if(!responded && isGo) miss++;
        active=false; field.style.visibility="hidden";
        idx++;
        later(()=>trial(), ISI);
      }, holdMs);
    }
    function update(){ $('[data-c="hit"]').textContent=" "+hit+" "; $('[data-c="miss"]').textContent=" "+miss+" "; $('[data-c="fa"]').textContent=" "+fa+" "; }
    function finish(){
      clear(); running=false;
      const hitRate=hit/(hit+miss||1);
      const faRate=fa/ (Math.max(1, kinds.reduce((a,b)=>a+(b===0?1:0),0)) ) ;
      const score=Math.max(0, hit*10 - fa*10);
      end({level, score, pass: hitRate>=0.6 && faRate<=0.4, ms:performance.now()-t0,
        summary:{hit,miss,fa, hitRate:Math.round(hitRate*100), faRate:Math.round(faRate*100)}});
    }
    // input: key + tapping field + big GO button not needed (tap field)
    const kb=e=>{ if(e.code==="Space"||e.code==="KeyJ"){ e.preventDefault(); respond(); update(); } };
    field.addEventListener("mousedown", e=>{ e.preventDefault(); respond(); update(); });
    field.addEventListener("touchstart", e=>{ e.preventDefault(); respond(); update(); }, {passive:false});
    window.addEventListener("keydown", kb);

    const upd=setInterval(update, 300);
    update();
    later(()=>{ update(); trial(); }, firstDelay);
    voice.say(`${t("g_t")}: ${t("g_prompt")}`);
    return { abort(){ running=false; clear(); clearInterval(upd); window.removeEventListener("keydown",kb); } };
  }
};