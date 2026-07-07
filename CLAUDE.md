# SOLOCEO.VN — TÀI LIỆU TRIỂN KHAI MVP CHO CLAUDE CODE
**Phiên bản:** 1.0 | **Ngày:** 07/07/2026 | **Chủ trì:** Phạm Văn Thư — RAI Holdings
**Mục đích tài liệu:** Đây là spec kỹ thuật hoàn chỉnh để Claude Code dựng toàn bộ MVP SoloCEO từ con số 0 đến trạng thái VẬN HÀNH ĐƯỢC (có tenant thật, thanh toán thật, doanh thu đo được). Tài liệu này đồng thời là CLAUDE.md gốc của monorepo.

---

## PHẦN 0 — CÁCH SỬ DỤNG TÀI LIỆU NÀY VỚI CLAUDE CODE

1. Tạo repo trống `soloceo` trên GitHub, clone về máy chủ dev.
2. Copy toàn bộ file này vào gốc repo với tên `CLAUDE.md`.
3. Chạy Claude Code trong thư mục repo, thực hiện lần lượt các PROMPT GIAI ĐOẠN ở Phần 9. Mỗi giai đoạn kết thúc bằng tiêu chí nghiệm thu (Definition of Done — DoD). KHÔNG chuyển giai đoạn khi DoD chưa đạt.
4. Mọi quyết định kiến trúc trong tài liệu này là BẮT BUỘC. Nếu Claude Code muốn thay đổi, phải ghi vào `docs/ADR/` (Architecture Decision Record) và dừng lại hỏi người vận hành.

### Nguyên tắc bất biến (kế thừa RAI OS)
- **Venture là đơn vị giá trị lõi.** Mỗi Solo CEO sở hữu ≥1 Venture. Mọi bảng dữ liệu nghiệp vụ đều scope theo `venture_id` và `org_id`.
- **Mọi lời gọi LLM đi qua Gateway** (LiteLLM). Không service nào gọi thẳng OpenAI/Anthropic.
- **Human-in-the-loop:** hành động rủi ro (chi tiền, xóa dữ liệu, gửi hàng loạt) phải có checkpoint phê duyệt.
- **Doanh thu phải đo được:** mọi giao dịch của tenant đi qua module Payments của nền tảng — đây là nền tảng của Sàn M&A.
- **Ngôn ngữ giao diện:** tiếng Việt mặc định, i18n sẵn sàng cho tiếng Anh (thị trường quốc tế).

---

## PHẦN 1 — PHẠM VI MVP (90 NGÀY)

### 1.1 Có trong MVP
| # | Module | Mô tả ngắn |
|---|--------|-----------|
| M1 | Landing + Community (soloceo.vn) | Trang chủ, đăng ký, hồ sơ founder, hồ sơ venture, feed cộng đồng, danh bạ |
| M2 | OS Shell (platform.soloceo.vn) | Desktop web kiểu macOS: dock, cửa sổ kéo thả, app launcher — tái dùng concept raiholdings.vn |
| M3 | App Store & Provisioning | Catalog giải pháp mã nguồn mở, cài 1-click qua Coolify API, mỗi tenant 1 stack riêng |
| M4 | AI Studio | Nhúng Dify per-tenant: chatbot, RAG, agent cho doanh nghiệp của Solo CEO |
| M5 | Automation | Activepieces per-tenant (MIT license — được phép bán lại dạng dịch vụ) |
| M6 | Payments & Revenue Ledger | Cổng thanh toán (Stripe + PayOS/VNPay), sổ cái doanh thu xác thực per-venture |
| M7 | Sàn M&A (beta) | Niêm yết venture kèm badge "doanh thu đã xác thực", hồ sơ định giá, kết nối mua–bán, escrow thủ công |
| M8 | Admin Console | Quản trị tenant, gói cước, giám sát chi phí AI, kill-switch |

### 1.2 KHÔNG có trong MVP (để giai đoạn 2)
- Escrow tự động / hợp đồng điện tử M&A
- Mobile app (PWA là đủ)
- Marketplace agent do cộng đồng đóng góp (chỉ RAI curate)
- Multi-region

### 1.3 Chỉ số thành công MVP
- 20 Solo CEO pilot onboard, ≥10 venture có website + AI agent chạy thật
- ≥5 venture phát sinh doanh thu qua module Payments
- Thời gian provisioning 1 tenant < 5 phút, tự động 100%
- Chi phí AI trung bình/tenant/tháng đo được trên Langfuse, có cảnh báo vượt ngưỡng

---

## PHẦN 2 — KIẾN TRÚC TỔNG THỂ

