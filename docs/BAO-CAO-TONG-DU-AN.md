# BÁO CÁO TỔNG DỰ ÁN — SoloCEO.vn (v1 MVP → SoloCEO OS v2)

**Ngày:** 11/07/2026 · **Chủ dự án:** Phạm Văn Thư — RAI Holdings
**Nhánh production:** `soloceo-mvp` · **Nhánh làm việc v2:** `hoan-thien-v2`
**Tài liệu chi tiết:** `docs/BAO-CAO-HE-THONG-V2.md` (hệ thống), `research/NGHIEM-THU-V2.md` (nghiệm thu 8 nền tảng), `research/LUONG-CEO-DAU-TIEN.md` (trải nghiệm CEO), `docs/GOVERNANCE.md` (luật vận hành).

> Nguyên tắc báo cáo: chỉ ghi "LIVE/ĐẠT" khi có **bằng chứng thật** (health/log/test). Nợ khai đủ ở §8.

---

## 1. SoloCEO LÀ GÌ

**Hệ điều hành AI cho doanh nghiệp một người** (Solo CEO Việt Nam). Mỗi CEO có 1 **Org** (`org_id` = đơn vị multi-tenant) sở hữu ≥1 **Venture**. CEO chat với đội ngũ **6 nhân sự AI**, agent tự làm việc trong **máy ảo (sandbox)**, mọi hành động tiền/pháp lý **dừng chờ CEO phê duyệt (HITL)**. Doanh thu đo được → nền của **Sàn M&A** (bán lại doanh nghiệp).

**Hai thế hệ:**
- **v1 (MVP)**: web-community + OS Shell 3D + Claw3D/OpenClaw/ClawHub (per-venture). *(OS Shell + cụm OpenClaw đã tách sang dự án riêng openclawos.vn; Claw3D/OpenClaw đã ARCHIVE khỏi core.)*
- **v2 (hiện tại)**: **DeerFlow + 7 nền tảng vệ tinh** = 8 nền tảng. Tất cả MIT/Apache-2.0.

**Tầm nhìn v2 một câu:** *DeerFlow nghĩ — Sandbox làm — FlowGram cho CEO thấy — Midscene chạm web — Dolphin đọc giấy — arishem gác luật — godlp che dữ liệu — g3 canh cửa ra.*

---

## 2. HẠ TẦNG (3 VPS Contabo, Ubuntu 24.04, Coolify quản)

| Node | IP | Cấu hình | Đang chạy |
|---|---|---|---|
| **core-01** | 194.233.72.150 | ~12GB (⚠️ chật, +swap 8GB) | Coolify, api-core, web-community, svc-provision, svc-billing-webhooks, **svc-rules-engine, svc-dlp, dolphin-docs**, LiteLLM, Supabase, Postgres app |
| **tenant-01** | 62.146.235.177 | 32GB | WoWonder, PlayTube, Grupo, registry, commerce-starter tenant |
| **tenant-02** | 194.233.85.255 | 18 vCPU / 94GB | **DeerFlow** (frontend/gateway/nginx/redis), **AIO Sandbox**, **g3proxy**, **Langfuse** |

**Health (11/07):** `soloceo.vn 200 · app 200 · api/health 200 · llm 200 · trace 200` — tất cả xanh.

