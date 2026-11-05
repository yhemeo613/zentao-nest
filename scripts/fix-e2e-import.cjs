// codemod：e2e-fullchain.mjs 的 import-from-plan body 去掉 projectId（服务端改从执行推导）
const fs = require('fs');
const p = 'apps/server/test/http/e2e-fullchain.mjs';
let s = fs.readFileSync(p, 'utf8');
const from = '{ planId: plan.id, projectId: project.id }';
const to = '{ planId: plan.id }';
if (s.includes(from)) {
  s = s.split(from).join(to);
  fs.writeFileSync(p, s);
  console.log('fixed');
} else {
  console.log('pattern not found');
  process.exit(1);
}