```
                        ┌──────────────────────────────────────────┐
                        │              NGƯỜI DÙNG                   │
                        └───────┬──────────────────┬───────────────┘
                                │                  │
                    soloceo.vn  │                  │  platform.soloceo.vn
                   (Community)  │                  │  (OS Shell)
                        ┌───────▼──────┐   ┌───────▼────────┐
                        │  web-community│   │   web-platform │   Next.js 15, App Router
                        └───────┬──────┘   └───────┬────────┘
                                │                  │
                        ┌───────▼──────────────────▼────────┐
                        │        api-core (NestJS)           │  REST + WebSocket
                        │  auth · tenants · ventures · store │
                        │  payments · marketplace · admin    │
                        └──┬─────────┬──────────┬────────┬───┘
                           │         │          │        │
                 ┌─────────▼──┐ ┌────▼─────┐ ┌──▼─────┐ ┌▼──────────────┐
                 │ Supabase   │ │ svc-      │ │ LiteLLM│ │ Langfuse      │
                 │ (Postgres+ │ │ provision │ │ Gateway│ │ Observability │
                 │ Auth+Storage)│ (Coolify │ └──┬─────┘ └───────────────┘
                 └────────────┘ │  API)    │    │
                                └────┬─────┘    │  API key Anthropic/OpenAI/…
                                     │          ▼
                          ┌──────────▼──────────────────────────┐
                          │   CỤM VPS TENANT (Coolify quản lý)   │
                          │  tenant-a: dify + activepieces + web │
                          │  tenant-b: dify + activepieces + web │
                          │  …  (mỗi tenant 1 project Coolify,   │
                          │      subdomain *.app.soloceo.vn)     │
                          └──────────────────────────────────────┘
```

### 2.1 Quyết định stack (BẮT BUỘC)
| Lớp | Công nghệ | Lý do & ghi chú license |
|-----|-----------|-------------------------|
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui | Chuẩn RAI, SSR cho SEO landing |
| OS Shell | React (trong web-platform), react-rnd cho cửa sổ kéo thả | Tái dùng concept desktop raiholdings.vn |
| Backend | NestJS 10 (Node 20) | Module hóa rõ, phù hợp team |
| DB/Auth/Storage | Supabase self-host (Postgres 15, GoTrue, Storage) | RLS theo org_id, chạy trên Coolify |
| Provisioning | Coolify v4 (API) | 280+ template, quản lý đa VPS qua SSH |
| AI App Builder | Dify (self-host) | LƯU Ý LICENSE: bản open-source Dify có điều kiện về multi-tenant SaaS và giữ logo. MVP dùng mô hình "mỗi tenant 1 instance Dify riêng của chính tenant đó" để giảm rủi ro; TRƯỚC go-live thương mại phải rà soát license hoặc mua thương mại. Ghi ADR-001. |
| Automation | Activepieces (Community Edition, MIT) | ĐƯỢC phép cung cấp dạng dịch vụ. n8n CHỈ dùng nội bộ RAI (Sustainable Use License cấm bán lại) |
| LLM Gateway | LiteLLM Proxy | Multi-provider, virtual key per-tenant, budget/rate limit |
| Observability | Langfuse self-host | Trace, cost per-tenant |
| Payments | Stripe (quốc tế) + PayOS (VN, chuyển khoản QR) | Webhook chuẩn hóa về Revenue Ledger |
| Community forum | Discourse (giai đoạn 1.5, SSO OIDC) | MVP dùng feed tự build trước |
| Reverse proxy | Traefik (Coolify tự quản) + Cloudflare DNS | Wildcard *.app.soloceo.vn |

### 2.2 Sơ đồ hạ tầng vật lý (khởi điểm)
| Máy chủ | Cấu hình đề xuất | Vai trò |
|---------|------------------|---------|
| VPS-CORE | 8 vCPU / 16GB RAM / 200GB NVMe | Coolify controller, api-core, web-*, Supabase, LiteLLM, Langfuse |
| VPS-TENANT-01 | 8 vCPU / 32GB RAM / 300GB | Chạy stack tenant (ước 12–15 tenant/node với Dify+AP) |
| (mở rộng) VPS-TENANT-02… | như trên | Thêm khi >70% RAM |

DNS (Cloudflare):
- `soloceo.vn` → VPS-CORE (web-community)
- `platform.soloceo.vn` → VPS-CORE (web-platform)
- `api.soloceo.vn` → VPS-CORE (api-core)
- `*.app.soloceo.vn` → VPS-TENANT-01 (wildcard, Traefik route theo host)
- `llm.soloceo.vn`, `trace.soloceo.vn` → VPS-CORE (LiteLLM, Langfuse — chặn IP, chỉ nội bộ)

---

## PHẦN 3 — CẤU TRÚC MONOREPO

