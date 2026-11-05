// codemod：修复 p2-assert.mjs 响应取值形态 + B6 传播链目标执行
const fs = require('fs');
const p = 'apps/server/test/http/p2-assert.mjs';
let s = fs.readFileSync(p, 'utf8');

const edits = [
  // B3b：executions data 直接是数组
  [
    "const shadow = (execs.data?.list ?? []).find((e) => e.type === 'sprint');",
    "const execArr = Array.isArray(execs.data) ? execs.data : execs.data?.list ?? [];\nconst shadow = execArr.find((e) => e.type === 'sprint');",
  ],
  [
    "execs.data?.list?.map((e) => e.type).join(',') || 'empty'",
    "execArr.map((e) => e.type).join(',') || 'empty'",
  ],
  // B8/B7c：数组取值
  [
    'const viewerSees = (viewerList.data?.list ?? []).some((p) => p.id === privateProj.data.id);',
    'const viewerArr = Array.isArray(viewerList.data) ? viewerList.data : viewerList.data?.list ?? [];\nconst viewerSees = viewerArr.some((p) => p.id === privateProj.data.id);',
  ],
  [
    'const outSees = (outList.data?.list ?? []).some((p) => p.id === privateProj.data.id);',
    'const outArr = Array.isArray(outList.data) ? outList.data : outList.data?.list ?? [];\nconst outSees = outArr.some((p) => p.id === privateProj.data.id);',
  ],
  // B6：传播链用 EMS 项目的执行（影子缺失则显式建）
  [
    'const targetExec = shadow ?? kbExec.data;',
    "let targetExec = shadow;\nif (!targetExec) {\n  const createdExec = await api('POST', '/executions', { projectId: project.data.id, name: 'EMS-迭代一', begin: '2026-11-10', end: '2026-12-10' }, admin);\n  targetExec = createdExec.data;\n}",
  ],
  // B7b：圈外用户需先具备功能权限（project.browse/view），功能权限(2003)先于数据权限(2004)分层验证
  [
    "const outsider = await api('POST', '/users', { account: `out_${Date.now() % 100000}`, password: 'Out@123456', realname: '圈外' }, admin);",
    "const outsider = await api('POST', '/users', { account: `out_${Date.now() % 100000}`, password: 'Out@123456', realname: '圈外' }, admin);\nconst outId = outsider.data?.id;\nconst browseRole = await api('POST', '/roles', { name: `只读${Date.now() % 10000}`, code: `ro-${Date.now() % 100000}` }, admin);\nawait api('PUT', `/roles/${browseRole.data.id}/permissions`, { permissions: ['project.browse', 'project.view'] }, admin);\nawait api('PUT', `/users/${outId}/roles`, { roleIds: [Number(browseRole.data.id)], projectId: 0 }, admin);",
  ],
];

let applied = 0;
for (const [from, to] of edits) {
  if (s.includes(from)) {
    s = s.split(from).join(to);
    applied += 1;
  } else {
    console.log('MISS:', from.slice(0, 60));
  }
}
fs.writeFileSync(p, s);
console.log('applied', applied, 'of', edits.length);
