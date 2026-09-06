/* plans.js — 靶向训练方案引擎 (针对 ADHD 核心卡点的一键式按需训练流) */
import { t } from "../i18n.js";
import { store } from "../state.js";
import { sfx } from "../audio.js";
import { navigateTo, openPlay } from "../app.js";
import { flanker } from "../games/flanker.js";
import { sart } from "../games/sart.js";
import { corsi } from "../games/corsi.js";
import { time_sense } from "../games/time_sense.js";
import { nback } from "../games/nback.js";
import { gonogo } from "../games/gonogo.js";

const GAME_MAP = { flanker, sart, corsi, time_sense, nback, gonogo };

export const TRAINING_PLANS = [
  {
    id: "beat_procrastination",
    icon: "🚀",
    titleKey: "plan_proc_title",
    subKey: "plan_proc_sub",
    tagKey: "plan_proc_tag",
    descKey: "plan_proc_desc",
    steps: [
      {
        type: "game",
        gameId: "time_sense",
        level: 1,
        nameKey: "plan_step_time_sense",
        descKey: "plan_step_time_sense_d"
      },
      {
        type: "timer",
        minutes: 5,
        nameKey: "plan_step_timer5",
        descKey: "plan_step_timer5_d"
      }
    ]
  },
  {
    id: "anti_distraction",
    icon: "⚡",
    titleKey: "plan_distract_title",
    subKey: "plan_distract_sub",
    tagKey: "plan_distract_tag",
    descKey: "plan_distract_desc",
    steps: [
      {
        type: "game",
        gameId: "sart",
        level: 1,
        nameKey: "plan_step_sart",
        descKey: "plan_step_sart_d"
      },
      {
        type: "game",
        gameId: "flanker",
        level: 1,
        nameKey: "plan_step_flanker",
        descKey: "plan_step_flanker_d"
      }
    ]
  },
  {
    id: "memory_booster",
    icon: "🧠",
    titleKey: "plan_mem_title",
    subKey: "plan_mem_sub",
    tagKey: "plan_mem_tag",
    descKey: "plan_mem_desc",
    steps: [
      {
        type: "game",
        gameId: "corsi",
        level: 1,
        nameKey: "plan_step_corsi",
        descKey: "plan_step_corsi_d"
      },
      {
        type: "game",
        gameId: "nback",
        level: 1,
        nameKey: "plan_step_nback",
        descKey: "plan_step_nback_d"
      }
    ]
  },
  {
    id: "calm_impulse",
    icon: "🛑",
    titleKey: "plan_impulse_title",
    subKey: "plan_impulse_sub",
    tagKey: "plan_impulse_tag",
    descKey: "plan_impulse_desc",
    steps: [
      {
        type: "game",
        gameId: "gonogo",
        level: 1,
        nameKey: "plan_step_gonogo",
        descKey: "plan_step_gonogo_d"
      },
      {
        type: "breathe",
        mode: "box",
        nameKey: "plan_step_breathe",
        descKey: "plan_step_breathe_d"
      }
    ]
  }
];

let activePlanState = null;

export function renderPlans(containerId = "homePlansGrid") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = TRAINING_PLANS.map(plan => `
    <article class="card plan-card" data-pid="${plan.id}">
      <div class="plan-card-top">
        <span class="plan-tag">${t(plan.tagKey)}</span>
        <span class="plan-icon">${plan.icon}</span>
      </div>
      <h3 class="plan-title">${t(plan.titleKey)}</h3>
      <p class="plan-sub">${t(plan.subKey)}</p>
      <div class="plan-steps-preview">
        ${plan.steps.map((s, i) => `
          <div class="plan-step-item">
            <span class="step-num">${i + 1}</span>
            <span class="step-label">${t(s.nameKey)}</span>
          </div>
        `).join("")}
      </div>
      <button class="btn primary plan-start-btn" data-start-plan="${plan.id}">
        ${t("plan_start_btn")}
      </button>
    </article>
  `).join("");

  container.querySelectorAll("[data-start-plan]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      sfx.click();
      startPlan(btn.dataset.startPlan);
    });
  });
}

export function startPlan(planId) {
  const plan = TRAINING_PLANS.find(p => p.id === planId);
  if (!plan) return;

  activePlanState = {
    plan,
    stepIndex: 0,
    startTime: Date.now()
  };

  showPlanBanner();
  runCurrentStep();
}

