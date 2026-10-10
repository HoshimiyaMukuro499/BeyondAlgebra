// 9.17–9.18 无头验证：把构建产物塞进一个假 DOM 里跑，直接断言图腾系统与经济系统的行为。
// 用完即删（不属于仓库内容）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || '密文轨迹demo9.23.html';
const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
// v9.25 起模板里有两个 <script>（<head> 里的启动自检 + <body> 末尾的主脚本），
// 所以不能再用「第一个 <script> 到 </body>」那个正则——它会把 head 那段也吞进来。
// 主脚本永远是 </body> 之前的最后一个 <script>。
const bodyEnd = html.slice(0, html.lastIndexOf('</body>'));
const scriptOpen = bodyEnd.lastIndexOf('<script>');
if (scriptOpen < 0) throw new Error('没找到 <script>');
const src = bodyEnd.slice(scriptOpen + '<script>'.length, bodyEnd.lastIndexOf('</script>'));

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
  // v9.24 词条重做 + 手机端 + 教程沙盒
  ' AFFIXES: (typeof AFFIXES !== "undefined") ? AFFIXES : null,' +
  ' affixDef: (typeof affixDef !== "undefined") ? affixDef : null,' +
  ' pickAffixes: (typeof pickAffixes !== "undefined") ? pickAffixes : null,' +
  ' MONSTER_STAT_MUL: (typeof MONSTER_STAT_MUL !== "undefined") ? MONSTER_STAT_MUL : null,' +
  ' MONSTER_TYPES: (typeof MONSTER_TYPES !== "undefined") ? MONSTER_TYPES : null,' +
  ' getDifficultyMultiplier: (typeof getDifficultyMultiplier !== "undefined") ? getDifficultyMultiplier : null,' +
  ' getPlayerAtkZoneMul: (typeof getPlayerAtkZoneMul !== "undefined") ? getPlayerAtkZoneMul : null,' +
  ' getPlayerSpeedZoneMul: (typeof getPlayerSpeedZoneMul !== "undefined") ? getPlayerSpeedZoneMul : null,' +
  ' tickAffixes: (typeof tickAffixes !== "undefined") ? tickAffixes : null,' +
  ' onAffixCoreHit: (typeof onAffixCoreHit !== "undefined") ? onAffixCoreHit : null,' +
  ' onAffixDeath: (typeof onAffixDeath !== "undefined") ? onAffixDeath : null,' +
  ' isPassiveSealed: (typeof isPassiveSealed !== "undefined") ? isPassiveSealed : null,' +
  ' restartRunAfterTutorial: (typeof restartRunAfterTutorial !== "undefined") ? restartRunAfterTutorial : null,' +
  ' ENEMY_TOTEM_LIFE: (typeof ENEMY_TOTEM_LIFE !== "undefined") ? ENEMY_TOTEM_LIFE : null,' +
  ' ENEMY_TOTEM_RANGE: (typeof ENEMY_TOTEM_RANGE !== "undefined") ? ENEMY_TOTEM_RANGE : null,' +
  ' JOYSTICK: (typeof JOYSTICK !== "undefined") ? JOYSTICK : null,' +
  ' setDrawer: (typeof setDrawer !== "undefined") ? setDrawer : null,' +
  ' detectMobileMode: (typeof detectMobileMode !== "undefined") ? detectMobileMode : null,' +
  ' SEAL_FRAMES: (typeof SEAL_FRAMES !== "undefined") ? SEAL_FRAMES : null,' +
  ' updateSeals: (typeof updateSeals !== "undefined") ? updateSeals : null,' +
  ' spawnAffixFire: (typeof spawnAffixFire !== "undefined") ? spawnAffixFire : null,' +
  ' applyVortexPull: (typeof applyVortexPull !== "undefined") ? applyVortexPull : null,' +
  ' updateEnemyTotems: (typeof updateEnemyTotems !== "undefined") ? updateEnemyTotems : null,' +
  ' TUTORIAL_OUTRO: (typeof TUTORIAL_OUTRO !== "undefined") ? TUTORIAL_OUTRO : null,' +
  // v9.25 BOSS 专属词条 + 圈层落点 + 手机端输入 + 消除技能化
  ' AFFIX_ZONE_R_MUL: (typeof AFFIX_ZONE_R_MUL !== "undefined") ? AFFIX_ZONE_R_MUL : null,' +
  ' AFFIX_ZONE_MAX_PER_KIND: (typeof AFFIX_ZONE_MAX_PER_KIND !== "undefined") ? AFFIX_ZONE_MAX_PER_KIND : null,' +
  ' bossEarlyMul: (typeof bossEarlyMul !== "undefined") ? bossEarlyMul : null,' +
  ' BOSS_EARLY_RAMP_END: (typeof BOSS_EARLY_RAMP_END !== "undefined") ? BOSS_EARLY_RAMP_END : null,' +
  ' spawnAffixZone: (typeof spawnAffixZone !== "undefined") ? spawnAffixZone : null,' +
  ' tickAffixZones: (typeof tickAffixZones !== "undefined") ? tickAffixZones : null,' +
  ' getAffixZoneMul: (typeof getAffixZoneMul !== "undefined") ? getAffixZoneMul : null,' +
  ' getTurretAtkZoneMul: (typeof getTurretAtkZoneMul !== "undefined") ? getTurretAtkZoneMul : null,' +
  ' getTurretRateZoneMul: (typeof getTurretRateZoneMul !== "undefined") ? getTurretRateZoneMul : null,' +
  ' FIRE_ZONE_TICK: (typeof FIRE_ZONE_TICK !== "undefined") ? FIRE_ZONE_TICK : null,' +
  ' FIRE_ZONE_DMG_PER_TICK: (typeof FIRE_ZONE_DMG_PER_TICK !== "undefined") ? FIRE_ZONE_DMG_PER_TICK : null,' +
  ' ELIMINATE_COOLDOWN: (typeof ELIMINATE_COOLDOWN !== "undefined") ? ELIMINATE_COOLDOWN : null,' +
  ' tryEliminate: (typeof tryEliminate !== "undefined") ? tryEliminate : null,' +
  ' activateEliminate: (typeof activateEliminate !== "undefined") ? activateEliminate : null,' +
  ' TURRET_ATK_CEILING: (typeof TURRET_ATK_CEILING !== "undefined") ? TURRET_ATK_CEILING : null,' +
  ' TURRET_RATIO_NORM: (typeof TURRET_RATIO_NORM !== "undefined") ? TURRET_RATIO_NORM : null,' +
  ' PLAYER_FIRE_RATE_MUL: (typeof PLAYER_FIRE_RATE_MUL !== "undefined") ? PLAYER_FIRE_RATE_MUL : null,' +
  ' getPlayerAttackPower: (typeof getPlayerAttackPower !== "undefined") ? getPlayerAttackPower : null,' +
  ' getTurretAttackPower: (typeof getTurretAttackPower !== "undefined") ? getTurretAttackPower : null,' +
  ' setStickFromTouch: (typeof setStickFromTouch !== "undefined") ? setStickFromTouch : null,' +
  ' releaseStick: (typeof releaseStick !== "undefined") ? releaseStick : null,' +
  ' joyRadiusPx: (typeof joyRadiusPx !== "undefined") ? joyRadiusPx : null,' +
  ' syncGameOverUI: (typeof syncGameOverUI !== "undefined") ? syncGameOverUI : null,' +
  ' selectClass: (typeof selectClass !== "undefined") ? selectClass : null,' +
  // v9.25 密文版掉落：开局 6 张 / 每 20 杀 30% / BOSS 每磨 25% 血 1~4 张
  ' START_CARDS: (typeof START_CARDS !== "undefined") ? START_CARDS : null,' +
  ' KILL_CARD_EVERY: (typeof KILL_CARD_EVERY !== "undefined") ? KILL_CARD_EVERY : null,' +
  ' KILL_CARD_CHANCE: (typeof KILL_CARD_CHANCE !== "undefined") ? KILL_CARD_CHANCE : null,' +
  ' BOSS_CARD_STEP: (typeof BOSS_CARD_STEP !== "undefined") ? BOSS_CARD_STEP : null,' +
  ' rollBossCardCount: (typeof rollBossCardCount !== "undefined") ? rollBossCardCount : null,' +
  ' grantCards: (typeof grantCards !== "undefined") ? grantCards : null,' +
  ' dropBalancedCard: (typeof dropBalancedCard !== "undefined") ? dropBalancedCard : null,' +
  ' registerKill: (typeof registerKill !== "undefined") ? registerKill : null,' +
  ' tickBossCardMilestones: (typeof tickBossCardMilestones !== "undefined") ? tickBossCardMilestones : null,' +
  // v9.26 手机端输入 + 教程重排 + 字幕节奏
  ' setCanvasPointer: (typeof setCanvasPointer !== "undefined") ? setCanvasPointer : null,' +
  ' canvas: (typeof canvas !== "undefined") ? canvas : null,' +
  ' showNodeMap: (typeof showNodeMap !== "undefined") ? showNodeMap : null,' +
  ' TUTORIAL_NODEMAP: (typeof TUTORIAL_NODEMAP !== "undefined") ? TUTORIAL_NODEMAP : null,' +
  // v9.27 难度曲线改回全程指数 + 抬高三道撞顶闸门 + 前期普通怪再 −30%
  ' DIFF_BASE: (typeof DIFF_BASE !== "undefined") ? DIFF_BASE : null,' +
  ' DIFF_TAIL: (typeof DIFF_TAIL !== "undefined") ? DIFF_TAIL : null,' +
  ' EARLY_NORMAL_MUL: (typeof EARLY_NORMAL_MUL !== "undefined") ? EARLY_NORMAL_MUL : null,' +
  ' HP_OVERFLOW_GUARD: (typeof HP_OVERFLOW_GUARD !== "undefined") ? HP_OVERFLOW_GUARD : null,' +
  ' ATK_OVERFLOW_GUARD: (typeof ATK_OVERFLOW_GUARD !== "undefined") ? ATK_OVERFLOW_GUARD : null,' +
  ' BOSS_EARLY_MUL_START: (typeof BOSS_EARLY_MUL_START !== "undefined") ? BOSS_EARLY_MUL_START : null,' +
  ' formatDiff: (typeof formatDiff !== "undefined") ? formatDiff : null,' +
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

const { G, resetGame, update, draw, checkTrailLoop, nearestTurret, autoShoot } = api;
const { getEssenceCap, addCombatEssence, getMerchantStock, getShopRefreshCost,
        refreshMerchantStock, STAT_CHOICES, advanceFloor } = api;
const HAS_ECON = !!(getEssenceCap && addCombatEssence && getMerchantStock);
const { EFFECTS, addPassive } = api;
const HAS_FEEL = !!(EFFECTS && EFFECTS.some(e => e.id === 'E14'));
const { TRIGGERS: TRIG_, randomTrigger, doCombine, triggerEliminate, TURRET_SLOT_CHOICE } = api;
// 14 节要测的是「图腾上限 + 扩容」这套（9.21 起）。v9.25 把 T13 从触发板里拿掉了，
// 所以不能再拿 T13 当「这个版本有没有上限机制」的标志——改用扩容选项本身。
const HAS_CAP = !!(TRIG_ && TURRET_SLOT_CHOICE && randomTrigger && doCombine);
// T13 相关的断言（14d/14e/14f/14g/14h）只在还有 T13 的老版本上跑。
// v9.25 的那条路径搬到了第 19 节（按 R / 手机端圆钮）。
const HAS_T13 = !!(TRIG_ && TRIG_.some(t => t.id === 'T13'));
const { randomEffect, effectAoeTargets, nearestMonsterTo, EFFECT_AOE_RADIUS,
        getFloorClearCards, getBossHp, bossSummonInterval, spawnBoss, FIRE_TURRET_DMG_PER_FRAME } = api;
const HAS_V923 = !!(randomEffect && effectAoeTargets && getFloorClearCards && getBossHp && FIRE_TURRET_DMG_PER_FRAME);
const { AFFIXES, affixDef, pickAffixes, MONSTER_STAT_MUL, spawnMonster: spawnMonsterProbe,
        MONSTER_TYPES, getDifficultyMultiplier, getPlayerAtkZoneMul, getPlayerSpeedZoneMul,
        tickAffixes, onAffixCoreHit, onAffixDeath,
        isPassiveSealed, restartRunAfterTutorial, ENEMY_TOTEM_LIFE, ENEMY_TOTEM_RANGE,
        JOYSTICK, setDrawer, detectMobileMode, SEAL_FRAMES, TUTORIAL_OUTRO,
        updateSeals, spawnAffixFire, applyVortexPull, updateEnemyTotems } = api;
