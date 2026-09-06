/* timer.js — ADHD 友好的视觉圆环专注计时器 (Time Timer 概念 + 全屏沉浸 Zen 模式 + 白噪音智能联动) */
import { t } from "../i18n.js";
import { store } from "../state.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";
import { ambientPlayer } from "../ambient.js";

const PRESETS = [
  { m: 5,  labelKey: "timer_preset_5",  badge: "🚀 克服启动拖延" },
  { m: 15, labelKey: "timer_preset_15", badge: "⚡ 敏捷短跑" },
  { m: 25, labelKey: "timer_preset_25", badge: "🍅 经典番茄" },
  { m: 45, labelKey: "timer_preset_45", badge: "🌊 深度心流" }
];

let secs = 25 * 60;
let total = 25 * 60;
let running = false;
let paused = false;
let timerIv = null;
let autoAmbient = true;
let activeView = "home";
let isZen = false;

const CIRCUMFERENCE = 2 * Math.PI * 130; // r = 130 in svg viewBox 300x300

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function updatePill() {
  const pill = document.getElementById("focusPill");
  const pillClock = document.getElementById("pillClock");
  if (pillClock) pillClock.textContent = formatTime(secs);

  // 关键修复：当用户正在“专注计时”页面时，隐藏顶栏药丸，彻底解决遮挡顶栏文字问题！
  // 只有当计时在运行、且用户切到了其他页面（如大厅、呼吸、数据），才在顶栏操作区优雅展示
  if (running && !paused && activeView !== "timer") {
    if (pill) pill.style.display = "inline-flex";
    document.title = `${formatTime(secs)} · 专注乐园`;
  } else {
    if (pill) pill.style.display = "none";
    if (running && !paused) {
      document.title = `${formatTime(secs)} · 专注乐园`;
    } else {
      document.title = "专注乐园 · FocusPlay";
    }
  }
}

function updateDial() {
  const circle = document.getElementById("timerProgressCircle");
  const timeText = document.getElementById("timerClockText");
  const subText = document.getElementById("timerClockSub");

  if (timeText) timeText.textContent = formatTime(secs);

  if (circle) {
    const fraction = total > 0 ? (secs / total) : 0;
    const offset = CIRCUMFERENCE * (1 - fraction);
    circle.style.strokeDashoffset = offset;
  }

  updatePill();
}

function start() {
  if (running) return;
  running = true;
  paused = false;

  document.getElementById("timerStartBtn").style.display = "none";
  document.getElementById("timerPauseBtn").style.display = "inline-flex";
  document.getElementById("timerResetBtn").style.display = "inline-flex";
  document.getElementById("timerNote").textContent = t("timer_running");

  sfx.tick();
  voice.say(t("timer_start"));

  // 智能联动：如果勾选了白噪音且当前未播放，自动淡入白噪音
  if (autoAmbient && !ambientPlayer.isPlaying()) {
    ambientPlayer.play();
  }

  updateDial();
  clearInterval(timerIv);
  timerIv = setInterval(() => {
    secs--;
    updateDial();
    if (secs <= 0) {
      finish();
    }
  }, 1000);
}

function pause() {
  if (!running || paused) return;
  paused = true;
  clearInterval(timerIv);
  document.getElementById("timerPauseBtn").textContent = t("resume");
  document.getElementById("timerNote").textContent = t("timer_paused");
  updateDial();
}

function resume() {
  if (!running || !paused) return;
  paused = false;
  document.getElementById("timerPauseBtn").textContent = t("timer_pause");
  document.getElementById("timerNote").textContent = t("timer_running");

  if (autoAmbient && !ambientPlayer.isPlaying()) {
    ambientPlayer.play();
  }

  updateDial();
  clearInterval(timerIv);
  timerIv = setInterval(() => {
    secs--;
    updateDial();
    if (secs <= 0) {
      finish();
    }
  }, 1000);
}

function finish() {
  clearInterval(timerIv);
  running = false;
  paused = false;
  updateDial();

  const focusedMs = total * 1000;
  store.recordFocus(focusedMs);

  sfx.gong();
  const minsDone = Math.round(total / 60);
  const doneMsg = t("timer_done", { m: minsDone });
  document.getElementById("timerNote").innerHTML = `🎉 <b>${doneMsg}</b>`;
  voice.say(doneMsg);

  document.getElementById("timerStartBtn").style.display = "inline-flex";
  document.getElementById("timerPauseBtn").style.display = "none";
  document.getElementById("timerResetBtn").style.display = "none";

  // 触发庆祝粒子
  triggerConfetti();
}

function reset() {
  clearInterval(timerIv);
  running = false;
  paused = false;
  secs = total;
  updateDial();

  document.getElementById("timerStartBtn").style.display = "inline-flex";
  document.getElementById("timerPauseBtn").style.display = "none";
  document.getElementById("timerResetBtn").style.display = "none";
  document.getElementById("timerPauseBtn").textContent = t("timer_pause");
  document.getElementById("timerNote").textContent = "";
}

