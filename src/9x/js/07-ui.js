    // ---------- UI ----------
    function updateUI() {
        if (G.simMode) return;
        document.getElementById('coreDisplay').textContent = Math.round(G.core.hp) + '%';
        document.getElementById('waveDisplay').textContent = G.floor;
        document.getElementById('scoreDisplay').textContent = fmtScore(G.score);
        document.getElementById('hpDisplay').textContent = Math.round(G.player.hp);
        document.getElementById('atkDisplay').textContent = Math.round(G.player.atk + G.buffs.atkUp);
        document.getElementById('multDisplay').textContent = `x${(1 + G.buffs.multUp).toFixed(1)}`;
        document.getElementById('monsterCount').textContent = G.monsters.length + (G.monstersToSpawn > 0 ? ` (+${G.monstersToSpawn})` : '');
        document.getElementById('killDisplay').textContent = G.killCount;
        document.getElementById('essenceDisplay').textContent = G.essence;
        document.getElementById('diffDisplay').textContent = `×${getDifficultyMultiplier().toFixed(2)}`;
        updateHandCount();
        renderHandUI();
        renderSlotsUI();
        updatePassiveUI();
        const btn = document.getElementById('combineBtn');
        if (btn) btn.disabled = G.combineCooldown || !G.triggerSlot || !G.effectSlot || G.gameOver;
        updateMobileHud();
    }

    // v9.24: 手机端顶部数据条。桌面端的右侧侧栏在手机上被折叠进左侧抽屉，
    // 于是「核心/楼层/精华/得分/护盾」这五个数字需要一个常驻的位置——
    // 就放在右上角，用最紧凑的写法。数据源仍是这里，不另开一条数据流。
    function updateMobileHud() {
        const el = document.getElementById('mobileHud');
        if (!el) return;
        const core = Math.round(G.core.hp);
        const shield = Math.round(G.player.hp);
        // 护盾见底时闪红——这是手机上唯一一眼能看到的危险信号
        const shieldColor = shield <= 0 ? '#ff4455' : (shield < 30 ? '#ffb347' : '#7bd9a0');
        el.innerHTML =
            `<span>🏰${core}%</span>` +
            `<span>🏢${G.floor}</span>` +
            `<span>💎${G.essence}</span>` +
            `<span>⭐${fmtScore(G.score)}</span>` +
            `<span style="color:${shieldColor}">🛡${shield}</span>`;
    }

    // v9.3: 移除被动
    function removePassive(triggerId, effectId) {
        if (!G.passives[triggerId]) return;
        const idx = G.passives[triggerId].findIndex(p => p.effectId === effectId);
        if (idx === -1) return;
        const removed = G.passives[triggerId][idx];
        G.passives[triggerId].splice(idx, 1);
        if (G.passives[triggerId].length === 0) delete G.passives[triggerId];
        const isHF = (triggerId === 'T06' || triggerId === 'T07' || triggerId === 'T08');
        // 回退被动效果（与applyPassiveEffect中的isInitial值保持一致）
        if (effectId === 'E01') G.buffs.atkUp -= removed.count * (isHF ? 5 : 12);
        if (effectId === 'E02') G.buffs.multUp -= removed.count * 0.25;
        if (effectId === 'E06') { G.buffs.trailDmg -= removed.count * 1;
            G.buffs.trailWidth -= removed.count * 2; }
        if (effectId === 'E11') G.buffs.speedUp -= removed.count * 0.35;
        setFeedback(`🗑 移除 ${removed.count}层被动`, '#8aa3c0');
        updatePassiveUI();
        updateUI();
    }

    function updatePassiveUI() {
        if (G.simMode) return;
        const container = document.getElementById('passiveList');
        if (!container) return;
        const keys = Object.keys(G.passives);
        let usedSlots = 0;
        for (const tid of keys) usedSlots += G.passives[tid].length;
        const slotInfo = `<span style="font-size:9px;color:#ffb347;">${usedSlots}/${G.maxSlots}槽</span>`;
        document.getElementById('passiveSlotInfo').innerHTML = slotInfo;
        if (keys.length === 0) {
            container.innerHTML = '<div style="color:#5a7a9a;font-size:10px;">暂无被动</div>';
            return;
        }
        let html = '';
        for (const triggerId of keys) {
            const trigger = TRIGGERS.find(t => t.id === triggerId);
            const label = trigger ? trigger.label : triggerId;
            const emoji = trigger ? trigger.emoji : '❓';
            for (const p of G.passives[triggerId]) {
                const effect = EFFECTS.find(e => e.id === p.effectId);
                const effectLabel = effect ? effect.label : p.effectId;
                // v9.24: 「封印」词条压住的被动划掉并标出剩余秒数。
                // 被动本身没被删除，只是 triggerPassive() 会跳过它——所以这里
                // 显示的是「暂时失效」而不是「没了」。
                const sealed = getSealedFrames(triggerId, p.effectId);
                if (sealed > 0) {
                    html += `<div class="item" style="opacity:0.45;text-decoration:line-through;"><span>🔒 ${emoji} ${label}+${effectLabel}</span><span class="count">${(sealed / 60).toFixed(1)}s</span></div>`;
                    continue;
                }
                html += `<div class="item"><span>${emoji} ${label}+${effectLabel}</span><span class="count">×${p.count}</span><span style="cursor:pointer;color:#ff6644;margin-left:4px;font-size:9px;" data-tid="${triggerId}" data-eid="${p.effectId}">✕</span></div>`;
            }
        }
        container.innerHTML = html;
        container.querySelectorAll('[data-tid]').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                removePassive(this.dataset.tid, this.dataset.eid);
            });
        });
    }

    function renderHandUI() {
        const container = document.getElementById('handContainer');
        if (!container) return;
        if (G.hand.length === 0) {
            container.innerHTML = '<span style="color:#5a7a9a;font-size:10px;">手牌为空</span>';
            return;
        }
        container.innerHTML = G.hand.map((c, i) =>
            `<div class="hand-card ${c.type === 'trigger' ? 'trigger-card' : 'effect-card'}" data-idx="${i}">
                ${c.emoji} ${c.label} <span class="tag">${c.type === 'trigger' ? '触发' : '效果'}</span>
            </div>`
        ).join('');
        container.querySelectorAll('.hand-card').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                fillSlot(idx);
            });
        });
    }

    function renderSlotsUI() {
        const ts = document.getElementById('triggerSlot');
        const es = document.getElementById('effectSlot');
        if (!ts || !es) return;
        ts.innerHTML = G.triggerSlot ?
            `${G.triggerSlot.emoji} ${G.triggerSlot.label}` :
            '⬅ 触发<br><span class="sub">点击选择</span>';
        ts.className = 'slot' + (G.triggerSlot ? ' filled' : '');
        es.innerHTML = G.effectSlot ?
            `${G.effectSlot.emoji} ${G.effectSlot.label}` :
            '效果 ➡<br><span class="sub">点击选择</span>';
        es.className = 'slot' + (G.effectSlot ? ' filled' : '');
        ts.onmousedown = (e) => { e.preventDefault();
            e.stopPropagation(); if (G.triggerSlot) { returnToHand(G.triggerSlot);
                G.triggerSlot = null;
                updateUI(); } };
        es.onmousedown = (e) => { e.preventDefault();
            e.stopPropagation(); if (G.effectSlot) { returnToHand(G.effectSlot);
                G.effectSlot = null;
                updateUI(); } };
    }

    function setFeedback(msg, color = '#7bb3ff') {
        if (G.simMode) return;
        const el = document.getElementById('feedbackBox');
        if (!el) return;
        el.innerHTML = `<span class="tag" style="background:${color}33;color:${color};">✦</span> ${msg}`;
    }

    // v9.25: 手机端死亡后的重开入口。桌面端侧栏里那个「↺ 重开」够用，
    // 但手机端 .panel 是收起的抽屉，战斗界面上没有任何可点的重开按钮——
    // 所以在 canvas 上层再放一个，只在 G.gameOver 时亮起（CSS 里限 body.mobile）。
    function syncGameOverUI() {
        const el = document.getElementById('gameoverRestart');
        if (!el) return;
        el.classList.toggle('active', !!G.gameOver);
    }

    // ---------- 平衡掉落 ----------
    // v9.25: 多了一次发放 n 张的场景（开局 / 击杀 / BOSS 磨血），逐张调这个函数的话
    // 会把 setFeedback / updateUI 也做 n 遍——屏幕上刷 n 行、手牌重绘 n 次。
    // 所以拆出 `silent`：连发时静默取牌，由 grantCards() 统一结算一次。
    // 不传参的老调用点行为完全不变。
    function dropBalancedCard(silent, source) {
        const trigCount = G.hand.filter(c => c.type === 'trigger').length;
        const effCount = G.hand.filter(c => c.type === 'effect').length;
        let dropType;
        if (trigCount < effCount) dropType = 'trigger';
        else if (effCount < trigCount) dropType = 'effect';
        else dropType = Math.random() < 0.5 ? 'trigger' : 'effect';
        // v9.21: 触发板走加权抽取（T08 权重 0.7；T13 已于 v9.25 移出触发板）
        // v9.23: 效果板也开始加权（E02/E11 出率 -30%）
        const card = dropType === 'trigger' ? randomTrigger() : randomEffect();
        if (G.hand.length >= 20) {
            const old = G.hand.shift();
            if (!silent) setFeedback(`📥 ${old.emoji}→${card.emoji}${card.label} (替换)`, '#8ab3d0');
        } else if (!silent) {
            setFeedback(`📥 拾取 ${card.emoji} ${card.label}`, '#8ab3d0');
        }
        G.hand.push({ ...card, type: dropType });
        G.floorCardsObtained++;
        logEvent('card_drop', { card: card.id, cardLabel: card.label, cardType: dropType, source: source || 'kill' });
        if (!silent) updateUI();
        return { ...card, type: dropType };
    }

    // v9.25: 一次发 n 张密文版。来源：开局白送 6 张、每 20 杀 30%、BOSS 每磨 25% 血。
    // 「获得的个数」必须**在屏幕里**读得到——布局用的是画布上的 showNotification，
    // 不是右侧面板的 setFeedback：手机端面板是收起的抽屉，战斗时根本看不见。
    function grantCards(n, reason, color) {
        if (n <= 0) return [];
        const got = [];
        for (let i = 0; i < n; i++) got.push(dropBalancedCard(true, reason));
        updateUI();
        const names = got.map(c => c.emoji + c.label).join(' ');
        setFeedback(`📥 ${reason} · 获得 ${n} 张密文版：${names}`, color || '#8ab3d0');
        showNotification(`📥 密文版 ×${n}`, color || '#8ab3d0', 150);
        logEvent('card_grant', { count: n, reason, cards: got.map(c => c.id) });
        return got;
    }

    // ---------- v9.4 遗物系统 ----------
    function dropRelic() {
        const available = RELICS.filter(r => !G.relics.find(r2 => r2.id === r.id));
        if (available.length === 0) return;
        const weights = available.map(r => r.rarity === 'epic' ? 15 : r.rarity === 'rare' ? 35 : 50);
        const totalW = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalW;
        let selected = available[0];
        for (let i = 0; i < available.length; i++) { r -= weights[i]; if (r <= 0) { selected = available[i]; break; } }
        G.relics.push(selected);
        selected.apply(G);
        logEvent('relic_get', { relicName: selected.name, rarity: selected.rarity });
        setFeedback(`🏺 获得遗物：${selected.emoji} ${selected.name} — ${selected.desc}`, '#ffb347');
        showNotification(`🏺 ${selected.name}！`, '#ffb347', 200);
        updateRelicUI();
        updateUI();
    }

    function updateRelicUI() {
        if (G.simMode) return;
        const container = document.getElementById('relicList');
        const countEl = document.getElementById('relicCount');
        if (!container) return;
        if (countEl) countEl.textContent = G.relics.length + '个';
        if (G.relics.length === 0) {
            container.innerHTML = '<div style="color:#5a7a9a;font-size:10px;">暂无遗物</div>';
            return;
        }
        container.innerHTML = G.relics.map(r =>
            `<div class="relic-icon">
                ${r.emoji}
                <div class="relic-tooltip">${r.name}: ${r.desc}</div>
            </div>`
        ).join('');
    }

    // ---------- v9.4 商人系统 / v9.18 经济重做 ----------
    // 刷新费 = 2 × 层 × 已刷新次数（次数从 1 起），见 getShopRefreshCost()。
    function getShopRefreshCost() {
        return 2 * G.floor * (G.shopRefreshCount || 1);
    }

    function showMerchant() {
        G.merchantStock = getMerchantStock();
        G.shopSoldOut = [];
        G.shopRefreshCount = 1;          // v9.18: 每次进店都从 1 开始算刷新费
        const overlay = document.getElementById('merchantOverlay');
        const row = document.getElementById('merchantRow');
        if (!overlay || !row) return;
        G.selectingActive = true;
        overlay.classList.add('active');
        renderMerchant();
        document.getElementById('leaveShopBtn').onmousedown = function(e) {
            e.preventDefault(); e.stopPropagation();
            leaveShop();
        };
        const refreshBtn = document.getElementById('shopRefreshBtn');
        if (refreshBtn) refreshBtn.onmousedown = function(e) {
            e.preventDefault(); e.stopPropagation();
            refreshMerchantStock();
        };
    }

    // 商店浮层的整体重绘：精华行 + 商品行 + 刷新按钮文案。买完、刷新后都走这里，
    // 免得「买完一处更新一处」漏掉某个显示。
    function renderMerchant() {
        const row = document.getElementById('merchantRow');
        const essenceEl = document.getElementById('merchantEssence');
        if (!row) return;
        if (essenceEl) {
            // 本层战斗已掉落的精华也显示出来——玩家能直接看到「这层还能刷多少」
            const cap = getEssenceCap();
            const got = Math.round(G.essenceThisFloor || 0);
            essenceEl.textContent = '💎 精华: ' + G.essence + '　（本层战斗掉落 ' + got + '/' + cap + '）';
        }
        row.innerHTML = G.merchantStock.map((item, i) =>
            `<div class="merchant-item${G.shopSoldOut.includes(i) ? ' sold-out' : ''}" data-idx="${i}">
                <span class="mi-emoji">${item.emoji}</span>
                <span class="mi-label">${item.label}</span>
                <span class="mi-cost">💎 ${item.cost}</span>
                <span class="mi-desc">${item.desc}</span>
            </div>`
        ).join('');
        row.querySelectorAll('.merchant-item').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                buyMerchantItem(idx);
            });
        });
        const refreshBtn = document.getElementById('shopRefreshBtn');
        if (refreshBtn) {
            const cost = getShopRefreshCost();
            refreshBtn.textContent = '🔄 刷新商品（💎 ' + cost + '）';
            refreshBtn.disabled = G.essence < cost;
            refreshBtn.classList.toggle('disabled', G.essence < cost);
        }
    }

    // v9.18: 花钱换一批货。已购买的格子清空重来——整批重抽，不做「补位」。
    function refreshMerchantStock() {
        const cost = getShopRefreshCost();
        if (G.essence < cost) { setFeedback('💎 精华不足，刷新需要 ' + cost + '！', '#ff6644'); return; }
        G.essence -= cost;
        G.shopRefreshCount = (G.shopRefreshCount || 1) + 1;
        G.merchantStock = getMerchantStock();
        G.shopSoldOut = [];
        logEvent('shop_refresh', { cost, count: G.shopRefreshCount, floor: G.floor });
        setFeedback('🔄 商店已刷新（花费 ' + cost + ' 精华）', '#ffb347');
        renderMerchant();
        updateUI();
    }

    function buyMerchantItem(idx) {
        if (G.shopSoldOut.includes(idx)) return;
        const item = G.merchantStock[idx];
        if (!item || G.essence < item.cost) { setFeedback('💎 精华不足！', '#ff6644'); return; }
        G.essence -= item.cost;
        G.shopSoldOut.push(idx);
        logEvent('merchant_buy', { itemType: item.type, itemLabel: item.label, cost: item.cost });
        if (item.type === 'card') {
            G.hand.push({ ...item.card, type: item.card.cardType });
            setFeedback(`🛒 购买 ${item.emoji} ${item.label} (剩余精华:${G.essence})`, '#ffb347');
        } else if (item.type === 'relic') {
            G.relics.push(item.relic);
            item.relic.apply(G);
            setFeedback(`🏺 购买遗物：${item.emoji} ${item.label}`, '#ffb347');
            updateRelicUI();
        } else if (item.type === 'heal') {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.4);
            setFeedback(`💚 治疗40%护盾 (剩余精华:${G.essence})`, '#44ff88');
        } else if (item.type === 'buff') {
            // v9.18: 与每层奖励同一套加成，apply() 自带 setFeedback
            item.buff.apply();
        }
        renderMerchant();
        updateUI();
    }

    function leaveShop() {
        G.selectingActive = false;
        document.getElementById('merchantOverlay').classList.remove('active');
        advanceFloor();
    }

    // ---------- v9.4 地图选择 ----------
    // ---------- v9.7 可视化蜿蜒地图 ----------
    function showNodeMap() {
        G.selectingActive = true; G.mapMode = true;
        // v9.26: 走统一入口——手机端不碰 .canvas-wrap（摇杆的输入面），见 setCanvasPointer 的注释
        setCanvasPointer(true);
        const pool = [...NODE_POOL];
        const available = pool.filter(n => {
            if (n.id === 'boss') return (G.floor % 10 === 9);
            if (n.id === 'merchant') return (G.floor % 4 === 0 || G.floor % 4 === 3);
            return true;
        });
        const shuffled = available.sort(() => Math.random() - 0.5);
        G.mapChoices = shuffled.slice(0, 3);
        if (G.floor % 10 === 9) {
            const bossNode = pool.find(n => n.id === 'boss');
            if (bossNode && !G.mapChoices.find(c => c.id === 'boss')) G.mapChoices[2] = bossNode;
        }
    }

    function selectNode(idx, dir) {
        const node = G.mapChoices[idx];
        if (!node) return;
        logEvent('node_select', { nodeId: node.id, nodeLabel: node.label, dir: dir || 'center' });
        // 教程第 5 层选完路 → 下一层播收尾字幕
        if (Tutorial.active) Tutorial.outroPending = true;
        // v9.7: 记录路径历史（用于蜿蜒地图）
        G.pathHistory.push({ dir: dir || 'center', nodeId: node.id, floor: G.floor });
        G.mapMode = false; G.selectingActive = false;
        // v9.26: 同上去统一入口。**这里就是摇杆失灵的现场**——以前这两行把
        // .canvas-wrap 也设回 none，手机端选完第一层路就再也走不动了。
        setCanvasPointer(false);
        if (node.isMerchant || node.isRest) { handleNonCombatNode(node.id); return; }
        G.stageType = node.stageType || 'mixed';
        advanceFloor();
        updateUI();
    }

    // ---------- v9.4 职业选择 ----------
    // 职业遮罩的原始标题（第一次 initClassSelection 时抓下来，之后在「教程开局」
    // 和「正式开局」之间来回切）。见下面的用法。
    let _classOverlayTitle = null;

    function initClassSelection() {
        const overlay = document.getElementById('classOverlay');
        const row = document.getElementById('classRow');
        if (!overlay || !row) return;
        G.selectingActive = true; G.paused = true;
        overlay.classList.add('active');
        row.innerHTML = CLASSES.map((c, i) =>
            `<div class="class-card" data-idx="${i}">
                <span class="c-emoji">${c.emoji}</span>
                <span class="c-name">${c.name}</span>
                <span class="c-desc">${c.desc}</span>
                <span class="c-stats">${c.stats}</span>
            </div>`
        ).join('');
        row.querySelectorAll('.class-card').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                selectClass(idx);
            });
        });
        // v9.25 自检：职业遮罩的标题是**静态 HTML**（body.html 里就写着 active），
        // 卡片却是这里现填的。所以「只看得到标题、看不到卡」= 这一段没跑成。
        // 本机复现不出来，就就地断言一次，异常交给页面底部的自检条（__bootError）。
        if (row.children.length !== CLASSES.length && window.__bootError) {
            window.__bootError(`职业卡没渲染出来：CLASSES 有 ${CLASSES.length} 个，DOM 里只有 ${row.children.length} 个`);
        }

        // 教程：开局遮罩上的说明 + 跳过教程（只看没看过教程的那一次）
        const h2 = overlay.querySelector('h2');
        if (h2) {
            // v9.24: 教程结束后会再弹一次这个遮罩（就是「正式开局」），
            // 标题必须跟着变，否则看起来像什么都没发生。
            if (!_classOverlayTitle) _classOverlayTitle = h2.textContent;
            h2.textContent = Tutorial.seen ? '正式开局 · 再选一次职业' : _classOverlayTitle;
        }
        if (Tutorial.seen) {
            const h = document.getElementById('tutorialClassHint');
            const s = document.getElementById('tutorialSkipBtn');
            if (h) h.remove();
            if (s) s.remove();
            return;
        }
        if (!document.getElementById('tutorialClassHint')) {
            const hint = document.createElement('div');
            hint.id = 'tutorialClassHint';
            hint.style.cssText = 'color:#8ab3d0;font-size:13px;max-width:640px;text-align:center;' +
                'line-height:1.7;margin-top:-6px;';
            // v9.24: 教程现在是**纯沙盒**——播完（或跳过）会清空一切、回到第 1 层。
            // 这句话必须写在最显眼的地方，否则玩家会以为教程里攒的东西能带走。
            hint.innerHTML =
                '<b style="color:#f5c542;">古老的石板-1 · 选一个开局流派。</b>' +
                '教程期间选哪个都能过关。<br>' +
                '<b style="color:#ffb347;">教程是独立沙盒</b>：结束（或跳过）时会清空教程里获得的' +
                '密文版 / 被动 / 精华 / 得分，从第 1 层正式开局，这里会让你重选一次职业。<br>' +
                '🐾 <b>轨迹编织者</b> 最适合新手：轨迹更宽、更持久。';
            if (h2) h2.insertAdjacentElement('afterend', hint);

            const skip = document.createElement('button');
            skip.id = 'tutorialSkipBtn';
            skip.textContent = '跳过教程 →';
            skip.style.cssText = 'position:absolute;right:26px;bottom:22px;background:transparent;' +
                'border:1px solid #33506e;color:#6a8aaa;padding:6px 16px;border-radius:16px;' +
                'font-size:12px;cursor:pointer;font-family:inherit;';
            skip.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                // v9.24: 不再顺手 selectClass(0)——那会先 startFloor() 再被重置，白跑一趟。
                // 直接让 Tutorial.skip() 挂上 pendingRestart，由 update() 统一重开。
                Tutorial.skip();
            });
            overlay.style.position = 'fixed';
            overlay.appendChild(skip);
        }
    }

    function selectClass(idx) {
        const cls = CLASSES[idx];
        if (!cls) return;
        logEvent('class_select', { className: cls.name });
        G.playerClass = cls;
        cls.apply(G);
        document.getElementById('classOverlay').classList.remove('active');
        document.getElementById('classDisplay').textContent = `${cls.emoji} ${cls.name}`;
        G.selectingActive = false; G.paused = false;
        setFeedback(`🧙 选择职业：${cls.emoji} ${cls.name}！`, '#f5c542');
        showNotification(`🧙 ${cls.name}！${cls.desc.substring(0, 20)}...`, '#f5c542', 240);
        addScore(10);
        startFloor();
        // v9.25: 正式开局的启动资金——随机 6 张密文版。
        // 教程局**不发**：教程是独立沙盒，它的 cfg.hand 会预设手牌，白送 6 张会
        // 把教学节奏冲掉（而且反正 Tutorial 结束时会 restartRunAfterTutorial()
        // 整体重来）。判定沿用 Tutorial.seen —— 它只在这一局的教程真正结束 / 被跳过后
        // 才立起来，所以「重选职业 → 发牌」正好只发生在正式开局那一次。
        if (Tutorial.seen) grantCards(START_CARDS, '开局补给', '#f5c542');
        updateUI();
    }

    function drawCardFromLib(type, cardData) {
        // v9.2: 移除手牌平衡限制，自由抽取
        if (G.hand.length >= 20) {
            const old = G.hand.shift();
            setFeedback(`📥 ${old.emoji}→${cardData.emoji}${cardData.label} (替换)`, '#6b8');
        } else {
            setFeedback(`✅ 获得 ${cardData.emoji} ${cardData.label}`, '#6b8');
        }
        G.hand.push({ ...cardData, type: type });
        updateUI();
    }

    // ---------- 密文操作 ----------
    function fillSlot(handIndex) {
        if (handIndex === undefined || handIndex === null) return;
        const card = G.hand[handIndex];
        if (!card) return;
        if (card.type === 'trigger' && G.triggerSlot) { returnToHand(G.triggerSlot);
            G.triggerSlot = null; }
        if (card.type === 'effect' && G.effectSlot) { returnToHand(G.effectSlot);
            G.effectSlot = null; }
        if (card.type === 'trigger') {
            if (G.triggerSlot) returnToHand(G.triggerSlot);
            G.triggerSlot = { ...card };
            G.hand.splice(handIndex, 1);
        } else {
            if (G.effectSlot) returnToHand(G.effectSlot);
            G.effectSlot = { ...card };
            G.hand.splice(handIndex, 1);
        }
        updateUI();
        renderLibrary();
    }

    function returnToHand(card) {
        G.hand.push({ ...card });
        updateUI();
        renderLibrary();
    }

    // ---------- 牌库 ----------
    function renderLibrary() {
        const grid = document.getElementById('libraryGrid');
        if (!grid) return;
        let html = '';
        TRIGGERS.forEach(t => {
            html += `<div class="lib-card lib-trigger" data-type="trigger" data-id="${t.id}" data-label="${t.label}" data-emoji="${t.emoji}">
                ${t.emoji} ${t.label} <span class="badge">触发</span><span class="count-badge">∞</span>
            </div>`;
        });
        EFFECTS.forEach(e => {
            html += `<div class="lib-card lib-effect" data-type="effect" data-id="${e.id}" data-label="${e.label}" data-emoji="${e.emoji}">
                ${e.emoji} ${e.label} <span class="badge">效果</span><span class="count-badge">∞</span>
            </div>`;
        });
        grid.innerHTML = html;
        grid.querySelectorAll('.lib-card').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const type = this.dataset.type;
                const id = this.dataset.id;
                const label = this.dataset.label;
                const emoji = this.dataset.emoji;
                const pool = type === 'trigger' ? TRIGGERS : EFFECTS;
                const card = pool.find(c => c.id === id);
                if (!card) return;
                drawCardFromLib(type, { id: card.id, label: card.label, emoji: card.emoji });
            });
        });
    }

    // ---------- v9.10 属性提升选择（替代密文版三选一）----------
    // v9.18: STAT_CHOICES 挪到 00-data.js——商店也开始卖同一套，见那里的注释。
    function showStatChoice() {
        if (G.selectingActive) return;
        G.selectingActive = true;
        // 随机选3个
        const shuffled = [...STAT_CHOICES].sort(() => Math.random() - 0.5);
        G.selectionCards = shuffled.slice(0, 3); // 复用 selectionCards 存储

        // v9.21: 小概率把其中一张换成「图腾扩容」。
        // 概率 = 1% × (1 + 层数/10)：第 10 层 2%、第 30 层 4%、第 60 层 7%。
        // 这里是**整体掷一次**再替换，不是把它塞进池子跟着洗——后者会让它实际
        // 出现率变成掷中率 × 3/7，和「1%×(1+层数/10)」对不上。
        if (Math.random() < 0.01 * (1 + G.floor / 10)) {
            const slot = { ...TURRET_SLOT_CHOICE, desc: `图腾上限+1（${G.maxTurrets} → ${G.maxTurrets + 1}）` };
            G.selectionCards[Math.floor(Math.random() * G.selectionCards.length)] = slot;
            showNotification('🗼 稀有：图腾扩容出现了！', '#ffdd66', 240);
        }

        const overlay = document.getElementById('selectionOverlay');
        const row = document.getElementById('selectionRow');
        if (!overlay || !row) return;

        overlay.querySelector('h3').textContent = '✨ 选择一项属性提升（替代密文版奖励）';

        row.innerHTML = G.selectionCards.map((c, i) =>
            `<div class="selection-card" data-idx="${i}" style="border-left:4px solid ${c.color};">
                <span class="s-emoji">${c.emoji}</span>
                <span class="s-label">${c.label}</span>
                <span class="s-type">${c.desc}</span>
            </div>`
        ).join('');

        overlay.classList.add('active');

        row.querySelectorAll('.selection-card').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                selectStat(idx);
            });
        });
    }

    function selectStat(index) {
        const choice = G.selectionCards[index];
        if (!choice) return;
        logEvent('stat_choice', { choice: choice.label, desc: choice.desc });
        choice.apply();
        G.selectingActive = false;
        G.selectionCards = [];

        const overlay = document.getElementById('selectionOverlay');
        if (overlay) { overlay.classList.remove('active'); overlay.querySelector('h3').textContent = '🎴 选择一张密文版加入手牌'; }
        addScore(15);
        // 属性选择后进入地图选关
        showNodeMap();
        updateUI();
    }

    // ---------- 波间选择 ----------
    // v9.22: showCardSelection() / selectCard() 已删除——v9.10 起波间三选一
    // 改成了属性提升（showStatChoice），这两个函数没有调用点，是遗留的密文版三选一。

    // ---------- v9.2 命运抉择 ----------
    function showFateChoice() {
        G.fateChoosing = true;
        G.selectingActive = true; // 暂停游戏
        // 随机选2个不同的命运选项
        const shuffled = [...FATE_CHOICES].sort(() => Math.random() - 0.5);
        G.fateOptions = shuffled.slice(0, 2);

        const overlay = document.getElementById('selectionOverlay');
        const row = document.getElementById('selectionRow');
        if (!overlay || !row) { G.fateChoosing = false; G.selectingActive = false; advanceFloor(); return; }

        overlay.querySelector('h3').textContent = `🔮 命运抉择 · 第${G.floor}层`;
        row.innerHTML = G.fateOptions.map((f, i) =>
            `<div class="selection-card" data-idx="${i}" style="border-left:4px solid ${f.id === 'trailMaster' ? '#66ddff' : f.id === 'speedDemon' ? '#88ddff' : f.id === 'ironWall' ? '#88aadd' : '#ff8844'};">
                <span class="s-emoji">${f.emoji}</span>
                <span class="s-label">${f.label}</span>
                <span class="s-type">${f.desc}</span>
            </div>`
        ).join('');

        overlay.classList.add('active');

        row.querySelectorAll('.selection-card').forEach(el => {
            el.addEventListener('mousedown', function(e) {
                e.preventDefault(); e.stopPropagation();
                const idx = parseInt(this.dataset.idx);
                selectFate(idx);
            });
        });
    }

    function selectFate(index) {
        const fate = G.fateOptions[index];
        if (!fate) return;
        logEvent('fate_choice', { fateName: fate.label, fateDesc: fate.desc, snapshot: snapshotStats() });
        fate.apply();
        G.fateChoosing = false;
        G.selectingActive = false;
        G.fateOptions = [];

        const overlay = document.getElementById('selectionOverlay');
        if (overlay) { overlay.classList.remove('active'); overlay.querySelector('h3').textContent = '🎴 选择一张密文版加入手牌'; }
        setFeedback(`🔮 命运抉择：${fate.emoji} ${fate.label} — ${fate.desc}`, '#ff8844');
        showNotification(`🔮 ${fate.label}！${fate.desc}`, '#ff8844', 240);
        addScore(25);
        startFloor(); // 命运选择后开始当前楼层（不递增）
        updateUI();
    }

    // v9.22: 真空期三件套（startVacuum / skipVacuum / updateVacuumUI）已删除。
    // startVacuum() 从来没有调用点，于是 G.vacuumActive 恒为 false，
    // 这一段连同 05-update.js 的倒计时、body.html 的 #vacuumBar 和它的 CSS 都是死的。

    function advanceFloor() {
        G.floor++;
        G.stage = Math.ceil(G.floor / 5);
        if (G.floor % 5 === 0) { addScore(G.floor * 15); setFeedback(`🎉 阶段${G.stage-1}完成!`, '#f5c542'); }
        if (G.floor === 20) { G.maxSlots = 5; showNotification('📢 被动槽位+1！', '#ff8844', 300); }
        if (G.floor === 30) { showNotification('📢 精英双词缀！', '#ffaa44', 300); }
        if (G.floor === 40) { G.maxSlots = 6; G.ultimateChargeMult = 1.5; showNotification('📢 槽位+1 充能加速！', '#ffdd44', 360); }
        if (G.floor === 60) { G.maxSlots = 7; showNotification('📢 被动槽位+1！', '#ffdd44', 240); }
        if (G.floor > 0 && G.floor % 10 === 0) {
            if (G.simMode) { simAutoFateChoice(); }
            else { showFateChoice(); }
        }
        else { addScore(G.floor * 5); startFloor(); }
    }

    // v9.6: 非战斗节点处理（不会触发卡牌选择循环）
    function handleNonCombatNode(nodeId) {
        const node = NODE_POOL.find(n => n.id === nodeId);
        if (!node) return;
        if (node.isMerchant) { showMerchant(); return; }
        if (node.isRest) {
            G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.3);
            for (let i = 0; i < 2; i++) {
                // v9.21: 触发板走加权抽取（v9.23: 效果板同样是加权）
                const isT = Math.random() < 0.5;
                const card = isT ? randomTrigger() : randomEffect();
                G.hand.push({ ...card, type: isT ? 'trigger' : 'effect' });
            }
            setFeedback('🏕️ 休整：回复30%护盾+2张密文版', '#44cc88');
            setTimeout(() => showNodeMap(), 800);
            return;
        }
        // 战斗节点
        G.stageType = node.stageType || 'mixed';
        advanceFloor();
    }