```
soloceo/
├── CLAUDE.md                      # chính là file này
├── docs/
│   ├── ADR/                       # quyết định kiến trúc
│   ├── RUNBOOK.md                 # vận hành (Phần 10)
│   └── API.md                     # sinh tự động từ OpenAPI
├── apps/
│   ├── web-community/             # soloceo.vn (Next.js)
│   ├── web-platform/              # platform.soloceo.vn (Next.js — OS Shell)
│   └── api-core/                  # NestJS
├── services/
│   ├── svc-provision/             # worker provisioning (Node + BullMQ)
│   └── svc-billing-webhooks/      # nhận webhook Stripe/PayOS
├── packages/
│   ├── ui/                        # shadcn components dùng chung
│   ├── db/                        # schema Prisma + migrations + seed
│   └── shared/                    # types, constants, i18n
├── infra/
│   ├── docker-compose.core.yml    # stack VPS-CORE
│   ├── coolify/templates/         # template app store (JSON/compose)
│   ├── litellm/config.yaml
│   └── env/.env.example
└── turbo.json / pnpm-workspace.yaml
```

Quy ước code: TypeScript strict; commit theo Conventional Commits; mỗi module NestJS có `*.controller.ts / *.service.ts / *.dto.ts / *.spec.ts`; test tối thiểu cho payments và provisioning (đường tiền và đường hạ tầng không được phép sai).

---

## PHẦN 4 — MÔ HÌNH DỮ LIỆU (Prisma / Postgres)

> Claude Code: tạo trong `packages/db/prisma/schema.prisma`. Bật RLS trên Supabase cho mọi bảng có `org_id`. Dưới đây là schema rút gọn — đủ để sinh migration đầu tiên.

```prisma
model Org {                    // 1 Solo CEO = 1 Org (multi-tenancy gốc)
  id            String   @id @default(uuid())
  name          String
  ownerUserId   String   // Supabase auth.users.id
  plan          Plan     @default(STARTER)
  status        OrgStatus @default(ACTIVE)   // ACTIVE|SUSPENDED|CHURNED
  createdAt     DateTime @default(now())
  ventures      Venture[]
  subscriptions Subscription[]
}

model Venture {                // Doanh nghiệp một người — đơn vị giá trị lõi
  id            String   @id @default(uuid())
  orgId         String
  name          String
  slug          String   @unique       // → {slug}.app.soloceo.vn
  industry      String?                // real_estate|fnb|education|services|other
  description   String?
  logoUrl       String?
  status        VentureStatus @default(DRAFT) // DRAFT|PROVISIONING|LIVE|PAUSED|LISTED|SOLD
  revenueVerified Boolean @default(false)
  createdAt     DateTime @default(now())
  org           Org      @relation(fields: [orgId], references: [id])
  installs      AppInstall[]
  transactions  Transaction[]
  listing       Listing?
}

model CatalogApp {             // App Store — giải pháp mã nguồn mở đóng gói sẵn
  id            String   @id @default(uuid())
  key           String   @unique      // "dify","activepieces","site-nextjs","crm-twenty",...
  name          String
  category      String                // ai|automation|web|crm|commerce
  composeTemplate String             // đường dẫn infra/coolify/templates/{key}.yml
  defaultEnv    Json
  planMin       Plan     @default(STARTER)
  active        Boolean  @default(true)
}

model AppInstall {             // 1 app đã cài cho 1 venture
  id            String   @id @default(uuid())
  ventureId     String
  catalogAppId  String
  coolifyAppId  String?              // id resource bên Coolify
  url           String?              // https://{slug}-{app}.app.soloceo.vn
  status        InstallStatus @default(QUEUED) // QUEUED|DEPLOYING|RUNNING|FAILED|REMOVED
  envOverrides  Json?
  createdAt     DateTime @default(now())
}

model Subscription {           // gói cước nền tảng
  id            String   @id @default(uuid())
  orgId         String
  plan          Plan
  provider      String               // stripe|payos
  providerRef   String               // subscription id / order code
  status        String               // active|past_due|canceled
  currentPeriodEnd DateTime
}

model Transaction {            // SỔ CÁI DOANH THU — trái tim của Sàn M&A
  id            String   @id @default(uuid())
  ventureId     String
  direction     TxDirection          // IN|OUT|PLATFORM_FEE
  grossAmount   Decimal  @db.Decimal(18,2)
  currency      String   @default("VND")
  provider      String               // stripe|payos|manual
  providerRef   String   @unique     // idempotency key
  customerRef   String?
  occurredAt    DateTime
  verified      Boolean  @default(true)  // true nếu từ webhook cổng thanh toán
  meta          Json?
  @@index([ventureId, occurredAt])
}

model Listing {                // niêm yết M&A
  id            String   @id @default(uuid())
  ventureId     String   @unique
  askPrice      Decimal  @db.Decimal(18,2)
  currency      String   @default("VND")
  ttmRevenue    Decimal? @db.Decimal(18,2)  // doanh thu 12 tháng — tính từ Transaction
  ttmProfitEst  Decimal? @db.Decimal(18,2)
  summary       String
  status        ListingStatus @default(PENDING_REVIEW) // PENDING_REVIEW|LIVE|IN_ESCROW|SOLD|WITHDRAWN
  createdAt     DateTime @default(now())
  offers        Offer[]
}

model Offer {
  id            String   @id @default(uuid())
  listingId     String
  buyerOrgId    String
  amount        Decimal  @db.Decimal(18,2)
  message       String?
  status        String   @default("open") // open|accepted|rejected|withdrawn
  createdAt     DateTime @default(now())
}

model Post {                   // feed cộng đồng MVP
  id            String   @id @default(uuid())
  orgId         String
  ventureId     String?
  content       String
  mediaUrls     Json?
  createdAt     DateTime @default(now())
  comments      Comment[]
  likes         Like[]
}
model Comment { id String @id @default(uuid()); postId String; orgId String; content String; createdAt DateTime @default(now()) }
model Like    { id String @id @default(uuid()); postId String; orgId String; @@unique([postId, orgId]) }

model AiUsage {                // đồng bộ từ LiteLLM/Langfuse mỗi giờ
  id            String   @id @default(uuid())
  orgId         String
  ventureId     String?
  model         String
  inputTokens   Int
  outputTokens  Int
  costUsd       Decimal  @db.Decimal(12,6)
  day           DateTime @db.Date
  @@index([orgId, day])
}

enum Plan { STARTER; GROWTH; SCALE }
enum OrgStatus { ACTIVE; SUSPENDED; CHURNED }
enum VentureStatus { DRAFT; PROVISIONING; LIVE; PAUSED; LISTED; SOLD }
enum InstallStatus { QUEUED; DEPLOYING; RUNNING; FAILED; REMOVED }
enum TxDirection { IN; OUT; PLATFORM_FEE }
enum ListingStatus { PENDING_REVIEW; LIVE; IN_ESCROW; SOLD; WITHDRAWN }
```

