// Trang công khai "Công nghệ mã nguồn mở" — mục lục + trang chi tiết từng nền tảng.
//
// KHÁC với soloceo-nen-tang.tsx: file kia là trang trong workspace, client component, lấy
// danh mục LIVE từ WHMCS để CEO bấm đăng ký. File này là bề mặt SEO công khai — server
// component, nội dung do Đội AI biên soạn và lưu trong api-core.
//
// Đây là bề mặt SEO lớn nhất của soloceo.vn: hơn 100 trang, mỗi trang nhắm một nhóm từ
// khoá riêng ("phần mềm CRM mã nguồn mở", "helpdesk tự host"...). Nên mỗi trang phải có
// tiêu đề riêng, mô tả riêng, dữ liệu có cấu trúc riêng — dùng chung metadata là phí cả
// trăm trang.
import { SiteHeader, SiteFooter } from "@/components/landing/soloceo-nav";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.soloceo.vn";
const WEB = "https://soloceo.vn";

export type CongNgheTom = {
  slug: string; name: string; category: string;
  summary?: string | null; coverUrl?: string | null;
  demoUrl?: string | null; usesAI?: boolean; seoDesc?: string | null;
};

export async function layDanhSach(): Promise<CongNgheTom[]> {
  try {
    const r = await fetch(`${API}/v1/nen-tang`, { next: { revalidate: 600 } });
    return r.ok ? ((await r.json()) as CongNgheTom[]) : [];
  } catch {
    return [];
  }
}

export async function layBai(slug: string) {
  try {
    const r = await fetch(`${API}/v1/nen-tang/${encodeURIComponent(slug)}`, {
      next: { revalidate: 600 },
    });
    return r.ok ? ((await r.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function CongNgheIndex() {
  const ds = await layDanhSach();
  const nhom = new Map<string, CongNgheTom[]>();
  ds.forEach((x) => {
    const k = x.category || "Khác";
    if (!nhom.has(k)) nhom.set(k, []);
    nhom.get(k)!.push(x);
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Công nghệ mã nguồn mở cho Solo CEO",
    url: `${WEB}/giai-phap/nen-tang`,
    description:
      "Hơn 100 nền tảng mã nguồn mở đã được SoloCEO triển khai và kiểm chứng: giới thiệu, bản demo chạy thật và khoá học đi kèm.",
    hasPart: ds.slice(0, 100).map((x) => ({
      "@type": "SoftwareApplication",
      name: x.name,
      applicationCategory: x.category,
      url: `${WEB}/giai-phap/nen-tang/${x.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-16">
        <div className="mb-3 font-mono text-[11px] tracking-[.18em] text-[#e3b341] uppercase">
          Công nghệ mã nguồn mở
        </div>
        <h1 className="max-w-3xl text-[40px] leading-[1.12] font-semibold tracking-[-.02em] md:text-[52px]">
          {ds.length > 0 ? `${ds.length} nền tảng` : "Nền tảng"} đã kiểm chứng, dựng được ngay
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#a2a2aa]">
          Mỗi nền tảng ở đây đã được cài thật, chạy thật trên hạ tầng SoloCEO. Bạn xem giới
          thiệu, bấm vào bản demo để thử, rồi học cách dùng — không phải đọc tài liệu tiếng
          Anh rồi tự mò.
        </p>

        {ds.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-[#232326] bg-[#131315] p-10 text-center text-[#8b8b92]">
            Đang biên soạn nội dung cho các nền tảng. Quay lại sau nhé.
          </div>
        ) : (
          [...nhom.entries()].map(([ten, items]) => (
            <section key={ten} className="mt-12">
              <h2 className="mb-4 flex items-baseline gap-2 font-mono text-[11px] tracking-[.16em] text-[#6b6b73] uppercase">
                {ten} <span className="text-[#3fb950]">{items.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((x) => (
                  <a
                    key={x.slug}
                    href={`/giai-phap/nen-tang/${x.slug}`}
                    className="group rounded-2xl border border-[#232326] bg-[#131315] p-4 transition hover:border-[#3a3a3f]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#f5f5f6] group-hover:text-white">
                        {x.name}
                      </span>
                      {x.usesAI ? (
                        <span className="rounded-md border border-[#3fb950]/40 px-1.5 py-0.5 font-mono text-[9.5px] text-[#3fb950]">
                          AI
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-[#8b8b92]">
                      {x.seoDesc || x.summary || ""}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export async function CongNgheChiTiet({ slug }: { slug: string }) {
  const b = (await layBai(slug)) as {
    name?: string; category?: string; html?: string; summary?: string; seoDesc?: string;
  } | null;

  if (!b) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-28 text-center">
          <h1 className="text-[26px] font-semibold">Chưa có bài cho nền tảng này</h1>
          <a href="/giai-phap/nen-tang" className="mt-5 inline-block text-[14px] text-[#3fb950]">
            ← Xem tất cả nền tảng
          </a>
        </main>
        <SiteFooter />
      </div>
    );
  }

  // Hai khối dữ liệu có cấu trúc: mô tả phần mềm, và đường dẫn phân cấp. Đường dẫn phân cấp
  // giúp kết quả tìm kiếm hiện "SoloCEO › Giải pháp › Nền tảng › Tên" thay vì một URL trần.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: b.name,
      applicationCategory: b.category,
      description: b.seoDesc || b.summary,
      url: `${WEB}/giai-phap/nen-tang/${slug}`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "VND" },
      isAccessibleForFree: true,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "SoloCEO", item: WEB },
        { "@type": "ListItem", position: 2, name: "Nền tảng mã nguồn mở", item: `${WEB}/giai-phap/nen-tang` },
        { "@type": "ListItem", position: 3, name: b.name, item: `${WEB}/giai-phap/nen-tang/${slug}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="pt-10 pb-24">
        <div className="mx-auto mb-5 max-w-[800px] px-5">
          <nav aria-label="Đường dẫn" className="font-mono text-[11px] text-[#6b6b73]">
            <a href="/giai-phap/nen-tang" className="hover:text-[#3fb950]">Nền tảng mã nguồn mở</a>
            <span className="mx-1.5">›</span>
            <span className="text-[#a2a2aa]">{b.category}</span>
          </nav>
          <h1 className="mt-3 text-[34px] leading-[1.16] font-semibold tracking-[-.02em] md:text-[42px]">
            {b.name}
          </h1>
        </div>
        {/* HTML do chính hệ thống dựng từ khuôn cố định (nen-tang.mau.ts), không nhận từ
            người dùng — nên nhả thẳng là an toàn. */}
        <div dangerouslySetInnerHTML={{ __html: b.html ?? "" }} />
      </main>
      <SiteFooter />
    </div>
  );
}
