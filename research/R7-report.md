# R7 — Zalo Official Account (OA) Channel Adapter cho SoloCEO OS v2 / DeerFlow

> Thiết kế `channels/zalo`. Nguồn: developers.zalo.me + web search (07/2026). Endpoint chưa xác nhận trực tiếp (trang render JS) đánh dấu **[CẦN KIỂM CHỨNG]** — tra lại developers.zalo.me trước khi code.

## 1. Cơ chế nhận tin: Webhook push (khác Telegram long-polling)

- Cấu hình **Webhook URL** (HTTPS công khai) trong Zalo App console → *Official Account API → Webhook*. Có sự kiện → Zalo **POST JSON** tới URL; server trả `200 OK` nhanh, việc nặng đẩy queue.
- Khác Telegram (mẫu): Telegram kéo tin `getUpdates` (long-polling); Zalo **chỉ webhook push** → adapter Zalo **bắt buộc** endpoint HTTP public, không chạy kiểu worker kéo.

| | Telegram | Zalo OA |
|---|---|---|
| Nhận tin | Long-polling `getUpdates` (hoặc webhook) | **Chỉ webhook push** |
| Cần endpoint public | Không (nếu polling) | **Bắt buộc** |

- **Đăng ký webhook**: cấu hình thủ công trong Dashboard (không có `setWebhook` như Telegram). **[CẦN KIỂM CHỨNG]** có API set webhook programmatic.

## 2. Xác thực chữ ký webhook (`X-ZEvent-Signature`)

```
signature = "mac=" + SHA256( appId + rawBody + timestamp + OASecretKey )
```
- Nối: `appId` + `data` (JSON body RAW nguyên văn) + `timestamp` (từ body) + **OA Secret Key**; hash SHA-256 hex; so với header `X-ZEvent-Signature` (thường prefix `mac=`).
- **CỰC KỲ QUAN TRỌNG**: dùng **OA Secret Key** (mục Webhook), **KHÔNG phải App Secret Key** — nhầm là lỗi phổ biến nhất.
```ts
function verifyZaloSignature(appId, rawBody, timestamp, oaSecret, header) {
  const mac = createHash('sha256').update(appId + rawBody + timestamp + oaSecret).digest('hex');
  return timingSafeEqual(`mac=${mac}`, header);
}
```
> Hạ tầng: controller phải giữ **raw body** (chưa JSON.parse) để hash khớp — NestJS bật `rawBody: true`.

## 3. Gửi tin + Access/Refresh Token

### 3.1 Gửi message
- **Endpoint (v3.0)**: `POST https://openapi.zalo.me/v3.0/oa/message` **[CẦN KIỂM CHỨNG path con]** (vd `/message/cs` cho tin tư vấn trong phiên).
- Header: `access_token: <OA_ACCESS_TOKEN>`, `Content-Type: application/json`.
- Body: `{ "recipient": { "user_id": "<zalo_user_id>" }, "message": { "text": "..." } }`.

### 3.2 Token flow (OAuth v4)
- **Access token hạn 1 giờ**. **Refresh token hạn 3 tháng, chỉ dùng 1 lần** (mỗi lần refresh trả refresh token mới → lưu đè).
- Lấy token: `POST https://oauth.zaloapp.com/v4/oa/access_token`, `Content-Type: application/x-www-form-urlencoded`, header `secret_key: <App Secret>` **[CẦN KIỂM CHỨNG vị trí truyền secret]**, params `app_id`, `grant_type=refresh_token`, `refresh_token=...` (hoặc `grant_type=authorization_code`, `code=...` lần đầu).
- **Hệ quả**: cần **cron/refresh worker** renew access token (<1h) + cập nhật refresh token mới; refresh phải **atomic + lock** (dùng 1 lần).

## 4. Loại sự kiện webhook (field `event_name`)

| event_name | Ý nghĩa |
|---|---|
| `user_send_text` | User gửi text |
| `user_send_image` | User gửi ảnh |
| `user_send_file`/`sticker`/`location` | Media khác **[CẦN KIỂM CHỨNG]** |
| `follow` / `unfollow` | Theo dõi / bỏ theo dõi OA |
| `oa_send_text` | OA gửi tin (echo) |
| `user_seen_message`/`user_received_message` | Đã xem/nhận **[CẦN KIỂM CHỨNG]** |

Payload thường có `app_id`, `oa_id`, `sender.id`, `recipient.id`, `message.text`/`attachments`, `timestamp`, `event_name`.

## 5. Rate limit & cửa sổ nhắn tin (quan trọng cho UX agent)

- **Tin tư vấn**: OA nhắn chủ động trong **7 ngày** kể từ tương tác cuối của user.
- **48h miễn phí**: tin tư vấn trong **48h** kể từ tương tác cuối = free; ngoài 48h (còn trong 7 ngày) = **tính phí**.
- **Ngoài 7 ngày**: phải dùng **ZNS template** (duyệt riêng, có hạn mức).
- **Promotion/broadcast**: hạn mức theo follower/tháng **[CẦN KIỂM CHỨNG con số]**.
- **Hệ quả DeerFlow**: agent trả lời **reactive trong phiên** (user vừa nhắn → trong 48h → free) là an toàn. Tin **chủ động** phải kiểm `lastUserInteractionAt`; ngoài 48h cảnh báo phí, ngoài 7 ngày chuyển ZNS. Adapter lưu `lastUserInteractionAt` per user.

