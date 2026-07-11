import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsUUID } from "class-validator";
import { AdminOnly, CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProvisionQueueService } from "../store/provision-queue.service";

class TransferDto {
  @IsUUID()
  buyerOrgId!: string;
}

@ApiTags("admin")
@ApiBearerAuth()
@AdminOnly()
@Controller("admin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ProvisionQueueService,
  ) {}

  private audit(user: RequestUser, action: string, targetId?: string, meta?: object) {
    return this.prisma.adminAction.create({
      data: { adminUser: user.userId, action, targetId, meta: meta as never },
    });
  }

  @Get("orgs")
  @ApiOperation({ summary: "Danh sách org/tenant" })
  orgs() {
    return this.prisma.org.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { ventures: true } },
        subscriptions: {
          where: { status: "active" },
          take: 1,
          orderBy: { currentPeriodEnd: "desc" },
        },
      },
    });
  }

  @Patch("orgs/:id/suspend")
  @ApiOperation({ summary: "Suspend org (kill-switch)" })
  async suspend(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const org = await this.prisma.org.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });
    await this.audit(user, "org.suspend", id);
    return org;
  }

  @Patch("orgs/:id/activate")
  @ApiOperation({ summary: "Kích hoạt lại org" })
  async activate(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const org = await this.prisma.org.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    await this.audit(user, "org.activate", id);
    return org;
  }

  @Get("ai-usage")
  @ApiOperation({ summary: "Chi phí AI theo org (tháng hiện tại)" })
  async aiUsage(@Query("groupBy") _groupBy?: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const rows = await this.prisma.aiUsage.groupBy({
      by: ["orgId"],
      where: { day: { gte: monthStart } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      orderBy: { _sum: { costUsd: "desc" } },
    });
    const orgs = await this.prisma.org.findMany({
      where: { id: { in: rows.map((r) => r.orgId) } },
      select: { id: true, name: true, plan: true },
    });
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    return rows.map((r) => ({
      org: orgMap.get(r.orgId),
      costUsd: Number(r._sum.costUsd ?? 0),
      tokens: (r._sum.inputTokens ?? 0) + (r._sum.outputTokens ?? 0),
    }));
  }

  @Get("listings/pending")
  @ApiOperation({ summary: "Listing chờ duyệt (SLA 24h)" })
  pendingListings() {
    return this.prisma.listing.findMany({
      where: { status: "PENDING_REVIEW" },
      include: { venture: { include: { org: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    });
  }

  @Post("listings/:id/approve")
  @ApiOperation({ summary: "Duyệt listing → LIVE trên sàn" })
  async approve(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const listing = await this.prisma.listing.update({
      where: { id },
      data: { status: "LIVE" },
    });
    await this.audit(user, "listing.approve", id);
    return listing;
  }

  @Post("installs/:id/redeploy")
  @ApiOperation({ summary: "Redeploy 1 app install" })
  async redeploy(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const install = await this.prisma.appInstall.findUnique({ where: { id } });
    if (!install) throw new NotFoundException("Không tìm thấy install");
    await this.prisma.appInstall.update({
      where: { id },
      data: { status: "QUEUED" },
    });
    await this.queue.enqueueProvision({
      ventureId: install.ventureId,
      installIds: [id],
    });
    await this.audit(user, "install.redeploy", id);
    return { queued: true };
  }

  @Post("listings/:id/complete-transfer")
  @ApiOperation({
    summary:
      "Hoàn tất chuyển giao M&A: đổi org sở hữu venture, listing + venture → SOLD",
  })
  async completeTransfer(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TransferDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { venture: true },
    });
    if (!listing) throw new NotFoundException("Không tìm thấy listing");
    if (listing.status !== "IN_ESCROW") {
      throw new BadRequestException("Listing chưa ở trạng thái IN_ESCROW");
    }
    const buyer = await this.prisma.org.findUnique({
      where: { id: dto.buyerOrgId },
    });
    if (!buyer) throw new NotFoundException("Không tìm thấy org buyer");

    await this.prisma.$transaction([
      this.prisma.venture.update({
        where: { id: listing.ventureId },
        data: { orgId: dto.buyerOrgId, status: "SOLD" },
      }),
      this.prisma.listing.update({
        where: { id },
        data: { status: "SOLD" },
      }),
      this.prisma.dealRoom.updateMany({
        where: { listingId: id },
        data: { status: "transferred" },
      }),
    ]);
    await this.audit(user, "listing.complete_transfer", id, {
      buyerOrgId: dto.buyerOrgId,
      ventureId: listing.ventureId,
    });
    // Coolify project transfer giữa 2 org: thao tác hạ tầng thủ công/riêng —
    // đánh dấu bước checklist tương ứng trong deal-room khi admin làm xong.
    return { transferred: true, ventureId: listing.ventureId };
  }

  @Get("actions")
  @ApiOperation({ summary: "Audit log hành động quản trị" })
  actions() {
    return this.prisma.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ── Cockpit /workspace/admin (12/07 — hướng "Appsmith + code riêng") ──────

  @Get("overview")
  @ApiOperation({ summary: "Tổng quan hệ sinh thái cho cockpit" })
  async overview() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [orgs, ventures, installs, revenue30d, pendingApprovals, pendingListings] =
      await Promise.all([
        this.prisma.org.groupBy({ by: ["status"], _count: true }),
        this.prisma.venture.groupBy({ by: ["status"], _count: true }),
        this.prisma.appInstall.groupBy({ by: ["status"], _count: true }),
        this.prisma.transaction.aggregate({
          where: { direction: "IN", verified: true, occurredAt: { gte: thirtyDaysAgo } },
          _sum: { grossAmount: true },
        }),
        this.prisma.approvalRequest.count({ where: { status: "PENDING" } }),
        this.prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
      ]);
    return {
      orgs: Object.fromEntries(orgs.map((o) => [o.status, o._count])),
      ventures: Object.fromEntries(ventures.map((v) => [v.status, v._count])),
      installs: Object.fromEntries(installs.map((i) => [i.status, i._count])),
      revenue30d: Number(revenue30d._sum.grossAmount ?? 0),
      pendingApprovals,
      pendingListings,
    };
  }

  @Get("ventures")
  @ApiOperation({ summary: "Danh sách venture kèm org (cockpit)" })
  ventures() {
    return this.prisma.venture.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, name: true, slug: true, industry: true, status: true,
        revenueVerified: true, createdAt: true,
        org: { select: { id: true, name: true, plan: true, status: true } },
      },
    });
  }

  @Get("installs")
  @ApiOperation({ summary: "Danh sách app đã cài (Marketplace) toàn hệ thống" })
  installs() {
    return this.prisma.appInstall.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, status: true, url: true, createdAt: true,
        venture: { select: { name: true, slug: true } },
        catalogApp: { select: { key: true, name: true } },
      },
    });
  }

  @Get("approvals")
  @ApiOperation({ summary: "Hàng chờ phê duyệt HITL toàn hệ thống" })
  approvals() {
    return this.prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }

  /**
   * Proxy danh sách TRỢ LÝ MẶC ĐỊNH từ DeerFlow gateway — token nội bộ nằm
   * server-side (env DEERFLOW_INTERNAL_TOKEN), KHÔNG bao giờ xuống browser.
   */
  @Get("agents")
  @ApiOperation({ summary: "49+ trợ lý mặc định (proxy DeerFlow gateway)" })
  async agents() {
    const base = process.env.DEERFLOW_PUBLIC_BASE ?? "https://soloceo.vn";
    const token = process.env.DEERFLOW_INTERNAL_TOKEN;
    if (!token) return { agents: [], note: "Chưa cấu hình DEERFLOW_INTERNAL_TOKEN" };
    const res = await fetch(`${base}/api/agents`, {
      headers: { "X-DeerFlow-Internal-Token": token },
    });
    if (!res.ok) return { agents: [], note: `Gateway trả ${res.status}` };
    const data = (await res.json()) as { agents?: { name: string; description?: string }[] };
    // chỉ trả metadata (không trả soul đầy đủ cho nhẹ)
    return {
      agents: (data.agents ?? []).map((a) => ({ name: a.name, description: a.description ?? "" })),
    };
  }
}
