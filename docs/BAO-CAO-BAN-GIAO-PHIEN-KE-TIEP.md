# SOLOCEO OS v2 — BÁO CÁO TOÀN DỰ ÁN + TÀI LIỆU BÀN GIAO CHO PHIÊN CODE KẾ TIẾP

> **Ngày:** 12/07/2026 · **Chủ dự án:** Phạm Văn Thư · **Người viết:** Claude Code (phiên hoàn-thiện + vận-hành openclawos)
> **Mục đích:** đọc file này là đủ để phiên Claude Code kế tiếp nắm toàn bộ hệ thống, trạng thái thật, nợ còn lại, gotcha và cách làm việc an toàn. Mọi trạng thái ghi ở đây đều đã **verify bằng bằng chứng thật** (log/HTTP code/DB query) — không tô hồng.

---

## 1. SẢN PHẨM LÀ GÌ (1 phút)

**soloceo.vn = "hệ điều hành AI cho doanh nghiệp một người".** CEO đăng nhập 1 lần vào shell chat (DeerFlow), tạo doanh nghiệp, giao việc cho **đội 6 nhân sự AI** (Kinh doanh/Marketing/Nội dung/Vận hành/Kế toán/Nghiên cứu) — agent làm việc thật trong **sandbox live**, mọi hành động tiền/pháp lý dừng ở **Phê duyệt (HITL)**, doanh thu ghi vào **sổ cái verified** làm nền cho Sàn M&A.

**Kiến trúc v2 = DeerFlow (lõi chat/điều phối) + 7 nền tảng vệ tinh:**
> *"DeerFlow nghĩ — Sandbox làm — FlowGram cho CEO thấy — Midscene chạm web — Dolphin đọc giấy — arishem gác luật — godlp che dữ liệu — g3 canh cửa ra."*

Tất cả MIT/Apache-2.0. **Hướng manus (chat-centric, sidebar tối giản) ĐỂ DÀNH v3** — v2 giữ đủ 8 nền tảng gồm FlowGram (chỉ đạo chủ dự án, không tự đổi).

---

## 2. HẠ TẦNG (3 VPS Contabo, tất cả qua Coolify v4)

| Máy | IP | Vai trò |
|---|---|---|
| **core-01** | 194.233.72.150 | Coolify controller, api-core (NestJS), Supabase, **LiteLLM** (:4000, service Coolify `in0rczajeip1r7y4081msker`), svc-dlp, svc-rules-engine, dolphin-docs, web-community (`fxvxy…`), svc-provision, svc-billing-webhooks. **RAM chỉ 11GB — kiệt, LiteLLM ngốn ~4GB** |
| **tenant-01** | 62.146.235.177 | Stack tenant + WoWonder (my.soloceo.vn) |
| **tenant-02** | 194.233.85.255 | **DeerFlow** (soloceo.vn — frontend/gateway/nginx/redis, project compose `deer-flow` tại `/opt/deerflow/docker`), AIO Sandbox, g3proxy, Langfuse (trace.soloceo.vn) |

- SSH: key `~/.ssh/soloceo_deploy` (root@ cả 3 máy).
- Git: branch làm việc `hoan-thien-v2` → merge `soloceo-mvp` (= production, Coolify build từ branch này).
- **DB nghiệp vụ** (Org/Venture/Transaction/Rule/ApprovalRequest…): container `o7amzfd0llvx4r4pntvlc4a9` trên core-01, `psql -U soloceo -d soloceo` (KHÔNG phải supabase-db).
- Coolify API: `http://localhost:8000/api/v1` trên core-01, token tại `/root/.coolify_token_new` (token cũ đã rotate).

