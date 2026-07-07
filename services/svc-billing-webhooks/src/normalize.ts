/**
 * Chuẩn hóa mọi sự kiện tiền từ Stripe/PayOS về 1 shape duy nhất
 * trước khi ghi sổ cái (CLAUDE.md Phần 6.4 + Giai đoạn 5).
 */

export type NormalizedKind =
  | "venture_payment" // khách của venture trả tiền → Transaction IN + PLATFORM_FEE
  | "subscription_paid" // thanh toán gói cước → kích hoạt Org + Subscription
  | "subscription_failed" // past_due → tạm ngưng
  | "subscription_canceled"
  | "ai_credit"; // mua thêm credit AI

export interface NormalizedEvent {
  kind: NormalizedKind;
  provider: "stripe" | "payos";
  /** idempotency key — duy nhất per sự kiện */
  providerRef: string;
  amount: number;
  currency: string;
  occurredAt: Date;
  orgId?: string;
  ventureId?: string;
  plan?: string;
  customerRef?: string;
  meta?: Record<string, unknown>;
}

interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: {
      id: string;
      amount_total?: number;
      amount_paid?: number;
      currency?: string;
      customer?: string;
      customer_email?: string;
      metadata?: Record<string, string>;
      subscription?: string;
    };
  };
}

/** Stripe amount là minor units (cents với USD; VND không có minor unit) */
function stripeAmount(amount: number | undefined, currency: string): number {
  if (amount == null) return 0;
  return currency.toLowerCase() === "vnd" ? amount : amount / 100;
}

export function normalizeStripeEvent(
  event: StripeEvent,
): NormalizedEvent | null {
  const obj = event.data.object;
  const meta = obj.metadata ?? {};
  const currency = (obj.currency ?? "usd").toUpperCase();
  const occurredAt = new Date(event.created * 1000);

  switch (event.type) {
    case "checkout.session.completed": {
      const type = meta.type ?? "venture_payment";
      const base = {
        provider: "stripe" as const,
        providerRef: `stripe:${event.id}`,
        amount: stripeAmount(obj.amount_total, currency),
        currency,
        occurredAt,
        orgId: meta.orgId,
        ventureId: meta.ventureId,
        plan: meta.plan,
        customerRef: obj.customer_email ?? obj.customer,
        meta: { sessionId: obj.id, subscription: obj.subscription },
      };
      if (type === "subscription") return { ...base, kind: "subscription_paid" };
      if (type === "ai_credit") return { ...base, kind: "ai_credit" };
      return { ...base, kind: "venture_payment" };
    }
    case "invoice.paid": {
      return {
        kind: "subscription_paid",
        provider: "stripe",
        providerRef: `stripe:${event.id}`,
        amount: stripeAmount(obj.amount_paid, currency),
        currency,
        occurredAt,
        orgId: meta.orgId,
        plan: meta.plan,
        customerRef: obj.customer ?? undefined,
        meta: { subscription: obj.subscription },
      };
    }
    case "invoice.payment_failed":
      return {
        kind: "subscription_failed",
        provider: "stripe",
        providerRef: `stripe:${event.id}`,
        amount: 0,
        currency,
        occurredAt,
        orgId: meta.orgId,
      };
    case "customer.subscription.deleted":
      return {
        kind: "subscription_canceled",
        provider: "stripe",
        providerRef: `stripe:${event.id}`,
        amount: 0,
        currency,
        occurredAt,
        orgId: meta.orgId,
      };
    default:
      return null; // sự kiện không liên quan tiền — bỏ qua
  }
}

interface PayosWebhook {
  code: string; // "00" = thành công
  data: {
    orderCode: number | string;
    amount: number;
    description?: string;
    transactionDateTime?: string;
    counterAccountName?: string;
    // metadata SoloCEO nhét vào description/returnUrl khi tạo link:
    [key: string]: unknown;
  };
  // SoloCEO gắn context khi tạo payment link (lưu server-side theo orderCode)
  soloceo?: {
    type?: string;
    orgId?: string;
    ventureId?: string;
    plan?: string;
  };
}

export function normalizePayosEvent(
  payload: PayosWebhook,
): NormalizedEvent | null {
  if (payload.code !== "00") return null; // chỉ ghi nhận giao dịch thành công
  const d = payload.data;
  const ctx = payload.soloceo ?? {};
  const base = {
    provider: "payos" as const,
    providerRef: `payos:${d.orderCode}`,
    amount: d.amount,
    currency: "VND",
    occurredAt: d.transactionDateTime
      ? new Date(d.transactionDateTime)
      : new Date(),
    orgId: ctx.orgId,
    ventureId: ctx.ventureId,
    plan: ctx.plan,
    customerRef: d.counterAccountName,
    meta: { description: d.description },
  };
  if (ctx.type === "subscription")
    return { ...base, kind: "subscription_paid" };
  if (ctx.type === "ai_credit") return { ...base, kind: "ai_credit" };
  return { ...base, kind: "venture_payment" };
}
