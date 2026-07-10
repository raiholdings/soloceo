import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { SENSITIVE_ACTIONS } from "@soloceo/shared";
import { AdminOnly, CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { RulesService } from "./rules.service";

class CreateRuleDto {
  @IsString() name!: string;
  @IsIn(SENSITIVE_ACTIONS as unknown as string[]) actionType!: string;
  @IsIn(["ALLOW", "DENY", "REQUIRE_APPROVAL"]) decision!:
    | "ALLOW"
    | "DENY"
    | "REQUIRE_APPROVAL";
  @IsObject() conditionJson!: object;
  @IsOptional() @IsString() orgId?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) priority?: number;
  @IsOptional() @IsInt() @Min(1) @Max(2) approvalTier?: number;
}

class ToggleRuleDto {
  @IsBoolean() enabled!: boolean;
}

/** Admin quản trị ruleset HITL gate (arishem). Ref research/R6 §A. */
@ApiTags("admin-rules")
@ApiBearerAuth()
@AdminOnly()
@Controller("admin/rules")
export class AdminRulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  @ApiOperation({ summary: "Danh sách rule (theo org hoặc toàn nền tảng)" })
  list(@Query("orgId") orgId?: string) {
    return this.rules.listRules(orgId);
  }

  @Post()
  @ApiOperation({ summary: "Tạo rule mới cho HITL gate" })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRuleDto) {
    return this.rules.createRule(user, dto);
  }

  @Patch(":id/enabled")
  @ApiOperation({ summary: "Bật/tắt rule" })
  toggle(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: ToggleRuleDto,
  ) {
    return this.rules.setEnabled(user, id, dto.enabled);
  }
}
