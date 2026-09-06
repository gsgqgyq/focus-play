/* ambient.js — 双引擎多源白噪音控制器（YouTube IFrame 音源 + 本地 Web Audio 算法褐噪/粉噪） */
import { store } from "./state.js";
import { proceduralAudio, sfx } from "./audio.js";
import { t } from "./i18n.js";

// 精选专为 ADHD 深度专注调配的音轨（含官方/无广告高品质长频与直播流）
export const AMBIENT_PRESETS = [
  {
    id: "local_brown",
    type: "local",
    noiseType: "brown",
    icon: "🌊",
    titleKey: "amb_brown_local",
    descKey: "amb_brown_local_d"
  },
  {
    id: "local_pink",
    type: "local",
    noiseType: "pink",
    icon: "🌧️",
    titleKey: "amb_pink_local",
    descKey: "amb_pink_local_d"
  },
  {
    id: "yt_brown",
    type: "youtube",
    ytId: "RqzGzwTY-6w", // 8 Hour Deep Brown Noise for ADHD
    icon: "🎧",
    titleKey: "amb_yt_brown",
    descKey: "amb_yt_brown_d"
  },
  {
    id: "yt_rain",
    type: "youtube",
    ytId: "mPZkdNFkNps", // Soothing Rain & Distant Thunder
    icon: "⛈️",
    titleKey: "amb_yt_rain",
    descKey: "amb_yt_rain_d"
  },
  {
    id: "yt_cafe",
    type: "youtube",
    ytId: "gaGrHUekGrc", // Cozy Coffee Shop Ambience (Body Doubling)
    icon: "☕",
    titleKey: "amb_yt_cafe",
    descKey: "amb_yt_cafe_d"
  },
  {
    id: "yt_lofi",
    type: "youtube",
    ytId: "jfKfPfyJRdk", // Lofi Girl Study & Relax Beats
    icon: "🎵",
    titleKey: "amb_yt_lofi",
    descKey: "amb_yt_lofi_d"
  },
  {
    id: "yt_forest",
    type: "youtube",
    ytId: "xNN7iTA57jM", // Green Noise Nature Forest & Stream
    icon: "🌲",
    titleKey: "amb_yt_forest",
    descKey: "amb_yt_forest_d"
  },
  {
    id: "yt_40hz",
    type: "youtube",
    ytId: "uU2eP4L9-F0", // 40Hz Gamma Focus Frequency
    icon: "⚡",
    titleKey: "amb_yt_40hz",
    descKey: "amb_yt_40hz_d"
  }
];

let ytPlayer = null;
let ytReady = false;
let isPlaying = false;
let currentTrackId = store.getPref("ambientTrack", "local_brown");
let volume = store.getPref("ambientVolume", 0.65);
let ytPendingPlay = false;

/* 初始化 YouTube IFrame API */
function initYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    onYouTubeIframeAPIReady();
    return;
  }
  if (!document.getElementById("yt-iframe-script")) {
    const tag = document.createElement("script");
    tag.id = "yt-iframe-script";
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }
  window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
}

function onYouTubeIframeAPIReady() {
  const container = document.getElementById("ytPlayerHost");
  if (!container) return;

  ytPlayer = new window.YT.Player("ytPlayerHost", {
    height: "1",
    width: "1",
    videoId: "RqzGzwTY-6w",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      loop: 1,
      modestbranding: 1,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: () => {
        ytReady = true;
        ytPlayer.setVolume(Math.round(volume * 100));
        if (ytPendingPlay) {
          ytPendingPlay = false;
          playCurrent();
        }
      },
      onStateChange: (e) => {
        // 自动循环播放
        if (e.data === window.YT.PlayerState.ENDED) {
          ytPlayer.playVideo();
        }
      }
    }
  });
}

function extractYouTubeId(urlOrId) {
  if (!urlOrId) return "";
  const str = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : "";
}

