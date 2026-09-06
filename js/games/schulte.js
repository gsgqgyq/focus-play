/* schulte.js — Schulte Grid (舒尔特方格周边视野与注意广度训练)
   循证依据：航空航天与临床心理学注意分配经典测量工具。
   训练目标：扩展周边视觉注意广度，加速视觉目标搜索效率，减少在密集信息环境下的迷失感。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

const LEVEL_CONFIG = [
  { size: 3, max: 9,  reverse: false, shuffle: false }, // L1: 3x3 (1-9)
  { size: 4, max: 16, reverse: false, shuffle: false }, // L2: 4x4 (1-16)
  { size: 5, max: 25, reverse: false, shuffle: false }, // L3: 5x5 (1-25)
  { size: 5, max: 25, reverse: true,  shuffle: false }, // L4: 5x5 倒序 (25-1)
  { size: 5, max: 25, reverse: false, shuffle: true  }, // L5: 5x5 动态重排 (每5个打乱一次)
  { size: 6, max: 36, reverse: false, shuffle: false }  // L6: 6x6 (1-36)
];

export const schulte = {
  id: "schulte",
  min: 1,
  max: 6,
  icon: "🔢",
  nameKey: "s_t",
  descKey: "s_d",
  howKey: "how_schulte",
  scienceKey: "sci_schulte",

  start(host, { level, end }) {
    const cfg = LEVEL_CONFIG[level - 1] || LEVEL_CONFIG[0];
    const total = cfg.max;
    const targetSeq = Array.from({ length: total }, (_, i) => i + 1);
    if (cfg.reverse) targetSeq.reverse();

    let curTargetIdx = 0;
    let errors = 0;
    let running = true;
    let t0 = performance.now();
    let timerIv = null;

    // 生成乱序数组
    let numbers = [...targetSeq].sort(() => Math.random() - 0.5);

    host.innerHTML = `
      <div class="hud" style="margin-bottom:14px">
        <span>关卡 <b>L${level}</b></span>
        <span>当前寻找: <b id="schNextNum" style="color:var(--accent);font-size:1.3rem">${targetSeq[0]}</b></span>
        <span data-c="err">失误 <b>0</b></span>
        <span data-c="time">用时 <b>0.0s</b></span>
      </div>

      <div class="schulte-table" id="schTable" style="grid-template-columns:repeat(${cfg.size}, 1fr)">
      </div>

      <div class="schulte-tip">
        ${cfg.reverse ? "⚠️ 本关为倒序挑战（从最大数字点到 1）！" : (cfg.shuffle ? "⚠️ 动态扰动：每点击 5 个数字方格将重排！" : "视线尽量保持在方格中心，运用余光搜寻目标数字。")}
      </div>
    `;

    const table = host.querySelector("#schTable");
    const nextEl = host.querySelector("#schNextNum");
    const errEl = host.querySelector('[data-c="err"] b');
    const timeEl = host.querySelector('[data-c="time"] b');

    function renderGrid() {
      table.innerHTML = numbers.map(n => `
        <button class="st-cell ${isPassed(n) ? 'done' : ''}" data-n="${n}">
          ${n}
        </button>
      `).join("");

      table.querySelectorAll(".st-cell").forEach(btn => {
        btn.addEventListener("click", () => {
          const val = parseInt(btn.dataset.n, 10);
          handleCellClick(val, btn);
        });
      });
    }

    function isPassed(n) {
      const idxInSeq = targetSeq.indexOf(n);
      return idxInSeq < curTargetIdx;
    }

    function handleCellClick(val, btn) {
      if (!running) return;
      const expected = targetSeq[curTargetIdx];

      if (val === expected) {
        // 点击正确
        sfx.tap();
        btn.classList.add("done");
        curTargetIdx++;

        if (cfg.shuffle && curTargetIdx % 5 === 0 && curTargetIdx < total) {
          numbers = numbers.sort(() => Math.random() - 0.5);
          renderGrid();
        }

        if (curTargetIdx >= total) {
          finish();
          return;
        }

        if (nextEl) nextEl.textContent = targetSeq[curTargetIdx];
      } else {
        // 点击错误
        errors++;
        if (errEl) errEl.textContent = errors;
        sfx.wrong();
        btn.classList.add("wrong");
        setTimeout(() => btn.classList.remove("wrong"), 280);
      }
    }

    function finish() {
      running = false;
      clearInterval(timerIv);
      const elapsedMs = performance.now() - t0;
      const sec = (elapsedMs / 1000).toFixed(1);

      // 通关标准：在合理时间内完成（每格平均 < 1.8s）
      const maxAllowedSec = total * 1.8;
      const pass = (elapsedMs / 1000) <= maxAllowedSec && errors <= 6;
      const score = Math.max(0, Math.round(total * 40 - (elapsedMs / 1000) * 8 - errors * 15));

      sfx.correct();
      end({
        level,
        score,
        pass,
        ms: elapsedMs,
        summary: {
          [t("hud_time")]: `${sec}s`,
          [t("hud_errors")]: errors,
          [t("hud_speed")]: `${(elapsedMs / total).toFixed(0)}ms/格`
        }
      });
    }

    renderGrid();
    timerIv = setInterval(() => {
      if (!running) return;
      const curSec = ((performance.now() - t0) / 1000).toFixed(1);
      if (timeEl) timeEl.textContent = `${curSec}s`;
    }, 100);

    return {
      abort() {
        running = false;
        clearInterval(timerIv);
      }
    };
  }
};
