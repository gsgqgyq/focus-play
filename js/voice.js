/* voice — 浏览器 SpeechSynthesis 语音播报（离线可用，中/英） */
import { store } from "./state.js";
import { lang } from "./i18n.js";

let enabled = store.getPref("voice", false);
function pickVoice(){
  try{
    if(!("speechSynthesis" in window)) return null;
    const vs=speechSynthesis.getVoices();
    const want=lang==="zh" ? /zh|cmn|chi/i : /en/i;
    return [...vs].find(v=>want.test(v.lang+ " "+v.name)) || (lang==="zh"?vs.find(v=>v.lang.startsWith("zh")):null) || null;
  }catch(e){ return null; }
}
if (typeof speechSynthesis !== "undefined") { speechSynthesis.onvoiceschanged = () => {}; } // warm cache

export const voice={
  isOn(){ return enabled; },
  toggle(){ enabled=!enabled; store.setPref("voice", enabled); return enabled; },
  set(on){ enabled=on; store.setPref("voice", on); },
  cancel(){ try{ speechSynthesis.cancel(); }catch(e){} },
  say(text, opts={}){
    if(!enabled || !("speechSynthesis" in window) || !text) return;
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.lang=lang==="zh"?"zh-CN":"en-US";
      u.rate=opts.rate ?? 0.92;
      u.pitch=opts.pitch ?? 1;
      const v=pickVoice(); if(v) u.voice=v;
      speechSynthesis.speak(u);
    }catch(e){}
  },
};