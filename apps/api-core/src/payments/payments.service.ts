import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PLANS, type PlanKey } from "@soloceo/shared";
import { randomUUID } from "node:crypto";
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
      // PayOS REST: POST /v2/payment-requests (cần PAYOS_CLIENT_ID/API_KEY)
      throw new BadRequestException(
        "PayOS chưa cấu hình — điền PAYOS_* vào .env hoặc bật PAYMENTS_FAKE=1",
      );
    }
    // Stripe REST: POST /v1/checkout/sessions (cần STRIPE_SECRET_KEY)
    throw new BadRequestException(
      "Stripe chưa cấu hình — điền STRIPE_SECRET_KEY vào .env hoặc bật PAYMENTS_FAKE=1",
    );
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
