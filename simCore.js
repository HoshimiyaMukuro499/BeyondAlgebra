#!/usr/bin/env node
/**
 * simCore.js — 《密纹轨迹》纯Node.js模拟引擎
 *
 * 提取核心战斗公式和决策逻辑，不依赖浏览器/DOM/Canvas。
 * 直接 fs.writeFileSync 写结果JSON，完成"自动模拟→分析→调整→重跑"闭环。
 *
 * 用法:
 *   node simCore.js [目标楼层] [速度] [输出文件]
 *   node simCore.js 50 1 sim_results.json
 *   node simCore.js 0 1             # 无限直到死亡
 *   node simCore.js 30 5             # 5倍速到30层
 *
 * 输出: sim_results.json (供 analyzeSim.js 消费) + sim_results.txt (文本报告)
 */

const fs = require('fs');
const path = require('path');

// ============================================================
//  CLI 参数
// ============================================================
const args = process.argv.slice(2);
const TARGET_FLOOR = parseInt(args[0]) || 50;  // 0 = 无限直到死亡
const SPEED = parseInt(args[1]) || 1;           // 每tick帧数
const OUTPUT_FILE = args[2] || path.join(__dirname, 'sim_results.json');
const MAX_FRAMES_PER_FLOOR = 10000;             // 每层最多10000帧(安全阀)

// ============================================================
//  常量数据（从HTML中提取）
// ============================================================

const TRIGGERS = [
    { id: 'T01', label: '对自身', emoji: '🧍' },
    { id: 'T02', label: '对敌群', emoji: '👾' },
    { id: 'T03', label: '对精英生效', emoji: '⭐' },
    { id: 'T06', label: '怪触轨', emoji: '🐾' },
    { id: 'T07', label: '射击命中', emoji: '🎯' },
    { id: 'T08', label: '连环击杀', emoji: '🔥' },
    { id: 'T10', label: '残血触发', emoji: '❤️‍🔥' },
];

const EFFECTS = [
    { id: 'E01', label: '攻击增幅', emoji: '⚔️' },
    { id: 'E02', label: '连环击', emoji: '💥' },
    { id: 'E03', label: '生命回复', emoji: '💚' },
    { id: 'E04', label: '移速减慢', emoji: '🐢' },
    { id: 'E06', label: '轨迹升级', emoji: '⬆️' },
    { id: 'E07', label: '轨迹爆伤', emoji: '💣' },
    { id: 'E10', label: '怪物反噬', emoji: '🔄' },
    { id: 'E11', label: '自速暴涨', emoji: '💨' },
    { id: 'E12', label: '闪电链', emoji: '⚡' },
    { id: 'E13', label: '冰冻', emoji: '❄️' },
];

const MONSTER_TYPES = {
    BASIC:    { id:'basic',    label:'普通', emoji:'👾', baseHp:36,  hpScale:16,    baseSpeed:0.28125, speedScale:0.0125,    baseAtk:5,  atkScale:1.1,  radius:12, eliteRadius:18, scoreValue:5,  eliteScoreValue:15, weight:30, moveInterval:60,  isHealer:false, isSplitter:false, isScorcher:false, isWraith:false },
    FAST:     { id:'fast',     label:'疾速', emoji:'💨', baseHp:22,  hpScale:9.0,   baseSpeed:0.5625,  speedScale:0.021875,  baseAtk:3,  atkScale:0.75, radius:10, eliteRadius:14, scoreValue:6,  eliteScoreValue:18, weight:25, moveInterval:30,  isHealer:false, isSplitter:false, isScorcher:false, isWraith:false },
    TANK:     { id:'tank',     label:'重装', emoji:'🛡️', baseHp:112, hpScale:40,    baseSpeed:0.125,   speedScale:0.0046875, baseAtk:8,  atkScale:1.5,  radius:18, eliteRadius:24, scoreValue:10, eliteScoreValue:25, weight:18, moveInterval:120, isHealer:false, isSplitter:false, isScorcher:false, isWraith:false },
    HEALER:   { id:'healer',   label:'治疗', emoji:'💚', baseHp:45,  hpScale:16,    baseSpeed:0.21875, speedScale:0.009375,  baseAtk:2,  atkScale:0.45, radius:13, eliteRadius:17, scoreValue:8,  eliteScoreValue:20, weight:12, moveInterval:80,  isHealer:true,  healAmount:4.0, isSplitter:false, isScorcher:false, isWraith:false },
    SPLITTER: { id:'splitter', label:'分裂', emoji:'🧬', baseHp:68,  hpScale:25,    baseSpeed:0.25,    speedScale:0.0109375, baseAtk:5,  atkScale:0.9,  radius:14, eliteRadius:18, scoreValue:9,  eliteScoreValue:24, weight:10, moveInterval:70,  isHealer:false, isSplitter:true,  splitCount:4, isScorcher:false, isWraith:false },
    SCORCHER: { id:'scorcher', label:'灼烧', emoji:'🔥', baseHp:33,  hpScale:12,    baseSpeed:0.25,    speedScale:0.011,     baseAtk:5,  atkScale:0.85, radius:12, eliteRadius:16, scoreValue:7,  eliteScoreValue:20, weight:12, moveInterval:55,  isHealer:false, isSplitter:false, isScorcher:true,  fireTrailInterval:8, fireTrailLife:150, isWraith:false, unlocksAtWave:8 },
    WRAITH:   { id:'wraith',   label:'虚灵', emoji:'👻', baseHp:21,  hpScale:7.5,   baseSpeed:0.28,    speedScale:0.015,     baseAtk:3,  atkScale:0.7,  radius:11, eliteRadius:15, scoreValue:8,  eliteScoreValue:22, weight:10, moveInterval:45,  isHealer:false, isSplitter:false, isScorcher:false, isWraith:true,  bulletResist:0.3, unlocksAtWave:12 },
    BOSS:     { id:'boss',     label:'BOSS', emoji:'👑', baseHp:100000, hpScale:0,  baseSpeed:0.1,     speedScale:0,         baseAtk:45, atkScale:0,    radius:30, eliteRadius:35, scoreValue:3000,eliteScoreValue:3000,weight:0, moveInterval:60,  isBoss:true, spawnInterval:100, isHealer:false, isSplitter:false, isScorcher:false, isWraith:false },
};
const MONSTER_TYPE_LIST = Object.values(MONSTER_TYPES);

const AFFIXES = [
    { id:'regen',     label:'再生', emoji:'💚', minWave:5 },
    { id:'thorns',    label:'荆棘', emoji:'🌿', minWave:5 },
    { id:'swift',     label:'迅捷', emoji:'💨', minWave:5 },
    { id:'giant',     label:'巨人', emoji:'🦍', minWave:5 },
    { id:'vampiric',  label:'吸血', emoji:'🩸', minWave:5 },
    { id:'explosive', label:'爆裂', emoji:'💥', minWave:5 },
];

const STAGE_TYPES = [
    { id:'mixed',     label:'混编',     weights:{ basic:1, fast:1, tank:1, healer:0.6, splitter:0.4, scorcher:0.2, wraith:0.2 } },
    { id:'fastRush',  label:'疾驰洪流', weights:{ basic:0.3, fast:5, tank:0.1, healer:0.2, splitter:0.3, scorcher:0.2, wraith:0.3 } },
    { id:'siege',     label:'重装攻城', weights:{ basic:1, fast:0.2, tank:4, healer:2, splitter:0.3, scorcher:0.1, wraith:0.1 } },
    { id:'fireStorm', label:'烈焰风暴', weights:{ basic:0.5, fast:0.5, tank:0.5, healer:0.3, splitter:0.3, scorcher:4, wraith:0.5 } },
    { id:'ghostTown', label:'幽灵小镇', weights:{ basic:0.3, fast:0.3, tank:0.2, healer:0.2, splitter:0.2, scorcher:0.2, wraith:4 } },
    { id:'eliteSquad',label:'精英小队', weights:{ basic:1, fast:1, tank:1, healer:1, splitter:1, scorcher:0.5, wraith:0.5 }, eliteMult:2.5 },
    { id:'bossStage', label:'BOSS战',   weights:{ basic:0, fast:0, tank:0, healer:0, splitter:0, scorcher:0, wraith:0 }, isBoss:true },
];

const NODE_POOL = [
    { id:'combat',      label:'战斗', icon:'⚔️',   color:'#8ab0d0', stageType:'mixed' },
    { id:'combatFast',  label:'疾驰', icon:'💨',   color:'#66ccff', stageType:'fastRush' },
    { id:'combatSiege', label:'攻城', icon:'🛡️',   color:'#88aa77', stageType:'siege' },
    { id:'combatFire',  label:'烈火', icon:'🔥',   color:'#ff6622', stageType:'fireStorm' },
    { id:'combatGhost', label:'幽灵', icon:'👻',   color:'#aa88ee', stageType:'ghostTown' },
    { id:'elite',       label:'精英', icon:'⭐',   color:'#cc66ff', stageType:'eliteSquad' },
    { id:'merchant',    label:'商人', icon:'🧙‍♂️', color:'#ffb347', isMerchant:true },
    { id:'rest',        label:'休整', icon:'🏕️',   color:'#44cc88', isRest:true },
    { id:'boss',        label:'BOSS',  icon:'👑',   color:'#ff2255', stageType:'bossStage' },
];

