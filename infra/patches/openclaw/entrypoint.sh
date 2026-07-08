#!/bin/sh
set -e
node /soloceo/gen-config.mjs
# Nạp sẵn bộ nhân sự AI (đầy đủ phòng ban) — không được chặn gateway nếu lỗi
node /soloceo/seed-staff.mjs || echo "[soloceo] seed-staff lỗi, bỏ qua"
# Vòng auto-approve pairing (xem auto-approve.mjs — token là biên bảo mật)
(
  sleep 20
  while true; do
    node /soloceo/auto-approve.mjs 2>/dev/null || true
    sleep 15
  done
) &
exec node openclaw.mjs gateway --allow-unconfigured
