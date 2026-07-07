# svc-provision — build từ gốc monorepo (single-stage, xem ghi chú api-core)
FROM node:22-alpine
RUN corepack enable pnpm && apk add --no-cache openssl
WORKDIR /app
ENV CI=true

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY services/svc-provision ./services/svc-provision
COPY packages ./packages
COPY infra/coolify/templates ./infra/coolify/templates
RUN pnpm install --frozen-lockfile --filter "@soloceo/svc-provision..."
RUN pnpm --filter @soloceo/db build && pnpm --filter @soloceo/svc-provision build

ENV NODE_ENV=production TEMPLATES_DIR=/app/infra/coolify/templates
CMD ["node", "services/svc-provision/dist/index.js"]
