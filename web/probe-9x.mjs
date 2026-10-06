// 9.17–9.18 无头验证：把构建产物塞进一个假 DOM 里跑，直接断言图腾系统与经济系统的行为。
// 用完即删（不属于仓库内容）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || '密文轨迹demo9.18.html';
const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) throw new Error('没找到 <script>');
const src = m[1];

// ---------- 假 DOM ----------
const noop = () => {};
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => ({ addColorStop: noop });
    if (p === 'getImageData') return () => ({ data: [] });
    if (p in t) return t[p];
    return noop;
  },
  set(t, p, v) { t[p] = v; return true; },
});
const makeEl = () => ({
  style: {}, dataset: {}, innerHTML: '', textContent: '', value: '', disabled: false,
  width: 780, height: 560, children: [],
  classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
  addEventListener: noop, removeEventListener: noop, appendChild: (c) => c, removeChild: noop,
  insertBefore: noop, remove: noop, setAttribute: noop, getAttribute: () => null,
  querySelector: () => null, querySelectorAll: () => [], focus: noop, blur: noop, click: noop,
  getContext: () => ctxStub,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 780, height: 560 }),
});
const documentStub = {
  getElementById: () => makeEl(), querySelector: () => null, querySelectorAll: () => [],
  createElement: () => makeEl(), addEventListener: noop, removeEventListener: noop,
  body: makeEl(), documentElement: makeEl(),
};
const windowStub = {
  location: { search: '', href: 'file:///x.html' },
  addEventListener: noop, removeEventListener: noop,
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  __SIM_MODE__: true, __SIM_TARGET__: 0, __SIM_SPEED__: 1,
  requestAnimationFrame: noop,
};

const factory = new Function(
  'window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout',
  'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'navigator', 'localStorage', 'alert',
  // typeof 守卫：同一个探针也要能跑在 9.16 上做对照
  src + '\n;return { G, resetGame, update, draw, checkTrailLoop, dist, autoShoot, addTrail, autoPilot, startFloor, simAutoSelectClass,' +
  ' nearestTurret: (typeof nearestTurret !== "undefined") ? nearestTurret : null,' +
  // v9.18 经济——带 typeof 守卫，同一个探针仍能跑在 9.17 上做对照
  ' getEssenceCap: (typeof getEssenceCap !== "undefined") ? getEssenceCap : null,' +
  ' addCombatEssence: (typeof addCombatEssence !== "undefined") ? addCombatEssence : null,' +
  ' getMerchantStock: (typeof getMerchantStock !== "undefined") ? getMerchantStock : null,' +
  ' getShopRefreshCost: (typeof getShopRefreshCost !== "undefined") ? getShopRefreshCost : null,' +
  ' refreshMerchantStock: (typeof refreshMerchantStock !== "undefined") ? refreshMerchantStock : null,' +
  ' STAT_CHOICES: (typeof STAT_CHOICES !== "undefined") ? STAT_CHOICES : null,' +
  ' advanceFloor: (typeof advanceFloor !== "undefined") ? advanceFloor : null,' +
  ' simDoBuy: (typeof simDoBuy !== "undefined") ? simDoBuy : null };'
);
const api = factory(
  windowStub, documentStub, noop, noop, noop, noop, noop, noop,
  { now: () => 0 }, { userAgent: 'node' }, { getItem: () => null, setItem: noop }, noop
);

const { G, resetGame, update, draw, checkTrailLoop, nearestTurret } = api;
const { getEssenceCap, addCombatEssence, getMerchantStock, getShopRefreshCost,
        refreshMerchantStock, STAT_CHOICES, advanceFloor } = api;
const HAS_ECON = !!(getEssenceCap && addCombatEssence && getMerchantStock);

