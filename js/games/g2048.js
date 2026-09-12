/* g2048.js — 2048 数字合并心流 (休闲益智)
   循证机制：低压力即时微奖励、空间位置预测与模式合成，激发自适应温和多巴胺释放，促进沉浸式心流状态。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

const LEVEL_TARGETS = [
  128,   // L1: 极速初探
  256,   // L2: 上手热身
  512,   // L3: 渐入佳境
  1024,  // L4: 千分冲刺
  2048,  // L5: 经典达成
  2048,  // L6: 经典高分挑战
  4096,  // L7: 大师进阶
  4096,  // L8: 极限稳固
  8192   // L9: 终极神话
];

export const g2048 = {
  id: "g2048",
  min: 1,
  max: 9,
  icon: "🔢",
  nameKey: "g2048_t",
  descKey: "g2048_d",
  howKey: "how_g2048",
  scienceKey: "sci_g2048",

  start(host, { level, end }) {
    const targetTile = LEVEL_TARGETS[level - 1] || 2048;
    let grid = Array(4).fill(null).map(() => Array(4).fill(0));
    let score = 0;
    let moves = 0;
    let running = true;
    let t0 = performance.now();
    let hasReachedTarget = false;

    host.innerHTML = `
      <div class="hud" style="margin-bottom:12px">
        <span>关卡 <b>L${level}</b></span>
        <span>目标: <b style="color:var(--accent);font-size:1.15rem">${targetTile}</b></span>
        <span>当前最高: <b id="g2048MaxTile">2</b></span>
        <span>得分: <b id="g2048Score">0</b></span>
      </div>

      <div class="g2048-container">
        <div class="g2048-board" id="g2048Board"></div>
      </div>

      <div class="g2048-controls">
        <button class="btn" id="g2048RestartBtn">🔄 重新开局</button>
        <button class="btn primary" id="g2048PassBtn" style="display:none">🎉 目标已达成！点击结算</button>
      </div>

      <div class="g2048-tip">
        <span>💡 支持键盘 <b>↑ ↓ ← →</b> 或 <b>W A S D</b>，手机可直接<b>在棋盘上滑动</b></span>
      </div>
    `;

    const boardEl = host.querySelector("#g2048Board");
    const scoreEl = host.querySelector("#g2048Score");
    const maxTileEl = host.querySelector("#g2048MaxTile");
    const passBtn = host.querySelector("#g2048PassBtn");
    const restartBtn = host.querySelector("#g2048RestartBtn");

    function getMaxTile() {
      let m = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] > m) m = grid[r][c];
        }
      }
      return m;
    }

    function addRandomTile() {
      const empty = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] === 0) empty.push({ r, c });
        }
      }
      if (empty.length === 0) return false;
      const spot = empty[Math.floor(Math.random() * empty.length)];
      grid[spot.r][spot.c] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }

    function renderBoard(mergedSpots = []) {
      boardEl.innerHTML = "";
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const val = grid[r][c];
          const cell = document.createElement("div");
          cell.className = "g2048-cell";
          if (val > 0) {
            cell.classList.add(`val-${val > 2048 ? "super" : val}`);
            cell.textContent = val;
            if (mergedSpots.some(s => s.r === r && s.c === c)) {
              cell.classList.add("tile-merged");
            }
          }
          boardEl.appendChild(cell);
        }
      }
      scoreEl.textContent = score;
      const maxTile = getMaxTile();
      maxTileEl.textContent = maxTile;

      if (maxTile >= targetTile && !hasReachedTarget) {
        hasReachedTarget = true;
        sfx.levelup();
        passBtn.style.display = "inline-flex";
      }
    }

    function slideAndMerge(line) {
      let filtered = line.filter(v => v !== 0);
      let mergedLine = [];
      let gained = 0;
      let mergedIndices = [];

      for (let i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          const val = filtered[i] * 2;
          mergedLine.push(val);
          gained += val;
          mergedIndices.push(mergedLine.length - 1);
          i++;
        } else {
          mergedLine.push(filtered[i]);
        }
      }
      while (mergedLine.length < 4) {
        mergedLine.push(0);
      }
      return { line: mergedLine, gained, mergedIndices };
    }

    function move(dir) {
      if (!running) return;
      let moved = false;
      let gainedTotal = 0;
      let newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
      let mergedPositions = [];

      if (dir === "left") {
        for (let r = 0; r < 4; r++) {
          const { line, gained, mergedIndices } = slideAndMerge(grid[r]);
          newGrid[r] = line;
          gainedTotal += gained;
          mergedIndices.forEach(c => mergedPositions.push({ r, c }));
          if (line.some((v, c) => v !== grid[r][c])) moved = true;
        }
      } else if (dir === "right") {
        for (let r = 0; r < 4; r++) {
          const reversed = [...grid[r]].reverse();
          const { line, gained, mergedIndices } = slideAndMerge(reversed);
          newGrid[r] = [...line].reverse();
          gainedTotal += gained;
          mergedIndices.forEach(revC => {
            mergedPositions.push({ r, c: 3 - revC });
          });
          if (newGrid[r].some((v, c) => v !== grid[r][c])) moved = true;
        }
      } else if (dir === "up") {
        for (let c = 0; c < 4; c++) {
          const col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
          const { line, gained, mergedIndices } = slideAndMerge(col);
          for (let r = 0; r < 4; r++) newGrid[r][c] = line[r];
          gainedTotal += gained;
          mergedIndices.forEach(r => mergedPositions.push({ r, c }));
          if (col.some((v, r) => v !== newGrid[r][c])) moved = true;
        }
      } else if (dir === "down") {
        for (let c = 0; c < 4; c++) {
          const col = [grid[3][c], grid[2][c], grid[1][c], grid[0][c]];
          const { line, gained, mergedIndices } = slideAndMerge(col);
          for (let r = 0; r < 4; r++) newGrid[3 - r][c] = line[r];
          gainedTotal += gained;
          mergedIndices.forEach(revR => mergedPositions.push({ r: 3 - revR, c }));
          if (line.some((v, r) => v !== grid[3 - r][c])) moved = true;
        }
      }

      if (moved) {
        grid = newGrid;
        score += gainedTotal;
        moves++;
        if (gainedTotal > 0) {
          sfx.tap();
        }
        addRandomTile();
        renderBoard(mergedPositions);

        if (checkGameOver()) {
          handleGameOver();
        }
      }
    }

    function canMove() {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (grid[r][c] === 0) return true;
          if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
          if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
        }
      }
      return false;
    }

    function checkGameOver() {
      return !canMove();
    }

    function handleGameOver() {
      running = false;
      const maxTile = getMaxTile();
      const pass = maxTile >= targetTile;
      if (pass) {
        sfx.levelup();
      } else {
        sfx.wrong();
      }
      finish(pass);
    }

    function finish(pass) {
      running = false;
      const elapsedMs = performance.now() - t0;
      const maxTile = getMaxTile();
      const finalScore = score + (maxTile >= targetTile ? 1000 : 0);

      end({
        level,
        score: finalScore,
        pass: pass || (maxTile >= targetTile),
        ms: elapsedMs,
        summary: {
          [t("score")]: score,
          "最高方块": maxTile,
          "目标达成": maxTile >= targetTile ? `达标 (>=${targetTile})` : `未达标 (${targetTile})`,
          "操作步数": moves,
          "训练用时": `${(elapsedMs / 1000).toFixed(1)}s`
        }
      });
    }

    function onKeyDown(e) {
      if (!running) return;
      if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        move("up");
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        move("down");
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault();
        move("left");
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault();
        move("right");
      }
    }
    window.addEventListener("keydown", onKeyDown);

    let touchStartX = 0;
    let touchStartY = 0;
    function onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
    function onTouchEnd(e) {
      if (!running) return;
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 28) {
        if (absX > absY) {
          move(dx > 0 ? "right" : "left");
        } else {
          move(dy > 0 ? "down" : "up");
        }
      }
    }

    boardEl.addEventListener("touchstart", onTouchStart, { passive: true });
    boardEl.addEventListener("touchend", onTouchEnd, { passive: true });

    passBtn.addEventListener("click", () => {
      sfx.levelup();
      finish(true);
    });

    restartBtn.addEventListener("click", () => {
      sfx.click();
      grid = Array(4).fill(null).map(() => Array(4).fill(0));
      score = 0;
      moves = 0;
      running = true;
      hasReachedTarget = false;
      passBtn.style.display = "none";
      addRandomTile();
      addRandomTile();
      renderBoard();
    });

    addRandomTile();
    addRandomTile();
    renderBoard();

    return {
      abort() {
        running = false;
        window.removeEventListener("keydown", onKeyDown);
        boardEl.removeEventListener("touchstart", onTouchStart);
        boardEl.removeEventListener("touchend", onTouchEnd);
      }
    };
  }
};
