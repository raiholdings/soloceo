import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { RequestUser } from "./auth.types";

export const IS_PUBLIC_KEY = "isPublic";
/** Bỏ qua AuthGuard — dùng cho endpoint public (directory, marketplace, health) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const IS_ADMIN_KEY = "isAdminOnly";
/** Chỉ cho platform_admin (Phần 6.7) */
export const AdminOnly = () => SetMetadata(IS_ADMIN_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
