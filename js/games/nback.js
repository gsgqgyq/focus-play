/* nback.js — Dual / Spatial N-back (双通道与空间工作记忆动态更新)
   循证依据：工作记忆前额叶可塑性经典范式（Jaeggi et al., 2008; Klingberg Cogmed）。
   训练目标：针对 ADHD 容易“大脑宕机、前一秒想做后一秒就忘”的工作记忆刷新障碍，
             持续追踪并比对前 N 步的位置与字母刺激，锻炼背外侧前额叶（dlPFC）信息流刷新与暂存。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";
import { voice } from "../voice.js";
import { store } from "../state.js";

const COLS = 3;
const STIM_MS = 800;
const WINDOW_MS = 2800;
const LETTERS = ["C", "H", "K", "L", "Q", "R", "S", "T"];

function buildSeq(N, trials) {
  const pos = new Array(trials);
  const letIdx = new Array(trials);
  for (let i = 0; i < trials; i++) {
    pos[i] = Math.floor(Math.random() * 9);
    letIdx[i] = Math.floor(Math.random() * LETTERS.length);
  }
  // 注入约 33% 的匹配对
  for (let k = 0; k < Math.round(trials * 0.35); k++) {
    const i = N + Math.floor(Math.random() * (trials - N));
    if (k % 2 === 0) {
      pos[i] = pos[i - N]; // 位置匹配
    } else {
      letIdx[i] = letIdx[i - N]; // 字母匹配
    }
  }
  return { pos, letIdx };
}

export const nback = {
  id: "nback",
  min: 1,
  max: 9,
  icon: "🧠",
  nameKey: "n_t",
  descKey: "n_d",
  howKey: "how_nback",
  scienceKey: "sci_nback",

  start(host, { level, end }) {
    const nMap = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 4 };
    const paceMap = { 1: 3000, 2: 2600, 3: 3000, 4: 2600, 5: 2200, 6: 2600, 7: 2200, 8: 1900, 9: 2200 };
    const N = nMap[level] || Math.min(4, Math.max(1, Math.ceil(level / 2)));
    const windowMs = paceMap[level] || 2500;
    const trials = 16 + N * 4;
    const seq = buildSeq(N, trials);
    const dual = store.getPref("nbackCue", true); // 默认开启双通道，更具临床实证效果

    host.innerHTML = `
      <div class="hud" style="margin-bottom:16px">
        <span>步数 <b>N=${N}</b></span>
        <span data-c="hits">命中 <b>0</b></span>
        <span data-c="miss">遗漏 <b>0</b></span>
        <span data-c="fa">误报 <b>0</b></span>
        <span data-c="acc">准确率 <b>—</b></span>
        <span data-c="prog" style="min-width:70px">1/${trials}</span>
        <button id="nbackDualToggle" class="pill-btn" style="padding:4px 8px;font-size:0.78rem">
          ${dual ? "🔊 声音通道: 开" : "🔇 声音通道: 关"}
        </button>
      </div>

      <div class="nb-grid" style="grid-template-columns:repeat(${COLS},1fr);width:min(72vw,300px);margin:0 auto">
        ${Array(COLS * COLS).fill(`<div class="nb-cell"></div>`).join("")}
      </div>

      <div class="nb-turn-info" data-c="turn" style="text-align:center;color:var(--muted);padding:12px 0 6px">
        第 1 步 (请记忆...)
      </div>

      <div class="play-controls">
        <button class="btn big primary match-btn" id="nbPosMatchBtn" style="flex:1;min-width:130px">
          <span>🟰 位置匹配</span>
          <span class="btn-keycap">[空格] 或 [J]</span>
        </button>
        ${dual ? `
          <button class="btn big match-btn" id="nbLetMatchBtn" style="flex:1;min-width:130px;background:var(--bg3)">
            <span>🔤 字母匹配</span>
            <span class="btn-keycap">[K] 或 [L]</span>
          </button>
        ` : ""}
      </div>
    `;

    const cells = [...host.querySelectorAll(".nb-cell")];
    const posBtn = host.querySelector("#nbPosMatchBtn");
    const letBtn = host.querySelector("#nbLetMatchBtn");
    const turnEl = host.querySelector('[data-c="turn"]');
    const progEl = host.querySelector('[data-c="prog"]');
    const hitsEl = host.querySelector('[data-c="hits"] b');
    const missEl = host.querySelector('[data-c="miss"] b');
    const faEl = host.querySelector('[data-c="fa"] b');
    const accEl = host.querySelector('[data-c="acc"] b');
    const dualToggle = host.querySelector("#nbackDualToggle");

    let hits = 0;
    let miss = 0;
    let fa = 0;
    let lHits = 0;
    let lMiss = 0;
    let lFa = 0;
    let posResponded = false;
    let letResponded = false;
    let running = true;
    let curIdx = 0;

    const t0 = performance.now();
    const timeouts = [];
    const later = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timeouts.push(id);
      return id;
    };
    const clearTimeouts = () => timeouts.forEach(clearTimeout);

    const isPosTarget = i => i >= N && seq.pos[i] === seq.pos[i - N];
    const isLetTarget = i => i >= N && seq.letIdx[i] === seq.letIdx[i - N];

    function calcAcc() {
      const denom = hits + fa;
      return denom ? Math.round((100 * hits) / denom) : (fa ? 0 : 100);
    }

    function updateHud() {
      if (hitsEl) hitsEl.textContent = hits + (dual ? lHits : 0);
      if (missEl) missEl.textContent = miss + (dual ? lMiss : 0);
      if (faEl) faEl.textContent = fa + (dual ? lFa : 0);
      if (accEl) accEl.textContent = `${calcAcc()}%`;
      if (progEl) progEl.textContent = `${Math.min(curIdx + 1, trials)}/${trials}`;
    }

    function finish() {
      running = false;
      clearTimeouts();
      const a = calcAcc();
      const pass = a >= 60 && hits >= 2;
      const score = Math.max(0, (hits + lHits) * 20 - (fa + lFa) * 12 + (pass ? 50 : 0));

      end({
        level: N,
        score,
        pass,
        ms: performance.now() - t0,
        summary: {
          [t("hud_accuracy")]: `${a}%`,
          [t("hud_hits")]: hits + (dual ? lHits : 0),
          [t("hud_miss")]: miss + (dual ? lMiss : 0),
          [t("hud_false_alarms")]: fa + (dual ? lFa : 0)
        }
      });
    }

    function present(i) {
      if (!running) return;
      if (i >= trials) {
        finish();
        return;
      }
      curIdx = i;
      posResponded = false;
      letResponded = false;

      if (turnEl) {
        turnEl.textContent = i < N
          ? `第 ${i + 1} 步 (正在建立前 ${N} 步基准记忆...)`
          : `第 ${i + 1} 步：它与第 ${i + 1 - N} 步一致吗？`;
      }
      updateHud();

      // 点亮位置
      cells[seq.pos[i]].classList.add("lit");
      if (dual) {
        voice.say(LETTERS[seq.letIdx[i]], { rate: 1.1 });
      }

      later(() => {
        cells[seq.pos[i]].classList.remove("lit");
      }, STIM_MS);

      later(() => {
        if (!running) return;
        // 结算本回合
        if (isPosTarget(i)) {
          if (posResponded) {
            hits++;
            sfx.correct();
          } else {
            miss++;
          }
        } else {
          if (posResponded) {
            fa++;
            sfx.wrong();
          }
        }

        if (dual) {
          if (isLetTarget(i)) {
            if (letResponded) lHits++;
            else lMiss++;
          } else {
            if (letResponded) lFa++;
          }
        }

        updateHud();
        present(i + 1);
      }, windowMs);
    }

    function handlePosPress() {
      if (!running || posResponded) return;
      posResponded = true;
      sfx.tap();
      posBtn.style.transform = "scale(0.95)";
      later(() => posBtn.style.transform = "", 110);
    }

    function handleLetPress() {
      if (!running || !dual || letResponded) return;
      letResponded = true;
      sfx.tap();
      if (letBtn) {
        letBtn.style.transform = "scale(0.95)";
        later(() => letBtn.style.transform = "", 110);
      }
    }

    posBtn.addEventListener("click", handlePosPress);
    if (letBtn) letBtn.addEventListener("click", handleLetPress);

    if (dualToggle) {
      dualToggle.addEventListener("click", () => {
        sfx.click();
        store.setPref("nbackCue", !dual);
        location.reload();
      });
    }

    const keyHandler = (e) => {
      if (e.code === "Space" || e.code === "KeyJ") {
        e.preventDefault();
        handlePosPress();
      } else if (e.code === "KeyK" || e.code === "KeyL") {
        e.preventDefault();
        handleLetPress();
      }
    };
    window.addEventListener("keydown", keyHandler);

    later(() => present(0), 600);

    return {
      abort() {
        running = false;
        clearTimeouts();
        window.removeEventListener("keydown", keyHandler);
      }
    };
  }
};
