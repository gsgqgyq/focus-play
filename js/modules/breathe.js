/* breathe.js — 正念呼吸模块（箱式呼吸 4-4-4-4、4-7-8 深度舒缓呼吸与自律神经调节，支持温润自然人声节律引导） */
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

// 预加载自然高保真温润人声音频（避免 Web Speech API 的生硬与机械感）
const BREATH_AUDIOS = {
  zh: {
    step_inhale: new Audio("audio/breathe/inhale_zh.mp3"),
    step_hold:   new Audio("audio/breathe/hold_zh.mp3"),
    step_exhale: new Audio("audio/breathe/exhale_zh.mp3")
  },
  en: {
    step_inhale: new Audio("audio/breathe/inhale_en.mp3"),
    step_hold:   new Audio("audio/breathe/hold_en.mp3"),
    step_exhale: new Audio("audio/breathe/exhale_en.mp3")
  }
};

let curMode = "box";
let running = false;
let stepIdx = 0;
let stepTimer = null;
let countdownTimer = null;
let cycles = 0;
let remainingSec = 0;
let voiceEnabled = store.getPref("breatheVoice", true);
let currentAudio = null;

function playBreathAudio(stepKey) {
  if (!voiceEnabled) return;
  stopBreathAudio();
  const lang = store.getPref("lang", "zh") === "zh" ? "zh" : "en";
  const audio = BREATH_AUDIOS[lang] && BREATH_AUDIOS[lang][stepKey];
  if (audio) {
    currentAudio = audio;
    currentAudio.currentTime = 0;
    currentAudio.volume = 0.95;
    currentAudio.play().catch(e => {
      console.warn("[FocusPlay] breath audio playback:", e);
    });
  }
}

function stopBreathAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
}

export function initBreathe() {
  renderModes();
  const startBtn = document.getElementById("breatheStartBtn");
  const stopBtn = document.getElementById("breatheStopBtn");
  const voiceCheck = document.getElementById("breatheVoiceCheck");

  if (startBtn) startBtn.addEventListener("click", () => { sfx.click(); start(); });
  if (stopBtn)  stopBtn.addEventListener("click", () => { sfx.click(); stop(); });

  if (voiceCheck) {
    voiceCheck.checked = voiceEnabled;
    voiceCheck.addEventListener("change", (e) => {
      voiceEnabled = e.target.checked;
      store.setPref("breatheVoice", voiceEnabled);
      if (!voiceEnabled) stopBreathAudio();
    });
  }
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
  playBreathAudio(step.key);

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
  stopBreathAudio();

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
  const voiceCheckLabel = document.querySelector(".breathe-voice-opt span");
  if (voiceCheckLabel) voiceCheckLabel.textContent = t("breathe_voice_opt");
});

window.addEventListener("ff:view", (e) => {
  if (e.detail !== "breathe" && running) {
    stop();
  }
});
