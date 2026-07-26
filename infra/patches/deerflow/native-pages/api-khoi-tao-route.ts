import { type NextRequest, NextResponse } from "next/server";

// Khởi tạo ý tưởng — proxy sang Data Engine (bigdata). Công khai: dùng được cả
// ở trang chủ (khách) lẫn workspace (CEO đã đăng nhập gửi kèm tên).
const BD = "https://bigdata.soloceo.vn";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { y_tuong?: string; tac_gia?: string };
  const yTuong = (body.y_tuong ?? "").trim();
  if (yTuong.length < 8) {
    return NextResponse.json({ error: "Mô tả ý tưởng dài hơn chút (≥8 ký tự)." }, { status: 400 });
  }
  try {
    const r = await fetch(`${BD}/api/khoi-tao`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ y_tuong: yTuong.slice(0, 400), tac_gia: (body.tac_gia ?? "").slice(0, 60) }),
      cache: "no-store",
    });
    return NextResponse.json(await r.json(), { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Engine không phản hồi" }, { status: 502 });
  }
}
