import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PLANS, type PlanKey } from "@soloceo/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import { CreateVentureDto, UpdateVentureDto } from "./ventures.dto";

@Injectable()
export class VenturesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOrgId(user: RequestUser): string {
    if (!user.orgId) {
      throw new ForbiddenException("Chưa có Org — hãy tạo Org trước");
    }
    return user.orgId;
  }

  async create(user: RequestUser, dto: CreateVentureDto) {
    const orgId = this.requireOrgId(user);
    const org = await this.prisma.org.findUniqueOrThrow({
      where: { id: orgId },
      include: { _count: { select: { ventures: true } } },
    });

    const plan = PLANS[org.plan as PlanKey];
    if (org._count.ventures >= plan.maxVentures) {
      // 402 kèm CTA nâng gói (CLAUDE.md Phần 5, logic bắt buộc số 2)
      throw new HttpException(
        {
          message: `Gói ${plan.label} chỉ cho phép ${plan.maxVentures} venture`,
          cta: "upgrade_plan",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const slugTaken = await this.prisma.venture.findUnique({
      where: { slug: dto.slug },
    });
    if (slugTaken) {
      throw new ConflictException("Slug đã được sử dụng — chọn tên khác");
    }

    return this.prisma.venture.create({
      data: {
        orgId,
        name: dto.name,
        slug: dto.slug,
        industry: dto.industry,
        description: dto.description,
      },
    });
  }

  async list(user: RequestUser) {
    const orgId = this.requireOrgId(user);
    return this.prisma.venture.findMany({
      where: { orgId },
      orderBy: { createdAt: "asc" },
      include: {
        installs: {
          where: { status: { not: "REMOVED" } },
          include: { catalogApp: { select: { key: true } } },
        },
      },
    });
  }

  async getOwned(user: RequestUser, id: string) {
    const orgId = this.requireOrgId(user);
    const venture = await this.prisma.venture.findFirst({
      where: { id, orgId },
      include: {
        installs: {
          where: { status: { not: "REMOVED" } },
          include: { catalogApp: { select: { key: true } } },
        },
      },
    });
    if (!venture) {
      throw new NotFoundException("Không tìm thấy venture");
    }
    return venture;
  }

  async update(user: RequestUser, id: string, dto: UpdateVentureDto) {
    await this.getOwned(user, id);
    return this.prisma.venture.update({ where: { id }, data: { ...dto } });
  }

  /** Tổng hợp doanh thu từ Transaction: mtd, ttm, chart 12 tháng (Phần 6.2) */
  async revenue(user: RequestUser, id: string) {
    const venture = await this.getOwned(user, id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ttmStart = new Date(now);
    ttmStart.setFullYear(ttmStart.getFullYear() - 1);

    const [mtd, ttm, verifiedCount, totalCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ventureId: id,
          direction: "IN",
          verified: true,
          occurredAt: { gte: monthStart },
        },
        _sum: { grossAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          ventureId: id,
          direction: "IN",
          verified: true,
          occurredAt: { gte: ttmStart },
        },
        _sum: { grossAmount: true },
      }),
      this.prisma.transaction.count({
        where: { ventureId: id, direction: "IN", verified: true },
      }),
      this.prisma.transaction.count({
        where: { ventureId: id, direction: "IN" },
      }),
    ]);

    const monthly = await this.prisma.$queryRaw<
      Array<{ month: Date; revenue: number }>
    >`
      SELECT date_trunc('month', "occurredAt") AS month,
             COALESCE(SUM("grossAmount"), 0)::float AS revenue
      FROM "Transaction"
      WHERE "ventureId" = ${id}
        AND direction = 'IN'
        AND verified = true
        AND "occurredAt" >= ${ttmStart}
      GROUP BY 1
      ORDER BY 1
    `;

    return {
      ventureId: id,
      currency: "VND",
      mtdRevenue: Number(mtd._sum.grossAmount ?? 0),
      ttmRevenue: Number(ttm._sum.grossAmount ?? 0),
      // badge "Doanh thu đã xác thực": 100% giao dịch IN từ webhook
      revenueVerified: totalCount > 0 && verifiedCount === totalCount,
      monthly: monthly.map((m) => ({
        month: m.month.toISOString().slice(0, 7),
        revenue: m.revenue,
      })),
      status: venture.status,
    };
  }
}
