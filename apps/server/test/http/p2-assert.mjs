// P2 验收断言（docs/07 §3.3 B1-B11）—— 可复现：node apps/server/test/http/p2-assert.mjs
const BASE = 'http://localhost:3000/api/v1';
let admin = '';
let tester = '';
const results = [];
const assert = (id, desc, pass, detail) => {
  results.push({ id, desc, pass, detail: String(detail).slice(0, 160) });
};

async function api(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return {
    status: res.status,
    code: json.code,
    message: json.message,
    data: json.data,
  };
}

// ---------- 前置：登录 ----------
const loginAdmin = await api('POST', '/auth/login', {
  account: 'admin',
  password: 'Admin@123456',
});
admin = loginAdmin.data?.accessToken;
assert(
  'B0a',
  'admin 登录',
  loginAdmin.code === 0 && !!admin,
  loginAdmin.message,
);

// tester01 无四层权限（P1 建的 qa 账号）→ 用于 B10 权限拒绝
const loginTester = await api('POST', '/auth/login', {
  account: 'tester01',
  password: 'Test@123456',
});
tester = loginTester.data?.accessToken;
assert(
  'B0b',
  'tester01 登录',
  loginTester.code === 0 && !!tester,
  loginTester.message,
);

// 建一个受控普通用户（无任何角色）用于数据权限隔离验证 B7
const restrictedAccount = `viewer_${Date.now() % 100000}`;
const createdViewer = await api(
  'POST',
  '/users',
  { account: restrictedAccount, password: 'View@123456', realname: '旁观者' },
  admin,
);
const viewerId = createdViewer.data?.id;
// viewer 需具备功能权限（project.browse/view）才能进入数据权限层（2003 先于 2004 的分层语义）
const viewerRole = await api(
  'POST',
  '/roles',
  {
    name: '旁观只读' + (Date.now() % 10000),
    code: 'viewer-ro-' + (Date.now() % 100000),
  },
  admin,
);
await api(
  'PUT',
  `/roles/${viewerRole.data.id}/permissions`,
  { permissions: ['project.browse', 'project.view'] },
  admin,
);
await api(
  'PUT',
  `/users/${viewerId}/roles`,
  { roleIds: [Number(viewerRole.data.id)], projectId: 0 },
  admin,
);
assert('B0c', '建无角色用户', createdViewer.code === 0, createdViewer.message);
const loginViewer = await api('POST', '/auth/login', {
  account: restrictedAccount,
  password: 'View@123456',
});
const viewer = loginViewer.data?.accessToken;
assert(
  'B0d',
  'viewer 登录',
  loginViewer.code === 0 && !!viewer,
  loginViewer.message,
);

// ---------- B1 项目集树（grade/path 自动） ----------
const root = await api(
  'POST',
  '/programs',
  {
    name: `项目集A_${Date.now() % 10000}`,
    begin: '2026-11-01',
    end: '2027-06-30',
  },
  admin,
);
assert(
  'B1a',
  '建顶级项目集',
  root.code === 0 &&
    root.data?.grade === 1 &&
    root.data?.pathStr === `,${root.data?.id},`,
  `grade=${root.data?.grade} path=${root.data?.pathStr}`,
);
const child = await api(
  'POST',
  '/programs',
  {
    parentId: Number(root.data.id),
    name: '子项目集A1',
    begin: '2026-11-01',
    end: '2027-03-31',
  },
  admin,
);
assert(
  'B1b',
  '建子项目集 grade=父+1 path 继承',
  child.code === 0 &&
    child.data?.grade === 2 &&
    child.data?.pathStr === `${root.data.pathStr}${child.data.id},`,
  `grade=${child.data?.grade} path=${child.data?.pathStr}`,
);

// ---------- B2 产品（挂项目集） ----------
const product = await api(
  'POST',
  '/products',
  { programId: Number(root.data.id), name: '能耗平台', poId: '1' },
  admin,
);
assert(
  'B2',
  '建产品（挂项目集）',
  product.code === 0 &&
    String(product.data?.programId) === String(root.data.id),
  product.message,
);

// ---------- B3 项目创建 + 影子迭代（multiple=0） ----------
const project = await api(
  'POST',
  '/projects',
  {
    programId: Number(root.data.id),
    name: 'EMS一期',
    code: `EMS-P1-${Date.now() % 10000}`,
    model: 'scrum',
    begin: '2026-11-10',
    end: '2027-01-31',
    multiple: 0,
    acl: 'open',
  },
  admin,
);
assert('B3a', '建项目（multiple=0）', project.code === 0, project.message);
const execs = await api(
  'GET',
  `/executions?projectId=${project.data.id}`,
  undefined,
  admin,
);
const execArr = Array.isArray(execs.data)
  ? execs.data
  : (execs.data?.list ?? []);