const FATE_CHOICES = [
    { id:'trailMaster',  label:'轨迹大师', emoji:'🐾', desc:'轨迹伤害+100%',            score:100 },
    { id:'bulletStorm',  label:'弹幕风暴', emoji:'🎯', desc:'子弹伤害+100%',            score:80 },
    { id:'speedDemon',   label:'疾风步',   emoji:'💨', desc:'移速+50%，护盾-30%',      score:20 },
    { id:'ironWall',     label:'铁壁',     emoji:'🛡️', desc:'护盾+60%，移速-20%',     score:90 },
    { id:'doubleDrop',   label:'丰收',     emoji:'🍀', desc:'卡牌掉落率×2，怪物+25%',  score:10 },
    { id:'vampiricAura', label:'吸血光环', emoji:'🩸', desc:'击杀回血8点',             score:65 },
    { id:'berserker',    label:'狂战士',   emoji:'😡', desc:'攻击+50%，受伤害+40%',    score:50 },
    { id:'ultraCharge',  label:'超载',     emoji:'⚡', desc:'终极技能充能速度翻倍',    score:70 },
];

const CLASSES = [
    { id:'trailWeaver',  name:'轨迹编织者', emoji:'🐾', desc:'轨迹伤害+3|宽度+4|留存+50%|移速-10%' },
    { id:'bulletStorm',  name:'弹幕风暴',   emoji:'🎯', desc:'射速+40%|子弹伤害+5|弹丸+1|移速+15%' },
    { id:'guardian',     name:'堡垒守卫',   emoji:'🛡️', desc:'护盾+80|核心HP+40|攻击+8|移速-25%' },
    { id:'arcaneScholar',name:'奥术学者',   emoji:'🔮', desc:'被动槽位+1|充能+50%|初始3手牌' },
];

const CHAIR_COMBOS = [
    { id:'trailRevenge',  trigger:'T06', effect:'E10', name:'轨迹反噬', trailType:'fire' },
    { id:'chainStorm',    trigger:'T07', effect:'E12', name:'连锁风暴', trailType:'lightning' },
    { id:'iceTrail',      trigger:'T06', effect:'E13', name:'冰轨永冻', trailType:'ice' },
    { id:'trailExplosion',trigger:'T02', effect:'E07', name:'爆轨清场', trailType:'fire' },
    { id:'vampLord',      trigger:'T08', effect:'E03', name:'吸血领主', trailType:'basic' },
    { id:'bulletHell',    trigger:'T07', effect:'E02', name:'弹幕地狱', trailType:'lightning' },
];

const STAT_CHOICES = [
    { id:'atkUp',   label:'攻击强化', emoji:'⚔️', desc:'永久攻击+3' },
    { id:'heal',    label:'生命复苏', emoji:'💚', desc:'回复30%最大护盾' },
    { id:'speedUp', label:'疾步',     emoji:'💨', desc:'永久移速+5%' },
    { id:'trailUp', label:'轨迹淬炼', emoji:'🐾', desc:'永久轨迹伤害+1' },
];

