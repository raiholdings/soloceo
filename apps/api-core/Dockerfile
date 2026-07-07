# api-core — build từ gốc monorepo: docker build -f apps/api-core/Dockerfile .
# Single-stage có chủ đích: pnpm deploy (v9) lỗi layout với workspace,
# đổi lấy image lớn hơn nhưng chắc chắn chạy. Tối ưu size ở giai đoạn sau.
FROM node:22-alpine
RUN corepack enable pnpm && apk add --no-cache openssl
WORKDIR /app
ENV CI=true

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api-core ./apps/api-core
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter "@soloceo/api-core..."
# db build = prisma generate && tsc → client sinh ngay trong node_modules này
RUN pnpm --filter @soloceo/db build && pnpm --filter @soloceo/shared build \
    && pnpm --filter @soloceo/api-core build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma && node apps/api-core/dist/main.js"]
