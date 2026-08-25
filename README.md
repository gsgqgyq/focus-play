# 🎯 专注乐园 FocusPlay

一个纯静态、开箱即用的**专注训练 + 正念放松**网页。为 ADHD 友好设计：短专注段、有进度的分难度关卡、中英双语、深/浅色主题，电脑手机自适应，跨设备同步进度。

完全零构建、零后端依赖（除可选的跨端同步），手写 HTML/CSS/JS，可部署到 GitHub Pages 或任意静态服务器。

---

## 功能

- **4 款科学背书的训练**（分 6–9 级，通关解锁下一级，星级/得分正反馈）：
  - **🧠 N-back** 工作记忆（回溯步数 N=1–6 递增）
  - **🔢 舒尔特方格** 视觉搜索/注意宽度（3×3→6×6，按完成时间计分）
  - **🎨 Stroop 色词** 抑制控制（色字冲突，限时随等级缩短）
  - **🛑 Go/No-Go** 冲动/反应控制（对 GO 反应、对 NO-GO 忍住，窗口随等级缩短）
- **⏱️ 专注计时器**：5/10/15/25/40 分钟番茄式专注段，完成累计专注时长。
- **🌿 呼吸 · 正念**：平静(4-4-4) / 深度 4-7-8 / 助眠 3-4-7，动画圆环引导 + 语音。
- **🎵 轻音乐 + 🗣️ 语音播报**：音乐由 Web Audio 实时合成（零音频文件、免授权）；语音用浏览器内置 SpeechSynthesis（离线可用、中/英）。
- **🌐 中英双语**一键切换；**深/浅色主题**；**响应式**桌面与手机。
- **📊 跨设备同步**：训练等级、成绩、累计时长多端共享（默认纯本地，配好 Supabase 后自动同步）。

## 证据与期望（重要，别被夸大宣传骗）

- N-back 训练**工作记忆**本身的有效性有大量复制证据（近迁移可靠）；对 ADHD **核心症状/日常功能的远迁移证据弱且不一致**。
- 舒尔特方格作为**视觉搜索/注意热身**合理，但网上"70 年科研背书"多为营销话术，严格证据比 N-back/抑制任务弱。
- Stroop / Flanker / Go/No-Go 是测量执行功能的经典范式，训练能改善该具体机能。
- 计算机认知训练对 ADHD 的临床结局 meta 分析（Nature 2023）显示**小到中等**效果；**多过程训练并不优于单纯工作记忆训练**。
- 任何声称"游戏能治愈 ADHD / 预防痴呆"的都是卖假药（Lumosity 2016 年被 FTC 罚 200 万美元）。
- **这些训练的真实价值**：规律习惯、热身唤醒注意力、进度可视化带来的正向反馈。—— 对 ADHD 很有用，只是别指望翻天覆地。

---

## 本地运行

```bash
cd focus-play
python3 -m http.server 8080
# 打开 http://localhost:8080
```

> 因为是 ES module，需用 http(s) 服务打开，不要直接双击 index.html。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（`new repo`）→ 私有仓也可以免费 Camp。
2. 上传本目录所有文件（根目录的 `index.html`、`css/`、`js/`）：
   ```bash
   git init && git add . && git commit -m "FocusPlay"
   git branch -M main
   git remote add origin <你的仓库URL>
   git push -u origin main
   ```
3. 打开 仓库 → **Settings → Pages** → Source 选 **Deploy from a branch** → 分支选 `main`、目录选 `/ (root)` → Save。
4. 稍等 1–2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`。

不做跨端同步的话，到此即完成，本地模式照常使用。

---

## 跨设备同步（已配好：Cloudflare Worker + D1，单域名）

**已经帮你配好了，无需再配置任何东西。** 同步走 `focusplay.516278.xyz/api/sync`（同一个域名，不额外建子域）。

- **只有输入了同步码的人**才会启用云端同步；没输码的人打开就纯本地，别人完全不知道有同步功能（卡片默认隐藏）。
- **绑定**：电脑设好后点「🔗 复制手机链接」→ 手机打开该链接即自动绑定并同步，无需手输。
- 数据存 CF D1，同步码做 SHA-256 哈希后存储，服务端不存明文码。
- 每局训练结束约 1.5 秒自动推送到云端；打开页面时自动拉取合并。

> 说明：以下为历史留档（Supabase 方案已被替换，无需操作）。

1. 到 supabase.com 注册并 **New Project**（免费层即可）。
2. 建项目后，进 **SQL Editor** 粘贴运行下面的建表脚本：

```sql
-- 专注乐园同步表 + 行级安全（每个同步码只能读写自己的那行）
create table if not exists public.ff_data (
  id         text primary key,            -- = sha256(同步码)
  secret     text not null,               -- = sha256(同步码)，用于鉴权
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.ff_data enable row level security;

drop policy if exists "own row" on public.ff_data;
create policy "own row" on public.ff_data
  for all
  using (secret = coalesce(current_setting('request.headers', true)::json->>'x-ff-secret',''))
  with check (secret = coalesce(current_setting('request.headers', true)::json->>'x-ff-secret',''));

grant usage on schema public to anon, authenticated;
grant all on public.ff_data to anon, authenticated;
```

3. 进项目 **Settings → API**，记下 `Project URL` 和 `anon / public` key。
4. 编辑本仓库 `js/config.js`：
   ```js
   window.FOCUSPLAY_CONFIG = {
     url: "https://xxxx.supabase.co",   // 你的 Project URL
     anonKey: "eyJhbGci...",            // 你的 anon public key
   };
   ```
5. 重新 `git push`，等 Pages 更新。
6. 打开网页首页 → **跨设备同步**，输入同一个**同步码**（自己定，建议一组无规律字符），点保存。手机和电脑用同一个码，就共享同一份等级/成绩/时长。

> 说明：同步码不是密码，但建议别用太简单的(如 `123`)；它决定谁能读写你的数据行。忘记同步码 = 无法在新设备恢复。

---

## 目录结构

```
index.html            页面骨架
css/style.css          设计系统（主题/动画/响应式）
js/i18n.js             中英词典与语言切换
js/state.js            本地存储 + Supabase 同步（失败自动降级本地）
js/audio.js            Web Audio 轻音乐 + 音效
js/voice.js            SpeechSynthesis 语音
js/app.js              导航/关卡/结果/数据/主题
js/games/             nback / schulte / stroop / gonogo
js/modules/           timer 专注计时 / breathe 呼吸正念
js/config.js           Supabase 配置（留空 = 纯本地）
tests/                本机端到端测试脚本（可选）
```

## 测试

```bash
node tests/test-driver.mjs   # 需项目已在本地 http 服务上，且本机装有 Playwright 的 chrome-headless-shell
```