# zentao-nest

禅道开源版（ZenTao 22.7）复刻 —— NestJS + Vue3 前后端同仓 monorepo。

> 项目定位、架构与开发计划见 [docs/README.md](./docs/README.md)（文档体系导航）。

## 仓库结构

```text
zentao-nest/
├── apps/
│   ├── server/               # NestJS 后端（P0 待初始化）
│   └── web/                  # Vue3 + Vite 前端（F0 待初始化）
├── packages/
│   └── shared/               # 双端同源契约包（枚举/权限点/Socket 契约/错误码/DTO 类型）
├── docs/                     # 设计文档体系 v2.0（7 份，README 为导航）
├── reference/                # 禅道 22.7 源码参照（gitignore，仅本地）
├── pnpm-workspace.yaml
├── turbo.json
└── docker-compose.yml        # P7 落位（mysql/redis/server/web 四容器）
```

## 快速开始（当前为骨架阶段）

```bash
pnpm install        # 安装 workspace 依赖
pnpm build          # turbo build（当前仅 packages/shared）
```

> `apps/server`、`apps/web` 分别在后端 P0、前端 F0 里程碑初始化（docs/01-总体设计 §11、docs/05-前端架构 §10）。

## 开发约定

- **契约同源**：双端共享的类型/常量一律放 `packages/shared`，规则见 docs/03-接口与契约 §12；
- **文档先行**：业务规格冲突以 docs/02 为准，接口以 docs/03 为准，数据以 docs/04 为准；
- **提交规范**：Conventional Commits（`feat: / fix: / docs: / chore: / refactor:`），流水线接入 commitlint（F0/P0 落地）。
