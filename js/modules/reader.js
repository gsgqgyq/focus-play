/* reader.js — 专注速读器 (RSVP Focus Reader)
   核心功能：
   1. 链接抓取：通过 r.jina.ai 免跨域智能提取文章正文与标题，自动过滤广告与杂质。
   2. 自由粘贴：支持用户粘贴任意长文或读书笔记。
   3. 精选微文：内置脑科学与趣味科普短文，一键体验。
   4. RSVP 极速视认流：ORP 最佳视认中心对齐、速度调节 (200-1200 WPM)、标点智能微停顿与全键盘快捷键。 */
import { t } from "../i18n.js";
import { sfx } from "../audio.js";
import { toast } from "../app.js";

// 精选预置文章库
const PRESET_ARTICLES = [
  {
    title: "多巴胺与前额叶：对抗走神与重获专注的神经科学密码",
    content: `现代生活充斥着碎片化的即时刺激，短视频、信息流与无休止的红点通知正在重塑我们大脑的多巴胺阈值。多巴胺并非单纯的“快乐分子”，它本质上是大脑的“预期奖赏与动机驱动剂”。

当我们在任务之间频繁横跳时，前额叶皮层（Prefrontal Cortex）负责维持注意力与目标导向的神经网络会被迫反复加载与重置，产生巨大的“任务切换损耗（Switch Cost）”。这也是为什么一天下来明明没做多少实质工作，却感到精疲力竭、脑雾弥漫。

重建专注的关键，不在于依靠蛮力压抑走神，而在于“降低初始启动阻力”与“缩短正向反馈链条”。通过将庞大艰涩的远期目标拆解为 5 分钟微步冲刺，并在每一次小闭环完成时给予确定性肯定，前额叶的多巴胺回路就能重新被温和点亮。

专注不是一种天赋，它是一门可以通过刻意练习被反复强化的神经肌肉力量。`
  },
  {
    title: "深海之谜：章鱼的三颗心脏与九个大脑",
    content: `章鱼是地球上演化史上最迷人、最不可思议的智慧生命之一。它们与人类在演化树上分道扬镳了数亿年，却独立演化出了极度发达的认知系统。

章鱼拥有三颗心脏。两颗分鳃心脏专门负责将血液压入鳃部进行氧气交换，另一颗主动脉心脏则负责将富氧血液泵向全身。有趣的是，当章鱼游动时，系统心脏会暂时停止跳动，这也是为什么它们更喜欢在海底爬行而非长时间剧烈巡游。

更令人惊叹的是章鱼的神经分布。章鱼拥有约 5 亿个神经元，但其中近三分之二并不在头部的主脑中，而是分散分布在八条灵活的腕足神经节里。这相当于每一条触手都拥有自主感知、决策与记忆的能力。

在浩瀚深海的生存博弈中，去中心化的神经架构与变色伪装艺术，让章鱼成为了生物仿生学与人工智能探索分布式算力的终极自然导师。`
  },
  {
    title: "时间知觉的假象：为什么快乐的时光总是稍纵即逝",
    content: `你一定经历过这样的体验：沉浸在热爱的事物或好玩的游戏中时，几小时仿佛只过了一瞬间；而在枯燥乏味的会议或排队等待时，短短数分钟却度日如年。

在认知神经科学中，这种现象被称为“主观时间知觉膨胀与压缩”。人类大脑并没有一个像机械表那样匀速转动的绝对物理钟，我们对时间流逝的感知，本质上是由前额叶、基底节多巴胺脉冲以及记忆刻录密度的综合评估决定的。

当你全神贯注进入心流状态时，前额叶不再频繁自检“现在几点了”，内源性时间监控回路被暂时挂起，时间因此被极速压缩；而在极度无聊时，大脑缺乏有效刺激，注意力探针只能反复探查时间刻度，每一秒都被迫放大。

理解时间知觉的弹性，是克服时间焦虑（Time Blindness）的起点。借由可视化的时间表盘与规律呼吸，我们能够重新夺回对自我生命的感知主导权。`
  }
];

