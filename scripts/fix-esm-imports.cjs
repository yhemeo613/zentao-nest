// 一次性 codemod：为 src 下相对导入补 .js 扩展名（TS6 + ESM nodenext 要求）
// 用法：node scripts/fix-esm-imports.cjs apps/server
const fs = require('fs');
const path = require('path');

const root = process.argv[2] ?? 'apps/server';
const srcDir = path.join(root, 'src');

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

let patched = 0;
for (const file of walk(srcDir).filter((f) => f.endsWith('.ts'))) {
  const original = fs.readFileSync(file, 'utf8');
  // from './x' / import('./x') / side-effect import './x' —— 仅补无扩展名的相对路径
  let next = original.replace(
    /(from\s+['"]|import\(\s*['"]|import\s+['"])(\.\.?\/[^'"]+)(['"])/g,
    (m, prefix, spec, quote) =>
      /\.(js|mjs|cjs|json|ts|tsx|css|scss|vue|svg|png|jpg|jpeg|gif|md|node)$/i.test(spec)
        ? m
        : `${prefix}${spec}.js${quote}`,
  );
  if (next !== original) {
    fs.writeFileSync(file, next);
    patched += 1;
    console.log('patched', file);
  }
}
console.log('done:', patched, 'files');
