import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { canInstallApp, PLANS, type PlanKey } from "@soloceo/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import { ProvisionQueueService } from "./provision-queue.service";
import { decryptSecret } from "../ai/crypto.util";

// App mặc định cài khi "Khởi chạy doanh nghiệp" — ADR-005 (tạm thời: Claw3D + OpenClaw).
// ERPNext vẫn cài được từ App Store nhưng không tự cài mặc định.
const DEFAULT_APPS_BY_PLAN: Record<PlanKey, string[]> = {
  STARTER: ["claw3d", "openclaw"],
  GROWTH: ["claw3d", "openclaw"],
  SCALE: ["claw3d", "openclaw"],
};

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ProvisionQueueService,
  ) {}

  private async getOwnedVenture(user: RequestUser, ventureId: string) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const venture = await this.prisma.venture.findFirst({
      where: { id: ventureId, orgId: user.orgId },
      include: { org: true },
    });
    if (!venture) throw new NotFoundException("Không tìm thấy venture");
    return venture;
  }

  /** GET /v1/store/apps — catalog, đánh dấu quyền theo gói */
  async listApps(user: RequestUser) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const org = await this.prisma.org.findUniqueOrThrow({
      where: { id: user.orgId },
    });
    const apps = await this.prisma.catalogApp.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return apps.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      category: a.category,
      planMin: a.planMin,
      allowed: canInstallApp(org.plan as PlanKey, a.key),
    }));
  }

  /** POST /v1/ventures/:id/installs */
  async install(user: RequestUser, ventureId: string, catalogAppKey: string) {
    const venture = await this.getOwnedVenture(user, ventureId);
    const app = await this.prisma.catalogApp.findUnique({
      where: { key: catalogAppKey },
    });
    if (!app || !app.active) {
      throw new NotFoundException("App không tồn tại trong catalog");
    }
    if (!canInstallApp(venture.org.plan as PlanKey, app.key)) {
      // 402 kèm CTA nâng gói (Phần 5)
      throw new HttpException(
        {
          message: `App "${app.name}" cần gói cao hơn (từ ${PLANS[app.planMin as PlanKey].label})`,
          cta: "upgrade_plan",
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const existing = await this.prisma.appInstall.findFirst({
      where: {
        ventureId,
        catalogAppId: app.id,
        status: { in: ["QUEUED", "DEPLOYING", "RUNNING"] },
      },
    });
    if (existing) {
      throw new ConflictException("App này đã được cài hoặc đang cài");
    }

    const install = await this.prisma.appInstall.create({
      data: { ventureId, catalogAppId: app.id, status: "QUEUED" },
    });
    await this.queue.enqueueProvision({
      ventureId,
      installIds: [install.id],
    });
    return install;
  }

  /** POST /v1/ventures/:id/launch — DRAFT → PROVISIONING, cài app mặc định theo gói */
  async launch(user: RequestUser, ventureId: string) {
    const venture = await this.getOwnedVenture(user, ventureId);
    if (venture.status === "PROVISIONING") {
      throw new ConflictException("Venture đang được khởi tạo");
    }
    if (venture.status !== "DRAFT" && venture.status !== "PAUSED") {
      throw new BadRequestException(
        `Không thể khởi chạy từ trạng thái ${venture.status}`,
      );
    }

    const defaultKeys = DEFAULT_APPS_BY_PLAN[venture.org.plan as PlanKey];
    const apps = await this.prisma.catalogApp.findMany({
      where: { key: { in: defaultKeys }, active: true },
    });
    const already = await this.prisma.appInstall.findMany({
      where: {
        ventureId,
        status: { in: ["QUEUED", "DEPLOYING", "RUNNING"] },
      },
      select: { catalogAppId: true },
    });
    const alreadyIds = new Set(already.map((i) => i.catalogAppId));
    const toInstall = apps.filter((a) => !alreadyIds.has(a.id));

    const installs = await this.prisma.$transaction(
      toInstall.map((a) =>
        this.prisma.appInstall.create({
          data: { ventureId, catalogAppId: a.id, status: "QUEUED" },
        }),
      ),
    );
    await this.prisma.venture.update({
      where: { id: ventureId },
      data: { status: "PROVISIONING" },
    });
    await this.queue.enqueueProvision({
      ventureId,
      installIds: installs.map((i) => i.id),
    });
    return { ventureId, status: "PROVISIONING", queued: installs.length };
  }

  /** GET /v1/ventures/:id/installs */
  async listInstalls(user: RequestUser, ventureId: string) {
    await this.getOwnedVenture(user, ventureId);
    return this.prisma.appInstall.findMany({
      where: { ventureId, status: { not: "REMOVED" } },
      include: { catalogApp: { select: { key: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * GET /v1/ventures/:id/openclaw-access — URL Control UI + token gateway để
   * OS Shell nhúng OpenClaw (auth qua fragment #token=, không lộ ra server log).
   * Chỉ chủ Org của venture mới lấy được.
   */
  async getOpenclawAccess(user: RequestUser, ventureId: string) {
    const venture = await this.getOwnedVenture(user, ventureId);
    const install = await this.prisma.appInstall.findFirst({
      where: {
        ventureId,
        status: "RUNNING",
        catalogApp: { key: "openclaw" },
      },
    });
    if (!install?.url) {
      return { ready: false as const, url: null, token: null };
    }
    const secret = await this.prisma.secret.findUnique({
      where: {
        orgId_key: {
          orgId: venture.orgId,
          key: `openclaw_token:${ventureId}`,
        },
      },
    });
    let token: string | null = null;
    if (secret) {
      try {
        token = decryptSecret(secret.valueEnc);
      } catch {
        token = null;
      }
    }
    return { ready: true as const, url: install.url, token };
  }

  /** DELETE /v1/installs/:installId?confirm=true — checkpoint 2 bước */
  async removeInstall(user: RequestUser, installId: string, confirm: boolean) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const install = await this.prisma.appInstall.findFirst({
      where: { id: installId, venture: { orgId: user.orgId } },
      include: { catalogApp: { select: { name: true } } },
    });
    if (!install) throw new NotFoundException("Không tìm thấy bản cài");
    if (!confirm) {
      // bước 1: trả yêu cầu xác nhận (human-in-the-loop — nguyên tắc bất biến)
      return {
        requiresConfirmation: true,
        message: `Gỡ "${install.catalogApp.name}" sẽ XÓA toàn bộ dữ liệu app này. Gọi lại với ?confirm=true để xác nhận.`,
      };
    }
    await this.queue.enqueueRemove({ installId });
    return { requiresConfirmation: false, status: "REMOVAL_QUEUED" };
  }

  /** GET /v1/installs/:installId/logs — proxy log từ Coolify */
  async getLogs(user: RequestUser, installId: string) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const install = await this.prisma.appInstall.findFirst({
      where: { id: installId, venture: { orgId: user.orgId } },
    });
    if (!install) throw new NotFoundException("Không tìm thấy bản cài");
    if (!install.coolifyAppId) {
      return { logs: "Chưa có log — app chưa được deploy." };
    }
    if (process.env.COOLIFY_FAKE === "1") {
      return {
        logs: `[fake-coolify] app ${install.coolifyAppId} — trạng thái ${install.status}`,
      };
    }
    const res = await fetch(
      `${process.env.COOLIFY_BASE_URL}/api/v1/services/${install.coolifyAppId}/logs`,
      {
        headers: { Authorization: `Bearer ${process.env.COOLIFY_API_TOKEN}` },
      },
    );
    const body = await res.json().catch(() => ({ logs: "" }));
    return { logs: (body as { logs?: string }).logs ?? "" };
  }
}
