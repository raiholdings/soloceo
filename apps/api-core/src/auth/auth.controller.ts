import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsEmail, IsOptional } from "class-validator";
import { AuthService } from "./auth.service";
import { Public } from "./decorators";

class DevLoginDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsBoolean()
  platformAdmin?: boolean;
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
}
