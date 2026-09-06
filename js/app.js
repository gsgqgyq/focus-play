/* app.js — 核心路由器与应用控制器 */
import { applyI18n, t, lang, setLang } from "./i18n.js";
import { store, setSyncCode } from "./state.js";
import { sfx } from "./audio.js";
import { voice } from "./voice.js";
import { ambientPlayer } from "./ambient.js";

// 8 款循证训练矩阵
import { flanker } from "./games/flanker.js";
import { sart } from "./games/sart.js";
import { corsi } from "./games/corsi.js";
import { time_sense } from "./games/time_sense.js";
import { nback } from "./games/nback.js";
import { gonogo } from "./games/gonogo.js";
import { schulte } from "./games/schulte.js";
import { stroop } from "./games/stroop.js";

import { initTimer } from "./modules/timer.js";
import { initBreathe } from "./modules/breathe.js";
import { renderPlans } from "./modules/plans.js";

const GAMES = [flanker, sart, corsi, time_sense, nback, gonogo, schulte, stroop];

const DOMAIN_BADGES = {
  flanker: "🎯 选择性抗干扰",
  sart: "👁️ 持续警觉维持",
  corsi: "🧩 视空间工作记忆",
  time_sense: "⏳ 时间盲校准",
  nback: "🧠 工作记忆刷新",
  gonogo: "🛑 冲动急刹车",
  schulte: "🔢 视野广度搜索",
  stroop: "🎨 认知冲突灵活性"
};

const $ = id => document.getElementById(id);

let currentView = "home";
let currentGame = null;
let currentLevel = 1;
let currentAbort = null;

/* ---------- 视图切换路由 ---------- */
export function navigateTo(view) {
  if (currentGame && currentAbort) {
    try { currentAbort(); } catch (e) {}
    currentAbort = null;
  }
  currentView = view;

  document.querySelectorAll(".view").forEach(s => {
    s.classList.toggle("active", s.id === `view-${view}`);
  });
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.nav === view);
  });

  if (view === "home") renderHome();
  if (view === "games") renderGames();
  if (view === "stats") renderStats();
  if (view === "play") paintLevelStrip();

  window.dispatchEvent(new CustomEvent("ff:view", { detail: view }));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", () => {
    sfx.click();
    navigateTo(el.dataset.nav);
  });
});

