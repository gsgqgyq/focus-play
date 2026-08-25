/* i18n — 中文 / English dictionaries */
const I18N = {
  zh: {
    app_name:"专注乐园", nav_games:"训练", nav_timer:"专注", nav_breathe:"呼吸", nav_stats:"数据",
    hero_title:"把专注练成肌肉", hero_sub:"用被科学支持的训练，一点点变强。每天 5 分钟，比昨天更专注一点。",
    today_focus:"今日专注", streak:"连续坚持", sessions:"总次数",
    card_games_t:"专注训练", card_games_d:"4 款科学背书的小游戏，从工作记忆到抗干扰，逐级解锁。",
    tag_nback:"N-back", tag_schulte:"舒尔特",
    card_timer_t:"专注计时", card_timer_d:"ADHD 友好的短专注段，番茄式节奏，累积你的专注时间。",
    card_breathe_t:"呼吸 · 正念", card_breathe_d:"3-7 次呼吸导航空腹呼吸，睡前助眠模式，放松身心。",
    card_stats_t:"我的数据", card_stats_d:"等级、成绩、时长跨端同步，见证自己的成长曲线。",
    games_title:"专注训练", games_sub:"选择一款，开始今天的练习。",
    timer_title:"专注计时", timer_sub:"选一个长度，开始一段不受打扰的专注。",
    breathe_title:"呼吸 · 正念", breathe_sub:"跟随圆环收缩与扩展，让呼吸慢下来。",
    stats_title:"我的数据", stats_sub:"训练时长与成绩，已跨端同步。",
    // levels
    level:"等级", locked:"未解锁", best:"最佳", done:"已完成",
    // game: nback
    n_t:"N-back 工作记忆", n_d:"记住 n 步前出现的格子位置，提升工作记忆。",
    nb_easy:"3×3", nb_turn:"第 {n} 回", nb_tap:"点击匹配", nb_notap:"非目标 无需反应", nb_end:"N-back 完成",
    nb_acc:"正确率", nb_hits:"命中", nb_misses:"漏掉", nb_false:"误报", nb_score:"得分",
    // game: schulte
    s_t:"舒尔特方格", s_d:"按顺序点击 1 到最大数，训练视觉搜索与专注宽度。",
    s_found:"找到了", s_cur:"下一个", s_great:"漂亮！", s_oops:"点错了",
    // game: stroop
    c_t:"Stroop 颜色", c_d:"字义与颜色冲突，选择【字的颜色】。训练抑制控制。",
    c_pick:"点颜色", c_oops:"错", 
    // game: gonogo
    g_t:"Go/No-Go 反应", g_d:"看到 ○ 按反应键，看到 ⊗ 必须忍住。训练冲动控制。",
    g_go:"GO", g_stop:"STOP", g_prompt:"按 空格/J 键 或点按钮", g_titleEnd:"本回合结束",
    // timer
    timer_start:"开始", timer_pause:"暂停", timer_reset:"重置",
    timer_done:"时间到，干得漂亮！已记录 {m} 分钟专注。",
    timer_running:"专注中……直到铃声响起",
    focus_min:"专注分钟", // generic
    // breathe
    breathe_start:"开始", breathe_stop:"结束",
    b_in:"吸", b_hold:"屏", b_out:"呼", b_relax:"放松",
    b_calm:"平静", b_deep:"深度 4-7-8", b_sleepy:"助眠", b_done:"完成 {n} 次呼吸循环",
    // stats
    st_total:"累计专注", st_min:"分钟", st_today:"今日", st_streak:"连续天数", st_sessionsN:"训练次数",
    st_breakdown:"分项成绩",
    // sync
    sync_title:"跨设备同步", sync_desc:"输入一个同步码，手机和电脑共享同一份训练档案（需要 Supabase 已配置）。",
    sync_placeholder:"输入同步码…", sync_save:"保存", sync_ok:"已连接并同步", sync_err:"同步失败，请检查配置或网络", sync_nd:"未配置 Supabase，仅本地保存",
    sync_local:"本地模式", 
    // misc
    back:"返回", start:"开始", stop:"结束", pause:"暂停", resume:"继续",
    lang:"语言", theme:"主题", music:"音乐", voice:"语音",
    next:"下一级", retry:"再练一次", done_all:"全部通关 🎉",
    exit:"退出", quit:"结束",
    min:"分", sec:"秒",
  },
  en: {
    app_name:"FocusPlay", nav_games:"Train", nav_timer:"Focus", nav_breathe:"Breathe", nav_stats:"Stats",
    hero_title:"Train your focus like a muscle", hero_sub:"Become a little stronger with science-backed training. 5 minutes a day, a bit more focused than yesterday.",
    today_focus:"Today's focus", streak:"Day streak", sessions:"Sessions",
    card_games_t:"Focus training", card_games_d:"4 science-backed micro-games, from working memory to distraction resistance, unlocking level by level.",
    tag_nback:"N-back", tag_schulte:"Schulte",
    card_timer_t:"Focus timer", card_timer_d:"ADHD-friendly short focus blocks, pomodoro rhythm, accumulate your focus time.",
    card_breathe_t:"Breathe · Mindful", card_breathe_d:"Guided deep breathing (3-7s), sleep mode before bed, relax body and mind.",
    card_stats_t:"My data", card_stats_d:"Levels, scores and time synced across devices. Watch your progress curve.",
    games_title:"Focus training", games_sub:"Pick one and begin today's practice.",
    timer_title:"Focus timer", timer_sub:"Choose a length and start an uninterrupted focus block.",
    breathe_title:"Breathe · Mindful", breathe_sub:"Follow the orb's shrink and grow to slow your breath down.",
    stats_title:"My data", stats_sub:"Training time and scores, synced across devices.",
    level:"Level", locked:"Locked", best:"Best", done:"Done",
    n_t:"N-back memory", n_d:"Remember the grid position from n steps back. Trains working memory.",
    nb_easy:"3×3", nb_turn:"Round {n}", nb_tap:"Tap if match", nb_notap:"No reaction needed", nb_end:"N-back finished",
    nb_acc:"Accuracy", nb_hits:"Hits", nb_misses:"Misses", nb_false:"False alarms", nb_score:"Score",
    s_t:"Schulte grid", s_d:"Click 1 to max in order. Trains visual search and attention span.",
    s_found:"Found", s_cur:"Next", s_great:"Nice!", s_oops:"Wrong",
    c_t:"Stroop color", c_d:"Word meaning conflicts with ink color. Pick the INK color. Trains inhibitory control.",
    c_pick:"Pick color", c_oops:"Wrong",
    g_t:"Go/No-Go", g_d:"React to ○, hold still on ⊗. Trains impulse control.",
    g_go:"GO", g_stop:"STOP", g_prompt:"Press Space / J or tap",
    timer_start:"Start", timer_pause:"Pause", timer_reset:"Reset",
    timer_done:"Time's up, nice work! Recorded {m} min of focus.",
    timer_running:"Focusing… until the bell rings",
    focus_min:"focus min",
    breathe_start:"Start", breathe_stop:"Stop",
    b_in:"Breathe in", b_hold:"Hold", b_out:"Breathe out", b_relax:"Relax",
    b_calm:"Calm", b_deep:"Deep 4-7-8", b_sleepy:"Sleep", b_done:"{n} breath cycles done",
    st_total:"Total focus", st_min:"minutes", st_today:"Today", st_streak:"Day streak", st_sessionsN:"sessions",
    st_breakdown:"Score breakdown",
    sync_title:"Cross-device sync", sync_desc:"Enter a sync code so phone and computer share one training profile (requires Supabase configured).",
    sync_placeholder:"Enter sync code…", sync_save:"Save", sync_ok:"Connected & synced", sync_err:"Sync failed, check config or network", sync_nd:"Supabase not configured, saving locally only",
    sync_local:"Local mode",
    back:"Back", start:"Start", stop:"Stop", pause:"Pause",
    lang:"Language", theme:"Theme", music:"Music", voice:"Voice",
    next:"Next level", retry:"Practice again", done_all:"All levels cleared 🎉",
    exit:"Exit", quit:"Quit",
    min:"min", sec:"sec",
  }
};

let lang = localStorage.getItem("ff.lang") || "zh";

function t(key, vars){
  let s = (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
  if (vars) for (const k in vars) s = s.replace("{"+k+"}", vars[k]);
  return s;
}
function applyI18n(){
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}
function setLang(l){
  lang = l; localStorage.setItem("ff.lang", l);
  applyI18n();
  document.getElementById("langBtn").textContent = lang==="zh" ? "中 / EN" : "EN / 中";
  window.dispatchEvent(new CustomEvent("ff:lang"));
}
export { I18N, setLang, applyI18n, t, lang };