export function initReader() {
  const container = document.getElementById("view-reader");
  if (!container) return;

  let currentTitle = "专注速读文章";
  let rawText = PRESET_ARTICLES[0].content;
  let tokens = [];
  let currentTokenIdx = 0;
  let wpm = 450;
  let isPlaying = false;
  let playTimer = null;
  let activeInputMode = "url"; // 'url' | 'paste' | 'preset'
  let audioTick = false;

  container.innerHTML = `
    <!-- 准备/配置区 -->
    <div id="readerSetupWrap" class="reader-setup-wrap">
      <header class="view-head" style="margin-bottom:16px">
        <h1 data-i18n="reader_title">📖 专注速读器 · Focus Reader</h1>
        <p data-i18n="reader_sub">消除眼动跳跃与默读拖累，让长文以 400+ 字/分 流入大脑，专治阅读拖延与启动瘫痪。</p>
      </header>

      <!-- 标签页切换 -->
      <div class="reader-tabs">
        <button class="reader-tab active" data-tab="url">🔗 网页链接提取</button>
        <button class="reader-tab" data-tab="paste">📝 自由粘贴长文</button>
        <button class="reader-tab" data-tab="preset">💡 精选科普微文</button>
      </div>

      <!-- Tab 1: 链接提取 -->
      <div id="tabContentUrl" class="reader-tab-pane active">
        <div class="reader-input-row">
          <input type="url" id="readerUrlInput" placeholder="输入任意微信公众号、少数派、Medium、知乎或新闻网页链接..." />
          <button class="btn primary" id="readerExtractBtn">⚡ 一键提取正文</button>
        </div>
        <div id="readerExtractStatus" class="reader-extract-status"></div>
      </div>

      <!-- Tab 2: 自由粘贴 -->
      <div id="tabContentPaste" class="reader-tab-pane">
        <textarea id="readerPasteTextarea" class="reader-textarea" placeholder="在此直接粘贴任何报告、文章、读书笔记或论文草稿..."></textarea>
      </div>

      <!-- Tab 3: 精选微文 -->
      <div id="tabContentPreset" class="reader-tab-pane">
        <div class="reader-presets-list" id="readerPresetsList">
          ${PRESET_ARTICLES.map((a, i) => `
            <button class="preset-article-card ${i === 0 ? 'selected' : ''}" data-idx="${i}">
              <h4>${a.title}</h4>
              <p>${a.content.slice(0, 70)}...</p>
            </button>
          `).join("")}
        </div>
      </div>

      <!-- 正文预检与预估时间卡片 -->
      <div class="card reader-preview-card">
        <div class="rpc-head">
          <h3 id="readerPreviewTitle">${PRESET_ARTICLES[0].title}</h3>
          <span class="rpc-badge" id="readerPreviewBadge">共 380 字</span>
        </div>
        <p class="rpc-excerpt" id="readerPreviewExcerpt">${PRESET_ARTICLES[0].content.slice(0, 140)}...</p>

        <div class="rpc-meta-row">
          <div class="rpc-meta-item">
            <span class="rpc-label">当前速度 (WPM)</span>
            <div class="rpc-wpm-selector">
              <button class="wpm-chip" data-wpm="300">300 慢速</button>
              <button class="wpm-chip active" data-wpm="450">450 适中</button>
              <button class="wpm-chip" data-wpm="600">600 高速</button>
              <button class="wpm-chip" data-wpm="800">800 极速</button>
            </div>
          </div>
          <div class="rpc-meta-item right">
            <span class="rpc-label">预估阅读总用时</span>
            <b class="rpc-eta-val" id="readerEtaVal">约 50 秒</b>
          </div>
        </div>

        <div class="rpc-actions">
          <button class="btn primary big" id="readerStartFlowBtn">▶ 开始极速视认流</button>
        </div>
      </div>
    </div>

    <!-- RSVP 全屏/沉浸视认播放器 -->
    <div id="readerStageWrap" class="reader-stage-wrap" style="display:none">
      <div class="rsw-topbar">
        <button class="btn" id="readerExitStageBtn">← 返回文章设置</button>
        <span class="rsw-title-tip" id="readerStageTitle">极速视认流</span>
        <div class="rsw-settings">
          <button class="icon-btn" id="readerAudioToggle" title="点击开关打拍微音">🔔</button>
          <span class="rsw-wpm-hud" id="readerStageWpmHud">450 WPM</span>
        </div>
      </div>

      <!-- 中心视认室 -->
      <div class="rsvp-chamber">
        <div class="rsvp-reticle">
          <div class="reticle-line top"></div>
          <div class="reticle-marker top-marker">▼</div>
          
          <div class="rsvp-word-display" id="rsvpDisplay">
            <span class="orp-part left">专</span><span class="orp-part center">注</span><span class="orp-part right">力</span>
          </div>

          <div class="reticle-marker bottom-marker">▲</div>
          <div class="reticle-line bottom"></div>
        </div>
      </div>

      <!-- 进度与控制条 -->
      <div class="rsvp-dock">
        <div class="rsvp-progress-bar" id="rsvpProgressTrack">
          <div class="rsvp-progress-fill" id="rsvpProgressFill" style="width:0%"></div>
        </div>

        <div class="rsvp-control-row">
          <span class="rsvp-counter" id="rsvpCounter">0 / 0</span>

          <div class="rsvp-btn-group">
            <button class="icon-btn" id="rsvpStepBack" title="后退 10 词 (←)">⏮ 10</button>
            <button class="btn primary big rsvp-play-btn" id="rsvpPlayPauseBtn">▶ 播放 (空格)</button>
            <button class="icon-btn" id="rsvpStepForward" title="前进 10 词 (→)">10 ⏭</button>
          </div>

          <div class="rsvp-speed-adj">
            <button class="icon-btn" id="rsvpDecWpm" title="减速 (↓)">-</button>
            <span id="rsvpCurWpmText">450</span>
            <button class="icon-btn" id="rsvpIncWpm" title="加速 (↑)">+</button>
          </div>
        </div>

        <div class="rsvp-hotkeys-tip">
          <span>⌨️ 快捷键：<b>空格</b> 播放/暂停 · <b>↑ / ↓</b> 调速 · <b>← / →</b> 快退/快进 10 词 · <b>Esc</b> 退出</span>
        </div>
      </div>
    </div>
  `;

  // DOM 绑定
  const setupWrap = container.querySelector("#readerSetupWrap");
  const stageWrap = container.querySelector("#readerStageWrap");

  // Tab 元素
  const tabs = container.querySelectorAll(".reader-tab");
  const paneUrl = container.querySelector("#tabContentUrl");
  const panePaste = container.querySelector("#tabContentPaste");
  const panePreset = container.querySelector("#tabContentPreset");

  const urlInput = container.querySelector("#readerUrlInput");
  const extractBtn = container.querySelector("#readerExtractBtn");
  const extractStatus = container.querySelector("#readerExtractStatus");
  const pasteTextarea = container.querySelector("#readerPasteTextarea");
  const presetsList = container.querySelector("#readerPresetsList");

  // 预览区元素
  const previewTitle = container.querySelector("#readerPreviewTitle");
  const previewBadge = container.querySelector("#readerPreviewBadge");
  const previewExcerpt = container.querySelector("#readerPreviewExcerpt");
  const etaVal = container.querySelector("#readerEtaVal");
  const startFlowBtn = container.querySelector("#readerStartFlowBtn");
  const wpmChips = container.querySelectorAll(".wpm-chip");

  // 播放器元素
  const exitStageBtn = container.querySelector("#readerExitStageBtn");
  const stageTitle = container.querySelector("#readerStageTitle");
  const stageWpmHud = container.querySelector("#readerStageWpmHud");
  const audioToggle = container.querySelector("#readerAudioToggle");
  const rsvpDisplay = container.querySelector("#rsvpDisplay");
  const progressFill = container.querySelector("#rsvpProgressFill");
  const progressTrack = container.querySelector("#rsvpProgressTrack");
  const counterEl = container.querySelector("#rsvpCounter");
  const playPauseBtn = container.querySelector("#rsvpPlayPauseBtn");
  const stepBackBtn = container.querySelector("#rsvpStepBack");
  const stepForwardBtn = container.querySelector("#rsvpStepForward");
  const decWpmBtn = container.querySelector("#rsvpDecWpm");
  const incWpmBtn = container.querySelector("#rsvpIncWpm");
  const curWpmText = container.querySelector("#rsvpCurWpmText");

  // 1. 文本分词与 ORP（最佳视认点）处理算法
  function tokenize(text) {
    if (!text) return [];
    // 过滤掉 markdown 多余标记
    const clean = text
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[#*`_~]/g, "")
      .trim();

    // 混合切分：中文按 1~2 个汉字分词，英文/数字按单词分词
    const res = [];
    const regex = /([a-zA-Z0-9]+|[，。！？、；：,.!?;:\n]|[\u4e00-\u9fa5]{1,2}|[^\s])/g;
    let match;
    while ((match = regex.exec(clean)) !== null) {
      const w = match[0].trim();
      if (w) res.push(w);
    }
    return res.length > 0 ? res : ["未", "检测", "到", "有效", "文本"];
  }

  function updateTokens(title, text) {
    currentTitle = title;
    rawText = text;
    tokens = tokenize(text);
    currentTokenIdx = 0;

    const charCount = text.replace(/\s+/g, "").length;
    previewTitle.textContent = currentTitle;
    previewBadge.textContent = `共 ${charCount} 字 (${tokens.length} 词元)`;
    previewExcerpt.textContent = text.slice(0, 140) + "...";
    updateEta();
  }

  function updateEta() {
    const total = tokens.length;
    const sec = Math.round((total / wpm) * 60);
    if (sec < 60) {
      etaVal.textContent = `约 ${sec} 秒`;
    } else {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      etaVal.textContent = `约 ${m} 分 ${s} 秒`;
    }
  }

  // 2. Tab 切换
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      sfx.click();
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.tab;
      activeInputMode = mode;

      paneUrl.classList.toggle("active", mode === "url");
      panePaste.classList.toggle("active", mode === "paste");
      panePreset.classList.toggle("active", mode === "preset");
    });
  });

  // 3. Tab 1: 网页 URL 智能正文提取 (Jina Reader 引擎)
  extractBtn.addEventListener("click", async () => {
    let url = (urlInput.value || "").trim();
    if (!url) {
      toast("请先输入网页链接");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    sfx.click();
    extractBtn.disabled = true;
    extractStatus.innerHTML = `<span class="extract-loading">🔄 正在智能提取正文并剥离广告杂质，请稍候...</span>`;

    try {
      // 采用 r.jina.ai 免跨域纯净正文提取服务
      const jinaUrl = `https://r.jina.ai/${url}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const resp = await fetch(jinaUrl, {
        signal: controller.signal,
        headers: { "X-No-Cache": "true" }
      });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const text = await resp.text();
      extractBtn.disabled = false;

      // 提取标题与正文
      let articleTitle = "提取文章";
      const titleMatch = text.match(/Title:\s*(.+)/i) || text.match(/^#\s+(.+)/m);
      if (titleMatch && titleMatch[1]) {
        articleTitle = titleMatch[1].trim();
      }

      // 清除 Jina 附带的 URL/Markdown 头部
      const bodyClean = text
        .replace(/^Title:.*$/im, "")
        .replace(/^URL Source:.*$/im, "")
        .replace(/^Markdown Content:.*$/im, "")
        .trim();

      if (bodyClean.length < 50) {
        throw new Error("正文内容过短，可能被网页反爬拦截");
      }

      extractStatus.innerHTML = `<span class="extract-success">✅ 正文提取成功！已过滤广告与页眉页脚。</span>`;
      updateTokens(articleTitle, bodyClean);
      sfx.levelup();
      toast("正文提取成功！已就绪");
    } catch (err) {
      console.warn("Extract error:", err);
      extractBtn.disabled = false;
      extractStatus.innerHTML = `
        <span class="extract-error">
          ⚠️ 自动提取受限（原因：${err.message || '网络超时'}）。建议直接复制网页文本，切换到【📝 自由粘贴长文】粘贴使用！
        </span>
      `;
      toast("网页提取超时或受限，可复制文本直接粘贴");
    }
  });

  // 4. Tab 2: 自由粘贴监听
  pasteTextarea.addEventListener("input", () => {
    const val = pasteTextarea.value.trim();
    if (val.length > 0) {
      const firstLine = val.split("\n")[0].slice(0, 30);
      updateTokens(firstLine || "粘贴长文", val);
    }
  });

  // 5. Tab 3: 精选微文选择
  presetsList.querySelectorAll(".preset-article-card").forEach(card => {
    card.addEventListener("click", () => {
      sfx.click();
      presetsList.querySelectorAll(".preset-article-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      const idx = parseInt(card.dataset.idx, 10);
      const article = PRESET_ARTICLES[idx];
      updateTokens(article.title, article.content);
    });
  });

  // 6. 速度芯片切换
  wpmChips.forEach(chip => {
    chip.addEventListener("click", () => {
      sfx.click();
      wpmChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      wpm = parseInt(chip.dataset.wpm, 10);
      setWpm(wpm);
      updateEta();
    });
  });

  function setWpm(newWpm) {
    wpm = Math.max(150, Math.min(1500, newWpm));
    stageWpmHud.textContent = `${wpm} WPM`;
    curWpmText.textContent = wpm;
    if (isPlaying) {
      restartWordLoop();
    }
  }

  // 7. 进入 RSVP 极速视认播放器
  startFlowBtn.addEventListener("click", () => {
    if (tokens.length === 0) {
      tokens = tokenize(rawText);
    }
    sfx.click();
    setupWrap.style.display = "none";
    stageWrap.style.display = "flex";
    stageTitle.textContent = currentTitle;
    currentTokenIdx = 0;
    renderCurrentWord();
    play();
  });

  exitStageBtn.addEventListener("click", () => {
    sfx.click();
    pause();
    stageWrap.style.display = "none";
    setupWrap.style.display = "block";
  });

  // 8. ORP 核心渲染与对齐
  function renderCurrentWord() {
    if (currentTokenIdx >= tokens.length) {
      pause();
      rsvpDisplay.innerHTML = `<span class="orp-part center" style="color:var(--good);font-size:2rem">🎉 阅读完毕</span>`;
      counterEl.textContent = `${tokens.length} / ${tokens.length}`;
      progressFill.style.width = "100%";
      sfx.levelup();
      return;
    }

    const token = tokens[currentTokenIdx];
    const len = token.length;

    // 计算最佳视认点 (ORP: 约在 30%~50% 位置)
    let orpIndex = 0;
    if (len === 1) orpIndex = 0;
    else if (len <= 3) orpIndex = 1;
    else orpIndex = Math.floor((len - 1) / 3);

    const leftPart = token.slice(0, orpIndex);
    const centerPart = token[orpIndex] || "";
    const rightPart = token.slice(orpIndex + 1);

    rsvpDisplay.innerHTML = `
      <span class="orp-part left">${leftPart}</span><span class="orp-part center">${centerPart}</span><span class="orp-part right">${rightPart}</span>
    `;

    counterEl.textContent = `${currentTokenIdx + 1} / ${tokens.length}`;
    const pct = Math.round(((currentTokenIdx + 1) / tokens.length) * 100);
    progressFill.style.width = `${pct}%`;

    if (audioTick) {
      sfx.tap();
    }
  }

  // 9. 智能呼吸微停顿算法 (计算当前词的展示时长)
  function getIntervalForToken(token) {
    const baseMs = (60 / wpm) * 1000;
    if (!token) return baseMs;

    // 标点符号智能停顿
    if (/[，,、；;]/.test(token)) return baseMs + 100;
    if (/[。！？.!?]/.test(token)) return baseMs + 220;
    if (/\n/.test(token)) return baseMs + 320;
    if (token.length > 5) return baseMs + 60; // 较长生词略微多留 60ms

    return baseMs;
  }

  function nextWord() {
    if (!isPlaying) return;
    currentTokenIdx++;
    if (currentTokenIdx >= tokens.length) {
      renderCurrentWord();
      return;
    }
    renderCurrentWord();
    const token = tokens[currentTokenIdx];
    const delay = getIntervalForToken(token);
    playTimer = setTimeout(nextWord, delay);
  }

  function play() {
    if (currentTokenIdx >= tokens.length) {
      currentTokenIdx = 0;
    }
    isPlaying = true;
    playPauseBtn.textContent = "⏸ 暂停 (空格)";
    playPauseBtn.classList.remove("primary");
    const delay = getIntervalForToken(tokens[currentTokenIdx]);
    clearTimeout(playTimer);
    playTimer = setTimeout(nextWord, delay);
  }

  function pause() {
    isPlaying = false;
    clearTimeout(playTimer);
    playPauseBtn.textContent = "▶ 播放 (空格)";
    playPauseBtn.classList.add("primary");
  }

  function restartWordLoop() {
    clearTimeout(playTimer);
    if (isPlaying) {
      const delay = getIntervalForToken(tokens[currentTokenIdx]);
      playTimer = setTimeout(nextWord, delay);
    }
  }

  function togglePlay() {
    if (isPlaying) pause();
    else play();
  }

  function jumpWords(delta) {
    currentTokenIdx = Math.max(0, Math.min(tokens.length - 1, currentTokenIdx + delta));
    renderCurrentWord();
    if (isPlaying) restartWordLoop();
  }

  // 10. 控制按钮事件
  playPauseBtn.addEventListener("click", () => {
    sfx.click();
    togglePlay();
  });

  stepBackBtn.addEventListener("click", () => {
    sfx.click();
    jumpWords(-10);
  });

  stepForwardBtn.addEventListener("click", () => {
    sfx.click();
    jumpWords(10);
  });

  decWpmBtn.addEventListener("click", () => {
    sfx.click();
    setWpm(wpm - 50);
  });

  incWpmBtn.addEventListener("click", () => {
    sfx.click();
    setWpm(wpm + 50);
  });

  audioToggle.addEventListener("click", () => {
    audioTick = !audioTick;
    audioToggle.textContent = audioTick ? "🔔" : "🔕";
    audioToggle.style.opacity = audioTick ? "1" : "0.5";
    sfx.click();
    toast(audioTick ? "已开启打拍提示音" : "已静音");
  });

  // 点击进度条快速跳转
  progressTrack.addEventListener("click", (e) => {
    const rect = progressTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    currentTokenIdx = Math.floor(pct * tokens.length);
    renderCurrentWord();
    if (isPlaying) restartWordLoop();
  });

  // 全局键盘监听
  window.addEventListener("keydown", (e) => {
    if (stageWrap.style.display === "none") return;

    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      jumpWords(-10);
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      jumpWords(10);
    } else if (e.code === "ArrowUp") {
      e.preventDefault();
      setWpm(wpm + 50);
    } else if (e.code === "ArrowDown") {
      e.preventDefault();
      setWpm(wpm - 50);
    } else if (e.code === "Escape") {
      exitStageBtn.click();
    }
  });

  // 默认装载初始文章
  updateTokens(PRESET_ARTICLES[0].title, PRESET_ARTICLES[0].content);
}
