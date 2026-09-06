/* time_sense.js — Time Reproduction Task (时间感知校准训练)
   循证依据：Barkley 博士 ADHD 执行功能与时间盲（Time Blindness）模型（Barkley, Murphy, & Bush, 2001）。
   训练目标：针对 ADHD 大脑多巴胺生物钟节律失调导致的时间近视与严重拖延，
             通过微秒级时间区间的目标感知与内源重现，校准身体与大脑对物理时间流逝的本体感受。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

const LEVEL_CONFIGS = [
  { minSec: 1.5, maxSec: 3.0, tolerance: 0.28 }, // L1
  { minSec: 2.5, maxSec: 4.5, tolerance: 0.24 }, // L2
  { minSec: 3.5, maxSec: 6.0, tolerance: 0.20 }, // L3
  { minSec: 4.0, maxSec: 7.5, tolerance: 0.18 }, // L4
  { minSec: 5.0, maxSec: 9.0, tolerance: 0.15 }, // L5
  { minSec: 6.0, maxSec: 12.0, tolerance: 0.12 } // L6 高精度挑战
];

export const time_sense = {
  id: "time_sense",
  min: 1,
  max: 6,
  icon: "⏳",
  nameKey: "time_sense_t",
  descKey: "time_sense_d",
  howKey: "how_time_sense",
  scienceKey: "sci_time_sense",

  start(host, { level, end }) {
    const cfg = LEVEL_CONFIGS[level - 1] || LEVEL_CONFIGS[0];
    const trials = 5;

    host.innerHTML = `
      <div class="hud" style="margin-bottom:14px">
        <span>关卡 <b>L${level}</b></span>
        <span>容差要求: <b>±${Math.round(cfg.tolerance * 100)}%</b></span>
        <span data-c="round">回合 <b>1/${trials}</b></span>
        <span data-c="accuracy">平均精准度 <b>—</b></span>
      </div>

      <div class="ts-arena">
        <div class="ts-orb-wrap">
          <div class="ts-orb" id="tsOrb">
            <span class="ts-orb-icon">✨</span>
          </div>
          <div class="ts-halo" id="tsHalo"></div>
        </div>
        <div class="ts-tip" id="tsTip">请观察发光持续时间...</div>
      </div>

      <div class="ts-meter-wrap" id="tsMeterWrap" style="display:none">
        <div class="ts-meter-bar">
          <div class="ts-meter-target" id="tsMeterTarget">目标</div>
          <div class="ts-meter-actual" id="tsMeterActual">你</div>
        </div>
        <div class="ts-meter-stats" id="tsMeterStats"></div>
      </div>

      <div class="play-controls">
        <button class="btn big primary ts-hold-btn" id="tsActionBtn" disabled>
          <span id="tsBtnText">等待发光结束...</span>
          <span class="btn-keycap">[按住空格] 或 触控按住</span>
        </button>
      </div>
    `;

    const orb = host.querySelector("#tsOrb");
    const halo = host.querySelector("#tsHalo");
    const tip = host.querySelector("#tsTip");
    const meterWrap = host.querySelector("#tsMeterWrap");
    const meterActual = host.querySelector("#tsMeterActual");
    const meterStats = host.querySelector("#tsMeterStats");
    const actionBtn = host.querySelector("#tsActionBtn");
    const btnText = host.querySelector("#tsBtnText");
    const roundEl = host.querySelector('[data-c="round"] b');
    const accEl = host.querySelector('[data-c="accuracy"] b');

    let curTrial = 0;
    let targetMs = 0;
    let pressStart = 0;
    let isHolding = false;
    let state = "idle"; // "sample" | "ready" | "holding" | "feedback"
    let running = true;
    let precisions = [];

    const timeouts = [];
    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeouts.push(id);
      return id;
    };
    const clearTimeouts = () => timeouts.forEach(clearTimeout);

    function startTrial(idx) {
      if (!running) return;
      if (idx >= trials) {
        finish();
        return;
      }
      curTrial = idx;
      if (roundEl) roundEl.textContent = `${idx + 1}/${trials}`;
      meterWrap.style.display = "none";
      actionBtn.disabled = true;
      btnText.textContent = "仔细感受发光时长...";

      // 随机目标时间
      const sec = cfg.minSec + Math.random() * (cfg.maxSec - cfg.minSec);
      targetMs = Math.round(sec * 10) * 100; // 0.1s 精度

      state = "sample";
      tip.innerHTML = `👂 <b>第 ${idx + 1} 回合</b>：闭上眼或凝视光球，用心感受它亮起的时长...`;

      // 演示刺激
      later(() => {
        if (!running) return;
        orb.classList.add("glowing");
        halo.classList.add("active");
        sfx.tick();

        later(() => {
          if (!running) return;
          orb.classList.remove("glowing");
          halo.classList.remove("active");

          // 进入重现准备状态
          later(() => {
            if (!running) return;
            state = "ready";
            actionBtn.disabled = false;
            btnText.textContent = "按住不放，时间到时松开！";
            tip.innerHTML = `👉 轮到你了！<b>按住按钮不放</b>，凭感觉重现刚才的时长，感觉够了就松开！`;
          }, 800);
        }, targetMs);
      }, 700);
    }

    function onHoldStart() {
      if (!running || state !== "ready" || isHolding) return;
      isHolding = true;
      state = "holding";
      pressStart = performance.now();
      orb.classList.add("glowing");
      halo.classList.add("active");
      sfx.tap();
      btnText.textContent = "松开即提交...";
    }

    function onHoldEnd() {
      if (!running || state !== "holding" || !isHolding) return;
      isHolding = false;
      state = "feedback";
      actionBtn.disabled = true;
      orb.classList.remove("glowing");
      halo.classList.remove("active");

      const reproducedMs = performance.now() - pressStart;
      const diffMs = reproducedMs - targetMs;
      const errRatio = Math.abs(diffMs) / targetMs;
      const precision = Math.max(0, Math.round((1 - errRatio) * 100));
      precisions.push(precision);

      if (accEl) {
        const meanAcc = Math.round(precisions.reduce((a, b) => a + b, 0) / precisions.length);
        accEl.textContent = `${meanAcc}%`;
      }

      // 反馈可视化
      meterWrap.style.display = "block";
      const targetSec = (targetMs / 1000).toFixed(2);
      const actualSec = (reproducedMs / 1000).toFixed(2);
      const diffSec = (Math.abs(diffMs) / 1000).toFixed(2);

      const isOver = diffMs > 0;
      const isPassed = errRatio <= cfg.tolerance;

      if (isPassed) {
        sfx.correct();
        tip.innerHTML = `🎯 <b>极佳的内源时间校准！偏差仅 ${diffSec}s</b>`;
      } else {
        sfx.wrong();
        tip.innerHTML = isOver
          ? `⏰ <b>偏慢了 (+${diffSec}s)</b>：你的生物钟走得比实际慢`
          : `⚡ <b>偏快了 (-${diffSec}s)</b>：你的大脑感到时间漫长，提前松开了`;
      }

      meterStats.innerHTML = `
        <span>目标: <b>${targetSec}s</b></span>
        <span>你的重现: <b>${actualSec}s</b></span>
        <span>精准度: <b style="color:${isPassed ? 'var(--ok)' : 'var(--warn)'}">${precision}%</b></span>
      `;

      later(() => {
        if (!running) return;
        startTrial(curTrial + 1);
      }, 2400);
    }

    // 鼠标与触控事件
    actionBtn.addEventListener("mousedown", onHoldStart);
    actionBtn.addEventListener("mouseup", onHoldEnd);
    actionBtn.addEventListener("touchstart", (e) => { e.preventDefault(); onHoldStart(); }, { passive: false });
    actionBtn.addEventListener("touchend", (e) => { e.preventDefault(); onHoldEnd(); }, { passive: false });

    // 键盘空格事件
    const keydownHandler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        onHoldStart();
      }
    };
    const keyupHandler = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        onHoldEnd();
      }
    };
    window.addEventListener("keydown", keydownHandler);
    window.addEventListener("keyup", keyupHandler);

    function finish() {
      running = false;
      clearTimeouts();
      const avgPrec = Math.round(precisions.reduce((a, b) => a + b, 0) / precisions.length);
      const pass = avgPrec >= Math.round((1 - cfg.tolerance) * 100);
      const score = Math.max(0, avgPrec * 12 + (pass ? 80 : 0));

      end({
        level,
        score,
        pass,
        ms: targetMs * trials,
        summary: {
          [t("hud_precision")]: `${avgPrec}%`,
          [t("hud_tolerance")]: `±${Math.round(cfg.tolerance * 100)}%`
        }
      });
    }

    later(() => startTrial(0), 400);

    return {
      abort() {
        running = false;
        clearTimeouts();
        window.removeEventListener("keydown", keydownHandler);
        window.removeEventListener("keyup", keyupHandler);
      }
    };
  }
};
