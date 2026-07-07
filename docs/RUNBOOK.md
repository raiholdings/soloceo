# RUNBOOK VẬN HÀNH SOLOCEO

> Nguồn: CLAUDE.md Phần 10. File này được cập nhật dần qua các giai đoạn;
> kết quả test khôi phục backup (Giai đoạn 7) PHẢI ghi vào đây.

## 1. Chuẩn bị hạ tầng (làm tay 1 lần, ~nửa ngày)
1. Mua 2 VPS (CLAUDE.md Phần 2.2), Ubuntu 24.04, hostname `core-01`, `tenant-01`.
2. Trỏ DNS Cloudflare theo Phần 2.2 (proxy OFF cho `*.app.soloceo.vn` lúc cấp SSL đầu, bật lại sau).
3. Cài Coolify trên core-01: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash` → thêm tenant-01 làm remote server qua SSH key.
4. Tạo API token Coolify (quyền deploy) → `COOLIFY_API_TOKEN`.
5. Deploy stack lõi từ `infra/docker-compose.core.yml` + Supabase self-host.
6. Điền secrets thật theo `infra/env/.env.example`.
7. `pnpm --filter @soloceo/db migrate:deploy` + `pnpm db:seed`.

## 2. Vận hành hằng ngày (15 phút/ngày)
- Sáng: Uptime Kuma + Telegram cảnh báo; hàng đợi provision (Bull Board `/admin/queues`).
- Langfuse: top 5 org chi phí AI cao nhất, bất thường → liên hệ.
- Duyệt listing M&A chờ (SLA 24h).
- Thứ 2 hằng tuần: báo cáo tự động (n8n nội bộ RAI).

## 3. Sự cố thường gặp
| Triệu chứng | Xử lý |
|---|---|
| Provision treo QUEUED | Kiểm tra RAM tenant-01 (>70% → thêm VPS, add vào Coolify) |
| Tenant Dify không gọi được model | Kiểm virtual key còn budget? LiteLLM `/health`? Rotate key qua Admin Console |
| Webhook Stripe fail | Xem svc-billing-webhooks logs; replay từ Stripe dashboard (idempotent nên an toàn) |
| SSL không cấp cho subdomain mới | Tắt Cloudflare proxy domain đó, chờ Let's Encrypt, bật lại |
| Suspend tenant xấu | Admin Console → Suspend: dừng container + khóa login, giữ dữ liệu 30 ngày |

## 4. Checklist Go-live
Xem CLAUDE.md Phần 10.4 — chưa bắt đầu (Giai đoạn 7).

## 5. Kết quả test khôi phục backup
_Chưa thực hiện — bắt buộc trước go-live._