function runCurrentStep() {
  if (!activePlanState) return;
  const { plan, stepIndex } = activePlanState;
  const step = plan.steps[stepIndex];
  updatePlanBanner();

  if (step.type === "game") {
    const game = GAME_MAP[step.gameId];
    if (game) {
      openPlay(game, step.level || 1);
    }
  } else if (step.type === "timer") {
    navigateTo("timer");
    const chip = document.querySelector(`.timer-preset-chip[data-m="${step.minutes}"]`);
    if (chip) chip.click();
    setTimeout(() => {
      const startBtn = document.getElementById("timerStartBtn");
      if (startBtn && startBtn.style.display !== "none") {
        startBtn.focus();
      }
    }, 400);
  } else if (step.type === "breathe") {
    navigateTo("breathe");
    const modeBtn = document.querySelector(`.mode-btn[data-mid="${step.mode}"]`);
    if (modeBtn) modeBtn.click();
  }
}

// 监听游戏或呼吸完成事件
window.addEventListener("ff:record", (e) => {
  if (!activePlanState) return;
  const { plan, stepIndex } = activePlanState;
  const step = plan.steps[stepIndex];

  if (step.type === "game" && step.gameId === e.detail.gameId) {
    onStepComplete();
  } else if (step.type === "breathe" && e.detail.gameId === "breathe") {
    onStepComplete();
  }
});

// 监听计时器完成事件
window.addEventListener("ff:focus", () => {
  if (!activePlanState) return;
  const { plan, stepIndex } = activePlanState;
  const step = plan.steps[stepIndex];
  if (step.type === "timer") {
    onStepComplete();
  }
});

function onStepComplete() {
  if (!activePlanState) return;
  const { plan, stepIndex } = activePlanState;
  sfx.levelup();

  const isLastStep = stepIndex >= plan.steps.length - 1;

  let modal = document.getElementById("planStepModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "planStepModal";
    modal.className = "plan-step-modal";
    document.body.appendChild(modal);
  }

  if (isLastStep) {
    modal.innerHTML = `
      <div class="card psm-card">
        <div class="psm-icon">🎉</div>
        <h3>【${t(plan.titleKey)}】${t("plan_done_title")}</h3>
        <p>${t("plan_done_desc")}</p>
        <div class="psm-actions">
          <button class="btn primary big" id="psmFinishBtn">${t("plan_back_home")}</button>
        </div>
      </div>
    `;
    modal.classList.add("show");
    document.getElementById("psmFinishBtn").onclick = () => {
      sfx.click();
      modal.classList.remove("show");
      closePlanBanner();
      navigateTo("home");
    };
  } else {
    const currentStep = plan.steps[stepIndex];
    const nextStep = plan.steps[stepIndex + 1];
    modal.innerHTML = `
      <div class="card psm-card">
        <div class="psm-icon">✨</div>
        <h3>${t("plan_step_passed", { i: stepIndex + 1, total: plan.steps.length })}</h3>
        <p class="psm-sub">${t("plan_completed_step")}<b>${t(currentStep.nameKey)}</b></p>
        <div class="psm-next-box">
          <b>${t("plan_next_up")}</b>
          <span>${t(nextStep.nameKey)}</span>
          <small>${t(nextStep.descKey)}</small>
        </div>
        <div class="psm-actions">
          <button class="btn primary big" id="psmNextBtn">${t("plan_next_btn")}</button>
          <button class="btn" id="psmPauseBtn">${t("plan_pause_btn")}</button>
        </div>
      </div>
    `;
    modal.classList.add("show");
    document.getElementById("psmNextBtn").onclick = () => {
      sfx.click();
      modal.classList.remove("show");
      activePlanState.stepIndex++;
      runCurrentStep();
    };
    document.getElementById("psmPauseBtn").onclick = () => {
      sfx.click();
      modal.classList.remove("show");
      closePlanBanner();
    };
  }
}

function showPlanBanner() {
  let banner = document.getElementById("planBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "planBanner";
    banner.className = "plan-banner";
    document.body.appendChild(banner);
  }
  banner.style.display = "flex";
  updatePlanBanner();
}

function updatePlanBanner() {
  const banner = document.getElementById("planBanner");
  if (!banner || !activePlanState) return;
  const { plan, stepIndex } = activePlanState;
  const step = plan.steps[stepIndex];

  banner.innerHTML = `
    <div class="pb-left">
      <span class="pb-icon">${plan.icon}</span>
      <div class="pb-info">
        <span class="pb-title">${t("plan_running")}：${t(plan.titleKey)}</span>
        <span class="pb-step">${t("plan_step_n", { i: stepIndex + 1, total: plan.steps.length, name: t(step.nameKey) })}</span>
      </div>
    </div>
    <div class="pb-right">
      <button class="btn" id="pbExitBtn">${t("plan_exit")}</button>
    </div>
  `;

  document.getElementById("pbExitBtn").onclick = () => {
    sfx.click();
    closePlanBanner();
  };
}

function closePlanBanner() {
  activePlanState = null;
  const banner = document.getElementById("planBanner");
  if (banner) banner.style.display = "none";
}

window.addEventListener("ff:lang", () => {
  renderPlans("homePlansGrid");
  renderPlans("gamesPlansGrid");
  if (activePlanState) updatePlanBanner();
});
