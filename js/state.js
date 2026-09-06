/* state.js — 本地存储(LocalStorage) + Cloudflare D1 跨端同步。同步失败平滑降级为纯本地。 */

const CFG = () => window.FOCUSPLAY_CONFIG || {};
const LS = {
  records: "ff.records",   // per-game summaries & history
  focus:   "ff.focus",     // aggregate focus time & sessions
  prefs:   "ff.prefs",     // theme/ambient/voice/syncCode
};

const todayKeyFrom = (d) => {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const todayKey = () => todayKeyFrom(new Date());

const defaultPrefs = {
  theme: "dark",
  voice: false,
  sfx: true,
  ambientVolume: 0.65,
  ambientTrack: "brown_noise",
  ambientEngine: "webaudio", // "webaudio" | "youtube"
  customYoutubeId: "",
  timerPreset: 25,
  syncCode: ""
};

export const store = {
  records: JSON.parse(localStorage.getItem(LS.records) || "{}"),
  focus:   JSON.parse(localStorage.getItem(LS.focus)   || '{"totalMs":0,"sessions":0,"perDay":{}}'),
  prefs:   Object.assign({}, defaultPrefs, JSON.parse(localStorage.getItem(LS.prefs) || "{}")),

  _persist() {
    localStorage.setItem(LS.records, JSON.stringify(this.records));
    localStorage.setItem(LS.focus,   JSON.stringify(this.focus));
    localStorage.setItem(LS.prefs,   JSON.stringify(this.prefs));
  },

  getPref(k, d) {
    return (k in this.prefs) ? this.prefs[k] : d;
  },

  setPref(k, v) {
    this.prefs[k] = v;
    this._persist();
    window.dispatchEvent(new CustomEvent("ff:prefs", { detail: { key: k, value: v } }));
  },

  /* 记录单次游戏训练成绩 */
  record(gameId, { level, score, ms, pass, extra = {} }) {
    const r = (this.records[gameId] ||= {
      bestScore: 0,
      bestLevel: 1,
      sessions: 0,
      totalMs: 0,
      history: []
    });

    r.sessions++;
    r.totalMs += (ms || 0);
    r.history.push({
      lvl: level,
      score: Math.round(score),
      pass: !!pass,
      ts: Date.now(),
      extra
    });

    if (r.history.length > 200) r.history.shift();
    if (score > r.bestScore) r.bestScore = Math.round(score);
    if (pass && level > r.bestLevel) r.bestLevel = level;

    this._persist();
    this._push();
    window.dispatchEvent(new CustomEvent("ff:record", { detail: { gameId, r, pass: !!pass } }));
    return r;
  },

  /* 记录专注计时器专注时长 */
  recordFocus(ms) {
    if (!ms || ms <= 0) return;
    this.focus.totalMs += ms;
    this.focus.sessions++;
    const d = todayKey();
    this.focus.perDay[d] = (this.focus.perDay[d] || 0) + ms;
    this._persist();
    this._push();
    window.dispatchEvent(new CustomEvent("ff:focus", { detail: { ms, total: this.focus } }));
  },

  /* 连续天数打卡计算 */
  streak() {
    const has = (k) => (this.focus.perDay[k] || 0) > 0;
    let streak = 0;
    let cur = new Date();
    // 如果今天还没记录，从昨天往前算；如果有算上今天
    if (!has(todayKey())) {
      cur.setDate(cur.getDate() - 1);
    }
    for (let guard = 0; guard < 365; guard++) {
      const k = todayKeyFrom(cur);
      if (!has(k)) break;
      streak++;
      cur.setDate(cur.getDate() - 1);
    }
    return streak;
  },

  src() {
    return { records: this.records, focus: this.focus };
  },

  /* ---- D1 云端同步 ---- */
  _code() {
    return (this.getPref("syncCode", "") || "").trim();
  },

  async pull() {
    const cfg = CFG();
    if (!cfg.syncUrl || !this._code()) return null;
    const res = await fetch(cfg.syncUrl, {
      headers: { "X-Sync-Code": this._code() }
    });
    if (!res.ok) throw new Error("pull " + res.status);
    return res.json();
  },

  async push(data) {
    const cfg = CFG();
    if (!cfg.syncUrl || !this._code()) return;
    const res = await fetch(cfg.syncUrl, {
      method: "PUT",
      headers: {
        "X-Sync-Code": this._code(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("push " + res.status);
  },

  _pushT: null,
  _push() {
    clearTimeout(this._pushT);
    this._pushT = setTimeout(async () => {
      try {
        await this.push(this.src());
      } catch (e) {
        console.warn("[FocusPlay] sync push failed (local fallback):", e);
      }
    }, 1500);
  },

  /* 合并远端与本地数据并回推 */
  async sync() {
    try {
      if (!CFG().syncUrl || !this._code()) return false;
      const remote = await this.pull();
      if (remote) mergeInto(this, remote);
      this._persist();
      await this.push(this.src());
      window.dispatchEvent(new CustomEvent("ff:synced"));
      return true;
    } catch (e) {
      console.warn("[FocusPlay] sync failed (local fallback):", e);
      return false;
    }
  }
};

function mergeInto(local, remote) {
  const a = local.records;
  const b = remote.records || {};
  for (const id in b) {
    const r = (a[id] ||= { bestScore: 0, bestLevel: 1, sessions: 0, totalMs: 0, history: [] });
    const rb = b[id];
    r.sessions = Math.max(r.sessions, rb.sessions || 0);
    r.totalMs = Math.max(r.totalMs, rb.totalMs || 0);
    r.bestScore = Math.max(r.bestScore, rb.bestScore || 0);
    r.bestLevel = Math.max(r.bestLevel, rb.bestLevel || 0);
    r.history = [...r.history, ...(rb.history || [])];
    r.history.sort((x, y) => x.ts - y.ts);
    const seen = new Set();
    r.history = r.history.filter(h => {
      const k = `${h.ts}:${h.lvl}:${h.score}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (r.history.length > 200) r.history = r.history.slice(-200);
  }

  const f = val => val || 0;
  const fb = remote.focus || {};
  local.focus.totalMs = Math.max(f(local.focus.totalMs), f(fb.totalMs));
  local.focus.sessions = Math.max(f(local.focus.sessions), f(fb.sessions));
  const pd = local.focus.perDay;
  const pdb = fb.perDay || {};
  for (const d in pdb) {
    pd[d] = Math.max(f(pd[d]), f(pdb[d]));
  }
}

export async function setSyncCode(code) {
  store.setPref("syncCode", code);
  const ok = code ? await store.sync() : null;
  return { ok, configured: !!CFG().syncUrl };
}
