# 10 kết quả đầu `github.com/search?q=Open` — dựng được cho platform.soloceo.vn?

**Ngày:** 21/07/2026 · **Nguồn:** GitHub Search API (q=Open, trang 1) + kiểm license/Dockerfile trực tiếp từng repo
**Trang xem trực quan (Artifact):** https://claude.ai/code/artifact/45659b64-7cf6-40c9-a3d9-f9d91a9b4151

## Mục đích
Mô tả **đúng 10 repo đầu trang tìm kiếm "Open"** (10 tab bạn mở), theo thứ tự GitHub trả về, và trả lời:
1. **Đẩy VPS được không?** (có Docker, self-host)
2. **Cho CEO đăng ký dùng được không?** (self-host + license cho phép cung cấp)
3. **Cái nào không đưa lên VPS được?** (thư viện/CLI/repo rác — không phải web-app đa tenant)

## Kết quả nhanh
> **Chỉ 3/10** kết quả đầu thực sự dựng được cho CEO. Gõ trần chữ "Open" trả về **đủ loại** — thư viện, công cụ CLI, cả 1 repo rác — search từ khoá **không lọc** theo "web-app tự dựng". Muốn đúng mục tiêu phải chọn tay (xem mục cuối).

| # | Repo | License | ★ | Là gì | Kết luận |
|---|------|---------|---|-------|----------|
| 1 | **sindresorhus/open** | MIT | 3,5k | Thư viện Node mở URL/file | 🔴 Không — là library |
| 2 | **openclaw/openclaw** | MIT | rất nhiều | Trợ lý AI cá nhân đa kênh (WhatsApp/Telegram/Slack) | 🟢 **Nhóm A** — Docker, 1 user/instance đúng per-tenant; SoloCEO đã dùng |
| 3 | **OpenHands/OpenHands** | MIT | 81k | Agent AI tự viết code (cũ: OpenDevin) | 🟢 **Nhóm A** — Docker (DinD nặng) |
| 4 | **opencv/opencv** | Apache-2.0 | 90k | Thư viện thị giác máy tính | 🔴 Không — là library |
| 5 | **FoundationAgents/OpenManus** | MIT | 57k | Framework dựng agent AI (bản mở Manus) | 🟡 **Nhóm B** — chạy local `python main.py`, phải tự thêm multi-tenant; trùng DeerFlow |
| 6 | **client69/Open** | none | 43 | Repo rác Hacktoberfest | 🔴 Không — không phải dự án thật |
| 7 | **OpenCut-app/OpenCut** | MIT | 76k | Trình sửa video web (thay CapCut) | 🟡 **Nhóm B** — web self-host được nhưng **đang viết lại**, chưa rõ Docker chính thức |
| 8 | **open-webui/open-webui** | Custom | 146k | Giao diện chat AI kiểu ChatGPT | 🟡 **Nhóm B** — Docker tốt nhưng **buộc giữ thương hiệu "Open WebUI"** → khó white-label |
| 9 | **OpenBB-finance/OpenBB** | AGPL-3 | 71k | Nền tảng dữ liệu tài chính/đầu tư | 🟢 **Nhóm A** — Docker (FastAPI), AGPL per-tenant OK; niche/nặng |
| 10 | **anomalyco/opencode** | MIT | 187k | Agent lập trình chạy terminal (CLI) | 🔴 Không — CLI chạy máy cá nhân |

## Chi tiết & lý do

### 🟢 Nhóm A — dựng được cho CEO đăng ký (3/10)
- **openclaw/openclaw** (MIT) — trợ lý AI cá nhân đa kênh. Có Docker, thiết kế 1 user/instance = **đúng mô hình per-tenant**. SoloCEO vốn đã chạy OpenClaw cho từng CEO → khả thi nhất.
- **OpenHands/OpenHands** (MIT) — agent AI tự viết code/tự động hoá. Docker ✓ nhưng chạy **Docker-in-Docker** (mỗi phiên 1 sandbox) → tốn RAM/CPU, đặt node riêng.
- **OpenBB-finance/OpenBB** (AGPL-3) — nền tảng dữ liệu tài chính. Docker (FastAPI) ✓, AGPL per-tenant OK (không giấu mã). Niche — hợp CEO fintech.

