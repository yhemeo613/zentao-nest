// codemod：SFC 具名导入 .vue 组件 → 默认导入（Vue SFC 单组件文件只有默认导出）
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'apps', 'web', 'src', 'views');
const mapping = [
  [/import \{ PageHeader \} from '([^']+page-header\.vue)';/g, "import PageHeader from '$1';"],
  [/import \{ StatusTag \} from '([^']+status-tag\.vue)';/g, "import StatusTag from '$1';"],
  [/import \{ EmptyState \} from '([^']+empty-state\.vue)';/g, "import EmptyState from '$1';"],
  [/import \{ Input \} from '([^']+input\.vue)';/g, "import Input from '$1';"],
  [/import \{ Dialog \} from '([^']+dialog\.vue)';/g, "import Dialog from '$1';"],
  [/import \{ Select \} from '([^']+select\.vue)';/g, "import Select from '$1';"],
  [/import \{ Tabs \} from '([^']+tabs\.vue)';/g, "import Tabs from '$1';"],
  [
    /import \{ ConfirmDialog \} from '([^']+confirm-dialog\.vue)';/g,
    "import ConfirmDialog from '$1';",
  ],
  [
    /import \{ ToastContainer \} from '([^']+toast-container\.vue)';/g,
    "import ToastContainer from '$1';",
  ],
];

function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

let fixed = 0;
for (const file of walk(root).filter((f) => f.endsWith('.vue'))) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  for (const [re, to] of mapping) s = s.replace(re, to);
  if (s !== before) {
    fs.writeFileSync(file, s);
    fixed += 1;
  }
}
console.log('fixed', fixed, 'files');
