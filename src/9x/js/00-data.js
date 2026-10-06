    // ============================================================
    //  9.10 · 自动模拟模式+AI驾驶+自主优化Loop
    // ============================================================

    // ---------- 词条数据 ----------
    const TRIGGERS = [
        { id: 'T01', label: '对自身', emoji: '🧍' },
        { id: 'T02', label: '对敌群', emoji: '👾' },
        { id: 'T03', label: '对精英生效', emoji: '⭐' },
        { id: 'T06', label: '怪触轨', emoji: '🐾' },
        { id: 'T07', label: '射击命中', emoji: '🎯' },
        // v9.23: T08、「连环击杀」出率 -30%（权重 1 → 0.7）。
        { id: 'T08', label: '连环击杀', emoji: '🔥', weight: 0.7 },
        { id: 'T10', label: '残血触发', emoji: '❤️‍🔥' },
        { id: 'T12', label: '闭环触发', emoji: '⭕' },
        // v9.21: T13「消除」是消耗品而不是被动——宣读即触发，之后整张牌销毁。
        // weight 是抽取权重：普通板 1，它 0.5，于是抽中率只有普通触发板的一半。
        // 拿它必须走 randomTrigger()，直接下标取会让它变成普通概率。
        { id: 'T13', label: '消除', emoji: '🧹', weight: 0.5 },
    ];

    // v9.21: 触发板的加权随机。原来是 pool[Math.floor(Math.random()*pool.length)]，
    // 给 T13 加 weight 后那样写等于没加权，所以所有「随机发一张触发板」的地方
    // 都必须走这里。（找牌、图鉴那种按 id 命中的查找不需要。）
    function randomTrigger() {
        let total = 0;
        for (const t of TRIGGERS) total += (t.weight || 1);
        let r = Math.random() * total;
        for (const t of TRIGGERS) { r -= (t.weight || 1); if (r <= 0) return t; }
        return TRIGGERS[TRIGGERS.length - 1];
    }
    const EFFECTS = [
        { id: 'E01', label: '攻击增幅', emoji: '⚔️' },
        // v9.23: E02「连环击」与 E11「自速暴涨」出率 -30%（权重 1 → 0.7）。
        { id: 'E02', label: '连环击', emoji: '💥', weight: 0.7 },
        { id: 'E03', label: '生命回复', emoji: '💚' },
        // v9.23: E04「移速减慢」删除。它和 E14「延缓」、轨迹迟缓三套减速
        // 叠在一起，是同一个效果换了三个来源；`G.buffs.slowAll` 本身保留，
        // 因为冰轨永冻（+0.15）和时间膨胀器（+0.2）还在用它。
        { id: 'E06', label: '轨迹升级', emoji: '⬆️' },
        { id: 'E07', label: '轨迹爆伤', emoji: '💣' },
        { id: 'E10', label: '怪物反噬', emoji: '🔄' },
        { id: 'E11', label: '自速暴涨', emoji: '💨', weight: 0.7 },
        { id: 'E12', label: '闪电链', emoji: '⚡' },
        { id: 'E13', label: '冰冻', emoji: '❄️' },
        { id: 'E14', label: '延缓', emoji: '⏳' },   // v9.19
    ];

    // v9.23: 效果板的加权随机，和 randomTrigger() 同款。权重只用来压 E02/E11
    // 的出率，其余效果板都是 1。凡是「随机发一张效果板」的地方都必须走这里，
    // 直接下标取 EFFECTS 会绕过权重。（按 id 命中的查找不需要。）
    function randomEffect() {
        let total = 0;
        for (const e of EFFECTS) total += (e.weight || 1);
        let r = Math.random() * total;
        for (const e of EFFECTS) { r -= (e.weight || 1); if (r <= 0) return e; }
        return EFFECTS[EFFECTS.length - 1];
    }

    // ---------- 怪物类型定义 ----------
    const MONSTER_TYPES = {
        BASIC: {
            id: 'basic',
            label: '普通',
            emoji: '👾',
            color: '#cc6633',
            eliteColor: '#dd5544',
            baseHp: 36,
            hpScale: 16,
            baseSpeed: 0.28125,
            speedScale: 0.0125,
            baseAtk: 5,
            atkScale: 1.1,
            radius: 12,
            eliteRadius: 18,
            scoreValue: 5,
            eliteScoreValue: 15,
            weight: 30,
            moveInterval: 60,
        },
        FAST: {
            id: 'fast',
            label: '疾速',
            emoji: '💨',
            color: '#66ccff',
            eliteColor: '#44aadd',
            baseHp: 22,
            hpScale: 9.0,
            baseSpeed: 0.5625,
            speedScale: 0.021875,
            baseAtk: 3,
            atkScale: 0.75,
            radius: 10,
            eliteRadius: 14,
            scoreValue: 6,
            eliteScoreValue: 18,
            weight: 25,
            moveInterval: 30,
        },
        TANK: {
            id: 'tank',
            label: '重装',
            emoji: '🛡️',
            color: '#88aa77',
            eliteColor: '#66aa55',
            baseHp: 112,
            hpScale: 40,
            baseSpeed: 0.125,
            speedScale: 0.0046875,
            baseAtk: 8,
            atkScale: 1.5,
            radius: 18,
            eliteRadius: 24,
            scoreValue: 10,
            eliteScoreValue: 25,
            weight: 18,
            moveInterval: 120,
        },
        HEALER: {
            id: 'healer',
            label: '治疗',
            emoji: '💚',
            color: '#55dd88',
            eliteColor: '#44cc77',
            baseHp: 45,
            hpScale: 16,
            baseSpeed: 0.21875,
            speedScale: 0.009375,
            baseAtk: 2,
            atkScale: 0.45,
            radius: 13,
            eliteRadius: 17,
            scoreValue: 8,
            eliteScoreValue: 20,
            weight: 12,
            isHealer: true,
            healAmount: 4.0,
            moveInterval: 80,
        },
        SPLITTER: {
            id: 'splitter',
            label: '分裂',
            emoji: '🧬',
            color: '#ffaa44',
            eliteColor: '#ee8833',
            baseHp: 68,
            hpScale: 25,
            baseSpeed: 0.25,
            speedScale: 0.0109375,
            baseAtk: 5,
            atkScale: 0.9,
            radius: 14,
            eliteRadius: 18,
            scoreValue: 9,
            eliteScoreValue: 24,
            weight: 10,
            isSplitter: true,
            splitCount: 4,
            moveInterval: 70,
        },
        SCORCHER: {
            id: 'scorcher', label: '灼烧', emoji: '🔥',
            color: '#ff6622', eliteColor: '#ff4411',
            baseHp: 33, hpScale: 12,
            baseSpeed: 0.25, speedScale: 0.011,
            baseAtk: 5, atkScale: 0.85,
            radius: 12, eliteRadius: 16,
            scoreValue: 7, eliteScoreValue: 20,
            weight: 12, moveInterval: 55,
            isScorcher: true, fireTrailInterval: 8, fireTrailLife: 150,
            unlocksAtWave: 8,
        },
        WRAITH: {
            id: 'wraith', label: '虚灵', emoji: '👻',
            color: '#aa88ee', eliteColor: '#8866cc',
            baseHp: 21, hpScale: 7.5,
            baseSpeed: 0.28, speedScale: 0.015,
            baseAtk: 3, atkScale: 0.7,
            radius: 11, eliteRadius: 15,
            scoreValue: 8, eliteScoreValue: 22,
            weight: 10, moveInterval: 45,
            isWraith: true, bulletResist: 0.3,
            unlocksAtWave: 12,
        },
        BOSS: {
            id: 'boss', label: 'BOSS', emoji: '👑',
            color: '#ff2255', eliteColor: '#ff0044',
            baseHp: 100000, hpScale: 0, baseSpeed: 0.1, speedScale: 0,
            baseAtk: 45, atkScale: 0, radius: 30, eliteRadius: 35,
            scoreValue: 3000, eliteScoreValue: 3000, weight: 0,
            isBoss: true, spawnInterval: 100, moveInterval: 60,
        },
    };

    // ---------- 精英词缀 ----------
    const AFFIXES = [
        { id: 'regen',     label: '再生', emoji: '💚', color: '#44ff88',
          desc: '每帧回复生命', minWave: 5 },
        { id: 'thorns',    label: '荆棘', emoji: '🌿', color: '#ff6644',
          desc: '反弹伤害给玩家', minWave: 5 },
        { id: 'swift',     label: '迅捷', emoji: '💨', color: '#66ccff',
          desc: '速度+40%', minWave: 5 },
        { id: 'giant',     label: '巨人', emoji: '🦍', color: '#ffaa44',
          desc: '双倍HP与体型', minWave: 5 },
        { id: 'vampiric',  label: '吸血', emoji: '🩸', color: '#ff3366',
          desc: '攻击时回复生命', minWave: 5 },
        { id: 'explosive', label: '爆裂', emoji: '💥', color: '#ff6622',
          desc: '死亡时范围爆炸', minWave: 5 },
    ];

    // ---------- v9.2 命运抉择 ----------
    const FATE_CHOICES = [
        { id: 'trailMaster',   label: '轨迹大师', emoji: '🐾', desc: '轨迹伤害+100%',              apply() { G.fateBuffs.trailDmgMul *= 2; }, },
        { id: 'bulletStorm',   label: '弹幕风暴', emoji: '🎯', desc: '子弹伤害+100%',              apply() { G.fateBuffs.bulletDmgMul *= 2; }, },
        { id: 'speedDemon',    label: '疾风步',   emoji: '💨', desc: '移速+50%，护盾-30%',        apply() { G.fateBuffs.speedMul *= 1.5; G.player.maxHp = Math.floor(G.player.maxHp * 0.7); G.player.hp = Math.min(G.player.hp, G.player.maxHp); }, },
        { id: 'ironWall',      label: '铁壁',     emoji: '🛡️', desc: '护盾+60%，移速-20%',       apply() { G.player.maxHp = Math.floor(G.player.maxHp * 1.6); G.player.hp = Math.floor(G.player.hp * 1.6); G.fateBuffs.speedMul *= 0.8; }, },
        { id: 'doubleDrop',    label: '丰收',     emoji: '🍀', desc: '怪物+25%，掉落率×2',    apply() { G.fateBuffs.dropRateMul *= 2; G.fateBuffs.monsterCountMul *= 1.25; }, },
        { id: 'vampiricAura',  label: '吸血光环', emoji: '🩸', desc: '击杀回血8点',               apply() { G.fateBuffs.vampHeal += 8; }, },
        { id: 'berserker',     label: '狂战士',   emoji: '😡', desc: '攻击+50%，受伤害+40%',      apply() { G.fateBuffs.atkMul *= 1.5; G.fateBuffs.damageTakenMul *= 1.4; }, },
        { id: 'ultraCharge',   label: '超载',     emoji: '⚡', desc: '终极技能充能速度翻倍',      apply() { G.ultimateChargeMult *= 2; }, },
    ];

    // v9.22: 连杀爆发（25/50/100 连杀的冲击波·过载·天罚）整块删除。
    // 它和终结技的定位重叠，而且 100 连杀直接把终结技槽灌满这件事，
    // 在下面的「固定回复速度」之后已经没有意义。
    // 注意 G.killStreak 本身**没有**删——T08「连环击杀」还在用它（见 05-update.js）。

    // v9.23: BOSS 血量整体 −10%（第 10 层 9 万、第 30 层 26 万）。
    const BOSS_HP_MUL = 0.9;
    // v9.23: BOSS 召唤爪牙的速率 +5%，于是每次召唤的间隔 ×(1/1.05)。
    // 初始间隔（type.spawnInterval = 100）和后续的 max(50, 150-层数×2) 都除这一项。
    const BOSS_SUMMON_RATE_MUL = 1.05;
    function bossSummonInterval(base) {
        return Math.max(1, Math.round(base / BOSS_SUMMON_RATE_MUL));
    }

    // ---------- v9.23 每层清空奖励的卡牌数 ----------
    // 基础式仍是 2 + 层数/10（第 5 层 2 张、第 50 层 7 张、第 100 层 12 张），
    // 再按「前期 ×1.1、后期 ×0.9」缩放。拐点沿用难度的 DIFF_KNEE = 30。
    // 只影响清层奖励——BOSS 掉落、商人、休整那三个来源不动。
    const CARD_EARLY_MUL = 1.1;
    const CARD_LATE_MUL = 0.9;
    function getFloorClearCards() {
        const base = 2 + Math.floor(G.floor / 10);
        const mul = G.floor < DIFF_KNEE ? CARD_EARLY_MUL : CARD_LATE_MUL;
        return Math.max(1, Math.round(base * mul));
    }

    function getBossHp() {
        // v9.15: 和难度曲线同步加拐点，否则 BOSS 自己按 1.7^(层/10) 一路指数涨，
        // 118 层就是 2000 万血——玩家永远打不死，又是一个「假难度」。
        // v9.23: 整体再 −10%，第 10 / 20 / 30 层是 9 万 / 15.3 万 / 26 万。
        const g = Math.floor(G.floor / 10);
        return Math.floor(BOSS_HP_MUL * 100000
            * Math.pow(1.7, Math.min(g, 3) - 1)
            * Math.pow(Math.max(1, G.floor / DIFF_KNEE), DIFF_TAIL));
    }

    // ---------- v9.6 关卡类型（怪物分布多样化）----------
    const STAGE_TYPES = [
        { id:'mixed',     label:'混编',     icon:'⚔️', desc:'标准怪物混合',  weights:{ basic:1, fast:1, tank:1, healer:0.6, splitter:0.4, scorcher:0.2, wraith:0.2 } },
        { id:'fastRush',  label:'疾驰洪流', icon:'💨', desc:'疾速怪海战术',  weights:{ basic:0.3, fast:5, tank:0.1, healer:0.2, splitter:0.3, scorcher:0.2, wraith:0.3 } },
        { id:'siege',     label:'重装攻城', icon:'🛡️', desc:'坦克+治疗组合', weights:{ basic:1, fast:0.2, tank:4, healer:2, splitter:0.3, scorcher:0.1, wraith:0.1 } },
        { id:'fireStorm', label:'烈焰风暴', icon:'🔥', desc:'灼烧怪为主',    weights:{ basic:0.5, fast:0.5, tank:0.5, healer:0.3, splitter:0.3, scorcher:4, wraith:0.5 } },
        { id:'ghostTown', label:'幽灵小镇', icon:'👻', desc:'虚灵免疫轨迹',  weights:{ basic:0.3, fast:0.3, tank:0.2, healer:0.2, splitter:0.2, scorcher:0.2, wraith:4 } },
        { id:'eliteSquad',label:'精英小队', icon:'⭐', desc:'高精英率',      weights:{ basic:1, fast:1, tank:1, healer:1, splitter:1, scorcher:0.5, wraith:0.5 }, eliteMult:2.5 },
        { id:'bossStage', label:'BOSS战',   icon:'👑', desc:'楼层BOSS',      weights:{ basic:0, fast:0, tank:0, healer:0, splitter:0, scorcher:0, wraith:0 }, isBoss:true },
    ];

    // ---------- v9.6 轮椅组合 ----------
    const CHAIR_COMBOS = [
        { id:'trailRevenge', trigger:'T06', effect:'E10', name:'轨迹反噬', emoji:'🐾🔥', desc:'轨迹→反噬→全怪互伤', trailType:'fire', bonus(G){ G.buffs.trailDmg+=4; } },
        { id:'chainStorm', trigger:'T07', effect:'E12', name:'连锁风暴', emoji:'⚡🎯', desc:'射击→闪电链→清场', trailType:'lightning', bonus(G){ G.fireRate=Math.max(12,G.fireRate-8); } },   // v9.19: -2→-8，见 SURGE 的注释
        { id:'iceTrail', trigger:'T06', effect:'E13', name:'冰轨永冻', emoji:'❄️🐾', desc:'触轨→冰冻→罚站', trailType:'ice', bonus(G){ G.buffs.trailWidth+=4; G.buffs.slowAll=Math.min(0.7,G.buffs.slowAll+0.15); } },
        { id:'trailExplosion', trigger:'T02', effect:'E07', name:'爆轨清场', emoji:'💣🐾', desc:'对敌群→引爆轨迹→AOE', trailType:'fire', bonus(G){ G.buffs.trailDmg+=5; } },
        { id:'vampLord', trigger:'T08', effect:'E03', name:'吸血领主', emoji:'🩸💚', desc:'连杀→回血→永生', trailType:'basic', bonus(G){ G.fateBuffs.vampHeal+=16; } },
        { id:'bulletHell', trigger:'T07', effect:'E02', name:'弹幕地狱', emoji:'🎯💥', desc:'命中→倍率→指数增长', trailType:'lightning', bonus(G){ G.buffs.multUp+=0.5; } },
    ];

    // ---------- v9.6 轨迹类型视觉 ----------
    const TRAIL_STYLES = {
        basic:    { color:'hsla(210,80%,60%,{a})', glow:'hsla(210,90%,60%,{a})', widthMul:1.0 },
        fire:     { color:'rgba(255,100,30,{a})',  glow:'rgba(255,60,20,{a})',   widthMul:1.3 },
        ice:      { color:'rgba(140,210,255,{a})',  glow:'rgba(180,220,255,{a})',  widthMul:1.5 },
        lightning:{ color:'rgba(255,220,60,{a})',   glow:'rgba(255,200,40,{a})',   widthMul:1.1 },
    };

    // ---------- v9.6 地图节点（用来画可视化地图）----------
    const NODE_POOL = [
        { id:'combat',     label:'战斗',  icon:'⚔️', color:'#8ab0d0', stageType:'mixed' },
        { id:'combatFast', label:'疾驰',  icon:'💨', color:'#66ccff', stageType:'fastRush' },
        { id:'combatSiege',label:'攻城',  icon:'🛡️', color:'#88aa77', stageType:'siege' },
        { id:'combatFire', label:'烈火',  icon:'🔥', color:'#ff6622', stageType:'fireStorm' },
        { id:'combatGhost',label:'幽灵',  icon:'👻', color:'#aa88ee', stageType:'ghostTown' },
        { id:'elite',      label:'精英',  icon:'⭐', color:'#cc66ff', stageType:'eliteSquad' },
        { id:'merchant',   label:'商人',  icon:'🧙‍♂️', color:'#ffb347', isMerchant:true },
        { id:'rest',       label:'休整',  icon:'🏕️', color:'#44cc88', isRest:true },
        { id:'boss',       label:'BOSS',  icon:'👑', color:'#ff2255', stageType:'bossStage' },
    ];

    const MONSTER_TYPE_LIST = Object.values(MONSTER_TYPES);

    // ---------- v9.4 职业定义 ----------
    const CLASSES = [
        {
            id: 'trailWeaver', name: '轨迹编织者', emoji: '🐾',
            desc: '掌控轨迹之力的秘法大师，留下的轨迹更持久且伤害更高。',
            stats: '轨迹伤害+3 | 轨迹宽度+4 | 轨迹留存+50% | 移速-10%',
            apply(G) {
                G.buffs.trailDmg += 3; G.buffs.trailWidth += 4;
                G.trailLifeBonus = 180; // 轨迹额外留存
                G.player.speed *= 0.9;
            },
        },
        {
            id: 'bulletStorm', name: '弹幕风暴', emoji: '🎯',
            desc: '精通射击的战场指挥官，子弹如暴风雨般倾泻。',
            stats: '射速+40% | 子弹伤害+5 | 弹丸+1(散射) | 移速+15%',
            apply(G) {
                G.fireRate = Math.max(3, Math.floor(G.fireRate * 0.6));
                G.buffs.atkUp += 5;
                G.extraBullets = 1; // 额外弹丸
                G.player.speed *= 1.15;
            },
        },
        {
            id: 'guardian', name: '堡垒守卫', emoji: '🛡️',
            desc: '以钢铁意志守护核心，厚重的护盾让敌人绝望。',
            stats: '护盾+80 | 核心HP+40 | 攻击+8 | 移速-25% | 射速-20%',
            apply(G) {
                G.player.maxHp += 80; G.player.hp += 80;
                G.core.maxHp += 40; G.core.hp += 40;
                G.buffs.atkUp += 8;
                G.player.speed *= 0.75;
                G.fireRate = Math.floor(G.fireRate * 1.25);
            },
        },
        {
            id: 'arcaneScholar', name: '奥术学者', emoji: '🔮',
            desc: '研究密文本质的学者，擅长组合更多被动，充能速度极快。',
            stats: '被动槽位+1 | 终极充能+50% | 初始3张手牌 | 精华掉落+50%',
            apply(G) {
                G.maxSlots += 1;
                G.ultimateChargeMult *= 1.5;
                G.essenceBonus = 0.5; // 精华掉落加成
            },
        },
    ];

    // ---------- v9.4 遗物定义 ----------
    const RELICS = [
        { id: 'cipherAmplifier', name: '密文增幅器', emoji: '📡', rarity: 'rare',
          desc: '被动效果触发时额外触发一次', apply(G) { G.relicBuffs.doubleTrigger = true; } },
        { id: 'timeDilator', name: '时间膨胀器', emoji: '⏳', rarity: 'epic',
          desc: '怪物移速-20%，轨迹留存+120帧', apply(G) { G.buffs.slowAll = Math.min(0.7, G.buffs.slowAll + 0.2); G.trailLifeBonus = (G.trailLifeBonus || 0) + 120; } },
        { id: 'essenceMagnet', name: '精华磁铁', emoji: '🧲', rarity: 'common',
          desc: '击杀掉落精华+2', apply(G) { G.relicBuffs.essencePerKill = (G.relicBuffs.essencePerKill || 0) + 2; } },
        { id: 'glassCannon', name: '玻璃大炮', emoji: '💎', rarity: 'rare',
          desc: '攻击+50%，护盾-40%', apply(G) { G.fateBuffs.atkMul *= 1.5; G.player.maxHp = Math.floor(G.player.maxHp * 0.6); G.player.hp = Math.min(G.player.hp, G.player.maxHp); } },
        { id: 'phoenixFeather', name: '凤凰羽毛', emoji: '🪶', rarity: 'epic',
          desc: '核心被毁时复活一次(恢复50%核心HP)', apply(G) { G.relicBuffs.revive = true; } },
        { id: 'shadowBlade', name: '暗影之刃', emoji: '🗡️', rarity: 'rare',
          desc: '子弹有20%概率造成双倍伤害', apply(G) { G.relicBuffs.critChance = (G.relicBuffs.critChance || 0) + 0.2; } },
        { id: 'healingWard', name: '治愈护符', emoji: '💚', rarity: 'common',
          desc: '每波开始时回复20%护盾', apply(G) { G.relicBuffs.waveHeal = (G.relicBuffs.waveHeal || 0) + 0.2; } },
        { id: 'thornsAura', name: '荆棘光环', emoji: '🌿', rarity: 'common',
          desc: '攻击核心的怪物受到5点反伤', apply(G) { G.relicBuffs.thornsDmg = (G.relicBuffs.thornsDmg || 0) + 5; } },
        { id: 'greedyChalice', name: '贪婪圣杯', emoji: '🏆', rarity: 'epic',
          desc: '怪物数量+30%，但掉落率×3', apply(G) { G.fateBuffs.monsterCountMul *= 1.3; G.fateBuffs.dropRateMul *= 3; } },
        { id: 'windBoots', name: '疾风之靴', emoji: '👢', rarity: 'common',
          desc: '移速永久+25%', apply(G) { G.fateBuffs.speedMul *= 1.25; } },
        { id: 'coreShield', name: '核心护盾发生器', emoji: '🔰', rarity: 'rare',
          desc: '核心获得20点额外HP上限', apply(G) { G.core.maxHp += 20; G.core.hp += 20; } },
        { id: 'berserkerTotem', name: '狂战图腾', emoji: '🗿', rarity: 'rare',
          desc: '护盾低于30%时攻击力翻倍', apply(G) { G.relicBuffs.lowHpBerserk = true; } },
    ];

    // v9.6: 旧波次变体和地图节点已移除，使用上方STAGE_TYPES和NODE_POOL

    // v9.22: MAP_NODES 已删除——v9.6 起节点一律走 NODE_POOL，
    // 这张表的 getMods() 没有任何调用点，treasure 关卡类型也由它带进死胡同。

    // ---------- v9.10 属性提升选项 / v9.18 商店也卖这一套 ----------
    // 原来是写在 07-ui.js 里的，v9.18 起 getMerchantStock() 也要用它，
    // 所以挪到数据模块——否则「数据模块取 UI 模块的 const」是个看不见的顺序依赖。
    // shopCost 是商店单价基准，实际售价再乘 (1 + 层数×0.06)。
    const STAT_CHOICES = [
        { id: 'atkUp',     label: '攻击强化', emoji: '⚔️', desc: '永久攻击+3',        color: '#ff8844', shopCost: 12,
          apply() { G.buffs.atkUp = Math.min(G.buffs.atkUp + 3, 2000); setFeedback('⚔️ 攻击力永久+3！', '#ff8844'); } },
        { id: 'heal',      label: '生命复苏', emoji: '💚', desc: '回复30%最大护盾',   color: '#44ff88', shopCost: 10,
          apply() { const healAmt = Math.floor(G.player.maxHp * 0.3); G.player.hp = Math.min(G.player.maxHp, G.player.hp + healAmt);
                    spawnParticles(G.player.x, G.player.y, '#44ff88', 12);
                    showFloatingText(G.player.x, G.player.y - G.player.r, '+' + healAmt, '#44ff88');
                    setFeedback('💚 回复' + healAmt + '护盾！', '#44ff88'); } },
        { id: 'speedUp',   label: '疾步',     emoji: '💨', desc: '永久移速+5%',       color: '#88ddff', shopCost: 12,
          apply() { G.buffs.speedUp += 0.05; setFeedback('💨 移速永久+5%！', '#88ddff'); } },
        { id: 'trailUp',   label: '轨迹淬炼', emoji: '🐾', desc: '永久轨迹伤害+1',    color: '#ffdd44', shopCost: 14,
          apply() { G.buffs.trailDmg = Math.min(G.buffs.trailDmg + 1, 400); setFeedback('🐾 轨迹伤害永久+1！', '#ffdd44'); } },
        // v9.18 新增两条
        { id: 'trailWidth', label: '轨迹拓宽', emoji: '📏', desc: '永久轨迹宽度+1',   color: '#66dd88', shopCost: 14,
          apply() { G.buffs.trailWidth = Math.min(G.buffs.trailWidth + 1, 60); setFeedback('📏 轨迹宽度永久+1！', '#66dd88'); } },
        // v9.20: 跟着基础血量一起缩到 30%（3 → 1）。不缩的话，塔基础血只剩
        // 2/4/6 而这一项还加 3，一次购买就能把小环从 2 顶到 5——比削弱前还硬。
        { id: 'turretHp',  label: '图腾加固', emoji: '🗼', desc: '图腾血量+1',        color: '#88aacc', shopCost: 14,
          apply() { G.turretHpBonus = (G.turretHpBonus || 0) + 1;
                    for (const t of G.turrets) { t.maxHp += 1; t.hp += 1; }   // 已有的塔一起加厚
                    setFeedback('🗼 图腾血量+1！（含场上 ' + G.turrets.length + ' 座）', '#88aacc'); } },
    ];

    // ---------- v9.21 图腾扩容 ----------
    // 不进 STAT_CHOICES——它不是商店商品，只在每层打完的奖励界面按小概率露脸
    // （概率见 07-ui.js 的 showStatChoice）。放在这里是因为 UI 和模拟器都要用同一份。
    const TURRET_SLOT_CHOICE = {
        id: 'turretSlot', label: '图腾扩容', emoji: '🗼',
        desc: '图腾上限+1',
        color: '#ffdd66',
        apply() {
            G.maxTurrets = (G.maxTurrets || 10) + 1;
            setFeedback('🗼 图腾上限 +1 → ' + G.maxTurrets + '！', '#ffdd66');
            showNotification('🗼 图腾上限 +1', '#ffdd66', 200);
        },
    };

    // ---------- v9.4 商人商品 / v9.18 经济重做 ----------
    // v9.18 改动：
    //   1. 删掉「精华提取」——花 5 精华返 15-25 是数学上的白送套利
    //   2. 密文版出率降低（4 个槽位 → 2 个），增益与遗物出率升高
    //   3. 增益就是每层奖励那套 STAT_CHOICES
    // 价格**不随层数放大**：每层战斗精华已经硬顶在 8（后期 16），收入被钳住了，
    // 价格再跟着层数涨就是双重紧缩，商店会变成看客。密文商人每 4 层才出现一次，
    // 一轮攒下的 32 精华刚好够买一两件——这就是想要的节奏。
    // 刷新逻辑见 refreshMerchantStock()：刷新也走这份生成流程。
    function getMerchantStock() {
        const stock = [];

        // 密文版：各 1 张（原来各 2 张）
        const pickedT = randomTrigger();   // v9.21: 走加权抽取，T13 只有一半概率
        const shuffledE = [...EFFECTS].sort(() => Math.random() - 0.5);
        stock.push({ type: 'card', card: { ...pickedT, cardType: 'trigger' }, cost: 8, emoji: pickedT.emoji, label: pickedT.label, desc: '触发板' });
        stock.push({ type: 'card', card: { ...shuffledE[0], cardType: 'effect' }, cost: 10, emoji: shuffledE[0].emoji, label: shuffledE[0].label, desc: '效果板' });

        // 增益：与每层奖励同款，抽 2 个不重复的
        const buffs = [...STAT_CHOICES].sort(() => Math.random() - 0.5).slice(0, 2);
        for (const b of buffs) {
            stock.push({ type: 'buff', buff: b, cost: b.shopCost, emoji: b.emoji, label: b.label, desc: b.desc + '（永久）' });
        }

        // 遗物：1 个保底，40% 再出一个（不重复）
        const rareRelics = RELICS.filter(r => r.rarity === 'rare' || r.rarity === 'epic').sort(() => Math.random() - 0.5);
        // 兜底：万一遗物表被改到没有 rare/epic，也不该让商店崩掉
        const pool = rareRelics.length > 0 ? rareRelics : [...RELICS].sort(() => Math.random() - 0.5);
        stock.push({ type: 'relic', relic: pool[0], cost: 35 + Math.floor(Math.random() * 20), emoji: pool[0].emoji, label: pool[0].name, desc: pool[0].desc });
        if (pool[1] && Math.random() < 0.4) {
            const r2 = pool[1];
            stock.push({ type: 'relic', relic: r2, cost: 40 + Math.floor(Math.random() * 20), emoji: r2.emoji, label: r2.name, desc: r2.desc });
        }

        // 治疗
        stock.push({ type: 'heal', cost: 12, emoji: '💚', label: '治疗药剂', desc: '回复40%护盾' });
        return stock;
    }

    // ---------- v9.4 地形障碍 ----------
    function generateTerrain() {
        G.terrain = [];
        const w = G.canvasWidth || 780, h = G.canvasHeight || 560;
        const cx = w / 2, cy = h / 2;
        // 核心周围安全区不生成
        const safeR = 80;
        const count = 3 + Math.floor(G.floor / 8);
        for (let i = 0; i < count; i++) {
            let tx, ty, tr;
            let attempts = 0;
            do {
                tx = rand(40, w - 40);
                ty = rand(40, h - 40);
                tr = rand(20, 50);
                attempts++;
            } while (attempts < 20 && dist({ x: tx, y: ty }, { x: cx, y: cy }) < safeR + tr + 20);
            if (attempts < 20) {
                G.terrain.push({ x: tx, y: ty, r: tr, life: G.floor * 60 + 600, alpha: 0.4 });
            }
        }
    }

