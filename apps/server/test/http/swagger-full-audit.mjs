// Swagger 全量审计（P7-d：在 p1 基础上覆盖 P2-P6 全部端点组）
// 用法：node apps/server/test/http/swagger-full-audit.mjs
const spec = await (await fetch('http://localhost:3000/api/docs-json')).json();
const results = [];
const assert = (id, desc, pass, detail) => {
  results.push({ id, desc, pass, detail: String(detail).slice(0, 120) });
};

// 全端点结构完整性
let missing = 0;
let total = 0;
for (const [path, ops] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(ops)) {
    total += 1;
    if (
      !op.summary ||
      !op.tags?.length ||
      !op.responses ||
      !Object.keys(op.responses).length
    )
      missing += 1;
  }
}
assert(
  'F1',
  `全端点 summary/tags/responses 完整（total=${total}）`,
  missing === 0,
  `missing=${missing}`,
);

// DTO schema description 全覆盖
let propIssues = 0;
for (const schema of Object.values(spec.components?.schemas ?? {})) {
  for (const [prop, def] of Object.entries(schema.properties ?? {})) {
    if (!def.description) propIssues += 1;
  }
}
assert(
  'F2',
  'schema 属性 description 全覆盖',
  propIssues === 0,
  `issues=${propIssues}`,
);

// 关键域 tags 存在
const tags = new Set(
  Object.values(spec.paths)
    .flatMap((p) => Object.values(p))
    .flatMap((op) => op.tags ?? []),
);
const needTags = [
  'auth',
  'health',
  'system/users',
  'system/depts',
  'system/roles',
  'system/acl',
  'program',
  'product',
  'project',
  'execution',
  'story',
  'plan',
  'build',
  'release',
  'task',
  'bug',
  'case',
  'testtask',
  'board',
  'doc',
  'oa',
  'team',
  'projectstory',
  'webhook',
  'caselib',
  'config',
  'file',
  'my',
  'reports',
];
const missingTags = needTags.filter((t) => !tags.has(t));
assert(
  'F3',
  `tags 覆盖 ${needTags.length} 组`,
  missingTags.length === 0,
  missingTags.join(',') || 'all',
);

// 认证/错误响应抽查（每域抽一个代表端点）
const spot = [
  ['/api/v1/programs', 'post', 400],
  ['/api/v1/projects/{id}', 'delete', 400],
  ['/api/v1/stories/{id}/review', 'post', 400],
  ['/api/v1/tasks/{id}/start', 'post', 400],
  ['/api/v1/bugs/{id}/resolve', 'post', 400],
  ['/api/v1/testtasks/{id}/close', 'post', 400],
  ['/api/v1/executions/{id}/board', 'get', 401],
];
let spotMiss = 0;
for (const [p, m, want] of spot) {
  const codes = Object.keys(spec.paths[p]?.[m]?.responses ?? {});
  if (!codes.includes(String(want))) spotMiss += 1;
}
assert('F4', '错误响应抽查（7 端点）', spotMiss === 0, `miss=${spotMiss}`);

const failed = results.filter((r) => !r.pass);
console.log(
  JSON.stringify(
    { total: results.length, failed: failed.length, results },
    null,
    2,
  ),
);
process.exit(failed.length > 0 ? 1 : 0);
