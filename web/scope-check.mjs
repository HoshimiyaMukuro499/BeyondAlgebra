// 4.0：模块边界的**机器**检查。
//
// 背景：4.0 把 11 个模块各自包成了 IIFE，跨模块符号靠模块开头的 `const { x } = Ns;`
// 前言解构进来。这样一来「这个模块用了谁的东西」有了一个可写的落点——也就可以被检查。
//
// 它跑在 `bundle-game.mjs --check` 里，也能用 `--scope-report` 单独跑（用来反查
// 每个文件该导出哪些符号）。检查的是**拼接后的语义**：11 个模块拼进同一个
// <script>，所以到了源码这一层，每个文件各自是一个 IIFE、命名空间是顶层 const。
//
// 四类问题：
//   1. 重名——同一个顶层符号在两个模块里各声明一次（拼接后会静默互相覆盖）
//   2. 前向裸引用——模块 i 直接用了后面模块 j 的符号。j 的 IIFE 那时还没跑完，
//      拿到的会是 undefined，必须在调用点写成 `Ns.符号`
//   3. 漏 import——用了前面模块的符号，但前言里没解构它、本模块也没声明
//   4. 命名空间成员写错——`Ns.xxx` 里的 xxx 不在 Ns 的导出表里
//
// 为什么不用真正的 JS parser：这个仓库零运行时依赖，也不想为了一个构建期检查
// 装 acorn。改用「扫描器 + 符号归属表」：先剥掉注释与字符串，再拿全量顶层符号的
// 归属表去匹配裸标识符。归属表是**已知的**，所以「这个裸名字是不是别人的符号」
// 只是一次查表，误报率远低于通用的自由变量分析。

/** 剥掉注释与字符串字面量。`${}` 里的表达式会递归处理（那是代码，不是字符串）。 */
export function stripCommentsAndStrings(src, start = 0, stopAtBrace = false, prevInit = '\n') {
  let out = '';
  let i = start;
  const n = src.length;
  let depth = 0;
  let prev = prevInit; // 上一个「有意义的」字符，用来判断 / 是除号还是正则
  const regexAllowedAfter = '(,=:[!&|?{};+-*%<>~^';

  while (i < n) {
    const c = src[i];

    // 表达式模式：遇到配对的 } 就收工（模板串 ${} 里递归调用）
    if (stopAtBrace && c === '}' && depth === 0) return { out, i: i + 1, prev };

    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '/' && regexAllowedAfter.includes(prev)) {
      // 正则字面量：吞到未转义的 / 为止；撞上换行说明其实不是正则，退回当除号
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n) {
        const d = src[j];
        if (d === '\\') { j += 2; continue; }
        if (d === '\n') break;
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) { j++; closed = true; break; }
        j++;
      }
      if (closed) { out += ' '; i = j; prev = ')'; continue; }
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      while (i < n) {
        const d = src[i];
        if (d === '\\') { i += 2; continue; }
        if (d === quote) { i++; break; }
        if (quote === '`' && d === '$' && src[i + 1] === '{') {
          const r = stripCommentsAndStrings(src, i + 2, true, '{');
          out += ' ' + r.out + ' ';
          i = r.i;
          continue;
        }
        i++;
      }
      out += ' ';
      prev = ')';
      continue;
    }

    if (c === '{') depth++;
    else if (c === '}') depth = Math.max(0, depth - 1);
    if (!/\s/.test(c)) prev = c;
    out += c;
    i++;
  }
  return { out, i, prev };
}

const strip = (src) => stripCommentsAndStrings(src).out;

const isIdentChar = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
const isIdentStart = (c) => c !== undefined && /[A-Za-z_$]/.test(c);

