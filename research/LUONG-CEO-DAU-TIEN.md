# LUỒNG CEO ĐẦU TIÊN — nghiệm thu bằng trải nghiệm thật

**Ngày:** 11/07/2026 · **CEO test:** `ceo-test-…@soloceo.vn` · **Org:** "Tiem Banh Ngot An" (`3f1948a3…`, STARTER)
**Cách chạy:** drive luồng bằng **API thật** (JWT CEO + gateway DeerFlow) — bằng chứng JSON/log/trace ở từng bước.

> ⚠️ **Không chụp được UI production bằng công cụ:** Claude Browser chặn `soloceo.vn` (policy), và không có Chrome extension kết nối. Nên đây là **hướng dẫn từng bước + bằng chứng backend** để chủ dự án đối chiếu khi **tự bấm thử trên trình duyệt thật**. Chỗ nào mượt / còn gợn ghi rõ ở cuối.

---

## Bước 1 — Đăng nhập CEO
- Prod dùng **Supabase GoTrue** (email+mật khẩu, xác nhận email SMTP). `dev-login` **đã tắt ở prod** (404 — đúng bảo mật).
- Test: ký JWT hợp lệ bằng `JWT_SUPABASE_SECRET` (giống GoTrue) → api-core chấp nhận.
- ✅ **Mượt** (khi CEO thật): đăng ký email → xác nhận → đăng nhập.

## Bước 2 — Tạo doanh nghiệp (Org + Venture)
```
POST /v1/orgs {name:"Tiem Banh Ngot An",plan:STARTER}
  → Org 3f1948a3-c15f-4663-a326-2783bf57365d
GET /v1/orgs/me → owner = ceo-1783709597 (org_id gắn ĐÚNG chủ)
POST /v1/ventures {name,slug:tiem-banh-…,industry:fnb}
  → Venture 597892ec-… status=DRAFT orgId=3f1948a3… (khớp)
```
✅ **ĐẠT** — Org+Venture tạo được, `org_id` gắn đúng CEO. *(Multi-tenant theo org_id — bất biến §4.)*

## Bước 3 — Chat với đội ngũ AI
```
POST /api/threads (owner=org 3f1948a3…) → thread e7c2bac4…
POST /api/threads/{th}/runs {content:"Soạn kế hoạch bán hàng tháng này cho tiệm bánh…"} → 200
```
Bằng chứng backend:
- ✅ lead_agent xử lý (log `Create Agent(default) model=soloceo-smart`).
- ✅ **Agent spawn AIO sandbox thật** cho thread này (log `local_backend: Stopped container eb280c71…` = đã cấp+dùng+thu hồi sandbox).
- ✅ **LLM call trace về Langfuse** (`trace.soloceo.vn`, trace `litellm-acompletion`).
- 🟡 **Gợn 1:** `subagent_enabled: False` mặc định → lead_agent tự trả lời, **chưa chia việc cho 6 sub-agent** (cần bật `subagents.custom_agents.*` hoặc plan mode). Sub-agent đã nạp (config verify) nhưng chưa được kích hoạt ở turn thường.
- 🟡 **Gợn 2:** trace Langfuse **chưa tag `org_id`** (userId=None) — DeerFlow gọi LiteLLM bằng master key, không truyền metadata org_id. Cần: DeerFlow truyền org_id vào metadata call, hoặc dùng virtual key per-org.
- 🟡 **Gợn 3:** text trả lời chưa trích sạch qua API `/messages` (4 message, cấu trúc khác) — xem được trên UI workspace.

## Bước 4 — HITL từ góc CEO (⭐ mắt xích quan trọng nhất)
```
Agent định tạo thanh toán 8.000.000đ (mua nguyên liệu)
  → /v1/rules/evaluate-internal → REQUIRE_APPROVAL, tier 2, approvalId d12f7e02…, fallback=false
Hàng đợi Phê duyệt org 3f1948a3…: "spend_money | tier=2 | PENDING"
CEO bấm Duyệt → status APPROVED
(resume DeerFlow đã verify khép kín: POST /api/threads/{id}/state → 200)
```
✅ **ĐẠT khép kín** — agent *đề xuất*, CEO *quyết định*. Hành động tiền dừng lại chờ CEO, không tự chạy. Đây là quyền cao nhất của CEO trong org (GOVERNANCE §4). **Bề mặt "Phê duyệt" đã có trên sidebar workspace.**

