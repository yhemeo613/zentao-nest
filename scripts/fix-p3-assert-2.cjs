// codemod 2：修复 p3-assert 脚本 S2g/S4e 场景缺陷
const fs = require('fs');
const p = 'apps/server/test/http/p3-assert.mjs';
let s = fs.readFileSync(p, 'utf8');

const edits = [
  // S2g：原场景（activate 后再 start）在 API 面不可达——start 仅 wait，activate 后是 doing。
  // 改为验证 activate 正路径：→ doing 且 consumed 保持（4702 语义移到单测覆盖）。
  [
    "const act = await api('POST', `/tasks/${task?.data?.id}/activate`, { left: 5 }, admin);\nconst badConsumed = await api('POST', `/tasks/${task?.data?.id}/start`, { consumed: 1, left: 4 }, admin);\nassert('S2g', 'consumed 只增不减 4702', act?.code === 0 && badConsumed?.code === 4702, `code=${badConsumed?.code}`);",
    "const consumedBefore = Number(task?.data?.consumed);\nconst act = await api('POST', `/tasks/${task?.data?.id}/activate`, { left: 5 }, admin);\nassert('S2g', 'activate 返工 → doing 且 consumed 保持', act?.code === 0 && act?.data?.status === 'doing' && Number(act?.data?.consumed) === consumedBefore, `st=${act?.data?.status} consumed=${act?.data?.consumed}`);",
  ],
  // S4e：完成日期须晚于 begin(2026-11-21)，用 2026-11-22（服务端只校验 >begin，docs/02 §7.3 简化）
  [
    "const okCloseTt = await api('POST', `/testtasks/${tt?.data?.id}/close`, { realFinishedDate: new Date().toISOString().slice(0, 10) }, admin);",
    "const okCloseTt = await api('POST', `/testtasks/${tt?.data?.id}/close`, { realFinishedDate: '2026-11-22' }, admin);",
  ],
];

let applied = 0;
for (const [from, to] of edits) {
  if (s.includes(from)) {
    s = s.split(from).join(to);
    applied += 1;
  } else {
    console.log('MISS:', from.slice(0, 70));
  }
}
fs.writeFileSync(p, s);
console.log('applied', applied, '/', edits.length);
