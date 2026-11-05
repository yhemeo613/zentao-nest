# zentao-nest

禅道开源版（ZenTao 22.7）复刻 —— NestJS + Vue3 前后端同仓 monorepo。

> 项目定位、架构与开发计划见 [docs/README.md](./docs/README.md)（文档体系导航）。

## 仓库结构

```text
zentao-nest/
├── apps/
│   ├── server/               # NestJS 11 后端（P0 已初始化：health/统一响应/异常/校验/Swagger）
│   └── web/                  # Vue3 + Vite 前端（F0 已初始化：路由/Pinia/vue-query/http 基础/Tailwind）
├── packages/
│   └── shared/               # 双端同源契约包（P0 已落：错误码注册表 + HTTP 类型）
├── docs/                     # 设计文档体系（README 为导航；06 为代码规范）
├── reference/                # 禅道 22.7 源码参照（gitignore，仅本地）
├── pnpm-workspace.yaml
├── turbo.json
└── docker-compose.yml        # MySQL8 + Redis7（server/web 容器 P7 追加）
```

## 快速开始

```bash
pnpm install                # 安装 workspace 依赖
docker compose up -d        # 启动 MySQL8 + Redis7（凭据见 .env.example → .env）
pnpm build                  # turbo build（shared → server/web）
pnpm dev                    # 并行启动 server(:3000) + web(:5173)
```

验证：浏览器打开 http://localhost:5173 → 「系统状态」页应显示 MySQL/Redis 正常；后端健康检查 `GET :3000/api/v1/health`；Swagger `:3000/api/docs`。

## 开发约定

- **AI 编码代理必读**：[AGENTS.md](./AGENTS.md) —— 边界守则（技术栈/目录/契约/业务逻辑/接口五重边界 + 提交前自检清单），**一切实现必须能指到 docs/ 的具体规格**；
- **契约同源**：双端共享的类型/常量一律放 `packages/shared`，规则见 docs/03-接口与契约 §12；
- **文档先行**：业务规格冲突以 docs/02 为准，接口以 docs/03 为准，数据以 docs/04 为准，编码规范以 docs/06 为准；
- **提交规范**：`type: 中文描述`（Conventional Commits），husky 强制 prettier + commitlint，禁止绕过钩子。
