# DEPLOY SOLOCEO — 2 NODE (ADR-004 đã duyệt)

> **VPS-CORE** = Contabo Cloud VDS S (3 core EPYC / 24GB / 180GB NVMe, Ubuntu 24.04)
> chạy Coolify + core stack + **Supabase self-host**.
> **VPS-TENANT-01** = VPS thứ 2 (khuyến nghị 32GB) chỉ chạy stack tenant,
> thêm vào Coolify qua SSH (Servers → Add).
> App build trực tiếp từ GitHub bằng Dockerfile trong repo.

## 0. DNS (Cloudflare)
| Bản ghi | Trỏ về | Proxy |
|---|---|---|
| soloceo.vn | IP VPS-CORE | ON |
| platform.soloceo.vn | IP VPS-CORE | ON |
| api.soloceo.vn | IP VPS-CORE | ON |
| pay.soloceo.vn (webhooks) | IP VPS-CORE | ON |
| auth.soloceo.vn (Supabase) | IP VPS-CORE | ON |
| coolify.soloceo.vn | IP VPS-CORE | OFF |
| llm.soloceo.vn | IP VPS-CORE | OFF (chặn IP sau) |
| *.app.soloceo.vn | **IP VPS-TENANT-01** | **OFF lúc cấp SSL đầu**, bật lại sau |

## 1. Bootstrap server (1 lệnh, ~5 phút)
```bash
ssh root@<IP>
curl -fsSL https://raw.githubusercontent.com/raiholdings/soloceo/soloceo-mvp/infra/scripts/setup-vds.sh | bash
```
Xong: mở `http://<IP>:8000`, tạo tài khoản admin Coolify NGAY, tạo API token.

## 1b. Thêm VPS-TENANT-01 vào Coolify
Sau khi mua VPS thứ 2 (Ubuntu 24.04): Coolify → Servers → Add Server →
nhập IP + SSH key (Coolify tự cài Docker). Đặt tên `tenant-01`.
Stack tenant (svc-provision tạo) sẽ deploy vào server này.

## 2. Hạ tầng dùng chung (Coolify → Projects → soloceo-core, server localhost)
Tạo bằng Coolify one-click resources:
1. **PostgreSQL 16** — db `soloceo` → lấy `DATABASE_URL`
2. **Redis 7** → `REDIS_URL`
3. **LiteLLM**: service compose từ `infra/docker-compose.core.yml` (block litellm)
   + mount `infra/litellm/config.yaml`; domain `llm.soloceo.vn`
4. **Supabase self-host** (ADR-004): Coolify → New Resource → Service →
   Supabase template; domain `auth.soloceo.vn`. Lấy từ stack:
   `SUPABASE_URL=https://auth.soloceo.vn`, `ANON_KEY`, `SERVICE_ROLE_KEY`,
   và `JWT_SECRET` → điền vào `JWT_SUPABASE_SECRET` của api-core.
   Bật Google OAuth + email OTP trong GoTrue env. Chạy RLS:
   `packages/db/rls/001_rls_policies.sql` trên Postgres của Supabase.

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
