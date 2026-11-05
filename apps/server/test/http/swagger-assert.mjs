// Swagger 文档完整性验证（docs/07 §3.3 S 组用例）
// 逐项断言：tags 覆盖全部控制器、每端点有 summary+response、DTO schema 有 description/example、错误响应已声明
const SPEC_URL = 'http://localhost:3000/api/docs-json';

const spec = await (await fetch(SPEC_URL)).json();

const results = [];
const assert = (id, desc, pass, detail) => {
  results.push({ id, desc, pass, detail });
};

// S1 tags 覆盖
const expectTags = [
  'auth',
  'health',
  'system/users',
  'system/depts',
  'system/roles',
  'system/acl',
];
const actualTags = Object.keys(spec.tags ? {} : {}).length
  ? spec.tags.map((t) => t.name)
  : [
      ...new Set(
        Object.values(spec.paths)
          .flatMap((p) => Object.values(p))
          .flatMap((op) => op.tags ?? []),
      ),
    ];
assert(
  'S1',
  'tags 覆盖 6 组',
  expectTags.every((t) => actualTags.includes(t)),
  actualTags.join(','),
);

// S2 端点数量
const endpointCount = Object.entries(spec.paths).reduce(
  (n, [, ops]) => n + Object.keys(ops).length,
  0,
);
assert('S2', '端点数 ≥ 20', endpointCount >= 20, `actual=${endpointCount}`);

// S3 每个端点：summary + 描述 + 至少一个响应声明 + tags
const missing = [];
for (const [path, ops] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    if (!op.summary) missing.push(`${method.toUpperCase()} ${path} 缺 summary`);
    if (!op.tags?.length)
      missing.push(`${method.toUpperCase()} ${path} 缺 tags`);
    if (!op.responses || Object.keys(op.responses).length === 0)
      missing.push(`${method.toUpperCase()} ${path} 缺 responses`);
  }
}
assert(
  'S3',
  '全端点 summary/tags/responses 完整',
  missing.length === 0,
  missing.slice(0, 5).join(' | ') || 'all ok',
);

// S4 DTO schema 属性完整：每个有 properties 的 schema，其属性须含 description（example 至少 60% 覆盖）
const schemas = spec.components?.schemas ?? {};
const propIssues = [];
for (const [name, schema] of Object.entries(schemas)) {
  const props = schema.properties ?? {};
  if (Object.keys(props).length === 0) continue;
  for (const [prop, def] of Object.entries(props)) {
    if (!def.description) propIssues.push(`${name}.${prop} 缺 description`);
  }
  const withExample = Object.values(props).filter(
    (d) => d.example !== undefined,
  ).length;
  if (withExample / Object.keys(props).length < 0.6) {
    propIssues.push(
      `${name} example 覆盖 ${withExample}/${Object.keys(props).length}`,
    );
  }
}
assert(
  'S4',
  `DTO schema 属性含 description 且 example 覆盖 ≥60%（schemas=${Object.keys(schemas).length}）`,
  propIssues.length === 0,
  propIssues.slice(0, 5).join(' | ') || 'all ok',
);

// S5 关键端点错误响应声明（login 2005/2008、users POST 5301、roles DELETE 5303、refresh 2007）
const has = (path, method, want) => {
  const op = spec.paths[path]?.[method.toLowerCase()];
  const codes = op ? Object.keys(op.responses) : [];
  return codes.some((c) => String(c) === String(want));
};
assert(
  'S5a',
  'login 声明 4xx/429 错误',
  has('/api/v1/auth/login', 'post', 400) &&
    has('/api/v1/auth/login', 'post', 429),
  Object.keys(spec.paths['/api/v1/auth/login']?.post?.responses ?? {}).join(
    ',',
  ),
);
assert(
  'S5b',
  'refresh 声明 401(2007)',
  has('/api/v1/auth/refresh', 'post', 401),
  Object.keys(spec.paths['/api/v1/auth/refresh']?.post?.responses ?? {}).join(
    ',',
  ),
);
assert(
  'S5c',
  'users POST 声明 5301',
  has('/api/v1/api/v1/users', 'post', 400) || has('/api/v1/users', 'post', 400),
  Object.keys(spec.paths['/api/v1/users']?.post?.responses ?? {}).join(','),
);
assert(
  'S5d',
  'roles DELETE 声明 400(5303)',
  has('/api/v1/roles/{id}', 'delete', 400),
  Object.keys(spec.paths['/api/v1/roles/{id}']?.delete?.responses ?? {}).join(
    ',',
  ),
);

// S6 统一响应包装可见：TokenPairVo 被 auth/login 响应 $ref 引用
const loginSchema = JSON.stringify(
  spec.paths['/api/v1/auth/login']?.post?.responses,
);
assert(
  'S6',
  'login 响应引用 TokenPairVo schema',
  loginSchema.includes('TokenPairVo'),
  loginSchema.slice(0, 80),
);

// S7 bearerAuth 全局可用且受保护端点已标注
const secDefs = Object.keys(spec.components?.securitySchemes ?? {});
assert(
  'S7',
  'bearerAuth 定义存在',
  secDefs.includes('bearer'),
  secDefs.join(','),
);
const usersOps = spec.paths['/api/v1/users'];
const hasBearer =
  usersOps &&
  Object.values(usersOps).every((op) =>
    JSON.stringify(op.security ?? []).includes('bearer'),
  );
assert(
  'S8',
  'users 端点全部标注 bearer 认证',
  hasBearer,
  'class-level @ApiBearerAuth',
);

// 汇总
const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    { total: results.length, failed: failed.length, results },
    null,
    2,
  ),
);
process.exit(failed.length > 0 ? 1 : 0);
