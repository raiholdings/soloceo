# api-core — build từ gốc monorepo: docker build -f apps/api-core/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api-core ./apps/api-core
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @soloceo/api-core... --filter @soloceo/db...
RUN pnpm --filter @soloceo/db build && pnpm --filter @soloceo/shared build \
    && pnpm --filter @soloceo/api-core build
# gói production độc lập (node_modules đã prune)
RUN pnpm --filter @soloceo/api-core --prod deploy --legacy /out
RUN cp -r apps/api-core/dist /out/dist \
    && cp -r packages/db/prisma /out/prisma

FROM node:22-alpine
RUN apk add --no-cache openssl && corepack enable pnpm
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out .
# chạy migration rồi khởi động API
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
EXPOSE 4000
