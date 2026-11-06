# AGENTS.md — AI 编码代理边界守则

> 约束所有在本仓库工作的 AI 编码代理（对人类贡献者同样适用）。
> **违反边界 = 缺陷，即使代码"能跑"。拿不准 = 停下来，禁止自行填充空白。**

---

## 0. 一句话铁律

**每一行实现代码都必须能指出它对应的 docs/ 规格章节；指不出来 → 先写文档或先提问，再写代码。**

## 1. 写代码前的必读路由（按任务类型）

| 你要做什么 | 动手前必读 | 禁止事项 |
| --- | --- | --- |
| 动任何实体/表/字段/迁移 | `docs/04-数据与种子.md` 全文 | 自创字段、改枚举取值、绕过迁移 |
| 实现状态流转/业务动作 | `docs/02-业务流程规格.md` 对应章节（含 file:line 证据） | 凭印象写流转条件、默认值、"顺手优化"流程 |
| 新增/修改接口 | `docs/03-接口与契约.md` §4 端点清单 + §2 错误码 + §3 权限点 | 发明清单外的端点/权限点/错误码段 |
| 写前端页面/组件 | `docs/05-前端架构.md` + `docs/06-代码规范.md` §6 | 更换 UI 库/状态方案/路由策略 |
| 改双端共享内容 | `docs/03-接口与契约.md` §12（shared 包映射表） | 在 app 内复制/重定义 shared 内容 |
| 改权限体系 | `docs/01` §9 + `docs/06` §5 + ADR D004/D005 | 在 JWT payload 塞角色/权限字段 |
| 提交代码 | `docs/06-代码规范.md` §2/§8 | 绕过钩子、乱用 commit type |

## 2. 技术栈边界（硬约束，禁止替换或叠加）

| 层 | 唯一选型 | 明确禁止引入 |
| --- | --- | --- |
| 后端框架 | NestJS 10+ / TypeORM / MySQL8 / Redis | Prisma、Sequelize、MongoDB、GraphQL |
| 前端框架 | Vue3.5 + Vite + Pinia + @tanstack/vue-query | React、Redux/MobX、Nuxt |
| UI | Element Plus 2.14 + Tailwind CSS 4（设计令牌）｜2026-11-06 决策：走 docs/05 §1 备选路径，三方组件库优先、禁止自绘 UI 基础件 | 自绘组件库（shadcn-vue 拷贝源码模式）、Ant Design Vue、Less/Sass/SCSS、emoji 图标 |
| 实时 | socket.io-client / @nestjs/websockets | WebSocket 裸协议、SockJS、Pusher |
| 编辑器 | md-editor-v3（统一 Markdown） | CKEditor/TinyMCE/Quill 富文本 |
| 图标/动画 | @element-plus/icons-vue、@vueuse/motion | emoji 图标、自造图标/动画 |
| 图表 | ECharts 5 | Chart.js、D3 自绘 |
| 工具库 | dayjs、lodash-es、zod+vee-validate | moment、自造 utils 重复轮子 |

新依赖必须在 PR/提交说明中给理由，并同步 docs/01 §2 或 docs/05 §1。

## 3. 目录与文件边界

**只允许在这些位置创建代码文件**：

| 位置 | 内容边界 | 结构权威 |
| --- | --- | --- |
| `apps/server/src/**` | NestJS 代码，严格按 modules/ + common/ + database/ 布局 | docs/01 §3.2 |
| `apps/web/src/**` | Vue 代码，严格按 api/ lib/ composables/ stores/ views/ 布局 | docs/05 §3 |
| `packages/shared/src/**` | **仅常量与类型**，与 docs/03 §12 文件清单一一对应 | docs/03 §12 |
| 仓库根 | 仅工程配置（已存在的文件集），新增需在 PR 说明 | — |

**禁止**：

- 在 `reference/` 下创建/修改任何内容（禅道源码只读参照）；
- 把业务逻辑、运行时代码放进 `packages/shared`（零依赖纯 TS）；
- 在仓库根随手放脚本/临时文件；临时实验代码不进版本库；
- 跳过模块边界互相 import（如 product service 直接 import quality 的内部 service——跨模块经导出接口或事件）。