const HAS_V924 = !!(AFFIXES && AFFIXES.length === 14 && tickAffixes && getPlayerAtkZoneMul
                    && restartRunAfterTutorial && JOYSTICK && setDrawer);
const { AFFIX_ZONE_R_MUL, AFFIX_ZONE_MAX_PER_KIND, bossEarlyMul, BOSS_EARLY_RAMP_END,
        spawnAffixZone, tickAffixZones, getAffixZoneMul, getTurretAtkZoneMul, getTurretRateZoneMul,
        FIRE_ZONE_TICK, FIRE_ZONE_DMG_PER_TICK, ELIMINATE_COOLDOWN, tryEliminate, activateEliminate,
        TURRET_ATK_CEILING, TURRET_RATIO_NORM, PLAYER_FIRE_RATE_MUL,
        getPlayerAttackPower, getTurretAttackPower,
        setStickFromTouch, releaseStick, joyRadiusPx, syncGameOverUI, selectClass,
        START_CARDS, KILL_CARD_EVERY, KILL_CARD_CHANCE, BOSS_CARD_STEP,
        rollBossCardCount, grantCards, dropBalancedCard, registerKill,
        tickBossCardMilestones,
        setCanvasPointer, showNodeMap, TUTORIAL_NODEMAP,
        DIFF_BASE, DIFF_TAIL, EARLY_NORMAL_MUL, HP_OVERFLOW_GUARD, ATK_OVERFLOW_GUARD,
        BOSS_EARLY_MUL_START, formatDiff } = api;
const HAS_V925 = !!(bossEarlyMul && spawnAffixZone && tickAffixZones && tryEliminate
                    && getPlayerAttackPower && setStickFromTouch);