## Bước 5 — Dolphin đọc giấy tờ
```
CEO upload ảnh CCCD → POST /parse_document {doc_type:cccd}
  → fields: {so_cccd:"034090001234", ngay_sinh:"20/11/1988"}
  → raw: "CĂN CƯỚC CÔNG DÂN … TRẦN THỊ BÌNH … Nữ … Việt Nam" (tiếng Việt CÓ DẤU)
  → confidence 0.75, warnings=[diacritics_uncertain] → đẩy CEO xác nhận (đúng HITL)
```
✅ **ĐẠT** (engine vision-fallback qua LiteLLM; contract MCP cố định — thay Dolphin-v2 GPU sau không sửa agent).

## Bước 6 — godlp enforce
- 🟡 **Chờ đủ 24h shadow** (~16:30 CEST 11/07, không rút ngắn). Findings tới giờ **sạch**: `cccd_12+phone_vn+email` đúng, **dlp_bypass=0** (svc-dlp ổn định).
- **FP đang theo dõi:** `cmnd_9` (9 số trần — có thể FP với mọi dãy 9 số); `bank_account` (keyword-neo — an toàn); `phone_vn` bắt nhầm MST bắt đầu 0[35789] (nhãn lệch, giá trị VẪN mask — an toàn). → khi đủ 24h sẽ tổng hợp trình chủ dự án trước khi enforce.

---

## MƯỢT / GỢN cho CEO (chủ dự án tự bấm thử)

| Bước | Mượt ✅ | Gợn 🟡 |
|---|---|---|
| Đăng nhập | Supabase email/mật khẩu; dev-login đã tắt | Cần SMTP xác nhận email hoạt động |
| Tạo DN | ✅ **Native trong shell DeerFlow** (hết iframe), gọi thẳng api-core, org_id đúng | — |
| **Auth workspace ↔ app** | ✅ **ĐÃ ĐÓNG:** 3 trang (Tạo DN/Gói cước/Danh bạ) là **native trong shell DeerFlow**, dùng **cầu 1-đăng-nhập** (`/v1/auth/exchange` + server route `/workspace/api/soloceo-token`). Hết 2 hệ đăng nhập, hết iframe nền tối. | Cần bấm-thử-browser để xác nhận trải nghiệm visual (công cụ chặn browse prod) |
| Chat AI | agent chạy, spawn sandbox, trace Langfuse | sub-agent chưa bật; trace chưa tag org_id; text answer khó lấy qua API |
| **HITL** | khép kín, trang Phê duyệt có sẵn | — |
| Dolphin | đọc CCCD ra JSON tiếng Việt | engine fallback (chưa Dolphin-v2 GPU) |

> **CẬP NHẬT 11/07 (đợt manus-direction override):** Gỡ 3 trang iframe web-community khỏi workspace, thay bằng **native React trong shell DeerFlow** (cùng theme, 1 đăng nhập). Cầu SSO: `POST /v1/auth/exchange` (api-core, X-Internal-Token) + Next.js route `/workspace/api/soloceo-token` (giữ INTERNAL_API_TOKEN server-side, đổi phiên DeerFlow→JWT api-core). **Verify hạ tầng:** exchange thiếu token→403, token đúng→JWT; token route 401 (cần session); 3 page compiled NATIVE (hết EmbeddedSite). Trải nghiệm visual chủ dự án tự bấm thử.

**Kết luận:** luồng lõi (đăng nhập → **tạo DN native** → chat có sandbox → **HITL khép kín** → đọc giấy tờ) **chạy được đầu-đến-cuối trên shell thống nhất**. Gợn 🔴 SSO **đã đóng**. Còn: (1) bật sub-agent + tag org_id lên trace, (2) enforce godlp (chờ 24h), (3) FlowGram node-render/exec + Midscene + dời LiteLLM (đợt sau).

> Chủ dự án tự bấm: `soloceo.vn` → đăng ký → workspace → sidebar (Tạo doanh nghiệp / Phê duyệt / Quy trình / Cộng đồng...) → chat. Đối chiếu với bằng chứng backend ở trên.