### Network trên tenant-02 (QUAN TRỌNG — vừa sửa regression)
- `deer-flow_deer-flow`: frontend/gateway/nginx/redis.
- `sandbox-internal` (**Internal=true**): sandbox spawn + g3proxy + **deer-flow-gateway (mới nối)**.
- **Docker BỎ QUA published port trên network internal** → gateway điều khiển sandbox qua **IP container :8080** (patch `_soloceo_sandbox_url()` trong `local_backend.py`), KHÔNG qua host port. coolify-proxy (traefik) giữ 0.0.0.0:8080 trên host — đừng đụng.

---

## 3. TRẠNG THÁI 8 NỀN TẢNG (verify 11-12/07)

| # | Nền tảng | Trạng thái | Bằng chứng chính |
|---|---|---|---|
| N0 | **DeerFlow** (lõi) | 🟢 LIVE | soloceo.vn/workspace; gateway `/api/threads` chạy run thật |
| N1 | **AIO Sandbox** | 🟢 LIVE + verify | spawn per-thread (DooD), 6 skill VN mount `/mnt/skills` |
| N1+N7 | **Egress khép kín + control** | 🟢 verify lại sau fix | direct→000, g3+soloceo→200, g3+example→000; gateway→IP:8080→401 (đòi key = đúng) |
| N4 | **6 sub-agents + skills** | 🟢 LIVE | `subagents.custom_agents=[6]` trong `/opt/deerflow/config.yaml` |
| N5 | **godlp (DLP)** | 🟢 **ENFORCE LIVE + verify** | prompt PII → model nhận `****789, *******678, ****@*****.***`; log `[DLP-ENFORCE] masked=True`; fail-open + circuit-breaker; rollback = env `DLP_HOOK_MODE=off` |
| N6 | **Dolphin** (đọc giấy tờ) | 🟢 LIVE engine-fallback | dolphin-docs core-01, engine Claude-vision qua LiteLLM, parse CCCD→JSON |
| N7 | **g3proxy** | 🟢 LIVE | allowlist child soloceo.vn/gov.vn/stripe/payos/shopee/anthropic/bytepluses/zalo.me |
| N2 | **FlowGram** | 🟡 canvas render, **node-render/exec CHƯA** | `/quy-trinh` trong workspace = iframe app.soloceo.vn (web-community) |
| N3 | **Midscene** | 🟡 prereq sẵn (CDP + Claude-vision), **chưa wiring `browser_act`** | — |
| N8 | **Zalo OA** | 🟡 webhook + chữ ký verify, **chờ credential OA** (việc tay) | đúng chữ ký→201, sai→401 |

**Đếm trung thực: 6/8 LIVE+verify.** N2/N3 là deep platform work — KHÔNG tuyên bố 8/8.

---

## 4. VIỆC ĐÃ XONG PHIÊN NÀY (A→D, tất cả đã merge `soloceo-mvp`)

### A. Tạo doanh nghiệp SÂU (hết "tạo xong đứng hình")
- `soloceo-kickoff.ts` — bảng bước theo ngành (F&B/BĐS/giáo dục thêm bước đặc thù + 4 bước chung), mỗi bước có prompt lead_agent sẵn.
- `soloceo-tao-dn.tsx` — sau tạo Org+Venture hiện **bảng khởi động**, thẻ "Bắt đầu" → lưu sessionStorage `deer-flow:soloceo-kickoff` → điều hướng `/workspace/chats/new`.
- ChatPage (`app/workspace/chats/[thread_id]/page.tsx`) — effect đọc key 1 lần và **auto-send** vào thread mới.
- **`/workspace/doanh-nghiep`** (`soloceo-dashboard.tsx`) — bảng điều hành: venture + doanh thu (mtd/ttm từ `/v1/ventures/:id/revenue`) + hàng chờ duyệt (`/v1/approvals/pending`). Sidebar thêm "Doanh nghiệp của tôi".
- Verify: build TS pass, route 307 thật (vs 404 giả), chuỗi code trong bundle live. **Bấm thử visual: chủ dự án** (công cụ chặn browse prod).

