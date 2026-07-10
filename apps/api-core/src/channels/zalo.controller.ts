import {
  Controller,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../auth/decorators";
import { ZaloService } from "./zalo.service";

/** Webhook Zalo OA — công khai (không JWT), xác thực bằng chữ ký X-ZEvent-Signature.
 *  Cần main.ts bật `rawBody: true` để verify đúng raw body (R7 §2). */
@ApiTags("channels")
@Controller("channels/zalo")
export class ZaloController {
  constructor(private readonly zalo: ZaloService) {}

  @Public()
  @Post("webhook/:oaId")
  @ApiOperation({ summary: "Nhận sự kiện webhook từ Zalo OA" })
  async webhook(
    @Param("oaId") oaId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    const raw =
      req.rawBody?.toString("utf8") ?? JSON.stringify(req.body ?? {});
    return this.zalo.handleWebhook(oaId, raw, headers);
  }
}
