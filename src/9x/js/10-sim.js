    // ---------- v9.10 导出对局记录 ----------
    function exportGameLog() {
        if (G.gameLog.length === 0) { setFeedback('📋 暂无对局记录', '#8aa3c0'); return; }
        // 生成格式化文本报告
        let report = [];
        report.push('═══════════════════════════════════');
        report.push('  《密纹轨迹》对局记录  v9.10');
        report.push('═══════════════════════════════════');
        report.push('');
        const clsName = G.playerClass ? G.playerClass.name : '未选择';
        report.push(`职业: ${clsName}    最终楼层: ${G.floor}    得分: ${fmtScore(G.score)}`);
        report.push(`击杀: ${G.killCount}    遗物: ${G.relics.map(r=>r.name).join(', ') || '无'}`);
        report.push(`被动层数: ${sumPassiveLayers()}    难度: ×${getDifficultyMultiplier().toFixed(2)}`);
        report.push('');

        let lastFloor = 0;
        for (const ev of G.gameLog) {
            if (ev.floor !== lastFloor) {
                report.push(`── 第${ev.floor}层 ──`);
                lastFloor = ev.floor;
            }
            switch (ev.type) {
                case 'class_select':
                    report.push(`  🧙 选择职业: ${ev.data.className}`);
                    break;
                case 'node_select':
                    report.push(`  🗺️ 选关: ${ev.data.nodeLabel} (${ev.data.dir})`);
                    break;
                case 'floor_start':
                    const fs = ev.data.snapshot;
                    report.push(`  ▶ 开战: ${ev.data.stageType} ${ev.data.isBoss?'👑BOSS ':''}×${ev.data.monsterCount}只`);
                    report.push(`    属性 | HP${fs.hp}/${fs.maxHp} 攻${fs.atk} 倍×${fs.mult} 轨伤${fs.trailDmg} 轨宽${fs.trailWidth} 速${fs.speed} 减速${fs.slowAll}%`);
                    report.push(`    被动${fs.passives}层 | 遗物[${fs.relics.join(',')||'无'}] | 手牌${fs.handCount}(${fs.handBreakdown}) | 难度×${fs.difficulty}`);
                    break;
                case 'floor_clear':
                    const fc = ev.data.snapshot;
                    report.push(`  ✔ 清场: ${ev.data.floorKills}杀 获${ev.data.cardsThisFloor}牌`);
                    report.push(`    属性 | HP${fc.hp}/${fc.maxHp} 攻${fc.atk} 倍×${fc.mult} 轨伤${fc.trailDmg} 轨宽${fc.trailWidth} 速${fc.speed}`);
                    break;
                case 'stat_choice':
                    report.push(`  ✨ 属性选择: ${ev.data.choice} (${ev.data.desc})`);
                    break;
                case 'card_drop':
                    report.push(`  📥 获得密文版: ${ev.data.cardLabel}(${ev.data.cardType==='trigger'?'触发':'效果'})`);
                    break;
                case 'card_combine':
                    const cc = ev.data;
                    report.push(`  🔮 组合: ${cc.trigger}+${cc.effect}${cc.chairHit?' 🦽「'+cc.chairHit+'」':''}`);
                    break;
                case 'relic_get':
                    report.push(`  🏺 获得遗物: ${ev.data.relicName} (${ev.data.rarity})`);
                    break;
                case 'fate_choice':
                    report.push(`  🔮 命运抉择: ${ev.data.fateName} — ${ev.data.fateDesc}`);
                    break;
                case 'merchant_buy':
                    report.push(`  🛒 商人购买: ${ev.data.itemLabel} (${ev.data.itemType}) 💎${ev.data.cost}`);
                    break;
                case 'game_over':
                    const gs = ev.data.snapshot;
                    report.push(`  💀 游戏结束: ${ev.data.reason}`);
                    report.push(`    终局 | HP${gs.hp}/${gs.maxHp} 攻${gs.atk} 倍×${gs.mult} 轨伤${gs.trailDmg} 轨宽${gs.trailWidth} 速${gs.speed} 分${fmtScore(gs.score)}`);
                    break;
            }
        }
        report.push('');
        report.push('═══════════════════════════════════');
        const text = report.join('\n');
        // 直接下载为文本文件
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `密文轨迹_对局记录_层${G.floor}_分${fmtScore(G.score)}.txt`;
        a.click(); URL.revokeObjectURL(url);
        setFeedback('📋 对局记录已下载！', '#aaddbb');
    }

    // ============================================================
    //  v9.10 自动模拟模式 —— 所有新增函数
    // ============================================================

    // ---------- JSON导出 ----------
    function exportGameLogJSON() {
        const result = {
            version: '9.10',
            timestamp: new Date().toISOString(),
            summary: {
                className: G.playerClass ? G.playerClass.name : 'none',
                finalFloor: G.floor,
                score: G.score,              // 原始值：模拟分析要用
                scoreLog: fmtScore(G.score), // v9.15: 界面上的对数写法
                kills: G.killCount,
                maxCombo: G.maxCombo,
                gameOverReason: G.core.hp <= 0 ? 'core_destroyed' : (G.simTargetFloor > 0 ? 'target_floor_reached' : 'unknown'),
                finalDifficulty: +getDifficultyMultiplier().toFixed(2),
                relics: G.relics.map(r => r.name),
                passiveLayers: sumPassiveLayers(),
                finalStats: snapshotStats(),
            },
            events: G.gameLog,
        };
        return JSON.stringify(result, null, 2);
    }

    // ---------- 模拟结束处理 ----------
    function handleSimGameOver() {
        const jsonOutput = exportGameLogJSON();
        window.__SIM_RESULT__ = jsonOutput;
        // 写入页面隐藏pre供外部抓取
        let pre = document.getElementById('simResult');
        if (!pre) {
            pre = document.createElement('pre');
            pre.id = 'simResult';
            pre.style.display = 'none';
            document.body.appendChild(pre);
        }
        pre.textContent = jsonOutput;
        console.log('===SIM_RESULT===');
        console.log(jsonOutput);
        console.log('===END_SIM_RESULT===');
    }

    // ---------- 自动驾驶 ----------
    function autoPilot() {
        const p = G.player;
        const core = G.core;
        const hpRatio = G.player.hp / G.player.maxHp;
        const w = G.canvasWidth || 780, h = G.canvasHeight || 560;

        // === 逃跑模式：HP<20%时不画圈，逃到安全角落 ===
        if (hpRatio < 0.2 && G.monsters.length > 0) {
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

        // 检测是否有怪物靠近（需要闪避）
        const dodgeDist = hpRatio < 0.3 ? 160 : hpRatio < 0.5 ? 130 : 90;
        const nearMonster = G.monsters.find(m => dist(p, m) < dodgeDist && !m.isWraith);

        if (nearMonster) {
            // 闪避：朝远离最近怪物的方向移动
            const angle = angleTo(nearMonster, p);
            G.keys.w = Math.sin(angle) < -0.3;
            G.keys.s = Math.sin(angle) > 0.3;
            G.keys.a = Math.cos(angle) < -0.3;
            G.keys.d = Math.cos(angle) > 0.3;
        } else {
            // === 8字形轨道巡逻 ===
            const orbitBase = hpRatio < 0.3 ? 180 : hpRatio < 0.5 ? 140 : 110;
            const phase1 = G.frame * 0.04;
            const phase2 = G.frame * 0.06;
            const orbitRadius = orbitBase + Math.sin(G.frame * 0.015) * 25;
            const targetX = core.x + Math.cos(phase1) * orbitRadius * 0.7 + Math.sin(phase2) * orbitRadius * 0.5;
            const targetY = core.y + Math.sin(phase1) * orbitRadius * 0.7 + Math.cos(phase2) * orbitRadius * 0.3;
            const dx = targetX - p.x, dy = targetY - p.y;
            G.keys.w = dy < -2;
            G.keys.s = dy > 2;
            G.keys.a = dx < -2;
            G.keys.d = dx > 2;
        }

        // 始终冲刺
        G.keys.shift = true;
    }

    // ---------- 自动职业选择 ----------
    function simAutoSelectClass() {
        const priorities = ['trailWeaver', 'guardian', 'arcaneScholar', 'bulletStorm'];
        let selected = CLASSES.find(c => c.id === priorities[0]) || CLASSES[0];
        G.playerClass = selected;
        selected.apply(G);
        logEvent('class_select', { className: selected.name });
        G.selectingActive = false; G.paused = false;
        addScore(10);
        startFloor();
    }

    // ---------- 自动属性选择 ----------
    function simAutoStatChoice() {
        const shuffled = [...STAT_CHOICES].sort(() => Math.random() - 0.5);
        const choices = shuffled.slice(0, 3);
        // v9.21: 和 07-ui.js 的 showStatChoice 保持同一个稀有度——跑分要能覆盖到它
        if (Math.random() < 0.01 * (1 + G.floor / 10)) {
            choices[Math.floor(Math.random() * choices.length)] = { ...TURRET_SLOT_CHOICE };
        }

        const hpRatio = G.player.hp / G.player.maxHp;
        let best = choices[0];
        let bestScore = -Infinity;
        for (const c of choices) {
            let score = 0;
            if (c.id === 'heal') {
                if (hpRatio < 0.25) score = 160;
                else if (hpRatio < 0.4) score = 130;
                else if (hpRatio < 0.6) score = 85;
                else score = 10;
            } else if (c.id === 'trailUp') {
                score = 70;
            } else if (c.id === 'atkUp') {
                score = 55;
            } else if (c.id === 'speedUp') {
                score = 40;
            } else if (c.id === 'turretHp') {
                score = 45;   // v9.18 新增两项也给它打分，否则跑分永远抽不到、等于没覆盖
            } else if (c.id === 'trailWidth') {
                score = 30;
            } else if (c.id === 'turretSlot') {
                // 稀有的那张，撞见就买——上限跑分里也要真的被测到
                score = 120;
            }
            score += Math.random() * 8;
            if (score > bestScore) { bestScore = score; best = c; }
        }

        logEvent('stat_choice', { choice: best.label, desc: best.desc });
        best.apply();
        G.selectingActive = false;
        G.selectionCards = [];
        addScore(15);
        simAutoNodeMap();
    }

    // ---------- 自动地图选择 ----------
    function simAutoNodeMap() {
        const pool = [...NODE_POOL];
        const available = pool.filter(n => {
            if (n.id === 'boss') return (G.floor % 10 === 9);
            if (n.id === 'merchant') return (G.floor % 4 === 0 || G.floor % 4 === 3);
            if (n.id === 'rest') return true;
            return n.stageType; // combat nodes
        });
        const shuffled = available.sort(() => Math.random() - 0.5);
        const choices = shuffled.slice(0, 3);

        const hpRatio = G.player.hp / G.player.maxHp;
        let best = choices[0];
        let bestScore = -Infinity;
        for (const node of choices) {
            let score = 0;
            if (node.isRest) {
                if (hpRatio < 0.3) score = 250;
                else if (hpRatio < 0.5) score = 200;
                else if (hpRatio < 0.7) score = 120;
                else score = 15;
            } else if (node.isMerchant) {
                if (hpRatio < 0.4) score = 160;
                else if (hpRatio < 0.6) score = 100;
                else score = 50;
            } else if (node.id === 'elite') {
                score = hpRatio < 0.7 ? 5 : 80;
            } else if (node.id === 'boss') {
                score = 200;
            } else if (node.stageType) {
                if (node.stageType === 'ghostTown') {
                    score = hpRatio < 0.6 ? 0 : 30;
                } else if (node.stageType === 'siege') {
                    score = hpRatio < 0.4 ? 0 : (hpRatio < 0.6 ? 15 : 35);
                } else if (node.stageType === 'fastRush') {
                    score = hpRatio < 0.3 ? 5 : 35;
                } else {
                    score = 40;
                }
            }
            score += Math.random() * 8;
            if (score > bestScore) { bestScore = score; best = node; }
        }

        logEvent('node_select', { nodeId: best.id, nodeLabel: best.label, dir: 'center' });
        G.pathHistory.push({ dir: 'center', nodeId: best.id, floor: G.floor });
        G.mapMode = false; G.selectingActive = false;

        if (best.isMerchant) {
            simAutoMerchantVisit(best);
        } else if (best.isRest) {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.3);
            for (let i = 0; i < 2; i++) {
                // v9.21: 触发板走加权抽取，和 07-ui.js 的休整节点保持一致
                const isT = Math.random() < 0.5;
                const card = isT ? randomTrigger() : EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
                G.hand.push({ ...card, type: isT ? 'trigger' : 'effect' });
            }
            logEvent('rest_node', {});
            G.stageType = 'mixed';
            advanceFloor();
        } else {
            G.stageType = best.stageType || 'mixed';
            advanceFloor();
        }
    }

    // ---------- 自动商人购物 ----------
    function simAutoMerchantVisit(node) {
        G.merchantStock = getMerchantStock();
        G.shopSoldOut = [];
        const stock = G.merchantStock.map((item, i) => ({ ...item, idx: i }));

        const healItem = stock.find(s => s.type === 'heal');
        if (healItem && G.player.hp < G.player.maxHp * 0.5 && G.essence >= healItem.cost) {
            simDoBuy(healItem);
        }

        const cards = stock.filter(s => s.type === 'card' && G.essence >= s.cost)
            .sort((a, b) => a.cost - b.cost);
        for (const card of cards.slice(0, 2)) {
            if (!G.shopSoldOut.includes(card.idx)) simDoBuy(card);
        }

        const relic = stock.find(s => s.type === 'relic');
        if (relic && !G.shopSoldOut.includes(relic.idx) && G.essence >= relic.cost + 10) {
            simDoBuy(relic);
        }

        // v9.18: 原「精华提取」已删。改成优先买便宜的增益，模拟器不该囤着精华
        // 空手离店——那会让「每层精华上限」在跑分里表现为「精华一路堆到爆」，
        // 掩盖掉这次经济改动的真实效果。
        const buffs = stock.filter(s => s.type === 'buff' && !G.shopSoldOut.includes(s.idx))
            .sort((a, b) => a.cost - b.cost);
        for (const buff of buffs) {
            if (G.essence >= buff.cost) simDoBuy(buff);
        }

        G.selectingActive = false;
        advanceFloor();
    }

    function simDoBuy(item) {
        if (G.shopSoldOut.includes(item.idx)) return;
        if (G.essence < item.cost) return;
        G.essence -= item.cost;
        G.shopSoldOut.push(item.idx);
        logEvent('merchant_buy', { itemType: item.type, itemLabel: item.label, cost: item.cost });
        if (item.type === 'card') {
            G.hand.push({ ...item.card, type: item.card.cardType });
        } else if (item.type === 'relic') {
            G.relics.push(item.relic);
            item.relic.apply(G);
        } else if (item.type === 'heal') {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.4);
        } else if (item.type === 'buff') {
            item.buff.apply();   // v9.18: 与每层奖励同一套加成
        }
    }

    // ---------- 自动命运抉择 ----------
    function simAutoFateChoice() {
        G.fateChoosing = true;
        const shuffled = [...FATE_CHOICES].sort(() => Math.random() - 0.5);
        const options = shuffled.slice(0, 2);

        const scores = {
            trailMaster: 100, ironWall: 90, bulletStorm: 80,
            ultraCharge: 70, vampiricAura: 65, berserker: 50,
            speedDemon: 20, doubleDrop: 10,
        };

        let best = options[0];
        let bestScore = -Infinity;
        for (const opt of options) {
            const s = (scores[opt.id] || 50) + Math.random() * 10;
            if (s > bestScore) { bestScore = s; best = opt; }
        }

        logEvent('fate_choice', { fateName: best.label, fateDesc: best.desc, snapshot: snapshotStats() });
        best.apply();
        G.fateChoosing = false;
        G.selectingActive = false;
        G.fateOptions = [];
        addScore(25);
        startFloor();
    }

    // ---------- 自动组合密文 ----------
    function simAutoCombine() {
        if (G.combineCooldown || G.hand.length < 2) return;

        // === 智能组合策略：按优先级匹配最佳触发+效果对 ===
        const priorityPairs = [
            { t:'T07', e:'E02', name:'弹幕地狱' },
            { t:'T06', e:'E10', name:'轨迹反噬' },
            { t:'T06', e:'E13', name:'冰轨永冻' },
            { t:'T08', e:'E03', name:'吸血领主' },
            { t:'T07', e:'E12', name:'连锁风暴' },
            { t:'T07', e:'E01', name:'攻击增幅' },
            { t:'T06', e:'E06', name:'轨迹升级' },
            { t:'T02', e:'E07', name:'爆轨清场' },
            { t:'T08', e:'E11', name:'自速暴涨' },
            { t:'T07', e:'E04', name:'移速减慢' },
        ];

        for (const pair of priorityPairs) {
            const tIdx = G.hand.findIndex(c => c.type === 'trigger' && c.id === pair.t);
            const eIdx = G.hand.findIndex(c => c.type === 'effect' && c.id === pair.e);
            if (tIdx >= 0 && eIdx >= 0 && tIdx !== eIdx) {
                const trigger = G.hand[tIdx];
                const effect = G.hand[eIdx];
                if (tIdx > eIdx) { G.hand.splice(tIdx, 1); G.hand.splice(eIdx, 1); }
                else { G.hand.splice(eIdx, 1); G.hand.splice(tIdx, 1); }
                doCombine(trigger, effect);
                G.combineCooldown = false;
                return;
            }
        }

        // 回退：第一个触发+效果
        const trigger = G.hand.find(c => c.type === 'trigger');
        const effect = G.hand.find(c => c.type === 'effect');
        if (!trigger || !effect) return;
        const tIdx = G.hand.indexOf(trigger);
        const eIdx = G.hand.indexOf(effect);
        if (tIdx > eIdx) { G.hand.splice(tIdx, 1); G.hand.splice(eIdx, 1); }
        else { G.hand.splice(eIdx, 1); G.hand.splice(tIdx, 1); }
        doCombine(trigger, effect);
        G.combineCooldown = false;
    }

    // ---------- 模拟循环 ----------
    function simLoop() {
        for (let i = 0; i < G.simSpeed; i++) {
            update();
            if (G.gameOver) break;
        }

        if (!G.simSkipDraw && G.frame % 10 === 0) {
            draw();
        }

        if (G.gameOver) {
            handleSimGameOver();
            return;
        }

        // 帧数安全阀：防止无限循环
        const maxFrames = (G.simTargetFloor || 200) * 12000;
        if (G.frame > maxFrames) {
            G.gameOver = true;
            logEvent('game_over', { reason: 'timeout', snapshot: snapshotStats() });
            handleSimGameOver();
            return;
        }

        setTimeout(simLoop, G.simSpeed > 5 ? 0 : 5);
    }

    // ============================================================
    //  v9.10 启动
    // ============================================================
    if (G.simMode) {
        // 关闭所有遮罩层
        ['classOverlay','pauseOverlay','pauseWorkshop','selectionOverlay',
         'mapOverlay','merchantOverlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });
        simAutoSelectClass();
    } else {
        updateUI(); updateBatchUI();
        setFeedback('🧙 选择你的密文法师职业以开始冒险', '#f5c542');
        initClassSelection();
    }

    // 启动游戏循环
    tutorialCheckBalance();
    gameLoop();
