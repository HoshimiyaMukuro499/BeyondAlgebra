// ============================================================
//  00-flags —— 4.0 的功能开关（「减法」的机制本体）
// ============================================================
// 4.0: 9.x 一路加到 9.32，第一次玩的人能记住的系统大概只有三个。这一版**不新增任何玩法**，
// 而是给每个「不在核心链路（移动 → 轨迹 → 闭环 → 图腾 → 组合）上」的系统挂一个开关，
// 并且**默认全部关闭**。开关是加法——想玩哪个自己打开。
//
// 唯一的读取点是 `G.flags.<名字>`。这一条是刻意的：只有一个落点，就能一处查清
// 「关掉某系统之后，代码里还剩哪些地方在碰它」。
//
// 读数优先级：URL 参数 > localStorage > 默认值。
//   ?flags=all          全开（等价性开关：全开时 4.0 必须与 9.32 行为一致）
//   ?flags=none         全关
//   ?flags=relics,fate  只开这两个，其余全关（**穷举式**，故意不再叠加上一步的结果）
// URL 是穷举的，是为了让试玩和探针都能一句话把配置钉死，不受上次点的开关影响。
//
// 边界见 web/scope-check.mjs。本模块只依赖 Core（要往 `G.flags` 上挂东西）。
const Flags = (function () {
    const { G } = Core;

    // key        读取用的名字（G.flags.key）
    // label      面板上显示的名字
    // desc       一句话：关掉之后会少什么
    // defaultOn  默认值。只有教程与调试台默认开——教程是第一次游玩的门面，
    //            关掉省不下认知负担却要动五个模块；调试台是开发工具。
    //
    // 顺序 = 面板上的顺序，按「关掉的收益 ÷ 改动成本」排。
    const FEATURE_FLAGS = [
        { key: 'relics', label: '遗物', desc: '不掉遗物，HUD 那一栏空着', defaultOn: false },
        { key: 'fate', label: '命运抉择', desc: '每 10 层不再三选一，直接进下一层', defaultOn: false },
        { key: 'affixElite', label: '精英词缀', desc: '精英不带词条（连带圈层/封印/敌图腾）', defaultOn: false },
        { key: 'affixBoss', label: 'BOSS 专属词缀', desc: 'BOSS 不带词条', defaultOn: false },
        { key: 'circleZones', label: '圈层', desc: '不掉削减圈/减速圈/火焰圈', defaultOn: false },
        { key: 'chair', label: '轮椅组合', desc: '少一组保底组合与轨迹皮肤', defaultOn: false },
        { key: 'mapNodes', label: '地图节点', desc: '不出路线图；商人与休整一并消失', defaultOn: false },
        { key: 'statChoice', label: '属性三选一', desc: '每 5 层没有属性提升', defaultOn: false },
        { key: 'ultimate', label: '终极技', desc: '没有 Q、没有充能条', defaultOn: false },
        { key: 'eliminate', label: '消除', desc: '没有 R、没有冷却环', defaultOn: false },
        { key: 'rareCards', label: '稀有卡', desc: '抽不到 E15/E16/E17（稀有触发板·唤魔者也一起没了；商人不卖）', defaultOn: false },
        { key: 'evoker', label: '唤魔者', desc: '抽不到 T14，抽到也宣读无效', defaultOn: false },
        { key: 'autoUpgrade', label: '槽满自动宣读', desc: '手牌只攒不花，得自己动手合', defaultOn: false },
        { key: 'enclosure', label: '围剿', desc: '没有围剿奖励', defaultOn: false },
        { key: 'hazards', label: '环境危险区', desc: '低层不再出危险区', defaultOn: false },
        { key: 'terrain', label: '地形障碍', desc: '不出地形障碍', defaultOn: false },
        { key: 'sprintTrails', label: '冲刺轨迹', desc: 'Shift 不再触发冲刺', defaultOn: false },
        { key: 'shooter', label: '射击怪', desc: '该类型不进刷怪池', defaultOn: false },
        { key: 'classes', label: '职业选择', desc: '固定用轨迹编织者直接开局（下一局生效）', defaultOn: false },
        { key: 'softCap', label: '软上限', desc: '成长上限恒等于基准值', defaultOn: false },
        { key: 'tutorial', label: '新手教程', desc: '跳过开场教学（改动面大，默认开）', defaultOn: true },
        { key: 'debug', label: '调试台', desc: '` 键的生成怪物面板（默认开）', defaultOn: true },
    ];

    const STORAGE_KEY = 'miwen4.flags';

    /** 按 URL > localStorage > 默认值的优先级算出一份开关表。 */
    function readFlags() {
        const out = {};
        for (const f of FEATURE_FLAGS) out[f.key] = !!f.defaultOn;

        // localStorage：坏数据（手改过、上个版本的格式）当作没有，不要把游戏卡死
        let stored = null;
        try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { stored = null; }
        if (stored) {
            try {
                const obj = JSON.parse(stored);
                for (const f of FEATURE_FLAGS) {
                    if (typeof obj[f.key] === 'boolean') out[f.key] = obj[f.key];
                }
            } catch (e) { /* 忽略 */ }
        }

        // URL：穷举式覆盖（见文件头说明）
        let q = '';
        try { q = new URLSearchParams(window.location.search).get('flags') || ''; } catch (e) { q = ''; }
        if (q) {
            if (q === 'all') {
                for (const f of FEATURE_FLAGS) out[f.key] = true;
            } else if (q === 'none') {
                for (const f of FEATURE_FLAGS) out[f.key] = false;
            } else {
                const want = new Set(q.split(',').map((s) => s.trim()).filter(Boolean));
                const known = new Set(FEATURE_FLAGS.map((f) => f.key));
                for (const f of FEATURE_FLAGS) out[f.key] = want.has(f.key);
                // 拼错名字要能当场发现，否则「我明明开了」会变成一场空
                for (const w of want) if (!known.has(w)) console.warn(`[4.0] ?flags= 里有未知开关：${w}`);
            }
        }
        return out;
    }

    /** 把当前开关写回 localStorage（只有面板点击会调它，URL 参数不写）。 */
    function persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(G.flags)); } catch (e) { /* 无痕模式等 */ }
    }

    /** 翻一个开关。面板点击的落点。 */
    function setFlag(key, on) {
        if (!(key in G.flags)) return;
        G.flags[key] = !!on;
        persist();
        syncSkillButtons();
    }

    /** 全开 / 全关。面板上的两个按钮，也是试玩对照的快捷方式。 */
    function setAll(on) {
        for (const f of FEATURE_FLAGS) G.flags[f.key] = !!on;
        persist();
        syncSkillButtons();
    }

    // ---------- 关掉开关之后 DOM 上的残留 ----------
    // 大部分「关掉」都落在每帧重绘或每次触发时才读开关的地方（canvas、掉落、刷怪），
    // 开关一翻下一次就自然消失。手机端的技能按钮是例外：它们是**常驻 DOM**，
    // 按下去什么也不发生才是最难解释的一种残留。所以在每次改开关之后补一次同步。
    function syncSkillButtons() {
        const map = { mobileUltBtn: 'ultimate', mobileElimBtn: 'eliminate' };
        for (const id of Object.keys(map)) {
            const el = typeof document !== 'undefined' && document.getElementById
                ? document.getElementById(id) : null;
            if (el) el.style.display = G.flags[map[id]] ? '' : 'none';
        }
    }

    // ---------- 开关面板（按 F） ----------
    // 面板本体放在这里而不是 07-ui.js：它只依赖开关表，和别的 UI 没有往来，
    // 而 `F` 键的处理在 09-events.js（那里只调 Flags.togglePanel()）。
    let flagPanelEl = null;

    function buildPanel() {
        flagPanelEl = document.getElementById('flagOverlay');
        if (!flagPanelEl) return null;
        const row = document.getElementById('flagRow');
        if (!row || row.dataset.built) return flagPanelEl;

        for (const f of FEATURE_FLAGS) {
            const item = document.createElement('label');
            item.className = 'flag-item';
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = !!G.flags[f.key];
            box.addEventListener('change', () => setFlag(f.key, box.checked));
            item.dataset.key = f.key;

            const name = document.createElement('span');
            name.className = 'flag-name';
            name.textContent = f.label;

            const desc = document.createElement('span');
            desc.className = 'flag-desc';
            desc.textContent = f.desc;

            const text = document.createElement('span');
            text.className = 'flag-text';
            text.appendChild(name);
            text.appendChild(desc);

            item.appendChild(box);
            item.appendChild(text);
            row.appendChild(item);
        }

        const on = document.getElementById('flagAllOn');
        const off = document.getElementById('flagAllOff');
        const close = document.getElementById('flagClose');
        if (on) on.addEventListener('click', () => { setAll(true); syncPanel(); });
        if (off) off.addEventListener('click', () => { setAll(false); syncPanel(); });
        if (close) close.addEventListener('click', () => closePanel());

        row.dataset.built = '1';
        return flagPanelEl;
    }

    /** 把 G.flags 的当前值刷回勾选框（全开/全关之后要调）。 */
    function syncPanel() {
        if (!flagPanelEl) return;
        for (const box of flagPanelEl.querySelectorAll('.flag-item')) {
            const input = box.querySelector('input');
            if (input) input.checked = !!G.flags[box.dataset.key];
        }
    }

    function openPanel() {
        const el = buildPanel();
        if (!el) return;
        syncPanel();
        el.classList.add('active');
        G.flagPanelOpen = true;
    }

    function closePanel() {
        if (flagPanelEl) flagPanelEl.classList.remove('active');
        G.flagPanelOpen = false;
    }

    function togglePanel() {
        if (G.flagPanelOpen) closePanel(); else openPanel();
    }

    // 挂到 G 上。G 是 Core 里的 const 对象，只能原地改字段（不能重新绑定）。
    G.flags = readFlags();
    // 开局先对齐一次：用 `?flags=none` 打开时，那颗「按了没反应」的按钮根本不该出现。
    // 此时 DOM 已经解析完（模板里正文槽位排在脚本槽位之前）。
    // （别在源码注释里写出那两个字面量：构建脚本最后会扫一遍「模板还有没有没替换的槽位」，
    //   注释里的同名占位符会被当成漏填，构建直接失败。）
    syncSkillButtons();

    return {
        FEATURE_FLAGS, readFlags, setFlag, setAll, togglePanel, openPanel, closePanel,
    };
})();
