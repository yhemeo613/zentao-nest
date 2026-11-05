# AGENTS.md — apps/web（Vue3 前端）

> 叠加根目录 `/AGENTS.md`（冲突以内层为准，不得放宽根级硬约束）。
> 必读路由：写页面/组件先 `docs/05`，页面承载的业务规则先 `docs/02`，接口对接先 `docs/03`。

## 技术事实（F0 现状）

- Vue 3.5 + Vite 6 + Tailwind v4（`@tailwindcss/vite`，主题变量在 `src/style.css`，shadcn-vue 组件化自 F1 起经 CLI 逐个 add）；
- dev 代理已配：`/api` → localhost:3000、`/ws` → Socket.IO（vite.config.ts）；
- 基础设施已就绪（勿重复造）：`lib/http.ts`（解包/401 桥接/refresh 占位）、`lib/errors.ts`（错误码→分类分发，业务代码 **try/catch + describeError**，禁止自己读 res.code）、`stores/auth|permission|app`、`router`（静态表+守卫）、`v-permission` 指令。

## 硬约束

- **服务端状态一律 vue-query**：key 约定 `[资源, 作用域, 参数]`；变更后**精确失效**相关 key，禁止全量 invalidate（docs/05 §2）；
- API 层（`src/api/*`）函数命名严格 docs/06 §3.3（getXxxList/addXxx/updateXxx/saveXxx/deleteXxx/动词动作），每函数 `/** */` 注明用途；类型 import 自 `@zentao/shared` + 本域 interface；
- 权限点字符串**只能** import `@zentao/shared/permissions`（P1 起可用）；菜单过滤、路由 meta、v-permission 三处必须同源；
- 枚举/状态值禁止本地手写——import shared；新增前端自有类型放本域 api 文件内；
- 样式只用 Tailwind token/语义变量（`bg-background`/`text-muted-foreground`…），**禁止 inline style、硬编码色值、引入任何 UI 组件库**；
- 组件：`<script setup lang="ts">` 顺序 template→script→style 已由项目约定；双向绑定用 `defineModel`；布尔 prop `is/has/should` 前缀（docs/06 §6.1）；
- 路由：静态表 + meta（title/requiresAuth/permission），**禁止动态注册路由**（ADR D010）。

## 诚实渲染纪律

页面不得伪造成功态：接口未交付时展示明确提示（参照 `views/auth/login.vue` 对 P1 的处理与 `views/status/system-status.vue` 的异常分支）。

## 验证

```bash
pnpm --filter web build   # vue-tsc + vite build（类型检查门禁）
pnpm --filter web dev     # http://localhost:5173（/status 页可验证与后端联通）
```
