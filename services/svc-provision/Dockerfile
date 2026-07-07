# svc-provision — build từ gốc monorepo: docker build -f services/svc-provision/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY services/svc-provision ./services/svc-provision
COPY packages ./packages
COPY infra/coolify/templates ./infra/coolify/templates
RUN pnpm install --frozen-lockfile --filter @soloceo/svc-provision...
RUN pnpm --filter @soloceo/db build && pnpm --filter @soloceo/svc-provision build
RUN pnpm --filter @soloceo/svc-provision --prod deploy /out
RUN cp -r services/svc-provision/dist /out/dist \
    && mkdir -p /out/infra/coolify && cp -r infra/coolify/templates /out/infra/coolify/templates \
    && cp -r packages/db/prisma /out/prisma \
    && cd /out && ./node_modules/.bin/prisma generate --schema prisma/schema.prisma

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production TEMPLATES_DIR=/app/infra/coolify/templates
COPY --from=build /out .
CMD ["node", "dist/index.js"]
