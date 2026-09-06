/* flanker.js — Eriksen Flanker Task (弗兰克抗干扰箭头训练)
   循证依据：认知心理学抗干扰金标准（Eriksen, 1974; Mullane et al., 2009）。
   训练目标：针对 ADHD 患者前扣带回（ACC）冲突检测与选择性注意抑制缺陷，训练迅速过滤两侧干扰噪声、准确锁定中央目标。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

export const flanker = {
  id: "flanker",
  min: 1,
  max: 6,
  icon: "🎯",
  nameKey: "flanker_t",
  descKey: "flanker_d",
  howKey: "how_flanker",
  scienceKey: "sci_flanker",

  start(host, { level, end }) {
    const trials = 16 + level * 4;
    // 关卡参数：反应时间窗口与干扰难度
    const windowMs = Math.max(700, 1800 - (level - 1) * 180);
    const incongruentRate = Math.min(0.75, 0.4 + (level - 1) * 0.07);

    // 预生成序列
    const seq = [];
    for (let i = 0; i < trials; i++) {
      const targetDir = Math.random() < 0.5 ? "left" : "right"; // "left" or "right"
      const isIncongruent = Math.random() < incongruentRate;
      const flankerDir = isIncongruent ? (targetDir === "left" ? "right" : "left") : targetDir;
      seq.push({ targetDir, flankerDir, isIncongruent });
    }

    host.innerHTML = `
      <div class="hud" style="margin-bottom:16px">
        <span>关卡 <b>L${level}</b></span>
        <span data-c="hits">命中 <b>0</b></span>
        <span data-c="err">失误 <b>0</b></span>
        <span data-c="rt">平均反应 <b>—</b></span>
        <span data-c="prog" style="min-width:70px">1/${trials}</span>
      </div>

      <div class="flanker-arena">
        <div class="flanker-stimulus" id="flankerStim">
          <span class="flanker-arrow flanker-side"></span>
          <span class="flanker-arrow flanker-side"></span>
          <span class="flanker-arrow flanker-center"></span>
          <span class="flanker-arrow flanker-side"></span>
          <span class="flanker-arrow flanker-side"></span>
        </div>
        <div class="flanker-fixation" id="flankerFix">+</div>
      </div>

      <div class="flanker-cue-note">${t("flanker_tip")}</div>

      <div class="play-controls flanker-actions">
        <button class="btn big flanker-btn" id="flankerLeftBtn" data-dir="left">
          <span class="btn-arrow">←</span>
          <span class="btn-keycap">[←] 或 [A]</span>
        </button>
        <button class="btn big flanker-btn primary" id="flankerRightBtn" data-dir="right">
          <span class="btn-arrow">→</span>
          <span class="btn-keycap">[→] 或 [D]</span>
        </button>
      </div>
    `;

    const stimBox = host.querySelector("#flankerStim");
    const fixEl = host.querySelector("#flankerFix");
    const arrows = host.querySelectorAll(".flanker-arrow");
    const centerArrow = host.querySelector(".flanker-center");
    const leftBtn = host.querySelector("#flankerLeftBtn");
    const rightBtn = host.querySelector("#flankerRightBtn");

    let idx = 0;
    let hits = 0;
    let errors = 0;
    let totalRt = 0;
    let congRt = [];
    let incongRt = [];
    let responded = false;
    let running = true;
    let stimStart = 0;

    let trialTimer = null;
    let stepTimer = null;
    function clearTimers() {
      if (trialTimer) { clearTimeout(trialTimer); trialTimer = null; }
      if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    }

    function updateHud() {
      const hEl = host.querySelector('[data-c="hits"] b');
      const eEl = host.querySelector('[data-c="err"] b');
      const rtEl = host.querySelector('[data-c="rt"] b');
      const progEl = host.querySelector('[data-c="prog"]');
      if (hEl) hEl.textContent = hits;
      if (eEl) eEl.textContent = errors;
      if (rtEl) rtEl.textContent = hits > 0 ? `${Math.round(totalRt / hits)}ms` : "—";
      if (progEl) progEl.textContent = `${Math.min(idx + 1, trials)}/${trials}`;
    }

    function finish() {
      running = false;
      clearTimers();
      const avgRt = hits > 0 ? Math.round(totalRt / hits) : 999;
      const acc = Math.round((hits / trials) * 100);
      const meanCong = congRt.length ? Math.round(congRt.reduce((a, b) => a + b, 0) / congRt.length) : avgRt;
      const meanIncong = incongRt.length ? Math.round(incongRt.reduce((a, b) => a + b, 0) / incongRt.length) : avgRt;
      const conflictCost = Math.max(0, meanIncong - meanCong); // 冲突干扰损耗

      // 通关条件：正确率 >= 75% 且平均反应时在合理阈值内
      const pass = acc >= 75 && hits >= Math.round(trials * 0.7);
      const score = Math.max(0, Math.round(hits * 25 + Math.max(0, (1200 - avgRt) * 0.15) - errors * 10));

      end({
        level,
        score,
        pass,
        ms: totalRt,
        summary: {
          [t("hud_accuracy")]: `${acc}%`,
          [t("hud_avg_rt")]: `${avgRt}ms`,
          [t("hud_conflict_cost")]: `${conflictCost}ms`
        }
      });
    }

    function showTrial(i) {
      if (!running) return;
      if (i >= trials) {
        finish();
        return;
      }
      clearTimers(); // 清理旧定时器，杜绝试次时间重叠！
      idx = i;
      responded = false;
      updateHud();

      // 先显示注视点 (+) 350ms
      stimBox.style.display = "none";
      fixEl.style.display = "block";

      stepTimer = setTimeout(() => {
        if (!running) return;
        fixEl.style.display = "none";
        stimBox.style.display = "flex";

        const cur = seq[i];
        const arrowGlyph = dir => (dir === "left" ? "‹" : "›");

        // 渲染箭头
        arrows.forEach((el, index) => {
          const isCenter = index === 2;
          const dir = isCenter ? cur.targetDir : cur.flankerDir;
          el.textContent = arrowGlyph(dir);
          el.className = `flanker-arrow ${isCenter ? 'flanker-center' : 'flanker-side'}`;
          if (level >= 4 && !isCenter) {
            el.classList.add("jitter");
          }
        });

        stimStart = performance.now();

        // 反应时间窗口结束 (超时判定)
        trialTimer = setTimeout(() => {
          if (!running || responded) return;
          errors++;
          sfx.wrong();
          stimBox.style.display = "none";
          updateHud();
          stepTimer = setTimeout(() => showTrial(i + 1), 300);
        }, windowMs);
      }, 350);
    }

    function handleResponse(dir) {
      if (!running || responded || stimBox.style.display === "none") return;
      responded = true;
      // 关键修复：立即销毁超时定时器，绝不让上一个试次的超时触发下一个试次！
      if (trialTimer) {
        clearTimeout(trialTimer);
        trialTimer = null;
      }

      const rt = performance.now() - stimStart;
      const cur = seq[idx];

      if (dir === cur.targetDir) {
        hits++;
        totalRt += rt;
        if (cur.isIncongruent) incongRt.push(rt);
        else congRt.push(rt);
        sfx.correct();
      } else {
        errors++;
        sfx.wrong();
      }

      stimBox.style.display = "none";
      updateHud();

      // 试次间保持 300ms 缓冲，确保节奏清晰稳定
      stepTimer = setTimeout(() => {
        showTrial(idx + 1);
      }, 300);
    }

    leftBtn.addEventListener("click", () => {
      sfx.click();
      handleResponse("left");
    });
    rightBtn.addEventListener("click", () => {
      sfx.click();
      handleResponse("right");
    });

    const keyHandler = (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        handleResponse("left");
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        handleResponse("right");
      }
    };
    window.addEventListener("keydown", keyHandler);

    stepTimer = setTimeout(() => showTrial(0), 400);

    return {
      abort() {
        running = false;
        clearTimers();
        window.removeEventListener("keydown", keyHandler);
      }
    };
  }
};
