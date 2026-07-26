import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Mỗi CEO một tài khoản Support Board SaaS riêng (chat.soloceo.vn). Mở workspace/chat →
// tự đăng ký account chat (nếu chưa có) + sinh magic-link SSO → trả URL bridge chat_sso.php
// (đăng nhập + vào thẳng hộp thư chat riêng của CEO). Miễn phí, đa kênh.
const API = process.env.CHAT_ACCOUNT_API ?? "https://chat.soloceo.vn/account/api.php";
const KEY = process.env.CHAT_CLOUD_KEY ?? "";
const BASE = process.env.CHAT_BASE ?? "https://chat.soloceo.vn";

export async function GET() {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = auth.user;
  const email = user.email;
  if (!email || !KEY) {
    return NextResponse.json({ error: "missing-email-or-key" }, { status: 400 });
  }
  const displayName = email.split("@")[0] ?? "ceo";
  const parts = displayName.split(" ");
  const first = parts[0] || "CEO";
  const last = parts.slice(1).join(" ") || "CEO";
  // Mật khẩu ổn định theo user (magic-link không dùng tới, chỉ để tạo account lần đầu)
  const password = "S" + crypto.createHash("sha256").update(user.id + KEY).digest("hex").slice(0, 14);

  // Đăng ký account chat — idempotent (đã tồn tại → duplicate-email, bỏ qua)
  try {
    await fetch(`${API}?action=create-account&key=${encodeURIComponent(KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ first_name: first, last_name: last, email, password }).toString(),
    });
  } catch {
    /* bỏ qua — có thể đã tồn tại */
  }

  // Magic-link SSO
  try {
    const r = await fetch(
      `${API}?action=magic-link&key=${encodeURIComponent(KEY)}&email=${encodeURIComponent(email)}`,
      { cache: "no-store" },
    );
    const raw = (await r.text()).replace(/^﻿/, "");
    const j = JSON.parse(raw) as { success?: boolean; response?: string };
    if (!j?.response || !j.response.includes("?magic=")) {
      return NextResponse.json({ error: "magic-failed" }, { status: 502 });
    }
    const magic = j.response.split("?magic=")[1] ?? "";
    const url = `${BASE}/account/chat_sso.php?magic=${encodeURIComponent(magic)}`;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "chat-service-unreachable" }, { status: 502 });
  }
}
