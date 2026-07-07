/**
 * Ghi sự kiện đã chuẩn hóa vào sổ cái — IDEMPOTENT theo providerRef
 * (unique constraint trên Transaction.providerRef; gửi lại webhook không
 * tạo bản ghi trùng). Đường tiền không được phép sai — có test riêng.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { PLANS, type PlanKey } from "@soloceo/shared";
import type { NormalizedEvent } from "./normalize";

const PrismaDecimal = Prisma.Decimal;

export interface ApplyResult {
  applied: boolean; // false nếu đã xử lý trước đó (duplicate webhook)
  transactionIds: string[];
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}

export async function applyEvent(
  prisma: PrismaClient,
  evt: NormalizedEvent,
): Promise<ApplyResult> {
  switch (evt.kind) {
    case "venture_payment":
      return applyVenturePayment(prisma, evt);
    case "subscription_paid":
      return applySubscriptionPaid(prisma, evt);
    case "subscription_failed":
      return applySubscriptionStatus(prisma, evt, "past_due", "SUSPENDED");
    case "subscription_canceled":
      return applySubscriptionStatus(prisma, evt, "canceled", "SUSPENDED");
    case "ai_credit":
      return applyAiCredit(prisma, evt);
  }
}

/** Khách của venture trả tiền: Transaction IN + PLATFORM_FEE theo gói */
async function applyVenturePayment(
  prisma: PrismaClient,
  evt: NormalizedEvent,
): Promise<ApplyResult> {
  if (!evt.ventureId) {
    throw new Error(`venture_payment thiếu ventureId (ref=${evt.providerRef})`);
  }
  const venture = await prisma.venture.findUniqueOrThrow({
    where: { id: evt.ventureId },
    include: { org: true },
  });
  const feePct = PLANS[venture.org.plan as PlanKey].paymentFeePct;
  const fee = Math.round(evt.amount * feePct) / 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const inTx = await tx.transaction.create({
        data: {
          ventureId: venture.id,
          direction: "IN",
          grossAmount: new PrismaDecimal(evt.amount),
          currency: evt.currency,
          provider: evt.provider,
          providerRef: evt.providerRef,
          customerRef: evt.customerRef,
          occurredAt: evt.occurredAt,
          verified: true, // từ webhook cổng thanh toán
          meta: (evt.meta ?? {}) as Prisma.InputJsonValue,
        },
      });
      const feeTx = await tx.transaction.create({
        data: {
          ventureId: venture.id,
          direction: "PLATFORM_FEE",
          grossAmount: new PrismaDecimal(fee),
          currency: evt.currency,
          provider: evt.provider,
          providerRef: `${evt.providerRef}:fee`,
          occurredAt: evt.occurredAt,
          verified: true,
          meta: { feePct } as Prisma.InputJsonValue,
        },
      });
      return [inTx.id, feeTx.id];
    });
    return { applied: true, transactionIds: result };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { applied: false, transactionIds: [] }; // webhook gửi lại — bỏ qua
    }
    throw err;
  }
}

/** Thanh toán gói cước: kích hoạt Org + upsert Subscription (Phần 5, logic 1) */
async function applySubscriptionPaid(
  prisma: PrismaClient,
  evt: NormalizedEvent,
): Promise<ApplyResult> {
  if (!evt.orgId) {
    throw new Error(`subscription thiếu orgId (ref=${evt.providerRef})`);
  }
  const plan = (evt.plan ?? "STARTER") as PlanKey;
  const periodEnd = new Date(evt.occurredAt);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const existing = await prisma.subscription.findFirst({
    where: { providerRef: evt.providerRef },
  });
  if (existing) return { applied: false, transactionIds: [] };

  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        orgId: evt.orgId,
        plan,
        provider: evt.provider,
        providerRef: evt.providerRef,
        status: "active",
        currentPeriodEnd: periodEnd,
      },
    }),
    prisma.org.update({
      where: { id: evt.orgId },
      data: { plan, status: "ACTIVE" },
    }),
  ]);
  return { applied: true, transactionIds: [] };
}

async function applySubscriptionStatus(
  prisma: PrismaClient,
  evt: NormalizedEvent,
  subStatus: string,
  orgStatus: "SUSPENDED",
): Promise<ApplyResult> {
  if (!evt.orgId) return { applied: false, transactionIds: [] };
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { orgId: evt.orgId, status: "active" },
      data: { status: subStatus },
    }),
    prisma.org.update({
      where: { id: evt.orgId },
      data: { status: orgStatus },
    }),
  ]);
  return { applied: true, transactionIds: [] };
}

/** Mua thêm credit AI: ghi PLATFORM_FEE về venture đầu tiên của org (doanh thu nền tảng) */
async function applyAiCredit(
  prisma: PrismaClient,
  evt: NormalizedEvent,
): Promise<ApplyResult> {
  if (!evt.orgId) {
    throw new Error(`ai_credit thiếu orgId (ref=${evt.providerRef})`);
  }
  const venture = await prisma.venture.findFirst({
    where: { orgId: evt.orgId },
    orderBy: { createdAt: "asc" },
  });
  if (!venture) return { applied: false, transactionIds: [] };
  try {
    const tx = await prisma.transaction.create({
      data: {
        ventureId: venture.id,
        direction: "PLATFORM_FEE",
        grossAmount: new PrismaDecimal(evt.amount),
        currency: evt.currency,
        provider: evt.provider,
        providerRef: evt.providerRef,
        occurredAt: evt.occurredAt,
        verified: true,
        meta: { type: "ai_credit" } as Prisma.InputJsonValue,
      },
    });
    return { applied: true, transactionIds: [tx.id] };
  } catch (err) {
    if (isUniqueViolation(err)) return { applied: false, transactionIds: [] };
    throw err;
  }
}
