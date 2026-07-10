import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import {
  DEFAULT_ACTION_POLICY,
  isSensitiveAction,
  type SensitiveAction,
} from "@soloceo/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";

/**
 * HITL gate tầng 1 (arishem) — SoloCEO OS v2 (PHA 3, research/R6 §A).
 * Mọi hành động nhạy cảm (chi tiền, ký, xóa, đăng công khai…) đi qua đây TRƯỚC
 * khi thực thi. Gọi microservice `svc-rules-engine` (Go + arishem) qua HTTP;
 * nếu service chưa deploy/không phản hồi → FAIL-CLOSED theo DEFAULT_ACTION_POLICY
 * (không bao giờ fail-open với chi tiền/xóa). Ghi audit vào RuleDecisionLog.
 * decision=REQUIRE_APPROVAL → tạo ApprovalRequest (tầng 2, người duyệt).
 */
export interface EvaluateInput {
  action: string;
  orgId: string;
  ventureId?: string | null;
  /** context/facts cho engine. LƯU Ý: caller nên mask PII trước (svc-dlp). */
  context?: Record<string, unknown>;
  actorUserId?: string | null;
  /** Nối interrupt-resume DeerFlow khi cần duyệt (R1). */
  threadId?: string | null;
  runId?: string | null;
}

export interface EvaluateResult {
  decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
  ruleId: string | null;
  tier?: 1 | 2;
  reason?: string;
  approvalId?: string;
  /** true nếu phán quyết đến từ fallback (engine chưa sẵn sàng). */
  fallback: boolean;
}

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private readonly engineUrl =
    process.env.RULES_ENGINE_URL ?? "http://svc-rules-engine:8080";

  constructor(private readonly prisma: PrismaService) {}

  /** Đánh giá 1 hành động nhạy cảm; ghi audit; tạo ApprovalRequest nếu cần. */
  async evaluate(input: EvaluateInput): Promise<EvaluateResult> {
    const { action, orgId } = input;

    // Hành động không nằm trong danh mục nhạy cảm → cho phép (không gate).
    if (!isSensitiveAction(action)) {
      return { decision: "ALLOW", ruleId: null, fallback: false };
    }

    let decision: EvaluateResult["decision"];
    let ruleId: string | null = null;
    let tier: 1 | 2 | undefined;
    let fallback = false;

    try {
      const res = await this.callEngine(action, input);
      decision = res.decision;
      ruleId = res.ruleId ?? null;
      tier = res.tier;
    } catch (e) {
      // FAIL-CLOSED: engine chưa deploy/lỗi → dùng chính sách mặc định an toàn.
      fallback = true;
      const pol = DEFAULT_ACTION_POLICY[action as SensitiveAction];
      decision = pol.decision;
      tier = pol.tier;
      this.logger.warn(
        `rules-engine không phản hồi (${(e as Error).message}) → fallback ${decision} cho "${action}"`,
      );
    }

    // Audit — context được lưu nguyên trạng; caller có trách nhiệm mask PII.
    await this.prisma.ruleDecisionLog.create({
      data: {
        orgId,
        ventureId: input.ventureId ?? null,
        actionType: action,
        contextJson: (input.context ?? {}) as object,
        decision,
        matchedRuleId: ruleId,
        actorUserId: input.actorUserId ?? null,
      },
    });

    if (decision === "REQUIRE_APPROVAL") {
      const approval = await this.prisma.approvalRequest.create({
        data: {
          orgId,
          ventureId: input.ventureId ?? null,
          actionType: action,
          payloadJson: (input.context ?? {}) as object,
          matchedRuleId: ruleId,
          tier: tier ?? 2,
          threadId: input.threadId ?? null,
          runId: input.runId ?? null,
        },
      });
      return {
        decision,
        ruleId,
        tier,
        approvalId: approval.id,
        fallback,
        reason: "Hành động cần được phê duyệt trước khi thực thi.",
      };
    }

    return { decision, ruleId, tier, fallback };
  }

  private async callEngine(
    action: string,
    input: EvaluateInput,
  ): Promise<{ decision: EvaluateResult["decision"]; ruleId?: string; tier?: 1 | 2 }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    try {
      const r = await fetch(`${this.engineUrl}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          context: {
            orgId: input.orgId,
            ventureId: input.ventureId ?? null,
            ...(input.context ?? {}),
          },
        }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`engine HTTP ${r.status}`);
      const data = (await r.json()) as {
        decision?: string;
        ruleId?: string;
        tier?: number;
      };
      const d = (data.decision ?? "").toUpperCase();
      if (d !== "ALLOW" && d !== "DENY" && d !== "REQUIRE_APPROVAL") {
        throw new Error(`engine trả decision lạ: ${data.decision}`);
      }
      return {
        decision: d as EvaluateResult["decision"],
        ruleId: data.ruleId,
        tier: data.tier === 1 || data.tier === 2 ? data.tier : undefined,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // -------- CRUD Rule (admin) --------

  listRules(orgId?: string) {
    return this.prisma.rule.findMany({
      where: orgId ? { OR: [{ orgId }, { orgId: null }] } : {},
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
  }

  createRule(
    user: RequestUser,
    data: {
      name: string;
      actionType: string;
      decision: "ALLOW" | "DENY" | "REQUIRE_APPROVAL";
      conditionJson: object;
      orgId?: string | null;
      description?: string;
      priority?: number;
      approvalTier?: number;
    },
  ) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException("Chỉ platform_admin được tạo rule");
    }
    return this.prisma.rule.create({
      data: {
        name: data.name,
        actionType: data.actionType,
        decision: data.decision,
        conditionJson: data.conditionJson,
        orgId: data.orgId ?? null,
        description: data.description,
        priority: data.priority ?? 100,
        approvalTier: data.approvalTier,
        createdBy: user.userId,
      },
    });
  }

  async setEnabled(user: RequestUser, id: string, enabled: boolean) {
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException("Chỉ platform_admin được sửa rule");
    }
    return this.prisma.rule.update({ where: { id }, data: { enabled } });
  }
}
