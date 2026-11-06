# zentao-nest 后端镜像（multi-stage：builder → runner，dist 仅含产物，docs/01 §13）
FROM node:22-alpine AS builder
WORKDIR /build
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @zentao/server --filter @zentao/shared
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @zentao/shared build \
 && pnpm --filter @zentao/server build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /build/pnpm-workspace.yaml /build/pnpm-lock.yaml /build/package.json ./
COPY --from=builder /build/apps/server/package.json apps/server/
COPY --from=builder /build/packages/shared/package.json packages/shared/
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/packages/shared/dist packages/shared/dist
COPY --from=builder /build/apps/server/dist apps/server/dist/
EXPOSE 3000
WORKDIR /app/apps/server
# 迁移先于应用启动（compose 健康检查门禁兜底；docs/01 §13 迁移纪律）
CMD ["node", "dist/main.js"]
