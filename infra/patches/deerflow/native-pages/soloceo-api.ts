"use client";

// Client gọi api-core /v1 với JWT lấy từ cầu SSO (/workspace/api/soloceo-token).
let cached: { token: string; apiBase: string; email?: string } | null = null;

export async function getSoloceoAuth() {
  if (cached) return cached;
  const r = await fetch("/workspace/api/soloceo-token", { cache: "no-store" });
  if (!r.ok) throw new Error("Chưa đăng nhập SoloCEO");
  const d = (await r.json()) as { token: string; apiBase: string; user?: { email?: string } };
  cached = { token: d.token, apiBase: d.apiBase, email: d.user?.email };
  return cached;
}

export async function soloceoApi<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { token, apiBase } = await getSoloceoAuth();
  const res = await fetch(`${apiBase}/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const m = (body as { message?: string | string[] })?.message ?? res.statusText;
    throw new Error(Array.isArray(m) ? m.join("; ") : String(m));
  }
  return body as T;
}