// ============================================================
//  随机数工具（确定性种子可选）
// ============================================================
let _seed = Date.now();
function seedRandom(s) { _seed = s; }
function random() {
    _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
    return _seed / 0x7fffffff;
}
function rand(min, max) { return random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pickRandom(arr) { return arr[Math.floor(random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length-1; i>0; i--) { const j = Math.floor(random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ============================================================
//  游戏状态 (G)
// ============================================================
function createGameState() {
    return {
        player: { x:390, y:280, r:14, hp:100, maxHp:100, speed:2.8, atk:10, mult:1.0, shootCooldown:0 },
        core: { x:390, y:280, r:22, hp:100, maxHp:100 },
        bullets: [], monsters: [], trails: [], sprintTrails: [], fireTrails: [],
        hand: [], triggerSlot: null, effectSlot: null,
        floor: 1, stage: 1, monstersToSpawn: 0, spawnTimer: 0,
        combineCooldown: 0,
        passives: {},
        buffs: { atkUp:0, multUp:0, trailDmg:1, trailWidth:6, speedUp:1, slowAll:0 },
        keys: { w:false, a:false, s:false, d:false, shift:false },
        frame: 0, gameOver: false, fireRate: 10, fireCounter: 0, target: null,
        killCount: 0, killStreak: 0, score: 0, comboCount: 0, maxCombo: 0, scoreMultiplier: 1,
        playerSlowTimer: 0, playerSlowAmount: 0,
        vacuumActive: false, vacuumTimer: 0, selectingActive: false,
        bossPending: false, bossSpawned: false,
        ultimateGauge: 0, ultimateMax: 100, ultimateChargeMult: 1.0,
        ultimateActive: false, ultimateTimer: 0, chainCooldown: 0,
        paused: false, maxSlots: 4, floorKills: 0, floorCardsObtained: 0,
        fateBuffs: { trailDmgMul:1, bulletDmgMul:1, speedMul:1, dropRateMul:1, monsterCountMul:1, vampHeal:0, atkMul:1, damageTakenMul:1 },
        lastKillBurst: 0, fateChoosing: false,
        playerClass: null, essence: 0, relics: [], relicBuffs: {},
        terrain: [], trailLifeBonus: 0, extraBullets: 0, essenceBonus: 0,
        stageType: 'mixed', activeTrailType: 'basic', chairBonuses: 0,
        gameLog: [], _revived: false,
        enclosureBonus: 0,
    };
}

let G = createGameState();

// ============================================================
//  距离/角度工具
// ============================================================
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ============================================================
//  核心公式
// ============================================================
function getDifficultyMultiplier() { return Math.pow(1.16, G.floor - 1); }
function getMonsterCount() { return Math.floor(Math.min(4 + Math.floor(3 * Math.pow(1.10, G.floor)), 50) * G.fateBuffs.monsterCountMul); }
function getEliteChance() {
    const base = Math.min(0.05 + 0.04 * Math.log2(G.floor + 1), 0.35);
    const st = STAGE_TYPES.find(s => s.id === G.stageType);
    return Math.min(base * (st && st.eliteMult ? st.eliteMult : 1), 0.8);
}
function getSpawnInterval() {
    let base = Math.max(6, 25 / Math.pow(1.06, G.floor - 1));
    if (G.stageType === 'fastRush') base *= 0.4;
    return base;
}
function getBossHp() { return Math.floor(100000 * Math.pow(1.7, Math.floor(G.floor / 10) - 1)); }
function getTrailDamage() { return (G.buffs.trailDmg + Math.log2(G.floor + 1) * 0.5) * G.fateBuffs.trailDmgMul; }
function getTrailWidth() { return G.buffs.trailWidth; }
function getAffixCount() {
    if (G.floor < 5) return 0;
    if (G.floor < 15) return random() < 0.30 ? 1 : 0;
    if (G.floor < 25) { let c = 1; if (random() < 0.30) c = 2; return c; }
    let c = 2; if (random() < 0.20) c = 3; return c;
}

// ============================================================
//  得分 & 日志
// ============================================================
function addScore(amount) {
    G.score += Math.floor(amount * G.scoreMultiplier);
    G.comboCount += 1;
    if (G.comboCount > G.maxCombo) G.maxCombo = G.comboCount;
    if (G.comboCount > 5) G.scoreMultiplier = 1 + Math.floor(G.comboCount / 10) * 0.5;
}

function sumPassiveLayers() {
    let total = 0;
    for (const tid of Object.keys(G.passives))
        for (const p of G.passives[tid]) total += p.count;
    return total;
}

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
        kills: G.killCount, score: G.score,
        difficulty: +getDifficultyMultiplier().toFixed(2),
        passives: sumPassiveLayers(),
        relics: G.relics.map(r => r.name),
        handCount: G.hand.length,
        handBreakdown: `触${G.hand.filter(c=>c.type==='trigger').length}/效${G.hand.filter(c=>c.type==='effect').length}`,
    };
}

function logEvent(type, data) {
    G.gameLog.push({ floor: G.floor, type, data, frame: G.frame });
}

// ============================================================
//  密文板被动系统
// ============================================================
function addPassive(triggerId, effectId) {
    if (!G.passives[triggerId]) G.passives[triggerId] = [];
    const existing = G.passives[triggerId].find(p => p.effectId === effectId);
    if (existing) existing.count += 1;
    else G.passives[triggerId].push({ effectId, count: 1 });
    applyPassiveEffect(triggerId, effectId, true);
    addScore(10);
}

function triggerPassive(triggerId) {
    if (!G.passives[triggerId]) return;
    for (const p of G.passives[triggerId]) {
        for (let i = 0; i < p.count; i++) {
            applyPassiveEffect(triggerId, p.effectId, false);
        }
    }
}

function applyPassiveEffect(triggerId, effectId, isInitial) {
    const p = G.player;
    const isHighFreq = (triggerId === 'T06' || triggerId === 'T07' || triggerId === 'T08');
    switch (effectId) {
        case 'E01': G.buffs.atkUp = Math.min(G.buffs.atkUp + (isHighFreq ? 5 : 12), 250); break;  // 上限250，留outscale空间
        case 'E02': G.buffs.multUp = Math.min(G.buffs.multUp + 0.25, 49); break;  // 上限×50，允许弹幕地狱但不失控
        case 'E03': p.hp = Math.min(p.maxHp, p.hp + (isHighFreq ? 5 : 20)); break;
        case 'E04': G.buffs.slowAll = Math.min(0.7, G.buffs.slowAll + 0.07); break;
        case 'E06':
            G.buffs.trailDmg = Math.min(G.buffs.trailDmg + 1, 100);     // 上限100
            G.buffs.trailWidth = Math.min(G.buffs.trailWidth + 2, 150);  // 上限150px
            break;
        case 'E07':
            if (!isInitial) explodeTrails(p.x, p.y, 200);
            break;
        case 'E10':
            if (!isInitial && G.monsters.length > 0) {
                const dmg = Math.floor(60 * (2 + getDifficultyMultiplier()) / 3);
                for (const m of G.monsters) m.hp = Math.max(0, m.hp - dmg);
            }
            break;
        case 'E11': G.buffs.speedUp += 0.35; break;
        case 'E12':
            if (!isInitial && G.chainCooldown <= 0 && G.monsters.length > 0) {
                G.chainCooldown = 30;
                let origin = G.monsters[0];
                let nearestDist = Infinity;
                for (const m of G.monsters) { const d = dist(G.player, m); if (d < nearestDist) { nearestDist = d; origin = m; } }
                const chainDmg = Math.floor(20 + G.buffs.atkUp * 0.6 + G.floor * 2);
                origin.hp -= chainDmg;
                let chained = 0;
                for (const m of G.monsters) {
                    if (m === origin || chained >= 4) break;
                    if (dist(origin, m) < 180) {
                        m.hp -= Math.floor(chainDmg * (1 - chained * 0.25));
                        chained++;
                    }
                }
            }
            break;
        case 'E13':
            if (!isInitial) {
                const freezeDuration = isHighFreq ? 20 : 60;
                for (const m of G.monsters) {
                    if (!m.isBoss && random() < 0.65) m.frozen = Math.min((m.frozen || 0) + freezeDuration, 180);
                }
            }
            break;
    }
}

// ============================================================
//  卡牌掉落
// ============================================================
function getCardDropRate() {
    return Math.min(0.04 + G.floor * 0.001, 0.1) * G.fateBuffs.dropRateMul;
}

function dropCard() {
    const pool = random() < 0.5 ? TRIGGERS : EFFECTS;
    const card = pickRandom(pool);
    G.hand.push({ ...card, type: pool === TRIGGERS ? 'trigger' : 'effect' });
    G.floorCardsObtained++;
    logEvent('card_drop', { cardId: card.id, cardLabel: card.label, cardType: pool === TRIGGERS ? 'trigger' : 'effect' });
}

// ============================================================
//  组合密文
// ============================================================
function doCombine(trigger, effect) {
    const triggerId = trigger.id, effectId = effect.id;
    let usedSlots = 0;
    for (const tid of Object.keys(G.passives)) usedSlots += G.passives[tid].length;
    const isUpgrade = G.passives[triggerId] && G.passives[triggerId].some(p => p.effectId === effectId);
    if (!isUpgrade && usedSlots >= G.maxSlots) return false;

    addPassive(triggerId, effectId);

    // 轮椅检测
    let chairHit = null;
    for (const combo of CHAIR_COMBOS) {
        if (combo.trigger === triggerId && combo.effect === effectId) {
            G.activeTrailType = combo.trailType;
            G.chairBonuses++;
            chairHit = combo;
            // 轮椅加成
            if (combo.id === 'trailRevenge') G.buffs.trailDmg += 4;
            else if (combo.id === 'chainStorm') G.fireRate = Math.max(1, G.fireRate - 2);
            else if (combo.id === 'iceTrail') { G.buffs.trailWidth += 4; G.buffs.slowAll = Math.min(0.7, G.buffs.slowAll + 0.15); }
            else if (combo.id === 'trailExplosion') G.buffs.trailDmg += 5;
            else if (combo.id === 'vampLord') G.fateBuffs.vampHeal += 16;
            else if (combo.id === 'bulletHell') G.buffs.multUp += 0.5;
            break;
        }
    }

    logEvent('card_combine', { trigger: triggerId, effect: effectId, chairHit: chairHit ? chairHit.name : null });

    if (triggerId === 'T01') triggerPassive('T01');
    if (triggerId === 'T02') triggerPassive('T02');
    if (triggerId === 'T10' && G.player.hp < G.player.maxHp * 0.3) triggerPassive('T10');
    return true;
}

// ============================================================
//  轨迹系统
// ============================================================
function addTrail(x1, y1, x2, y2) {
    const baseLife = 360 + (G.trailLifeBonus || 0);
    G.trails.push({ x1, y1, x2, y2, life: baseLife, layer: 1, trailType: G.activeTrailType });
    if (G.trails.length > 120) G.trails.shift();
}

function addSprintTrail(x1, y1, x2, y2) {
    G.sprintTrails.push({ x1, y1, x2, y2, life: 180, layer: 2, trailType: G.activeTrailType, isSprint: true });
    if (G.sprintTrails.length > 60) G.sprintTrails.shift();
}

function explodeTrails(cx, cy, radius) {
    let count = 0;
    for (let i = G.trails.length - 1; i >= 0; i--) {
        const t = G.trails[i];
        const mx = (t.x1 + t.x2) / 2, my = (t.y1 + t.y2) / 2;
        if (dist({ x: mx, y: my }, { x: cx, y: cy }) < radius) {
            const dmg = 30 + G.buffs.trailDmg * 4;
            for (const m of G.monsters) {
                if (dist(m, { x: mx, y: my }) < 60) m.hp -= dmg;
            }
            G.trails.splice(i, 1);
            count++;
        }
    }
    return count;
}

// ============================================================
//  连杀爆发
// ============================================================
function checkKillBurst() {
    if (G.comboCount >= 25 && G.lastKillBurst < 25) {
        for (const m of G.monsters) { m.stunned = Math.max(m.stunned || 0, 90); m.hp -= 8 * getDifficultyMultiplier(); }
        G.lastKillBurst = 25;
    }
    if (G.comboCount >= 50 && G.lastKillBurst < 50) {
        G.buffs.atkUp += 15; G.buffs.multUp += 0.3; G.fireRate = Math.max(3, G.fireRate - 2);
        G.lastKillBurst = 50;
    }
    if (G.comboCount >= 100 && G.lastKillBurst < 100) {
        for (const m of G.monsters) { m.hp *= 0.7; m.frozen = Math.max(m.frozen || 0, 60); }
        G.ultimateGauge = G.ultimateMax;
        G.lastKillBurst = 100;
    }
}

// ============================================================
//  怪物死亡处理
// ============================================================
function handleMonsterDeath(m, idx) {
    // 分裂
    if (m.isSplitter && m.canSplit && !m.isChild) {
        const count = Math.min(m.splitCount + Math.floor(G.floor / 10), 4);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
            const d = 30 + rand(0, 20);
            G.monsters.push({
                x: m.x + Math.cos(angle) * d, y: m.y + Math.sin(angle) * d,
                r: m.r * 0.55, hp: m.maxHp * 0.3, maxHp: m.maxHp * 0.3,
                speed: m.speed * 1.3, isElite: false, atk: m.atk * 0.4,
                hitCooldown: 0, trailDamageCooldown: 0,
                scoreValue: m.scoreValue * 0.2,
                type: 'split_child', typeLabel: '子体', isHealer: false, isSplitter: false, canSplit: false,
                isChild: true, isBoss: false, isScorcher: false, isWraith: false,
                moveInterval: 40, moveTimer: rand(0, 80), isMoving: random() < 0.5,
                alwaysMoving: G.floor >= 10 && random() < Math.min(0.10 + 0.09 * (G.floor - 10), 1.0),
                frozen: 0, stunned: 0, _fireCounter: 0,
            });
        }
    }
    // 爆裂词缀
    if (m.affixes && m.affixes.includes('explosive')) {
        const exDmg = (20 + G.floor * 4) * getDifficultyMultiplier();
        for (const other of G.monsters) {
            if (other === m) continue;
            if (dist(m, other) < 80) other.hp -= exDmg;
        }
        if (dist(m, G.player) < 80) G.player.hp = Math.max(0, G.player.hp - exDmg * 0.3);
    }

    addScore(m.scoreValue || 5);
    G.killCount++; G.killStreak++; G.floorKills++;

    // 精华
    let essenceDrop = 1 + Math.floor(G.floor / 10);
    if (m.isElite) essenceDrop += 3;
    essenceDrop += (G.relicBuffs.essencePerKill || 0);
    G.essence += essenceDrop;

    // 吸血
    if (G.fateBuffs.vampHeal > 0) G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.fateBuffs.vampHeal);

    // 连杀触发
    if (G.killStreak >= 2) { triggerPassive('T08'); addScore(G.killStreak * 2); }

    // 卡牌掉落
    if (random() < getCardDropRate()) dropCard();

    // 遗物掉落
    if ((m.isElite) && random() < 0.08 && G.relics.length < 8) dropRelic();

    // 连杀爆发
    checkKillBurst();

    G.monsters.splice(idx, 1);
}

function handleBossDeath(m, idx) {
    addScore(m.scoreValue || 300);
    G.killCount++; G.killStreak++; G.floorKills++;
    G.essence += 10 + G.floor;
    if (random() < 0.3 && G.relics.length < 8) dropRelic();
    if (G.fateBuffs.vampHeal > 0) G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.fateBuffs.vampHeal * 3);
    triggerPassive('T08'); addScore(G.killStreak * 5);
    G.bossPending = false; G.bossSpawned = false;
    const drops = 2 + Math.floor(random() * 2);
    for (let d = 0; d < drops; d++) dropCard();
    G.monsters.splice(idx, 1);
}

