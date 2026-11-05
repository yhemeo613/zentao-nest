// codemod：修复所有 service 中错误的 BusinessException 从 shared 导入（按文件深度计算相对路径）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'apps', 'server', 'src', 'modules');

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

let fixed = 0;
for (const file of walk(root).filter((f) => f.endsWith('.ts'))) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes("import { BusinessException, ErrorCodes } from '@zentao/shared';")) continue;
  // 深度：src/modules/<mod>/file.ts → ../../common；src/modules/<mod>/sub/file.ts → ../../../common
  const rel = path.relative(path.dirname(file), path.join(root, '..')).replace(/\\/g, '/');
  const importPath = `${rel}/common/exceptions/business.exception.js`;
  s = s.replace(
    "import { BusinessException, ErrorCodes } from '@zentao/shared';",
    `import { ErrorCodes } from '@zentao/shared';\nimport { BusinessException } from '${importPath}';`,
  );
  fs.writeFileSync(file, s);
  fixed += 1;
  console.log('fixed', path.relative(process.cwd(), file), '->', importPath);
}
console.log('total fixed:', fixed);
