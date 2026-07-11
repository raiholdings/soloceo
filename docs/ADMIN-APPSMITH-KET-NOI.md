# Bảng quản trị Appsmith — hướng dẫn kết nối (admin.soloceo.vn)

**Quyết định (12/07/2026):** hướng lai **Appsmith (cockpit vận hành) + code riêng** (trang
`/workspace/admin` native — roadmap). Appsmith CE chạy trên **tenant-03** (82.197.71.41),
container `appsmith`, dữ liệu `/opt/appsmith`.

## 1. Việc tay để mở cửa (chủ dự án)
1. **DNS:** thêm A-record `admin.soloceo.vn → 82.197.71.41` (Cloudflare proxy TẮT lúc cấp SSL đầu).
   SSL Let's Encrypt tự cấp sau khi DNS trỏ (Traefik label đã gắn).
2. Mở https://admin.soloceo.vn → **tự đăng ký tài khoản admin đầu tiên** (form Appsmith).
   Sau khi tạo xong, vào Admin Settings → tắt signup công khai (`Form signup: disabled`).

## 2. Nguồn dữ liệu (datasources) — cấu hình trong Appsmith UI

### a) App DB (orgs/ventures/transactions/rules/approvals…) — CHỈ ĐỌC
Kiểu: **PostgreSQL** + bật **SSH Tunnel**:
| Trường | Giá trị |
|---|---|
| Host / Port (DB) | `127.0.0.1` / `15432` (socat `pg-ro-proxy` trên core-01 → app DB) |
| Database | `soloceo` |
| User / Pass | `appsmith_ro` / xem `core-01:/root/.appsmith_pg_ro` |
| SSH Host | `194.233.72.150`, port 22, user `appsmith-tunnel` |
| SSH Key | dán private key `core-01:/root/appsmith-tunnel.key` |

Bảo mật: user tunnel bị khoá `restrict,permitopen=127.0.0.1:15432` (không shell, không forward chỗ khác);
role PG chỉ SELECT. Muốn WRITE (suspend org, duyệt listing) → gọi qua api-core admin (mục b) — có audit, không sửa DB tay.

### b) api-core admin (hành động có kiểm soát)
Kiểu: **REST API** — base `https://api.soloceo.vn/v1`.
- Đăng nhập admin: JWT Supabase của tài khoản role `platform_admin` (Authorization: Bearer).
- Endpoint chính: `GET /admin/orgs`, `PATCH /admin/orgs/:id/suspend`, `GET /admin/ai-usage?groupBy=org`,
  `GET /admin/listings/pending`, `POST /admin/listings/:id/approve`, `POST /admin/installs/:id/redeploy`.

### c) Coolify (hạ tầng 4 VPS, deploy, tenant apps)
Kiểu: **REST API** — base `http://194.233.72.150:8000/api/v1`, header `Authorization: Bearer <token>`
(token: `core-01:/root/.coolify_token_new`). Lưu ý: chỉ gọi từ mạng tin cậy; cân nhắc tạo token
read-only riêng cho Appsmith.

### d) LiteLLM (chi phí AI, virtual keys, budget)
Kiểu: **REST API** — base `https://llm.soloceo.vn`, Bearer = master key (env container LiteLLM trên core-01).
Endpoint hay dùng: `GET /key/info?key=…`, `GET /spend/logs`, `POST /key/update` (nâng/hạ budget org).

### e) Langfuse (trace LLM)
`https://trace.soloceo.vn` — xem trực tiếp hoặc REST với keys tại `tenant-02:/opt/langfuse/.env`.

## 3. Màn hình gợi ý dựng trước (cockpit v1)
1. **Tổng quan hệ sinh thái**: đếm org/venture theo trạng thái (SQL), doanh thu 30 ngày (Transaction),
   AI spend theo org (LiteLLM), tenant node RAM (Coolify `/servers`).
2. **Org & Venture**: bảng + tìm kiếm; nút Suspend (gọi api-core, xác nhận 2 bước).
3. **Trợ lý mặc định**: bảng đọc thư mục qua gateway `GET /api/agents` (X-DeerFlow-Internal-Token) —
   xoá/sửa CHỈ từ đây (user thường bị 409).
4. **Cài đặt app (Marketplace)**: bảng AppInstall + nút redeploy.
5. **Duyệt M&A**: listings pending → approve.

## 4. Vận hành
- Nâng cấp: `docker pull appsmith/appsmith-ce && docker rm -f appsmith && chạy lại lệnh run` (labels giữ nguyên,
  dữ liệu ở volume `/opt/appsmith`).
- Backup: tar `/opt/appsmith` (đã chứa cấu hình + app + Mongo nhúng).
- Roadmap "code riêng": trang `/workspace/admin` native (role platform_admin) cho nghiệp vụ dùng hằng ngày
  (duyệt M&A, suspend) — đồng theme shell, dùng chung api-core admin.
