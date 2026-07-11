import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";
import { AuthService } from "./auth.service";
import { Public } from "./decorators";

class DevLoginDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsBoolean()
  platformAdmin?: boolean;
}

class ExchangeDto {
  /** Danh tính người dùng DeerFlow (BetterAuth user id) — khoá ổn định. */
  @IsString() userId!: string;
  @IsOptional() @IsString() email?: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("dev-login")
  @ApiOperation({
    summary: "Đăng nhập dev (chỉ khi DEV_AUTH=1) — production dùng Supabase Auth",
  })
  devLogin(@Body() dto: DevLoginDto) {
    const token = this.authService.issueDevToken(
      dto.email,
      dto.platformAdmin ?? false,
    );
    return { accessToken: token, tokenType: "bearer" };
  }

  /**
   * Cầu SSO 1-đăng-nhập: DeerFlow (shell soloceo.vn) đã xác thực user bằng
   * BetterAuth. Server route của DeerFlow gọi endpoint này (server-to-server,
   * header X-Internal-Token) để đổi lấy JWT api-core cho CÙNG user đó → trang
   * native (Tạo DN/Gói/Danh bạ) gọi /v1 không cần đăng nhập lại.
   * Không set INTERNAL_API_TOKEN ⇒ luôn 403 (fail-closed, không hở).
   */
  @Public()
  @Post("exchange")
  @ApiOperation({ summary: "[nội bộ] Đổi danh tính DeerFlow → JWT api-core" })
  exchange(
    @Headers("x-internal-token") token: string,
    @Body() dto: ExchangeDto,
  ) {
    const expected = process.env.INTERNAL_API_TOKEN;
    if (!expected || token !== expected) {
      throw new ForbiddenException("Token nội bộ không hợp lệ");
    }
    // Cockpit admin: email thuộc ADMIN_EMAILS (phân tách phẩy) nhận claim
    // platform_admin → thấy /workspace/admin. Email lấy từ phiên BetterAuth
    // đã xác thực (server-to-server), không phải input tự khai của client.
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin =
      !!dto.email && adminEmails.includes(dto.email.trim().toLowerCase());
    const accessToken = this.authService.issueSessionToken({
      userId: dto.userId,
      email: dto.email ?? null,
      platformAdmin: isAdmin,
    });
    return { accessToken, tokenType: "bearer", platformAdmin: isAdmin };
  }
}