/* ---------- Toast 提示 ---------- */
export function toast(msg) {
  let el = $("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------- 首页渲染 ---------- */
function renderHome() {
  const ms = store.focus.perDay[todayKey()] || 0;
  $("todayMs").textContent = ms >= 3600000 ? `${(ms / 3600000).toFixed(1)}h` : `${Math.round(ms / 60000)}m`;
  $("streakNum").textContent = `${store.streak()}d`;
  $("totalSessions").textContent = store.focus.sessions;
  renderPlans("homePlansGrid");
  renderSyncCard();
}

const todayKey = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function renderSyncCard() {
  const configured = !!(window.FOCUSPLAY_CONFIG || {}).syncUrl;
  const urlCode = new URLSearchParams(location.search).get("code");

  if (urlCode && !store.getPref("syncCode", "")) {
    store.setPref("syncCode", urlCode);
    store.sync().then(ok => toast(ok ? t("sync_ok") : t("sync_err")));
  }

  // 默认对未输入同步码的用户优雅收起，但提供手动展开入口
  const box = $("syncCard");
  if (!box) return;

  const currentCode = store.getPref("syncCode", "");
  box.innerHTML = `
    <div class="sync-box">
      <div class="sync-box-head">
        <h3>🔄 ${t("sync_title")}</h3>
        <span class="sync-status-tag ${currentCode ? 'active' : ''}">${currentCode ? '已连接云端' : '单机离线'}</span>
      </div>
      <p>${t("sync_desc")}</p>
      <div class="sync-row">
        <input class="hint-input" id="syncInput" placeholder="${t("sync_placeholder")}" value="${currentCode}">
        <button class="btn primary" id="syncSave">${t("sync_save")}</button>
        ${currentCode ? `<button class="btn" id="syncLink">🔗 ${t("sync_link")}</button>` : ""}
      </div>
      <div class="sync-status ${configured ? '' : 'nd'}" id="syncStatus">
        ${configured ? (currentCode ? '✓ 云端同步服务就绪' : '— 暂未绑定') : t("sync_nd")}
      </div>
    </div>
  `;

  $("syncSave").addEventListener("click", async () => {
    sfx.click();
    const code = $("syncInput").value.trim();
    const r = await setSyncCode(code);
    const st = $("syncStatus");
    if (!r.configured) {
      st.className = "sync-status nd";
      st.textContent = t("sync_nd");
      toast(t("sync_nd"));
    } else if (code && r.ok) {
      st.className = "sync-status ok";
      st.textContent = t("sync_ok");
      toast(t("sync_ok"));
      renderHome();
    } else {
      st.className = "sync-status err";
      st.textContent = t("sync_err");
      toast(t("sync_err"));
    }
  });

  const linkBtn = $("syncLink");
  if (linkBtn) {
    linkBtn.addEventListener("click", async () => {
      const code = store.getPref("syncCode", "");
      if (!code) {
        toast(t("sync_placeholder"));
        return;
      }
      const link = `https://focusplay.516278.xyz/?code=${encodeURIComponent(code)}`;
      try {
        await navigator.clipboard.writeText(link);
        toast("✓ " + t("sync_copied"));
      } catch (e) {
        prompt(t("sync_link"), link);
      }
    });
  }
}

/* ---------- 游戏大厅渲染 ---------- */
function passedSet(r) {
  const s = new Set();
  (r ? r.history : []).forEach(h => { if (h.pass) s.add(h.lvl); });
  return s;
}

function unlockedLvl(game, r) {
  let m = 0;
  passedSet(r).forEach(l => m = Math.max(m, l));
  return Math.min(game.max, Math.max(1, m + 1));
}

function renderGames() {
  renderPlans("gamesPlansGrid");
  const grid = $("gamesGrid");
  if (!grid) return;

  grid.innerHTML = GAMES.map(g => {
    const r = store.records[g.id];
    const uni = unlockedLvl(g, r);
    const done = uni > g.max - 1 && passedSet(r).has(g.max);
    const bestLvl = r ? r.bestLevel : 1;
    const badgeText = DOMAIN_BADGES[g.id] || "🧠 认知训练";

    return `
      <article class="card link-card game-card" data-game="${g.id}">
        <div class="game-card-top">
          <span class="game-domain-badge">${badgeText}</span>
          <div class="card-icon">${g.icon}</div>
        </div>
        <h2>${t(g.nameKey)}</h2>
        <p>${t(g.descKey)}</p>

        <!-- 显眼的游戏玩法与操作规则模块 -->
        <div class="game-card-how">
          <span class="how-tag">🎮 玩法操作</span>
          <div class="how-text">${t(g.howKey)}</div>
        </div>

        <div class="game-card-sci">
          <small>🔬 ${t(g.scienceKey || g.descKey)}</small>
        </div>
        <div class="progress-bar">
          <i style="width:${done ? 100 : (uni / g.max) * 100}%"></i>
        </div>
        <div class="card-meta">
          <span>${t("level")} ${Math.min(uni, g.max)}/${g.max}</span>
          <span class="best-badge">${done ? t("done_all") : `${t("best")} L${bestLvl}`}</span>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-game]").forEach(card => {
    card.addEventListener("click", () => {
      sfx.click();
      const g = GAMES.find(x => x.id === card.dataset.game);
      if (g) openPlay(g, unlockedLvl(g, store.records[g.id]));
    });
  });
}

/* ---------- 游戏运行容器与控制 ---------- */
export function openPlay(game, level) {
  currentGame = game;
  navigateTo("play");
  $("playTitle").textContent = t(game.nameKey);
  currentLevel = Math.min(level, game.max);
  paintLevelStrip();
  setupHelpDrawer(game);
  startLevel(game, currentLevel);
}

function setupHelpDrawer(game) {
  const drawer = $("playHelpDrawer");
  const helpBtn = $("playHelpBtn");
  if (!drawer || !helpBtn) return;

  drawer.style.display = "none";
  drawer.innerHTML = `
    <div class="play-help-content">
      <div class="ph-head">
        <h4>${game.icon} ${t(game.nameKey)} · 随时查看玩法说明</h4>
        <button id="playHelpClose" class="icon-btn" style="padding:4px 10px">✕</button>
      </div>
      <div class="ph-body">
        <div class="ph-section">
          <b>🎮 核心操作规则：</b>
          <p>${t(game.howKey)}</p>
        </div>
        <div class="ph-section" style="margin-top:10px">
          <b>🧠 为什么对 ADHD 大脑有效？</b>
          <p>${t(game.scienceKey || game.descKey)}</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById("playHelpClose").onclick = () => {
    sfx.click();
    drawer.style.display = "none";
  };

  helpBtn.onclick = () => {
    sfx.click();
    drawer.style.display = drawer.style.display === "none" ? "block" : "none";
  };
}

function paintLevelStrip() {
  if (!currentGame) return;
  const g = currentGame;
  const r = store.records[g.id];
  const passed = passedSet(r);
  const uni = unlockedLvl(g, r);

  $("playLevelBadge").textContent = `${t("level")} ${currentLevel}`;
  $("playLevels").innerHTML = Array.from({ length: g.max }, (_, i) => i + 1).map(l => {
    const isCur = l === currentLevel;
    const isDone = passed.has(l);
    const isUnlocked = l <= uni;
    const cls = isCur ? "cur" : (isDone ? "done" : (isUnlocked ? "unlocked" : "locked"));
    return `<button class="lvl-dot ${cls}" data-l="${l}" title="${t('level')} ${l}">L${l}</button>`;
  }).join("");

  $("playLevels").querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      const l = parseInt(b.dataset.l, 10);
      if (!l) return;
      if (l > uni) {
        toast(t("locked"));
        return;
      }
      sfx.click();
      currentLevel = l;
      paintLevelStrip();
      startLevel(g, l);
    });
  });
}

