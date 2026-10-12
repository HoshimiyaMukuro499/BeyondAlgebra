// 把 src/<线>/ 下的模块拼装成自包含的单文件 HTML（密文轨迹demo<版本>.html）。
//
// 版本线用 `--src=` 指定：缺省 `9x`（9.x），`--src=4x` 即 4.x 减法版。
// 两条线的源码树互相独立，各自的 meta.json 决定产物文件名，互不覆盖。
//
// 为什么是「拼接进同一个 <script>」而不是 ES modules：
//   1. 作用域与拆分前完全一致——不需要 import/export，不必改动任何变量引用
//   2. file:// 下 type="module" 会被 CORS 拦掉，双击就打不开了
// 拼装产物是纯静态单文件，仍可直接双击运行，也仍是 web/build.mjs 的输入。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { analyzeModules } from './scope-check.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 版本线：`--src=4x` → src/4x/，缺省 src/9x/（不改动任何现有命令的行为）
const srcArg = process.argv.find((a) => a.startsWith('--src='));
const SRC_DIR = srcArg ? srcArg.slice('--src='.length) : '9x';
const SRC = path.join(ROOT, 'src', SRC_DIR);
if (!fs.existsSync(SRC)) throw new Error(`找不到源码目录 src/${SRC_DIR}/`);

// 只剥掉写入时补的那一个换行。多剥一次会吃掉模块末尾本来就有的空行，
// 而模块边界恰好都是空行——会导致拼装产物比原文件少行。
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\n$/, '');

const meta = JSON.parse(read(path.join(SRC, 'meta.json')));
const template = read(path.join(SRC, 'template.html'));
const css = read(path.join(SRC, 'styles.css'));
const body = read(path.join(SRC, 'body.html'));

// 模块按文件名前缀数字排序，保证拼装顺序稳定
const jsDir = path.join(SRC, 'js');
const files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'))
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10) || a.localeCompare(b));
if (files.length === 0) throw new Error(`src/${SRC_DIR}/js 下没有任何模块`);

const modules = files.map((f) => ({ name: f, code: read(path.join(jsDir, f)) }));

// 4.0: 模块边界的机器检查。详见 web/scope-check.mjs 顶部的说明。
// `--scope-report` 只打印（用来反查每个文件该导出什么、以及有哪些前向引用），
// `--check` 会把它当成构建失败条件。
if (process.argv.includes('--scope-report')) {
  const { modules: mods, problems, needed } = analyzeModules(modules);
  for (const mod of mods) {
    console.log(`\n=== ${mod.name}  →  命名空间 ${mod.ns || '(无)'} ===`);
    console.log(`  需导出（别的模块引用了它）: ${[...needed[mod.index]].sort().join(', ') || '(无)'}`);
    const line = (label, map) => {
      const parts = [...map.entries()].map(([ns, set]) => `${ns}.{ ${[...set].sort().join(', ')} }`);
      console.log(`  ${label}: ${parts.join('  ') || '(无)'}`);
    };
    line('需解构（前面模块）', mod.importsNeeded);
    line('需点号调用（后面模块）', mod.forwardNeeded);
    console.log(`  导出了但没人用: ${mod.unusedExports.sort().join(', ') || '(无)'}`);
  }
  const fwd = problems.filter((p) => p.msg.startsWith('前向裸引用'));
  console.log(`\n前向裸引用 ${fwd.length} 处：`);
  for (const p of fwd) console.log(`  ${p.file}: ${p.msg}`);
  process.exit(0);
}

const js = modules.map((m) => m.code).join('\n');

// 拼接本身不会解析代码——`return { a, b,, }` 这种手滑，字节比对和边界检查都看不见，
// 要等浏览器（或探针）加载时才炸。这里按**经典脚本**编译一遍，和 <script> 的加载方式一致。
// 只编译不执行，所以 document/window 之类的浏览器全局不会有事。
try {
  new vm.Script(js, { filename: `src/${SRC_DIR}/js (拼接后)` });
} catch (e) {
  console.error(`✗ 拼装后的 JS 有语法错误：${e.message}`);
  process.exit(1);
}

for (const slot of ['{{CSS}}', '{{BODY}}', '{{JS}}']) {
  if (!template.includes(slot)) throw new Error(`模板缺少槽位 ${slot}`);
}

// 用函数式替换：JS 里含 $ 字符（模板字符串），字符串替换会把 $& 之类当反向引用
// 先填 CSS/BODY/JS 槽位，再替换 {{VERSION}}——body.html 里也有一个版本号占位符
let out = template
  .replace(/^[ \t]*\{\{CSS\}\}[ \t]*$/m, () => css)
  .replace(/^[ \t]*\{\{BODY\}\}[ \t]*$/m, () => body)
  .replace(/^[ \t]*\{\{JS\}\}[ \t]*$/m, () => js)
  .replaceAll('{{VERSION}}', () => meta.version)
  .replaceAll('{{NOTE}}', () => meta.note);

if (/\{\{[A-Z]+\}\}/.test(out)) {
  throw new Error(`模板仍有未替换的槽位: ${out.match(/\{\{[A-Z]+\}\}/g).join(', ')}`);
}

const outFile = path.join(ROOT, `密文轨迹demo${meta.version}.html`);

// --check：只校验根目录的产物是否与源码一致，不写盘。
// 有了构建步骤之后，直接手改产物是会被下次构建覆盖掉的——这个模式用来抓这种情况。
if (process.argv.includes('--check')) {
  const onDisk = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : null;
  if (onDisk === null) {
    console.error(`✗ ${path.basename(outFile)} 不存在，先跑 npm run ${SRC_DIR === '9x' ? 'build:game' : 'build:game4'}`);
    process.exit(1);
  }
  if (onDisk !== out) {
    console.error(`✗ ${path.basename(outFile)} 与 src/${SRC_DIR}/ 不一致——产物被手改过，或是忘了重新构建`);
    process.exit(1);
  }
  console.log(`✓ ${path.basename(outFile)} 与 src/${SRC_DIR}/ 一致`);

  // 模块边界检查（见 web/scope-check.mjs）。9.x 还没包 IIFE，跳过。
  if (SRC_DIR === '4x') {
    const { problems } = analyzeModules(modules);
    if (problems.length) {
      console.error(`✗ 模块边界检查未通过（${problems.length} 条）：`);
      for (const p of problems) console.error(`   ${p.file}: ${p.msg}`);
      process.exit(1);
    }
    console.log(`✓ 模块边界检查通过（${files.length} 个模块）`);
  }
} else {
  fs.writeFileSync(outFile, out);
  const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
  console.log(`已拼装 → 密文轨迹demo${meta.version}.html  (${files.length} 个模块, ${kb} KB)`);
  files.forEach((f) => console.log(`   ${f}`));
}
