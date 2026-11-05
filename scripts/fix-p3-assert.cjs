// codemod：修复 p3-assert 脚本 3 处（assignedTo 用 userId '1'；S3e 前 build linkStories）
const fs = require('fs');
const p = 'apps/server/test/http/p3-assert.mjs';
let s = fs.readFileSync(p, 'utf8');

const edits = [
  // S3a/S3b：assignedTo 存 userId（'1'=admin 的 id），不是账号字符串
  [
    "assert('S3a', 'Bug resolve fixed → resolved + 指派回开单人', resolved?.data?.status === 'resolved' && resolved?.data?.assignedTo === 'admin', resolved?.data?.assignedTo);",
    "assert('S3a', 'Bug resolve fixed → resolved + 指派回开单人', resolved?.data?.status === 'resolved' && resolved?.data?.assignedTo === '1', resolved?.data?.assignedTo);",
  ],
  [
    "assert('S3b', 'Bug activate 重开 count+1 + 指派=原解决人', reactivatedBug?.data?.activatedCount === 1 && reactivatedBug?.data?.assignedTo === 'admin', `n=${reactivatedBug?.data?.activatedCount}`);",
    "assert('S3b', 'Bug activate 重开 count+1 + 指派=原解决人', reactivatedBug?.data?.activatedCount === 1 && reactivatedBug?.data?.assignedTo === '1', `n=${reactivatedBug?.data?.activatedCount} at=${reactivatedBug?.data?.assignedTo}`);",
  ],
  // S3e：build 须先关联需求，发布汇总才有 storyIds → related 表 → setStage released
  [
    "const release = await api('POST', '/releases',",
    "await api('POST', `/builds/${build?.data?.id}/stories`, { storyIds: [storyR?.data?.id] }, admin);\nconst release = await api('POST', '/releases',",
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
