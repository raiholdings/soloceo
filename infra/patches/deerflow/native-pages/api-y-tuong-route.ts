import { type NextRequest, NextResponse } from "next/server";

import { getServerSideUser } from "@/core/auth/server";

// Proxy Xưởng ý tưởng (bigdata.soloceo.vn) — GET danh sách, POST vote/thực thi
// với voter = user.id thật (chống trùng phiếu giữa các CEO).
const BD = "https://bigdata.soloceo.vn";

export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get("sort") ?? "top";
  const limit = req.nextUrl.searchParams.get("limit") ?? "12";
  try {
    const r = await fetch(`${BD}/api/ideas?sort=${encodeURIComponent(sort)}&limit=${encodeURIComponent(limit)}`, { cache: "no-store" });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ count: 0, ideas: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated" && auth.tag !== "needs_setup") {
    return NextResponse.json({ error: "Đăng nhập để đánh giá" }, { status: 401 });
  }
  const user = auth.user as { id: string };
  const body = (await req.json()) as { id?: number; action?: string; diem?: number };
  if (!body.id || !body.action) return NextResponse.json({ error: "Thiếu id/action" }, { status: 400 });
  const path = body.action === "vote" ? "vote" : "thuc-thi";
  try {
    const r = await fetch(`${BD}/api/ideas/${body.id}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-voter": user.id },
      body: JSON.stringify({ diem: body.diem ?? 0 }),
      cache: "no-store",
    });
    return NextResponse.json(await r.json());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lỗi" }, { status: 502 });
  }
}
