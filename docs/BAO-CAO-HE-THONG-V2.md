# BÁO CÁO HỆ THỐNG SoloCEO.vn — SoloCEO OS v2

**Ngày:** 10/07/2026 · **Nhánh production:** `soloceo-mvp` · **HEAD:** `ca804373`
**Trạng thái:** Cut-over v2 lên production đã hoàn tất. Toàn hệ thống LIVE.
**Mục đích tài liệu:** bàn giao hiện trạng đầy đủ (nền tảng + luồng + gap) để viết tiếp code/tài liệu.

> Nguồn sự thật: quét trực tiếp 3 VPS + repo ngày 10/07/2026. Không suy đoán.
> Nghiên cứu chi tiết từng nền tảng: `research/R0…R7`. Quyết định kiến trúc: `docs/ADR/`.
> ⚖️ **Luật vận hành: [`docs/GOVERNANCE.md`](GOVERNANCE.md)** — thứ bậc quyền, 3 mức hành động A/B/C, quy trình thay đổi chuẩn, HITL.
> Mọi thay đổi **mức C** (đường tiền · production không đảo ngược · secret · cổng LiteLLM · DNS) **phải được chủ dự án duyệt bằng văn bản TRƯỚC khi làm**.

---

## 1. TẦM NHÌN v2 (một câu)

> **DeerFlow nghĩ — Sandbox làm — FlowGram cho CEO thấy — Midscene chạm web — Dolphin đọc giấy — arishem gác luật — godlp che dữ liệu — g3 canh cửa ra.**

SoloCEO OS v2 = **DeerFlow (lõi điều phối) + 7 nền tảng vệ tinh**. Tất cả MIT/Apache-2.0.
Nguyên tắc bất biến: mọi LLM call qua **LiteLLM**; multi-tenant theo **`org_id`**; **HITL 2 tầng** cho hành động không đảo ngược; trace Langfuse tag `org_id`; tiếng Việt mặc định.

---

## 2. HẠ TẦNG VẬT LÝ (3 VPS Contabo, Ubuntu 24.04)

| Node | IP | Cấu hình | Vai trò |
|---|---|---|---|
| **core-01** | `194.233.72.150` | ~12GB RAM (⚠️ chật) | Coolify controller, api-core, web-community, svc-provision, svc-billing-webhooks, **svc-rules-engine**, **svc-dlp**, LiteLLM, Supabase, Postgres app, Redis |
| **tenant-01** | `62.146.235.177` | 32GB | WoWonder, PlayTube, Grupo, registry, commerce-starter tenant, *(+ dự án riêng OpenClawOS)* |
| **tenant-02** | `194.233.85.255` | 18 vCPU / 94GB (VDS) | **DeerFlow** (frontend/gateway/nginx/redis). Còn dư rất nhiều → nơi đặt AIO Sandbox + g3 |

SSH: `ssh -i ~/.ssh/soloceo_deploy -o IdentitiesOnly=yes root@<IP>`

### 2.1 Container thực tế đang chạy

**core-01:**
- Coolify: `coolify`, `coolify-db`, `coolify-proxy` (Traefik), `coolify-redis`, `coolify-realtime`, `coolify-sentinel`
- App (tên hash = UUID Coolify):
  - `mosccddhkscicwdjapqlmuaw` → **api-core** (:4000, api.soloceo.vn)
  - `fxvxy31adaqtqffh8yby5t72` → **web-community** (:3000, app.soloceo.vn)
  - `og7ovjqwlx2x5vjw2y5u6d8z` → **svc-provision** (:9999)
  - `hct1ati7krcprt18qvyfx8zu` → **svc-billing-webhooks** (:4200, pay.soloceo.vn) — *đường tiền, KHÔNG đụng*
  - `pqkhgawz5qjllgzkuj5ssnuh` → **web-platform (ĐÃ TẮT — v2 loại bỏ)**
