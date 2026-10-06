    // ---------- 核心游戏逻辑 ----------
    function startFloor() {
        // 教程层：走脚本出怪，不走加权随机
        Tutorial.onFloorStart();
        if (Tutorial.tookOver) {
            G.monstersToSpawn = Tutorial.spawnQueue.length;
            G.spawnTimer = Tutorial.spawnInterval || getSpawnInterval();
            G.floorKills = 0; G.floorCardsObtained = 0;
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
        let atk = (p.atk + G.buffs.atkUp) * (1 + G.buffs.multUp) * G.fateBuffs.atkMul * G.fateBuffs.bulletDmgMul;
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
        p.shootCooldown = Math.max(6, 12 - G.floor * 0.08);
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


    // ---------- v9.12 网格判环 ----------
    const GRID=20;let _grid={},_path=[],_loopCD=0;
    function checkTrailLoop(){
        if(_loopCD>0){_loopCD--;return;}
        const p=G.player;
        const gx=Math.floor(p.x/GRID),gy=Math.floor(p.y/GRID),gk=gx+','+gy;
        if(G.frame%3===0){_path.push({x:p.x,y:p.y,f:G.frame});while(_path.length>200)_path.shift();}
        if(!_grid[gk]){_grid[gk]=G.frame;return;}
        if(_path.length<20)return;
        const oldF=_grid[gk];if(G.frame-oldF<60)return;
        let oi=-1;for(let i=0;i<_path.length;i++){if(Math.abs(_path[i].f-oldF)<10){oi=i;break;}}
        if(oi<0||_path.length-oi<15)return;
        const lp=_path.slice(oi);let sa=0;for(let i=0;i<lp.length;i++){const j=(i+1)%lp.length;sa+=lp[i].x*lp[j].y-lp[j].x*lp[i].y;}
        const a=Math.abs(sa)/2;if(a<800)return;
        _loopCD=90;_grid={};for(const pt of _path.slice(-10)){_grid[Math.floor(pt.x/GRID)+','+Math.floor(pt.y/GRID)]=pt.f;}
        const t=a<2000?{t:'小环',m:.6,b:'🥉小闭环'}:a<8000?{t:'中环',m:1,b:'🥈闭环'}:{t:'大环',m:1.5,b:'🥇大闭环！'};
        let cx=0,cy=0;for(let i=0;i<lp.length;i++){const j=(i+1)%lp.length;const c=lp[i].x*lp[j].y-lp[j].x*lp[i].y;cx+=(lp[i].x+lp[j].x)*c;cy+=(lp[i].y+lp[j].y)*c;}
        cx=cx/(3*sa);cy=cy/(3*sa);
        if(G.turrets.length>=G.maxTurrets)G.turrets.shift();
        let ty='basic';if(G.passives['T12']){for(const p of G.passives['T12']){if(p.effectId==='E01')ty='rapid';else if(p.effectId==='E12')ty='lightning';else if(p.effectId==='E13')ty='frost';else if(p.effectId==='E06')ty='trail';}}
        const T={basic:{e:'🗼',c:'#88aacc',fr:25,d:30,rg:140,l:600},rapid:{e:'🎯',c:'#ff8844',fr:8,d:18,rg:120,l:450},lightning:{e:'⚡',c:'#ffdd44',fr:40,d:50,rg:180,l:500},frost:{e:'❄️',c:'#88ccff',fr:20,d:10,rg:120,l:700},trail:{e:'🐾',c:'#66dd88',fr:15,d:35,rg:160,l:550}};
        const d=T[ty];
        G.turrets.push({x:clamp(cx,60,720),y:clamp(cy,60,500),r:14*t.m,type:ty,emoji:d.e,color:d.c,fireRate:Math.floor(d.fr/t.m),fireTimer:0,damage:Math.floor(d.d*t.m*(1+getDifficultyMultiplier()*.3)),range:d.rg*t.m,life:d.l,maxLife:d.l,tier:t.t,spawnAnim:20});
        triggerPassive('T12');addScore(Math.floor(a/100));
        Tutorial.emit('loop', { tier: t.t, area: Math.floor(a) });
        setFeedback('⭕'+t.b+'!'+Math.floor(a)+'px²','#ffaa00');
        spawnParticles(cx,cy,'#ffaa00',18);
        showFloatingText(cx,cy-10,t.b,'#ffaa00');
        logEvent('turret',{type:ty,tier:t.t});
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

