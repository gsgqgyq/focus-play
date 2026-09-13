/* g2048.js — 2048 数字合并心流 (向经典致敬版)
   核心优化：
   1. 彻底解耦背景底盘与顶层 Tile 容器；
   2. 基于 CSS transform 与 GPU 硬件加速的 100ms 丝滑平移动画；
   3. 合并爆破 (Pop) 与新生 (Appear) 物理弹簧动效；
   4. 浮动得分粒子 (+4 / +8 / +16 渐显微飘)；
   5. 零延迟 touch-action: none 手势交互，杜绝手机回弹与误触；
   6. 方向键、WASD 与 VIM (HJKL) 键位支持，阻止页面默认滚动。 */
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

class Tile {
  constructor(position, value, id) {
    this.x = position.x; // column index 0..3
    this.y = position.y; // row index 0..3
    this.value = value || 2;
    this.id = id;
    this.previousPosition = null;
    this.mergedFrom = null; // array of 2 tiles merged to create this
  }

  savePosition() {
    this.previousPosition = { x: this.x, y: this.y };
  }

  updatePosition(position) {
    this.x = position.x;
    this.y = position.y;
  }
}

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
    let grid = Array(4).fill(null).map(() => Array(4).fill(null));
    let score = 0;
    let moves = 0;
    let running = true;
    let t0 = performance.now();
    let hasReachedTarget = false;
    let tileIdCounter = 1;

    host.innerHTML = `
      <div class="hud" style="margin-bottom:12px">
        <span>关卡 <b>L${level}</b></span>
        <span>目标: <b style="color:var(--accent);font-size:1.15rem">${targetTile}</b></span>
        <span>最高: <b id="g2048MaxTile">2</b></span>
        <span class="g2048-score-hud">得分: <b id="g2048Score">0</b><span id="g2048ScoreFly" class="g2048-score-fly"></span></span>
      </div>

      <div class="g2048-container">
        <div class="g2048-board" id="g2048Board">
          <!-- 静态背景槽位网格 (4x4 = 16 格) -->
          <div class="g2048-grid">
            ${Array(16).fill('<div class="g2048-grid-cell"></div>').join("")}
          </div>
          <!-- 动态平移瓦片绝对定位容器 -->
          <div class="g2048-tile-container" id="g2048TileContainer"></div>
        </div>
      </div>

      <div class="g2048-controls">
        <button class="btn" id="g2048RestartBtn">🔄 重新开局</button>
        <button class="btn primary" id="g2048PassBtn" style="display:none">🎉 目标已达成！结算通关</button>
      </div>

      <div class="g2048-tip">
        <span>💡 支持键盘 <b>↑ ↓ ← →</b> / <b>W A S D</b>，手机上直接<b>在棋盘上滑动</b></span>
      </div>
    `;

    const boardEl = host.querySelector("#g2048Board");
    const tileContainer = host.querySelector("#g2048TileContainer");
    const scoreEl = host.querySelector("#g2048Score");
    const scoreFlyEl = host.querySelector("#g2048ScoreFly");
    const maxTileEl = host.querySelector("#g2048MaxTile");
    const passBtn = host.querySelector("#g2048PassBtn");
    const restartBtn = host.querySelector("#g2048RestartBtn");

    function getMaxTile() {
      let m = 0;
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          if (grid[x][y] && grid[x][y].value > m) {
            m = grid[x][y].value;
          }
        }
      }
      return m;
    }

    function randomAvailableCell() {
      const empty = [];
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          if (!grid[x][y]) empty.push({ x, y });
        }
      }
      if (empty.length === 0) return null;
      return empty[Math.floor(Math.random() * empty.length)];
    }

    function addRandomTile() {
      const pos = randomAvailableCell();
      if (!pos) return false;
      const val = Math.random() < 0.9 ? 2 : 4;
      const tile = new Tile(pos, val, tileIdCounter++);
      grid[pos.x][pos.y] = tile;
      return true;
    }

    function prepareTiles() {
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          if (grid[x][y]) {
            grid[x][y].mergedFrom = null;
            grid[x][y].savePosition();
          }
        }
      }
    }

    function renderTile(tile, isMerged = false) {
      const el = document.createElement("div");
      const posClass = `pos-${tile.previousPosition ? tile.previousPosition.x : tile.x}-${tile.previousPosition ? tile.previousPosition.y : tile.y}`;
      const valClass = `val-${tile.value > 2048 ? "super" : tile.value}`;

      el.className = `g2048-tile ${valClass} ${posClass}`;
      el.id = `g2048-tile-${tile.id}`;
      el.innerHTML = `<span class="tile-inner">${tile.value}</span>`;

      if (isMerged) {
        el.classList.add("tile-merged");
      } else if (!tile.previousPosition) {
        el.classList.add("tile-new");
      }

      tileContainer.appendChild(el);

      // 如果有位移，在下一帧触发 CSS transform 过渡
      if (tile.previousPosition) {
        window.requestAnimationFrame(() => {
          el.classList.remove(posClass);
          el.classList.add(`pos-${tile.x}-${tile.y}`);
        });
      }

      return el;
    }

    function actuate(scoreGain = 0) {
      window.requestAnimationFrame(() => {
        tileContainer.innerHTML = "";

        for (let x = 0; x < 4; x++) {
          for (let y = 0; y < 4; y++) {
            const tile = grid[x][y];
            if (tile) {
              if (tile.mergedFrom) {
                // 先渲染合并前的两块滑入目标
                tile.mergedFrom.forEach(m => renderTile(m));
                // 再渲染合成后的新块
                renderTile(tile, true);
              } else {
                renderTile(tile);
              }
            }
          }
        }

        // 得分与最高数字更新
        scoreEl.textContent = score;
        const maxTile = getMaxTile();
        maxTileEl.textContent = maxTile;

        if (scoreGain > 0 && scoreFlyEl) {
          scoreFlyEl.innerHTML = `<span class="g2048-score-add">+${scoreGain}</span>`;
        }

        // 关卡目标判定
        if (maxTile >= targetTile && !hasReachedTarget) {
          hasReachedTarget = true;
          passBtn.style.display = "inline-flex";
          sfx.levelup();
        }
      });
    }

    function getVector(direction) {
      const map = {
        up:    { x: 0,  y: -1 },
        right: { x: 1,  y: 0  },
        down:  { x: 0,  y: 1  },
        left:  { x: -1, y: 0  }
      };
      return map[direction];
    }

    function buildTraversals(vector) {
      const traversals = { x: [0, 1, 2, 3], y: [0, 1, 2, 3] };
      if (vector.x === 1) traversals.x.reverse();
      if (vector.y === 1) traversals.y.reverse();
      return traversals;
    }

    function findFarthestPosition(cell, vector) {
      let prev = cell;
      let next = { x: prev.x + vector.x, y: prev.y + vector.y };

      while (withinBounds(next) && !grid[next.x][next.y]) {
        prev = next;
        next = { x: prev.x + vector.x, y: prev.y + vector.y };
      }

      return {
        farthest: prev,
        next
      };
    }

    function withinBounds(position) {
      return position.x >= 0 && position.x < 4 && position.y >= 0 && position.y < 4;
    }

    function move(direction) {
      if (!running) return;

      const vector = getVector(direction);
      const traversals = buildTraversals(vector);
      let moved = false;
      let scoreGain = 0;

      prepareTiles();

      traversals.x.forEach(x => {
        traversals.y.forEach(y => {
          const tile = grid[x][y];
          if (tile) {
            const positions = findFarthestPosition({ x, y }, vector);
            const next = grid[positions.next.x] ? grid[positions.next.x][positions.next.y] : null;

            if (next && next.value === tile.value && !next.mergedFrom) {
              // 合并！
              const merged = new Tile(positions.next, tile.value * 2, tileIdCounter++);
              merged.mergedFrom = [tile, next];

              grid[positions.next.x][positions.next.y] = merged;
              grid[x][y] = null;

              tile.updatePosition(positions.next);

              score += merged.value;
              scoreGain += merged.value;
              moved = true;
            } else {
              // 移动到最远空位
              grid[x][y] = null;
              grid[positions.farthest.x][positions.farthest.y] = tile;
              tile.updatePosition(positions.farthest);

              if (positions.farthest.x !== x || positions.farthest.y !== y) {
                moved = true;
              }
            }
          }
        });
      });

      if (moved) {
        moves++;
        sfx.tap();
        addRandomTile();

        if (scoreGain > 0) {
          setTimeout(() => sfx.click(), 70);
        }

        actuate(scoreGain);

        if (!movesAvailable()) {
          setTimeout(handleGameOver, 300);
        }
      }
    }

    function movesAvailable() {
      // 还有空位吗？
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          if (!grid[x][y]) return true;
        }
      }

      // 还有相邻可合并吗？
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          const tile = grid[x][y];
          if (tile) {
            const dirs = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
            for (const d of dirs) {
              const nx = x + d.x;
              const ny = y + d.y;
              if (withinBounds({ x: nx, y: ny })) {
                const other = grid[nx][ny];
                if (other && other.value === tile.value) return true;
              }
            }
          }
        }
      }

      return false;
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

    // 键盘监听（支持方向键、WASD、VIM 键位 HJKL）
    function onKeyDown(e) {
      if (!running) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const key = e.code;
      if (["ArrowUp", "KeyW", "KeyK"].includes(key)) {
        e.preventDefault();
        move("up");
      } else if (["ArrowDown", "KeyS", "KeyJ"].includes(key)) {
        e.preventDefault();
        move("down");
      } else if (["ArrowLeft", "KeyA", "KeyH"].includes(key)) {
        e.preventDefault();
        move("left");
      } else if (["ArrowRight", "KeyD", "KeyL"].includes(key)) {
        e.preventDefault();
        move("right");
      }
    }
    window.addEventListener("keydown", onKeyDown);

    // 触屏滑动监听（强化版：touch-action: none 消除抖动，灵敏角度判定）
    let touchStartX = 0;
    let touchStartY = 0;
    let touching = false;

    function onTouchStart(e) {
      if (!e.touches || e.touches.length > 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touching = true;
    }

    function onTouchMove(e) {
      if (touching) {
        e.preventDefault(); // 强力阻止整个画面的下拉刷新与橡皮筋
      }
    }

    function onTouchEnd(e) {
      if (!running || !touching) return;
      touching = false;
      if (!e.changedTouches || e.changedTouches.length === 0) return;

      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // 阈值 16px 保证快速响应与微滑触发
      if (Math.max(absX, absY) > 16) {
        if (absX > absY) {
          move(dx > 0 ? "right" : "left");
        } else {
          move(dy > 0 ? "down" : "up");
        }
      }
    }

    boardEl.addEventListener("touchstart", onTouchStart, { passive: false });
    boardEl.addEventListener("touchmove", onTouchMove, { passive: false });
    boardEl.addEventListener("touchend", onTouchEnd, { passive: true });

    passBtn.addEventListener("click", () => {
      sfx.levelup();
      finish(true);
    });

    restartBtn.addEventListener("click", () => {
      sfx.click();
      grid = Array(4).fill(null).map(() => Array(4).fill(null));
      score = 0;
      moves = 0;
      running = true;
      hasReachedTarget = false;
      passBtn.style.display = "none";
      addRandomTile();
      addRandomTile();
      actuate();
    });

    // 初始化前两个方块
    addRandomTile();
    addRandomTile();
    actuate();

    return {
      abort() {
        running = false;
        window.removeEventListener("keydown", onKeyDown);
        boardEl.removeEventListener("touchstart", onTouchStart);
        boardEl.removeEventListener("touchmove", onTouchMove);
        boardEl.removeEventListener("touchend", onTouchEnd);
      }
    };
  }
};