- Dữ liệu: `o7amzfd0llvx4r4pntvlc4a9` = **Postgres app** (db/user `soloceo`) · `abqai3w1luxqq9tbzu9rgxcm` = Redis app
- LLM: `litellm-in0rcz…` (⚠️ ngốn ~3.9GB RAM) + `postgres-in0rcz…` (DB LiteLLM) + `redis-in0rcz…`
- Supabase (auth/storage): `supabase-auth`, `supabase-db`, `supabase-kong`, `supabase-rest`, `supabase-storage`, `supabase-studio`, …
- **v2 mới:** `svc-rules-engine`, `svc-dlp` (network `coolify`)

**tenant-01:** `wowonder-*`, `playtube-*`, `grupo-*`, `soloceo-registry` (registry :5000), `s10dbc12f56ognj08tc6n1t2` (commerce-starter của venture demo), `urtbzbux3oalqt2pbzqdz81k` *(chưa định danh — cần xác minh)*, + cụm `openclawos-*` (**dự án ĐỘC LẬP**, dùng chung node).

**tenant-02:** `deer-flow-frontend`, `deer-flow-gateway`, `deer-flow-nginx`, `deer-flow-redis`. Deploy thủ công tại `/opt/deerflow` (Makefile + `scripts/deploy.sh` + `docker/docker-compose.yaml`).
*(ClawHub + Convex đã TẮT.)*

### 2.2 Lưu ý vận hành quan trọng
- **core-01 kiệt RAM.** Đã phải: tắt web-platform + `docker builder prune -af` (60GB) + **thêm `/swapfile2` 8GB** (đã vào `/etc/fstab`). Build api-core trước đó fail `exit 255` ở bước *exporting layers*.
- Backup DB app trước migrate: `/root/backup-soloceo-APPDB-v2-2026-07-10-1422.sql.gz`.
  ⚠️ DB app là container `o7amzfd0…` (db `soloceo`), **KHÔNG phải** `supabase-db`.

---

## 3. DNS (Cloudflare, tất cả DNS-only)

| Record | → IP | Phục vụ | Trạng thái |
|---|---|---|---|
| `soloceo.vn`, `www` | 194.233.85.255 | **DeerFlow workspace** | ✅ GIỮ |
| `app` | 194.233.72.150 | web-community | ✅ GIỮ |
| `api` | 194.233.72.150 | api-core (`/v1`) | ✅ GIỮ |
| `auth` | 194.233.72.150 | Supabase Auth | ✅ GIỮ |
| `llm` | 194.233.72.150 | LiteLLM | ✅ GIỮ |
| `pay` | 194.233.72.150 | svc-billing-webhooks | ✅ GIỮ |
| `coolify` | 194.233.72.150 | Coolify | ✅ GIỮ |
| `*.app` | 62.146.235.177 | app tenant + commerce-starter | ✅ GIỮ |
| `my` / `video` / `groupchat` | 62.146.235.177 | WoWonder / PlayTube / Grupo | ✅ GIỮ |
| `platform` | 194.233.72.150 | OS Shell 3D | 🗑️ **XOÁ** (container đã tắt) |
| `hub`, `convex-api`, `convex-site` | 194.233.85.255 | ClawHub + Convex | 🗑️ **XOÁ** (đã tắt) |
| `trace` | — | Langfuse | ➕ **THÊM** khi bật observability |

**Không cần DNS public** cho `svc-rules-engine`, `svc-dlp`, `g3proxy` — chúng nói chuyện qua Docker network `coolify`.

---

## 4. MONOREPO (pnpm + turborepo, TypeScript strict)