**新文件位置判定**：全局常量/类型 → shared；跨模块复用逻辑 → common（后端）或 composables（前端）；只服务单一模块 → 该模块内。拿不准放哪 = 先提问。

## 4. 契约边界（monorepo 单源，ADR D001）

1. 枚举（各实体状态/类型）、权限点、Socket 事件名与 payload、错误码、看板列映射、API 类型：**只能定义于 `packages/shared`，只能 import 使用**；
2. 后端 `@Permissions('module','action')` 与前端 `v-permission`、路由 meta 的权限点字符串必须来自 `shared/permissions`——禁止手写字符串；
3. 修改 shared 任何文件 → 必须同步回填 `docs/03 §12` 映射表，且 `pnpm build` 双端通过（turbo 编译期会卡，别试着绕）；
4. 前端禁止自造 `ApiResponse/R/RList` 类响应包装（用 `shared/dto`），禁止本地 any 逃逸 API 签名。

## 5. 业务逻辑边界（最高仲裁：docs/02-业务流程规格）

- **状态机不可变更**：story 五状态+reviewing 流+15 值 stage、task 六状态+isClickable 前置表、bug 三状态+resolution 语义、testtask 四态（done=已关闭）——新增/改名/合并状态、增删流转边一律禁止；发现规格疑义 → 走 §11 流程；
- **反直觉行为是禅道语义，禁止"修正"**：需求变更只提醒不自动改写任务/用例；用例默认免评审；测试单 done=已关闭且无自动完成；WIP 超限仅提示不拦截；业务对象完成不自动完成 todo；consumed 只增不减；
- **隐式状态迁移**（记工时驱动任务状态）、父子/多人任务聚合、执行→项目→项目集向上传播（syncPPE）、需求 stage 自动计算引擎：必须实现为**单一函数**并被所有入口复用，禁止散落重复实现；
- 权限模型铁律：**JWT payload 只含身份（sub+account），不含角色/权限**（ADR D004）——任何"为了方便"往 JWT 塞权限的实现直接拒绝。

## 6. 数据模型边界（权威：docs/04-数据与种子）

- 实体字段、类型、索引、UNIQUE 约束 = docs/04 字段级规格；需要差异 → 先改 docs/04（递增版本）再改实体；
- 全局约定（docs/04 §1）：逻辑外键不建物理约束、审计列五件套、`deleted` 软删除、保留字列名映射；
- 生产禁止 `synchronize: true`；schema 变更必须走 TypeORM migration，迁移先于应用启动；
- 表对照以 docs/04 为准：不存在 `zt_task_estimate`（已废弃→zt_effort）、不存在独立看板卡片表（卡片=业务对象本体，cell 存 ID 串）。

## 7. 接口边界（权威：docs/03-接口与契约）

- 端点必须在 §4 清单内（路径/方法/权限点三对齐）；新端点 = 先补文档 + §3.1 种子机制覆盖，再实现；
- 状态流转**只允许动词端点**（`POST /bugs/:id/resolve`），禁止用 PATCH 隐式改状态字段；
- 错误码必须取自 §2 注册表段位（shared/error-codes），禁止魔法数字与临时段位；
- 分页/排序/过滤参数名与 §1 全局约定一致；过滤字段白名单经 `shared/filters` 注册。

## 8. 代码规范与提交（权威：docs/06-代码规范）

- 全文强制，尤其：§1 AI 协作纪律、§3.3 API 命名旧世代禁令（`queryXxx/detailXxx/createXxx/removeXxx` 等 = 缺陷）、§4.3 异步与类型实战教训（ID 归一化、finally 只清理、Commit-after-Persist）；
- 提交信息 `type: 中文描述`；husky 钩子不可绕过（`--no-verify` 仅紧急例外且须事后补修注明）。

## 9. 提交前自检清单（逐项过，过不了就不提交）

- [ ] 能说出本次改动对应的 docs/ 章节（说不出 = 还没到可提交状态）
- [ ] `pnpm build` 通过；改了 shared → `docs/03 §12` 已回填
- [ ] 无 `console.log/debug`、无未注释 `as any`、无自创枚举/字段/错误码
- [ ] 状态流转逻辑与 docs/02 状态机逐条核对过（特别是易错点：reject 的 stage 取值、close 前置、activate 语义）
- [ ] 新文件都在 §3 允许位置、命名符合 docs/06 §3
- [ ] commit 信息 `type: 中文描述` 且钩子全绿

