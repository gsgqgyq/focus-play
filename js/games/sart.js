/* sart.js — Sustained Attention to Response Task (SART 持续注意警觉训练)
   循证依据：临床经典连续操作测验（Robertson et al., 1997; Conners CPT / TOVA）。
   训练目标：针对 ADHD 默认网络（DMN）易侵入导致的“神游走神（Mind-wandering）”与冲动惯性点击，
             在高度重复的常规刺激中保持警觉，在罕见靶标（数字 3）出现时紧急踩下刹车。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

export const sart = {
  id: "sart",
  min: 1,
  max: 9,
  icon: "👁️",
  nameKey: "sart_t",
  descKey: "sart_d",
  howKey: "how_sart",
  scienceKey: "sci_sart",

  start(host, { level, end }) {
    const trials = 24 + level * 5;
    // 刺激呈现时间与间隔 (随着关卡递增加快，L9 达到 160ms/300ms 快速警觉抑制)
    const stimMs = Math.max(160, 520 - (level - 1) * 42);
    const maskMs = Math.max(300, 800 - (level - 1) * 58);

    // 预先生成序列：数字 1~9，其中约 15%~18% 为数字 3 (No-Go 靶标)
    const seq = [];
    for (let i = 0; i < trials; i++) {
      let digit;
      if (Math.random() < 0.18 && i > 1 && seq[i - 1] !== 3) {
        digit = 3; // 禁按目标
      } else {
        const pool = [1, 2, 4, 5, 6, 7, 8, 9];
        digit = pool[Math.floor(Math.random() * pool.length)];
      }
      seq.push(digit);
    }
    // 确保至少有 3 个以上的 3
    let count3 = seq.filter(x => x === 3).length;
    while (count3 < 3) {
      const idx = 3 + Math.floor(Math.random() * (trials - 4));
      if (seq[idx] !== 3) {
        seq[idx] = 3;
        count3++;
      }
    }

    host.innerHTML = `
      <div class="hud" style="margin-bottom:16px">
        <span>关卡 <b>L${level}</b></span>
        <span data-c="goHits">常规命中 <b>0</b></span>
        <span data-c="commErr" class="lives">误点 3: <b>0</b></span>
        <span data-c="omitErr">漏按: <b>0</b></span>
        <span data-c="prog" style="min-width:70px">1/${trials}</span>
      </div>

      <div class="sart-arena">
        <div class="sart-stimulus" id="sartStim"></div>
        <div class="sart-mask" id="sartMask" style="display:none">⊗</div>
      </div>

      <div class="sart-cue-note">
        ${t("sart_tip")}
      </div>

      <div class="play-controls">
        <button class="btn big primary sart-tap-btn" id="sartTapBtn">
          <span>⚡ 按下响应 (除 3 以外所有数字)</span>
          <span class="btn-keycap">[空格] 或 点击</span>
        </button>
      </div>
    `;

    const stimEl = host.querySelector("#sartStim");
    const maskEl = host.querySelector("#sartMask");
    const tapBtn = host.querySelector("#sartTapBtn");

    let idx = 0;
    let goHits = 0;
    let commissionErrors = 0; // 该停没停点在 3 上（冲动失控）
    let omissionErrors = 0;   // 常规数字没按（注意力神游走神）
    let totalGoRt = 0;
    let respondedInTrial = false;
    let running = true;
    let trialStart = 0;

    const timeouts = [];
    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeouts.push(id);
      return id;
    };
    const clearTimeouts = () => timeouts.forEach(clearTimeout);

    function updateHud() {
      const gEl = host.querySelector('[data-c="goHits"] b');
      const cEl = host.querySelector('[data-c="commErr"] b');
      const oEl = host.querySelector('[data-c="omitErr"] b');
      const progEl = host.querySelector('[data-c="prog"]');
      if (gEl) gEl.textContent = goHits;
      if (cEl) cEl.textContent = commissionErrors;
      if (oEl) oEl.textContent = omissionErrors;
      if (progEl) progEl.textContent = `${Math.min(idx + 1, trials)}/${trials}`;
    }

    function finish() {
      running = false;
      clearTimeouts();
      const totalGo = seq.filter(x => x !== 3).length;
      const totalNoGo = seq.filter(x => x === 3).length;

      const goAcc = totalGo > 0 ? Math.round((goHits / totalGo) * 100) : 100;
      const noGoInhibitRate = totalNoGo > 0 ? Math.round(((totalNoGo - commissionErrors) / totalNoGo) * 100) : 100;
      const avgRt = goHits > 0 ? Math.round(totalGoRt / goHits) : 500;

      // 通关标准：成功抑制 3 且漏按率低于 25%
      const pass = commissionErrors <= Math.max(1, Math.floor(totalNoGo * 0.35)) && omissionErrors <= Math.floor(totalGo * 0.25);
      const score = Math.max(0, Math.round(goHits * 15 + (totalNoGo - commissionErrors) * 60 - commissionErrors * 40 - omissionErrors * 15));

      end({
        level,
        score,
        pass,
        ms: totalGoRt,
        summary: {
          [t("hud_nogo_inhibit")]: `${noGoInhibitRate}%`,
          [t("hud_go_accuracy")]: `${goAcc}%`,
          [t("hud_avg_rt")]: `${avgRt}ms`
        }
      });
    }

    function showTrial(i) {
      if (!running) return;
      if (i >= trials) {
        finish();
        return;
      }
      idx = i;
      respondedInTrial = false;
      updateHud();

      const num = seq[i];
      stimEl.textContent = num;
      stimEl.className = "sart-stimulus";
      // 随机轻微变化字号增强抗干扰
      const fontSize = 72 + (num % 4) * 8;
      stimEl.style.fontSize = `${fontSize}px`;
      stimEl.style.display = "block";
      maskEl.style.display = "none";

      trialStart = performance.now();

      // 数字展示 stimMs 毫秒，随后进入掩蔽态 maskMs
      later(() => {
        if (!running) return;
        stimEl.style.display = "none";
        maskEl.style.display = "block";

        // 掩蔽态结束检查该试次结果
        later(() => {
          if (!running) return;
          if (num === 3) {
            // No-Go 试次：没按说明成功抑制！
            if (!respondedInTrial) {
              sfx.correct();
            }
          } else {
            // 常规 Go 试次：没按说明神游漏点
            if (!respondedInTrial) {
              omissionErrors++;
              sfx.wrong();
            }
          }
          updateHud();
          showTrial(i + 1);
        }, maskMs);
      }, stimMs);
    }

    function handleTap() {
      if (!running || respondedInTrial) return;
      respondedInTrial = true;
      const rt = performance.now() - trialStart;
      const num = seq[idx];

      if (num === 3) {
        // 冲动犯错：在 3 上按下了！
        commissionErrors++;
        sfx.wrong();
        stimEl.classList.add("error-pulse");
      } else {
        // 正确敲击
        goHits++;
        totalGoRt += rt;
        sfx.tap();
      }

      tapBtn.style.transform = "scale(0.96)";
      setTimeout(() => tapBtn.style.transform = "", 100);
      updateHud();
    }

    tapBtn.addEventListener("click", () => handleTap());

    const keyHandler = (e) => {
      if (e.code === "Space" || e.code === "KeyJ" || e.code === "Enter") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", keyHandler);

    later(() => showTrial(0), 500);

    return {
      abort() {
        running = false;
        clearTimeouts();
        window.removeEventListener("keydown", keyHandler);
      }
    };
  }
};
