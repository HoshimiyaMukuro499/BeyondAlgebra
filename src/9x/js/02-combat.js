    // ---------- 被动系统 ----------
    function addPassive(triggerId, effectId) {
        if (!G.passives[triggerId]) G.passives[triggerId] = [];
        const existing = G.passives[triggerId].find(p => p.effectId === effectId);
        if (existing) existing.count += 1;
        else G.passives[triggerId].push({ effectId: effectId, count: 1 });
        applyPassiveEffect(triggerId, effectId, true);
        updatePassiveUI();
        addScore(10);
    }

    // v9.23: target 是「这次触发的生效目标」——T03/T06/T07/T08 传被命中的那只怪。
    // 只有需要范围效果的 E13/E14 用它（见下面的 effectAoeTargets()），其余效果忽略。
    // v9.24: 被「封印」词条压住的组合整条跳过——被动不删除，只是这 4 秒不生效。
    function triggerPassive(triggerId, target) {
        if (!G.passives[triggerId]) return;
        for (const p of G.passives[triggerId]) {
            if (isPassiveSealed(triggerId, p.effectId)) continue;
            for (let i = 0; i < p.count; i++) {
                applyPassiveEffect(triggerId, p.effectId, false, target);
            }
        }
    }

    // 某个组合当前是否被封印。G.sealedPassives 的清理在 05-update.js 的 updateSeals()。
    function isPassiveSealed(triggerId, effectId) {
        for (const s of G.sealedPassives) {
            if (s.tid === triggerId && s.eid === effectId) return true;
        }
        return false;
    }

    // 同一件事的「还剩多少帧」版本，给 UI 显示剩余秒数用（07-ui.js 的 updatePassiveUI）。
    function getSealedFrames(triggerId, effectId) {
        for (const s of G.sealedPassives) {
            if (s.tid === triggerId && s.eid === effectId) return s.timer;
        }
        return 0;
    }

    // ---------- v9.23 E13/E14 的作用范围 ----------
    // 从「全场」改成「命中目标 + 它周围 N px 内的怪」。
    // 没有具体目标的触发器（T01 对自身 / T02 对敌群 / T10 残血 / T12 闭环）
    // 就近兜底：取离玩家最近的那只怪当靶心；场上一只怪都没有时返回空数组。
    // v9.24: 90 → 225（90 × 2.5）。90px 在后期密集怪群里几乎只打到靶心那一只，
    // 「范围效果」和「单体效果」手感上没有区别，等于白改。
    const EFFECT_AOE_RADIUS = 225;
    function nearestMonsterTo(x, y) {
        let best = null, bestD = Infinity;
        for (const m of G.monsters) {
            const d = dist({ x: x, y: y }, m);
            if (d < bestD) { bestD = d; best = m; }
        }
        return best;
    }
    function effectAoeTargets(target) {
        if (!target || target.hp <= 0) target = nearestMonsterTo(G.player.x, G.player.y);
        if (!target) return [];
        const out = [];
        for (const m of G.monsters) {
            if (dist(target, m) <= EFFECT_AOE_RADIUS + (m.r || 0)) out.push(m);
        }
        // 靶心本身一定要在里面，哪怕它的半径把它挤出了判定圈
        if (out.indexOf(target) < 0) out.push(target);
        return out;
    }

    function applyPassiveEffect(triggerId, effectId, isInitial, target) {
        const p = G.player;
        const isHighFreq = (triggerId === 'T06' || triggerId === 'T07' || triggerId === 'T08');
        switch (effectId) {
            case 'E01': {
                const val = isHighFreq ? 5 : 12;
                G.buffs.atkUp = Math.min(G.buffs.atkUp + val, 250);
                if (!isInitial) spawnParticles(p.x, p.y, '#ff8844', 5);
                setFeedback(`⚔️ 攻击+${val} (累计+${G.buffs.atkUp})`, '#ff8844');
                break;
            }
            case 'E02':
                G.buffs.multUp = Math.min(G.buffs.multUp + 0.25, 49);
                if (!isInitial) spawnParticles(p.x, p.y, '#ffdd44', 5);
                setFeedback(`💥 倍率+0.25 (累计x${(1 + G.buffs.multUp).toFixed(1)})`, '#ffdd44');
                break;
            case 'E03': {
                const val = isHighFreq ? 5 : 20;
                p.hp = Math.min(p.maxHp, p.hp + val);
                spawnParticles(p.x, p.y, '#44ff88', 8);
                showFloatingText(p.x, p.y - p.r, '+' + val, '#44ff88');
                setFeedback(`💚 回复${val}生命`, '#44ff88');
                break;
            }
            // v9.23: E04「移速减慢」删除——和 E14「延缓」、轨迹迟缓三套减速重叠。
            // G.buffs.slowAll 字段本身保留（冰轨永冻 / 时间膨胀器还在写它）。
            case 'E06':
                G.buffs.trailDmg = Math.min(G.buffs.trailDmg + 1, 100);
                G.buffs.trailWidth = Math.min(G.buffs.trailWidth + 2, 150);
                if (!isInitial) setFeedback(`⬆️ 轨迹伤害+1，宽度+2`, '#66ddff');
                break;
            case 'E07':
                if (!isInitial) {
                    const count = explodeTrails(p.x, p.y, 200);
                    setFeedback(`💣 引爆${count}段轨迹`, '#ff6633');
                    if (count > 0) addScore(count * 2);
                }
                break;
            case 'E10':
                if (!isInitial && G.monsters.length > 0) {
                    const dmg = Math.floor(60 * (2 + getDifficultyMultiplier()) / 3);
                    G.monsters.forEach(m => {
                        m.hp = Math.max(0, m.hp - dmg);
                        spawnParticles(m.x, m.y, '#ff6644', 4);
                        showFloatingText(m.x, m.y - m.r, '-' + dmg, '#ff6644');
                    });
                    setFeedback(`🔄 怪物反噬！全场${G.monsters.length}只怪物各受${dmg}点伤害`, '#ff6644');
                }
                break;
            case 'E11':
                G.buffs.speedUp += 0.35;
                if (!isInitial) setFeedback(`💨 移速+35% (累计x${G.buffs.speedUp.toFixed(1)})`, '#88ddff');
                break;
            case 'E12':
                if (!isInitial && G.chainCooldown <= 0 && G.monsters.length > 0) {
                    G.chainCooldown = 30;
                    const origin = G.monsters.reduce((a, b) => dist(G.player, a) < dist(G.player, b) ? a : b);
                    const chainDmg = Math.floor(20 + G.buffs.atkUp * 0.6 + G.floor * 2);
                    origin.hp -= chainDmg;
                    spawnParticles(origin.x, origin.y, '#88ccff', 8);
                    showFloatingText(origin.x, origin.y - origin.r, '-' + chainDmg, '#88ccff');
                    // v9.22: 闪电链不再给终极技充能（改固定时间回复）
                    let chained = 0;
                    for (const m of G.monsters) {
                        if (m === origin || chained >= 4) break;
                        if (dist(origin, m) < 180) {
                            const cd = Math.floor(chainDmg * (1 - chained * 0.25));
                            m.hp -= cd;
                            spawnParticles(m.x, m.y, '#88ccff', 4);
                            showFloatingText(m.x, m.y - m.r, '-' + cd, '#88ccff');
                            chained++;
                        }
                    }
                    setFeedback(`⚡ 闪电链！主目标${chainDmg}伤害，连锁${chained}只`, '#88ccff');
                }
                break;
            case 'E13': {
                if (!isInitial) {
                    // v9.19: 冰冻时长 −10%（20→18 / 60→54）
                    const freezeDuration = isHighFreq ? 18 : 54;
                    let frozenCount = 0;
                    // v9.23: 作用对象 = 命中目标 + 周围 90px（原来是全场随机 65%）
                    for (const m of effectAoeTargets(target)) {
                        if (m.isBoss) continue;   // BOSS 仍然免疫冰冻
                        m.frozen = Math.min((m.frozen || 0) + freezeDuration, 180);
                        spawnParticles(m.x, m.y, '#aaddff', 4);
                        frozenCount++;
                    }
                    if (frozenCount > 0) {
                        setFeedback(`❄️ 冰冻${frozenCount}只怪物 ${Math.floor(freezeDuration / 60)}秒`, '#aaddff');
                    }
                }
                break;
            }
            case 'E14': {
                // v9.19「延缓」：降低怪物 20% 移动速度 1 秒。
                // 减速是限时的，所以挂在怪物自己的 slowTimer 上，在速度公式里乘一次。
                // v9.23: 作用对象 = 命中目标 + 周围 90px（原来是全场）。
                if (!isInitial) {
                    const slowDuration = isHighFreq ? 30 : 60;   // 0.5s / 1s
                    const targets = effectAoeTargets(target);
                    for (const m of targets) {
                        m.slowTimer = Math.max(m.slowTimer || 0, slowDuration);
                    }
                    if (targets.length > 0) {
                        setFeedback(`⏳ 延缓${targets.length}只怪物 ${(slowDuration / 60).toFixed(1)}秒`, '#c9b3ff');
                        spawnParticles(targets[0].x, targets[0].y, '#c9b3ff', 14);
                    }
                }
                break;
            }
        }
        updateUI();
    }

    // ---------- 得分系统 ----------
    // v9.15: 分数改对数显示。后期分数会跨十几个数量级，印原数没人看得懂。
    function fmtScore(n) {
        if (!(n > 0)) return 'lg 0.00';
        return 'lg ' + Math.log10(n).toFixed(2);
    }

    function addScore(amount) {
        // v9.15: 倍率系统整个删掉。以前这里还偷偷把 comboCount +1，
        // 于是一个「连击」计数器数的是加分事件次数（子弹命中、每帧跳分、
        // 炮台全都算），整局只增不减，分数被它乘到 ×405。
        // 现在得分就是得分，连杀另有 G.killStreak 负责，且真的会断。
        G.score += Math.floor(amount);
        // v9.22: 连杀爆发的检测块整块删除，见 00-data.js 的说明。
        updateUI();
    }

    // v9.15: 连杀 = 连续击杀。3 秒没有击杀、或核心挨打就断。
    // 计时用 G.lastKillFrame，在击杀处刷新；这里每帧检查一次。
    // v9.22: 连杀爆发删掉之后，这个计数器唯一的消费方是 T08「连环击杀」。
    const KILL_STREAK_WINDOW = 180; // 3 秒
    function breakKillStreak() {
        G.killStreak = 0;
    }
    function tickKillStreak() {
        if (G.killStreak > 0 && G.frame - G.lastKillFrame > KILL_STREAK_WINDOW) breakKillStreak();
    }

    // v9.15: 击杀统一入口。以前 G.killStreak++ 散落在两个击杀分支里，
    // 且没有任何地方刷新「最近一次击杀」的时间戳，所以连杀永远不会断。
    function registerKill() {
        G.killCount++;
        G.killStreak++;
        G.floorKills++;
        G.lastKillFrame = G.frame;
        if (G.killStreak > G.maxCombo) G.maxCombo = G.killStreak;
    }

    // ---------- 怪物生成 ----------
    function spawnMonster(forced) {
        const diff = getDifficultyMultiplier();
        const eliteChance = G.forceEliteWave ? 1.0 : getEliteChance();

        // v9.4: 从画布四边外随机进场（v9.22: 'ambush' 伏击波分支删除——
        // STAGE_TYPES 和 NODE_POOL 里都没有这个类型，永远走不到）
        let x, y;
        const pad = 30;
        const w = G.canvasWidth || 780;
        const h = G.canvasHeight || 560;
        {
            const side = randInt(0, 3);
            if (side === 0) { x = rand(-pad, w + pad); y = -pad; }
            else if (side === 1) { x = w + pad; y = rand(-pad, h + pad); }
            else if (side === 2) { x = rand(-pad, w + pad); y = h + pad; }
            else { x = -pad; y = rand(-pad, h + pad); }
        }

        const isElite = forced ? !!forced.elite : Math.random() < eliteChance;

        let typePool = MONSTER_TYPE_LIST.filter(t => !t.isBoss);
        // v9.6: 使用关卡类型权重
        const stageDef = STAGE_TYPES.find(s => s.id === G.stageType);
        const stageWeights = stageDef ? stageDef.weights : {};
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
        let r = Math.random() * totalWeight;
        let selectedType = typePool[0];
        for (let i = 0; i < typePool.length; i++) {
            r -= weights[i];
            if (r <= 0) { selectedType = typePool[i]; break; }
        }

        // 教程：类型由脚本钦定，绕过解锁门槛与权重（按 id 查，MONSTER_TYPES 的键是大写）
        const type = forced ? (MONSTER_TYPE_LIST.find(t => t.id === forced.key) || selectedType) : selectedType;

        // v9.1: 精英词缀分配（v9.24: 抽池逻辑挪到 00-data.js 的 pickAffixes()；
        // v9.25: 只有 BOSS 专属的那 8 个不再从这里出——bossOnly: false 限定老 6 个）
        let affixes = [];
        if (isElite) {
            // 教程钦定的精英一定带词缀，否则「精英带词缀」这句教学会落空
            const affixCount = (forced && forced.elite) ? Math.max(1, getAffixCount()) : getAffixCount();
            affixes = pickAffixes(affixCount, { bossOnly: false });
        }

        let hpMult = 1;
        if (G.stageType === 'siege') hpMult = 2;
        if (forced && forced.hpMul) hpMult *= forced.hpMul; // 教程：压低前几层的血量
        // v9.24: 最后再乘一次 MONSTER_STAT_MUL（HP 与攻击各 −20%）。
        // 放在这里而不是打进各分档里，是为了让「−20%」在代码里只有一个出处。
        let hp = (isElite ?
            (type.baseHp + type.hpScale * 1.5) * diff :
            (type.baseHp + type.hpScale) * diff) * hpMult * MONSTER_STAT_MUL;
        let spd = isElite ?
            (type.baseSpeed + type.speedScale * 1.2) * Math.min(diff, 3.0) :
            (type.baseSpeed + type.speedScale) * Math.min(diff, 3.0);
        // v9.15: 攻击不再第 10 层就冻结。旧写法 ×Math.min(diff,4.0) 让怪物伤害
        // 永远停在 24 点，配合玩家的 100 点护盾，等于「永远不会死」。
        // 改成随难度缓涨（0.35 次幂）并留 12 倍安全阀。
        let atk = (isElite ?
            (type.baseAtk + type.atkScale * 1.3) * Math.min(Math.pow(diff, 0.35), 12) :
            (type.baseAtk + type.atkScale) * Math.min(Math.pow(diff, 0.35), 12)) * MONSTER_STAT_MUL;
        let radius = isElite ? type.eliteRadius : type.radius;

        // 巨人词缀：HP和体型翻倍
        if (affixes.includes('giant')) { hp *= 2;
            radius *= 1.5; }
        // 迅捷词缀：速度+40%
        if (affixes.includes('swift')) spd *= 1.4;

        const monster = {
            x,
            y,
            r: radius,
            // v9.15: 去掉血量上限。旧写法 Math.min(hp, 10000) 让普通怪在第 37 层
            // 就撞顶，之后每层的怪一模一样——游戏在那之后其实已经结束了，
            // 只是分数还在按难度指数往上乘。留 1e9 纯防溢出。
            hp: Math.min(hp, 1e9),
            maxHp: Math.min(hp, 1e9),
            speed: Math.min(spd * (1 - G.buffs.slowAll), 6.0),
            isElite,
            atk: Math.min(atk, 120),
            hitCooldown: 0,
            trailDamageCooldown: 0,
            scoreValue: isElite ? type.eliteScoreValue * diff : type.scoreValue * diff,
            type: type.id,
            typeLabel: type.label,
            typeEmoji: type.emoji,
            color: isElite ? type.eliteColor : type.color,
            isHealer: type.isHealer || false,
            healAmount: (type.healAmount || 3) * Math.min(diff, 2.5),
            isSplitter: type.isSplitter || false,
            splitCount: type.splitCount || 2,
            canSplit: true,
            healCooldown: 0,
            isChild: false,
            isScorcher: type.isScorcher || false,
            fireTrailInterval: type.fireTrailInterval || 8,
            fireTrailLife: type.fireTrailLife || 150,
            isWraith: type.isWraith || false,
            bulletResist: type.bulletResist || 0,
            moveInterval: type.moveInterval || 60,
            moveTimer: rand(0, (type.moveInterval || 60) * 2),
            isMoving: Math.random() < 0.5,
            alwaysMoving: G.floor >= 10 && Math.random() < Math.min(0.10 + 0.09 * (G.floor - 10), 1.0),
            affixes: affixes,
            frozen: 0,
            stunned: 0,
            slowTimer: 0,   // v9.19: E14「延缓」的剩余帧数，>0 时移速 ×0.8
            vx_prev: 0,
            vy_prev: 0,
            _fireCounter: 0,
            // v9.24: 词条钩子的运行时状态，见 05-update.js 的 tickAffixes()
            _affixTimer: 0,     // 通用帧计数（火焰区 / 突进 / 群生共用）
            _dash: null,        // 突进：{ tx, ty, t }，t 倒数到 0 为止
            _swarmCount: 0,     // 群生：已经分裂出几只残影
            _affixZones: [],    // 本帧生效的区域，只给渲染用（见 06-render.js）
        };
        G.monsters.push(monster);
    }

    // ---------- 调试生成 ----------
    const DEBUG_TYPE_KEYS = ['basic', 'fast', 'tank', 'healer', 'splitter', 'scorcher', 'wraith', 'boss'];
    function spawnDebugMonster(typeKey) {
        if (typeKey === 'boss') {
            spawnBoss();
            return;
        }
        const type = MONSTER_TYPES[typeKey.toUpperCase()];
        if (!type) return;
        const p = G.player; const diff = getDifficultyMultiplier();
        let hp = (type.baseHp + type.hpScale) * diff;
        let spd = (type.baseSpeed + type.speedScale) * Math.min(diff, 3.0);
        let atk = (type.baseAtk + type.atkScale) * Math.min(diff, 4.0);
        const isElite = Math.random() < getEliteChance();
        let radius = isElite ? type.eliteRadius : type.radius;

        // v9.1 词缀（v9.25: 改用 pickAffixes()——这里原本内联复制了一份抽池逻辑，
        // 是唯一绕开 pickAffixes 的地方，改抽池规则时最容易漏掉。调试生成看全池，
        // 所以传 'any'。）
        let affixes = [];
        if (isElite) {
            affixes = pickAffixes(getAffixCount(), { bossOnly: 'any' });
        }
        if (affixes.includes('giant')) { hp *= 2;
            radius *= 1.5; }
        if (affixes.includes('swift')) spd *= 1.4;

        const angle = rand(0, Math.PI * 2); const d = 80 + rand(0, 60);
        const monster = {
            x: p.x + Math.cos(angle) * d, y: p.y + Math.sin(angle) * d,
            r: radius,
            hp: Math.min(hp, 10000), maxHp: Math.min(hp, 10000),
            speed: Math.min(spd * (1 - G.buffs.slowAll), 6.0),
            isElite, atk: Math.min(atk, 80),
            hitCooldown: 0, trailDamageCooldown: 0,
            scoreValue: isElite ? type.eliteScoreValue * diff : type.scoreValue * diff,
            type: type.id, typeLabel: type.label, typeEmoji: type.emoji,
            color: isElite ? type.eliteColor : type.color,
            isHealer: type.isHealer || false,
            healAmount: (type.healAmount || 3) * Math.min(diff, 2.5),
            isSplitter: type.isSplitter || false, splitCount: type.splitCount || 2,
            canSplit: true, healCooldown: 0, isChild: false,
            isScorcher: type.isScorcher || false, fireTrailInterval: type.fireTrailInterval || 8,
            fireTrailLife: type.fireTrailLife || 150,
            isWraith: type.isWraith || false, bulletResist: type.bulletResist || 0,
            moveInterval: type.moveInterval || 60,
            moveTimer: rand(0, (type.moveInterval || 60) * 2),
            isMoving: Math.random() < 0.5,
            alwaysMoving: G.floor >= 10 && Math.random() < Math.min(0.10 + 0.09 * (G.floor - 10), 1.0),
            affixes: affixes,
            frozen: 0,
            stunned: 0,
            slowTimer: 0,   // v9.19: E14「延缓」的剩余帧数，>0 时移速 ×0.8
            vx_prev: 0,
            vy_prev: 0,
            _fireCounter: 0,
            // v9.24: 词条钩子的运行时状态，见 05-update.js 的 tickAffixes()
            _affixTimer: 0,     // 通用帧计数（火焰区 / 突进 / 群生共用）
            _dash: null,        // 突进：{ tx, ty, t }，t 倒数到 0 为止
            _swarmCount: 0,     // 群生：已经分裂出几只残影
            _affixZones: [],    // 本帧生效的区域，只给渲染用（见 06-render.js）
        };
        G.monsters.push(monster);
        spawnParticles(monster.x, monster.y, type.color, 8);
        const affixInfo = affixes.length > 0 ? ' [' + affixes.map(a => AFFIXES.find(af => af.id === a).emoji).join('') + ']' : '';
        setFeedback(`🐛 调试：生成 ${type.emoji} ${type.label} (HP${Math.floor(monster.hp)})${affixInfo}`, '#88ccff');
    }

    // ---------- 分裂逻辑 ----------
    function splitMonster(m) {
        if (!m.canSplit || !m.isSplitter) return;
        const count = Math.min(m.splitCount + Math.floor(G.floor / 10), 4);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
            const dist2 = 30 + rand(0, 20);
            const child = {
                x: m.x + Math.cos(angle) * dist2,
                y: m.y + Math.sin(angle) * dist2,
                // v9.24: 不额外乘 MONSTER_STAT_MUL——子体的 hp/atk 都是从母体派生的，
                // 母体在 spawnMonster() 里已经吃过那一刀了，这里再乘就是 −36%。
                r: m.r * 0.55,
                hp: m.maxHp * 0.3,
                maxHp: m.maxHp * 0.3,
                speed: m.speed * 1.3,
                isElite: false,
                atk: m.atk * 0.4,
                hitCooldown: 0,
                trailDamageCooldown: 0,
                scoreValue: m.scoreValue * 0.2,
                type: 'split_child',
                typeLabel: '子体',
                typeEmoji: '🟢',
                color: '#88cc66',
                isHealer: false,
                healAmount: 0,
                isSplitter: false,
                canSplit: false,
                healCooldown: 0,
                isChild: true,
                moveInterval: 40,
                moveTimer: rand(0, 80),
                isMoving: Math.random() < 0.5,
                alwaysMoving: G.floor >= 10 && Math.random() < Math.min(0.10 + 0.09 * (G.floor - 10), 1.0),
                // v9.24: 子体不带词条（_zones 之类仍然给全套空值，tickAffixes 会逐只过）
                affixes: [],
                frozen: 0, stunned: 0, slowTimer: 0,
                vx_prev: 0, vy_prev: 0, _fireCounter: 0,
                _affixTimer: 0, _dash: null, _swarmCount: 0, _affixZones: [],
            };
            G.monsters.push(child);
            spawnParticles(child.x, child.y, '#88cc66', 4);
        }
        Tutorial.emit('split');
    }

    // ---------- BOSS ----------
    function spawnBoss() {
        const type = MONSTER_TYPES.BOSS;
        const hp = getBossHp();
        const w = G.canvasWidth || 780, h = G.canvasHeight || 560;
        const side = randInt(0, 3), pad = 50;
        let x, y;
        if (side === 0) { x = rand(pad, w - pad); y = -pad; }
        else if (side === 1) { x = w + pad; y = rand(pad, h - pad); }
        else if (side === 2) { x = rand(pad, w - pad); y = h + pad; }
        else { x = -pad; y = rand(pad, h - pad); }
        const boss = {
            x, y, r: type.radius,
            // v9.15: 上限从 120 万大幅提高（旧上限第 60 层就撞顶，
            // 而下面的提示语印的是未钳的 hp，两个数对不上）。
            hp: Math.min(hp, 1e8), maxHp: Math.min(hp, 1e8),
            speed: type.baseSpeed * (1 - G.buffs.slowAll),
            // v9.25: 攻击也吃前期减压系数（用户说的是「数值」，HP 与攻击都算）。
            isElite: false,
            atk: type.baseAtk * Math.min(Math.pow(getDifficultyMultiplier(), 0.35), 12) * bossEarlyMul(),
            hitCooldown: 0, trailDamageCooldown: 0,
            scoreValue: type.scoreValue * getDifficultyMultiplier(),
            type: type.id, typeLabel: type.label, typeEmoji: type.emoji,
            color: type.color, isHealer: false, healAmount: 0,
            isSplitter: false, canSplit: false,
            healCooldown: 0, isChild: false, isBoss: true,
            spawnTimer: bossSummonInterval(type.spawnInterval),   // v9.23: 召唤速率 +5%
            moveInterval: type.moveInterval, moveTimer: rand(0, 120),
            isMoving: true, alwaysMoving: true,
            // v9.24: BOSS 从词条池里随机带 2 个。
            // v9.25: 只有 BOSS 能抽到 bossOnly 的那 8 个（'any' = 14 个全池）。
            // 排除 dash 与 swarm——BOSS 已经是 alwaysMoving，本体也已经有专属的爪牙
            // 召唤器，这两条对它属于「已经有的东西的弱化版」，白占 2 个槽位之一。
            affixes: pickAffixes(2, { exclude: ['dash', 'swarm'], bossOnly: 'any' }),
            _affixTimer: 0, _dash: null, _swarmCount: 0, _affixZones: [],
        };
        G.monsters.push(boss);
        spawnParticles(x, y, '#ff2266', 35);
        setFeedback(`👑 BOSS登场！HP ${Math.floor(hp)} · 第${G.floor}波`, '#ff3366');
        // v9.25: 战斗界面顶部横幅，把这一局抽到的词条直接念给玩家听。
        // 词条只在怪身上画一圈色环，战斗中根本读不出来。
        G.bossBanner = {
            text: '👑 BOSS · ' + boss.affixes.map(id => {
                const d = affixDef(id);
                return d ? `${d.emoji}${d.label}` : id;
            }).join(' · '),
            life: 300, maxLife: 300,   // 5 秒
        };
    }

    function spawnBossMinion(boss) {
        const types = ['basic', 'fast', 'tank'];
        const typeId = types[Math.floor(Math.random() * types.length)];
        const type = MONSTER_TYPES[typeId.toUpperCase()] || MONSTER_TYPES.BASIC;
        const diff = getDifficultyMultiplier();
        const angle = rand(0, Math.PI * 2);
        const d = boss.r + 30 + rand(10, 40);
        const m = {
            x: boss.x + Math.cos(angle) * d, y: boss.y + Math.sin(angle) * d,
            r: type.radius * 0.8,
            hp: (type.baseHp + type.hpScale) * diff * 0.5,
            maxHp: (type.baseHp + type.hpScale) * diff * 0.5,
            speed: type.baseSpeed * 1.2 * (1 - G.buffs.slowAll),
            isElite: false, atk: type.baseAtk * 0.5,
            hitCooldown: 0, trailDamageCooldown: 0,
            scoreValue: type.scoreValue * 0.3,
            type: type.id, typeLabel: '爪牙', typeEmoji: type.emoji,
            color: type.color, isHealer: false, healAmount: 0,
            isSplitter: false, canSplit: false,
            healCooldown: 0, isChild: true, isBoss: false,
            moveInterval: 40, moveTimer: rand(0, 80), isMoving: true,
            alwaysMoving: Math.random() < 0.5,
            // v9.24: 爪牙不带词条
            affixes: [],
            frozen: 0, stunned: 0, slowTimer: 0,
            vx_prev: 0, vy_prev: 0, _fireCounter: 0,
            _affixTimer: 0, _dash: null, _swarmCount: 0, _affixZones: [],
        };
        G.monsters.push(m);
        spawnParticles(m.x, m.y, '#ff4466', 3);
    }

    // ---------- 治疗逻辑 ----------
    function applyHealing() {
        for (const m of G.monsters) {
            if (!m.isHealer) continue;
            m.healCooldown--;
            if (m.healCooldown <= 0) {
                m.healCooldown = Math.max(40, 60 - G.floor * 0.3);
                for (const other of G.monsters) {
                    if (other === m) continue;
                    if (dist(m, other) < 180) {
                        other.hp = Math.min(other.maxHp, other.hp + m.healAmount);
                        spawnParticles(other.x, other.y, '#44ff88', 1);
                        showFloatingText(other.x, other.y - other.r, '+' + Math.floor(m.healAmount), '#44ff88');
                    }
                }
                m.hp = Math.min(m.maxHp, m.hp + m.healAmount * 0.5);
                spawnParticles(m.x, m.y, '#44ff88', 2);
                showFloatingText(m.x, m.y - m.r, '+' + Math.floor(m.healAmount * 0.5), '#44ff88');
            }
        }
    }

    // ============================================================
    //  新手教程 · 古老的石板 1-5（AI 拓展版）
    //  —— 数据驱动：TUTORIAL_FLOORS 描述脚本，Tutorial 负责调度与绘制
    //  触发类型：enter(进入延时) / after(上一条结束后) / move(累计移动)
    //           kill(本层击杀) / clear(清空) / slots(两槽填满)
    //           essence(精华≥n) / sprint(按住Shift) / map(节点地图已开)
    //           event(具名事件：hit/pickup/combine/chair/split/loop/enclosure/ultimate)
    // ============================================================
    // v9.24: TUTORIAL_MAX_FLOOR 删除——它唯一的用途是 skip() 里把玩家空降到第 6 层，
    // 而「跳过教程」现在和「播完教程」一样走清空重开（见 03-tutorial.js）。
    const TUTORIAL_TIMEOUT = 25 * 60; // 25s：先给更直白的提示
    const TUTORIAL_FORCE = 20 * 60;   // 再 20s：自动放行，绝不卡流程
    const TUTORIAL_FONT = '"Courier New","PingFang SC","Microsoft YaHei",monospace';

