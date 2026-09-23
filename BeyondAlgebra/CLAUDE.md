# CLAUDE.md — 《密纹轨迹》项目文档

## 项目概述

《密纹轨迹》是一款 2D 俯视角射击动作 + 轻塔防 HTML5 游戏。玩家通过 WASD 移动留下伤害轨迹、自动射击清怪、组合密文板形成永久被动，保护核心据点冲击最高楼层。

## 文件结构

```
BeyondAlgebra/
├── README.md              # 游戏策划案（精简版），描述核心规则、怪物、公式、密文板
├── EDITION.md             # 版本记录，每个版本的改动说明
├── CLAUDE.md              # 本文件——项目结构与更新指南
├── 欢迎.md                # （空/占位）
├── .obsidian/             # Obsidian 笔记配置

根目录（BeyondAlgebra 外）：
├── 密文轨迹demoX.X.html   # 各版本独立 HTML 文件（单文件包含 CSS+JS）
├── 试玩版demo_无限模式X.X.html  # v2.x 早期版本
├── 策划案.pdf / 策划案精简版.docx / 密文轨迹.docx  # 策划文档
└── *.png                  # 截图
```

## 版本规则

1. **新版本不更改旧版本文件**。每次修改创建新的独立版本文件。
2. 版本号格式：`密文轨迹demoX.X.html`
3. 当前开发版本见 `EDITION.md` 顶部
4. 在 `EDITION.md` 中按时间倒序记录每个版本的改动

## 单文件结构（以 v9.8 为例）

每个版本是完整的单文件 HTML，包含三部分：

```
<!DOCTYPE html> → <style>...</style> → <body> HTML 结构 → <script> 游戏逻辑 </script>
```

### CSS 区域（约 1-660 行）
- 整体布局（`.wrapper`, `.game-row`, `.canvas-wrap`, `.panel`）
- 面板组件（手牌、槽位、按钮、反馈框、被动列表、遗物）
- 遮罩层（三选一、暂停、工作台、职业选择、地图、商人）
- 真空条、控件提示

### HTML 区域（约 664-785 行）
- Canvas 画布 + 右侧面板
- 各种遮罩层（selectionOverlay, pauseOverlay, pauseWorkshop, classOverlay, mapOverlay, merchantOverlay）

### JS 区域（约 786-3736 行）

#### 关键代码区域索引

| 区域 | 位置（约） | 说明 |
|------|-----------|------|
| 词条数据定义 | 791-811 | `TRIGGERS` 7张触发板 + `EFFECTS` 10张效果板 |
| 怪物类型定义 | 814-946 | `MONSTER_TYPES` 8种怪物（BASIC/FAST/TANK/HEALER/SPLITTER/SCORCHER/WRAITH/BOSS）|
| 精英词缀 | 949-962 | `AFFIXES` 6种词缀（再生/荆棘/迅捷/巨人/吸血/爆裂）|
| 命运抉择 | 965-974 | `FATE_CHOICES` 8种永久buff |
| 连杀爆发 | 977-989 | `KILL_BURSTS` 25/50/100连杀阈值 |
| 关卡类型 | 996-1004 | `STAGE_TYPES` 7种关卡（混编/疾驰/攻城/烈焰/幽灵/精英/BOSS）|
| 轮椅组合 | 1007-1014 | `CHAIR_COMBOS` 6种OP组合及其 bonus |
| 轨迹类型视觉 | 1017-1022 | `TRAIL_STYLES` 4种轨迹外观 |
| 地图节点 | 1025-1035 | `NODE_POOL` 9种节点类型 |
| 职业定义 | 1039-1084 | `CLASSES` 4种职业 |
| 遗物定义 | 1087-1112 | `RELICS` 12种遗物 |
| 游戏状态 `G` | 1178-1210 | 全局游戏状态对象——**所有数值修改的核心** |
| 难度公式 | 1237-1255 | `getDifficultyMultiplier()`, `getMonsterCount()`, `getEliteChance()`, `getSpawnInterval()` |
| **怪物生成** | 1424-1539 | `spawnMonster()` — 包含怪物属性计算、精英词缀、关卡权重 |
| **BOSS** | 1647-1702 | `spawnBoss()`, `spawnBossMinion()`, `getBossHp()` |
| **治疗效果** | 1706-1724 | `applyHealing()` — **治疗范围在此硬编码** |
| **密文组合** | 1874-1913 | `combineCards()`, `doCombine()` — 组合逻辑 + 轮椅检测 |
| **效果触发** | 1307-1403 | `applyPassiveEffect()` — **所有密文板效果数值在此** |
| **击杀掉落** | 2196-2265 | 死亡处理 — **密文板掉落率在此**、精华、遗物 |
| **波次清空** | 2402-2404 | **楼层清空后的行为**（v9.8: 属性选择） |
| **属性选择** | v9.8 新增 | `showStatChoice()`, `selectStat()` |
| **波间卡牌选择** | 3401-3454 | `showCardSelection()`, `selectCard()`（v9.8: 不再自动调用） |
| **楼层推进** | 3530-3540 | `advanceFloor()` — 楼层递增 + 槽位/命运触发 |
| **移除被动** | 3029-3046 | `removePassive()` — **回退效果数值需与 apply 保持一致** |
| **UI 更新** | 3009-3026 | `updateUI()` |
| **重置游戏** | 3560-3603 | `resetGame()` — **需要与新字段保持同步** |
| 事件处理 | 3614-3725 | 键盘/鼠标事件 |
| 主循环 | 3607-3611 | `gameLoop()` |

