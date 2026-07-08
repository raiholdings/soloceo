# Mẫu Web bán hàng — SoloCEO App Store

Next.js standalone tự chứa (1 container). CEO chọn từ App Store → deploy instance riêng tại `{slug}-shop.app.soloceo.vn`.

## Tùy biến qua env (svc-provision truyền lúc provisioning)
- `STORE_NAME`, `STORE_SLOGAN`, `STORE_ACCENT` — thương hiệu
- `VENTURE_ID` + `SOLOCEO_API_BASE` — lấy sản phẩm từ OS + checkout qua Payments → Revenue Ledger
- Chưa cấu hình → dùng sản phẩm mẫu + đặt hàng COD

## Sửa sâu
CEO bảo OpenClaw sửa `src/lib/store.ts` (sản phẩm) hoặc `src/app/storefront.tsx` (giao diện) — sở hữu mã nguồn.

Image: `soloceo/commerce-starter:latest` (registry localhost:5000 trên tenant-01).
