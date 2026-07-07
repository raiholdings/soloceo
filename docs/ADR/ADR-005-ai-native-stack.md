# ADR-005 — Chuyển sang bộ công cụ AI-native: ERPNext + Claw3D + OpenClaw

**Trạng thái:** ĐÃ CHỐT bởi Phạm Văn Thư — 08/07/2026. Thay thế lựa chọn App Store trong CLAUDE.md Phần 7.1.

## Quyết định
Khi Solo CEO mở tài khoản, nền tảng cài sẵn (mặc định) 3 công cụ mới, BỎ 5 app cũ:

| Vai trò | Công cụ mới | Thay cho (bỏ) |
|---|---|---|
| Giao diện 3D (nền desktop OS Shell) | **Claw3D** (iamlukethedev/Claw3D) — văn phòng ảo 3D | — |
| Lớp ra lệnh AI, kết nối mọi hoạt động | **OpenClaw** (openclaw/openclaw) — trợ lý AI gateway | AI Studio (Dify) |
| Quản trị doanh nghiệp (ERP) | **ERPNext** (frappe/erpnext) — kế toán, kho, CRM, HR | CRM Twenty, Commerce Medusa, Automation (Activepieces), Website Next.js |

Kiến trúc: Claw3D (frontend 3D) → nối OpenClaw Gateway (+ Hermes runtime) → điều khiển ERPNext + các hoạt động SoloCEO. LLM vẫn BẮT BUỘC qua LiteLLM (nguyên tắc bất biến).

## Hệ quả & RỦI RO (bắt buộc theo dõi)
1. **RAM rất nặng.** ERPNext (MariaDB + Redis + nhiều Frappe worker + socketio) ~2–4GB/instance; Claw3D (Next.js) ~0.5–1GB; OpenClaw gateway ~0.5GB. **Per-tenant ~3–5GB** → tenant-01 (12GB) chỉ chứa ~2 tenant. **Cần mua thêm VPS trước khi mở pilot rộng**, hoặc chạy ERPNext dạng dịch vụ dùng chung + site per-tenant.
2. **Không phải "docker run" đơn giản.** ERPNext cần Frappe bench tạo site + cài app; OpenClaw cần onboarding (gateway/workspace/channels/skills); Claw3D cần backend OpenClaw+Hermes chạy trước. Provisioning phải nhiều bước, cần lặp để hoàn thiện.
3. **Dify license (ADR-001) không còn áp dụng** vì bỏ Dify. Đổi lại, rà license: ERPNext (GPLv3 — được dùng/bán dịch vụ), Claw3D + OpenClaw (kiểm tra LICENSE repo trước go-live thương mại).
4. Venture cũ đã cài app cũ: giữ nguyên (không xoá dữ liệu); catalog mới chỉ áp cho venture mới launch.

## Việc đã làm ở bước này
- Reseed catalog: bỏ 5 app cũ, thêm erpnext/claw3d/openclaw.
- Template Coolify compose cho 3 tool.
- OS Shell: nền desktop render Claw3D của tenant (iframe), vùng đen khi chưa provisioning.
- Default launch apps = [claw3d, openclaw, erpnext].

## Việc CÒN LẠI (chưa xong, cần lặp + tài nguyên)
- Hoàn thiện provisioning nhiều bước cho ERPNext (tạo site) + OpenClaw onboarding + nối Claw3D→OpenClaw.
- Mua thêm VPS-TENANT cho RAM.
- Rà license Claw3D/OpenClaw.
