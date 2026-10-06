    // ---------- 更新 ----------
    function update() {
        if (G.gameOver) return;
        // 教程调度必须跑在暂停/遮罩守卫之外：节点地图（selectingActive）期间也要能出字幕
        if (!G.simMode) { tutorialSyncPointer(); Tutorial.tick(); }
        if (!G.simMode && (G.paused || G.selectingActive)) return;
        G.frame++;

        // v9.15: 连杀计时——太久没击杀就断连
        tickKillStreak();

        // v9.10: 自动驾驶
        if (G.simMode) { autoPilot(); }

        const p = G.player;

        let playerSpeedMult = G.buffs.speedUp * G.fateBuffs.speedMul;
        if (G.playerSlowTimer > 0) {
            G.playerSlowTimer--;
            playerSpeedMult *= (1 - G.playerSlowAmount * 0.3);
        }
        const speed = p.speed * playerSpeedMult;

        let dx = 0,
            dy = 0;
        if (G.keys.w) dy = -1;
        if (G.keys.s) dy = 1;
        if (G.keys.a) dx = -1;
        if (G.keys.d) dx = 1;
        if (dx !== 0 && dy !== 0) { dx *= 0.707;
            dy *= 0.707; }
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

        if (G.frame % 2 === 0 && (dx !== 0 || dy !== 0)) {
            const trailLen = 6;
            const t = addTrail(p.x - dx * trailLen, p.y - dy * trailLen, p.x + dx * trailLen, p.y + dy * trailLen);
            // v9.7: 冲刺轨迹（Shift键）——更宽更亮
            if (G.keys.shift) {
                const sprintLen = 12;
                const st = { x1: p.x - dx * sprintLen, y1: p.y - dy * sprintLen, x2: p.x + dx * sprintLen, y2: p.y + dy * sprintLen, life: 180, layer: 2, trailType: G.activeTrailType, isSprint: true };
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
                    // v9.1: 终极技能充能
                    G.ultimateGauge = Math.min(G.ultimateMax, G.ultimateGauge + b.damage * 0.05 * G.ultimateChargeMult);
                    // v9.1: 荆棘词缀反弹
                    if (m.affixes && m.affixes.includes('thorns')) {
                        const thornDmg = bulletDmg * (0.08 + G.floor * 0.002);
                        G.player.hp = Math.max(0, G.player.hp - thornDmg);
                        showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.floor(thornDmg), '#ff6644');
                    }
                    hit = true;
                    if (!b.hit) {
                        b.hit = true;
                        triggerPassive('T07');
                        if (m.isElite || m.isBoss) triggerPassive('T03');
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

            // v9.1: 冰冻/眩晕处理
            if (m.frozen > 0) m.frozen--;
            if (m.stunned > 0) m.stunned--;
            if (m.slowTimer > 0) m.slowTimer--;   // v9.19: E14 延缓
            const disabled = m.frozen > 0 || m.stunned > 0;

            if (!disabled) {
                // v9.17: 索敌「图腾与核心中离自己更近的那一个」
                const nT = nearestTurret(m);
                const dCore = dist(m, G.core);
                const target = (nT && nT.d < dCore) ? nT.t : G.core;
                const angle = angleTo(m, target);
                // v9.19: E14 延缓只在速度公式里乘一次（不像 slowAll 那样在生成时也乘）
                const spd = m.speed * (1 - G.buffs.slowAll) * (m.slowTimer > 0 ? 0.8 : 1) * 1.33;
                let mx = Math.cos(angle) * spd;
                let my = Math.sin(angle) * spd;
                const nx = m.x + mx, ny = m.y + my;
                // v9.7: 轨迹阻挡——怪物无法穿过轨迹！
                let trailBlocked = false;
                const allTrails = [...G.trails, ...G.sprintTrails];
                for (const t of allTrails) {
                    const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                    const tw = (getTrailWidth() + 4) * (TRAIL_STYLES[t.trailType]?.widthMul || 1);
                    if (dist({ x: nx, y: ny }, { x: tmx, y: tmy }) < m.r + tw) {
                        const ta = angleTo(m, { x: tmx, y: tmy });
                        const bypassAngle = ta + (Math.random() < 0.5 ? 1 : -1) * 1.5;
                        mx = Math.cos(bypassAngle) * spd * 0.5;
                        my = Math.sin(bypassAngle) * spd * 0.5;
                        trailBlocked = true; break;
                    }
                }
                // v9.4: 地形障碍碰撞
                if (!trailBlocked) {
                    for (const t of G.terrain) {
                        if (dist({ x: nx, y: ny }, t) < m.r + t.r) {
                            const ta = angleTo(m, t);
                            const bypassAngle = ta + (Math.random() < 0.5 ? 1 : -1) * 1.2;
                            mx = Math.cos(bypassAngle) * spd * 0.6;
                            my = Math.sin(bypassAngle) * spd * 0.6; break;
                        }
                    }
                }
                m.vx_prev = mx; m.vy_prev = my;
                m.x += mx; m.y += my;

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

            // v9.7: 轨迹伤害（虚灵免疫）+ 冲刺轨迹双倍伤害
            if (m.trailDamageCooldown <= 0 && !m.isWraith) {
                let onTrail = false; let isSprintHit = false;
                const allTrails = [...G.trails, ...G.sprintTrails];
                for (const t of allTrails) {
                    const tmx = (t.x1 + t.x2) / 2, tmy = (t.y1 + t.y2) / 2;
                    if (dist(m, { x: tmx, y: tmy }) < getTrailWidth() + m.r + 10) {
                        onTrail = true;
                        if (t.isSprint) isSprintHit = true;
                        break;
                    }
                }
                if (onTrail) {
                    let td = getTrailDamage();
                    if (isSprintHit) td *= 2.5; // v9.7: 冲刺轨迹伤害×2.5
                    m.hp -= td;
                    m.trailDamageCooldown = isSprintHit ? 8 : 15;
                    showFloatingText(m.x, m.y - m.r, '-' + Math.floor(td), isSprintHit ? '#ffaa00' : '#ffaa44');
                    // v9.1: 终极技能充能 + 荆棘词缀 + T03
                    G.ultimateGauge = Math.min(G.ultimateMax, G.ultimateGauge + td * 0.05 * G.ultimateChargeMult);
                    if (m.affixes && m.affixes.includes('thorns')) {
                        const thornDmg = td * (0.08 + G.floor * 0.002);
                        G.player.hp = Math.max(0, G.player.hp - thornDmg);
                        showFloatingText(G.player.x, G.player.y - G.player.r, '-' + Math.floor(thornDmg), '#ff6644');
                    }
                    if (m.isElite || m.isBoss) triggerPassive('T03');
                    triggerPassive('T06');
                    addScore(1);
                }
            } else {
                m.trailDamageCooldown--;
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
                        // v9.4: 荆棘光环遗物反伤
                        if (G.relicBuffs.thornsDmg) {
                            m.hp -= G.relicBuffs.thornsDmg;
                            showFloatingText(m.x, m.y - m.r, '↩' + G.relicBuffs.thornsDmg, '#ffaa44');
                        }
                        if (m.isSlow) {
                            G.playerSlowTimer = 60;
                            G.playerSlowAmount = Math.min(G.playerSlowAmount + m.slowAmount * 0.1, 0.6);
                            setFeedback(`🐌 被减速！`, '#bb88dd');
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
                    // v9.15: 先记击杀再计分——爆发判定读的是 G.killStreak，
                    // 反过来的话第 25 杀发生时连杀数还是 24，冲击波要等到第 26 杀才响。
                    registerKill();
                    addScore(m.scoreValue || 300);
                    // v9.4: BOSS掉落精华和遗物
                    // v9.18: 走 addCombatEssence——BOSS 精华同样计入本层上限（用户要求「每层 ≤ 8」）。
                    // 触顶时飘的是实际到手数，飘 0 就干脆不飘，免得写「💎+0」。
                    const bossGot = addCombatEssence(10 + G.floor);
                    if (bossGot > 0) showFloatingText(m.x, m.y - m.r - 10, '💎+' + bossGot, '#c0a0ff');
                    if (Math.random() < 0.3 && G.relics.length < 8) dropRelic();
                    if (G.fateBuffs.vampHeal > 0) {
                        G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.fateBuffs.vampHeal * 3);
                    }
                    triggerPassive('T08'); addScore(G.killStreak * 5);
                    G.bossPending = false; G.bossSpawned = false;
                    const drops = 2 + Math.floor(Math.random() * 2);
                    for (let d = 0; d < drops; d++) dropBalancedCard();
                    G.monsters.splice(i, 1);
                    setFeedback(`👑 BOSS击杀！+${Math.floor(m.scoreValue)}分 · 掉落${drops}张牌 · 💎+${10+G.floor}`, '#ff3366');
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
                // v9.4: 遗物掉落（精英/特殊波）
                if ((m.isElite || G.relicDropWave) && Math.random() < 0.08 && G.relics.length < 8) {
                    dropRelic();
                }
                // v9.2: 命运吸血
                if (G.fateBuffs.vampHeal > 0) {
                    G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.fateBuffs.vampHeal);
                }
                if (G.killStreak >= 2) {
                    triggerPassive('T08');
                    addScore(G.killStreak * 2);
                }
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
        }

        // v9.19: 伤害流转动画推进（纯表现层，封顶 40 条）
        for (let i = G.damageFlows.length - 1; i >= 0; i--) {
            const df = G.damageFlows[i];
            df.t++;
            if (df.t >= df.life) G.damageFlows.splice(i, 1);
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
            t.fireTimer++;if(t.fireTimer>=t.fireRate&&G.monsters.length>0){t.fireTimer=0;
                let n=null,nd=Infinity;for(const m of G.monsters){const d=dist(t,m);if(d<t.range&&d<nd){nd=d;n=m;}}
                if(n){n.hp-=t.damage;t._lastFire=G.frame;t._lastTarget={x:n.x,y:n.y};showFloatingText(n.x,n.y-n.r-5,t.emoji+'-'+Math.floor(t.damage),t.color);spawnParticles(n.x,n.y,t.color,8);spawnParticles(t.x,t.y,'#ffffff',4);
                    if(t.type==='lightning'){G.chainCooldown=15;let c=0;for(const m2 of G.monsters){if(m2===n||c>=3)break;if(dist(n,m2)<150){m2.hp-=t.damage*.6;c++;}}}
                    if(t.type==='frost')n.frozen=Math.max(n.frozen||0,40);
                    if(t.type==='trail'&&G.frame%10===0)for(const m of G.monsters)if(dist(t,m)<t.range)m.hp-=t.damage*.3;
                    addScore(1);
                }
            }
        }


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
                && !G.vacuumActive && !G.selectingActive && !G.bossPending) {
                G.gameOver = true;
                logEvent('game_over', { reason: 'target_floor_reached', snapshot: snapshotStats() });
                handleSimGameOver();
                return;
            }
        }

        // 真空期倒计时
        if (G.vacuumActive) {
            G.vacuumTimer--;
            updateVacuumUI();
            if (G.vacuumTimer <= 0) {
                G.vacuumActive = false;
                if (!G.simMode) {
                    const bar = document.getElementById('vacuumBar');
                    if (bar) bar.classList.remove('active');
                }
                advanceFloor();
            }
        }

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
        // BOSS 召唤爪牙
        for (const m of G.monsters) {
            if (!m.isBoss) continue;
            m.spawnTimer = (m.spawnTimer || 100) - 1;
            if (m.spawnTimer <= 0) {
                m.spawnTimer = Math.max(50, 150 - G.floor * 2);
                const cnt = 1 + Math.floor(G.floor / 15);
                for (let i = 0; i < cnt; i++) spawnBossMinion(m);
            }
        }
        // 波次清空 → v9.10: 属性提升选择替代密文版三选一
        if (G.monsters.length === 0 && G.monstersToSpawn === 0 && !G.vacuumActive && !G.selectingActive && !G.bossPending
            && !Tutorial.pendingScript()) {
            if (Tutorial.holdFloor()) { /* 教程：等清空字幕播完再进下一步 */ }
            else if(G.floor%5===0){const n=2+Math.floor(G.floor/10);for(let c=0;c<n;c++)dropBalancedCard();G.floorCardsObtained+=n;logEvent('floor_clear',{floorKills:G.floorKills,cardsRewarded:n,stageEnd:true,snapshot:snapshotStats()});if(G.simMode){simAutoStatChoice();}else{showStatChoice();}}else{logEvent('floor_clear',{floorKills:G.floorKills,stageEnd:false,snapshot:snapshotStats()});advanceFloor();}
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

