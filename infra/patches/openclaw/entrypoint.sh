#!/bin/sh
set -e
node /soloceo/gen-config.mjs
# Vòng auto-approve pairing (xem auto-approve.mjs — token là biên bảo mật)
(
  sleep 20
  while true; do
    node /soloceo/auto-approve.mjs 2>/dev/null || true
    sleep 15
  done
) &
exec node openclaw.mjs gateway --allow-unconfigured
