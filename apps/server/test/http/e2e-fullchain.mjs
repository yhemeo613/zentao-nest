// P4 全链路 E2E（docs/01 §11 P4 验收标准：需求→拆任务→完成→建版本→建测试单→执行用例→转Bug→修复→关闭→发布）
// 可复现：node apps/server/test/http/e2e-fullchain.mjs（退出码=失败数）
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

// ---------- 前置 ----------
const admin = (
  await api('POST', '/auth/login', {
    account: 'admin',
    password: 'Admin@123456',
  })
).data.accessToken;
assert('E0', 'admin 登录', !!admin, '');

// ---------- ① 项目集 → 产品 → 计划（需求 planned） ----------
const program = (
  await api(
    'POST',
    '/programs',
    { name: `全链项目集${uniq}`, begin: '2026-11-01', end: '2027-06-30' },
    admin,
  )
).data;
const product = (
  await api(
    'POST',
    '/products',
    { programId: Number(program.id), name: `全链产品${uniq}` },
    admin,
  )
).data;
assert(
  'E1',
  '项目集+产品建立',
  !!program.id && !!product.id,
  `p=${program.id} pr=${product.id}`,
);

// 需求提审 → 评审通过（active）
const story = (
  await api(
    'POST',
    '/stories',
    {
      productId: product.id,
      title: '全链-设备批量接入',
      spec: '批量接入规格',
      verify: '接入成功率≥99%',
      status: 'active',
      reviewerIds: ['1'],
    },
    admin,
  )
).data;
assert('E2a', '需求提审 reviewing', story.status === 'reviewing', story.status);
const reviewed = await api(
  'POST',
  `/stories/${story.id}/review`,
  { result: 'pass' },
  admin,
);
assert(
  'E2b',
  '评审通过 active',
  reviewed.data.status === 'active',
  reviewed.data.status,
);

const plan = (
  await api(
    'POST',
    '/plans',
    {
      productId: product.id,
      title: `全链计划${uniq}`,
      begin: '2026-11-01',
      end: '2026-12-31',
    },
    admin,
  )
).data;
await api('POST', `/plans/${plan.id}/stories`, { storyIds: [story.id] }, admin);
const afterPlan = await api('GET', `/stories/${story.id}`, undefined, admin);
assert(
  'E2c',
  '关联计划 stage=planned',
  afterPlan.data.stage === 'planned',
  afterPlan.data.stage,
);

// ---------- ② 项目（关联产品） → 执行 → 导入范围（projected） ----------
const project = (
  await api(
    'POST',
    '/projects',
    {
      programId: Number(program.id),
      name: `全链项目${uniq}`,
      code: `fc-${uniq}`,
      model: 'scrum',
      begin: '2026-11-05',
      end: '2027-01-31',
      multiple: 0,
    },
    admin,
  )
).data;
await api(
  'PUT',
  `/projects/${project.id}/products`,
  { items: [{ productId: product.id }] },
  admin,
);
const shadow = (
  await api('GET', `/executions?projectId=${project.id}`, undefined, admin)
).data[0];
const importResult = await api(
  'POST',
  `/executions/${shadow.id}/stories/import-from-plan`,
  { planId: plan.id },
  admin,
);
assert(
  'E3',
  '按计划导入两级范围',
  importResult.data.executionLinked === 1 &&
    importResult.data.projectLinked === 1,
  JSON.stringify(importResult.data),
);
const afterExec = await api('GET', `/stories/${story.id}`, undefined, admin);
assert(
  'E4',
  '执行关联 stage=projected',
  afterExec.data.stage === 'projected',
  afterExec.data.stage,
);

// ---------- ③ 拆任务（开发+测试） → 完成 → stage=developed → tested ----------
const tDev = (
  await api(
    'POST',
    '/tasks',
    {
      projectId: project.id,
      executionId: shadow.id,
      storyId: story.id,
      name: '开发-批量接入',
      type: 'devel',
      estimate: 10,
    },
    admin,
  )
).data;
await api('POST', `/tasks/${tDev.id}/start`, { consumed: 3, left: 7 }, admin);
await api(
  'POST',
  `/tasks/${tDev.id}/finish`,
  {
    consumed: 7,
    left: 0,
    realStarted: today,
    finishedDate: today,
    work: '接口完成',
  },
  admin,
);
const afterDev = await api('GET', `/stories/${story.id}`, undefined, admin);
assert(
  'E5a',
  '开发完成 stage=developed',
  afterDev.data.stage === 'developed',
  afterDev.data.stage,
);

const tTest = (
  await api(
    'POST',
    '/tasks',
    {
      projectId: project.id,
      executionId: shadow.id,
      storyId: story.id,
      name: '测试-批量接入',
      type: 'test',
      estimate: 6,
    },
    admin,
  )
).data;
await api('POST', `/tasks/${tTest.id}/start`, { consumed: 1, left: 5 }, admin);
const afterTestStart = await api(
  'GET',
  `/stories/${story.id}`,
  undefined,
  admin,
);
assert(
  'E5b',
  '测试进行 stage=testing',
  afterTestStart.data.stage === 'testing',
  afterTestStart.data.stage,
);
await api(
  'POST',
  `/tasks/${tTest.id}/finish`,
  {
    consumed: 5,
    left: 0,
    realStarted: today,
    finishedDate: today,
    work: '测试完成',
  },
  admin,
);
const afterTestDone = await api(
  'GET',
  `/stories/${story.id}`,
  undefined,
  admin,
);
assert(
  'E5c',
  '测试完成 stage=tested',
  afterTestDone.data.stage === 'tested',
  afterTestDone.data.stage,
);

