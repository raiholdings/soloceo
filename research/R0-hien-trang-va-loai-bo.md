# R0 — Hiện trạng soloceo.vn (hậu tách) & Danh mục loại bỏ trước khi cài v2

> Nhánh: `chuan-bi-v2` (tách khỏi `soloceo-mvp`, KHÔNG đụng production).
> Trạng thái: **ĐÃ DUYỆT** — bắt đầu PHA 1 (dọn tàn dư v1).
> Ngày: 10/07/2026.

## ⚠️ Phát hiện quan trọng (khác giả định của spec §3)

Spec §3 và §4 giả định cụm OpenClaw/Claw3D/ClawHub + OS Shell **"ĐÃ NGẮT khi tách"** (đã comment / đã `@deprecated` / đã chuyển đi). **Thực tế trong repo `soloceo` KHÔNG phải vậy:**

- Việc tách openclawos.vn được làm bằng cách **COPY sang một repo riêng** (`/Users/phamvanthu/Documents/openclawos`), rồi dựng hạ tầng độc lập.
- **Core soloceo CHƯA bị cắt bất kỳ dòng nào** (các bước "B8–B9 đụng core" trong kế hoạch tách chưa thực hiện).
- ⇒ **Toàn bộ tàn dư v1 trong core vẫn ACTIVE**: không có mục nào `@deprecated`/comment/ARCHIVED. Danh mục §C dưới đây là việc **cần làm mới**, không phải "kiểm lại còn sót".

Kiểm chứng nhanh: `git grep @deprecated` trong luồng core = 0 kết quả; `DEFAULT_APPS_BY_PLAN` mọi gói vẫn cấp `["claw3d","openclaw"]`.

---

## A. Cây thành phần đang chạy (thực tế trong repo)

| Thành phần | Loại | Domain / cổng | Trạng thái | Ghi chú |
|---|---|---|---|---|
| `apps/web-community` | Next.js 15 | **app.soloceo.vn** :3000 | LIVE | Landing + lễ tân AI + đăng ký/venture + /bat-dau + /goi |
| `apps/web-platform` | Next.js 15 | **platform.soloceo.vn** | LIVE | **OS Shell 3D** (desktop, dock, cửa sổ react-rnd, nền = Claw3D iframe) + route /admin |
| `apps/api-core` | NestJS 10 | **api.soloceo.vn** | LIVE | 15 module: health, prisma, auth, orgs, ventures, directory, store, domains, concierge, oidc, ai, payments, community, marketplace, admin |
| `services/svc-provision` | BullMQ worker | — | LIVE | Cấp app per-venture qua Coolify API (APP_CONFIGS: claw3d, openclaw, commerce-starter) |
| `services/svc-billing-webhooks` | NestJS | — | LIVE | Webhook Stripe/PayOS → Transaction (đường tiền — KHÔNG đụng) |
| `packages/db` | Prisma 6 + Postgres | — | LIVE | schema + seed (CatalogApp claw3d/openclaw) |
| `packages/shared` | TS lib | — | LIVE | constants (plans.ts allowedAppKeys), types, i18n |
| `packages/ui` | shadcn | — | LIVE | Component dùng chung 2 web app |
| `templates/commerce-starter` | Next.js source | *.app.soloceo.vn (image) | GIỮ | Web bán hàng mẫu → image registry (KHÔNG gỡ) |
| `infra/patches/deerflow` | skills + landing patch | **soloceo.vn** (deploy riêng tenant-02) | LIVE | DeerFlow 2.0 = trang chủ AI; chỉ skills+patch nằm trong repo, engine không phải app trong monorepo |
| `infra/patches/{claw3d,openclaw}` | Dockerfile + mjs patch | *.app.soloceo.vn (image) | LIVE | Vá image claw3d/openclaw per-tenant (hardcode platform.soloceo.vn, convex-*.soloceo.vn) |
| `infra/coolify/templates` | compose | — | LIVE | claw3d.yml, openclaw.yml, erpnext.yml |
| `infra/clawhub-selfhost` | Convex compose | convex-*.soloceo.vn / hub.soloceo.vn | LIVE | ClawHub chợ kỹ năng (Convex self-host) |
| `infra/litellm/config.yaml` | LiteLLM | **llm.soloceo.vn** | LIVE | Gateway (soloceo-fast/smart) |
| `infra/{devstack,docker-compose.core.yml,env,scripts}` | infra | — | LIVE | Dev/stack lõi |

**Hạ tầng ngoài repo (giữ):** WoWonder (my.soloceo.vn), PlayTube (video.soloceo.vn), Grupo (groupchat.soloceo.vn); Coolify (coolify.soloceo.vn) + 3 VPS Contabo (core-01, tenant-01, tenant-02); Langfuse.

---

## B. GIỮ LẠI (đi tiếp v2) — 9 mục

