    // ---------- 事件 ----------
    // 键位归一化：优先读 e.code（物理键位）。
    // 中文输入法激活时浏览器把 e.key 报成 'Process'，只认 e.key 会让 WASD 整个失效。
    const KEY_CODE_MAP = {
        KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyH: 'h', KeyP: 'p', KeyQ: 'q', KeyR: 'r',
        Space: ' ', Enter: 'enter', Backquote: '`', Escape: 'escape', ShiftLeft: 'shift',
        ShiftRight: 'shift', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5',
        Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0',
        Numpad1: '1', Numpad2: '2', Numpad3: '3', Numpad4: '4', Numpad5: '5',
        Numpad6: '6', Numpad7: '7', Numpad8: '8', Numpad9: '9', Numpad0: '0',
    };
    function keyOf(e) {
        if (e.code && KEY_CODE_MAP[e.code]) return KEY_CODE_MAP[e.code];
        return (e.key || '').toLowerCase();
    }

    // 嵌入 iframe 时父页面持有焦点，按键不会到达本页
    window.addEventListener('mousedown', () => { try { window.focus(); } catch (err) {} });

    document.addEventListener('keydown', e => {
        const k = keyOf(e);
        // 机制图鉴：H 开关、左右翻页（图鉴打开时吞掉其它按键）
        if (k === 'h' && !G.simMode) { e.preventDefault();
            Tutorial.codexOpen = !Tutorial.codexOpen; Tutorial.codexPage = 0; return; }
        if (Tutorial.codexOpen) {
            if (k === 'left') { e.preventDefault(); Tutorial.codexPage = Math.max(0, Tutorial.codexPage - 1); return; }
            if (k === 'right') { e.preventDefault(); Tutorial.codexPage = Math.min(CODEX_PAGES.length - 1, Tutorial.codexPage + 1); return; }
            if (k === 'escape') { e.preventDefault(); Tutorial.codexOpen = false; return; }
        }
        // 调试模式：按键1~9生成对应怪物（教程期间禁用，免得打乱脚本）
        if (k === '`' || k === 'backquote') {
            if (Tutorial.active) { e.preventDefault(); setFeedback('🎓 教程期间禁用调试模式', '#8ab3d0'); return; }
            e.preventDefault(); G.debug = !G.debug;
            setFeedback(G.debug ? '🐛 调试模式开启！按键1~9生成怪物' : '🐛 调试模式关闭', '#88ccff'); return; }
        if (G.debug) {
            const num = parseInt(k);
            if (num >= 1 && num <= 9) { e.preventDefault();
                spawnDebugMonster(DEBUG_TYPE_KEYS[num - 1]); return; }
        }
        if (k === 'w' || k === 'a' || k === 's' || k === 'd') { e.preventDefault();
            G.keys[k] = true; }
        if (k === 'shift') { e.preventDefault(); G.keys.shift = true; }
        if (k === 'p') { e.preventDefault();
            G.paused = !G.paused;
            document.getElementById('pauseOverlay').classList.toggle('active', G.paused);
            document.getElementById('pauseWorkshop').classList.toggle('active', G.paused);
            if (G.paused) {
                setFeedback('⏸ 战场冻结 · 排队组合密文版 · 按空格排队 · 点宣读全部执行', '#f5c542');
            } else {
                if (G.batchQueue.length > 0) executeBatch();
                setFeedback('▶ 继续战斗', '#f5c542');
            } }
        if (k === 'q' && G.ultimateGauge >= G.ultimateMax && !G.ultimateActive && !G.gameOver && !G.paused) { e.preventDefault();
            activateUltimate(); }
        // v9.25: R = 「消除」。不带就绪判断——tryEliminate() 里已经有冷却与局面的守卫，
        // 而且冷却中按下去要给出「还要几秒」的反馈，那是它自己的事。
        if (k === 'r') { e.preventDefault(); tryEliminate(); }
        if (k === ' ' || k === 'enter') { e.preventDefault();
            if (G.paused && G.triggerSlot && G.effectSlot) { queueBatchCombine(); }
            else if (!G.selectingActive && !G.paused) combineCards(); }
    });
    document.addEventListener('keyup', e => {
        const k = keyOf(e);
        if (k === 'w' || k === 'a' || k === 's' || k === 'd') { e.preventDefault();
            G.keys[k] = false; }
        if (k === 'shift') { e.preventDefault(); G.keys.shift = false; }
    });

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        G.mouse.x = clamp((e.clientX - rect.left) * scaleX, 0, 780);
        G.mouse.y = clamp((e.clientY - rect.top) * scaleY, 0, 560);
    });

    // v9.7: Canvas点击——地图模式下选择节点
    canvas.addEventListener('mousedown', e => {
        const rect0 = canvas.getBoundingClientRect();
        const sx0 = canvas.width / rect0.width;
        const sy0 = canvas.height / rect0.height;
        const mx0 = (e.clientX - rect0.left) * sx0;
        const my0 = (e.clientY - rect0.top) * sy0;
        // 教程角标 / 图鉴优先吃掉点击
        if (Tutorial.handleClick(mx0, my0)) { e.preventDefault(); e.stopPropagation(); return; }
        if (!G.mapMode || !G._branchRects) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * sx;
        const my = (e.clientY - rect.top) * sy;
        for (const br of G._branchRects) {
            if (dist({ x: mx, y: my }, { x: br.x, y: br.y }) < br.r + 5) {
                selectNode(br.idx, br.dir);
                return;
            }
        }
    });

    const combineBtn = document.getElementById('combineBtn');
    if (combineBtn) {
        combineBtn.addEventListener('mousedown', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (G.paused && G.triggerSlot && G.effectSlot) queueBatchCombine();
            else if (!G.paused) combineCards();
        });
    }
    // v9.6: 批量宣读按钮
    const batchBtn = document.getElementById('batchCombineBtn');
    if (batchBtn) {
        batchBtn.addEventListener('mousedown', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (G.paused && G.batchQueue.length > 0) executeBatch();
        });
    }
    const logBtn = document.getElementById('logBtn');
    if (logBtn) {
        logBtn.addEventListener('mousedown', function(e) {
            e.preventDefault(); e.stopPropagation();
            exportGameLog();
        });
    }
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            resetGame();
        });
    }
    // v9.22: skipBtn（跳过真空期）的绑定已删除，见 07-ui.js 的说明。
    // v9.6: 暂停工作台按钮
    const pwCombineBtn = document.getElementById('pwCombineBtn');
    if (pwCombineBtn) {
        pwCombineBtn.addEventListener('mousedown', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (G.paused && G.triggerSlot && G.effectSlot) queueBatchCombine();
        });
    }
    const pwResumeBtn = document.getElementById('pwResumeBtn');
    if (pwResumeBtn) {
        pwResumeBtn.addEventListener('mousedown', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (G.batchQueue.length > 0) executeBatch();
            G.paused = false;
            document.getElementById('pauseOverlay').classList.remove('active');
            document.getElementById('pauseWorkshop').classList.remove('active');
            setFeedback('▶ 继续战斗', '#f5c542');
        });
    }

    // ============================================================
    //  v9.24 手机端适配
    // ============================================================
    // 桌面端保留原来的布局（右侧 280px 侧栏 + WASD），只多一个全屏按钮。
    // 手机端把这些搬走：摇杆移动、屏幕按钮、密文版与被动折进左侧抽屉、
    // 顶部数据条顶替右侧栏。识别到移动设备就自动切，桌面端不开放手动开关。

    // 设备识别只跑一次。**必须带 matchMedia 守卫**——离线探针（web/probe-9x.mjs）
    // 的假 window 上没有这个 API，不守卫的话整套断言会一起崩。
    function detectMobileMode() {
        try {
            const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
            const ua = /Android|iPhone|iPad|iPod|Mobile/i.test((navigator && navigator.userAgent) || '');
            return coarse || ua;
        } catch (err) { return false; }
    }

    function applyMobileLayout() {
        if (!G.mobileMode) return;
        if (document.body) document.body.classList.add('mobile');
        syncOrientation();
    }

    // 竖屏盖一层「请旋转设备」。判定写在这里而不是只听 orientationchange——
    // 桌面浏览器里开发者工具模拟设备时不一定发那个事件。
    function syncOrientation() {
        if (!document.body) return;
        const w = window.innerWidth, h = window.innerHeight;
        if (typeof w !== 'number' || typeof h !== 'number') return;
        document.body.classList.toggle('portrait', h > w);
    }
    window.addEventListener('resize', syncOrientation);

    // 抽屉展开时把全局时间压到 50%（子弹时间）。所有计时都以帧为单位，
    // 隔帧 update() 就是一次一致的时间缩放，见 08-main.js 的 gameLoop()。
    function setDrawer(open) {
        G.drawerOpen = !!open;
        if (document.body) document.body.classList.toggle('drawer-open', G.drawerOpen);
        G.timeScale = G.drawerOpen ? 0.5 : 1;
    }

    function toggleFullscreen() {
        try {
            if (document.fullscreenElement) {
                if (document.exitFullscreen) document.exitFullscreen();
            } else if (document.documentElement && document.documentElement.requestFullscreen) {
                // 必须由用户手势触发，所以只做按钮，不做自动全屏
                document.documentElement.requestFullscreen();
            }
        } catch (err) { /* 不支持全屏（iOS Safari）时静默降级 */ }
    }
    function syncFullscreenBtns() {
        const on = !!document.fullscreenElement;
        for (const id of ['fullscreenBtn', 'mobileFullscreenBtn']) {
            const b = document.getElementById(id);
            if (b) b.textContent = on ? '⛶ 退出' : '⛶ 全屏';
        }
    }
    document.addEventListener('fullscreenchange', syncFullscreenBtns);

    function toggleCodex() {
        Tutorial.codexOpen = !Tutorial.codexOpen;
        Tutorial.codexPage = 0;
    }

    // ---- 动态摇杆（v9.25 重做，同时修掉「一进游戏就不动」）----
    // v9.24 把 touchstart 挂在 #gameCanvas 上。但横屏时 canvas 是 780:560 等比缩放、
    // max-height:100%，手机屏比 780:560 宽得多，所以 canvas 只占屏幕中间一块，
    // 左右各留一条黑边；铺满全屏的 .canvas-wrap 反倒没有任何监听。拇指的自然落点
    // （屏幕左下角、黑边）根本收不到事件——游戏在跑，就是不走。底座还被写死在画面内
    // 的 (95,455)，即使按在画面里也得先对准那个固定点。
    // 现在：监听挂 .canvas-wrap（100vw × 100%），判定改成屏幕坐标的左半屏，
    // 底座在按下那一刻就地生成，视觉走 DOM（要能画在 canvas 之外的黑边上）。
    function joyRadiusPx() {
        const h = canvas.getBoundingClientRect().height;
        // 屏幕上的摇杆半径要跟着画面缩放走，否则同一只手在大小屏上手感差一倍。
        return Math.max(38, JOYSTICK.r * (h / 560 || 1));
    }

    // 尺寸只跟画面缩放有关，按下那一刻量一次就够——不必每帧写 style 触发布局。
    function sizeJoyVisual(R) {
        const d = R * 2 + 'px';
        const base = document.getElementById('joyBase');
        const hint = document.getElementById('joyHint');
        const knob = document.getElementById('joyKnob');
        // 用负 margin 把圆心对到 left/top 那个点上，之后 translate 就能直接用屏幕坐标。
        if (base) { base.style.width = d; base.style.height = d; base.style.margin = `${-R}px 0 0 ${-R}px`; }
        if (hint) { hint.style.width = d; hint.style.height = d; }
        if (knob) {
            const k = Math.max(22, R * 0.46);
            knob.style.width = k + 'px';
            knob.style.height = k + 'px';
            knob.style.margin = `${-k / 2}px 0 0 ${-k / 2}px`;
        }
    }

    function setStickFromTouch(t) {
        // 按下的那一点就地成为底座；拖动时底座不动、只动旋钮。主流手游都这么做——
        // 手指不用回头找圆心，方向来自相对位移，拇指落在哪都能立刻开始走。
        if (!G.stickBase) {
            G.stickBase = { x: t.clientX, y: t.clientY };
            sizeJoyVisual(joyRadiusPx());
            const base = document.getElementById('joyBase');
            const hint = document.getElementById('joyHint');
            if (base) {
                base.classList.add('active');
                base.style.transform = `translate(${G.stickBase.x}px, ${G.stickBase.y}px)`;
            }
            if (hint) hint.classList.add('hidden');
        }
        const R = joyRadiusPx();
        let dx = t.clientX - G.stickBase.x, dy = t.clientY - G.stickBase.y;
        const d = Math.hypot(dx, dy);
        if (d > R && d > 0) { dx = dx / d * R; dy = dy / d * R; }
        G.stick.x = dx / R;   // 归一化 -1..1，保留模拟量：轻推慢走、满推快跑
        G.stick.y = dy / R;
        G.stickActive = true;
        const knob = document.getElementById('joyKnob');
        if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // 收起摇杆视觉。resetGame() 也会调它——重开一局却还留着上一局按住的圆环很出戏。
    function resetJoystickVisual() {
        const base = document.getElementById('joyBase');
        const hint = document.getElementById('joyHint');
        if (base) base.classList.remove('active');
        if (hint) hint.classList.remove('hidden');
    }

    function releaseStick() {
        G.stick.x = 0; G.stick.y = 0;
        G.stickActive = false;
        G.stickBase = null;
        G._stickTouchId = null;
        resetJoystickVisual();
    }

    const canvasWrap = document.querySelector('.canvas-wrap');

    if (canvasWrap) canvasWrap.addEventListener('touchstart', e => {
        // v9.26: 选路 / 选属性 / 商店期间不接管触摸。这些浮层开着的时候移动没有意义，
        // 而这里的 e.preventDefault() 会连带掐掉浏览器合成的那一次 mousedown——
        // 节点地图是画在 canvas 上、靠 mousedown 选点的，左半屏那一下会被我们吃掉。
        if (!G.mobileMode || G.drawerOpen || G.selectingActive) return;
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        // 只接管左半屏。右半屏没有射击需求（自动开火），留给屏幕按钮，
        // 免得拇指按大招时把角色一起带跑。
        // 判定留在监听器里、用屏幕坐标：探针的假 window 没有 innerWidth，
        // 放进 setStickFromTouch 会让测试崩在无关的地方。
        if (t.clientX > window.innerWidth * 0.5) return;
        e.preventDefault();
        G._stickTouchId = t.identifier;
        setStickFromTouch(t);
    }, { passive: false });

    if (canvasWrap) canvasWrap.addEventListener('touchmove', e => {
        if (!G.mobileMode || !G.stickActive) return;
        const list = e.changedTouches;
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
            if (list[i].identifier === G._stickTouchId) {
                e.preventDefault();
                setStickFromTouch(list[i]);
                return;
            }
        }
    }, { passive: false });

    if (canvasWrap) canvasWrap.addEventListener('touchend', e => {
        if (!G.mobileMode) return;
        // 只有「按着摇杆的那根手指」抬起才松手，别的指头抬起来不影响移动
        const list = e.changedTouches;
        if (!list) { releaseStick(); return; }
        for (let i = 0; i < list.length; i++) {
            if (list[i].identifier === G._stickTouchId) { releaseStick(); return; }
        }
    });
    if (canvasWrap) canvasWrap.addEventListener('touchcancel', () => { if (G.mobileMode) releaseStick(); });

    // ---- 屏幕按钮 ----
    // 全部复用现有入口（G.keys / activateUltimate / Tutorial.codexOpen），
    // 不新增任何战斗逻辑——桌面端按 Shift/Q/H 走的就是这几条路径。
    function bindMobileButton(id, onDown, onUp) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', e => {
            e.preventDefault(); e.stopPropagation();
            el.classList.add('pressed');
            onDown();
        }, { passive: false });
        const end = () => { el.classList.remove('pressed'); if (onUp) onUp(); };
        el.addEventListener('touchend', end);
        el.addEventListener('touchcancel', end);
        // 桌面端也能点（方便在开发者工具里验证）
        el.addEventListener('mousedown', e => { e.preventDefault(); onDown(); });
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
    }

    bindMobileButton('mobileDashBtn', () => { G.keys.shift = true; }, () => { G.keys.shift = false; });
    bindMobileButton('mobileUltBtn', () => {
        if (G.ultimateGauge >= G.ultimateMax && !G.ultimateActive && !G.gameOver && !G.paused) {
            activateUltimate();
        }
    });
    // 🧹 消除：桌面端按 R 走的同一个入口。
    bindMobileButton('mobileElimBtn', () => tryEliminate());
    // 死亡后战斗界面上的重开按钮（只在 body.mobile 下显示，见 styles.css）
    bindMobileButton('gameoverRestart', () => resetGame());
    bindMobileButton('mobileFullscreenBtn', toggleFullscreen);
    bindMobileButton('mobileCodexBtn', toggleCodex);
    bindMobileButton('drawerToggleBtn', () => setDrawer(!G.drawerOpen));
    // 抽屉里的「收起」：点一下回到战斗
    bindMobileButton('drawerCloseBtn', () => setDrawer(false));

    // 桌面端的全屏按钮（v9.24 唯一新增的桌面入口）
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('mousedown', function(e) {
            e.preventDefault(); e.stopPropagation();
            toggleFullscreen();
        });
    }

    // 初始化：识别设备 → 切布局（桌面端这里什么都不会发生）
    // v9.25: 整块裹一层 try/catch。这段全是**手机端增强项**（全屏引导、摇杆视觉、
    // 转屏补量），任何一项在某个具体机型上炸了，都不该把后面的 initClassSelection()
    // 一起带走——那正是「只看到职业选择标题、没有卡牌」的样子（#classRow 靠 JS 填）。
    // 挂掉时把真实报错交给页面底部的自检条（template.html 的 __bootError），
    // 玩家截图就能定位；游戏本体照常能开。
    try {
        G.mobileMode = detectMobileMode();
        applyMobileLayout();
        syncFullscreenBtns();

        // ---- 全屏引导（v9.25）----
        // requestFullscreen() 必须由用户手势触发，所以只能做「点一下再进」。此前只在顶栏
        // 放了个 ⛶ 小按钮，玩家注意不到，进去也只是个带地址栏的窄条。
        // 盖在 #classOverlay 之上（z-index 更高，见 styles.css），点掉之后才露出职业选择。
        // active 只在这里加这一次、resetGame() 全程不碰——「只弹一次」是结构自带的，
        // 不需要再存一个 flag。
        const fsOverlay = document.getElementById('fsOverlay');
        if (G.mobileMode && fsOverlay) {
            if (!document.fullscreenElement) fsOverlay.classList.add('active');
            const enterFullscreenOnce = () => {
                // 无论成功与否都摘掉这一层：iOS Safari 不支持 documentElement 全屏，
                // 不能让玩家卡在引导页上进不去。
                fsOverlay.classList.remove('active');
                toggleFullscreen();
                // v9.25: 摘掉这一层之后，**同一次点按**还会再派发一次合成事件
                // （touchend → mousedown → click），落点正是刚才那一层所在的位置——
                // 也就是屏幕正中，而职业卡也正好排在屏幕正中。不挡住的话，玩家点一下
                // 「进入全屏」，职业就被那一下顺手选掉了，等于**根本没有机会选职业**。
                // 这里给 body 挂 400ms 的 `.fs-dismissing`，CSS 把 .class-card 的
                // pointer-events 关掉，让合成事件落到遮罩上而不是卡片上。
                if (document.body) {
                    document.body.classList.add('fs-dismissing');
                    setTimeout(() => document.body.classList.remove('fs-dismissing'), 400);
                }
            };
            fsOverlay.addEventListener('touchend', e => { e.preventDefault(); enterFullscreenOnce(); }, { passive: false });
            fsOverlay.addEventListener('mousedown', e => { e.preventDefault(); enterFullscreenOnce(); });
        }

        // 闲置提示环的尺寸要在第一次按下之前就量准，所以开局先算一次。
        // 转屏 / 地址栏收放都会改画面高度，摇杆半径跟着变——没在按的时候补量一次。
        if (G.mobileMode) sizeJoyVisual(joyRadiusPx());
        window.addEventListener('resize', () => {
            if (G.mobileMode && !G.stickActive) sizeJoyVisual(joyRadiusPx());
        });
    } catch (err) {
        // 兜底要能失败得很安静：报错只走自检条 + 控制台，不再往外抛。
        if (window.__bootError) window.__bootError('手机端初始化失败：' + (err && err.message));
        if (window.console && console.error) console.error('[boot/mobile]', err);
    }