// ============================================================
//  遗物掉落
// ============================================================
const RELICS = [
    { id:'cipherAmplifier', name:'密文增幅器', emoji:'📡', rarity:'rare' },
    { id:'timeDilator', name:'时间膨胀器', emoji:'⏳', rarity:'epic' },
    { id:'essenceMagnet', name:'精华磁铁', emoji:'🧲', rarity:'common' },
    { id:'glassCannon', name:'玻璃大炮', emoji:'💎', rarity:'rare' },
    { id:'phoenixFeather', name:'凤凰羽毛', emoji:'🪶', rarity:'epic' },
    { id:'shadowBlade', name:'暗影之刃', emoji:'🗡️', rarity:'rare' },
    { id:'healingWard', name:'治愈护符', emoji:'💚', rarity:'common' },
    { id:'thornsAura', name:'荆棘光环', emoji:'🌿', rarity:'common' },
    { id:'greedyChalice', name:'贪婪圣杯', emoji:'🏆', rarity:'epic' },
    { id:'windBoots', name:'疾风之靴', emoji:'👢', rarity:'common' },
    { id:'coreShield', name:'核心护盾发生器', emoji:'🔰', rarity:'rare' },
    { id:'berserkerTotem', name:'狂战图腾', emoji:'🗿', rarity:'rare' },
];

function dropRelic() {
    const relic = pickRandom(RELICS);
    if (G.relics.find(r => r.id === relic.id)) return; // 不重复
    return dropRelicById(relic);
}

function dropRelicById(relic) {
    if (G.relics.find(r => r.id === relic.id)) return; // 不重复
    G.relics.push(relic);
    logEvent('relic_get', { relicId: relic.id, relicName: relic.name, rarity: relic.rarity });
    // 应用遗物效果
    switch (relic.id) {
        case 'cipherAmplifier': G.relicBuffs.doubleTrigger = true; break;
        case 'timeDilator': G.buffs.slowAll = Math.min(0.7, G.buffs.slowAll + 0.2); G.trailLifeBonus = (G.trailLifeBonus || 0) + 120; break;
        case 'essenceMagnet': G.relicBuffs.essencePerKill = (G.relicBuffs.essencePerKill || 0) + 2; break;
        case 'glassCannon': G.fateBuffs.atkMul *= 1.5; G.player.maxHp = Math.floor(G.player.maxHp * 0.6); G.player.hp = Math.min(G.player.hp, G.player.maxHp); break;
        case 'phoenixFeather': G.relicBuffs.revive = true; break;
        case 'shadowBlade': G.relicBuffs.critChance = (G.relicBuffs.critChance || 0) + 0.2; break;
        case 'healingWard': G.relicBuffs.waveHeal = (G.relicBuffs.waveHeal || 0) + 0.2; break;
        case 'thornsAura': G.relicBuffs.thornsDmg = (G.relicBuffs.thornsDmg || 0) + 5; break;
        case 'greedyChalice': G.fateBuffs.monsterCountMul *= 1.3; G.fateBuffs.dropRateMul *= 3; break;
        case 'windBoots': G.fateBuffs.speedMul *= 1.25; break;
        case 'coreShield': G.core.maxHp += 20; G.core.hp += 20; break;
        case 'berserkerTotem': G.relicBuffs.lowHpBerserk = true; break;
    }
}

