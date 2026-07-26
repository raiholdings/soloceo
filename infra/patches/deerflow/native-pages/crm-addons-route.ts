import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Đọc/ghi danh sách addon CEO đã bật cho tenant CRM của chính họ. Gọi API Perfex
// soloceo_addons_api (gate SSO secret) trên subdomain tenant. CEO mặc định cơ bản;
// bật addon nào thì menu addon đó mới hiện trong CRM.
const SECRET = process.env.CRM_SSO_SECRET ?? "";
const BASE = process.env.CRM_TENANT_BASE ?? "crm.soloceo.vn";

function tenantName(userId: string): string {
  return "c" + crypto.createHash("sha256").update(userId).digest("hex").slice(0, 15);
}

async function callApi(userId: string, action: string, enabled?: string[]): Promise<unknown> {
  const t = tenantName(userId);
  let url = `https://${t}.${BASE}/soloceo_addons_api?key=${encodeURIComponent(SECRET)}&action=${action}`;
  if (enabled) url += `&enabled=${encodeURIComponent(JSON.stringify(enabled))}`;
  const r = await fetch(url, { cache: "no-store" });
  return r.json();
}

export async function GET() {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated") return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!SECRET) return NextResponse.json({ error: "missing-secret" }, { status: 400 });
  try {
    const j = (await callApi(auth.user.id, "list")) as { enabled?: string[] };
    return NextResponse.json({ enabled: Array.isArray(j?.enabled) ? j.enabled : [] });
  } catch {
    return NextResponse.json({ error: "crm-unreachable" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated") return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!SECRET) return NextResponse.json({ error: "missing-secret" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  const enabled = Array.isArray(body.enabled) ? body.enabled.filter((x): x is string => typeof x === "string") : [];
  try {
    const j = (await callApi(auth.user.id, "set", enabled)) as { ok?: boolean; enabled?: string[] };
    return NextResponse.json({ ok: !!j?.ok, enabled: Array.isArray(j?.enabled) ? j.enabled : enabled });
  } catch {
    return NextResponse.json({ error: "crm-unreachable" }, { status: 502 });
  }
}
