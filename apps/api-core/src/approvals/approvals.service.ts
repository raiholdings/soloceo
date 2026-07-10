import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";

/**
 * Hàng đợi phê duyệt HITL tầng 2 (người thật) — SoloCEO OS v2 (PHA 3).
 * Nguồn tạo: RulesService (arishem REQUIRE_APPROVAL) và node FlowGram
 * `human_approval`. Khi duyệt: nếu có thread/run của DeerFlow → resume luồng
 * (interrupt-resume, research/R1 §5: POST /api/threads/{id}/state + run mới).
 */
@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);
  private readonly gatewayUrl =
    process.env.DEERFLOW_GATEWAY_URL ?? "http://deerflow:8001";

  constructor(private readonly prisma: PrismaService) {}

  /** Danh sách chờ duyệt: admin xem toàn bộ; chủ org chỉ xem của org mình. */
  listPending(user: RequestUser) {
    if (user.isPlatformAdmin) {
      return this.prisma.approvalRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });
    }
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    return this.prisma.approvalRequest.findMany({
      where: { status: "PENDING", orgId: user.orgId },
      orderBy: { createdAt: "asc" },
    });
  }

  async decide(user: RequestUser, id: string, approve: boolean, note?: string) {
    const req = await this.prisma.approvalRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException("Không tìm thấy yêu cầu phê duyệt");
    // Quyền: platform_admin, hoặc chủ org của yêu cầu.
    if (!user.isPlatformAdmin && req.orgId !== user.orgId) {
      throw new ForbiddenException("Không có quyền với yêu cầu này");
    }
    if (req.status !== "PENDING") {
      throw new ForbiddenException(`Yêu cầu đã ở trạng thái ${req.status}`);
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: approve ? "APPROVED" : "REJECTED",
        decidedBy: user.userId,
        decidedAt: new Date(),
      },
    });

    // Resume DeerFlow nếu yêu cầu gắn với một run đang interrupt (best-effort).
    if (approve && req.threadId) {
      await this.resumeDeerflow(req.threadId, req.runId, note).catch((e) =>
        this.logger.warn(
          `Không resume được DeerFlow thread ${req.threadId}: ${(e as Error).message}`,
        ),
      );
    }
    return updated;
  }

  /** Bơm quyết định người duyệt vào state của thread rồi kích run tiếp (R1 §5). */
  private async resumeDeerflow(
    threadId: string,
    runId: string | null,
    note?: string,
  ) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      await fetch(`${this.gatewayUrl}/api/threads/${threadId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: { hitl_decision: "approved", note: note ?? null, runId },
        }),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