function startLevel(game, level) {
  if (currentAbort) {
    try { currentAbort(); } catch (e) {}
    currentAbort = null;
  }
  currentLevel = level;
  currentGame = game;

  const host = $("playHost");
  host.innerHTML = "";
  $("playControls").innerHTML = "";

  // 引导说明卡片（含神经科学依据）
  host.innerHTML = `
    <div class="card play-intro-card">
      <div class="intro-head">
        <span class="intro-icon">${game.icon}</span>
        <div>
          <h3>${t(game.nameKey)} <span class="lvl-badge">Level ${level}</span></h3>
          <span class="game-domain-badge">${DOMAIN_BADGES[game.id] || ''}</span>
        </div>
      </div>
      <div class="intro-sci-box">
        <b>🧠 为什么对 ADHD 大脑有效？</b>
        <p>${t(game.scienceKey || game.descKey)}</p>
      </div>
      <div class="intro-rule-box">
        <b>🎮 玩法与操作规则：</b>
        <p>${t(game.howKey)}</p>
      </div>
      <div class="intro-actions">
        <button class="btn primary big" id="introGo">▶ ${t("start")}</button>
      </div>
    </div>
  `;

  document.getElementById("introGo").addEventListener("click", () => {
    sfx.click();
    host.innerHTML = "";
    currentAbort = game.start(host, {
      level,
      end: entry => onLevelEnd(game, entry, level)
    });
  });
}