function getTrack(id) {
  if (id === "yt_custom") {
    const customId = extractYouTubeId(store.getPref("customYoutubeId", ""));
    return {
      id: "yt_custom",
      type: "youtube",
      ytId: customId || "RqzGzwTY-6w",
      icon: "🔗",
      titleKey: "amb_yt_custom",
      descKey: "amb_yt_custom_d"
    };
  }
  return AMBIENT_PRESETS.find(p => p.id === id) || AMBIENT_PRESETS[0];
}

function playCurrent() {
  const track = getTrack(currentTrackId);
  if (!track) return;

  if (track.type === "local") {
    // 停止 YouTube
    if (ytPlayer && ytReady && typeof ytPlayer.pauseVideo === "function") {
      try { ytPlayer.pauseVideo(); } catch (e) {}
    }
    proceduralAudio.start(track.noiseType || "brown", volume);
    isPlaying = true;
  } else if (track.type === "youtube") {
    // 停止本地算法噪音
    proceduralAudio.stop();
    if (!ytReady) {
      ytPendingPlay = true;
      initYouTubeAPI();
      isPlaying = true;
      updateUI();
      return;
    }
    const currentVideoUrl = ytPlayer.getVideoUrl ? ytPlayer.getVideoUrl() : "";
    if (!currentVideoUrl.includes(track.ytId)) {
      ytPlayer.loadVideoById(track.ytId);
    } else {
      ytPlayer.playVideo();
    }
    ytPlayer.setVolume(Math.round(volume * 100));
    isPlaying = true;
  }
  updateUI();
}

function pauseCurrent() {
  proceduralAudio.stop();
  if (ytPlayer && ytReady && typeof ytPlayer.pauseVideo === "function") {
    try { ytPlayer.pauseVideo(); } catch (e) {}
  }
  isPlaying = false;
  updateUI();
}

export const ambientPlayer = {
  init() {
    initYouTubeAPI();
    this.renderDock();
    updateUI();
  },

  isPlaying() {
    return isPlaying;
  },

  getCurrentTrack() {
    return getTrack(currentTrackId);
  },

  togglePlay() {
    if (isPlaying) {
      pauseCurrent();
    } else {
      playCurrent();
    }
    return isPlaying;
  },

  play() {
    if (!isPlaying) playCurrent();
  },

  pause() {
    if (isPlaying) pauseCurrent();
  },

  selectTrack(trackId) {
    currentTrackId = trackId;
    store.setPref("ambientTrack", trackId);
    if (isPlaying) {
      playCurrent();
    } else {
      updateUI();
    }
  },

  setVolume(newVol) {
    volume = Math.max(0, Math.min(1, newVol));
    store.setPref("ambientVolume", volume);
    proceduralAudio.setVolume(volume);
    if (ytPlayer && ytReady && typeof ytPlayer.setVolume === "function") {
      ytPlayer.setVolume(Math.round(volume * 100));
    }
    updateUI();
  },

  setCustomYouTube(urlOrId) {
    const validId = extractYouTubeId(urlOrId);
    if (validId) {
      store.setPref("customYoutubeId", validId);
      this.selectTrack("yt_custom");
      return true;
    }
    return false;
  },

  renderDock() {
    const dock = document.getElementById("ambientDock");
    if (!dock) return;

    dock.innerHTML = `
      <div class="amb-dock-bar">
        <button id="ambToggleBtn" class="amb-play-btn" title="播放/暂停白噪音">
          <span id="ambPlayIcon">▶</span>
        </button>
        <div class="amb-info" id="ambOpenSelector">
          <span class="amb-icon" id="ambCurrentIcon">🎧</span>
          <div class="amb-texts">
            <div class="amb-title" id="ambCurrentTitle">褐噪音 · 深度专注</div>
            <div class="amb-sub" id="ambCurrentSub">原生算法低通滤波</div>
          </div>
          <span class="amb-arrow">▾</span>
        </div>
        <div class="amb-vol-wrap">
          <span class="amb-vol-icon">🔉</span>
          <input type="range" id="ambVolumeSlider" min="0" max="1" step="0.05" value="${volume}" class="amb-slider">
        </div>
      </div>

      <!-- 弹出式音轨选择面板 -->
      <div class="amb-drawer" id="ambDrawer" style="display:none">
        <div class="amb-drawer-head">
          <h3>🎵 ${t("amb_panel_title")}</h3>
          <button id="ambDrawerClose" class="icon-btn">✕</button>
        </div>
        <p class="amb-drawer-desc">${t("amb_panel_desc")}</p>
        <div class="amb-grid" id="ambPresetGrid"></div>
        <div class="amb-custom-box">
          <h4>🔗 ${t("amb_custom_title")}</h4>
          <p>${t("amb_custom_desc")}</p>
          <div class="amb-custom-row">
            <input type="text" id="ambCustomInput" placeholder="输入 YouTube 视频链接或 ID..." value="${store.getPref("customYoutubeId", "")}">
            <button class="btn primary" id="ambCustomApply">${t("amb_custom_btn")}</button>
          </div>
        </div>
      </div>
    `;

    // 绑定事件
    document.getElementById("ambToggleBtn").addEventListener("click", () => {
      sfx.click();
      this.togglePlay();
    });

    document.getElementById("ambOpenSelector").addEventListener("click", () => {
      sfx.click();
      const drawer = document.getElementById("ambDrawer");
      const isHidden = drawer.style.display === "none";
      drawer.style.display = isHidden ? "block" : "none";
      if (isHidden) renderPresetList();
    });

    document.getElementById("ambDrawerClose").addEventListener("click", () => {
      sfx.click();
      document.getElementById("ambDrawer").style.display = "none";
    });

    const volSlider = document.getElementById("ambVolumeSlider");
    volSlider.addEventListener("input", (e) => {
      this.setVolume(parseFloat(e.target.value));
    });

    document.getElementById("ambCustomApply").addEventListener("click", () => {
      sfx.click();
      const inputVal = document.getElementById("ambCustomInput").value.trim();
      if (this.setCustomYouTube(inputVal)) {
        document.getElementById("ambDrawer").style.display = "none";
        playCurrent();
      } else {
        alert(t("amb_invalid_yt"));
      }
    });

    renderPresetList();
  }
};

