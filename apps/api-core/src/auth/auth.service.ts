import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import type { SupabaseJwtPayload } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Dev-login: phát JWT cùng shape với Supabase GoTrue, ký cùng
   * JWT_SUPABASE_SECRET — nên AuthGuard không phân biệt dev/prod.
   * CHỈ bật khi DEV_AUTH=1 (không bao giờ bật production).
   */
  issueDevToken(email: string, platformAdmin = false): string {
    if (this.config.get("DEV_AUTH") !== "1") {
      throw new NotFoundException();
    }
    const secret = this.config.get<string>("JWT_SUPABASE_SECRET")!;
    // userId ổn định theo email để đăng nhập lại vẫn về đúng Org
    const hash = createHash("sha256").update(email).digest("hex");
    const userId = [
      hash.slice(0, 8),
      hash.slice(8, 12),
      "4" + hash.slice(13, 16),
      "8" + hash.slice(17, 20),
      hash.slice(20, 32),
    ].join("-");

    const payload: SupabaseJwtPayload = {
      sub: userId,
      email,
      role: "authenticated",
      app_metadata: platformAdmin ? { platform_role: "platform_admin" } : {},
    };
    return jwt.sign(payload, secret, { expiresIn: "7d" });
  }
}