### 4.1 Chính sách RLS (Supabase)
- Mọi bảng nghiệp vụ: `org_id = auth.jwt() ->> 'org_id'` (custom claim gắn khi login).
- Bảng `Listing` (status = LIVE) và `Post`: cho phép SELECT public (đã ẩn số liệu nhạy cảm — chỉ hiện ttmRevenue dạng khoảng: "500tr–1 tỷ").
- Admin role (`role = platform_admin`) bypass qua service key, CHỈ dùng ở api-core, không bao giờ lộ ra frontend.

---

## PHẦN 5 — GÓI CƯỚC & LOGIC KINH DOANH

| | STARTER 299K/th | GROWTH 990K/th | SCALE 2.900K/th |
|---|---|---|---|
| Venture | 1 | 1 | 3 |
| App cài từ Store | Web + CRM | + AI Studio (Dify) + Automation | Tất cả + ưu tiên tài nguyên |
| Ngân sách AI kèm gói | 50K token-credit | 500K | 2M + mua thêm |
| Phí giao dịch Payments | 3% | 2% | 1.5% |
| Niêm yết Sàn M&A | — | Có (phí thành công 8%) | Có (phí thành công 5%) |

Logic bắt buộc:
1. `POST /subscriptions` thành công → kích hoạt Org → cho phép tạo Venture.
2. Cài app vượt quyền gói → trả 402 kèm CTA nâng gói.
3. AI budget: LiteLLM virtual key per-org với `max_budget` theo gói; vượt → 429, gợi ý mua thêm credit (tạo Transaction PLATFORM_FEE).
4. Venture đủ điều kiện niêm yết M&A khi: ≥90 ngày tuổi, ≥10 Transaction IN verified, ttmRevenue > 0.

---

## PHẦN 6 — ĐẶC TẢ API (api-core, NestJS)

> Claude Code: sinh OpenAPI từ decorator, xuất `docs/API.md`. Prefix `/v1`. Auth: Bearer JWT Supabase; guard `OrgGuard` inject `org_id` vào request context. Idempotency-Key header bắt buộc cho mọi POST có side-effect tiền/hạ tầng.

### 6.1 Auth & Org
```
POST /v1/orgs                     # tạo Org sau khi đăng ký Supabase (name, plan=STARTER)
GET  /v1/orgs/me
PATCH /v1/orgs/me
```

### 6.2 Ventures
```
POST /v1/ventures                 # {name, slug, industry} → status DRAFT
GET  /v1/ventures                 # list theo org
GET  /v1/ventures/:id
POST /v1/ventures/:id/launch      # DRAFT → PROVISIONING: enqueue job cài app mặc định theo gói
PATCH /v1/ventures/:id
GET  /v1/ventures/:id/revenue     # tổng hợp từ Transaction: mtd, ttm, chart 12 tháng
```

### 6.3 App Store & Provisioning
```
GET  /v1/store/apps                       # catalog (lọc theo plan)
POST /v1/ventures/:id/installs            # {catalogAppKey} → QUEUED, trả installId
GET  /v1/ventures/:id/installs
DELETE /v1/installs/:installId            # gỡ app (checkpoint xác nhận 2 bước)
GET  /v1/installs/:installId/logs         # proxy log build từ Coolify
```

