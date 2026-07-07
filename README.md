# SoloCEO — Hệ điều hành cho doanh nghiệp một người

Monorepo nền tảng SoloCEO (soloceo.vn). Spec đầy đủ: [CLAUDE.md](./CLAUDE.md).

## Cấu trúc
- `apps/web-community` — soloceo.vn (Next.js 15, cổng 3000)
- `apps/web-platform` — platform.soloceo.vn, OS Shell (Next.js 15, cổng 3001)
- `apps/api-core` — API NestJS (cổng 4000, Swagger `/docs`)
- `services/svc-provision` — worker provisioning Coolify (Giai đoạn 3)
- `services/svc-billing-webhooks` — webhook Stripe/PayOS (Giai đoạn 5)
- `packages/db` — Prisma schema + migrations + seed
- `packages/shared` — types, constants gói cước
- `packages/ui` — design tokens + components dùng chung
- `infra/` — docker-compose, LiteLLM config, template Coolify, .env.example

## Chạy dev
```bash
corepack enable pnpm
pnpm install
cp infra/env/.env.example .env   # điền DATABASE_URL trỏ Postgres local
pnpm db:generate
pnpm --filter @soloceo/db migrate:dev   # cần Postgres đang chạy
pnpm dev
```

- soloceo.vn dev: http://localhost:3000
- OS Shell dev: http://localhost:3001
- API health: http://localhost:4000/v1/health
