// P6 验收（docs/01 §11 P6：看板列/WIP/拖拽映射 + P6 批量端点组）
const BASE = 'http://localhost:3000/api/v1';
const results = [];
const assert = (id, desc, pass, detail) => {
  results.push({ id, desc, pass, detail: String(detail).slice(0, 140) });
};
async function api(m, p, b, t) {
  const r = await fetch(BASE + p, {
    method: m,
    headers: {
      'content-type': 'application/json',
      ...(t ? { authorization: `Bearer ${t}` } : {}),
    },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}
const uniq = Date.now() % 1000000;
const today = new Date().toISOString().slice(0, 10);

const admin = (
  await api('POST', '/auth/login', {
    account: 'admin',
    password: 'Admin@123456',
  })
).data.accessToken;
assert('B0', 'admin 登录', !!admin, '');

// ---------- K 组：看板 ----------
const project = (
  await api(
    'POST',
    '/projects',
    {
      programId: 0,
      name: `P6项目${uniq}`,
      code: `p6-${uniq}`,
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
const board1 = await api('GET', `/executions/${ex.id}/board`, undefined, admin);
const lanes = board1.data.lanes ?? [];
const cols = board1.data.columns ?? [];
assert(
  'K1',
  '首访惰性初始化（3 泳道 7 列）',
  lanes.length === 3 && cols.length === 7,
  `l=${lanes.length} c=${cols.length}`,
);
const colByType = {};
cols.forEach((c) => (colByType[c.type] = c));
assert(
  'K2',
  '父子列结构（develop→developing/developed）',
  colByType.developing?.parentId === colByType.develop?.id,
  `devP=${colByType.developing?.parentId}`,
);
const again = await api('GET', `/executions/${ex.id}/board`, undefined, admin);
assert(
  'K3',
  '再访幂等（不重复建）',
  (again.data.lanes ?? []).length === 3,
  again.data.lanes?.length,
);

const task = (
  await api(
    'POST',
    '/tasks',
    {
      projectId: project.id,
      executionId: ex.id,
      name: 'P6看板任务',
      type: 'devel',
      estimate: 8,
    },
    admin,
  )
).data;
const moved = await api(
  'POST',
  `/executions/${ex.id}/board/tasks/${task.id}/move`,
  { toColumnId: colByType.developing.id },
  admin,
);
assert(
  'K4',
  '拖到 developing → start doing',
  moved.data?.task?.status === 'doing',
  moved.data?.task?.status,
);
const boardAfter = await api(
  'GET',
  `/executions/${ex.id}/board`,
  undefined,
  admin,
);
const devCell = (boardAfter.data.cells ?? []).find(
  (c) => c.columnId === colByType.developing.id && c.type === 'task',
);
assert(
  'K5',
  'cell.cards 含任务（cardTasks 渲染源）',
  (devCell?.cardTasks ?? []).some((t) => t.id === task.id),
  JSON.stringify(devCell?.cards),
);

const finishMove = await api(
  'POST',
  `/executions/${ex.id}/board/tasks/${task.id}/move`,
  { toColumnId: colByType.developed.id },
  admin,
);
assert(
  'K6',
  '拖到 developed → finish done',
  finishMove.data?.task?.status === 'done',
  finishMove.data?.task?.status,
);
const backMove = await api(
  'POST',
  `/executions/${ex.id}/board/tasks/${task.id}/move`,
  { toColumnId: colByType.developing.id },
  admin,
);
assert(
  'K7',
  '拖回 developing → activate 返工',
  backMove.data?.task?.status === 'doing',
  backMove.data?.task?.status,
);

// WIP：developing 设限 0 后移动超限警告
const wipCol = await api(
  'PUT',
  `/board/columns/${colByType.developing.id}`,
  { wipLimit: 0 },
  admin,
);
const wipMove = await api(
  'POST',
  `/executions/${ex.id}/board/tasks/${task.id}/move`,
  { toColumnId: colByType.developing.id },
  admin,
);
assert(
  'K8',
  'WIP 超限不拦截（仍 doing）+ 标记返回',
  wipCol.data?.wipLimit === 0 &&
    wipMove.data?.task?.status === 'doing' &&
    wipMove.data?.wipExceeded === true,
  `wip=${wipMove.data?.wipExceeded}`,
);
await api(
  'PUT',
  `/board/columns/${colByType.developing.id}`,
  { wipLimit: -1 },
  admin,
);

const delBlocked = await api(
  'DELETE',
  `/board/columns/${colByType.developing.id}`,
  undefined,
  admin,
);
assert(
  'K9',
  '列内有卡片删除拒绝 3007',
  delBlocked.code === 3007,
  `code=${delBlocked.code}`,
);
const lane = await api(
  'POST',
  `/executions/${ex.id}/board/lanes`,
  { type: 'risk', name: '风险' },
  admin,
);
assert('K10', '新建泳道（自动建空格）', lane.code === 0, lane.message);

// ---------- C 组：config ----------
const cfg = await api(
  'PUT',
  '/configs',
  {
    items: [
      { module: 'story', section: 'common', key: 'needReview', value: '0' },
    ],
  },
  admin,
);
assert('C1', '更新配置（needReview=0）', cfg.code === 0, cfg.message);
const storyNoReview = await api(
  'POST',
  '/stories',
  {
    productId: (
      await api('POST', '/products', { name: `P6产品${uniq}` }, admin)
    ).data.id,
    title: '免审需求',
    spec: 's',
    verify: 'v',
    status: 'active',
    reviewerIds: ['1'],
  },
  admin,
);
assert(
  'C2',
  'needReview=0 → active 直入（配置化生效）',
  storyNoReview.data.status === 'active',
  storyNoReview.data.status,
);
await api(
  'PUT',
  '/configs',
  {
    items: [
      { module: 'story', section: 'common', key: 'needReview', value: '1' },
    ],
  },
  admin,
);
const storyReview = await api(
  'POST',
  '/stories',
  {
    productId: storyNoReview.data.productId,
    title: '恢复提审',
    spec: 's',
    verify: 'v',
    status: 'active',
    reviewerIds: ['1'],
  },
  admin,
);
assert(
  'C3',
  '恢复 needReview=1 → reviewing',
  storyReview.data.status === 'reviewing',
  storyReview.data.status,
);

// ---------- M 组：my ----------
const mySum = await api('GET', '/my/summary', undefined, admin);
assert(
  'M1',
  '我的汇总（计数结构）',
  mySum.code === 0 && 'tasks' in mySum.data,
  JSON.stringify(mySum.data).slice(0, 80),
);
const myTasks = await api('GET', '/my/tasks', undefined, admin);
assert(
  'M2',
  '我的任务列表',
  myTasks.code === 0 && Array.isArray(myTasks.data),
  myTasks.data?.length,
);
const search = await api(
  'GET',
  `/my/search?q=P6&types=task,story`,
  undefined,
  admin,
);
assert(
  'M3',
  '全局搜索',
  search.code === 0 && (search.data.task?.length ?? 0) >= 1,
  JSON.stringify(search.data).slice(0, 80),
);

// ---------- R 组：reports ----------
const rep = await api(
  'GET',
  `/reports/project/${project.id}/overview`,
  undefined,
  admin,
);
assert(
  'R1',
  '项目概览统计',
  rep.code === 0 && 'task' in rep.data,
  JSON.stringify(rep.data).slice(0, 80),
);
const wl = await api(
  'GET',
  `/reports/execution/${ex.id}/workload`,
  undefined,
  admin,
);
assert(
  'R2',
  '执行负载统计',
  wl.code === 0 && Array.isArray(wl.data.members),
  wl.data?.members?.length,
);
const rd = await api(
  'GET',
  `/reports/products/${storyNoReview.data.productId}/roadmap`,
  undefined,
  admin,
);
assert(
  'R3',
  '产品路线图 stage 分布',
  rd.code === 0 && 'wait' in rd.data,
  JSON.stringify(rd.data).slice(0, 80),
);

// ---------- W 组：webhook ----------
const hook = await api(
  'POST',
  '/webhooks',
  {
    type: 'dinggroup',
    name: `P6机器人${uniq}`,
    url: 'https://oapi.dingtalk.com/robot/send?x=1',
  },
  admin,
);
assert('W1', '创建 webhook', hook.code === 0, hook.message);
const badHook = await api(
  'POST',
  '/webhooks',
  { type: 'dinggroup', name: 'bad', url: 'http://not-https.com' },
  admin,
);
assert(
  'W2',
  '非 https 拒绝 5501',
  badHook.code === 5501,
  `code=${badHook.code}`,
);
const hookLogs = await api(
  'GET',
  `/webhooks/${hook.data.id}/logs`,
  undefined,
  admin,
);
assert(
  'W3',
  '投递日志列表（空）',
  hookLogs.code === 0 && Array.isArray(hookLogs.data),
  hookLogs.data?.length,
);

// ---------- L 组：caselib/suite/testreport ----------
const lib = await api(
  'POST',
  '/case-libs',
  { name: `P6库${uniq}`, desc: '公共用例' },
  admin,
);
assert('L1', '用例库 CRUD', lib.code === 0, lib.message);
const suite = await api(
  'POST',
  `/products/${storyNoReview.data.productId}/suites`,
  { name: `P6套件${uniq}` },
  admin,
);
assert('L2', '套件创建', suite.code === 0, suite.message);

// 有源测试单才可生成报告：建用例+测试单+执行
const c = (
  await api(
    'POST',
    '/cases',
    {
      productId: storyNoReview.data.productId,
      title: 'P6用例',
      steps: [{ stepDesc: 's', expect: 'e' }],
    },
    admin,
  )
).data;
const build = (
  await api(
    'POST',
    '/builds',
    {
      productId: storyNoReview.data.productId,
      name: `p6-b-${uniq}`,
      date: today,
      builder: '1',
    },
    admin,
  )
).data;
const tt = (
  await api(
    'POST',
    '/testtasks',
    {
      productId: storyNoReview.data.productId,
      buildId: build.id,
      name: `p6-tt-${uniq}`,
      ownerId: '1',
      begin: today,
      end: '2026-11-30',
    },
    admin,
  )
).data;
await api('POST', `/testtasks/${tt.id}/cases`, { caseIds: [c.id] }, admin);
const runs = (await api('GET', `/testtasks/${tt.id}`, undefined, admin)).data
  .runs;
await api(
  'POST',
  `/testtasks/${tt.id}/runs/${runs[0].id}/run-case`,
  { steps: [{ stepId: 1, result: 'pass' }] },
  admin,
);
const report = await api(
  'POST',
  '/testreports',
  { testTaskId: tt.id, title: `P6报告${uniq}` },
  admin,
);
assert(
  'L3',
  '测试报告生成（聚合 passRate）',
  report.code === 0 && report.data.results?.total === 1,
  JSON.stringify(report.data.results).slice(0, 80),
);

// ---------- F 组：files ----------
const form = new FormData();
form.append('file', new Blob([bytes(64)], { type: 'text/plain' }), 'note.txt');
const up = await fetch(BASE + '/files?objectType=task&objectId=' + task.id, {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}` },
  body: form,
}).then((r) => r.json());
assert(
  'F1',
  '附件上传（txt 白名单）',
  up.code === 0 && !!up.data.storageKey,
  up.data?.extension,
);
const listF = await api(
  'GET',
  `/files?objectType=task&objectId=${task.id}`,
  undefined,
  admin,
);
assert(
  'F2',
  '附件列表',
  Array.isArray(listF.data) && listF.data.length === 1,
  listF.data?.length,
);
const badExt = await fetch(BASE + '/files', {
  method: 'POST',
  headers: { authorization: `Bearer ${admin}` },
  body: (() => {
    const f = new FormData();
    f.append(
      'file',
      new Blob([bytes(8)], { type: 'application/octet-stream' }),
      'evil.exe',
    );
    return f;
  })(),
}).then((r) => r.json());
assert('F3', '黑名单扩展名 5401', badExt.code === 5401, `code=${badExt.code}`);

function bytes(n) {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = 65;
  return b;
}

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
