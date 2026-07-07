# SoloCEO — Hệ điều hành cho doanh nghiệp một người

Monorepo nền tảng SoloCEO (soloceo.vn). Spec đầy đủ: [CLAUDE.md](./CLAUDE.md).

## Cấu trúc
- `apps/web-community` — soloceo.vn: landing, đăng ký, wizard venture, danh bạ, feed (cổng 3000)
- `apps/web-platform` — platform.soloceo.vn: **OS Shell** (dock, cửa sổ kéo thả) + `/admin` (cổng 3001)
- `apps/api-core` — API NestJS: orgs, ventures, store, ai, payments, marketplace, admin (cổng 4000, Swagger `/docs`)
- `services/svc-provision` — worker BullMQ + Coolify API (provisioning per-tenant)
- `services/svc-billing-webhooks` — webhook Stripe/PayOS → sổ cái (cổng 4200, có test vitest)
- `packages/db` — Prisma schema + migrations + seed + RLS SQL
- `packages/shared` — constants gói cước, điều kiện M&A
- `packages/ui` — design tokens glassmorphism + components
- `infra/` — devstack local, docker-compose, LiteLLM config, 5 template Coolify, `.env.example`

## Chạy dev local (không cần Docker)
```bash
corepack enable pnpm && pnpm install
cp infra/env/.env.example .env
# .env dev cần: DATABASE_URL, JWT_SUPABASE_SECRET, MASTER_KEY (32B hex), DEV_AUTH=1,
# COOLIFY_FAKE=1, LITELLM_FAKE=1, PAYMENTS_FAKE=1 (xem phần Chế độ fake)

# 1. Postgres + Redis nhúng (project-local)
pnpm --filter @soloceo/devstack start          # giữ terminal này chạy

# 2. Migrate + seed (terminal khác)
pnpm --filter @soloceo/db migrate:dev && pnpm db:seed

# 3. Build + chạy tất cả
pnpm build
node apps/api-core/dist/main.js &              # API :4000
node services/svc-provision/dist/index.js &    # worker provisioning
node services/svc-billing-webhooks/dist/index.js &  # webhooks :4200
pnpm --filter @soloceo/web-community start &   # :3000
pnpm --filter @soloceo/web-platform start &    # :3001
```

Đăng nhập dev: nhập email bất kỳ (DEV_AUTH=1 phát JWT cùng chuẩn Supabase).
Admin Console: đăng nhập qua `POST /v1/auth/dev-login {"email":"...","platformAdmin":true}` rồi mở `http://localhost:3001/admin`.

## Chế độ fake (dev local, không cần hạ tầng ngoài)
| Cờ | Thay thế | Đường code thật giữ nguyên |
|---|---|---|
| `COOLIFY_FAKE=1` | Coolify API | `CoolifyClient` REST — tắt cờ + điền `COOLIFY_*` |
| `LITELLM_FAKE=1` | LiteLLM Proxy | `/key/generate`, spend logs — điền `LITELLM_*` |
| `PAYMENTS_FAKE=1` | Stripe/PayOS | verify chữ ký + normalize + apply idempotent chạy thật; chỉ bỏ verify đầu vào và thêm `/dev/simulate` |
| `DEV_AUTH=1` | Supabase Auth | AuthGuard verify HS256 y hệt JWT GoTrue |

## Test
```bash
pnpm --filter @soloceo/svc-billing-webhooks test   # đường tiền: idempotency, phí, chữ ký
```

## Triển khai production
Theo [CLAUDE.md](./CLAUDE.md) Phần 10 (RUNBOOK): 2 VPS + Coolify + Supabase self-host,
điền secrets thật vào `.env`, tắt toàn bộ cờ fake + `DEV_AUTH`.
