// 精确复现：影子执行 close 4603
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
        name: 'close-probe',
        code: 'cl-' + (Date.now() % 100000),
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
  console.log('shadow:', ex.id, ex.type, ex.status, 'parentId=', ex.parentId);
  const cl = await api(
    'POST',
    `/executions/${ex.id}/close`,
    { closedReason: 'done' },
    tok,
  );
  console.log('close:', cl.body.code, cl.body.message, cl.body.data?.status);
  // 若 4603，列出被判定为子阶段的记录
  if (cl.body.code === 4603) {
    const detail = await api('GET', `/executions/${ex.id}`, undefined, tok);
    console.log('detail:', JSON.stringify(detail.body.data).slice(0, 300));
  }
})();
