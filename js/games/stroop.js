/* stroop.js — Stroop Color-Word Task (斯特鲁普字色冲突训练)
   循证依据：认知心理学经典冲突抑制与认知灵活性范式（Stroop, 1935; MacLeod, 1991）。
   训练目标：抑制自动化文字阅读反射，强化对墨水颜色的前瞻选择性注意；在高级别中加入规则切换，锻炼认知灵活性。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

const PALETTE = [
  { name: "红", en: "Red",    color: "#ff4d4f", key: "red" },
  { name: "绿", en: "Green",  color: "#52c41a", key: "green" },
  { name: "蓝", en: "Blue",   color: "#1890ff", key: "blue" },
  { name: "黄", en: "Yellow", color: "#faad14", key: "yellow" },
  { name: "紫", en: "Purple", color: "#722ed1", key: "purple" }
];

export const stroop = {
  id: "stroop",
  min: 1,
  max: 6,
  icon: "🎨",
  nameKey: "st_t",
  descKey: "st_d",
  howKey: "how_stroop",
  scienceKey: "sci_stroop",

  start(host, { level, end }) {
    const colorCount = Math.min(5, 3 + Math.floor((level - 1) / 2));
    const activeColors = PALETTE.slice(0, colorCount);
    const trials = 16 + level * 3;
    const windowMs = Math.max(900, 2200 - (level - 1) * 220);
    const hasSwitchRule = level >= 4; // L4 及以上加入随机规则切换（按字义 vs 按墨色）

    // 生成试次
    const seq = [];
    for (let i = 0; i < trials; i++) {
      const textItem = activeColors[Math.floor(Math.random() * activeColors.length)];
      // 70% 不一致
      const isIncongruent = Math.random() < 0.75;
      let inkItem = textItem;
      if (isIncongruent) {
        const others = activeColors.filter(c => c.key !== textItem.key);
        inkItem = others[Math.floor(Math.random() * others.length)];
      }

      // 规则：默认判断“墨水颜色”；切换关卡时有 30% 几率判断“文字字义”
      const rule = (hasSwitchRule && Math.random() < 0.35) ? "word" : "color";
      seq.push({ textItem, inkItem, isIncongruent, rule });
    }

    host.innerHTML = `
      <div class="hud" style="margin-bottom:14px">
        <span>关卡 <b>L${level}</b></span>
        <span data-c="hits">命中 <b>0</b></span>
        <span data-c="err">失误 <b>0</b></span>
        <span data-c="rt">平均反应 <b>—</b></span>
        <span data-c="prog" style="min-width:70px">1/${trials}</span>
      </div>

      <div class="stroop-rule-banner" id="stroopRuleBanner">
        当前任务：选择【墨水颜色】
      </div>

      <div class="stroop-arena">
        <div class="stroop-word" id="stroopWord">...</div>
      </div>

      <div class="stroop-opts" id="stroopOpts" style="grid-template-columns:repeat(${Math.min(activeColors.length, 4)}, 1fr)">
        ${activeColors.map(c => `
          <button class="btn evt-btn stroop-btn" data-ckey="${c.key}" style="border-bottom: 4px solid ${c.color}">
            <span class="stroop-btn-dot" style="background:${c.color}"></span>
            <span>${c.name}</span>
          </button>
        `).join("")}
      </div>
    `;

    const wordEl = host.querySelector("#stroopWord");
    const ruleEl = host.querySelector("#stroopRuleBanner");
    const optButtons = host.querySelectorAll(".stroop-btn");
    const hitsEl = host.querySelector('[data-c="hits"] b');
    const errEl = host.querySelector('[data-c="err"] b');
    const rtEl = host.querySelector('[data-c="rt"] b');
    const progEl = host.querySelector('[data-c="prog"]');

    let idx = 0;
    let hits = 0;
    let errors = 0;
    let totalRt = 0;
    let responded = false;
    let running = true;
    let trialStart = 0;

    let trialTimer = null;
    let stepTimer = null;
    function clearTimers() {
      if (trialTimer) { clearTimeout(trialTimer); trialTimer = null; }
      if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    }

    function updateHud() {
      if (hitsEl) hitsEl.textContent = hits;
      if (errEl) errEl.textContent = errors;
      if (rtEl) rtEl.textContent = hits > 0 ? `${Math.round(totalRt / hits)}ms` : "—";
      if (progEl) progEl.textContent = `${Math.min(idx + 1, trials)}/${trials}`;
    }

    function finish() {
      running = false;
      clearTimers();
      const avgRt = hits > 0 ? Math.round(totalRt / hits) : 999;
      const acc = Math.round((hits / trials) * 100);
      const pass = acc >= 72 && hits >= Math.round(trials * 0.7);
      const score = Math.max(0, Math.round(hits * 25 + Math.max(0, (1400 - avgRt) * 0.12) - errors * 12));

      end({
        level,
        score,
        pass,
        ms: totalRt,
        summary: {
          [t("hud_accuracy")]: `${acc}%`,
          [t("hud_avg_rt")]: `${avgRt}ms`,
          [t("hud_errors")]: errors
        }
      });
    }

    function showTrial(i) {
      if (!running) return;
      if (i >= trials) {
        finish();
        return;
      }
      clearTimers();
      idx = i;
      responded = false;
      updateHud();

      const cur = seq[i];
      if (ruleEl) {
        if (cur.rule === "word") {
          ruleEl.className = "stroop-rule-banner switch-word";
          ruleEl.innerHTML = `⚠️ 规则切换：请点击【<b>字面文字</b>】含义！`;
        } else {
          ruleEl.className = "stroop-rule-banner";
          ruleEl.innerHTML = `🎨 目标：忽略字义，点击【<b>墨水颜色</b>】！`;
        }
      }

      wordEl.textContent = cur.textItem.name;
      wordEl.style.color = cur.inkItem.color;
      trialStart = performance.now();

      trialTimer = setTimeout(() => {
        if (!running || responded) return;
        // 超时
        errors++;
        sfx.wrong();
        updateHud();
        stepTimer = setTimeout(() => showTrial(i + 1), 250);
      }, windowMs);
    }

    function handleChoice(ckey) {
      if (!running || responded) return;
      responded = true;
      // 关键修复：立即取消当前试次的超时倒计时！
      if (trialTimer) {
        clearTimeout(trialTimer);
        trialTimer = null;
      }

      const rt = performance.now() - trialStart;
      const cur = seq[idx];
      const correctKey = cur.rule === "word" ? cur.textItem.key : cur.inkItem.key;

      if (ckey === correctKey) {
        hits++;
        totalRt += rt;
        sfx.correct();
      } else {
        errors++;
        sfx.wrong();
      }

      updateHud();
      stepTimer = setTimeout(() => {
        if (!running) return;
        showTrial(idx + 1);
      }, 250);
    }

    optButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        handleChoice(btn.dataset.ckey);
      });
    });

    stepTimer = setTimeout(() => showTrial(0), 400);

    return {
      abort() {
        running = false;
        clearTimers();
      }
    };
  }
};
