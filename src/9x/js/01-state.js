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

    // ---------- v9.10 对局记录系统 ----------
    function snapshotStats() {
        return {
            floor: G.floor,
            hp: Math.round(G.player.hp), maxHp: G.player.maxHp,
            coreHp: Math.round(G.core.hp), coreMaxHp: G.core.maxHp,
            atk: Math.round(G.player.atk + G.buffs.atkUp),
            mult: +(1 + G.buffs.multUp).toFixed(1),
            trailDmg: +getTrailDamage().toFixed(1),
            trailWidth: getTrailWidth(),
            speed: +(G.player.speed * G.buffs.speedUp * G.fateBuffs.speedMul).toFixed(1),
            slowAll: Math.round(G.buffs.slowAll * 100),
            kills: G.killCount,
            score: G.score,
            difficulty: +getDifficultyMultiplier().toFixed(2),
            passives: sumPassiveLayers(),
            relics: G.relics.map(r => r.name),
            handCount: G.hand.length,
            handBreakdown: `触${G.hand.filter(c=>c.type==='trigger').length}/效${G.hand.filter(c=>c.type==='effect').length}`,
        };
    }
    function sumPassiveLayers() {
        let total = 0;
        for (const tid of Object.keys(G.passives))
            for (const p of G.passives[tid]) total += p.count;
        return total;
    }
    function logEvent(type, data) {
        G.gameLog.push({ floor: G.floor, type, data, frame: G.frame });
    }

    // ---------- DOM ----------
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

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
    //  指数增长公式
    // ============================================================
    // v9.15: 难度曲线加拐点。30 层前维持原来的指数曲线（前期手感不变），
    // 之后转多项式——仍然一直变难，但不再涨成天文数字。
    // 旧曲线到 118 层是 ×34,800,440，新曲线 ×687；配合解开怪物血量上限，
    // 「变难」终于体现在战斗里，而不是只体现在右上角的数字上。
    // v9.27: 拐点与多项式尾巴一起撤掉，改成**第 1 层起的单条指数曲线**，
    // 底数同时抬高（1.16 → 1.56，绝对 +0.4）。用户要的是「后期难度指数上升
    // 而非多项式」。代价见 EDITION：三道「撞顶就封顶」的闸门（怪物攻击
    // diff^0.35 的 ×12、普通怪 HP 1e9、BOSS HP 1e8）是照旧曲线调的，新曲线在
    // 第 17 / 40 / 38 层就会撞上，撞上之后怪不再变强——所以那三道闸门在 v9.27
    // 一并抬到只防溢出的位置，否则「指数」只是 HUD 上的数字。
    const DIFF_BASE = 1.56;
    // DIFF_KNEE 不再是难度曲线的拐点。它现在只是「前期 / 后期」的分界，
    // 精华上限（getEssenceCap）与清层卡数（getFloorClearCards）还按它分档。
    const DIFF_KNEE = 30;
    function getDifficultyMultiplier() {
        return Math.pow(DIFF_BASE, G.floor - 1);
    }

    // v9.31: 怪物数值的标尺。**难度标尺本身没变**——getDifficultyMultiplier() 仍然是
    // HUD、图鉴与对局记录里那个「难度」，还是 1.56^(层-1)。这一条只管怪物的 HP / 攻击 /
    // BOSS，以及「跟着难度一起涨的伤害源」（终结技、R 消除、E10 反噬、爆裂词缀）。
    //
    // 为什么伤害源也必须换过来：那些伤害源原来吃的是真难度（211 层 3.6e40），而怪物的
    // 血量被 HP_OVERFLOW_GUARD 钉在 1e15——也就是说后期每一发核弹都是 1e25 倍的过量击杀。
    // 如果只收怪物的血量、不收伤害源，玩家会一刀秒掉全场。
    //
    // 形状：60 层之前与 getDifficultyMultiplier() 逐字节一致（所以前期手感一点没动），
    // 60 层之后从指数改成线性——拐点值 × (1 + (层-60) × 2%)。
    // 211 层的标尺从 3.6e40 收到 1.0e12。
    function getMonsterScale() {
        if (G.floor <= MONSTER_SOFT_KNEE) return Math.pow(DIFF_BASE, G.floor - 1);
        const knee = Math.pow(DIFF_BASE, MONSTER_SOFT_KNEE - 1);
        return knee * (1 + (G.floor - MONSTER_SOFT_KNEE) * MONSTER_SOFT_RATE);
    }

    // v9.27: 难度系数不再是「几百」——第 100 层就是 1.3e19。HUD 与结算界面上
    // 原来统一 toFixed(2)，现在会印出二十几位数字把版面撑破，所以按量级分档显示。
    function formatDiff(v) {
        if (!isFinite(v)) return '∞';
        if (v < 10000) return v.toFixed(2);
        if (v < 1e6) return Math.round(v).toLocaleString();
        return v.toExponential(2).replace('e+', 'e');
    }

    function getMonsterCount() {
        return Math.floor(Math.min(4 + Math.floor(3 * Math.pow(1.10, G.floor)), 50) * G.fateBuffs.monsterCountMul);
    }

    function getEliteChance() {
        const base = Math.min(0.05 + 0.04 * Math.log2(G.floor + 1), 0.35);
        const st = STAGE_TYPES.find(s => s.id === G.stageType);
        return Math.min(base * (st && st.eliteMult ? st.eliteMult : 1), 0.8);
    }

    // ---------- v9.18 每层精华硬上限 ----------
    // 战斗掉落的精华按层封顶，商店买卖不算（那不是战斗收入）。
    // 拐点沿用难度的 DIFF_KNEE=30：30 层前每层最多 8，之后放宽到 16。
    // 目的见 EDITION：后期一局掉几百精华，商店点什么都不心疼，加成失去分量。
    const ESSENCE_CAP = 8;
    const ESSENCE_CAP_LATE = 16;
    function getEssenceCap() {
        return G.floor >= DIFF_KNEE ? ESSENCE_CAP_LATE : ESSENCE_CAP;
    }

    // 返回**实际到手**的数量——调用方要用它来飘字，不能拿请求值去飘。
    function addCombatEssence(n) {
        const room = Math.max(0, getEssenceCap() - (G.essenceThisFloor || 0));
        const got = Math.min(n, room);
        G.essenceThisFloor = (G.essenceThisFloor || 0) + got;
        G.essence += got;
        return got;
    }

    function getSpawnInterval() {
        let base = Math.max(6, 25 / Math.pow(1.06, G.floor - 1));
        if (G.stageType === 'fastRush') base *= 0.4;
        return base;
    }

    // ---------- v9.1 词缀与通知 ----------
    function getAffixCount() {
        if (G.floor < 5) return 0;
        if (G.floor < 15) return Math.random() < 0.30 ? 1 : 0;
        if (G.floor < 25) {
            let count = 1;
            if (Math.random() < 0.30) count = 2;
            return count;
        }
        let count = 2;
        if (Math.random() < 0.20) count = 3;
        return count;
    }

    function showNotification(text, color, duration) {
        G.notifications.push({
            text, color,
            life: duration || 180,
            maxLife: duration || 180,
        });
    }

    // ---------- 手牌平衡 ----------
    function updateHandCount() {
        if (G.simMode) return;
        G.handTriggerCount = G.hand.filter(c => c.type === 'trigger').length;
        G.handEffectCount = G.hand.filter(c => c.type === 'effect').length;
        const el = document.getElementById('handCountDisplay');
        if (el) el.textContent = `触发:${G.handTriggerCount} 效果:${G.handEffectCount}`;
    }

