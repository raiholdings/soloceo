# Support Board → chat.soloceo.vn (Chat đa kênh cho Solo CEO)

**Bản:** Support Board (PHP/MySQL, chat đa kênh omnichannel) — phần mềm thương mại **chủ dự án ĐÃ MUA license**; self-host bản nulled (code không nén) để dễ nâng cấp thêm tính năng sau. Cùng nhóm như WoWonder/LiveSmart.
**Node:** tenant-01 (62.146.235.177). Container `supportboard`, image `soloceo/supportboard:1.0`. Source `/opt/supportboard`, mirror repo `platform/supportboard/`.

## Kiến trúc (mô hình 1 instance chung — như WoWonder/LiveSmart)
- PHP 8.1-apache (mysqli/gd/zip/exif/intl, mod_rewrite). HTTP:80 → Traefik `chat.soloceo.vn:443` (coolify-proxy, Let's Encrypt).
- DB: **tái dùng MariaDB 11 của WoWonder** (`wowonder-wowonder-db-1` trên network `coolify`) — DB riêng `supportboard`, user `supportboard` (pass `/root/.supportboard_db_pw`). Tiết kiệm RAM (không chạy MySQL thứ 2).
- Volumes: `supportboard_uploads` (/uploads), `supportboard_apps` (/apps — giữ addon qua rebuild).
- Middleware `supportboard-frameok` xoá X-Frame-Options → cho phép nhúng iframe trong workspace nếu cần.

## Addon đã gộp sẵn vào image (apps/) — 19 addon
dialogflow, slack, tickets, perfex, whmcs, aecommerce, messenger, whatsapp, armember, viber, telegram, line, wechat, zalo, twitter, zendesk, martfury, opencart, gbm.
(`$sb_apps` trong include/functions.php:83 quyết định addon nào được nạp — gbm chưa có trong list, thêm nếu cần; GBM Google đã ngừng 2024.)

## Cài đặt (CHẶN: cần mã Envato + DNS — việc tay chủ dự án)
Install wizard ở `admin.php`; sb_installation() **tải schema core từ `board.support/synch/updates.php?db={ENVATO_CODE}`** — BẮT BUỘC mã Envato purchase code HỢP LỆ (chủ dự án đã mua → có mã trong CodeCanyon → Downloads → License certificate). Không có mã → server hãng trả `invalid-envato-purchase-code`. **Không bẻ khoá — dùng mã thật.**

Chạy install bằng CLI (đã chuẩn bị `/opt/supportboard/install.php`):
```bash
docker exec -e SB_DB_PW="$(cat /root/.supportboard_db_pw)" -e SB_ADMIN_PW="SoloCeo@2026" \
  supportboard php /opt/supportboard/install.php <ENVATO_PURCHASE_CODE>
# (mount install.php vào container hoặc cp vào /var/www/html trước khi chạy)
```
Sau install: config.php tự sinh (SB_DB_*), tạo super admin (soloceo.vn@gmail.com / SoloCeo@2026 — đổi sau).

**VIỆC TAY:** DNS A `chat.soloceo.vn → 62.146.235.177` (Cloudflare proxy TẮT lúc cấp SSL đầu; nếu cert=self-signed sau khi DNS thêm muộn → `docker restart coolify-proxy` ép Let's Encrypt — bài học từ meeting.soloceo.vn).

## SSO SoloCEO ↔ Support Board (mô hình mỗi CEO = agent)
Cầu server-side (giữ admin token BÍ MẬT, không xuống browser):
1. Backend gọi `POST chat.soloceo.vn/include/api.php` `function=add-user` (tạo/upsert CEO từ phiên SoloCEO: first_name/last_name/email/user_type=agent) với admin token.
2. `function=login` (user_id + token) → nhận chuỗi login mã hoá.
3. Frontend `SBF.loginCookie(<chuỗi>)` set cookie `sb-login` → CEO tự đăng nhập vào hộp thư của họ.
Trang native `/workspace/chat` + sidebar "Chat đa kênh" (mở tab như /workspace/hop-video). Gate theo gói SoloCEO: dùng thử 7 ngày miễn phí không cần thẻ.
(Chi tiết Web API: board.support/docs/api/web.)

## Trạng thái (13/07)
- ✅ DB supportboard tạo trên MariaDB tenant-01.
- ✅ Image `soloceo/supportboard:1.0` build (19 addon trong apps/).
- ✅ Container chạy, admin.php = trang Install (200).
- ⏳ CHỜ: mã Envato (để install tải schema) + DNS chat.soloceo.vn.
- ⏳ SAU: SSO bridge + trang workspace + gate gói 7 ngày.
