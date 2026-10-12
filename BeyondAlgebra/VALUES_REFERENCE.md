# 密文轨迹 9.x · 数值参考手册

> **查东西的地方。** 这里只回答「是多少 / 怎么算 / 在哪」。
> 「为什么这么设计、踩过哪些坑」在 [VALUES_DESIGN.md](VALUES_DESIGN.md)。
>
> - 帧率固定 60 fps，全文「帧」= 1/60 秒。
> - 数值全部摘自 [`src/9x/js/`](../src/9x/js/)。改数值改 `src/9x/`，再跑 `npm run build:game` 重新拼装根目录的单文件 HTML——根目录的 `密文轨迹demo9.XX.html` 是**产物**，直接编辑会被覆盖。
> - 出处记到 **文件 + 符号名**，不记行号（行号一改就漂，按符号名搜）。
> - 2.x 经典版不在范围内（无图腾、无终极技、无密文板组合）。

## 目录

| # | 章节 | 里面有什么 |
|:--|:--|:--|
| [1](#1-全局常量) | 全局常量 | 画布 / 各类上限 / 性能预算 |
| [2](#2-难度与标尺) | 难度与标尺 | `D(f)`、`S(f)`、出怪、关卡权重 |
| [3](#3-玩家--核心--护盾) | 玩家 / 核心 / 护盾 | 移速、承伤、全部掉血来源 |
| [4](#4-子弹) | 子弹 | 两道射速闸门、弹体、命中 |
| [5](#5-轨迹--冲刺--围剿) | 轨迹 / 冲刺 / 围剿 | 轨迹参数、踩踏、类型外观 |
| [6](#6-怪物) | 怪物 | 基础表、生成公式、BOSS、掉落 |
| [7](#7-精英词缀) | 精英词缀 | 14 条数值、抽池规则 |
| [8](#8-图腾闭环) | 图腾（闭环） | 判环、分档、开火伤害 |
| [9](#9-终极技) | 终极技 | 充能、倍率、释放 |
| [10](#10-连杀) | 连杀 | 窗口与消费方 |
| [11](#11-密文板) | 密文板 | 触发板、效果板、层数语义、槽位、卡牌来源 |
| [12](#12-成长与配置) | 成长与配置 | 轮椅、职业、遗物、命运、三选一 |
| [13](#13-精华与经济) | 精华与经济 | 精华公式、上限、商店价目 |
| [14](#14-地形--危险区--关卡结构) | 地形 / 危险区 / 关卡结构 | 障碍、危险区、节点 |
| [15](#15-教程) | 教程 | 常量、五块石板、字幕节奏 |
| [16](#16-调参联动检查清单) | 调参联动检查清单 | 改一个必须连带改另一个 |

---

## 1. 全局常量

### 场地与实体

| 项 | 值 | 出处 |
|:--|:--|:--|
| 画布 | 780 × 560 | `01-state.js` |
| 玩家半径 / 护盾上限 | 14 / 100 | `01-state.js` |
| 玩家基础移速 / 基础攻击 | 2.8 px/帧 / 10 | `01-state.js` |
| 玩家活动范围 | x ∈ [20, 760]，y ∈ [20, 540] | `05-update.js` |
| 斜向移动 | ×0.707（两轴各乘一次） | `05-update.js` |
| 玩家 ↔ 地形碰撞余量 | `p.r + t.r + 2` | `05-update.js` |
| 核心半径 / HP | 22 / 100 | `01-state.js` |
| 怪物无敌帧 = 攻击冷却 | 24 帧 | `05-update.js` |
| 粒子上限 / 浮动文字上限 / 浮动文字寿命 | 300 / 60 / 35 帧 | `01-state.js` |

### 各类上限

| 项 | 值 | 出处 |
|:--|:--|:--|
| 轨迹段（普通 / 冲刺） | 120 / 60 | `04-trail.js`、`05-update.js` |
| 火焰轨迹条数 | 80 | `05-update.js` |
| 单帧火焰伤害流转 | 40 条 | `05-update.js` |
| 手牌 | 20（满了替换最老一张） | `07-ui.js` |
| 图腾数量 | 10 | `01-state.js` `G.maxTurrets` |
| 图腾攻击力 | 玩家攻击力的一个比例：大环闪电 = ×1.00，其余按 `d×m/75` 往下排。**没有单独的上限常量** | `04-trail.js` `getTurretAttackPower()`、`00-data.js` `TURRET_RATIO_NORM` |
| 遗物 | **没有上限**。真实天花板 = `RELICS` 表长 **12**（`dropRelic()` 另有「同名只拿一次」去重）。商店购买那条路**既不过去重也不过上限** | `05-update.js`、`07-ui.js` |
| 被动槽位 | 4 → 5（20 层）→ 6（40 层）→ 7（60 层）；职业·奥术学者 +1 | `01-state.js`、`07-ui.js` |
| 危险区同屏 | 5 个 | `05-update.js` |
| 火圈同属性同屏 | 3 个 | `00-data.js` `AFFIX_ZONE_MAX_PER_KIND` |
| 敌图腾寿命 / 索敌半径 | 720 帧 / 120px | `05-update.js` `ENEMY_TOTEM_RANGE` |
| 敌弹道条数 | 60 | `05-update.js` |

### 数值标尺与溢出闸门

| 项 | 值 | 出处 |
|:--|:--|:--|
| 难度标尺 = 怪物标尺 | `1 + 0.3365x + 0.0566x² + 0.0063x³`（`x = f − 1`），**同一个值** | `01-state.js` `diffScaleAt()` / `getDifficultyMultiplier()` / `getMonsterScale()` |
| 玩家数值软上限 | `playerCap(base) = base × (1 + f × 0.015)`；第 1 层 ×1.015 / 100 层 ×2.5 / **200 层 ×4** | `00-data.js` `PLAYER_CAP_RATE` / `playerCap()` |
| 轨迹宽度上限 | `getTrailWidthCap() = playerCap(150)`，**只增不减** | `00-data.js` |
| **攻击力 / 倍率没有上限** | `E01` 的 `atkUp`、`E02` 的 `multUp`、商店「攻击强化」三条路径都是无上限累加 | `02-combat.js` E01/E02、`00-data.js` `STAT_CHOICES.atkUp` |
| 仍然写死、不走软上限的三个 | E15 图腾加固·极 `30` / 玩家护盾上限 `300` / `fireRateMul` `2.0` | `00-data.js` `RARE_E15_CAP` / `RARE_E16_CAP` / `RARE_E17_CAP` |
| 防溢出天花板（纯兜底） | 普通怪与 BOSS HP `1e15`、怪物攻击 `1e9`、怪物移速 `6.0` | `00-data.js` `HP_OVERFLOW_GUARD` / `ATK_OVERFLOW_GUARD` |
| 前期普通怪再削 | ×0.7，仅 `f < 30` 且**非精英**；与 §6 的 ×0.8 叠乘 = **0.56** | `00-data.js` `EARLY_NORMAL_MUL` |
| BOSS 前期减压 | `bossEarlyMul() = 0.35 + 0.65 × clamp((f-1)/19, 0, 1)`：1 层 ×0.35 → 20 层 ×1.0 | `00-data.js` |
| 难度显示格式 | `< 1e4` 两位小数 / `< 1e6` 千分位 / 更高 `e` 记数法 | `01-state.js` `formatDiff()` |

### 性能

| 项 | 值 | 出处 |
|:--|:--|:--|
| 一帧预算 | `FRAME_BUDGET_MS = 1000/60` ≈ 16.67ms。主循环**不锁帧**，裸 rAF——越过这条线就落到下一个 vsync，也就是**恰好 30** | `08-main.js` |
| 主循环计时叠层 | `FPS · U 均值/峰值 · D 均值/峰值 · 其他`；`其他 = 1000/FPS − U − D` | `08-main.js` `sampleLoopCost()` |
| 背景层缓存 | 径向渐变（圆心 `390,280`，半径 `50→400`）+ 40px 网格，烘焙成 **780×560 离屏画布**，每帧只 `drawImage` 一次 | `06-render.js` `getBackdrop()` |
| `shadowBlur` 档位 | 轨迹 12（闪电）/ 8；冲刺轨迹 14；火焰轨迹 6；子弹 10（暴击）/ 6；敌方弹道 4；伤害转移 6。**只放过两处单实体**：玩家 20、BOSS 35。普通怪不用 `shadowBlur`，改一次光晕 `fill`（精英 `r+7` / 0.16，普通 `r+4` / 0.09） | `06-render.js` |
| 模拟模式每 tick | 3 帧 | `01-state.js` `simSpeed` |

---

## 2. 难度与标尺

### 一条曲线

```
D(f) = S(f) = 1 + 0.3365x + 0.0566x² + 0.0063x³        x = f − 1
```

`DIFF_C1 = 0.3365` / `DIFF_C2 = 0.0566` / `DIFF_C3 = 0.0063`
（`01-state.js` `diffScaleAt(f)`；`getDifficultyMultiplier()` = `diffScaleAt(G.floor)`）。

**难度显示与怪物数值是同一个值**。`getMonsterScale()` 是 `getDifficultyMultiplier()`
的别名——保留这个名字只是为了让那八个消费方不用改。对局记录里的 `diff` 与 `ms` 两列
因此恒等（列本身保留）。

| 楼层 | `x` | `D = S` |
|--:|--:|--:|
| 1 | 0 | 1.00 |
| 2 | 1 | 1.3994 |
| 10 | 9 | 13.21 |
| 30 | 29 | 212.0 |
| 50 | 49 | 894.6 |
| 100 | 99 | 6.70e3 |
| 211 | 210 | **6.09e4** |

- 第 1 层正好 ×1.00（`x = 层数 − 1`，常数项 1）。
- 全程单调递增。三次项系数为正，不会掉头。
- `DIFF_KNEE = 30` **不是拐点**，只是「前期 / 后期」分界——精华上限、清层卡数修正、`EARLY_NORMAL_MUL` 的生效范围、`getBossHp()` 的尾巴钳位四处共用。
- 吃这条标尺的**八个消费方**（它们要的是「这一层的强度标尺」，不是「哪条曲线」）：`spawnMonster` / `spawnDebugMonster` / `getBossAtk()` / `spawnBossMinion` / E10 反噬（`02-combat.js`）、终结技与 `activateEliminate()`（`04-trail.js`）、爆裂词缀新星（`05-update.js`）。
- 不吃标尺的：`scoreValue`、`06-render.js` / `07-ui.js` / `10-sim.js` 的难度**显示**、快照的 `difficulty` 字段、`getTrailDamage()`（平值，见 §4）。
- 纯函数：`diffScaleAt(f)` 只读参数，不读 `G.floor`。对局记录回放靠这个（`10-sim.js` `getDiffAtFloor` / `getMonsterScaleAtFloor` 是它的两个别名）。
- 防溢出天花板 `HP_OVERFLOW_GUARD = 1e15` / `ATK_OVERFLOW_GUARD = 1e9` 保留，但已彻底沦为纯兜底——三次曲线到 211 层也只用掉它们的千分之一。

### 每层怪物数

`01-state.js` `getMonsterCount()`

```
count = floor( min(4 + floor(3 × 1.10^f), 50) × monsterCountMul )
```

硬顶 **50 只**。`monsterCountMul` = 命运「丰收」×1.25 × 遗物「贪婪圣杯」×1.3。

### 精英概率

`01-state.js`

```
base  = min(0.05 + 0.04 × log2(f + 1), 0.35)
final = min(base × eliteMult, 0.8)
```

`eliteMult` = 2.5，仅 `eliteSquad` 关卡类型。

### 出怪节奏

`01-state.js`、`05-update.js`

```
getSpawnInterval() = max(6, 25 / 1.06^(f - 1))      // fastRush 关卡 ×0.4
每次生成数量        = min(1 + floor(f / 12), 3)
```

出怪点：画布外四边随机（`pad = 30`）。

### 精英词缀数量

词缀池开放门槛 `minWave = 5`（**14 条全部是 5**）。

| 楼层 | 数量 |
|:--|:--|
| f < 5 | 0 |
| 5 ≤ f < 15 | 30% 出 1 个，否则 0 |
| 15 ≤ f < 25 | 1 个；30% 变 2 个 |
| f ≥ 25 | 2 个；20% 变 3 个 |

BOSS 不走上表：`pickAffixes(2, { exclude: ['dash','swarm'], bossOnly: 'any' })`，即**恰好 2 个**，从 12 条里等权抽。唤魔者 BOSS 是 **3 个**。

### 关卡类型权重

`00-data.js` `STAGE_TYPES`。表中为基准权重（实际生效 = 表中值，`MONSTER_TYPES[].weight` 只是查不到时的兜底）。

| 类型 | basic | fast | tank | healer | splitter | scorcher | wraith | shooter | eliteMult |
|:--|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| mixed 混编 ⚔️ | 1 | 1 | 1 | 0.6 | 0.4 | 0.2 | 0.2 | 0.4 | — |
| fastRush 疾驰 💨 | 0.3 | 5 | 0.1 | 0.2 | 0.3 | 0.2 | 0.3 | 0.3 | — |
| siege 攻城 🛡️ | 1 | 0.2 | 4 | 2 | 0.3 | 0.1 | 0.1 | 0.3 | — |
| fireStorm 烈火 🔥 | 0.5 | 0.5 | 0.5 | 0.3 | 0.3 | 4 | 0.5 | 0.3 | — |
| ghostTown 幽灵 👻 | 0.3 | 0.3 | 0.2 | 0.2 | 0.2 | 0.2 | 4 | 0.5 | — |
| eliteSquad 精英 ⭐ | 1 | 1 | 1 | 1 | 1 | 0.5 | 0.5 | 0.5 | **2.5** |
| bossStage BOSS 👑 | — | — | — | — | — | — | — | **0** | — |

七张表**都必须显式写 `shooter` 键**（`MONSTER_TYPES.SHOOTER.weight = 4` 只是兜底，量级差十倍）。

额外修正（`02-combat.js`）：治疗怪 f<3 ×0.2；分裂怪 f<2 ×0.2；重装怪 f>10 ×1.3；疾速怪 f>8 ×1.2。重装关卡（`siege`）额外 `hpMult = 2`。

---

## 3. 玩家 / 核心 / 护盾

### 移速

`05-update.js`

```
playerSpeedMult = G.buffs.speedUp × G.fateBuffs.speedMul × getPlayerSpeedZoneMul()
speed           = G.player.speed × playerSpeedMult
```

- `buffs.speedUp` 初始 **1**；每层奖励 +0.05；E11「自速暴涨」+0.35/层，两者共用上限 `playerCap(6)`
- `getPlayerSpeedZoneMul()` = 减速区圈（🟦）的倍率，**多圈重叠取最强（`Math.min`），不连乘**
- **玩家不会被怪物减速**——那条分支不可达（见设计笔记 §15）。拖慢玩家的只有减速区与冰轨那类效果

### 承伤

护盾（`G.player.hp`）先吃伤害，归零后才扣 `G.core.hp`。两者都画在**核心头顶**。一次伤害**不跨池溢出**——护盾 50 挨一记 60，结果是护盾 0、核心 100。

所有对玩家的伤害统一走 `damagePlayerSide(dmg, opts)`（`05-update.js`）：

| `opts` 字段 | 作用 | 谁在用 |
|:--|:--|:--|
| `color` | 飘字 / 粒子配色 | 全部调用方 |
| `shieldOnly` | **只作用于护盾**，护盾归零后停手、不咬核心 | **只有荆棘**（2 处） |
| `silent` / `noText` / `particles` | 给逐帧来源降噪 | 火焰轨迹、危险区、火圈、敌图腾 |

### 掉血来源汇总

| 来源 | 公式 | 出处 |
|:--|:--|:--|
| 怪物撞击 | `m.atk × 0.35 × fateBuffs.damageTakenMul` | `05-update.js` |
| 🔫 射击怪远程（打核心） | 同上，**逐字相同** | `05-update.js` `fireEnemyShot()` |
| 火焰轨迹（玩家） | 0.8 / 帧 | `05-update.js` |
| 火焰轨迹（图腾） | 0.012 / 帧（≈0.72 血/秒） | `05-update.js` |
| 🔥 火焰圈（玩家） | 1 / 6 帧（≈0.167/帧） | `05-update.js` `tickAffixZones()` |
| 🔥 火焰圈（图腾） | `FIRE_TURRET_DMG_PER_FRAME × 6` / 6 帧 | 同上 |
| 危险区 | 1.2 / 帧 | `05-update.js` |
| 荆棘反弹（子弹 / 轨迹） | `dmg × (0.08 + f × 0.002)` — **`shieldOnly`** | `05-update.js` |
| 爆裂词缀爆炸 | `(20 + f × 4) × S × 0.3`（仅玩家在 80px 内） | `05-update.js` |

除**荆棘两行**外全部走 `damagePlayerSide()` 的「盾 → 核心」通道。

---

## 4. 子弹

### 两道独立射速闸门（改射速必须两处都动）

```
G.fireRate        = 40                           01-state.js
p.shootCooldown   = max(24, 48 - f × 0.32) / PLAYER_FIRE_RATE_MUL(1.2)     04-trail.js autoShoot()
```

实际间隔不是两者之和，而是**「≥ 冷却的 `fireRate` 最小整数倍」**：

```
冷却 ≤ fireRate          → 间隔 = fireRate
fireRate < 冷却 ≤ 2×fr   → 间隔 = 2 × fireRate
```

冷却上限 `48 / 1.2 = 40` 正好等于基础 `fireRate`，所以基础职业**全程稳定 40 帧一发**。只有职业改了 `fireRate` 时冷却才重新起约束：弹幕风暴 `fireRate ×0.6 = 24` → 第 1 层间隔 48（`2 × 24`）。

职业修正：弹幕风暴 ×0.6，堡垒守卫 ×1.25。连锁风暴 `max(12, fireRate - 8)` → 间隔 40 → 32。

### 单发伤害

```
atk = (player.atk + buffs.atkUp) × (1 + buffs.multUp) × fateBuffs.atkMul
      × fateBuffs.bulletDmgMul × 1.15
if (hp < maxHp × 0.3 && 狂战图腾)  atk ×= 2
if (rand < critChance)             atk ×= 2      // 暗影之刃，20%
```

`buffs.multUp` 是**加法**累积（每次 +0.25，**没有上限**），显示为 `×(1+multUp)`。
`buffs.atkUp` 同样无上限累加。两者合起来就是「玩家攻击力没有任何封顶」——
它只被成长速度（拿牌频率）约束，不被常量约束。

### 弹体

| 项 | 主弹 | 额外弹丸 |
|:--|:--|:--|
| 速度 | 7 | 7 |
| 半径 | 4 | 3 |
| 寿命 | 60 帧 | 50 帧 |
| 伤害 | `atk` | `atk × 0.6` |
| 散射 | ±0.08 弧度 | ±0.2 弧度 |
| 出膛偏移 | 22px | 22px |

额外弹丸数 = `G.extraBullets`（弹幕风暴 +1）。出界判定 `x < -10 || x > 790 || y < -10 || y > 570`。

### 命中

- 虚灵减伤 `× (1 - bulletResist)`，`bulletResist = 0.3`
- **停顿 18 帧**（`m.stunned`），BOSS 也吃
- 每颗子弹首次命中 +1 分并触发 T07；命中精英 / BOSS 额外触发 T03
- **命中不给终极技充能**

### 索敌优先级

`04-trail.js`：治疗 💚 → 精英 ⭐ → BOSS 👑 → 其余；同类取最近。

---

## 5. 轨迹 / 冲刺 / 围剿

### 参数

`04-trail.js`、`05-update.js`

| 项 | 值 |
|:--|:--|
| 生成频率 | 每 2 帧（仅移动时） |
| 段长 | 6px（两端各 ±6） |
| 基础寿命 | 360 帧 + `trailLifeBonus` |
| 基础宽度 | 6 |
| 冲刺段长 / 寿命 | 12px / 180 帧 |
| 冲刺宽度 | `(宽度 + 4) × 类型倍率 × 1.5` |

`trailLifeBonus`：轨迹编织者 +180、遗物「时间膨胀器」+120。

### 伤害与踩踏

```
getTrailDamage() = (buffs.trailDmg + log2(f + 1) × 0.5) × fateBuffs.trailDmgMul
```

`buffs.trailDmg` 初始 1，上限 `playerCap(100)`（E06）。冲刺命中 **×2.5**。

```
命中判定：dist(m, 段中点) < getTrailWidth() + m.r + 10
伤害冷却：普通 15 帧 / 冲刺 8 帧（每怪独立，m.trailDamageCooldown）
踩到轨迹 → m.slowTimer = max(m.slowTimer, 180)，移速 ×0.8
```

- **虚灵免疫轨迹伤害**（`isWraith`），但**不免疫迟缓**
- 轨迹**不阻挡怪物移动**；`TRAIL_SLOW_FRAMES = 180`，无冷却（踩着一直续）
- 与 E14「延缓」共用 `m.slowTimer` 与同一个 0.8 乘数，叠加时**取更长的时长，不叠乘**
- 每跳 +1 分并触发 T06；精英 / BOSS 额外触发 T03

### 轨迹类型

`00-data.js`

| 类型 | 宽度倍率 | 触发 |
|:--|--:|:--|
| basic 蓝 | 1.0 | 默认 |
| fire 红 | 1.3 | 轨迹反噬 / 爆轨清场 |
| ice 白 | 1.5 | 冰轨永冻 |
| lightning 金 | 1.1 | 连锁风暴 / 弹幕地狱 |

### 围剿

`05-update.js`，每 30 帧检测一次（需 `trails.length > 10`）

```
对每只非 BOSS 怪：8 个方向、半径 (50 + m.r) 采样
某方向被轨迹覆盖（dist < trailWidth + 8）或出界 → 该方向算「堵」
堵住 ≥ 6/8 → 伤害 25 + buffs.trailDmg × 3 + f，眩晕 30 帧
```

每 60 帧额外 +5 分。纯几何判定，与物理碰撞无关。

---

## 6. 怪物

### 基础数值表

`00-data.js`

| 类型 | emoji | baseHp | hpScale | baseSpeed | speedScale | baseAtk | atkScale | r | 精英r | 分值 | 精英分 | weight | 移动间隔 |
|:--|:--|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| 普通 | 👾 | 36 | 16 | 0.28125 | 0.0125 | 5 | 1.1 | 12 | 18 | 5 | 15 | 30 | 60 |
| 疾速 | 💨 | 22 | 9.0 | 0.5625 | 0.021875 | 3 | 0.75 | 10 | 14 | 6 | 18 | 25 | 30 |
| 重装 | 🛡️ | 112 | 40 | 0.125 | 0.0046875 | 8 | 1.5 | 18 | 24 | 10 | 25 | 18 | 120 |
| 治疗 | 💚 | 45 | 16 | 0.21875 | 0.009375 | 2 | 0.45 | 13 | 17 | 8 | 20 | 12 | 80 |
| 分裂 | 🧬 | 68 | 25 | 0.25 | 0.0109375 | 5 | 0.9 | 14 | 18 | 9 | 24 | 10 | 70 |
| 灼烧 | 🔥 | 33 | 12 | 0.25 | 0.011 | 5 | 0.85 | 12 | 16 | 7 | 20 | 12 | 55 |
| 虚灵 | 👻 | 21 | 7.5 | 0.28 | 0.015 | 3 | 0.7 | 11 | 15 | 8 | 22 | 10 | 45 |
| 射击 | 🔫 | 30 | 13 | 0.1875 | 0.008 | 6 | 1.2 | 12 | 16 | 11 | 26 | 4 | 60 |
| BOSS | 👑 | 100000 | 0 | 0.1 | 0 | 45 | 0 | 30 | 35 | 3000 | 3000 | 0 | 60 |

解锁门槛：灼烧怪**第 8 层**、虚灵怪**第 12 层**、射击怪**第 25 层**。

### 射击小怪（第 9 种）

| 项 | 值 | 出处 |
|:--|:--|:--|
| 射程 | **119px** = 中环基础炮台 140 × 0.85 | `ENEMY_SHOOTER_RANGE` |
| 开火间隔 | **40 帧** = 主人公初始射速 `G.fireRate` | `ENEMY_SHOOTER_INTERVAL` |
| 首个开火计时 | 生成时 `rand(0, 40)` | `02-combat.js` |
| 弹道残留 | 8 帧（纯渲染，命中即时） | `ENEMY_SHOT_LIFE` |
| 关卡权重 | mixed 0.4 / fastRush 0.3 / siege 0.3 / fireStorm 0.3 / ghostTown 0.5 / eliteSquad 0.5 / bossStage 0 | `00-data.js` |

行为：索敌 → 靠近 → 到射程内停下开火。**场上只要有炮台就无条件锁炮台**（不管比核心远多少），一座塔都没有时才改锁核心。停下的距离 = `射程 + 目标半径`（打塔 133，打核心 149）。

伤害口径与近战逐字相同：打炮台 `max(1, atk × 0.05)`（掉塔血，不经过核心护盾），打核心 `atk × 0.35 × damageTakenMul`（走 `damagePlayerSide()`）。

### 生成公式

`02-combat.js` `spawnMonster()`

```
hp  = (baseHp + hpScale)      × S × hpMult × 0.8 × early    // 精英：(baseHp + hpScale × 1.5)，early = 1
spd = (baseSpeed + speedScale) × min(D, 3.0)                // 精英：speedScale × 1.2（不乘 0.8）
atk = (baseAtk + atkScale)    × S^0.35 × 0.8 × early        // 精英：atkScale × 1.3，early = 1

early = (普通怪 && f < 30) ? 0.7 : 1
```

硬钳：`hp ≤ 1e15`、`speed ≤ 6.0`、`atk ≤ 1e9`。`hpMult`：重装关卡 ×2；教程 `hpMul`（第 1 层 0.6）。

### 每帧移速

`05-update.js`

```
spd = m.speed × (1 - slowAll) × (slowTimer > 0 ? 0.8 : 1) × 1.33
```

`disabled`（`frozen > 0` 或 `stunned > 0`）时完全不移动、不攻击、不出火轨。

### 索敌

在**最近的图腾**与**核心**之间挑更近的那个（`04-trail.js` `nearestTurret()`）。**射击怪是唯一例外**（无条件优先炮台）。

### 状态字段

| 字段 | 含义 | 默认 |
|:--|:--|:--|
| `frozen` | 冰冻剩余帧 | 0 |
| `stunned` | 眩晕剩余帧 | 0 |
| `slowTimer` | 迟缓剩余帧（E14 + 踩轨迹共用） | 0 |
| `hitCooldown` | 攻击冷却，固定 24 帧 | 0 |
| `trailDamageCooldown` | 踩轨迹伤害冷却 | 0 |
| `moveTimer` / `isMoving` / `moveInterval` | 间歇性移动 | 随机 |
| `alwaysMoving` | f ≥ 10 且 `rand < min(0.10 + 0.09 × (f - 10), 1.0)` | false |
| `bulletResist` | 子弹减伤（虚灵 0.3） | 0 |

### 特殊行为

| 行为 | 公式 | 出处 |
|:--|:--|:--|
| 治疗怪回血 | `healAmount = type.healAmount × min(D, 2.5)`；冷却 `max(40, 60 - f × 0.3)` 帧；范围 180 | `02-combat.js` |
| 治疗怪自愈 | 每次 `healAmount × 0.5` | `02-combat.js` |
| 分裂怪死亡 | 子体数 `min(splitCount + floor(f / 10), 4)`；r ×0.55、hp 30%、speed ×1.3、atk ×0.4、分值 ×0.2；`canSplit = false` | `02-combat.js` |
| 灼烧怪火轨 | 每 8 帧留一条，寿命 150 帧 | `05-update.js` |
| 虚灵残影 | 渲染层 3 层拖影，alpha 0.12 | `06-render.js` |

### BOSS

`00-data.js` `getBossHp()`、`02-combat.js`

```
getBossHp() = floor( 0.9 × 100000 × 1.7^(min(floor(f/10), 3) - 1) × tail × bossEarlyMul() )
tail        = (f ≤ 30) ? 1 : D(f) / D(30)        D = diffScaleAt
上限 1e15
atk         = 45 × S^0.35 × bossEarlyMul()        // getBossAtk()
```

- `f ≤ 30` 那道钳子**不能丢**：丢了之后第 10 层的 `tail` 会算成 `D(10)/D(30) = 0.062`，BOSS 血量直接软掉 16 倍。
- 第 30 层之后 `tail` 跟着三次曲线涨，所以 BOSS : 普通怪的血量比恒定在 ~29.5 倍。
- 取值参考：第 10 层 HP 59,211 / atk ×0.65789；第 20 层 HP 153,000（×1.0）；第 30 层 HP 260,100；第 100 层 HP 8,222,133。
- 爪牙：间隔 `round(max(50, 150 - f × 2) / 1.1025)` 帧，首次 91 帧；数量 `1 + floor(f / 15)`，只出 basic/fast/tank
- 爪牙数值：r ×0.8、hp 50%、speed ×1.2、atk ×0.5、分值 ×0.3
- 每 10 层一只（`f % 10 === 0`）；节点地图上 BOSS 节点只在 `f % 10 === 9` 可选

### 唤魔者 BOSS（稀有触发板 T14 召唤）

```
bossHp  = max( getBossHp(),  Σ(场上怪 hp)  × 1.13 )
bossAtk = max( getBossAtk(), Σ(场上怪 atk) × 1.13 )
```

| 项 | 说明 |
|:--|:--|
| 词条数 | **3 条**（普通 BOSS 2 条） |
| 清场 | **不走 `registerKill()`**——只放粒子和 ☠ 飘字，不加击杀数 / 分 / 断连杀 / 不触发 T08 |
| 代价基数 | **清场前**场上怪的数值之和（先算再清） |
| 掉落 | 照常吃普通 BOSS 的全部掉落，**额外**再掉唤魔之钥 |
| 排程 | 不碰 `G.bossPending` / `G.bossSpawned`，顶不掉「每 10 层一只」 |
| 可反复 | 每次宣读都是新的一组 BOSS + 一把钥匙 |
| 一次性 | `T14` 在 `doCombine()` 的**槽位检查之前**被单独接管：**不受槽位限制**、**不写 `G.passives`**，两张牌宣读完即消失 |
| 不被自动宣读 | 槽满自动宣读遍历 `G.passives`，`T14` 不在里面 |

### 击杀掉落

`05-update.js`

| 项 | 公式 |
|:--|:--|
| 分数 | `scoreValue = 基础分 × S`（精英用精英分） |
| BOSS 分数 | `scoreValue × S`，兜底硬顶 300 |
| 精华 | `1 + floor(f / 10)`；精英 +3；+ 精华磁铁 2；`×(1 + essenceBonus)`；再走本层上限（§13） |
| BOSS 精华 | `10 + f`，同样计入本层上限 |
| 遗物 | 精英 `0.08 × dropRateMul` / BOSS `0.30 × dropRateMul`，**无上限** |
| BOSS 卡牌 | `round((2 + floor(rand × 2)) × dropRateMul)` 张，即 2–3 × `dropRateMul` |
| 连杀加分 | 连杀 ≥ 2 时触发 T08 并 `+ killStreak × 2`（BOSS 用 ×5） |
| 吸血 | 每杀回 `vampHeal`；BOSS 回 `vampHeal × 3` |
| 卡牌 | 每累计 **20** 杀掷一次 **30%** → 1 张；**不吃** `dropRateMul` |

---

## 7. 精英词缀

`00-data.js`。**14 条，全部 `minWave = 5`**，分两组。

### 抽池

`pickAffixes(n, opts)`，`opts = { exclude: string[], bossOnly: boolean|'any' }`

| 调用点 | 传参 | 池子 |
|:--|:--|:--|
| `spawnMonster()`（精英怪） | `{ bossOnly: false }` | **14 条全进池**，其中 8 条只算**半权**（`ELITE_BOSS_AFFIX_WEIGHT = 0.5`） |
| `spawnBoss()` | `{ exclude: ['dash','swarm'], bossOnly: 'any' }` | 14 条排除突进 / 群生 = **12 条，等权** |
| `spawnDebugMonster()` | `{ bossOnly: 'any' }` | 全部 14 条 |

### 精英词条（6 条）——强化怪物自身

| id | 名称 | 效果 | 数值 | 出处 |
|:--|:--|:--|:--|:--|
| `regen` | 再生 💚 | 每帧回血 | `0.05 + f × 0.01` | `05-update.js` |
| `thorns` | 荆棘 🌿 | 反弹给玩家 | `dmg × (0.08 + f × 0.002)` | `05-update.js` |
| `swift` | 迅捷 💨 | 速度 | `spd × 1.4` | `02-combat.js` |
| `giant` | 巨人 🦍 | HP 与体型 | `hp × 2`，`r × 1.5` | `02-combat.js` |
| `vampiric` | 吸血 🩸 | 攻击时回血（仅当玩家护盾已空） | `dmg × (0.15 + f × 0.01)` | `05-update.js` |
| `explosive` | 爆裂 💥 | 死亡范围爆炸 | `(20 + f × 4) × S`，半径 80 | `05-update.js` |

### BOSS 专属词条（8 条）——干扰玩家

声明式行为字段 + `05-update.js` 的统一钩子。

| id | 名称 | 效果 | 数值 | 钩子 |
|:--|:--|:--|:--|:--|
| `weaken` | 削减区 🟥 | 圈内玩家 / 图腾攻击打折 | `playerAtkMul = 0.6`；`r = 100 × 1.5 = 150` | `getAffixZoneMul()` |
| `slowzone` | 减速区 🟦 | 圈内玩家移速 / 图腾出手打折 | `playerSpeedMul = 0.65`；`r = 90 × 1.5 = 135` | `getAffixZoneMul()` |
| `firezone` | 火焰区 🔥 | 圈内持续掉血 + 烧塔 | `r = 90 × 1.5 = 135`；每 6 帧 1 点 | `tickAffixZones()` |
| `dash` | 突进 🌀 | 朝玩家猛冲 | 每 180 帧冲 90px，12 帧插值（0.28 逼近），**无视地形** | `tickAffixes()` |
| `vortex` | 牵引 🌪 | 把玩家往自己拽（**贴身拉力，不做圈**） | `r = 160`，`pull = 0.15 × (1 - d/r)` | `applyVortexPull()` |
| `seal` | 封印 🔒 | 撞核心封一个被动 | `SEAL_FRAMES = 240`（4 秒） | `onAffixCoreHit()` |
| `swarm` | 群生 👥 | 分裂残影 | 每 360 帧一只，`hpFrac = 0.20`，上限 3 只 | `spawnSwarmClone()` |
| `totem` | 敌图腾 🗿 | 死后留图腾 | 寿命 720 帧，索敌 120px，每 60 帧一发 `3 + f × 0.2` | `onAffixDeath()` |

### 圈层（三个 zone 词条）

```
每 300 帧落一个：
  距离 = rand(r × 1.2, 300)          // 下界保证不落在 BOSS 自己脚下
  半径 = 基数 × AFFIX_ZONE_R_MUL(1.5)   // 100→150 / 90→135 / 90→135
  存活 = 360 帧（6 秒）
  同属性同屏上限 = 3
  落定后与 BOSS 位置再无关系
```

存在 `G.affixZones`（**不挂在怪身上**），`startFloor()` / `resetGame()` 清空。

| 圈 | 对玩家 | 对图腾 |
|:--|:--|:--|
| 🟥 削减区 | 单发伤害 ×0.6 | 单发伤害 ×0.6 |
| 🟦 减速区 | 移速 ×0.65 | **出手速度 ×0.65** |
| 🔥 火焰区 | 每 6 帧 1 点 | 每 6 帧 1 点（沿用火焰烧塔速率） |

**区域重叠取最强（`Math.min`），不连乘。**

---

## 8. 图腾（闭环）

`04-trail.js`、`05-update.js`

### 判环参数

```
LOOP_GRID      = 10    // 节点吸附粒度 (px)
LOOP_MIN_NODES = 8     // 环最少节点数
LOOP_MIN_AREA  = 800   // 最小面积 (px²)
检查频率：每 6 帧一次（且 _loopCD 为 0）
_loopCD        = 30    // 成功出塔后的冷却
```

判据：轨迹中点按 `LOOP_GRID` 吸附成节点，第一次撞见重复节点且间隔 ≥ 8 即认为成环；鞋带公式算面积，需 ≥ 800。

### 分档

| 档位 | 面积 | 尺寸倍率 `m` | 血量 | 半径 |
|:--|:--|--:|--:|--:|
| 🥉 小环 | < 2000 | 0.6 | 2 | 8.4 |
| 🥈 中环 | 2000–8000 | 1.0 | 4 | 14 |
| 🥇 大环 | ≥ 8000 | 1.5 | 6 | 21 |

血量再 `+ G.turretHpBonus`（「图腾加固」每层 +1，同时给场上已有的塔补血）。

### 类型表 `T`

由 T12 绑定的效果板决定。

| 类型 | emoji | 射速 `fr` | 射程 `rg` | 权重 `d` |
|:--|:--|--:|--:|--:|
| basic | 🗼 | 25 | 140 | 30 |
| rapid ⚔️E01 | 🎯 | 8 | 120 | 18 |
| lightning ⚡E12 | ⚡ | 40 | 180 | 50 |
| frost ❄️E13 | ❄️ | 20 | 120 | 10 |
| trail 🐾E06 | 🐾 | 15 | 160 | 35 |

### 实例化与开火

```
fireRate = floor(fr / m)
ratio    = d × m          // 召唤时算好存下
range    = rg × m
r        = 14 × m
位置      = clamp(cx, 60, 720), clamp(cy, 60, 500)

TURRET_RATIO_NORM  = 50 × 1.5 = 75
dmg = getPlayerAttackPower() × t.ratio / 75 × getTurretAtkZoneMul(t)     // 开火时现算
```

塔的强度就是玩家攻击力的一个**比例**（没有单独的上限常量），「大环闪电」正好是 1.00 倍：

| 塔 | `d × m` | 单发（÷ 玩家攻击力） |
|:--|--:|--:|
| 大环闪电 ⚡ | 75 | **1.000**（比例基准） |
| 中环闪电 ⚡ | 50 | 0.667 |
| 大环基础 🗼 | 45 | 0.600 |
| 中环足迹 🐾 | 35 | 0.467 |
| 中环基础 🗼 | 30 | 0.400 |
| 中环速射 🎯 | 18 | 0.240 |
| 中环冰霜 ❄️ | 10 | 0.133 |

**怪物的敌对建筑（🗿 敌图腾）单独算**：伤害 `3 + f × 0.2`，**不吃玩家攻击力**。

### 特殊开火

| 类型 | 效果 |
|:--|:--|
| lightning | 命中后 `chainCooldown = 15`，向 150px 内最多 **3 只**额外怪各打 `damage × 0.6` |
| frost | 命中者 `frozen = max(frozen, 40)` |
| trail | `G.frame % 10 === 0` 时，射程内所有怪各吃 `damage × 0.3` |

每次开火 +1 分。

### 上限与生命周期

- 数量上限 `G.maxTurrets = 10`，超出**不登记环 key**，环保持武装可自动补位
- 提示节流 120 帧
- 同一个环（key = `round(cx/24),round(cy/24),档位`）只出一座；塔碎 / 被打消时删 key，环重新武装
- **没有留存时间，只有血量**，被打光才碎

---

## 9. 终极技

`04-trail.js`、`05-update.js`、`09-events.js`

### 充能

```
ULT_BASE_FRAMES = 25 × 60 = 1500 帧
回满一槽的帧数 = ULT_BASE_FRAMES / (1 + floor(f / 50))
每帧回复       = ultimateMax / 回满帧数 × ultimateChargeMult
```

| 楼层 | 回满一槽 |
|--:|--:|
| 1 | 24.5 s |
| 10 | 20.8 s |
| 30 | 15.6 s |
| 50 | 12.5 s |
| 100 | 8.3 s |

- **释放期间不回能**（`if (!G.ultimateActive && gauge < max)`）
- **造成伤害不充能**（子弹 / 轨迹 / 闪电链三处都没有）
- `ultimateChargeMult` 乘的是**速率**：

| 来源 | 倍率 |
|:--|--:|
| 基础 | 1.0 |
| 命运「超载」 | ×2 |
| 第 40 层 | ×1.5 |
| 职业·奥术学者 | ×1.5 |

HUD 显示「还要几秒」（`06-render.js`）。按 **Q** 释放。

### 释放

前置：`ultimateGauge >= ultimateMax && !ultimateActive && !gameOver && !paused`

```
trailDmg = buffs.trailDmg × 5 + f × 2
半径 radius = 350
对半径内每只怪：
  falloff = 1 - (d / 350) × 0.7
  dmg     = floor(trailDmg × falloff × S)
  addScore(floor(dmg × 0.1))
全场怪物 stun = max(stun, 120)     // 2 秒
清空 G.trails 与 G.fireTrails
addScore(50)
```

释放后 `ultimateGauge = 0`、`ultimateTimer = 60`（冲击波动画）、`screenFlash = 1.0`（每帧 −0.025）。

---

## 10. 连杀

`02-combat.js`

```
KILL_STREAK_WINDOW = 180 帧（3 秒）
断连条件：3 秒无击杀，或核心挨打
```

| 消费方 | 公式 | 出处 |
|:--|:--|:--|
| 击杀加分 | `+ killStreak × 2`（BOSS ×5） | `05-update.js` |
| T08「连环击杀」 | `killStreak >= 2` 时 `triggerPassive('T08')` | `05-update.js` |
| HUD | 右下角 `连杀:N` | `06-render.js` |
| 最高连杀记录 | `G.maxCombo` | `02-combat.js` |

**不存在「25% / 50% 终极技阈值」这种机制。**

---

## 11. 密文板

### 触发板 `TRIGGERS`

`00-data.js`

| id | 名称 | 触发时机 | 权重 |
|:--|:--|:--|:--|
| T03 | 命中精英时 ⭐ | 子弹 / 轨迹命中精英或 BOSS（**效果数值 / 时长 ×1.2**） | 1 |
| T06 | 怪触轨 🐾 | 怪物踩到轨迹（**高频**） | 1 |
| T07 | 射击命中 🎯 | 子弹命中（**高频**） | 1 |
| T08 | 连环击杀 🔥 | 连杀 ≥ 2（**高频**） | **0.7** |
| T10 | 残血触发 ❤️‍🔥 | 护盾 < 30%（每 30 帧检查一次），或宣读时已在残血 | 1 |
| T12 | 闭环触发 ⭕ | 闭环召唤图腾时 | 1 |
| T14 | 唤魔者 👹 | **宣读那一刻立即触发一次**（宣读时清场 + 招 BOSS） | **稀有池**（40 层起） |

「高频」= `isHighFreq`，用于 E01/E03 的数值分档。抽取必须走 `randomTrigger()`。

**T14**：手牌上唯一的**红卡**（`cardColor: '#a01f2e'`）。掉落走稀有池，40 层前 `rareChance()` 返回 0（图鉴按同一条件过滤）。一次性宣读，可反复叠。

### 效果板 `EFFECTS`

`00-data.js` + `02-combat.js`

| id | 名称 | 效果 | 高频值 | 普通值 | 上限 | 权重 |
|:--|:--|:--|--:|--:|:--|--:|
| E01 | 攻击增幅 ⚔️ | `buffs.atkUp +=` | **5** | **12** | **无上限** | 1 |
| E02 | 连环击 💥 | `buffs.multUp += 0.25` | — | — | **无上限** | **0.7** |
| E03 | 生命回复 💚 | 回护盾 | **5** | **20** | maxHp | 1 |
| E06 | 轨迹升级 ⬆️ | `trailDmg +1`，`trailWidth +2` | — | — | `playerCap(100)` / `getTrailWidthCap()` | 1 |
| E07 | 轨迹爆伤 💣 | 引爆半径 200 内的轨迹 | — | — | — | 1 |
| E10 | 怪物反噬 🔄 | `floor(60 × (2 + S) / 3)` 全场伤害 | — | — | — | 1 |
| E11 | 自速暴涨 💨 | `buffs.speedUp += 0.35` | — | — | `playerCap(6)` | **0.7** |
| E12 | 闪电链 ⚡ | 见下 | — | — | — | 1 |
| E13 | 冰冻 ❄️ | 见下 | — | — | — | 1 |
| E14 | 延缓 ⏳ | `m.slowTimer = max(, d × n)` | **30 帧** | **60 帧** | — | 1 |
| E15 | 图腾加固·极 🗿 | `G.turretHpBonus += 3` | — | — | **30** | **稀有池** |
| E16 | 护盾扩容 🔰 | `G.player.maxHp += 5; G.player.hp += 5` | — | — | **300** | **稀有池** |
| E17 | 急速装填 ⏩ | `G.buffs.fireRateMul += 0.08` | — | — | **2.0** | **稀有池** |

- **E07**：对半径 200 内每段轨迹，炸 60px 内的怪，每段 `30 + trailDmg × 4` 伤害；每引爆一段 +2 分。
- **E10**：`floor(60 × (2 + S) / 3)`。第 5 层 ≈ 228、10 层 ≈ 348、30 层 ≈ 4560、50 层 ≈ 10173。
- **E12**：冷却 30 帧。`chainDmg = floor(20 + atkUp × 0.6 + f × 2)`；主目标吃满，随后 180px 内最多 **4 只**依次吃 `chainDmg × (1 - i × 0.25)`（100% / 75% / 50% / 25%）。
- **E13**：对范围内每只非 BOSS 怪 `frozen += d × n`（18 / 54 帧），**上限 `180 × n` 帧**。
- **E14**：对范围内每只怪 `m.slowTimer = max(m.slowTimer, d × n)`（30 / 60 帧）。

### E13 / E14 的作用范围

```
作用对象 = 命中目标 + 它周围 225px 内的怪（EFFECT_AOE_RADIUS，02-combat.js）
没有目标的触发器（T10 残血 / T12 闭环 / T14 唤魔者）
  → 就近兜底：取离玩家最近的那只怪当靶心
  场上无怪 → 空数组，效果空放
```

触发器把「被命中的那只怪」透传给 `triggerPassive(tid, target)`——T03 / T06 / T07 / T08 是带目标的。

### 层数语义

同一组「触发板 + 效果板」可叠 n 层（`G.passives[tid]` 里每条的 `count`）。

```js
const PASSIVE_REPEAT_EFFECTS = new Set(['E02', 'E06', 'E10', 'E11', 'E12']);  // 触发次数 ×n
// 其余全部：一次结算，数值 / 时长 ×n
```

| 类别 | 效果板 | 语义 |
|:--|:--|:--|
| 触发次数 × n | E02 · E06 · E10 · E11 · E12 | 真跑 n 遍 |
| 数值 / 时长 × n | E01 · E03 · E07 · E13 · E14 · E15 · E16 · E17 | 跑 1 遍，乘 `layerCount` |

- `applyPassiveEffect(triggerId, effectId, isInitial, target, layerCount)` 第五参数默认 1；`addPassive()` 传 1 —— **组合那一刻只生效一层**。
- **E13 / E14 且 `layerCount > 1` 时给命中的怪打标记 `m._layerCCTick`**：每秒额外吃 **100% 玩家攻击力**（`G.frame % 60 === 0` 结算一次）。脱控（`!frozen && !slowTimer`）即清标记。
- **T03 的 ×1.2 与 `removePassive()` 的回退必须同步**（`T03_EFFECT_MUL`）。

### 🧹 消除

按 **R**（手机端 🧹 圆钮）。

```
tryEliminate():
  G.gameOver / G.paused / G.selectingActive → return
  G.eliminateCooldown > 0 → 提示「🧹 消除冷却中 · 还要 N.Ns」，不生效
  否则：G.eliminateCooldown = ELIMINATE_COOLDOWN(1800 帧)，执行 activateEliminate()

activateEliminate():
  dmg = floor(60 × (2 + S) / 3) × 3        // 3 倍反噬
  全场怪物各吃 dmg
  拆掉 G.turrets[0]（最早生成的那座），删除其 loopKey
```

- `G.eliminateCooldown` 每帧递减，`resetGame()` 归零
- 场上无塔时照样造成伤害，只是不拆塔
- 战斗界面右下角有 🧹 就绪 / 倒计时指示

### 被动槽位

```
maxSlots 默认 4；f = 20 → 5，f = 40 → 6，f = 60 → 7；职业·奥术学者 +1
```

计数方式：`Σ G.passives[tid].length`（每个「触发 + 效果」组合算 1 槽，不按层数算）。同一组合重复宣读 → `count++` 升级，**不占新槽位**。

### 槽满自动宣读

槽位**满了**之后，手牌里「触发板 × 已在被动系统内的效果板」**每帧自动升级一组**（多组命中随机选），一次只吃一组。槽位没满时**不生效**。`T14` 不在 `G.passives` 里，永远不被自动宣读。

`04-trail.js` `findAutoUpgrade()` / `tryAutoUpgrade()`，由 `05-update.js` 的 `update()` 每帧调用一次。

### 手牌 / 卡牌来源

| 来源 | 数量 |
|:--|:--|
| 开局补给 | 随机 **6** 张（正式开局选完职业时发，教程局不发） |
| 每 5 层清空奖励 | `round((2 + floor(f / 10)) × mul)` 张，**平衡掉落** |
| 击杀奖励 | 每累计 **20** 杀掷一次 **30%** → 1 张 |
| BOSS 磨血 | 每磨掉 **25%** 血量掷一次 → 50%/20%/20%/10% 得 **1/2/3/4** 张 |
| BOSS 击杀 | 2–3 张 |
| 商人购买 | 1 张 |
| 🏕️ 休整节点 | 2 张（50% 触发 / 50% 效果） |

```
START_CARDS       = 6
KILL_CARD_EVERY   = 20
KILL_CARD_CHANCE  = 0.30
BOSS_CARD_STEP    = 0.25
rollBossCardCount(): r < 0.50 → 1 ; < 0.70 → 2 ; < 0.90 → 3 ; else → 4

mul = f < 30 ? 1.1 : 0.9       // 清层卡数的层数修正，拐点沿用 DIFF_KNEE
```

- 「平衡掉落」：手牌里触发少就发触发，效果少就发效果，相等则各 50%。
- BOSS 一只从生到死只结算 **3 次**（25% / 50% / 75%），**100% 那道坎不算**。一帧跨两道坎会补发两次。
- 多张一起发时逐张调 `dropBalancedCard()`，由 `grantCards(n, reason)` 统一结算（手牌上限 20，满了替换最老一张）。

| 层数 | 基础 | ×mul | 实际 |
|--:|--:|:--|--:|
| 5 | 2 | ×1.1 | 2 |
| 10 | 3 | ×1.1 | 3 |
| 29 | 4 | ×1.1 | 4 |
| 30 | 5 | ×0.9 | 5 |
| 100 | 12 | ×0.9 | 11 |

---

## 12. 成长与配置

### 轮椅组合（6 组）

`00-data.js`。命中即额外给数值加成 + 改变轨迹外观。

| id | 组合 | 名称 | 加成 | 轨迹 |
|:--|:--|:--|:--|:--|
| `trailRevenge` | T06+E10 | 轨迹反噬 🐾🔥 | `trailDmg += 4` | fire |
| `chainStorm` | T07+E12 | 连锁风暴 ⚡🎯 | `fireRate = max(12, fireRate - 8)` | lightning |
| `iceTrail` | T06+E13 | 冰轨永冻 ❄️🐾 | `trailWidth += 4`，`slowAll = min(0.7, +0.15)` | ice |
| `trailExplosion` | T08+E07 | 爆轨清场 💣🔥 | `trailDmg += 5` | fire |
| `vampLord` | T08+E03 | 吸血领主 🩸💚 | `fateBuffs.vampHeal += 16` | basic |
| `bulletHell` | T07+E02 | 弹幕地狱 🎯💥 | `buffs.multUp += 0.5` | lightning |

### 职业

`00-data.js`

| id | 名称 | 效果 |
|:--|:--|:--|
| `trailWeaver` | 轨迹编织者 🐾 | `trailDmg +3`、`trailWidth +4`、`trailLifeBonus +180`、移速 **×0.9** |
| `bulletStorm` | 弹幕风暴 🎯 | `fireRate ×0.6`（下限 3）、`atkUp +5`、`extraBullets +1`、移速 **×1.15** |
| `guardian` | 堡垒守卫 🛡️ | `player.maxHp +80`、`core.maxHp +40`、`atkUp +8`、移速 **×0.75**、`fireRate ×1.25` |
| `arcaneScholar` | 奥术学者 🔮 | `maxSlots +1`、`ultimateChargeMult ×1.5`、`essenceBonus = 0.5` |

### 遗物（12 种 + 1 件隐藏藏品）

稀有度权重：epic **15** / rare **35** / common **50**（`07-ui.js`）。

| 名称 | 稀有度 | 效果 |
|:--|:--|:--|
| 📡 密文增幅器 | rare | 被动触发时额外触发一次 |
| ⏳ 时间膨胀器 | epic | `slowAll +0.2`（上限 0.7），`trailLifeBonus +120` |
| 🧲 精华磁铁 | common | 每击杀 +2 精华 |
| 💎 玻璃大炮 | rare | `atkMul ×1.5`，护盾 **×0.6** |
| 🪶 凤凰羽毛 | epic | 核心被毁时复活一次，恢复 50% |
| 🗡️ 暗影之刃 | rare | 子弹 20% 概率双倍 |
| 💚 治愈护符 | common | 每层开始回 20% 护盾 |
| 🌿 荆棘光环 | common | 攻击核心的怪受 5 点反伤 |
| 🏆 贪婪圣杯 | epic | 怪物数 ×1.3，`dropRateMul ×3`（遗物掉落率与 BOSS 卡牌数） |
| 👢 疾风之靴 | common | `speedMul ×1.25` |
| 🔰 核心护盾发生器 | rare | 核心 `maxHp +20` |
| 🗿 狂战图腾 | rare | 护盾 < 30% 时攻击翻倍 |
| 🗝️ 唤魔之钥 | epic | **`hidden: true`**——只掉自唤魔者 BOSS，不进随机池；总分 lg +1（`G.score × 10`）+ 每个已激活被动层数 +1；**不走** `dropRelic()` |

### 命运抉择（8 选 2）

`00-data.js`。每 10 层一次。

| id | 名称 | 效果 |
|:--|:--|:--|
| `trailMaster` | 轨迹大师 🐾 | `trailDmgMul ×2` |
| `bulletStorm` | 弹幕风暴 🎯 | `bulletDmgMul ×2` |
| `speedDemon` | 疾风步 💨 | `speedMul ×1.5`，护盾 **×0.7** |
| `ironWall` | 铁壁 🛡️ | 护盾 **×1.6**（hp 也 ×1.6），`speedMul ×0.8` |
| `doubleDrop` | 丰收 🍀 | `dropRateMul ×2`，`monsterCountMul ×1.25` |
| `vampiricAura` | 吸血光环 🩸 | `vampHeal += 8` |
| `berserker` | 狂战士 😡 | `atkMul ×1.5`，`damageTakenMul ×1.4` |
| `ultraCharge` | 超载 ⚡ | `ultimateChargeMult ×2` |

### 每层奖励 `STAT_CHOICES`

`00-data.js`。三选一，每 5 层一次；商店也卖同一套（`shopCost` 为单价）。

| id | 名称 | 效果 | 上限 | shopCost |
|:--|:--|:--|:--|--:|
| `atkUp` | 攻击强化 ⚔️ | `atkUp +3` | **无上限** | 12 |
| `heal` | 生命复苏 💚 | 回 30% 最大护盾 | — | 10 |
| `speedUp` | 疾步 💨 | `speedUp +0.05` | `playerCap(6)` | 12 |
| `trailUp` | 轨迹淬炼 🐾 | `trailDmg +1` | `playerCap(400)` | 14 |
| `trailWidth` | 轨迹拓宽 📏 | `trailWidth +1`（**只增不减**） | `getTrailWidthCap()` | 14 |
| `turretHp` | 图腾加固 🗼 | `turretHpBonus +1`（**含场上已有的塔**） | — | 14 |

**稀有项**（不在 `STAT_CHOICES` 内，独立掷骰）：

```
图腾扩容 🗼  概率 = 1% × (1 + f / 10)      // 10 层 2%、30 层 4%、60 层 7%
整体掷一次 → 随机替换 3 个选项中的 1 个；maxTurrets += 1
```

---

## 13. 精华与经济

### 精华来源

```
击杀 = 1 + floor(f / 10)  + 精英 +3  + 精华磁铁 +2，然后 ×(1 + essenceBonus)
BOSS = 10 + f
```

### 每层硬上限

```
ESSENCE_CAP      = 8     // f < 30
ESSENCE_CAP_LATE = 16    // f >= DIFF_KNEE(30)
```

`addCombatEssence(n)` 返回**实际到手**数（触顶时被截断），飘字用返回值。`G.essenceThisFloor` 每层开始归零。**教程赠送与商店买卖不计入上限。**

### 商人

`00-data.js`、`07-ui.js`

| 商品 | 价格 | 数量 |
|:--|:--|:--|
| 触发板 | 8 | 1 张（加权抽取） |
| 效果板 | 10 | 1 张 |
| 增益（`STAT_CHOICES`） | 见上表 | 2 个不重复 |
| 遗物 | 35 + rand(0,19) → 35–54 | 1 个保底（只出 rare/epic） |
| 遗物（第二个） | 40 + rand(0,19) → 40–59 | 40% 概率 |
| 治疗药剂 | 12 | 回 40% 护盾 |

```
刷新费 = 2 × f × shopRefreshCount      // shopRefreshCount 从 1 起，每次刷新 +1
```

商人节点出现条件：`f % 4 === 0 || f % 4 === 3`。

---

## 14. 地形 / 危险区 / 关卡结构

### 地形障碍

`00-data.js`，**每 3 层重建一次**（`04-trail.js`）。

```
count  = 3 + floor(f / 8)
半径    = rand(20, 50)
位置    = rand(40, w-40), rand(40, h-40)      // w=780, h=560
安全区  = 核心周围 r < 80 + tr + 20 的位置被重掷（最多 20 次尝试）
寿命    = f × 60 + 600 帧
alpha  = 0.4（渲染时再 × min(1, life / 300)，最后 5 秒淡出）
```

第 3 层：3 个障碍，寿命 780 帧。第 24 层：6 个，寿命 2040 帧。

**玩家碰撞**：向外投影到圆面上，余量 `p.r + t.r + 2`。

**怪物绕行** `steerAroundTerrain()`：

1. 把陷进障碍的实体沿法线顶出来（`pushOutOfTerrain`，余量 `m.r + 2`）
2. 找「下一步陷得最深」的那个障碍
3. 取该圆的切线，两条里挑与「怪 → 目标」夹角更小的那条
4. 切线方向 + 朝目标方向 ×0.45，归一化后乘回原速度
5. 移动之后再兜一次底

### 危险区（f ≥ 40）

`05-update.js`

```
每 900 帧（15 秒）生成一个，场上最多 5 个
r = 55，life = 600 帧（10 秒）
位置 = rand(80, 700), rand(80, 480)
玩家：1.2 / 帧      怪物：4 / 帧
```

### 关卡结构

| 项 | 规则 |
|:--|:--|
| 每层开始 | `addScore(f × 5)` |
| 每 5 层清空 | `n = 2 + floor(f/10)` 张牌 + 属性三选一 |
| 每 5 层递进 | `addScore(f × 15)` |
| 每 10 层 | 命运抉择（二选一）→ 原地重新开战（**楼层不递增**） |
| BOSS | `f % 10 === 0` 或节点类型为 bossStage |
| 节点地图 | 每次属性选完打开，3 选 1 |

节点筛选：BOSS 节点仅在 `f % 10 === 9` 出现；商人节点仅在 `f % 4 === 0 或 3` 出现。

---

## 15. 教程

`03-tutorial.js`

| 常量 | 值 | 含义 |
|:--|:--|:--|
| `TUTORIAL_TIMEOUT` | 25 × 60 = 1500 帧 | 超时后给更直白的提示（`fallback`） |
| `TUTORIAL_FORCE` | 20 × 60 = 1200 帧 | 再超时自动放行，绝不卡流程 |
| `Tutorial.pendingRestart` | 布尔 | `finish()` / `skip()` 置真，`update()` 里统一执行重置 |
| `SEAL_FRAMES` | 240 帧 | 「封印」词条的压制时长 |

### 五块石板

| 层 | 标题（石板） | `hpMul` | 出怪间隔 | 出怪 | 脚本掉落 |
|:--|:--|--:|--:|:--|:--|
| 1 | 移动方式 | 0.6 | 90 | basic ×4 | — |
| 2 | 图腾生成 | — | 60 | basic ×4 | 2 杀→T07，4 杀→E01 |
| 3 | 密文版 | — | 70 | basic ×3 | 3 杀→T07，6 杀→E12 |
| 4 | 敌人 | — | 70 | basic ×4 + 脚本召唤 fast ×2 / healer ×2 / tank ×2 / scorcher ×2 / wraith ×1 / 精英 basic ×1 | 杀精英→T10、E03 |
| 5 | 核心 | — | 60 | basic ×4 + fast ×2 | 2 杀→**T08**，4 杀→E07 |

第 3 层预设手牌 `[T06, E10]`；第 5 层 `ultFull = true`。第 5 层结束 → 节点地图 → `TUTORIAL_OUTRO` 收尾（4 步）→ 清空重开。

### 字幕节奏

两条提示的间隔 = **上一条 `hold` + 下一条 `d`**：

```
3 秒 = 180 帧，±1 秒 = ±60 帧   →   hold + d ∈ [120, 240]
长句取上限（hold 180 + d 40 = 220），短句取下限（hold 150 + d 0 = 150）
```

29 条可预估间隔的均值为 197.2 帧（3.29 秒），没有一条 `hold > 180`。

---

## 16. 调参联动检查清单

改这些数值时**必须**同时改另一处，否则改动不生效或行为不一致：

| 改什么 | 必须连带改 |
|:--|:--|
| `G.fireRate`（射速） | `p.shootCooldown`（`04-trail.js` `autoShoot()`）——两道独立闸门，只改一处不动 |
| `PLAYER_FIRE_RATE_MUL`（1.2） | `p.shootCooldown` 的**整条**表达式（含 `Math.max(24, …)` 地板）都要除以它，只除一半会出现地板倒挂 |
| `G.buffs.fireRateMul` | **两道闸门**：`p.shootCooldown`（`04-trail.js`）**和** `G.fireCounter >= G.fireRate / G.buffs.fireRateMul`（`05-update.js`）。只在 `resetGame()` 里复位 |
| `DIFF_C1` / `DIFF_C2` / `DIFF_C3` | 整条难度曲线就是这三个系数（`diffScaleAt(f)`），**牵一发动全身**：怪 HP/攻击、BOSS HP/攻击、八个消费方、`getBossHp()` 的 `tail` 全都跟着动 |
| `DIFF_KNEE` | **不是难度拐点**。它只是「前期 / 后期」分界：`getEssenceCap()`、清层卡数修正、`EARLY_NORMAL_MUL` 生效范围、`getBossHp()` 的尾巴钳位四处共用 |
| `diffScaleAt()` 的 `x = f − 1` | 这个偏移是「第 1 层 ×1.00」的来源。改成 `x = f` 会让第 1 层从 ×1.34 起步，整条前期的底数全变 |
| `HP_OVERFLOW_GUARD` / `ATK_OVERFLOW_GUARD` | 只防溢出。当前曲线到 211 层也只用掉千分之一，任何一条能打到它们的曲线都说明曲线本身失控了 |
| `PLAYER_CAP_RATE` | 所有 `playerCap()` 的调用点同时生效，包括 `getTrailWidthCap()` |
| 怪物基础血量 | 图腾血量（`04-trail.js`）与「图腾加固」的 +1（`00-data.js`）——塔血 ≈ 能挨几下，靠的是 `max(1, atk×0.05)` 的下限 1 |
| 怪物移速手感 | 调 `05-update.js` 里的 `× 1.33`，**不要**调 `baseSpeed`（生成时另有一次计算） |
| `trailWidth` / 轨迹宽度类数值 | 踩踏判定与围剿采样（`05-update.js`）两处都读同一个 `getTrailWidth()` |
| `EFFECT_AOE_RADIUS` | E13/E14 范围半径，改它会同时改冰冻和延缓两块的覆盖面 |
| `T03_EFFECT_MUL`（1.2） | `applyPassiveEffect()` 里每个写数值/时长的 case **和** `removePassive()` 的四处回退**必须同步** |
| `PASSIVE_REPEAT_EFFECTS` | 层数语义的分水岭。往里加 id 要确认它的 case **没有**再乘 `layerCount`；`E13` 的封顶是 `180 × n` |
| `PLAYER_CAP_RATE` 之外，`getTrailWidthCap()` | 轨宽上限与 E06 共用——只改一处会让两条路径互相砍 |
| 图腾类型表的 `d` 列 / 大环倍率 | `TURRET_RATIO_NORM = 50 × 1.5` 是归一化分母，必须跟着改，否则 1.00 倍那条基准就不成立了 |
| 图腾分档血量 | 教程第 4 层字幕、机制图鉴、`BeyondAlgebra/README.md` |
| 图腾上限 | HUD 计数（`06-render.js`）、图鉴（`03-tutorial.js`）、`01-state.js`、`08-main.js`、`TURRET_SLOT_CHOICE` 的兜底 `(G.maxTurrets \|\| 10)` |
| `BOSS_HP_MUL`（0.9） | 改它只动血量，`天罚 / 终结技` 的手感要靠实测补 |
| `bossEarlyMul()` / `BOSS_EARLY_MUL_START` | 与 `BOSS_HP_MUL` **叠乘**；同时作用于 `getBossHp()` 与 `spawnBoss()` 的 `atk`，改一处不要漏另一处。BOSS 攻击**不吃** `EARLY_NORMAL_MUL` |
| `EARLY_NORMAL_MUL`（0.7） | 与 `MONSTER_STAT_MUL`（0.8）叠乘 = 0.56，且只在 `f < DIFF_KNEE` 且**非精英**时生效——三个条件写在 `spawnMonster()` 同一行 |
| 火焰烧塔速率 | `FIRE_TURRET_DMG_PER_FRAME`——与塔血量是一对，塔血变厚时要一起看 |
| `FIRE_ZONE_TICK` / `FIRE_ZONE_DMG_PER_TICK` | 与玩家护盾上限（100）、火圈半径是一组——按「穿过半秒 vs 站满 6 秒」两档实测算账 |
| `AFFIX_ZONE_R_MUL` / `AFFIX_ZONE_MAX_PER_KIND` | `AFFIXES` 里三条 zone 的 `r` 是**基数**；改基数要连带看 `spawnRange`（落点下界用 `r × 1.2`） |
| `ELITE_BOSS_AFFIX_WEIGHT`（0.5） | 只作用于 `pickAffixes()` 的 `isElite` 分支；BOSS / 调试走的是另一条有偏洗牌，**故意不动** |
| 词缀分组（`bossOnly`） | 本表 §7 两张表 + 图鉴 `CODEX_PAGES`（`07-ui.js`）+ 教程第 5 层字幕（`03-tutorial.js`）——三处文案一起改 |
| `ENEMY_SHOOTER_RANGE`（119） | 由 `TURRET_MID_RANGE (140) × ENEMY_SHOOTER_RANGE_MUL (0.85)` 算出；改中环基础炮台的 `rg` 要连带看这三个常量 |
| `ENEMY_SHOOTER_INTERVAL`（40） | 设计口径是「等于主人公初始射速」= `G.fireRate` 的初值，改 `G.fireRate` 初值就与它脱钩 |
| 射击怪的关卡权重 | `STAGE_TYPES` 里 **7 张表都要显式写 `shooter` 键**（bossStage 写 0） |
| `rareChance()` / `RARE_CARD_*` | 落点在 `randomTrigger()` / `randomEffect()` 内部；`renderLibrary()` 的过滤也要跟着改 |
| 唤魔者相关的三个数 | `EVOKER_SUM_MUL`（1.13）、`affixCount: 3`、`gainEvokerKey()` 的两条效果——任一处改动都要同步 `spawnBoss(opts)` 的默认值 |
| `hidden` 遗物 | `dropRelic()` 必须过滤 `!r.hidden`（现在只有 `evokerKey` 一件） |
| `START_CARDS` / `KILL_CARD_EVERY` / `KILL_CARD_CHANCE` | `registerKill()`（`02-combat.js`）是唯一的击杀入口，教程局的豁免也写在那儿 |
| `BOSS_CARD_STEP` / `rollBossCardCount()` | `tickBossCardMilestones()` 与它的调用位置——必须在怪物循环**之后** |
| 清层卡数修正 | `CARD_EARLY_MUL` / `CARD_LATE_MUL` 与拐点——拐点跟 `DIFF_KNEE` 共用 |
| `ENEMY_TOTEM_RANGE`（120） | 图腾索敌半径（`05-update.js`） |
| `ELIMINATE_COOLDOWN`（1800） | HUD 倒计时（`06-render.js`）、手机端 🧹 圆钮、桌面端 `<kbd>R</kbd>` 提示（`body.html`） |
| `pointer-events`（canvas / `.canvas-wrap`） | **只能经 `setCanvasPointer()`**（`03-tutorial.js`）改。绕过它直接写 `style.pointerEvents` 会重演「手机端选完路摇杆失灵」 |
| 教程某一步的 `hold` / `d` | 节奏 = **上一条 `hold` + 下一条 `d`**，必须落在 [120, 240] 帧；改完要重新配对 |
| 教程石板顺序 / 主题 | 层号写死在 `TUTORIAL_FLOORS` 的 key 上，且**第 5 层不能提前结束** |
| 任何 9.x 数值 | 改 `src/9x/`，然后 `npm run build:game`——根目录 HTML 是产物 |

---

*本表随源码变动，改动数值时请顺手更新对应行。*
