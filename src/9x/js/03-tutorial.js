    // ============================================================
    //  v9.26 五块石板：移动方式 → 图腾生成 → 密文版 → 敌人 → 核心
    // ============================================================
    // 顺序是用户定的。两点值得记下来：
    //   1. **闭环图腾排在密文版前面**。判环只看轨迹本身（04-trail.js 的 checkTrailLoop），
    //      没填任何牌时 turType 默认 'basic'——所以「画个圈就出一座塔」不需要先学密文版。
    //      第 3 块石板再回头讲「T12 绑什么效果板，塔就是什么类型」，两边正好接上。
    //   2. **「敌人」与「核心」拆成两块石板**，而不是挤在同一块里。这不只是篇幅问题：
    //      属性三选一与节点地图都挂在 `G.floor % 5 === 0` 上（05-update.js 的波次清空分支），
    //      收尾字幕又必须等玩家在节点地图上选完路才播（Tutorial.outroPending）。
    //      也就是说教程至少要走到第 5 层，收尾才会有入口——把核心放在第 5 块正好顺水推舟。
    //
    // ---------- 字幕节奏：两条提示之间 3 秒 ± 1 秒 ----------
    // 一条字幕的显示时长是它自己的 `hold`（帧），下一条的出场还要再等它的 `d`（帧）。
    // 所以相邻两条**由计时器驱动**的字幕（on: 'enter' / 'after' / 'map'）之间的间隔
    // 就是 `上一条.hold + 下一条.d`。用户要求 3s ± 1s ⇒ 这个和必须落在 120 ~ 240 帧
    // （3 秒 = 180 帧，±1 秒 = ±60 帧），长句取上限、短句取下限，
    // 相邻几条之间的差值本身就是那 ±1 秒的手感。改任何一条 hold/d 都要重新对这个账，
    // 探针第 16 节末尾会逐层逐条核对。
    // 等玩家动手的步骤（gate / move / kill / slots / essence / event / clear）间隔由玩家决定，
    // 不在这个约束里；但它们的 `hold` 照样压在 150~180，别让字幕赖在屏幕上不走。
    const TUTORIAL_FLOORS = {
        1: {
            title: '移动方式',
            hpMul: 0.6,
            spawnInterval: 90,
            spawn: [{ type: 'basic', n: 4 }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, gate: true, point: 'player', hold: 150,
                  text: '按 W A S D 移动，脚下会拖出一条蓝色轨迹。怪物踩上去会持续掉血——轨迹就是你的武器。',
                  fallback: '用键盘的 W A S D 四个键移动角色。' },
                { on: 'move', n: 300, hold: 150,
                  text: '怪物会一直朝核心逼近，路上会自己绕开石头——它们不会停。',
                  fallback: '先随便走一走，比如绕一个方形。' },
                { on: 'sprint', gate: true, point: 'player', hold: 180,
                  text: '按住 Shift 冲刺：轨迹更宽、更亮，伤害 ×2.5。这是你最快的输出手段。',
                  fallback: '按住键盘左下角的 Shift 键，同时按 W A S D 移动。' },
                { on: 'kill', n: 1, hold: 150,
                  text: '轨迹不挡路：怪物踩上去会迟缓 3 秒。贴着怪画，把它们拖在你身后。',
                  fallback: '靠近怪物，让自动射击打死一只。' },
                { on: 'after', d: 40, hold: 150,
                  text: '本作是楼层制——每层清空后，你自己选下一层走哪条路。' },
                { on: 'clear', hold: 150,
                  text: '清空一层。' },
            ],
        },
        2: {
            title: '图腾生成',
            spawnInterval: 60,
            spawn: [{ type: 'basic', n: 4 }],
            drops: [{ on: 'kill', n: 2, card: 'T07' }, { on: 'kill', n: 4, card: 'E01' }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, hold: 160,
                  text: '用轨迹在地上画一个圈，首尾接上——就能召唤 🗼 图腾。' },
                { on: 'event', name: 'loop', gate: true, point: 'turret', hold: 180,
                  text: '⭕ 闭环成立！图腾会自动攻击范围内最近的怪物。它现在有血量，被打光才会碎。',
                  fallback: '绕一个大圈回到起点，把轨迹首尾接上。' },
                { on: 'after', d: 40, hold: 180,
                  text: '闭环越大，图腾越强也越结实：🥉小环 ×0.6 · 2血 / 🥈中环 ×1.0 · 4血 / 🥇大环 ×1.5 · 6血。全场最多 10 座。' },
                { on: 'after', d: 40, hold: 160,
                  text: '注意：图腾泡在火焰里会被烧掉血——包括灼烧怪留下的火。别把塔画在火里。' },
                { on: 'after', d: 40, hold: 150,
                  text: '怪物会去打「图腾与核心」里离自己更近的那一个——把塔摆在它们必经的路上。' },
                { on: 'clear', hold: 150,
                  text: '清空一层。' },
            ],
        },
        3: {
            title: '密文版',
            spawnInterval: 70,
            hand: ['T06', 'E10'],
            spawn: [{ type: 'basic', n: 3 }],
            drops: [{ on: 'kill', n: 3, card: 'T07' }, { on: 'kill', n: 6, card: 'E12' }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, gate: true, point: 'hand', hold: 180,
                  text: '密文版是本作的核心。左边蓝色是触发板，右边红色是效果板——点手牌，把它填进对应的槽位。',
                  fallback: '用鼠标点手牌区里的 🐾怪触轨 和 🔄怪物反噬，各点一下。' },
                { on: 'slots', gate: true, point: 'combine', hold: 150,
                  text: '两个槽位都填好了。现在按 空格 宣读组合。',
                  fallback: '按下键盘的空格键。' },
                { on: 'event', name: 'combine', hold: 180,
                  text: '两张牌消耗了，变成永久被动：怪物踩到轨迹时，全场怪物互相伤害。' },
                { on: 'event', name: 'chair', point: 'player', hold: 150,
                  text: '🦽 轮椅组合「轨迹反噬」！看你的轨迹——它变成红色火焰了。' },
                { on: 'after', d: 40, hold: 180,
                  text: '6 组特定搭配会激活轮椅组合：额外数值加成 + 轨迹外观改变。它们是设计者明说的「通关答案」。' },
                { on: 'after', d: 40, gate: true, point: 'hand', hold: 180,
                  autofill: ['T07', 'E12'],
                  text: '手牌里现在有 🎯射击命中 和 ⚡闪电链——再填一次槽位，按 空格 宣读。',
                  fallback: '点手牌里的 🎯射击命中 和 ⚡闪电链，然后按空格。' },
                { on: 'event', name: 'combine2', hold: 160,
                  text: '⚡ 轮椅组合「连锁风暴」！轨迹变金色，射速 +2，子弹变成闪电链。' },
                { on: 'after', d: 40, hold: 180,
                  text: '回头看你第 2 层的塔：T12 绑的效果板决定图腾类型，E01→速射 / E12→雷电 / E13→冰霜 / E06→轨迹。' },
                { on: 'after', d: 40, hold: 160,
                  text: '按 P 可以批量宣读：战场冻结，把组合排进队列，一次全部生效。' },
                { on: 'after', d: 40, hold: 150,
                  text: '手牌上限 20 张，满了自动替换最老的一张。' },
                { on: 'clear', hold: 150,
                  text: '清空一层。' },
            ],
        },
        4: {
            title: '敌人',
            spawnInterval: 70,
            spawn: [{ type: 'basic', n: 4 }],
            drops: [{ on: 'killElite', card: 'T10' }, { on: 'killElite', card: 'E03' }],
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, hold: 150,
                  text: '子弹自动瞄准，优先级：治疗 💚 → 精英 ⭐ → BOSS 👑 → 最近的怪。' },
                { on: 'after', d: 40, spawn: [{ type: 'fast', n: 2 }],
                  point: 'monsters', pointType: 'fast', pointLabel: '💨 疾速怪', hold: 160,
                  text: '💨 疾速怪：跑得快但很脆，优先清掉它们。' },
                { on: 'after', d: 40, spawn: [{ type: 'healer', n: 2 }],
                  point: 'monsters', pointType: 'healer', pointLabel: '💚 治疗怪', hold: 160,
                  text: '💚 治疗怪：会给周围同伴回血，优先集火。' },
                { on: 'after', d: 40, spawn: [{ type: 'tank', n: 2 }],
                  point: 'monsters', pointType: 'tank', pointLabel: '🛡️ 重装怪', hold: 160,
                  text: '🛡️ 重装怪：血厚但慢，交给轨迹磨。' },
                { on: 'after', d: 40, spawn: [{ type: 'scorcher', n: 2 }],
                  point: 'monsters', pointType: 'scorcher', pointLabel: '🔥 灼烧怪', hold: 160,
                  text: '🔥 灼烧怪：走过的地方会留下火焰轨迹。第 8 层起正式登场。' },
                { on: 'event', name: 'scorcher', needsMob: true, hold: 150,
                  text: '火焰也会烧到你——把它引到远离核心的地方，别站在火里。',
                  fallback: '等灼烧怪走过，看它留下的火焰轨迹。' },
                { on: 'after', d: 40, spawn: [{ type: 'wraith', n: 1 }],
                  point: 'wraith', hold: 160,
                  text: '👻 虚灵怪：免疫轨迹伤害，只能用子弹打。第 12 层起正式登场。' },
                { on: 'after', d: 40, spawn: [{ type: 'basic', n: 1, elite: true }],
                  point: 'elite', hold: 180,
                  text: '⭐ 精英怪登场，带词缀。精英只从 6 个老词缀里抽：💚再生 🌿荆棘 💨迅捷 🦍巨人 🩸吸血 💥爆裂。',
                  fallback: '场上那只更大、带 ⭐ 的怪就是精英。' },
                { on: 'after', d: 40, hold: 180,
                  text: '另外 8 个干扰类（🟥削减区 🟦减速区 🔥火焰区 🌀突进 🌪牵引 🔒封印 👥群生 🗿敌图腾）是 👑 BOSS 专属，精英永远不会带。' },
                { on: 'after', d: 40, hold: 150,
                  text: '🧬 分裂怪死后会裂成 4 只子体，越拖越难清——先手打掉它。' },
                { on: 'clear', hold: 150,
                  text: '清空一层。' },
            ],
        },
        5: {
            title: '核心',
            spawnInterval: 60,
            ultFull: true,
            spawn: [{ type: 'basic', n: 4 }, { type: 'fast', n: 2 }],
            drops: [{ on: 'kill', n: 2, card: 'T02' }, { on: 'kill', n: 4, card: 'E07' }],
            next: 'NODEMAP',
            steps: [
                { kind: 'banner', on: 'enter', hold: 120 },
                { on: 'enter', d: 60, hold: 160,
                  text: '画面正中是你要守住的 💠 核心：核心 HP 归零，这一局就结束了。' },
                { on: 'event', name: 'hit', needsMob: true, point: 'core', hold: 180,
                  text: '怪物撞核心时，先扣 🛡️ 护盾；护盾归零后才会伤到核心 HP。',
                  fallback: '让怪物靠近中央的核心，看它撞上去会怎样。' },
                { on: 'essence', n: 1, hold: 150,
                  text: '💎 精华是货币，击杀获得。攒够了去 🧙 商人 那里买牌、买遗物。' },
                { on: 'after', d: 40, gate: true, hold: 160,
                  text: '⚡ 你的终极技已充满。按 Q 释放「轨迹风暴」——引爆全场轨迹，全体眩晕 2 秒。',
                  fallback: '按键盘的 Q 键。' },
                { on: 'event', name: 'ultimate', hold: 160,
                  text: '充能不看伤害，按固定速度回：回满要 25 秒 ÷ (1 + 楼层/50)。第 40 层起再快 ×1.5。' },
                { on: 'after', d: 40, hold: 160,
                  text: '🔒 围剿：怪物周围 8 个方向被轨迹封住 6 个以上，就会触发包围伤害 + 眩晕。' },
                { on: 'event', name: 'enclosure', needsMob: true, hold: 150,
                  text: '包围成功！锁死它们的走位——这一招在后期很关键。',
                  fallback: '用轨迹把一只怪围起来，八个方向堵住六个以上。' },
                { on: 'after', d: 40, hold: 150,
                  text: '楼层难度 = 1.16^(楼层-1)：每层强 16%。30 层后增速放缓，但永远不会停。' },
                { on: 'clear', hold: 180,
                  text: '每 5 层一次属性三选一，永久成长：攻击 +3 / 回血 30% / 移速 +5% / 轨迹伤害 +1。' },
            ],
        },
    };

    // 属性选完 → 节点地图（只在 G.mapMode 打开后才出声）
    const TUTORIAL_NODEMAP = {
        title: '你自己选路',
        wait: true,
        steps: [
            // 不写 text：show() 会用「古老的石板-<当前层> · <cfg.title>」自动拼，
            // 层号跟着教程实际停在哪一层走，不会因为石板数量变了就对不上（v9.26 去掉硬编码的「-5」）。
            { kind: 'banner', on: 'map', hold: 140 },
            { on: 'map', d: 40, hold: 150,
              text: '9 种节点：⚔️战斗 💨疾驰 🛡️攻城 🔥烈火 👻幽灵 ⭐精英 🧙商人 🏕️休整 👑BOSS。选完就进下一层。' },
        ],
    };

    // 收尾。v9.24: 新增第三条——教程现在是沙盒，播完会清空重开，
    // 这一条必须在最后一步说，否则玩家会以为教程里攒的东西被吞了。
    const TUTORIAL_OUTRO = {
        title: '从这里开始是你的冒险',
        steps: [
            { kind: 'banner', on: 'enter', hold: 150 },
            { on: 'after', d: 40, hold: 150,
              text: '还没讲到的，正式开局后会自己撞上：🎁 遗物、🧙 商人、🔮 命运抉择（每 10 层）、👑 BOSS（每 10 层）。' },
            { on: 'after', d: 40, hold: 150,
              text: '随时按 H 打开机制图鉴，全部机制都在里面。' },
            { on: 'after', d: 40, hold: 180,
              text: '🎓 教程到此为止。接下来会清空教程里获得的密文版 / 被动 / 精华 / 得分，让你重选一次职业，从第 1 层正式开始。' },
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
                '轨迹不挡路：怪物踩到会迟缓 3 秒（移速 ×0.8），离开 3 秒后恢复。',
                '虚灵怪 👻 免疫轨迹伤害，但一样吃迟缓。',
                '',
                '## 自动射击',
                '子弹自动发射，无需按键。目标优先级：治疗 → 精英 → BOSS → 最近的怪。',
                '射击节奏由两道闸门决定：40 帧的射速闸 + 射击冷却。第 25 层前冷却更长，',
                '实际约 80 帧一发；第 25 层起 40 帧一发。职业修正（弹幕风暴 / 守护者）再乘。命中 +1 分。',
                '',
                '## 核心与护盾',
                '护盾 100 点优先承伤，护盾归零后才扣核心 HP。核心归零即游戏结束。',
                '怪物撞击每 24 帧结算一次，造成 攻击力×0.35 的伤害。',
                '',
                '## 操作',
                'W A S D 移动 · Shift 冲刺 · 鼠标点手牌填槽 · 空格 宣读组合',
                'Q 终极技 · P 暂停/批量宣读 · H 开关本图鉴 · ` 调试模式（数字键 1-8 生成怪物）',
                '⛶ 全屏按钮在右侧面板底部。',
                '',
                '## 手机 / 平板（横屏）',
                '自动识别移动设备，切换成触屏布局：左下角虚拟摇杆移动，右下角两个圆钮',
                '（💨 冲刺 / ⚡ 终极技），顶部一条精简数据带（核心 / 楼层 / 精华 / 得分 / 护盾）。',
                '密文版、被动、遗物都折进左侧抽屉——点左上角 🔮 面板展开，展开时画面缩到右半屏',
                '并全局减速到 50%（子弹时间），方便从容配牌。',
                '只支持横屏：竖屏时会盖一层「请把设备横过来」。',
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
                '清空奖励是 2 + 层数/10 张，前期再 ×1.1、第 30 层起 ×0.9（第 30 层 5 张、第 100 层 11 张）。',
                '',
                '## 触发板',
                'T01 对自身 · T02 对敌群 · T03 对精英生效 · T06 怪触轨',
                'T07 射击命中 · T08 连环击杀 · T10 残血触发 · T12 闭环触发',
                '9.25：「T13 消除」已从手牌里拿掉，改成玩家的固定技能——见下面「消除」。',
                '',
                '## 效果板',
                'E01 攻击增幅 · E02 连环击 · E03 生命回复 · E06 轨迹升级',
                'E07 轨迹爆伤 · E10 怪物反噬 · E11 自速暴涨',
                'E12 闪电链 · E13 冰冻 · E14 延缓',
                'E02 / E11 与 T08 的出率比其他牌子低 30%；「移速减慢」那块板已删除。',
                'E13 / E14 只作用在「命中目标 + 周围 225px」内的怪，不再打全场。',
                '（9.23 时这个半径是 90px，9.24 放大到 2.5 倍——90px 在后期密集怪群里',
                '几乎只打得到靶心那一只。）',
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
                '9.24：普通怪 HP 与攻击各 −20%（移速不变），整体方向是「怪更多、每只更脆」。',
                '',
                '## 词缀（14 种，分两组）',
                '⭐ 精英第 5 层起出现。词缀数：5 层起 30% 带 1 个，15 层起 1-2 个，25 层起 2-3 个。',
                '9.25：精英**只从下面第一组 6 个里抽**；第二组 8 个是 👑 BOSS 专属。',
                '👑 BOSS 每 10 层必带 2 个，从全部 14 个里抽（不抽突进与群生——BOSS 本来就一直在动、也自带爪牙召唤）。',
                '',
                '— 精英词缀（6 个，给怪物自己加数值）—',
                '再生 💚 每帧回血 / 荆棘 🌿 反弹伤害 / 迅捷 💨 速度+40%',
                '巨人 🦍 双倍HP与体型 / 吸血 🩸 攻击回血 / 爆裂 💥 死亡爆炸',
                '',
                '— BOSS 专属词缀（8 个，干扰你的三个系统）—',
                '🟥 削减区：每 5 秒在 BOSS 周围 300px 内随机落一个 150px 的圈，',
                '   站在圈里你的子弹伤害 ×0.6（轨迹伤害不受影响）。圈活 6 秒。',
                '🟦 减速区：同上，135px 的圈，站在里面你的移速 ×0.65。',
                '🔥 火焰区：同上，135px 的火圈，站在里面持续掉血，也会烧你的图腾。',
                '🌀 突进：每 3 秒朝你猛冲 90px（无视地形，身后留残影）',
                '🌪 牵引：160px 内持续把你往它身上拽，越近越狠（这个是贴身的，不落圈）',
                '🔒 封印：撞核心时随机压住你一个被动 4 秒（面板上打叉显示秒数）',
                '👥 群生：每 6 秒分裂出一只 20% 血的残影，最多 3 只（残影不带词缀）',
                '🗿 敌图腾：死亡后原地留下暗红图腾，12 秒内持续打你和你的图腾',
                '9.25：圈层不再贴在 BOSS 身上，而是落在它附近、落地就固定。',
                '所以「靠近 BOSS」不再等于「必被削弱」——圈看得见、躲得开才是重点。',
                '多个同类圈重叠时取最强的那一个，不叠乘；同属性同屏最多 3 个。',
                '',
                '## 🧹 消除（9.25 起是技能，不是卡牌）',
                '按 R（手机端右下角 🧹 圆钮）触发：全场怪各吃 3 倍反噬伤害，',
                '然后拆掉场上最早的一座图腾。冷却 30 秒，不占被动槽位。',
                '它原本是触发板 T13，但「抽到才有」等于把这个量级的爆发交给运气，',
                '所以改成了带冷却的技能——什么时候按，现在是你的决策。',
                '',
                '## 轨迹判环 → 图腾 / 围剿',
                '当前存留的轨迹自己绕成闭环（面积≥800px²）就召唤 🗼 图腾，上限 10 座（HUD 右下角有计数）。',
                '图腾停在火焰里会被持续灼烧掉血——血见底就碎裂。',
                '图腾改血量制：🥉小环 ×0.6 · 2血 / 🥈中环 ×1.0 · 4血 / 🥇大环 ×1.5 · 6血，血光才碎。',
                '9.25：手牌满了的时候按 R 用「消除」拆掉最早那座，腾个位置出来（30s 冷却）。',
                '同一个闭环只出一座塔——塔碎了之后，再画一次同样的环就能重新召唤。',
                '图腾类型由 T12 绑定的效果板决定：E01 速射 / E12 雷电 / E13 冰霜 / E06 轨迹。',
                '怪物会去打「图腾与核心中离自己更近的那一个」。',
                '围剿：怪物周围 8 个方向被轨迹封住 6 个以上 → 包围伤害 + 眩晕。',
                '',
                '## 终极技',
                '按 Q 释放轨迹风暴：引爆全场轨迹，全体眩晕 2 秒。',
                '固定时间回复：回满一槽要 25 秒 ÷ (1 + 楼层/50)——第 1 层 24.5s、第 50 层 12.5s、第 100 层 8.3s。',
                '释放期间不回能。第 40 层起充能速度 ×1.5（超载 ×2 / 奥术学者 ×1.5 也是乘在速度上）。',
                '',
                '## 成长与地图',
                '每 5 层属性三选一：攻击+3 / 回血30% / 移速+5% / 轨迹伤害+1。',
                '每层结束在节点地图选下一层：⚔️战斗 💨疾驰 🛡️攻城 🔥烈火 👻幽灵',
                '⭐精英 🧙商人 🏕️休整 👑BOSS。商人用 💎精华 交易；休整回 30% 护盾 +2 张牌。',
                '',
                '## 其它系统',
                '🎁 遗物（12 种）从精英/BOSS 掉落，永久强化。',
                '🔮 命运抉择每 10 层一次，二选一，都是翻倍级改动。',
                '连杀 = 连续击杀：3 秒没有击杀、或核心挨打就断，断了可以重新冲。',
                '连杀不加伤害，但每杀一只得 连杀数×2 分（BOSS×5），也是 T08「连环击杀」的触发条件。',
                '👑 BOSS 每 10 层，血量 = 100000 × 1.7^(层数/10 - 1)（30 层后增速放缓），持续召唤爪牙。',
                '爪牙召唤节奏在 9.23 加快 5%、9.24 再加快 5%（累计 ×1.1025）：首次 100 帧，之后 max(50, 150−层数×2)。',
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
        // v9.24: 手机上「这一步的提示指向抽屉里的节点，所以我们替玩家拉开了抽屉」。
        // 收起来的时候只收自己拉开的，不动玩家手动开的。
        drawerAutoOpened: false,
        // v9.24: 教程收尾后整局已重置。只在 restartRunAfterTutorial() 里置真，
        // 且必须放在 resetGame() **之后**——reset() 会把它清回 false。
        // 用途：离线探针 / 模拟器需要这个信号，否则它们只会看到 finished 被重置，
        // 然后继续替一个已经结束的教程跑下去。
        restarted: false,
        // v9.24: 「教程播完/被跳过 → 需要重开一局」的请求位。finish() / skip() 只置位，
        // 真正的清空重开由 05-update.js 的 update() 在 tick() 之后统一执行——
        // 直接在 tick() 里调 resetGame() 是重入（tick 由 update 调用），有风险。
        pendingRestart: false,
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
            this.pendingRestart = false;
            this.drawerAutoOpened = false;
            this.restarted = false;
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
            // v9.24: 手机上这些节点（手牌 / 宣读按钮 / 槽位）都在左侧抽屉里，
            // 默认是收起来的——讲到它们时自动把抽屉拉开。抽屉顺带把时间压到 50%，
            // 正好配合教程的阅读节奏；这一步播完由 advance() 收起。
            if (typeof setDrawer === 'function' && G.mobileMode
                && (s.point === 'hand' || s.point === 'combine' || s.point === 'slot')) {
                setDrawer(true);
                // 只记「是我们自己拉开的」——玩家手动开的抽屉不该被教程关掉
                this.drawerAutoOpened = true;
            }

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
            // v9.24: 收起教程自动拉开的抽屉（手机上），把画面还回战斗
            if (typeof setDrawer === 'function' && G.mobileMode && this.drawerAutoOpened) {
                setDrawer(false);
            }
            this.drawerAutoOpened = false;
            this.text = null;
            this.hint = null;
            this.stepTimer = 0;
            this.pendTimer = 0;
        },

        finish() {
            this.active = false;
            this.finished = true;
            this.seen = true;
            this.outroPending = false;
            this.text = null;
            this.banner = null;
            this.hint = null;
            // v9.24: 教程是纯沙盒——播完不再带着教程里攒的东西继续打第 6 层。
            // 真正的重开交给 update() 统一执行（见 restartRunAfterTutorial 的注释）。
            this.pendingRestart = true;
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
        // v9.24: 跳过教程走的是和「播完」完全一样的路径——清空 + 重选职业 + 第 1 层。
        // 旧版这里会白送 3 组被动 / 40 精华 / 500 分，然后空降到第 6 层；
        // 教程改成沙盒之后那套奖励没有意义了（而且会让跳过的人凭空领先）。
        skip() {
            if (!this.active || !this.cfg) return;
            this.active = false;
            this.finished = true;
            this.seen = true;
            this.outroPending = false;
            this.text = null;
            this.banner = null;
            this.hint = null;
            this.pendingRestart = true;
        },

        replay() {
            this.seen = false;
            this.finished = false;
            resetGame();   // reset() 会把 restarted 一并清掉
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

    // ============================================================
    //  v9.24 教程结束 → 清空一切重开
    // ============================================================
    // 教程是独立沙盒：里面拿到的密文版 / 被动 / 精华 / 得分 / 层数全部作废，
    // 从第 1 层正式开局，并让玩家重选一次职业（resetGame() 末尾会调
    // initClassSelection()）。finish() 与 skip() 走的就是这一条路径。
    function restartRunAfterTutorial() {
        // 顺序不能反：initClassSelection() 会读 Tutorial.seen 决定要不要把
        // 「教程提示 + 跳过教程」按钮插回来。必须先把 seen 立起来，
        // 否则重置完又弹一次教程说明，看着像没重置。
        // （Tutorial.reset() 本身不清 seen，所以 resetGame() 走完之后它仍然是 true。）
        Tutorial.seen = true;
        Tutorial.pendingRestart = false;
        resetGame();
        // resetGame() 会调 Tutorial.reset()（那里面会把这个标记清回 false），
        // 所以必须放在它之后。
        Tutorial.restarted = true;
        setFeedback('🎓 教程结束 · 从第 1 层重新开始', '#f5c542');
    }

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

    // v9.26: canvas 与 .canvas-wrap 的 pointer-events **只从这一个入口改**。
    // 桌面端两层都要一起开，鼠标事件才落得到 canvas 上（styles.css 里两层默认都是 none）。
    // 手机端**绝不能碰 .canvas-wrap**：摇杆的 touchstart/touchmove 就挂在它身上
    // （见 09-events.js），而 styles.css 写着 `body.mobile .canvas-wrap { pointer-events: auto }`
    // ——inline 的 'none' 会把它盖掉，整块战斗界面当场收不到任何触摸。
    // 这正是「选择层数之后手机端摇杆不动」的成因：showNodeMap() 打开时把两层设成 auto，
    // selectNode() 选完关掉时又把两层设回 none，于是玩家第一次选完路之后摇杆就永久失灵
    // （9.24 挂在 canvas 上时也是同一条路径，两次都没修到根上）。
    // 手机端关掉 canvas 自身就够了：触摸会穿透到父层 .canvas-wrap，摇杆照样能收到。
    function setCanvasPointer(want) {
        canvas.style.pointerEvents = want ? 'auto' : 'none';
        if (!G.mobileMode && canvas.parentElement) {
            canvas.parentElement.style.pointerEvents = want ? 'auto' : 'none';
        }
    }

    // 教程角标 / 图鉴要能点击，所以教程期间强制放开 canvas 的鼠标事件
    function tutorialSyncPointer() {
        if (G.simMode) return;
        const want = G.mapMode || Tutorial.active || Tutorial.codexOpen || !Tutorial.seen;
        setCanvasPointer(want);
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

