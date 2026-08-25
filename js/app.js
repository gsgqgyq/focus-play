/* FocusPlay — 主程序：导航 / 首页 / 游戏列表与关卡 / 结果 / 数据 / 同步 / 主题 */
import { applyI18n, t, lang, setLang } from "./i18n.js";
import { store, setSyncCode } from "./state.js";
import { sfx } from "./audio.js";
import { voice } from "./voice.js";
import { nback } from "./games/nback.js";
import { schulte } from "./games/schulte.js";
import { stroop } from "./games/stroop.js";
import { gonogo } from "./games/gonogo.js";
import { initTimer } from "./modules/timer.js";
import { initBreathe } from "./modules/breathe.js";

const GAMES=[nback, schulte, stroop, gonogo];
const ICON={nback:"🧠", schulte:"🔢", stroop:"🎨", gonogo:"🛑"};
const $=id=>document.getElementById(id);

let view="home", curGame=null, curLevel=1, curAbort=null;

/* ---------- nav ---------- */
function show(v){
  if(curGame){ try{ curAbort&&curAbort(); }catch(e){} curAbort=null; }
  view=v;
  document.querySelectorAll(".view").forEach(s=>s.classList.toggle("active", s.id==="view-"+v));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.nav===v));
  if(v==="home") renderHome(); if(v==="games") renderGames(); if(v==="stats") renderStats();
  if(v==="play") paintLevelStrip();
  window.scrollTo({top:0});
}
document.querySelectorAll("[data-nav]").forEach(el=>el.addEventListener("click",()=>{ sfx.click(); show(el.dataset.nav); }));

/* ---------- toast ---------- */
function toast(msg){
  let el=$("toast"); if(!el){ el=document.createElement("div"); el.id="toast"; el.className="toast"; document.body.appendChild(el); }
  el.textContent=msg; el.classList.add("show");
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove("show"),2600);
}

