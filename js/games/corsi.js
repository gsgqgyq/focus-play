/* corsi.js — Corsi Block-Tapping Task (科西视空间工作记忆方块)
   循证依据：神经心理学视空间工作记忆金标准及 Cogmed 核心干预范式（Corsi, 1972; Klingberg et al., 2005）。
   训练目标：针对 ADHD 显著受损的视空间工作台暂存容量（Visuospatial Sketchpad），
             通过非规律分布方块的正向序列复现与逆序倒背，强化大脑空间记忆广度与心理表征操纵能力。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

// 9 个非规则空间坐标分布（百分比），避免规律几何排列带来的语言编码作弊
const BLOCK_COORDS = [
  { top: 12, left: 16 },
  { top: 14, left: 74 },
  { top: 32, left: 44 },
  { top: 48, left: 18 },
  { top: 46, left: 78 },
  { top: 66, left: 46 },
  { top: 82, left: 14 },
  { top: 80, left: 72 },
  { top: 22, left: 24 }
];

export const corsi = {
  id: "corsi",
  min: 1,
  max: 9,
  icon: "🧩",
  nameKey: "corsi_t",
  descKey: "corsi_d",
  howKey: "how_corsi",
  scienceKey: "sci_corsi",

  start(host, { level, end }) {
    // 关卡设计：随着等级提升，序列长度增加；L4~L6, L8, L9 引入逆序倒背 (L9 达 8 格逆序极限)
    const isReverse = (level >= 4 && level <= 6) || level >= 8;
    const spanMap = { 1: 3, 2: 4, 3: 5, 4: 4, 5: 5, 6: 6, 7: 6, 8: 7, 9: 8 };
    const baseSpan = spanMap[level] || 4;
    const rounds = 5;

    host.innerHTML = `
      <div class="hud" style="margin-bottom:14px">
        <span>关卡 <b>L${level}</b></span>
        <span>记忆长度: <b>${baseSpan}</b></span>
        <span>模式: <b style="color:var(--accent)">${isReverse ? "🔄 逆序倒背" : "▶ 正序复现"}</b></span>
        <span data-c="round">回合 <b>1/${rounds}</b></span>
        <span data-c="hits">正确 <b>0</b></span>
      </div>

      <div class="corsi-arena" id="corsiArena">
        ${BLOCK_COORDS.map((c, i) => `
          <div class="corsi-block" data-idx="${i}" style="top:${c.top}%;left:${c.left}%"></div>
        `).join("")}
      </div>

      <div class="corsi-status" id="corsiStatus">准备好，观察方块点亮顺序...</div>

      <div class="play-controls">
        <button class="btn" id="corsiClearBtn">清空已选</button>
      </div>
    `;

    const blocks = host.querySelectorAll(".corsi-block");
    const statusEl = host.querySelector("#corsiStatus");
    const clearBtn = host.querySelector("#corsiClearBtn");
    const roundEl = host.querySelector('[data-c="round"] b');
    const hitsEl = host.querySelector('[data-c="hits"] b');

    let curRound = 0;
    let roundHits = 0;
    let targetSeq = [];
    let userSeq = [];
    let state = "idle"; // "showing" | "input" | "feedback"
    let running = true;

    const timeouts = [];
    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeouts.push(id);
      return id;
    };
    const clearTimeouts = () => timeouts.forEach(clearTimeout);

    function generateSequence(len) {
      const seq = [];
      const avail = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (let i = 0; i < len; i++) {
        // 尽量不重复前一个方块
        const choices = avail.filter(x => seq.length === 0 || x !== seq[seq.length - 1]);
        const pick = choices[Math.floor(Math.random() * choices.length)];
        seq.push(pick);
      }
      return seq;
    }

    function lightBlock(blockIdx, dur = 550) {
      const b = blocks[blockIdx];
      if (!b) return;
      b.classList.add("lit");
      sfx.tap();
      later(() => {
        b.classList.remove("lit");
      }, dur);
    }

    function playSequence(seq, onComplete) {
      state = "showing";
      statusEl.textContent = `仔细看！正在点亮 ${seq.length} 个方块...`;
      blocks.forEach(b => b.classList.remove("selected", "wrong-flash"));

      seq.forEach((blockIdx, i) => {
        later(() => {
          if (!running) return;
          lightBlock(blockIdx, 550);
        }, 800 + i * 850);
      });

      later(() => {
        if (!running) return;
        state = "input";
        statusEl.innerHTML = isReverse
          ? `👉 请<b>从后往前（倒序）</b>依次点击方块！`
          : `👉 请<b>按出现顺序（正序）</b>依次点击方块！`;
        if (onComplete) onComplete();
      }, 800 + seq.length * 850 + 200);
    }

    function startRound(r) {
      if (!running) return;
      if (r >= rounds) {
        finish();
        return;
      }
      curRound = r;
      userSeq = [];
      if (roundEl) roundEl.textContent = `${r + 1}/${rounds}`;
      targetSeq = generateSequence(baseSpan);
      playSequence(targetSeq);
    }

    function checkAnswer() {
      state = "feedback";
      const expected = isReverse ? [...targetSeq].reverse() : targetSeq;
      const isCorrect = userSeq.length === expected.length && userSeq.every((val, i) => val === expected[i]);

      if (isCorrect) {
        roundHits++;
        if (hitsEl) hitsEl.textContent = roundHits;
        sfx.correct();
        statusEl.innerHTML = `✨ <b>答对了！视空间记忆完美复现！</b>`;
      } else {
        sfx.wrong();
        statusEl.innerHTML = `❌ <b>顺序有偏差</b>，保持专注，准备下一回合！`;
        blocks.forEach(b => b.classList.add("wrong-flash"));
      }

      later(() => {
        if (!running) return;
        blocks.forEach(b => b.classList.remove("selected", "wrong-flash"));
        startRound(curRound + 1);
      }, 1400);
    }

    function handleBlockClick(idx) {
      if (!running || state !== "input") return;
      const b = blocks[idx];
      b.classList.add("lit");
      sfx.tap();
      later(() => b.classList.remove("lit"), 250);

      userSeq.push(idx);
      b.classList.add("selected");

      const expectedLen = targetSeq.length;
      if (userSeq.length >= expectedLen) {
        checkAnswer();
      }
    }

    blocks.forEach(b => {
      b.addEventListener("click", () => {
        handleBlockClick(parseInt(b.dataset.idx, 10));
      });
    });

    clearBtn.addEventListener("click", () => {
      if (state !== "input") return;
      sfx.click();
      userSeq = [];
      blocks.forEach(b => b.classList.remove("selected"));
    });

    function finish() {
      running = false;
      clearTimeouts();
      const pass = roundHits >= Math.ceil(rounds * 0.6); // 5 回合对 3 回合以上通关
      const score = roundHits * 35 * baseSpan + (isReverse ? 60 : 0);

      end({
        level,
        score,
        pass,
        ms: rounds * (baseSpan * 1500 + 4000),
        summary: {
          [t("hud_span")]: `${baseSpan}`,
          [t("hud_accuracy")]: `${Math.round((roundHits / rounds) * 100)}%`,
          [t("hud_mode")]: isReverse ? "逆序" : "正序"
        }
      });
    }

    later(() => startRound(0), 400);

    return {
      abort() {
        running = false;
        clearTimeouts();
      }
    };
  }
};
