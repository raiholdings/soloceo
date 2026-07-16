import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PLANS, type PlanKey } from "@soloceo/shared";
import { createHmac, randomUUID } from "node:crypto";
import type { Plan } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import { CheckoutDto, ManualRevenueDto } from "./payments.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get isFake(): boolean {
    return this.config.get("PAYMENTS_FAKE") === "1";
  }

  /**
   * POST /v1/payments/checkout — tạo phiên thanh toán.
   * Prod: Stripe Checkout Session / PayOS payment link (REST).
   * Fake mode: trả URL giả + lệnh mô phỏng webhook để demo end-to-end.
   */
  async checkout(user: RequestUser, dto: CheckoutDto) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const provider = dto.provider ?? "payos";

    if (dto.type === "subscription" && !dto.plan) {
      throw new BadRequestException("Thiếu plan cho subscription");
    }
    if (dto.type === "subscription") {
      dto.amount = PLANS[dto.plan as PlanKey].priceVndMonthly;
    }
    if (dto.type === "venture_payment") {
      if (!dto.ventureId) throw new BadRequestException("Thiếu ventureId");
      const venture = await this.prisma.venture.findFirst({
        where: { id: dto.ventureId, orgId: user.orgId },
      });
      if (!venture) throw new NotFoundException("Không tìm thấy venture");
    }
    if (!dto.amount) throw new BadRequestException("Thiếu amount");

    const orderCode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    if (this.isFake) {
      // giữ nguyên hợp đồng dữ liệu với cổng thật; URL giả cho demo
      return {
        provider,
        orderCode,
        checkoutUrl: `https://pay-fake.soloceo.vn/checkout/${orderCode}`,
        amount: dto.amount,
        currency: "VND",
        devSimulate: {
          method: "POST",
          url: `http://localhost:${this.config.get("BILLING_PORT") ?? 4200}/dev/simulate`,
          body: {
            provider,
            type: dto.type,
            orgId: user.orgId,
            ventureId: dto.ventureId,
            plan: dto.plan,
            amount: dto.amount,
            orderCode,
          },
        },
      };
    }

    if (provider === "payos") {
      const clientId = this.config.get<string>("PAYOS_CLIENT_ID");
      const apiKey = this.config.get<string>("PAYOS_API_KEY");
      const checksumKey = this.config.get<string>("PAYOS_CHECKSUM_KEY");
      if (!clientId || !apiKey || !checksumKey) {
        throw new BadRequestException(
          "PayOS chưa cấu hình — điền PAYOS_* vào .env hoặc bật PAYMENTS_FAKE=1",
        );
      }

      // orderCode PayOS phải là số nguyên dương, duy nhất theo merchant.
      const orderCodeNum = Number(
        String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 90 + 10)),
      );
      const workspaceUrl =
        this.config.get<string>("PUBLIC_WORKSPACE_URL") ?? "https://soloceo.vn";
      const desc = "SoloCEO goi"; // <=25 ký tự
      const returnUrl = `${workspaceUrl}/workspace/goi-cuoc?paid=1`;
      const cancelUrl = `${workspaceUrl}/workspace/goi-cuoc?cancel=1`;
      const amount = dto.amount;

      const signStr =
        `amount=${amount}&cancelUrl=${cancelUrl}&description=${desc}` +
        `&orderCode=${orderCodeNum}&returnUrl=${returnUrl}`;
      const signature = createHmac("sha256", checksumKey)
        .update(signStr)
        .digest("hex");

      const res = await fetch(
        "https://api-merchant.payos.vn/v2/payment-requests",
        {
          method: "POST",
          headers: {
            "x-client-id": clientId,
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderCode: orderCodeNum,
            amount,
            description: desc,
            returnUrl,
            cancelUrl,
            signature,
          }),
        },
      );
      const j = (await res.json().catch(() => null)) as {
        code?: string;
        desc?: string;
        data?: { checkoutUrl?: string };
      } | null;

      if (j?.code === "00" && j.data?.checkoutUrl) {
        // Lưu "pending": tạo Subscription tạm để webhook tra theo providerRef.
        // Chỉ subscription mới kích hoạt gói; ai_credit/venture_payment chỉ ghi log.
        if (dto.type === "subscription") {
          await this.prisma.subscription.create({
            data: {
              orgId: user.orgId,
              plan: dto.plan as Plan,
              provider: "payos",
              providerRef: String(orderCodeNum),
              status: "pending",
              currentPeriodEnd: new Date(),
            },
          });
        }
        return {
          provider,
          orderCode: String(orderCodeNum),
          checkoutUrl: j.data.checkoutUrl,
          amount,
          currency: "VND",
        };
      }
      throw new BadRequestException(
        "Không tạo được thanh toán PayOS" + (j?.desc ? `: ${j.desc}` : ""),
      );
    }
    // Stripe REST: POST /v1/checkout/sessions (cần STRIPE_SECRET_KEY)
    throw new BadRequestException(
      "Stripe chưa cấu hình — điền STRIPE_SECRET_KEY vào .env hoặc bật PAYMENTS_FAKE=1",
    );
  }

  /**
   * Webhook PayOS (công khai) — kích hoạt gói nền tảng trực tiếp, KHÔNG qua
   * WoWonder Pro. LUÔN trả {success:true} (HTTP 200) cho ping xác thực; chỉ
   * kích hoạt khi chữ ký hợp lệ + code 00 + có Subscription pending khớp.
   */
  async handlePayosWebhook(payload: {
    code?: string;
    signature?: string;
    data?: Record<string, unknown>;
  }): Promise<{ success: true }> {
    const ok = { success: true as const };
    if (!payload?.data) return ok;

    const checksumKey = this.config.get<string>("PAYOS_CHECKSUM_KEY");
    if (!checksumKey) return ok;

    // verify: ksort data → nối k=v& → HMAC checksumKey
    const data = payload.data;
    const pairs = Object.keys(data)
      .sort()
      .map((k) => {
        let v = data[k];
        if (v && typeof v === "object") v = JSON.stringify(v);
        if (v === null || v === undefined) v = "";
        if (v === true) v = "true";
        if (v === false) v = "false";
        return `${k}=${String(v)}`;
      });
    const expected = createHmac("sha256", checksumKey)
      .update(pairs.join("&"))
      .digest("hex");
    if (expected !== payload.signature) return ok;

    if (payload.code !== "00") return ok;
    const orderCode = data["orderCode"];
    if (orderCode === undefined || orderCode === null) return ok;

    const sub = await this.prisma.subscription.findFirst({
      where: { providerRef: String(orderCode), status: "pending" },
    });
    if (!sub) return ok; // đã kích hoạt hoặc không phải đơn của ta → idempotent

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "active", currentPeriodEnd: periodEnd },
      }),
      this.prisma.org.update({
        where: { id: sub.orgId },
        data: { plan: sub.plan, status: "ACTIVE" },
      }),
    ]);
    return ok;
  }

  /** GET /v1/revenue/ledger?ventureId=&from=&to= */
  async ledger(
    user: RequestUser,
    ventureId?: string,
    from?: string,
    to?: string,
  ) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const ventures = await this.prisma.venture.findMany({
      where: { orgId: user.orgId, ...(ventureId ? { id: ventureId } : {}) },
      select: { id: true },
    });
    if (ventureId && ventures.length === 0) {
      throw new NotFoundException("Không tìm thấy venture");
    }
    return this.prisma.transaction.findMany({
      where: {
        ventureId: { in: ventures.map((v) => v.id) },
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
  }

  /** POST /v1/revenue/manual — doanh thu ngoài nền tảng (verified=false) */
  async manualRevenue(user: RequestUser, dto: ManualRevenueDto) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const venture = await this.prisma.venture.findFirst({
      where: { id: dto.ventureId, orgId: user.orgId },
    });
    if (!venture) throw new NotFoundException("Không tìm thấy venture");
    return this.prisma.transaction.create({
      data: {
        ventureId: dto.ventureId,
        direction: "IN",
        grossAmount: dto.amount,
        currency: "VND",
        provider: "manual",
        providerRef: `manual:${randomUUID()}`,
        occurredAt: new Date(dto.occurredAt),
        verified: false, // KHÔNG tính vào badge "doanh thu đã xác thực"
        meta: { description: dto.description },
      },
    });
  }
}
