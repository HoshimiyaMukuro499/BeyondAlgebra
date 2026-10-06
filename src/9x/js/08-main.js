    // ---------- 重置 ----------
    function resetGame() {
        G.player.x = 390; G.player.y = 280;
        G.player.hp = 100; G.player.maxHp = 100;
        G.player.atk = 10; G.player.mult = 1.0; G.player.shootCooldown = 0;
        G.playerSlowTimer = 0; G.playerSlowAmount = 0;
        G.core.hp = 100; G.core.maxHp = 100;
        G.bullets = []; G.monsters = []; G.trails = []; G.particles = [];
        G.hand = []; G.triggerSlot = null; G.effectSlot = null;
        G.floor = 1; G.monstersToSpawn = 0; G.spawnTimer = 0;
        G.combineCooldown = false;
        G.buffs = { atkUp: 0, multUp: 0, trailDmg: 1, trailWidth: 6, speedUp: 1, slowAll: 0 };
        G.passives = {};
        G.killCount = 0; G.killStreak = 0; G.lastKillFrame = 0; G.gameOver = false;
        G.fireCounter = 0; G.target = null;
        G.score = 0; G.maxCombo = 0;
        G.vacuumActive = false; G.vacuumTimer = 0;
        G.selectingActive = false; G.selectionCards = [];
        G.bossPending = false; G.bossSpawned = false;
        G.floatingTexts = [];
        G.fireTrails = []; G.damageFlows = []; G.ultimateGauge = 0; G.ultimateChargeMult = 1.0;
        G.ultimateActive = false; G.ultimateTimer = 0; G.screenFlash = 0;
        G.notifications = []; G.chainCooldown = 0;
        G.paused = false; G.maxSlots = 4;
        G.hazardZones = []; G.hazardTimer = 0;
        G.fateBuffs = { trailDmgMul: 1, bulletDmgMul: 1, speedMul: 1, dropRateMul: 1, monsterCountMul: 1, vampHeal: 0, atkMul: 1, damageTakenMul: 1 };
        G.lastKillBurst = 0; G.fateChoosing = false; G.fateOptions = [];
        G.playerClass = null; G.essence = 0; G.relics = []; G.relicBuffs = {};
        G.stageType = 'mixed'; G.terrain = [];
        G.trailLifeBonus = 0; G.extraBullets = 0; G.essenceBonus = 0;
        G.merchantStock = []; G.shopSoldOut = []; G.mapChoices = [];
        G.batchQueue = []; G.activeTrailType = 'basic'; G.chairBonuses = 0;
        G.pathHistory = []; G.sprintTrails = []; G.mapMode = false;
        G.turrets = []; G.turretLoops = {}; G.turretHpBonus = 0;
        G.essenceThisFloor = 0; G.shopRefreshCount = 1;   // v9.18 经济
        G._revived = false; G.fireRate = 40; G.stage = 1;   // v9.19: 10 → 40，与 01-state.js 保持一致
        G.gameLog = []; G.floorKills = 0; G.floorCardsObtained = 0;
        Tutorial.reset();
        document.getElementById('pauseOverlay').classList.remove('active');
        document.getElementById('pauseWorkshop').classList.remove('active');
        document.getElementById('classOverlay').classList.remove('active');
        document.getElementById('mapOverlay').classList.remove('active');
        document.getElementById('merchantOverlay').classList.remove('active');
        G.debug = false;
        document.getElementById('vacuumBar').classList.remove('active');
        document.getElementById('selectionOverlay').classList.remove('active');
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

    function gameLoop() {
        if (G.simMode) {
            simLoop();
            return;
        }
        update();
        draw();
        drawFps();
        requestAnimationFrame(gameLoop);
    }