function onLevelEnd(game, entry, level) {
  store.record(game.id, {
    level,
    score: entry.score,
    ms: entry.ms,
    pass: entry.pass
  });

  if (entry.pass) {
    sfx.levelup();
  } else {
    sfx.wrong();
  }

  const r = store.records[game.id];
  const passed = passedSet(r);
  const uni = unlockedLvl(game, r);
  const allDone = uni > game.max - 1 && passed.has(game.max);

  const sumHtml = entry.summary
    ? Object.entries(entry.summary).map(([k, v]) => `
        <div class="result-metric">
          <span class="rm-k">${k}</span>
          <span class="rm-v">${v}</span>
        </div>
      `).join("")
    : "";

  $("playHost").innerHTML = `
    <div class="card result-card">
      <div class="result-icon">${entry.pass ? "🎉" : "💪"}</div>
      <h2>${entry.pass ? t("s_great") : t("s_oops")}</h2>
      <div class="result-hud">
        <div class="rh-item">
          <span>关卡得分</span>
          <b>${entry.score}</b>
        </div>
        <div class="rh-item">
          <span>挑战关卡</span>
          <b>L${level}</b>
        </div>
      </div>
      ${sumHtml ? `<div class="result-metrics-grid">${sumHtml}</div>` : ""}
      <div class="play-controls" style="margin-top:20px">
        <button class="btn" data-act="retry">🔄 ${t("retry")}</button>
        ${entry.pass && !allDone ? `<button class="btn primary" data-act="next">${t("next")} →</button>` : ""}
        ${allDone ? `<button class="btn primary" data-act="hall">${t("done_all")} 返回大厅</button>` : ""}
      </div>
    </div>
  `;
  $("playControls").innerHTML = "";

  const host = $("playHost");
  host.querySelectorAll("[data-act]").forEach(btn => {
    btn.addEventListener("click", () => {
      sfx.click();
      const act = btn.dataset.act;
      if (act === "next") {
        const nextL = entry.pass ? Math.min(level + 1, game.max) : level;
        currentLevel = nextL;
        openPlay(game, nextL);
      } else if (act === "hall") {
        navigateTo("games");
      } else {
        startLevel(game, level);
      }
    });
  });

  paintLevelStrip();
}

/* ---------- 我的数据洞察 ---------- */
function renderStats() {
  const ms = store.focus.totalMs;
  const min = Math.round(ms / 60000);
  const todayMs = store.focus.perDay[todayKey()] || 0;

  $("statsTotal").innerHTML = `
    <div class="big-chip">
      <b>${Math.floor(min / 60)}h ${min % 60}m</b>
      <span>${t("st_total")}</span>
    </div>
    <div class="big-chip">
      <b>${Math.round(todayMs / 60000)}m</b>
      <span>${t("st_today")}</span>
    </div>
    <div class="big-chip">
      <b>${store.streak()}天</b>
      <span>${t("st_streak")}</span>
    </div>
    <div class="big-chip">
      <b>${store.focus.sessions}次</b>
      <span>${t("st_sessionsN")}</span>
    </div>
  `;

  let rows = GAMES.map(g => {
    const r = store.records[g.id];
    const recent = (r ? r.history : []).slice(-15).map(h => `
      <span class="${h.pass ? 'pass' : 'fail'}" title="${h.pass ? '通关' : '未达标'}">
        L${h.lvl} · ${h.score}分
      </span>
    `).join("");

    return `
      <div class="panel stats-panel">
        <div class="stats-panel-head">
          <h3>${g.icon} ${t(g.nameKey)}</h3>
          <small>${t("best")} L${r ? r.bestLevel : 1} · 训练 ${r ? r.sessions : 0} 次</small>
        </div>
        ${recent ? `<div class="recent">${recent}</div>` : `<p class="empty-hint">— 暂无训练记录 —</p>`}
      </div>
    `;
  }).join("");

  $("statsBreakdown").innerHTML = rows;
}

/* ---------- 主题与首选项 ---------- */
function applyTheme() {
  const th = store.getPref("theme", "dark");
  const dark = th === "dark" || (th === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
}

$("themeBtn").addEventListener("click", () => {
  const th = store.getPref("theme", "dark");
  const next = th === "dark" ? "light" : "dark";
  store.setPref("theme", next);
  applyTheme();
});

$("langBtn").addEventListener("click", () => {
  setLang(lang === "zh" ? "en" : "zh");
  sfx.click();
});

$("voiceBtn").addEventListener("click", () => {
  const on = voice.toggle();
  $("voiceBtn").classList.toggle("on", on);
  if (on) voice.say(t("brand"));
});

/* ---------- 初始化 ---------- */
document.addEventListener("keydown", e => {
  if (e.code === "Escape" && currentGame && currentView === "play") {
    navigateTo("games");
  }
});

window.addEventListener("ff:lang", () => {
  if (currentView === "home") renderHome();
  if (currentView === "games") renderGames();
  if (currentView === "play" && currentGame) {
    $("playTitle").textContent = t(currentGame.nameKey);
    paintLevelStrip();
  }
  if (currentView === "stats") renderStats();
});

// 模块初始化
initTimer();
initBreathe();
ambientPlayer.init();
applyI18n();
applyTheme();
navigateTo("home");

if ("speechSynthesis" in window) {
  speechSynthesis.getVoices();
}