/** Map<K, Set<V>> 里的追加。 */
function addTo(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

/**
 * 单遍扫描，取出所有真正的**标识符 token**（排除数字里的 e5、排除 .属性、
 * 排除对象字面量的键 `{ dist: 90 }`）。顺带把 `Ns.member` 形式的访问记下来。
 */
function scanTokens(code) {
  const names = new Map();      // name -> 出现次数
  const accesses = new Set();   // "Ns.member"
  const n = code.length;
  let i = 0;
  let prevSig = '';
  while (i < n) {
    const c = code[i];
    if (isIdentChar(c)) {
      let j = i + 1;
      while (j < n && isIdentChar(code[j])) j++;
      const run = code.slice(i, j);
      // 只认「以字母/_/$ 开头、且前面不是点」的标识符——这样 1e5 里的 e5
      // 和 G.floor 里的 floor 都不会被当成符号引用
      if (isIdentStart(c) && prevSig !== '.') {
        let k = j;
        while (k < n && /\s/.test(code[k])) k++;
        const isObjKey = code[k] === ':' && (prevSig === '{' || prevSig === ',');
        if (!isObjKey) names.set(run, (names.get(run) || 0) + 1);
        // Ns.member
        if (code[k] === '.') {
          const m = code.slice(k + 1).match(/^\s*([A-Za-z_$][A-Za-z0-9_$]*)/);
          if (m) accesses.add(`${run}.${m[1]}`);
        }
      }
      prevSig = 'x';
      i = j;
      continue;
    }
    // 展开语法 `[...X]` / `{ ...X }` 会连着写两个以上的点。若只看「上一个字符是点」
    // 就判定为属性访问，X 会被当成成员名跳过——明明是个引用却查不出来。
    // 所以第二个点起就不算「点访问」了。
    if (!/\s/.test(c)) prevSig = (c === '.' && code[i - 1] === '.') ? 'x' : c;
    i++;
  }
  return { names, accesses };
}

/** 从 `const Ns = (function () {` 里取命名空间名。 */
function namespaceOf(code) {
  const m = code.match(/^const ([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*\(\s*function\s*\(\s*\)\s*\{/m);
  return m ? m[1] : null;
}

/** 取模块前言的解构名单：`const { a, b } = Ns;`（允许换行）。 */
function prologueOf(code) {
  const names = new Set();
  const re = /^ {4}const \{([\s\S]*?)\} = ([A-Za-z_$][A-Za-z0-9_$]*);/gm;
  let m;
  while ((m = re.exec(code))) {
    for (const raw of m[1].split(',')) {
      const part = raw.includes(':') ? raw.split(':')[1] : raw;
      const id = part.trim().match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
      if (id) names.add(id[0]);
    }
  }
  return names;
}

/** 取 `return { a, b, c };` 的导出名单。要求一条一条列出来（不用展开运算符）。 */
function exportsOf(code) {
  const m = code.match(/^ {4}return \{([\s\S]*?)\};/m);
  if (!m) return null;
  const names = new Set();
  for (const raw of m[1].split(',')) {
    const part = raw.includes(':') ? raw.split(':')[0] : raw;
    const id = part.trim().match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
    if (id) names.add(id[0]);
  }
  return names;
}

/**
 * @param {{name:string, code:string}[]} files 按**加载顺序**（即拼装顺序）排列
 */
export function analyzeModules(files) {
  const problems = [];
  const stripped = files.map((f) => strip(f.code));
  const declRe = /^ {4}(?:async\s+function|function|const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;

  const modules = files.map((f, i) => {
    const declared = new Set();
    declRe.lastIndex = 0;
    let m;
    while ((m = declRe.exec(f.code))) declared.add(m[1]);
    const ns = namespaceOf(f.code);
    const exports = exportsOf(f.code);
    const prologue = prologueOf(f.code);
    if (!ns) problems.push({ file: f.name, msg: '没有找到 `const Ns = (function () {` 包装' });
    if (!exports) problems.push({ file: f.name, msg: '没有找到 `return { ... };` 导出表' });
    // 导出的名字必须是本模块**自己声明**的。写成别家的符号（或拼错）在 IIFE 跑完的
    // 那一刻就是个 ReferenceError，而 --check 的字节比对看不出来。
    for (const name of exports || []) {
      if (!declared.has(name)) {
        problems.push({ file: f.name, msg: `导出表里的 \`${name}\` 本模块并没有声明（拼错？还是从别的模块搬来时忘了定义？）` });
      }
    }
    const local = new Set([...declared, ...prologue]);
    return {
        name: f.name, index: i, ns, declared, exports: exports || new Set(), prologue, local,
        importsNeeded: new Map(),   // 前面模块的符号 —— 该写进前言
        forwardNeeded: new Map(),   // 后面模块的符号 —— 该在调用点写 Ns.符号
    };
  });

  // 符号归属表。只用**真正的顶层声明**——前言解构进来的名字是局部的，不算归属。
  const owner = new Map();
  for (const mod of modules) {
    for (const name of mod.declared) {
      const prev = owner.get(name);
      if (prev !== undefined && prev !== mod.index) {
        problems.push({ file: mod.name, msg: `顶层符号 \`${name}\` 与 ${files[prev].name} 重名` });
      } else if (prev === undefined) {
        owner.set(name, mod.index);
      }
    }
  }

  const nsByName = new Map();
  for (const m of modules) if (m.ns) nsByName.set(m.ns, m.index);

  const needed = modules.map(() => new Set());

  for (const mod of modules) {
    const i = mod.index;
    const { names, accesses } = scanTokens(stripped[i]);

    for (const name of names.keys()) {
      // 只看「本模块自己声明的」——前言解构进来的名字不算局部声明，它正是「谁用了谁」
      // 的证据。曾经这里判的是 local（含前言），结果被别的模块前言解构走的符号会被
      // 误报成「导出了但没人用」。
      if (mod.declared.has(name)) continue;
      const j = owner.get(name);
      if (j === undefined) continue;              // 内置 / 全局 / 拼错的名字（由运行时兜住）
      const target = modules[j];
      needed[j].add(name);
      if (j > i) {
        addTo(mod.forwardNeeded, target.ns, name);
        problems.push({
          file: mod.name,
          msg: `前向裸引用 \`${name}\`（属于后加载的 ${target.name}）——它的 IIFE 还没跑完，` +
               `必须在调用点写成 \`${target.ns}.${name}\``,
        });
      } else {
        addTo(mod.importsNeeded, target.ns, name);
      }
      if (j < i && !mod.prologue.has(name)) {
        problems.push({
          file: mod.name,
          msg: `用了前面模块的 \`${name}\`（属于 ${target.name}），前言里却没解构它——` +
               `补一行 \`const { ${name} } = ${target.ns};\``,
        });
      }
    }

    for (const pair of accesses) {
      const k = pair.indexOf('.');
      const ns = pair.slice(0, k);
      const member = pair.slice(k + 1);
      const j = nsByName.get(ns);
      if (j === undefined) continue;              // 不是本项目的命名空间（Math./G. 等）
      needed[j].add(member);
      if (!modules[j].exports.has(member)) {
        problems.push({ file: mod.name, msg: `\`${ns}.${member}\` 不在 ${modules[j].name} 的导出表里` });
      }
    }
  }

  for (const mod of modules) {
    mod.unusedExports = [...mod.exports].filter((n) => !needed[mod.index].has(n));
  }

  return { problems, modules, needed };
}
