// P5 验收（docs/01 §11 P5：关键实体变更自动产生 action 日志与通知）
// 可复现：node apps/server/test/http/p5-assert.mjs
const BASE = 'http://localhost:3000/api/v1';
const results = [];
const assert = (id, desc, pass, detail) => {
  results.push({ id, desc, pass, detail: String(detail).slice(0, 150) });
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
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
}
const uniq = Date.now() % 1000000;
const today = new Date().toISOString().slice(0, 10);

const admin = (
  await api('POST', '/auth/login', {
    account: 'admin',
    password: 'Admin@123456',
  })
).data.accessToken;
assert('P0', 'admin 登录', !!admin, '');

// 建一个普通用户（接收通知）
const qaAcc = `p5qa_${uniq}`;
const qaUser = (
  await api(
    'POST',
    '/users',
    { account: qaAcc, password: 'Qa@123456', realname: 'P5测试' },
    admin,
  )
).data;
// 挂 qa 角色（种子含 todo 域全量动作）
const roles = await api('GET', '/roles', undefined, admin);
const qaRole = (Array.isArray(roles.data) ? roles.data : []).find(
  (r) => r.code === 'qa',
);
await api(
  'PUT',
  `/users/${qaUser.id}/roles`,
  { roleIds: [Number(qaRole.id)], projectId: 0 },
  admin,
);
const qaTok = (
  await api('POST', '/auth/login', { account: qaAcc, password: 'Qa@123456' })
).data.accessToken;
assert(
  'P0b',
  '建 qa 用户（挂 qa 角色）',
  !!qaUser?.id && !!qaRole?.id,
  `role=${qaRole?.id}`,
);

// ---------- D 组：文档 ----------
const space = (
  await api(
    'POST',
    '/doc-spaces',
    { objectType: 'project', objectId: '1', name: `P5空间${uniq}` },
    admin,
  )
).data;
assert('D1', '创建空间', !!space.id, space.id);
const lib = (
  await api('POST', '/doc-libs', { spaceId: space.id, name: '设计文档' }, admin)
).data;
assert('D2', '创建库', !!lib.id, lib.id);
const doc = (
  await api(
    'POST',
    '/docs',
    { libId: lib.id, title: '接入方案', content: '# v1 内容' },
    admin,
  )
).data;
assert(
  'D3',
  '创建文档（v1）',
  !!doc.id && doc.version === 1,
  `v=${doc.version}`,
);
const upd = await api(
  'PUT',
  `/docs/${doc.id}`,
  { content: '# v2 内容' },
  admin,
);
assert(
  'D4',
  '编辑文档 version+1',
  upd.data.version === 2,
  `v=${upd.data.version}`,
);
const hist = await api('GET', `/docs/${doc.id}/versions`, undefined, admin);
assert(
  'D5',
  '版本历史含 v1/v2',
  Array.isArray(hist.data) && hist.data.length === 2,
  `n=${hist.data?.length}`,
);
const oldDoc = await api('GET', `/docs/${doc.id}?version=1`, undefined, admin);
assert(
  'D6',
  '历史版本内容可追溯',
  oldDoc.data.content === '# v1 内容',
  oldDoc.data.content,
);

// ---------- T 组：待办四态 ----------
const todo = (
  await api(
    'POST',
    '/todos',
    { type: 'custom', name: 'P5 待办', assignedTo: String(qaUser.id) },
    admin,
  )
).data;
assert('T1', '创建待办（指派 qa）', !!todo.id, todo.id);
const started = await api('POST', `/todos/${todo.id}/start`, {}, qaTok);
if (!started?.data) {
  console.error(JSON.stringify({ debug: started }));
  process.exit(2);
}
assert(
  'T2',
  'start → doing',
  started.data.status === 'doing',
  started.data.status,
);
const finished = await api('POST', `/todos/${todo.id}/finish`, {}, qaTok);
assert(
  'T3',
  'finish → done',
  finished.data.status === 'done',
  finished.data.status,
);
const activated = await api('POST', `/todos/${todo.id}/activate`, {}, qaTok);
assert(
  'T4',
  'activate → doing（可回退）',
  activated.data.status === 'doing',
  activated.data.status,
);
const closed = await api('POST', `/todos/${todo.id}/close`, {}, qaTok);
assert(
  'T5',
  'close → closed',
  closed.data.status === 'closed',
  closed.data.status,
);
const badStart = await api('POST', `/todos/${todo.id}/start`, {}, qaTok);
assert(
  'T6',
  'closed start 3006',
  badStart.code === 3006,
  `code=${badStart.code}`,
);

// ---------- E 组：工时独立填报 ----------
const effort = await api(
  'POST',
  '/efforts',
  { objectType: 'custom', date: today, consumed: 2, left: 0, work: '方案评审' },
  admin,
);
assert('E1', '独立工时填报', effort.code === 0, effort.message);
const badEffort = await api(
  'POST',
  '/efforts',
  { objectType: 'custom', date: '2027-01-01', consumed: 2, work: 'x' },
  admin,
);
assert(
  'E2',
  '未来日期 4703',
  badEffort.code === 4703,
  `code=${badEffort.code}`,
);
const myEfforts = await api('GET', '/efforts', undefined, admin);
assert(
  'E3',
  '我的工时日志',
  Array.isArray(myEfforts.data) &&
    myEfforts.data.some((e) => e.work === '方案评审'),
  myEfforts.data?.length,
);

