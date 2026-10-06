// 9.17–9.18 无头验证：把构建产物塞进一个假 DOM 里跑，直接断言图腾系统与经济系统的行为。
// 用完即删（不属于仓库内容）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || '密文轨迹demo9.23.html';
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
  // showNodeMap() 会写 canvas.parentElement.style.pointerEvents，真 DOM 里它一定存在
  parentElement: { style: {}, classList: { add: noop, remove: noop } },
  classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
  addEventListener: noop, removeEventListener: noop, appendChild: (c) => c, removeChild: noop,
  insertBefore: noop, remove: noop, setAttribute: noop, getAttribute: () => null,
  // v9.22: 以前这里返回 null，教程一推进到「属性三选一」就崩——
  // showStatChoice() 会写 overlay.querySelector('h3').textContent。
  // 返回一个假元素比返回 null 更接近真 DOM（真 DOM 里这些节点是存在的）。
  querySelector: () => makeEl(), querySelectorAll: () => [], focus: noop, blur: noop, click: noop,
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
  ' simDoBuy: (typeof simDoBuy !== "undefined") ? simDoBuy : null,' +
  // v9.19
  ' EFFECTS: (typeof EFFECTS !== "undefined") ? EFFECTS : null,' +
  ' addPassive: (typeof addPassive !== "undefined") ? addPassive : null,' +
  ' triggerPassive: (typeof triggerPassive !== "undefined") ? triggerPassive : null,' +
  ' spawnMonster: (typeof spawnMonster !== "undefined") ? spawnMonster : null,' +
  // v9.21 图腾上限 + T13「消除」
  ' TRIGGERS: (typeof TRIGGERS !== "undefined") ? TRIGGERS : null,' +
  ' randomTrigger: (typeof randomTrigger !== "undefined") ? randomTrigger : null,' +
  ' doCombine: (typeof doCombine !== "undefined") ? doCombine : null,' +
  ' triggerEliminate: (typeof triggerEliminate !== "undefined") ? triggerEliminate : null,' +
  ' TURRET_SLOT_CHOICE: (typeof TURRET_SLOT_CHOICE !== "undefined") ? TURRET_SLOT_CHOICE : null,' +
  // v9.22
  ' combineCards: (typeof combineCards !== "undefined") ? combineCards : null,' +
  ' activateUltimate: (typeof activateUltimate !== "undefined") ? activateUltimate : null,' +
  ' Tutorial: (typeof Tutorial !== "undefined") ? Tutorial : null,' +
  ' TUTORIAL_FLOORS: (typeof TUTORIAL_FLOORS !== "undefined") ? TUTORIAL_FLOORS : null,' +
  ' CODEX_PAGES: (typeof CODEX_PAGES !== "undefined") ? CODEX_PAGES : null,' +
  ' TRAIL_SLOW_FRAMES: (typeof TRAIL_SLOW_FRAMES !== "undefined") ? TRAIL_SLOW_FRAMES : null,' +
  ' getUltimateChargeFrames: (typeof getUltimateChargeFrames !== "undefined") ? getUltimateChargeFrames : null,' +
  ' ULT_BASE_FRAMES: (typeof ULT_BASE_FRAMES !== "undefined") ? ULT_BASE_FRAMES : null,' +
  ' drawTutorial: (typeof drawTutorial !== "undefined") ? drawTutorial : null,' +
  ' fillSlot: (typeof fillSlot !== "undefined") ? fillSlot : null,' +
  ' selectNode: (typeof selectNode !== "undefined") ? selectNode : null,' +
  ' selectStat: (typeof selectStat !== "undefined") ? selectStat : null,' +
  // v9.23
  ' randomEffect: (typeof randomEffect !== "undefined") ? randomEffect : null,' +
  ' effectAoeTargets: (typeof effectAoeTargets !== "undefined") ? effectAoeTargets : null,' +
  ' nearestMonsterTo: (typeof nearestMonsterTo !== "undefined") ? nearestMonsterTo : null,' +
  ' EFFECT_AOE_RADIUS: (typeof EFFECT_AOE_RADIUS !== "undefined") ? EFFECT_AOE_RADIUS : null,' +
  ' getFloorClearCards: (typeof getFloorClearCards !== "undefined") ? getFloorClearCards : null,' +
  ' getBossHp: (typeof getBossHp !== "undefined") ? getBossHp : null,' +
  ' bossSummonInterval: (typeof bossSummonInterval !== "undefined") ? bossSummonInterval : null,' +
  ' spawnBoss: (typeof spawnBoss !== "undefined") ? spawnBoss : null,' +
  ' FIRE_TURRET_DMG_PER_FRAME: (typeof FIRE_TURRET_DMG_PER_FRAME !== "undefined") ? FIRE_TURRET_DMG_PER_FRAME : null,' +
  // 已删符号的存在性探针——拿 KILL_BURSTS/MAP_NODES 这类名字去断言「确实删干净了」
  ' deletedSymbols: { KILL_BURSTS: typeof KILL_BURSTS !== "undefined",' +
  '  MAP_NODES: typeof MAP_NODES !== "undefined",' +
  '  startVacuum: typeof startVacuum !== "undefined",' +
  '  skipVacuum: typeof skipVacuum !== "undefined",' +
  '  updateVacuumUI: typeof updateVacuumUI !== "undefined",' +
  '  showCardSelection: typeof showCardSelection !== "undefined",' +
  '  selectCard: typeof selectCard !== "undefined" } };'
);
const api = factory(
  windowStub, documentStub, noop, noop, noop, noop, noop, noop,
  { now: () => 0 }, { userAgent: 'node' }, { getItem: () => null, setItem: noop }, noop
);

const { G, resetGame, update, draw, checkTrailLoop, nearestTurret } = api;
const { getEssenceCap, addCombatEssence, getMerchantStock, getShopRefreshCost,
        refreshMerchantStock, STAT_CHOICES, advanceFloor } = api;
const HAS_ECON = !!(getEssenceCap && addCombatEssence && getMerchantStock);
const { EFFECTS, addPassive } = api;
const HAS_FEEL = !!(EFFECTS && EFFECTS.some(e => e.id === 'E14'));
const { TRIGGERS: TRIG_, randomTrigger, doCombine, triggerEliminate, TURRET_SLOT_CHOICE } = api;
const HAS_CAP = !!(TRIG_ && TRIG_.some(t => t.id === 'T13') && randomTrigger && doCombine);
const { randomEffect, effectAoeTargets, nearestMonsterTo, EFFECT_AOE_RADIUS,
        getFloorClearCards, getBossHp, bossSummonInterval, spawnBoss, FIRE_TURRET_DMG_PER_FRAME } = api;
const HAS_V923 = !!(randomEffect && effectAoeTargets && getFloorClearCards && getBossHp && FIRE_TURRET_DMG_PER_FRAME);

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

