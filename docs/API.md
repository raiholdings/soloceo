# SoloCEO API

Swagger đầy đủ (sinh từ decorator): chạy api-core rồi mở `http://localhost:4000/docs`.
Đặc tả nguồn: CLAUDE.md Phần 6. Prefix `/v1`, Bearer JWT Supabase.

## Nhóm endpoint đã triển khai
- **auth**: `POST /auth/dev-login` (chỉ DEV_AUTH=1)
- **orgs**: `POST /orgs`, `GET/PATCH /orgs/me`
- **ventures**: CRUD + `POST /ventures/:id/launch` + `GET /ventures/:id/revenue`
- **store**: `GET /store/apps`, installs, `DELETE /installs/:id` (2 bước),
  `GET /installs/:id/logs`, SSE `GET /ventures/:id/provision-events`
- **ai**: `GET /ai/usage`, `GET /ai/usage/summary`, `POST /ai/dev-simulate-usage`
- **payments**: `POST /payments/checkout`, `GET /revenue/ledger`, `POST /revenue/manual`
- **webhooks** (svc-billing-webhooks :4200): `POST /v1/webhooks/stripe`, `POST /v1/webhooks/payos`
- **community**: `GET/POST /posts`, comments, like; `GET /directory/ventures[/slug]`
- **marketplace**: eligibility, `POST /listings`, `GET /marketplace/listings[/:id]`,
  NDA, offers, accept, deal-rooms
- **admin**: orgs/suspend/activate, ai-usage, listings pending/approve,
  installs redeploy, complete-transfer, actions (audit)
