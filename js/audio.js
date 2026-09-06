/* audio.js — 原生 Web Audio 实时合成音效与无损算法白噪音生成器，零音频文件依赖 */
import { store } from "./state.js";

let ctx = null;
let masterGain = null;
let sfxGain = null;
let noiseGain = null;
let noiseNode = null;
let currentNoiseType = null;

function getAudioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = store.getPref("sfx", true) ? 0.7 : 0.0;
    sfxGain.connect(masterGain);

    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0;
    noiseGain.connect(masterGain);
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

/* 播放温和正弦/三角波简音 */
function playTone(freq, dur, type = "sine", vol = 0.15, when = 0, attack = 0.005) {
  const c = getAudioContext();
  if (!c || !store.getPref("sfx", true)) return;
  const t = c.currentTime + (when || 0);
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(sfxGain);

  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  click() {
    playTone(920, 0.05, "sine", 0.08);
  },
  correct() {
    playTone(587.33, 0.10, "triangle", 0.16, 0);     // D5
    playTone(880.00, 0.14, "triangle", 0.14, 0.07);  // A5
  },
  wrong() {
    playTone(210, 0.18, "sawtooth", 0.09);
    playTone(175, 0.22, "sawtooth", 0.07, 0.06);
  },
  levelup() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((f, i) => playTone(f, 0.20, "triangle", 0.18, i * 0.08));
  },
  tick() {
    playTone(1400, 0.02, "sine", 0.04);
  },
  gong() {
    // 专注结束时的温暖颂钵钟鸣
    const c = getAudioContext();
    if (!c || !store.getPref("sfx", true)) return;
    const t = c.currentTime;
    [261.63, 523.25, 784.88, 1046.5].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      const baseVol = 0.18 / (i + 1);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(baseVol, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 3.0);
    });
  },
  tap() {
    playTone(440, 0.04, "triangle", 0.08);
  }
};

/* ---------------- 纯算法程序化白噪音合成器 ---------------- */
function createNoiseBuffer(c, type = "brown", seconds = 5) {
  const bufferSize = c.sampleRate * seconds;
  const buffer = c.createBuffer(2, bufferSize, c.sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  if (type === "white") {
    for (let i = 0; i < bufferSize; i++) {
      left[i] = (Math.random() * 2 - 1) * 0.25;
      right[i] = (Math.random() * 2 - 1) * 0.25;
    }
  } else if (type === "pink") {
    // Paul Kellet's filter method for pink noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let rb0 = 0, rb1 = 0, rb2 = 0, rb3 = 0, rb4 = 0, rb5 = 0, rb6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + whiteL * 0.0555179;
      b1 = 0.99332 * b1 + whiteL * 0.0750759;
      b2 = 0.96900 * b2 + whiteL * 0.1538520;
      b3 = 0.86650 * b3 + whiteL * 0.3104856;
      b4 = 0.55000 * b4 + whiteL * 0.5329522;
      b5 = -0.7616 * b5 - whiteL * 0.0168980;
      left[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + whiteL * 0.5362) * 0.045;
      b6 = whiteL * 0.115926;

      const whiteR = Math.random() * 2 - 1;
      rb0 = 0.99886 * rb0 + whiteR * 0.0555179;
      rb1 = 0.99332 * rb1 + whiteR * 0.0750759;
      rb2 = 0.96900 * rb2 + whiteR * 0.1538520;
      rb3 = 0.86650 * rb3 + whiteR * 0.3104856;
      rb4 = 0.55000 * rb4 + whiteR * 0.5329522;
      rb5 = -0.7616 * rb5 - whiteR * 0.0168980;
      right[i] = (rb0 + rb1 + rb2 + rb3 + rb4 + rb5 + rb6 + whiteR * 0.5362) * 0.045;
      rb6 = whiteR * 0.115926;
    }
  } else {
    // brown noise: integrated white noise (1/f^2)
    let lastOutL = 0.0;
    let lastOutR = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      lastOutL = (lastOutL + (0.025 * whiteL)) / 1.025;
      left[i] = lastOutL * 0.95;

      const whiteR = Math.random() * 2 - 1;
      lastOutR = (lastOutR + (0.025 * whiteR)) / 1.025;
      right[i] = lastOutR * 0.95;
    }
  }
  return buffer;
}

export const proceduralAudio = {
  isPlaying() {
    return !!noiseNode;
  },
  getCurrentType() {
    return currentNoiseType;
  },
  start(type = "brown", volume = 0.6) {
    const c = getAudioContext();
    if (!c) return;
    this.stop();

    currentNoiseType = type;
    const buffer = createNoiseBuffer(c, type, 6);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    // 添加适度的双二阶低通滤波，让声音更加温和不刺耳
    const filter = c.createBiquadFilter();
    if (type === "brown") {
      filter.type = "lowpass";
      filter.frequency.value = 650; // 沉稳低频
    } else if (type === "pink") {
      filter.type = "lowpass";
      filter.frequency.value = 1600; // 雨声质感
    } else {
      filter.type = "lowpass";
      filter.frequency.value = 3200;
    }

    src.connect(filter);
    filter.connect(noiseGain);

    const now = c.currentTime;
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(Math.min(1.0, volume), now + 1.2);

    src.start();
    noiseNode = src;
  },
  stop() {
    if (noiseNode) {
      const c = getAudioContext();
      if (c && noiseGain) {
        const now = c.currentTime;
        noiseGain.gain.cancelScheduledValues(now);
        noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
        noiseGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      }
      setTimeout(() => {
        try {
          if (noiseNode) noiseNode.stop();
        } catch (e) {}
        noiseNode = null;
        currentNoiseType = null;
      }, 900);
    }
  },
  setVolume(vol) {
    const c = getAudioContext();
    if (!c || !noiseGain) return;
    const now = c.currentTime;
    const target = Math.max(0, Math.min(1, vol));
    noiseGain.gain.cancelScheduledValues(now);
    noiseGain.gain.setTargetAtTime(target, now, 0.1);
  }
};

window.addEventListener("ff:prefs", (e) => {
  if (e.detail && e.detail.key === "sfx" && sfxGain && ctx) {
    sfxGain.gain.value = e.detail.value ? 0.7 : 0.0;
  }
});