// ---------- A 组：action 日志断言（task/story/bug 流转自动落档） ----------
const product = (
  await api('POST', '/products', { name: `P5产品${uniq}` }, admin)
).data;
const project = (
  await api(
    'POST',
    '/projects',
    {
      programId: 0,
      name: `P5项目${uniq}`,
      code: `p5-${uniq}`,
      model: 'scrum',
      begin: '2026-11-01',
      end: '2027-01-31',
      multiple: 0,
    },
    admin,
  )
).data;
const ex = (
  await api('GET', `/executions?projectId=${project.id}`, undefined, admin)
).data[0];
const task = (
  await api(
    'POST',
    '/tasks',
    {
      projectId: project.id,
      executionId: ex.id,
      name: 'P5任务',
      type: 'devel',
      estimate: 5,
    },
    admin,
  )
).data;
await api('POST', `/tasks/${task.id}/start`, { consumed: 1, left: 4 }, admin);
const taskActions = await api(
  'GET',
  `/actions?objectType=task&objectId=${task.id}`,
  undefined,
  admin,
);
assert(
  'A1',
  '任务 start 自动落 action 日志',
  Array.isArray(taskActions.data) &&
    taskActions.data.some((a) => a.action === 'started'),
  taskActions.data?.map((a) => a.action).join(','),
);

const story = (
  await api(
    'POST',
    '/stories',
    {
      productId: product.id,
      title: 'P5需求',
      spec: 's',
      verify: 'v',
      status: 'draft',
    },
    admin,
  )
).data;
const storyActions = await api(
  'GET',
  `/actions?objectType=story&objectId=${story.id}`,
  undefined,
  admin,
);
assert(
  'A2',
  '需求创建自动落 action 日志',
  Array.isArray(storyActions.data) &&
    storyActions.data.some((a) => a.action === 'opened'),
  storyActions.data?.map((a) => a.action).join(','),
);

const bug = (
  await api(
    'POST',
    '/bugs',
    { productId: product.id, title: 'P5缺陷', steps: '步骤', openedBuild: '0' },
    admin,
  )
).data;
await api(
  'POST',
  `/bugs/${bug.id}/resolve`,
  { resolution: 'fixed', resolvedBuildId: '0' },
  admin,
);
const bugActions = await api(
  'GET',
  `/actions?objectType=bug&objectId=${bug.id}`,
  undefined,
  admin,
);
assert(
  'A3',
  'Bug resolve 自动落 action 日志',
  Array.isArray(bugActions.data) &&
    bugActions.data.some((a) => a.action === 'resolved'),
  bugActions.data?.map((a) => a.action).join(','),
);

const detail = await api(
  'GET',
  `/actions/${bugActions.data[0].id}`,
  undefined,
  admin,
);
assert(
  'A4',
  '日志明细可查（含 history 结构）',
  detail.code === 0 && !!detail.data.id,
  detail.data?.action,
);

// ---------- N 组：通知断言（指派/评审/解决 → 收件人可见） ----------
const notifyBug = (
  await api(
    'POST',
    '/bugs',
    {
      productId: product.id,
      title: 'P5通知缺陷',
      steps: '步骤',
      openedBuild: '0',
      assignedTo: String(qaUser.id),
    },
    admin,
  )
).data;
const qaNotif1 = await api('GET', '/notifications?unread=1', undefined, qaTok);
assert(
  'N1',
  'Bug 指派 → qa 收到通知',
  Array.isArray(qaNotif1.data) &&
    qaNotif1.data.some(
      (n) =>
        String(n.objectId) === String(notifyBug.id) && n.action === 'assigned',
    ),
  qaNotif1.data?.length,
);
const unreadBefore = await api(
  'GET',
  '/notifications/unread-count',
  undefined,
  qaTok,
);
assert('N2', '未读计数 >0', Number(unreadBefore.data) > 0, unreadBefore.data);
const firstUnread = qaNotif1.data.find(
  (n) => String(n.objectId) === String(notifyBug.id),
);
if (!firstUnread) {
  console.error(
    JSON.stringify({ debug: 'target notify missing', list: qaNotif1.data }),
  );
  process.exit(2);
}
await api('POST', `/notifications/${firstUnread.id}/read`, {}, qaTok);
const unreadAfter = await api(
  'GET',
  '/notifications/unread-count',
  undefined,
  qaTok,
);
assert(
  'N3',
  '标记已读后计数减一',
  Number(unreadAfter.data) === Number(unreadBefore.data) - 1,
  `${unreadBefore.data}→${unreadAfter.data}`,
);

// 评审通知：story 提审 reviewerIds=[qa]
const storyR = (
  await api(
    'POST',
    '/stories',
    {
      productId: product.id,
      title: 'P5评审需求',
      spec: 's',
      verify: 'v',
      status: 'active',
      reviewerIds: [String(qaUser.id)],
    },
    admin,
  )
).data;
const qaNotif2 = await api('GET', '/notifications?unread=1', undefined, qaTok);
assert(
  'N4',
  '提审 → 评审人收到 submitreview 通知',
  Array.isArray(qaNotif2.data) &&
    qaNotif2.data.some(
      (n) =>
        String(n.objectId) === String(storyR.id) && n.action === 'submitreview',
    ),
  qaNotif2.data?.length,
);

// resolve → 指派回开单人（admin）→ admin 收通知
await api(
  'POST',
  `/bugs/${notifyBug.id}/resolve`,
  { resolution: 'fixed', resolvedBuildId: '0' },
  admin,
);
const adminNotif = await api(
  'GET',
  '/notifications?unread=1',
  undefined,
  admin,
);
assert(
  'N5',
  'Bug 解决 → 开单人收到 resolved 通知',
  Array.isArray(adminNotif.data) &&
    adminNotif.data.some(
      (n) =>
        String(n.objectId) === String(notifyBug.id) && n.action === 'resolved',
    ),
  adminNotif.data?.length,
);

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
