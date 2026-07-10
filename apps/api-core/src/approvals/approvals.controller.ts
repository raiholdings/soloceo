import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";
import { CurrentUser, Public } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { ApprovalsService } from "./approvals.service";

class DecideDto {
  @IsOptional() @IsString() note?: string;
}

class InternalApprovalDto {
  @IsString() orgId!: string;
  @IsOptional() @IsString() ventureId?: string;
  @IsString() actionType!: string;
  @IsOptional() tier?: number;
  @IsOptional() @IsString() matchedRuleId?: string;
  @IsOptional() @IsString() threadId?: string;
  @IsOptional() @IsString() runId?: string;
  @IsOptional() @IsObject() payloadJson?: Record<string, unknown>;
}

/** Dashboard phê duyệt HITL (chủ org + admin). Ref research/R6 §3, R1 §5. */
@ApiTags("approvals")
@ApiBearerAuth()
@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get("pending")
  @ApiOperation({ summary: "Danh sách yêu cầu chờ phê duyệt" })
  pending(@CurrentUser() user: RequestUser) {
    return this.approvals.listPending(user);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Phê duyệt (resume DeerFlow nếu có run treo)" })
  approve(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: DecideDto,
  ) {
    return this.approvals.decide(user, id, true, dto.note);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Từ chối yêu cầu" })
  reject(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: DecideDto,
  ) {
    return this.approvals.decide(user, id, false, dto.note);
  }

  /** Server-to-server: DeerFlow arishem guardrail đăng ký yêu cầu duyệt.
   *  Bảo vệ bằng header X-Internal-Token = env INTERNAL_API_TOKEN (không JWT). */
  @Public()
  @Post("internal")
  @ApiOperation({ summary: "[nội bộ] Tạo ApprovalRequest từ DeerFlow guardrail" })
  internal(
    @Headers("x-internal-token") token: string,
    @Body() dto: InternalApprovalDto,
  ) {
    const expected = process.env.INTERNAL_API_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException("Token nội bộ không hợp lệ");
    }
    return this.approvals.createInternal(dto);
  }
}