## 更新版本注意事项

### 1. 修改数值时的联动检查清单

当你修改某个数值时，必须检查以下位置是否同步：

- **怪物基础属性** (`MONSTER_TYPES`) → 同步 `spawnDebugMonster()` 中的属性赋值
- **密文板效果数值** (`applyPassiveEffect`) → 同步 `removePassive()` 中的回退量
- **BOSS HP 基数** (`MONSTER_TYPES.BOSS.baseHp`) → 同步 `getBossHp()` 中的基数
- **游戏状态初始化** (`resetGame()`) → 确保新字段有默认值
- **怪物特殊属性**（如 `fireTrailLife`, `bulletResist`）→ 同步 `spawnMonster()` 和 `spawnDebugMonster()` 中的字段传递
- **README.md** 中的数值描述 → 如果改动大，同步更新策划案

### 2. 新增字段的添加位置

如果要在怪物/玩家/全局状态上新增字段：
1. 类型定义对象（如 `MONSTER_TYPES.BASIC`）
2. `spawnMonster()` 中的属性展开（约 1499-1538 行）
3. `spawnDebugMonster()` 中的属性展开（约 1570-1599 行）
4. `resetGame()` 中的初始值重置
5. 分裂子体（`splitMonster()`）中如有需要
6. BOSS 爪牙（`spawnBossMinion()`）中如有需要

### 3. 遮罩层/弹窗的互斥

以下遮罩层会暂停游戏（设置 `G.selectingActive = true`），注意互斥：
- `selectionOverlay` — 三选一卡牌 / 命运抉择 / 属性选择
- `pauseOverlay` + `pauseWorkshop` — 按 P 暂停
- `classOverlay` — 职业选择（开局）
- `mapOverlay` / 蜿蜒地图 Canvas — 地图选择
- `merchantOverlay` — 商人

如果同时激活多个，游戏会永久卡死。

### 4. 平衡性公式位置

| 参数 | 位置 |
|------|------|
| 难度系数 `D = 1.16^(W-1)` | `getDifficultyMultiplier()` |
| 怪物数量 | `getMonsterCount()` |
| 精英概率 | `getEliteChance()` |
| 生成间隔 | `getSpawnInterval()` |
| 怪物 HP 上限 | `spawnMonster()` 中的 `Math.min(hp, 5000)` |
| 怪物攻击上限 | `spawnMonster()` 中的 `Math.min(atk, 80)` |
| 怪物速度上限 | `spawnMonster()` 中的 `Math.min(spd, 5.0)` |
| 密文板掉落率 | 怪物死亡逻辑中的概率判断 |
| BOSS HP 上限 | `spawnBoss()` 中的 `Math.min(hp, 800000)` |

### 5. 命名注意

- 游戏内用"楼层"（floor）而非"波次"（wave）——这是 v9.5 后的改变
- 变量名 `G.floor` 但有历史遗留的 `unlocksAtWave` 等字段名仍用 wave
- 注释和 UI 中混用"波"、"层"、"楼层"——建议统一为"层"

### 6. 版本号修改位置（每次必改）

1. `<title>` 标签（约第 6 行）
2. 面板标题 `<h4>`（约第 674 行）
3. JS 顶部注释（约第 788 行）

---

## 2026-08-10 工作记录

### v9.11 — 画图召唤：轨迹闭环→图腾
- 文件：`密文轨迹demo9.11.html`
- T12触发板（闭环触发）+ 五种图腾（基础/速射/雷电/冰霜/轨迹）
- 路径自交→闭环检测→召唤图腾（多边形质心定位）
- 5波合1阶段制：连续5波→奖励
- 卡牌经济：阶段完成固定给牌，击杀不掉