## 10. 典型违规对照（高频易犯）

| ❌ 违规（直接拒绝） | ✅ 正确（依据） |
| --- | --- |
| 自建独立看板卡片表 board_card | 卡片=任务/Story/Bug 本体，cell.cards 存 ID 串（docs/02 §8.1） |
| 各处手工累加 task.consumed | Repository 单点聚合 Σzt_effort；task.left=最后一条 effort（docs/04 §5） |
| `catch (e) { return { ok: true } }` 静默兜底 | 显式异常化或 `TODO(待确认)` 保守处理（docs/06 §1） |
| JWT payload 加 `roles` 字段图省事 | 只放 sub+account，权限查 DB/Redis（docs/01 §9） |
| `queryTaskList()` / `createBug()` 命名 | `getTaskList()` / `addBug()`（docs/06 §3.3 禁令） |
| WIP 超限返回 422 硬拦截 | 仅广播 `board:wip:exceeded` 警告（docs/02 §8.1） |
| 新建工时表 zt_task_estimate | 统一 zt_effort（objectType 通用）（docs/04 §5） |
| `PATCH /bugs/:id` 改 status 字段 | `POST /bugs/:id/resolve` 动词端点（docs/03 §7） |
| 前端本地写死任务状态枚举 | import `@zentao/shared/enums`（docs/03 §12） |
| 评审"通过"时顺手把关联任务置 done | 需求评审不改任务状态，affected 仅提醒（docs/02 §4.3） |

## 11. 规格冲突与缺口处理（三步，不许跳）

1. **冲突** → 按 docs/README §1 仲裁权表裁决（流程类 02 最高、接口类 03、数据类 04、前端 05、规范 06）；仍存疑 → 提问；
2. **缺口**（规格没写的行为）→ 停：`// TODO(待确认): <问题>` + 保守实现（不改现有行为），或直接向用户/产品提问；**禁止自行设计业务规则**；
3. **需改规格** → 先改 docs/ 对应文档（版本号递增）→ 再改代码；ADR（docs/00）只增不改。

## 12. 子目录叠加守则

`apps/server`、`apps/web` 初始化时（P0/F0）各自携带更细的 `AGENTS.md`（框架级规则：Nest 模块模板/Vue 组件模板等），与本文叠加生效。冲突以更内层为准，但**不得放宽本文任何【硬约束】**。

## 13. 交付验证边界【硬约束】（源自 P1「No auth token」事故复盘）

> 事故：同一会话内我方写入的 `lib/http.ts` 与 `stores/auth.ts` 存储键位漂移，P1 交付时「前端联调」被标记完成但从未走前端真实路径。

1. **端到端验证是完成的前置条件**：涉及双端或用户可见路径的交付，必须验证**用户实际操作路径**（真实浏览器自动化 ego-browser/Playwright，或与用户明确约定的等价端到端手段）。**单层 curl 通过 ≠ 该项完成**。
2. **同会话自产契约自查**：凡本次会话新写的两个及以上文件存在互相引用（存储键、常量、事件名、路由路径、DTO 字段），提交前必须 **grep 逐一对照**实际字面量，禁止凭"刚写过应该一致"的记忆假设。
3. **交付报告必须含「已验证 / 未验证」清单**：逐项列出验证手段与结果；未验证项必须显式标注「未验证」及其风险，**禁止**标记 completed（含 TodoWrite 工具内的状态）。
4. **验收标准回指文档**：每阶段交付前对照 docs/01 §11 该阶段验收标准逐条打勾，缺失项如实声明顺延。

5. **测试规范与台账**：每阶段按 `docs/07-阶段测试与验收规范.md` 定义的手段级别（L1-L5）执行测试，交付报告使用其 §2 强制模板；阶段状态台账（§3）是「是否测试通过」的唯一权威记录。
6. **进度文档同步**【强制】：每个阶段/里程碑收口（提交并推送）时，必须同步更新 \`docs/08-开发进度与交付状态.md\`（仪表盘状态/断言统计/提交号/日期/版本号/剩余工作），禁止出现"代码已完成而进度文档滞后"的状态。
