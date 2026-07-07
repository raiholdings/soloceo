// svc-billing-webhooks — nhận webhook Stripe/PayOS, chuẩn hóa về Transaction
// (CLAUDE.md Giai đoạn 5 — đường tiền, idempotent theo providerRef).
import { createServer } from "./server";

const port = Number(process.env.BILLING_PORT ?? 4200);
createServer().listen(port, () => {
  console.log(`svc-billing-webhooks chạy tại http://localhost:${port}`);
});
