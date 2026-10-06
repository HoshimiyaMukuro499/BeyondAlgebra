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
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        skipBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            skipVacuum();
        });
    }
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

