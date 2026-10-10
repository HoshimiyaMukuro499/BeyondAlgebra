    // ---------- 重置 ----------
    function resetGame() {
        G.player.x = 390; G.player.y = 280;
        G.player.hp = 100; G.player.maxHp = 100;
        G.player.atk = 10; G.player.shootCooldown = 0;
        G.core.hp = 100; G.core.maxHp = 100;
        G.bullets = []; G.monsters = []; G.trails = []; G.particles = [];
        G.hand = []; G.triggerSlot = null; G.effectSlot = null;
        G.floor = 1; G.monstersToSpawn = 0; G.spawnTimer = 0;
        G.combineCooldown = false;
        // v9.28: fireRateMul 一起复位——留着旧局的值会让新一局开局就是加速射速。
        G.buffs = { atkUp: 0, multUp: 0, trailDmg: 1, trailWidth: 6, speedUp: 1, slowAll: 0, fireRateMul: 1 };
        G.passives = {};
        G.killCount = 0; G.killStreak = 0; G.lastKillFrame = 0; G.gameOver = false;
        G.fireCounter = 0; G.target = null;
        G.score = 0; G.maxCombo = 0;
        G.selectingActive = false; G.selectionCards = [];
        G.bossPending = false; G.bossSpawned = false;
        G.floatingTexts = [];
        G.fireTrails = []; G.damageFlows = []; G.ultimateGauge = 0; G.ultimateChargeMult = 1.0;
        G.enemyShots = [];
        G.ultimateActive = false; G.ultimateTimer = 0; G.screenFlash = 0;
        G.notifications = []; G.chainCooldown = 0;
        G.paused = false; G.maxSlots = 4;
        G.hazardZones = []; G.hazardTimer = 0;
        G.fateBuffs = { trailDmgMul: 1, bulletDmgMul: 1, speedMul: 1, dropRateMul: 1, monsterCountMul: 1, vampHeal: 0, atkMul: 1, damageTakenMul: 1 };
        G.fateChoosing = false; G.fateOptions = [];
        G.playerClass = null; G.essence = 0; G.relics = []; G.relicBuffs = {};
        G.stageType = 'mixed'; G.terrain = [];
        G.trailLifeBonus = 0; G.extraBullets = 0; G.essenceBonus = 0;
        G.merchantStock = []; G.shopSoldOut = []; G.mapChoices = [];
        G.batchQueue = []; G.activeTrailType = 'basic'; G.chairBonuses = 0;
        G.pathHistory = []; G.sprintTrails = []; G.mapMode = false;
        G.turrets = []; G.turretLoops = {}; G.turretHpBonus = 0;
        G.maxTurrets = 10; G.turretCapHintFrame = -999;   // v9.21: 图腾上限（v9.23: 15 → 10）
        G.essenceThisFloor = 0; G.shopRefreshCount = 1;   // v9.18 经济
        G._revived = false; G.fireRate = 40; G.stage = 1;   // v9.19: 10 → 40，与 01-state.js 保持一致
        G.gameLog = []; G.floorKills = 0; G.floorCardsObtained = 0;
        // v9.24: 词条残留与手机端输入状态。timeScale 归 1——重置之后抽屉一定是关的，
        // 留个 0.5 会让新一局一开局就是慢动作。
        G.enemyTotems = []; G.sealedPassives = [];
        G.stick = { x: 0, y: 0 }; G.stickActive = false;
        G.drawerOpen = false; G.timeScale = 1;
        // v9.25: 圈层、BOSS 横幅、消除冷却、动态摇杆底座。_stickTouchId 是 v9.24 漏掉的
        // ——ID 是旧局留下的数字，不清掉的话新局第一根手指会被当成「不是摇杆那根」。
        G.affixZones.length = 0; G.bossBanner = null; G.eliminateCooldown = 0;
        G.stickBase = null; G._stickTouchId = null;
        resetJoystickVisual();
        Tutorial.reset();
        document.getElementById('pauseOverlay').classList.remove('active');
        document.getElementById('pauseWorkshop').classList.remove('active');
        document.getElementById('classOverlay').classList.remove('active');
        document.getElementById('mapOverlay').classList.remove('active');
        document.getElementById('merchantOverlay').classList.remove('active');
        G.debug = false;
        document.getElementById('selectionOverlay').classList.remove('active');
        // v9.24: 手机端抽屉也要一起收起来——重开一局却还开着上一局的抽屉很出戏
        if (document.body) document.body.classList.remove('drawer-open');
        updateRelicUI(); updateBatchUI();
        updateUI();
        initClassSelection();
    }

    // ---------- 主循环 ----------
    // v9.29: FPS 叠层加「时间去哪了」的拆解，用来定位掉帧到底卡在 JS 还是渲染。
    //   U / D —— performance.now() 包在 update() / draw() 外面的 **CPU 派发耗时**，
    //            500ms 窗口内取「均值/峰值」。
    //   其他  —— 1000 / FPS − U − D，这一帧剩下的墙钟时间。canvas 的绘制是**异步排队**的，
    //            ctx.fill() 立刻返回、GPU 稍后才做，所以光栅化与浏览器合成的时间都落在
    //            这一项里，不会被 U/D 捕到。
    // 判读：
    //   U+D 逼近 16.6ms            → 瓶颈在我们的 JS，去查 update() / draw() 里的算法。
    //   U+D 很小但「其他」很大       → 瓶颈在绘制与合成，去减 shadowBlur 与绘制次数。
    //   U/D/其他 三项都很小但帧率仍低 → 浏览器在限流（掉到 30 就是每两个 vsync 才回调一次）。
    const FRAME_BUDGET_MS = 1000 / 60;   // 16.67ms：60Hz 下的一帧预算，只作参考线
    let _fps = 60, _fpsFrames = 0, _fpsMark = 0;
    let _uSum = 0, _dSum = 0, _uPeak = 0, _dPeak = 0;   // 本轮窗口的累加器
    let _uAvg = 0, _dAvg = 0, _uMax = 0, _dMax = 0;     // 上一轮窗口的结果（显示用）

    function sampleLoopCost(upMs, drawMs) {
        _uSum += upMs; _dSum += drawMs;
        if (upMs > _uPeak) _uPeak = upMs;
        if (drawMs > _dPeak) _dPeak = drawMs;
    }

    function drawFps() {
        if (!_fpsMark) _fpsMark = performance.now();
        _fpsFrames++;
        const now = performance.now();
        if (now - _fpsMark >= 500) {
            _fps = Math.round(_fpsFrames * 1000 / (now - _fpsMark));
            const n = Math.max(1, _fpsFrames);
            _uAvg = _uSum / n; _dAvg = _dSum / n;
            _uMax = _uPeak;    _dMax = _dPeak;
            _uSum = _dSum = _uPeak = _dPeak = 0;
            _fpsFrames = 0;
            _fpsMark = now;
        }
        // 低于 50 帧标黄，低于 30 帧标红——用来判断卡顿出在哪
        const color = _fps >= 50 ? 'rgba(120,150,180,0.55)' : (_fps >= 30 ? '#f5c542' : '#ff5544');
        // 「其他」兜底到 0：窗口刚翻篇时 FPS 还没刷新，1000/FPS 可能小于 U+D
        const other = Math.max(0, 1000 / Math.max(1, _fps) - _uAvg - _dAvg);
        ctx.save();
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = color;
        ctx.fillText(
            `${_fps} FPS · U ${_uAvg.toFixed(1)}/${_uMax.toFixed(1)} · D ${_dAvg.toFixed(1)}/${_dMax.toFixed(1)} · 其他 ${other.toFixed(1)}ms`,
            8, 8);
        if (_uAvg + _dAvg >= FRAME_BUDGET_MS) {
            ctx.fillStyle = '#ff5544';
            ctx.fillText(
                `⚠ U+D ${(_uAvg + _dAvg).toFixed(1)}ms 已超 ${FRAME_BUDGET_MS.toFixed(1)}ms 预算 —— 瓶颈在 JS`,
                8, 23);
        }
        ctx.restore();
    }

    // v9.24: 抽屉展开时的「子弹时间」累加器。G.timeScale = 0.5 时 update() 隔帧跑一次。
    // 游戏里所有计时都以「帧」为单位（怪物移动、充能、火焰寿命、教程节拍），
    // 所以隔帧 update 等于整体时间缩放，不需要去动任何一个具体计时器。
    let _timeAcc = 0;
    function gameLoop() {
        if (G.simMode) {
            simLoop();
            return;
        }
        const _t0 = performance.now();
        _timeAcc += G.timeScale;
        if (_timeAcc >= 1) {
            _timeAcc -= 1;
            update();
        }
        const _t1 = performance.now();
        draw();
        const _t2 = performance.now();
        sampleLoopCost(_t1 - _t0, _t2 - _t1);
        drawFps();
        // v9.25: 死亡后战斗界面的重开按钮只在这一处同步——G.gameOver 的三个写入点
        // 与 resetGame() 的复位都汇到这里，一帧一次布尔比较，不额外挂监听。
        if (G._gameOverUIShown !== G.gameOver) {
            G._gameOverUIShown = G.gameOver;
            syncGameOverUI();
        }
        requestAnimationFrame(gameLoop);
    }

