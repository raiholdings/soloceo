# svc-billing-webhooks — build từ gốc monorepo (single-stage, xem ghi chú api-core)
FROM node:22-alpine
RUN corepack enable pnpm && apk add --no-cache openssl
WORKDIR /app
ENV CI=true

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY services/svc-billing-webhooks ./services/svc-billing-webhooks
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter "@soloceo/svc-billing-webhooks..."
RUN pnpm --filter @soloceo/db build && pnpm --filter @soloceo/shared build \
    && pnpm --filter @soloceo/svc-billing-webhooks build

ENV NODE_ENV=production
EXPOSE 4200
CMD ["node", "services/svc-billing-webhooks/dist/index.js"]