### v9.12 — 网格判环+视觉完善（最终版）
- 文件：`密文轨迹demo9.12.html`
- 判环重写：20×20px网格法，`_grid[gx,gx]` 存帧号，重入60帧前旧格=闭环
- 视觉完善：射程虚线、攻击光束、出场光环、命中粒子、菱形基座、呼吸脉冲
- CSS：Courier New等宽字体 + 小圆角(4px) + 深暗底色
- 五种图腾：基础/速射/雷电(连锁4体)/冰霜(冻结40帧)/轨迹(AOE脉冲)
- 包含v9.11全部功能（5波制、固定卡牌、T12触发）

## 2026-08-08 工作记录

### 已完成

**1. 对局记录分析（v9.8 的两场）**
- 对局1（25层）：攻击15→182(12x)，全程HP100/100无伤，难度仅×35
- 对局2（52层）：攻击15→602(40x)，轨迹伤害1.5→1355(900x!)，轨迹宽度6→2698(450x!)
- 根因：v9.8 同时做了"密文板效果翻倍"+"属性选择每层+5攻"，叠加高频触发(T06/T07/T08)无上限，子弹伤害达12万/发而怪物HP上限仅5000

**2. v9.9 — 数值平衡版**
- 文件：`密文轨迹demo9.9.html`
- 属性选择：攻击+5→+3，轨迹+2→+1，移速+8%→+5%
- 密文板效果普遍削减35-50%（E01/E02/E06/E11等）
- 弹幕地狱轮椅：倍率+1.0→+0.5
- 怪物上限提升：HP 5000→10000，ATK 80→120，SPD 5.0→6.0，BOSS全面强化
- 修复 removePassive() bug（之前不回退高频触发值）

**3. v9.10 — 自动模拟模式**
- 文件：`密文轨迹demo9.10.html`（4305行）
- URL参数：`?auto=30&speed=5` 开启自动模拟
- `autoPilot()`：绕核心画圈+闪避AI
- 6个自动决策函数：simAutoSelectClass/StatChoice/NodeMap/MerchantVisit/FateChoice/Combine
- `simLoop()`：setTimeout快速循环，跳过DOM渲染
- `exportGameLogJSON()`：结构化JSON输出
- 所有DOM函数已加 `if(G.simMode)return;` 守卫

**4. 配套工具**
- `simRunner.js`：Puppeteer 无头运行器（需 npm install puppeteer）
- `analyzeSim.js`：10项指标分析引擎
- `sim.bat`：Windows 快捷脚本
- `EDITION.md` 已更新 v9.9 和 v9.10 记录

### ✅ 已完成（2026-08-10 更新）

**5. simCore.js — 纯 Node.js 模拟引擎（闭环打通！）**
- 文件：`simCore.js`（~1300行）
- 从 `密文轨迹demo9.10.html` 提取全部核心战斗公式和决策逻辑
- **零外部依赖**：不需要 Puppeteer / Chromium / DOM / Canvas
- 直接 `fs.writeFileSync` 写 JSON 结果到磁盘
- 用法：`node simCore.js [目标楼层] [速度倍率] [输出文件]`
  - `node simCore.js 50 1` → 模拟到50层（或死亡）
  - `node simCore.js 0 3` → 3倍速无限直到死亡
- 10层模拟约1秒，30层约15秒
- 输出格式兼容 `analyzeSim.js` → 完整闭环成立！

**闭环工作流验证通过：**
```
node simCore.js 30 3 sim_results.json     ← 模拟运行（~15s）
    ↓
node analyzeSim.js sim_results.json        ← 10项指标分析
    ↓
Claude Read 分析报告 → 提出调整 → Write HTML → node simCore.js 重跑验证
```

**simCore.js 架构：**
- 完整提取：怪物生成（加权/精英/词缀）、BOSS、轨迹伤害/阻挡、子弹射击、被动叠加（7触发×10效果×6轮椅）、火焰轨迹、围剿、分裂、治疗、命运抉择、职业选择、遗物掉落、地图节点决策
- AI驾驶：autoPilot（绕核心画圈+闪避）、6个自动决策函数
- 对局日志：结构化event数组（floor_start/clear/card_combine/stat_choice/fate_choice/game_over等）
- 卡牌掉落率、精英概率、难度系数、怪物属性——全部与原版HTML一致