// 造一只"站着不动也打不死"的测试怪。字段与 spawnMonster 保持一致，
// 少一个字段（例如 slowTimer）更新循环就会写出 NaN 位置，断言全被打乱。
function mkM(x, y) {
  return { x, y, r: 12, hp: 1e6, maxHp: 1e6, speed: 1, atk: 0, type: 'basic',
           isBoss: false, isElite: false, isChild: false, frozen: 0, stunned: 0, slowTimer: 0,
           trailDamageCooldown: 9999, hitCooldown: 0, vx_prev: 0, vy_prev: 0, _fireCounter: 0 };
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
  ok(G.turrets[0] && G.turrets[0].hp === 2 && G.turrets[0].maxHp === 2, '小环血量 = 2（原 5 的 30%）', G.turrets[0] && G.turrets[0].hp);
  ok(G.turrets[0] && G.turrets[0].life === undefined, '旧字段 life 已移除');

  fresh();
  drawLoop(400, 280, 30, 40);          // 面积 ≈ 2827 → 中环
  G.frame = 6; checkTrailLoop();
  ok(G.turrets[0] && G.turrets[0].tier === '中环' && G.turrets[0].hp === 4, '中环 → 4 血（原 12 的 30%）',
    G.turrets[0] && `${G.turrets[0].tier}/${G.turrets[0].hp}`);

  fresh();
  drawLoop(400, 280, 60, 48);          // 面积 ≈ 11310 → 大环
  G.frame = 6; checkTrailLoop();
  ok(G.turrets[0] && G.turrets[0].tier === '大环' && G.turrets[0].hp === 6, '大环 → 6 血（原 20 的 30%）',
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

  // 一路打到碎：小环 2 血 → 2 次命中
  G.turrets[0].hp = 2; G.turrets[0].maxHp = 2; G.turrets[0].tier = '小环'; G.turrets[0].loopKey = 'kk';
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
  ok(G.turrets.length === 0, '小环被打 2 下就碎了', `hits=${hits} 剩 ${G.turrets.length}`);
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
  ok(G.turretHpBonus === 1, 'turretHpBonus +1（v9.20 随基础血量缩到 30%）', `got ${G.turretHpBonus}`);
  ok(tk.maxHp === 13 && tk.hp === 9, '场上的塔也一起加厚（12→13，8→9）', `got ${tk.hp}/${tk.maxHp}`);

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

// ---------- 13. v9.19 子弹 / 延缓 / 伤害流转 ----------
section('13. 子弹手感 + E14「延缓」+ 伤害流转动画');
if (!HAS_FEEL) {
  console.log('  （跳过：这是 9.18 及更早的产物，没有 E14）');
} else {
  const mkM = (x, y) => ({ x, y, r: 12, hp: 1e6, maxHp: 1e6, speed: 1, atk: 0, type: 'basic',
    isBoss: false, isElite: false, isChild: false, frozen: 0, stunned: 0, slowTimer: 0,
    trailDamageCooldown: 9999, hitCooldown: 0, vx_prev: 0, vy_prev: 0, _fireCounter: 0 });

  // 13a 射速：两道闸门都 ×4
  fresh();
  ok(G.fireRate === 40, 'resetGame 后 G.fireRate = 40（原 10）', `got ${G.fireRate}`);
  G.floor = 1; G.player.atk = 10; G.buffs.atkUp = 0;
  api.startFloor();
  const mm = mkM(G.player.x + 30, G.player.y); G.monsters = [mm];
  G.player.shootCooldown = 0;
  api.autoShoot();
  ok(Math.abs(G.player.shootCooldown - 47.68) < 1e-6,
     '1 层冷却 = max(24, 48-1×0.32) = 47.68', `got ${G.player.shootCooldown}`);

  // 13b 伤害 +15%
  fresh();
  G.floor = 1; G.player.atk = 10;
  G.buffs.atkUp = 0; G.buffs.multUp = 0;
  G.fateBuffs.atkMul = 1; G.fateBuffs.bulletDmgMul = 1; G.extraBullets = 0;
  G.monsters = [mkM(G.player.x + 30, G.player.y)];
  G.player.shootCooldown = 0;
  api.autoShoot();
  const bd = G.bullets[0].damage;
  ok(Math.abs(bd - 11.5) < 1e-6, '单发伤害 = 10 × 1.15 = 11.5', `got ${bd}`);

  // 13c 中弹停顿 18 帧，且停顿期间不移动
  fresh();
  const st = mkM(300, 300);
  G.monsters = [st];
  G.bullets = [{ x: 290, y: 300, vx: 10, vy: 0, r: 4, damage: 1, life: 60, hit: false }];
  // 把子弹直接停在怪物身上触发命中
  G.bullets[0].x = st.x; G.bullets[0].y = st.y;
  update();
  ok(st.stunned >= 17, '命中后 stunned ≈ 18 帧', `got ${st.stunned}`);
  const posBefore = st.x + ',' + st.y;
  G.monstersToSpawn = 0;
  for (let i = 0; i < 10; i++) { G.bullets = []; update(); }
  ok(st.x + ',' + st.y === posBefore, '停顿期间怪物一步没动', `moved to ${st.x},${st.y}`);

  // 13d E14「延缓」：挂上 slowTimer，移速 ×0.8
  fresh();
  ok(EFFECTS.some(e => e.id === 'E14' && e.label === '延缓'), 'EFFECTS 里有 E14「延缓」');
  G.terrain = []; G.trails = []; G.sprintTrails = [];
  const slowA = mkM(200, 200), slowB = mkM(200, 400);
  G.monsters = [slowA, slowB];
  addPassive('T06', 'E14');   // isInitial=true 只是登记，不触发（与 E13 一致）
  ok(slowA.slowTimer === 0, 'addPassive 只登记、不立即触发（isInitial 语义与 E13 一致）', `got ${slowA.slowTimer}`);
  api.triggerPassive('T06', slowA);  // T06 是高频触发 → 30 帧；A 是这次触发的靶心
  if (HAS_V923) {
    ok(slowA.slowTimer >= 29, '靶心挂上 slowTimer（T06 高频 → 30 帧）', `got ${slowA.slowTimer}`);
    ok(slowB.slowTimer === 0, '200px 外的怪不受影响（v9.23 范围收到 90px）', `got ${slowB.slowTimer}`);
  } else {
    ok(slowA.slowTimer >= 29 && slowB.slowTimer >= 29,
       'triggerPassive 后全场怪物挂上 slowTimer（T06 高频 → 30 帧）', `got ${slowA.slowTimer}`);
  }
  // 对照：A 带延缓，B 手动清掉，跑同样帧数比位移。
  // 必须先把 selectingActive 清掉——update() 在 !simMode 且 selectingActive 时直接 return，
  // 而 resetGame() 结尾的 initClassSelection() 会把它置真。
  api.simAutoSelectClass();
  G.simMode = false; G.gameOver = false; G.paused = false;
  // resetGame() 不清 G.keys，前一个用例 autoPilot 按下的键会留在这里——不清掉玩家会自己走
  G.keys = { w: false, a: false, s: false, d: false, shift: false };
  const a0 = { x: slowA.x, y: slowA.y }, b0 = { x: slowB.x, y: slowB.y };
  G.monstersToSpawn = 0;
  for (let i = 0; i < 20; i++) { slowA.slowTimer = 30; slowA.frozen = 0; slowA.stunned = 0;
                                 slowB.slowTimer = 0; slowB.frozen = 0; slowB.stunned = 0;
                                 slowA.hp = slowB.hp = 1e6; update(); }
  const dA = Math.hypot(slowA.x - a0.x, slowA.y - a0.y);
  const dB = Math.hypot(slowB.x - b0.x, slowB.y - b0.y);
  ok(dB > 0 && Math.abs(dA / dB - 0.8) < 0.05,
     `延缓中的怪位移是正常怪的 0.8 倍`, `got ${(dA / dB).toFixed(3)} (${dA.toFixed(1)} vs ${dB.toFixed(1)})`);

  // 13e slowTimer 会自然衰减
  fresh();
  const dec = mkM(300, 300); dec.slowTimer = 5;
  G.monsters = [dec];
  G.monstersToSpawn = 0;
  for (let i = 0; i < 8; i++) { dec.hp = 1e6; update(); }
  ok(dec.slowTimer === 0, 'slowTimer 到期归零', `got ${dec.slowTimer}`);

  // 13f E13 冰冻时长 −10%
  fresh();
  // v9.22 及更早：E13 对每只怪是 65% 概率独立掷骰，3 只时「一只都没冻住」的概率
  // 有 4.3%，会偶发假失败（实测撞到过一次），所以放 8 只压到 0.02%。
  // v9.23 起改成「就近靶心 + 90px」的确定性范围，不再有随机性（8 只仍然留着，
  // 因为它同时要验证「范围外的怪没被冻」）。
  G.monsters = Array.from({ length: 8 }, (_, i) => mkM(120 + i * 60, 300 - (i % 3) * 60));
  addPassive('T06', 'E13');          // 高频 → 18 帧
  api.triggerPassive('T06');         // isInitial 只是登记，真正冻住要走触发
  const fr = G.monsters.map(m => m.frozen).filter(v => v > 0);
  ok(fr.length > 0, 'E13 冻住了怪');
  ok(fr.every(v => v <= 18), '高频触发冰冻 ≤ 18 帧（原 20）', `got ${JSON.stringify(fr)}`);
  if (HAS_V923) {
    ok(fr.length < G.monsters.length, '不是全场都冻——90px 外的怪站着不动',
      `${fr.length}/${G.monsters.length} 只被冻`);
  }

  // 13g 伤害流转动画：火焰烧到玩家 → 冒出一条飞向核心的流
  fresh();
  // 关掉 simMode 的 autoPilot，否则玩家会被拖着跑，流的起点就漂了
  api.simAutoSelectClass();
  G.simMode = false; G.gameOver = false; G.paused = false;
  // resetGame() 不清 G.keys，前一个用例 autoPilot 按下的键会留在这里——不清掉玩家会自己走
  G.keys = { w: false, a: false, s: false, d: false, shift: false };
  G.monsters = []; G.monstersToSpawn = 0;
  G.player.x = 200; G.player.y = 200; G.player.hp = 100;
  G.fireTrails = [{ x1: 200, y1: 200, x2: 200, y2: 200, life: 300 }];
  G.damageFlows = [];
  G.frame = 0;
  for (let i = 0; i < 12; i++) { G.frame = i; G.player.x = 200; G.player.y = 200; G.player.hp = 100; update(); }
  ok(G.damageFlows.length > 0, '火焰烧到玩家时冒出了伤害流', `got ${G.damageFlows.length}`);
  const df = G.damageFlows[0];
  ok(df.x1 === 200 && df.y1 === 200, '流的起点是玩家', `got ${df.x1},${df.y1}`);
  ok(df.x2 === G.core.x && df.y2 === G.core.y, '流的终点是核心', `got ${df.x2},${df.y2}`);
  ok(G.damageFlows.length <= 3, '每 6 帧一条，做了节流', `got ${G.damageFlows.length}`);
  // 跑够帧数后应当全部消散
  G.fireTrails = [];
  for (let i = 0; i < 40; i++) update();
  ok(G.damageFlows.length === 0, '动画跑完后自动清空（不泄漏）', `got ${G.damageFlows.length}`);

  // 13h 火焰照旧扣护盾（表现层改了，逻辑没改）
  fresh();
  api.simAutoSelectClass();
  G.simMode = false; G.gameOver = false; G.paused = false;
  // resetGame() 不清 G.keys，前一个用例 autoPilot 按下的键会留在这里——不清掉玩家会自己走
  G.keys = { w: false, a: false, s: false, d: false, shift: false };
  G.monsters = []; G.monstersToSpawn = 0;
  G.player.x = 200; G.player.y = 200; G.player.hp = 100;
  G.fireTrails = [{ x1: 200, y1: 200, x2: 200, y2: 200, life: 300 }];
  for (let i = 0; i < 10; i++) { G.frame = i; G.player.x = 200; G.player.y = 200; update(); }
  ok(G.player.hp < 100, '火焰仍然扣护盾（只是显示位置变了）', `got ${G.player.hp.toFixed(1)}`);

  // 13i 护盾条与核心条都画在核心头顶，渲染不抛异常
  ok((() => { try { draw(); return true; } catch (e) { return false; } })(), 'draw() 带双血条正常');
}

// ---------- 14. v9.21 图腾上限 + T13「消除」 ----------
section('14. 图腾上限 + 稀有扩容 + T13「消除」消耗品（上限 9.22=15 / 9.23=10）');
if (!HAS_CAP) {
  console.log('  （跳过：这是 9.20 及更早的产物，没有 T13）');
} else {
  // 14a 上限的默认值（v9.23: 15 → 10）
  fresh();
  const CAP = HAS_V923 ? 10 : 15;
  ok(G.maxTurrets === CAP, `resetGame 后图腾上限 = ${CAP}`, `got ${G.maxTurrets}`);

  // 14b 满了就不出塔，而且环「保持武装」——腾出位置后不用重画也能补上
  fresh();
  for (let i = 0; i < CAP; i++) {
    G.turrets.push({ x: 100 + i, y: 100, r: 14, type: 'basic', emoji: 'x', color: '#fff',
      fireRate: 999, fireTimer: 0, damage: 0, range: 1, hp: 99, maxHp: 99,
      tier: '中环', loopKey: 'full' + i, spawnAnim: 0 });
    G.turretLoops['full' + i] = true;   // 这 CAP 座各自都占着一个 key
  }
  drawLoop(400, 280, 20, 40);
  G.frame = 6; checkTrailLoop();
  ok(G.turrets.length === CAP, `满 ${CAP} 座时闭环不再出塔`, `got ${G.turrets.length}`);
  ok(Object.keys(G.turretLoops).length === CAP, '被挡下的环没有登记 key（保持武装）',
    `got ${Object.keys(G.turretLoops).length}`);

  G.turrets.pop();                       // 腾一个位置
  G.frame = 42;                          // 必须是 6 的倍数，checkTrailLoop 每 6 帧才查一次
  checkTrailLoop();
  ok(G.turrets.length === CAP, '腾出位置后同一个环自动补上（不用重画）', `got ${G.turrets.length}`);

  // 14c 扩容选项
  fresh();
  const before = G.maxTurrets;
  TURRET_SLOT_CHOICE.apply();
  ok(G.maxTurrets === before + 1, '「图腾扩容」把上限 +1', `${before} → ${G.maxTurrets}`);
  ok(STAT_CHOICES.every(c => c.id !== 'turretSlot'), '扩容不在商店货架 STAT_CHOICES 里（只在每层奖励）');

  // 14d T13 的存在与权重
  const t13 = TRIG_.find(t => t.id === 'T13');
  ok(!!t13, 'TRIGGERS 里有 T13「消除」');
  ok(t13 && t13.weight === 0.5, 'T13 权重 = 0.5（普通板的一半）', t13 && `got ${t13.weight}`);
  ok(TRIG_.filter(t => t.id === 'T12').length === 1, 'TRIGGERS 里 T12 不再重复',
    `got ${TRIG_.filter(t => t.id === 'T12').length} 条`);

  // 14e 权重真的生效：抽 60000 次，拿一块「权重 1」的板当标尺比次数。
  // （不能再用「总次数 - T13 次数」求均值——v9.23 起 T08 也有了权重 0.7。）
  const tally = {};
  for (let i = 0; i < 60000; i++) { const t = randomTrigger(); tally[t.id] = (tally[t.id] || 0) + 1; }
  const unit = tally[TRIG_.find(t => !t.weight).id];   // 权重 1 板的实测次数
  const r13 = (tally.T13 || 0) / unit;
  ok(r13 > 0.44 && r13 < 0.56, '实测 T13 抽中率 ≈ 权重 1 板的一半', `比值 ${r13.toFixed(3)}（期望 0.5）`);
  if (HAS_V923) {
    const r08 = (tally.T08 || 0) / unit;
    ok(r08 > 0.64 && r08 < 0.76, '实测 T08 抽中率 ≈ 权重 1 板的 0.7（出率 -30%）',
      `比值 ${r08.toFixed(3)}（期望 0.7）`);
  }

  // 14f 宣读 T13：全场掉血 + 拆掉最早的一座，且不产生被动
  fresh();
  G.floor = 10; G.passives = {}; G.maxSlots = 4;
  const mkT = (n) => G.turrets.push({ x: 200 + n, y: 200, r: 14, type: 'basic', emoji: 'x',
    color: '#fff', fireRate: 999, fireTimer: 0, damage: 0, range: 1, hp: 9, maxHp: 9,
    tier: '中环', loopKey: 'lk' + n, spawnAnim: 0 });
  mkT(0); mkT(1); mkT(2);
  G.turretLoops['lk0'] = true;
  const firstX = G.turrets[0].x;
  G.monsters = [1, 2, 3].map(i => ({ x: 300 + i, y: 300, r: 12, hp: 1e6, maxHp: 1e6, speed: 1,
    atk: 0, type: 'basic', isBoss: false, isElite: false, frozen: 0, stunned: 0, slowTimer: 0,
    trailDamageCooldown: 9999, hitCooldown: 0 }));

  const hpBeforeM = G.monsters.map(m => m.hp);
  const ret = doCombine({ id: 'T13', label: '消除' }, { id: 'E10', label: '怪物反噬' });
  ok(ret === true, 'doCombine(T13, E10) 返回 true（成功）');
  ok(G.turrets.length === 2, '拆掉了 1 座（3 → 2）', `got ${G.turrets.length}`);
  ok(G.turrets.every(t => t.x !== firstX), '拆掉的是最早生成的那座', `firstX=${firstX} 剩 ${G.turrets.map(t => t.x).join(',')}`);
  ok(G.turretLoops['lk0'] === undefined, '被拆的塔的 loop key 释放，环重新武装');
  ok(G.monsters.every((m, i) => m.hp < hpBeforeM[i]), '全场每只怪都掉血');
  const dealt = hpBeforeM[0] - G.monsters[0].hp;
  ok(G.monsters.every((m, i) => Math.abs((hpBeforeM[i] - m.hp) - dealt) < 1e-9), '每只怪受到的伤害一致');
  ok(dealt % 3 === 0 && dealt > 0, '伤害是 3 的倍数（3 × 反噬基准）', `got ${dealt}`);
  ok(!G.passives['T13'], 'T13 不产生被动（不登记进 G.passives）');
  ok(Object.keys(G.passives).length === 0, '配对的效果板也没被登记', `got ${JSON.stringify(G.passives)}`);

  // 14g 槽位满时照样能宣读
  fresh();
  G.passives = {};
  for (const tid of ['T01', 'T02', 'T03', 'T06']) G.passives[tid] = [{ effectId: 'E01', count: 1 }];
  G.maxSlots = 4;
  let usedSlots = 0;
  for (const k of Object.keys(G.passives)) usedSlots += G.passives[k].length;
  ok(usedSlots >= G.maxSlots, '先把槽位塞满（4/4）');
  G.monsters = [{ x: 300, y: 300, r: 12, hp: 1e6, maxHp: 1e6, speed: 1, atk: 0, type: 'basic',
    isBoss: false, isElite: false, frozen: 0, stunned: 0, slowTimer: 0,
    trailDamageCooldown: 9999, hitCooldown: 0 }];
  const mMid = G.monsters[0].hp;
  ok(doCombine({ id: 'T13' }, { id: 'E01' }) === true, '槽位满时 T13 仍然宣读成功（不吃槽位上限）');
  ok(G.monsters[0].hp < mMid, '而且伤害照样打出来了');
  ok(Object.keys(G.passives).length === 4, '被动槽位数量没变（还是 4）', `got ${Object.keys(G.passives).length}`);

  // 14h 场上没有图腾时，只炸场不报错
  fresh();
  G.monsters = [{ x: 300, y: 300, r: 12, hp: 1e6, maxHp: 1e6, speed: 1, atk: 0, type: 'basic',
    isBoss: false, isElite: false, frozen: 0, stunned: 0, slowTimer: 0,
    trailDamageCooldown: 9999, hitCooldown: 0 }];
  let threw = null;
  try { doCombine({ id: 'T13' }, { id: 'E02' }); } catch (e) { threw = e; }
  ok(!threw, '场上无图腾时 T13 不抛异常', threw && threw.message);
  ok(G.turrets.length === 0, '也没有凭空造出塔');
}

// ---------- 15. v9.22 轨迹迟缓 + 障碍绕行 + 终极技定速 ----------
const { combineCards, activateUltimate, Tutorial, TUTORIAL_FLOORS, CODEX_PAGES,
        TRAIL_SLOW_FRAMES, getUltimateChargeFrames, ULT_BASE_FRAMES, deletedSymbols } = api;
const HAS_922 = !!(TRAIL_SLOW_FRAMES && getUltimateChargeFrames && deletedSymbols);

if (HAS_922) {
  section('15. v9.22 轨迹迟缓 / 障碍绕行 / 终极技定速 / 死代码清理');

  // 15a 死的那些符号确实没了
  const stillAlive = Object.keys(deletedSymbols).filter(k => deletedSymbols[k]);
  ok(stillAlive.length === 0, 'KILL_BURSTS / MAP_NODES / 真空期 / 密文版三选一 全部删干净',
     `残留: ${stillAlive.join(', ')}`);
  ok(G.player.mult === undefined, 'G.player.mult 字段已移除');

  // 15b 轨迹不再阻挡：怪踩上去只挂 slowTimer，位置不被推开
  fresh();
  G.terrain = [];
  G.trails = [{ x1: 200, y1: 300, x2: 260, y2: 300, life: 360, layer: 1, trailType: 'basic' }];
  G.sprintTrails = [];
  const walker = mkM(230, 300);
  walker.speed = 0;            // 不移动，只测接触判定
  G.monsters = [walker];
  G.monstersToSpawn = 0;
  const beforeX = walker.x, beforeY = walker.y;
  update();
  ok(walker.slowTimer > 0, `踩到轨迹挂上迟缓（${walker.slowTimer} 帧）`, `got ${walker.slowTimer}`);
  ok(Math.abs(walker.x - beforeX) < 1e-9 && Math.abs(walker.y - beforeY) < 1e-9,
     '轨迹不再把怪推开（位置零位移）',
     `Δ=(${(walker.x - beforeX).toFixed(2)}, ${(walker.y - beforeY).toFixed(2)})`);
  ok(walker.slowTimer === TRAIL_SLOW_FRAMES, `迟缓时长 = TRAIL_SLOW_FRAMES = ${TRAIL_SLOW_FRAMES}（3 秒）`);

  // 15c 迟缓中的怪移速 ×0.8，离开轨迹后 3 秒恢复
  fresh();
  G.terrain = []; G.trails = []; G.sprintTrails = [];
  const slug = mkM(300, 300); slug.slowTimer = TRAIL_SLOW_FRAMES; slug.speed = 3;
  const fast = mkM(300, 300); fast.slowTimer = 0; fast.speed = 3;
  G.monsters = [slug, fast]; G.monstersToSpawn = 0;
  const s0 = { x: slug.x, y: slug.y }, f0 = { x: fast.x, y: fast.y };
  update();
  const dS = Math.hypot(slug.x - s0.x, slug.y - s0.y), dF = Math.hypot(fast.x - f0.x, fast.y - f0.y);
  ok(dF > 0 && Math.abs(dS / dF - 0.8) < 0.05, '轨迹迟缓的减速倍数也是 0.8（与 E14 共用）',
     `got ${(dS / dF).toFixed(3)}`);

  // 15d 障碍绕行：怪不会停在里面，且最终越过了障碍
  fresh();
  G.trails = []; G.sprintTrails = [];
  // 核心 → 障碍 → 怪，一条直线，旧版会卡在障碍里
  G.core.x = 120; G.core.y = 280;
  G.terrain = [{ x: 300, y: 280, r: 45, life: 99999, alpha: 0.4 }];
  const detour = mkM(620, 280);
  detour.speed = 3;
  detour.atk = 0;             // 只测移动，不测伤害
  G.monsters = [detour];
  G.monstersToSpawn = 0;
  let insideFrames = 0, maxInside = 0, maxDev = 0;
  const d0 = Math.hypot(detour.x - G.core.x, detour.y - G.core.y);
  for (let i = 0; i < 900; i++) {
    detour.hp = 1e6;
    detour.hitCooldown = 9999;
    update();
    const pen = 45 - Math.hypot(detour.x - 300, detour.y - 280);   // >0 = 陷在障碍里
    if (pen > 0.5) { insideFrames++; maxInside = Math.max(maxInside, pen); }
    // 绕行证据要取**过程中**的最大偏离——怪最终会回到 y≈280（核心就在这条线上），
    // 拿终点比等于什么都没测。
    maxDev = Math.max(maxDev, Math.abs(detour.y - 280));
  }
  const d1 = Math.hypot(detour.x - G.core.x, detour.y - G.core.y);
  ok(maxInside < 1.5, '任何一帧都没有陷进障碍内部（余量 ≤ 1.5px）', `最深 ${maxInside.toFixed(2)}px`);
  ok(insideFrames === 0, '900 帧里零帧处于障碍内部', `inside=${insideFrames}`);
  ok(d1 < d0 - 100, '怪确实绕过去了（与核心的距离明显缩短）',
     `${d0.toFixed(0)} → ${d1.toFixed(0)}`);
  ok(maxDev > 30, '而且是绕行而不是硬穿（过程中 y 最大偏离 > 30px）',
     `maxDev=${maxDev.toFixed(1)}`);

  // 15e 障碍重建把怪推进墙里时，下一帧会被顶出来
  fresh();
  G.trails = []; G.sprintTrails = [];
  G.terrain = [{ x: 400, y: 300, r: 60, life: 99999, alpha: 0.4 }];
  const stuck = mkM(400, 300);       // 正好在障碍圆心
  stuck.speed = 2; stuck.hp = 1e6; stuck.hitCooldown = 9999;
  G.monsters = [stuck]; G.monstersToSpawn = 0;
  update();
  const pen2 = 60 - Math.hypot(stuck.x - 400, stuck.y - 300);
  ok(pen2 <= 1.0, '压在障碍圆心上的怪被推出去了', `pen=${pen2.toFixed(2)}`);

  // 15f 终极技：固定时间回复，且不靠伤害
  fresh();
  G.terrain = []; G.trails = []; G.sprintTrails = [];
  G.monsters = []; G.monstersToSpawn = 0;
  G.floor = 1; G.ultimateGauge = 0; G.ultimateChargeMult = 1.0; G.ultimateActive = false;
  ok(getUltimateChargeFrames() === ULT_BASE_FRAMES / (1 + 1 / 50), '1 层回满帧数 = 1500/(1+1/50)',
     `got ${getUltimateChargeFrames().toFixed(2)}`);
  G.floor = 50;
  ok(Math.abs(getUltimateChargeFrames() - ULT_BASE_FRAMES / 2) < 1e-9, '50 层回满帧数 = 750（12.5 秒）');
  G.floor = 100;
  ok(Math.abs(getUltimateChargeFrames() - ULT_BASE_FRAMES / 3) < 1e-9, '100 层回满帧数 = 500（8.3 秒）');

  // 场上零怪物、零伤害，槽照样会涨
  G.floor = 1; G.ultimateGauge = 0; G.ultimateActive = false;
  for (let i = 0; i < 300; i++) update();
  ok(G.ultimateGauge > 0, '零怪物零伤害时终极技槽照样在涨（不再是「造成伤害才充能」）',
     `gauge=${G.ultimateGauge.toFixed(2)}`);
  const rate = G.ultimateGauge / 300;
  const expect = 100 / getUltimateChargeFrames();
  ok(Math.abs(rate - expect) < 0.02, '充能速率 = ultimateMax / 回满帧数 × 倍率',
     `got ${rate.toFixed(5)} vs ${expect.toFixed(5)}`);

  // 释放期间不回能
  G.ultimateGauge = 50; G.ultimateActive = true; G.ultimateTimer = 600;
  const held = G.ultimateGauge;
  for (let i = 0; i < 30; i++) update();
  ok(G.ultimateGauge === held, '释放终极技期间不回能', `got ${G.ultimateGauge} (held ${held})`);

  // 倍率乘在速率上：×2 就是两倍快
  if (combineCards) {}
  G.ultimateActive = false;
  G.ultimateGauge = 0; G.ultimateChargeMult = 2.0;
  for (let i = 0; i < 100; i++) update();
  const rateX2 = G.ultimateGauge / 100;
  ok(Math.abs(rateX2 / rate - 2.0) < 0.05, 'ultimateChargeMult ×2 就是充能速度 ×2（乘在速率上）',
     `got ${(rateX2 / rate).toFixed(3)}`);

  // 15g 连杀计数还在（只是不再有爆发）
  fresh();
  G.terrain = []; G.trails = []; G.sprintTrails = [];
  G.monsters = []; G.monstersToSpawn = 0;
  ok('killStreak' in G, 'G.killStreak 字段保留（T08 / 连杀加分还在用它）');
  ok(G.ultimateChargeMult === 1.0, 'resetGame 后充能倍率回到 1.0');
}

// ---------- 16. 教程 1–5 层逐层脚本回归 ----------
const HAS_TUT = !!(Tutorial && TUTORIAL_FLOORS && combineCards && activateUltimate);

if (HAS_TUT) {
  section('16. 教程 1–5 层逐层脚本回归（无头驱动）');

  // 16a 脚本结构自检：不依赖运行，先把明显的配置错误挖出来
  const KNOWN_ON = new Set(['enter', 'after', 'move', 'kill', 'slots', 'essence',
                            'sprint', 'map', 'clear', 'event']);
  let badOn = [], gateNoFallback = [], dropImbalance = [];
  for (const f of Object.keys(TUTORIAL_FLOORS)) {
    const cfg = TUTORIAL_FLOORS[f];
    cfg.steps.forEach((s, i) => {
      if (!KNOWN_ON.has(s.on)) badOn.push(`${f}#${i}(${s.on})`);
      // gate 步骤卡住时靠 fallback 提示 + 超时放行，没 fallback 就只能干等
      if (s.gate && !s.fallback && s.on !== 'clear') gateNoFallback.push(`${f}#${i}(${s.on})`);
    });
    const list = (cfg.drops || []).map(d => d.card).concat(cfg.hand || []);
    if (list.length) {
      const t = list.filter(c => c[0] === 'T').length, e = list.filter(c => c[0] === 'E').length;
      if (Math.abs(t - e) > 1) dropImbalance.push(`${f}(T=${t} E=${e})`);
    }
  }
  ok(badOn.length === 0, '每层的 on: 都是调度器认得的类型', badOn.join(', '));
  ok(gateNoFallback.length === 0, '每个需要玩家操作的 gate 步骤都有 fallback 提示',
     gateNoFallback.join(', '));
  ok(dropImbalance.length === 0, '每层脚本掉落 T/E 平衡（差 ≤ 1）', dropImbalance.join(', '));

  // 16b 真跑：把 simMode 关掉让 Tutorial.tick() 转起来，用 autoPilot 当「玩家」
  resetGame();
  api.simAutoSelectClass();               // 清 selectingActive，并 startFloor() 进第 1 层
  G.simMode = false;                      // Tutorial.tick() / onFloorStart() 都要求它
  G.gameOver = false; G.paused = false;
  G.keys = { w: false, a: false, s: false, d: false, shift: false };
  Tutorial.seen = false; Tutorial.finished = false;
  G.floor = 1;
  api.startFloor();

  // 记录每次 show() 的步骤，用来断言「按序、不跳步」
  const seenSteps = [];
  const realShow = Tutorial.show.bind(Tutorial);
  Tutorial.show = function (i) {
    seenSteps.push({ floor: this.floor, idx: i, on: this.cfg.steps[i].on });
    return realShow(i);
  };

  const realAutoFill = Tutorial.autoFill.bind(Tutorial);
  Tutorial.autoFill = function (ids) {
    if (process.env.TUTDBG) console.log(`    [dbg] autoFill(${JSON.stringify(ids)}) floor=${this.floor}`);
    return realAutoFill(ids);
  };
  let QPresses = 0, combines = 0, sawSlots = 0;
  // 脚本里「等怪撞核心」「等围剿成立」这类步骤靠 45 秒超时兜底推进，
  // 5 层里会有好几次，所以给足 12 分钟游戏时间。
  const MAXF = 60 * 60 * 12;
  let frames = 0;
  for (; frames < MAXF; frames++) {
    // 当玩家的手：移动 + 冲刺由 autoPilot 负责（simMode 关掉后它不会自己跑）
    api.autoPilot();
    // 槽位满了就按空格（gate 步骤会超时 autofill，但填完还得有人按空格）
    if (G.triggerSlot || G.effectSlot) sawSlots++;
    // 当玩家的手（二）：点手牌填槽。fillSlot 会 splice 手牌，两张牌要分两次重新找下标。
    if (!G.paused && !G.selectingActive) {
      if (!G.triggerSlot) {
        const i = G.hand.findIndex(c => c.type === 'trigger');
        if (i >= 0) api.fillSlot(i);
      }
      if (!G.effectSlot) {
        const i = G.hand.findIndex(c => c.type === 'effect');
        if (i >= 0) api.fillSlot(i);
      }
    }
    // 槽位齐了就按空格（gate 步骤会超时 autofill，但填完还得有人按空格）
    if (G.triggerSlot && G.effectSlot && !G.paused && !G.selectingActive) {
      G.combineCooldown = false;          // setTimeout 在探针里是 noop，得手动清
      combineCards();
      combines++;
    }
    // 充能满了就按 Q（第 5 层的 gate 步骤在等这个）
    if (G.ultimateGauge >= G.ultimateMax && !G.ultimateActive && !G.paused) {
      activateUltimate();
      QPresses++;
    }
    // 当玩家的手（三）：节点地图开着就选一条路。第 5 层必须走这一步——
    // 选完 Tutorial.outroPending 置真，第 6 层才播收尾字幕并 finish()。
    // 不选的话第 5 层脚本会一直停在那，G.floor 不前进，收尾永远不会来。
    if (G.mapMode && G.mapChoices.length > 0 && api.selectNode) {
      // 挑一个非商人/非休整的节点——那两类会弹商店浮层，把流程岔开
      const ni = G.mapChoices.findIndex(n => !n.isMerchant && !n.isRest);
      api.selectNode(ni >= 0 ? ni : 0, 'center');
    } else if (G.selectingActive) {
      // 属性三选一浮层：真的选一项（走正式入口，别用 simAutoSelectClass——
      // 那个会顺带 startFloor()，把当前层的教程脚本从头再播一遍）
      if (G.selectionCards && G.selectionCards.length > 0 && api.selectStat) {
        api.selectStat(0);
      } else {
        api.simAutoSelectClass();     // 开局职业选择
      }
    }
    update();
    if (process.env.TUTDBG && frames % 2000 === 0) {
      console.log(`    [dbg] f=${frames} floor=${G.floor} idx=${Tutorial.idx} on=${
        Tutorial.cfg ? (Tutorial.cfg.steps[Tutorial.idx + 1] || {}).on : '-'} pend=${Tutorial.pendTimer}` +
        ` text=${!!Tutorial.text} slots=${!!G.triggerSlot}/${!!G.effectSlot} sel=${G.selectingActive}` +
        ` paused=${G.paused} 怪=${G.monsters.length} 待出=${G.monstersToSpawn} 塔=${G.turrets.length}` +
        ` kills=${Tutorial.kills} 轨迹=${G.trails.length} 分=${G.score}`);
    }
    if (Tutorial.finished) break;
    if (G.gameOver) break;
  }

  ok(!G.gameOver, '5 层教程跑完没有 gameOver（核心没被打爆）');
  ok(Tutorial.finished, `教程在第 6 层之前结束（跑了 ${frames} 帧 ≈ ${(frames / 60).toFixed(0)} 秒）`);

  // 顺序断言：同一层内 idx 必须严格递增 1（不许跳步、不许回退）
  const byFloor = new Map();
  for (const s of seenSteps) {
    if (!byFloor.has(s.floor)) byFloor.set(s.floor, []);
    byFloor.get(s.floor).push(s.idx);
  }
  let outOfOrder = [];
  const perFloorCount = [];
  for (const [f, idxs] of [...byFloor.entries()].sort((a, b) => a[0] - b[0])) {
    perFloorCount.push(`${f}:${idxs.length}步`);
    for (let i = 1; i < idxs.length; i++) {
      if (idxs[i] !== idxs[i - 1] + 1) outOfOrder.push(`层${f}: ${idxs[i - 1]}→${idxs[i]}`);
    }
  }
  ok(outOfOrder.length === 0, '每一层的步骤都按 idx 递增 1 播放（没有跳步/回退）',
     outOfOrder.join(', '));
  console.log(`     每层播报：${perFloorCount.join(' · ')}`);

  // 每一层的脚本步骤都真的被播到了（教程层 1–5 全覆盖）
  const covered = [...byFloor.keys()].filter(f => TUTORIAL_FLOORS[f]).sort((a, b) => a - b);
  ok(covered.join(',') === '1,2,3,4,5', '教程层 1–5 全部被脚本接管过', `covered=${covered.join(',')}`);
  const shortFloor = [];
  for (const f of covered) {
    const expect = TUTORIAL_FLOORS[f].steps.length;
    const got = byFloor.get(f).length;
    const hasBanner = TUTORIAL_FLOORS[f].steps[0].kind === 'banner';
    if (got < expect - (hasBanner ? 1 : 0)) shortFloor.push(`层${f}: ${got}/${expect}`);
  }
  ok(shortFloor.length === 0, '每层都播完了全部步骤（banner 不计入播报）', shortFloor.join(', '));

  ok(combines > 0, `教程流程里真的按过空格宣读（${combines} 次）`);
  ok(QPresses > 0, `教程流程里真的按过 Q（${QPresses} 次）`);

  // 收尾：教程状态正确关闭
  ok(Tutorial.seen === true, '教程结束后 seen = true（第 6 层起恢复随机）');
  ok(Tutorial.active === false, '教程结束后 active = false');

  // 16c 图鉴文案不能提到已删的机制
  const codexText = CODEX_PAGES.flatMap(p => p.lines).join('\n');
  const stale = [];
  if (codexText.includes('连杀爆发')) stale.push('连杀爆发');
  if (codexText.includes('无法穿越轨迹')) stale.push('无法穿越轨迹');
  if (codexText.includes('靠造成伤害充能')) stale.push('靠造成伤害充能');
  if (/max\(6, 12 - 楼层/.test(codexText)) stale.push('旧的射击间隔公式');
  ok(stale.length === 0, '机制图鉴里没有 v9.22 已删机制的过期描述', stale.join(', '));

  // 逐层脚本字幕同样不能提
  const stepText = Object.values(TUTORIAL_FLOORS)
    .flatMap(c => c.steps.map(s => s.text || '')).join('\n');
  const stale2 = [];
  if (stepText.includes('连杀爆发')) stale2.push('连杀爆发');
  if (stepText.includes('无法穿越轨迹')) stale2.push('无法穿越轨迹');
  if (stepText.includes('充能靠造成伤害')) stale2.push('充能靠造成伤害');
  ok(stale2.length === 0, '逐层教程字幕里也没有过期描述', stale2.join(', '));
}

// ---------- 17. v9.23 火焰烧塔 / BOSS 调整 / 范围效果 / 出率 ----------
section('17. v9.23 火焰烧塔 · BOSS 调整 · E13/E14 范围 · 出率');
if (!HAS_V923) {
  console.log('  （跳过：这是 9.22 及更早的产物）');
} else {
  // 点火场景：塔在火里，玩家和另一座塔都离得远。
  // 必须留一只怪，否则 update() 会判定「波次清空」直接进下一层。
  function fireScene(turretHp, farTurret) {
    fresh();
    api.simAutoSelectClass();
    G.simMode = false; G.gameOver = false; G.paused = false;
    // resetGame() 不清 G.keys，之前 autoPilot 按下的键留着会把玩家自己拖走
    G.keys = { w: false, a: false, s: false, d: false, shift: false };
    const mkT = (x, y, hp, key) => ({ x, y, r: 14, type: 'basic', emoji: 'x', color: '#fff',
      fireRate: 9999, fireTimer: 0, damage: 0, range: 1, hp, maxHp: hp,
      tier: '中环', loopKey: key, spawnAnim: 0 });
    const inFire = mkT(300, 200, turretHp, 'inFire');
    G.turrets = [inFire];
    G.turretLoops = { inFire: true };
    let far = null;
    if (farTurret) { far = mkT(650, 480, 4, 'far'); G.turrets.push(far); G.turretLoops.far = true; }
    G.fireTrails = [{ x1: 300, y1: 200, x2: 300, y2: 200, life: 9999 }];
    G.player.x = 700; G.player.y = 60; G.player.hp = 100;
    // 冻住一只假怪占着场子（否则 update() 判定「波次清空」直接进下一层）。
    // 冻住是为了它一步都不走——走了的话它会去打远处那座塔，把 17a 的断言搅了。
    const dummy = mkM(60, 520);
    dummy.frozen = 1e9;
    G.monsters = [dummy];
    G.monstersToSpawn = 0;
    return { inFire, far };
  }

  // 17a 火里的塔每帧掉血，但远不到烧玩家的 0.8/帧
  let sc = fireScene(4, true);
  for (let i = 1; i <= 100; i++) { G.frame = i; G.player.x = 700; G.player.y = 60; update(); }
  const expect = 4 - 100 * FIRE_TURRET_DMG_PER_FRAME;
  ok(Math.abs(sc.inFire.hp - expect) < 1e-6,
    `100 帧火焰烧掉 ${(100 * FIRE_TURRET_DMG_PER_FRAME).toFixed(2)} 血（0.012/帧）`,
    `got ${sc.inFire.hp.toFixed(3)}，期望 ${expect.toFixed(3)}`);
  ok(sc.inFire.hp > 0, '100 帧还烧不穿一座中环（4 血）', `got ${sc.inFire.hp.toFixed(2)}`);
  ok(sc.far && sc.far.hp === 4, '火外的塔一点血没掉', `got ${sc.far && sc.far.hp}`);
  ok(FIRE_TURRET_DMG_PER_FRAME < 0.8 / 10, '烧塔速率远低于烧玩家的 0.8/帧',
    `got ${FIRE_TURRET_DMG_PER_FRAME}`);

  // 17b 泡久了会碎，而且同一个环重新武装
  sc = fireScene(2, false);
  for (let i = 1; i <= 300; i++) { G.frame = i; G.player.x = 700; G.player.y = 60; update(); }
  ok(G.turrets.length === 0, '小环（2 血）泡在火里 300 帧后碎裂', `剩 ${G.turrets.length} 座`);
  ok(!G.turretLoops.inFire, '碎裂后环 key 被删掉（重新武装）',
    `got ${JSON.stringify(G.turretLoops)}`);

  // 17c BOSS 血量 −10%
  fresh();
  const bossAt = (f) => { G.floor = f; return getBossHp(); };
  ok(bossAt(10) === 90000, '第 10 层 BOSS 血量 10 万 → 9 万', `got ${bossAt(10)}`);
  ok(bossAt(20) === 153000, '第 20 层 17 万 → 15.3 万', `got ${bossAt(20)}`);
  // Math.floor 会截掉浮点尾巴（0.9×2.89×10 万 = 260099.999…），差 1 属于正常
  ok(Math.abs(bossAt(30) - 260100) <= 1, '第 30 层 28.9 万 → ≈26.01 万', `got ${bossAt(30)}`);

  // 17d BOSS 召唤爪牙速率 +5%（间隔 ×1/1.05）
  ok(bossSummonInterval(100) === 95, 'bossSummonInterval(100) = 95', `got ${bossSummonInterval(100)}`);
  ok(bossSummonInterval(150) === 143, 'bossSummonInterval(150) = 143', `got ${bossSummonInterval(150)}`);
  ok(bossSummonInterval(50) === 48, 'bossSummonInterval(50) = 48', `got ${bossSummonInterval(50)}`);
  fresh();
  G.floor = 1;
  spawnBoss();
  const bs = G.monsters.find(x => x.isBoss);
  ok(bs && bs.spawnTimer === 95, 'BOSS 首次召唤间隔 100 → 95 帧', `got ${bs && bs.spawnTimer}`);
  if (bs) {
    // 跑满 95 帧刚好触发第一次召唤（初始 95 → 第 95 帧归零并重置）。
    // 多跑一帧就会被再减一次，读到的就不是重置值了。
    for (let i = 0; i < 95; i++) { G.frame = 100 + i; update(); }
    const want = bossSummonInterval(Math.max(50, 150 - G.floor * 2));
    ok(bs.spawnTimer === want,
      `召唤后重置到 max(50, 150-层数×2)/1.05 = ${want}`, `got ${bs.spawnTimer}`);
    ok(bs.spawnTimer < Math.max(50, 150 - G.floor * 2), '确实比原来的间隔短（速率更高）',
      `${bs.spawnTimer} vs ${Math.max(50, 150 - G.floor * 2)}`);
  }

  // 17e 清层奖励卡数：前期 ×1.1、第 30 层起 ×0.9
  fresh();
  const cards = (f) => { G.floor = f; return getFloorClearCards(); };
  ok(cards(5) === 2, '第 5 层 2 张（2×1.1 取整）', `got ${cards(5)}`);
  ok(cards(10) === 3, '第 10 层 3 张（3×1.1）', `got ${cards(10)}`);
  ok(cards(29) === 4, '第 29 层 4 张（4×1.1，仍在前期）', `got ${cards(29)}`);
  ok(cards(30) === 5, '第 30 层 5 张（5×0.9 取整，拐点切到后期）', `got ${cards(30)}`);
  ok(cards(100) === 11, '第 100 层 11 张（12×0.9）', `got ${cards(100)}`);

  // 17f E13/E14 的作用范围 = 命中目标 + 90px
  fresh();
  const t0 = mkM(300, 300);
  const near = mkM(300, 300 + EFFECT_AOE_RADIUS - 20);
  const farM = mkM(300, 300 + EFFECT_AOE_RADIUS + 60);
  G.monsters = [t0, near, farM];
  ok(EFFECT_AOE_RADIUS === 90, '范围半径 = 90px', `got ${EFFECT_AOE_RADIUS}`);
  const tgt = effectAoeTargets(t0);
  ok(tgt.indexOf(t0) >= 0, '靶心自己在范围内');
  ok(tgt.indexOf(near) >= 0, '90px 内的怪被带上');
  ok(tgt.indexOf(farM) < 0, '90px 外的怪不受影响');
  const tgt2 = effectAoeTargets(null);   // 无目标 → 就近兜底
  ok(tgt2.indexOf(t0) >= 0 && tgt2.indexOf(near) >= 0, '没传目标时就近取玩家最近的怪当靶心');
  G.monsters = [];
  ok(effectAoeTargets(null).length === 0, '场上没怪时返回空数组（不崩）');

  // 17g E04 删除 + E02/E11 出率 −30%
  ok(!EFFECTS.some(e => e.id === 'E04'), 'EFFECTS 里没有 E04「移速减慢」了');
  ok(EFFECTS.some(e => e.id === 'E02' && e.weight === 0.7), 'E02「连环击」权重 0.7');
  ok(EFFECTS.some(e => e.id === 'E11' && e.weight === 0.7), 'E11「自速暴涨」权重 0.7');
  ok((TRIG_.find(t => t.id === 'T08') || {}).weight === 0.7, 'T08「连环击杀」权重 0.7');
  const etal = {};
  for (let i = 0; i < 60000; i++) { const e = randomEffect(); etal[e.id] = (etal[e.id] || 0) + 1; }
  const eUnit = etal[EFFECTS.find(e => !e.weight).id];
  const r02 = etal.E02 / eUnit, r11 = etal.E11 / eUnit;
  ok(r02 > 0.64 && r02 < 0.76, '实测 E02 出率 ≈ 权重 1 板的 0.7', `比值 ${r02.toFixed(3)}`);
  ok(r11 > 0.64 && r11 < 0.76, '实测 E11 出率 ≈ 权重 1 板的 0.7', `比值 ${r11.toFixed(3)}`);

  // 17h 图鉴/教程字幕不再提 E04，图腾上限写的是 10
  const codexAll = CODEX_PAGES ? CODEX_PAGES.flatMap(p => p.lines).join('\n') : '';
  ok(!codexAll.includes('E04'), '机制图鉴里不再列 E04');
  ok(codexAll.includes('上限 10 座'), '机制图鉴里的图腾上限写的是 10 座');
  ok(codexAll.includes('90px'), '机制图鉴里写了 E13/E14 的 90px 范围');
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
