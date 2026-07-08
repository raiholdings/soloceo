// Cấu hình cửa hàng — đọc từ env (mỗi venture 1 giá trị) khi provisioning.
// CEO tùy biến qua Cài đặt trên OS hoặc bảo OpenClaw sửa file này.

export interface Product {
  id: string;
  name: string;
  price: number; // VND
  image: string;
  description: string;
}

export const store = {
  name: process.env.STORE_NAME ?? "Cửa hàng của tôi",
  slogan: process.env.STORE_SLOGAN ?? "Sản phẩm chất lượng, giao nhanh toàn quốc",
  currency: "VND",
  // Nối về nền tảng SoloCEO để checkout đi qua Payments → Revenue Ledger
  platformApi: process.env.SOLOCEO_API_BASE ?? "https://api.soloceo.vn/v1",
  ventureId: process.env.VENTURE_ID ?? "",
  accent: process.env.STORE_ACCENT ?? "#7C5CFF",
};

/**
 * Nguồn sản phẩm: ưu tiên API nền tảng (CEO quản lý trong OS); nếu chưa cấu
 * hình thì dùng sản phẩm mẫu để cửa hàng chạy được ngay khi vừa tạo.
 */
export async function getProducts(): Promise<Product[]> {
  if (store.ventureId) {
    try {
      const r = await fetch(
        `${store.platformApi}/ventures/${store.ventureId}/products`,
        { next: { revalidate: 60 } },
      );
      if (r.ok) {
        const data = (await r.json()) as Product[];
        if (Array.isArray(data) && data.length) return data;
      }
    } catch {
      // rơi về mẫu
    }
  }
  return SAMPLE_PRODUCTS;
}

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Áo thun cotton cao cấp",
    price: 250000,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
    description: "Chất cotton 100%, mềm mại, thoáng mát. Nhiều màu, nhiều size.",
  },
  {
    id: "p2",
    name: "Ba lô du lịch chống nước",
    price: 590000,
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    description: "Ngăn chống sốc laptop 15\", chống nước, 25L tiện di chuyển.",
  },
  {
    id: "p3",
    name: "Bình giữ nhiệt inox 500ml",
    price: 180000,
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80",
    description: "Giữ nóng/lạnh 12 giờ, inox 304 an toàn, thiết kế gọn nhẹ.",
  },
  {
    id: "p4",
    name: "Tai nghe không dây",
    price: 890000,
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80",
    description: "Bluetooth 5.3, chống ồn chủ động, pin 30 giờ nghe nhạc.",
  },
];

export function formatVnd(v: number): string {
  return v.toLocaleString("vi-VN") + "₫";
}
