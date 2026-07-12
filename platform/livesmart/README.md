# LiveSmart Video → meeting.soloceo.vn (Zoom của SoloCEO)

**Bản:** LiveSmart Server Video 1.0.14 (WebRTC SFU mediasoup) — bản quyền thương mại của chủ dự án.
**Node:** tenant-03 (82.197.71.41). Container `livesmart`, image `soloceo/livesmart:1.0.14`.

## Kiến trúc
- **Signaling HTTP/WebSocket** qua Traefik: `meeting.soloceo.vn:443` → container:9002 (httpolyglot phục vụ cả HTTP).
- **Media WebRTC (UDP)** KHÔNG qua Traefik: publish trực tiếp host `40000-40049/udp`, `announcedIp=82.197.71.41`.
- Không cần DB (serverSide.checkRoom/loginForm/chatHistory = false).
- Cert tự ký trong container (Traefik là lớp TLS thật, Let's Encrypt tự cấp khi DNS trỏ).

## Chạy lại (đã có image)
Xem lệnh `docker run` đầy đủ trong runbook: labels Traefik meeting.soloceo.vn + `-p 40000-40049:40000-40049/udp`
+ env LSV_ANNOUNCED_IP=82.197.71.41, LSV_API_SECRET (/root/.lsv_api_secret), backend scheme HTTP (KHÔNG https — cert tự ký gây 500).

## Đồng bộ đăng nhập (SSO-lite)
Vào phòng qua URL `meeting.soloceo.vn/{room}?p=base64({visitorName|agentName})`. Trang workspace
`/workspace/hop-video` tự điền tên từ tài khoản đã đăng nhập (WoWonder/BetterAuth) → không gõ lại tên.
Đồng bộ token sâu (validate phiên WoWonder trong LiveSmart) = việc mở rộng sau.

## Việc tay chủ dự án
DNS A-record `meeting.soloceo.vn → 82.197.71.41` (Cloudflare proxy TẮT lúc cấp SSL đầu). SSL tự cấp sau.
