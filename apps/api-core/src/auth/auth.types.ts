// Payload JWT tương thích Supabase GoTrue (HS256, ký bằng JWT_SUPABASE_SECRET).
// org_id là custom claim gắn khi login (Phần 4.1); nếu thiếu, guard tự tra Org
// theo ownerUserId để tương thích cả khi chưa cấu hình auth hook.
export interface SupabaseJwtPayload {
  sub: string; // auth.users.id
  email?: string;
  role?: string; // "authenticated" | "platform_admin" (dev)
  org_id?: string;
  app_metadata?: {
    org_id?: string;
    platform_role?: string;
  };
  exp?: number;
}

export interface RequestUser {
  userId: string;
  email: string | null;
  orgId: string | null;
  isPlatformAdmin: boolean;
}
