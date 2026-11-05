// P3 验收断言（docs/01 §11 P3 验收标准 + docs/07 §3.3 S 组扩展）
// 覆盖：需求评审/变更版本化、任务状态机（合法+非法 4xx）、工时隐式迁移、Bug 流转、质量闭环 E12
const BASE = 'http://localhost:3000/api/v1';
const results = [];
const assert = (id, desc, pass, detail) => {
  results.push({ id, desc, pass, detail: String(detail).slice(0, 140) });
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

// ---------- 前置 ----------
const admin = (
  await api('POST', '/auth/login', {
    account: 'admin',
    password: 'Admin@123456',
  })
).data.accessToken;
assert('P0', 'admin 登录', !!admin, '');

// ---------- S1 需求域：创建→评审→变更版本化（docs/01 §11 P3 验收核心） ----------
const product = (
  await api('POST', '/products', { name: `P3产品${uniq}` }, admin)
).data;
const storyDraft = await api(
  'POST',
  '/stories',
  {
    productId: product.id,
    title: '草稿需求',
    spec: 's',
    verify: 'v',
    status: 'draft',
  },
  admin,
);
assert(
  'S1a',
  'draft 保存 → draft',
  storyDraft?.data?.status === 'draft',
  storyDraft?.data?.status,
);

const storyR = await api(
  'POST',
  '/stories',
  {
    productId: product.id,
    title: '评审需求',
    spec: 'spec-v1',
    verify: 'verify-v1',
    status: 'active',
    reviewerIds: ['1'],
  },
  admin,
);
if (!storyR?.data) {
  console.error(JSON.stringify({ debug: storyR }));
}
assert(
  'S1b',
  '提审 → reviewing + 评审人行',
  storyR?.data?.status === 'reviewing',
  storyR?.data?.status,
);

// v1 reject 裁剪：v=1 不允许 revert（4202）
const badRevert = await api(
  'POST',
  `/stories/${storyR?.data?.id}/review`,
  { result: 'revert' },
  admin,
);
assert(
  'S1c',
  'v1 revert 拒绝 4202',
  badRevert.code === 4202,
  `code=${badRevert.code}`,
);

// pass → active
const review1 = await api(
  'POST',
  `/stories/${storyR?.data?.id}/review`,
  { result: 'pass' },
  admin,
);
assert(
  'S1d',
  '评审 pass → active',
  review1?.data?.status === 'active',
  review1?.data?.status,
);

// 重复评审拦截：此时无 reviewing 状态 → 3006
const reReview = await api(
  'POST',
  `/stories/${storyR?.data?.id}/review`,
  { result: 'pass' },
  admin,
);
assert(
  'S1e',
  '非 reviewing 评审 3006',
  reReview.code === 3006,
  `code=${reReview.code}`,
);

// 变更（提审）→ version+1 + reviewing
const change1 = await api(
  'POST',
  `/stories/${storyR?.data?.id}/change`,
  {
    title: '评审需求v2',
    spec: 'spec-v2',
    verify: 'verify-v2',
    submitReview: true,
    reviewerIds: ['1'],
  },
  admin,
);
assert(
  'S1f',
  '变更提审 version=2 + reviewing',
  change1?.data?.version === 2 && change1?.data?.status === 'reviewing',
  `v=${change1?.data?.version} st=${change1?.data?.status}`,
);

// v>1 reject 裁剪
const badReject = await api(
  'POST',
  `/stories/${storyR?.data?.id}/review`,
  { result: 'reject', closedReason: 'cancel' },
  admin,
);
assert(
  'S1g',
  'v>1 reject 拒绝 4202',
  badReject.code === 4202,
  `code=${badReject.code}`,
);

// 变更评审 pass → active；历史 spec 可查
const review2 = await api(
  'POST',
  `/stories/${storyR?.data?.id}/review`,
  { result: 'pass' },
  admin,
);
const specHistory = await api(
  'GET',
  `/stories/${storyR?.data?.id}?version=1`,
  undefined,
  admin,
);
assert(
  'S1h',
  '变更评审通过 + 历史 spec v1 可追溯',
  review2?.data?.status === 'active' &&
    specHistory?.data?.spec?.spec === 'spec-v1',
  `v1spec=${specHistory?.data?.spec?.spec}`,
);

// 关联计划 → stage=planned
const plan = (
  await api(
    'POST',
    '/plans',
    {
      productId: product.id,
      title: `计划${uniq}`,
      begin: '2026-11-01',
      end: '2026-12-31',
    },
    admin,
  )
).data;
await api(
  'POST',
  `/plans/${plan.id}/stories`,
  { storyIds: [storyR?.data?.id] },
  admin,
);
const afterPlan = await api(
  'GET',
  `/stories/${storyR?.data?.id}`,
  undefined,
  admin,
);
assert(
  'S1i',
  '关联计划 stage=planned',
  afterPlan?.data?.stage === 'planned',
  afterPlan?.data?.stage,
);

// 关闭（done）→ closed；激活 → active
const closed = await api(
  'POST',
  `/stories/${storyR?.data?.id}/close`,
  { closedReason: 'done' },
  admin,
);
assert(
  'S1j',
  '关闭 done → closed',
  closed?.data?.status === 'closed',
  closed?.data?.status,
);
const reactivated = await api(
  'POST',
  `/stories/${storyR?.data?.id}/activate`,
  {},
  admin,
);
assert(
  'S1k',
  '激活 → active',
  reactivated?.data?.status === 'active',
  reactivated?.data?.status,
);

// ---------- S2 执行/任务域：影子执行 + 任务状态机 + 工时隐式迁移 ----------
const project = (
  await api(
    'POST',
    '/projects',
    {
      programId: 0,
      name: `P3项目${uniq}`,
      code: `p3-${uniq}`,
      model: 'scrum',
      begin: '2026-11-01',
      end: '2027-01-31',
      multiple: 0,
    },
    admin,
  )
).data;
const execs = await api(
  'GET',
  `/executions?projectId=${project.id}`,
  undefined,
  admin,
);
const shadowExec = (Array.isArray(execs.data) ? execs.data : [])[0];
assert('S2a', '影子执行可用', !!shadowExec, shadowExec?.type);

const task = await api(
  'POST',
  '/tasks',
  {
    projectId: project.id,
    executionId: shadowExec.id,
    storyId: storyR?.data?.id,
    name: '开发任务',
    type: 'devel',
    estimate: 10,
  },
  admin,
);
assert(
  'S2b',
  '任务创建（锁定 storyVersion）',
  task.code === 0 && task?.data?.storyVersion === 2,
  `sv=${task?.data?.storyVersion}`,
);

// 非法流转：wait 直接 finish？finish 允许 wait——用 close 验证非法（close 仅 done/cancel）
const badClose = await api('POST', `/tasks/${task?.data?.id}/close`, {}, admin);
assert(
  'S2c',
  'wait 关闭 3006',
  badClose.code === 3006,
  `code=${badClose.code}`,
);
// 非法流转：done 后 start
const badStartAfter = await api(
  'POST',
  `/tasks/${task?.data?.id}/start`,
  {},
  admin,
);
// start 仅 wait；当前 wait 合法 → 先 start 后再验 done-start
const okStart = await api(
  'POST',
  `/tasks/${task?.data?.id}/start`,
  { consumed: 2, left: 8 },
  admin,
);
const badStart2 = await api(
  'POST',
  `/tasks/${task?.data?.id}/start`,
  { consumed: 2, left: 8 },
  admin,
);
assert(
  'S2d',
  'start(仅wait) 二次 3006',
  okStart.code === 0 && badStart2.code === 3006,
  `c1=${okStart.code} c2=${badStart2.code}`,
);

// 工时隐式迁移：left=0 → done
const effort = await api(
  'POST',
  `/tasks/${task?.data?.id}/efforts`,
  {
    date: new Date().toISOString().slice(0, 10),
    consumed: 8,
    left: 0,
    work: '收尾',
  },
  admin,
);
assert(
  'S2e',
  '记工时 left=0 隐式完成',
  effort?.data?.status === 'done',
  effort?.data?.status,
);

// 隐式迁移联动：需求 stage 推进（devel done → developed/testing 由 test 任务定；单 devel → developed）
const storyAfterTask = await api(
  'GET',
  `/stories/${storyR?.data?.id}`,
  undefined,
  admin,
);
assert(
  'S2f',
  '任务完成驱动需求 stage=developed',
  storyAfterTask?.data?.stage === 'developed',
  storyAfterTask?.data?.stage,
);

// activate 返工正路径：done → doing；consumed 保持（4702 语义移到单测覆盖，API 面不可达）
const freshTask = await api(
  'GET',
  `/tasks/${task?.data?.id}`,
  undefined,
  admin,
);
const consumedBefore = Number(freshTask?.data?.consumed);
const act = await api(
  'POST',
  `/tasks/${task?.data?.id}/activate`,
  { left: 5 },
  admin,
);
assert(
  'S2g',
  'activate 返工 → doing 且 consumed 保持',
  act?.code === 0 &&
    act?.data?.status === 'doing' &&
    Number(act?.data?.consumed) === consumedBefore,
  `st=${act?.data?.status} consumed=${act?.data?.consumed}`,
);

// close 正路径：doing → finish → done → closed
const fin = await api(
  'POST',
  `/tasks/${task?.data?.id}/finish`,
  {
    consumed: 4,
    realStarted: '2026-11-10',
    finishedDate: new Date().toISOString().slice(0, 10),
  },
  admin,
);
const okClose = await api('POST', `/tasks/${task?.data?.id}/close`, {}, admin);
assert(
  'S2h',
  'done → close 正路径',
  fin?.data?.status === 'done' && okClose?.data?.status === 'closed',
  okClose?.data?.status,
);

// ---------- S3 质量闭环（E12 精简）：build linkBug 自动解决 → release publish → stage=released ----------
const bug = await api(
  'POST',
  '/bugs',
  { productId: product.id, title: '接入超时', steps: '步骤', openedBuild: '0' },
  admin,
);
const resolved = await api(
  'POST',
  `/bugs/${bug?.data?.id}/resolve`,
  { resolution: 'fixed', resolvedBuildId: '0' },
  admin,
);
assert(
  'S3a',
  'Bug resolve fixed → resolved + 指派回开单人',
  resolved?.data?.status === 'resolved' && resolved?.data?.assignedTo === '1',
  resolved?.data?.assignedTo,
);
const reactivatedBug = await api(
  'POST',
  `/bugs/${bug?.data?.id}/activate`,
  { openedBuild: '0' },
  admin,
);
assert(
  'S3b',
  'Bug activate 重开 count+1 + 指派=原解决人',
  reactivatedBug?.data?.activatedCount === 1 &&
    reactivatedBug?.data?.assignedTo === '1',
  `n=${reactivatedBug?.data?.activatedCount} at=${reactivatedBug?.data?.assignedTo}`,
);

// 用例默认 normal（免评审）
const c = await api(
  'POST',
  '/cases',
  {
    productId: product.id,
    title: '接入用例',
    steps: [{ stepDesc: '执行', expect: '成功' }],
  },
  admin,
);
assert('S3c', '用例默认 normal', c?.data?.status === 'normal', c?.data?.status);

// build → 关联 Bug（auto resolve）→ release publish → story stage=released
const build = await api(
  'POST',
  '/builds',
  {
    productId: product.id,
    name: `p3-build-${uniq}`,
    date: new Date().toISOString().slice(0, 10),
    builder: '1',
  },
  admin,
);
const linkBug = await api(
  'POST',
  `/builds/${build?.data?.id}/bugs`,
  { bugIds: [reactivatedBug?.data?.id] },
  admin,
);
const bugAfterLink = await api(
  'GET',
  `/bugs/${reactivatedBug?.data?.id}`,
  undefined,
  admin,
);
assert(
  'S3d',
  'build linkBug 自动 resolved/fixed',
  linkBug.code === 0 &&
    bugAfterLink?.data?.status === 'resolved' &&
    bugAfterLink?.data?.resolution === 'fixed',
  bugAfterLink?.data?.resolution,
);

await api(
  'POST',
  `/builds/${build?.data?.id}/stories`,
  { storyIds: [storyR?.data?.id] },
  admin,
);
const release = await api(
  'POST',
  '/releases',
  {
    productId: product.id,
    name: `p3-rel-${uniq}`,
    buildIds: [build?.data?.id],
    date: new Date().toISOString().slice(0, 10),
  },
  admin,
);
const published = await api(
  'POST',
  `/releases/${release?.data?.id}/publish`,
  {},
  admin,
);
const storyAfterRelease = await api(
  'GET',
  `/stories/${storyR?.data?.id}`,
  undefined,
  admin,
);
assert(
  'S3e',
  'release publish → 需求 stage=released',
  published?.data?.status === 'normal' &&
    storyAfterRelease?.data?.stage === 'released',
  `stage=${storyAfterRelease?.data?.stage}`,
);

// ---------- S4 测试闭环：testtask → linkCase → runCase 三写 → wait→doing；close 4951 ----------
const tt = await api(
  'POST',
  '/testtasks',
  {
    productId: product.id,
    name: `p3-tt-${uniq}`,
    buildId: build?.data?.id,
    ownerId: '1',
    begin: '2026-11-21',
    end: '2026-11-25',
  },
  admin,
);
const link = await api(
  'POST',
  `/testtasks/${tt?.data?.id}/cases`,
  { caseIds: [c?.data?.id] },
  admin,
);
const runId = (Array.isArray(link.data) ? link.data : [])[0]?.id;
const run = await api(
  'POST',
  `/testtasks/${tt?.data?.id}/runs/${runId}/run-case`,
  { steps: [{ stepId: 1, result: 'fail', real: '超时' }] },
  admin,
);
assert(
  'S4a',
  'runCase fail 聚合 + 测试单 wait→doing',
  run?.data?.caseResult === 'fail' && run?.data?.taskStatus === 'doing',
  JSON.stringify(run.data),
);
const ttAfter = await api(
  'GET',
  `/testtasks/${tt?.data?.id}`,
  undefined,
  admin,
);
const caseAfter = await api('GET', `/cases/${c?.data?.id}`, undefined, admin);
assert(
  'S4b',
  '三写：testrun+testresult+case.lastRunResult',
  ttAfter?.data?.runs?.[0]?.lastRunResult === 'fail' &&
    caseAfter?.data?.lastRunResult === 'fail',
  caseAfter?.data?.lastRunResult,
);

const prefill = await api(
  'GET',
  `/testtasks/${tt?.data?.id}/runs/${runId}/bug-prefill`,
  undefined,
  admin,
);
assert(
  'S4c',
  'fail 转 Bug 预填（溯源 case/result）',
  prefill.code === 0 && String(prefill?.data?.caseId) === String(c?.data?.id),
  prefill?.data?.caseId,
);

const badCloseTt = await api(
  'POST',
  `/testtasks/${tt?.data?.id}/close`,
  { realFinishedDate: '2026-11-20' },
  admin,
);
assert(
  'S4d',
  'close 完成日期早于 begin 4951',
  badCloseTt.code === 4951,
  `code=${badCloseTt.code}`,
);
const okCloseTt = await api(
  'POST',
  `/testtasks/${tt?.data?.id}/close`,
  { realFinishedDate: '2026-11-22' },
  admin,
);
assert(
  'S4e',
  'close 正路径 → done',
  okCloseTt?.data?.status === 'done',
  okCloseTt?.data?.status,
);

// ---------- S5 Bug 转需求（独立动作） ----------
const bug2 = await api(
  'POST',
  '/bugs',
  {
    productId: product.id,
    title: '需转需求的缺陷',
    steps: '内容',
    openedBuild: '0',
  },
  admin,
);
const conv = await api(
  'POST',
  `/bugs/${bug2?.data?.id}/convert-to-story`,
  { title: '转出的需求', spec: '由缺陷转入', verify: '验收' },
  admin,
);
const bug2After = await api('GET', `/bugs/${bug2?.data?.id}`, undefined, admin);
assert(
  'S5',
  '转需求：story 创建 + bug closed/tostory 回写',
  conv.code === 0 &&
    bug2After?.data?.status === 'closed' &&
    bug2After?.data?.resolution === 'tostory' &&
    Number(bug2After?.data?.toStoryId) === Number(conv?.data?.id),
  `toStory=${bug2After?.data?.toStoryId}`,
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