### 🟡 Nhóm B — đẩy VPS được nhưng lưu ý (3/10)
- **FoundationAgents/OpenManus** (MIT) — framework agent AI (bản mở Manus). Có Dockerfile nhưng chạy kiểu local, **phải tự thêm multi-tenancy/auth/hosting**. Trùng vai trò DeerFlow SoloCEO đã có → giá trị thấp.
- **OpenCut-app/OpenCut** (MIT) — trình sửa video web thay CapCut, cho người làm nội dung. Web self-host được nhưng **đang viết lại kiến trúc** (Rust, đa nền tảng), chưa có hướng dẫn Docker/self-host rõ → theo dõi thêm.
- **open-webui/open-webui** (Custom) — giao diện chat AI kiểu ChatGPT (Ollama + OpenAI-compat, RAG). Self-host tốt **nhưng license buộc giữ thương hiệu "Open WebUI"** trừ khi <50 user → khó white-label thành thương hiệu SoloCEO ở quy mô lớn.

### 🔴 Không đưa lên VPS được (4/10)
- **sindresorhus/open** (MIT) — thư viện Node mở URL/file. Là package lập trình, không phải phần mềm chạy.
- **opencv/opencv** (Apache) — thư viện thị giác máy tính. Nhúng vào phần mềm, không có dịch vụ.
- **client69/Open** (no license) — repo rác Hacktoberfest, không phải dự án thật.
- **anomalyco/opencode** (MIT) — agent lập trình chạy **terminal/CLI** trên máy dev, không phải web đa tenant.

**Dấu hiệu "không dựng được":** repo là *library · SDK · CLI chạy local · spec · repo rác/firmware*.

---

## Ngoài trang 1 — các "Open*" đáng thêm THẬT cho platform

Vì search từ khoá quá nhiễu, đây là các Open* (đã kiểm license/Docker) **lấp đúng khoảng trống** của SoloCEO (đã có CRM/CSKH/cộng đồng/LMS/video/ERP/AI hub):

| Ưu tiên | Dự án | License | Vì sao |
|---------|-------|---------|--------|
| ★★★ | **OpenSign** (OpenSignLabs/OpenSign) | AGPL-3 | Ký hợp đồng điện tử — nhu cầu thật mọi Solo CEO, hệ chưa có |
| ★★★ | **OpenProject** (opf/openproject) | GPL-3 | Quản lý dự án/công việc — lấp khoảng trống PM |
| ★★ | **OpenReplay** (openreplay/openreplay) | AGPL-3 | Session replay/analytics — CEO có web xem hành vi khách |
| ★★ | **OpenObserve** (openobserve/openobserve) | AGPL-3 | Logs/metrics; free 50GB/ngày dùng thương mại |
| ★ | **OpenIM / Openfire** | Apache-2.0 | Chat nội bộ đội nhóm — license sạch nhất |

*(Các mục này có bản thẩm định chi tiết ở phiên bản trước của tài liệu; tất cả đều Docker + không dính bẫy Elastic License/SSPL.)*

## Cách triển khai (mô hình đã có với ERPNext/OpenClaw)
1. Đóng gói docker-compose từng app vào `infra/coolify/templates/`.
2. WHMCS platform.soloceo.vn bán như "dịch vụ PaaS" → CEO đăng ký.
3. svc-provision gọi Coolify tạo project riêng + subdomain `{slug}.app.soloceo.vn`.
4. AGPL/GPL: giữ link tải mã nguồn công khai (không giấu) để tuân thủ.

---
*License có thể đổi theo thời gian — rà lại trước khi thương mại hoá quy mô lớn (đặc biệt Open WebUI & các bản open-core).*
