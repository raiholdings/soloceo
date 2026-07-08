import {
  Controller,
  Get,
  Inject,
  Query,
  Req,
  Res,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { CurrentUser, Public } from "./decorators";
import type { RequestUser } from "./auth.types";
import { WowonderService } from "./wowonder.service";
import { OidcService } from "../oidc/oidc.service";

// Chỉ cho phép trả token về các frontend của SoloCEO (chống open-redirect)
const ALLOWED_RETURN_HOSTS = [
  "soloceo.vn",
  "www.soloceo.vn",
  "platform.soloceo.vn",
  "localhost",
];
const RETURN_COOKIE = "wo_return";

@ApiTags("auth")
@Controller("auth/wowonder")
export class WowonderController {
  constructor(
    private readonly wowonder: WowonderService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => OidcService))
    private readonly oidc: OidcService,
  ) {}

  private readCookie(req: Request, name: string): string | null {
    const raw = req.headers.cookie ?? "";
    const match = raw
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  }

  private defaultFrontend(): string {
    return (
      this.config.get<string>("FRONTEND_AFTER_LOGIN_URL") ??
      "https://soloceo.vn/dang-nhap"
    );
  }

  private sanitizeReturnUrl(raw?: string): string | null {
    if (!raw) return null;
    try {
      const u = new URL(raw);
      if (!ALLOWED_RETURN_HOSTS.includes(u.hostname)) return null;
      return u.toString();
    } catch {
      return null;
    }
  }

  private readReturnCookie(req: Request): string | null {
    const raw = req.headers.cookie ?? "";
    const match = raw
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${RETURN_COOKIE}=`));
    if (!match) return null;
    return this.sanitizeReturnUrl(
      decodeURIComponent(match.slice(RETURN_COOKIE.length + 1)),
    );
  }

  @Public()
  @Get("login")
  @ApiOperation({ summary: "Bắt đầu đăng nhập bằng SoloCEO Community (OAuth)" })
  login(
    @Query("return_url") returnUrl: string | undefined,
    @Res() res: Response,
  ) {
    // Nhớ nơi bắt đầu (soloceo.vn hay platform.soloceo.vn) qua cookie sống
    // suốt vòng OAuth — vì WoWonder chỉ có 1 callback URL cố định.
    const clean = this.sanitizeReturnUrl(returnUrl);
    if (clean) {
      res.cookie(RETURN_COOKIE, clean, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        domain: ".soloceo.vn",
        maxAge: 10 * 60 * 1000, // 10 phút
      });
    }
    return res.redirect(this.wowonder.getLoginUrl());
  }

  @Public()
  @Get("callback")
  @ApiOperation({
    summary: "Callback OAuth: đổi code → JWT, chuyển về đúng frontend kèm token",
  })
  async callback(
    @Query("code") code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Luồng OIDC (DeerFlow...): cookie oidc_k → sinh code OIDC, về app OIDC
    const oidcKey = this.readCookie(req, "oidc_k");
    if (oidcKey) {
      res.clearCookie("oidc_k", { domain: ".soloceo.vn" });
      if (!code) return res.status(400).send("missing_code");
      try {
        const redirect = await this.oidc.handleWowonderCallback(oidcKey, code);
        return res.redirect(redirect);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "oidc_failed";
        return res.status(400).send(msg);
      }
    }

    const frontend = this.readReturnCookie(req) ?? this.defaultFrontend();
    res.clearCookie(RETURN_COOKIE, { domain: ".soloceo.vn" });
    if (!code) {
      return res.redirect(`${frontend}?error=missing_code`);
    }
    try {
      const { token, isNew } = await this.wowonder.handleCallback(code);
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
