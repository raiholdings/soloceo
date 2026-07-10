# Patch: ép AIO Sandbox vào network internal (N1+N7)

DeerFlow AioSandboxProvider (local_backend) spawn container bằng `docker run` KHÔNG
có `--network` → container nằm ở bridge (có internet trực tiếp) → egress KHÔNG bị
ép qua g3.

Patch: chèn `--network $SOLOCEO_SANDBOX_NETWORK` (env-gated) vào lệnh docker run.
Đặt `SOLOCEO_SANDBOX_NETWORK=sandbox-internal` (network `--internal`, không route
internet). g3proxy nối vào sandbox-internal + coolify → sandbox chỉ ra ngoài qua g3.

Verify: sandbox spawn → direct example.com=000 (chặn), soloceo.vn qua g3=200,
example.com qua g3=000 (allowlist). Gateway vẫn điều khiển sandbox (published port).

Mount ro vào: /app/backend/packages/harness/deerflow/community/aio_sandbox/local_backend.py
Rollback: bỏ mount + unset SOLOCEO_SANDBOX_NETWORK → hành vi gốc.