### 6.4 Payments & Revenue
```
POST /v1/payments/checkout                # {ventureId?, type: subscription|ai_credit, plan?} → URL Stripe/PayOS
POST /v1/webhooks/stripe                  # svc-billing-webhooks (verify chữ ký)
POST /v1/webhooks/payos
GET  /v1/revenue/ledger?ventureId=&from=&to=
POST /v1/revenue/manual                   # ghi nhận doanh thu ngoài nền tảng (verified=false)
```

### 6.5 Sàn M&A
```
POST /v1/listings                         # tạo từ venture đủ điều kiện; ttmRevenue tự tính, khóa không cho sửa tay
GET  /v1/marketplace/listings             # public, số liệu dạng khoảng
GET  /v1/marketplace/listings/:id         # buyer đã đăng nhập + ký NDA click-wrap → xem số chi tiết
POST /v1/listings/:id/offers
POST /v1/offers/:id/accept                # → listing IN_ESCROW, tạo deal-room (thread + checklist), thông báo admin làm escrow thủ công
```

### 6.6 Community
```
GET/POST /v1/posts ; POST /v1/posts/:id/comments ; POST /v1/posts/:id/like
GET /v1/directory/ventures                # danh bạ public: LIVE ventures + badge revenueVerified
```

### 6.7 Admin (role platform_admin)
```
GET  /v1/admin/orgs ; PATCH /v1/admin/orgs/:id/suspend
GET  /v1/admin/ai-usage?groupBy=org
GET  /v1/admin/listings/pending ; POST /v1/admin/listings/:id/approve
POST /v1/admin/installs/:id/redeploy
```

---

## PHẦN 7 — PROVISIONING ENGINE (svc-provision)

Luồng chuẩn khi Solo CEO bấm "Khởi chạy doanh nghiệp":

```
api-core: POST /ventures/:id/launch
  └─> BullMQ queue "provision" job {ventureId, apps:[...theo gói]}
        └─> svc-provision worker:
            1. Gọi Coolify API: tạo Project "vt-{slug}" trên VPS-TENANT ít tải nhất
            2. Với mỗi app: POST /api/v1/applications (docker-compose từ
               infra/coolify/templates/{key}.yml, inject env: domain, secrets,
               LITELLM_BASE_URL + virtual key của org)
            3. Poll trạng thái deploy (timeout 10 phút, retry 2 lần)
            4. Cập nhật AppInstall.status=RUNNING, url
            5. Tất cả RUNNING → Venture.status=LIVE, gửi email + thông báo in-app
            Thất bại → FAILED + đẩy cảnh báo kênh admin (webhook n8n nội bộ RAI)
```

Quy tắc:
- Mỗi tenant một Coolify Project riêng — cô lập network, không share container.
- Subdomain: `{slug}.app.soloceo.vn` (site chính), `{slug}-ai.app...` (Dify), `{slug}-flow.app...` (Activepieces).
- Secrets sinh ngẫu nhiên 32 bytes, lưu Vault đơn giản = bảng `secrets` mã hóa AES-256-GCM bằng MASTER_KEY (env của api-core), không log.
- Chọn node: query Coolify metrics, node nào RAM used <70% thì nhận tenant mới; hết chỗ → job giữ QUEUED + cảnh báo admin thêm VPS.

### 7.1 Template App Store tối thiểu cho MVP (infra/coolify/templates/)
| key | Nguồn | Ghi chú |
|-----|-------|---------|
| `site-nextjs` | Template Next.js landing + blog của RAI | Trang bán hàng của venture, có form lead → CRM |
| `crm-twenty` | Twenty CRM (open source) | CRM gọn cho solo |
| `dify` | langgenius/dify compose chuẩn | 1 instance/tenant; model provider trỏ về LiteLLM |
| `activepieces` | activepieces CE | Automation per-tenant |
| `commerce-medusa` | Medusa.js | Bán hàng quốc tế (GROWTH+) |

---

## PHẦN 8 — LLM GATEWAY & ĐO CHI PHÍ

### 8.1 infra/litellm/config.yaml (khung)
```yaml
model_list:
  - model_name: soloceo-fast        # tác vụ rẻ: phân loại, tóm tắt
    litellm_params: { model: "anthropic/claude-haiku-4-5", api_key: "os.environ/ANTHROPIC_API_KEY" }
  - model_name: soloceo-smart       # tác vụ chính: agent, viết nội dung
    litellm_params: { model: "anthropic/claude-sonnet-4-6", api_key: "os.environ/ANTHROPIC_API_KEY" }
general_settings:
  master_key: "os.environ/LITELLM_MASTER_KEY"
  database_url: "os.environ/LITELLM_DB_URL"      # bật virtual keys + budget
litellm_settings:
  success_callback: ["langfuse"]                  # trace + cost về Langfuse
```

