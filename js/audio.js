/* audio — Web Audio 实时合成轻音乐与音效，零音频文件、免授权 */
import { store } from "./state.js";

let ctx=null, master=null, musicGain=null, musicOn=false, musicTimer=null;
const chords=[[261.63,329.63,392.00,493.88],[220.00,277.18,329.63,415.30],
  [246.94,293.66,369.99,440.00],[196.00,246.94,293.66,392.00]]; // Am F C G-ish
let chordIdx=0;

function init(){
  if(ctx) return;
  try{
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=0.6; master.connect(ctx.destination);
    musicGain=ctx.createGain(); musicGain.gain.value=0.0; musicGain.connect(master);
  }catch(e){ ctx=null; }
}
function ensureRunning(){ if(ctx&&ctx.state==="suspended") ctx.resume(); }

/* sober tone blip */
function blip(freq, dur, type="sine", vol=0.18, when=0, attack=0.004){
  if(!ctx) return;
  const t=ctx.currentTime+(when||0);
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+attack);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.02);
}

export const sfx={
  click(){ init(); ensureRunning(); blip(880,0.06,"sine",0.07); },
  correct(){ init(); ensureRunning(); blip(660,0.09,"triangle",0.16); blip(990,0.12,"triangle",0.12,0.09); },
  wrong(){ init(); ensureRunning(); blip(180,0.22,"sawtooth",0.10); },
  levelup(){ init(); ensureRunning();
    [523,659,784,1047].forEach((f,i)=>blip(f,0.16,"triangle",0.16,i*0.09)); },
  tick(){ init(); ensureRunning(); blip(1200,0.03,"sine",0.05); },
  go(){ init(); ensureRunning(); blip(1400,0.08,"sine",0.12); },
  nogo(){ init(); ensureRunning(); blip(220,0.14,"sine",0.12); },
  done(){ init(); ensureRunning(); [784,988,1319].forEach((f,i)=>blip(f,0.3,"triangle",0.16,i*0.16)); },
};

/* ambient music engine */
function scheduleChord(){
  if(!ctx||!musicOn) return;
  const chord=chords[chordIdx%chords.length]; chordIdx++;
  musicGain.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
  const dur=7+(Math.random()*3);
  chord.forEach((f,ii)=>{
    [0,-4,5].forEach(det=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type=ii===0?"sine":"triangle"; o.frequency.value=f; o.detune.value=det;
      g.gain.setValueAtTime(0.0001,ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.04,ctx.currentTime+2.2);
      g.gain.linearRampToValueAtTime(0.0001,ctx.currentTime+dur);
      o.connect(g); g.connect(musicGain); o.start(ctx.currentTime); o.stop(ctx.currentTime+dur+0.1);
    });
  });
  // occasional sparkle bell
  if(Math.random()<0.5) setTimeout(()=>{ if(ctx&&musicOn) sineBell(chord[Math.floor(Math.random()*chord.length)]*2); }, 1500+Math.random()*3000);
}
function sineBell(f){
  if(!ctx) return;
  [1,2,3.01].forEach((mult,i)=>{ blip(f*mult, 0.9, "sine", 0.05/i, i*0.01); });
}
export const music={
  isOn(){ return musicOn; },
  toggle(){
    init(); ensureRunning();
    musicOn=!musicOn;
    store.setPref("music", musicOn);
    if(musicOn){ musicTimer=setInterval(scheduleChord, 10000); scheduleChord(); }
    else{ clearInterval(musicTimer); if(musicGain) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.8); }
    return musicOn;
  },
  set(on){ if(on!==musicOn) this.toggle(); },
};