| Thành phần | Vai trò v2 | Cần sửa gì để nối 8 nền tảng |
|---|---|---|
| DeerFlow (`infra/patches/deerflow` + engine tenant-02) | Lõi điều phối (#0) | Đổi sandbox local → **AIO Sandbox** (#1); nạp sub-agents; MCP dolphin/rules; model base_url→LiteLLM |
| `apps/api-core` | Xương sống nghiệp vụ (Org/Venture/Transaction/payments/directory/domains/M&A) | Thêm bảng `approvals`, `rules`; chèn **arishem** gate |
| `apps/web-community` → `apps/web` | Frontend soloceo.vn | Nhúng **FlowGram** canvas + Dashboard phê duyệt HITL; cập nhật văn bản lễ tân |
| LiteLLM (`infra/litellm`) | Gateway LLM (nguyên tắc #2) | Chèn **godlp** pre-call hook |
| `services/svc-provision` | Worker cấp phát | **ĐỔI VAI**: cấp AIO Sandbox per-tenant; **giữ commerce-starter** |
| Coolify + 3 VPS | Hạ tầng | Phân vai node lại (spec §7) |
| WoWonder / PlayTube / Grupo | MXH nội bộ (đã mua license) | Không đụng ở đợt này |
| payments, directory, domains, M&A, gói cước | Nghiệp vụ core | Không đụng ở đợt này |
| 6 playbook nhân sự AI | Nội dung sub-agents | Port sang `agents/` của DeerFlow |

---

## C. LOẠI BỎ / DỌN (tàn dư v1 — **tất cả còn ACTIVE**) — 9 mục

> Cách loại (bất biến): `comment` + ghi chú / `@deprecated` / `status=ARCHIVED`. **KHÔNG xoá cứng.**

| # | Thành phần (vị trí) | Lý do loại | Cách xử lý | Ai đang phụ thuộc |
|---|---|---|---|---|
| C1 | `DEFAULT_APPS_BY_PLAN` — `store.service.ts:19-22` | Launch cấp claw3d+openclaw | Đổi sang danh sách v2 an toàn + ghi chú | `StoreService.launch` |
| C2 | `APP_CONFIGS.claw3d/.openclaw` — `worker.ts:119-169` | Cụm đã sang openclawos | Comment + ghi chú; giữ `commerce-starter:172` | Worker |
| C3 | `GET /ventures/:id/openclaw-access` — `store.controller.ts:60` + `getOpenclawAccess` `store.service.ts:164-198` | Phục vụ cụm đã tách | `@deprecated`; gỡ caller | web-platform (3 nơi) |
| C4 | `getOrCreateOpenclawToken` — `worker.ts:42-68` + Secret `openclaw_token:*` | Token gateway OpenClaw | `@deprecated`; Secret ARCHIVE | worker.ts:245 |
| C5 | `apps/web-platform` | Đã sang openclawos | Gỡ khỏi build; giữ file | Không app nào import |
| C6 | Sandbox-local DeerFlow | Thay bằng AIO Sandbox | Chuyển provider (PHA 3) | DeerFlow engine (ngoài repo) |
| C7 | Runtime OpenClaw per-venture | Thay bằng DeerFlow sub-agents | Ngắt nối (PHA 3) | svc-provision |
| C8 | import/URL openclaw/claw3d/clawhub/*.app.soloceo.vn | Đã tách | Dọn; chừa @deprecated có ghi chú | plans.ts, concierge, seed |
| C9 | CatalogApp + AppInstall claw3d/openclaw (DB) | Cụm đã tách | `status=ARCHIVED` (không DELETE) | store/provisioning |

---

## D. ĐỔI VAI — 4 mục

| Thành phần | Vai cũ (v1) | Vai mới (v2) |
|---|---|---|
| `svc-provision` | Cấp Claw3D/OpenClaw per-venture | Cấp **AIO Sandbox** per-tenant + commerce-starter |
| "CEO nhìn bộ máy" (Claw3D) | Văn phòng 3D | **FlowGram canvas** |
| "Agent điều hành" (OpenClaw) | Runtime per-venture | **DeerFlow lead_agent + 6 sub-agents** |
| "Chợ kỹ năng" (ClawHub) | Convex marketplace | **skills/vietnam-business** |

---

## E. Rủi ro & thứ tự thực thi an toàn

### Đồ thị phụ thuộc
```
web-platform (OS Shell): ai-studio.tsx:71 / clawhub.tsx:45 / desktop.tsx:281
        └─> GET /ventures/:id/openclaw-access (C3)
                 └─> store.getOpenclawAccess ──> Secret openclaw_token:* (C4)
store.launch ──> DEFAULT_APPS_BY_PLAN (C1) ──> svc-provision worker
                     ├─ APP_CONFIGS.claw3d/openclaw (C2)
                     ├─ getOrCreateOpenclawToken (C4)
                     └─ templates/{claw3d,openclaw}.yml + patches/* (C7,C8)
seed.ts ──> CatalogApp(claw3d,openclaw) ──> AppInstall (DB) (C9)
```

### Rủi ro
- **R-1 (cao):** đổi DEFAULT_APPS (C1) trước khi có AIO Sandbox → launch rỗng. Giảm thiểu: tạm `["commerce-starter"]`.
- **R-2 (trung):** @deprecated openclaw-access (C3) trước khi gỡ caller → web-platform 404. Giảm thiểu: C5 trước C3.
- **R-3 (thấp):** seed/DB ARCHIVE cần backup + migration reversible.
- **R-4 (thấp):** không xoá nhầm commerce-starter.

### Thứ tự an toàn
1. C5 (gỡ web-platform) → 2. C3 (@deprecated) → 3. C1 (DEFAULT_APPS) → 4. C4 → 5. C2 → 6. C8 → 7. C9 → 8. C6/C7 (PHA 2/3). Build sau mỗi bước.

---

## F. Xác nhận

Sau §C theo §E, luồng chạy core sẽ **không còn tham chiếu active** tới openclaw/claw3d/clawhub, chỉ còn @deprecated có ghi chú, code ngoài build, DB `status=ARCHIVED`, `commerce-starter` + WoWonder/PlayTube/Grupo giữ nguyên.

**Hiện trạng R0: 0/9 mục §C đã dọn — tất cả còn ACTIVE.**
