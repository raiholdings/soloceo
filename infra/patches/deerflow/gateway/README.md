# Patch: CSRF bypass cho internal token (HITL resume)

DeerFlow gateway bắt CSRF double-submit cookie cho mọi POST/PUT/DELETE/PATCH.
api-core (server-to-server) gọi `POST /api/threads/{id}/state` để RESUME thread
sau khi CEO duyệt — không phải trình duyệt, không có cookie CSRF → bị 403.

Patch thêm 1 nhánh đầu `dispatch`: request mang `X-DeerFlow-Internal-Token` hợp lệ
được miễn CSRF (auth_middleware đã tin token này). Không mở cho request thường.

Áp dụng: mount đè file này vào
  /app/backend/app/gateway/csrf_middleware.py  (ro)
qua docker-compose gateway. File gốc: csrf_middleware.py.orig trên VPS.
