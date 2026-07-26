// Khung dùng chung cho 3 trang sản phẩm (dữ liệu · xưởng kiểm chứng · sàn).
// Ba trang này kể một câu chuyện nối tiếp nhau nên dùng chung bố cục để người đọc
// nhận ra ngay chúng là ba khâu của cùng một dây chuyền, không phải ba thứ rời rạc.
import { SiteHeader } from "@/components/landing/soloceo-nav";

export type Khoi = { nhan: string; so: string; chu_thich: string };
export type Buoc = { ten: string; mo_ta: string };

export function DayChuyen({ dang }: { dang: "du-lieu" | "xuong" | "san" }) {
  const cac = [
    { ma: "du-lieu", ten: "Bộ não dữ liệu", href: "/san-pham/du-lieu", icon: "🧠" },
    { ma: "xuong", ten: "Xưởng kiểm chứng", href: "/san-pham/xuong-kiem-chung", icon: "🧪" },
    { ma: "san", ten: "Sàn sản phẩm", href: "/san-pham/san-giao-dich", icon: "🛒" },
  ];
  return (
    <div className="mx-auto mb-14 flex max-w-3xl items-center justify-center gap-2">
      {cac.map((c, i) => (
        <div key={c.ma} className="flex items-center gap-2">
          <a
            href={c.href}
            className={`rounded-xl border px-4 py-2.5 text-center text-[13px] transition ${
              c.ma === dang
                ? "border-[#3fb950] bg-[#0f2413] text-[#3fb950]"
                : "border-[#232326] bg-[#131315] text-[#a2a2aa] hover:border-[#3a3a3f] hover:text-[#f5f5f6]"
            }`}
          >
            <span className="mr-1.5">{c.icon}</span>
            {c.ten}
          </a>
          {i < cac.length - 1 && <span className="text-[#4a4a52]">→</span>}
        </div>
      ))}
    </div>
  );
}

export function KhungSanPham({
  nhan, tieu_de, dan_nhap, dang, so_lieu, children,
}: {
  nhan: string; tieu_de: React.ReactNode; dan_nhap: string;
  dang: "du-lieu" | "xuong" | "san"; so_lieu: Khoi[]; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e6e6e6]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-16">
        <div className="mb-3 text-center font-mono text-[11px] tracking-[.18em] text-[#e3b341] uppercase">
          {nhan}
        </div>
        <h1 className="mx-auto max-w-3xl text-center text-[40px] leading-[1.12] font-semibold tracking-[-.02em] md:text-[52px]">
          {tieu_de}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-[16px] leading-relaxed text-[#a2a2aa]">
          {dan_nhap}
        </p>

        <div className="my-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {so_lieu.map((k) => (
            <div key={k.nhan} className="rounded-2xl border border-[#232326] bg-[#131315] p-4 text-center">
              <div className="text-[26px] font-semibold tracking-tight">{k.so}</div>
              <div className="mt-1 text-[12px] text-[#e6e6e6]">{k.nhan}</div>
              <div className="mt-0.5 text-[11px] text-[#6b6b73]">{k.chu_thich}</div>
            </div>
          ))}
        </div>

        <DayChuyen dang={dang} />
        {children}
      </main>
    </div>
  );
}

export function Muc({ tieu_de, children }: { tieu_de: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="mb-4 font-mono text-[11px] tracking-[.16em] text-[#6b6b73] uppercase">{tieu_de}</h2>
      {children}
    </section>
  );
}

export function TheBuoc({ cac }: { cac: Buoc[] }) {
  return (
    <ol className="space-y-2">
      {cac.map((b, i) => (
        <li key={b.ten} className="flex gap-3 rounded-xl border border-[#232326] bg-[#131315] p-4">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#2f2f34] font-mono text-[11px] text-[#8b8b92]">
            {i + 1}
          </span>
          <div>
            <div className="text-[14px] font-medium">{b.ten}</div>
            <div className="mt-1 text-[13px] leading-relaxed text-[#8b8b92]">{b.mo_ta}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function NutMo({ href, chu, phu }: { href: string; chu: string; phu?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 rounded-xl bg-[#f5f5f6] px-5 py-3 text-[14px] font-medium text-[#0b0b0c] transition hover:bg-white"
    >
      {chu} <span className="text-[12px]">↗</span>
      {phu && <span className="ml-1 font-mono text-[11px] opacity-60">{phu}</span>}
    </a>
  );
}
