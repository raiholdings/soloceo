import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LISTING_ELIGIBILITY,
  revenueRangeLabel,
} from "@soloceo/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";

// Checklist chuyển giao mặc định của deal-room (Phần GĐ6) — admin RAI
// phê duyệt từng bước, escrow thủ công (ADR-003).
const DEFAULT_CHECKLIST = [
  { key: "nda_contract", label: "Ký hợp đồng chuyển nhượng (giấy)", done: false },
  { key: "escrow_deposit", label: "Buyer chuyển tiền vào escrow RAI", done: false },
  { key: "domain", label: "Chuyển giao domain", done: false },
  { key: "coolify_project", label: "Chuyển Coolify project sang org buyer", done: false },
  { key: "secrets", label: "Bàn giao secrets/API keys", done: false },
  { key: "escrow_release", label: "RAI giải ngân cho seller", done: false },
];

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  private requireOrgId(user: RequestUser): string {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    return user.orgId;
  }

  /** Tính ttmRevenue từ Transaction — nguồn sự thật duy nhất, khóa không sửa tay */
  private async computeTtm(ventureId: string) {
    const ttmStart = new Date();
    ttmStart.setFullYear(ttmStart.getFullYear() - 1);
    const [sum, verifiedCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          ventureId,
          direction: "IN",
          verified: true,
          occurredAt: { gte: ttmStart },
        },
        _sum: { grossAmount: true },
      }),
      this.prisma.transaction.count({
        where: { ventureId, direction: "IN", verified: true },
      }),
    ]);
    return {
      ttmRevenue: Number(sum._sum.grossAmount ?? 0),
      verifiedTxCount: verifiedCount,
    };
  }

  /** Kiểm tra điều kiện niêm yết (Phần 5, mục 4) */
  async checkEligibility(user: RequestUser, ventureId: string) {
    const orgId = this.requireOrgId(user);
    const venture = await this.prisma.venture.findFirst({
      where: { id: ventureId, orgId },
      include: { org: true },
    });
    if (!venture) throw new NotFoundException("Không tìm thấy venture");

    const ageDays = Math.floor(
      (Date.now() - venture.createdAt.getTime()) / 86_400_000,
    );
    const { ttmRevenue, verifiedTxCount } = await this.computeTtm(ventureId);

    const checks = {
      minAge: {
        pass: ageDays >= LISTING_ELIGIBILITY.minVentureAgeDays,
        actual: ageDays,
        required: LISTING_ELIGIBILITY.minVentureAgeDays,
        label: "Tuổi venture (ngày)",
      },
      minVerifiedTx: {
        pass: verifiedTxCount >= LISTING_ELIGIBILITY.minVerifiedInboundTx,
        actual: verifiedTxCount,
        required: LISTING_ELIGIBILITY.minVerifiedInboundTx,
        label: "Giao dịch IN đã xác thực",
      },
      ttmRevenue: {
        pass: ttmRevenue > LISTING_ELIGIBILITY.minTtmRevenue,
        actual: ttmRevenue,
        required: LISTING_ELIGIBILITY.minTtmRevenue,
        label: "Doanh thu 12 tháng (VND)",
      },
    };
    return {
      eligible: Object.values(checks).every((c) => c.pass),
      checks,
      ttmRevenue,
    };
  }

  /** POST /v1/listings — tạo niêm yết, ttmRevenue tự tính, chờ admin duyệt */
  async createListing(
    user: RequestUser,
    ventureId: string,
    askPrice: number,
    summary: string,
  ) {
    const { eligible, ttmRevenue, checks } = await this.checkEligibility(
      user,
      ventureId,
    );
    if (!eligible) {
      throw new BadRequestException({
        message: "Venture chưa đủ điều kiện niêm yết",
        checks,
      });
    }
    const existing = await this.prisma.listing.findUnique({
      where: { ventureId },
    });
    if (existing && existing.status !== "WITHDRAWN") {
      throw new ConflictException("Venture đã có listing");
    }

    const data = {
      askPrice,
      summary,
      ttmRevenue, // khóa từ sổ cái — không nhận từ client
      status: "PENDING_REVIEW" as const,
    };
    const listing = existing
      ? await this.prisma.listing.update({ where: { ventureId }, data })
      : await this.prisma.listing.create({ data: { ventureId, ...data } });

    await this.prisma.venture.update({
      where: { id: ventureId },
      data: { status: "LISTED" },
    });
    return listing;
  }

  /** GET /v1/marketplace/listings — public, số liệu dạng khoảng (Phần 4.1) */
  async publicListings() {
    const listings = await this.prisma.listing.findMany({
      where: { status: "LIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        venture: {
          select: {
            name: true,
            slug: true,
            industry: true,
            revenueVerified: true,
            createdAt: true,
          },
        },
      },
    });
    return listings.map((l) => ({
      id: l.id,
      venture: l.venture,
      summary: l.summary,
      askPrice: Number(l.askPrice),
      currency: l.currency,
      // ẨN số chính xác — chỉ hiện khoảng
      ttmRevenueRange: revenueRangeLabel(Number(l.ttmRevenue ?? 0)),
      createdAt: l.createdAt,
    }));
  }

  /** POST /v1/marketplace/listings/:id/nda — click-wrap */
  async acceptNda(user: RequestUser, listingId: string) {
    const orgId = this.requireOrgId(user);
    await this.getLiveListing(listingId);
    await this.prisma.ndaAcceptance.upsert({
      where: { listingId_orgId: { listingId, orgId } },
      update: {},
      create: { listingId, orgId },
    });
    return { accepted: true };
  }

  private async getLiveListing(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { venture: { include: { org: true } } },
    });
    if (!listing) throw new NotFoundException("Không tìm thấy listing");
    return listing;
  }

  /** GET /v1/marketplace/listings/:id — cần đăng nhập + đã ký NDA → số chi tiết */
  async listingDetail(user: RequestUser, listingId: string) {
    const orgId = this.requireOrgId(user);
    const listing = await this.getLiveListing(listingId);
    const isOwner = listing.venture.orgId === orgId;

    const nda = await this.prisma.ndaAcceptance.findUnique({
      where: { listingId_orgId: { listingId, orgId } },
    });
    if (!isOwner && !nda) {
      throw new ForbiddenException({
        message: "Cần chấp nhận NDA trước khi xem số liệu chi tiết",
        cta: "accept_nda",
      });
    }

    const offers = isOwner
      ? await this.prisma.offer.findMany({
          where: { listingId },
          orderBy: { createdAt: "desc" },
          include: { buyerOrg: { select: { name: true } } },
        })
      : await this.prisma.offer.findMany({
          where: { listingId, buyerOrgId: orgId },
          orderBy: { createdAt: "desc" },
        });

    return {
      id: listing.id,
      status: listing.status,
      venture: {
        name: listing.venture.name,
        slug: listing.venture.slug,
        industry: listing.venture.industry,
        revenueVerified: listing.venture.revenueVerified,
        createdAt: listing.venture.createdAt,
      },
      summary: listing.summary,
      askPrice: Number(listing.askPrice),
      ttmRevenue: Number(listing.ttmRevenue ?? 0), // số thật — sau NDA
      ttmProfitEst: listing.ttmProfitEst ? Number(listing.ttmProfitEst) : null,
      currency: listing.currency,
      isOwner,
      offers,
    };
  }

  /** POST /v1/listings/:id/offers */
  async createOffer(
    user: RequestUser,
    listingId: string,
    amount: number,
    message?: string,
  ) {
    const orgId = this.requireOrgId(user);
    const listing = await this.getLiveListing(listingId);
    if (listing.status !== "LIVE") {
      throw new BadRequestException("Listing không ở trạng thái nhận offer");
    }
    if (listing.venture.orgId === orgId) {
      throw new BadRequestException("Không thể tự offer venture của mình");
    }
    const nda = await this.prisma.ndaAcceptance.findUnique({
      where: { listingId_orgId: { listingId, orgId } },
    });
    if (!nda) {
      throw new ForbiddenException("Cần chấp nhận NDA trước khi đặt offer");
    }
    return this.prisma.offer.create({
      data: { listingId, buyerOrgId: orgId, amount, message },
    });
  }

  /** POST /v1/offers/:id/accept — seller chấp nhận → IN_ESCROW + deal-room */
  async acceptOffer(user: RequestUser, offerId: string) {
    const orgId = this.requireOrgId(user);
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: { include: { venture: true } } },
    });
    if (!offer) throw new NotFoundException("Không tìm thấy offer");
    if (offer.listing.venture.orgId !== orgId) {
      throw new ForbiddenException("Chỉ chủ venture được chấp nhận offer");
    }
    if (offer.status !== "open") {
      throw new BadRequestException("Offer không còn hiệu lực");
    }

    const [, , dealRoom] = await this.prisma.$transaction([
      this.prisma.offer.update({
        where: { id: offerId },
        data: { status: "accepted" },
      }),
      this.prisma.listing.update({
        where: { id: offer.listingId },
        data: { status: "IN_ESCROW" },
      }),
      this.prisma.dealRoom.create({
        data: {
          listingId: offer.listingId,
          offerId,
          checklist: DEFAULT_CHECKLIST,
        },
      }),
      // từ chối các offer còn lại
      this.prisma.offer.updateMany({
        where: { listingId: offer.listingId, status: "open", id: { not: offerId } },
        data: { status: "rejected" },
      }),
    ]);
    // thông báo admin làm escrow thủ công (ADR-003)
    const hook = process.env.ADMIN_ALERT_WEBHOOK;
    if (hook) {
      fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Deal mới IN_ESCROW: listing ${offer.listingId}, offer ${offerId}`,
        }),
      }).catch(() => {});
    }
    return dealRoom;
  }

  /** Deal-room: xem + nhắn tin (buyer, seller) */
  async getDealRoom(user: RequestUser, dealRoomId: string) {
    const orgId = this.requireOrgId(user);
    const room = await this.prisma.dealRoom.findUnique({
      where: { id: dealRoomId },
      include: {
        offer: { include: { listing: { include: { venture: true } } } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!room) throw new NotFoundException("Không tìm thấy deal-room");
    const isBuyer = room.offer.buyerOrgId === orgId;
    const isSeller = room.offer.listing.venture.orgId === orgId;
    if (!isBuyer && !isSeller && !user.isPlatformAdmin) {
      throw new ForbiddenException("Không có quyền truy cập deal-room");
    }
    return room;
  }

  async postDealMessage(
    user: RequestUser,
    dealRoomId: string,
    content: string,
  ) {
    await this.getDealRoom(user, dealRoomId); // kiểm tra quyền
    return this.prisma.dealMessage.create({
      data: { dealRoomId, orgId: user.orgId!, content },
    });
  }
}
