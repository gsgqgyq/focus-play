/* i18n.js — 中英多语言文案与神经科学实证说明 */
import { store } from "./state.js";

let lang = store.getPref("lang", "zh");

const DICT = {
  zh: {
    brand: "FocusPlay 专注乐园",
    nav_games: "科学训练",
    nav_timer: "专注计时",
    nav_breathe: "正念呼吸",
    nav_stats: "数据洞察",

    // 首页
    hero_title: "重塑多巴胺回路 · 把专注练成习惯",
    hero_sub: "基于认知神经科学与 ADHD 临床实证范式。每天 5 分钟微步练习，从抗干扰到时间感知，渐进重塑大脑执行功能。",
    today_focus: "今日专注",
    streak: "连续坚持",
    sessions: "总训练次数",
    card_games_t: "循证认知训练",
    card_games_d: "8 款经神经心理学验证的专注小游戏，覆盖抗干扰、警觉维持、视空间记忆与时间感知。",
    card_timer_t: "Time Timer 视觉计时",
    card_timer_d: "动态圆盘倒计时直观展示时间流逝，搭配 5 分钟启动微步与沉浸白噪音，终结任务瘫痪。",
    card_breathe_t: "正念 · 自律神经调节",
    card_breathe_d: "箱式呼吸与 4-7-8 节律，平复前额叶过载，重获宁静专注。",
    card_stats_t: "我的数据",
    card_stats_d: "反应时、抗干扰损耗比、时间校准度全量记录，见证前额叶肌肉成长。",

    // 靶向训练方案
    plans_heading: "🎯 循证靶向训练方案",
    plans_subheading: "针对 ADHD 最常见的四大认知卡点，科学配比复合微训练，按需自选即开即练：",
    plan_proc_title: "战胜启动拖延",
    plan_proc_sub: "时间感知校准 + 5分钟微步专注，打破时间盲与启动阻力",
    plan_proc_desc: "让身体重新感知物理时间流逝，搭配极低心理门槛的 5 分钟微步专注与褐噪音，终结任务瘫痪。",
    plan_proc_tag: "⏱️ 5 分钟 · 治拖延启动难",
    plan_distract_title: "开工高效防走神",
    plan_distract_sub: "持续警觉 SART + 抗干扰箭头，抑制白日梦神游并过滤杂讯",
    plan_distract_desc: "激活前额叶任务网络，压制 DMN 白日梦侵入，强力屏蔽旁侧视觉干扰。",
    plan_distract_tag: "🎯 5 分钟 · 开工防走神",
    plan_mem_title: "强化工作记忆",
    plan_mem_sub: "科西记忆方块 + Dual N-Back，拓展视空间写字板，告别断片",
    plan_mem_desc: "直接强化大脑视空间工作台暂存容量，多步动态刷新，减少丢三落四与卡壳。",
    plan_mem_tag: "🧩 6 分钟 · 治丢三落四",
    plan_impulse_title: "克制毛躁急刹车",
    plan_impulse_sub: "Go/No-Go 运动制动 + 正念箱式呼吸，平复躁动与手滑",
    plan_impulse_desc: "锻炼运动皮层紧急制动回路，重置自主神经与心率，恢复平稳沉着状态。",
    plan_impulse_tag: "🌿 5 分钟 · 急刹车与抚平焦虑",

    plan_step_time_sense: "内源生物钟感知校准",
    plan_step_time_sense_d: "打破时间盲与时间近视恐惧，体会真实物理时长的流逝",
    plan_step_timer5: "5 分钟启动微步 (伴随褐噪音)",
    plan_step_timer5_d: "极低心理门槛，瞬间启动手头任务，终结任务瘫痪",
    plan_step_sart: "SART 持续注意警觉 (防神游)",
    plan_step_sart_d: "打破无意识惯性点击，压制默认网络(DMN)白日梦侵入",
    plan_step_flanker: "Eriksen Flanker 冲突过滤",
    plan_step_flanker_d: "前扣带回(ACC)滤噪预热，强力屏蔽旁侧视觉杂讯",
    plan_step_corsi: "Corsi 视空间记忆方块",
    plan_step_corsi_d: "拓展大脑视空间工作台暂存容量，改善转身就忘",
    plan_step_nback: "Dual N-Back 动态更新",
    plan_step_nback_d: "多步骤快速刷新大脑缓存，减少打断后断片脑梗",
    plan_step_gonogo: "Go/No-Go 冲动急刹车",
    plan_step_gonogo_d: "激活右侧额下回运动制动回路，克制脱口而出与手滑",
    plan_step_breathe: "正念箱式呼吸 (4-4-4-4)",
    plan_step_breathe_d: "海豹突击队战术平定节律，重置心率与副交感神经",

    plan_start_btn: "▶ 一键开启方案",
    plan_running: "正在进行方案",
    plan_step_n: "步骤 {i}/{total}：{name}",
    plan_exit: "退出方案",
    plan_done_title: "方案圆满达成！",
    plan_done_desc: "你已成功完成这套针对性的认知组合训练，神经递质与执行功能已获得强化！",
    plan_back_home: "完成并返回首页",
    plan_step_passed: "步骤 {i}/{total} 达标！",
    plan_completed_step: "已完成：",
    plan_next_up: "即将进入下一步：",
    plan_next_btn: "立即进入下一步 ▶",
    plan_pause_btn: "暂停方案",

    // 游戏通用
    start: "开始挑战",
    retry: "重新训练",
    next: "下一关",
    level: "关卡",
    locked: "此关尚未解锁，请先完成前一关",
    done_all: "已达最高阶！",
    s_great: "挑战达标！神经连接强化",
    s_oops: "暂未达标，休息一下再试",
    best: "最高关卡",
    hud_accuracy: "正确率",
    hud_avg_rt: "平均反应时",
    hud_conflict_cost: "抗干扰损耗",
    hud_nogo_inhibit: "刹车抑制率",
    hud_go_accuracy: "警觉命中率",
    hud_span: "记忆跨度",
    hud_mode: "记忆模式",
    hud_precision: "时间精准度",
    hud_tolerance: "容差要求",
    hud_hits: "命中",
    hud_miss: "漏按",
    hud_false_alarms: "误报",
    hud_stop_success: "急刹成功率",
    hud_time: "总用时",
    hud_errors: "失误次数",
    hud_speed: "平均搜索速度",

    // Flanker
    flanker_t: "弗兰克抗干扰训练",
    flanker_d: "聚焦中央目标箭头，过滤两侧嘈杂的干扰箭头。认知心理学抗干扰金标准。",
    how_flanker: "屏幕中央将出现 5 个箭头。请<b>完全忽略两侧的干扰箭头</b>，只根据【正中间的箭头指向】快速做出判断：指向左按 [←] 或 [A]，指向右按 [→] 或 [D]。",
    sci_flanker: "针对前扣带回（ACC）冲突检测迟钝。训练快速压制外周杂讯干扰，强化嘈杂环境中的选择性聚焦。",
    flanker_tip: "请只盯准中间箭头！左边 [←/A]，右边 [→/D]",

    // SART
    sart_t: "SART 持续注意警觉",
    sart_d: "遇数字 1~9 快速敲击，唯独遇见 3 紧急停手。防走神与默认网络（DMN）神游。",
    how_sart: "中央会快速连贯闪现数字 1 到 9。遇到<b>任何数字都请立刻敲击空格/屏幕</b>；唯独当数字【3】闪现时，必须克制惯性动作，<b>绝对不能按</b>！",
    sci_sart: "临床连续操作测验（CPT）核心范式。打破无意识惯性神游，训练前额叶在枯燥刺激下的主动警觉与冲动制动。",
    sart_tip: "常规数字迅速按！遇到【3】必须立刻忍住停手！",

    // Corsi
    corsi_t: "科西视空间记忆方块",
    corsi_d: "记忆不规则点亮的方块序列，挑战正序与倒序重现。拓展视空间工作台容量。",
    how_corsi: "仔细观察屏幕上随机分布的 9 个方块依次点亮的顺序。演示结束后，请按相同顺序点击方块（高级别将升级为<b>逆序倒背</b>挑战！）。",
    sci_corsi: "Cogmed 工作记忆模型基石。ADHD 视空间写字板容量往往显著偏弱，该训练可强化多步骤空间信息在大脑中的暂存与操纵。",

    // Time Sense
    time_sense_t: "时间感知与内源校准",
    time_sense_d: "体验目标发光时长，凭内源生物钟按住重现。专为克服 ADHD“时间盲”设计。",
    how_time_sense: "首先用心体会光球点亮持续的时长（不要默数数字，凭身体与呼吸感受）。随后按住按钮，感觉时间达到刚才长度时松开，系统将给出微秒级精准度分析。",
    sci_time_sense: "基于 Russell Barkley 博士时间近视（Temporal Myopia）模型。ADHD 多巴胺生物钟节律紊乱导致严重时间盲与拖延，此训练能校准时间本体感受。",

    // N-back
    n_t: "Dual N-Back 工作记忆",
    n_d: "追踪回溯前 N 步的位置与听觉字母，动态刷新大脑缓存。强化背外侧前额叶。",
    how_nback: "每个回合方块在九宫格中闪现（若开启声音，同时报出英文字母）。当当前位置与【前第 N 步】一致时，点击【位置匹配】（或空格）；字母一致时点击【字母匹配】。",
    sci_nback: "Jaeggi 等人经典实证。被证明能有效增强工作记忆容量与流体智力，缓解做事断片与信息刷新困难。",

    // Go/No-Go
    gg_t: "急刹车 · 冲动控制",
    gg_d: "绿灯行、红灯停，高级别偶发途中紧急变红。锻炼运动皮层刹车回路。",
    how_gonogo: "出现绿灯 GO 时迅速敲击；出现红灯 STOP 禁止敲击。在高级关卡中，绿灯可能在亮起后瞬间突然变红（Stop Signal），考验极速撤回动作的急刹能力！",
    sci_gonogo: "训练右侧额下回与丘脑底核（rIFG-STN）组成的运动制动网络，减少不假思索的冒进与手滑动作。",
    gg_tip_standard: "绿灯立刻按，红灯不要按！",
    gg_tip_stopsignal: "注意：绿灯有时会突发变红，考验紧急刹车能力！",

    // Schulte & Stroop
    s_t: "舒尔特方格",
    s_d: "按序搜寻 1~25 数字，扩展视野余光与视觉扫描速度。",
    how_schulte: "视线聚焦于方格正中，用余光快速寻找并从 1 连续点到最大数字。高等级包含倒序与动态重排。",
    sci_schulte: "扩展注意分配广度与视觉搜索抗干扰度。",
    st_t: "斯特鲁普字色冲突",
    st_d: "忽略字义干扰，快速点击文字的墨水颜色。锻炼认知灵活性。",
    how_stroop: "屏幕中央会出现带有颜色的文字。请<b>完全忽略文字写的是什么</b>，迅速点击文字所用的【实际颜色】！注意高难度关卡可能有临时规则反转。",
    sci_stroop: "训练前额叶对自动化言语阅读的抑制机制与认知灵活性。",

    // 专注计时
    timer_title: "Time Timer 视觉专注",
    timer_sub: "摆脱冰冷数字的时间抽象焦虑，用看得见的流逝圆盘，从 5 分钟微步开始轻松进入心流。",
    timer_start: "开始专注",
    timer_pause: "暂停",
    timer_reset: "重置",
    timer_running: "保持呼吸，沉浸在此刻的一件事...",
    timer_paused: "已暂停，准备好随时继续",
    timer_done: "太棒了！已完成 {m} 分钟高质量专注",
    timer_preset_5: "5分钟",
    timer_preset_15: "15分钟",
    timer_preset_25: "25分钟",
    timer_preset_45: "45分钟",
    min: "分钟",
    resume: "继续",

    // 白噪音
    amb_panel_title: "白噪音与环境声中枢",
    amb_panel_desc: "为 ADHD 低多巴胺大脑引入最适度脑唤醒（MBA）与随机共振声场，抵消外界突发杂音，深度锁神。",
    amb_brown_local: "原生褐噪音 · 深度专注",
    amb_brown_local_d: "纯纯原生 Web Audio 实时低通滤波，如温和低沉的深海瀑布",
    amb_pink_local: "原生粉红噪音 · 自然雨声",
    amb_pink_local_d: "1/f 平衡频谱雨声滤波，平抑焦躁心神",
    amb_yt_brown: "Brown Noise 8H 深层沉浸",
    amb_yt_brown_d: "YouTube 精选专为 ADHD 调音的低频共振音轨",
    amb_yt_rain: "柔和雨夜与远雷",
    amb_yt_rain_d: "雨滴窗台声，天然白噪音屏蔽杂念",
    amb_yt_cafe: "街角咖啡馆 (Body Doubling)",
    amb_yt_cafe_d: "适度环境人声杂音，创造虚拟陪伴效应",
    amb_yt_lofi: "Lofi Girl 学习放缓节拍",
    amb_yt_lofi_d: "柔和平缓的 Chillhop 律动，舒缓任务启动焦虑",
    amb_yt_forest: "森林溪流 (绿噪音 Green Noise)",
    amb_yt_forest_d: "流水与轻微鸟鸣，大自然自律神经舒缓剂",
    amb_yt_40hz: "40Hz 伽马脑波聚焦频率",
    amb_yt_40hz_d: "双耳节拍声波，促发神经元同步放电",
    amb_yt_custom: "自定义 YouTube 音频",
    amb_yt_custom_d: "已加载用户自定义视频/直播",
    amb_custom_title: "输入自定义 YouTube 音源",
    amb_custom_desc: "粘贴任何 YouTube 专注视频、白噪音或 ASMR 链接/ID，无缝内置播放：",
    amb_custom_btn: "载入音轨",
    amb_invalid_yt: "请输入有效的 YouTube 视频链接或 11 位视频 ID",
    amb_badge_local: "本地无损",

    // 呼吸
    breathe_title: "正念呼吸 · 神经重启",
    breathe_sub: "跟随呼吸光环的收缩与舒张，将心率与副交感神经重置到平稳波段。",
    breathe_box: "箱式呼吸 (4-4-4-4)",
    breathe_box_d: "海豹突击队战术减压，快速平抑急性焦虑",
    breathe_478: "4-7-8 深度舒缓",
    breathe_478_d: "经典深度放松节律，改善大脑过度亢奋",
    breathe_calm: "舒缓平定 (4-6)",
    breathe_calm_d: "轻量级日常深呼吸，拉长呼气抚平烦躁",
    breathe_start: "开始呼吸",
    breathe_stop: "结束练习",
    step_inhale: "慢慢吸气...",
    step_hold: "屏气停留...",
    step_exhale: "缓慢呼气...",

    // 数据
    stats_title: "数据洞察 · 见证蜕变",
    stats_sub: "所有训练指标与专注时间已实现云端双向同步，点滴积累前额叶自控力。",
    st_total: "累计专注时长",
    st_today: "今日专注",
    st_streak: "连续坚持天数",
    st_sessionsN: "总训练局数",

    // 同步
    sync_title: "跨设备进度同步",
    sync_desc: "输入独属于你的同步码（至少 6 位，如手机号或个性暗号），进度在电脑/手机/平板无缝共享。",
    sync_placeholder: "输入 6 位以上个性同步码",
    sync_save: "保存并同步",
    sync_link: "复制一键同步链接",
    sync_copied: "同步链接已复制！在其他设备浏览器打开即可自动同步",
    sync_ok: "云端同步成功！数据已更新",
    sync_err: "同步失败，请检查同步码与网络",
    sync_nd: "本地模式运行中"
  },

  en: {
    brand: "FocusPlay",
    nav_games: "Training",
    nav_timer: "Focus",
    nav_breathe: "Breathe",
    nav_stats: "Insights",

    hero_title: "Rewire Dopamine · Build Focus as a Muscle",
    hero_sub: "Backed by cognitive neuroscience & ADHD clinical evidence. 5-minute micro-habits to strengthen executive function and master time.",
    today_focus: "Today's Focus",
    streak: "Current Streak",
    sessions: "Total Sessions",
    card_games_t: "Evidence-Based Training",
    card_games_d: "8 neuropsychologically validated games covering interference suppression, vigilance, working memory, and time perception.",
    card_timer_t: "Time Timer Visual Countdown",
    card_timer_d: "Visual arc disc representing elapsed time, paired with 5-minute micro-starts and ambient white noise to crush task paralysis.",
    card_breathe_t: "Mindfulness Breathing",
    card_breathe_d: "Box breathing and 4-7-8 rhythms to calm prefrontal overload and restore centered clarity.",
    card_stats_t: "My Insights",
    card_stats_d: "Response times, conflict costs, and temporal precision tracked across devices.",

    // Targeted Training Regimens
    plans_heading: "🎯 Evidence-Based Training Regimens",
    plans_subheading: "Targeted multi-step micro-workouts for the four most common ADHD cognitive barriers. Train on-demand:",
    plan_proc_title: "Beat Task Paralysis & Procrastination",
    plan_proc_sub: "Time Sense Calibration + 5-Min Micro-Focus, crush time blindness and initiation friction",
    plan_proc_desc: "Recalibrate your internal physical sense of time, paired with low-friction 5-minute micro-focus & brown noise to conquer paralysis.",
    plan_proc_tag: "⏱️ 5 Mins · Procrastination Buster",
    plan_distract_title: "Laser Focus & Anti-Distraction",
    plan_distract_sub: "Sustained Attention (SART) + Flanker arrows, suppress mind-wandering and filter noise",
    plan_distract_desc: "Ignite the frontoparietal task network, inhibit Default Mode Network daydream intrusions, and block visual noise.",
    plan_distract_tag: "🎯 5 Mins · Anti-Distraction",
    plan_mem_title: "Working Memory Booster",
    plan_mem_sub: "Corsi Block-Tapping + Dual N-Back, expand visuospatial scratchpad & prevent brain freezes",
    plan_mem_desc: "Directly train working memory capacity and multi-step dynamic buffer updating to eliminate forgetfulness.",
    plan_mem_tag: "🧩 6 Mins · Memory Boost",
    plan_impulse_title: "Impulse Braking & Calm",
    plan_impulse_sub: "Go/No-Go Motor Inhibition + Box Breathing, tame restlessness and motor impulsivity",
    plan_impulse_desc: "Strengthen right inferior frontal emergency braking circuits and reset autonomic nervous tone for deep composure.",
    plan_impulse_tag: "🌿 5 Mins · Impulse Brake",

    plan_step_time_sense: "Time Perception Calibration",
    plan_step_time_sense_d: "Break time blindness by anchoring to actual physical duration",
    plan_step_timer5: "5-Min Micro-Step Initiation",
    plan_step_timer5_d: "Ultra-low cognitive threshold with ambient brown noise to conquer paralysis",
    plan_step_sart: "SART Sustained Vigilance",
    plan_step_sart_d: "Suppress automatic impulsive taps and daydream intrusions",
    plan_step_flanker: "Eriksen Flanker Distractor Filtering",
    plan_step_flanker_d: "Warm up Anterior Cingulate Cortex to filter peripheral visual noise",
    plan_step_corsi: "Corsi Visuospatial Blocks",
    plan_step_corsi_d: "Expand visuospatial working memory scratchpad against forgetfulness",
    plan_step_nback: "Dual N-Back Dynamic Updating",
    plan_step_nback_d: "Dynamic cognitive buffer updating to prevent task interruption amnesia",
    plan_step_gonogo: "Go/No-Go Emergency Brake",
    plan_step_gonogo_d: "Activate right inferior frontal cortex to inhibit impulsive actions",
    plan_step_breathe: "Box Breathing (4-4-4-4)",
    plan_step_breathe_d: "Navy SEAL tactical breathing to re-balance autonomic tone",

    plan_start_btn: "▶ Start Regimen",
    plan_running: "Active Plan",
    plan_step_n: "Step {i}/{total}: {name}",
    plan_exit: "Exit Plan",
    plan_done_title: "Regimen Completed!",
    plan_done_desc: "You successfully completed this targeted cognitive micro-routine. Executive function and neurotransmitters recharged!",
    plan_back_home: "Done & Back to Home",
    plan_step_passed: "Step {i}/{total} Passed!",
    plan_completed_step: "Completed: ",
    plan_next_up: "Up Next: ",
    plan_next_btn: "Next Step ▶",
    plan_pause_btn: "Pause Plan",

    start: "Start Challenge",
    retry: "Retry",
    next: "Next Level",
    level: "Level",
    locked: "Locked. Complete the previous level to unlock.",
    done_all: "Mastery Level Reached!",
    s_great: "Challenge Passed! Neural Pathway Reinforced",
    s_oops: "Not quite there. Take a breath and retry",
    best: "Highest Level",
    hud_accuracy: "Accuracy",
    hud_avg_rt: "Avg Response Time",
    hud_conflict_cost: "Conflict Cost",
    hud_nogo_inhibit: "Inhibition Rate",
    hud_go_accuracy: "Vigilance Accuracy",
    hud_span: "Memory Span",
    hud_mode: "Mode",
    hud_precision: "Temporal Precision",
    hud_tolerance: "Tolerance",
    hud_hits: "Hits",
    hud_miss: "Misses",
    hud_false_alarms: "False Alarms",
    hud_stop_success: "Brake Success Rate",
    hud_time: "Elapsed Time",
    hud_errors: "Errors",
    hud_speed: "Avg Search Pace",

    flanker_t: "Eriksen Flanker Task",
    flanker_d: "Focus on the central arrow while suppressing noisy flanking arrows. Gold standard for selective attention.",
    how_flanker: "5 arrows will appear. <b>Completely ignore the outer arrows</b> and only respond to the direction of the center arrow: Left [←/A], Right [→/D].",
    sci_flanker: "Targets the Anterior Cingulate Cortex (ACC) conflict monitoring circuit. Trains filtering out visual distractors.",
    flanker_tip: "Focus strictly on the middle arrow! Left [←/A], Right [→/D]",

    sart_t: "SART Sustained Vigilance",
    sart_d: "Tap rapidly for digits 1–9, but slam the brakes when 3 appears. Overcome mind-wandering lapses.",
    how_sart: "Digits 1 to 9 will flash rapidly. <b>Tap Space or click for every number</b>, EXCEPT when the number 【3】 appears—withhold your response!",
    sci_sart: "Continuous Performance Test (CPT) paradigm. Suppresses automatic habitual clicking and prevents DMN mind-wandering.",
    sart_tip: "Tap for any number, but NEVER tap on 3!",

    corsi_t: "Corsi Block-Tapping",
    corsi_d: "Memorize irregular sequences of glowing blocks forward and backward. Expand visuospatial working memory.",
    how_corsi: "Watch 9 irregularly placed blocks light up in sequence. Replicate the sequence forward (or <b>in reverse</b> on higher levels!).",
    sci_corsi: "Cornerstone of Cogmed working memory therapy. ADHD individuals exhibit prominent visuospatial sketchpad deficits.",

    time_sense_t: "Time Perception Calibration",
    time_sense_d: "Experience a target duration and reproduce it internally. Specifically designed to combat ADHD time blindness.",
    how_time_sense: "Feel the duration of the glowing orb without counting. Then hold the button and release when you feel the exact time has elapsed.",
    sci_time_sense: "Based on Dr. Russell Barkley's Temporal Myopia model. Calibrates dopamine-driven internal timing mechanisms.",

    n_t: "Dual N-Back Working Memory",
    n_d: "Track position and spoken letters from N steps back. Dynamic working memory updating for dlPFC.",
    how_nback: "Match the current grid cell or spoken letter with the one shown N steps ago.",
    sci_nback: "Scientifically validated to expand working memory capacity and fluid intelligence.",

    gg_t: "Stop Signal Impulse Control",
    gg_d: "Go on green, stop on red, with sudden emergency red lights. Train motor cortex braking circuits.",
    how_gonogo: "Tap for green GO. Withhold for red STOP. Watch out for green lights that abruptly switch to red mid-trial!",
    sci_gonogo: "Strengthens the right inferior frontal gyrus (rIFG) motor braking network to prevent impulsive reactions.",
    gg_tip_standard: "Tap on Green, stop on Red!",
    gg_tip_stopsignal: "Caution: Green lights may abruptly turn Red!",

    s_t: "Schulte Grid",
    s_d: "Search numbers in order to broaden peripheral attention span and visual scanning efficiency.",
    how_schulte: "Fixate your eyes in the center and use peripheral vision to tap numbers in ascending order.",
    sci_schulte: "Expands visual attention span and search resilience.",
    st_t: "Stroop Interference Task",
    st_d: "Name the font color while suppressing the printed word meaning. Train cognitive flexibility.",
    how_stroop: "Ignore the semantic text and click the actual <b>ink color</b> of the word!",
    sci_stroop: "Suppresses automated verbal reading reflexes.",

    timer_title: "Time Timer Visual Focus",
    timer_sub: "Eliminate time blindness with an intuitive visual disk. Start with 5-minute micro-sprints.",
    timer_start: "Start Focus",
    timer_pause: "Pause",
    timer_reset: "Reset",
    timer_running: "Breathe gently, immerse in this one task...",
    timer_paused: "Paused, ready when you are",
    timer_done: "Brilliant! Completed {m} minutes of focused flow",
    timer_preset_5: "5 min",
    timer_preset_15: "15 min",
    timer_preset_25: "25 min",
    timer_preset_45: "45 min",
    min: "min",
    resume: "Resume",

    amb_panel_title: "Ambient & White Noise Hub",
    amb_panel_desc: "Introduces optimal cortical arousal (MBA) and stochastic resonance to shield against abrupt background noises.",
    amb_brown_local: "Procedural Brown Noise",
    amb_brown_local_d: "Native zero-latency Web Audio lowpass noise, like a gentle deep waterfall",
    amb_pink_local: "Procedural Pink Noise",
    amb_pink_local_d: "1/f balanced rain shower sound",
    amb_yt_brown: "Brown Noise 8H Deep Immersion",
    amb_yt_brown_d: "Curated YouTube ADHD low-frequency resonance stream",
    amb_yt_rain: "Gentle Rain & Distant Thunder",
    amb_yt_rain_d: "Natural rainfall mask for external distractions",
    amb_yt_cafe: "Coffee Shop (Body Doubling)",
    amb_yt_cafe_d: "Cozy murmur providing psychological companionship",
    amb_yt_lofi: "Lofi Girl Study Chillhop",
    amb_yt_lofi_d: "Steady mellow beats to ease task initiation friction",
    amb_yt_forest: "Forest Stream (Green Noise)",
    amb_yt_forest_d: "Gentle streams and birdsong for autonomic nervous restoration",
    amb_yt_40hz: "40Hz Gamma Focus Frequency",
    amb_yt_40hz_d: "Binaural pulse promoting neural synchrony",
    amb_yt_custom: "Custom YouTube Audio",
    amb_yt_custom_d: "Playing custom user stream",
    amb_custom_title: "Load Custom YouTube Track",
    amb_custom_desc: "Paste any YouTube focus video, white noise, or ambient stream URL/ID:",
    amb_custom_btn: "Load Stream",
    amb_invalid_yt: "Please enter a valid YouTube URL or 11-character video ID",
    amb_badge_local: "Offline Lossless",

    breathe_title: "Mindfulness & Reset",
    breathe_sub: "Follow the expanding and contracting orb to reset your heart rate and autonomic nervous system.",
    breathe_box: "Box Breathing (4-4-4-4)",
    breathe_box_d: "Navy SEAL tactical calming for acute overwhelm",
    breathe_478: "4-7-8 Deep Relaxation",
    breathe_478_d: "Parasympathetic activator for racing thoughts",
    breathe_calm: "Gentle Calm (4-6)",
    breathe_calm_d: "Lightweight pacing to lengthen exhalations",
    breathe_start: "Start Breathing",
    breathe_stop: "Stop",
    step_inhale: "Inhale gently...",
    step_hold: "Hold breath...",
    step_exhale: "Exhale smoothly...",

    stats_title: "Insights & Growth",
    stats_sub: "All metrics and focus intervals synced to the cloud, tracking your neuroplastic progress.",
    st_total: "Total Focus Time",
    st_today: "Today's Focus",
    st_streak: "Consecutive Days",
    st_sessionsN: "Total Training Rounds",

    sync_title: "Cross-Device Sync",
    sync_desc: "Enter a personal sync code (6+ characters) to access your progress across phone, desktop, and tablet.",
    sync_placeholder: "Enter 6+ character sync code",
    sync_save: "Save & Sync",
    sync_link: "Copy Direct Link",
    sync_copied: "Sync link copied! Open on another device to auto-sync",
    sync_ok: "Cloud sync successful!",
    sync_err: "Sync failed. Please check network and code",
    sync_nd: "Running in local offline mode"
  }
};

export { lang };

export function setLang(l) {
  lang = l;
  store.setPref("lang", l);
  applyI18n();
  window.dispatchEvent(new CustomEvent("ff:lang", { detail: l }));
}

export function t(key, vars = {}) {
  const d = DICT[lang] || DICT.zh;
  let val = d[key] || DICT.zh[key] || key;
  for (const k in vars) {
    val = val.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
  }
  return val;
}

export function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.dataset.i18n;
    el.innerHTML = t(k);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const k = el.dataset.i18nPh;
    el.setAttribute("placeholder", t(k));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const k = el.dataset.i18nTitle;
    el.setAttribute("title", t(k));
  });
}
