// 诊断：任务完成 → 需求 stage 推进链（setStageFromTasks/setStage 顺序与覆盖）
const BASE = 'http://localhost:3000/api/v1';
async function api(m, p, b, t) {
  const r = await fetch(BASE + p, {
    method: m,
    headers: {
      'content-type': 'application/json',
      ...(t ? { authorization: 'Bearer ' + t } : {}),
    },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
(async () => {
  const ad = await api('POST', '/auth/login', {
    account: 'admin',
    password: 'Admin@123456',
  });
  const tok = ad.body.data.accessToken;
  const prod = (await api('POST', '/products', { name: 'diag-stage' }, tok))
    .body.data;
  const story = (
    await api(
      'POST',
      '/stories',
      {
        productId: prod.id,
        title: 'diag-story',
        spec: 's',
        verify: 'v',
        status: 'active',
        reviewerIds: ['1'],
      },
      tok,
    )
  ).body.data;
  await api('POST', `/stories/${story.id}/review`, { result: 'pass' }, tok);
  const proj = (
    await api(
      'POST',
      '/projects',
      {
        programId: 0,
        name: 'diag-proj',
        code: 'dg-' + (Date.now() % 100000),
        model: 'scrum',
        begin: '2026-11-01',
        end: '2027-01-31',
        multiple: 0,
      },
      tok,
    )
  ).body.data;
  const ex = (
    await api('GET', '/executions?projectId=' + proj.id, undefined, tok)
  ).body.data[0];
  const link = await api(
    'POST',
    `/executions/${ex.id}/stories`,
    { storyIds: [story.id] },
    tok,
  );
  const s1 = (await api('GET', `/stories/${story.id}`, undefined, tok)).body
    .data;
  console.log(
    'after link(stage=projected?):',
    link.body.code,
    'stage=',
    s1.stage,
  );

  const t = (
    await api(
      'POST',
      '/tasks',
      {
        projectId: proj.id,
        executionId: ex.id,
        storyId: story.id,
        name: 'diag-dev',
        type: 'devel',
        estimate: 10,
      },
      tok,
    )
  ).body.data;
  await api('POST', `/tasks/${t.id}/start`, { consumed: 2, left: 8 }, tok);
  const s2 = (await api('GET', `/stories/${story.id}`, undefined, tok)).body
    .data;
  console.log('after start(developing?): stage=', s2.stage);

  const fin = await api(
    'POST',
    `/tasks/${t.id}/finish`,
    {
      consumed: 8,
      left: 0,
      realStarted: '2026-11-10',
      finishedDate: '2026-11-05',
    },
    tok,
  );
  console.log(
    'finish resp:',
    fin.status,
    JSON.stringify(fin.body).slice(0, 220),
  );
  const s3 = (await api('GET', `/stories/${story.id}`, undefined, tok)).body
    .data;
  console.log('after finish(developed?): stage=', s3.stage);

  const raw = await api('GET', `/tasks/${t.id}`, undefined, tok);
  console.log(
    'task:',
    raw.body.data?.status,
    'consumed=',
    raw.body.data?.consumed,
    'storyId=',
    raw.body.data?.storyId,
  );
})();
