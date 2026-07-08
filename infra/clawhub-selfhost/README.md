# ClawHub self-host — Chợ kỹ năng riêng của SoloCEO

Registry Skills/Plugins riêng cho cộng đồng Solo CEO, chạy 100% trên hạ tầng
SoloCEO (VPS tenant-02, 194.233.85.255). Thay clawhub.ai công cộng.

- **hub.soloceo.vn** — web ClawHub (đăng/tìm/cài skill, tài khoản Creator)
- **convex-api.soloceo.vn** — Convex backend (WebSocket reactive, cổng 3210)
- **convex-site.soloceo.vn** — Convex HTTP actions + API /api/v1 + auth callbacks (3211)

## Kiến trúc
ClawHub (github.com/openclaw/clawhub) = web TanStack Start + backend **Convex**.
Self-host = convex-backend open-source (Docker) + web frontend build sẵn, đều
trên network `coolify` (Traefik + Let's Encrypt tự cấp SSL).

## BÀI HỌC then chốt — timeout 4s khi deploy
`bunx convex deploy` bộ function lớn của ClawHub → `InvalidModules: Function
execution timed out (maximum duration: 4s)`. Biến env **`ISOLATE_ANALYZE_USER_TIMEOUT_SECONDS`**
(ẩn, không có trong `--help`; tìm bằng `grep -a` binary) chỉnh được → đặt =120
+ `ISOLATE_MAX_HEAP_FOR_ANALYZE=2GB`. Đây là chìa khoá để self-host thuần chạy
được (không cần Convex Cloud).

## Các bước dựng (tenant-02)
1. Cài Docker + Node 22 + Bun (`unzip` là prereq của bun).
2. `docker compose up -d` (convex-backend + clawhub-frontend) — xem docker-compose.yml.
3. Admin key: `docker compose exec convex-backend ./generate_admin_key.sh`.
4. `.env.local` clawhub: `CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210` + admin key.
5. Sinh JWT keys (RS256) → set backend: `bunx convex env set -- JWT_PRIVATE_KEY "$PEM"`
   (dùng `--` vì PEM bắt đầu `-----` bị hiểu là option), JWKS, SITE_URL.
6. `bunx convex deploy --yes` (đã nâng timeout ở compose).
7. Build web: `bun run build` → `.output` → image `soloceo/clawhub-frontend` (Dockerfile.frontend).
8. Frontend cần env RUNTIME: VITE_CONVEX_URL, VITE_CONVEX_SITE_URL, CONVEX_SITE_URL, SITE_URL.
9. **extra_hosts** cho frontend: convex-api/convex-site → IP Traefik nội bộ (172.18.0.2)
   để SSR khỏi hairpin NAT (VPS không tự gọi domain public của mình).

## Nối OpenClaw của CEO
svc-provision đặt env `CLAWHUB_URL=https://hub.soloceo.vn` cho mọi OpenClaw
(worker.ts APP_CONFIGS.openclaw) → CEO tìm/cài skill từ registry SoloCEO.

## CÒN THIẾU (cần key user)
- **Vector search + seed corpus**: cần `OPENAI_API_KEY` (embeddings text-embedding-3-small)
  set trên backend. Hiện search timeout 1s; browse/list vẫn chạy.
- **Login/Publish Creator**: cần GitHub OAuth app → `bunx convex env set AUTH_GITHUB_ID/SECRET`.
- Kho hiện RỖNG — SoloCEO publish skill đầu tiên qua `clawhub` CLI hoặc web sau khi bật OAuth.
