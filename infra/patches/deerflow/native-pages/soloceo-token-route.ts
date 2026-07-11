import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Cầu 1-đăng-nhập: đổi phiên DeerFlow (BetterAuth) → JWT api-core cho CÙNG user.
// INTERNAL_API_TOKEN chỉ ở server, browser không thấy.
export async function GET() {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated" && auth.tag !== "needs_setup") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = auth.user;
  const apiBase = process.env.SOLOCEO_API_BASE ?? "https://api.soloceo.vn";
  const internal = process.env.INTERNAL_API_TOKEN;
  if (!internal) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const res = await fetch(`${apiBase}/v1/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Token": internal },
    body: JSON.stringify({ userId: user.id, email: user.email }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "exchange_failed" }, { status: 502 });
  }
  const data = (await res.json()) as { accessToken: string; platformAdmin?: boolean };
  return NextResponse.json({
    token: data.accessToken,
    user: { id: user.id, email: user.email },
    apiBase,
    platformAdmin: data.platformAdmin === true,
  });
}