### 8.2 Quy trình
- Khi tạo Org: api-core gọi LiteLLM `/key/generate` → virtual key gắn `metadata.org_id`, `max_budget` theo gói, lưu vào secrets.
- Dify của tenant cấu hình OpenAI-compatible endpoint = `https://llm.soloceo.vn` + virtual key đó → mọi chi phí tự quy về đúng org.
- Cron mỗi giờ: đọc usage LiteLLM → ghi `AiUsage` → dashboard admin + cảnh báo 80%/100% budget.

---

## PHẦN 9 — PROMPT THEO GIAI ĐOẠN CHO CLAUDE CODE

> Dán lần lượt từng prompt. Mỗi prompt kết thúc bằng DoD — yêu cầu Claude Code tự chạy kiểm tra và báo cáo trước khi sang giai đoạn kế.

### GIAI ĐOẠN 0 — Khởi tạo monorepo (ngày 1–2)
```
Đọc CLAUDE.md. Khởi tạo monorepo pnpm + turborepo đúng cấu trúc Phần 3.
Tạo apps/web-community, apps/web-platform (Next.js 15, TS, Tailwind, shadcn/ui,
next-intl với vi mặc định), apps/api-core (NestJS 10, Swagger, config module,
health check /v1/health), packages/db (Prisma + schema Phần 4, migration đầu tiên),
packages/shared (types sinh từ Prisma, constants gói cước Phần 5).
Viết infra/env/.env.example đầy đủ mọi biến xuất hiện trong CLAUDE.md.
DoD: pnpm build pass toàn repo; pnpm dev chạy được 3 app; prisma migrate dev
tạo schema sạch trên Postgres local; /v1/health trả 200.
```

### GIAI ĐOẠN 1 — Auth, Org, Venture (ngày 3–7)
```
Tích hợp Supabase Auth (email OTP + Google) vào cả 2 web app.
api-core: AuthGuard verify JWT Supabase, custom claim org_id; module orgs,
ventures đúng đặc tả 6.1–6.2 (trừ launch). RLS policies SQL trong packages/db/rls/.
web-community: luồng đăng ký → tạo Org → wizard tạo Venture (3 bước: tên/slug,
ngành, mô tả) → trang hồ sơ venture public.
DoD: e2e (Playwright) đăng ký → tạo venture → hồ sơ hiển thị; user A không đọc
được venture của user B (test RLS); tất cả UI tiếng Việt.
```

### GIAI ĐOẠN 2 — OS Shell (ngày 8–14)
```
web-platform: dựng desktop shell — màn hình đăng nhập kiểu boot, desktop có
wallpaper, dock dưới đáy (icon: Tổng quan, App Store, AI Studio, Automation,
Doanh thu, Cộng đồng, Sàn M&A, Cài đặt), cửa sổ kéo thả/resize/minimize bằng
react-rnd, taskbar trạng thái. Mỗi app là 1 window component lazy-load.
Glassmorphism theo design token trong packages/ui (tái dùng phong cách
raiholdings.vn: nền tối, blur 20px, radius 16px, accent #7C5CFF).
Cửa sổ "Tổng quan": card doanh thu tháng, trạng thái app, chi phí AI (mock data).
DoD: mở 3 cửa sổ song song mượt ở 1366px; trạng thái vị trí cửa sổ lưu
localStorage; Lighthouse performance ≥80.
```

### GIAI ĐOẠN 3 — App Store + Provisioning (ngày 15–28) ⭐ xương sống
```
Dựng svc-provision (BullMQ + Redis) đúng Phần 7. Viết CoolifyClient (REST,
token env COOLIFY_API_TOKEN) với: createProject, createComposeApp, deploy,
getStatus, getLogs, delete. Viết 5 template Phần 7.1 vào infra/coolify/templates
(mỗi template là docker-compose + file env.mustache).
api-core: endpoints 6.3 + POST /ventures/:id/launch; SSE đẩy tiến trình deploy
về cửa sổ App Store (progress từng bước như boot terminal).
Cửa sổ App Store trong OS Shell: grid app, nút Cài đặt, màn hình tiến trình.
DoD: từ UI bấm Khởi chạy → sau <5 phút {slug}.app.soloceo.vn và
{slug}-flow.app.soloceo.vn sống thật trên VPS-TENANT-01 với SSL; gỡ app sạch
resource trên Coolify; job fail có retry và ghi log.
```

