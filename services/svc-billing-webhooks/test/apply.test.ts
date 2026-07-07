/**
 * Test tích hợp đường tiền trên Postgres local (devstack phải đang chạy).
 * Trọng tâm: IDEMPOTENCY — gửi lại webhook không tạo bản ghi trùng (DoD GĐ5).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { applyEvent } from "../src/apply";
import type { NormalizedEvent } from "../src/normalize";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5432/soloceo",
    },
  },
});

let orgId: string;
let ventureId: string;

beforeAll(async () => {
  const org = await prisma.org.create({
    data: {
      name: `Test Org ${randomUUID().slice(0, 8)}`,
      ownerUserId: randomUUID(),
      plan: "STARTER",
    },
  });
  orgId = org.id;
  const venture = await prisma.venture.create({
    data: {
      orgId,
      name: "Venture Test",
      slug: `test-${randomUUID().slice(0, 8)}`,
    },
  });
  ventureId = venture.id;
});

afterAll(async () => {
  await prisma.transaction.deleteMany({ where: { ventureId } });
  await prisma.subscription.deleteMany({ where: { orgId } });
  await prisma.venture.delete({ where: { id: ventureId } });
  await prisma.org.delete({ where: { id: orgId } });
  await prisma.$disconnect();
});

function paymentEvent(ref: string, amount = 1_000_000): NormalizedEvent {
  return {
    kind: "venture_payment",
    provider: "payos",
    providerRef: ref,
    amount,
    currency: "VND",
    occurredAt: new Date(),
    ventureId,
    customerRef: "Nguyễn Văn Khách",
  };
}

describe("applyEvent — venture_payment", () => {
  it("tạo Transaction IN + PLATFORM_FEE đúng % gói (STARTER 3%)", async () => {
    const ref = `payos:test-${randomUUID()}`;
    const result = await applyEvent(prisma, paymentEvent(ref, 1_000_000));
    expect(result.applied).toBe(true);
    expect(result.transactionIds).toHaveLength(2);

    const txs = await prisma.transaction.findMany({
      where: { providerRef: { in: [ref, `${ref}:fee`] } },
      orderBy: { direction: "asc" },
    });
    expect(txs).toHaveLength(2);
    const inTx = txs.find((t) => t.direction === "IN")!;
    const feeTx = txs.find((t) => t.direction === "PLATFORM_FEE")!;
    expect(Number(inTx.grossAmount)).toBe(1_000_000);
    expect(inTx.verified).toBe(true);
    expect(Number(feeTx.grossAmount)).toBe(30_000); // 3% STARTER
  });

  it("IDEMPOTENT: gửi lại webhook 2 lần không tạo bản ghi trùng", async () => {
    const ref = `payos:test-${randomUUID()}`;
    const first = await applyEvent(prisma, paymentEvent(ref));
    const second = await applyEvent(prisma, paymentEvent(ref));
    const third = await applyEvent(prisma, paymentEvent(ref));

    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(third.applied).toBe(false);

    const count = await prisma.transaction.count({
      where: { providerRef: { in: [ref, `${ref}:fee`] } },
    });
    expect(count).toBe(2); // đúng 1 cặp IN + FEE dù nhận 3 lần
  });
});

describe("applyEvent — subscription_paid", () => {
  it("kích hoạt Org + nâng gói + tạo Subscription; idempotent", async () => {
    const ref = `stripe:test-sub-${randomUUID()}`;
    const evt: NormalizedEvent = {
      kind: "subscription_paid",
      provider: "stripe",
      providerRef: ref,
      amount: 990_000,
      currency: "VND",
      occurredAt: new Date(),
      orgId,
      plan: "GROWTH",
    };
    const first = await applyEvent(prisma, evt);
    const second = await applyEvent(prisma, evt);
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);

    const org = await prisma.org.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.plan).toBe("GROWTH");
    expect(org.status).toBe("ACTIVE");

    const subs = await prisma.subscription.findMany({
      where: { providerRef: ref },
    });
    expect(subs).toHaveLength(1);
    expect(subs[0]!.status).toBe("active");
  });

  it("payment_failed → Org SUSPENDED", async () => {
    const evt: NormalizedEvent = {
      kind: "subscription_failed",
      provider: "stripe",
      providerRef: `stripe:test-fail-${randomUUID()}`,
      amount: 0,
      currency: "VND",
      occurredAt: new Date(),
      orgId,
    };
    await applyEvent(prisma, evt);
    const org = await prisma.org.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.status).toBe("SUSPENDED");
  });
});
