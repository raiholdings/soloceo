// Auth client OS Shell: production dùng Supabase GoTrue; local dev fallback dev-login.
import { api, setToken } from "./api";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(SUPABASE_URL && ANON_KEY);

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabaseEnabled) {
    const res = await api<{ accessToken: string }>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setToken(res.accessToken);
    return;
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY! },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    msg?: string;
    error_description?: string;
  } | null;
  if (!res.ok || !data?.access_token) {
    throw new Error(
      data?.msg ?? data?.error_description ?? "Đăng nhập thất bại",
    );
  }
  setToken(data.access_token);
}