### B. godlp ENFORCE + 2 sự cố sửa tận gốc
- **Battery FP trước enforce:** regex cũ `cmnd_9`/`mst` (mọi dãy 9/10 số) **che nhầm số tiền/giá** → neo keyword CMND/MST/BKS trong `platform/dlp/main.go`, rebuild `soloceo/svc-dlp:v1`, re-test sạch.
- **Enforce bật đúng mốc 24h** (systemd timer 18:36 CEST 11/07) → verify model nhận bản mask.
- **Sự cố 1 (regression sandbox):** network internal nuốt published port → gateway không gọi được sandbox (loop start/stop). Fix: nối gateway vào `sandbox-internal` + patch `local_backend.py` (3 chỗ: create/discover/list_running) dùng IP container.
- **Sự cố 2 (LiteLLM sập 25'):** restart Coolify **regenerate compose từ DB** → mất `/app/litellm_dlp_hook.py` (trước chỉ `docker cp`) → 8 worker crash-loop 147 lần. Fix: mount hook trong compose file **VÀ** update `services.docker_compose_raw` trong coolify-db (dollar-quoting). **BÀI HỌC VÀNG: file cấy vào container Coolify-managed PHẢI khai trong compose lưu ở Coolify DB, KHÔNG bao giờ docker cp.**

### C. openclawos = Venture #1 (dùng chính OS vận hành doanh nghiệp thật)
- 2 demo ("Chào Buổi Sáng", "Phạm Văn Thư") → **ARCHIVE** (status PAUSED, backup `/root/backup-venture-org-*.sql` core-01). Directory public giờ chỉ còn OpenClawOS.
- Org `OpenClawOS` (`ba2b9dae-eee5-454f-97ba-05f8db733879`, SCALE) + Venture `openclawos` (`42d6cfe2…`, LIVE).
- Virtual key LiteLLM `org-openclawos`: **budget cứng $10/30d**, metadata.org_id, 4 model — lưu `/root/.openclawos_llm_key` (core-01).
- Trang chủ: thẻ `slug=openclawos` render `<a>` external → openclawos.vn ("Ghé openclawos.vn"); venture khác vẫn mở modal trợ lý tiếp khách.
- **Cỗ máy doanh thu CHẠY THẬT bước 1** (thread `8e1eb282…`, owner=org openclawos): agent trả 3 kênh + 3 thông điệp lead, bài ra mắt 157 chữ + CTA, khung báo giá **mọi ô giá "Chờ duyệt"** (tôn trọng ràng buộc không tự đặt giá).

### D. Docs tiếng Việt
- `soloceo.vn/vi/docs/introduction` (+why-deerflow, core-concepts, harness-vs-app, tổng quan) **LIVE 200, tiếng Việt tự nhiên**. Nguồn: `content/vi/` + locale `vi` trong `next.config.js` + i18n array trong `app/[lang]/docs/layout.tsx`.
- `research/VAN-HANH-OPENCLAWOS.md` — tài liệu vận hành end-to-end (đội AI, cỗ máy doanh thu, vai trò 8 nền tảng, HITL, bảng số liệu chờ điền).

---

## 5. NỢ CÒN LẠI (việc cho phiên kế tiếp, theo độ ưu tiên)

1. **N2 FlowGram FULL** — node có hình + execution + persist org_id.
   - Hiện trạng: canvas render tại web-community `apps/web-community/src/app/quy-trinh/FlowCanvas.tsx` (`@flowgram.ai/free-layout-editor` 1.0.12); node KHÔNG hiện hình — API `materials.renderDefaultNode` không thấy trong .d.ts bản này. Workspace nhúng iframe `app.soloceo.vn/quy-trinh?embed=1`.
   - Gợi ý đường đi: đọc source demo chính chủ `bytedance/flowgram.ai` playground (free-layout-simple) để lấy đúng pattern render node; hoặc nâng cấp package; định nghĩa node types agent_task/human_approval/form → chạy = gọi gateway DeerFlow `/api/threads` + `POST /v1/approvals/internal`.
2. **N3 Midscene** — bọc tool `browser_act` (VLM=Claude-vision qua LiteLLM `soloceo-vision`), chế độ Assist, **cấm CAPTCHA/ký số/VNeID**. AIO sandbox có browser CDP sẵn. Điểm cắm: thêm MCP/tool vào DeerFlow config (`Total tools loaded: 10` hiện tại).
3. **B4 trace org_id đầy đủ** — DeerFlow orchestration dùng 1 `$LITELLM_KEY` chung nên trace chưa tag org per-request (sandbox/tool call per-org OK). Cần inject `metadata.org_id` mỗi call trong DeerFlow-core hoặc chuyển key theo thread-owner.
4. **Dời LiteLLM → tenant-02** — CHẶN việc tay: DNS `llm.soloceo.vn` → 194.233.85.255. Runbook đủ lệnh + rollback: `research/LITELLM-MOVE-RUNBOOK.md`.
5. **N8 Zalo** — chờ chủ dự án đưa credential OA; code webhook + chữ ký đã verify.
6. **Bật lại sub-agent trong run** (log hiện `subagent_enabled: False` khi run mặc định) + benchmark Dolphin 10 mẫu VN thật + Dolphin-v2 GPU (env `DOLPHIN_MODEL_PATH`).

## ⛔ CHỜ QUYẾT ĐỊNH CHỦ DỰ ÁN (C.4 — để openclawos ra tiền thật)
1. **Bán gì?** (đề xuất: gói SaaS "Văn phòng AI OpenClawOS" — setup + thuê bao tháng)
2. **Giá?** (agent không tự đặt)
3. **Cổng thu tiền?** PayOS (khuyến nghị VN) / Stripe — cần key thật mới có doanh thu verified
4. **Kênh bán chính?** FB / Zalo / cộng đồng / cold outreach

Chưa có 4 điều này: agent chạy tới báo giá/nội dung/lead; **bước thu tiền thật DỪNG** (mức C theo GOVERNANCE).

---

## 6. CÁCH LÀM VIỆC AN TOÀN (gotcha đúc kết — ĐỌC TRƯỚC KHI CODE)

### Build & deploy DeerFlow frontend (tenant-02)
```bash
cd /opt/deerflow/docker
DOCKER_BUILDKIT=0 docker compose -p deer-flow --env-file /opt/deerflow/.env build frontend
docker compose -p deer-flow --env-file /opt/deerflow/.env up -d --force-recreate --no-deps frontend
```
- **PHẢI** `-p deer-flow` + `--env-file /opt/deerflow/.env` (sai → project "docker", network conflict).
- **PHẢI** `DOCKER_BUILDKIT=0` (buildkit compile OK nhưng không tag image mới).
- Build ~10 phút; verify route thật bằng so sánh 307 (thật) vs 404 (giả); nội dung client-render phải grep chuỗi trong `.next/static/chunks`.

### Coolify (core-01)
- Service LiteLLM = `in0rczajeip1r7y4081msker`. Đổi env: `PATCH /api/v1/services/{uuid}/envs` + `POST .../restart`. **LiteLLM boot ~2 phút — đừng rollback sớm.**
- **Không bao giờ `docker cp` file vào container Coolify-managed** — restart regenerate compose từ DB và mất file. Mount phải nằm trong `services.docker_compose_raw` (coolify-db).
- svc-dlp/svc-rules-engine chạy `docker run` thủ công (network `coolify` + `in0rcz…`), source `/opt/soloceo-v2/`.

### DeerFlow gateway API (test luồng agent không cần browser)
```bash
IT=$(grep DEER_FLOW_INTERNAL_AUTH_TOKEN /opt/deerflow/.env | cut -d= -f2)
GIP=$(docker inspect deer-flow-gateway --format '{{(index .NetworkSettings.Networks "deer-flow_deer-flow").IPAddress}}')
# tạo thread:  POST http://$GIP:8001/api/threads  {"metadata":{"owner":"<org_id>","title":"…"}}
# chạy run:    POST .../api/threads/{id}/runs/stream  {"input":{"messages":[{"type":"human","content":"…"}]},"stream_mode":["values"]}
# đọc kết quả: GET  .../api/threads/{id}  → values.messages
```
- Header `X-DeerFlow-Internal-Token: $IT`.
- **GOTCHA pkill:** pattern chứa `runs/stream` tự giết SSH session — dùng `[r]uns.[s]tream`.

### Vá DeerFlow (không sửa source gốc)
- Patch bind-mount: `/opt/deerflow/patches/aio_sandbox/local_backend.py` + `patches/gateway/csrf_middleware.py` (khai trong `docker/docker-compose.yaml`). Mirror trong repo: `infra/patches/deerflow/`.
- Trang native SoloCEO trong shell: `frontend/src/components/workspace/soloceo-*.tsx` + `app/workspace/{tao-doanh-nghiep,goi-cuoc,danh-ba,doanh-nghiep,phe-duyet}/page.tsx`.
- SSO 1 đăng nhập: api-core `POST /v1/auth/exchange` (X-Internal-Token, fail-closed) + route `/workspace/api/soloceo-token`; token nội bộ ở `/root/.soloceo_internal_token` (core-01) và `/opt/deerflow/.env`.
- Docs Nextra: content `frontend/src/content/{en,zh,vi}/`; locale phải có trong `next.config.js i18n.locales` **và** i18n array của `app/[lang]/docs/layout.tsx`; cần top-level `_meta.ts`+`index.mdx`; `_meta` CHỈ chứa key có trang thật.
- DeerFlow User type = `{id, email, oauth_provider?}` — **không có `.name`**.

### Ràng buộc bất biến (giữ nguyên, không hỏi lại)
- Mọi LLM qua LiteLLM; multi-tenant theo org_id; HITL 2 tầng không tắt; godlp **fail-open** (không bao giờ giết LLM call); Midscene không vượt CAPTCHA/ký số/VNeID; không xoá cứng (ARCHIVE); backup + lệnh rollback trước mỗi thay đổi production; secrets vào env/file root-only, không commit; n8n chỉ nội bộ; **thu tiền thật = mức C** chờ chủ dự án.

---

## 7. TÀI LIỆU LIÊN QUAN (đọc theo nhu cầu)

| File | Nội dung |
|---|---|
| `research/NGHIEM-THU-V2.md` | Nghiệm thu 8 nền tảng, 4 lần cập nhật, bằng chứng từng mục |
| `research/LUONG-CEO-DAU-TIEN.md` | Luồng CEO end-to-end + chỗ mượt/gợn |
| `research/VAN-HANH-OPENCLAWOS.md` | Vận hành Venture #1 + cỗ máy doanh thu + 4 quyết định C.4 |
| `research/GODLP-ENFORCE-RUNBOOK.md` | Enforce/rollback DLP (đã bật xong — giữ làm tham chiếu rollback) |
| `research/LITELLM-MOVE-RUNBOOK.md` | Dời LiteLLM sang tenant-02 (chờ DNS) |
| `docs/GOVERNANCE.md` | Hiến chương + chế độ tự động có kiểm soát (§5b) |
| `docs/ADR/` | ADR-001 Dify (v1)… ADR-006 license, ADR-007 HITL 2 tầng |
| `CLAUDE.md` | Spec gốc MVP v1 (Coolify/Prisma/API v1 — vẫn đúng cho api-core) |

**Trạng thái git:** branch `hoan-thien-v2` = `soloceo-mvp` (đã merge, sạch). Commit gần nhất: godlp enforce + docs VI + fix sandbox-control.

**Việc tay chủ dự án đang treo:** (1) bấm thử shell thống nhất, (2) 4 quyết định C.4, (3) credential Zalo OA, (4) DNS `llm` nếu duyệt dời LiteLLM.

— HẾT BÁO CÁO BÀN GIAO —
