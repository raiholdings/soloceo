# web-community (soloceo.vn) — build từ gốc monorepo:
#   docker build -f apps/web-community/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.soloceo.vn .
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /repo

FROM base AS build
ARG NEXT_PUBLIC_API_URL=https://api.soloceo.vn
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/web-community ./apps/web-community
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @soloceo/web-community...
RUN pnpm --filter @soloceo/shared build && pnpm --filter @soloceo/web-community build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web-community/.next/standalone ./
COPY --from=build /repo/apps/web-community/.next/static ./apps/web-community/.next/static
EXPOSE 3000
CMD ["node", "apps/web-community/server.js"]
