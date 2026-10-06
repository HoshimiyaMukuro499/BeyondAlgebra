// 把 src/9x/ 下的模块拼装成自包含的单文件 HTML（密文轨迹demo<版本>.html）。
//
// 为什么是「拼接进同一个 <script>」而不是 ES modules：
//   1. 作用域与拆分前完全一致——不需要 import/export，不必改动任何变量引用
//   2. file:// 下 type="module" 会被 CORS 拦掉，双击就打不开了
// 拼装产物是纯静态单文件，仍可直接双击运行，也仍是 web/build.mjs 的输入。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', '9x');

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
if (files.length === 0) throw new Error('src/9x/js 下没有任何模块');

const js = files.map((f) => read(path.join(jsDir, f))).join('\n');

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
    console.error(`✗ ${path.basename(outFile)} 不存在，先跑 npm run build:game`);
    process.exit(1);
  }
  if (onDisk !== out) {
    console.error(`✗ ${path.basename(outFile)} 与 src/9x/ 不一致——产物被手改过，或是忘了重新构建`);
    process.exit(1);
  }
  console.log(`✓ ${path.basename(outFile)} 与 src/9x/ 一致`);
} else {
  fs.writeFileSync(outFile, out);
  const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
  console.log(`已拼装 → 密文轨迹demo${meta.version}.html  (${files.length} 个模块, ${kb} KB)`);
  files.forEach((f) => console.log(`   ${f}`));
}
