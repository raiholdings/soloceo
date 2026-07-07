# Bản vá Claw3D cho production (ADR-005, approach B)

Repo gốc iamlukethedev/Claw3D build được nhưng image KHÔNG chạy production:
1. Runtime copy node_modules prod-only (thiếu typescript) → server đọc next.config.ts
   crash "Failed to transpile". **Vá:** copy node_modules từ builder (có typescript).
2. network-policy.js chặn bind public host nếu thiếu STUDIO_ACCESS_TOKEN.
   **Vá:** assertPublicHostAllowed → no-op (Claw3D per-tenant sau subdomain riêng,
   nhúng trong platform đã xác thực).
3. `next.config.ts` đặt `securityHeaders` với CSP `frame-ancestors 'self'` +
   header `X-Frame-Options: SAMEORIGIN` → chặn nhúng iframe vào platform.soloceo.vn
   (nền desktop 3D không hiện). **Vá** (sửa trực tiếp `/opt/claw3d-build/next.config.ts`
   trên tenant-01):
   - `frame-ancestors 'self'` → `frame-ancestors 'self' https://platform.soloceo.vn https://soloceo.vn`
   - gỡ hẳn khối `{ key: "X-Frame-Options", value: "SAMEORIGIN" }`
     (X-Frame-Options không cho phép cross-origin cụ thể → dựa vào CSP frame-ancestors).

Image: `soloceo/claw3d:patched` (build trên tenant-01). Chạy: HOST=0.0.0.0 PORT=3000,
KHÔNG set STUDIO_ACCESS_TOKEN → mở, redirect / → /office (trang 3D). Sau vá #3,
`/office` trả CSP cho phép platform.soloceo.vn nhúng làm nền desktop OS Shell.