### GIAI ĐOẠN 4 — LLM Gateway + AI Studio (ngày 29–38)
```
Deploy LiteLLM + Langfuse vào docker-compose.core.yml theo Phần 8.
api-core: tạo virtual key khi Org kích hoạt; cron đồng bộ AiUsage; endpoint
GET /v1/ai/usage cho cửa sổ Tổng quan.
Template dify: pre-config model provider OpenAI-compatible trỏ LiteLLM, seed
sẵn 2 app mẫu tiếng Việt: (1) "Trợ lý bán hàng" — chatbot RAG đọc tài liệu
sản phẩm tenant upload; (2) "Trợ lý nội dung" — sinh bài đăng bán hàng.
Cửa sổ AI Studio: iframe/redirect SSO sang Dify instance của tenant + hướng dẫn.
DoD: tenant pilot chat được với Trợ lý bán hàng trên domain riêng; Langfuse
hiện trace kèm org_id; đặt budget 1 USD rồi vượt → nhận 429 đúng thiết kế.
```

### GIAI ĐOẠN 5 — Payments + Revenue Ledger (ngày 39–52) ⭐ đường tiền
```
svc-billing-webhooks: Stripe (checkout + subscription + webhook verify chữ ký)
và PayOS (QR chuyển khoản VN + webhook). Chuẩn hóa mọi sự kiện tiền về
Transaction (idempotent theo providerRef — viết test kỹ phần này).
Luồng subscription Phần 5 (kích hoạt/tạm ngưng Org theo trạng thái thanh toán).
Payments cho VENTURE: mỗi venture tạo payment link bán hàng của chính họ
(Stripe Connect Standard cho quốc tế; PayOS sub-account cho VN); tiền về
venture, nền tảng thu phí % theo gói (Transaction PLATFORM_FEE).
Cửa sổ Doanh thu: bảng ledger, chart 12 tháng, nút tạo payment link, badge
"Doanh thu đã xác thực" khi 100% từ webhook.
DoD: thanh toán test-mode Stripe + sandbox PayOS chảy đúng vào ledger; gửi lại
webhook 2 lần không tạo bản ghi trùng; ttmRevenue của venture tính đúng.
```

### GIAI ĐOẠN 6 — Community + Sàn M&A + Admin (ngày 53–70)
```
Feed cộng đồng (6.6) trên web-community + cửa sổ Cộng đồng trong shell.
Sàn M&A theo 6.5: điều kiện niêm yết Phần 5 mục 4; trang public ẩn số chi
tiết (hiện khoảng doanh thu); NDA click-wrap trước khi xem chi tiết; deal-room
khi offer được chấp nhận (thread + checklist chuyển giao: domain, Coolify
project transfer giữa 2 org, bàn giao secrets — có checkpoint admin phê duyệt
từng bước).
Admin Console (route /admin trong web-platform, role platform_admin): danh
sách org/tenant, usage AI, duyệt listing, redeploy, suspend.
DoD: kịch bản đầy đủ: venture A đủ điều kiện → niêm yết → admin duyệt → buyer
ký NDA xem số → offer → accept → deal-room mở → admin chuyển org_id sở hữu
venture + Coolify project sang buyer thành công trên môi trường staging.
```

### GIAI ĐOẠN 7 — Hardening & Go-live (ngày 71–90)
```
- Rate limit (100 req/phút/org), helmet, CORS whitelist, audit log bảng
  admin_actions.
- Backup: pg_dump hằng đêm + Coolify S3 backup; script khôi phục thử thật
  1 lần (ghi kết quả vào RUNBOOK).
- Uptime Kuma monitor mọi endpoint + tenant mẫu; cảnh báo về Telegram admin.
- Trang trạng thái status.soloceo.vn.
- Rà license: xác nhận ADR-001 (Dify), ADR-002 (n8n chỉ nội bộ), ADR-003
  (Activepieces CE), ghi rõ vào docs/ADR.
- Seed production: 3 gói cước, 5 catalog app, org demo.
DoD: checklist go-live Phần 10.4 pass 100%; load test 50 org ảo provisioning
tuần tự không nghẽn; RUNBOOK.md hoàn chỉnh.
```

---

## PHẦN 10 — RUNBOOK VẬN HÀNH (đưa vào chạy thật)

### 10.1 Chuẩn bị hạ tầng (làm tay 1 lần, ~nửa ngày)
1. Mua 2 VPS (Phần 2.2), Ubuntu 24.04, đặt hostname `core-01`, `tenant-01`.
2. Trỏ DNS Cloudflare theo Phần 2.2 (proxy OFF cho *.app.soloceo.vn lúc cấp SSL đầu, bật lại sau).
3. Cài Coolify trên core-01: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash` → thêm tenant-01 làm remote server qua SSH key.
4. Tạo API token Coolify (quyền deploy) → `COOLIFY_API_TOKEN`.
5. Trên Coolify (core-01) deploy stack lõi từ `infra/docker-compose.core.yml`: Supabase, Redis, LiteLLM, Langfuse, api-core, web-community, web-platform, svc-provision, svc-billing-webhooks, Uptime Kuma.
6. Điền secrets thật theo `.env.example`: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` + webhook secret, `PAYOS_*`, `MASTER_KEY`, `LITELLM_MASTER_KEY`, SMTP (gợi ý: Resend).
7. Chạy `prisma migrate deploy` + seed.

