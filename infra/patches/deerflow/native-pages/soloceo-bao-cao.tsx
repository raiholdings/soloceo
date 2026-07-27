// Trang Báo cáo — danh sách và trang đọc.
//
// Báo cáo là tài liệu HTML tự chứa (CSS nằm trong chính nó), nên trang đọc chỉ việc bọc
// một khung tối thiểu rồi nhả nguyên vào. Không dựng lại bố cục ở đây — dựng hai lần là
// hai nơi phải sửa mỗi khi đổi giao diện báo cáo.
import { SiteHeader } from "@/components/landing/soloceo-nav";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.soloceo.vn";

type BaoCaoTom = {
  id: string; title: string; slug: string; summary?: string | null;
  coverUrl?: string | null; category: string; authorName: string; publishedAt?: string | null;
};

const NHOM: Record<string, string> = {
  "thi-truong": "Thị trường",
  "cong-nghe": "Công nghệ",
  "y-tuong": "Ý tưởng",
  "tong-hop": "Tổng hợp",
};

function ngayVN(s?: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function lay<T>(duong: string): Promise<T | null> {
  try {
    const r = await fetch(`${API}/v1${duong}`, { next: { revalidate: 300 } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function BaoCaoIndex() {
  const ds = (await lay<BaoCaoTom[]>("/bao-cao")) ?? [];
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-16">
        <div className="mb-3 font-mono text-[11px] tracking-[.18em] text-[#e3b341] uppercase">
          Báo cáo nghiên cứu
        </div>
        <h1 className="max-w-3xl text-[40px] leading-[1.12] font-semibold tracking-[-.02em] md:text-[52px]">
          Mỗi ngày một bản, viết từ dữ liệu thật
        </h1>
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#a2a2aa]">
          Đội AI SoloCEO đọc kho dữ liệu và xưởng kiểm chứng rồi viết lại thành báo cáo:
          ý tưởng mới, công nghệ đáng chú ý, nghiên cứu thị trường — kèm cả những thứ đã bị
          đánh trượt và vì sao. Mọi con số đều truy được về nguồn.
        </p>

        {ds.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-[#232326] bg-[#131315] p-10 text-center text-[#8b8b92]">
            Chưa có báo cáo nào được xuất bản.
          </div>
        ) : (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {ds.map((b) => (
              <a
                key={b.id}
                href={`/bao-cao/${b.slug}`}
                className="group overflow-hidden rounded-2xl border border-[#232326] bg-[#131315] transition hover:border-[#3a3a3f]"
              >
                {b.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.coverUrl}
                    alt={b.title}
                    className="aspect-[1200/630] w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="p-5">
                  <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.12em] text-[#6b6b73] uppercase">
                    <span className="text-[#3fb950]">{NHOM[b.category] ?? b.category}</span>
                    <span>·</span>
                    <span>{ngayVN(b.publishedAt)}</span>
                  </div>
                  <h2 className="mt-2 text-[17px] leading-snug font-semibold text-[#f5f5f6] group-hover:text-white">
                    {b.title}
                  </h2>
                  {b.summary ? (
                    <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-[#8b8b92]">
                      {b.summary}
                    </p>
                  ) : null}
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export async function BaoCaoChiTiet({ slug }: { slug: string }) {
  const b = await lay<{ title: string; html: string; publishedAt?: string | null }>(
    `/bao-cao/${encodeURIComponent(slug)}`,
  );
  if (!b) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-5 py-28 text-center">
          <h1 className="text-[26px] font-semibold">Không tìm thấy báo cáo</h1>
          <a href="/bao-cao" className="mt-5 inline-block text-[14px] text-[#3fb950]">
            ← Về danh sách báo cáo
          </a>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
      <SiteHeader />
      <main className="pt-10 pb-24">
        <div className="mx-auto mb-6 max-w-[820px] px-5">
          <a href="/bao-cao" className="text-[13px] text-[#8b8b92] hover:text-[#3fb950]">
            ← Tất cả báo cáo
          </a>
        </div>
        {/* HTML do chính hệ thống dựng từ khuôn cố định (bao-cao.mau.ts), không nhận từ
            người dùng — nên nhả thẳng là an toàn. Nếu sau này cho phép nhập HTML từ nguồn
            ngoài thì PHẢI lọc trước ở khâu nhập, không phải ở đây. */}
        <div dangerouslySetInnerHTML={{ __html: b.html }} />
      </main>
    </div>
  );
}