function renderPresetList() {
  const grid = document.getElementById("ambPresetGrid");
  if (!grid) return;

  grid.innerHTML = AMBIENT_PRESETS.map(p => {
    const isAct = p.id === currentTrackId;
    return `
      <div class="amb-card ${isAct ? 'active' : ''}" data-tid="${p.id}">
        <div class="amb-card-icon">${p.icon}</div>
        <div class="amb-card-body">
          <div class="amb-card-title">${t(p.titleKey)}</div>
          <div class="amb-card-desc">${t(p.descKey)}</div>
        </div>
        <span class="amb-card-badge">${p.type === 'local' ? t("amb_badge_local") : 'YouTube'}</span>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".amb-card").forEach(c => {
    c.addEventListener("click", () => {
      sfx.click();
      const tid = c.dataset.tid;
      ambientPlayer.selectTrack(tid);
      document.getElementById("ambDrawer").style.display = "none";
    });
  });
}

function updateUI() {
  const track = getTrack(currentTrackId);
  const playBtn = document.getElementById("ambPlayIcon");
  const iconEl = document.getElementById("ambCurrentIcon");
  const titleEl = document.getElementById("ambCurrentTitle");
  const subEl = document.getElementById("ambCurrentSub");

  if (playBtn) playBtn.textContent = isPlaying ? "⏸" : "▶";
  if (iconEl) iconEl.textContent = track.icon;
  if (titleEl) titleEl.textContent = t(track.titleKey);
  if (subEl) subEl.textContent = t(track.descKey);

  const toggleBtn = document.getElementById("ambToggleBtn");
  if (toggleBtn) {
    toggleBtn.classList.toggle("playing", isPlaying);
  }

  // 刷新外层网格高亮
  const grid = document.getElementById("ambPresetGrid");
  if (grid) {
    grid.querySelectorAll(".amb-card").forEach(c => {
      c.classList.toggle("active", c.dataset.tid === currentTrackId);
    });
  }
}

window.addEventListener("ff:lang", () => {
  ambientPlayer.renderDock();
  updateUI();
});
