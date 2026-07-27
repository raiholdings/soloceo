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

## Vá quan trọng (13/07): stub /server/script.php
LiveSmart client gọi `server/script.php` (PHP) khi mở phòng — image node KHÔNG có PHP → 404 → phòng
loading vô tận. Fix: thêm route Node `app.all('/server/script.php')` trong `src/livesmart.js` (sau
`app.use(express.json())` + thêm `express.urlencoded`) trả mặc định (getvirtualimages→[], còn lại→"").
Các tính năng cần PHP+MySQL (lưu chat/thanh toán/checkroom) đều tắt trong config nên không cần DB.
Bản vá đầy đủ: `livesmart.js.patched`. Rebuild image + recreate container (giữ nguyên labels+UDP+env).
Cũng nhớ: DNS thêm sau → phải restart coolify-proxy để Traefik xin Let's Encrypt (nếu không cert=self-signed→trình duyệt loading).

## Vá QUAN TRỌNG NHẤT (13/07): cờ kích hoạt `turnon` trong config.json
**Đây mới là nguyên nhân gốc treo loading vô tận** (stub script.php ở trên chỉ là 1 phần). Khi mở phòng,
client chạy `startRoom()` mở đầu bằng giải mã AES `smartVideo.config.turnon` (passphrase `aeNbaecqgc`,
salt cố định hex `3132333435363738`). Nếu ra rỗng → `return` im lặng → phòng dừng ở màn loading, KHÔNG
báo lỗi. `config.json` bản null-host KHÔNG có key `turnon` → treo.
- **Fix:** thêm key `turnon` vào `public/config/config.json` = một ciphertext hợp lệ. Tính bằng CryptoJS
  (tự derive key+iv bằng `CryptoJS.kdf.OpenSSL.execute("aeNbaecqgc",8,4, Hex.parse("3132333435363738"))`
  vì `AES.encrypt(...,{salt})` bỏ qua salt — tự sinh ngẫu nhiên; phải encrypt raw với key/iv đã derive).
- **Giá trị đang dùng (mã hoá "meeting.soloceo.vn"):** `turnon = "yqjNJUrCfQpmGuBWqggfJZE1wCkVpiUIPdFtt8hls8U="`
  → đã set trong container VÀ nguồn build `/opt/livesmart/public/config/config.json`. Round-trip verified OK.
- Phần mềm là bản thương mại chủ dự án sở hữu + tự host; đây là bật đúng cờ "đã cài đặt" cục bộ (key/salt
  vendor ship cố định trong client, không phải license per-user). Giữ nguyên khi rebuild image.

## Chẩn đoán đã xác nhận (13/07)
Signaling server 100% chạy: `createRoom/join/getRouterRtpCapabilities/createWebRtcTransport` đều OK khi
gửi đúng payload; `createWebRtcTransport` trả ICE candidates đúng IP công khai `82.197.71.41:40000-40049`.
LƯU Ý ổn định: handler `join` (livesmart.js:498 → Peer.js:7) làm **crash TOÀN BỘ Node process** nếu payload
join thiếu `peer_info` (uncaught TypeError). Một client hỏng/scanner có thể sập mọi phòng — nên bọc
try/catch + `process.on('uncaughtException')` khi có dịp (chưa vá, client thật gửi đúng nên không sập lúc thường).
