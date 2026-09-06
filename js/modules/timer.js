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

const CIRCUMFERENCE = 2 * Math.PI * 130; // r = 130 in svg viewBox 300x300

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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

  // 顶层药丸状态通知
  const pill = document.getElementById("focusPill");
  if (pill) {
    if (running && !paused) {
      pill.style.display = "flex";
      pill.innerHTML = `<span>⏱️ <b>${formatTime(secs)}</b></span>`;
      document.title = `${formatTime(secs)} · 专注乐园`;
    } else {
      pill.style.display = "none";
      document.title = "专注乐园 · FocusPlay";
    }
  }
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

  if (zenBtn) {
    zenBtn.addEventListener("click", () => {
      sfx.click();
      const wrap = document.getElementById("view-timer");
      wrap.classList.toggle("zen-mode");
      if (wrap.classList.contains("zen-mode")) {
        try {
          if (document.fullscreenEnabled && !document.fullscreenElement) {
            wrap.requestFullscreen().catch(() => {});
          }
        } catch (e) {}
      } else {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    });
  }

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
