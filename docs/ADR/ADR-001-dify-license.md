# ADR-001 — License Dify cho AI Studio

**Trạng thái:** Chấp nhận cho MVP — PHẢI rà soát lại trước go-live thương mại.
**Ngày:** 07/07/2026

## Bối cảnh
Dify bản open-source có điều kiện license về multi-tenant SaaS và yêu cầu giữ logo.
SoloCEO bán AI Studio như một phần gói cước — rủi ro vi phạm nếu vận hành Dify
dạng multi-tenant chung.

## Quyết định
MVP dùng mô hình **mỗi tenant 1 instance Dify riêng của chính tenant đó** (deploy
qua Coolify vào project riêng của tenant) để giảm rủi ro license.

## Điều kiện ràng buộc
- TRƯỚC khi thu phí AI Studio ở quy mô lớn: rà điều khoản multi-tenant của Dify
  hoặc mua bản thương mại, hoặc chuyển phương án (Flowise/Langflow).
- Không tự ý quyết — cần người vận hành (Phạm Văn Thư) phê duyệt.