let pass = 0, fail = 0;
const ok = (cond, label, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}  ${extra}`); }
};
const section = (s) => console.log(`\n${s}`);

// 清一个干净场地
function fresh() {
  resetGame();
  G.simMode = true;
  G.monsters = []; G.turrets = []; G.turretLoops = {}; G.turretHpBonus = 0;
  G.trails = []; G.sprintTrails = []; G.bullets = []; G.particles = []; G.floatingTexts = [];
  G.tutorialActive = false;
  // 排空模块内的 _loopCD（上一个用例出塔后会压 30 帧冷却）
  for (let i = 0; i < 40; i++) { G.frame = 1; checkTrailLoop(); }
  G.frame = 0;
}

// 把一圈点做成轨迹（点即线段中点）
function drawLoop(cx, cy, r, n) {
  G.trails = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    G.trails.push({ x1: x, y1: y, x2: x, y2: y, life: 360, layer: 1, trailType: 'basic' });
  }
}

// ---------- 1. 判环 ----------
section('1. 轨迹判环（G.trails 自交 → 出塔）');
{
  fresh();
  drawLoop(400, 280, 20, 40);          // 面积 ≈ 1257 → 小环
  G.frame = 6;
  checkTrailLoop();
  ok(G.turrets.length === 1, '闭环成立 → 生成 1 座图腾', `got ${G.turrets.length}`);
  ok(G.turrets[0] && G.turrets[0].tier === '小环', '半径 20 的环判为小环', G.turrets[0] && G.turrets[0].tier);
  ok(G.turrets[0] && G.turrets[0].hp === 5 && G.turrets[0].maxHp === 5, '小环血量 = 5', G.turrets[0] && G.turrets[0].hp);
  ok(G.turrets[0] && G.turrets[0].life === undefined, '旧字段 life 已移除');

  fresh();
  drawLoop(400, 280, 30, 40);          // 面积 ≈ 2827 → 中环
  G.frame = 6; checkTrailLoop();
  ok(G.turrets[0] && G.turrets[0].tier === '中环' && G.turrets[0].hp === 12, '中环 → 12 血',
    G.turrets[0] && `${G.turrets[0].tier}/${G.turrets[0].hp}`);

  fresh();
  drawLoop(400, 280, 60, 48);          // 面积 ≈ 11310 → 大环
  G.frame = 6; checkTrailLoop();
  ok(G.turrets[0] && G.turrets[0].tier === '大环' && G.turrets[0].hp === 20, '大环 → 20 血',
    G.turrets[0] && `${G.turrets[0].tier}/${G.turrets[0].hp}`);
}

// ---------- 2. 同一环只出一座塔 ----------
section('2. 同一闭环只出一座塔');
{
  fresh();
  drawLoop(400, 280, 60, 48);
  G.frame = 6; checkTrailLoop();
  const n1 = G.turrets.length;
  G.frame = 12; checkTrailLoop();
  G.frame = 18; checkTrailLoop();
  ok(n1 === 1 && G.turrets.length === 1, '连查 3 次仍只有 1 座塔', `got ${G.turrets.length}`);
  ok(Object.keys(G.turretLoops).length === 1, 'G.turretLoops 记了 1 个环 key');
}

// ---------- 3. 塔碎后重新武装 ----------
section('3. 塔碎后重新武装');
{
  fresh();
  drawLoop(400, 280, 60, 48);
  G.frame = 6; checkTrailLoop();
  if (!G.turrets[0]) { ok(false, '（9.17 才有图腾；旧版跳过）'); }
  else {
  const key = Object.keys(G.turretLoops)[0];
  G.turrets[0].hp = 0;
  G.frame = 7; update();
  ok(G.turrets.length === 0, '血量归零 → 图腾移除', `got ${G.turrets.length}`);
  ok(G.turretLoops[key] === undefined, '图腾死亡 → loop key 释放');
  // 出塔后有 30 帧防连发冷却，跑够帧数再查
  for (let i = 0; i < 40; i++) { G.frame++; checkTrailLoop(); }
  ok(G.turrets.length === 1, '同一个环可以再次召唤', `got ${G.turrets.length}`);
  }
}

// ---------- 4. 面积 / 节点数门槛 ----------
section('4. 门槛：面积不足 / 点太少');
{
  fresh();
  G.trails = [];
  for (let i = 0; i < 30; i++) { const x = 400 + i, y = 280 + (i % 2); G.trails.push({ x1: x, y1: y, x2: x, y2: y, life: 360, trailType: 'basic' }); }
  G.frame = 6; checkTrailLoop();
  ok(G.turrets.length === 0, '来回抖动（面积≈0）不出塔', `got ${G.turrets.length}`);

  fresh();
  G.trails = [];
  for (let i = 0; i < 5; i++) { const x = 400, y = 280; G.trails.push({ x1: x, y1: y, x2: x, y2: y, life: 360, trailType: 'basic' }); }
  G.frame = 6; checkTrailLoop();
  ok(G.turrets.length === 0, '轨迹太短（<8 节点）不出塔', `got ${G.turrets.length}`);
}

// ---------- 5. 索敌：塔更近 → 打塔 ----------
section('5. 索敌「塔与核心中更近者」');
{
  fresh();
  G.core.x = 700; G.core.y = 500;
  G.player.x = 700; G.player.y = 500; G.player.hp = 100;
  G.turrets = [{ x: 300, y: 280, r: 14, type: 'basic', emoji: 'x', color: '#fff', fireRate: 999, fireTimer: 0, damage: 0, range: 1, hp: 12, maxHp: 12, tier: '中环', loopKey: 'k', spawnAnim: 0 }];
  G.monsters = [{ x: 330, y: 280, y0: 280, r: 12, hp: 9999, maxHp: 9999, speed: 1, atk: 10, type: 'BASIC', trailDamageCooldown: 999, hitCooldown: 0, frozen: 0, stunned: 0 }];
  // 怪物朝塔移动
  const m0 = G.monsters[0];
  const d0 = Math.abs(m0.x - 300);
  G.frame = 10; update();
  ok(Math.abs(G.monsters[0].x - 300) < d0, '怪物朝更近的图腾移动', `${d0} → ${Math.abs(G.monsters[0].x - 300)}`);

  // 贴上去，跑够一帧让它出手
  G.monsters[0].x = 300 + 20; G.monsters[0].hitCooldown = 0;
  const hpBefore = G.turrets[0].hp, coreBefore = G.core.hp, shieldBefore = G.player.hp;
  G.frame = 11; update();
  ok(G.turrets[0].hp < hpBefore, '图腾掉血', `${hpBefore} → ${G.turrets[0].hp}`);
  ok(Math.abs(G.core.hp - coreBefore) < 1e-9 && Math.abs(G.player.hp - shieldBefore) < 1e-9, '核心与护盾未被扣');
  const perHit = hpBefore - G.turrets[0].hp;
  ok(perHit === 1, `atk=10 的怪每击掉 1 点血`, `got ${perHit}`);

  // 一路打到碎：小环 5 血 → 5 次命中
  G.turrets[0].hp = 5; G.turrets[0].maxHp = 5; G.turrets[0].tier = '小环'; G.turrets[0].loopKey = 'kk';
  G.turretLoops['kk'] = true;
  G.monsters[0].x = 300 + 20; G.monsters[0].y = 280; G.monsters[0].hp = 9999;
  let hits = 0;
  for (let f = 0; f < 400 && G.turrets.length > 0; f++) {
    G.monsters[0].x = 300 + 20; G.monsters[0].y = 280;   // 钉住它，别让它走开
    G.monsters[0].hitCooldown = 0;
    G.frame = 20 + f;
    update();
    hits++;
  }
  ok(G.turrets.length === 0, '小环被打 5 下就碎了', `hits=${hits} 剩 ${G.turrets.length}`);
  ok(G.turretLoops['kk'] === undefined, '碎裂后 loop key 释放');
}

// ---------- 6. 索敌：核心更近 → 打核心 ----------
section('6. 核心更近 → 打核心');
{
  fresh();
  G.core.x = 400; G.core.y = 280; G.core.hp = 100; G.core.maxHp = 100;
  G.player.x = 400; G.player.y = 280; G.player.hp = 100; G.player.maxHp = 100;
  G.turrets = [{ x: 100, y: 100, r: 14, type: 'basic', emoji: 'x', color: '#fff', fireRate: 999, fireTimer: 0, damage: 0, range: 1, hp: 12, maxHp: 12, tier: '中环', loopKey: 'k', spawnAnim: 0 }];
  G.monsters = [{ x: 430, y: 280, r: 12, hp: 9999, maxHp: 9999, speed: 1, atk: 10, type: 'BASIC', trailDamageCooldown: 999, hitCooldown: 0, frozen: 0, stunned: 0 }];
  const tBefore = G.turrets[0].hp, shBefore = G.player.hp;
  G.frame = 10; update();
  ok(G.player.hp < shBefore, '核心侧：先扣护盾', `${shBefore} → ${G.player.hp}`);
  ok(G.turrets[0].hp === tBefore, '远处的图腾毫发无伤');
}

// ---------- 7. 渲染不炸 ----------
section('7. 渲染');
{
  fresh();
  G.turrets = [{ x: 400, y: 280, r: 14, type: 'basic', emoji: 'x', color: '#88aacc', fireRate: 25, fireTimer: 0, damage: 30, range: 140, hp: 3, maxHp: 5, tier: '小环', loopKey: 'k', spawnAnim: 10 }];
  let threw = null;
  try { G.frame = 20; draw(); } catch (e) { threw = e; }
  ok(!threw, 'draw() 带血条渲染不抛异常', threw && threw.message);
}

// ---------- 8. 走真实的 addTrail 路径 ----------
section('8. 真实 addTrail（12px 长线段，中点=玩家位置）');
{
  fresh();
  const cx = 400, cy = 280, r = 60, n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const tx = -Math.sin(a), ty = Math.cos(a);   // 切线 = 前进方向
    api.addTrail(x - tx * 6, y - ty * 6, x + tx * 6, y + ty * 6);
  }
  G.frame = 12; checkTrailLoop();
  ok(G.turrets.length === 1, '真实线段串成闭环 → 出塔', `got ${G.turrets.length}`);
  ok(G.turrets[0] && G.turrets[0].tier === '大环', 'r=60 判为大环', G.turrets[0] && G.turrets[0].tier);
  ok(G.turrets[0] && Math.abs(G.turrets[0].x - cx) < 15 && Math.abs(G.turrets[0].y - cy) < 15,
    '塔落在环的质心附近', G.turrets[0] && `(${G.turrets[0].x.toFixed(0)},${G.turrets[0].y.toFixed(0)}) vs (${cx},${cy})`);
}

// ---------- 9. 旧细扁自交不挡住新环 ----------
section('9. 轨迹里残留的细扁自交不会挡住真正的大环');
{
  fresh();
  G.trails = [];
  for (let i = 0; i < 24; i++) {          // 一条来回折返的细扁自交，面积≈0
    const x = 200 + i * 3, y = 100 + (i % 2);
    G.trails.push({ x1: x, y1: y, x2: x, y2: y, life: 360, layer: 1, trailType: 'basic' });
  }
  for (let i = 0; i <= 48; i++) {         // 之后才画的大环
    const a = (i / 48) * Math.PI * 2;
    const x = 400 + Math.cos(a) * 60, y = 280 + Math.sin(a) * 60;
    G.trails.push({ x1: x, y1: y, x2: x, y2: y, life: 360, layer: 1, trailType: 'basic' });
  }
  G.frame = 6; checkTrailLoop();
  ok(G.turrets.length === 1, '仍然识别出了后面画的环', `got ${G.turrets.length}`);
  ok(G.turrets[0] && G.turrets[0].tier === '大环', '且是那个大环', G.turrets[0] && G.turrets[0].tier);
}

// ---------- 10. 真跑：autoPilot 绕圈会不会自然出塔 ----------
section('10. 连续真跑（autoPilot 开着，玩家绕核心画圈）');
{
  fresh();
  api.simAutoSelectClass();   // 走和真模拟器一样的开场：选职业 → startFloor
  let threw = null, maxTurrets = 0, spawned = 0, prevLen = 0, dmgTaken = 0, prevHpSum = 0;
  const frames = 20000;
  try {
    for (let f = 0; f < frames; f++) {
      G.frame = f + 1;      // update() 内部自己会跑 autoPilot（simMode 下）
      update();
      if (f % 300 === 0) draw();
      maxTurrets = Math.max(maxTurrets, G.turrets.length);
      if (G.turrets.length > prevLen) spawned += G.turrets.length - prevLen;
      prevLen = G.turrets.length;
      const hpSum = G.turrets.reduce((a, t) => a + t.hp, 0);
      if (hpSum < prevHpSum) dmgTaken += prevHpSum - hpSum;
      prevHpSum = hpSum;
      if (G.gameOver) break;
      if (f % 4000 === 0) console.log(`    f=${f} floor=${G.floor} 场怪=${G.monsters.length} 塔=${G.turrets.length} 选择中=${G.selectingActive}`);
    }
  } catch (e) { threw = e; }
  ok(!threw, `${frames} 帧无异常`, threw && `${threw.message}\n${threw.stack.split('\n')[1]}`);
  console.log(`    图腾峰值 ${maxTurrets} · 累计召唤 ${spawned} · 累计被打掉 ${dmgTaken} 点 · 结局 floor=${G.floor} 塔=${G.turrets.length} 怪物=${G.monsters.length} gameOver=${G.gameOver}`);
  // autoPilot 一直在躲怪，怪很少走到塔边上——这里只断言「跑得通、不泄漏」。
  // 塔被打碎→重新武装 的完整路径在 §3 与 §5 里是确定性验证的。
  ok(spawned >= 1, 'autoPilot 绕圈自然产出了塔', `累计 ${spawned}`);
  console.log(`    （本次跑动中塔累计挨了 ${dmgTaken} 点伤害——autoPilot 会绕开怪，属正常）`);
  ok(G.turrets.length >= 0 && G.turrets.every(t => t.hp > 0 && t.maxHp > 0), '所有存的塔血量都为正');
  ok(G.turrets.every(t => t.tier === '小环' || t.tier === '中环' || t.tier === '大环'), '塔的分档合法');
  ok(Object.keys(G.turretLoops).length === G.turrets.length, 'loop key 数与存活塔数一致（没有泄漏）',
    `${Object.keys(G.turretLoops).length} vs ${G.turrets.length}`);
}

// ---------- 11. 帧成本（新增的索敌/判环是主要性能风险） ----------
section('11. 帧成本');
{
  fresh();
  const mk = (n) => { const a = []; for (let i = 0; i < n; i++) a.push({ x: rand_(60, 720), y: rand_(60, 500), r: 10, hp: 1e9, maxHp: 1e9, speed: 1, atk: 10, type: 'BASIC', trailDamageCooldown: 999, hitCooldown: 999, frozen: 0, stunned: 0 }); return a; };
  const rand_ = (a, b) => a + Math.random() * (b - a);
  const timeOnce = (label, setup, iters = 2000) => {
    setup();
    // 核心血量拉满：否则怪冲上来把核心打爆，后续帧的 update() 直接 return，
    // 测出来的会是假的 0.00ms
    G.core.maxHp = 1e9; G.core.hp = 1e9;
    G.player.maxHp = 1e9; G.player.hp = 1e9;
    G.selectingActive = false; G.paused = false; G.gameOver = false; G.vacuumActive = false;
    G.monstersToSpawn = 0;
    G.frame = 100;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < iters; i++) { G.frame++; update(); }
    return Number(process.hrtime.bigint() - t0) / 1e6 / iters;
  };
  // 取多轮最小值——单轮的抖动能到 ±0.15ms，比索敌本身的成本还大
  const time = (label, setup, runs = 5) => {
    let best = Infinity;
    for (let i = 0; i < runs; i++) best = Math.min(best, timeOnce(label, setup));
    console.log(`    ${label.padEnd(24)} ${best.toFixed(3)} ms/frame  (${runs} 轮取最小)`);
    return best;
  };
  // 先确认 update() 真的在跑（否则测出来是假的 0ms）
  fresh();
  G.monsters = mk(50); G.turrets = [];
  const x0 = G.monsters[0].x;
  G.frame = 1000; update();
  ok(G.monsters[0].x !== x0, '计时前先确认 update() 真的在推进怪物');
  // 塔也要真的开火
  fresh();
  G.monsters = mk(50);
  G.turrets = (() => { const a = []; for (let i = 0; i < 30; i++) a.push({ x: 390, y: 280, r: 14, type: 'basic', emoji: 'x', color: '#88aacc', fireRate: 1, fireTimer: 0, damage: 1, range: 100000, hp: 1e9, maxHp: 1e9, tier: '中环', loopKey: 'k' + i, spawnAnim: 0 }); return a; })();
  const hp0 = G.monsters[0].hp;
  G.frame = 1000; update();
  ok(G.monsters[0].hp < hp0 || G.monsters.some(m => m.hp < hp0), '计时前先确认图腾真的在开火');

  const m50 = time('50 怪（无塔）', () => { G.monsters = mk(50); G.turrets = []; G.turretLoops = {}; });
  const mkT = (n) => { const a = []; for (let i = 0; i < n; i++) a.push({ x: rand_(80, 700), y: rand_(80, 480), r: 14, type: 'basic', emoji: 'x', color: '#88aacc', fireRate: 25, fireTimer: 0, damage: 30, range: 140, hp: 1e9, maxHp: 1e9, tier: '中环', loopKey: 'k' + i, spawnAnim: 0 }); return a; };
  const mt = time('50 怪 + 30 塔', () => { G.monsters = mk(50); G.turrets = mkT(30); });
  console.log(`    → 30 座塔的索敌开销 ${(mt - m50).toFixed(2)} ms/frame（16.67ms 预算的 ${(((mt - m50) / 16.67) * 100).toFixed(1)}%）`);
  ok(mt < 16.67, '50 怪 + 30 塔仍在 60fps 预算内', `${mt.toFixed(2)} ms`);
}

// ---------- 12. v9.18 经济 ----------
section('12. 每层精华硬上限 + 商店经济');
if (!HAS_ECON) {
  console.log('  （跳过：这是 9.17 及更早的产物，没有经济系统）');
} else {
  // 12a 上限随层数分档
  fresh();
  G.floor = 1;  const capEarly = getEssenceCap();
  G.floor = 29; const cap29 = getEssenceCap();
  G.floor = 30; const cap30 = getEssenceCap();
  G.floor = 99; const capLate = getEssenceCap();
  ok(capEarly === 8, '1 层上限 = 8', `got ${capEarly}`);
  ok(cap29 === 8, '29 层上限仍是 8', `got ${cap29}`);
  ok(cap30 === 16, '30 层（DIFF_KNEE）放宽到 16', `got ${cap30}`);
  ok(capLate === 16, '99 层上限 = 16', `got ${capLate}`);

  // 12b 单层内加满就不再给
  fresh();
  G.floor = 1; G.essenceThisFloor = 0; G.essence = 0;
  const g1 = addCombatEssence(100);
  const g2 = addCombatEssence(100);
  ok(g1 === 8, '一次请求 100，实际到手 8', `got ${g1}`);
  ok(g2 === 0, '触顶后再要就是 0', `got ${g2}`);
  ok(G.essence === 8, '精华只加了 8', `got ${G.essence}`);
  ok(G.essenceThisFloor === 8, 'essenceThisFloor 记到 8', `got ${G.essenceThisFloor}`);

  // 12c 分档切点：本层已拿 8，升到 30 层后还能再拿 8
  fresh();
  G.floor = 29; G.essenceThisFloor = 0; G.essence = 0;
  addCombatEssence(100);              // 拿满 8
  G.floor = 30;
  const g3 = addCombatEssence(100);
  ok(g3 === 8, '30 层起上限抬到 16，已拿的 8 之外还能再拿 8', `got ${g3}`);

  // 12d 跨层重置：startFloor() 要清零
  fresh();
  G.essenceThisFloor = 7;
  api.startFloor();
  ok(G.essenceThisFloor === 0, 'startFloor() 把本层计数清零', `got ${G.essenceThisFloor}`);

  // 12e 真正打一层：BOSS 掉 10+层 也不该突破上限
  fresh();
  G.floor = 20;                       // BOSS 掉落 = 30，远超上限
  G.essenceThisFloor = 0; G.essence = 0;
  api.startFloor();
  for (let f = 0; f < 4000; f++) { G.frame = f; update(); if (G.gameOver) break; }
  ok(G.essence <= 8, `真跑一层（第20层，BOSS 在场）战斗精华没超过 8`, `got ${G.essence}`);

  // 12f 商品表：没有精华提取，构成符合设计
  fresh();
  G.floor = 8;
  const stock = getMerchantStock();
  ok(!stock.some(s => s.type === 'essence'), '商品表里没有 essence（精华提取已删）');
  const nCard = stock.filter(s => s.type === 'card').length;
  const nBuff = stock.filter(s => s.type === 'buff').length;
  const nRelic = stock.filter(s => s.type === 'relic').length;
  const nHeal = stock.filter(s => s.type === 'heal').length;
  ok(nCard === 2, '密文版 2 张（4→2）', `got ${nCard}`);
  ok(nBuff === 2, '增益 2 项', `got ${nBuff}`);
  ok(nRelic >= 1, '遗物至少 1 件', `got ${nRelic}`);
  ok(nHeal === 1, '治疗 1 项', `got ${nHeal}`);
  ok(stock.every(s => Number.isFinite(s.cost) && s.cost > 0), '所有商品价格都是有限正数（没有 NaN）');
  ok(stock.filter(s => s.type === 'buff').every(s => s.buff && typeof s.buff.apply === 'function'),
     '增益项都带可用的 apply()');

  // 12g 刷新花费公式
  fresh();
  G.floor = 5; G.shopRefreshCount = 1;
  const c1 = getShopRefreshCost();
  G.shopRefreshCount = 2;
  const c2 = getShopRefreshCost();
  G.floor = 9; G.shopRefreshCount = 3;
  const c3 = getShopRefreshCost();
  ok(c1 === 2 * 5 * 1, '5 层首次刷新 = 2×5×1 = 10', `got ${c1}`);
  ok(c2 === 2 * 5 * 2, '5 层第二次 = 2×5×2 = 20', `got ${c2}`);
  ok(c3 === 2 * 9 * 3, '9 层第三次 = 2×9×3 = 54', `got ${c3}`);

  // 12h 真的刷新一次：扣对钱、次数 +1、商品重抽
  fresh();
  G.floor = 6; G.shopRefreshCount = 1; G.essence = 100;
  G.merchantStock = getMerchantStock();
  G.shopSoldOut = [0, 1];
  const before = G.essence;
  refreshMerchantStock();
  ok(G.essence === before - 12, '刷新扣了 2×6×1 = 12', `got ${before - G.essence}`);
  ok(G.shopRefreshCount === 2, '刷新次数 +1', `got ${G.shopRefreshCount}`);
  ok(G.shopSoldOut.length === 0, '刷新清空了已售罄列表');
  ok(G.merchantStock.length >= 5, '刷新后商品重新生成', `got ${G.merchantStock.length}`);

  // 12i 钱不够时不刷
  fresh();
  G.floor = 6; G.shopRefreshCount = 1; G.essence = 3;
  G.merchantStock = getMerchantStock();
  const stockBefore = G.merchantStock.slice();
  refreshMerchantStock();
  ok(G.essence === 3, '精华不足时不扣钱', `got ${G.essence}`);
  ok(G.shopRefreshCount === 1, '精华不足时不加刷新次数', `got ${G.shopRefreshCount}`);
  ok(G.merchantStock.length === stockBefore.length, '精华不足时不重抽商品');

  // 12j 每项增益都配了 shopCost（漏一个商店就会出 NaN）
  ok(STAT_CHOICES.every(c => Number.isFinite(c.shopCost) && c.shopCost > 0),
     'STAT_CHOICES 每项都有 shopCost');
  ok(STAT_CHOICES.some(c => c.id === 'turretHp'), '增益里含「图腾加固」');
  ok(STAT_CHOICES.some(c => c.id === 'trailWidth'), '增益里含「轨迹拓宽」');

  // 12k 买图腾加固真的加厚了场上的塔
  fresh();
  const tk = { x: 100, y: 100, r: 14, type: 'basic', emoji: 'x', color: '#88aacc', fireRate: 25, fireTimer: 0,
               damage: 30, range: 140, hp: 8, maxHp: 12, tier: '中环', loopKey: 'k', spawnAnim: 0 };
  G.turrets = [tk];
  STAT_CHOICES.find(c => c.id === 'turretHp').apply();
  ok(G.turretHpBonus === 3, 'turretHpBonus +3', `got ${G.turretHpBonus}`);
  ok(tk.maxHp === 15 && tk.hp === 11, '场上的塔也一起加厚（12→15，8→11）', `got ${tk.hp}/${tk.maxHp}`);

  // 12l 长跑不变量：任何一帧的本层战斗精华都不许超过当层上限
  fresh();
  api.simAutoSelectClass();
  let worst = 0, worstFloor = 0;
  for (let f = 0; f < 12000; f++) {
    update();
    const cap = getEssenceCap();
    if (G.essenceThisFloor > cap) { worst = G.essenceThisFloor; worstFloor = G.floor; break; }
    if (G.gameOver) break;
  }
  ok(worst === 0, `12000 帧里本层精华从未突破上限`, worst ? `第 ${worstFloor} 层拿到 ${worst}` : '');
  console.log(`    终局：floor=${G.floor} 精华=${G.essence} 本层=${G.essenceThisFloor}/${getEssenceCap()} 存活塔=${G.turrets.length}`);
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
