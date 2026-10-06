    const TUTORIAL_FLOORS = {
        1: {
            title: '你的轨迹就是武器',
            hpMul: 0.6,
            spawnInterval: 90,
            spawn: [{ type: 'basic', n: 4 }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 20, gate: true, point: 'player', hold: 360,
                  text: '按 W A S D 移动，脚下会拖出一条蓝色轨迹。怪物踩上去会持续掉血。',
                  fallback: '用键盘的 W A S D 四个键移动角色。' },
                { on: 'move', n: 300, hold: 360,
                  text: '本作的怪物是匀速直线移动的——它们不会停。用轨迹引导它们绕路。',
                  fallback: '先随便走一走，比如绕一个方形。' },
                { on: 'sprint', gate: true, point: 'player', hold: 400,
                  text: '按住 Shift 冲刺：轨迹更宽、更亮，伤害 ×2.5。这是你最快的输出手段。',
                  fallback: '按住键盘左下角的 Shift 键，同时按 W A S D 移动。' },
                { on: 'kill', n: 1, hold: 380,
                  text: '注意：怪物无法穿越轨迹，它们会绕着走。用轨迹分割战场、保护核心。',
                  fallback: '靠近怪物，让自动射击打死一只。' },
                { on: 'after', d: 180, hold: 360,
                  text: '本作是楼层制——每层清空后，你自己选下一层走哪条路。' },
                { on: 'clear', hold: 360,
                  text: '清空一层。接下来是属性三选一，选完打开节点地图。' },
            ],
        },
        2: {
            title: '子弹、护盾与精华',
            spawnInterval: 60,
            spawn: [{ type: 'basic', n: 4 }],
            drops: [{ on: 'kill', n: 2, card: 'T07' }, { on: 'kill', n: 4, card: 'E01' }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, hold: 380,
                  text: '子弹自动瞄准，优先级：治疗 💚 → 精英 ⭐ → BOSS 👑 → 最近的怪。' },
                { on: 'event', name: 'hit', needsMob: true, point: 'core', hold: 420,
                  text: '怪物撞核心时，先扣 🛡️ 护盾；护盾归零后才会伤到核心 HP。',
                  fallback: '让怪物靠近中央的核心，看它撞上去会怎样。' },
                { on: 'event', name: 'pickup', needsMob: true, point: 'hand', hold: 380,
                  text: '击杀掉卡。手牌上限 20 张，满了自动替换最老的一张。',
                  fallback: '再打死几只怪，等它掉一张牌。' },
                { on: 'after', d: 120, spawn: [{ type: 'fast', n: 2 }],
                  point: 'monsters', pointType: 'fast', pointLabel: '💨 疾速怪', hold: 420,
                  text: '💨 疾速怪登场：跑得快但很脆，优先清掉它们。' },
                { on: 'essence', n: 1, hold: 420,
                  text: '💎 精华是货币，击杀获得。攒够了去 🧙 商人 那里买牌、买遗物。' },
                { on: 'after', d: 240, hold: 400,
                  text: '楼层难度 = 1.16^(楼层-1)：每层强 16%。30 层后增速放缓，但永远不会停。' },
                { on: 'clear', hold: 360,
                  text: '清空一层。' },
            ],
        },
        3: {
            title: '密文板 · 本作的核心',
            spawnInterval: 70,
            hand: ['T06', 'E10'],
            spawn: [{ type: 'basic', n: 3 }],
            drops: [{ on: 'killType', type: 'healer', card: 'T07' },
                    { on: 'killType', type: 'healer', card: 'E12' }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, gate: true, point: 'hand', hold: 440,
                  text: '左边蓝色是触发板，右边红色是效果板。点手牌，把它填进对应的槽位。',
                  fallback: '用鼠标点手牌区里的 🐾怪触轨 和 🔄怪物反噬，各点一下。' },
                { on: 'slots', gate: true, point: 'combine', hold: 440,
                  text: '两个槽位都填好了。现在按 空格 宣读组合。',
                  fallback: '按下键盘的空格键。' },
                { on: 'event', name: 'combine', hold: 420,
                  text: '两张牌消耗了，变成永久被动：怪物踩到轨迹时，全场怪物互相伤害。' },
                { on: 'event', name: 'chair', point: 'player', hold: 420,
                  text: '🦽 轮椅组合「轨迹反噬」！看你的轨迹——它变成红色火焰了。' },
                { on: 'after', d: 240, hold: 460,
                  text: '6 组特定搭配会激活轮椅组合：额外数值加成 + 轨迹外观改变。它们是设计者明说的「通关答案」。' },
                { on: 'enter', d: 30, gate: true, point: 'hand', hold: 440,
                  autofill: ['T07', 'E12'],
                  text: '手牌里现在有 🎯射击命中 和 ⚡闪电链——再填一次槽位，按 空格 宣读。',
                  fallback: '点手牌里的 🎯射击命中 和 ⚡闪电链，然后按空格。' },
                { on: 'event', name: 'combine2', hold: 420,
                  text: '⚡ 轮椅组合「连锁风暴」！轨迹变金色，射速 +2，子弹变成闪电链。' },
                { on: 'after', d: 120, spawn: [{ type: 'healer', n: 2 }],
                  point: 'monsters', pointType: 'healer', pointLabel: '💚 治疗怪', hold: 420,
                  text: '💚 治疗怪登场：它会给周围同伴回血，优先集火。' },
                { on: 'after', d: 240, hold: 460,
                  text: '轨迹一共 4 种外观：基础蓝 / 火焰红 / 冰霜白 / 雷电金，由你激活的轮椅组合自动决定。' },
                { on: 'after', d: 240, spawn: [{ type: 'tank', n: 2 }],
                  point: 'monsters', pointType: 'tank', pointLabel: '🛡️ 重装怪', hold: 420,
                  text: '🛡️ 重装怪登场：血厚但慢，交给轨迹磨。' },
                { on: 'after', d: 240, hold: 460,
                  text: '按 P 可以批量宣读：战场冻结，把组合排进队列，一次全部生效。' },
                { on: 'clear', hold: 400,
                  text: '清空一层。' },
            ],
        },
        4: {
            title: '画一个闭环',
            spawnInterval: 70,
            spawn: [{ type: 'basic', n: 4 }],
            drops: [{ on: 'kill', n: 1, card: 'T12' }, { on: 'kill', n: 2, card: 'E12' }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, hold: 420,
                  text: '用轨迹在地上画一个圈，首尾接上——就能召唤 🗼 图腾。' },
                { on: 'event', name: 'pickup2', gate: true, point: 'hand', hold: 460,
                  autofill: ['T12', 'E12'],
                  text: '先把 ⭕闭环触发 和 ⚡闪电链 填进槽位宣读——这样闭环召唤的就是雷电图腾。',
                  fallback: '点手牌里的 ⭕闭环触发 和 ⚡闪电链，然后按空格。' },
                { on: 'event', name: 'loop', gate: true, hold: 460,
                  text: '⭕ 闭环成立！图腾会自动攻击范围内最近的怪物。它现在有血量，被打光才会碎。',
                  fallback: '绕一个大圈回到起点，把轨迹首尾接上。' },
                { on: 'after', d: 180, hold: 460,
                  text: '闭环越大，图腾越强也越结实：🥉小环 ×0.6 · 5血 / 🥈中环 ×1.0 · 12血 / 🥇大环 ×1.5 · 20血。' },
                { on: 'after', d: 240, hold: 480,
                  text: '图腾类型由 T12 绑定的效果板决定：E01→速射 / E12→雷电 / E13→冰霜 / E06→轨迹。' },
                { on: 'after', d: 240, hold: 480,
                  text: '🔒 围剿：怪物周围 8 个方向被轨迹封住 6 个以上，就会触发包围伤害 + 眩晕。' },
                { on: 'event', name: 'enclosure', needsMob: true, hold: 420,
                  text: '包围成功！锁死它们的走位——这一招在后期很关键。',
                  fallback: '用轨迹把一只怪围起来，八个方向堵住六个以上。' },
                { on: 'after', d: 120, spawn: [{ type: 'scorcher', n: 2 }],
                  point: 'monsters', pointType: 'scorcher', pointLabel: '🔥 灼烧怪', hold: 420,
                  text: '🔥 灼烧怪登场：它走过的地方会留下火焰轨迹。' },
                { on: 'event', name: 'scorcher', needsMob: true, hold: 420,
                  text: '火焰会烧到你——把它引到远离核心的地方，别站在火里。' },
                { on: 'clear', hold: 420,
                  text: '第 8 层起灼烧怪会正式登场，第 12 层起是 👻 虚灵怪。' },
            ],
        },
        5: {
            title: '精英、虚灵与终极技',
            spawnInterval: 60,
            ultFull: true,
            spawn: [{ type: 'basic', n: 4 }, { type: 'fast', n: 2 }],
            drops: [{ on: 'killElite', card: 'T10' }, { on: 'killElite', card: 'E03' }],
            next: 'NODEMAP',
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, spawn: [{ type: 'basic', n: 1, elite: true }],
                  point: 'elite', hold: 480,
                  text: '⭐ 精英怪登场，带词缀：再生 / 荆棘 / 迅捷 / 巨人 / 吸血 / 爆裂。第 5 层起出现，越深词缀越多。',
                  fallback: '场上那只更大、带 ⭐ 的怪就是精英。' },
                { on: 'enter', d: 360, spawn: [{ type: 'wraith', n: 1 }],
                  point: 'wraith', hold: 440,
                  text: '👻 虚灵怪登场：它免疫轨迹伤害，只能用子弹打。第 12 层起正式登场。' },
                { on: 'enter', d: 660, gate: true, hold: 440,
                  text: '⚡ 你的终极技已充满。按 Q 释放「轨迹风暴」——引爆全场轨迹，全体眩晕 2 秒。',
                  fallback: '按键盘的 Q 键。' },
                { on: 'event', name: 'ultimate', hold: 420,
                  text: '充能靠造成伤害累积。第 40 层起充能速度 ×1.5。' },
                { on: 'clear', hold: 480,
                  text: '每 5 层一次属性三选一，永久成长：攻击 +3 / 回血 30% / 移速 +5% / 轨迹伤害 +1。' },
            ],
        },
    };

    // 属性选完 → 节点地图（只在 G.mapMode 打开后才出声）
    const TUTORIAL_NODEMAP = {
        title: '你自己选路',
        wait: true,
        steps: [
            { kind: 'banner', on: 'map', hold: 140, text: '古老的石板-5 · 你自己选路' },
            { on: 'map', d: 40, hold: 520,
              text: '9 种节点：⚔️战斗 💨疾驰 🛡️攻城 🔥烈火 👻幽灵 ⭐精英 🧙商人 🏕️休整 👑BOSS。每层自己选。' },
        ],
    };

    // 第 6 层：收尾
    const TUTORIAL_OUTRO = {
        title: '从这里开始是你的冒险',
        steps: [
            { kind: 'banner', on: 'enter', hold: 150, text: '教程结束 · 从这里开始是你的冒险' },
            { on: 'after', d: 180, hold: 520,
              text: '还没讲到的，第 6 层起会自己撞上：🎁 遗物、🧙 商人、🔮 命运抉择（每 10 层）、💥 连杀爆发（25/50/100 连杀）、👑 BOSS（每 10 层）。' },
            { on: 'after', d: 360, hold: 520,
              text: '随时按 H 打开机制图鉴，全部机制都在里面。祝你好运。' },
        ],
    };

    // 机制图鉴（H 键）—— 覆盖 9.x 全部机制
    const CODEX_PAGES = [
        {
            title: '📖 机制图鉴 1/3 · 基础',
            lines: [
                '## 移动与轨迹',
                'W A S D 移动，脚下持续生成伤害轨迹，留存 6 秒，初始宽度 6。',
                '按住 Shift 冲刺：轨迹更宽更亮，伤害 ×2.5，是你最快的输出手段。',
                '轨迹伤害 = (轨迹伤害 + log2(楼层+1)×0.5) × 命运加成。',
                '怪物无法穿越轨迹，会绕着走——用轨迹分割战场、保护核心。',
                '虚灵怪 👻 免疫轨迹伤害。',
                '',
                '## 自动射击',
                '子弹自动发射，无需按键。目标优先级：治疗 → 精英 → BOSS → 最近的怪。',
                '射击间隔 = max(6, 12 - 楼层×0.08) 帧；命中 +1 分并给终极技充能。',
                '',
                '## 核心与护盾',
                '护盾 100 点优先承伤，护盾归零后才扣核心 HP。核心归零即游戏结束。',
                '怪物撞击每 24 帧结算一次，造成 攻击力×0.35 的伤害。',
                '',
                '## 操作',
                'W A S D 移动 · Shift 冲刺 · 鼠标点手牌填槽 · 空格 宣读组合',
                'Q 终极技 · P 暂停/批量宣读 · H 开关本图鉴 · ` 调试模式（数字键 1-8 生成怪物）',
            ],
        },
        {
            title: '📖 机制图鉴 2/3 · 密文板与流派',
            lines: [
                '## 组合规则',
                '1 张触发板 + 1 张效果板 → 空格宣读 → 永久被动，可反复宣读叠层。',
                '被动槽位上限 4（第 20 / 40 / 60 层各 +1，最多 7 个）。',
                '手牌上限 20 张，满了自动替换最老的一张。',
                '卡牌来源：每 5 层清空奖励、👑 BOSS 掉落、🧙 商人购买、🏕️ 休整赠送。',
                '',
                '## 触发板',
                'T01 对自身 · T02 对敌群 · T03 对精英生效 · T06 怪触轨',
                'T07 射击命中 · T08 连环击杀 · T10 残血触发 · T12 闭环触发',
                '',
                '## 效果板',
                'E01 攻击增幅 · E02 连环击 · E03 生命回复 · E04 移速减慢',
                'E06 轨迹升级 · E07 轨迹爆伤 · E10 怪物反噬 · E11 自速暴涨',
                'E12 闪电链 · E13 冰冻 · E14 延缓',
                '',
                '## 🦽 轮椅组合（6 组）',
                '轨迹反噬 = T06+E10 → 轨迹变红，轨迹伤害 +4',
                '连锁风暴 = T07+E12 → 轨迹变金，射速 -2',
                '冰轨永冻 = T06+E13 → 轨迹变白，宽度 +4、全场减速',
                '爆轨清场 = T02+E07 → 轨迹伤害 +5',
                '吸血领主 = T08+E03 → 击杀回血 +16',
                '弹幕地狱 = T07+E02 → 子弹伤害 +0.5',
                '它们额外给数值加成并改变轨迹外观——设计者明说的「通关答案」。',
                '',
                '## 轨迹外观',
                '基础蓝 / 火焰红 / 冰霜白 / 雷电金，由激活的轮椅组合自动决定。',
            ],
        },
        {
            title: '📖 机制图鉴 3/3 · 敌人、成长与地图',
            lines: [
                '## 怪物（7 种）',
                '普通 👾 / 疾速 💨 / 重装 🛡️ / 治疗 💚 / 分裂 🧬 / 灼烧 🔥 / 虚灵 👻',
                '治疗怪给同伴回血；分裂怪死后裂成 4 只子体；',
                '灼烧怪留下火焰轨迹（会烧到你）；虚灵怪免疫轨迹伤害，子弹抗性 30%。',
                '第 8 层起灼烧怪登场，第 12 层起虚灵怪登场。',
                '',
                '## 精英词缀（6 种）',
                '⭐ 精英第 5 层起出现。词缀数：5 层起 30% 带 1 个，15 层起 1-2 个，25 层起 2-3 个。',
                '再生 💚 每帧回血 / 荆棘 🌿 反弹伤害 / 迅捷 💨 速度+40%',
                '巨人 🦍 双倍HP与体型 / 吸血 🩸 攻击回血 / 爆裂 💥 死亡爆炸',
                '',
                '## 轨迹判环 → 图腾 / 围剿',
                '当前存留的轨迹自己绕成闭环（面积≥800px²）就召唤 🗼 图腾，没有数量上限。',
                '图腾改血量制：🥉小环 ×0.6 · 5血 / 🥈中环 ×1.0 · 12血 / 🥇大环 ×1.5 · 20血，血光才碎。',
                '同一个闭环只出一座塔——塔碎了之后，再画一次同样的环就能重新召唤。',
                '图腾类型由 T12 绑定的效果板决定：E01 速射 / E12 雷电 / E13 冰霜 / E06 轨迹。',
                '怪物会去打「图腾与核心中离自己更近的那一个」。',
                '围剿：怪物周围 8 个方向被轨迹封住 6 个以上 → 包围伤害 + 眩晕。',
                '',
                '## 终极技',
                '按 Q 释放轨迹风暴：引爆全场轨迹，全体眩晕 2 秒。',
                '靠造成伤害充能；第 40 层起充能速度 ×1.5。',
                '',
                '## 成长与地图',
                '每 5 层属性三选一：攻击+3 / 回血30% / 移速+5% / 轨迹伤害+1。',
                '每层结束在节点地图选下一层：⚔️战斗 💨疾驰 🛡️攻城 🔥烈火 👻幽灵',
                '⭐精英 🧙商人 🏕️休整 👑BOSS。商人用 💎精华 交易；休整回 30% 护盾 +2 张牌。',
                '',
                '## 其它系统',
                '🎁 遗物（12 种）从精英/BOSS 掉落，永久强化。',
                '🔮 命运抉择每 10 层一次，二选一，都是翻倍级改动。',
                '💥 连杀爆发：25 连杀冲击波 / 50 连杀过载 / 100 连杀天罚。',
                '连杀 = 连续击杀：3 秒没有击杀、或核心挨打就断，断了可以重新冲。',
                '👑 BOSS 每 10 层，血量 = 100000 × 1.7^(层数/10 - 1)（30 层后增速放缓），持续召唤爪牙。',
                '⭐ 得分按 lg 显示（对数），因为后期会跨十几个数量级。',
            ],
        },
    ];

    const Tutorial = {
        active: false, seen: false, finished: false,
        floor: 1, cfg: null,
        idx: -1, stepTimer: 0, pendTimer: 0,
        banner: null, text: null, hint: null,
        gateLeft: 0, moveAcc: 0, lastX: null, lastY: null,
        kills: 0, killedTypes: {}, flags: {},
        dropQueue: [], spawnQueue: [], combos: 0,
        hpMul: 1, spawnInterval: 0,
        tookOver: false, outroPending: false,
        codexOpen: false, codexPage: 0, _btns: [],

        // ---------- 查询 ----------
        gateClosed() { return this.active && this.gateLeft > 0; },

        clearCondition() {
            return G.monsters.length === 0 && G.monstersToSpawn === 0 && !G.bossPending
                && !this.pendingScript();
        },

        // 本层还没出场、但脚本已经排好的怪（挂在后续步骤的 spawn 上）。
        // 有它们在就绝不能判定「清空」——否则属性三选一会提前弹出，后面的怪反倒出不来。
        pendingScript() {
            if (!this.active || !this.cfg) return false;
            for (let i = this.idx + 1; i < this.cfg.steps.length; i++) {
                const sp = this.cfg.steps[i].spawn;
                if (sp && sp.some(s => s.n > 0)) return true;
            }
            return false;
        },

        // 场上没怪、也没有待生成的怪：需要打怪才能拿到的触发条件再也等不到了。
        // 只认 needsMob 标记的步骤——「按 Q」「画闭环」这类玩家自己就能做到的，
        // 哪怕场上没怪也得老实等，不能替他跳过。
        unreachable(s) {
            if (!s.needsMob && s.on !== 'kill' && s.on !== 'essence') return false;
            return G.monsters.length === 0 && G.monstersToSpawn === 0 && !G.bossPending;
        },

        // 清空后要不要压住「选属性 / 进下一层」，等清空字幕播完
        holdFloor() {
            if (!this.active || !this.cfg) return false;
            if (this.text) return true;
            for (let i = this.idx + 1; i < this.cfg.steps.length; i++) {
                if (this.cfg.steps[i].on === 'clear') return true;
            }
            return false;
        },

        // ---------- 生命周期 ----------
        startCfg(cfg, floor) {
            this.active = true;
            this.cfg = cfg;
            this.floor = floor;
            this.idx = -1;
            this.stepTimer = 0; this.pendTimer = 0;
            this.text = null; this.hint = null; this.banner = null;
            this.moveAcc = 0; this.lastX = null; this.lastY = null;
            this.kills = 0; this.killedTypes = {}; this.flags = {};
            this.combos = 0;
            this.hpMul = cfg.hpMul || 1;
            this.spawnInterval = cfg.spawnInterval || 0;
            this.dropQueue = (cfg.drops || []).map(d => ({ ...d, done: 0 }));
            this.spawnQueue = [];
            (cfg.spawn || []).forEach(s => {
                for (let i = 0; i < s.n; i++) {
                    this.spawnQueue.push({ key: s.type, elite: !!(s.elite && i === 0), hpMul: cfg.hpMul || 1 });
                }
            });
            this.gateLeft = (cfg.steps || []).filter(s => s.gate).length;

            // 预设手牌：清空并发放
            if (cfg.hand) {
                G.hand = [];
                cfg.hand.forEach(id => dropScriptedCard(id, true));
            }
            // 预设终极技能直接充满
            if (cfg.ultFull) G.ultimateGauge = G.ultimateMax;
            updateUI();
        },

        // startFloor 的开场钩子：返回 true 表示出怪被教程接管
        onFloorStart() {
            this.tookOver = false;
            if (G.simMode) return;
            if (this.outroPending) {
                this.outroPending = false;
                if (!this.seen) this.startCfg(TUTORIAL_OUTRO, G.floor);
                return;
            }
            if (this.seen || this.finished) return;
            const cfg = TUTORIAL_FLOORS[G.floor];
            if (!cfg) return;
            this.startCfg(cfg, G.floor);
            this.tookOver = true;
        },

        reset() {
            this.active = false;
            this.finished = false;
            this.codexOpen = false;
            this.outroPending = false;
            this.tookOver = false;
            this.floor = 1; this.cfg = null; this.idx = -1;
            this.text = null; this.hint = null; this.banner = null;
            this.gateLeft = 0; this.spawnQueue = []; this.dropQueue = [];
            this.hpMul = 1; this.spawnInterval = 0;
            this.moveAcc = 0; this.lastX = null; this.lastY = null;
            this.kills = 0; this.killedTypes = {}; this.flags = {};
            this.combos = 0;
        },

        // ---------- 出怪 / 掉落 ----------
        nextSpawn() {
            if (!this.active || this.spawnQueue.length === 0) return null;
            return this.spawnQueue.shift();
        },

        emit(name, data) {
            if (!this.active) return;
            if (name === 'kill') {
                this.kills++;
                const t = (data && data.type) || '?';
                if (!(data && data.isChild)) this.killedTypes[t] = (this.killedTypes[t] || 0) + 1;
                if (data && data.isElite) this.flags.eliteKill = true;
                if (data && data.isChild) this.flags.childKill = true;
                this.checkDrops();
                return;
            }
            if (name === 'combine') this.combos++;
            this.flags[name] = true;
        },

        checkDrops() {
            while (this.dropQueue.length > 0) {
                const d = this.dropQueue[0];
                let ok = false;
                if (d.on === 'kill') ok = this.kills >= d.n;
                else if (d.on === 'killType') ok = (this.killedTypes[d.type] || 0) >= (d.n || 1);
                else if (d.on === 'killElite') ok = !!this.flags.eliteKill;
                else if (d.on === 'killChild') ok = !!this.flags.childKill;
                if (!ok) break;
                this.dropQueue.shift();
                dropScriptedCard(d.card);
            }
        },

        // 超时兜底：把指定组合直接填进槽位，别让玩家卡住
        autoFill(ids) {
            if (!ids || ids.length < 2) return;
            const t = TRIGGERS.find(c => c.id === ids[0]);
            const e = EFFECTS.find(c => c.id === ids[1]);
            if (!t || !e) return;
            G.triggerSlot = { ...t };
            G.effectSlot = { ...e };
            updateUI();
            setFeedback(`🎓 教程已帮你填好 ${t.emoji}${t.label} + ${e.emoji}${e.label}，按 空格 宣读`, '#f5c542');
        },

        // ---------- 步骤调度 ----------
        triggered(s) {
            switch (s.on) {
                case 'enter':
                case 'after': return this.pendTimer >= (s.d || 0);
                case 'move': return this.moveAcc >= s.n;
                case 'kill': return this.kills >= s.n;
                case 'slots': return !!(G.triggerSlot && G.effectSlot);
                case 'essence': return G.essence >= s.n;
                case 'sprint': return !!G.keys.shift;
                case 'map': return !!G.mapMode;
                case 'clear': return this.clearCondition();
                case 'event': return !!this.flags[s.name];
                default: return true;
            }
        },

        show(i) {
            const s = this.cfg.steps[i];
            this.idx = i;
            this.stepTimer = 0;
            this.pendTimer = 0;
            this.hint = null;
            const text = s.kind === 'banner' && !s.text ?
                `古老的石板-${this.floor} · ${this.cfg.title}` : s.text;
            this.text = { step: s, text };
            if (s.kind === 'banner') this.banner = { text, life: s.hold || 120, maxLife: s.hold || 120 };

            // 步骤钦定的怪：讲到这里才放出来，边讲边登场
            if (s.spawn) {
                let added = 0;
                s.spawn.forEach(sp => {
                    for (let k = 0; k < sp.n; k++) {
                        this.spawnQueue.push({ key: sp.type, elite: !!(sp.elite && k === 0), hpMul: this.cfg.hpMul || 1 });
                        added++;
                    }
                });
                if (added > 0) {
                    G.monstersToSpawn += added;
                    G.spawnTimer = 0; // 立刻出场，别让玩家对着空地读字
                }
            }
        },

        advance() {
            const cur = this.text && this.text.step;
            if (cur && cur.gate && this.gateLeft > 0) this.gateLeft--;
            this.text = null;
            this.hint = null;
            this.stepTimer = 0;
            this.pendTimer = 0;
        },

        finish() {
            this.active = false;
            this.finished = true;
            this.seen = true;
            this.text = null;
            this.banner = null;
            this.hint = null;
            setFeedback('🎓 教程结束 · 第 6 层起恢复随机', '#f5c542');
        },

        tick() {
            if (!this.active || !this.cfg) return;
            if (G.gameOver || G.simMode) return;
            this.pendTimer++;
            if (this.banner && --this.banner.life <= 0) this.banner = null;
            if (this.hint && --this.hint.life <= 0) this.hint = null;

            // 累计移动距离
            const p = G.player;
            if (this.lastX !== null) {
                this.moveAcc += Math.hypot(p.x - this.lastX, p.y - this.lastY);
            }
            this.lastX = p.x;
            this.lastY = p.y;

            // 当前字幕播完 → 收掉，等下一步的触发条件
            if (this.text) {
                this.stepTimer++;
                const hold = this.text.step.hold != null ? this.text.step.hold : 320;
                if (this.stepTimer >= hold) this.advance();
                return;
            }

            const next = this.idx + 1;
            if (next >= this.cfg.steps.length) {
                if (this.cfg.next) {
                    const nx = this.cfg.next === 'NODEMAP' ? TUTORIAL_NODEMAP : null;
                    if (nx) { this.startCfg(nx, this.floor); }
                    return;
                }
                if (this.cfg.wait) return; // 等玩家自己操作（例如选节点）
                this.finish();
                return;
            }
            const s = this.cfg.steps[next];

            if (this.triggered(s)) { this.show(next); return; }

            // 本层已经打空，条件再也不可能满足——比如「等怪物撞核心」但场上已经没怪。
            // 直接把字幕播出来，别让玩家对着空地干等 45 秒超时。
            if (this.unreachable(s)) {
                if (s.autofill) this.autoFill(s.autofill);
                this.show(next);
                return;
            }

            // 超时保底：先换直白提示，再自动放行
            if (s.fallback && this.pendTimer === TUTORIAL_TIMEOUT) {
                this.hint = { text: s.fallback, life: TUTORIAL_FORCE };
            }
            if (this.pendTimer >= TUTORIAL_TIMEOUT + TUTORIAL_FORCE) {
                if (s.autofill) this.autoFill(s.autofill);
                this.show(next);
            }
        },

        // ---------- 跳过 / 重看 ----------
        skip() {
            if (!this.active || !this.cfg) return;
            this.active = false;
            this.finished = true;
            this.seen = true;
            this.outroPending = false;
            this.text = null;
            this.banner = null;
            this.hint = null;
            G.hand = [];
            ['T06', 'E10', 'T07', 'E12', 'T12'].forEach(id => dropScriptedCard(id, true));
            addPassive('T06', 'E10');
            addPassive('T07', 'E12');
            addPassive('T12', 'E12');
            G.essence += 40;
            addScore(500);
            G.stageType = 'mixed';
            G.floor = TUTORIAL_MAX_FLOOR; // advanceFloor 会 +1 → 第 6 层
            advanceFloor();
            setFeedback('⏭ 已跳过教程 · 从第 6 层开始', '#88ccff');
        },

        replay() {
            this.seen = false;
            this.finished = false;
            resetGame();
            setFeedback('🎓 重新开始教程 · 古老的石板 1', '#7bb3ff');
        },

        handleClick(x, y) {
            if (this.codexOpen) {
                // 点击左 1/4 上一页、右 1/4 下一页、中间关闭
                const cw = G.canvasWidth || 780;
                if (x < cw * 0.25) this.codexPage = Math.max(0, this.codexPage - 1);
                else if (x > cw * 0.75) this.codexPage = Math.min(CODEX_PAGES.length - 1, this.codexPage + 1);
                else this.codexOpen = false;
                return true;
            }
            for (const b of this._btns) {
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                    if (b.id === 'skip') this.skip();
                    else if (b.id === 'replay') this.replay();
                    else if (b.id === 'codex') {
                        this.codexOpen = !this.codexOpen;
                        this.codexPage = 0;
                    }
                    return true;
                }
            }
            return false;
        },
    };

    // 脚本掉落：按 id 直接发放
    function dropScriptedCard(cardId, silent) {
        const t = TRIGGERS.find(c => c.id === cardId);
        const e = t ? null : EFFECTS.find(c => c.id === cardId);
        const card = t || e;
        if (!card) return;
        if (G.hand.length >= 20) G.hand.shift();
        G.hand.push({ ...card, type: t ? 'trigger' : 'effect' });
        if (!silent) {
            setFeedback(`📥 拾取 ${card.emoji} ${card.label}`, '#8ab3d0');
            Tutorial.emit('pickup', card);
            if (cardId === 'T12' || cardId === 'E12') Tutorial.emit('pickup2', card);
        }
        updateUI();
    }

    // 开发期自检：脚本掉落必须 T/E 交替，否则玩家会抽不了牌
    function tutorialCheckBalance() {
        Object.keys(TUTORIAL_FLOORS).forEach(f => {
            const cfg = TUTORIAL_FLOORS[f];
            const list = (cfg.drops || []).map(d => d.card).concat(cfg.hand || []);
            if (list.length === 0) return;
            const t = list.filter(c => c[0] === 'T').length;
            const e = list.filter(c => c[0] === 'E').length;
            if (Math.abs(t - e) > 1) {
                console.warn(`[教程] 第 ${f} 层脚本掉落不平衡 T=${t} E=${e}`, list);
            }
        });
    }

    // 教程角标 / 图鉴要能点击，所以教程期间强制放开 canvas 的鼠标事件
    function tutorialSyncPointer() {
        if (G.simMode) return;
        const want = G.mapMode || Tutorial.active || Tutorial.codexOpen || !Tutorial.seen;
        canvas.style.pointerEvents = want ? 'auto' : 'none';
    }

    // ---------- 教程渲染 ----------
    function tutorialRoundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function tutorialTargetPoint(name, subtype) {
        const cw = G.canvasWidth || 780, ch = G.canvasHeight || 560;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const sx = cw / rect.width, sy = ch / rect.height;
        const domMap = { hand: 'handContainer', combine: 'combineBtn', slot: 'triggerSlot' };
        const domId = domMap[name];
        if (domId) {
            const el = document.getElementById(domId);
            if (el) {
                const r = el.getBoundingClientRect();
                const outside = r.left > rect.right || r.right < rect.left ||
                    r.bottom < rect.top || r.top > rect.bottom;
                return {
                    x: clamp((r.left + r.width / 2 - rect.left) * sx, 16, cw - 16),
                    y: clamp((r.top + r.height / 2 - rect.top) * sy, 16, ch - 16),
                    outside,
                };
            }
            return null;
        }
        if (name === 'core') return { x: G.core.x, y: G.core.y };
        if (name === 'player') return { x: G.player.x, y: G.player.y };
        if (name === 'elite') {
            const m = G.monsters.find(mm => mm.isElite);
            return m ? { x: m.x, y: m.y } : null;
        }
        if (name === 'wraith') {
            const m = G.monsters.find(mm => mm.isWraith);
            return m ? { x: m.x, y: m.y } : null;
        }
        if (name === 'monsters') {
            // subtype 指定种类时，箭头只盯新登场的那一种，别指到别的怪身上
            const m = (subtype && G.monsters.find(mm => mm.type === subtype)) || G.monsters[0];
            return m ? { x: m.x, y: m.y } : null;
        }
        if (name === 'turret') {
            const t = G.turrets[0];
            return t ? { x: t.x, y: t.y } : null;
        }
        return null;
    }

    const TUTORIAL_POINT_LABEL = {
        hand: '手牌', combine: '宣读组合', slot: '槽位', core: '核心',
        player: '你', elite: '精英怪', wraith: '虚灵怪', monsters: '怪物', turret: '图腾',
    };

    function drawTutorialPointer(name, subtype, labelOverride) {
        const pt = tutorialTargetPoint(name);
        if (!pt) return;
        const cw = G.canvasWidth || 780;
        ctx.save();
        ctx.strokeStyle = 'rgba(245,197,66,0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14 + Math.sin(G.frame * 0.12) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (pt.outside) {
            const dir = pt.x > cw / 2 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y);
            ctx.lineTo(pt.x + 24 * dir, pt.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pt.x + 30 * dir, pt.y);
            ctx.lineTo(pt.x + 18 * dir, pt.y - 7);
            ctx.lineTo(pt.x + 18 * dir, pt.y + 7);
            ctx.closePath();
            ctx.fillStyle = 'rgba(245,197,66,0.85)';
            ctx.fill();
        }
        const label = labelOverride || TUTORIAL_POINT_LABEL[name];
        if (label) {
            ctx.font = `12px ${TUTORIAL_FONT}`;
            const tw = ctx.measureText(label).width;
            const lx = clamp(pt.x + 22, 10, cw - tw - 26);
            const ly = clamp(pt.y - 32, 22, (G.canvasHeight || 560) - 22);
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#0a0a16';
            tutorialRoundRect(ctx, lx - 9, ly - 12, tw + 18, 24, 6);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#f5c542';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lx, ly);
        }
        ctx.restore();
    }

    function drawTutorialSubtitle(text) {
        const cw = G.canvasWidth || 780, ch = G.canvasHeight || 560;
        ctx.save();
        ctx.font = `15px ${TUTORIAL_FONT}`;
        const maxW = cw * 0.88 - 32;
        const lines = [];
        let cur = '';
        for (const ch2 of text) {
            if (ctx.measureText(cur + ch2).width > maxW) { lines.push(cur); cur = ''; }
            cur += ch2;
        }
        if (cur) lines.push(cur);
        const lineH = 22, padY = 12;
        const barW = cw * 0.88;
        const barH = lines.length * lineH + padY * 2;
        const bx = (cw - barW) / 2, by = ch - barH - 16;

        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#0a0a16';
        tutorialRoundRect(ctx, bx, by, barW, barH, 10);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(245,197,66,0.45)';
        ctx.lineWidth = 1;
        tutorialRoundRect(ctx, bx, by, barW, barH, 10);
        ctx.stroke();
        ctx.fillStyle = '#f5c542';
        ctx.fillRect(bx + 10, by + 10, 3, barH - 20);

        ctx.font = `15px ${TUTORIAL_FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e8f2ff';
        lines.forEach((ln, i) => ctx.fillText(ln, bx + 22, by + padY + lineH * i + lineH / 2));
        ctx.restore();
    }

    function drawCodex() {
        const cw = G.canvasWidth || 780, ch = G.canvasHeight || 560;
        const pages = CODEX_PAGES;
        const pi = clamp(Tutorial.codexPage, 0, pages.length - 1);
        const page = pages[pi];
        ctx.save();
        ctx.fillStyle = 'rgba(6,8,20,0.96)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.strokeStyle = 'rgba(245,197,66,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(3, 3, cw - 6, ch - 6);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `bold 17px ${TUTORIAL_FONT}`;
        ctx.fillStyle = '#f5c542';
        ctx.fillText(page.title, 26, 18);

        // 内容可能比画布高（第 3 页尤其长）——按需整体压行距与字号，保证一定放得下
        let need = 0;
        for (const raw of page.lines) need += raw === '' ? 7 : (raw.startsWith('##') ? 21 : 17);
        const avail = ch - 48 - 34;
        const k = need > avail ? avail / need : 1;
        const headH = 21 * k, normH = 17 * k, gapH = 7 * k;
        const headFont = `bold ${Math.max(9, Math.round(13 * k))}px ${TUTORIAL_FONT}`;
        const normFont = `${Math.max(9, Math.round(12 * k))}px ${TUTORIAL_FONT}`;

        let y = 48;
        for (const raw of page.lines) {
            if (raw === '') { y += gapH; continue; }
            const isHead = raw.startsWith('##');
            const line = isHead ? raw.slice(2) : raw;
            ctx.font = isHead ? headFont : normFont;
            ctx.fillStyle = isHead ? '#8ab3d0' : '#c8d6e8';
            ctx.fillText(line, 26, y);
            y += isHead ? headH : normH;
        }

        ctx.font = `12px ${TUTORIAL_FONT}`;
        ctx.fillStyle = '#6a8aaa';
        ctx.fillText('← → 翻页 · H 或点击画面中央关闭', 26, ch - 24);
        ctx.textAlign = 'right';
        ctx.fillText(`${pi + 1} / ${pages.length}`, cw - 26, ch - 24);
        ctx.restore();
    }

    function drawTutorialCorners() {
        const cw = G.canvasWidth || 780;
        Tutorial._btns = [];
        const items = [];
        if (Tutorial.active) items.push({ id: 'skip', label: '⏭ 跳过教程 →', color: '#8ab3d0' });
        else items.push({ id: 'replay', label: '⟲ 重看教程', color: '#5f7f9f' });
        items.push({ id: 'codex', label: '📖 H 机制图鉴', color: '#5f7f9f' });

        ctx.save();
        ctx.font = `12px ${TUTORIAL_FONT}`;
        ctx.textBaseline = 'middle';
        let x = cw - 10;
        for (const it of items) {
            const tw = ctx.measureText(it.label).width;
            const bw = tw + 20, bh = 24, by = 8;
            x -= bw;
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#0a0a16';
            tutorialRoundRect(ctx, x, by, bw, bh, 6);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = it.color + '66';
            ctx.lineWidth = 1;
            tutorialRoundRect(ctx, x, by, bw, bh, 6);
            ctx.stroke();
            ctx.fillStyle = it.color;
            ctx.textAlign = 'left';
            ctx.fillText(it.label, x + 10, by + bh / 2);
            Tutorial._btns.push({ id: it.id, x, y: by, w: bw, h: bh });
            x -= 6;
        }
        ctx.restore();
    }

    function drawTutorial() {
        if (G.simMode || G.gameOver) return;
        if (Tutorial.codexOpen) { drawCodex(); return; }

        const step = Tutorial.text ? Tutorial.text.step : null;
        if (step && step.point) drawTutorialPointer(step.point, step.pointType, step.pointLabel);

        if (Tutorial.banner) {
            const b = Tutorial.banner;
            const cw = G.canvasWidth || 780, ch = G.canvasHeight || 560;
            const a = Math.max(0, Math.min(1, b.life / 25, (b.maxLife - b.life) / 12));
            ctx.save();
            ctx.globalAlpha = a;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold 26px ${TUTORIAL_FONT}`;
            ctx.lineWidth = 6;
            ctx.strokeStyle = 'rgba(4,6,16,0.92)';
            ctx.strokeText(b.text, cw / 2, ch / 2 - 40);
            ctx.fillStyle = '#f5c542';
            ctx.fillText(b.text, cw / 2, ch / 2 - 40);
            ctx.restore();
        }

        if (step && step.kind !== 'banner') drawTutorialSubtitle(Tutorial.text.text);

        if (Tutorial.hint && Tutorial.hint.text) {
            const cw = G.canvasWidth || 780, ch = G.canvasHeight || 560;
            ctx.save();
            ctx.font = `bold 13px ${TUTORIAL_FONT}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tw = ctx.measureText(Tutorial.hint.text).width;
            ctx.globalAlpha = 0.94;
            ctx.fillStyle = '#2a1d05';
            tutorialRoundRect(ctx, cw / 2 - tw / 2 - 16, ch / 2 + 60, tw + 32, 34, 8);
            ctx.fill();
            ctx.strokeStyle = '#f5c542';
            ctx.lineWidth = 1.5;
            tutorialRoundRect(ctx, cw / 2 - tw / 2 - 16, ch / 2 + 60, tw + 32, 34, 8);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#f5c542';
            ctx.fillText(Tutorial.hint.text, cw / 2, ch / 2 + 77);
            ctx.restore();
        }

        drawTutorialCorners();
    }

