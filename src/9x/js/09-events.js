    // ---------- 事件 ----------
    // 键位归一化：优先读 e.code（物理键位）。
    // 中文输入法激活时浏览器把 e.key 报成 'Process'，只认 e.key 会让 WASD 整个失效。
    const KEY_CODE_MAP = {
        KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', KeyH: 'h', KeyP: 'p', KeyQ: 'q',
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
        // 调试模式：按键1~7生成对应怪物（教程期间禁用，免得打乱脚本）
        if (k === '`' || k === 'backquote') {
            if (Tutorial.active) { e.preventDefault(); setFeedback('🎓 教程期间禁用调试模式', '#8ab3d0'); return; }
            e.preventDefault(); G.debug = !G.debug;
            setFeedback(G.debug ? '🐛 调试模式开启！按键1~7生成怪物' : '🐛 调试模式关闭', '#88ccff'); return; }
        if (G.debug) {
            const num = parseInt(k);
            if (num >= 1 && num <= 8) { e.preventDefault();
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

    // ---- 摇杆 ----
    // 底座位置读的是 00-data.js 的 JOYSTICK，和 06-render.js 画出来的那一个同源。
    function canvasPointFromTouch(t) {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        return {
            x: clamp((t.clientX - rect.left) * sx, 0, 780),
            y: clamp((t.clientY - rect.top) * sy, 0, 560),
        };
    }
    function setStickFromTouch(t) {
        const p = canvasPointFromTouch(t);
        const jx = JOYSTICK.x, jy = (G.canvasHeight || 560) - JOYSTICK.y;
        let dx = p.x - jx, dy = p.y - jy;
        const d = Math.hypot(dx, dy);
        if (d > JOYSTICK.r && d > 0) { dx = dx / d * JOYSTICK.r; dy = dy / d * JOYSTICK.r; }
        G.stick.x = dx / JOYSTICK.r;
        G.stick.y = dy / JOYSTICK.r;
        G.stickActive = true;
    }
    function releaseStick() {
        G.stick.x = 0; G.stick.y = 0;
        G.stickActive = false;
        G._stickTouchId = null;
    }

    canvas.addEventListener('touchstart', e => {
        if (!G.mobileMode) return;
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return;
        // 只接管落在摇杆那一侧的触摸。右半屏没有射击需求（自动开火），
        // 留给屏幕按钮，免得拇指按大招时把角色一起带跑。
        const p = canvasPointFromTouch(t);
        if (p.x > 400) return;
        e.preventDefault();
        G._stickTouchId = t.identifier;
        setStickFromTouch(t);
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
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

    canvas.addEventListener('touchend', e => {
        if (!G.mobileMode) return;
        // 只有「按着摇杆的那根手指」抬起才松手，别的指头抬起来不影响移动
        const list = e.changedTouches;
        if (!list) { releaseStick(); return; }
        for (let i = 0; i < list.length; i++) {
            if (list[i].identifier === G._stickTouchId) { releaseStick(); return; }
        }
    });
    canvas.addEventListener('touchcancel', () => { if (G.mobileMode) releaseStick(); });

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
    G.mobileMode = detectMobileMode();
    applyMobileLayout();
    syncFullscreenBtns();

