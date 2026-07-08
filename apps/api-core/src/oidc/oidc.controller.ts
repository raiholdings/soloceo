import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../auth/decorators";
import { OidcService } from "./oidc.service";

/**
 * OIDC Provider endpoints (bọc WoWonder) — DeerFlow/app OIDC đăng nhập qua đây.
 * Issuer: https://api.soloceo.vn/v1/oidc
 * Cookie `oidc_k` được đặt ở /authorize; WowonderController.callback đọc nó để
 * biết đây là luồng OIDC (WoWonder chỉ có 1 callback cố định).
 */
@ApiTags("oidc")
@Controller("oidc")
export class OidcController {
  constructor(private readonly oidc: OidcService) {}

  @Public()
  @Get(".well-known/openid-configuration")
  @ApiOperation({ summary: "OIDC discovery metadata" })
  discovery() {
    return this.oidc.discovery();
  }

  @Public()
  @Get("jwks")
  @ApiOperation({ summary: "JWKS (public key ký id_token)" })
  jwks() {
    return this.oidc.jwks();
  }

  @Public()
  @Get("authorize")
  @ApiOperation({ summary: "Bắt đầu đăng nhập OIDC → WoWonder" })
  authorize(
    @Query("client_id") clientId: string,
    @Query("redirect_uri") redirectUri: string,
    @Query("state") state: string | undefined,
    @Query("nonce") nonce: string | undefined,
    @Query("scope") scope: string | undefined,
    @Res() res: Response,
  ) {
    const { loginUrl, key } = this.oidc.buildAuthorize({
      clientId,
      redirectUri,
      state,
      nonce,
      scope,
    });
    // cookie sống suốt vòng OAuth — WowonderController.callback đọc để nhận biết OIDC
    res.cookie("oidc_k", key, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      domain: ".soloceo.vn",
      maxAge: 10 * 60 * 1000,
    });
    return res.redirect(loginUrl);
  }

  @Public()
  @Post("token")
  @ApiOperation({ summary: "Đổi code → id_token + access_token" })
  token(
    @Body() body: Record<string, string>,
    @Headers("authorization") auth?: string,
  ) {
    // client_id/secret có thể ở body (client_secret_post) hoặc Basic header
    let clientId = body.client_id;
    if (!clientId && auth?.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
      clientId = decoded.split(":")[0];
    }
    if (!body.code) throw new BadRequestException("Thiếu code");
    return this.oidc.token({
      code: body.code,
      clientId: clientId ?? "",
      redirectUri: body.redirect_uri,
    });
  }

  @Public()
  @Get("userinfo")
  @ApiOperation({ summary: "Thông tin user (Bearer access_token)" })
  userinfo(@Headers("authorization") auth?: string) {
    if (!auth?.startsWith("Bearer ")) {
      throw new BadRequestException("Thiếu Bearer access_token");
    }
    return this.oidc.userinfo(auth.slice(7));
  }
}
