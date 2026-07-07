# Bản vá Claw3D cho production (ADR-005, approach B)

Repo gốc iamlukethedev/Claw3D build được nhưng image KHÔNG chạy production:
1. Runtime copy node_modules prod-only (thiếu typescript) → server đọc next.config.ts
   crash "Failed to transpile". **Vá:** copy node_modules từ builder (có typescript).
2. network-policy.js chặn bind public host nếu thiếu STUDIO_ACCESS_TOKEN.
   **Vá:** assertPublicHostAllowed → no-op (Claw3D per-tenant sau subdomain riêng,
   nhúng trong platform đã xác thực).

Image: `soloceo/claw3d:patched` (build trên tenant-01). Chạy: HOST=0.0.0.0 PORT=3000,
KHÔNG set STUDIO_ACCESS_TOKEN → mở, redirect / → /office (trang 3D).
