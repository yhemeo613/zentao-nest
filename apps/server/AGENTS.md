# AGENTS.md — apps/server（NestJS 后端）

> 叠加根目录 `/AGENTS.md`（冲突以内层为准，不得放宽根级硬约束）。
> 必读路由：动实体先 `docs/04`，写流转先 `docs/02`，开接口先 `docs/03`。

## 技术事实（P0 现状）

- **NestJS 11 + TypeScript 6 + ESM**：根 package.json `type: module`、tsconfig nodenext——**相对导入必须带 `.js` 扩展名**（`from './x.js'`）；新增模块照此书写，禁止退回无扩展名写法。
- 全局设施已就绪（勿重复造）：全局前缀 `api/v1`、`ValidationPipe(whitelist+forbidNonWhitelisted+transform)`、`ResponseFormatInterceptor`（控制器只返回业务数据）、`LoggingInterceptor`（慢请求 1s 告警）、`GlobalExceptionFilter`、`BusinessException(code)`（错误码必须 import `@zentao/shared`，禁止魔法数字）、`RedisModule`(@Global)、traceId（AsyncLocalStorage + `getTraceId()`）。
- MySQL/Redis 为仓库根 docker-compose 容器，配置读 `apps/server/.env`；**生产禁 `synchronize:true`**，schema 变更一律走 migration（P1 建立迁移基线）。
- 观测方案为自托管（docs/03 §10：Prometheus 指标 + 结构化日志采集），**不接入 NestJS Observe 等外部遥测服务**。

## 分层铁律（docs/06 §5）

- Controller：路由 + `@Permissions` + Swagger 注解 + DTO 接收，**零业务逻辑**；
- Service：流转编排/校验/副作用（对应禅道 zen 层）；状态流转先过 `isTransitionAllowed` 类入口校验，非法流转抛 `ErrorCodes.VALIDATION.INVALID_TRANSITION`（3006）；
- Repository：数据读写聚合（tao 层），禁止掺流转判断；
- 工时聚合、父子任务聚合、stage 自动计算引擎、syncPPE 向上传播——**单点实现，全入口复用**（docs/02 对应章节），禁止平行实现第二份。

## 约定

- 新模块目录：`src/modules/<name>/{<name>.module.ts, <name>.controller.ts, <name>.service.ts, dto/}`；复杂查询加 `<name>.repository.ts`；
- 跨模块引用走模块导出接口或事件，禁止深路径互 import；
- 每个路由标权限点（P1 起 `@Permissions('module','action')`，字符串 import 自 shared）与 Swagger 注解；`@Public` 仅限 /health、/auth/login|refresh；
- 跨表写操作开事务；action 日志/通知在事务提交后异步派发，事务内不做网络调用。

## 验证

```bash
pnpm --filter @zentao/server build      # nest build
pnpm --filter @zentao/server ts-check   # tsc --noEmit
curl localhost:3000/api/v1/health       # 需先 docker compose up -d
```
