    // ---------- v9.7 蜿蜒地图 ----------
    function drawWindingMap() {
        if (!G.mapMode) return;
        const w = G.canvasWidth, h = G.canvasHeight;
        ctx.fillStyle = 'rgba(5,10,20,0.92)'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f5c542'; ctx.font = 'bold 20px "PingFang SC",sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(`🗺️ 第${G.floor}层 · 选择路线`, w/2, 32);

        const startX = w / 2, nodeSpacing = 50;
        const MAX_HIST = 6; // 最多显示最近6层
        const allHist = G.pathHistory;
        const skipped = Math.max(0, allHist.length - MAX_HIST);
        const visibleHist = allHist.slice(-MAX_HIST);
        const histLen = visibleHist.length;

        // 分支固定在40%位置
        const branchY = h * 0.40;
        const curY = branchY + nodeSpacing;
        const oldestY = curY + histLen * nodeSpacing;

        // 如果最老节点超出底部，整体上移
        let shift = Math.max(0, oldestY - h + 30);

        // X累积
        let curX = startX;
        // 先应用被跳过的历史的累积偏移
        for (let i = 0; i < skipped; i++) {
            const ph = allHist[i];
            curX += (ph.dir === 'left' ? -35 : ph.dir === 'right' ? 35 : 0);
            curX = clamp(curX, 80, w - 80);
        }

        // 可见历史节点
        let pathPoints = [];
        for (let i = 0; i < histLen; i++) {
            const ph = visibleHist[i];
            curX += (ph.dir === 'left' ? -35 : ph.dir === 'right' ? 35 : 0);
            curX = clamp(curX, 80, w - 80);
            const node = NODE_POOL.find(n => n.id === ph.nodeId) || NODE_POOL[0];
            pathPoints.push({ x: curX, y: oldestY - i * nodeSpacing - shift, type: 'past', node, floor: ph.floor });
        }

        // 如果有跳过的层数，画省略号
        if (skipped > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '14px sans-serif';
            ctx.textAlign = 'center'; ctx.fillText(`··· ${skipped}层已过 ···`, curX, oldestY - shift + 15);
        }

        // 当前节点
        pathPoints.push({ x: curX, y: curY - shift, type: 'current' });

        // 3个分支
        const bY = branchY - shift;
        const branches = [];
        if (G.mapChoices.length >= 3) {
            branches.push({ x: curX - 50, y: bY, node: G.mapChoices[0], dir: 'left' });
            branches.push({ x: curX, y: bY - 8, node: G.mapChoices[1], dir: 'center' });
            branches.push({ x: curX + 50, y: bY, node: G.mapChoices[2], dir: 'right' });
        }

        // 绘制连线（蜿蜒路径）
        ctx.strokeStyle = 'rgba(180,200,220,0.4)'; ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]); ctx.beginPath();
        if (pathPoints.length > 0) { ctx.moveTo(pathPoints[0].x, pathPoints[0].y); }
        for (const pt of pathPoints) { ctx.lineTo(pt.x, pt.y); }
        ctx.stroke(); ctx.setLineDash([]);

        // 到分支的连线
        for (const br of branches) {
            ctx.strokeStyle = 'rgba(255,200,100,0.5)'; ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]); ctx.beginPath();
            ctx.moveTo(curX, curY); ctx.lineTo(br.x, br.y);
            ctx.stroke(); ctx.setLineDash([]);
        }

        // 绘制已走过的节点
        for (const pt of pathPoints) {
            if (pt.type === 'start') continue;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 14, 0, Math.PI*2);
            ctx.fillStyle = pt.type === 'current' ? '#f5c542' : 'rgba(100,140,180,0.6)';
            ctx.fill(); ctx.strokeStyle = pt.type === 'current' ? '#ffb347' : 'rgba(140,180,210,0.5)';
            ctx.lineWidth = 2; ctx.stroke();
            if (pt.node) {
                ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(pt.node.icon, pt.x, pt.y + 1);
            }
        }

        // 绘制分支节点（可点击）
        G._branchRects = [];
        for (const br of branches) {
            const r = 18;
            ctx.beginPath(); ctx.arc(br.x, br.y, r, 0, Math.PI*2);
            const isHover = G.mouse.x > br.x - r && G.mouse.x < br.x + r && G.mouse.y > br.y - r && G.mouse.y < br.y + r;
            ctx.fillStyle = isHover ? '#3a5060' : '#1a2a3a';
            ctx.fill();
            ctx.strokeStyle = br.node.color || '#3a5575'; ctx.lineWidth = isHover ? 3 : 2;
            ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(br.node.icon, br.x, br.y - 2);
            ctx.fillStyle = '#e0e8f0'; ctx.font = '10px sans-serif';
            ctx.fillText(br.node.label, br.x, br.y + 18);
            G._branchRects.push({ x: br.x, y: br.y, r, idx: branches.indexOf(br), dir: br.dir });
        }

        // 操作提示
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px sans-serif';
        ctx.textAlign = 'center'; ctx.fillText('点击节点选择路线 · 蜿蜒小径记录你的冒险', w/2, h - 12);
    }

    // ---------- 渲染 ----------
    function draw() {
        const w = G.canvasWidth || 780;
        const h = G.canvasHeight || 560;
        ctx.clearRect(0, 0, w, h);

        // v9.7: 地图模式（教程的字幕要覆盖在地图之上）
        if (G.mapMode) { drawWindingMap(); drawTutorial(); return; }

        // 背景
        const grad = ctx.createRadialGradient(390, 280, 50, 390, 280, 400);
        grad.addColorStop(0, '#162030');
        grad.addColorStop(1, '#0a101a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 网格
        ctx.strokeStyle = 'rgba(40,70,100,0.2)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < w; x += 40) { ctx.beginPath();
            ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 40) { ctx.beginPath();
            ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        // v9.4: 地形障碍
        for (const t of G.terrain) {
            const alpha = t.alpha * Math.min(1, t.life / 300);
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(60, 70, 90, ${alpha})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(100, 120, 150, ${alpha * 1.5})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // v9.6: 轨迹渲染（带类型）
        for (const t of G.trails) {
            const alpha = Math.min(1, t.life / 120);
            const style = TRAIL_STYLES[t.trailType] || TRAIL_STYLES.basic;
            const width = (getTrailWidth() + t.layer * 2) * (style.widthMul || 1.0);
            ctx.beginPath();
            ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2);
            const a = (alpha * 0.7).toFixed(2);
            ctx.strokeStyle = style.color.replace('{a}', a);
            ctx.lineWidth = width;
            ctx.shadowColor = style.glow.replace('{a}', (alpha * 0.3).toFixed(2));
            ctx.shadowBlur = t.trailType === 'lightning' ? 30 : 20;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        
        // v9.11图腾渲染（v9.17: 血量制，不再按 t.life 淡出）
        for(const t of G.turrets){const a=Math.min(1,(20-t.spawnAnim)/10),s=t.r;
            ctx.fillStyle='rgba(0,0,0,'+(.3*a)+')';ctx.beginPath();ctx.ellipse(t.x,t.y+s*.5,s,s*.25,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#2a2030';ctx.beginPath();ctx.moveTo(t.x,t.y-s);ctx.lineTo(t.x+s*.9,t.y);ctx.lineTo(t.x,t.y+s*.4);ctx.lineTo(t.x-s*.9,t.y);ctx.closePath();ctx.fill();ctx.strokeStyle='#4a3a4a';ctx.lineWidth=2;ctx.stroke();
            ctx.beginPath();ctx.arc(t.x,t.y,s*.55,0,Math.PI*2);ctx.fillStyle='#140e18';ctx.fill();ctx.strokeStyle=t.color;ctx.lineWidth=2;ctx.stroke();
            const p=.5+.5*Math.sin(G.frame*.05);ctx.beginPath();ctx.arc(t.x,t.y,s*.35*p,0,Math.PI*2);ctx.fillStyle=t.color+'88';ctx.fill();
            ctx.fillStyle=t.color;ctx.font='bold '+Math.floor(s*.7)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.emoji,t.x,t.y);
            // 射程指示虚线
            ctx.beginPath();ctx.arc(t.x,t.y,t.range,0,Math.PI*2);ctx.strokeStyle=t.color+'33';ctx.lineWidth=1;ctx.setLineDash([4,10]);ctx.stroke();ctx.setLineDash([]);
            // 出场扩散光环
            if(t.spawnAnim>0){const r=s*(1+(20-t.spawnAnim)*.3);ctx.beginPath();ctx.arc(t.x,t.y,r,0,Math.PI*2);ctx.strokeStyle=t.color+Math.floor(t.spawnAnim/20*15).toString(16);ctx.lineWidth=2.5;ctx.stroke();}
            // 攻击光束（最近0.3秒内发射过）
            if(t._lastFire&&G.frame-t._lastFire<18){const n=t._lastTarget;if(n){ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(n.x,n.y);ctx.strokeStyle=t.color;ctx.lineWidth=1.5;ctx.globalAlpha=(18-G.frame+t._lastFire)/18;ctx.stroke();ctx.globalAlpha=1;}}
            // v9.17: 塔上方血条（放在基座上方，避开射程虚线圈）
            const bw=s*2,bh=4,bx=t.x-bw/2,by=t.y-s-14;
            const hpFrac=Math.max(0,t.hp/t.maxHp);
            ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(bx-1,by-1,bw+2,bh+2);
            ctx.fillStyle=hpFrac>.5?'#66dd88':hpFrac>.25?'#ffcc44':'#ff5544';
            ctx.fillRect(bx,by,bw*hpFrac,bh);
            if(t.hp<t.maxHp){ctx.fillStyle='#cfe4ff';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(Math.ceil(t.hp)+'/'+t.maxHp,t.x,by-2);ctx.textBaseline='middle';}
        }

        // v9.7: 冲刺轨迹（更宽更亮）
        for (const t of G.sprintTrails) {
            const alpha = Math.min(1, t.life / 90);
            const style = TRAIL_STYLES[t.trailType] || TRAIL_STYLES.basic;
            const width = (getTrailWidth() + 4) * (style.widthMul || 1) * 1.5;
            ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2);
            const a = (alpha * 0.9).toFixed(2);
            ctx.strokeStyle = style.color.replace('{a}', a);
            ctx.lineWidth = width;
            ctx.shadowColor = style.glow.replace('{a}', (alpha * 0.6).toFixed(2));
            ctx.shadowBlur = 35; ctx.stroke(); ctx.shadowBlur = 0;
        }

        // v9.1: 火焰轨迹（灼烧怪）
        for (const ft of G.fireTrails) {
            const alpha = Math.min(1, ft.life / 40);
            ctx.beginPath();
            ctx.moveTo(ft.x1, ft.y1);
            ctx.lineTo(ft.x2, ft.y2);
            ctx.strokeStyle = `rgba(255, 100, 30, ${alpha * 0.8})`;
            ctx.lineWidth = 5;
            if (ft.life > 20) {
                ctx.shadowColor = `rgba(255, 80, 20, ${alpha * 0.4})`;
                ctx.shadowBlur = 12;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // v9.19: 火焰伤害的转移粒子——从玩家飞向核心的护盾。
        // 画在玩家之后，且带拖尾，让「伤害被核心吸走了」这件事看得见。
        for (const df of G.damageFlows) {
            const p = df.t / df.life;
            const x = df.x1 + (df.x2 - df.x1) * p;
            const y = df.y1 + (df.y2 - df.y1) * p;
            const a = 1 - p;
            // 从玩家出发的一小段拖尾（p 越小拖尾越长，像被拉过去的）
            const tx = df.x1 + (df.x2 - df.x1) * Math.max(0, p - 0.18);
            const ty = df.y1 + (df.y2 - df.y1) * Math.max(0, p - 0.18);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.strokeStyle = df.toShield ? `rgba(255,140,60,${a * 0.9})` : `rgba(255,60,60,${a * 0.9})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = df.toShield ? `rgba(120,255,180,${a})` : `rgba(255,120,120,${a})`;
            ctx.fill();
        }

        // v9.3: 环境危险区
        for (const hz of G.hazardZones) {
            const alpha = hz.life / hz.maxLife;
            const pulse = 0.8 + 0.2 * Math.sin(G.frame * 0.08);
            ctx.beginPath();
            ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 30, ${alpha * 0.15 * pulse})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 80, 40, ${alpha * 0.5 * pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 核心
        ctx.beginPath();
        ctx.arc(G.core.x, G.core.y, G.core.r, 0, Math.PI * 2);
        const coreColor = G.core.hp > 50 ? '#4a9eff' : '#ff6644';
        ctx.fillStyle = `rgba(74, 158, 255, 0.15)`;
        ctx.fill();
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#e8f0ff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏰', G.core.x, G.core.y - 2);
        // v9.19: 两条血条都画在核心头顶。护盾在上（外层防御），核心血量在下。
        // 护盾条原来挂在玩家头顶——但玩家是会跑的，而打的是核心，读的人找不到。
        const cw = 44;
        const barX = G.core.x - cw / 2;
        const shieldY = G.core.y - G.core.r - 22;
        const coreY = G.core.y - G.core.r - 13;

        // 护盾（= G.player.hp）
        const shieldRatio = Math.min(1, Math.max(0, G.player.hp / G.player.maxHp));
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(barX - 1, shieldY - 1, cw + 2, 6);
        ctx.fillStyle = shieldRatio > 0.5 ? '#44dd88' : shieldRatio > 0.25 ? '#ffcc44' : '#ff5544';
        ctx.fillRect(barX, shieldY, cw * shieldRatio, 4);
        ctx.fillStyle = '#8fd9b0';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡' + Math.ceil(G.player.hp), barX + cw + 4, shieldY + 2);

        // 核心血量
        const coreHpRatio = Math.min(1, Math.max(0, G.core.hp / G.core.maxHp));
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(barX - 1, coreY - 1, cw + 2, 6);
        ctx.fillStyle = coreHpRatio > 0.5 ? '#4a9eff' : '#ff6644';
        ctx.fillRect(barX, coreY, cw * coreHpRatio, 4);
        ctx.fillStyle = '#9dc4ff';
        ctx.fillText('🏰' + Math.ceil(G.core.hp), barX + cw + 4, coreY + 2);
        ctx.textAlign = 'center';

        // 玩家
        ctx.shadowColor = '#4a9eff44';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(G.player.x, G.player.y, G.player.r, 0, Math.PI * 2);
        ctx.fillStyle = '#5ac8fa';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#8ad4ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        let aimAngle = 0;
        if (G.target) aimAngle = angleTo(G.player, G.target);
        else if (G.monsters.length > 0) {
            let nearest = null,
                nd = Infinity;
            for (const m of G.monsters) { const d = dist(G.player, m); if (d < nd) { nd = d;
                    nearest = m; } }
            if (nearest) aimAngle = angleTo(G.player, nearest);
        }
        ctx.beginPath();
        ctx.moveTo(G.player.x + Math.cos(aimAngle) * 18, G.player.y + Math.sin(aimAngle) * 18);
        ctx.lineTo(G.player.x + Math.cos(aimAngle + 0.5) * 12, G.player.y + Math.sin(aimAngle + 0.5) * 12);
        ctx.lineTo(G.player.x + Math.cos(aimAngle - 0.5) * 12, G.player.y + Math.sin(aimAngle - 0.5) * 12);
        ctx.closePath();
        ctx.fillStyle = '#ffdd88';
        ctx.fill();

        // v9.19: 玩家头顶的血条挪到核心头顶了（见上面的护盾条）——玩家只是操作对象，
        // 护盾保的是核心，条子就该跟着核心走。

        // 怪物
        for (const m of G.monsters) {
            if (m.isBoss) {
                const pulse = 0.7 + 0.3 * Math.sin(G.frame * 0.05);
                ctx.shadowColor = `rgba(255,40,80,${0.6 * pulse})`;
                ctx.shadowBlur = 35;
                const bg = ctx.createRadialGradient(m.x, m.y, m.r * 0.3, m.x, m.y, m.r);
                bg.addColorStop(0, '#ff4466'); bg.addColorStop(1, '#881122');
                ctx.fillStyle = bg; ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#ff6688'; ctx.lineWidth = 3;
                ctx.setLineDash([6, 3]); ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 8, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('👑', m.x, m.y);
                const bhpw = m.r * 2.5;
                ctx.fillStyle = '#1a1a2a';
                ctx.fillRect(m.x - bhpw / 2, m.y - m.r - 20, bhpw, 7);
                const hr = Math.min(1, Math.max(0, m.hp / m.maxHp));
                ctx.fillStyle = hr > 0.5 ? '#ff4466' : hr > 0.25 ? '#ff8844' : '#ff2222';
                ctx.fillRect(m.x - bhpw / 2, m.y - m.r - 20, bhpw * hr, 7);
                ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif';
                ctx.fillText(`👑BOSS ${Math.floor(Math.max(0, m.hp))}`, m.x, m.y - m.r - 26);
            } else {
                // v9.1: 虚灵鬼影残影
                if (m.isWraith) {
                    for (let t = 1; t <= 3; t++) {
                        ctx.globalAlpha = 0.12;
                        ctx.beginPath();
                        ctx.arc(m.x - (m.vx_prev || 0) * t * 2, m.y - (m.vy_prev || 0) * t * 2, m.r, 0, Math.PI * 2);
                        ctx.fillStyle = m.color;
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                }
                const wraithAlpha = m.isWraith ? 0.55 : 1;
                ctx.globalAlpha = wraithAlpha;
                ctx.shadowColor = m.isElite ? '#ff664466' : '#ff444433';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                ctx.fillStyle = m.color || '#cc6633';
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = m.isElite ? '#ff8866' : '#ffaa66';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#fff';
                ctx.font = `${Math.max(m.r * 0.7, 8)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(m.typeEmoji || '👾', m.x, m.y + 1);

                const bw = m.r * 2;
                const mHpRatio = Math.min(1, Math.max(0, m.hp / m.maxHp));
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(m.x - bw / 2, m.y - m.r - 8, bw, 3);
            ctx.fillStyle = mHpRatio > 0.5 ? '#44dd88' : '#ff6644';
            ctx.fillRect(m.x - bw / 2, m.y - m.r - 8, bw * mHpRatio, 3);
            ctx.globalAlpha = 1;
            }

            if (m.isElite) {
                ctx.strokeStyle = '#ff8844';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            if (m.isHealer) {
                ctx.strokeStyle = '#44ff88';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 4]);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            if (m.isSplitter && m.canSplit) {
                ctx.strokeStyle = '#ffaa44';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 4]);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            if (m.isSlow) {
                ctx.strokeStyle = '#bb88dd';
                ctx.lineWidth = 2;
                ctx.setLineDash([2, 4]);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 10, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            if (m === G.target) {
                ctx.strokeStyle = '#ffdd44';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 6]);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 12, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            // v9.1: 词缀光环
            if (m.affixes && m.affixes.length > 0) {
                const affixDef = AFFIXES.find(a => a.id === m.affixes[0]);
                if (affixDef) {
                    ctx.strokeStyle = affixDef.color;
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([3, 5]);
                    ctx.beginPath();
                    ctx.arc(m.x, m.y, m.r + 10, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
            // v9.1: 冰冻冰晶
            if (m.frozen > 0) {
                ctx.strokeStyle = 'rgba(180, 220, 255, 0.7)';
                ctx.lineWidth = 3;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r + 6, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(200, 230, 255, 0.25)';
                ctx.beginPath();
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
                ctx.fill();
            }
            // v9.1: 眩晕指示
            if (m.stunned > 0) {
                ctx.fillStyle = 'rgba(255,255,100,0.5)';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💫', m.x, m.y - m.r - 14);
            }
        }

        // 子弹
        for (const b of G.bullets) {
            const isCrit = b.isCrit;
            ctx.shadowColor = isCrit ? '#ff6644aa' : '#ffdd44aa';
            ctx.shadowBlur = isCrit ? 18 : 12;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = isCrit ? '#ff6644' : '#ffdd44';
            ctx.fill();
            if (isCrit) {
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // 粒子
        for (const p of G.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // 浮动数值
        // font/对齐方式在循环外设置一次：每帧重复赋 font 会触发字体匹配，很贵
        if (G.floatingTexts.length > 0) {
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const ft of G.floatingTexts) {
                ctx.globalAlpha = ft.life / ft.maxLife;
                ctx.fillStyle = ft.color;
                ctx.fillText(ft.text, ft.x, ft.y);
            }
            ctx.globalAlpha = 1;
        }
        ctx.globalAlpha = 1;

        // 准星
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(G.mouse.x, G.mouse.y, 6, 0, Math.PI * 2);
        ctx.stroke();

        // 信息
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        const typeCounts = {};
        for (const m of G.monsters) {
            const label = m.typeLabel || '未知';
            typeCounts[label] = (typeCounts[label] || 0) + 1;
        }
        let typeStr = Object.entries(typeCounts).map(([k, v]) => `${k}:${v}`).join(' ');
        // v9.21: 图腾计数进 HUD——满上限时闭环不再出塔，不给数字玩家会以为是 bug。
        // 平时维持原来那行淡白，只有满了才转成橙色，等于顺带当个警告灯。
        const tFull = G.turrets.length >= G.maxTurrets;
        ctx.fillStyle = tFull ? 'rgba(255,136,68,0.75)' : 'rgba(255,255,255,0.10)';
        ctx.fillText(`被动:${Object.keys(G.passives).length} | 🗼${G.turrets.length}/${G.maxTurrets} | 连杀:${G.killStreak} | ${typeStr}`, 12, h - 12);

        const diff = getDifficultyMultiplier();
        ctx.fillStyle = 'rgba(255,136,68,0.3)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const st = STAGE_TYPES.find(s => s.id === G.stageType);
        const stIcon = st ? st.icon : '⚔️';
        ctx.fillText(`${stIcon} 层${G.floor} 难度×${diff.toFixed(2)}`, w - 12, h - 12);

        // 游戏结束
        if (G.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#ff6644';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀 游戏结束', w / 2, h / 2 - 60);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#f5c542';
            ctx.fillText(`得分: ${fmtScore(G.score)}  |  波次: ${G.floor}`, w / 2, h / 2 + 10);
            ctx.font = '18px sans-serif';
            ctx.fillStyle = '#b8d0ea';
            ctx.fillText(`击杀: ${G.killCount}  |  最高连杀: ${G.maxCombo}`, w / 2, h / 2 + 50);
            const clsName = G.playerClass ? G.playerClass.name : '未选择';
            ctx.fillText(`职业: ${clsName}  |  遗物: ${G.relics.length}个`, w / 2, h / 2 + 80);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#ff8844';
            ctx.fillText(`最终难度系数: ×${getDifficultyMultiplier().toFixed(2)}`, w / 2, h / 2 + 110);
        }

        // v9.1: 终极技能冲击波
        if (G.ultimateActive) {
            const progress = 1 - (G.ultimateTimer / 60);
            const ringR = 50 + progress * 350;
            const ringA = 1 - progress;
            ctx.strokeStyle = `rgba(255, 200, 60, ${ringA * 0.6})`;
            ctx.lineWidth = 4 + (1 - progress) * 6;
            ctx.beginPath();
            ctx.arc(G.core.x, G.core.y, ringR, 0, Math.PI * 2);
            ctx.stroke();
        }

        // v9.1: 屏幕闪光
        if (G.screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 220, 80, ${G.screenFlash * 0.25})`;
            ctx.fillRect(0, 0, w, h);
        }

        // v9.1: 通知渲染
        for (const n of G.notifications) {
            const a = Math.min(1, n.life / 30) * (n.life / n.maxLife);
            ctx.globalAlpha = a;
            ctx.fillStyle = n.color;
            ctx.font = 'bold 16px "PingFang SC", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(n.text, w / 2, h / 2 - 100);
        }
        ctx.globalAlpha = 1;

        // v9.1: 终极技能充能条
        if (!G.gameOver) {
            const gW = 120, gH = 7, gX = w / 2 - gW / 2, gY = h - 16;
            ctx.fillStyle = 'rgba(20,30,50,0.8)';
            ctx.fillRect(gX, gY, gW, gH);
            const ratio = G.ultimateGauge / G.ultimateMax;
            const fg = ctx.createLinearGradient(gX, 0, gX + gW, 0);
            fg.addColorStop(0, '#ff6622'); fg.addColorStop(0.5, '#ffdd44'); fg.addColorStop(1, '#ffaa00');
            ctx.fillStyle = fg;
            ctx.fillRect(gX, gY, gW * ratio, gH);
            ctx.strokeStyle = 'rgba(255,200,100,0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(gX, gY, gW, gH);
            ctx.fillStyle = 'rgba(255,255,200,0.7)';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ratio >= 1 ? '⚡ 就绪 [Q]' : `⚡ ${Math.floor(ratio * 100)}%`, w / 2, gY - 4);
        }

        drawTutorial();
    }

