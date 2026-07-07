import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators";
import type { RequestUser } from "../auth/auth.types";
import { CheckoutDto, ManualRevenueDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("payments/checkout")
  @ApiOperation({
    summary: "Tạo phiên thanh toán (subscription | ai_credit | venture_payment)",
  })
  checkout(@CurrentUser() user: RequestUser, @Body() dto: CheckoutDto) {
    return this.paymentsService.checkout(user, dto);
  }

  @Get("revenue/ledger")
  @ApiOperation({ summary: "Sổ cái doanh thu (lọc venture/from/to)" })
  ledger(
    @CurrentUser() user: RequestUser,
    @Query("ventureId") ventureId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.paymentsService.ledger(user, ventureId, from, to);
  }

  @Post("revenue/manual")
  @ApiOperation({
    summary: "Ghi nhận doanh thu ngoài nền tảng (verified=false)",
  })
  manual(@CurrentUser() user: RequestUser, @Body() dto: ManualRevenueDto) {
    return this.paymentsService.manualRevenue(user, dto);
  }
}
