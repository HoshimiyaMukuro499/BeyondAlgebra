    // v9.22: 怪物踩到轨迹后挂多少帧迟缓（3 秒 @60fps）。
    // 减速倍数不在这里——沿用 slowTimer 那个 0.8，和 E14「延缓」共用。
    const TRAIL_SLOW_FRAMES = 180;

    // v9.23: 火焰轨迹每秒烧图腾多少血（每帧量）。刻意远低于烧玩家的 0.8/帧——
    // 塔的基础血只有 2/4/6 点，照玩家那个速率小环 3 帧就没了。
    // 0.012/帧 ≈ 0.72 血/秒：小环泡满一条火焰（150 帧）掉 1.8 血，中环要两条、
    // 大环要三条。火焰是「持续压制」而不是「秒拆塔」。
    const FIRE_TURRET_DMG_PER_FRAME = 0.012;

    // v9.25: 🔥「火焰区」火圈的伤害节拍。**不能**照抄上面火轨迹烧玩家的 0.8/帧——
    // 那是一条 16px 长的细线，站上去 150 帧掉 120 血还算合理；火圈是半径 135px、
    // 活 360 帧的大圆，0.8/帧 满吃就是 288 血，等于「进圈即死」。
    // 改成每 6 帧结算 1 点（≈0.167/帧）：穿过（约 0.5 秒）掉 ~5 点，
    // 从头站到尾 6 秒掉 60 点——够疼，逼你动，但走得出去。
    const FIRE_ZONE_TICK = 6;
    const FIRE_ZONE_DMG_PER_TICK = 1;

    // ---------- v9.22 障碍物绕行 ----------
    // 老做法是「下一步会撞上 → 朝障碍中心 ±1.2 弧度随机偏一下、速度砍到 0.6」，
    // 两个毛病：
    //   1. 偏角的符号是随机的，有一半概率把怪推进障碍里，尤其障碍密集时；
    //   2. 偏角是相对「怪 → 障碍中心」算的，怪一旦贴住障碍，朝目标的方向就被
    //      完全忽略，于是它贴着障碍原地打转——就是「走进障碍后卡住」。
    // 改成切向绕行：贴住障碍时沿圆的切线走，两条切线里挑与「怪 → 目标」夹角
    // 更小的那条，于是怪总是从更近的一侧滑过去。再掺一点朝目标的分量，
    // 免得它贴着障碍磨蹭不往前走。
    // 把陷进障碍里的实体沿法线顶到圆面上。玩家碰撞用的也是这套（见 update 开头），
    // 两边的余量保持一致，免得同一堵墙对玩家和怪物表现不一样。
    function pushOutOfTerrain(m, pad) {
        for (const t of G.terrain) {
            const R = t.r + pad;
            let dx = m.x - t.x, dy = m.y - t.y;
            let d = Math.hypot(dx, dy);
            if (d >= R) continue;
            if (d < 1e-6) { dx = 1; dy = 0; d = 1; }   // 正好压在圆心上
            m.x = t.x + dx / d * R;
            m.y = t.y + dy / d * R;
        }
    }

    function steerAroundTerrain(m, mx, my, target, spd) {
        const PAD = m.r + 2;

        // 先把自己从任何已经陷进去的障碍里顶出来。障碍会随楼层重建，
        // 怪也可能被别的怪挤进去——不先做这一步，后面的切线判断没有意义。
        pushOutOfTerrain(m, PAD);

        // 挑「下一步陷得最深」的那个障碍来处理。逐个处理会互相覆盖方向，
        // 只挑一个反而更稳。
        const nx = m.x + mx, ny = m.y + my;
        let worst = null, worstPen = 0;
        for (const t of G.terrain) {
            const pen = (t.r + PAD) - Math.hypot(nx - t.x, ny - t.y);
            if (pen > worstPen) { worstPen = pen; worst = t; }
        }
        if (!worst) return [mx, my];

        // 法线（怪 → 障碍外）与两条切线
        let dx = m.x - worst.x, dy = m.y - worst.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
        const nxn = dx / d, nyn = dy / d;
        const t1x = -nyn, t1y = nxn;

        // 挑和目标方向同侧的那条切线
        let gx = target.x - m.x, gy = target.y - m.y;
        const gl = Math.hypot(gx, gy) || 1e-6;
        gx /= gl; gy /= gl;
        const side = (t1x * gx + t1y * gy) >= 0 ? 1 : -1;

        // 切线 + 一点朝目标的分量，最后归一化回正常速度
        let ox = t1x * side + gx * 0.45;
        let oy = t1y * side + gy * 0.45;
        const ol = Math.hypot(ox, oy) || 1e-6;
        return [ox / ol * spd, oy / ol * spd];
    }

    // ============================================================
    //  v9.24 词条钩子
    // ============================================================
    // 词条从「给怪物自己加数值」翻转成「干扰玩家」。三个统一入口：
    //   tickAffixes(m)     每帧逐怪 —— 区域类 / 火焰区 / 突进 / 群生
    //   onAffixCoreHit(m)  撞核心时 —— 封印
    //   onAffixDeath(m)    死亡时   —— 敌图腾
    // 老的 6 个（再生/荆棘/迅捷/巨人/吸血/爆裂）仍然走原来的内联写法，这里不动它们。
    // 新词条的行为写在 00-data.js 的 AFFIXES 里（zone / fireZone / dash / vortex /
    // swarm …），钩子只读这些声明式字段——以后加词条不用再改这个文件。

    // v9.25: 圈层判定。v9.24 是「遍历怪、读怪身上那张词条表的 zone」，现在改成
    // 遍历**落点**（G.affixZones）——圈已经和怪解绑了，怪死了圈还在，
    // 圈到点自己消失。cfg 直接引用 AFFIXES 里那份配置对象，数值只有一个出处。
    //
    // 多个圈覆盖同一片区域时取**最强**的那一个而不是连乘——连乘的话两个削减圈
    // 叠起来是 0.36，那已经不是「被削弱」而是「被缴械」了。
    //
    // v9.25: 第三个参数是被判定的实体，缺省是玩家。图谱（图腾）也要吃圈——
    // 玩家只要把塔造在圈外就完全免疫，「圈」对塔阵流派就是一行看不见的数值，
    // 而现在圈是 BOSS 扔的、看得见也躲得开，两边规则一致才讲得通。
    function getAffixZoneMul(kind, field, e) {
        const ent = e || G.player;
        let mul = 1;
        for (const z of G.affixZones) {
            if (z.kind !== kind || !z.cfg) continue;
            const v = z.cfg[field];
            if (typeof v !== 'number') continue;
            if (dist(z, ent) <= z.r + ent.r) mul = Math.min(mul, v);
        }
        return mul;
    }
    function getPlayerAtkZoneMul() { return getAffixZoneMul('weaken', 'playerAtkMul'); }
    function getPlayerSpeedZoneMul() { return getAffixZoneMul('slowzone', 'playerSpeedMul'); }
    // 图腾吃圈：削减圈削单发伤害，减速圈削攻速（塔不会移动，移速的等价物就是出手快慢）。
    function getTurretAtkZoneMul(t) { return getAffixZoneMul('weaken', 'playerAtkMul', t); }
    function getTurretRateZoneMul(t) { return getAffixZoneMul('slowzone', 'playerSpeedMul', t); }

    // 落一个圈：以 m 为圆心、取随机角度和 [r*1.2, spawnRange] 的随机距离——
    // 下界就是「不许落在自己脚下」，否则又变成 v9.24 那个「贴着 BOSS 走」的老样子。
    // 落定之后这个圈与 m 再无关系。
    function spawnAffixZone(m, kind) {
        if (typeof affixDef !== 'function') return false;
        const def = affixDef(kind);
        const cfg = def && (def.zone || def.fireZone);
        if (!cfg) return false;
        let same = 0;
        for (const z of G.affixZones) if (z.kind === kind) same++;
        if (same >= AFFIX_ZONE_MAX_PER_KIND) return false;   // 同属性同屏上限
        const r = cfg.r * AFFIX_ZONE_R_MUL;
        const a = rand(0, Math.PI * 2);
        const d = rand(r * 1.2, cfg.spawnRange);
        G.affixZones.push({
            x: clamp(m.x + Math.cos(a) * d, 20, 760),
            y: clamp(m.y + Math.sin(a) * d, 20, 540),
            r, kind, cfg,
            color: def.color,
            life: cfg.life, maxLife: cfg.life,
            tick: 0,
        });
        spawnParticles(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, def.color, 10);
        showFloatingText(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d - 8,
            `${def.emoji}${def.label}`, def.color);
        return true;
    }

    // 圈层的逐帧推进：到期消失 + 火焰圈结算伤害。
    function tickAffixZones() {
        if (G.affixZones.length === 0) return;
        for (let i = G.affixZones.length - 1; i >= 0; i--) {
            const z = G.affixZones[i];
            if (--z.life <= 0) {
                spawnParticles(z.x, z.y, z.color, 8);
                G.affixZones.splice(i, 1);
                continue;
            }
            if (z.kind !== 'firezone') continue;
            if (++z.tick < FIRE_ZONE_TICK) continue;
            z.tick = 0;
            if (dist(z, G.player) <= z.r + G.player.r) {
                // 护盾优先，护盾破了才打核心——和怪物撞核心同一套结算
                if (G.player.hp > 0) {
                    G.player.hp = Math.max(0, G.player.hp - FIRE_ZONE_DMG_PER_TICK);
                    spawnParticles(G.player.x, G.player.y, '#ff6622', 1);
                    if (G.player.hp <= 0) setFeedback('🛡️ 护盾耗尽！核心暴露！', '#ff4444');
                } else {
                    G.core.hp = Math.max(0, G.core.hp - FIRE_ZONE_DMG_PER_TICK);
                }
            }
            // v9.23 定的「火焰烧塔」不该因为火换了形状就失效——沿用同一个速率
            for (const t of G.turrets) {
                if (dist(t, z) <= z.r + t.r) t.hp -= FIRE_TURRET_DMG_PER_FRAME * FIRE_ZONE_TICK;
            }
        }
    }

    // 「牵引」：玩家自己走完这一帧之后再往怪那边拉一把。
    // 先动后拉，手感是「被吸过去」；反过来先拉后动就变成「走不动」了。
    function applyVortexPull(p) {
        let px = 0, py = 0;
        for (const m of G.monsters) {
            if (!m.affixes || m.affixes.indexOf('vortex') < 0) continue;
            if (typeof affixDef !== 'function') continue;
            const def = affixDef('vortex');
            if (!def || !def.vortex) continue;
            const d = dist(m, p);
            if (d > def.vortex.r || d < 1) continue;
            const a = angleTo(p, m);
            // 越近拉得越狠（线性衰减到 0），免得站在远处也被硬拽
            const strength = def.vortex.pull * (1 - d / def.vortex.r);
            px += Math.cos(a) * strength;
            py += Math.sin(a) * strength;
        }
        if (px === 0 && py === 0) return;
        p.x = clamp(p.x + px, 20, 760);
        p.y = clamp(p.y + py, 20, 540);
    }

    // 逐帧词条钩子。在怪物循环的最开头调用——它可能改写 m.x/m.y（突进）
    // 或往场景里推火焰，先做完这些，后面所有判定用的才是这一帧的真实位置。
    function tickAffixes(m) {
        // 探针与调试钩子会手工造怪，不一定补齐 v9.24 的运行时字段——这里兜一层底
        if (!m._affixZones) m._affixZones = [];
        m._dashMove = false;
        if (!m.affixes || m.affixes.length === 0) { m._affixZones.length = 0; m._dash = null; return; }
        if (typeof affixDef !== 'function') return;

        const busy = (m.frozen > 0 || m.stunned > 0);
        m._affixTimer = (m._affixTimer || 0) + 1;
        m._affixZones.length = 0;

        for (const id of m.affixes) {
            const def = affixDef(id);
            if (!def) continue;

            // v9.25: 圈层类（zone / fireZone）**不再挂在自己身上**了——它们改成
            // 定时在附近落一个独立圈层（见 spawnAffixZone）。这里只剩「牵引」，
            // 它是贴身拉力，本来就没有落点可言。
            if (def.vortex) m._affixZones.push({ r: def.vortex.r, color: def.color });

            // 冰冻/眩晕期间一切「主动」词条都停摆，只留下牵引的光圈
            if (busy) continue;

            if (def.fireZone && m._affixTimer % def.fireZone.every === 0) {
                spawnAffixZone(m, 'firezone');
            }
            // 削减区 / 减速区：同一套节拍，落点与存活时间也共用（都写在
            // AFFIXES 的 zone.every / zone.life 里），区别只在圈里的系数。
            if (def.zone && m._affixTimer % def.zone.every === 0) {
                spawnAffixZone(m, id);
            }

            if (def.dash) {
                if (m._dash) {
                    // 插值推进，而不是设速度——保证总位移恰好是 dist，且无视地形。
                    const d = m._dash;
                    m.x += (d.tx - m.x) * 0.28;
                    m.y += (d.ty - m.y) * 0.28;
                    if (--d.t <= 0) m._dash = null;
                    m._dashMove = true;
                } else if (m._affixTimer % def.dash.every === 0) {
                    const a = angleTo(m, G.player);
                    m._dash = {
                        tx: clamp(m.x + Math.cos(a) * def.dash.dist, 20, 760),
                        ty: clamp(m.y + Math.sin(a) * def.dash.dist, 20, 540),
                        t: 12,
                    };
                }
            }

            if (def.swarm && (m._swarmCount || 0) < def.swarm.max
                && m._affixTimer % def.swarm.every === 0) {
                spawnSwarmClone(m, def.swarm);
                m._swarmCount = (m._swarmCount || 0) + 1;
            }
        }
    }

    // v9.25: spawnAffixFire() 在这里删掉了。它原本只服务「火焰区」这一条词条，
    // 而火焰区现在落的是圈（spawnAffixZone），不再往 G.fireTrails 里推线段。
    // 灼烧怪自己的火轨迹走的是另一条路径（isScorcher 分支），不受影响。

    // 「群生」：分裂出残影。刻意不复用 splitMonster()——那个是「子体继承母体的
    // 一个固定比例」，这里是「按母体当前最大血的 20% 另起一只」，而且残影
    // 不该再带词条（否则词条会指数级扩散出去）。
    function spawnSwarmClone(m, cfg) {
        const angle = rand(0, Math.PI * 2);
        const d = m.r + 16 + rand(0, 14);
        const hp = Math.max(1, m.maxHp * cfg.hpFrac);
        const clone = {
            x: clamp(m.x + Math.cos(angle) * d, 20, 760),
            y: clamp(m.y + Math.sin(angle) * d, 20, 540),
            r: m.r * 0.7,
            hp, maxHp: hp,
            speed: m.speed * 1.1,
            isElite: false,
            atk: m.atk * 0.4,
            hitCooldown: 0, trailDamageCooldown: 0,
            scoreValue: m.scoreValue * 0.15,
            type: m.type, typeLabel: '残影', typeEmoji: '👥',
            color: '#66dd88',
            isHealer: false, healAmount: 0,
            isSplitter: false, canSplit: false,
            healCooldown: 0, isChild: true,
            isScorcher: false, fireTrailInterval: 8, fireTrailLife: 150,
            isWraith: false, bulletResist: 0,
            moveInterval: 50, moveTimer: rand(0, 100),
            isMoving: Math.random() < 0.5,
            alwaysMoving: true,
            affixes: [],
            frozen: 0, stunned: 0, slowTimer: 0,
            vx_prev: 0, vy_prev: 0, _fireCounter: 0,
            _affixTimer: 0, _dash: null, _swarmCount: 0, _affixZones: [],
        };
        G.monsters.push(clone);
        spawnParticles(clone.x, clone.y, '#66dd88', 5);
    }

    // 「封印」：撞核心时随机压住玩家一个被动。只在核心真被打到的那一下触发。
    const SEAL_FRAMES = 240;   // 4 秒
    function onAffixCoreHit(m) {
        if (!m.affixes || m.affixes.indexOf('seal') < 0) return;
        const owned = [];
        for (const tid of Object.keys(G.passives)) {
            for (const p of G.passives[tid]) {
                if (p.count > 0) owned.push({ tid, eid: p.effectId });
            }
        }
        if (owned.length === 0) return;   // 没被动可封，这条词条就是空的
        const pick = owned[Math.floor(Math.random() * owned.length)];
        for (const s of G.sealedPassives) {
            if (s.tid === pick.tid && s.eid === pick.eid) { s.timer = SEAL_FRAMES; return; }
        }
        G.sealedPassives.push({ tid: pick.tid, eid: pick.eid, timer: SEAL_FRAMES });
        showFloatingText(G.player.x, G.player.y - G.player.r - 8, '🔒 被动被封', '#ddcc44');
    }

    function updateSeals() {
        for (let i = G.sealedPassives.length - 1; i >= 0; i--) {
            if (--G.sealedPassives[i].timer <= 0) G.sealedPassives.splice(i, 1);
        }
    }

    // 「敌图腾」：怪物死亡后原地留下。12 秒寿命，每 60 帧对「玩家 / 玩家图腾」
    // 里更近的一个打一发即时伤害（不引入新弹道系统——那要配一套新的碰撞、
    // 渲染与上限，成本远大于这条词条的价值）。
    const ENEMY_TOTEM_LIFE = 720;
    // v9.25: 射程 200 → 120。原来的 200 比**任何**一座玩家图腾都远
    // （玩家图腾的射程是 120/140/160/180，还要再乘环级 0.6~1.5，
    // 见 04-trail.js 的 T 表），于是敌图腾永远先手、玩家图腾永远够不着它——
    // 「范围过大」说的就是这件事。120 对齐玩家图腾里最短的那一档，
    // 规则变成「任何一座玩家图腾都能反制敌图腾」，counterplay 一眼可见。
    const ENEMY_TOTEM_RANGE = 120;
    function onAffixDeath(m) {
        if (!m.affixes || m.affixes.indexOf('totem') < 0) return;
        G.enemyTotems.push({
            x: m.x, y: m.y, r: 15,
            life: ENEMY_TOTEM_LIFE, maxLife: ENEMY_TOTEM_LIFE,
            fireTimer: 30, _lastFire: -999,
        });
        spawnParticles(m.x, m.y, '#ff8844', 10);
    }

    function updateEnemyTotems() {
        if (G.enemyTotems.length === 0) return;
        for (let i = G.enemyTotems.length - 1; i >= 0; i--) {
            const et = G.enemyTotems[i];
            if (--et.life <= 0) {
                spawnParticles(et.x, et.y, '#ff8844', 12);
                showFloatingText(et.x, et.y - et.r - 6, '🗿 熄灭', '#ff8844');
                G.enemyTotems.splice(i, 1);
                continue;
            }
            if (--et.fireTimer > 0) continue;
            // 目标：玩家与玩家图腾里更近的那一个（和怪物索敌同一套规则）
            const nT = nearestTurret(et);
            const dPlayer = dist(et, G.player);
            const onTurret = nT && nT.d < dPlayer && nT.d <= ENEMY_TOTEM_RANGE;
            const target = onTurret ? nT.t : G.player;
            if (dist(et, target) > ENEMY_TOTEM_RANGE) continue;
            et.fireTimer = 60;
            et._lastFire = G.frame;
            const dmg = 3 + G.floor * 0.2;
            if (onTurret) {
                target.hp -= dmg;
                spawnParticles(target.x, target.y, '#ff8844', 6);
                showFloatingText(target.x, target.y - target.r - 6, '-' + Math.ceil(dmg), '#ff8844');
            } else {
                // 护盾优先，护盾破了才打到核心——和怪物撞核心同一套结算
                if (G.player.hp > 0) {
                    G.player.hp = Math.max(0, G.player.hp - dmg);
                    spawnParticles(G.player.x, G.player.y, '#ff8844', 6);
                    showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.ceil(dmg), '#ff8844');
                    if (G.player.hp <= 0) setFeedback('🛡️ 护盾耗尽！核心暴露！', '#ff4444');
                } else {
                    G.core.hp -= dmg;
                    spawnParticles(G.core.x, G.core.y, '#ff3333', 6);
                    showFloatingText(G.core.x, G.core.y - G.core.r, '-' + Math.ceil(dmg), '#ff3333');
                }
            }
        }
    }

    // ---------- 更新 ----------
    function update() {
        if (G.gameOver) return;
        // 教程调度必须跑在暂停/遮罩守卫之外：节点地图（selectingActive）期间也要能出字幕
        if (!G.simMode) { tutorialSyncPointer(); Tutorial.tick(); }
        // v9.24: 教程播完（或点了「跳过教程」）后的整局重置。必须放在 tick() 之后、
        // 其余逻辑之前——resetGame() 会清空 G 的绝大部分字段，中间夹着别的更新
        // 就会读到半清空的状态；这里直接 return，本帧剩下的部分整帧跳过。
        if (Tutorial.pendingRestart) {
            Tutorial.pendingRestart = false;
            restartRunAfterTutorial();
            return;
        }
        if (!G.simMode && (G.paused || G.selectingActive)) return;
        G.frame++;

        // v9.15: 连杀计时——太久没击杀就断连
        tickKillStreak();

        // v9.10: 自动驾驶
        if (G.simMode) { autoPilot(); }

        const p = G.player;

        // v9.22: 玩家减速（playerSlowTimer / playerSlowAmount）整块删除——
        // 唯一写入点是 m.isSlow，而没有任何怪物类型定义过这个字段，恒为 false。
        // v9.24: 再乘一项「减速区」（🟦 词条）——多只怪覆盖同一片区域时取最强的一个
        // 而不是连乘，否则三只怪叠一起玩家直接冻住，那已经超出「减速」了。
        const playerSpeedMult = G.buffs.speedUp * G.fateBuffs.speedMul;
        const speed = p.speed * playerSpeedMult * getPlayerSpeedZoneMul();

        let dx = 0,
            dy = 0;
        // v9.24: 手机端摇杆优先于键盘四向。摇杆是模拟量（模长 0..1），
        // 直接当 dx/dy 用——轻推慢走、满推全速，还天然带八向以外的角度。
        if (G.mobileMode && G.stickActive) {
            dx = G.stick.x;
            dy = G.stick.y;
        } else {
            if (G.keys.w) dy = -1;
            if (G.keys.s) dy = 1;
            if (G.keys.a) dx = -1;
            if (G.keys.d) dx = 1;
            if (dx !== 0 && dy !== 0) { dx *= 0.707;
                dy *= 0.707; }
        }
        // 轨迹方向单独归一化：模拟摇杆下 dx/dy 的模长可以很小（轻推 0.1），
        // 直接拿去算轨迹长度会画出短到看不见的线段。方向与位移强度分开处理。
        let tdx = dx, tdy = dy;
        const tmag = Math.hypot(tdx, tdy);
        if (tmag > 1e-6) { tdx /= tmag; tdy /= tmag; } else { tdx = 0; tdy = 0; }
        let newX = p.x + dx * speed;
        let newY = p.y + dy * speed;
        // v9.4: 玩家地形碰撞
        for (const t of G.terrain) {
            if (dist({ x: newX, y: newY }, t) < p.r + t.r + 2) {
                const ta = angleTo(t, { x: newX, y: newY });
                newX = t.x + Math.cos(ta) * (t.r + p.r + 2);
                newY = t.y + Math.sin(ta) * (t.r + p.r + 2);
            }
        }
        p.x = clamp(newX, 20, 760);
        p.y = clamp(newY, 20, 540);

        // v9.24: 「牵引」在玩家自行移动之后再施加——先动后拉，手感才是「被吸过去」，
        // 而不是「走不动」。内部自带边界 clamp。
        applyVortexPull(p);

        if (G.frame % 2 === 0 && tmag > 0.01) {
            const trailLen = 6;
            const t = addTrail(p.x - tdx * trailLen, p.y - tdy * trailLen, p.x + tdx * trailLen, p.y + tdy * trailLen);
            // v9.7: 冲刺轨迹（Shift键）——更宽更亮
            if (G.keys.shift) {
                const sprintLen = 12;
                const st = { x1: p.x - tdx * sprintLen, y1: p.y - tdy * sprintLen, x2: p.x + tdx * sprintLen, y2: p.y + tdy * sprintLen, life: 180, layer: 2, trailType: G.activeTrailType, isSprint: true };
                G.sprintTrails.push(st);
                if (G.sprintTrails.length > 60) G.sprintTrails.shift();
            }
        }

        // v9.7: 围剿检测
        if (G.frame % 30 === 0 && G.trails.length > 10 && G.monsters.length > 0) {
            checkEnclosure();
        }
        checkTrailLoop();

        // 自动射击
        if (G.monsters.length > 0) {
            G.fireCounter++;
            if (G.fireCounter >= G.fireRate) {
                G.fireCounter = 0;
                autoShoot();
            }
        } else {
            G.fireCounter = 0;
            G.target = null;
        }
        if (p.shootCooldown > 0) p.shootCooldown--;

        // 子弹
        for (let i = G.bullets.length - 1; i >= 0; i--) {
            const b = G.bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.life--;
            if (b.x < -10 || b.x > 790 || b.y < -10 || b.y > 570 || b.life <= 0) {
                G.bullets.splice(i, 1);
                continue;
            }
            let hit = false;
            for (const m of G.monsters) {
                if (dist(b, m) < b.r + m.r) {
                    const bulletDmg = b.damage * (1 - (m.bulletResist || 0));
                    m.hp -= bulletDmg;
                    // v9.19: 中弹停顿 0.3 秒（18 帧）。复用现成的 stunned 字段——
                    // 递减、禁用移动、头顶 💫 标记都是现成的，不需要新机制。
                    // 注意这确实是照着「所有怪」来的，BOSS 也吃；40 帧一发的射速下
                    // 停顿占空比约 45%，属于「难但打得动」。真把 BOSS 钉死了再说。
                    m.stunned = Math.max(m.stunned || 0, 18);
                    spawnParticles(b.x, b.y, '#ff8844', 5);
                    showFloatingText(m.x, m.y - m.r, '-' + Math.floor(bulletDmg), '#ff8844');
                    // v9.22: 子弹不再给终极技充能——改成固定时间回复，见 04-trail.js
                    // v9.1: 荆棘词缀反弹
                    if (m.affixes && m.affixes.includes('thorns')) {
                        const thornDmg = bulletDmg * (0.08 + G.floor * 0.002);
                        G.player.hp = Math.max(0, G.player.hp - thornDmg);
                        showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.floor(thornDmg), '#ff6644');
                    }
                    hit = true;
                    if (!b.hit) {
                        b.hit = true;
                        triggerPassive('T07', m);
                        if (m.isElite || m.isBoss) triggerPassive('T03', m);
                        addScore(1);
                    }
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

            // v9.24: 词条逐帧钩子。必须在最前面——「突进」会直接改写 m.x/m.y，
            // 「火焰区」会往场景里推火焰，这些都得在本帧其余判定之前落定。
            tickAffixes(m);

            // v9.1: 冰冻/眩晕处理
            if (m.frozen > 0) m.frozen--;
            if (m.stunned > 0) m.stunned--;
            if (m.slowTimer > 0) m.slowTimer--;   // v9.19: E14 延缓
            const disabled = m.frozen > 0 || m.stunned > 0 || m._dashMove;

            if (!disabled) {
                // v9.17: 索敌「图腾与核心中离自己更近的那一个」
                const nT = nearestTurret(m);
                const dCore = dist(m, G.core);
                const target = (nT && nT.d < dCore) ? nT.t : G.core;
                const angle = angleTo(m, target);
                // v9.19: slowTimer 只在速度公式里乘一次（不像 slowAll 那样在生成时也乘）。
                // v9.22: slowTimer 现在有两个来源——E14「延缓」和踩到轨迹——两者共用
                // 同一个字段和同一个 0.8，取的是更长的那个持续时间。
                const spd = m.speed * (1 - G.buffs.slowAll) * (m.slowTimer > 0 ? 0.8 : 1) * 1.33;
                let mx = Math.cos(angle) * spd;
                let my = Math.sin(angle) * spd;
                // v9.22: 轨迹不再阻挡怪物——接触轨迹改为挂 3 秒迟缓（见下面的接触块）。
                // v9.4: 地形障碍绕行
                [mx, my] = steerAroundTerrain(m, mx, my, target, spd);
                m.vx_prev = mx; m.vy_prev = my;
                m.x += mx; m.y += my;
                // 绕开的是「最挡路」的那一个，切线走法可能蹭进旁边的障碍——
                // 移动之后再兜一次底，保证任何一帧结束时怪都不在障碍内部。
                pushOutOfTerrain(m, m.r + 2);

                // v9.1: 灼烧怪火轨
                if (m.isScorcher) {
                    m._fireCounter = (m._fireCounter || 0) + 1;
                    if (m._fireCounter >= (m.fireTrailInterval || 8)) {
                        m._fireCounter = 0;
                        const ang = angleTo(m, target);
                        const tl = 8;
                        G.fireTrails.push({ x1: m.x - Math.cos(ang) * tl, y1: m.y - Math.sin(ang) * tl, x2: m.x + Math.cos(ang) * tl, y2: m.y + Math.sin(ang) * tl, life: (m.fireTrailLife || 150) });
                        if (G.fireTrails.length > 80) G.fireTrails.shift();
                        Tutorial.emit('scorcher');
                    }
                }
            }

            // ---------- v9.22 轨迹接触：迟缓 + 伤害 ----------
            // 轨迹不再阻挡怪物，改成「踩上去就迟缓 3 秒」。判定只做一次，
            // 迟钝缓和伤害共用同一个 onTrail。
            let onTrail = false, isSprintHit = false;
            const allTrails = [...G.trails, ...G.sprintTrails];
            for (const t of allTrails) {
                const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                if (dist(m, { x: tmx, y: tmy }) < getTrailWidth() + m.r + 10) {
                    onTrail = true;
                    if (t.isSprint) isSprintHit = true;
                    break;
                }
            }
            // 迟缓没有冷却：踩着就一直续 3 秒，离开 3 秒后才恢复。
            // 和 E14「延缓」共用 slowTimer，所以两者叠加时取更长的那个，
            // 减速倍数仍是同一个 0.8——本来就是「之前定义过的效果」。
            // 虚灵也吃迟缓（它只免疫伤害），「接触到轨迹的怪物」没有例外。
            if (onTrail) m.slowTimer = Math.max(m.slowTimer || 0, TRAIL_SLOW_FRAMES);

            // v9.7: 轨迹伤害（虚灵免疫）+ 冲刺轨迹双倍伤害
            if (m.trailDamageCooldown > 0) {
                m.trailDamageCooldown--;
            } else if (onTrail && !m.isWraith) {
                let td = getTrailDamage();
                if (isSprintHit) td *= 2.5; // v9.7: 冲刺轨迹伤害×2.5
                m.hp -= td;
                m.trailDamageCooldown = isSprintHit ? 8 : 15;
                showFloatingText(m.x, m.y - m.r, '-' + Math.floor(td), isSprintHit ? '#ffaa00' : '#ffaa44');
                // v9.22: 轨迹伤害不再给终极技充能（改固定时间回复）
                // v9.1: 荆棘词缀 + T03
                if (m.affixes && m.affixes.includes('thorns')) {
                    const thornDmg = td * (0.08 + G.floor * 0.002);
                    G.player.hp = Math.max(0, G.player.hp - thornDmg);
                    showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.floor(thornDmg), '#ff6644');
                }
                if (m.isElite || m.isBoss) triggerPassive('T03', m);
                triggerPassive('T06', m);
                addScore(1);
            }

            // v9.17: 打「图腾与核心中更近的那一个」。图腾直接掉血（不经过核心护盾），
            // 每次被命中掉 max(1, atk*0.05) —— 1 级怪打 1 点，血厚的怪最多 4 点。
            // v9.20 起塔血只有 2/4/6，这个下限 1 基本上就等于「一下」，
            // 所以塔能扛的大约就是血量的数字（小环 2 下、大环 6 下）。
            const nTA = nearestTurret(m);
            const dCoreA = dist(m, G.core);
            const onTurret = nTA && nTA.d < dCoreA;
            const reach = onTurret ? nTA.t.r + m.r : G.core.r + m.r;
            const reachDist = onTurret ? nTA.d : dCoreA;
            if (reachDist < reach) {
                if (m.hitCooldown <= 0) {
                    if (onTurret) {
                        const t = nTA.t;
                        const tDmg = Math.max(1, Math.round(m.atk * 0.05));
                        t.hp -= tDmg;
                        spawnParticles(t.x, t.y, '#ff6644', 6);
                        showFloatingText(t.x, t.y - t.r - 6, '-' + tDmg, '#ff6644');
                        // 碎裂的提示留给下面的移除分支去飘字/放粒子——
                        // 塔一多会同时碎好几座，不该每一座都去刷面板反馈
                        m.hitCooldown = 24;
                    } else {
                        // 攻击核心 → 先扣玩家HP（护盾），再扣核心
                        Tutorial.emit('hit');
                        breakKillStreak(); // v9.15: 核心挨打就断连
                        const dmg = m.atk * 0.35 * G.fateBuffs.damageTakenMul;
                        if (G.player.hp > 0) {
                            G.player.hp = Math.max(0, G.player.hp - dmg);
                            spawnParticles(G.player.x, G.player.y, '#ff6644', 6);
                            showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.floor(dmg), '#ff6644');
                            if (G.player.hp <= 0) {
                                setFeedback('🛡️ 护盾耗尽！核心暴露！', '#ff4444');
                            }
                        } else {
                            G.core.hp -= dmg;
                            spawnParticles(G.core.x, G.core.y, '#ff3333', 8);
                            showFloatingText(G.core.x, G.core.y - G.core.r, '-' + Math.floor(dmg), '#ff3333');
                        }
                        // v9.1: 吸血词缀
                        if (m.affixes && m.affixes.includes('vampiric') && G.player.hp <= 0) {
                            const vampHeal = dmg * (0.15 + G.floor * 0.01);
                            m.hp = Math.min(m.maxHp, m.hp + vampHeal);
                            showFloatingText(m.x, m.y - m.r, '+' + Math.floor(vampHeal), '#ff3366');
                        }
                        m.hitCooldown = 24;
                        // v9.24: 「封印」词条——撞击核心的怪随机压住玩家一个被动 4 秒。
                        // 放在护盾结算之后：玩家刚挨完这一下，正是「被惩罚」的时机。
                        onAffixCoreHit(m);
                        // v9.4: 荆棘光环遗物反伤
                        if (G.relicBuffs.thornsDmg) {
                            m.hp -= G.relicBuffs.thornsDmg;
                            showFloatingText(m.x, m.y - m.r, '↩' + G.relicBuffs.thornsDmg, '#ffaa44');
                        }
                        if (G.core.hp <= 0) {
                            G.core.hp = 0;
                            G.gameOver = true;
                            setFeedback('💀 核心被毁 · 游戏结束', '#d44');
                        }
                    }
                }
            }
            if (m.hitCooldown > 0) m.hitCooldown--;

            // 死亡
            if (m.hp <= 0) {
                if (m.isBoss) {
                    spawnParticles(m.x, m.y, '#ff2266', 40);
                    spawnParticles(m.x, m.y, '#ffaa44', 25);
                    // v9.15: 先记击杀再计分——下面的加分读的是 G.killStreak。
                    // （v9.22: 连杀爆发已删，但 T08「连环击杀」和 连杀数×分 都还在读它。）
                    registerKill();
                    addScore(m.scoreValue || 300);
                    // v9.4: BOSS掉落精华和遗物
                    // v9.18: 走 addCombatEssence——BOSS 精华同样计入本层上限（用户要求「每层 ≤ 8」）。
                    // 触顶时飘的是实际到手数，飘 0 就干脆不飘，免得写「💎+0」。
                    const bossGot = addCombatEssence(10 + G.floor);
                    if (bossGot > 0) showFloatingText(m.x, m.y - m.r - 10, '💎+' + bossGot, '#c0a0ff');
                    // v9.22: dropRateMul 真的接上了（丰收 ×2 / 贪婪圣杯 ×3）
                    if (Math.random() < 0.3 * (G.fateBuffs.dropRateMul || 1) && G.relics.length < 8) dropRelic();
                    if (G.fateBuffs.vampHeal > 0) {
                        G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.fateBuffs.vampHeal * 3);
                    }
                    triggerPassive('T08', m); addScore(G.killStreak * 5);
                    G.bossPending = false; G.bossSpawned = false;
                    // v9.22: 卡牌数也吃 dropRateMul；飘字改用实际到手的 bossGot
                    // （原来说的是未受本层精华上限钳制的 10+层，跟真掉的对不上）
                    const drops = Math.round((2 + Math.floor(Math.random() * 2)) * (G.fateBuffs.dropRateMul || 1));
                    for (let d = 0; d < drops; d++) dropBalancedCard();
                    onAffixDeath(m);
                    G.monsters.splice(i, 1);
                    setFeedback(`👑 BOSS击杀！+${Math.floor(m.scoreValue)}分 · 掉落${drops}张牌 · 💎+${bossGot}`, '#ff3366');
                    continue;
                }
                spawnParticles(m.x, m.y, '#ffaa44', 12);
                if (m.isSplitter && m.canSplit && !m.isChild) {
                    splitMonster(m);
                    spawnParticles(m.x, m.y, '#ffaa44', 15);
                }
                // v9.1: 爆裂词缀
                if (m.affixes && m.affixes.includes('explosive')) {
                    const exDmg = (20 + G.floor * 4) * getDifficultyMultiplier();
                    for (const other of G.monsters) {
                        if (other === m) continue;
                        if (dist(m, other) < 80) {
                            other.hp -= exDmg;
                            showFloatingText(other.x, other.y - other.r, '-' + Math.floor(exDmg), '#ff6622');
                        }
                    }
                    if (dist(m, G.player) < 80) {
                        G.player.hp = Math.max(0, G.player.hp - exDmg * 0.3);
                        showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.floor(exDmg * 0.3), '#ff6622');
                    }
                    spawnParticles(m.x, m.y, '#ff6622', 25);
                }
                registerKill();
                addScore(m.scoreValue || 5);
                Tutorial.emit('kill', { type: m.type, isElite: !!m.isElite, isChild: !!m.isChild });
                // v9.4: 精华掉落
                let essenceDrop = 1 + Math.floor(G.floor / 10);
                if (G.stageType === 'treasure') essenceDrop *= 3;
                if (m.isElite) essenceDrop += 3;
                essenceDrop += (G.relicBuffs.essencePerKill || 0);
                essenceDrop += Math.floor((G.essenceBonus || 0) * essenceDrop);
                // v9.18: 封顶在本层上限内，飘字用实际到手数
                const essenceGot = addCombatEssence(essenceDrop);
                if (essenceGot > 0 && G.frame % 3 === 0) showFloatingText(m.x, m.y - m.r - 8, '💎+' + essenceGot, '#c0a0ff');
                // v9.4: 遗物掉落（精英）。v9.22: 删掉 G.relicDropWave——只读不写的死字段。
                if (m.isElite && Math.random() < 0.08 * (G.fateBuffs.dropRateMul || 1) && G.relics.length < 8) {
                    dropRelic();
                }
                // v9.2: 命运吸血
                if (G.fateBuffs.vampHeal > 0) {
                    G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.fateBuffs.vampHeal);
                }
                if (G.killStreak >= 2) {
                    triggerPassive('T08', m);
                    addScore(G.killStreak * 2);
                }
                // v9.24: 「敌图腾」词条——死亡后原地留下敌意图腾。
                // 放在 splice 之前，此时 m 还在数组里且坐标有效。
                onAffixDeath(m);
                G.monsters.splice(i, 1);
                continue;
            }

            // v9.1: 再生词缀
            if (m.affixes && m.affixes.includes('regen')) {
                const regenAmt = 0.05 + G.floor * 0.01;
                m.hp = Math.min(m.maxHp, m.hp + regenAmt);
            }

        }

        // T10 残血
        if (G.player.hp < G.player.maxHp * 0.3 && G.frame % 30 === 0) {
            triggerPassive('T10');
        }

        // 轨迹消失
        for (let i = G.trails.length - 1; i >= 0; i--) {
            G.trails[i].life--;
            if (G.trails[i].life <= 0) G.trails.splice(i, 1);
        }

        // v9.1: 火焰轨迹伤害与衰减
        for (let i = G.fireTrails.length - 1; i >= 0; i--) {
            G.fireTrails[i].life--;
            if (G.fireTrails[i].life <= 0) { G.fireTrails.splice(i, 1); continue; }
            const ft = G.fireTrails[i];
            const fmx = (ft.x1 + ft.x2) / 2, fmy = (ft.y1 + ft.y2) / 2;
            if (dist(G.player, { x: fmx, y: fmy }) < G.player.r + 14) {
                // v9.19: 火焰仍然扣护盾，但视觉上表现为「伤害从玩家飞向核心的护盾」。
                // 节流到每 6 帧一条——每帧 0.8 伤害的话，不节流就是满屏飞线。
                const hadShield = G.player.hp > 0;
                G.player.hp = Math.max(0, G.player.hp - 0.8);
                if (G.frame % 6 === 0) {
                    G.damageFlows.push({
                        x1: G.player.x, y1: G.player.y,
                        x2: G.core.x, y2: G.core.y,
                        t: 0, life: 14, toShield: hadShield,
                    });
                    if (G.damageFlows.length > 40) G.damageFlows.shift();
                }
                if (G.frame % 5 === 0) spawnParticles(G.player.x, G.player.y, '#ff6622', 1);
            }
            // v9.23: 火焰同样烧图腾（判定和烧玩家同一套中点+半径）。
            // 塔的移除在下一次 update 的图腾循环里（hp<=0 → 碎裂 + 环重新武装）。
            for (const t of G.turrets) {
                if (dist(t, { x: fmx, y: fmy }) < t.r + 14) {
                    t.hp -= FIRE_TURRET_DMG_PER_FRAME;
                    if (G.frame % 10 === 0) spawnParticles(t.x, t.y, '#ff6622', 1);
                }
            }
        }

        // v9.19: 伤害流转动画推进（纯表现层，封顶 40 条）
        for (let i = G.damageFlows.length - 1; i >= 0; i--) {
            const df = G.damageFlows[i];
            df.t++;
            if (df.t >= df.life) G.damageFlows.splice(i, 1);
        }

        // v9.22: 终极技充能——固定时间回复，不再靠造成伤害（见 04-trail.js 的说明）。
        // 释放期间不回能，否则连开两发等于白送一倍速率。
        if (!G.ultimateActive && G.ultimateGauge < G.ultimateMax) {
            G.ultimateGauge = Math.min(G.ultimateMax,
                G.ultimateGauge + G.ultimateMax / getUltimateChargeFrames() * G.ultimateChargeMult);
        }

        // v9.1: 终极技能计时器
        if (G.ultimateActive) {
            G.ultimateTimer--;
            G.screenFlash = Math.max(0, G.screenFlash - 0.025);
            if (G.ultimateTimer <= 0) G.ultimateActive = false;
        }

        // v9.1: 闪电链冷却
        if (G.chainCooldown > 0) G.chainCooldown--;

        // v9.17图腾更新（血量制：不再计存留时间，只有被打光才会消失）
        for(let i=G.turrets.length-1;i>=0;i--){
            const t=G.turrets[i];
            if(t.spawnAnim>0)t.spawnAnim--;
            if(t.hp<=0){
                spawnParticles(t.x,t.y,'#888888',10);
                showFloatingText(t.x,t.y-t.r-6,'🗼 碎裂','#88aacc');
                // 塔碎了，同一个环重新武装——再画一次同样的闭环就能重新召唤
                if(t.loopKey)delete G.turretLoops[t.loopKey];
                G.turrets.splice(i,1);continue;
            }
            // v9.25: 伤害在开火这一刻算，不存快照——图腾攻击力 = 玩家攻击力 × 0.6 ×
            // ratio/75（上限 0.6 倍，按旧 d×m 比例分配），玩家买完属性成长之后塔跟着
            // 一起变强，不会再出现「越到后期塔越没用」。
            // 同时套上圈层系数：站进削减圈里单发打折，站进减速圈里出手变慢。
            const zRate = getTurretRateZoneMul(t);
            t.fireTimer++;if(t.fireTimer>=t.fireRate/zRate&&G.monsters.length>0){t.fireTimer=0;
                let n=null,nd=Infinity;for(const m of G.monsters){const d=dist(t,m);if(d<t.range&&d<nd){nd=d;n=m;}}
                if(n){const dmg=getTurretAttackPower(t)*getTurretAtkZoneMul(t);
                    n.hp-=dmg;t._lastFire=G.frame;t._lastTarget={x:n.x,y:n.y};showFloatingText(n.x,n.y-n.r-5,t.emoji+'-'+Math.floor(dmg),t.color);spawnParticles(n.x,n.y,t.color,8);spawnParticles(t.x,t.y,'#ffffff',4);
                    if(t.type==='lightning'){G.chainCooldown=15;let c=0;for(const m2 of G.monsters){if(m2===n||c>=3)break;if(dist(n,m2)<150){m2.hp-=dmg*.6;c++;}}}
                    if(t.type==='frost')n.frozen=Math.max(n.frozen||0,40);
                    if(t.type==='trail'&&G.frame%10===0)for(const m of G.monsters)if(dist(t,m)<t.range)m.hp-=dmg*.3;
                    addScore(1);
                }
            }
        }


        // v9.24: 「敌图腾」（词条产物）与「封印」的倒计时。
        // 放在玩家图腾循环之后——两者是同一类东西，读代码时挨着看更顺。
        updateEnemyTotems();
        updateSeals();
        // v9.25: 圈层（削减/减速/火焰）的倒计时与火焰伤害
        tickAffixZones();

        // v9.25: 「消除」技能冷却 + BOSS 词条横幅的倒计时。
        // 两者都是纯粹的 UI 节拍，挨着放。
        if (G.eliminateCooldown > 0) G.eliminateCooldown--;
        if (G.bossBanner && --G.bossBanner.life <= 0) G.bossBanner = null;

        // v9.7: 冲刺轨迹衰减
        for (let i = G.sprintTrails.length - 1; i >= 0; i--) {
            G.sprintTrails[i].life--;
            if (G.sprintTrails[i].life <= 0) G.sprintTrails.splice(i, 1);
        }

        // v9.4: 地形衰减
        for (let i = G.terrain.length - 1; i >= 0; i--) {
            G.terrain[i].life--;
            if (G.terrain[i].life <= 0) G.terrain.splice(i, 1);
        }

        // v9.1: 通知衰减
        for (let i = G.notifications.length - 1; i >= 0; i--) {
            G.notifications[i].life--;
            if (G.notifications[i].life <= 0) G.notifications.splice(i, 1);
        }

        // v9.3: 环境危险区（40波起）
        if (G.floor >= 40) {
            G.hazardTimer++;
            if (G.hazardTimer >= 900) { G.hazardTimer = 0;
                if (G.hazardZones.length < 5) {
                    G.hazardZones.push({ x: rand(80, 700), y: rand(80, 480), r: 55, life: 600, maxLife: 600 });
                } }
            for (let i = G.hazardZones.length - 1; i >= 0; i--) {
                const hz = G.hazardZones[i];
                hz.life--;
                if (hz.life <= 0) { G.hazardZones.splice(i, 1); continue; }
                if (dist(G.player, hz) < hz.r + G.player.r) G.player.hp = Math.max(0, G.player.hp - 1.2);
                for (const m of G.monsters) {
                    if (dist(m, hz) < hz.r + m.r) m.hp -= 4;
                }
            }
        } else {
            G.hazardZones = [];
        }

        // 粒子
        for (let i = G.particles.length - 1; i >= 0; i--) {
            const p2 = G.particles[i];
            p2.x += p2.vx;
            p2.y += p2.vy;
            p2.vx *= 0.97;
            p2.vy *= 0.97;
            p2.life--;
            if (p2.life <= 0) G.particles.splice(i, 1);
        }

        // 浮动数值
        for (let i = G.floatingTexts.length - 1; i >= 0; i--) {
            const ft = G.floatingTexts[i];
            ft.x += ft.vx;
            ft.y += ft.vy;
            ft.life--;
            if (ft.life <= 0) G.floatingTexts.splice(i, 1);
        }

        // v9.10: 模拟模式——跳过特效 & 自动组合
        if (G.simMode) {
            if (G.simSkipEffects) {
                G.particles = [];
                G.floatingTexts = [];
                G.notifications = [];
            }
            if (G.frame % 30 === 0 && G.hand.length >= 2 && !G.selectingActive) {
                simAutoCombine();
            }
            // 目标楼层检测（在floor clear逻辑之前）
            if (G.simTargetFloor > 0 && G.floor >= G.simTargetFloor
                && G.monsters.length === 0 && G.monstersToSpawn === 0
                && !G.selectingActive && !G.bossPending) {
                G.gameOver = true;
                logEvent('game_over', { reason: 'target_floor_reached', snapshot: snapshotStats() });
                handleSimGameOver();
                return;
            }
        }

        // v9.22: 真空期倒计时整块删除——startVacuum() 从来没有调用点，
        // G.vacuumActive 恒为 false，这段和它守着的 UI 都是死代码。

        // 生成
        if (G.monstersToSpawn > 0) {
            G.spawnTimer--;
            if (G.spawnTimer <= 0) {
                const spawnCount = Tutorial.tookOver ? 1 : Math.min(1 + Math.floor(G.floor / 12), 3);
                for (let s = 0; s < spawnCount && G.monstersToSpawn > 0; s++) {
                    spawnMonster(Tutorial.nextSpawn());
                    G.monstersToSpawn--;
                }
                G.spawnTimer = Tutorial.tookOver ? Tutorial.spawnInterval : getSpawnInterval();
            }
        }
        // BOSS 召唤爪牙（v9.23: 召唤速率 +5%，两个间隔都过一遍 bossSummonInterval）
        for (const m of G.monsters) {
            if (!m.isBoss) continue;
            m.spawnTimer = (m.spawnTimer || bossSummonInterval(100)) - 1;
            if (m.spawnTimer <= 0) {
                m.spawnTimer = bossSummonInterval(Math.max(50, 150 - G.floor * 2));
                const cnt = 1 + Math.floor(G.floor / 15);
                for (let i = 0; i < cnt; i++) spawnBossMinion(m);
            }
        }
        // 波次清空 → v9.10: 属性提升选择替代密文版三选一
        if (G.monsters.length === 0 && G.monstersToSpawn === 0 && !G.selectingActive && !G.bossPending
            && !Tutorial.pendingScript()) {
            if (Tutorial.holdFloor()) { /* 教程：等清空字幕播完再进下一步 */ }
            else if(G.floor%5===0){const n=getFloorClearCards();for(let c=0;c<n;c++)dropBalancedCard();G.floorCardsObtained+=n;logEvent('floor_clear',{floorKills:G.floorKills,cardsRewarded:n,stageEnd:true,snapshot:snapshotStats()});if(G.simMode){simAutoStatChoice();}else{showStatChoice();}}else{logEvent('floor_clear',{floorKills:G.floorKills,stageEnd:false,snapshot:snapshotStats()});advanceFloor();}
        }

        updateUI();
        if (G.core.hp <= 0) {
            G.core.hp = 0;
            // v9.4: 凤凰羽毛复活
            if (G.relicBuffs.revive && !G._revived) {
                G._revived = true;
                G.core.hp = G.core.maxHp * 0.5;
                G.player.hp = G.player.maxHp * 0.5;
                G.relicBuffs.revive = false;
                setFeedback('🪶 凤凰羽毛发动！核心与护盾恢复50%！', '#ff8844');
                showNotification('🪶 凤凰涅槃！', '#ff8844', 240);
            } else {
                G.gameOver = true;
                logEvent('game_over', { reason: 'core_destroyed', snapshot: snapshotStats() });
                setFeedback('💀 核心被毁 · 游戏结束', '#d44');
            }
        }
    }

    // ---------- v9.7 围剿检测 ----------
    function checkEnclosure() {
        // 简化围剿：检查是否有怪物被轨迹包围
        // 方法：对每个怪物，检查其周围8个方向是否都有轨迹
        for (const m of G.monsters) {
            if (m.isBoss) continue;
            let blockedDirs = 0;
            const checkDist = 50 + m.r;
            const allTrails = [...G.trails, ...G.sprintTrails];
            for (let a = 0; a < 8; a++) {
                const ang = (a / 8) * Math.PI * 2;
                const cx = m.x + Math.cos(ang) * checkDist;
                const cy = m.y + Math.sin(ang) * checkDist;
                let hitTrail = false;
                for (const t of allTrails) {
                    const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                    if (dist({ x: cx, y: cy }, { x: tmx, y: tmy }) < getTrailWidth() + 8) {
                        hitTrail = true; break;
                    }
                }
                if (hitTrail || cx < 5 || cx > 775 || cy < 5 || cy > 555) blockedDirs++;
            }
            // 6/8方向被堵=围剿成功
            if (blockedDirs >= 6) {
                Tutorial.emit('enclosure');
                const enclosureDmg = 25 + G.buffs.trailDmg * 3 + G.floor;
                m.hp -= enclosureDmg;
                m.stunned = Math.max(m.stunned || 0, 30);
                spawnParticles(m.x, m.y, '#ffdd44', 8);
                showFloatingText(m.x, m.y - m.r, '🔒' + Math.floor(enclosureDmg), '#ffdd44');
                if (G.frame % 60 === 0) addScore(5);
            }
        }
    }

