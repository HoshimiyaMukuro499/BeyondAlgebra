// ============================================================
//  01-state —— 状态派生值 / 对局记录 / 精华经济
// ============================================================
// 4.0: 包成 IIFE 并导出命名空间 `State`。边界见 web/scope-check.mjs。
// 本模块原先还装着 G、数学辅助、难度曲线、浮字与通知——那些在 4.0 移到了
// 00-core（它们「谁都要用」，放在这里会让 00-data 变成前向引用）。
const State = (function () {

    const { G, DIFF_KNEE, getDifficultyMultiplier } = Core;
    const { STAGE_TYPES } = Data;

    // ---------- v9.10 对局记录系统 ----------
    function snapshotStats() {
        return {
            floor: G.floor,
            hp: Math.round(G.player.hp), maxHp: G.player.maxHp,
            coreHp: Math.round(G.core.hp), coreMaxHp: G.core.maxHp,
            atk: Math.round(G.player.atk + G.buffs.atkUp),
            mult: +(1 + G.buffs.multUp).toFixed(1),
            trailDmg: +Trail.getTrailDamage().toFixed(1),
            trailWidth: Trail.getTrailWidth(),
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

    // ---------- v9.1 词缀数量 ----------
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

    // ---------- 手牌平衡 ----------
    function updateHandCount() {
        if (G.simMode) return;
        G.handTriggerCount = G.hand.filter(c => c.type === 'trigger').length;
        G.handEffectCount = G.hand.filter(c => c.type === 'effect').length;
        const el = document.getElementById('handCountDisplay');
        if (el) el.textContent = `触发:${G.handTriggerCount} 效果:${G.handEffectCount}`;
    }

    return {
        snapshotStats, sumPassiveLayers, logEvent,
        canvas, ctx,
        getMonsterCount, getEliteChance,
        getEssenceCap, addCombatEssence,
        getSpawnInterval, getAffixCount, updateHandCount,
    };
})();