// ============================================================
//  怪物生成
// ============================================================
function spawnMonster() {
    const diff = getDifficultyMultiplier();
    const eliteChance = getEliteChance();
    const isElite = random() < eliteChance;

    // 位置：从边界外随机方向
    const pad = 30; const w = 780, h = 560;
    let x, y;
    const side = randInt(0, 3);
    if (side === 0) { x = rand(-pad, w + pad); y = -pad; }
    else if (side === 1) { x = w + pad; y = rand(-pad, h + pad); }
    else if (side === 2) { x = rand(-pad, w + pad); y = h + pad; }
    else { x = -pad; y = rand(-pad, h + pad); }

    // 类型选择（加权随机）
    const stageDef = STAGE_TYPES.find(s => s.id === G.stageType);
    const stageWeights = stageDef ? stageDef.weights : {};
    let typePool = MONSTER_TYPE_LIST.filter(t => !t.isBoss);
    let weights = typePool.map(t => {
        if (t.unlocksAtWave && G.floor < t.unlocksAtWave) return 0;
        let w = stageWeights[t.id] !== undefined ? stageWeights[t.id] * 10 : t.weight;
        if (t.id === 'healer' && G.floor < 3) w *= 0.2;
        if (t.id === 'splitter' && G.floor < 2) w *= 0.2;
        if (t.id === 'tank' && G.floor > 10) w *= 1.3;
        if (t.id === 'fast' && G.floor > 8) w *= 1.2;
        return w;
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = random() * totalWeight;
    let selectedType = typePool[0];
    for (let i = 0; i < typePool.length; i++) {
        r -= weights[i];
        if (r <= 0) { selectedType = typePool[i]; break; }
    }

    // 精英词缀
    let affixes = [];
    if (isElite) {
        const affixCount = getAffixCount();
        const available = AFFIXES.filter(a => G.floor >= a.minWave);
        const shuffled2 = shuffle(available);
        affixes = shuffled2.slice(0, Math.min(affixCount, shuffled2.length)).map(a => a.id);
    }

    let hpMult = 1;
    if (G.stageType === 'siege') hpMult = 2;
    let hp = (isElite ?
        (selectedType.baseHp + selectedType.hpScale * 1.5) * diff :
        (selectedType.baseHp + selectedType.hpScale) * diff) * hpMult;
    let spd = isElite ?
        (selectedType.baseSpeed + selectedType.speedScale * 1.2) * Math.min(diff, 3.0) :
        (selectedType.baseSpeed + selectedType.speedScale) * Math.min(diff, 3.0);
    let atk = isElite ?
        (selectedType.baseAtk + selectedType.atkScale * 1.3) * Math.min(diff, 4.0) :
        (selectedType.baseAtk + selectedType.atkScale) * Math.min(diff, 4.0);
    let radius = isElite ? selectedType.eliteRadius : selectedType.radius;

    if (affixes.includes('giant')) { hp *= 2; radius *= 1.5; }
    if (affixes.includes('swift')) spd *= 1.4;

    const monster = {
        x, y, r: radius,
        hp: Math.min(hp, 10000), maxHp: Math.min(hp, 10000),
        speed: Math.min(spd * (1 - G.buffs.slowAll), 6.0),
        isElite, atk: Math.min(atk, 120),
        hitCooldown: 0, trailDamageCooldown: 0,
        scoreValue: isElite ? selectedType.eliteScoreValue * diff : selectedType.scoreValue * diff,
        type: selectedType.id, typeLabel: selectedType.label,
        isHealer: selectedType.isHealer || false,
        healAmount: (selectedType.healAmount || 3) * Math.min(diff, 2.5),
        isSplitter: selectedType.isSplitter || false, splitCount: selectedType.splitCount || 2, canSplit: true,
        healCooldown: 0, isChild: false, isBoss: false,
        isScorcher: selectedType.isScorcher || false,
        fireTrailInterval: selectedType.fireTrailInterval || 8, fireTrailLife: selectedType.fireTrailLife || 150,
        isWraith: selectedType.isWraith || false, bulletResist: selectedType.bulletResist || 0,
        moveInterval: selectedType.moveInterval || 60,
        moveTimer: rand(0, (selectedType.moveInterval || 60) * 2),
        isMoving: random() < 0.5,
        alwaysMoving: G.floor >= 10 && random() < Math.min(0.10 + 0.09 * (G.floor - 10), 1.0),
        affixes, frozen: 0, stunned: 0,
        _fireCounter: 0,
    };
    G.monsters.push(monster);
}

function spawnBoss() {
    const type = MONSTER_TYPES.BOSS;
    const hp = getBossHp();
    const w = 780, h = 560; const pad = 50;
    let x, y;
    const side = randInt(0, 3);
    if (side === 0) { x = rand(pad, w - pad); y = -pad; }
    else if (side === 1) { x = w + pad; y = rand(pad, h - pad); }
    else if (side === 2) { x = rand(pad, w - pad); y = h + pad; }
    else { x = -pad; y = rand(pad, h - pad); }

    const boss = {
        x, y, r: type.radius,
        hp: Math.min(hp, 1200000), maxHp: Math.min(hp, 1200000),
        speed: type.baseSpeed * (1 - G.buffs.slowAll),
        isElite: false, atk: type.baseAtk * Math.min(getDifficultyMultiplier(), 4.0),
        hitCooldown: 0, trailDamageCooldown: 0,
        scoreValue: type.scoreValue * getDifficultyMultiplier(),
        type: type.id, isHealer: false, isSplitter: false, canSplit: false,
        isChild: false, isBoss: true, isScorcher: false, isWraith: false,
        spawnTimer: type.spawnInterval, moveInterval: type.moveInterval,
        moveTimer: rand(0, 120), isMoving: true, alwaysMoving: true,
        frozen: 0, stunned: 0,
    };
    G.monsters.push(boss);
}

function spawnBossMinion(boss) {
    const types = ['basic', 'fast', 'tank'];
    const typeId = pickRandom(types);
    const type = MONSTER_TYPES[typeId.toUpperCase()] || MONSTER_TYPES.BASIC;
    const diff = getDifficultyMultiplier();
    const angle = rand(0, Math.PI * 2);
    const d = boss.r + 30 + rand(10, 40);
    G.monsters.push({
        x: boss.x + Math.cos(angle) * d, y: boss.y + Math.sin(angle) * d,
        r: type.radius * 0.8,
        hp: (type.baseHp + type.hpScale) * diff * 0.5,
        maxHp: (type.baseHp + type.hpScale) * diff * 0.5,
        speed: type.baseSpeed * 1.2 * (1 - G.buffs.slowAll),
        isElite: false, atk: type.baseAtk * 0.5,
        hitCooldown: 0, trailDamageCooldown: 0,
        scoreValue: type.scoreValue * 0.3,
        type: type.id, isHealer: false, isSplitter: false, canSplit: false,
        isChild: true, isBoss: false, isScorcher: false, isWraith: false,
        moveInterval: 40, moveTimer: rand(0, 80), isMoving: true,
        alwaysMoving: random() < 0.5, frozen: 0, stunned: 0,
    });
}

// ============================================================
//  楼层管理
// ============================================================
function startFloor() {
    const st = STAGE_TYPES.find(s => s.id === G.stageType) || STAGE_TYPES[0];
    const isBoss = st.isBoss || G.floor % 10 === 0;
    const count = getMonsterCount();
    G.monstersToSpawn = count; G.spawnTimer = 0;
    G.floorKills = 0; G.floorCardsObtained = 0;
    logEvent('floor_start', { stageType: G.stageType, monsterCount: count, isBoss, snapshot: snapshotStats() });
    G.bossPending = false; G.bossSpawned = false;
    if (G.relicBuffs.waveHeal) G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * G.relicBuffs.waveHeal);
    addScore(G.floor * 5);
    if (isBoss) {
        spawnBoss(); G.bossPending = true; G.bossSpawned = true;
    }
}

function advanceFloor() {
    G.floor++;
    G.stage = Math.ceil(G.floor / 5);
    if (G.floor % 5 === 0) addScore(G.floor * 15);
    if (G.floor === 20) G.maxSlots = 5;
    if (G.floor === 40) { G.maxSlots = 6; G.ultimateChargeMult = 1.5; }
    if (G.floor === 60) G.maxSlots = 7;
    if (G.floor > 0 && G.floor % 10 === 0) {
        simAutoFateChoice();
    } else {
        addScore(G.floor * 5);
        startFloor();
    }
}

// ============================================================
//  自动射击
// ============================================================
function autoShoot() {
    if (G.gameOver || G.monsters.length === 0) return;
    const p = G.player;
    if (p.shootCooldown > 0) return;

    // 优先目标
    let priorityTargets = G.monsters.filter(m => m.isBoss || m.isHealer || m.isElite);
    let targets = priorityTargets.length > 0 ? priorityTargets : G.monsters;
    let nearest = null, nearestDist = Infinity;
    for (const m of targets) { const d = dist(p, m); if (d < nearestDist) { nearestDist = d; nearest = m; } }
    if (!nearest) return;

    const ang = angleTo(p, nearest);
    const speed = 7;
    let atk = (p.atk + G.buffs.atkUp) * (1 + G.buffs.multUp) * G.fateBuffs.atkMul * G.fateBuffs.bulletDmgMul;
    if (G.relicBuffs.lowHpBerserk && G.player.hp < G.player.maxHp * 0.3) atk *= 2;
    if (G.relicBuffs.critChance && random() < G.relicBuffs.critChance) atk *= 2;

    // 主弹
    G.bullets.push({
        x: p.x + Math.cos(ang) * 22, y: p.y + Math.sin(ang) * 22,
        vx: Math.cos(ang + rand(-0.08, 0.08)) * speed,
        vy: Math.sin(ang + rand(-0.08, 0.08)) * speed,
        r: 4, damage: atk, life: 60, hit: false,
    });
    // 额外弹丸
    for (let eb = 0; eb < (G.extraBullets || 0); eb++) {
        const eAngle = ang + rand(-0.2, 0.2);
        G.bullets.push({
            x: p.x + Math.cos(eAngle) * 22, y: p.y + Math.sin(eAngle) * 22,
            vx: Math.cos(eAngle) * speed, vy: Math.sin(eAngle) * speed,
            r: 3, damage: atk * 0.6, life: 50, hit: false,
        });
    }
    p.shootCooldown = Math.max(6, 12 - G.floor * 0.08);
}

// ============================================================
//  治疗逻辑
// ============================================================
function applyHealing() {
    for (const m of G.monsters) {
        if (!m.isHealer) continue;
        m.healCooldown--;
        if (m.healCooldown <= 0) {
            m.healCooldown = Math.max(40, 60 - G.floor * 0.3);
            for (const other of G.monsters) {
                if (other === m || other.hp <= 0) continue;
                if (dist(m, other) < 180) other.hp = Math.min(other.maxHp, other.hp + m.healAmount);
            }
            m.hp = Math.min(m.maxHp, m.hp + m.healAmount * 0.5);
        }
    }
}

// ============================================================
//  围剿检测
// ============================================================
function checkEnclosure() {
    if (G.trails.length < 10) return;
    const allTrails = [...G.trails, ...G.sprintTrails];
    const trailWidth = getTrailWidth();
    for (const m of G.monsters) {
        if (m.isBoss) continue;
        let blockedDirs = 0;
        const checkDist = 50 + m.r;
        for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2;
            const cx = m.x + Math.cos(ang) * checkDist;
            const cy = m.y + Math.sin(ang) * checkDist;
            let hitTrail = false;
            for (const t of allTrails) {
                const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                if (Math.hypot(cx - tmx, cy - tmy) < trailWidth + 8) { hitTrail = true; break; }
            }
            if (hitTrail || cx < 5 || cx > 775 || cy < 5 || cy > 555) blockedDirs++;
        }
        if (blockedDirs >= 6) {
            m.hp -= 25 + G.buffs.trailDmg * 3 + G.floor;
            m.stunned = Math.max(m.stunned || 0, 30);
            if (G.frame % 60 === 0) addScore(5);
        }
    }
}

// ============================================================
//  自动驾驶 (AI)
// ============================================================
function autoPilot() {
    const p = G.player;
    const core = G.core;
    const hpRatio = G.player.hp / G.player.maxHp;
    const w = 780, h = 560;

    // === 逃跑模式：HP<20%时不画圈，逃到远离所有怪物的安全角落 ===
    if (hpRatio < 0.2 && G.monsters.length > 0) {
        // 找离所有怪物最远的角落
        const corners = [{x:60,y:60},{x:w-60,y:60},{x:60,y:h-60},{x:w-60,y:h-60}];
        let bestCorner = corners[0], bestMinDist = -Infinity;
        for (const corner of corners) {
            let minDistToMonster = Infinity;
            for (const m of G.monsters) {
                const d = dist(corner, m);
                if (d < minDistToMonster) minDistToMonster = d;
            }
            if (minDistToMonster > bestMinDist) {
                bestMinDist = minDistToMonster; bestCorner = corner;
            }
        }
        G.keys.w = bestCorner.y < p.y - 5;
        G.keys.s = bestCorner.y > p.y + 5;
        G.keys.a = bestCorner.x < p.x - 5;
        G.keys.d = bestCorner.x > p.x + 5;
        G.keys.shift = true;
        return;
    }

    // === 闪避模式 ===
    const dodgeDist = hpRatio < 0.3 ? 160 : hpRatio < 0.5 ? 130 : 90;
    const nearMonster = G.monsters.find(m => dist(p, m) < dodgeDist && !m.isWraith);

    if (nearMonster) {
        // 闪避：朝远离最近怪物的方向移动
        const ang = angleTo(nearMonster, p);
        G.keys.w = Math.sin(ang) < -0.3;
        G.keys.s = Math.sin(ang) > 0.3;
        G.keys.a = Math.cos(ang) < -0.3;
        G.keys.d = Math.cos(ang) > 0.3;
    } else {
        // === 战斗模式：8字形轨迹最大化轨迹密度 ===
        const orbitBase = hpRatio < 0.3 ? 180 : hpRatio < 0.5 ? 140 : 110;
        // 8字形运动：用两个交替的正弦波产生更密的轨迹覆盖
        const phase1 = G.frame * 0.04;
        const phase2 = G.frame * 0.06;  // 不同频率→8字形
        const orbitRadius = orbitBase + Math.sin(G.frame * 0.015) * 25;
        const targetX = core.x + Math.cos(phase1) * orbitRadius * 0.7 + Math.sin(phase2) * orbitRadius * 0.5;
        const targetY = core.y + Math.sin(phase1) * orbitRadius * 0.7 + Math.cos(phase2) * orbitRadius * 0.3;
        const dx = targetX - p.x, dy = targetY - p.y;
        G.keys.w = dy < -2;
        G.keys.s = dy > 2;
        G.keys.a = dx < -2;
        G.keys.d = dx > 2;
    }
    G.keys.shift = true;
}

