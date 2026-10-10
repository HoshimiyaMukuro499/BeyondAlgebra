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
    let _fps = 60, _fpsFrames = 0, _fpsMark = 0;
    function drawFps() {
        if (!_fpsMark) _fpsMark = performance.now();
        _fpsFrames++;
        const now = performance.now();
        if (now - _fpsMark >= 500) {
            _fps = Math.round(_fpsFrames * 1000 / (now - _fpsMark));
            _fpsFrames = 0;
            _fpsMark = now;
        }
        // 低于 50 帧标黄，低于 30 帧标红——用来判断卡顿出在哪
        const color = _fps >= 50 ? 'rgba(120,150,180,0.55)' : (_fps >= 30 ? '#f5c542' : '#ff5544');
        ctx.save();
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = color;
        ctx.fillText(`${_fps} FPS`, 8, 8);
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
        _timeAcc += G.timeScale;
        if (_timeAcc >= 1) {
            _timeAcc -= 1;
            update();
        }
        draw();
        drawFps();
        // v9.25: 死亡后战斗界面的重开按钮只在这一处同步——G.gameOver 的三个写入点
        // 与 resetGame() 的复位都汇到这里，一帧一次布尔比较，不额外挂监听。
        if (G._gameOverUIShown !== G.gameOver) {
            G._gameOverUIShown = G.gameOver;
            syncGameOverUI();
        }
        requestAnimationFrame(gameLoop);
    }

