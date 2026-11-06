# zentao-nest 后端镜像（multi-stage：builder → runner，dist 仅含产物，docs/01 §13）
FROM node:22-alpine AS builder
WORKDIR /build
# 显式钉 pnpm 版本：corepack 会无视 packageManager 拉最新版，pnpm 12 读 v9 锁文件会静默跳过安装
RUN npm i -g pnpm@10.30.2
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
# 全工作区安装：过滤安装在 pnpm v10 下会漏 shared 的 devDeps（tsc），builder 一次装全，runner 仅拷产物
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @zentao/shared build \
 && pnpm --filter @zentao/server build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /build/pnpm-workspace.yaml /build/pnpm-lock.yaml /build/package.json ./
COPY --from=builder /build/apps/server/package.json apps/server/
COPY --from=builder /build/packages/shared/package.json packages/shared/
# pnpm 布局：根 node_modules(.pnpm 仓) + 各包 node_modules(相对符号链接)——三条都要拷
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /build/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /build/packages/shared/dist packages/shared/dist
COPY --from=builder /build/apps/server/dist apps/server/dist/
EXPOSE 3000
WORKDIR /app/apps/server
# 迁移先于应用启动（compose 健康检查门禁兜底；docs/01 §13 迁移纪律）
CMD ["node", "dist/main.js"]