// ============================================================
//  自动决策
// ============================================================
function simAutoSelectClass() {
    const priorities = ['trailWeaver', 'guardian', 'arcaneScholar', 'bulletStorm'];
    let selected = CLASSES.find(c => c.id === priorities[0]) || CLASSES[0];
    G.playerClass = selected;
    // 应用职业效果
    switch (selected.id) {
        case 'trailWeaver': G.buffs.trailDmg += 3; G.buffs.trailWidth += 4; G.trailLifeBonus = 180; G.player.speed *= 0.9; break;
        case 'bulletStorm': G.fireRate = Math.max(3, Math.floor(G.fireRate * 0.6)); G.buffs.atkUp += 5; G.extraBullets = 1; G.player.speed *= 1.15; break;
        case 'guardian': G.player.maxHp += 80; G.player.hp += 80; G.core.maxHp += 40; G.core.hp += 40; G.buffs.atkUp += 8; G.player.speed *= 0.75; G.fireRate = Math.floor(G.fireRate * 1.25); break;
        case 'arcaneScholar': G.maxSlots += 1; G.ultimateChargeMult *= 1.5; G.essenceBonus = 0.5; break;
    }
    // v4: 轨迹编织者战斗补偿（AI用8字形+射速提升弥补输出）
    G.buffs.atkUp += 5;
    G.fireRate = Math.max(4, G.fireRate - 2);  // AI射速提升
    logEvent('class_select', { className: selected.name });
    G.selectingActive = false; G.paused = false;
    addScore(10);
    startFloor();
}

function simAutoStatChoice() {
    const shuffled = shuffle(STAT_CHOICES);
    const choices = shuffled.slice(0, 3);
    const hpRatio = G.player.hp / G.player.maxHp;
    let best = choices[0], bestScore = -Infinity;
    for (const c of choices) {
        let score = 0;
        // 校准版：残血时治疗绝对优先，健康时适度成长
        if (c.id === 'heal') {
            if (hpRatio < 0.25) score = 160;      // 濒死→必须治疗
            else if (hpRatio < 0.4) score = 130;  // 低血→高优先
            else if (hpRatio < 0.6) score = 85;   // 中等→可考虑
            else score = 10;                       // 健康→几乎不选
        } else if (c.id === 'trailUp') {
            score = 70;                            // 稳定基础分
        } else if (c.id === 'atkUp') {
            score = 55;
        } else if (c.id === 'speedUp') {
            score = 40;
        }
        score += random() * 8;
        if (score > bestScore) { bestScore = score; best = c; }
    }
    logEvent('stat_choice', { choice: best.label, desc: best.desc });
    // 应用选择（带数值上限）
    switch (best.id) {
        case 'atkUp': G.buffs.atkUp = Math.min(G.buffs.atkUp + 3, 250); break;
        case 'heal': G.player.hp = Math.min(G.player.maxHp, G.player.hp + Math.floor(G.player.maxHp * 0.3)); break;
        case 'speedUp': G.buffs.speedUp += 0.05; break;
        case 'trailUp': G.buffs.trailDmg = Math.min(G.buffs.trailDmg + 1, 100); break;
    }
    G.selectingActive = false;
    addScore(15);
    simAutoNodeMap();
}

function simAutoNodeMap() {
    const available = NODE_POOL.filter(n => {
        if (n.id === 'boss') return (G.floor % 10 === 9);
        if (n.id === 'merchant') return (G.floor % 4 === 0 || G.floor % 4 === 3);
        if (n.id === 'rest') return true;
        return n.stageType;
    });
    const choices = shuffle(available).slice(0, 3);
    const hpRatio = G.player.hp / G.player.maxHp;
    let best = choices[0], bestScore = -Infinity;
    for (const node of choices) {
        let score = 0;
        // 血量驱动：低血量大幅提升生存节点优先级
        if (node.isRest) {
            if (hpRatio < 0.3) score = 250;        // 残血→强制休整（压倒一切）
            else if (hpRatio < 0.5) score = 200;
            else if (hpRatio < 0.7) score = 120;
            else score = 15;                        // 满血→完全不需要
        } else if (node.isMerchant) {
            if (hpRatio < 0.4) score = 160;        // 残血→买治疗
            else if (hpRatio < 0.6) score = 100;
            else score = 50;
        } else if (node.id === 'elite') {
            score = hpRatio < 0.7 ? 5 : 80;        // 血量低于70%不碰精英
        } else if (node.id === 'boss') {
            score = 200;                            // BOSS始终高优先
        } else if (node.stageType) {
            // 战斗节点：低血量完全避开高难度
            if (node.stageType === 'ghostTown') {
                score = hpRatio < 0.6 ? 0 : 30;    // 虚灵免疫轨迹→极度危险，低血直接避开
            } else if (node.stageType === 'siege') {
                score = hpRatio < 0.4 ? 0 : (hpRatio < 0.6 ? 15 : 35);
            } else if (node.stageType === 'fastRush') {
                score = hpRatio < 0.3 ? 5 : 35;
            } else {
                score = 40;
            }
        }
        score += random() * 8;
        if (score > bestScore) { bestScore = score; best = node; }
    }
    logEvent('node_select', { nodeId: best.id, nodeLabel: best.label, dir: 'center' });
    G.mapMode = false; G.selectingActive = false;

    if (best.isMerchant) {
        simAutoMerchantVisit();
    } else if (best.isRest) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.3);
        for (let i = 0; i < 2; i++) {
            const pool = random() < 0.5 ? TRIGGERS : EFFECTS;
            G.hand.push({ ...pickRandom(pool), type: pool === TRIGGERS ? 'trigger' : 'effect' });
        }
        logEvent('rest_node', {});
        G.stageType = 'mixed';
        advanceFloor();
    } else {
        G.stageType = best.stageType || 'mixed';
        advanceFloor();
    }
}

function simAutoMerchantVisit() {
    // 简化商人逻辑：便宜购物
    if (G.player.hp < G.player.maxHp * 0.5 && G.essence >= 12) {
        G.essence -= 12;
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.4);
        logEvent('merchant_buy', { itemType: 'heal', itemLabel: '治疗药剂', cost: 12 });
    }
    // 买便宜卡
    const triggerCard = pickRandom(TRIGGERS);
    if (G.essence >= 8 && G.hand.length < 20) {
        G.essence -= 8;
        G.hand.push({ ...triggerCard, type: 'trigger' });
        logEvent('merchant_buy', { itemType: 'card', itemLabel: triggerCard.label, cost: 8 });
    }
    const effectCard = pickRandom(EFFECTS);
    if (G.essence >= 10 && G.hand.length < 20) {
        G.essence -= 10;
        G.hand.push({ ...effectCard, type: 'effect' });
        logEvent('merchant_buy', { itemType: 'card', itemLabel: effectCard.label, cost: 10 });
    }
    G.selectingActive = false;
    advanceFloor();
}

function simAutoFateChoice() {
    G.fateChoosing = true;
    const options = shuffle(FATE_CHOICES).slice(0, 2);
    const scores = {
        trailMaster: 100, ironWall: 90, bulletStorm: 80,
        ultraCharge: 70, vampiricAura: 65, berserker: 50,
        speedDemon: 20, doubleDrop: 10,
    };
    let best = options[0], bestScore = -Infinity;
    for (const opt of options) {
        const s = (scores[opt.id] || 50) + random() * 10;
        if (s > bestScore) { bestScore = s; best = opt; }
    }
    logEvent('fate_choice', { fateName: best.label, fateDesc: best.desc, snapshot: snapshotStats() });
    // 应用命运效果
    switch (best.id) {
        case 'trailMaster': G.fateBuffs.trailDmgMul *= 2; break;
        case 'bulletStorm': G.fateBuffs.bulletDmgMul *= 2; break;
        case 'speedDemon': G.fateBuffs.speedMul *= 1.5; G.player.maxHp = Math.floor(G.player.maxHp * 0.7); G.player.hp = Math.min(G.player.hp, G.player.maxHp); break;
        case 'ironWall': G.player.maxHp = Math.floor(G.player.maxHp * 1.6); G.player.hp = Math.floor(G.player.hp * 1.6); G.fateBuffs.speedMul *= 0.8; break;
        case 'doubleDrop': G.fateBuffs.dropRateMul *= 2; G.fateBuffs.monsterCountMul *= 1.25; break;
        case 'vampiricAura': G.fateBuffs.vampHeal += 8; break;
        case 'berserker': G.fateBuffs.atkMul *= 1.5; G.fateBuffs.damageTakenMul *= 1.4; break;
        case 'ultraCharge': G.ultimateChargeMult *= 2; break;
    }
    G.fateChoosing = false; G.selectingActive = false;
    addScore(25);
    startFloor();
}

