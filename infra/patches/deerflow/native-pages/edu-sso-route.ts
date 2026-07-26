import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Auto-SSO CEO (đã đăng nhập workspace) → Academy LMS edu.soloceo.vn. Ký HMAC token từ
// email CEO → trả URL edu_sso; controller Academy verify + tạo/tìm user + đăng nhập.
const SECRET = process.env.EDU_SSO_SECRET ?? "";
const BASE = process.env.EDU_BASE ?? "https://edu.soloceo.vn";

export async function GET() {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated") return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const email = auth.user.email;
  if (!email || !SECRET) return NextResponse.json({ error: "missing-email-or-secret" }, { status: 400 });
  const exp = Math.floor(Date.now() / 1000) + 120;
  const sig = crypto.createHmac("sha256", SECRET).update(`${email}|${exp}`).digest("hex");
  const token = Buffer.from(`${email}|${exp}|${sig}`).toString("base64url");
  const name = (auth.user.email.split("@")[0] ?? "").slice(0, 40);
  const url = `${BASE}/edu_sso?token=${token}&name=${encodeURIComponent(name)}`;
  return NextResponse.json({ url });
}
