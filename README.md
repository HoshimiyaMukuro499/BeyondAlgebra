# 密文轨迹 · BeyondAlgebra

2D 俯视角射击动作 + 轻塔防 HTML5 游戏。玩家用 WASD 移动留下可叠加的伤害轨迹、自动射击清怪、把「密文板」两两组合成永久被动，保护核心据点冲击最高楼层。

**网页试玩**：<https://miwen-guiji.workers.dev> — `/classic/` 经典版 · `/ai/` AI 拓展版

---

## 玩法速览

| 系统 | 说明 |
|:--|:--|
| **行走轨迹** | 移动即生成伤害轨迹，留存 6 秒；轨迹可阻挡怪物、可围剿、可升级 |
| **密文板** | 1 张**触发板** + 1 张**效果板** 配对宣读 → 永久被动，可无限叠加层数 |
| **护盾机制** | 玩家 HP 作为核心护盾优先承伤，归零后仍可行动 |
| **难度增长** | 难度系数 `D = 1.16^(楼层-1)`，指数攀升 |
| **BOSS 战** | 每 10 层出现 👑 BOSS，持续召唤爪牙 |

操作：`WASD` 移动 · 鼠标点手牌填入槽位 · `空格` 宣读组合 · `P` 暂停 · `Shift` 冲刺轨迹 · `Q` 终极技 · <code>\`</code> 调试模式（数字键 1-8 生成指定怪物）

---

## 两条版本线

| 系列 | 定位 | 最新版本 | 文件 |
|:--|:--|:--|:--|
| **2.x** | 经典版 · 无限波次生存 | **v2.17** | [密文轨迹demo2.17.html](密文轨迹demo2.17.html) |
| **9.x** | AI 拓展版 · Roguelike 重构 | **v9.12** | [密文轨迹demo9.12.html](密文轨迹demo9.12.html) |

### 版本规则

**新版本不更改旧版本文件**——每次修改都创建新的独立版本文件，任何版本都可直接双击打开。完整改动记录见 [BeyondAlgebra/EDITION.md](BeyondAlgebra/EDITION.md)。

---

## 目录结构

```
BeyondAlgebra/
├── README.md                  # 本文件——仓库索引
├── package.json               # npm 脚本（构建 / 部署 / 模拟）
├── 密文轨迹demo9.X.html        # 9.x 系列各版本（单文件，含全部 CSS+JS）
├── 密文轨迹demo2.X.html        # 2.12 起的版本
├── 试玩版demo_无限模式2.X.html  # 2.0–2.11 早期版本
├── simCore.js                 # 纯 Node.js 模拟引擎（零依赖）
├── analyzeSim.js              # 对局结果分析引擎（10 项指标）
├── simRunner.js               # Puppeteer 无头运行器
├── sim.bat                    # Windows 快捷脚本
├── web/                       # 网页版构建与 Cloudflare 部署
│   ├── build.mjs              # 自动挑选 2.x / 9.x 最新版本生成静态站点
│   └── wrangler.toml          # Cloudflare Workers 配置
├── BeyondAlgebra/             # 策划案与开发文档（Obsidian 仓库）
│   ├── README.md              # 策划案精简版：规则 / 怪物 / 公式 / 密文板全表
│   ├── EDITION.md             # 版本记录（按时间倒序）
│   └── CLAUDE.md              # 代码结构索引与更新指南
├── 策划案.pdf / *.docx         # 策划文档
└── 对局记录_*.txt              # 模拟引擎输出的对局数据
```

---

## 本地运行

游戏是单文件 HTML，**双击任意 `密文轨迹demoX.X.html` 即可开玩**，无需构建、无需服务器。

模拟引擎（用于数值平衡迭代，零外部依赖）：

```bash
node simCore.js 30 3 sim_results.json    # 模拟到 30 层，3 倍速
node analyzeSim.js sim_results.json      # 输出 10 项指标分析
```

---

## 网页版部署

`web/build.mjs` 会扫描仓库根目录，自动挑选 **2.x 最新版** → `/classic/`、**9.x 最新版** → `/ai/`，并生成首页。原版本文件不会被改动（构建产物逐字节等于源文件）。

```bash
npm run build:web     # 只生成静态站点到 web/public/
npm run preview       # 本地预览（wrangler dev）
npm run deploy        # 构建并发布到 Cloudflare Workers
```

首次部署需先登录 Cloudflare：

```bash
npx wrangler login
```

发布新版游戏时无需改动部署配置——把 `密文轨迹demo9.13.html` 放进仓库根目录，重跑 `npm run deploy` 即会自动上线。

---

## 开发文档

- [策划案精简版](BeyondAlgebra/README.md) — 核心规则、7 种怪物数值表、指数增长公式、密文板全表、得分系统
- [版本记录](BeyondAlgebra/EDITION.md) — 从 v2.0 到 v9.12 的完整改动史
- [CLAUDE.md](BeyondAlgebra/CLAUDE.md) — 单文件代码结构索引、数值改动联动检查清单
