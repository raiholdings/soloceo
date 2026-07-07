# svc-billing-webhooks — build từ gốc monorepo: docker build -f services/svc-billing-webhooks/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY services/svc-billing-webhooks ./services/svc-billing-webhooks
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @soloceo/svc-billing-webhooks...
RUN pnpm --filter @soloceo/db build && pnpm --filter @soloceo/shared build \
    && pnpm --filter @soloceo/svc-billing-webhooks build
RUN pnpm --filter @soloceo/svc-billing-webhooks --prod deploy /out
RUN cp -r services/svc-billing-webhooks/dist /out/dist

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
EXPOSE 4200
CMD ["node", "dist/index.js"]
