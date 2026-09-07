/* gonogo.js — Go / No-Go & Stop Signal Task (冲动控制与急刹车训练)
   循证依据：运动皮层抑制控制经典理论（Logan & Cowan, 1984; Aron et al.）。
   训练目标：针对 ADHD “想都不想就脱口而出/盲目乱点”的行动抑制缺陷，
             训练前额叶下回 - 基底节（IFG-STN）运动刹车回路，在极短延迟内撤回已准备发出的运动指令。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

export const gonogo = {
  id: "gonogo",
  min: 1,
  max: 9,
  icon: "🛑",
  nameKey: "gg_t",
  descKey: "gg_d",
  howKey: "how_gonogo",
  scienceKey: "sci_gonogo",

  start(host, { level, end }) {
    const trials = 18 + level * 3;
    // 关卡参数：反应时间窗口与急刹车信号延迟 (SSD) (L9 极限 380ms 极窄窗口与 80ms 毫秒急刹)
    const windowMs = Math.max(380, 1100 - (level - 1) * 80);
    const stopRate = 0.28; // 约 28% 为抑制靶标
    const hasStopSignal = level >= 3; // L3 及以上开启动态变红急刹车
    const ssdMs = Math.max(80, 260 - (level - 3) * 25);

    const seq = [];
    for (let i = 0; i < trials; i++) {
      const isStop = Math.random() < stopRate;
      seq.push({ isStop, stopSignal: hasStopSignal && isStop });
    }

    host.innerHTML = `
      <div class="hud" style="margin-bottom:16px">
        <span>关卡 <b>L${level}</b></span>
        <span data-c="hits">绿灯命中 <b>0</b></span>
        <span data-c="err" class="lives">红灯误按 <b>0</b></span>
        <span data-c="rt">反应时 <b>—</b></span>
        <span data-c="prog" style="min-width:70px">1/${trials}</span>
      </div>

      <div class="gg-arena">
        <div class="gg-field" id="ggField">
          <span class="gg-symbol" id="ggSymbol">●</span>
        </div>
      </div>

      <div class="gg-tip">${hasStopSignal ? t("gg_tip_stopsignal") : t("gg_tip_standard")}</div>

      <div class="play-controls">
        <button class="btn big primary gg-btn" id="ggTapBtn">
          <span>⚡ 敲击响应 (绿灯)</span>
          <span class="btn-keycap">[空格] 或 触控点击</span>
        </button>
      </div>
    `;

    const field = host.querySelector("#ggField");
    const symbol = host.querySelector("#ggSymbol");
    const tapBtn = host.querySelector("#ggTapBtn");
    const hitsEl = host.querySelector('[data-c="hits"] b');
    const errEl = host.querySelector('[data-c="err"] b');
    const rtEl = host.querySelector('[data-c="rt"] b');
    const progEl = host.querySelector('[data-c="prog"]');

    let idx = 0;
    let goHits = 0;
    let falseAlarms = 0; // 红灯按了
    let goMiss = 0;     // 绿灯没按
    let totalGoRt = 0;
    let responded = false;
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
      if (hitsEl) hitsEl.textContent = goHits;
      if (errEl) errEl.textContent = falseAlarms;
      if (rtEl) rtEl.textContent = goHits > 0 ? `${Math.round(totalGoRt / goHits)}ms` : "—";
      if (progEl) progEl.textContent = `${Math.min(idx + 1, trials)}/${trials}`;
    }

    function finish() {
      running = false;
      clearTimeouts();
      const totalGo = seq.filter(x => !x.isStop).length;
      const totalStop = seq.filter(x => x.isStop).length;

      const stopSuccessRate = totalStop > 0 ? Math.round(((totalStop - falseAlarms) / totalStop) * 100) : 100;
      const goAcc = totalGo > 0 ? Math.round((goHits / totalGo) * 100) : 100;
      const avgRt = goHits > 0 ? Math.round(totalGoRt / goHits) : 500;

      const pass = falseAlarms <= Math.max(1, Math.floor(totalStop * 0.35)) && goAcc >= 70;
      const score = Math.max(0, goHits * 20 + (totalStop - falseAlarms) * 50 - falseAlarms * 35 - goMiss * 15);

      end({
        level,
        score,
        pass,
        ms: totalGoRt,
        summary: {
          [t("hud_stop_success")]: `${stopSuccessRate}%`,
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
      responded = false;
      updateHud();

      // 先重置样式为等待
      field.className = "gg-field wait";
      symbol.textContent = "+";

      // 随机前置注视等待 (400ms ~ 750ms 变频，防止预判节奏)
      const waitMs = 450 + Math.floor(Math.random() * 350);

      later(() => {
        if (!running) return;
        const cur = seq[i];
        trialStart = performance.now();

        if (cur.stopSignal) {
          // 急刹车模式：先亮绿灯，随后 ssdMs 毫秒突然转红！
          field.className = "gg-field gogo showing";
          symbol.textContent = "GO";
          sfx.tap();

          later(() => {
            if (!running) return;
            field.className = "gg-field stop showing";
            symbol.textContent = "STOP";
            sfx.wrong();
          }, ssdMs);
        } else if (cur.isStop) {
          // 直接红灯
          field.className = "gg-field stop showing";
          symbol.textContent = "STOP";
          sfx.wrong();
        } else {
          // 常规绿灯
          field.className = "gg-field gogo showing";
          symbol.textContent = "GO";
          sfx.tap();
        }

        // 判定反应窗口
        later(() => {
          if (!running) return;
          if (!cur.isStop && !responded) {
            goMiss++;
          }
          field.className = "gg-field wait";
          symbol.textContent = "";
          updateHud();

          // 试次间歇
          later(() => showTrial(i + 1), 300);
        }, windowMs);
      }, waitMs);
    }

    function handleTap() {
      if (!running || responded || field.classList.contains("wait")) return;
      responded = true;
      const rt = performance.now() - trialStart;
      const cur = seq[idx];

      if (cur.isStop) {
        // 冲动犯错：在红灯时敲击
        falseAlarms++;
        sfx.wrong();
        field.classList.add("error-pulse");
      } else {
        // 正确敲击绿灯
        goHits++;
        totalGoRt += rt;
        sfx.correct();
      }

      tapBtn.style.transform = "scale(0.95)";
      setTimeout(() => tapBtn.style.transform = "", 100);
      updateHud();
    }

    tapBtn.addEventListener("click", handleTap);

    const keyHandler = (e) => {
      if (e.code === "Space" || e.code === "KeyJ" || e.code === "Enter") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", keyHandler);

    later(() => showTrial(0), 400);

    return {
      abort() {
        running = false;
        clearTimeouts();
        window.removeEventListener("keydown", keyHandler);
      }
    };
  }
};
