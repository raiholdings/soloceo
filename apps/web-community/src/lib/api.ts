// Client API cho web-community.
//
// TOKEN LƯU Ở COOKIE `.soloceo.vn` (không phải localStorage):
// workspace DeerFlow (soloceo.vn) nhúng các trang này (app.soloceo.vn) trong
// iframe. Chrome PHÂN VÙNG localStorage cho iframe cross-origin ⇒ token ở
// localStorage không thấy được trong iframe ⇒ CEO bị bắt đăng nhập lại.
// Cookie đặt Domain=.soloceo.vn là same-site giữa các subdomain nên dùng chung
// được một phiên. Vẫn fallback localStorage cho dev (localhost) và tự di trú
// token cũ sang cookie ở lần đọc đầu tiên.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "soloceo_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

/** Domain cookie dùng chung cho mọi subdomain *.soloceo.vn; localhost → bỏ qua. */
function cookieDomain(): string {
  if (typeof window === "undefined") return "";
  const h = window.location.hostname;
  return h.endsWith("soloceo.vn") ? "; Domain=.soloceo.vn" : "";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const raw = m?.[1];
  return raw === undefined ? null : decodeURIComponent(raw);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const fromCookie = readCookie(TOKEN_KEY);
  if (fromCookie) return fromCookie;
  // Di trú token cũ (localStorage) sang cookie một lần.
  const legacy = localStorage.getItem(TOKEN_KEY);
  if (legacy) {
    setToken(legacy);
    return legacy;
  }
  return null;
}

export function setToken(token: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}${cookieDomain()}`;
  // Giữ localStorage để tương thích ngược trong cùng origin.
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // storage bị chặn (iframe partition) — cookie là nguồn chính, bỏ qua
  }
}

export function clearToken() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_KEY}=; Path=/; Max-Age=0; SameSite=Lax${cookieDomain()}`;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // bỏ qua
  }
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body as { message?: string | string[] })?.message ?? res.statusText;
    throw new ApiRequestError(
      res.status,
      Array.isArray(message) ? message.join("; ") : String(message),
      body,
    );
  }
  return body as T;
}
