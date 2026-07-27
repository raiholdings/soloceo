import { CongNgheChiTiet, layDanhSach } from "@/components/landing/soloceo-cong-nghe";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.soloceo.vn";
const WEB = "https://soloceo.vn";

// Dựng sẵn toàn bộ trang lúc build: hơn 100 trang tĩnh vừa nhanh vừa để công cụ tìm kiếm
// thu thập được ngay, không phải chờ lượt truy cập đầu tiên sinh trang.
export async function generateStaticParams() {
  const ds = await layDanhSach();
  return ds.map((x) => ({ slug: x.slug }));
}

// Metadata RIÊNG từng nền tảng. Đây là điểm quyết định của cả bề mặt SEO này — hơn 100
// trang mà dùng chung một tiêu đề thì công cụ tìm kiếm coi là trùng lặp và bỏ qua gần hết.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const r = await fetch(`${API}/v1/nen-tang/${encodeURIComponent(slug)}`, {
      next: { revalidate: 600 },
    });
    if (r.ok) {
      const b = (await r.json()) as {
        name?: string; category?: string; seoTitle?: string; seoDesc?: string;
        summary?: string; coverUrl?: string; keywords?: string[];
      };
      const tieuDe = b.seoTitle || `${b.name} — nền tảng mã nguồn mở | SoloCEO`;
      const moTa = (b.seoDesc || b.summary || "").slice(0, 175);
      return {
        title: tieuDe,
        description: moTa,
        keywords: Array.isArray(b.keywords) ? b.keywords : undefined,
        alternates: { canonical: `${WEB}/giai-phap/nen-tang/${slug}` },
        openGraph: {
          title: tieuDe,
          description: moTa,
          url: `${WEB}/giai-phap/nen-tang/${slug}`,
          images: b.coverUrl ? [b.coverUrl] : undefined,
          type: "article",
        },
      };
    }
  } catch { /* rơi xuống tiêu đề mặc định */ }
  return { title: "Nền tảng mã nguồn mở — SoloCEO" };
}

export const revalidate = 600;
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return await CongNgheChiTiet({ slug });
}
