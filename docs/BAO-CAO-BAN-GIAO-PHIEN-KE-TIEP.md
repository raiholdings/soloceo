
---

## 8. BỔ SUNG 12/07 — MARKETPLACE + NODE PaaS tenant-03 (E2E verify)

- **VPS mới tenant-03 = 82.197.71.41** (94GB RAM/678GB/18 cores) vào Coolify (uuid `f11w7uel8sap8mbzeuoivpxo`), coolify-proxy+sentinel healthy. **Đây là node provision mặc định cho CEO** (svc-provision env `SOLOCEO_TENANT_SERVER_UUID`).
- **Chợ ứng dụng** `/workspace/cho-ung-dung` (sidebar ngay sau Trợ lý AI): grid catalog theo nhóm, cài 1 chạm, poll QUEUED→RUNNING, gỡ 2 bước, FAILED→thử lại, 402→CTA nâng gói, venture selector. Component `soloceo-marketplace.tsx` (mirror `infra/patches/deerflow/native-pages/`).
- **openclaw bật lại**: plans.ts (+STARTER/GROWTH), worker.ts APP_CONFIGS (port 18789, token random per-job), CatalogApp active=true.
- **Registry cục bộ mỗi node** (`localhost:5000` đồng nhất): tenant-03 có `soloceo-registry` + image `soloceo/openclaw:soloceo4` (pipe từ tenant-01).
- **E2E verify:** POST installs {openclaw} cho venture openclawos → RUNNING ~70s, container healthy trên tenant-03, Traefik HTTPS **200** (`--resolve :443:82.197.71.41`).
- **⛔ CHẶN DNS (việc tay):** wildcard `*.app.soloceo.vn` vẫn trỏ tenant-01 (62.146.235.177) → URL public chưa tới tenant-03. Khuyến nghị chuyển wildcard → **82.197.71.41**.
- Nợ mới ghi nhận: image openclaw đang `dangerouslyDisableDeviceAuth=true` cho Control UI (rà lại trước khi bán rộng); thanh toán mua app trong chợ (đường tiền mức C — chờ quyết định giá/cổng).
