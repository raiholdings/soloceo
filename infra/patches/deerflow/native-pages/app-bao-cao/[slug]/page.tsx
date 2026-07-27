import { BaoCaoChiTiet } from "@/components/landing/soloceo-bao-cao";

// Tiêu đề lấy từ chính báo cáo để mỗi trang có metadata riêng — quan trọng cho SEO và
// cho ảnh xem trước khi chia sẻ lên mạng xã hội.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "https://api.soloceo.vn";
    const r = await fetch(`${api}/v1/bao-cao/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (r.ok) {
      const b = (await r.json()) as { title?: string; summary?: string; coverUrl?: string };
      return {
        title: `${b.title ?? "Báo cáo"} — SoloCEO`,
        description: (b.summary ?? "").slice(0, 200),
        openGraph: {
          title: b.title,
          description: (b.summary ?? "").slice(0, 200),
          images: b.coverUrl ? [b.coverUrl] : undefined,
        },
      };
    }
  } catch { /* rơi xuống tiêu đề mặc định */ }
  return { title: "Báo cáo — SoloCEO" };
}

export const revalidate = 300;
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return await BaoCaoChiTiet({ slug });
}
