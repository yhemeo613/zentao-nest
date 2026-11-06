# zentao-nest 前端镜像（node build → nginx 托管，docs/05 §11）
FROM node:22-alpine AS builder
WORKDIR /build
# 显式钉 pnpm 版本（同 apps/server/Dockerfile）
RUN npm i -g pnpm@10.30.2
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @zentao/shared build \
 && pnpm --filter web build

FROM nginx:alpine AS runner
COPY --from=builder /build/apps/web/dist /usr/share/nginx/html
# SPA 回退 + /api 反代 + /ws upgrade（运行时由 compose 注入反代目标）
RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location /api/ { proxy_pass http://server:3000; proxy_set_header Host $host; }' \
  '  location /ws { proxy_pass http://server:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; }' \
  '  location / { try_files $uri $uri/ /index.html; }' \
  '  gzip on; gzip_types text/css application/javascript application/json;' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
