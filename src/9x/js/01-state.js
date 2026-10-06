    // ---------- 游戏状态 ----------
    const G = {
        player: { x: 390, y: 280, r: 14, hp: 100, maxHp: 100, speed: 2.8, atk: 10, mult: 1.0, shootCooldown: 0 },
        core: { x: 390, y: 280, r: 22, hp: 100, maxHp: 100 },
        bullets: [], monsters: [], trails: [], particles: [],
        hand: [], triggerSlot: null, effectSlot: null,
        floor: 1, stage: 1, monstersToSpawn: 0, spawnTimer: 0,
        combineCooldown: false,
        passives: {},
        buffs: { atkUp: 0, multUp: 0, trailDmg: 1, trailWidth: 6, speedUp: 1, slowAll: 0 },
        keys: { w: false, a: false, s: false, d: false, shift: false }, mouse: { x: 390, y: 280 },
        frame: 0, gameOver: false, fireRate: 10, fireCounter: 0, target: null,
        killCount: 0, killStreak: 0, score: 0, maxCombo: 0, lastKillFrame: 0, difficulty: 1,
        playerSlowTimer: 0, playerSlowAmount: 0, handTriggerCount: 0, handEffectCount: 0,
        vacuumActive: false, vacuumTimer: 0, selectingActive: false, selectionCards: [],
        bossPending: false, bossSpawned: false, floatingTexts: [], debug: false,
        fireTrails: [], ultimateGauge: 0, ultimateMax: 100, ultimateChargeMult: 1.0,
        ultimateActive: false, ultimateTimer: 0, screenFlash: 0, notifications: [], chainCooldown: 0,
        paused: false, maxSlots: 4, hazardZones: [], hazardTimer: 0,
        fateBuffs: { trailDmgMul: 1, bulletDmgMul: 1, speedMul: 1, dropRateMul: 1, monsterCountMul: 1, vampHeal: 0, atkMul: 1, damageTakenMul: 1 },
        lastKillBurst: 0, fateChoosing: false, fateOptions: [],
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
        turrets: [],              // v9.17: 图腾改血量制，无数量上限
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
    const DIFF_KNEE = 30;
    const DIFF_TAIL = 1.6;
    function getDifficultyMultiplier() {
        const f = G.floor;
        return Math.pow(1.16, Math.min(f, DIFF_KNEE) - 1)
             * Math.pow(Math.max(1, f / DIFF_KNEE), DIFF_TAIL);
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

