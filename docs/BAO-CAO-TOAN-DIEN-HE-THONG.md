# SOLOCEO.VN — BÁO CÁO TOÀN DIỆN HỆ THỐNG
**Ngày:** 13/07/2026 · **Chủ dự án:** Phạm Văn Thư · Mọi mục ghi ✅ đều đã verify bằng bằng chứng thật (HTTP code / log / dữ liệu).

---

## 1. SẢN PHẨM
**soloceo.vn = Hệ điều hành AI cho doanh nghiệp một người.** CEO kể ý tưởng → AI đánh giá, ghép mô hình kinh doanh, lập đội trợ lý → đội AI làm việc thật trong sandbox → mọi quyết định tiền/pháp lý dừng chờ CEO phê duyệt → doanh thu ghi sổ cái verified (nền cho Sàn M&A).

## 2. HẠ TẦNG — 4 VPS (Coolify điều khiển tập trung)
| Node | IP | Vai trò |
|---|---|---|
| core-01 | 194.233.72.150 | Coolify controller, api-core (NestJS), Supabase, LiteLLM (:4000), svc-dlp, svc-rules-engine, dolphin-docs, svc-provision, svc-billing-webhooks. ⚠ 11GB RAM — kiệt |
| tenant-01 | 62.146.235.177 | WoWonder (my.soloceo.vn), registry cục bộ, app tenant cũ |
| tenant-02 | 194.233.85.255 | **DeerFlow** (soloceo.vn), AIO Sandbox, g3proxy, Langfuse (trace.soloceo.vn), kho trợ lý + gói BM |
| **tenant-03** | 82.197.71.41 (94GB/678GB/18 cores) | **Node PaaS** — mọi app CEO mua từ Chợ provision tại đây; Appsmith (admin.soloceo.vn); registry cục bộ |

Nhánh production: `soloceo-mvp` (GitHub → Coolify tự build). Backup trợ lý/gói trong repo.

## 3. TÁM NỀN TẢNG v2 (DeerFlow + 7 vệ tinh)
| # | Nền tảng | Trạng thái | Vai trò với CEO |
|---|---|---|---|
| N0 | DeerFlow | 🟢 LIVE | Bộ não chat — lead agent + 6 sub-agent (Kinh doanh/Marketing/Nội dung/Vận hành/Kế toán/Nghiên cứu) |
| N1 | AIO Sandbox | 🟢 LIVE+verify | "Máy tính của DN" — agent dựng web/soạn file, CEO xem live; spawn per-thread, cô lập mạng |
| N7 | g3proxy | 🟢 LIVE+verify | Canh cửa internet — sandbox chỉ ra ngoài qua allowlist (direct→000, allowlist→200) |
| N5 | godlp | 🟢 **ENFORCE**+verify | Che CCCD/SĐT/STK trước khi prompt rời hệ thống (model nhận `****789`) — Nghị định 13 |
| N4 | Sub-agents+skills | 🟢 LIVE | 6 nhân sự AI + 6 skill VN mount vào sandbox |
| N6 | Dolphin | 🟢 LIVE (engine-fallback) | Kéo ảnh CCCD/GPKD/hoá đơn vào chat → dữ liệu có cấu trúc |
| N3 | Midscene | 🟡 prereq sẵn, chưa wiring `browser_act` | AI thao tác web hộ (Assist) — nợ |
| N2 | FlowGram | 🟡 canvas render, chưa node-render/exec | Quy trình kéo-thả — nợ |
| N8 | Zalo OA | 🟡 webhook+chữ ký verify | Chờ credential OA của chủ dự án |
| — | HITL 2 tầng | 🟢 khép kín | arishem gate → hàng chờ ApprovalRequest → trang Phê duyệt → resume |

## 4. TRẢI NGHIỆM CEO — TỪNG BƯỚC (luồng vàng)
1. **Trang chủ soloceo.vn** → nút **"Bắt đầu ngay"** (hero) → đăng nhập/đăng ký (BetterAuth, 1 tài khoản duy nhất — SSO bridge sang api-core tự động).
2. **`/workspace/bat-dau` — khai báo ý tưởng** ✅: form 6 trường (tên DN, ngành, ý tưởng, vốn, kênh bán, mục tiêu) → hệ thống tạo Org+Venture.
3. **AI đánh giá ý tưởng** ✅ (`POST /v1/onboard/danh-gia`, ~20s): điểm /10 + nhận xét thẳng (điểm mạnh, rủi ro, khả thi theo vốn) → ghép **2-3 gói Mô hình kinh doanh** + **5-7 trợ lý AI** + **4-6 nền tảng** đúng ý tưởng + **việc đầu tiên** → workspace chỉ setup phần liên quan (lưu `soloceo-setup`). *Test thật: "bánh healthy 50tr" → 7/10, chọn D2C+Subscription, cảnh báo chi phí nguyên liệu nhập.*
4. **"Giao cho đội AI làm ngay"** → vào thread chat, lead agent phân công sub-agent, làm trong sandbox (xem live), kết quả tiếng Việt dùng được ngay.
5. **Sidebar hằng ngày** (đã dọn gọn):
   - **Cuộc trò chuyện mới / Trò chuyện** — chat đội AI
   - **Trợ lý AI** — **94 trợ lý mặc định** (Cố vấn Định giá, Đàm phán, Blue Ocean, OKR, Lean Startup, KPI, Kanban, Agile, Thương hiệu…) — user KHÔNG xoá/sửa được (409, chỉ admin)
   - **Chợ ứng dụng** — mua nền tảng (OpenClaw, Web bán hàng, ERPNext): cài 1 chạm → provision lên tenant-03 (~70s RUNNING), gỡ 2 bước, vượt gói → CTA nâng cấp
   - **Mô hình kinh doanh** — **39 gói đóng trọn** (Web3, D2C, Subscription, Agritech, FBA, AI, API…): công thức tạo–trao–giữ, 5 hướng theo độ khó, lộ trình 90 ngày 4 pha, map 8 nền tảng từng bước, mỗi bước "Giao cho đội AI", tick tiến độ; tìm kiếm + lọc nhóm; gói mới tự hiện không cần rebuild
   - **Phê duyệt** — hàng chờ HITL: agent muốn chi tiền/ký/gửi → dừng đây chờ CEO Duyệt/Từ chối
   - **Quy trình** — FlowGram canvas (đang hoàn thiện)
   - **Việc theo lịch / Cộng đồng / Video / Nhóm chat**
