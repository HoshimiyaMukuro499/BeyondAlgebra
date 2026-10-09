    // ---------- 核心游戏逻辑 ----------
    function startFloor() {
        // v9.24: 词条留下的场地残留逐层清空。敌图腾与「封印」都是挂在上一层的
        // 产物，带到下一层会变成没来由的持续掉血 / 被动失灵。
        G.enemyTotems.length = 0;
        G.sealedPassives.length = 0;
        G.affixZones.length = 0;   // v9.25: 圈层同理——上一层的削减圈不该跟着进门
        // 教程层：走脚本出怪，不走加权随机
        Tutorial.onFloorStart();
        if (Tutorial.tookOver) {
            G.monstersToSpawn = Tutorial.spawnQueue.length;
            G.spawnTimer = Tutorial.spawnInterval || getSpawnInterval();
            G.floorKills = 0; G.floorCardsObtained = 0;
            G.essenceThisFloor = 0;   // v9.18: 每层战斗精华上限从这里重新起算
            G.bossPending = false; G.bossSpawned = false;
            addScore(G.floor * 5);
            logEvent('floor_start', { stageType: 'tutorial', monsterCount: G.monstersToSpawn, isBoss: false, snapshot: snapshotStats() });
            setFeedback(`🌊 第 ${G.floor} 层 · 教程 (${G.monstersToSpawn}只)`, '#7bb3ff');
            return;
        }
        const st = STAGE_TYPES.find(s => s.id === G.stageType) || STAGE_TYPES[0];
        const isBoss = st.isBoss || G.floor % 10 === 0;
        const count = getMonsterCount();
        G.monstersToSpawn = count; G.spawnTimer = 0;
        G.floorKills = 0; G.floorCardsObtained = 0;
        G.essenceThisFloor = 0;   // v9.18: 每层战斗精华上限从这里重新起算
        logEvent('floor_start', { stageType: G.stageType, monsterCount: count, isBoss, snapshot: snapshotStats() });
        G.bossPending = false; G.bossSpawned = false;
        const diff = getDifficultyMultiplier();
        if (G.relicBuffs.waveHeal) {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * G.relicBuffs.waveHeal);
        }
        if (G.floor % 3 === 0) generateTerrain();
        addScore(G.floor * 5);
        if (isBoss) {
            spawnBoss(); G.bossPending = true; G.bossSpawned = true;
            setFeedback(`👑 第${G.floor}层 ${st.icon}${st.label} BOSS! (${count}只) 难度×${diff.toFixed(2)}`, '#ff3366');
        } else {
            setFeedback(`${st.icon} 第${G.floor}层 ${st.label} (${count}只) 难度×${diff.toFixed(2)}`, '#ffb347');
        }
    }

    // v9.25: 玩家一发的基准威力（不含圈层削减、狂暴、暴击这些一次性修正）。
    // 子弹伤害与图腾伤害都从这里派生——图腾攻击力锁死为它的 0.4 倍（TURRET_ATK_RATIO），
    // 抽成一个函数是为了让那个比例只有一个来源，不会两边各写一份乘数然后慢慢走散。
    function getPlayerAttackPower() {
        const p = G.player;
        return (p.atk + G.buffs.atkUp) * (1 + G.buffs.multUp)
            * G.fateBuffs.atkMul * G.fateBuffs.bulletDmgMul * 1.15;
    }

    function autoShoot() {
        if (G.gameOver) return;
        if (G.monsters.length === 0) return;
        const p = G.player;
        if (p.shootCooldown > 0) return;

        let priorityTargets = G.monsters.filter(m => m.isBoss || m.isHealer || m.isElite);
        let targets = priorityTargets.length > 0 ? priorityTargets : G.monsters;
        let nearest = null,
            nearestDist = Infinity;
        for (const m of targets) {
            const d = dist(p, m);
            if (d < nearestDist) { nearestDist = d;
                nearest = m; }
        }
        if (!nearest) return;
        G.target = nearest;

        const angle = angleTo(p, nearest);
        const spread = 0.08;
        const speed = 7;
        // v9.19: 射速降到 1/4，单发伤害补 15%，免得整体输出腰斩
        let atk = getPlayerAttackPower();
        // v9.24: 「削减区」词条——玩家站在怪身边开火时子弹伤害打折。
        // 这里是子弹伤害唯一的出口，改这一处就覆盖主弹与额外弹丸（额外弹丸在下面按 atk 的 0.6 派生）。
        // 只压子弹，不压轨迹——轨迹是玩家的核心输出手段，一起压会让这条词条变成纯粹的数值墙。
        atk *= getPlayerAtkZoneMul();
        // v9.4: 低血量狂暴
        if (G.relicBuffs.lowHpBerserk && G.player.hp < G.player.maxHp * 0.3) atk *= 2;
        // v9.4: 暴击
        if (G.relicBuffs.critChance && Math.random() < G.relicBuffs.critChance) atk *= 2;
        // 发射主弹
        G.bullets.push({
            x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22,
            vx: Math.cos(angle + rand(-spread, spread)) * speed,
            vy: Math.sin(angle + rand(-spread, spread)) * speed,
            r: 4, damage: atk, life: 60, hit: false, isCrit: atk > (p.atk + G.buffs.atkUp) * 2,
        });
        // v9.4: 额外弹丸
        const extraBullets = G.extraBullets || 0;
        for (let eb = 0; eb < extraBullets; eb++) {
            const eAngle = angle + rand(-0.2, 0.2);
            G.bullets.push({
                x: p.x + Math.cos(eAngle) * 22, y: p.y + Math.sin(eAngle) * 22,
                vx: Math.cos(eAngle) * speed, vy: Math.sin(eAngle) * speed,
                r: 3, damage: atk * 0.6, life: 50, hit: false, isCrit: false,
            });
        }
        // v9.19: 闸门整体 ×4——只改 G.fireRate 不改这里的话，冷却会卡住射速，改动不生效
        // v9.25: 再整体 ÷1.2（开火频率 +20%）。地板和上限一起缩，否则后期会被
        // Math.max(24, …) 的地板吃掉，看着改了其实没生效。
        p.shootCooldown = Math.max(24, 48 - G.floor * 0.32) / PLAYER_FIRE_RATE_MUL;
    }

    function getTrailDamage() {
        return (G.buffs.trailDmg + Math.log2(G.floor + 1) * 0.5) * G.fateBuffs.trailDmgMul;
    }

    function getTrailWidth() {
        return G.buffs.trailWidth;
    }

    function addTrail(x1, y1, x2, y2) {
        const baseLife = 360 + (G.trailLifeBonus || 0);
        G.trails.push({ x1, y1, x2, y2, life: baseLife, layer: 1, trailType: G.activeTrailType });
        if (G.trails.length > 120) G.trails.shift();
    }

    function explodeTrails(cx, cy, radius) {
        let count = 0;
        for (let i = G.trails.length - 1; i >= 0; i--) {
            const t = G.trails[i];
            const mx = (t.x1 + t.x2) / 2,
                my = (t.y1 + t.y2) / 2;
            if (dist({ x: mx, y: my }, { x: cx, y: cy }) < radius) {
                const dmg = 30 + G.buffs.trailDmg * 4;
                G.monsters.forEach(m => {
                    if (dist(m, { x: mx, y: my }) < 60) {
                        m.hp -= dmg;
                        spawnParticles(m.x, m.y, '#ff8844', 6);
                        showFloatingText(m.x, m.y - m.r, '-' + dmg, '#ff6633');
                    }
                });
                G.trails.splice(i, 1);
                count++;
                spawnParticles(mx, my, '#ffaa44', 8);
            }
        }
        return count;
    }


    // ---------- v9.17 轨迹判环 ----------
    // 判的是「当前存留的轨迹」本身（G.trails），不再是玩家走过的路径。
    // 轨迹是玩家连续画出来的一条链，所以数组顺序就是路径顺序：取每段中点，
    // 按 LOOP_GRID 吸附成节点，第一次撞见重复节点即认为环闭合。
    const LOOP_GRID = 10;      // 节点吸附粒度(px)
    const LOOP_MIN_NODES = 8;  // 环至少 8 个节点，滤掉来回抖动
    const LOOP_MIN_AREA = 800; // 沿用 v9.12 的面积阈值(px²)
    let _loopCD = 0;

    function checkTrailLoop() {
        if (_loopCD > 0) { _loopCD--; return; }
        if (G.frame % 6 !== 0) return;   // 每 6 帧查一次足够——轨迹每 2 帧才加一段
        const segs = G.trails;
        if (segs.length < LOOP_MIN_NODES) return;

        const poly = segs.map(s => ({ x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 }));
        const first = new Map();
        const cands = [];
        for (let i = 0; i < poly.length; i++) {
            const k = Math.round(poly[i].x / LOOP_GRID) + ',' + Math.round(poly[i].y / LOOP_GRID);
            if (first.has(k)) {
                const j = first.get(k);
                if (i - j >= LOOP_MIN_NODES) cands.push([j, i]);
            } else first.set(k, i);
        }
        if (cands.length === 0) return;

        // 从最近的候选环往前找：玩家刚画完的那个环优先。
        // 不能只看第一个候选——轨迹里可能残留一条又细又扁的旧自交，
        // 它面积不够，会永远挡在真正的大环前面。
        let found = null;
        for (let ci = cands.length - 1; ci >= 0 && ci >= cands.length - 12; ci--) {
            const lp = poly.slice(cands[ci][0], cands[ci][1] + 1);   // 环上的点，首尾同一个节点
            let sa = 0;
            for (let i = 0; i < lp.length; i++) { const j = (i + 1) % lp.length; sa += lp[i].x * lp[j].y - lp[j].x * lp[i].y; }
            const ar = Math.abs(sa) / 2;
            if (ar < LOOP_MIN_AREA) continue;
            let px = 0, py = 0;
            for (let i = 0; i < lp.length; i++) { const j = (i + 1) % lp.length; const c = lp[i].x * lp[j].y - lp[j].x * lp[i].y; px += (lp[i].x + lp[j].x) * c; py += (lp[i].y + lp[j].y) * c; }
            found = { area: ar, cx: px / (3 * sa), cy: py / (3 * sa) };
            break;
        }
        if (!found) return;
        const area = found.area, cx = found.cx, cy = found.cy;

        // v9.20: 血量降到原来的 30%（5/12/20 → 1.5/3.6/6，取整为 2/4/6）。
        // 注意 05-update.js 里怪打塔是 max(1, round(atk*0.05))，绝大多数怪
        // 全程都压在下限 1 点上，所以这里的数字≈「能挨几下」。
        const tier = area < 2000 ? { t: '小环', m: .6, hp: 2, b: '🥉小闭环' }
            : area < 8000 ? { t: '中环', m: 1, hp: 4, b: '🥈闭环' }
                : { t: '大环', m: 1.5, hp: 6, b: '🥇大闭环！' };

        // 同一个环只出一座塔；塔碎了才会把这个 key 删掉，环于是重新武装
        const loopKey = Math.round(cx / 24) + ',' + Math.round(cy / 24) + ',' + tier.t;
        if (G.turretLoops[loopKey]) return;

        // v9.21: 图腾数量上限。注意这里是「先 return、不登记 key」——环保持武装状态，
        // 一旦有位置腾出来，下一轮检查就会把它补上，玩家不用重画。
        // checkTrailLoop 每 15 帧跑一次，所以提示要节流，否则满上限时会刷屏。
        if (G.turrets.length >= G.maxTurrets) {
            if (G.frame - (G.turretCapHintFrame || -999) > 120) {
                G.turretCapHintFrame = G.frame;
                setFeedback(`🗼 图腾已满 ${G.turrets.length}/${G.maxTurrets}——碎裂或扩容后才能再召唤`, '#88aacc');
            }
            return;
        }

        let turType = 'basic';
        if (G.passives['T12']) {
            for (const pv of G.passives['T12']) {
                if (pv.effectId === 'E01') turType = 'rapid';
                else if (pv.effectId === 'E12') turType = 'lightning';
                else if (pv.effectId === 'E13') turType = 'frost';
                else if (pv.effectId === 'E06') turType = 'trail';
            }
        }
        // v9.25: 表里的单发伤害（d）删掉了——图腾攻击力现在恒为玩家攻击力的 0.4 倍，
        // 在开火那一刻算（见 05-update.js）。类型之间的差别只剩射速、射程与特效。
        const T = { basic: { e: '🗼', c: '#88aacc', fr: 25, rg: 140 }, rapid: { e: '🎯', c: '#ff8844', fr: 8, rg: 120 }, lightning: { e: '⚡', c: '#ffdd44', fr: 40, rg: 180 }, frost: { e: '❄️', c: '#88ccff', fr: 20, rg: 120 }, trail: { e: '🐾', c: '#66dd88', fr: 15, rg: 160 } };
        const d = T[turType];
        const maxHp = tier.hp + (G.turretHpBonus || 0);
        G.turrets.push({ x: clamp(cx, 60, 720), y: clamp(cy, 60, 500), r: 14 * tier.m, type: turType, emoji: d.e, color: d.c, fireRate: Math.floor(d.fr / tier.m), fireTimer: 0, range: d.rg * tier.m, hp: maxHp, maxHp: maxHp, tier: tier.t, loopKey: loopKey, spawnAnim: 20 });
        G.turretLoops[loopKey] = true;
        _loopCD = 30;
        triggerPassive('T12'); addScore(Math.floor(area / 100));
        Tutorial.emit('loop', { tier: tier.t, area: Math.floor(area) });
        setFeedback('⭕' + tier.b + '!' + Math.floor(area) + 'px²', '#ffaa00');
        spawnParticles(cx, cy, '#ffaa00', 18);
        showFloatingText(cx, cy - 10, tier.b, '#ffaa00');
        logEvent('turret', { type: turType, tier: tier.t });
    }

    // 离 m 最近的图腾，没有则 null。怪物在「图腾 / 核心」之间挑更近的那个打。
    function nearestTurret(m) {
        let best = null, bd = Infinity;
        for (const t of G.turrets) {
            const d = dist(m, t);
            if (d < bd) { bd = d; best = t; }
        }
        return best ? { t: best, d: bd } : null;
    }

    // ---------- v9.22 终极技充能：固定时间回复 ----------
    // 回满一槽需要 25 秒 × 60 / (1 + 层数/50) 帧：
    // 第 1 层 24.5s · 第 10 层 20.8s · 第 30 层 15.6s · 第 50 层 12.5s · 第 100 层 8.3s。
    // 改之前是「造成伤害充能」，于是充能速度完全取决于玩家那一下的输出量——
    // 打不动的怪充不动，秒杀的怪一帧回满，同一个 40 层在不同局里能差出十几倍。
    // ultimateChargeMult 仍在（超载 ×2 / 奥术学者 ×1.5 / 第 40 层 ×1.5），
    // 但它现在乘的是**速率**，所以那三处的「充能速度 ×N」文案依然准确。
    const ULT_BASE_FRAMES = 25 * 60;
    function getUltimateChargeFrames() {
        return ULT_BASE_FRAMES / (1 + G.floor / 50);
    }

    // ---------- v9.1 终极技能 ----------
    function activateUltimate() {
        G.ultimateGauge = 0;
        G.ultimateActive = true;
        G.ultimateTimer = 60;
        G.screenFlash = 1.0;
        const trailDmg = G.buffs.trailDmg * 5 + G.floor * 2;
        for (const m of G.monsters) {
            m.stunned = Math.max(m.stunned || 0, 120);
            const d = dist(m, G.core);
            const radius = 350;
            if (d < radius) {
                const falloff = 1 - (d / radius) * 0.7;
                const dmg = Math.floor(trailDmg * falloff * getDifficultyMultiplier());
                m.hp -= dmg;
                spawnParticles(m.x, m.y, '#ffdd44', 8);
                showFloatingText(m.x, m.y - m.r, '-' + dmg, '#ffdd44');
                addScore(Math.floor(dmg * 0.1));
            }
        }
        G.trails = [];
        G.fireTrails = [];
        setFeedback('⚡ 轨迹风暴！全场爆炸 + 眩晕2秒', '#ffdd44');
        addScore(50);
        Tutorial.emit('ultimate');
    }

    function spawnParticles(x, y, color, count = 5) {
        if (G.particles.length + count > PARTICLE_MAX) {
            G.particles.splice(0, G.particles.length + count - PARTICLE_MAX); // 丢最旧的
        }
        for (let i = 0; i < count; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(1, 4);
            G.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: rand(20, 50),
                maxLife: 50,
                r: rand(2, 5),
                color,
            });
        }
    }

    // ---------- 组合密文 ----------
    function combineCards() {
        if (G.combineCooldown || !G.triggerSlot || !G.effectSlot || G.gameOver) return;
        doCombine(G.triggerSlot, G.effectSlot);
        G.triggerSlot = null; G.effectSlot = null;
        G.combineCooldown = true;
        setTimeout(() => { G.combineCooldown = false; }, 300);
        updateUI();
    }

    // v9.21: T13「消除」——v9.25 起不再是密文版，改成玩家的固定技能。
    // 全场怪物各吃 3 倍「怪物反噬」(E10) 的伤害，然后拆掉场上最早生成的那座图腾。
    // 不产生被动、不占槽位——代价换成了 **30 秒冷却**（按 R 触发，见 tryEliminate）。
    //
    // 为什么从卡牌里拿掉：它原本的代价只是「烧掉两张牌」，但抽到与否完全看运气，
    // 而这个效果的量级（清场 + 拆塔）足以决定一波团战的胜负。挂在随机掉落上，
    // 等于把玩家的节奏交给抽卡；变成带冷却的技能后，什么时候按是玩家的决策。
    function activateEliminate() {
        const dmg = Math.floor(60 * (2 + getDifficultyMultiplier()) / 3) * 3;
        let hitCount = 0;
        for (const m of G.monsters) {
            m.hp = Math.max(0, m.hp - dmg);
            spawnParticles(m.x, m.y, '#ff6644', 6);
            showFloatingText(m.x, m.y - m.r, '-' + dmg, '#ff6644');
            hitCount++;
        }
        // G.turrets 是追加序，[0] 就是最早生成的那座
        let cleared = false;
        if (G.turrets.length > 0) {
            const t = G.turrets.shift();
            if (t.loopKey) delete G.turretLoops[t.loopKey];   // 环重新武装，可以再召唤
            spawnParticles(t.x, t.y, '#888888', 16);
            showFloatingText(t.x, t.y - t.r - 6, '🧹 消除', '#88aacc');
            cleared = true;
        }
        spawnParticles(G.player.x, G.player.y, '#ffdd66', 24);
        showNotification('🧹 消除！', '#ffdd66', 200);
        setFeedback(`🧹 消除：全场${hitCount}只怪各受${dmg}点伤害` + (cleared ? '，最早一座图腾被拆掉' : '（场上无图腾可拆）'), '#ffdd66');
        logEvent('eliminate', { damage: dmg, monsters: hitCount, turretCleared: cleared });
    }

    // v9.25: 「消除」的入口。按键（R / 手机端 🧹 圆钮）走这里，卡牌不再有这条路径。
    // 冷却中按下去给一句反馈而不是静默忽略——不然玩家会以为按键没生效。
    function tryEliminate() {
        if (G.gameOver || G.paused || G.selectingActive) return;
        if (G.eliminateCooldown > 0) {
            setFeedback(`🧹 消除冷却中 · 还要 ${(G.eliminateCooldown / 60).toFixed(1)}s`, '#8ab3d0');
            return;
        }
        G.eliminateCooldown = ELIMINATE_COOLDOWN;
        activateEliminate();
    }

    function doCombine(trigger, effect) {
        const triggerId = trigger.id, effectId = effect.id;
        let usedSlots = 0;
        for (const tid of Object.keys(G.passives)) usedSlots += G.passives[tid].length;
        const isUpgrade = G.passives[triggerId] && G.passives[triggerId].some(p => p.effectId === effectId);
        if (!isUpgrade && usedSlots >= G.maxSlots) {
            setFeedback(`⚠️ 槽位已满(${usedSlots}/${G.maxSlots})`, '#ff6644'); return false;
        }
        addPassive(triggerId, effectId);
        logEvent('card_combine', { trigger: triggerId, effect: effectId, chairHit: null });
        let chairHit = null;
        for (const combo of CHAIR_COMBOS) {
            if (combo.trigger === triggerId && combo.effect === effectId) {
                combo.bonus(G); G.chairBonuses++;
                G.activeTrailType = combo.trailType;
                chairHit = combo;
                // update log with chair info
                const last = G.gameLog[G.gameLog.length - 1];
                if (last && last.type === 'card_combine') last.data.chairHit = combo.name;
                break;
            }
        }
        let msg = `${trigger.emoji}${trigger.label}+${effect.emoji}${effect.label} → 被动`;
        if (chairHit) {
            msg += ` 🦽「${chairHit.name}」！${chairHit.desc}`;
            showNotification(`🦽 ${chairHit.name}！`, '#ff8844', 240);
            spawnParticles(G.player.x, G.player.y, '#ff8844', 30);
        }
        if (triggerId === 'T01') { triggerPassive('T01'); }
        if (triggerId === 'T02') { triggerPassive('T02'); }
        if (triggerId === 'T10' && G.player.hp < G.player.maxHp * 0.3) { triggerPassive('T10'); }
        setFeedback(msg, chairHit ? '#ff8844' : '#ffb347');
        Tutorial.emit('combine', { chair: chairHit ? chairHit.id : null });
        if (Tutorial.combos >= 2) Tutorial.emit('combine2');
        if (chairHit) Tutorial.emit('chair', { id: chairHit.id });
        return true;
    }

    // v9.6: 批量宣读（暂停时排队组合）
    function queueBatchCombine() {
        if (!G.paused || !G.triggerSlot || !G.effectSlot) return;
        G.batchQueue.push({ trigger: { ...G.triggerSlot }, effect: { ...G.effectSlot } });
        G.triggerSlot = null; G.effectSlot = null;
        updateBatchUI();
        updateUI();
        setFeedback(`📦 排队 ${G.batchQueue.length} 组密文组合`, '#ffb347');
    }

    function executeBatch() {
        if (G.batchQueue.length === 0) return;
        let count = 0;
        for (const item of G.batchQueue) {
            if (doCombine(item.trigger, item.effect)) count++;
        }
        G.batchQueue = [];
        setFeedback(`📜 批量宣读完成！${count}组被动已激活`, '#ffb347');
        spawnParticles(G.player.x, G.player.y, '#ffb347', 20);
        updateBatchUI();
        updateUI();
    }

    function updateBatchUI() {
        if (G.simMode) return;
        const list = document.getElementById('batchList');
        const btn = document.getElementById('batchCombineBtn');
        if (list) {
            if (G.batchQueue.length === 0) list.innerHTML = '<div style="color:#5a7a9a;font-size:10px;">暂停后在此排队组合</div>';
            else list.innerHTML = G.batchQueue.map((item, i) =>
                `<div style="padding:1px 0;border-bottom:1px solid #1a2a3a;display:flex;justify-content:space-between;"><span>${item.trigger.emoji}${item.trigger.label}+${item.effect.emoji}${item.effect.label}</span><span style="color:#ff6644;cursor:pointer;" data-bi="${i}">✕</span></div>`
            ).join('');
        }
        if (btn) {
            btn.disabled = G.batchQueue.length === 0;
            btn.textContent = `📜 宣读全部 (${G.batchQueue.length}组)`;
        }
        // 绑定删除
        if (list) list.querySelectorAll('[data-bi]').forEach(el => {
            el.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation();
                G.batchQueue.splice(parseInt(this.dataset.bi), 1); updateBatchUI(); });
        });
    }