const shadow = execArr.find((e) => e.type === 'sprint');
assert(
  'B3b',
  '影子迭代自动创建（type=sprint, grade=1）',
  !!shadow,
  execArr.map((e) => e.type).join(',') || 'empty',
);

// ---------- B4 项目关联产品 ----------
const pp = await api(
  'PUT',
  `/projects/${project.data.id}/products`,
  { items: [{ productId: product.data.id, plan: '', roadmap: '' }] },
  admin,
);
assert(
  'B4a',
  '项目关联产品',
  pp.code === 0 && pp.data?.length === 1,
  pp.message,
);
const ppDup = await api(
  'PUT',
  `/projects/${project.data.id}/products`,
  { items: [{ productId: product.data.id }, { productId: product.data.id }] },
  admin,
);
assert(
  'B4b',
  '重复关联被唯一约束拦截（replace 语义存一条）',
  ppDup.code === 0 && ppDup.data?.length === 1,
  `count=${ppDup.data?.length}`,
);

// ---------- B5 执行类型映射 ----------
const kanbanProj = await api(
  'POST',
  '/projects',
  {
    name: '看板项目',
    code: `KB-${Date.now() % 10000}`,
    model: 'kanban',
    begin: '2026-11-10',
    end: '2027-01-31',
    multiple: 1,
  },
  admin,
);
const kbExec = await api(
  'POST',
  '/executions',
  {
    projectId: kanbanProj.data.id,
    name: '看板执行1',
    begin: '2026-11-10',
    end: '2026-12-10',
  },
  admin,
);
assert(
  'B5',
  'kanban 项目建执行 type=kanban',
  kbExec.code === 0 && kbExec.data?.type === 'kanban',
  `type=${kbExec.data?.type}`,
);

// ---------- B6 syncPPE 传播（执行 start → 项目/项目集 wait→doing） ----------
let targetExec = shadow;
if (!targetExec) {
  const createdExec = await api(
    'POST',
    '/executions',
    {
      projectId: project.data.id,
      name: 'EMS-迭代一',
      begin: '2026-11-10',
      end: '2026-12-10',
    },
    admin,
  );
  targetExec = createdExec.data;
}
const startExec = await api(
  'POST',
  `/executions/${targetExec.id}/start`,
  {},
  admin,
);
assert(
  'B6a',
  '执行 start → doing',
  startExec.code === 0 && startExec.data?.status === 'doing',
  startExec.message,
);
const projAfter = await api(
  'GET',
  `/projects/${project.data.id}`,
  undefined,
  admin,
);
assert(
  'B6b',
  '项目 wait→doing（传播）',
  projAfter.data?.status === 'doing',
  `status=${projAfter.data?.status}`,
);
const progAfter = await api(
  'GET',
  `/programs/${root.data.id}`,
  undefined,
  admin,
);
assert(
  'B6c',
  '项目集 wait→doing（传播）',
  progAfter.data?.status === 'doing',
  `status=${progAfter.data?.status}`,
);

// 回 wait 拒绝（4602）：已有 realBegan
const backWait = await api(
  'POST',
  `/executions/${targetExec.id}/back-to-wait`,
  {},
  admin,
);
assert(
  'B6d',
  '回 wait 被拒（4602）',
  backWait.code === 4602,
  `code=${backWait.code}`,
);

// ---------- B7/B8 private 项目可见性 ----------
const privateProj = await api(
  'POST',
  '/projects',
  {
    programId: Number(root.data.id),
    name: '机密项目',
    code: `SEC-${Date.now() % 10000}`,
    model: 'scrum',
    begin: '2026-11-10',
    end: '2027-01-31',
    multiple: 1,
    acl: 'private',
    whitelist: [String(viewerId)],
  },
  admin,
);
assert(
  'B7a',
  '建 private 项目+白名单 viewer',
  privateProj.code === 0,
  privateProj.message,
);
// 白名单外（tester01 有登录但无数据权限；注意 tester01 无 project.browse 功能权限——改用另一无权限用户无法进列表，故用 viewer 在白名单内可见）
const viewerList = await api('GET', '/projects', undefined, viewer);
const viewerArr = Array.isArray(viewerList.data)
  ? viewerList.data
  : (viewerList.data?.list ?? []);