6. **Settings and more** (menu dưới) ✅ đã dọn: hết link deerflow.tech/GitHub/mailto cũ → **Doanh nghiệp của tôi** (bảng điều hành: tiến độ, hàng chờ duyệt, doanh thu mtd/ttm, badge verified) + **Gói cước** + **Danh bạ**; Settings dialog (giao diện/thông báo/bộ nhớ/công cụ/kỹ năng) là tính năng gốc hoạt động bình thường.
7. **Upload giấy tờ** — kéo ảnh CCCD/GPKD vào chat → Dolphin đọc ra JSON, tự điền hồ sơ.
8. **Docs** — soloceo.vn/vi/docs (tiếng Việt, chuyển EN/VI).

## 5. TRẢI NGHIỆM ADMIN (chỉ tài khoản ADMIN_EMAILS)
1. Đăng nhập workspace như thường → sidebar hiện thêm **"Quản trị"** ✅ `/workspace/admin`: 5 tab — Tổng quan (org/venture/app/doanh thu 30d/hàng chờ), Org & Gói (suspend↔activate 2 bước, audit log), Venture & App, Phê duyệt (giám sát), Trợ lý mặc định (94 con, token server-side).
2. **Appsmith** admin.soloceo.vn ✅ (SSL thật, signup khoá) — kéo-thả nâng cao; tờ dán credential: `core-01:/root/APPSMITH-PASTE.txt` (5 datasource + SQL cockpit, đã verify từng kênh).
3. **Coolify** — hạ tầng 4 node, deploy, logs.
4. **Langfuse** trace.soloceo.vn — trace + chi phí LLM; LiteLLM budget per-org (virtual key, vượt → 429).

## 6. TÀI SẢN TRI THỨC (từ 178+118 PDF bản quyền)
| Tài sản | Số lượng | Nguồn |
|---|---|---|
| Trợ lý AI mặc định | **94** | 48 Siêu hướng dẫn + 46 kho Mô hình KD (Pricing, GTM, OKR…) |
| Gói Mô hình kinh doanh | **39** | 38 factory + Web3 flagship viết tay |
| Pipeline | `factory_agents.py` + `factory_bm.py` | Idempotent, dedupe hash, trần chi phí key ảo $15 (đã dùng ~$0.5), thêm PDF mới = chạy lại 1 lệnh |
Nguyên tắc bản quyền: chưng cất diễn giải lại + ghi nguồn, không chép nguyên văn. Backup trong repo.

## 7. LUỒNG TIỀN & AN TOÀN
- Payments: Stripe + PayOS webhook idempotent → Transaction ledger → ttmRevenue/badge verified (test-mode verify từ GĐ5; **chưa có giao dịch live** — chờ quyết định C.4 openclawos: sản phẩm/giá/cổng/kênh).
- An toàn bất biến: LLM 100% qua LiteLLM; multi-tenant org_id + RLS; HITL không tắt; godlp fail-open; Midscene cấm CAPTCHA/ký số/VNeID; không xoá cứng (ARCHIVE); secrets ngoài git; audit admin.

## 8. NỢ CÒN LẠI + VIỆC TAY CHỦ DỰ ÁN
**Nợ kỹ thuật:** N2 FlowGram node-render/exec · N3 Midscene browser_act · trace tag org_id sâu · dời LiteLLM sang tenant-02 (runbook sẵn, chờ DNS `llm`) · Dolphin-v2 GPU · OpenClaw Control UI device-auth · thanh toán mua app trong Chợ (mức C).
**Việc tay đang chờ anh:** (1) DNS wildcard `*.app.soloceo.vn` → 82.197.71.41 để app CEO mua sống public; (2) 4 quyết định C.4 để openclawos ra tiền thật; (3) credential Zalo OA; (4) DNS `llm` nếu duyệt dời LiteLLM; (5) đổi mật khẩu Appsmith (đã lộ trong chat).

— HẾT —
