import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Tenant CRM per-CEO: provision (idempotent) khi CEO mở workspace/crm + sinh URL SSO auto-login.
const SAAS_API = process.env.CRM_SAAS_API ?? "https://crm.soloceo.vn/saas/api/tenant";
const SAAS_TOKEN = process.env.CRM_SAAS_TOKEN ?? "";
const SSO_SECRET = process.env.CRM_SSO_SECRET ?? "";
const PLAN_ID = process.env.CRM_PLAN_ID ?? "1";
const BASE = process.env.CRM_TENANT_BASE ?? "crm.soloceo.vn";

function tenantName(userId: string): string {
  return "c" + crypto.createHash("sha256").update(userId).digest("hex").slice(0, 15);
}
function ssoToken(email: string): string {
  const expiry = Math.floor(Date.now() / 1000) + 120;
  const sig = crypto.createHmac("sha256", SSO_SECRET).update(email + "|" + expiry).digest("hex");
  return Buffer.from(email + "|" + expiry + "|" + sig).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function GET() {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated" && auth.tag !== "needs_setup") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = auth.user as { id: string; email: string; name?: string };
  const email = user.email;
  const display = (user.name ?? email.split("@")[0] ?? "CEO").trim();
  const parts = display.split(/\s+/);
  const firstname = parts[0] || "CEO";
  const lastname = parts.slice(1).join(" ") || "SoloCEO";
  const tname = tenantName(user.id);

  // provision idempotent — bỏ qua lỗi "đã tồn tại"
  try {
    const body = new URLSearchParams({
      firstname, lastname, email,
      password: crypto.randomBytes(12).toString("hex"),
      planid: PLAN_ID, company: display, tenants_name: tname,
    });
    await fetch(SAAS_API, {
      method: "POST",
      headers: { Authorization: SAAS_TOKEN, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch { /* tenant có thể đã tồn tại — vẫn tiếp tục SSO */ }

  const url = "https://" + tname + "." + BASE + "/sso_login?token=" + ssoToken(email);
  return NextResponse.json({ url, tenant: tname });
}