function simAutoCombine() {
    if (G.combineCooldown > 0 || G.hand.length < 2) return;

    // === 智能组合策略：按优先级匹配最佳触发+效果对 ===
    // 优先级：弹幕地狱(T07+E02) > 轨迹反噬(T06+E10) > 冰轨永冻(T06+E13) >
    //          吸血领主(T08+E03) > 连锁风暴(T07+E12) > 爆轨清场(T02+E07) >
    //          攻击增幅(T07+E01) > 轨迹升级(T06+E06) > 其它

    const priorityPairs = [
        { t:'T07', e:'E02', name:'弹幕地狱' },   // 倍率指数增长→最强输出
        { t:'T06', e:'E10', name:'轨迹反噬' },   // 全场AOE
        { t:'T06', e:'E13', name:'冰轨永冻' },   // 冻结控场
        { t:'T08', e:'E03', name:'吸血领主' },   // 击杀回血
        { t:'T07', e:'E12', name:'连锁风暴' },   // 闪电链
        { t:'T07', e:'E01', name:'攻击增幅' },   // 攻击成长
        { t:'T06', e:'E06', name:'轨迹升级' },   // 轨迹成长
        { t:'T02', e:'E07', name:'爆轨清场' },   // 轨迹引爆
        { t:'T08', e:'E11', name:'自速暴涨' },   // 移速
        { t:'T07', e:'E04', name:'移速减慢' },   // 减速控场
    ];

    // 按优先级查找可用的触发+效果对
    for (const pair of priorityPairs) {
        const tIdx = G.hand.findIndex(c => c.type === 'trigger' && c.id === pair.t);
        const eIdx = G.hand.findIndex(c => c.type === 'effect' && c.id === pair.e);
        if (tIdx >= 0 && eIdx >= 0 && tIdx !== eIdx) {
            const trigger = G.hand[tIdx];
            const effect = G.hand[eIdx];
            // 移除两张牌
            if (tIdx > eIdx) { G.hand.splice(tIdx, 1); G.hand.splice(eIdx, 1); }
            else { G.hand.splice(eIdx, 1); G.hand.splice(tIdx, 1); }
            doCombine(trigger, effect);
            G.combineCooldown = 0;
            return;
        }
    }

    // 回退：如果没有优先级匹配，用第一个触发+效果
    const trigger = G.hand.find(c => c.type === 'trigger');
    const effect = G.hand.find(c => c.type === 'effect');
    if (!trigger || !effect) return;
    const tIdx = G.hand.indexOf(trigger);
    const eIdx = G.hand.indexOf(effect);
    if (tIdx > eIdx) { G.hand.splice(tIdx, 1); G.hand.splice(eIdx, 1); }
    else { G.hand.splice(eIdx, 1); G.hand.splice(tIdx, 1); }
    doCombine(trigger, effect);
    G.combineCooldown = 0;
}

// ============================================================
//  主更新循环
// ============================================================
function update() {
    if (G.gameOver) return;

    G.frame++;

    // 自动驾驶
    autoPilot();

    const p = G.player;
    let playerSpeedMult = G.buffs.speedUp * G.fateBuffs.speedMul;
    if (G.playerSlowTimer > 0) { G.playerSlowTimer--; playerSpeedMult *= (1 - G.playerSlowAmount * 0.3); }
    const spd = p.speed * playerSpeedMult;

    // 玩家移动
    let dx = 0, dy = 0;
    if (G.keys.w) dy = -1; if (G.keys.s) dy = 1;
    if (G.keys.a) dx = -1; if (G.keys.d) dx = 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    p.x = clamp(p.x + dx * spd, 20, 760);
    p.y = clamp(p.y + dy * spd, 20, 540);

    // 轨迹
    if (G.frame % 2 === 0 && (dx !== 0 || dy !== 0)) {
        const trailLen = 6;
        addTrail(p.x - dx * trailLen, p.y - dy * trailLen, p.x + dx * trailLen, p.y + dy * trailLen);
        if (G.keys.shift) {
            const sprintLen = 12;
            addSprintTrail(p.x - dx * sprintLen, p.y - dy * sprintLen, p.x + dx * sprintLen, p.y + dy * sprintLen);
        }
    }

    // 围剿
    if (G.frame % 30 === 0) checkEnclosure();

    // 射击
    if (G.monsters.length > 0) {
        G.fireCounter++;
        if (G.fireCounter >= G.fireRate) { G.fireCounter = 0; autoShoot(); }
    } else {
        G.fireCounter = 0; G.target = null;
    }
    if (p.shootCooldown > 0) p.shootCooldown--;

    // 子弹更新
    for (let i = G.bullets.length - 1; i >= 0; i--) {
        const b = G.bullets[i];
        b.x += b.vx; b.y += b.vy; b.life--;
        if (b.x < -10 || b.x > 790 || b.y < -10 || b.y > 570 || b.life <= 0) {
            G.bullets.splice(i, 1); continue;
        }
        let hit = false;
        for (const m of G.monsters) {
            if (dist(b, m) < b.r + m.r) {
                const bulletDmg = b.damage * (1 - (m.bulletResist || 0));
                m.hp -= bulletDmg;
                G.ultimateGauge = Math.min(G.ultimateMax, G.ultimateGauge + b.damage * 0.05 * G.ultimateChargeMult);
                if (m.affixes && m.affixes.includes('thorns')) {
                    G.player.hp = Math.max(0, G.player.hp - bulletDmg * (0.08 + G.floor * 0.002));
                }
                hit = true;
                if (!b.hit) { b.hit = true; triggerPassive('T07'); if (m.isElite || m.isBoss) triggerPassive('T03'); addScore(1); }
                break;
            }
        }
        if (hit) G.bullets.splice(i, 1);
    }

    // 治疗
    applyHealing();

    // 怪物更新
    for (let i = G.monsters.length - 1; i >= 0; i--) {
        const m = G.monsters[i];

        if (m.frozen > 0) m.frozen--;
        if (m.stunned > 0) m.stunned--;
        const disabled = m.frozen > 0 || m.stunned > 0;

        if (!disabled) {
            const ang = angleTo(m, G.core);
            const monsterSpeed = m.speed * (1 - G.buffs.slowAll) * 1.33;
            let mx = Math.cos(ang) * monsterSpeed;
            let my = Math.sin(ang) * monsterSpeed;
            const nx = m.x + mx, ny = m.y + my;

            // 轨迹阻挡
            const allTrails = [...G.trails, ...G.sprintTrails];
            const tw = getTrailWidth() + 4;
            for (const t of allTrails) {
                const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                if (dist({ x: nx, y: ny }, { x: tmx, y: tmy }) < m.r + tw) {
                    const ta = angleTo(m, { x: tmx, y: tmy });
                    const bypassAngle = ta + (random() < 0.5 ? 1 : -1) * 1.5;
                    mx = Math.cos(bypassAngle) * monsterSpeed * 0.5;
                    my = Math.sin(bypassAngle) * monsterSpeed * 0.5;
                    break;
                }
            }
            m.x += mx; m.y += my;

            // 灼烧怪火轨
            if (m.isScorcher) {
                m._fireCounter = (m._fireCounter || 0) + 1;
                if (m._fireCounter >= (m.fireTrailInterval || 8)) {
                    m._fireCounter = 0;
                    const fa = angleTo(m, G.core); const fl = 8;
                    G.fireTrails.push({ x1: m.x - Math.cos(fa) * fl, y1: m.y - Math.sin(fa) * fl, x2: m.x + Math.cos(fa) * fl, y2: m.y + Math.sin(fa) * fl, life: m.fireTrailLife || 150 });
                    if (G.fireTrails.length > 80) G.fireTrails.shift();
                }
            }
        }

        // 轨迹伤害
        if (m.trailDamageCooldown <= 0 && !m.isWraith) {
            let onTrail = false, isSprintHit = false;
            const allTrails = [...G.trails, ...G.sprintTrails];
            for (const t of allTrails) {
                const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                if (dist(m, { x: tmx, y: tmy }) < getTrailWidth() + m.r + 10) {
                    onTrail = true; if (t.isSprint) isSprintHit = true; break;
                }
            }
            if (onTrail) {
                let td = getTrailDamage();
                if (isSprintHit) td *= 2.5;
                m.hp -= td;
                m.trailDamageCooldown = isSprintHit ? 8 : 15;
                triggerPassive('T06'); addScore(1);
                if (m.affixes && m.affixes.includes('thorns')) {
                    G.player.hp = Math.max(0, G.player.hp - td * (0.08 + G.floor * 0.002));
                }
            }
        } else {
            m.trailDamageCooldown--;
        }

        // 攻击核心
        if (dist(m, G.core) < m.r + G.core.r) {
            if (m.hitCooldown <= 0) {
                const dmg = m.atk * 0.35 * G.fateBuffs.damageTakenMul;
                if (G.player.hp > 0) {
                    G.player.hp = Math.max(0, G.player.hp - dmg);
                } else {
                    G.core.hp -= dmg;
                }
                if (m.affixes && m.affixes.includes('vampiric') && G.player.hp <= 0) {
                    m.hp = Math.min(m.maxHp, m.hp + dmg * (0.15 + G.floor * 0.01));
                }
                m.hitCooldown = 24;
                if (G.relicBuffs.thornsDmg) m.hp -= G.relicBuffs.thornsDmg;
                if (G.core.hp <= 0) { G.core.hp = 0; /* gameOver由底部revive检查统一处理 */ }
            }
        }
        if (m.hitCooldown > 0) m.hitCooldown--;

        // 死亡
        if (m.hp <= 0) {
            if (m.isBoss) handleBossDeath(m, i);
            else handleMonsterDeath(m, i);
            continue;
        }

        // 再生词缀
        if (m.affixes && m.affixes.includes('regen')) {
            m.hp = Math.min(m.maxHp, m.hp + 0.05 + G.floor * 0.01);
        }
    }

    // T10 残血触发
    if (G.player.hp < G.player.maxHp * 0.3 && G.frame % 30 === 0) triggerPassive('T10');

    // 轨迹衰减
    for (let i = G.trails.length - 1; i >= 0; i--) { G.trails[i].life--; if (G.trails[i].life <= 0) G.trails.splice(i, 1); }
    for (let i = G.sprintTrails.length - 1; i >= 0; i--) { G.sprintTrails[i].life--; if (G.sprintTrails[i].life <= 0) G.sprintTrails.splice(i, 1); }
    for (let i = G.fireTrails.length - 1; i >= 0; i--) { G.fireTrails[i].life--; if (G.fireTrails[i].life <= 0) { G.fireTrails.splice(i, 1); continue; }
        const ft = G.fireTrails[i]; const fmx = (ft.x1 + ft.x2) / 2, fmy = (ft.y1 + ft.y2) / 2;
        if (dist(G.player, { x: fmx, y: fmy }) < G.player.r + 14) G.player.hp = Math.max(0, G.player.hp - 0.8);
    }

    // 终极计时器
    if (G.ultimateActive) { G.ultimateTimer--; if (G.ultimateTimer <= 0) G.ultimateActive = false; }
    if (G.chainCooldown > 0) G.chainCooldown--;

    // 模拟模式：自动组合
    if (G.frame % 30 === 0 && G.hand.length >= 2 && !G.selectingActive) simAutoCombine();

    // 目标楼层检测
    if (TARGET_FLOOR > 0 && G.floor >= TARGET_FLOOR
        && G.monsters.length === 0 && G.monstersToSpawn === 0
        && !G.vacuumActive && !G.selectingActive && !G.bossPending) {
        G.gameOver = true;
        logEvent('game_over', { reason: 'target_floor_reached', snapshot: snapshotStats() });
        return;
    }

    // 生成怪物
    if (G.monstersToSpawn > 0) {
        G.spawnTimer--;
        if (G.spawnTimer <= 0) {
            const spawnCount = Math.min(1 + Math.floor(G.floor / 12), 3);
            for (let s = 0; s < spawnCount && G.monstersToSpawn > 0; s++) {
                spawnMonster(); G.monstersToSpawn--;
            }
            G.spawnTimer = getSpawnInterval();
        }
    }

    // BOSS召唤爪牙
    for (const m of G.monsters) {
        if (!m.isBoss) continue;
        m.spawnTimer = (m.spawnTimer || 100) - 1;
        if (m.spawnTimer <= 0) {
            m.spawnTimer = Math.max(50, 150 - G.floor * 2);
            const cnt = 1 + Math.floor(G.floor / 15);
            for (let i = 0; i < cnt; i++) spawnBossMinion(m);
        }
    }

    // 楼层清空 → 属性选择
    if (G.monsters.length === 0 && G.monstersToSpawn === 0 && !G.vacuumActive && !G.selectingActive && !G.bossPending) {
        logEvent('floor_clear', { floorKills: G.floorKills, cardsThisFloor: G.floorCardsObtained, snapshot: snapshotStats() });
        // v3: 第5层保底遗物
        if (G.floor === 5 && G.relics.length === 0) {
            const commonRelics = RELICS.filter(r => r.rarity === 'common');
            const relic = pickRandom(commonRelics);
            dropRelicById(relic);
        }
        simAutoStatChoice();
    }

    // 核心被毁检测（注意：怪物攻击循环中也可能设置gameOver，此处统一处理）
    if (G.core.hp <= 0) {
        G.core.hp = 0;
        if (G.relicBuffs.revive && !G._revived) {
            G._revived = true;
            G.core.hp = G.core.maxHp * 0.5;
            G.player.hp = G.player.maxHp * 0.5;
            G.relicBuffs.revive = false;
            G.gameOver = false; // 复活后取消gameOver标记
        } else if (!G.gameOver) {
            G.gameOver = true;
            logEvent('game_over', { reason: 'core_destroyed', snapshot: snapshotStats() });
        }
    }
}