```
soloceo/
├── apps/
│   ├── api-core/          NestJS 10 — xương sống nghiệp vụ (18 module)
│   ├── web-community/     Next.js 15 — app.soloceo.vn
│   └── web-platform/      ⛔ OS Shell 3D — ĐÃ GỠ khỏi build (giữ file)
├── services/
│   ├── svc-provision/     BullMQ worker → Coolify API (cấp app per-venture)
│   └── svc-billing-webhooks/  Stripe + PayOS → Transaction (đường tiền)
├── packages/{db,shared,ui}    Prisma 6 · constants/types · shadcn
├── platform/                  ⭐ 8 nền tảng v2
│   ├── rules/     svc-rules-engine (Go) + arishem_guardrail.py (DeerFlow)
│   ├── dlp/       svc-dlp (Go) + rules-vn.yaml
│   ├── sandbox/   provider.py (SoloAioSandboxProvider cho DeerFlow)
│   ├── egress/    Dockerfile g3proxy + g3proxy.yaml
│   ├── deerflow/  config lõi
│   └── docker-compose.v2.yml
├── mcp-servers/{dolphin-docs, rules-engine}   MCP contract cố định
├── agents/        lead-agent + 6 sub-agent (kinh-doanh, marketing, noi-dung,
│                  ke-toan, van-hanh, nghien-cuu)
├── skills/vietnam-business/SKILL.md
├── channels/zalo/
├── templates/commerce-starter/   Next.js web bán hàng (image registry)
├── infra/         litellm, coolify/templates, patches/{deerflow,claw3d,openclaw},
│                  clawhub-selfhost, env/.env.example
├── research/      R0…R7 + PHA1/PHA2/PHA3 báo cáo
└── docs/ADR/      ADR-001…ADR-007
```

### 4.1 api-core — 18 module
`Prisma, Auth, Health, Orgs, Ventures, Directory, Store, Domains, Concierge, Oidc, Ai, Payments, Community, Marketplace, Admin` + **v2: `Rules`, `Approvals`, `Channels`**

---

## 5. TRẠNG THÁI 8 NỀN TẢNG v2

| # | Nền tảng | Vai trò | Trạng thái | Ghi chú |
|---|---|---|---|---|
| 0 | **DeerFlow 2.0** | Lõi điều phối (lead agent + sub-agents) | 🟢 **LIVE** (tenant-02) | Chưa nạp guardrail/sub-agents/AIO |
| 1 | **AIO Sandbox** | Máy ảo thực thi per-tenant | 🟡 Code sẵn (`platform/sandbox/provider.py`) | **Chưa deploy container** |
| 2 | **FlowGram.ai** | Canvas quy trình | 🟡 Thiết kế + 3 node (R3) | **Chưa cài npm** |
| 3 | **Midscene.js** | Thao tác web NNTN (chế độ Assist) | 🟡 Ma trận pháp lý xong (R4) | **Chưa cài** |
| 4 | **Dolphin** | OCR giấy tờ VN → JSON | 🟡 MCP server + extractor VN sẵn | **Chưa có GPU/model** |
| 5 | **arishem** | Rule engine gác HITL | 🟢 **LIVE** `svc-rules-engine` | Evaluator native; arishem lib là seam |
| 6 | **godlp** | Mask PII trước khi rời hệ thống | 🟢 **LIVE** `svc-dlp` | ⚠️ **Chưa cắm hook vào LiteLLM** |
| 7 | **g3** | Egress proxy allowlist | 🟡 Dockerfile + config sẵn | **Chưa deploy** |

**Nền tảng phụ trợ (giữ, đã mua license):** WoWonder (`my`), PlayTube (`video`), Grupo (`groupchat`).

---

## 6. LUỒNG NGHIỆP VỤ (end-to-end)

### 6.1 Luồng người dùng chính
```
soloceo.vn/workspace  (DeerFlow — chat AI)
  ├─ sidebar: Trò chuyện · Trợ lý AI · Việc theo lịch
  ├─ sidebar v2 MỚI: Tạo doanh nghiệp → iframe app.soloceo.vn/bat-dau
  │                  Gói cước        → iframe app.soloceo.vn/goi
  │                  Danh bạ          → iframe app.soloceo.vn/danh-ba
  └─ sidebar: Cộng đồng(WoWonder) · Video(PlayTube) · Nhóm chat(Grupo)

app.soloceo.vn (web-community) → api.soloceo.vn/v1 (api-core) → Postgres `soloceo`
```