### 10.2 Vận hành hằng ngày (15 phút/ngày)
- Sáng: xem Uptime Kuma + kênh Telegram cảnh báo; xem hàng đợi provision (Bull Board `/admin/queues`).
- Kiểm tra Langfuse: top 5 org chi phí AI cao nhất, bất thường → liên hệ.
- Duyệt listing M&A chờ (SLA 24h).
- Thứ 2 hằng tuần: báo cáo tự động (n8n nội bộ RAI) — MRR, tenant mới, churn, chi phí hạ tầng + AI, gửi về nhóm điều hành.

### 10.3 Sự cố thường gặp
| Triệu chứng | Xử lý |
|---|---|
| Provision treo QUEUED | Kiểm tra RAM tenant-01 (>70% → thêm VPS, add vào Coolify, svc-provision tự nhận node mới) |
| Tenant Dify không gọi được model | Kiểm virtual key còn budget? LiteLLM /health? Rotate key qua Admin Console |
| Webhook Stripe fail | Xem svc-billing-webhooks logs; replay từ Stripe dashboard (idempotent nên an toàn) |
| SSL không cấp cho subdomain mới | Tắt Cloudflare proxy domain đó, chờ Let's Encrypt, bật lại |
| Muốn suspend tenant xấu | Admin Console → Suspend: dừng container + khóa login, giữ dữ liệu 30 ngày |

### 10.4 Checklist Go-live
- [ ] 2 VPS cài xong, backup đêm chạy và ĐÃ TEST KHÔI PHỤC
- [ ] Thanh toán thật: 1 giao dịch Stripe live + 1 PayOS live vào ledger đúng
- [ ] Provision 3 tenant thật liên tiếp <5 phút/tenant
- [ ] Budget AI chặn đúng khi vượt; cảnh báo 80% gửi email
- [ ] RLS test pass (org A không đọc org B) trên production
- [ ] Uptime Kuma + Telegram hoạt động; status page public
- [ ] ADR license ký duyệt (đặc biệt ADR-001 Dify trước khi thu phí AI Studio)
- [ ] Điều khoản dịch vụ + chính sách dữ liệu tiếng Việt đăng trên soloceo.vn
- [ ] 20 Solo CEO pilot có tài khoản, lịch onboarding tuần đầu

### 10.5 Chi phí vận hành ước tính tháng đầu
| Khoản | Ước tính |
|---|---|
| 2 VPS (16GB + 32GB) | ~2,5–3,5 triệu VND |
| Domain + Cloudflare | ~200K |
| API LLM (20 tenant pilot, có budget cap) | ~2–6 triệu (biến thiên — theo dõi Langfuse tuần đầu) |
| Stripe/PayOS | theo % giao dịch |
| **Tổng cố định** | **~5–10 triệu VND/tháng** cho pilot |

---

## PHẦN 11 — BIẾN MÔI TRƯỜNG CHUẨN (.env.example — trích)
```
# Core
DATABASE_URL=postgres://...
REDIS_URL=redis://...
MASTER_KEY=                      # AES-256 cho bảng secrets
JWT_SUPABASE_SECRET=
PUBLIC_APP_DOMAIN=app.soloceo.vn

# Coolify
COOLIFY_BASE_URL=https://coolify.soloceo.internal
COOLIFY_API_TOKEN=

# LLM
LITELLM_BASE_URL=https://llm.soloceo.vn
LITELLM_MASTER_KEY=
ANTHROPIC_API_KEY=
LANGFUSE_PUBLIC_KEY= / LANGFUSE_SECRET_KEY=

# Payments
STRIPE_SECRET_KEY= / STRIPE_WEBHOOK_SECRET=
PAYOS_CLIENT_ID= / PAYOS_API_KEY= / PAYOS_CHECKSUM_KEY=

# Email
RESEND_API_KEY=
```

---

## PHẦN 12 — RỦI RO & QUYẾT ĐỊNH MỞ (Claude Code phải tôn trọng)
1. **ADR-001 (Dify license):** MVP chạy mô hình 1-instance/tenant. Trước khi thu phí AI Studio ở quy mô lớn, phải rà điều khoản multi-tenant của Dify hoặc chuyển phương án (Flowise/Langflow) — không tự ý quyết.
2. **ADR-002 (n8n):** tuyệt đối không đóng gói n8n bán cho tenant. Chỉ Activepieces CE cho khách; n8n dùng nội bộ RAI.
3. **ADR-003 (Escrow M&A):** MVP escrow thủ công bởi admin RAI + hợp đồng giấy. Không tự động hóa dòng tiền M&A cho đến khi có tư vấn pháp lý.
4. **Dữ liệu cá nhân:** tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân — có consent khi đăng ký, chức năng xóa tài khoản.
5. Mọi thay đổi schema Transaction/Listing phải có migration reversible + backup trước khi chạy.

— HẾT TÀI LIỆU —
