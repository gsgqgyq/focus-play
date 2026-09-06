/* breathe.js — 正念呼吸模块（箱式呼吸 4-4-4-4、4-7-8 深度舒缓呼吸与自律神经调节） */
import { t } from "../i18n.js";
import { store } from "../state.js";
import { sfx } from "../audio.js";

const MODES = [
  {
    id: "box",
    nameKey: "breathe_box",
    descKey: "breathe_box_d",
    steps: [
      { key: "step_inhale", dur: 4, scale: 1.0 },
      { key: "step_hold",   dur: 4, scale: 1.0 },
      { key: "step_exhale", dur: 4, scale: 0.55 },
      { key: "step_hold",   dur: 4, scale: 0.55 }
    ]
  },
  {
    id: "478",
    nameKey: "breathe_478",
    descKey: "breathe_478_d",
    steps: [
      { key: "step_inhale", dur: 4, scale: 1.0 },
      { key: "step_hold",   dur: 7, scale: 1.0 },
      { key: "step_exhale", dur: 8, scale: 0.55 }
    ]
  },
  {
    id: "calm",
    nameKey: "breathe_calm",
    descKey: "breathe_calm_d",
    steps: [
      { key: "step_inhale", dur: 4, scale: 1.0 },
      { key: "step_exhale", dur: 6, scale: 0.55 }
    ]
  }
];

let curMode = "box";
let running = false;
let stepIdx = 0;
let stepTimer = null;
let countdownTimer = null;
let cycles = 0;
let remainingSec = 0;

export function initBreathe() {
  renderModes();
  const startBtn = document.getElementById("breatheStartBtn");
  const stopBtn = document.getElementById("breatheStopBtn");

  if (startBtn) startBtn.addEventListener("click", () => { sfx.click(); start(); });
  if (stopBtn)  stopBtn.addEventListener("click", () => { sfx.click(); stop(); });
}

function renderModes() {
  const container = document.getElementById("breatheModes");
  if (!container) return;

  container.innerHTML = MODES.map(m => `
    <button class="mode-btn ${m.id === curMode ? 'active' : ''}" data-mid="${m.id}">
      <b>${t(m.nameKey)}</b>
      <small>${t(m.descKey)}</small>
    </button>
  `).join("");

  container.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (running) return;
      sfx.click();
      curMode = btn.dataset.mid;
      renderModes();
    });
  });
}

function start() {
  if (running) return;
  running = true;
  cycles = 0;
  stepIdx = 0;

  document.getElementById("breatheStartBtn").style.display = "none";
  document.getElementById("breatheStopBtn").style.display = "inline-flex";

  runStep();
}

function runStep() {
  if (!running) return;
  const mode = MODES.find(m => m.id === curMode) || MODES[0];
  const step = mode.steps[stepIdx];

  remainingSec = step.dur;
  const orb = document.getElementById("orb");
  const orbText = document.getElementById("orbText");
  const stepLabel = document.getElementById("breatheStep");

  if (orb) {
    orb.style.transitionDuration = `${step.dur}s`;
    orb.style.transform = `scale(${step.scale})`;
  }
  if (stepLabel) {
    stepLabel.textContent = t(step.key);
  }
  if (orbText) {
    orbText.textContent = remainingSec;
  }

  sfx.tap();

  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remainingSec--;
    if (orbText) orbText.textContent = remainingSec > 0 ? remainingSec : "";
    if (remainingSec <= 0) {
      clearInterval(countdownTimer);
    }
  }, 1000);

  clearTimeout(stepTimer);
  stepTimer = setTimeout(() => {
    if (!running) return;
    stepIdx++;
    if (stepIdx >= mode.steps.length) {
      stepIdx = 0;
      cycles++;
      document.getElementById("breatheNote").textContent = `已完成 ${cycles} 轮循环`;
    }
    runStep();
  }, step.dur * 1000);
}

function stop() {
  running = false;
  clearTimeout(stepTimer);
  clearInterval(countdownTimer);

  const orb = document.getElementById("orb");
  const orbText = document.getElementById("orbText");
  const stepLabel = document.getElementById("breatheStep");

  if (orb) {
    orb.style.transitionDuration = "0.5s";
    orb.style.transform = "scale(0.8)";
  }
  if (orbText) orbText.textContent = "";
  if (stepLabel) stepLabel.textContent = "";

  document.getElementById("breatheStartBtn").style.display = "inline-flex";
  document.getElementById("breatheStopBtn").style.display = "none";

  if (cycles > 0) {
    store.record("breathe", {
      level: 1,
      score: cycles,
      ms: cycles * 16000,
      pass: true
    });
    sfx.done();
  }
}

window.addEventListener("ff:lang", () => {
  renderModes();
});
