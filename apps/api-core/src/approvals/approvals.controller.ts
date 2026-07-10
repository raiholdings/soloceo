import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { ApprovalsService } from "./approvals.service";

class DecideDto {
  @IsOptional() @IsString() note?: string;
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
}
