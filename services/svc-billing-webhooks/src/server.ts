import express from "express";
import { prisma } from "@soloceo/db";
import { normalizePayosEvent, normalizeStripeEvent } from "./normalize";
import { applyEvent } from "./apply";
import { signPayos, signStripe, verifyPayosChecksum, verifyStripeSignature } from "./verify";

const FAKE = process.env.PAYMENTS_FAKE === "1";

export function createServer(): express.Express {
  const app = express();

  // Stripe cần raw body để verify chữ ký
  app.post(
    "/v1/webhooks/stripe",
    express.raw({ type: "*/*" }),
    async (req, res) => {
      const payload = (req.body as Buffer).toString("utf8");
      const sig = req.headers["stripe-signature"] as string | undefined;
      const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
      if (!FAKE) {
        if (!sig || !secret || !verifyStripeSignature(payload, sig, secret)) {
          return res.status(400).json({ error: "Chữ ký Stripe không hợp lệ" });
        }
      }
      try {
        const evt = normalizeStripeEvent(JSON.parse(payload));
        if (!evt) return res.json({ received: true, skipped: true });
        const result = await applyEvent(prisma, evt);
        return res.json({ received: true, ...result });
      } catch (err) {
        console.error("stripe webhook lỗi:", err);
        return res.status(500).json({ error: "Xử lý thất bại" });
      }
    },
  );

  app.post("/v1/webhooks/payos", express.json(), async (req, res) => {
    const body = req.body as {
      code: string;
      data: Record<string, unknown>;
      signature?: string;
      soloceo?: Record<string, string>;
    };
    const key = process.env.PAYOS_CHECKSUM_KEY ?? "";
    if (!FAKE) {
      if (
        !body.signature ||
        !key ||
        !verifyPayosChecksum(body.data, body.signature, key)
      ) {
        return res.status(400).json({ error: "Checksum PayOS không hợp lệ" });
      }
    }
    try {
      const evt = normalizePayosEvent(body as never);
      if (!evt) return res.json({ received: true, skipped: true });
      const result = await applyEvent(prisma, evt);
      return res.json({ received: true, ...result });
    } catch (err) {
      console.error("payos webhook lỗi:", err);
      return res.status(500).json({ error: "Xử lý thất bại" });
    }
  });

  // Dev-only (PAYMENTS_FAKE=1): mô phỏng cổng thanh toán bắn webhook —
  // giữ NGUYÊN đường xử lý thật (ký + verify + normalize + apply).
  if (FAKE) {
    app.post("/dev/simulate", express.json(), async (req, res) => {
      const {
        provider = "payos",
        type = "venture_payment",
        orgId,
        ventureId,
        plan,
        amount = 500_000,
        orderCode,
      } = req.body as Record<string, never>;

      if (provider === "payos") {
        const data = {
          orderCode: orderCode ?? Date.now(),
          amount,
          description: `SoloCEO ${type}`,
          transactionDateTime: new Date().toISOString(),
        };
        const key = process.env.PAYOS_CHECKSUM_KEY || "dev-payos-key";
        const payload = {
          code: "00",
          data,
          signature: signPayos(data, key),
          soloceo: { type, orgId, ventureId, plan },
        };
        const evt = normalizePayosEvent(payload as never);
        const result = evt
          ? await applyEvent(prisma, evt)
          : { applied: false };
        return res.json({ simulated: "payos", ...result, orderCode: data.orderCode });
      }

      const event = {
        id: `evt_fake_${orderCode ?? Date.now()}`,
        type: "checkout.session.completed",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: `cs_fake_${Date.now()}`,
            amount_total: amount,
            currency: "vnd",
            metadata: { type, orgId, ventureId, plan },
          },
        },
      };
      const payload = JSON.stringify(event);
      const secret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_dev";
      // tự bắn qua chính handler verify để giữ đường thật
      const sig = signStripe(payload, secret);
      const ok = verifyStripeSignature(payload, sig, secret);
      if (!ok) return res.status(500).json({ error: "self-sign fail" });
      const evt = normalizeStripeEvent(event as never);
      const result = evt ? await applyEvent(prisma, evt) : { applied: false };
      return res.json({ simulated: "stripe", ...result, eventId: event.id });
    });
  }

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "svc-billing-webhooks" }));

  return app;
}
