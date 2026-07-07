import {
  Controller,
  Get,
  Query,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser, Public } from "./decorators";
import type { RequestUser } from "./auth.types";
import { WowonderService } from "./wowonder.service";

@ApiTags("auth")
@Controller("auth/wowonder")
export class WowonderController {
  constructor(
    private readonly wowonder: WowonderService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get("login")
  @ApiOperation({ summary: "Bắt đầu đăng nhập bằng SoloCEO Community (OAuth)" })
  login(@Res() res: Response) {
    return res.redirect(this.wowonder.getLoginUrl());
  }

  @Public()
  @Get("callback")
  @ApiOperation({
    summary: "Callback OAuth: đổi code → JWT, chuyển về frontend kèm token",
  })
  async callback(@Query("code") code: string, @Res() res: Response) {
    const frontend =
      this.config.get<string>("FRONTEND_AFTER_LOGIN_URL") ??
      "https://soloceo.vn/dang-nhap";
    if (!code) {
      return res.redirect(`${frontend}?error=missing_code`);
    }
    try {
      const { token, isNew } = await this.wowonder.handleCallback(code);
      // Chuyển token về frontend; frontend lưu vào localStorage
      const url = new URL(frontend);
      url.searchParams.set("token", token);
      url.searchParams.set("new", isNew ? "1" : "0");
      return res.redirect(url.toString());
    } catch (err) {
      const msg =
        err instanceof Error ? encodeURIComponent(err.message) : "auth_failed";
      return res.redirect(`${frontend}?error=${msg}`);
    }
  }

  @ApiBearerAuth()
  @Get("me")
  @ApiOperation({ summary: "Hồ sơ tài khoản (từ SoloCEO Community)" })
  async me(@CurrentUser() user: RequestUser) {
    if (!user.orgId) return { profile: null };
    return { profile: await this.wowonder.getProfileForOrg(user.orgId) };
  }
}
