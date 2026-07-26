// Trang /solo-ceo-dien-hinh — chân dung các Solo CEO tiêu biểu, lấy từ thành viên
// cộng đồng my.soloceo.vn (members-feed.php, hồ sơ đầy đủ). Server-rendered.
import { SiteHeader, SiteFooter } from "@/components/landing/soloceo-nav";

const FEED = "https://my.soloceo.vn/members-feed.php";
const COMMUNITY = "https://my.soloceo.vn";
const WORKSPACE = "/workspace";

type Member = {
  username: string; name: string; avatar: string; cover: string;
  about: string; working: string; website: string;
  verified: boolean; isPro: boolean; url: string;
};

async function getMembers(): Promise<Member[]> {
  try {
    const r = await fetch(FEED, { next: { revalidate: 300 } });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d?.members) ? d.members : [];
  } catch { return []; }
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1]![0] : "")).toUpperCase() || "•";
}

// Solo CEO điển hình tiêu biểu — venture mẫu vận hành thật trên nền tảng.
const EXEMPLAR = {
  name: "OpenClawOS",
  tagline: "Hệ điều hành cho doanh nghiệp một người",
  bio: "Một Solo CEO xây trọn một SaaS — website, CRM, cộng đồng, mô hình kinh doanh, phễu bán hàng và kế toán — chỉ với một người cùng Đội AI. Doanh thu đã xác thực qua module Payments của nền tảng.",
  url: "https://hub.openclawos.vn",
  stats: [
    ["Doanh thu xác thực", "260 triệu"],
    ["MRR", "39 triệu / tháng"],
    ["Định giá M&A", "1,4 tỷ"],
    ["Vận hành", "1 người + Đội AI"],
  ] as [string, string][],
};

export async function CeosPage() {
  const members = await getMembers();
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw]">
        <section className="py-14 md:py-16">
          <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Tài nguyên · Cộng đồng</div>
          <h1 className="max-w-3xl text-[clamp(30px,5vw,54px)] leading-[1.05] font-extrabold tracking-[-.025em]">Solo CEO <span className="text-[#e3b341]">điển hình.</span></h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[#a2a2aa]">Chân dung những người đang vận hành doanh nghiệp một người bằng AI trong cộng đồng SoloCEO — hồ sơ thật, cập nhật trực tiếp từ cộng đồng.</p>
          <a href={COMMUNITY} target="_blank" rel="noopener" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#f5f5f6] px-5 py-2.5 text-[14px] font-bold text-[#0b0b0c] transition hover:opacity-90">Tham gia cộng đồng →</a>
        </section>

        {/* FEATURED EXEMPLAR */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-[#e3b341]/35 bg-gradient-to-b from-[#15140f] to-[#0f0e0b]">
          <div className="p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e3b341]/15 px-3 py-1 font-mono text-[10px] font-bold tracking-wide text-[#e3b341] uppercase">★ Điển hình tiêu biểu</div>
            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-.02em]">{EXEMPLAR.name}</h2>
              <span className="text-[15px] text-[#a2a2aa]">{EXEMPLAR.tagline}</span>
            </div>
            <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[#a2a2aa]">{EXEMPLAR.bio}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {EXEMPLAR.stats.map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-[#232326] bg-[#0b0b0c]/60 p-4">
                  <div className="text-[19px] font-extrabold tracking-[-.01em] text-[#3fb950]">{v}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] tracking-wide text-[#6b6b73] uppercase">{k}</div>
                </div>
              ))}
            </div>
            <a href={EXEMPLAR.url} target="_blank" rel="noopener" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#e3b341] px-5 py-2.5 text-[14px] font-bold text-[#0b0b0c] transition hover:opacity-90">Xem câu chuyện →</a>
          </div>
        </section>

        {members.length > 0 && (
          <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#a2a2aa] uppercase"><span className="h-px w-5 bg-[#33333a]" /> Thành viên cộng đồng</div>
        )}

        {members.length === 0 ? (
          <section className="mb-20 rounded-3xl border border-[#232326] bg-[#131315] px-6 py-16 text-center">
            <div className="text-4xl">🏆</div>
            <h2 className="mt-4 text-[20px] font-bold">Đang cập nhật chân dung Solo CEO</h2>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-[#a2a2aa]">Hoàn thiện hồ sơ của bạn trong cộng đồng để xuất hiện tại đây.</p>
          </section>
        ) : (
          <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <a key={m.username} href={m.url} target="_blank" rel="noopener" className="group flex flex-col overflow-hidden rounded-2xl border border-[#232326] bg-[#131315] transition hover:border-[#33333a]">
                <div className="relative h-24 w-full bg-gradient-to-br from-[#1a1a1d] to-[#131315]">
                  {m.cover && <img src={m.cover} alt="" className="h-full w-full object-cover opacity-80" />}
                </div>
                <div className="flex flex-1 flex-col px-5 pb-5">
                  <div className="-mt-8 mb-3 h-16 w-16 overflow-hidden rounded-2xl border-2 border-[#131315] bg-[#1a1a1d]">
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center bg-[#232326] font-mono text-[18px] font-bold text-[#e3b341]">{initials(m.name)}</div>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[16px] font-bold">{m.name}</h3>
                    {m.verified && <span title="Đã xác minh" className="text-[13px] text-[#3fb950]">✔</span>}
                    {m.isPro && <span className="rounded bg-[#e3b341]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-[#e3b341] uppercase">Pro</span>}
                  </div>
                  <div className="font-mono text-[11px] text-[#6b6b73]">@{m.username}{m.working ? " · " + m.working : ""}</div>
                  {m.about && <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#a2a2aa]">{m.about}</p>}
                  <div className="mt-auto pt-4 text-[12px] font-semibold text-[#e3b341] opacity-0 transition group-hover:opacity-100">Xem hồ sơ →</div>
                </div>
              </a>
            ))}
          </section>
        )}

        <section className="mb-14 rounded-3xl border border-[#232326] bg-gradient-to-b from-[#131315] to-[#0b0b0c] px-6 py-12 text-center">
          <h2 className="text-[clamp(22px,3.5vw,34px)] font-extrabold tracking-[-.02em]">Trở thành Solo CEO tiếp theo</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#a2a2aa]">Bắt đầu vận hành doanh nghiệp một người của bạn cùng Đội AI.</p>
          <a href={WORKSPACE} className="mt-6 inline-block rounded-xl bg-[#f5f5f6] px-7 py-3.5 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace →</a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
