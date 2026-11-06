// 权限点漂移校验（docs/03 §3.1 门禁）：shared PERMS 与 DB sys_permission 一致性
// 用法：node apps/server/scripts/permission-drift-check.mjs（需服务运行中）
import { allPermKeys } from '@zentao/shared';

const BASE = process.env.API_BASE ?? 'http://localhost:3000/api/v1';
const login = await fetch(BASE + '/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    account: process.env.ADMIN_ACCOUNT ?? 'admin',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@123456',
  }),
}).then((r) => r.json());
if (login.code !== 0) {
  console.error('[drift] 登录失败，无法校验');
  process.exit(1);
}
const tree = await fetch(BASE + '/permissions', {
  headers: { authorization: `Bearer ${login.data.accessToken}` },
}).then((r) => r.json());
if (tree.code !== 0) {
  console.error('[drift] 权限树查询失败:', tree.message);
  process.exit(1);
}
const dbPerms = new Set(
  (tree.data ?? []).flatMap((g) =>
    g.actions.filter((a) => a.status === 'active').map((a) => a.key),
  ),
);
const declared = new Set(allPermKeys());
const missing = [...declared].filter((k) => !dbPerms.has(k));
const extra = [...dbPerms].filter((k) => !declared.has(k));
if (missing.length || extra.length) {
  console.error('[drift] FAIL missing=', missing, 'extra=', extra);
  process.exit(1);
}
console.log(`[drift] PASS 权限点完全一致（${dbPerms.size} 个）`);
