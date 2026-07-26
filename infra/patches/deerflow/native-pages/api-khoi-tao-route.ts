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
  // Đường nhanh trước: nếu kho đã có mẫu đủ gần thì trả ngay (~10ms) thay vì bắt CEO chờ
  // Data Engine suy luận 60-120 giây. Mẫu trả về là ý tưởng đã đúc đầy đủ, không phải bản
  // rút gọn — CEO xem xong là chuyển thẳng sang workspace thực thi được.
  try {
    const nhanh = await fetch(`${BD}/api/khop-nhanh?q=${encodeURIComponent(yTuong.slice(0, 400))}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (nhanh.ok) {
      const k = (await nhanh.json()) as { khop?: boolean };
      if (k.khop) return NextResponse.json({ ...k, ok: true, tuc_thi: true });
    }
  } catch {
    // Khớp nhanh hỏng thì im lặng rơi xuống đường chậm — không được để nó chặn CEO.
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
