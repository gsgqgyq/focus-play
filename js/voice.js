/* voice.js — 浏览器内置 SpeechSynthesis 语音播报 */
import { store } from "./state.js";

let on = store.getPref("voice", false);

export const voice = {
  isOn() {
    return on;
  },
  toggle() {
    on = !on;
    store.setPref("voice", on);
    return on;
  },
  say(text, opts = {}) {
    if (!on || !("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = opts.rate || 1.0;
      u.pitch = opts.pitch || 1.0;
      u.lang = opts.lang || (store.getPref("lang", "zh") === "zh" ? "zh-CN" : "en-US");
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("[FocusPlay] speech synthesis failed:", e);
    }
  }
};
