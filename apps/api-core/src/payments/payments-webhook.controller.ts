import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators";
import { PaymentsService } from "./payments.service";

/**
 * [CÔNG KHAI] Webhook cổng thanh toán. PayOS gọi server-to-server khi đơn
 * chuyển PAID → kích hoạt gói nền tảng trực tiếp (tách khỏi WoWonder Pro).
 * PHẢI trả HTTP 200 cho ping xác thực khi thêm webhook URL vào kênh PayOS.
 * URL kênh PayOS: https://api.soloceo.vn/v1/webhooks/payos
 */
@ApiTags("webhooks")
@Controller("webhooks")
export class PaymentsWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post("payos")
  @HttpCode(200)
  @ApiOperation({ summary: "Webhook PayOS → kích hoạt subscription" })
  async payos(
    @Body()
    payload: {
      code?: string;
      signature?: string;
      data?: Record<string, unknown>;
    },
  ) {
    return this.payments.handlePayosWebhook(payload);
  }
}
