import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Nền tảng (WHMCS platform.soloceo.vn): CEO đã đăng nhập workspace → ký token →
// /sso.php tìm/tạo client theo email + CreateSsoToken → auto-login. Không hỏi lại mật khẩu.
const SSO_SECRET = process.env.PLATFORM_SSO_SECRET ?? "e171155858d9ea84a4b35239f0a765a029dec262b02b1f8ad06f3eecee0093fc";
const BASE = process.env.PLATFORM_BASE ?? "https://platform.soloceo.vn";

function ssoToken(email: string): string {
  const exp = Math.floor(Date.now() / 1000) + 120;
  const sig = crypto.createHmac("sha256", SSO_SECRET).update(email + "|" + exp).digest("hex");
  return Buffer.from(email + "|" + exp + "|" + sig).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

export async function GET() {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated" && auth.tag !== "needs_setup") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = auth.user as { id: string; email: string; name?: string };
  const url =
    BASE + "/sso.php?token=" + ssoToken(user.email) +
    "&name=" + encodeURIComponent(user.name ?? "");
  return NextResponse.json({ url });
}
