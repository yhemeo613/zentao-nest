// 诊断 B8：viewer 登录 → 带 project.browse/view 角色 → 查项目列表形态
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
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
(async () => {
  const ad = await api('POST', '/auth/login', {
    account: 'admin',
    password: 'Admin@123456',
  });
  const tok = ad.json.data.accessToken;

  const acc = 'v9_' + (Date.now() % 100000);
  const cu = await api(
    'POST',
    '/users',
    { account: acc, password: 'View@123456', realname: 'V9' },
    tok,
  );
  const uid = cu.json.data.id;

  const role = await api(
    'POST',
    '/roles',
    {
      name: 'V9只读' + (Date.now() % 10000),
      code: 'v9ro' + (Date.now() % 100000),
    },
    tok,
  );
  const grant = await api(
    'PUT',
    `/roles/${role.json.data.id}/permissions`,
    { permissions: ['project.browse', 'project.view'] },
    tok,
  );
  const assign = await api(
    'PUT',
    `/users/${uid}/roles`,
    { roleIds: [Number(role.json.data.id)], projectId: 0 },
    tok,
  );
  console.log(
    'role/grant/assign:',
    role.json.code,
    grant.json.code,
    assign.json.code,
  );

  const v = await api('POST', '/auth/login', {
    account: acc,
    password: 'View@123456',
  });
  console.log('viewer login:', v.json.code);

  const projects = await api(
    'GET',
    '/projects',
    undefined,
    v.json.data.accessToken,
  );
  const data = projects.json.data;
  console.log(
    'viewer GET /projects:',
    projects.json.code,
    'isArray:',
    Array.isArray(data),
    'len:',
    Array.isArray(data) ? data.length : JSON.stringify(data).slice(0, 150),
  );
})();
