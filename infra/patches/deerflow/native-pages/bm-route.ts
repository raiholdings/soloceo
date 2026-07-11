import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSideUser } from "@/core/auth/server";

// Gói Mô hình kinh doanh sinh bởi factory (JSON) — mount read-only vào container
// tại /app/bm-data (compose). Route chỉ phục vụ user đã đăng nhập.
const BM_DIR = process.env.SOLOCEO_BM_DIR ?? "/app/bm-data";
const SLUG_RE = /^[a-z0-9-]{1,60}$/;

export async function GET(req: Request) {
  const auth = await getServerSideUser();
  if (auth.tag !== "authenticated" && auth.tag !== "needs_setup") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const slug = new URL(req.url).searchParams.get("slug");
  try {
    if (slug) {
      if (!SLUG_RE.test(slug)) {
        return NextResponse.json({ error: "bad_slug" }, { status: 400 });
      }
      const raw = await fs.readFile(path.join(BM_DIR, `${slug}.json`), "utf-8");
      return NextResponse.json(JSON.parse(raw));
    }
    const raw = await fs.readFile(path.join(BM_DIR, "index.json"), "utf-8");
    return NextResponse.json({ models: JSON.parse(raw) });
  } catch {
    // chưa có dữ liệu / slug sai → danh sách rỗng thay vì vỡ trang
    return slug
      ? NextResponse.json({ error: "not_found" }, { status: 404 })
      : NextResponse.json({ models: [] });
  }
}
