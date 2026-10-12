// ============================================================
//  00-core —— 全局状态与基础工具（4.0 新增）
// ============================================================
// 4.0 给每个模块加了真正的边界（IIFE + 命名空间，见 web/scope-check.mjs）。
// 边界带来一个直接后果：**模块只能用它前面加载的模块**。而 G 和几个纯数学
// 辅助是「谁都要用」的——原来它们躺在 01-state.js 里，就意味着 00-data 用
// G 属于前向引用（G 那时还没定义），改成 `State.G.floor` 要动 00-data 里近百处。
//
// 所以把这一层单独提到最前面，命名空间 `Core`：
//   · 全局状态 G（原 01-state.js:2-99）
//   · detectSimMode()（原 01-state.js:102-119）
//   · 纯数学辅助与特效上限（原 01-state.js:157-166）
//   · 浮字 / 通知（原 01-state.js:169-178、277-283）
//   · 难度曲线（原 01-state.js:180-226）
//
// 这样往后每个模块对 G 的引用都是**向后**引用，前言里一行
// `const { G } = Core;` 就能拿到，调用点一处不改。
// 注意：`G` 是 const 且**从不重新赋值**（resetGame() 只改它的字段）——
// 各模块解构到的是同一个对象，所以重开一局照常生效。见 EDITION.md v4.0 段。
const Core = (function () {

    // ---------- 游戏状态 ----------
    const G = {
        // v9.22: player.mult 删除——只被 resetGame() 写入，从没有任何读取点
        // （对局记录里的「倍」是 snapshotStats() 用 1 + G.buffs.multUp 现算的）。
        player: { x: 390, y: 280, r: 14, hp: 100, maxHp: 100, speed: 2.8, atk: 10, shootCooldown: 0 },
        core: { x: 390, y: 280, r: 22, hp: 100, maxHp: 100 },
        bullets: [], monsters: [], trails: [], particles: [],
        hand: [], triggerSlot: null, effectSlot: null,
        floor: 1, stage: 1, monstersToSpawn: 0, spawnTimer: 0,
        combineCooldown: false,
        passives: {},
        // v9.28: fireRateMul 是稀有效果板 E17「急速装填」的累加器（初值 1 = 不变）。
        // ⚠️ 它和 G.fireRate 是**两道独立的闸门**，见 05-update.js 的开火闸与
        //    04-trail.js 的 shootCooldown——两边都要除它，只改一处等于没改。
        buffs: { atkUp: 0, multUp: 0, trailDmg: 1, trailWidth: 6, speedUp: 1, slowAll: 0, fireRateMul: 1 },
        keys: { w: false, a: false, s: false, d: false, shift: false }, mouse: { x: 390, y: 280 },
        // v9.19: fireRate 是「几帧打一发」。10 → 40（射速变成原来的 1/4），
        // 与 autoShoot() 里的 p.shootCooldown 是两道独立闸门，两处都得改才生效。
        frame: 0, gameOver: false, fireRate: 40, fireCounter: 0, target: null,
        killCount: 0, killStreak: 0, score: 0, maxCombo: 0, lastKillFrame: 0, difficulty: 1,
        handTriggerCount: 0, handEffectCount: 0,
        selectingActive: false, selectionCards: [],
        bossPending: false, bossSpawned: false, floatingTexts: [], debug: false,
        fireTrails: [], damageFlows: [],   // v9.19: 火焰伤害「玩家→核心」的转移动画
        enemyShots: [],                    // v9.28: 射击小怪的弹道拖尾（纯渲染，命中是即时的）
        // v9.22: 终结技不再靠「造成伤害」充能，改为固定时间回复。
        // 回满一槽需要 ULT_BASE_FRAMES / (1 + 层数/50) 帧，见 05-update.js 的 getUltimateChargeFrames()。
        // ultimateChargeMult 保留下来当「充能速度」乘数（命运·超载 ×2 / 奥术学者 ×1.5 / 第 40 层 ×1.5），
        // 乘的是速率而不是总量——这样那三处奖励的文案仍然成立。
        ultimateGauge: 0, ultimateMax: 100, ultimateChargeMult: 1.0,
        ultimateActive: false, ultimateTimer: 0, screenFlash: 0, notifications: [], chainCooldown: 0,
        paused: false, maxSlots: 4, hazardZones: [], hazardTimer: 0,
        fateBuffs: { trailDmgMul: 1, bulletDmgMul: 1, speedMul: 1, dropRateMul: 1, monsterCountMul: 1, vampHeal: 0, atkMul: 1, damageTakenMul: 1 },
        fateChoosing: false, fateOptions: [],
        playerClass: null, essence: 0, relics: [], relicBuffs: {},
        terrain: [], trailLifeBonus: 0, extraBullets: 0, essenceBonus: 0,
        merchantStock: [], shopSoldOut: [], mapChoices: [],
        // v9.6 新字段
        stageType: 'mixed', batchQueue: [], activeTrailType: 'basic', chairBonuses: 0,
        // v9.7 新字段
        pathHistory: [],          // [{dir:'left'|'center'|'right', nodeId, floor}]
        sprintActive: false,      // 冲刺轨迹开关
        sprintTrails: [],         // 冲刺轨迹（更宽更亮）
        enclosureBonus: 0,
        turrets: [],              // v9.17: 图腾改血量制
        maxTurrets: 10,           // v9.21: 图腾数量上限（v9.23: 15 → 10）。满了之后闭环不再出塔（环保持已武装），
                                  // 等有位置了自动补上；每层奖励有极小概率 +1（见 TURRET_SLOT_CHOICE）
        turretCapHintFrame: -999, // v9.21: 上次提示「图腾已满」的帧号，用来节流
        turretLoops: {},          // v9.17: 已出过塔的环 key——塔碎后删除，环重新武装
        turretHpBonus: 0,         // v9.17: 图腾血量加成（商店/每层奖励购买）
        // v9.18 经济（essence 本身在上面的 playerClass 行里）
        essenceThisFloor: 0,      // 本层战斗已掉落的精华，用来卡 getEssenceCap()
        shopRefreshCount: 1,      // 本次进店已刷新次数——刷新费 = 2 × 层 × 次数
        mapMode: false,           // 地图模式（canvas绘制地图）
        canvasWidth: 780, canvasHeight: 560,
        // v9.10: 对局记录
        gameLog: [],              // [{floor, type, data, timestamp}]
        floorKills: 0,            // 当前楼层击杀数
        floorCardsObtained: 0,    // 当前楼层获得密文板数
        // v9.10: 自动模拟模式
        simMode: false,           // 模拟模式开关
        simTargetFloor: 0,        // 0=无限直到死亡, >0=到此层后主动结束
        simSpeed: 3,              // 每tick跑几个update()
        simSkipDraw: true,        // 跳过渲染
        simSkipEffects: true,     // 跳过粒子/浮动文字

        // ---------- v9.24 ----------
        // 词条钩子用到的运行时状态。全部在 resetGame() 里一并重置。
        // 敌图腾**不复用 G.turrets**——混进玩家数组会连带污染图腾上限、
        // turretLoops 判环、以及 v9.23 的「火焰烧塔」。另开一条独立数组。
        enemyTotems: [],
        // 被「封印」词条暂时压住的被动：{ tid, eid, timer }。timer 归零即解封，
        // 被动本身不删除，只是 triggerPassive() 会跳过它。
        sealedPassives: [],
        // 移动端：摇杆模拟量，模长 0..1。非 0 时优先于 G.keys 的四向输入。
        stick: { x: 0, y: 0 },
        // v9.25: 动态摇杆的底座位置（**屏幕坐标**，clientX/clientY 口径）。
        // null = 没按下，此时画的是左下角的闲置提示环。按下那一刻由
        // 09-events.js 的 setStickFromTouch() 定下来，move 时不再挪动。
        stickBase: null,
        stickActive: false,
        mobileMode: false,        // 设备识别结果，见 09-events.js 的 detectMobileMode()
        drawerOpen: false,        // 手机端左侧抽屉（密文版/被动）是否展开
        timeScale: 1,             // 抽屉展开时压到 0.5（子弹时间），见 08-main.js 的 gameLoop()

        // ---------- v9.25 ----------
        // 词条落地后的圈层（削减区/减速区/火焰区）。与怪解绑——怪死了圈还在，
        // 圈到点自己消失。{ x, y, r, kind, life, maxLife, color, tick }
        affixZones: [],
        // BOSS 登场横幅：{ text, life, maxLife }。画在 canvas 顶部，
        // 因为 setFeedback() 写的是右侧面板里的 DOM——手机端那个在抽屉里，
        // 战斗时根本看不见。
        bossBanner: null,
        // 「消除」技能冷却（帧）。按 R 触发后置为 ELIMINATE_COOLDOWN，逐帧递减。
        eliminateCooldown: 0,
        // 手机端「死亡后重开」按钮的当前显示状态。只在值真的翻转时才动 DOM，
        // 见 08-main.js 的 gameLoop()。
        _gameOverUIShown: false,
    };

    // ---------- v9.10 自动模拟检测 ----------
    (function detectSimMode() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.has('auto')) {
                G.simMode = true;
                G.simTargetFloor = parseInt(params.get('auto')) || 0;
                G.simSpeed = parseInt(params.get('speed')) || 3;
                G.simSkipDraw = params.get('draw') !== '1';
                G.simSkipEffects = true;
            }
            // 同时检查全局注入（Node.js runner用）
            if (typeof window !== 'undefined' && window.__SIM_MODE__) {
                G.simMode = true;
                G.simTargetFloor = window.__SIM_TARGET__ || 0;
                G.simSpeed = window.__SIM_SPEED__ || 3;
            }
        } catch(e) { /* 非浏览器环境 */ }
    })();

    // ---------- 辅助 ----------
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

    // 特效数量上限：粒子/浮字是纯表现层，必须封顶。
    // 生成速率随层数上升而寿命固定，不封顶的话每帧 draw 成本会一路涨到掉帧。
    const PARTICLE_MAX = 300;
    const FLOAT_MAX = 60;

    // ---------- 浮动数值 ----------
    function showFloatingText(x, y, text, color) {
        if (G.floatingTexts.length >= FLOAT_MAX) G.floatingTexts.shift();
        G.floatingTexts.push({
            x, y, text, color,
            life: 35,
            maxLife: 35,
            vy: -1.2 - Math.random() * 0.6,
            vx: (Math.random() - 0.5) * 0.8,
        });
    }

    // ============================================================
    //  难度曲线
    // ============================================================
    // v9.32: 换回多项式，但这次是**一条三次曲线管到底**——没有拐点、没有分段、
    // 也没有第二条标尺。x = 层数 − 1，所以第 1 层正好 ×1.00。
    //
    //   难度(x) = 1 + 0.3365x + 0.0566x² + 0.0063x³
    //
    // 取值：10 层 ×13.2 / 30 层 ×212 / 50 层 ×895 / 100 层 ×6.70e3 / 211 层 ×6.09e4。
    // 比原来那条 1.56^(层-1) 平缓得多（211 层 6.1e4 而不是 3.6e40），所以
    // HP_OVERFLOW_GUARD(1e15) / ATK_OVERFLOW_GUARD(1e9) 彻底变成纯兜底，
    // 到 211 层也只用掉它们的千分之一。
    //
    // ⚠️ 难度显示与怪物数值现在是**同一个数**。以前那套「难度标尺 + 怪物软上限标尺」
    //    的分家（MONSTER_SOFT_KNEE / MONSTER_SOFT_RATE）已经不需要了——曲线本身
    //    就不爆炸，没必要再收一次口。对局记录里的 diff 与 ms 两列从此相等。
    const DIFF_C1 = 0.3365;
    const DIFF_C2 = 0.0566;
    const DIFF_C3 = 0.0063;
    // 把层数参数化：G.floor 是「当前」层，读历史某一层要用这个（对局记录回放）。
    function diffScaleAt(f) {
        const x = f - 1;
        return 1 + DIFF_C1 * x + DIFF_C2 * x * x + DIFF_C3 * x * x * x;
    }
    // DIFF_KNEE 不是曲线拐点。它只是「前期 / 后期」的分界，精华上限
    // （getEssenceCap）、清层卡数（getFloorClearCards）与 BOSS 血量尾巴还按它分档。
    const DIFF_KNEE = 30;
    function getDifficultyMultiplier() {
        return diffScaleAt(G.floor);
    }

    // 怪物数值标尺。**现在与难度是同一个值**——保留这个函数名，是为了那八个消费方
    // （spawnMonster / spawnDebugMonster / getBossAtk / spawnBossMinion / E10 反噬 /
    // 终结技 / R 消除 / 爆裂词缀）不用改：它们要的是「这一层的强度标尺」，
    // 而不是「哪条曲线」。
    function getMonsterScale() {
        return getDifficultyMultiplier();
    }

    // 难度系数在后期能到六位数。HUD 与结算界面上原来统一 toFixed(2)，
    // 高位时会把版面撑破，所以按量级分档显示。
    function formatDiff(v) {
        if (!isFinite(v)) return '∞';
        if (v < 10000) return v.toFixed(2);
        if (v < 1e6) return Math.round(v).toLocaleString();
        return v.toExponential(2).replace('e+', 'e');
    }

    // ---------- v9.1 通知 ----------
    function showNotification(text, color, duration) {
        G.notifications.push({
            text, color,
            life: duration || 180,
            maxLife: duration || 180,
        });
    }

    return {
        G,
        dist, rand, randInt, clamp, angleTo,
        PARTICLE_MAX, FLOAT_MAX,
        showFloatingText, showNotification,
        diffScaleAt, DIFF_C1, DIFF_C2, DIFF_C3, DIFF_KNEE,
        getDifficultyMultiplier, getMonsterScale, formatDiff,
    };
})();