// ============================================================
//  主循环
// ============================================================
function runSimulation() {
    G = createGameState();

    // 初始化：选择职业，开始第一层
    simAutoSelectClass();

    // 主循环
    const maxFrames = (TARGET_FLOOR || 200) * MAX_FRAMES_PER_FLOOR;
    while (!G.gameOver && G.frame < maxFrames) {
        for (let i = 0; i < SPEED; i++) {
            update();
            if (G.gameOver) break;
        }
    }

    if (!G.gameOver && G.frame >= maxFrames) {
        G.gameOver = true;
        logEvent('game_over', { reason: 'timeout', snapshot: snapshotStats() });
    }

    return buildResult();
}

function buildResult() {
    const clsName = G.playerClass ? G.playerClass.name : 'none';
    // 优先从对局日志中获取game_over原因
    const lastGO = [...G.gameLog].reverse().find(e => e.type === 'game_over');
    const reason = lastGO ? lastGO.data.reason
        : G.core.hp <= 0 ? 'core_destroyed'
        : (TARGET_FLOOR > 0 && G.floor >= TARGET_FLOOR) ? 'target_floor_reached'
        : G.frame >= (TARGET_FLOOR || 200) * MAX_FRAMES_PER_FLOOR ? 'timeout'
        : 'unknown';

    return {
        version: '9.10-simCore',
        timestamp: new Date().toISOString(),
        summary: {
            className: clsName,
            finalFloor: G.floor,
            score: G.score,
            kills: G.killCount,
            maxCombo: G.maxCombo,
            gameOverReason: reason,
            finalDifficulty: +getDifficultyMultiplier().toFixed(2),
            relics: G.relics.map(r => r.name),
            passiveLayers: sumPassiveLayers(),
            finalStats: snapshotStats(),
        },
        events: G.gameLog,
    };
}

// ============================================================
//  导出
// ============================================================
function generateTextReport(result) {
    const s = result.summary;
    let report = [];
    report.push('═══════════════════════════════════');
    report.push('  《密纹轨迹》模拟对局记录  v9.10-simCore');
    report.push('═══════════════════════════════════');
    report.push('');
    report.push(`职业: ${s.className}    最终楼层: ${s.finalFloor}    得分: ${s.score}`);
    report.push(`击杀: ${s.kills}    遗物: ${s.relics.join(', ') || '无'}`);
    report.push(`被动层数: ${s.passiveLayers}    难度: ×${s.finalDifficulty}`);
    report.push('');
    const fs = s.finalStats;
    report.push('--- 终局属性 ---');
    report.push(`HP${fs.hp}/${fs.maxHp} 攻${fs.atk} 倍×${fs.mult} 轨伤${fs.trailDmg} 轨宽${fs.trailWidth} 速${fs.speed}`);
    report.push('');
    report.push('--- 事件摘要 ---');
    for (const ev of result.events) {
        if (ev.type === 'floor_clear') {
            const fs2 = ev.data.snapshot;
            report.push(`第${ev.floor}层清场 | HP${fs2.hp}/${fs2.maxHp} 攻${fs2.atk} 倍×${fs2.mult} 轨伤${fs2.trailDmg} 轨宽${fs2.trailWidth}`);
        }
        if (ev.type === 'game_over') report.push(`💀 ${ev.data.reason}`);
        if (ev.type === 'card_combine' && ev.data.chairHit) report.push(`🦽 第${ev.floor}层 · ${ev.data.chairHit}`);
    }
    report.push('');
    report.push('═══════════════════════════════════');
    return report.join('\n');
}

// ============================================================
//  入口
// ============================================================
if (require.main === module) {
    console.log('🚀 启动纯Node.js模拟引擎...');
    console.log(`   目标楼层: ${TARGET_FLOOR > 0 ? TARGET_FLOOR : '无限(直到死亡)'}`);
    console.log(`   速度: ${SPEED}x`);
    console.log('');

    const startTime = Date.now();
    const result = runSimulation();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const s = result.summary;
    console.log('═══════════════════════════════════');
    console.log('  📊 模拟完成!');
    console.log('═══════════════════════════════════');
    console.log(`  职业: ${s.className}`);
    console.log(`  最终楼层: ${s.finalFloor}`);
    console.log(`  得分: ${s.score.toLocaleString()}`);
    console.log(`  击杀: ${s.kills.toLocaleString()}`);
    console.log(`  难度系数: ×${s.finalDifficulty}`);
    console.log(`  遗物: ${s.relics.join(', ') || '无'}`);
    console.log(`  被动层数: ${s.passiveLayers}`);
    console.log(`  结束原因: ${s.gameOverReason}`);
    console.log(`  终局属性: 攻${s.finalStats.atk} 倍×${s.finalStats.mult} 轨伤${s.finalStats.trailDmg} 轨宽${s.finalStats.trailWidth}`);
    console.log(`  耗时: ${elapsed}s`);
    console.log('═══════════════════════════════════');

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n💾 结果已保存: ${OUTPUT_FILE}`);

    const reportPath = OUTPUT_FILE.replace('.json', '.txt');
    fs.writeFileSync(reportPath, generateTextReport(result), 'utf-8');
    console.log(`📋 文本报告: ${reportPath}`);
}

module.exports = { runSimulation, createGameState, update, G };
