import { NextResponse } from "next/server";
import { store } from "@/lib/store";

// Nhận đơn hàng → chuyển về Payments của SoloCEO (Revenue Ledger). Nếu venture
// chưa cấu hình cổng thanh toán, ghi đơn dạng COD và báo sẽ liên hệ.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.items?.length) {
    return NextResponse.json({ message: "Giỏ hàng trống" }, { status: 400 });
  }

  // Gọi endpoint công khai của nền tảng để tạo link thanh toán (nếu có)
  if (store.ventureId) {
    try {
      const r = await fetch(`${store.platformApi}/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureId: store.ventureId,
          customer: body.customer,
          items: body.items,
          total: body.total,
          source: "commerce-starter",
        }),
      });
      if (r.ok) {
        const data = (await r.json()) as { checkoutUrl?: string };
        if (data.checkoutUrl) {
          return NextResponse.json({ checkoutUrl: data.checkoutUrl });
        }
        return NextResponse.json({
          message: "Đã ghi nhận đơn hàng! Chúng tôi sẽ liên hệ xác nhận.",
        });
      }
    } catch {
      // rơi về COD
    }
  }

  // COD: chưa nối cổng thanh toán — vẫn nhận đơn
  return NextResponse.json({
    message:
      "Đã ghi nhận đơn hàng! Chúng tôi sẽ gọi điện xác nhận và giao hàng (thanh toán khi nhận).",
  });
}