## 6. Thiết kế `channels/zalo`

### 6.1 Vị trí
**Controller webhook trong `api-core` (NestJS)**, việc nặng đẩy **BullMQ** (đã có Redis). Lý do: webhook chỉ cần HTTPS endpoint + verify + enqueue; không cần long-polling worker; có sẵn auth/secrets/DB. Tách `svc-channel-zalo` sau nếu tải cao (giữ interface).

### 6.2 Luồng end-to-end
```
Zalo → POST /v1/channels/zalo/webhook/:oaId  (rawBody)
  1. Verify X-ZEvent-Signature → 401 nếu sai
  2. Trả 200 OK ngay (ack)
  3. Enqueue BullMQ {oaId, event} → worker:
     a. Map oaId → org_id/venture_id (ChannelBinding)
     b. Upsert Zalo user_id → contact, cập nhật lastUserInteractionAt
     c. user_send_* → DeerFlow Gateway: thread (key=hash(oaId+userId)) + tạo run
     d. Nhận reply từ DeerFlow (stream/poll)
     e. Lấy access_token OA (secrets, tự refresh nếu <1h)
     f. POST openapi.zalo.me/v3.0/oa/message gửi reply
     g. follow/unfollow → cập nhật contact (không cần agent)
```

### 6.3 Lưu token per-tenant (tái dùng bảng `Secret` AES-256-GCM)
- Mỗi OA lưu `oa_access_token`, `oa_refresh_token`, `oa_token_expires_at`, `oa_secret_key`, `app_id`, `app_secret` — mã hóa AES-256-GCM `MASTER_KEY`, không log.
- **Refresh worker** (cron ~50 phút): renew trước hết hạn; **lock per-oaId** (Redis); ghi đè refresh token mới atomically.

### 6.4 Multi-tenant (mỗi venture 1 OA) — bảng mới đề xuất
```prisma
model ChannelBinding {
  id          String   @id @default(uuid())
  orgId       String
  ventureId   String
  channel     String   // "zalo" | "telegram"
  externalId  String   // Zalo oa_id
  secretRef   String   // FK → Secret (token OA mã hóa)
  status      String   @default("active")
  createdAt   DateTime @default(now())
  @@unique([channel, externalId])
  @@index([orgId, ventureId])
}
```
Route webhook theo `oaId` trong path → tra `ChannelBinding` → `org_id`/`venture_id`; verify bằng đúng `oa_secret_key` của binding.

## 7. Trừu tượng hóa `ChannelAdapter` (Telegram vs Zalo)

| Khía cạnh | Telegram | Zalo OA | Trừu tượng |
|---|---|---|---|
| Nhận tin | long-poll/webhook | webhook push | `receive(event)`→`InboundMessage` |
| Xác thực | secret/bot token | `X-ZEvent-Signature` SHA256 + OA secret | `verifySignature(raw, headers)` |
| Token | bot token tĩnh | access 1h + refresh 1-lần/3th | `getAccessToken()` |
| Gửi tin | `sendMessage` | `POST /v3.0/oa/message` | `sendText(userId, text)` |
| Cửa sổ | tự do | 48h free / 7 ngày / ZNS | `canSendProactive(userId)` |
| Map tenant | bot id | oa_id | `ChannelBinding` |

```ts
interface ChannelAdapter {
  readonly channel: 'zalo' | 'telegram';
  verifySignature(rawBody: string, headers: Record<string,string>): boolean;
  parseInbound(payload: unknown): InboundMessage;
  sendText(binding: ChannelBinding, userId: string, text: string): Promise<void>;
  canSendProactive(binding: ChannelBinding, userId: string): Promise<boolean>;
}
interface InboundMessage {
  channel: string; oaId: string; externalUserId: string;
  eventKind: 'message'|'follow'|'unfollow'|'other';
  type?: 'text'|'image'|'file'; text?: string; mediaUrls?: string[]; ts: number;
}
```
Khác biệt cần đóng gói riêng cho Zalo: **quản lý token refresh 1-lần** + **cửa sổ 48h/7 ngày** (`canSendProactive`).

---

## GIẢ ĐỊNH & CẦN KIỂM CHỨNG
1. Path con endpoint gửi tin (`/message/cs`?). 2. Vị trí truyền secret khi lấy token. 3. Tên chính xác `event_name` từng media + seen/received. 4. Format header `X-ZEvent-Signature` (prefix `mac=`?), timestamp từ body/header. 5. Con số hạn mức promotion/giá tin ngoài 48h. 6. API set webhook programmatic.
**Đã xác nhận chắc**: webhook push (không long-poll); verify SHA256 với **OA Secret Key** (không phải App Secret); access token 1h; refresh 3 tháng dùng 1 lần; cửa sổ 48h free/7 ngày; token endpoint `oauth.zaloapp.com/v4/oa/access_token`.

**Nguồn**: developers.zalo.me (OA API, verify signature, refresh token), Infobip Zalo compliance, zalo-oa-api-wrapper / zalo-node-sdk.
