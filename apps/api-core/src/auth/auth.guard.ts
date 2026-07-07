import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { IS_ADMIN_KEY, IS_PUBLIC_KEY } from "./decorators";
import type { RequestUser, SupabaseJwtPayload } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers["authorization"];
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException("Thiếu Bearer token");
    }

    const secret = this.config.get<string>("JWT_SUPABASE_SECRET");
    if (!secret) {
      throw new UnauthorizedException("JWT_SUPABASE_SECRET chưa cấu hình");
    }

    let payload: SupabaseJwtPayload;
    try {
      payload = jwt.verify(token, secret) as SupabaseJwtPayload;
    } catch {
      throw new UnauthorizedException("Token không hợp lệ hoặc đã hết hạn");
    }

    let orgId = payload.org_id ?? payload.app_metadata?.org_id ?? null;
    if (!orgId) {
      const org = await this.prisma.org.findFirst({
        where: { ownerUserId: payload.sub },
        select: { id: true },
      });
      orgId = org?.id ?? null;
    }

    const user: RequestUser = {
      userId: payload.sub,
      email: payload.email ?? null,
      orgId,
      isPlatformAdmin:
        payload.app_metadata?.platform_role === "platform_admin" ||
        payload.role === "platform_admin",
    };
    request.user = user;

    const adminOnly = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (adminOnly && !user.isPlatformAdmin) {
      throw new ForbiddenException("Chỉ dành cho quản trị nền tảng");
    }

    return true;
  }
}