### 6.2 Luồng tạo doanh nghiệp (provisioning)
```
POST /v1/ventures            → Venture(DRAFT)
POST /v1/ventures/:id/launch → DEFAULT_APPS_BY_PLAN = ["commerce-starter"]   ← v2 (trước là claw3d+openclaw)
   └─ BullMQ "provision" → svc-provision worker
        └─ Coolify API: tạo project vt-{slug}, deploy image từ registry :5000
             └─ {slug}-shop.app.soloceo.vn (SSL Traefik)
   → AppInstall RUNNING → Venture LIVE
```

### 6.3 ⭐ Luồng HITL 2 tầng (arishem gate) — **ĐÃ VERIFY TRÊN PRODUCTION**
```
Agent/DeerFlow muốn gọi tool nhạy cảm
        │
        ▼
ArishemGuardrailProvider (DeerFlow)  ──HTTP──►  svc-rules-engine  /evaluate
   hoặc SensitiveActionGuard (api-core)             │  đọc bảng Rule (11 rule)
                                                    │  fail-closed nếu lỗi
        ┌───────────────────────────────────────────┘
        ▼
   ALLOW ────────────────────────────────► thực thi ngay
   DENY  ────────────────────────────────► chặn + ruleId
   REQUIRE_APPROVAL ──► POST /v1/approvals/internal (X-Internal-Token)
                          └─► ApprovalRequest (PENDING, tier 1|2)
                                └─► CEO duyệt: POST /v1/approvals/:id/approve
                                      └─► resume DeerFlow (POST /api/threads/{id}/state)
```
**Kết quả test thật (production):**

| Đầu vào | Quyết định |
|---|---|
| `spend_money`, amount = 10.000.000 | `REQUIRE_APPROVAL` **tier 2** |
| `spend_money`, amount = 100.000 | `REQUIRE_APPROVAL` **tier 1** |
| `delete_data`, count = 500 | **`DENY`** |
| `read_report` | `ALLOW` (`not_sensitive`) |

### 6.4 Luồng DLP (godlp) — service LIVE, hook CHƯA cắm
```
prompt ──► [LiteLLM pre-call hook]  ⚠️ CHƯA NỐI ──► svc-dlp POST /mask ──► prompt đã mask ──► model
                                                       └─ findings {type,count} → Langfuse (KHÔNG log giá trị PII)
```
Test thật `svc-dlp`:
`"CCCD 001199012345, SĐT 0987654321, email a@b.vn"` → `"CCCD ********2345, SĐT *******321, email *@*.**"`
findings: `cccd_12:1, phone_vn:1, email:1`

### 6.5 Luồng tiền (KHÔNG ĐỤNG)
```
Stripe / PayOS webhook → svc-billing-webhooks (pay.soloceo.vn)
   → chuẩn hoá → Transaction (idempotent theo providerRef)
   → Revenue Ledger → badge "Doanh thu đã xác thực" → điều kiện niêm yết Sàn M&A
```

---

## 7. DỮ LIỆU (Prisma / Postgres `soloceo`)

### 7.1 Bảng v2 mới (đã migrate)
| Bảng | Vai trò |
|---|---|
| `Rule` | Luật arishem: `actionType`, `priority`, `conditionJson`(jsonb), `decision`(ALLOW/DENY/REQUIRE_APPROVAL), `approvalTier`, `orgId` (null = toàn nền tảng) |
| `ApprovalRequest` | Hàng đợi HITL: `status`(PENDING/APPROVED/REJECTED/EXPIRED), `tier`, `threadId`, `runId`, `payloadJson` |
| `RuleDecisionLog` | Audit mọi phán quyết (context đã redact PII) |
| `EgressAllowlist` | Domain cho phép per-org (g3proxy) |
| `ChannelBinding` | Map `oa_id` Zalo/Telegram → org/venture |

### 7.2 Migration đã áp
```
20260710120000_installstatus_add_archived        (enum InstallStatus += ARCHIVED)
20260710120100_archive_v1_claw3d_openclaw        (CatalogApp active=false; AppInstall→ARCHIVED)
20260710130000_v2_rules_approvals_egress_channel (5 bảng + 2 enum)
```

