import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PLANS, type PlanKey } from "@soloceo/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import { decryptSecret, encryptSecret } from "./crypto.util";
import { LiteLLMClient } from "./litellm.client";

const LITELLM_KEY_SECRET = "litellm_virtual_key";

// Quy đổi token-credit gói → ngân sách USD trên LiteLLM (xấp xỉ, điều chỉnh
// theo giá model thực tế; nguồn sự thật là max_budget trên LiteLLM)
const BUDGET_USD_BY_PLAN: Record<PlanKey, number> = {
  STARTER: 1,
  GROWTH: 10,
  SCALE: 40,
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly litellm: LiteLLMClient,
  ) {}

  /** Đảm bảo org có virtual key (tạo khi kích hoạt Org — Phần 8.2) */
  async ensureVirtualKey(orgId: string): Promise<string> {
    const existing = await this.prisma.secret.findUnique({
      where: { orgId_key: { orgId, key: LITELLM_KEY_SECRET } },
    });
    if (existing) return decryptSecret(existing.valueEnc);

    const org = await this.prisma.org.findUniqueOrThrow({
      where: { id: orgId },
    });
    const budget = BUDGET_USD_BY_PLAN[org.plan as PlanKey];
    const { key } = await this.litellm.generateKey(orgId, budget);
    await this.prisma.secret.create({
      data: { orgId, key: LITELLM_KEY_SECRET, valueEnc: encryptSecret(key) },
    });
    this.logger.log(`Đã tạo LiteLLM virtual key cho org ${orgId}`);
    return key;
  }

  budgetUsdFor(plan: string): number {
    return BUDGET_USD_BY_PLAN[plan as PlanKey] ?? 1;
  }

  /** GET /v1/ai/usage — chi tiết theo ngày trong tháng hiện tại */
  async usage(user: RequestUser) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return this.prisma.aiUsage.findMany({
      where: { orgId: user.orgId, day: { gte: monthStart } },
      orderBy: { day: "asc" },
    });
  }

  /** GET /v1/ai/usage/summary — tổng tháng + budget (cửa sổ Tổng quan) */
  async usageSummary(user: RequestUser) {
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const org = await this.prisma.org.findUniqueOrThrow({
      where: { id: user.orgId },
    });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const agg = await this.prisma.aiUsage.aggregate({
      where: { orgId: user.orgId, day: { gte: monthStart } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    });
    const totalCostUsd = Number(agg._sum.costUsd ?? 0);
    const budgetUsd = this.budgetUsdFor(org.plan);
    return {
      totalCostUsd,
      totalTokens:
        (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0),
      budgetUsd,
      budgetUsedPct: budgetUsd > 0 ? (totalCostUsd / budgetUsd) * 100 : 0,
    };
  }

  /**
   * Dev-only (LITELLM_FAKE=1): mô phỏng 1 lời gọi LLM để demo dashboard,
   * cảnh báo budget và hành vi 429 khi vượt ngân sách.
   */
  async devSimulateUsage(
    user: RequestUser,
    body: { model?: string; inputTokens?: number; outputTokens?: number },
  ) {
    if (process.env.LITELLM_FAKE !== "1") {
      throw new ForbiddenException("Chỉ khả dụng ở chế độ LITELLM_FAKE");
    }
    if (!user.orgId) throw new ForbiddenException("Chưa có Org");
    const org = await this.prisma.org.findUniqueOrThrow({
      where: { id: user.orgId },
    });
    await this.ensureVirtualKey(user.orgId);

    const summary = await this.usageSummary(user);
    if (summary.totalCostUsd >= summary.budgetUsd) {
      // hành vi giống LiteLLM khi virtual key vượt max_budget (Phần 5, logic 3)
      throw new HttpException(
        {
          message:
            "Vượt ngân sách AI của gói — mua thêm credit hoặc nâng gói",
          cta: "buy_ai_credit",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const inputTokens = body.inputTokens ?? 1200;
    const outputTokens = body.outputTokens ?? 600;
    const model = body.model ?? "soloceo-smart";
    // giá xấp xỉ để demo: $3/1M input, $15/1M output
    const costUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.prisma.aiUsage.create({
      data: {
        orgId: org.id,
        model,
        inputTokens,
        outputTokens,
        costUsd,
        day: today,
      },
    });
    return { ok: true, model, inputTokens, outputTokens, costUsd };
  }

  /** Cron mỗi giờ: đồng bộ usage LiteLLM → AiUsage (Phần 8.2) */
  @Cron(CronExpression.EVERY_HOUR)
  async syncUsage() {
    if (process.env.LITELLM_FAKE === "1") return; // fake mode ghi trực tiếp
    try {
      const since = new Date();
      since.setDate(since.getDate() - 2);
      const orgs = await this.prisma.org.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      for (const org of orgs) {
        const rows = await this.litellm.getSpendByOrg(
          org.id,
          since.toISOString(),
        );
        for (const r of rows) {
          const day = new Date(r.day);
          // upsert theo (org, model, day): xóa bản ghi cũ trong ngày rồi ghi lại
          await this.prisma.aiUsage.deleteMany({
            where: { orgId: org.id, model: r.model, day },
          });
          await this.prisma.aiUsage.create({
            data: {
              orgId: org.id,
              model: r.model,
              inputTokens: r.inputTokens,
              outputTokens: r.outputTokens,
              costUsd: r.costUsd,
              day,
            },
          });
        }
      }
      this.logger.log(`Đồng bộ AiUsage cho ${orgs.length} org`);
    } catch (err) {
      this.logger.error("Đồng bộ AiUsage lỗi", err as Error);
    }
  }
}
