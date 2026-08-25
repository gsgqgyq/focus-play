/* state — 本地存储(LocalStorage) + Cloudflare Worker/D1 跨端同步。同步失败自动降级为纯本地。 */

const CFG = () => window.FOCUSPLAY_CONFIG || {};
const LS = {
  records: "ff.records",   // per-game summaries
  focus:   "ff.focus",     // aggregate focus time
  prefs:   "ff.prefs",     // theme/music/voice/syncCode
};
const todayKey = () => { const d=new Date(); const p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

const store = {
  records: JSON.parse(localStorage.getItem(LS.records)||"{}"),
  focus:   JSON.parse(localStorage.getItem(LS.focus)||'{"totalMs":0,"sessions":0,"perDay":{}}'),
  prefs:   JSON.parse(localStorage.getItem(LS.prefs)||"{}"),
  _persist(){ localStorage.setItem(LS.records, JSON.stringify(this.records));
    localStorage.setItem(LS.focus, JSON.stringify(this.focus));
    localStorage.setItem(LS.prefs, JSON.stringify(this.prefs)); },

  getPref(k,d){ return k in this.prefs ? this.prefs[k] : d; },
  setPref(k,v){ this.prefs[k]=v; this._persist(); window.dispatchEvent(new CustomEvent("ff:prefs")); },

  /* record a game session */
  record(gameId, {level, score, ms, pass}){
    const r = this.records[gameId] ||= {bestScore:0,bestLevel:1,sessions:0,totalMs:0,history:[]};
    r.sessions++; r.totalMs += ms; r.history.push({lvl:level,score,pass:!!pass,ts:Date.now()});
    if (r.history.length>240) r.history.shift();
    if (score>r.bestScore) r.bestScore=score;
    if (pass && level>r.bestLevel) r.bestLevel=level;
    this._persist(); this._push(); return r;
  },
  recordFocus(ms){
    if(!ms||ms<0) return;
    this.focus.totalMs += ms; this.focus.sessions++;
    const d=todayKey(); this.focus.perDay[d]=(this.focus.perDay[d]||0)+ms;
    this._persist(); this._push();
  },
  /* streak: consecutive days up to today/yesterday with activity */
  streak(){
    const has=(k)=>(this.focus.perDay[k]||0)>0;
    let streak=0, cur=new Date();
    if(!has(todayKey())) cur.setDate(cur.getDate()-1);
    for(let guard=0; guard<3650; guard++){
      const k=todayKeyFrom(cur); if(!has(k)) break;
      streak++; cur.setDate(cur.getDate()-1);
    }
    return streak;
  },
  src(){ return {records:this.records, focus:this.focus}; },

  /* ---- D1 sync ---- */
  _code(){ return (this.getPref("syncCode","")||"").trim(); },
  async pull(){
    const cfg=CFG(); if(!cfg.syncUrl || !this._code()) return null;
    const res=await fetch(cfg.syncUrl,{headers:{"X-Sync-Code":this._code()}});
    if(!res.ok) throw new Error("pull "+res.status);
    return res.json();   // null when nothing stored yet
  },
  async push(data){
    const cfg=CFG(); if(!cfg.syncUrl || !this._code()) return;
    const res=await fetch(cfg.syncUrl,{
      method:"PUT", headers:{"X-Sync-Code":this._code(),"Content-Type":"application/json"},
      body: JSON.stringify(data)});
    if(!res.ok) throw new Error("push "+res.status);
  },
  _pushT:null,
  _push(){ clearTimeout(this._pushT); this._pushT=setTimeout(async()=>{
    try{ await this.push(this.src()); }
    catch(e){ console.warn("sync push failed (local only):",e); }
  }, 1500); },

  /* merge remote data into local, then push back */
  async sync(){
    try{
      if(!CFG().syncUrl) return false;
      const remote=await this.pull();
      if(remote) mergeInto(this, remote);
      this._persist(); await this.push(this.src());
      return true;
    }catch(e){ console.warn("sync failed (local mode):",e); return false; }
  }
};

function mergeInto(store, remote){
  const a=store.records, b=remote.records||{};
  for(const id in b){ const r=a[id]||={bestScore:0,bestLevel:1,sessions:0,totalMs:0,history:[]};
    const rb=b[id]; r.sessions=Math.max(r.sessions,rb.sessions||0);
    r.totalMs=Math.max(r.totalMs,rb.totalMs||0);
    r.bestScore=Math.max(r.bestScore,rb.bestScore||0);
    r.bestLevel=Math.max(r.bestLevel,rb.bestLevel||0);
    r.history=[...r.history,...(rb.history||[])];
    r.history.sort((x,y)=>x.ts-y.ts);
    const seen=new Set(); r.history=r.history.filter(h=>{const k=h.ts+":"+h.lvl+":"+h.score; if(seen.has(k))return false; seen.add(k); return true;});
    if(r.history.length>240) r.history=r.history.slice(-240);
  }
  const f=a=>a||0, fb=remote.focus||{};
  store.focus.totalMs=Math.max(f(store.focus.totalMs), f(fb.totalMs));
  store.focus.sessions=Math.max(f(store.focus.sessions), f(fb.sessions));
  const pd=store.focus.perDay, pdb=fb.perDay||{};
  for(const d in pdb) pd[d]=Math.max(f(pd[d]), f(pdb[d]));
}
function todayKeyFrom(d){ const p=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; }

async function setSyncCode(code){
  store.setPref("syncCode", code);
  const ok = code ? await store.sync() : null;
  return {ok, configured: !!CFG().syncUrl};
}

export { store, setSyncCode };