### 7.3 Trạng thái dữ liệu sau cut-over
- `CatalogApp`: `commerce-starter=true`, `erpnext=true`; **`claw3d=false`, `openclaw=false`** (archive, không xoá cứng)
- `AppInstall`: **6 ARCHIVED** (claw3d/openclaw), 1 RUNNING (commerce-starter), 1 FAILED
- `Rule`: **11 rule nền tảng** đã seed
- Danh mục `actionType` nhạy cảm: `spend_money, send_bulk_email, submit_application, sign_document, publish_public, delete_data, deploy_infra, transfer_ownership, export_pii`

---

## 8. API (api-core, prefix `/v1`)

**Đã kiểm chứng live:** `GET /v1/health` → 200 · `GET /v1/approvals/pending` → 401 · `GET /v1/admin/rules` → 401

| Nhóm | Endpoint chính |
|---|---|
| Org/Venture | `POST /orgs`, `GET /orgs/me`, `POST /ventures`, `POST /ventures/:id/launch`, `GET /ventures/:id/revenue` |
| Store | `GET /store/apps`, `POST /ventures/:id/installs`, `GET /installs/:id/logs` |
| Payments | `POST /payments/checkout`, `POST /webhooks/{stripe,payos}`, `GET /revenue/ledger` |
| M&A | `POST /listings`, `GET /marketplace/listings`, `POST /listings/:id/offers` |
| Community | `GET/POST /posts`, `GET /directory/ventures` |
| **v2 Approvals** | `GET /approvals/pending`, `POST /approvals/:id/approve`, `POST /approvals/:id/reject`, **`POST /approvals/internal`** *(server-to-server, header `X-Internal-Token`)* |
| **v2 Rules** | `GET/POST/PATCH /admin/rules` |
| **v2 Channels** | `POST /channels/zalo/webhook/:oaId` (rawBody + verify `X-ZEvent-Signature`) |
| ⛔ Đã `@deprecated` | `GET /ventures/:id/openclaw-access` |

### 8.1 Contract nội bộ
```
svc-rules-engine  POST /evaluate  {action, context} → {decision, ruleId, tier, reason}
svc-dlp           POST /mask      {text}            → {masked, findings:[{type,count}]}
mcp dolphin-docs  parse_document(image_base64, doc_type) → {fields, confidence, engine, warnings}
```

---

## 9. PIPELINE DEPLOY

- **Coolify build từ GitHub** `raiholdings/soloceo`, branch **`soloceo-mvp`**, Dockerfile trong repo.
- `apps/api-core/Dockerfile` CMD tự chạy **`prisma migrate deploy`** rồi mới `node dist/main.js` → migration áp tự động khi deploy.
- Trigger tay: `GET /api/v1/deploy?uuid=<app_uuid>` (Coolify API).
  UUID: api-core `mosccddhkscicwdjapqlmuaw` · web-community `fxvxy31adaqtqffh8yby5t72` · svc-provision `og7ovjqwlx2x5vjw2y5u6d8z`
- **svc-rules-engine / svc-dlp**: build tay trên core-01 tại `/opt/soloceo-v2/{rules,dlp}` → `docker run --network coolify`.
  ⚠️ `go.mod` **không có `go.sum`** → Dockerfile phải dùng `go mod tidy` (không phải `go mod download`).
- **DeerFlow**: `/opt/deerflow` trên tenant-02. Sửa `frontend/src` → `docker compose --env-file .env -p deer-flow -f docker/docker-compose.yaml build frontend && … up -d frontend`.
  Env bắt buộc export: `DEER_FLOW_HOME/REPO_ROOT/CONFIG_PATH/EXTENSIONS_CONFIG_PATH`, `BETTER_AUTH_SECRET`, `DEER_FLOW_INTERNAL_AUTH_TOKEN` (đọc từ `$DEER_FLOW_HOME/.better-auth-secret`, `.internal-auth-token`).
  Backup gần nhất: `/opt/deerflow-backup-2026-07-10-184807/`.

---

## 10. ĐÃ LÀM ✅ / CHƯA LÀM ❌

