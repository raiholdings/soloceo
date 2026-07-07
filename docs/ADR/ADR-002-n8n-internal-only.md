# ADR-002 — n8n chỉ dùng nội bộ RAI

**Trạng thái:** Chấp nhận (bất biến).
**Ngày:** 07/07/2026

## Bối cảnh
n8n dùng Sustainable Use License — CẤM bán lại dạng dịch vụ cho khách hàng.

## Quyết định
- Tuyệt đối KHÔNG đóng gói n8n vào App Store bán cho tenant.
- Automation cho tenant dùng **Activepieces Community Edition (MIT)** — xem ADR-003.
- n8n chỉ chạy nội bộ RAI (báo cáo tuần, cảnh báo admin).