// v9.26：pointer-events 收敛到 setCanvasPointer() 这一个入口。
// 探针也要能跑在 9.25 及更早的产物上做对照，所以新断言全部挂在这个开关下。
const HAS_V926 = !!(setCanvasPointer && api.canvas);
// v9.27：难度曲线改回全程指数（底数 1.56），并抬高三道撞顶闸门。
// 判据用「新符号存在 + 多项式尾巴已删」两条一起——只看 DIFF_BASE 的话，
// 万一哪天有人把尾巴加回来，这个开关还是会亮。
// 注意 DIFF_TAIL 在工厂里被映射成 null（符号不存在时），所以这里判 !DIFF_TAIL
// 而不是 typeof ——对 null 做 typeof 得到的是 'object'，那个开关永远不亮。
const HAS_V927 = !!(DIFF_BASE && !DIFF_TAIL && EARLY_NORMAL_MUL
                    && HP_OVERFLOW_GUARD && ATK_OVERFLOW_GUARD && formatDiff);

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
  // 伤害来源跨版本换过一次：9.24 及更早读塔实例上的 `damage`（生成时的快照），
  // v9.25 起改成开火时按 `ratio`（= 类型权重 d × 尺寸 m）现算。两个字段都填上，
  // 这个计时用例才能在各个版本上都真的让塔开火——缺了哪个版本会算成 NaN。
  G.turrets = (() => { const a = []; for (let i = 0; i < 30; i++) a.push({ x: 390, y: 280, r: 14, type: 'basic', emoji: 'x', color: '#88aacc', fireRate: 1, fireTimer: 0, damage: 1, ratio: 30, range: 100000, hp: 1e9, maxHp: 1e9, tier: '中环', loopKey: 'k' + i, spawnAnim: 0 }); return a; })();
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
  // v9.25 起整体 ÷1.2（开火频率 +20%）：47.68 / 1.2 = 39.7333…
  const fireMul = (typeof PLAYER_FIRE_RATE_MUL === 'number') ? PLAYER_FIRE_RATE_MUL : 1;
  ok(Math.abs(G.player.shootCooldown - 47.68 / fireMul) < 1e-6,
     `1 层冷却 = max(24, 48-1×0.32) ÷ ${fireMul}`, `got ${G.player.shootCooldown}`);

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
  // v9.24: 范围从 90px 放大到 225px，B 必须挪到 225px 之外才测得出「范围外不受影响」
  const slowA = mkM(200, 200), slowB = mkM(720, 520);
  G.monsters = [slowA, slowB];
  addPassive('T06', 'E14');   // isInitial=true 只是登记，不触发（与 E13 一致）
  ok(slowA.slowTimer === 0, 'addPassive 只登记、不立即触发（isInitial 语义与 E13 一致）', `got ${slowA.slowTimer}`);
  api.triggerPassive('T06', slowA);  // T06 是高频触发 → 30 帧；A 是这次触发的靶心
  if (HAS_V923) {
    ok(slowA.slowTimer >= 29, '靶心挂上 slowTimer（T06 高频 → 30 帧）', `got ${slowA.slowTimer}`);
    ok(slowB.slowTimer === 0, '225px 外的怪不受影响（v9.24 范围 = 命中目标 + 225px）', `got ${slowB.slowTimer}`);
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

  // 14d 触发板表：老版本查 T13 的存在与权重；v9.25 起 T13 已移出，改查它确实不在了
  if (HAS_T13) {
    const t13 = TRIG_.find(t => t.id === 'T13');
    ok(!!t13, 'TRIGGERS 里有 T13「消除」');
    ok(t13 && t13.weight === 0.5, 'T13 权重 = 0.5（普通板的一半）', t13 && `got ${t13.weight}`);
  } else {
    ok(!TRIG_.some(t => t.id === 'T13'),
      'v9.25：TRIGGERS 里已经没有 T13（改成按 R 的技能）',
      TRIG_.map(t => t.id).join(','));
  }
  ok(TRIG_.filter(t => t.id === 'T12').length === 1, 'TRIGGERS 里 T12 不再重复',
    `got ${TRIG_.filter(t => t.id === 'T12').length} 条`);

  // 14e 权重真的生效：抽 60000 次，拿一块「权重 1」的板当标尺比次数。
  // （不能再用「总次数 - T13 次数」求均值——v9.23 起 T08 也有了权重 0.7。）
  const tally = {};
  for (let i = 0; i < 60000; i++) { const t = randomTrigger(); tally[t.id] = (tally[t.id] || 0) + 1; }
  const unit = tally[TRIG_.find(t => !t.weight).id];   // 权重 1 板的实测次数
  if (HAS_T13) {
    const r13 = (tally.T13 || 0) / unit;
    ok(r13 > 0.44 && r13 < 0.56, '实测 T13 抽中率 ≈ 权重 1 板的一半', `比值 ${r13.toFixed(3)}（期望 0.5）`);
  }
  if (HAS_V923) {
    const r08 = (tally.T08 || 0) / unit;
    ok(r08 > 0.64 && r08 < 0.76, '实测 T08 抽中率 ≈ 权重 1 板的 0.7（出率 -30%）',
      `比值 ${r08.toFixed(3)}（期望 0.7）`);
  }

  // 14f 宣读 T13：全场掉血 + 拆掉最早的一座，且不产生被动
  // v9.25 起没有 T13 这张卡了，这一段只服务于老版本；9.25 的对应路径在第 19 节。
  if (HAS_T13) {
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
    // v9.24: 教程收尾 = 清空重开，Tutorial.finished 会在同一次 update() 里被
    // resetGame() 打回 false，所以要认 restarted 这个信号（而不是 finished）。
    if (Tutorial.finished || Tutorial.restarted) break;
    if (G.gameOver) break;
  }

  ok(!G.gameOver, '5 层教程跑完没有 gameOver（核心没被打爆）');
  ok(Tutorial.restarted, `教程收尾后整局已重置（跑了 ${frames} 帧 ≈ ${(frames / 60).toFixed(0)} 秒）`);

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
  ok(Tutorial.seen === true, '教程结束后 seen = true（正式开局不再重播教程）');
  ok(Tutorial.active === false, '教程结束后 active = false');
  // v9.24: 教程是沙盒——播完必须清空一切、回到第 1 层、重选职业。
  ok(G.floor === 1, '教程结束后回到第 1 层（不再空降到第 6 层）', `got ${G.floor}`);
  ok(Object.keys(G.passives).length === 0, '教程里攒的被动已清空',
    `got ${Object.keys(G.passives).join(',')}`);
  ok(G.hand.length === 0, '教程里攒的密文版已清空', `got ${G.hand.length} 张`);
  ok(G.essence === 0 && G.score === 0, '教程里攒的精华与得分已清空',
    `精华 ${G.essence} / 得分 ${G.score}`);
  ok(G.selectingActive === true && G.paused === true,
    '教程结束后停在职业选择遮罩上（重选职业）');

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

  // ------------------------------------------------------------------
  // 16d v9.26：五块石板的选题与顺序 + 字幕节奏 3s ± 1s
  // ------------------------------------------------------------------
  if (!HAS_V926) {
    console.log('  （16d 跳过：这是 9.25 及更早的产物，教程顺序与节奏是 v9.26 才定的）');
  } else {
    // 选题与顺序：移动方式 → 图腾生成 → 密文版 → 敌人 → 核心
    const wantTitles = ['移动方式', '图腾生成', '密文版', '敌人', '核心'];
    const gotTitles = Object.keys(TUTORIAL_FLOORS)
      .sort((a, b) => a - b).map(f => TUTORIAL_FLOORS[f].title);
    ok(gotTitles.join(' → ') === wantTitles.join(' → '),
      '五块石板依次是 移动方式 → 图腾生成 → 密文版 → 敌人 → 核心', gotTitles.join(' → '));
    // 图腾排在密文版之前：这条顺序是有代价的（画圈出塔不能依赖任何卡牌），锁住它。
    const idxOf = (t) => gotTitles.indexOf(t);
    ok(idxOf('图腾生成') === 1 && idxOf('密文版') === 2,
      '图腾生成排在密文版之前（闭环召唤不依赖填牌，turType 默认 basic）');
    // 每块石板恰好 1 个开场横幅，否则第 16 节的「banner 不计入播报」就不成立了
    const badBanner = Object.keys(TUTORIAL_FLOORS).filter(f => TUTORIAL_FLOORS[f].steps[0].kind !== 'banner');
    ok(badBanner.length === 0, '每块石板的第一步都是章节横幅', badBanner.join(','));

    // 节奏：对每一条**由计时器驱动**的字幕（on: enter / after / map），
    // 它距离上一条的出现时刻 = 上一条.hold + 它自己的 d。
    // 用户要求 3s ± 1s ⇒ 必须落在 120 ~ 240 帧。
    const timed = new Set(['enter', 'after', 'map']);
    const badGap = [];
    const gaps = [];
    const scan = (name, cfg) => {
      const steps = (cfg && cfg.steps) || [];
      steps.forEach((s, i) => {
        if (i === 0 || !timed.has(s.on)) return;
        const prev = steps[i - 1];
        const gap = (prev.hold || 0) + (s.d || 0);
        gaps.push(gap);
        if (gap < 120 || gap > 240) badGap.push(`${name}#${i}=${gap}`);
      });
    };
    scan('层1', TUTORIAL_FLOORS[1]); scan('层2', TUTORIAL_FLOORS[2]);
    scan('层3', TUTORIAL_FLOORS[3]); scan('层4', TUTORIAL_FLOORS[4]);
    scan('层5', TUTORIAL_FLOORS[5]);
    scan('选路', TUTORIAL_NODEMAP); scan('收尾', TUTORIAL_OUTRO);
    ok(badGap.length === 0,
      `每条计时字幕距上一条 2~4 秒（3s ± 1s，共 ${gaps.length} 条）`, badGap.join(', '));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    ok(mean >= 150 && mean <= 210,
      `节奏均值 ≈ 3 秒（实测 ${(mean / 60).toFixed(2)}s，容差 ±0.5s）`, `mean=${mean.toFixed(1)} 帧`);
    ok(gaps.every(g => Number.isFinite(g) && g > 0), '每条字幕都有明确的 hold（没有落到 320 帧的默认值）');
    // 字幕自身的停留时间也不该超过 3 秒，否则「间隔 3 秒」自相矛盾
    const longHold = [];
    const scanHold = (name, cfg) => {
      ((cfg && cfg.steps) || []).forEach((s, i) => {
        if ((s.hold || 0) > 180) longHold.push(`${name}#${i}=${s.hold}`);
      });
    };
    scanHold('层1', TUTORIAL_FLOORS[1]); scanHold('层2', TUTORIAL_FLOORS[2]);
    scanHold('层3', TUTORIAL_FLOORS[3]); scanHold('层4', TUTORIAL_FLOORS[4]);
    scanHold('层5', TUTORIAL_FLOORS[5]);
    scanHold('选路', TUTORIAL_NODEMAP); scanHold('收尾', TUTORIAL_OUTRO);
    ok(longHold.length === 0, '没有一条字幕在屏幕上赖超过 3 秒', longHold.join(', '));
    // 节点地图的横幅不再写死层号——石板数量变了也不会对不上
    const nmBanner = (TUTORIAL_NODEMAP.steps || []).find(s => s.kind === 'banner');
    ok(nmBanner && !nmBanner.text,
      '选路横幅不写死「石板-5」（由 show() 按当前层自动拼）',
      nmBanner && nmBanner.text);
  }
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
  // v9.25 又叠了一层「前期减压」系数（1 层 ×0.5 → 20 层 ×1.0），所以这里比的是
  // 除掉那个系数之后的值——-10% 这条 9.23 的规则本身没动。
  fresh();
  const ramp = (typeof bossEarlyMul === 'function') ? bossEarlyMul : () => 1;
  const bossAt = (f) => { G.floor = f; return getBossHp(); };
  // 第 10 / 20 层恰好落在「难度系数为 1」的区间上，所以基准值可以直接乘减压系数比。
  ok(bossAt(10) === Math.floor(90000 * ramp()),
    '第 10 层 BOSS 血量 10 万 → 9 万（再乘 v9.25 前期减压）', `got ${bossAt(10)}`);
  ok(bossAt(20) === 153000, '第 20 层 17 万 → 15.3 万（20 层起减压系数为 1）', `got ${bossAt(20)}`);
  // Math.floor 会截掉浮点尾巴（0.9×2.89×10 万 = 260099.999…），差 1 属于正常
  ok(Math.abs(bossAt(30) - 260100) <= 1, '第 30 层 28.9 万 → ≈26.01 万', `got ${bossAt(30)}`);

  // 17d BOSS 召唤爪牙速率：9.23 +5%、9.24 再 +5%（累计 1.05² = 1.1025）
  ok(bossSummonInterval(100) === 91, 'bossSummonInterval(100) = 91（9.23 的 95 → 91）',
    `got ${bossSummonInterval(100)}`);
  ok(bossSummonInterval(150) === 136, 'bossSummonInterval(150) = 136', `got ${bossSummonInterval(150)}`);
  ok(bossSummonInterval(50) === 45, 'bossSummonInterval(50) = 45', `got ${bossSummonInterval(50)}`);
  fresh();
  G.floor = 1;
  spawnBoss();
  const bs = G.monsters.find(x => x.isBoss);
  const firstSummon = bossSummonInterval(100);
  ok(bs && bs.spawnTimer === firstSummon, `BOSS 首次召唤间隔 100 → ${firstSummon} 帧`,
    `got ${bs && bs.spawnTimer}`);
  if (bs) {
    // 跑满 firstSummon 帧刚好触发第一次召唤（初始 firstSummon → 最后一帧归零并重置）。
    // 多跑一帧就会被再减一次，读到的就不是重置值了。用变量而不是写死 95，
    // 免得下次再调速率时又要手改这个循环次数。
    for (let i = 0; i < firstSummon; i++) { G.frame = 100 + i; update(); }
    const want = bossSummonInterval(Math.max(50, 150 - G.floor * 2));
    ok(bs.spawnTimer === want,
      `召唤后重置到 max(50, 150-层数×2)/1.1025 = ${want}`, `got ${bs.spawnTimer}`);
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

  // 17f E13/E14 的作用范围 = 命中目标 + 225px（v9.24: 90 × 2.5）
  fresh();
  const t0 = mkM(300, 300);
  const near = mkM(300, 300 + EFFECT_AOE_RADIUS - 20);
  const farM = mkM(300, 300 + EFFECT_AOE_RADIUS + 60);
  G.monsters = [t0, near, farM];
  ok(EFFECT_AOE_RADIUS === 225, '范围半径 = 225px（9.23 的 90 → 225）',
    `got ${EFFECT_AOE_RADIUS}`);
  const tgt = effectAoeTargets(t0);
  ok(tgt.indexOf(t0) >= 0, '靶心自己在范围内');
  ok(tgt.indexOf(near) >= 0, '225px 内的怪被带上');
  ok(tgt.indexOf(farM) < 0, '225px 外的怪不受影响');
  // 9.23 的 90px 现在应当落在范围内——这就是这次放大要解决的问题
  const mid = mkM(300, 300 + 90);
  G.monsters = [t0, mid];
  ok(effectAoeTargets(t0).indexOf(mid) >= 0, '站在 90px 处的怪现在也能被带上（旧的边界）');
  G.monsters = [t0, near, farM];
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
  ok(codexAll.includes('225px'), '机制图鉴里写了 E13/E14 的 225px 范围');
}

// ---------- 18. v9.24 词条重做 · 怪物数值 · 手机端 · 教程沙盒 ----------
section('18. v9.24 14 个词条 · 怪 −20% · 手机端 · 教程沙盒');
if (!HAS_V924) {
  console.log('  （跳过：这是 9.23 及更早的产物）');
} else {
  // 带词条的测试怪：mkM 补上残影/区域钩子需要的字段
  function mkA(x, y, affixes) {
    const m = mkM(x, y);
    m.affixes = affixes.slice();
    m.maxHp = m.hp = 1000;
    m.scoreValue = 10;
    m._affixTimer = 0; m._dash = null; m._swarmCount = 0; m._affixZones = [];
    return m;
  }

  // 18a 词条池
  ok(AFFIXES.length === 14, '词条池 6 → 14', `got ${AFFIXES.length}`);
  const oldIds = ['regen', 'thorns', 'swift', 'giant', 'vampiric', 'explosive'];
  const newIds = ['weaken', 'slowzone', 'firezone', 'dash', 'vortex', 'seal', 'swarm', 'totem'];
  const missingOld = oldIds.filter(id => !affixDef(id));
  const missingNew = newIds.filter(id => !affixDef(id));
  ok(missingOld.length === 0, '原有 6 个词条一个没丢', missingOld.join(','));
  ok(missingNew.length === 0, '新增 8 个词条全部登记在册', missingNew.join(','));

  // 18b pickAffixes 的排除与数量（词条都有 minWave 门槛，先把楼层推到池子全开）
  // v9.25 起签名换成对象（多了一个 bossOnly 维度），老版本仍是位置参数。
  G.floor = 30;
  const picked = HAS_V925 ? pickAffixes(2, { exclude: ['dash', 'swarm'], bossOnly: 'any' })
                          : pickAffixes(2, ['dash', 'swarm']);
  ok(picked.length === 2, 'pickAffixes(2) 恰好给 2 个', `got ${picked.length}`);
  ok(picked.indexOf('dash') < 0 && picked.indexOf('swarm') < 0,
    '排除列表里的词条不会被抽中', picked.join(','));
  ok(picked.every(id => !!affixDef(id)), '抽出来的都是真实词条 id', picked.join(','));

  // 18c 普通怪 HP 与攻击 ×0.8（v9.27 起，前期还要再乘 EARLY_NORMAL_MUL）
  ok(MONSTER_STAT_MUL === 0.8, 'MONSTER_STAT_MUL = 0.8', `got ${MONSTER_STAT_MUL}`);
  fresh();
  G.floor = 5;
  G.monsters = [];
  spawnMonsterProbe({ key: 'basic', elite: false });
  const mm = G.monsters[0];
  const bType = MONSTER_TYPES.BASIC;
  const diff5 = getDifficultyMultiplier();
  const early5 = HAS_V927 ? EARLY_NORMAL_MUL : 1;   // 第 5 层 < 30，普通怪吃这一项
  const wantHp = (bType.baseHp + bType.hpScale) * diff5 * MONSTER_STAT_MUL * early5;
  ok(mm && Math.abs(mm.hp - wantHp) < 1e-6,
    `普通怪 HP = (base + scale) × 难度 × 0.8${HAS_V927 ? ' × 0.7' : ''}`,
    `got ${mm && mm.hp}，期望 ${wantHp}`);
  // v9.27: 攻击的 12 倍安全阀撤掉了（第 17 层就会撞上它）；老版本仍在。
  const atkGate = HAS_V927 ? Infinity : 12;
  const wantAtk = (bType.baseAtk + bType.atkScale)
                * Math.min(Math.pow(diff5, 0.35), atkGate) * MONSTER_STAT_MUL * early5;
  const wantAtkFinal = HAS_V927 ? wantAtk : Math.min(wantAtk, 120);
  ok(mm && Math.abs(mm.atk - wantAtkFinal) < 1e-6,
    `普通怪攻击同样 ×0.8${HAS_V927 ? ' × 0.7' : ''}`, `got ${mm && mm.atk}，期望 ${wantAtkFinal}`);

  // 18d BOSS 恰好带 2 个词条，且不抽「对它无意义」的突进 / 群生
  let bossBad = 0, bossCounts = {};
  for (let i = 0; i < 200; i++) {
    fresh();
    G.floor = 30;
    G.monsters = [];
    spawnBoss();
    const b = G.monsters.find(x => x.isBoss);
    if (!b) { bossBad++; continue; }
    bossCounts[b.affixes.length] = (bossCounts[b.affixes.length] || 0) + 1;
    if (b.affixes.indexOf('dash') >= 0 || b.affixes.indexOf('swarm') >= 0) bossBad++;
    if (!b.affixes.every(id => !!affixDef(id))) bossBad++;
  }
  ok(bossCounts[2] === 200, '200 次生成里 BOSS 都是恰好 2 个词条',
    JSON.stringify(bossCounts));
  ok(bossBad === 0, 'BOSS 不会抽到突进 / 群生，也不会有假词条', `异常 ${bossBad} 次`);

  // 18e 🟥削减区：站进圈里子弹伤害打折
  // v9.25 之前：圈挂在怪身上，判定的主体是「怪在哪」。
  // v9.25 起：圈落在场上（G.affixZones），与怪解绑，判定主体是「圈在哪」。
  fresh();
  if (HAS_V925) {
    const mkZone = (kind, x, y) => {
      const def = affixDef(kind);
      const cfg = def.zone || def.fireZone;
      const r = cfg.r * AFFIX_ZONE_R_MUL;
      G.affixZones.push({ x, y, r, kind, cfg, color: def.color,
        life: cfg.life, maxLife: cfg.life, tick: 0 });
      return G.affixZones[G.affixZones.length - 1];
    };
    G.affixZones.length = 0;
    mkZone('weaken', 300, 300);
    G.player.x = 340; G.player.y = 300;
    ok(Math.abs(getPlayerAtkZoneMul() - 0.6) < 1e-9, '站在削减圈里攻击 ×0.6',
      `got ${getPlayerAtkZoneMul()}`);
    G.player.x = 300 + 100 * AFFIX_ZONE_R_MUL + 40; G.player.y = 300;
    ok(getPlayerAtkZoneMul() === 1, '走出圈外攻击恢复 ×1', `got ${getPlayerAtkZoneMul()}`);
  } else {
    G.monsters = [mkA(300, 300, ['weaken'])];
    G.player.x = 340; G.player.y = 300;
    ok(Math.abs(getPlayerAtkZoneMul() - 0.6) < 1e-9, '站在削减区里攻击 ×0.6',
      `got ${getPlayerAtkZoneMul()}`);
    G.player.x = 700; G.player.y = 520;
    ok(getPlayerAtkZoneMul() === 1, '走出圈外攻击恢复 ×1', `got ${getPlayerAtkZoneMul()}`);
  }

  // 18f 🟦减速区：两个圈重叠取最强，不连乘
  fresh();
  if (HAS_V925) {
    const mkZone2 = (kind, x, y) => {
      const def = affixDef(kind);
      const cfg = def.zone || def.fireZone;
      G.affixZones.push({ x, y, r: cfg.r * AFFIX_ZONE_R_MUL, kind, cfg, color: def.color,
        life: cfg.life, maxLife: cfg.life, tick: 0 });
    };
    G.affixZones.length = 0;
    mkZone2('slowzone', 300, 300); mkZone2('slowzone', 320, 300);
    G.player.x = 330; G.player.y = 300;
    ok(Math.abs(getPlayerSpeedZoneMul() - 0.65) < 1e-9,
      '两个减速圈重叠仍是 ×0.65（取最强而非连乘 0.4225）', `got ${getPlayerSpeedZoneMul()}`);
    G.player.x = 720; G.player.y = 30;
    ok(getPlayerSpeedZoneMul() === 1, '走出圈外移速恢复 ×1', `got ${getPlayerSpeedZoneMul()}`);
  } else {
    G.monsters = [mkA(300, 300, ['slowzone']), mkA(320, 300, ['slowzone'])];
    G.player.x = 330; G.player.y = 300;
    ok(Math.abs(getPlayerSpeedZoneMul() - 0.65) < 1e-9,
      '两只减速区重叠仍是 ×0.65（取最强而非连乘 0.4225）', `got ${getPlayerSpeedZoneMul()}`);
    G.player.x = 720; G.player.y = 30;
    ok(getPlayerSpeedZoneMul() === 1, '走出圈外移速恢复 ×1', `got ${getPlayerSpeedZoneMul()}`);
  }

  // 18g 🔥火焰区
  fresh();
  if (HAS_V925) {
    // 不再是「脚下留一条 16px 火轨迹」，而是「在 BOSS 附近落一个 135px 的火圈」
    const zfc = mkA(300, 300, ['firezone']);
    G.monsters = [zfc];
    G.fireTrails = [];
    G.affixZones.length = 0;
    for (let i = 0; i < 299; i++) tickAffixes(zfc);
    ok(G.affixZones.length === 0, '不到 300 帧不落圈（节流生效）', `got ${G.affixZones.length}`);
    tickAffixes(zfc);
    ok(G.affixZones.length === 1, '第 300 帧落下一个火圈', `got ${G.affixZones.length}`);
    const fz = G.affixZones[0];
    ok(fz && fz.kind === 'firezone', '落的圈是火属性', `got ${fz && fz.kind}`);
    ok(!!fz && Math.abs(fz.r - 90 * AFFIX_ZONE_R_MUL) < 1e-9,
      `火圈半径 = 90 × ${AFFIX_ZONE_R_MUL} = 135`, `got ${fz && fz.r}`);
    ok(G.fireTrails.length === 0, '不再往地上留火轨迹', `got ${G.fireTrails.length}`);
  } else {
    const zf = mkA(300, 300, ['firezone']);
    G.monsters = [zf];
    G.fireTrails = [];
    for (let i = 0; i < 239; i++) tickAffixes(zf);
    ok(G.fireTrails.length === 0, '不到 240 帧不点火（节流生效）', `got ${G.fireTrails.length}`);
    tickAffixes(zf);
    ok(G.fireTrails.length === 1, '第 240 帧在脚下留下一条火焰', `got ${G.fireTrails.length}`);
    const ft = G.fireTrails[0];
    ok(ft && Math.abs(Math.hypot(ft.x2 - ft.x1, ft.y2 - ft.y1) - 16) < 1e-6,
      '留下的火焰是一段有长度的轨迹（能被判环逻辑看见）',
      `got ${ft && Math.hypot(ft.x2 - ft.x1, ft.y2 - ft.y1).toFixed(2)}`);
  }

  // 18h 🌀突进：每 180 帧朝玩家冲一段，冰冻时不发动
  fresh();
  const zd = mkA(300, 300, ['dash']);
  G.monsters = [zd];
  G.player.x = 700; G.player.y = 300;
  const dBefore = Math.hypot(zd.x - G.player.x, zd.y - G.player.y);
  for (let i = 0; i < 180; i++) tickAffixes(zd);
  ok(!!zd._dash, '第 180 帧起手突进（_dash 挂上）', `got ${String(zd._dash)}`);
  for (let i = 0; i < 12; i++) tickAffixes(zd);
  const dAfter = Math.hypot(zd.x - G.player.x, zd.y - G.player.y);
  ok(zd.x > 300 + 60, '12 帧插值推进了实打实的一段距离', `x ${zd.x.toFixed(1)}`);
  ok(dAfter < dBefore - 60, '突进后离玩家明显更近', `${dBefore.toFixed(1)} → ${dAfter.toFixed(1)}`);
  ok(zd._dash === null, '插值帧数走完自动收手（不会一直飘）', `got ${String(zd._dash)}`);

  fresh();
  const zfz = mkA(300, 300, ['dash']);
  zfz.frozen = 1e9;
  G.monsters = [zfz];
  for (let i = 0; i < 200; i++) tickAffixes(zfz);
  ok(zfz._dash === null, '冰冻期间突进整个停摆', `got ${String(zfz._dash)}`);

  // 18i 🌪牵引：圈内被拽向怪物，圈外不管
  fresh();
  G.monsters = [mkA(300, 300, ['vortex'])];
  G.player.x = 400; G.player.y = 300;
  applyVortexPull(G.player);
  ok(G.player.x < 400 && G.player.x > 300, '圈内被往怪物那边拉',
    `x ${G.player.x.toFixed(2)}`);
  G.player.x = 700; G.player.y = 300;
  applyVortexPull(G.player);
  ok(G.player.x === 700, '圈外（>160px）一点不受影响', `x ${G.player.x}`);

  // 18j 🔒封印：撞核心压住一个被动 4 秒，期间该组合整条失效
  fresh();
  api.simAutoSelectClass();
  G.passives = {};
  addPassive('T06', 'E13');
  const zs = mkA(90, 90, ['seal']);
  G.sealedPassives = [];
  onAffixCoreHit(zs);
  ok(G.sealedPassives.length === 1, '封印住了恰好一个被动', `got ${G.sealedPassives.length}`);
  ok(isPassiveSealed('T06', 'E13') === true, 'isPassiveSealed 认得出被压的组合');
  ok(G.sealedPassives[0] && G.sealedPassives[0].timer === SEAL_FRAMES,
    `封印时长 = ${SEAL_FRAMES} 帧（4 秒）`, `got ${G.sealedPassives[0] && G.sealedPassives[0].timer}`);
  const zt = mkM(300, 300);
  G.monsters = [zt];
  api.triggerPassive('T06', zt);
  ok(zt.frozen === 0, '被封印的组合触发时是空操作（E13 没冻住怪）', `got ${zt.frozen}`);
  for (let i = 0; i < SEAL_FRAMES; i++) updateSeals();
  ok(G.sealedPassives.length === 0, '4 秒后封印自然解除', `got ${G.sealedPassives.length}`);

  // 18k 👥群生：每 360 帧分裂出 20% HP 的残影，残影不再带词条
  fresh();
  const zsw = mkA(300, 300, ['swarm']);
  G.monsters = [zsw];
  G.monstersToSpawn = 0;
  for (let i = 0; i < 360; i++) tickAffixes(zsw);
  ok(G.monsters.length === 2, '第 360 帧分裂出一只残影', `got ${G.monsters.length}`);
  const clone = G.monsters[1];
  ok(clone && clone.isChild === true, '残影标记为子体');
  ok(clone && Math.abs(clone.maxHp - zsw.maxHp * 0.20) < 1e-9,
    '残影血量 = 母体上限的 20%', `got ${clone && clone.maxHp}，期望 ${zsw.maxHp * 0.2}`);
  ok(clone && clone.affixes.length === 0, '残影不带词条（否则会指数扩散）',
    `got ${clone && clone.affixes.join(',')}`);
  ok(zsw._swarmCount === 1, '母体记下已分裂 1 只（受上限 3 约束）', `got ${zsw._swarmCount}`);

  // 18l 🗿敌图腾：死亡后原地留下，12 秒后熄灭
  fresh();
  G.enemyTotems = [];
  const zt2 = mkA(80, 500, ['totem']);
  onAffixDeath(zt2);
  ok(G.enemyTotems.length === 1, '带敌图腾的怪死后留下 1 座图腾', `got ${G.enemyTotems.length}`);
  ok(G.enemyTotems[0] && G.enemyTotems[0].life === ENEMY_TOTEM_LIFE,
    `图腾寿命 = ${ENEMY_TOTEM_LIFE} 帧（12 秒）`, `got ${G.enemyTotems[0] && G.enemyTotems[0].life}`);
  // v9.25: 200 → 120。要在玩家图腾最短射程（速射 120）之内，否则敌图腾永远站外线白打。
  ok(ENEMY_TOTEM_RANGE === (HAS_V925 ? 120 : 200),
    `索敌半径 ${HAS_V925 ? 120 : 200}px`, `got ${ENEMY_TOTEM_RANGE}`);
  G.player.x = 760; G.player.y = 20;   // 站远点，别被顺手打到
  for (let i = 0; i < ENEMY_TOTEM_LIFE; i++) updateEnemyTotems();
  ok(G.enemyTotems.length === 0, '寿命走完后图腾熄灭', `got ${G.enemyTotems.length}`);

  // 18m 换层时敌图腾与封印都清干净
  fresh();
  api.simAutoSelectClass();
  G.enemyTotems.push({ x: 10, y: 10, r: 15, life: 720, maxLife: 720, fireTimer: 30, _lastFire: 0 });
  G.sealedPassives.push({ tid: 'T06', eid: 'E13', timer: 240 });
  api.startFloor();
  ok(G.enemyTotems.length === 0, '开始新一层时敌图腾被清空', `got ${G.enemyTotems.length}`);
  ok(G.sealedPassives.length === 0, '开始新一层时封印被清空', `got ${G.sealedPassives.length}`);

  // 18n 教程沙盒：收尾后清空一切、重选职业、回到第 1 层
  fresh();
  api.simAutoSelectClass();
  G.floor = 5;
  G.hand = [{ id: 'x' }];
  G.essence = 99; G.score = 888;
  addPassive('T06', 'E13');
  Tutorial.pendingRestart = true;
  restartRunAfterTutorial();
  ok(G.floor === 1, '教程结束后回到第 1 层', `got ${G.floor}`);
  ok(Object.keys(G.passives).length === 0, '被动清空', `got ${Object.keys(G.passives).join(',')}`);
  ok(G.hand.length === 0, '手牌清空', `got ${G.hand.length}`);
  ok(G.essence === 0 && G.score === 0, '精华与得分清零', `${G.essence} / ${G.score}`);
  ok(G.selectingActive === true, '停在职业选择遮罩上（重选职业）');
  ok(Tutorial.seen === true, 'seen 仍为 true —— 重开不会再播一遍教程');
  ok(Tutorial.restarted === true, 'reset() 之后 restarted 被重新置真（探针的收尾信号）');

  // 18o 教程收尾字幕里说清了「清空重来」
  const outroText = ((TUTORIAL_OUTRO && TUTORIAL_OUTRO.steps) || []).map(s => s.text || '').join('\n');
  ok(outroText.includes('清空') && outroText.includes('职业'),
    '收尾字幕交代了清空教程所得并重选职业');

  // 18p 手机端识别：探针的假 window 没有 matchMedia，必须带守卫而不是崩掉
  let devOk = true, devVal = null;
  try { devVal = detectMobileMode(); } catch (e) { devOk = false; }
  ok(devOk, 'detectMobileMode() 在缺少 matchMedia 的环境里不抛异常');
  ok(devVal === false, '桌面（userAgent = node）识别为非手机', `got ${String(devVal)}`);
  // v9.25 摇杆改成动态底座：写死的 x/y 整个删掉，只剩半径（单位也从 canvas 像素
  // 换成了 CSS 像素，因为摇杆改成 DOM 绘制）。老版本仍应带着 x/y。
  ok(JOYSTICK && JOYSTICK.r > 0
     && (HAS_V925 ? JOYSTICK.x === undefined && JOYSTICK.y === undefined
                  : JOYSTICK.x > 0 && JOYSTICK.y > 0),
    '摇杆几何参数已定义（v9.25 只留半径，底座改成按下即生成）', JSON.stringify(JOYSTICK));

  // 18q 抽屉开合驱动全局子弹时间
  fresh();
  G.timeScale = 1;
  setDrawer(true);
  ok(G.timeScale === 0.5, '抽屉打开 → 全局时间 ×0.5（子弹时间）', `got ${G.timeScale}`);
  ok(G.drawerOpen === true, 'drawerOpen 同步置真');
  setDrawer(false);
  ok(G.timeScale === 1, '抽屉收起 → 时间恢复 ×1', `got ${G.timeScale}`);
  ok(G.drawerOpen === false, 'drawerOpen 同步置假');
}

// ---------- 19. v9.25 BOSS 专属词条 · 圈层落点 · 消除技能化 · 手机端输入 ----------
section('19. v9.25 BOSS 专属词条 · 圈层落点 · 消除技能化 · 手机端输入');
if (!HAS_V925) {
  console.log('  （跳过：这是 9.24 及更早的产物）');
} else {
  const OLD_IDS = ['regen', 'thorns', 'swift', 'giant', 'vampiric', 'explosive'];

  // 19a 词条分两组：老 6 条给精英，新 8 条是 BOSS 专属
  ok(AFFIXES.filter(a => a.bossOnly).length === 8, '恰好 8 条被标成 bossOnly',
    `got ${AFFIXES.filter(a => a.bossOnly).length}`);
  ok(OLD_IDS.every(id => { const d = affixDef(id); return d && !d.bossOnly; }),
    '原来那 6 条一条都没被标成 bossOnly');

  // 19b 精英只抽非 bossOnly —— 跑 500 次，8 个新 id 一次都不许出现
  // 这是「新词条变 BOSS 专属」这条需求最直接的回归防线。
  G.floor = 40;   // 门槛全开，排除「抽不到是因为层数不够」
  let leaked = [];
  for (let i = 0; i < 500; i++) {
    const p = pickAffixes(3, { bossOnly: false });
    for (const id of p) {
      const d = affixDef(id);
      if (!d || d.bossOnly) leaked.push(id);
    }
  }
  ok(leaked.length === 0, '精英 500 次抽取里一条 bossOnly 都没漏出来',
    leaked.slice(0, 5).join(','));
  // 反向：只要 bossOnly 的那些
  let bossOnlyOk = true;
  for (let i = 0; i < 200; i++) {
    for (const id of pickAffixes(2, { bossOnly: true })) {
      const d = affixDef(id);
      if (!d || !d.bossOnly) bossOnlyOk = false;
    }
  }
  ok(bossOnlyOk, 'bossOnly: true 只从 8 条专属里抽');
  // 默认（不传 bossOnly）：两边都能出
  let sawBoth = { old: false, neu: false };
  for (let i = 0; i < 200; i++) {
    for (const id of pickAffixes(3, { bossOnly: 'any' })) {
      const d = affixDef(id);
      if (d && d.bossOnly) sawBoth.neu = true; else sawBoth.old = true;
    }
  }
  ok(sawBoth.old && sawBoth.neu, 'bossOnly: "any" 两组都能抽到', JSON.stringify(sawBoth));

  // 19c BOSS 前期数值：1 层起线性爬到 20 层 ×1.0，之后恒 ×1.0。
  // v9.27 把起点从 ×0.5 压到 ×0.35（第 1 层正好 −30%，第 20 层归零）。
  const rampStart = HAS_V927 ? BOSS_EARLY_MUL_START : 0.5;
  const rampAt = (f) => { G.floor = f; return bossEarlyMul(); };
  fresh();
  ok(Math.abs(rampAt(1) - rampStart) < 1e-12,
    `第 1 层 ×${rampStart}`, `got ${rampAt(1)}`);
  ok(Math.abs(rampAt(10) - (rampStart + (1 - rampStart) * 9 / 19)) < 1e-9,
    HAS_V927 ? '第 10 层 ≈ ×0.6579（线性，不是断崖）' : '第 10 层 ≈ ×0.7368（线性，不是断崖）',
    `got ${rampAt(10).toFixed(4)}`);
  ok(Math.abs(rampAt(20) - 1) < 1e-12, '第 20 层 ×1.0', `got ${rampAt(20)}`);
  ok(Math.abs(rampAt(30) - 1) < 1e-12, '第 30 层仍是 ×1.0（20 层封顶）', `got ${rampAt(30)}`);
  ok(BOSS_EARLY_RAMP_END === 20, '爬坡到第 20 层结束', `got ${BOSS_EARLY_RAMP_END}`);

  // 19d 落地到 getBossHp()：第 10 层底数 9 万（v9.23 定的值），再乘前期减压系数
  G.floor = 10;
  const hp10 = getBossHp();
  ok(Math.abs(hp10 - 90000 * bossEarlyMul()) <= 1,
    `第 10 层 BOSS 血量 = 9万 × ${bossEarlyMul().toFixed(4)} ≈ ${Math.round(90000 * bossEarlyMul())}`,
    `got ${Math.round(hp10)}`);
  G.floor = 1;
  const hp1 = getBossHp();
  G.floor = 30;
  const hp30 = getBossHp();
  // 爬坡是乘在原有难度曲线上的，所以「越靠前越软」这个方向必须成立。
  // （20 层那道 1.7 倍是 v9.15 起就有的「每 10 层 BOSS 跳一档」，不是本次改的，
  //   本次只保证 1→20 层是自己乘自己的线性爬坡，见 19c。）
  ok(hp1 < hp10 && hp10 < hp30, '血量随层数单调上升',
    `${Math.round(hp1)} → ${Math.round(hp10)} → ${Math.round(hp30)}`);

  // 19e BOSS 横幅：生成后带 5 秒倒计时，文案里念出了抽到的词条
  fresh();
  G.floor = 30;
  G.monsters = [];
  spawnBoss();
  const boss = G.monsters.find(m => m.isBoss);
  ok(!!G.bossBanner, 'spawnBoss() 之后 G.bossBanner 非空');
  ok(G.bossBanner && G.bossBanner.life === 300 && G.bossBanner.maxLife === 300,
    '横幅停留 300 帧（5 秒）', `got ${G.bossBanner && G.bossBanner.life}`);
  ok(!!boss && G.bossBanner && boss.affixes.every(id => {
      const d = affixDef(id);
      return d && G.bossBanner.text.indexOf(d.label) >= 0;
    }), '横幅文案包含这一局抽到的每个词条的 label',
    G.bossBanner && G.bossBanner.text);
  let frames = 0; while (G.bossBanner && frames < 1000) { if (--G.bossBanner.life <= 0) G.bossBanner = null; frames++; }
  ok(G.bossBanner === null && frames === 300, '300 帧后横幅自动消失', `${frames} 帧`);

  // 19f 圈层落点：与 BOSS 解绑，落在 [r*1.2, spawnRange] 的距离上
  ok(Math.abs(AFFIX_ZONE_R_MUL - 1.5) < 1e-12, '半径放大倍数 = 1.5', `got ${AFFIX_ZONE_R_MUL}`);
  ok(AFFIX_ZONE_MAX_PER_KIND === 3, '同属性同屏上限 3 个', `got ${AFFIX_ZONE_MAX_PER_KIND}`);
  fresh();
  const zb = mkM(400, 280);
  zb.affixes = ['weaken'];
  zb.maxHp = zb.hp = 1000;
  zb._affixTimer = 0; zb._dash = null; zb._swarmCount = 0; zb._affixZones = [];
  const zoneCfg = affixDef('weaken').zone;
  ok(!!zoneCfg && zoneCfg.every === 300 && zoneCfg.spawnRange === 300 && zoneCfg.life === 360,
    '削减圈参数：每 300 帧落一个、范围 300px、活 360 帧', JSON.stringify(zoneCfg));
  G.affixZones.length = 0;
  for (let i = 0; i < 299; i++) tickAffixes(zb);
  ok(G.affixZones.length === 0, '不到 300 帧不落圈', `got ${G.affixZones.length}`);
  tickAffixes(zb);
  ok(G.affixZones.length === 1, '第 300 帧落下一个圈', `got ${G.affixZones.length}`);
  const z0 = G.affixZones[0];
  const dToBoss = Math.hypot(z0.x - zb.x, z0.y - zb.y);
  ok(dToBoss >= zoneCfg.r * AFFIX_ZONE_R_MUL * 1.2 - 1e-6 && dToBoss <= zoneCfg.spawnRange + 1e-6,
    '落点与 BOSS 的距离在 [r×1.2, 300] 内（不会落在脚下）', `got ${dToBoss.toFixed(1)}`);
  ok(Math.abs(z0.r - 100 * AFFIX_ZONE_R_MUL) < 1e-9, '削减圈半径 = 100 × 1.5 = 150', `got ${z0.r}`);
  ok(z0.x >= 20 && z0.x <= 760 && z0.y >= 20 && z0.y <= 540, '落点被夹在战场内',
    `(${z0.x.toFixed(1)}, ${z0.y.toFixed(1)})`);

  // 19g 圈活满 360 帧自己消失
  const before2 = G.affixZones.length;
  for (let i = 0; i < 360; i++) tickAffixZones();
  ok(G.affixZones.length === 0, '360 帧后圈自动消失', `${before2} → ${G.affixZones.length}`);

  // 19h 同属性同屏最多 3 个
  fresh();
  const zc = mkM(400, 280);
  zc.affixes = ['weaken'];
  zc.maxHp = zc.hp = 1e6;
  zc._affixTimer = 0; zc._dash = null; zc._swarmCount = 0; zc._affixZones = [];
  G.affixZones.length = 0;
  for (let i = 0; i < 300 * 8; i++) tickAffixes(zc);
  const sameKind = G.affixZones.filter(z => z.kind === 'weaken').length;
  ok(sameKind <= AFFIX_ZONE_MAX_PER_KIND, `同屏削减圈不超过 ${AFFIX_ZONE_MAX_PER_KIND} 个`,
    `got ${sameKind}`);

  // 19i 火圈扣护盾：每 FIRE_ZONE_TICK 帧 1 点，走的是和「怪撞核心」同一套结算
  fresh();
  G.core.hp = G.core.maxHp = 100;
  G.player.hp = 100; G.player.maxHp = 100;
  G.affixZones.length = 0;
  G.affixZones.push({ x: G.player.x, y: G.player.y, r: 135, kind: 'firezone',
    cfg: affixDef('firezone').fireZone, color: '#ff6622', life: 9999, maxLife: 9999, tick: 0 });
  const hpBefore = G.player.hp;
  const N = 10;
  for (let i = 0; i < FIRE_ZONE_TICK * N; i++) tickAffixZones();
  const lost = hpBefore - G.player.hp;
  ok(Math.abs(lost - N * FIRE_ZONE_DMG_PER_TICK) < 1e-9,
    `站在火圈里 ${FIRE_ZONE_TICK * N} 帧掉 ${N * FIRE_ZONE_DMG_PER_TICK} 点护盾`,
    `掉了 ${lost}`);
  // 走远一点就不再掉血
  const hpFar = G.player.hp;
  G.player.x = G.affixZones[0].x + 1000;
  for (let i = 0; i < FIRE_ZONE_TICK * N; i++) tickAffixZones();
  ok(G.player.hp === hpFar, '走出火圈就不再掉血', `${hpFar} → ${G.player.hp}`);

  // 19j 图腾吃圈：削减圈削单发伤害、减速圈削攻速
  fresh();
  const tw = { x: 300, y: 300, r: 14, type: 'basic', emoji: 'x', color: '#fff',
    fireRate: 25, fireTimer: 0, range: 140, hp: 99, maxHp: 99, tier: '中环', loopKey: 'k', spawnAnim: 0 };
  G.affixZones.length = 0;
  ok(getTurretAtkZoneMul(tw) === 1 && getTurretRateZoneMul(tw) === 1, '没圈的时候图腾不受影响');
  G.affixZones.push({ x: 300, y: 300, r: 150, kind: 'weaken',
    cfg: affixDef('weaken').zone, color: '#ff4455', life: 9999, maxLife: 9999, tick: 0 });
  G.affixZones.push({ x: 300, y: 300, r: 135, kind: 'slowzone',
    cfg: affixDef('slowzone').zone, color: '#4488ff', life: 9999, maxLife: 9999, tick: 0 });
  ok(Math.abs(getTurretAtkZoneMul(tw) - 0.6) < 1e-9, '图腾在削减圈里：单发伤害 ×0.6',
    `got ${getTurretAtkZoneMul(tw)}`);
  ok(Math.abs(getTurretRateZoneMul(tw) - 0.65) < 1e-9, '图腾在减速圈里：出手速度 ×0.65',
    `got ${getTurretRateZoneMul(tw)}`);
  tw.x = 760; tw.y = 540;
  ok(getTurretAtkZoneMul(tw) === 1 && getTurretRateZoneMul(tw) === 1, '图腾挪出圈外就恢复正常');

  // 19k 图腾攻击力：上限 = 玩家攻击力 × 1.0，按旧 d×m 比例分配
  ok(Math.abs(TURRET_ATK_CEILING - 1.0) < 1e-12, 'TURRET_ATK_CEILING = 1.0',
    `got ${TURRET_ATK_CEILING}`);
  ok(TURRET_RATIO_NORM === 75, 'TURRET_RATIO_NORM = 50 × 1.5 = 75', `got ${TURRET_RATIO_NORM}`);
  fresh();
  api.simAutoSelectClass();
  G.player.atk = 10; G.buffs.atkUp = 0; G.buffs.multUp = 0;
  G.fateBuffs.atkMul = 1; G.fateBuffs.bulletDmgMul = 1;
  const pAtk1 = getPlayerAttackPower();
  G.player.atk = 50;
  const pAtk2 = getPlayerAttackPower();
  ok(Math.abs(pAtk2 / pAtk1 - 5) < 1e-9, '面板攻击涨 5 倍，基准威力跟着涨 5 倍',
    `${pAtk1.toFixed(2)} → ${pAtk2.toFixed(2)}`);
  // 归一化到最大的一座：大环闪电（ratio = 50 × 1.5 = 75）正好顶到 1.0 倍
  ok(Math.abs(getTurretAttackPower({ ratio: 50 * 1.5 }) - pAtk2 * 1.0) < 1e-9,
    '大环闪电 = 玩家攻击力 × 1.0（上限）',
    `got ${getTurretAttackPower({ ratio: 75 }).toFixed(3)}，期望 ${(pAtk2 * 1.0).toFixed(3)}`);
  ok(getTurretAttackPower({ ratio: 75 }) > getTurretAttackPower({ ratio: 45 }),
    '大环闪电 > 大环基础塔（类型权重生效）');
  ok(getTurretAttackPower({ ratio: 30 }) > getTurretAttackPower({ ratio: 18 }),
    '中环基础塔 > 中环速射塔（类型权重生效）');
  ok(Math.abs(getTurretAttackPower({ ratio: 30 }) - pAtk2 * 1.0 * 30 / 75) < 1e-9,
    '中环基础塔 = 上限 × 30/75 = 0.4 倍玩家攻击力',
    `got ${getTurretAttackPower({ ratio: 30 }).toFixed(3)}`);
  // 真的走一遍图腾开火：造一座中环基础塔（ratio = 30 × 1.0）、放一只怪，跑够一个冷却周期
  const T = { x: 400, y: 280, r: 14, type: 'basic', emoji: '🗼', color: '#88aacc',
    fireRate: 25, fireTimer: 24, range: 140, ratio: 30, hp: 99, maxHp: 99, tier: '中环', loopKey: 'k2', spawnAnim: 0 };
  G.turrets = [T];
  G.monsters = [mkM(430, 280)];
  G.monsters[0].hp = G.monsters[0].maxHp = 1e6;
  const mHpBefore = G.monsters[0].hp;
  update();
  const dealt = mHpBefore - G.monsters[0].hp;
  const expectTurret = pAtk2 * 1.0 * 30 / 75;
  ok(Math.abs(dealt - expectTurret) < 1e-6,
    '图腾单发伤害 = 玩家攻击力 × 1.0 × ratio/75',
    `got ${dealt.toFixed(3)}，期望 ${expectTurret.toFixed(3)}`);
  // 削减圈不会让塔突破上限，只会往下削
  ok(getTurretAttackPower({ ratio: 75 }) * 0.6 < getTurretAttackPower({ ratio: 75 }),
    '削减圈只削不涨（上限不会被圈层抬高）');
  // 怪物的敌对建筑（🗿 敌图腾）**单独算**：把玩家攻击力拉满，跑一轮敌图腾开火，
  // 掉血量必须还是 3 + f × 0.2。真跑一遍而不是比两次同一条表达式。
  fresh();
  api.simAutoSelectClass();
  G.floor = 1;
  G.player.x = 400; G.player.y = 280; G.player.hp = 5000; G.player.maxHp = 5000;
  G.turrets = [];
  G.enemyTotems = [{ x: 460, y: 280, r: 15, life: 720, maxLife: 720, fireTimer: 1, _lastFire: 0 }];
  const hpBeforeET = G.player.hp;
  updateEnemyTotems();
  const etDealt = hpBeforeET - G.player.hp;
  ok(Math.abs(etDealt - (3 + G.floor * 0.2)) < 1e-9,
    '敌图腾单发 = 3 + f × 0.2，与玩家攻击力无关',
    `got ${etDealt}，期望 ${(3 + G.floor * 0.2).toFixed(1)}`);
  // 把玩家的攻击力拉到天上，敌图腾的伤害仍然纹丝不动
  G.player.atk = 500; G.buffs.atkUp = 400; G.buffs.multUp = 20;
  G.enemyTotems = [{ x: 460, y: 280, r: 15, life: 720, maxLife: 720, fireTimer: 1, _lastFire: 0 }];
  const hpBeforeET2 = G.player.hp;
  updateEnemyTotems();
  ok(Math.abs((hpBeforeET2 - G.player.hp) - etDealt) < 1e-9,
    '玩家攻击力拉满后敌图腾伤害不变（对照 19k：玩家自己的塔会跟着涨）',
    `玩家攻击力 ${getPlayerAttackPower().toFixed(1)}，敌图腾仍打 ${(hpBeforeET2 - G.player.hp).toFixed(1)}`);

  // 19l 玩家开火频率 +20%
  ok(Math.abs(PLAYER_FIRE_RATE_MUL - 1.2) < 1e-12, 'PLAYER_FIRE_RATE_MUL = 1.2',
    `got ${PLAYER_FIRE_RATE_MUL}`);
  fresh();
  api.simAutoSelectClass();
  G.floor = 1;
  G.monsters = [mkM(200, 200)];
  G.monsters[0].hp = G.monsters[0].maxHp = 1e6;
  G.player.shootCooldown = 0;
  autoShoot();
  const cd1 = G.player.shootCooldown;
  ok(Math.abs(cd1 - Math.max(24, 48 - G.floor * 0.32) / 1.2) < 1e-9,
    '第 1 层射击冷却 = 基准 ÷ 1.2', `got ${cd1}`);
  const cdBase = Math.max(24, 48 - G.floor * 0.32);
  ok(cd1 < cdBase, '冷却确实变短了（频率提高 20%）', `${cdBase} → ${cd1}`);

  // 19m 「消除」技能化：R / 手机圆钮 → tryEliminate，带 30 秒冷却
  ok(ELIMINATE_COOLDOWN === 30 * 60, '冷却 30 秒（1800 帧）', `got ${ELIMINATE_COOLDOWN}`);
  fresh();
  api.simAutoSelectClass();
  G.eliminateCooldown = 0;
  G.monsters = [mkM(300, 300), mkM(320, 300)];
  G.monsters.forEach(m => { m.hp = m.maxHp = 1e6; });
  G.turrets = [{ x: 200, y: 200, r: 14, type: 'basic', emoji: 'x', color: '#fff', fireRate: 999,
    fireTimer: 0, range: 1, hp: 9, maxHp: 9, tier: '中环', loopKey: 'lkA', spawnAnim: 0 },
    { x: 220, y: 200, r: 14, type: 'basic', emoji: 'x', color: '#fff', fireRate: 999,
    fireTimer: 0, range: 1, hp: 9, maxHp: 9, tier: '中环', loopKey: 'lkB', spawnAnim: 0 }];
  G.turretLoops = { lkA: true, lkB: true };
  const hpB = G.monsters.map(m => m.hp);
  tryEliminate();
  ok(G.eliminateCooldown === ELIMINATE_COOLDOWN, '触发后冷却立刻开始走', `got ${G.eliminateCooldown}`);
  ok(G.turrets.length === 1, '拆掉最早的一座（2 → 1）', `got ${G.turrets.length}`);
  ok(G.monsters.every((m, i) => m.hp < hpB[i]), '全场怪都吃到伤害');
  // 冷却中再按：什么都不该发生
  const hpMid = G.monsters.map(m => m.hp);
  const turretsMid = G.turrets.length;
  tryEliminate();
  ok(G.monsters.every((m, i) => m.hp === hpMid[i]) && G.turrets.length === turretsMid,
    '冷却中再按 R 是空操作（只给一句反馈）');
  // 冷却走完后又能用
  G.eliminateCooldown = 0;
  const hpMid2 = G.monsters.map(m => m.hp);
  tryEliminate();
  ok(!G.monsters.every((m, i) => m.hp === hpMid2[i]), '冷却走完后可以再次触发');
  // 冷却每帧减一
  G.eliminateCooldown = 10;
  for (let i = 0; i < 5; i++) { if (G.eliminateCooldown > 0) G.eliminateCooldown--; }
  ok(G.eliminateCooldown === 5, '冷却逐帧递减', `got ${G.eliminateCooldown}`);
  // 死亡 / 暂停时按下去不该生效
  G.eliminateCooldown = 0;
  G.gameOver = true;
  tryEliminate();
  ok(G.eliminateCooldown === 0, '死亡状态下 R 不生效', `got ${G.eliminateCooldown}`);
  G.gameOver = false;

  // 19n 换层 / 重开清场
  fresh();
  api.simAutoSelectClass();
  G.affixZones.push({ x: 10, y: 10, r: 100, kind: 'weaken', cfg: affixDef('weaken').zone,
    color: '#f00', life: 360, maxLife: 360, tick: 0 });
  api.startFloor();
  ok(G.affixZones.length === 0, '开始新一层时圈层被清空', `got ${G.affixZones.length}`);
  G.affixZones.push({ x: 10, y: 10, r: 100, kind: 'weaken', cfg: affixDef('weaken').zone,
    color: '#f00', life: 360, maxLife: 360, tick: 0 });
  G.bossBanner = { text: 'x', life: 300, maxLife: 300 };
  G.eliminateCooldown = 500;
  G.stickBase = { x: 1, y: 2 };
  G._stickTouchId = 7;
  resetGame();
  G.simMode = true;
  ok(G.affixZones.length === 0, 'resetGame 清空圈层', `got ${G.affixZones.length}`);
  ok(G.bossBanner === null, 'resetGame 清掉 BOSS 横幅', `got ${String(G.bossBanner)}`);
  ok(G.eliminateCooldown === 0, 'resetGame 把消除冷却归零', `got ${G.eliminateCooldown}`);
  ok(G.stickBase === null, 'resetGame 清掉动态摇杆底座', `got ${String(G.stickBase)}`);
  ok(G._stickTouchId === null, 'resetGame 清掉摇杆的 touch id（v9.24 漏掉的那个）',
    `got ${String(G._stickTouchId)}`);

  // 19o 动态摇杆（bug「一进游戏就不动」的回归防线）
  // 按下那一刻定底座，此时位移为 0；拖动之后才有方向，而且模长不超过 1。
  fresh();
  G.mobileMode = true;
  G.stick = { x: 0, y: 0 }; G.stickActive = false; G.stickBase = null; G._stickTouchId = null;
  setStickFromTouch({ clientX: 100, clientY: 400, identifier: 1 });
  ok(G.stickBase && G.stickBase.x === 100 && G.stickBase.y === 400,
    '按下的那一点就地成为底座', JSON.stringify(G.stickBase));
  ok(G.stick.x === 0 && G.stick.y === 0, '刚按下时位移为 0（底座就是手指所在处）',
    `${G.stick.x}, ${G.stick.y}`);
  ok(G.stickActive === true, '按下即激活移动');
  const R = joyRadiusPx();
  setStickFromTouch({ clientX: 100, clientY: 400 - R, identifier: 1 });
  ok(G.stick.y < -0.9 && Math.abs(G.stick.x) < 1e-9, '往上拖 R 像素 → 满推向上',
    `${G.stick.x.toFixed(3)}, ${G.stick.y.toFixed(3)}`);
  setStickFromTouch({ clientX: 100, clientY: 400 - R * 5, identifier: 1 });
  ok(Math.hypot(G.stick.x, G.stick.y) <= 1 + 1e-9, '拖出圈外模长仍被夹在 1',
    `got ${Math.hypot(G.stick.x, G.stick.y).toFixed(4)}`);
  releaseStick();
  ok(G.stickBase === null && G.stickActive === false && G.stick.x === 0 && G.stick.y === 0,
    '松手后底座清空、位移归零',
    `${String(G.stickBase)} / ${G.stickActive} / ${G.stick.x}`);
  // 摇杆半径跟着画面缩放走，否则大小屏手感差一倍
  ok(joyRadiusPx() > 0, 'joyRadiusPx() 由 canvas 高度算出来', `got ${joyRadiusPx()}`);

  // 19p 选完职业之后既没暂停也没在选择中——「一进游戏就不动」的另一条疑似路径
  fresh();
  if (typeof selectClass === 'function') {
    api.simAutoSelectClass();
    ok(G.paused === false && G.selectingActive === false,
      '选完职业后 paused / selectingActive 都归假（update 不会被卡住）',
      `paused=${G.paused} selectingActive=${G.selectingActive}`);
  }

  // 19q 桌面端不该弹全屏引导
  ok(detectMobileMode() === false, '探针环境识别为非手机', `got ${detectMobileMode()}`);
  let fsThrew = null;
  try { syncGameOverUI(); } catch (e) { fsThrew = e; }
  ok(!fsThrew, 'syncGameOverUI() 在没有真实 DOM 的环境里不抛异常', fsThrew && fsThrew.message);

  // ------------------------------------------------------------------
  // 19r 密文版掉落：开局 6 张 / 每 20 杀 30% / BOSS 每磨 25% 血 1~4 张
  // ------------------------------------------------------------------
  ok(START_CARDS === 6, '开局白送 6 张', `got ${START_CARDS}`);
  ok(KILL_CARD_EVERY === 20, '每 20 杀判定一次', `got ${KILL_CARD_EVERY}`);
  ok(Math.abs(KILL_CARD_CHANCE - 0.30) < 1e-12, '击杀奖励概率 30%', `got ${KILL_CARD_CHANCE}`);
  ok(Math.abs(BOSS_CARD_STEP - 0.25) < 1e-12, 'BOSS 每 25% 血判定一次', `got ${BOSS_CARD_STEP}`);

  // 概率分布：50% 1 张 / 20% 2 张 / 20% 3 张 / 10% 4 张（合计 100%，只掷一次骰子）
  const rollHist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const ROLL_N = 40000;
  let rollBad = null;
  for (let i = 0; i < ROLL_N; i++) {
    const n = rollBossCardCount();
    if (!Number.isInteger(n) || n < 1 || n > 4) { rollBad = n; break; }
    rollHist[n]++;
  }
  ok(rollBad === null, 'rollBossCardCount() 只返回 1~4 的整数', `got ${rollBad}`);
  const rollPct = k => rollHist[k] / ROLL_N;
  ok(Math.abs(rollPct(1) - 0.50) < 0.03 && Math.abs(rollPct(2) - 0.20) < 0.03
     && Math.abs(rollPct(3) - 0.20) < 0.03 && Math.abs(rollPct(4) - 0.10) < 0.03,
    `${ROLL_N} 次抽样的分布 ≈ 50/20/20/10`,
    `1:${(rollPct(1) * 100).toFixed(2)}% 2:${(rollPct(2) * 100).toFixed(2)}% ` +
    `3:${(rollPct(3) * 100).toFixed(2)}% 4:${(rollPct(4) * 100).toFixed(2)}%`);

  // 发牌：张数进手牌，并且「获得的个数」要在画布的 G.notifications 里读得到
  // （不能只写 setFeedback —— 那是右侧面板，手机端在收起的抽屉里，战斗时看不见）
  fresh();
  G.hand.length = 0;
  G.notifications.length = 0;
  const granted = grantCards(3, '测试来源');
  ok(G.hand.length === 3 && granted.length === 3, 'grantCards(3) 手牌 +3',
    `hand=${G.hand.length} granted=${granted.length}`);
  const noteText = G.notifications.map(n => n.text).join(' | ');
  ok(/×3/.test(noteText), '屏幕上打出「获得 3 张」的通知', noteText);
  ok(G.notifications.length === 1, '一次发 3 张只弹一条通知（不是刷 3 行）',
    `got ${G.notifications.length}`);
  ok(grantCards(0, '零张') .length === 0 && G.hand.length === 3, 'grantCards(0) 是空操作');
  // 不传参的老调用点行为不变（老 dropBalancedCard() 只是一张牌 + 一条反馈）
  const oldCard = dropBalancedCard();
  ok(oldCard && oldCard.id && G.hand.length === 4 && oldCard.ratio === undefined,
    'dropBalancedCard() 不传参仍按老样子发 1 张并返回这张牌',
    `hand=${G.hand.length} card=${oldCard && oldCard.id}`);

  // 每 20 杀 30%：把骰子钉死，逐条验证「第 20/40 杀命中、未命中时一张不发」
  const realRandom = Math.random;
  fresh();
  G.killCount = 0; G.hand.length = 0;
  Math.random = () => 0.01;                 // 必中 30%
  for (let i = 0; i < KILL_CARD_EVERY - 1; i++) registerKill();
  ok(G.hand.length === 0, '第 19 杀还没到判定点（不足 20 不发）', `got ${G.hand.length}`);
  registerKill();                           // 第 20 杀
  ok(G.hand.length === 1, '第 20 杀命中 30% → 1 张密文版', `got ${G.hand.length}`);
  for (let i = 0; i < KILL_CARD_EVERY; i++) registerKill();
  ok(G.hand.length === 2, '第 40 杀再中一次（计数是累计击杀，不是层内击杀）',
    `got ${G.hand.length}`);
  Math.random = () => 0.99;                 // 必不中
  const handBeforeMiss = G.hand.length;
  for (let i = 0; i < KILL_CARD_EVERY * 3; i++) registerKill();
  ok(G.hand.length === handBeforeMiss, '30% 没中时一张都不发', `got ${G.hand.length}`);
  // 教程局不发（沙盒里脚本自己发牌，多出来的随机牌会冲掉教学节奏）
  Tutorial.tookOver = true;
  Math.random = () => 0.01;
  const handBeforeTut = G.hand.length;
  for (let i = 0; i < KILL_CARD_EVERY; i++) registerKill();
  ok(G.hand.length === handBeforeTut, '教程局里击杀不发牌', `got ${G.hand.length}`);
  Tutorial.tookOver = false;
  Math.random = realRandom;

  // BOSS 磨血：25/50/75 各结算一次，100%（打死那一下）不结算——否则和击杀掉落双重发牌
  fresh();
  G.hand.length = 0;
  Math.random = () => 0.01;                 // rollBossCardCount() → 1 张
  const bossM = mkM(400, 280);
  bossM.isBoss = true; bossM.hp = bossM.maxHp = 1000;
  G.monsters = [bossM];
  bossM.hp = 800; tickBossCardMilestones();
  ok(G.hand.length === 0, '只磨掉 20%，不到 25% 不发', `got ${G.hand.length}`);
  bossM.hp = 750; tickBossCardMilestones();
  ok(G.hand.length === 1, '磨掉 25% → 发 1 张', `got ${G.hand.length}`);
  tickBossCardMilestones(); tickBossCardMilestones();
  ok(G.hand.length === 1, '同一道坎只结算一次（每帧轮询也不会重复发）', `got ${G.hand.length}`);
  bossM.hp = 500; tickBossCardMilestones();
  ok(G.hand.length === 2, '磨掉 50% → 再发一次', `got ${G.hand.length}`);
  bossM.hp = 250; tickBossCardMilestones();
  ok(G.hand.length === 3, '磨掉 75% → 第三次', `got ${G.hand.length}`);
  bossM.hp = 100; tickBossCardMilestones();
  ok(G.hand.length === 3, '第 4 道坎（100% = 击杀）不重复发牌', `got ${G.hand.length}`);
  bossM.hp = 0; tickBossCardMilestones();
  ok(G.hand.length === 3, 'BOSS 血量为 0（已死）时不再发', `got ${G.hand.length}`);
  // 一帧跨两道坎（重击 / 消除）要补两次，不能只发一次
  bossM.hp = bossM.maxHp = 1000; bossM._cardMilestone = 0;
  G.hand.length = 0;
  bossM.hp = 400; tickBossCardMilestones();     // 直接掉到 60% → 跨过 25% 与 50% 两道
  ok(G.hand.length === 2, '一帧跨两道坎补发两次（不漏发）', `got ${G.hand.length}`);
  // 换了骰子之后张数跟着走：4 张那条支路
  Math.random = () => 0.95;                     // → 4 张
  bossM.hp = bossM.maxHp = 1000; bossM._cardMilestone = 0;
  G.hand.length = 0;
  bossM.hp = 500; tickBossCardMilestones();
  ok(G.hand.length === 8, '50% 那档直接进 4 张分支 → 一次发 4（两道坎共 8）',
    `got ${G.hand.length}`);
  // 通知里要有张数
  ok(G.notifications.some(n => /×4/.test(n.text)), '屏幕上打出「×4」',
    G.notifications.map(n => n.text).join(' | '));
  // 小怪不该触发磨血奖励
  fresh();
  G.hand.length = 0;
  const smallM = mkM(400, 280); smallM.hp = 10; smallM.maxHp = 1000;
  G.monsters = [smallM];
  tickBossCardMilestones();
  ok(G.hand.length === 0, '非 BOSS 的小怪不触发磨血奖励', `got ${G.hand.length}`);
  Math.random = realRandom;

  // 正式开局发 6 张；教程局不发（判定读 Tutorial.seen）
  fresh();
  Tutorial.seen = false; Tutorial.finished = false;
  G.hand.length = 0;
  selectClass(0);
  ok(G.hand.length === 0, '教程局选完职业不发开局 6 张', `got ${G.hand.length}`);
  fresh();
  Tutorial.seen = true;
  G.hand.length = 0;
  selectClass(0);
  ok(G.hand.length === START_CARDS, `正式开局选完职业白送 ${START_CARDS} 张`,
    `got ${G.hand.length}`);
  ok(G.notifications.some(n => /×6/.test(n.text)), '开局也把「×6」打在屏幕上',
    G.notifications.map(n => n.text).join(' | '));
  Tutorial.seen = false;

  // ------------------------------------------------------------------
  // 19s 启动自检 + 全屏引导的点击穿透防护（HTML / CSS 层面的保证）
  // 「只看到职业选择标题、没有卡」那个报障本机复现不出来，只能把这些
  // 兜底本身锁住——至少下一次报障时能拿到真实报错。
  // ------------------------------------------------------------------
  ok(html.indexOf('bootErrorBar') > -1, '页面里有启动自检条 #bootErrorBar');
  ok(html.indexOf('__bootError') > -1, '页面里有 __bootError 兜底函数');
  ok(html.indexOf('__bootError') < html.lastIndexOf('<script>'),
    '__bootError 定义在主脚本之前（否则它自己抛的错就抓不到）',
    `__bootError@${html.indexOf('__bootError')} vs 主脚本@${html.lastIndexOf('<script>')}`);
  ok(/__booted/.test(html), '有「启动已完成」标记 __booted（避免把运行时报错也糊到屏幕上）');
  ok(/fs-dismissing\s+\.class-card\s*\{\s*pointer-events:\s*none/.test(html),
    '摘掉全屏引导后的 400ms 里职业卡不吃点击（挡掉点按合成出来的那一次 mousedown）');
  ok(html.indexOf('fs-dismissing') < html.lastIndexOf('<script>'),
    'fs-dismissing 的 CSS 在主脚本之前就位');
  // 主脚本必须是 </body> 前最后一个 <script>——探针靠这条定位源码
  ok(html.lastIndexOf('<script>') > html.lastIndexOf('</head>'),
    '主脚本在 </head> 之后（<head> 里那段自检不会顶替它）');

  // ------------------------------------------------------------------
  // 19t v9.26：pointer-events 只有一个入口 —— 手机端摇杆的输入面
  // 「选择层数之后摇杆无法移动」的成因：showNodeMap() 打开时把 canvas 与
  // .canvas-wrap 都设成 auto，selectNode() 选完关掉时又把两层设回 none。
  // 手机端摇杆的 touchstart 就挂在 .canvas-wrap 上，而 inline 的 none 会盖过
  // styles.css 里的 `body.mobile .canvas-wrap { pointer-events: auto }`——
  // 于是玩家第一次选完路之后，整块战斗界面再也收不到触摸（9.24 挂在 canvas 上
  // 时走的也是同一条路径，两次都没修到根上）。
  // 修法是收敛到 setCanvasPointer()：手机端永不改 .canvas-wrap。
  // ------------------------------------------------------------------
  if (!HAS_V926) {
    console.log('  （19t 跳过：这是 9.25 及更早的产物，pointer-events 还没有统一入口）');
  } else {
    const cvs = api.canvas;
    // 手机端的正确行为是「不动 .canvas-wrap」。先给它写一个哨兵值，
    // 再断言调用之后它还在——直接断言「不等于 none」会被前面章节遗留的
    // 桌面端状态干扰（那些用例把两层都设成了 none）。
    cvs.parentElement.style.pointerEvents = 'auto';
    G.mobileMode = true;
    setCanvasPointer(false);
    ok(cvs.style.pointerEvents === 'none',
      '手机端：canvas 自身照常关掉（触摸会穿透到 .canvas-wrap）',
      String(cvs.style.pointerEvents));
    ok(cvs.parentElement.style.pointerEvents === 'auto',
      '手机端：关的时候不碰 .canvas-wrap（那是摇杆的输入面）',
      String(cvs.parentElement.style.pointerEvents));
    setCanvasPointer(true);
    ok(cvs.style.pointerEvents === 'auto' && cvs.parentElement.style.pointerEvents === 'auto',
      '手机端：放开的时候同样不碰 .canvas-wrap');
    G.mobileMode = false;
    setCanvasPointer(false);
    ok(cvs.style.pointerEvents === 'none' && cvs.parentElement.style.pointerEvents === 'none',
      '桌面端：两层一起关（与 9.25 及以前完全一致）');
    setCanvasPointer(true);
    ok(cvs.style.pointerEvents === 'auto' && cvs.parentElement.style.pointerEvents === 'auto',
      '桌面端：两层一起放开');

    // 真的走一遍「选一层路」：选完之后 .canvas-wrap 必须还是收得到触摸的那一层
    fresh();
    Tutorial.seen = true; Tutorial.finished = false;
    G.mobileMode = true;
    G.floor = 3;
    api.simAutoSelectClass();
    api.canvas.parentElement.style.pointerEvents = 'auto';   // 哨兵：选路前是能收触摸的
    G.mapChoices = [{ id: 'battle', label: '⚔️ 战斗', stageType: 'mixed' }];
    api.selectNode(0, 'center');
    ok(api.canvas.parentElement.style.pointerEvents === 'auto',
      '手机端选完一层路之后 .canvas-wrap 仍然收得到触摸（摇杆不会当场失灵）',
      String(api.canvas.parentElement.style.pointerEvents));
    ok(G.selectingActive === false && G.mapMode === false,
      '选完路：selectingActive / mapMode 都归假（update 不会被卡住）',
      `${G.selectingActive} / ${G.mapMode}`);
    G.mobileMode = false;

    // 结构上的防线：全项目只剩 setCanvasPointer() 里那一处写 .canvas-wrap。
    // 多出第二处就说明有人绕开了统一入口——那正是这次 bug 的复发方式。
    const rawParent = (html.match(/canvas\.parentElement\.style\.pointerEvents/g) || []).length;
    ok(rawParent === 1,
      '全项目只有 setCanvasPointer() 一处写 .canvas-wrap 的 pointer-events',
      `got ${rawParent}`);
    ok(/function setCanvasPointer\(/.test(html), 'setCanvasPointer 是 pointer-events 的唯一入口');
    // 选路 / 选属性期间不接管左半屏触摸：不然这里的 preventDefault 会掐掉
    // 浏览器合成的那一次 mousedown，把画在 canvas 上的节点地图点不动。
    ok(/G\.drawerOpen \|\| G\.selectingActive\) return;/.test(html),
      '摇杆的 touchstart 在 selectingActive 期间直接 return（不抢浮层的点击）');
  }
}

// ============================================================
//  20. v9.27 难度曲线改回全程指数 · 抬高三道撞顶闸门 · 前期普通怪 −30%
// ============================================================
if (!HAS_V927) {
  section('20. v9.27 难度曲线（跳过：这是 9.26 及更早的产物）');
} else {
  section('20. v9.27 难度曲线改回全程指数 + 抬高三道撞顶闸门 + 前期普通怪 −30%');

  // 20a 曲线本体：底数 1.56，从第 1 层起就是单条指数，没有拐点、没有多项式尾巴
  ok(DIFF_BASE === 1.56, 'DIFF_BASE = 1.56（1.16 + 0.4）', `got ${DIFF_BASE}`);
  ok(!DIFF_TAIL, 'DIFF_TAIL 已删除（多项式尾巴撤掉了）', `got ${DIFF_TAIL}`);
  fresh();
  const diffs = [1, 2, 5, 10, 30, 31, 100].map(f => { G.floor = f; return getDifficultyMultiplier(); });
  ok(Math.abs(diffs[0] - 1) < 1e-12, '第 1 层 ×1.00', `got ${diffs[0]}`);
  ok(Math.abs(diffs[1] - 1.56) < 1e-12, '第 2 层 ×1.56', `got ${diffs[1]}`);
  ok(Math.abs(diffs[3] - Math.pow(1.56, 9)) < 1e-6, '第 10 层 ×1.56^9 ≈ 54.7',
    `got ${diffs[3].toFixed(2)}`);
  // 关键：拐点前后是**同一条**曲线。若尾巴又回来了，这里的比值会掉下来。
  G.floor = 30; const d30 = getDifficultyMultiplier();
  G.floor = 31; const d31 = getDifficultyMultiplier();
  ok(Math.abs(d31 / d30 - 1.56) < 1e-9,
    '第 30 → 31 层的比值仍是 1.56（拐点处不断档 = 没有多项式尾巴）',
    `got ${(d31 / d30).toFixed(6)}`);
  // 全程单调且始终按同一底数
  let ratioOk = true, prev = null;
  for (let f = 2; f <= 120; f++) {
    G.floor = f;
    const d = getDifficultyMultiplier();
    if (prev !== null && Math.abs(d / prev - 1.56) > 1e-9) ratioOk = false;
    prev = d;
  }
  ok(ratioOk, '第 2 ~ 120 层每一层的比值都恰好是 1.56（真·全程指数）');

  // 20b 三道撞顶闸门都抬到了「一局打不到」的位置
  ok(HP_OVERFLOW_GUARD === 1e15 && ATK_OVERFLOW_GUARD === 1e9,
    'HP / 攻击的天花板 = 1e15 / 1e9',
    `got ${HP_OVERFLOW_GUARD} / ${ATK_OVERFLOW_GUARD}`);
  fresh();
  G.floor = 60;                       // 远在「攻击 ~22 层封顶」的实战范围之外
  G.monsters = [];
  spawnMonsterProbe({ key: 'basic' });
  const m60 = G.monsters[0];
  const diff60 = getDifficultyMultiplier();
  const rawAtk60 = (MONSTER_TYPES.BASIC.baseAtk + MONSTER_TYPES.BASIC.atkScale)
                 * Math.pow(diff60, 0.35) * MONSTER_STAT_MUL;
  ok(m60 && Math.abs(m60.atk - rawAtk60) < 1e-6 && m60.atk < ATK_OVERFLOW_GUARD,
    '第 60 层攻击没有被 12 倍安全阀截断（= 用了新闸门）',
    `got ${m60 && m60.atk}，未截断值 ${rawAtk60}`);
  // 结构上确认那两个老常数在生成路径里已经消失
  ok(!/Math\.min\(Math\.pow\(diff, 0\.35\), 12\)/.test(html),
    '源码里不再有 Math.min(Math.pow(diff, 0.35), 12) 这道闸门');
  ok(!/Math\.min\(hp, 1e9\)/.test(html) && !/Math\.min\(hp, 1e8\)/.test(html),
    '源码里不再有 Math.min(hp, 1e9) / 1e8 这两道血量闸门');
  ok(!/Math\.min\(atk, 120\)/.test(html), '源码里不再有 Math.min(atk, 120)');

  // 20c 前期普通怪 −30%：只削普通怪，精英与 30 层之后都不吃
  ok(EARLY_NORMAL_MUL === 0.7, 'EARLY_NORMAL_MUL = 0.7', `got ${EARLY_NORMAL_MUL}`);
  const bT = MONSTER_TYPES.BASIC;
  fresh();
  G.floor = 5;
  G.monsters = [];
  spawnMonsterProbe({ key: 'basic' });
  const norm5 = G.monsters[0];
  const d5 = getDifficultyMultiplier();
  const norm5Want = (bT.baseHp + bT.hpScale) * d5 * MONSTER_STAT_MUL * EARLY_NORMAL_MUL;
  ok(Math.abs(norm5.hp - norm5Want) < 1e-6, '第 5 层普通怪 HP 吃了 ×0.7',
    `got ${norm5.hp}，期望 ${norm5Want}`);
  // 精英不吃这一项。注意 elite 的 hp 公式是 (baseHp + hpScale×1.5)×diff×0.8
  // ——MONSTER_STAT_MUL 是**连精英一起乘**的（它写在赋值行上），所以期望值里留着它。
  // 巨人词缀会让 HP 翻倍，抽到就重抽，否则这条断言会随机红。
  let elite5 = null;
  for (let i = 0; i < 60 && !elite5; i++) {
    G.floor = 5;
    G.monsters = [];
    spawnMonsterProbe({ key: 'basic', elite: true });
    const e = G.monsters.find(m => m.isElite);
    if (e && !(e.affixes || []).includes('giant')) elite5 = e;
  }
  const elite5Want = (bT.baseHp + bT.hpScale * 1.5) * d5 * MONSTER_STAT_MUL;
  ok(elite5 && Math.abs(elite5.hp - elite5Want) < 1e-6,
    '第 5 层精英不吃这 −30%（只削普通怪）',
    `got ${elite5 && elite5.hp}，期望 ${elite5Want}`);
  // 第 30 层（DIFF_KNEE）起普通怪恢复原倍率
  fresh();
  G.floor = 30;
  G.monsters = [];
  spawnMonsterProbe({ key: 'basic' });
  const norm30 = G.monsters[0];
  const d30b = getDifficultyMultiplier();
  const norm30Want = (bT.baseHp + bT.hpScale) * d30b * MONSTER_STAT_MUL;
  ok(Math.abs(norm30.hp - norm30Want) < 1e-6,
    '第 30 层（DIFF_KNEE）普通怪不再吃 ×0.7',
    `got ${norm30.hp}，期望 ${norm30Want}`);

  // 20d BOSS 尾巴：多项式 → 同一底数的指数；30 层那道档位本身不动
  fresh();
  G.floor = 30;
  const bhp30 = getBossHp();
  G.floor = 31;
  const bhp31 = getBossHp();
  ok(Math.abs(bhp31 / bhp30 - 1.56) < 0.01,
    '第 30 → 31 层 BOSS 血量比值 ≈ 1.56（尾巴已换成指数）',
    `got ${(bhp31 / bhp30).toFixed(4)}`);
  G.floor = 60;
  const bhp60 = getBossHp();
  ok(bhp60 > bhp30 * 1e5,
    '第 60 层 BOSS 血量比第 30 层高 5 个数量级（指数，不是多项式）',
    `${Math.round(bhp30)} → ${bhp60.toExponential(2)}`);

  // 20e HUD：难度系数不再 toFixed(2)（否则第 100 层会印出 20 位数字）
  ok(formatDiff(1) === '1.00', 'formatDiff(1) = "1.00"', `got ${formatDiff(1)}`);
  ok(formatDiff(508.123) === '508.12', 'formatDiff(508.123) = "508.12"', `got ${formatDiff(508.123)}`);
  ok(formatDiff(398670) === Math.round(398670).toLocaleString(),
    'formatDiff(398670) 走千分位', `got ${formatDiff(398670)}`);
  ok(/e19/.test(formatDiff(1.3e19)), 'formatDiff(1.3e19) 走指数写法', `got ${formatDiff(1.3e19)}`);
  const diffDisplayCtx = html.match(/diffDisplay[\s\S]{0,140}/);
  ok(!!diffDisplayCtx && !/\.toFixed\(2\)/.test(diffDisplayCtx[0]),
    'HUD 的 diffDisplay 不再直接 toFixed(2)');
  // 允许留下的 toFixed(2) 只有两处，且都是**数值字段**不是显示：
  //   snapshotStats().difficulty（写进对局事件日志，给分析管线读）
  //   sim summary 的 finalDifficulty（simRunner / analyzeSim 读）
  // 这两个前面都有 `+` 强制转回 number，说明作者要的就是数、不是字符串。
  const diffFixedLeft = (html.match(/\+getDifficultyMultiplier\(\)\.toFixed\(2\)/g) || []).length;
  ok(diffFixedLeft === 2,
    '难度系数的 toFixed(2) 只剩两个「转回 number」的数值字段（有意保留）',
    `got ${diffFixedLeft}`);
  ok(!/(?<!\+)getDifficultyMultiplier\(\)\.toFixed\(2\)/.test(html),
    '没有任何一处把它当字符串显示（显示路径全走 formatDiff）');
  const fmtCalls = (html.match(/formatDiff\(getDifficultyMultiplier\(\)\)/g) || []).length;
  ok(fmtCalls === 3, 'HUD / 结算界面 / 模拟报告三处都走 formatDiff()', `got ${fmtCalls}`);
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