### ✅ Đã hoàn tất (live production)
1. Dọn tàn dư v1 (§C của `research/R0`): gỡ `web-platform` khỏi build; `@deprecated` `openclaw-access` + `getOrCreateOpenclawToken`; comment `APP_CONFIGS.claw3d/openclaw` (giữ `commerce-starter`); dọn hardcode URL; DB ARCHIVE (không xoá cứng).
2. Nghiên cứu R1–R7 (7 báo cáo có nguồn) + 7 ADR.
3. Schema + migration v2 (5 bảng, 2 enum) — áp production, có backup.
4. `svc-rules-engine` + `svc-dlp` **LIVE + verify** (4/4 test gate, mask PII VN).
5. 11 rule HITL nền tảng đã seed.
6. `api-core`: module `Rules`/`Approvals`/`Channels` + endpoint `POST /approvals/internal`.
7. Provider Python cho DeerFlow: `SoloAioSandboxProvider`, `ArishemGuardrailProvider` (code sẵn, **chưa nạp**).
8. MCP contract `dolphin-docs` + `rules-engine`; 6 sub-agent playbook; `skills/vietnam-business`.
9. Sidebar DeerFlow: thêm **Tạo doanh nghiệp / Gói cước / Danh bạ**.
10. Tắt sạch v1: `web-platform`, 6 app claw3d/openclaw per-venture, ClawHub + Convex.

### ❌ Chưa làm (backlog có thứ tự an toàn)
| # | Việc | Rủi ro | Ghi chú |
|---|---|---|---|
| B1 | Deploy **AIO Sandbox** + **g3proxy** trên tenant-02 | Thấp (không đụng gì đang chạy) | `ghcr.io/agent-infra/sandbox:1.11.0`, bind `127.0.0.1`, `SANDBOX_API_KEY`, network internal chỉ ra qua g3 |
| B2 | Nạp `SoloAioSandboxProvider` + `ArishemGuardrailProvider` vào DeerFlow (`config.yaml`: `sandbox.use`, `guardrails.use`) | **Cao** — có thể gãy workspace live | Làm sau khi B1 xanh; có backup + rollback |
| B3 | Cắm **godlp hook** vào LiteLLM (pre-call) | **Cao** — lỗi hook ⇒ mọi LLM call chết | Cần canary + rollback. `svc-dlp` đã sẵn sàng |
| B4 | Nạp 6 sub-agent + `skills/vietnam-business` vào DeerFlow | Thấp | Mount `/mnt/skills`, `custom_agents` trong `config.yaml` |
| B5 | Cài **FlowGram** (`@flowgram.ai/free-layout-editor`) vào `apps/web` + 3 node | Trung | Cần `styled-components@^6`, CSR-only (`dynamic ssr:false`); kiểm React 19 |
| B6 | Cài **Midscene** (`@midscene/web@1.10.3`) vào image sandbox, chỉ **Instant Action + HITL** | Trung | **Cấm `aiAct()`** trên cổng công. Cần khai 1 model **VLM** trong LiteLLM |
| B7 | **Dolphin**: GPU R730 + benchmark 10 mẫu VN (giao thức ở `research/R5`) | Trung | ≥90% field accuracy (Strict, có dấu) mới dùng; kém → đổi engine, giữ contract MCP |
| B8 | **Zalo OA** channel: đăng ký webhook, token refresh worker | Trung | Refresh token dùng 1 lần → cần lock Redis |
| B9 | Bật **Langfuse** + DNS `trace` | Thấp | Trace tag `org_id` |
| B10 | `web-community` → đổi tên `apps/web` (spec §7) | Thấp | Cosmetic |

### 🔴 Việc chủ dự án phải tự làm
1. **XOÁ 4 DNS record**: `platform`, `hub`, `convex-api`, `convex-site` (container đã tắt).
2. **ROTATE Coolify API token GẤP** — token cũ nằm trong git history đã push GitHub. Sau khi rotate phải cập nhật env `svc-provision`.
3. Chốt **VLM cho Midscene** (Qwen-VL vs GPT-4o vs Claude vision).
4. **Mở LICENSE** 3 lib (arishem / godlp / g3) xác nhận Apache-2.0 trước go-live thương mại (`ADR-006`).

