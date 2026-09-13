/* sudoku.js — 数独全阶梯 (休闲益智)
   循证机制：工作记忆多点维持、逻辑演绎排除与规则约束推演。
   关卡梯度：L1-L2 (4×4四宫格入门) -> L3-L5 (6×6六宫格适度推理) -> L6-L9 (9×9经典全功能数独)。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";

// 种子终盘模板库（通过数字置换映射、行列群组打乱、旋转翻转可生成上万种有效题库）
const SEED_4X4 = [
  [1, 2, 3, 4],
  [3, 4, 1, 2],
  [2, 1, 4, 3],
  [4, 3, 2, 1]
];

const SEED_6X6 = [
  [1, 2, 3, 4, 5, 6],
  [4, 5, 6, 1, 2, 3],
  [2, 3, 1, 5, 6, 4],
  [5, 6, 4, 2, 3, 1],
  [3, 1, 2, 6, 4, 5],
  [6, 4, 5, 3, 1, 2]
];

const SEED_9X9 = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

const LEVEL_CFG = [
  { size: 4, blockR: 2, blockC: 2, emptyCount: 5,  label: "4×4 极速初探" }, // L1
  { size: 4, blockR: 2, blockC: 2, emptyCount: 7,  label: "4×4 基础推演" }, // L2
  { size: 6, blockR: 2, blockC: 3, emptyCount: 10, label: "6×6 舒缓进阶" }, // L3
  { size: 6, blockR: 2, blockC: 3, emptyCount: 14, label: "6×6 逻辑排查" }, // L4
  { size: 6, blockR: 2, blockC: 3, emptyCount: 18, label: "6×6 深度思辨" }, // L5
  { size: 9, blockR: 3, blockC: 3, emptyCount: 26, label: "9×9 经典初级" }, // L6
  { size: 9, blockR: 3, blockC: 3, emptyCount: 34, label: "9×9 经典中级" }, // L7
  { size: 9, blockR: 3, blockC: 3, emptyCount: 42, label: "9×9 高级挑战" }, // L8
  { size: 9, blockR: 3, blockC: 3, emptyCount: 48, label: "9×9 大师心流" }  // L9
];

function generatePuzzle(cfg) {
  const { size, emptyCount } = cfg;
  let baseSeed = size === 4 ? SEED_4X4 : (size === 6 ? SEED_6X6 : SEED_9X9);

  // 1. 数字随机同构映射 (置换 1..size)
  const nums = Array.from({ length: size }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  const solution = baseSeed.map(row => row.map(v => nums[v - 1]));

  // 2. 随机矩阵转置 / 翻转
  let finalSolution = solution;
  if (Math.random() < 0.5) {
    // 转置
    finalSolution = Array(size).fill(0).map((_, r) => Array(size).fill(0).map((__, c) => solution[c][r]));
  }
  if (Math.random() < 0.5) {
    finalSolution = finalSolution.reverse();
  }

  // 3. 挖空
  const initial = finalSolution.map(r => [...r]);
  const positions = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push({ r, c });
    }
  }
  positions.sort(() => Math.random() - 0.5);

  const toRemove = Math.min(emptyCount, positions.length - 4);
  for (let i = 0; i < toRemove; i++) {
    initial[positions[i].r][positions[i].c] = 0;
  }

  return { initial, solution: finalSolution };
}

export const sudoku = {
  id: "sudoku",
  min: 1,
  max: 9,
  icon: "🧩",
  nameKey: "sudoku_t",
  descKey: "sudoku_d",
  howKey: "how_sudoku",
  scienceKey: "sci_sudoku",

  start(host, { level, end }) {
    const cfg = LEVEL_CFG[level - 1] || LEVEL_CFG[0];
    const { initial, solution } = generatePuzzle(cfg);
    const size = cfg.size;

    // 当前玩家网格与草稿笔记
    let userGrid = initial.map(row => [...row]);
    let notes = Array(size).fill(0).map(() => Array(size).fill(0).map(() => new Set()));
    let selectedCell = null;
    let noteMode = false;
    let errors = 0;
    let running = true;
    let t0 = performance.now();
    let timerIv = null;

    host.innerHTML = `
      <div class="hud" style="margin-bottom:10px">
        <span>关卡 <b>L${level}</b> (${cfg.label})</span>
        <span>失误: <b id="sdkErrors" style="color:var(--text-muted)">0</b></span>
        <span>剩余空格: <b id="sdkRemaining">0</b></span>
        <span>用时: <b id="sdkTimer">0.0s</b></span>
      </div>

      <div class="sudoku-wrap">
        <div class="sudoku-board size-${size}" id="sdkBoard"></div>
      </div>

      <div class="sudoku-tools">
        <button class="btn ${noteMode ? 'primary' : ''}" id="sdkNoteToggle">
          ✏️ 草稿模式: <b id="sdkNoteStatus">${noteMode ? '开' : '关'}</b>
        </button>
        <button class="btn" id="sdkClearCell">⌫ 清除格</button>
      </div>

      <div class="sudoku-keypad" id="sdkKeypad"></div>

      <div class="sudoku-tip">
        <span>💡 支持键盘 <b>1-${size}</b> 直接填入、<b>Backspace</b> 擦除、<b>N</b> 键切换草稿</span>
      </div>
    `;

    const boardEl = host.querySelector("#sdkBoard");
    const keypadEl = host.querySelector("#sdkKeypad");
    const errEl = host.querySelector("#sdkErrors");
    const remEl = host.querySelector("#sdkRemaining");
    const timerEl = host.querySelector("#sdkTimer");
    const noteBtn = host.querySelector("#sdkNoteToggle");
    const noteStatusEl = host.querySelector("#sdkNoteStatus");
    const clearBtn = host.querySelector("#sdkClearCell");

    // 生成数字键盘
    for (let i = 1; i <= size; i++) {
      const btn = document.createElement("button");
      btn.className = "sdk-key";
      btn.dataset.val = i;
      btn.textContent = i;
      btn.addEventListener("click", () => {
        if (selectedCell) fillValue(i);
      });
      keypadEl.appendChild(btn);
    }

    function countRemaining() {
      let count = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (userGrid[r][c] === 0) count++;
        }
      }
      return count;
    }

    let lastActionCell = null;

    function renderBoard() {
      boardEl.innerHTML = "";
      boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

      const selectedVal = selectedCell ? userGrid[selectedCell.r][selectedCell.c] : 0;

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const val = userGrid[r][c];
          const isGiven = initial[r][c] !== 0;
          const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
          const isSameVal = selectedVal > 0 && val === selectedVal;
          const isRelated = selectedCell && (selectedCell.r === r || selectedCell.c === c || isSameBlock(selectedCell.r, selectedCell.c, r, c));

          const cell = document.createElement("div");
          cell.className = "sdk-cell";
          if (isGiven) cell.classList.add("given");
          if (isSelected) cell.classList.add("selected");
          else if (isSameVal) cell.classList.add("same-val");
          else if (isRelated) cell.classList.add("related");

          if (lastActionCell && lastActionCell.r === r && lastActionCell.c === c) {
            cell.classList.add(lastActionCell.type);
          }

          // 格子边界划分（宫格加粗边界）
          if ((r + 1) % cfg.blockR === 0 && r < size - 1) cell.classList.add("border-b");
          if ((c + 1) % cfg.blockC === 0 && c < size - 1) cell.classList.add("border-r");

          if (val > 0) {
            cell.textContent = val;
          } else {
            // 渲染草稿笔记
            const cellNotes = notes[r][c];
            if (cellNotes && cellNotes.size > 0) {
              const notesWrap = document.createElement("div");
              notesWrap.className = `sdk-notes-grid size-${size}`;
              for (let n = 1; n <= size; n++) {
                const noteSpan = document.createElement("span");
                noteSpan.textContent = cellNotes.has(n) ? n : "";
                notesWrap.appendChild(noteSpan);
              }
              cell.appendChild(notesWrap);
            }
          }

          cell.addEventListener("click", () => {
            sfx.click();
            selectedCell = { r, c };
            renderBoard();
          });

          boardEl.appendChild(cell);
        }
      }

      remEl.textContent = countRemaining();
    }

    function isSameBlock(r1, c1, r2, c2) {
      const br1 = Math.floor(r1 / cfg.blockR);
      const bc1 = Math.floor(c1 / cfg.blockC);
      const br2 = Math.floor(r2 / cfg.blockR);
      const bc2 = Math.floor(c2 / cfg.blockC);
      return br1 === br2 && bc1 === bc2;
    }

    function fillValue(num) {
      if (!selectedCell || !running) return;
      const { r, c } = selectedCell;
      if (initial[r][c] !== 0) return; // 初始预置数字不可修改

      if (noteMode) {
        // 切换草稿数字
        sfx.tap();
        if (notes[r][c].has(num)) {
          notes[r][c].delete(num);
        } else {
          notes[r][c].add(num);
        }
        renderBoard();
        return;
      }

      // 普通填数
      notes[r][c].clear();
      if (userGrid[r][c] === num) {
        // 再次点击相同数字则清空
        userGrid[r][c] = 0;
        lastActionCell = null;
        sfx.tap();
      } else {
        if (num === solution[r][c]) {
          // 正确填入
          userGrid[r][c] = num;
          lastActionCell = { r, c, type: "pop" };
          sfx.tap();
          // 清除同行同列同宫中的对应草稿
          cleanNotes(r, c, num);
        } else {
          // 填错
          errors++;
          errEl.textContent = errors;
          lastActionCell = { r, c, type: "shake" };
          sfx.wrong();
          userGrid[r][c] = num; // 允许填入但有提示
        }
      }

      renderBoard();
      setTimeout(() => { lastActionCell = null; }, 320);
      checkCompletion();
    }

    function cleanNotes(r, c, val) {
      for (let i = 0; i < size; i++) {
        notes[r][i].delete(val);
        notes[i][c].delete(val);
      }
      const br = Math.floor(r / cfg.blockR) * cfg.blockR;
      const bc = Math.floor(c / cfg.blockC) * cfg.blockC;
      for (let dr = 0; dr < cfg.blockR; dr++) {
        for (let dc = 0; dc < cfg.blockC; dc++) {
          notes[br + dr][bc + dc].delete(val);
        }
      }
    }

    function clearCurrentCell() {
      if (!selectedCell || !running) return;
      const { r, c } = selectedCell;
      if (initial[r][c] !== 0) return;
      sfx.tap();
      userGrid[r][c] = 0;
      notes[r][c].clear();
      renderBoard();
    }

    function checkCompletion() {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (userGrid[r][c] !== solution[r][c]) {
            return false;
          }
        }
      }
      finish();
      return true;
    }

    function finish() {
      running = false;
      clearInterval(timerIv);
      const elapsedMs = performance.now() - t0;
      const sec = (elapsedMs / 1000).toFixed(1);
      const pass = errors <= 5;
      const baseScore = cfg.emptyCount * 50;
      const score = Math.max(100, Math.round(baseScore - errors * 30 - (elapsedMs / 1000) * 2));

      sfx.levelup();
      end({
        level,
        score,
        pass,
        ms: elapsedMs,
        summary: {
          "完成难度": cfg.label,
          "总用时": `${sec}s`,
          "失误次数": errors,
          "最终得分": score
        }
      });
    }

    // 键盘监听
    function onKeyDown(e) {
      if (!running) return;
      const key = e.key;

      if (key >= "1" && key <= String(size)) {
        fillValue(parseInt(key, 10));
      } else if (key === "Backspace" || key === "Delete") {
        clearCurrentCell();
      } else if (key.toLowerCase() === "n") {
        toggleNote();
      } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        e.preventDefault();
        navigateCell(key);
      }
    }

    function toggleNote() {
      noteMode = !noteMode;
      noteBtn.classList.toggle("primary", noteMode);
      noteStatusEl.textContent = noteMode ? "开" : "关";
      sfx.click();
    }

    function navigateCell(arrow) {
      if (!selectedCell) {
        selectedCell = { r: 0, c: 0 };
      } else {
        let { r, c } = selectedCell;
        if (arrow === "ArrowUp") r = (r - 1 + size) % size;
        if (arrow === "ArrowDown") r = (r + 1) % size;
        if (arrow === "ArrowLeft") c = (c - 1 + size) % size;
        if (arrow === "ArrowRight") c = (c + 1) % size;
        selectedCell = { r, c };
      }
      renderBoard();
    }

    window.addEventListener("keydown", onKeyDown);
    noteBtn.addEventListener("click", toggleNote);
    clearBtn.addEventListener("click", clearCurrentCell);

    timerIv = setInterval(() => {
      if (!running) return;
      const curSec = ((performance.now() - t0) / 1000).toFixed(1);
      timerEl.textContent = `${curSec}s`;
    }, 100);

    // 默认选中第一个空格
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (userGrid[r][c] === 0) {
          selectedCell = { r, c };
          break;
        }
      }
      if (selectedCell) break;
    }

    renderBoard();

    return {
      abort() {
        running = false;
        clearInterval(timerIv);
        window.removeEventListener("keydown", onKeyDown);
      }
    };
  }
};
