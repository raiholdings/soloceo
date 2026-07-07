// Auth client: production dùng Supabase GoTrue (email + mật khẩu, xác nhận
// email qua SMTP); local dev không cấu hình Supabase → fallback dev-login.
import { api, setToken } from "./api";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(SUPABASE_URL && ANON_KEY);

async function gotrue<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY!,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as {
    msg?: string;
    error_description?: string;
    message?: string;
  } | null;
  if (!res.ok) {
    throw new Error(
      data?.msg ?? data?.error_description ?? data?.message ?? "Lỗi xác thực",
    );
  }
  return data as T;
}

/** Đăng ký — trả về true nếu cần xác nhận email trước khi đăng nhập */
export async function signUp(
  email: string,
  password: string,
): Promise<{ needsConfirmation: boolean }> {
  const data = await gotrue<{ access_token?: string }>("/signup", {
    email,
    password,
  });
  if (data.access_token) {
    setToken(data.access_token);
    return { needsConfirmation: false };
  }
  return { needsConfirmation: true };
}

/** Đăng nhập — lưu JWT (api-core verify cùng secret GoTrue) */
export async function signIn(email: string, password: string): Promise<void> {
  if (!supabaseEnabled) {
    const res = await api<{ accessToken: string }>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setToken(res.accessToken);
    return;
  }
  const data = await gotrue<{ access_token: string }>(
    "/token?grant_type=password",
    { email, password },
  );
  setToken(data.access_token);
}