---

## 11. NỢ KỸ THUẬT & RỦI RO

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| **core-01 kiệt RAM** (12GB, LiteLLM 3.9GB) | 🔴 Cao | Đã thêm swap 8GB. Nên **dời LiteLLM sang tenant-02** (94GB) hoặc nâng RAM core-01 |
| Coolify token lộ trong git history | 🔴 Cao | Rotate ngay |
| `arishem`/`godlp` đang dùng **evaluator/regex native**, chưa dùng lib gốc | 🟡 TB | Contract HTTP cố định → thay lib sau không sửa caller |
| Dolphin **chưa xác nhận tiếng Việt có dấu** | 🟡 TB | Bắt buộc benchmark R5 trước khi tin dùng |
| DeerFlow guardrail chưa nạp ⇒ **tool-call chưa bị gate ở tầng agent** | 🟡 TB | B2. Hiện gate chỉ có ở api-core |
| godlp chưa cắm ⇒ **PII vẫn rời hệ thống** | 🟡 TB | B3. Ảnh hưởng tuân thủ Nghị định 13 |
| `urtbzbux3oalqt2pbzqdz81k` (tenant-01) chưa định danh | 🟢 Thấp | Xác minh rồi giữ/tắt |

---

## 12. THAM CHIẾU

| Tài liệu | Nội dung |
|---|---|
| `research/R0-hien-trang-va-loai-bo.md` | Kiểm kê v1 + danh mục loại bỏ (A–F) |
| `research/R1-report.md` | DeerFlow internals: `guardrails/provider.py` (điểm chèn gate), `sandbox/sandbox_provider.py`, Gateway API, `MAX_CONCURRENT_SUBAGENTS=3` |
| `research/R2-report.md` | AIO Sandbox: 1 port 8080, `/v1/skills/*`, `SANDBOX_API_KEY`, `PROXY_SERVER`, Apache-2.0, pin `1.11.0` |
| `research/R3-report.md` | FlowGram: `@flowgram.ai/free-layout-editor`, `nodeRegistries`, `WorkflowJSON`, MIT |
| `research/R4-report.md` | Midscene + **ma trận Auto/Assist/Human-only cổng công VN** (CAPTCHA/ký số/VNeID = Human-only) |
| `research/R5-report.md` | Dolphin + **giao thức benchmark 10 mẫu VN** + MCP contract |
| `research/R6-report.md` | arishem + godlp + g3: kiến trúc 3 lớp, bảng DB, hook LiteLLM |
| `research/R7-report.md` | Zalo OA: webhook `X-ZEvent-Signature`, token 1h/refresh 1-lần, cửa sổ 48h/7 ngày |
| `docs/ADR/ADR-006` | License 8 nền tảng v2 |
| `docs/ADR/ADR-007` | HITL 2 tầng |

---

## 13. LỆNH KIỂM CHỨNG NHANH

```bash
# Sức khỏe public
for u in soloceo.vn app.soloceo.vn api.soloceo.vn/v1/health my.soloceo.vn \
         video.soloceo.vn groupchat.soloceo.vn llm.soloceo.vn; do
  echo "$u → $(curl -s -o /dev/null -w '%{http_code}' https://$u)"; done
# v1 phải chết: platform / hub / convex-api → 000

# Gate HITL (từ core-01)
docker run --rm --network coolify curlimages/curl -s -X POST \
  http://svc-rules-engine:8080/evaluate -H 'Content-Type: application/json' \
  -d '{"action":"spend_money","context":{"orgId":"x","amount":10000000}}'
# → {"decision":"REQUIRE_APPROVAL","tier":2,...}

# DLP
docker run --rm --network coolify curlimages/curl -s -X POST \
  http://svc-dlp:8080/mask -H 'Content-Type: application/json' \
  -d '{"text":"CCCD 001199012345, SĐT 0987654321"}'

# DB
docker exec o7amzfd0llvx4r4pntvlc4a9 psql -U soloceo -d soloceo -tAc \
  'SELECT count(*) FROM "Rule"'   # → 11
```

— HẾT —