// ---------- ④ 版本 → 测试单 → 执行用例 fail → 转 Bug → 修复 → 回归 ----------
const build = (
  await api(
    'POST',
    '/builds',
    {
      productId: product.id,
      name: `fc-build-${uniq}`,
      date: today,
      builder: '1',
      storyIds: [story.id],
    },
    admin,
  )
).data;
const c = (
  await api(
    'POST',
    '/cases',
    {
      productId: product.id,
      storyId: story.id,
      title: '批量接入-正常流',
      steps: [{ stepDesc: '接入 100 台设备', expect: '全部成功' }],
    },
    admin,
  )
).data;
const tt = (
  await api(
    'POST',
    '/testtasks',
    {
      productId: product.id,
      projectId: project.id,
      executionId: shadow.id,
      buildId: build.id,
      name: `全链测试单${uniq}`,
      ownerId: '1',
      begin: today,
      end: '2026-11-25',
    },
    admin,
  )
).data;
await api('POST', `/testtasks/${tt.id}/start`, {}, admin);
const link = await api(
  'POST',
  `/testtasks/${tt.id}/cases`,
  { caseIds: [c.id] },
  admin,
);
const runId = (Array.isArray(link.data) ? link.data : [])[0]?.id;
const run = await api(
  'POST',
  `/testtasks/${tt.id}/runs/${runId}/run-case`,
  { steps: [{ stepId: 1, result: 'fail', real: '第 37 台超时' }] },
  admin,
);
assert(
  'E6a',
  '执行用例 fail + 测试单 doing',
  run.data.caseResult === 'fail' && run.data.taskStatus === 'doing',
  JSON.stringify(run.data),
);

const prefill = await api(
  'GET',
  `/testtasks/${tt.id}/runs/${runId}/bug-prefill`,
  undefined,
  admin,
);
const bug = (
  await api(
    'POST',
    '/bugs',
    {
      productId: product.id,
      projectId: project.id,
      executionId: shadow.id,
      storyId: story.id,
      caseId: c.id,
      resultId: prefill.data.resultId,
      testtaskId: tt.id,
      title: prefill.data.title,
      steps: prefill.data.steps,
      openedBuild: String(build.id),
    },
    admin,
  )
).data;
assert(
  'E6b',
  '失败转 Bug（溯源 case/result/testtask）',
  !!bug.id &&
    Number(bug.caseId) === Number(c.id) &&
    bug.resultId === prefill.data.resultId,
  `case=${bug.caseId} result=${bug.resultId}`,
);

const resolved = await api(
  'POST',
  `/bugs/${bug.id}/resolve`,
  { resolution: 'fixed', resolvedBuildId: String(build.id) },
  admin,
);
assert(
  'E6c',
  'Bug 修复 fixed + 解决构建',
  resolved.data.status === 'resolved' &&
    resolved.data.resolvedBuildId === String(build.id),
  resolved.data.resolvedBuildId,
);
const closedBug = await api('POST', `/bugs/${bug.id}/close`, {}, admin);
assert(
  'E6d',
  'Bug 验证关闭',
  closedBug.data.status === 'closed',
  closedBug.data.status,
);

// ---------- ⑤ 发布（需求 stage=released） → 需求关闭（stage=closed） ----------
const release = (
  await api(
    'POST',
    '/releases',
    {
      productId: product.id,
      name: `fc-rel-${uniq}`,
      buildIds: [build.id],
      date: today,
    },
    admin,
  )
).data;
const published = await api(
  'POST',
  `/releases/${release.id}/publish`,
  {},
  admin,
);
const afterRelease = await api('GET', `/stories/${story.id}`, undefined, admin);
assert(
  'E7',
  '发布 → 需求 stage=released',
  published.data.status === 'normal' && afterRelease.data.stage === 'released',
  `st=${afterRelease.data.stage}`,
);

const closed = await api(
  'POST',
  `/stories/${story.id}/close`,
  { closedReason: 'done' },
  admin,
);
assert(
  'E8',
  '需求关闭 done → stage=closed',
  closed.data.status === 'closed' &&
    closed.data.stage === 'closed' &&
    closed.data.closedReason === 'done',
  `st=${closed.data.stage} stage=${closed.data.stage}`,
);

// ---------- ⑥ 执行/项目收尾（级联校验） ----------
const closeExec = await api(
  'POST',
  `/executions/${shadow.id}/close`,
  { closedReason: 'done' },
  admin,
);
assert('E9a', '执行关闭（子无→done）', closeExec?.data?.status === 'closed');
const closeProj = await api(
  'POST',
  `/projects/${project.id}/close`,
  { closedReason: 'done' },
  admin,
);
assert(
  'E9b',
  '项目关闭（执行全闭→done）',
  closeProj?.data?.status === 'closed',
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