function setPresetMinutes(m) {
  if (running && !paused) return;
  total = secs = m * 60;
  store.setPref("timerPreset", m);

  document.querySelectorAll(".timer-preset-chip").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.m, 10) === m);
  });

  updateDial();
}

function triggerConfetti() {
  const container = document.getElementById("timerZenWrap") || document.body;
  for (let i = 0; i < 35; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = `${20 + Math.random() * 60}%`;
    p.style.backgroundColor = ["#6c5ce7", "#00cec9", "#fdcb6e", "#00b894", "#e84393"][Math.floor(Math.random() * 5)];
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(p);
    setTimeout(() => p.remove(), 2400);
  }
}

export function exitZenMode(exitBrowserFs = true) {
  isZen = false;
  const wrap = document.getElementById("view-timer");
  if (wrap) wrap.classList.remove("zen-mode");
  const exitBtn = document.getElementById("timerZenExitBtn");
  if (exitBtn) exitBtn.style.display = "none";

  if (exitBrowserFs) {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (e) {}
    }
  }
}

export function enterZenMode() {
  isZen = true;
  const wrap = document.getElementById("view-timer");
  if (wrap) wrap.classList.add("zen-mode");
  const exitBtn = document.getElementById("timerZenExitBtn");
  if (exitBtn) exitBtn.style.display = "inline-flex";

  try {
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      wrap.requestFullscreen().catch(() => {});
    }
  } catch (e) {}
}

export function toggleZenMode() {
  if (isZen) {
    exitZenMode();
  } else {
    enterZenMode();
  }
}

export function initTimer() {
  const circle = document.getElementById("timerProgressCircle");
  if (circle) {
    circle.style.strokeDasharray = CIRCUMFERENCE;
    circle.style.strokeDashoffset = 0;
  }

  renderPresets();

  const startBtn = document.getElementById("timerStartBtn");
  const pauseBtn = document.getElementById("timerPauseBtn");
  const resetBtn = document.getElementById("timerResetBtn");
  const zenBtn = document.getElementById("timerZenToggle");
  const customInput = document.getElementById("timerCustomMin");
  const customSetBtn = document.getElementById("timerCustomSet");
  const ambientChk = document.getElementById("timerAmbientSync");

  if (startBtn) startBtn.addEventListener("click", () => { sfx.click(); start(); });
  if (pauseBtn) pauseBtn.addEventListener("click", () => { sfx.click(); paused ? resume() : pause(); });
  if (resetBtn) resetBtn.addEventListener("click", () => { sfx.click(); reset(); });

  const exitZenBtn = document.getElementById("timerZenExitBtn");

  if (exitZenBtn) {
    exitZenBtn.addEventListener("click", () => {
      sfx.click();
      exitZenMode();
    });
  }

  if (zenBtn) {
    zenBtn.addEventListener("click", () => {
      sfx.click();
      toggleZenMode();
    });
  }

  // 监听原生浏览器全屏退出 (例如用户按 Esc 键直接退出)
  const onFsChange = () => {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs && isZen) {
      exitZenMode(false); // 不用重复调用 exitFullscreen
    }
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  // 监听按键 Esc 兜底退出
  document.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && isZen) {
      exitZenMode();
    }
  });

  // 监听视图切换事件：切离专注计时器时自动退出全屏，并刷新药丸可见性
  window.addEventListener("ff:view", (e) => {
    activeView = e.detail;
    updatePill();
    if (activeView !== "timer") {
      exitZenMode();
    }
  });

  if (customSetBtn && customInput) {
    customSetBtn.addEventListener("click", () => {
      sfx.click();
      const val = parseInt(customInput.value, 10);
      if (val && val > 0 && val <= 180) {
        setPresetMinutes(val);
      }
    });
  }

  if (ambientChk) {
    ambientChk.checked = autoAmbient;
    ambientChk.addEventListener("change", (e) => {
      autoAmbient = e.target.checked;
    });
  }

  const savedMin = store.getPref("timerPreset", 25);
  setPresetMinutes(savedMin);
}

function renderPresets() {
  const container = document.getElementById("timerPresetList");
  if (!container) return;

  const currentM = Math.round(total / 60);
  container.innerHTML = PRESETS.map(p => `
    <button class="timer-preset-chip ${p.m === currentM ? 'active' : ''}" data-m="${p.m}">
      <span class="chip-m">${p.m} ${t("min")}</span>
      <span class="chip-badge">${p.badge}</span>
    </button>
  `).join("");

  container.querySelectorAll(".timer-preset-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      sfx.click();
      setPresetMinutes(parseInt(btn.dataset.m, 10));
    });
  });
}

window.addEventListener("ff:lang", () => {
  renderPresets();
  updateDial();
});
