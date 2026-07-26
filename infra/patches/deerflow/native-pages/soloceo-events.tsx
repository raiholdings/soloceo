"use client";
import { SiteHeader } from "@/components/landing/soloceo-nav";
// Trang Sự kiện public /su-kien — lấy sự kiện từ API cộng đồng (my.soloceo.vn),
// hiển thị theo brand SoloCEO (đen+xanh+gold+mono). Trống → empty state có CTA.
import { useEffect, useState } from "react";

const WORKSPACE = "/workspace";
const FEED = "https://my.soloceo.vn/events-feed.php";
const COMMUNITY_EVENTS = "https://my.soloceo.vn/events/";

type Ev = {
  id: number; name: string; location: string; desc: string;
  startDate: string; startTime: string; endDate: string;
  cover: string; url: string; upcoming: boolean;
};

const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
function fmtDate(d: string) {
  if (!d || d === "0000-00-00") return "";
  const p = d.split("-");
  if (p.length !== 3) return d;
  const [y, m, day] = p as [string, string, string];
  return `${day}/${MONTHS[Number(m) - 1] ?? m}/${y}`;
}

export function SoloceoEvents() {
  const [evs, setEvs] = useState<Ev[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let ok = true;
    fetch(FEED + "?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (ok) setEvs(Array.isArray(d?.events) ? d.events : []); })
      .catch(() => { if (ok) { setErr(true); setEvs([]); } });
    return () => { ok = false; };
  }, []);

  const upcoming = (evs ?? []).filter((e) => e.upcoming);
  const past = (evs ?? []).filter((e) => !e.upcoming);

  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw]">
        {/* HERO */}
        <section className="py-16 md:py-20">
          <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Tài nguyên · Sự kiện</div>
          <h1 className="max-w-3xl text-[clamp(30px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-.025em]">Sự kiện cộng đồng <span className="text-[#e3b341]">Solo CEO.</span></h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[#a2a2aa]">Workshop, webinar, gặp gỡ và chia sẻ giữa những người vận hành doanh nghiệp một người bằng AI — cập nhật trực tiếp từ cộng đồng.</p>
          <a href={COMMUNITY_EVENTS} target="_blank" rel="noopener" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#f5f5f6] px-5 py-2.5 text-[14px] font-bold text-[#0b0b0c] transition hover:opacity-90">Xem trên cộng đồng →</a>
        </section>

        {/* LOADING */}
        {evs === null && (
          <div className="grid gap-3 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-2xl border border-[#1a1a1d] bg-[#131315]" />)}
          </div>
        )}

        {/* EMPTY */}
        {evs !== null && upcoming.length === 0 && past.length === 0 && (
          <section className="mb-20 rounded-3xl border border-[#232326] bg-[#131315] px-6 py-16 text-center">
            <div className="text-4xl">📅</div>
            <h2 className="mt-4 text-[22px] font-bold">Chưa có sự kiện nào sắp diễn ra</h2>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] text-[#a2a2aa]">Sự kiện mới sẽ xuất hiện tại đây ngay khi được tạo trong cộng đồng. Theo dõi cộng đồng để không bỏ lỡ buổi gặp tới.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a href={COMMUNITY_EVENTS} target="_blank" rel="noopener" className="rounded-xl bg-[#f5f5f6] px-5 py-2.5 text-[14px] font-bold text-[#0b0b0c] transition hover:opacity-90">Tạo sự kiện trong cộng đồng →</a>
              <a href="https://my.soloceo.vn" target="_blank" rel="noopener" className="rounded-xl border border-[#33333a] px-5 py-2.5 text-[14px] font-semibold transition hover:border-[#f5f5f6]">Tham gia cộng đồng</a>
            </div>
            {err && <p className="mt-5 font-mono text-[11px] text-[#6b6b73]">Không kết nối được nguồn sự kiện — thử lại sau.</p>}
          </section>
        )}

        {/* UPCOMING */}
        {upcoming.length > 0 && (
          <section className="pb-12">
            <div className="mb-5 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#3fb950] uppercase"><span className="h-px w-5 bg-[#3fb950]" /> Sắp diễn ra · {upcoming.length}</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => <Card key={e.id} e={e} live />)}
            </div>
          </section>
        )}

        {/* PAST */}
        {past.length > 0 && (
          <section className="border-t border-[#1a1a1d] py-12">
            <div className="mb-5 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#a2a2aa] uppercase"><span className="h-px w-5 bg-[#33333a]" /> Đã diễn ra</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((e) => <Card key={e.id} e={e} />)}
            </div>
          </section>
        )}
      </main>
      <Foot />
    </div>
  );
}

function Card({ e, live }: { e: Ev; live?: boolean }) {
  return (
    <a href={e.url} target="_blank" rel="noopener" className="group flex flex-col overflow-hidden rounded-2xl border border-[#232326] bg-[#131315] transition hover:border-[#33333a]">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#1a1a1d]">
        {e.cover
          ? <img src={e.cover} alt={e.name} className="h-full w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
          : <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">📅</div>}
        {live && <span className="absolute left-3 top-3 rounded-md bg-[#0b0b0c]/80 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-[#3fb950] backdrop-blur">SẮP DIỄN RA</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="font-mono text-[11px] tracking-wide text-[#e3b341]">{fmtDate(e.startDate)}{e.startTime ? " · " + e.startTime.slice(0, 5) : ""}</div>
        <h3 className="mt-1.5 line-clamp-2 text-[15.5px] font-bold leading-snug">{e.name}</h3>
        {e.location && <div className="mt-1 flex items-center gap-1 text-[12px] text-[#a2a2aa]"><span>📍</span>{e.location}</div>}
        {e.desc && <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-[#a2a2aa]">{e.desc}</p>}
        <div className="mt-auto pt-3 text-[12px] font-semibold text-[#e3b341] opacity-0 transition group-hover:opacity-100">Xem chi tiết →</div>
      </div>
    </a>
  );
}

function Foot() {
  return (
    <footer className="border-t border-[#1a1a1d] px-[6vw] py-8 text-center">
      <p className="font-mono text-[11px] tracking-wide text-[#6b6b73]">© SoloCEO — Hệ điều hành cho doanh nghiệp một người · 2026</p>
    </footer>
  );
}