/* ---------- home ---------- */
function renderHome(){
  const pad=n=>String(n).padStart(2,"0");
  const ms=store.focus.perDay[today()]||0;
  $("todayMs").textContent= ms>=3600000? (ms/3600000).toFixed(1)+"h" : Math.round(ms/60000)+"m";
  $("streakNum").textContent=store.streak()+"d";
  $("totalSessions").textContent=store.focus.sessions;
  renderSyncCard();
}
const today=()=>{ const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

function renderSyncCard(){
  const configured=!!(window.FOCUSPLAY_CONFIG||{}).syncUrl;
  // auto-bind via ?code= link (one-tap sync from another device)
  const urlCode=new URLSearchParams(location.search).get("code");
  if(urlCode && !store.getPref("syncCode","")){
    store.setPref("syncCode", urlCode);
    store.sync().then(ok=>toast(ok?t("sync_ok"):t("sync_err")));
  }
  // hidden by default: only show to the owner (code set or being set). Others never see it.
  if(!store.getPref("syncCode","") && !urlCode){
    $("syncCard").innerHTML=""; return;
  }
  const box=$("syncCard");
  box.innerHTML=`<div class="sync-box">
    <h3>🔄 ${t("sync_title")}</h3><p>${t("sync_desc")}</p>
    <div class="sync-row">
      <input class="hint-input" id="syncInput" placeholder="${t("sync_placeholder")}" value="${store.getPref("syncCode","")}">
      <button class="btn" id="syncSave">${t("sync_save")}</button>
      ${configured?`<button class="btn" id="syncLink">🔗 ${t("sync_link")}</button>`:""}
    </div>
    <div class="sync-status ${configured?'':'nd'}" id="syncStatus">${configured?"—":t("sync_nd")}</div>
  </div>`;
  $("syncSave").addEventListener("click", async ()=>{
    sfx.click();
    const code=$("syncInput").value.trim();
    const r=await setSyncCode(code);
    const st=$("syncStatus");
    if(!r.configured){ st.className="sync-status nd"; st.textContent=t("sync_nd"); toast(t("sync_nd")); }
    else if(code && r.ok){ st.className="sync-status ok"; st.textContent=t("sync_ok"); toast(t("sync_ok")); renderHome(); }
    else { st.className="sync-status err"; st.textContent=t("sync_err"); toast(t("sync_err")); }
  });
  const linkBtn=$("syncLink");
  if(linkBtn) linkBtn.addEventListener("click", async ()=>{
    const code=store.getPref("syncCode","");
    if(!code){ toast(t("sync_placeholder")); return; }
    const link=`https://focusplay.516278.xyz/?code=${encodeURIComponent(code)}`;
    try{ await navigator.clipboard.writeText(link); toast("✓ "+t("sync_copied")); }
    catch(e){ prompt(t("sync_link"), link); }
  });
}

/* ---------- games list ---------- */
function passedSet(r){ const s=new Set(); (r?r.history:[]).forEach(h=>{ if(h.pass) s.add(h.lvl); }); return s; }
function unlockedLvl(game, r){
  let m=0; passedSet(r).forEach(l=>m=Math.max(m,l));
  return Math.min(game.max, Math.max(1, m+1));
}
function renderGames(){
  const grid=$("gamesGrid");
  grid.innerHTML=GAMES.map(g=>{
    const r=store.records[g.id];
    const passed=passedSet(r).size, uni=unlockedLvl(g,r), done=uni>g.max-1;
    const bestLvl=r?r.bestLevel:1;
    return `<article class="card link-card" data-game="${g.id}">
      <div class="card-icon">${ICON[g.id]}</div>
      <h2>${t(g.nameKey)}</h2>
      <p>${t(g.descKey)}</p>
      <div class="progress-bar"><i style="width:${(done?100:(uni/g.max)*100)}%"></i></div>
      <div class="card-meta"><span>${t("level")} ${Math.min(uni,g.max)}/${g.max}</span><span>${done?t("done_all"):t("best")+" "+bestLvl}</span></div>
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-game]").forEach(c=>c.addEventListener("click",()=>{
    sfx.click();
    const g=GAMES.find(x=>x.id===c.dataset.game);
    openPlay(g, unlockedLvl(g, store.records[g.id]));
  }));
}

/* ---------- play shell ---------- */
function openPlay(game, level){
  curGame=game; show("play");
  $("playTitle").textContent=t(game.nameKey);
  curLevel=Math.min(level, game.max);
  paintLevelStrip(); startLevel(game, curLevel);
}
function levelLabel(game,l){ return game.id==="nback" ? "N"+l : l; }
function paintLevelStrip(){
  if(!curGame) return; const g=curGame, r=store.records[g.id], passed=new Set(); (r?r.history:[]).forEach(h=>{if(h.pass)passed.add(h.lvl);});
  const badge = g.id==="nback" ? `N=${curLevel}` : `${t("level")} ${curLevel}`;
  $("playLevelBadge").textContent=badge;
  $("playLevels").innerHTML=Array.from({length:g.max},(_,i)=>i+1).map(l=>{
    const cls = l===curLevel?"cur": passed.has(l)?"done": l<unlockedLvl(g,r)+1?"unlocked":"locked";
    return `<button class="lvl-dot ${cls}" data-l="${l}" title="${g.id==='nback'?'N='+l:t('level')+' '+l}">${levelLabel(g,l)}</button>`;
  }).join("");
  $("playLevels").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    const l=+b.dataset.l; if(!l) return;
    if(l>unlockedLvl(g,r)){ toast(t("locked")); return; }
    sfx.click(); curLevel=l; paintLevelStrip(); startLevel(g,l);
  }));
}
function startLevel(game, level){
  if(curAbort){ try{curAbort();}catch(e){} curAbort=null; }
  curLevel=level; curGame=game;
  const host=$("playHost"); host.innerHTML="";
  $("playControls").innerHTML="";
  // intro: 玩法说明 + 开始按钮
  host.innerHTML=`<div class="card" style="max-width:440px;width:100%;text-align:left">
    <h3 style="font-size:1.05rem">${ICON[game.id]} ${t(game.nameKey)}
      <span class="lvl-badge" style="margin-left:8px">${game.id==="nback"?`N=${level}`:`L${level}`}</span></h3>
    <p style="color:var(--muted);font-size:.92rem;margin:12px 0 16px;line-height:1.7">${t(game.howKey)}</p>
    <button class="btn primary big" id="introGo">▶ ${t("start")}</button>
  </div>`;
  document.getElementById("introGo").addEventListener("click",()=>{
    sfx.click();
    host.innerHTML="";
    curAbort=game.start(host, {level, end: entry=>onEnd(game,entry,level)});
  });
}
function onEnd(game, entry, level){
  store.record(game.id, {level, score:entry.score, ms:entry.ms, pass:entry.pass});
  if(entry.pass){ sfx.levelup(); } else { sfx.done(); }
  const r=store.records[game.id];
  const passed=passedSet(r); const uni=unlockedLvl(game,r);
  const allDone=uni>game.max-1 && passed.has(game.max);
  // result panel
  const sum=entry.summary? Object.entries(entry.summary).map(([k,v])=>`<span>${k}: <b>${v}</b></span>`).join(""):"";
  $("playHost").innerHTML=`<div class="card" style="text-align:center;max-width:360px;width:100%">
    <div style="font-size:2rem">${entry.pass?"🎉":"💪"}</div>
    <h2 style="margin:4px 0">${entry.pass? t("s_great") : t("s_oops")}</h2>
    <div class="hud" style="margin-top:8px"><span>${t("nb_score")} <b>${entry.score}</b></span><span>${t("level")} ${level}</span></div>
    ${sum?`<div class="hud" style="margin-top:6px;font-size:.85rem">${sum}</div>`:""}
    <div class="play-controls" style="margin-top:14px">
      <button class="btn" data-r="retry">${t("retry")}</button>
      ${(entry.pass&&!allDone)?`<button class="btn primary" data-r="next">${t("next")} →</button>`:""}
      ${allDone?`<button class="btn primary" data-r="next">${t("done_all")}</button>`:""}
    </div>
  </div>`;
  $("playControls").innerHTML="";
  const host=$("playHost");
  host.querySelectorAll("[data-r]").forEach(b=>b.addEventListener("click",()=>{
    sfx.click();
    const act=b.dataset.r;
    if(act==="next"){ const nl=entry.pass? Math.min(level+1, game.max):level; curLevel=nl; openPlay(game, nl); }
    else startLevel(game, level);
  }));
  paintLevelStrip();
}

/* ---------- stats ---------- */
function renderStats(){
  const ms=store.focus.totalMs;
  const min=Math.round(ms/60000);
  const todayMs=store.focus.perDay[today()]||0;
  $("statsTotal").innerHTML=`
    <div class="big-chip"><b>${Math.floor(min/60)}h ${min%60}m</b><span>${t("st_total")}</span></div>
    <div class="big-chip"><b>${Math.round(todayMs/60000)}</b><span>${t("st_today")}(min)</span></div>
    <div class="big-chip"><b>${store.streak()}</b><span>${t("st_streak")}</span></div>
    <div class="big-chip"><b>${store.focus.sessions}</b><span>${t("st_sessionsN")}</span></div>`;
  let rows=GAMES.map(g=>{
    const r=store.records[g.id];
    const recent=(r?r.history:[]).slice(-18).map(h=>`<span title="${h.pass?'✓':'✗'}">L${h.lvl}·${h.score}</span>`).join("");
    return `<div class="panel"><h3>${ICON[g.id]} ${t(g.nameKey)} <small>${t("best")} L${r?r.bestLevel:1} · ${r?r.sessions:0}次</small></h3>
      ${recent?`<div class="recent">${recent}</div>`:`<p style="color:var(--muted);font-size:.85rem">—</p>`}</div>`;
  }).join("");
  rows+=`<div class="panel"><h3>🌿 ${t("card_breathe_t")} <small>${t("st_sessionsN")}: ${store.records.breathe?store.records.breathe.sessions:0}</small></h3>
    ${store.records.breathe?`<div class="recent">${store.records.breathe.history.slice(-18).map(h=>`<span>${h.score}cyc</span>`).join("")}</div>`:`<p style="color:var(--muted);font-size:.85rem">—</p>`}</div>`;
  $("statsBreakdown").innerHTML=rows;
  // render "today focus" etc must refresh on return to home too
}

/* ---------- theme / lang / music / voice toggles ---------- */
function applyTheme(){
  const th=store.getPref("theme", "system");
  const dark= th==="dark" || (th==="system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark?"dark":"light");
  $("themeBtn").textContent= dark? "☀️" : "🌙";
}
$("themeBtn").addEventListener("click",()=>{
  const th=store.getPref("theme","system");
  const next= th==="system"? (matchMedia("(prefers-color-scheme: dark)").matches?"light":"dark") : (th==="dark"?"light":"dark");
  store.setPref("theme", next); applyTheme();
});
$("langBtn").addEventListener("click",()=>{ setLang(lang==="zh"?"en":"zh"); sfx.click(); });
$("voiceBtn").addEventListener("click",()=>{ const on=voice.toggle(); $("voiceBtn").classList.toggle("on",on); if(on) voice.say(t("voice")); });

function paintPrefs(){
  $("voiceBtn").classList.toggle("on", voice.isOn());
  applyTheme();
}

/* ---------- init ---------- */
document.addEventListener("keydown", e=>{ if(e.code==="Escape" && curGame && view==="play"){ show("games"); } });
window.addEventListener("ff:lang", ()=>{ if(view==="home")renderHome(); if(view==="games")renderGames(); if(view==="play"){ $("playTitle").textContent=t(curGame.nameKey); paintLevelStrip(); } if(view==="stats")renderStats(); });

initTimer(); initBreathe();
applyI18n();
paintPrefs();
show("home");
// warm voices list
if("speechSynthesis" in window) speechSynthesis.getVoices();