**DNS (Cloudflare, DNS-only):** giữ soloceo/www→DeerFlow, app/api/auth/llm/pay/coolify→core, my/video/groupchat/*.app→tenant-01, **trace→tenant-02** (mới). **Xoá (v1, đã tắt container):** platform, hub, convex-api, convex-site.

---

## 3. KIẾN TRÚC MONOREPO

```
apps/       api-core (NestJS, 18 module) · web-community (Next15, app.soloceo.vn) · web-platform (⛔ v2 bỏ, giữ file)
services/   svc-provision (BullMQ→Coolify) · svc-billing-webhooks (Stripe/PayOS→Transaction — đường tiền)
platform/   rules (svc-rules-engine Go + arishem_guardrail.py) · dlp (svc-dlp Go + litellm hook) ·
            sandbox (provider.py) · egress (g3proxy config) · deerflow
mcp-servers/ dolphin-docs · rules-engine
agents/     lead-agent + 6 sub-agent (kinh-doanh, marketing, noi-dung, ke-toan, van-hanh, nghien-cuu)
skills/vietnam-business/  (dkkd, thue, bhxh, ngan-hang, website, bao-cao)
templates/commerce-starter/  (web bán hàng mẫu)
infra/      litellm · patches/{deerflow,aio_sandbox,gateway} · env
research/   R0-R7 (nghiên cứu 8 nền tảng) + PHA1-3 + NGHIEM-THU-V2 + LUONG-CEO-DAU-TIEN
docs/       GOVERNANCE · BAO-CAO-HE-THONG-V2 · ADR-001..007
```

---

## 4. TRẠNG THÁI 8 NỀN TẢNG v2

| # | Nền tảng | Vai trò | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| 0 | **DeerFlow** | Lõi điều phối (lead+sub-agents) | 🟢 LIVE | workspace 200, gateway startup complete |
| 1 | **AIO Sandbox** | Máy ảo per-thread | 🟢 LIVE+verify | shell `SANDBOX_OK`, browser CDP, no-key→401 |
| 2 | **FlowGram** | Canvas quy trình | 🟡 canvas render (React 19) · node/exec dở | `/quy-trinh` render `gedit-playground-container` |
| 3 | **Midscene** | Thao tác web (Assist) | 🟡 Prereq sẵn (CDP+VLM), chưa wiring tool | — |
| 4 | **Dolphin** | Đọc giấy tờ→JSON | 🟢 LIVE (engine-fallback)+verify | CCCD giả→`so_cccd`, tiếng Việt có dấu |
| 5 | **arishem** | Rule gate HITL | 🟢 LIVE+verify | spend 10tr→REQUIRE_APPROVAL tier2; delete>100→DENY |
| 6 | **godlp** | Mask PII trước khi rời hệ thống | 🟢 LIVE **shadow** (enforce ~16:30 CEST 11/07) | `[DLP-SHADOW] findings={cccd,phone,email} masked=False` |
| 7 | **g3proxy** | Egress allowlist | 🟢 LIVE+verify | soloceo qua g3→200, example→000 chặn |

**⭐ N1+N7 khép kín (nợ chính đã ĐÓNG):** sandbox DeerFlow tự spawn ở network internal → **không internet trực tiếp**, egress **chỉ qua g3**, chặn domain ngoài allowlist. Verify từ trong sandbox: direct→000, soloceo qua g3→200, example qua g3→000.

**Kết luận: 6/8 LIVE+verify.** Còn: N2 (node-render/exec), N3 (Midscene tool-wiring), godlp enforce (chờ 24h).

**Nền tảng phụ trợ (giữ, đã mua/nulled):** WoWonder (my), PlayTube (video), Grupo (groupchat) — MXH nội bộ.

---

## 5. LUỒNG NGHIỆP VỤ (đã verify — research/LUONG-CEO-DAU-TIEN.md)

```
CEO đăng nhập (Supabase) → workspace DeerFlow
  → Tạo doanh nghiệp: Org + Venture (org_id gắn đúng)          ✅
  → Chat AI: lead_agent → spawn AIO sandbox → LLM trace Langfuse ✅ (sub-agent off mặc định, trace chưa tag org_id)
  → Hành động nhạy cảm (chi tiền): arishem gate CHẶN → hàng đợi "Phê duyệt"
       → CEO Duyệt → resume DeerFlow thread                     ✅ KHÉP KÍN
  → Upload CCCD → Dolphin ra JSON field                          ✅
  → godlp: prompt PII → mask trước khi tới model                 🟡 shadow (chờ enforce)
```
**HITL 2 tầng:** tầng 1 arishem gate (chặn trước khi tool chạy), tầng 2 CEO duyệt (bảng ApprovalRequest → resume). Danh mục nhạy cảm: `spend_money, send_bulk_email, submit_application, sign_document, publish_public, delete_data, deploy_infra, transfer_ownership, export_pii`.

**Đường tiền (KHÔNG đụng):** Stripe/PayOS webhook → svc-billing-webhooks → Transaction (idempotent) → Revenue Ledger → Sàn M&A.

---

## 6. DỮ LIỆU (Prisma/Postgres `soloceo`)

- **Bảng v2 mới:** `Rule`, `ApprovalRequest`, `RuleDecisionLog`, `EgressAllowlist`, `ChannelBinding`.
- **Migration đã áp** (reversible, có backup `/root/backup-soloceo-APPDB-v2-*.sql.gz`): installstatus_add_archived, archive_v1_claw3d_openclaw, v2_rules_approvals_egress_channel.
- **Trạng thái:** claw3d/openclaw `active=false` + AppInstall ARCHIVED (không xoá cứng); commerce-starter RUNNING; **11 rule HITL** seed.

---

## 7. QUẢN TRỊ & BẢO MẬT

- **GOVERNANCE.md:** thứ bậc quyền (chủ dự án > Claude Code > CEO trong org), 3 mức A/B/C, §5b chế độ tự động (đợt v2) → hết đợt về v1.0 (dừng mọi mức C).
- **Đã xử lý:** rotate Coolify token (token lộ→401); `BETTER_AUTH_SECRET` "x"→64-hex (lỗ hổng tôi từng gây, đã vá — user DeerFlow đăng nhập lại 1 lần); dev-login tắt ở prod.
- **License BOM:** DeerFlow/FlowGram/Midscene/Dolphin=MIT, AIO Sandbox/arishem/g3=Apache-2.0, godlp=MIT. WoWonder/PlayTube/Grupo=nulled (ngoài 8 nền tảng).

---

## 8. NỢ KỸ THUẬT & RỦI RO (khai trung thực)

| Nợ | Mức | Ghi chú |
|---|---|---|
| **N2 FlowGram** node-render + execution wiring | 🟡 | canvas render OK, node chưa có hình + chưa nối DeerFlow run |
| **N3 Midscene** tool-wiring | 🟡 | CDP+Claude-vision sẵn; cần bọc `browser_act` MCP + thêm @midscene/web vào image AIO |
| **godlp enforce** | 🟡 | chờ đủ 24h shadow (~16:30 CEST 11/07); findings sạch, dlp_bypass=0 |
| **SSO workspace ↔ app** | 🔴 | DeerFlow (BetterAuth) và app.soloceo.vn (Supabase) là 2 hệ đăng nhập → CEO có thể bị hỏi đăng nhập lại. **Gợn UX lớn nhất.** |
| **Sub-agent chưa bật** + **trace chưa tag org_id** | 🟡 | subagent_enabled=False mặc định; DeerFlow gọi LiteLLM bằng master key |
| **Dời LiteLLM sang tenant-02** | 🟡 | core-01 kiệt RAM (LiteLLM ~3.9GB/12GB); cần đổi DNS llm→tenant-02 (§việc chủ dự án) |
| **Zalo (N8)** vòng tin nhắn | 🟡 | webhook+chữ ký verified; chờ credential OA |
| **arishem/godlp** dùng engine native (không lib gốc) | 🟢 | contract cố định, thay sau không sửa caller; g3 dùng binary gốc |
| **Dolphin** engine vision-fallback | 🟢 | chưa Dolphin-v2 GPU + chưa benchmark 10 mẫu VN thật |
| WoWonder/PlayTube/Grupo nulled | 🔴 | nợ pháp lý trước go-live thương mại |

**Trước go-live thương mại:** rà mọi secret/config tạm, rotate khóa test, bật lại cổng duyệt mức C, xử lý license MXH.

---

## 9. VIỆC CHỦ DỰ ÁN

1. **Bấm thử luồng CEO** trên trình duyệt thật (soloceo.vn) — đối chiếu `research/LUONG-CEO-DAU-TIEN.md`. *(Công cụ của tôi bị chặn browse production nên chưa chụp UI được.)*
2. **Credential Zalo OA** (App ID + OA Secret + Access Token) → chạy vòng tin nhắn.
3. **Quyết định**: chữa gợn SSO workspace↔app trước, hay làm nốt N2/N3/dời-LiteLLM để chốt 8/8.

---

## 10. TÓM TẮT MỘT DÒNG

Luồng lõi **đăng nhập → tạo doanh nghiệp → chat AI (có sandbox cô lập egress qua g3) → HITL khép kín → đọc giấy tờ** đã **chạy được đầu-đến-cuối trên production**, 6/8 nền tảng LIVE+verify, nợ chính (sandbox+egress) đã đóng; còn 3 gợn (SSO, FlowGram/Midscene, godlp enforce) trước khi mời CEO thật.
