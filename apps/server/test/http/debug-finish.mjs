// 诊断 finish 失败
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
  const proj = (
    await api(
      'POST',
      '/projects',
      {
        programId: 0,
        name: 'fin-probe2',
        code: 'fin2-' + (Date.now() % 100000),
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
  const t = (
    await api(
      'POST',
      '/tasks',
      {
        projectId: proj.id,
        executionId: ex.id,
        name: 'fin-task2',
        estimate: 10,
      },
      tok,
    )
  ).body.data;
  const st = await api(
    'POST',
    '/tasks/' + t.id + '/start',
    { consumed: 2, left: 8 },
    tok,
  );
  console.log('start:', st.status, st.body.code, st.body.data?.status);
  const act = await api(
    'POST',
    '/tasks/' + t.id + '/activate',
    { left: 5 },
    tok,
  );
  console.log(
    'activate:',
    act.status,
    act.body.code,
    act.body.data?.status,
    'consumed=',
    act.body.data?.consumed,
  );
  const fin = await api(
    'POST',
    '/tasks/' + t.id + '/finish',
    {
      consumed: 4,
      left: 0,
      realStarted: '2026-11-10',
      finishedDate: '2026-11-05',
    },
    tok,
  );
  console.log('finish:', fin.status, JSON.stringify(fin.body).slice(0, 250));
})();
