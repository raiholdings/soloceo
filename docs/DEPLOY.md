# DEPLOY SOLOCEO LÊN CONTABO CLOUD VDS S (1 node — ADR-004)

> Máy: 3 core AMD EPYC / 24GB RAM / 180GB NVMe / Ubuntu 24.04.
> Toàn bộ app deploy qua Coolify, build trực tiếp từ GitHub bằng Dockerfile
> trong repo. Ước RAM core stack ~5GB, còn ~17GB cho tenant.

## 0. DNS (Cloudflare) — trỏ về IP VDS
| Bản ghi | Loại | Proxy |
|---|---|---|
| soloceo.vn | A | ON |
| platform.soloceo.vn | A | ON |
| api.soloceo.vn | A | ON |
| pay.soloceo.vn (webhooks) | A | ON |
| coolify.soloceo.vn | A | OFF |
| llm.soloceo.vn | A | OFF (chặn IP sau) |
| *.app.soloceo.vn | A | **OFF lúc cấp SSL đầu**, bật lại sau |

## 1. Bootstrap server (1 lệnh, ~5 phút)
```bash
ssh root@<IP>
curl -fsSL https://raw.githubusercontent.com/raiholdings/soloceo/soloceo-mvp/infra/scripts/setup-vds.sh | bash
```
Xong: mở `http://<IP>:8000`, tạo tài khoản admin Coolify NGAY, tạo API token.

## 2. Hạ tầng dùng chung (Coolify → Projects → soloceo-core)
Tạo bằng Coolify one-click resources:
1. **PostgreSQL 16** — db `soloceo` → lấy `DATABASE_URL`
2. **Redis 7** → `REDIS_URL`
3. **LiteLLM**: service compose từ `infra/docker-compose.core.yml` (block litellm)
   + mount `infra/litellm/config.yaml`; domain `llm.soloceo.vn`
4. (Khuyến nghị pilot) **Supabase Cloud** free tier thay vì self-host:
   lấy `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`, JWT secret →
   `JWT_SUPABASE_SECRET`

## 3. Deploy 5 app (Coolify → New Resource → Public Repository)
Repo: `https://github.com/raiholdings/soloceo`, branch `soloceo-mvp`,
Build Pack: **Dockerfile**, Base Directory: `/` (gốc repo).

| App | Dockerfile Location | Domain | Cổng |
|---|---|---|---|
| api-core | `apps/api-core/Dockerfile` | api.soloceo.vn | 4000 |
| web-community | `apps/web-community/Dockerfile` | soloceo.vn | 3000 |
| web-platform | `apps/web-platform/Dockerfile` | platform.soloceo.vn | 3001 |
| svc-provision | `services/svc-provision/Dockerfile` | (không domain) | — |
| svc-billing-webhooks | `services/svc-billing-webhooks/Dockerfile` | pay.soloceo.vn | 4200 |

Build args cho 2 web: `NEXT_PUBLIC_API_URL=https://api.soloceo.vn`.

### Env vars (điền trong Coolify, tham chiếu infra/env/.env.example)
**api-core**: `DATABASE_URL`, `REDIS_URL`, `JWT_SUPABASE_SECRET`, `MASTER_KEY`
(32 bytes hex — sinh: `openssl rand -hex 32`), `PUBLIC_APP_DOMAIN=app.soloceo.vn`,
`COOLIFY_BASE_URL=https://coolify.soloceo.vn`, `COOLIFY_API_TOKEN`,
`LITELLM_BASE_URL=https://llm.soloceo.vn`, `LITELLM_MASTER_KEY`.
⚠️ KHÔNG đặt `DEV_AUTH`, `COOLIFY_FAKE`, `LITELLM_FAKE`, `PAYMENTS_FAKE` ở prod.

**svc-provision**: `DATABASE_URL`, `REDIS_URL`, `COOLIFY_BASE_URL`,
`COOLIFY_API_TOKEN`, `PUBLIC_APP_DOMAIN`, `LITELLM_BASE_URL`.

**svc-billing-webhooks**: `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET`,
`PAYOS_CHECKSUM_KEY`, `BILLING_PORT=4200`.

## 4. Webhook cổng thanh toán
- Stripe Dashboard → Webhooks → `https://pay.soloceo.vn/v1/webhooks/stripe`
  (events: checkout.session.completed, invoice.paid, invoice.payment_failed,
  customer.subscription.deleted) → copy signing secret.
- PayOS merchant → webhook URL `https://pay.soloceo.vn/v1/webhooks/payos`.

## 5. Seed + kiểm tra
```bash
# migration tự chạy khi api-core khởi động; seed catalog:
docker exec <container-api-core> npx tsx prisma/seed.ts   # hoặc chạy từ máy dev trỏ DATABASE_URL prod
curl https://api.soloceo.vn/v1/health        # {"status":"ok"}
```
RLS: chạy `packages/db/rls/001_rls_policies.sql` trên Postgres (nếu dùng Supabase).

## 6. Sau go-live
- `ufw delete allow 8000/tcp` (đóng cổng Coolify UI trần).
- Bật lại Cloudflare proxy cho `*.app.soloceo.vn` sau khi SSL cấp xong.
- Backup đêm + Uptime Kuma theo CLAUDE.md Phần 10 / GĐ7.
