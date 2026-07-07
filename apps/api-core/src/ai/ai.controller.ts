import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { AiService } from "./ai.service";

class SimulateUsageDto {
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  inputTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  outputTokens?: number;
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("usage")
  @ApiOperation({ summary: "Chi tiết usage AI theo ngày (tháng hiện tại)" })
  usage(@CurrentUser() user: RequestUser) {
    return this.aiService.usage(user);
  }

  @Get("usage/summary")
  @ApiOperation({ summary: "Tổng chi phí AI tháng + ngân sách gói" })
  summary(@CurrentUser() user: RequestUser) {
    return this.aiService.usageSummary(user);
  }

  @Post("dev-simulate-usage")
  @ApiOperation({
    summary: "Dev-only (LITELLM_FAKE=1): mô phỏng lời gọi LLM, trả 429 khi vượt budget",
  })
  simulate(@CurrentUser() user: RequestUser, @Body() dto: SimulateUsageDto) {
    return this.aiService.devSimulateUsage(user, dto);
  }
}
