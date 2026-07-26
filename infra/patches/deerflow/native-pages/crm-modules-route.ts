import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Proxy bật/tắt module CRM cho tài khoản SaaS. Token giữ server-side (env).
const API = process.env.CRM_MODULE_API_URL ?? "https://crm.soloceo.vn/module-api.php";
const TOKEN = process.env.CRM_MODULE_API_TOKEN ?? "";

async function requireAuth() {
  const auth = await getServerSideUser();
  return auth.tag === "authenticated" || auth.tag === "needs_setup";
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  try {
    const r = await fetch(`${API}?action=list`, { headers: { "X-SoloCEO-Token": TOKEN }, cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ modules: [] });
  }
}

export async function POST(req: Request) {
  if (!(await requireAuth())) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await fetch(`${API}?action=toggle`, {
      method: "POST",
      headers: { "X-SoloCEO-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ module: body.module, active: !!body.active }),
    });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: "proxy-failed" }, { status: 502 });
  }
}