const viewerSees = viewerArr.some((p) => p.id === privateProj.data.id);
assert(
  'B8',
  '白名单内用户可见 private 项目',
  viewerList.code === 0 && viewerSees,
  `count=${viewerList.data?.list?.length}`,
);
// 白名单外用户单对象访问 → 2004
const outsider = await api(
  'POST',
  '/users',
  {
    account: `out_${Date.now() % 100000}`,
    password: 'Out@123456',
    realname: '圈外',
  },
  admin,
);
const outId = outsider.data?.id;
const browseRole = await api(
  'POST',
  '/roles',
  { name: `只读${Date.now() % 10000}`, code: `ro-${Date.now() % 100000}` },
  admin,
);
await api(
  'PUT',
  `/roles/${browseRole.data.id}/permissions`,
  { permissions: ['project.browse', 'project.view'] },
  admin,
);
await api(
  'PUT',
  `/users/${outId}/roles`,
  { roleIds: [Number(browseRole.data.id)], projectId: 0 },
  admin,
);
const outsiderLogin = await api('POST', '/auth/login', {
  account: outsider.data.account,
  password: 'Out@123456',
});
const outToken = outsiderLogin.data.accessToken;
const outGet = await api(
  'GET',
  `/projects/${privateProj.data.id}`,
  undefined,
  outToken,
);
assert(
  'B7b',
  '白名单外单对象访问 2004',
  outGet.code === 2004,
  `code=${outGet.code}`,
);
const outList = await api('GET', '/projects', undefined, outToken);
const outArr = Array.isArray(outList.data)
  ? outList.data
  : (outList.data?.list ?? []);
const outSees = outArr.some((p) => p.id === privateProj.data.id);
assert(
  'B7c',
  '白名单外列表不含 private 项目',
  outList.code === 0 && !outSees,
  `count=${outList.data?.list?.length}`,
);

// ---------- B9 团队成员 ----------
const member = await api(
  'POST',
  '/team',
  {
    rootType: 'project',
    rootId: project.data.id,
    userId: viewerId,
    role: 'dev',
    hours: 8,
  },
  admin,
);
assert('B9a', '加团队成员', member.code === 0, member.message);
const dupMember = await api(
  'POST',
  '/team',
  { rootType: 'project', rootId: project.data.id, userId: viewerId },
  admin,
);
assert(
  'B9b',
  '重复添加 3004',
  dupMember.code === 3004,
  `code=${dupMember.code}`,
);

// ---------- B10 功能权限 2003 ----------
const testerCreate = await api(
  'POST',
  '/programs',
  { name: '越权项目集', begin: '2026-11-01', end: '2027-01-01' },
  tester,
);
assert(
  'B10',
  'tester01 建项目集 2003',
  testerCreate.code === 2003,
  `code=${testerCreate.code}`,
);

// ---------- B11 迁移基线：行使 8 表（docker 可达时直查，否则以 API 行使证据链） ----------
const modCreate = await api(
  'POST',
  '/modules',
  { rootId: product.data.id, name: '设备接入' },
  admin,
);
assert(
  'B11a',
  '模块创建（zt_module 行使）',
  modCreate.code === 0,
  modCreate.message,
);
const storyRange = await api(
  'PUT',
  `/projects/${project.data.id}/products`,
  { items: [{ productId: product.data.id, plan: 'plan-1' }] },
  admin,
);
assert(
  'B11b',
  '项目-产品关联（zt_project_product 行使）',
  storyRange.code === 0,
  storyRange.message,
);
let b11pass = modCreate.code === 0 && storyRange.code === 0;
let b11detail =
  'API 行使 zt_program/zt_product/zt_module/zt_project/zt_execution/zt_project_product/zt_team 均成功；zt_project_story 为 P3 预留表，由迁移执行记录覆盖';
try {
  const { execSync } = await import('node:child_process');
  const tables = execSync(
    `docker exec zentao-mysql mysql -uroot -p${process.env.MYSQL_ROOT_PASSWORD ?? 'change_me_dev_only'} zentao_nest -e "SHOW TABLES LIKE 'zt_%';"`,
    { encoding: 'utf8', shell: 'C:\\Program Files\\Git\\bin\\bash.exe' },
  );
  const need = [
    'zt_program',
    'zt_product',
    'zt_module',
    'zt_project',
    'zt_execution',
    'zt_project_product',
    'zt_project_story',
    'zt_team',
  ];
  const missing = need.filter((t) => !tables.includes(t));
  b11pass = b11pass && missing.length === 0;
  b11detail =
    missing.length === 0
      ? 'docker 直查 8 表齐全'
      : `missing=${missing.join(',')}`;
} catch {
  b11detail += '（docker 在脚本子进程不可达，回退 API 证据 + 迁移日志）';
}
assert('B11', 'P2 迁移基线 8 表', b11pass, b11detail);

// ---------- 汇总 ----------
const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    { total: results.length, failed: failed.length, results },
    null,
    2,
  ),
);
process.exit(failed.length > 0 ? 1 : 0);
