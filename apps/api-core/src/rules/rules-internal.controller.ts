import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";
import { Public } from "../auth/decorators";
import { PrismaService } from "../prisma/prisma.service";
import { RulesService } from "./rules.service";

/**
 * Cổng HITL cho tầng AGENT (DeerFlow) — server-to-server.
 *
 * DeerFlow chạy trên tenant-02, KHÔNG tới được `svc-rules-engine` (network
 * `coolify` của core-01). Nên `ArishemGuardrailProvider` gọi endpoint HTTPS này;
 * api-core mới là bên nói chuyện với engine. Nhờ vậy dùng lại nguyên bộ:
 * RuleDecisionLog (audit) + tạo ApprovalRequest + fallback fail-closed.
 *
 * Bảo vệ bằng header `X-Internal-Token` = env `INTERNAL_API_TOKEN`.
 * Không set env ⇒ endpoint luôn 403 (fail-closed, không hở).
 */

class EvaluateInternalDto {
  /** actionType nhạy cảm, vd "spend_money" */
  @IsString() action!: string;
  @IsOptional() @IsString() orgId?: string;
  /** user DeerFlow — dùng để suy ra org khi orgId trống */
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() ventureId?: string;
  @IsOptional() @IsObject() context?: Record<string, unknown>;
  @IsOptional() @IsString() threadId?: string;
  @IsOptional() @IsString() runId?: string;
}

@ApiTags("rules")
@Controller("rules")
export class InternalRulesController {
  constructor(
    private readonly rules: RulesService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("evaluate-internal")
  @ApiOperation({
    summary: "[nội bộ] Gate tool-call nhạy cảm từ DeerFlow guardrail",
  })
  async evaluate(
    @Headers("x-internal-token") token: string,
    @Body() dto: EvaluateInternalDto,
  ) {
    const expected = process.env.INTERNAL_API_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException("Token nội bộ không hợp lệ");
    }

    const orgId = await this.resolveOrgId(dto);

    return this.rules.evaluate({
      action: dto.action,
      orgId,
      ventureId: dto.ventureId ?? null,
      context: { ...(dto.context ?? {}), orgId },
      actorUserId: dto.userId ?? null,
      threadId: dto.threadId ?? null,
      runId: dto.runId ?? null,
    });
  }

  /** orgId tường minh → dùng. Không có → suy từ userId. Vẫn không có → "unknown"
   *  (luật toàn nền tảng `Rule.orgId IS NULL` vẫn áp dụng, nên không hở gate). */
  private async resolveOrgId(dto: EvaluateInternalDto): Promise<string> {
    if (dto.orgId) return dto.orgId;
    if (dto.userId) {
      const org = await this.prisma.org.findFirst({
        where: { ownerUserId: dto.userId },
        select: { id: true },
      });
      if (org) return org.id;
    }
    return "unknown";
  }
}
