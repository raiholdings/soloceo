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

## Vá #4 — floor mặc định + UPSTREAM_ALLOWLIST (08/07)
4. `src/lib/office/floors.ts`: `DEFAULT_ACTIVE_FLOOR_ID` "lobby" → "openclaw-ground"
   (lobby = demo không nối gateway thật; CEO mở lên là floor OpenClaw thật luôn).
5. QUAN TRỌNG: browser KHÔNG nối gateway trực tiếp — Claw3D proxy WS server-side
   qua `/api/gateway/ws` (server/gateway-proxy.js). Trong production proxy TỪ CHỐI
   mọi upstream nếu thiếu env `UPSTREAM_ALLOWLIST` → lỗi "Gateway closed (1011)".
   svc-provision truyền `UPSTREAM_ALLOWLIST={slug}-ai.app.soloceo.vn`.

## Vá #6 (ĐÃ GỠ) → Vá #7 — trả token thật qua /api/studio (mắt xích CUỐI)
Trình duyệt không bao giờ nhận token thật (API /api/studio chỉ trả
`tokenConfigured: true`) → frame connect luôn `auth=none` → "token_missing".
Thử #6: proxy tiêm token vào frame → THẤT BẠI với lỗi "device signature
invalid" vì device auth của client KÝ cả token trong payload
(buildDeviceAuthPayload gồm `token`) — proxy sửa payload là phá chữ ký. ĐÃ GỠ.
Vá #7 (đúng): `sanitizeStudioGatewaySettings` (src/lib/studio/settings.ts)
trả `token` thật kèm tokenConfigured (types Public thêm `token?`). Client
GatewayClient.ts VỐN chấp nhận cả 2 dạng ({url,token} và {url,tokenConfigured})
→ tự dùng token, ký đúng, kết nối. Chấp nhận được vì instance per-tenant.
⚠️ TODO bảo mật trước pilot thật: trang Claw3D của tenant đang public —
ai mở URL cũng đọc được token → cần bật access-gate (STUDIO_ACCESS_TOKEN)
hoặc auth SSO cho claw3d.
