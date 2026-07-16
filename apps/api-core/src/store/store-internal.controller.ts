import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Public } from "../auth/decorators";
import { StoreService } from "./store.service";

/**
 * [NỘI BỘ] Cổng auto-provisioning PaaS cho WHMCS (khép kín dòng tiền v1.1).
 *
 * WHMCS (platform.soloceo.vn, tenant-03) đặt hàng 1 sản phẩm PaaS → module
 * server `soloceo` gọi endpoint này. WHMCS tới được api.soloceo.vn (200) nhưng
 * KHÔNG tới được Coolify API nội bộ core-01 → api-core là bên đứng giữa, đẩy
 * job vào queue "provision" cho svc-provision worker deploy (mẫu như
 * `rules-internal.controller.ts`).
 *
 * Bảo vệ header `X-Internal-Token` = env `INTERNAL_API_TOKEN`. Không set env
 * ⇒ luôn 403 (fail-closed).
 */

class ProvisionPaasDto {
  /** key trong CatalogApp: openclaw | erpnext | commerce-starter | ... */
  @IsString() productKey!: string;
  @IsOptional() @IsString() email?: string;
  /** org SoloCEO nếu SSO truyền được (ưu tiên hơn email) */
  @IsOptional() @IsString() orgId?: string;
  /** tên hiển thị instance (vd tên doanh nghiệp CEO) */
  @IsOptional() @IsString() name?: string;
}

@ApiTags("store")
@Controller("provision")
export class StoreInternalController {
  constructor(private readonly store: StoreService) {}

  private assertToken(token: string) {
    const expected = process.env.INTERNAL_API_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException("Token nội bộ không hợp lệ");
    }
  }

  @Public()
  @Post("paas")
  @ApiOperation({ summary: "[nội bộ] WHMCS đặt PaaS → provision qua Coolify" })
  async provision(
    @Headers("x-internal-token") token: string,
    @Body() dto: ProvisionPaasDto,
  ) {
    this.assertToken(token);
    return this.store.provisionPaas({
      productKey: dto.productKey,
      email: dto.email,
      orgId: dto.orgId,
      name: dto.name,
    });
  }

  @Public()
  @Get("paas/status")
  @ApiOperation({ summary: "[nội bộ] Trạng thái đơn PaaS (ref=ventureId:installId)" })
  async status(
    @Headers("x-internal-token") token: string,
    @Query("ref") ref: string,
  ) {
    this.assertToken(token);
    return this.store.paasStatus(ref);
  }
}
