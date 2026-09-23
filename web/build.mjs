// 《密文轨迹》网页版构建脚本
//
// 扫描仓库根目录，自动挑选 2.x（经典版）与 9.x（AI 拓展版）的最新版本，
// 复制到 web/public/ 下并生成首页。原版本文件不会被改动。
//
// 用法：node web/build.mjs

import { readdirSync, mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const publicDir = join(here, 'public');

// 版本文件的两套命名：v2.12 起用「密文轨迹demoX.X.html」，更早用「试玩版demo_无限模式X.X.html」
const PATTERNS = [
  /^密文轨迹demo(\d+)\.(\d+)\.html$/,
  /^试玩版demo_无限模式(\d+)\.(\d+)\.html$/,
];

/** 扫描根目录，返回 [{ major, minor, version, file }]，按版本升序 */
function scanVersions() {
  const found = [];
  for (const name of readdirSync(repoRoot)) {
    for (const re of PATTERNS) {
      const m = name.match(re);
      if (m) {
        const major = Number(m[1]);
        const minor = Number(m[2]);
        found.push({ major, minor, version: `${major}.${minor}`, file: name });
      }
    }
  }
  return found.sort((a, b) => a.major - b.major || a.minor - b.minor);
}

/** 取某个大系列中 minor 最大的那个版本 */
function latestOf(versions, major) {
  const list = versions.filter(v => v.major === major);
  if (list.length === 0) throw new Error(`找不到 ${major}.x 系列的任何版本文件`);
  return list[list.length - 1];
}

const versions = scanVersions();
const classic = latestOf(versions, 2);
const ai = latestOf(versions, 9);

mkdirSync(join(publicDir, 'classic'), { recursive: true });
mkdirSync(join(publicDir, 'ai'), { recursive: true });

// 原样复制，不做任何内容修改——部署产物与仓库文件逐字节一致
copyFileSync(join(repoRoot, classic.file), join(publicDir, 'classic', 'index.html'));
copyFileSync(join(repoRoot, ai.file), join(publicDir, 'ai', 'index.html'));

const sizes = {
  classic: (statSync(join(publicDir, 'classic', 'index.html')).size / 1024).toFixed(0),
  ai: (statSync(join(publicDir, 'ai', 'index.html')).size / 1024).toFixed(0),
};

writeFileSync(join(publicDir, 'index.html'), landingPage(classic, ai, sizes), 'utf8');

console.log(`经典版 2.x → /classic/  ← ${classic.file} (v${classic.version}, ${sizes.classic} KB)`);
console.log(`AI 拓展版 9.x → /ai/     ← ${ai.file} (v${ai.version}, ${sizes.ai} KB)`);
console.log('首页已生成：/');

function landingPage(classic, ai, sizes) {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>密文轨迹 · 网页版</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0a0a16;
    color: #d8e0f0;
    font-family: 'Courier New', 'PingFang SC', monospace;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 20px;
  }
  .stars { position: fixed; inset: 0; pointer-events: none; opacity: .5;
    background-image: radial-gradient(1px 1px at 20% 30%, #4a5a8a 50%, transparent 50%),
                      radial-gradient(1px 1px at 70% 60%, #3a4a7a 50%, transparent 50%),
                      radial-gradient(1px 1px at 45% 80%, #4a5a8a 50%, transparent 50%),
                      radial-gradient(1px 1px at 85% 15%, #3a4a7a 50%, transparent 50%);
    background-size: 400px 400px; }
  header { text-align: center; margin-bottom: 44px; position: relative; }
  h1 { font-size: 40px; letter-spacing: 12px; color: #7ee0ff;
       text-shadow: 0 0 24px rgba(126,224,255,.45); margin-bottom: 14px; }
  .tagline { color: #6a7898; font-size: 13px; letter-spacing: 2px; }
  .grid { display: flex; gap: 26px; flex-wrap: wrap; justify-content: center; position: relative; }
  a.card {
    display: block; width: 320px; padding: 30px 26px;
    background: #101620; border: 1px solid #1e2a3e; border-radius: 6px;
    text-decoration: none; color: inherit; transition: .18s;
  }
  a.card:hover { border-color: #7ee0ff; transform: translateY(-4px);
                 box-shadow: 0 10px 30px rgba(126,224,255,.12); }
  .icon { font-size: 34px; margin-bottom: 16px; }
  .name { font-size: 20px; color: #e8f0ff; margin-bottom: 8px; letter-spacing: 2px; }
  .ver { display: inline-block; font-size: 11px; color: #7ee0ff; border: 1px solid #24405a;
         border-radius: 3px; padding: 2px 8px; margin-bottom: 16px; letter-spacing: 1px; }
  .desc { font-size: 12px; line-height: 1.9; color: #7a88a8; }
  .meta { margin-top: 18px; font-size: 11px; color: #4a5670; }
  footer { margin-top: 52px; font-size: 11px; color: #3a4460; letter-spacing: 1px;
           text-align: center; line-height: 2; position: relative; }
  footer a { color: #5a6a8a; }
</style>
</head>
<body>
<div class="stars"></div>
<header>
  <h1>密文轨迹</h1>
  <div class="tagline">2D 俯视角射击动作 + 轻塔防 · 用行走的轨迹作战</div>
</header>
<div class="grid">
  <a class="card" href="/classic/">
    <div class="icon">🛡️</div>
    <div class="name">经典版</div>
    <div class="ver">v${classic.version}</div>
    <div class="desc">
      无限波次生存 · 指数难度增长<br>
      密文板组合成永久被动<br>
      护盾机制 + 停走交替 + BOSS 天灾
    </div>
    <div class="meta">${sizes.classic} KB · 单文件 · ${classic.file}</div>
  </a>
  <a class="card" href="/ai/">
    <div class="icon">🧬</div>
    <div class="name">AI 拓展版</div>
    <div class="ver">v${ai.version}</div>
    <div class="desc">
      轨迹闭环召唤图腾 · 网格判环<br>
      职业 / 遗物 / 蜿蜒地图 / 商人<br>
      自动模拟与数值平衡引擎
    </div>
    <div class="meta">${sizes.ai} KB · 单文件 · ${ai.file}</div>
  </a>
</div>
<footer>
  <div>WASD 移动 · 鼠标点击手牌 · 空格宣读组合 · P 暂停 · Shift 冲刺轨迹</div>
  <div>按 <code>\`</code> 切换调试模式，数字键 1-8 可直接生成指定怪物</div>
</footer>
</body>
</html>
`;
}
