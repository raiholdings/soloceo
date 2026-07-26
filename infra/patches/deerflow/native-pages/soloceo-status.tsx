// Trang Trạng thái hệ sinh thái /trang-thai — kiểm tra sức khoẻ thời gian thực
// (server-side) toàn bộ domain & dịch vụ SoloCEO. Brand SoloCEO. Minh bạch vận hành.
import { SiteHeader, SiteFooter } from "@/components/landing/soloceo-nav";

type Svc = { host: string; label: string; url: string };

const CORE: Svc[] = [
  { host: "soloceo.vn", label: "Trang chủ & Workspace", url: "https://soloceo.vn" },
  { host: "api.soloceo.vn", label: "API lõi (api-core)", url: "https://api.soloceo.vn/v1/news" },
  { host: "admin.soloceo.vn", label: "Admin Console", url: "https://admin.soloceo.vn" },
  { host: "pitchdeck.soloceo.vn", label: "Pitch deck", url: "https://pitchdeck.soloceo.vn" },
  { host: "marketplace.soloceo.vn", label: "100 dự án AI", url: "https://marketplace.soloceo.vn" },
  { host: "platform.soloceo.vn", label: "PaaS / dịch vụ", url: "https://platform.soloceo.vn" },
];
const APPS: Svc[] = [
  { host: "my.soloceo.vn", label: "Cộng đồng", url: "https://my.soloceo.vn" },
  { host: "crm.soloceo.vn", label: "CRM", url: "https://crm.soloceo.vn" },
  { host: "chat.soloceo.vn", label: "Chat đa kênh", url: "https://chat.soloceo.vn" },
  { host: "edu.soloceo.vn", label: "Đào tạo", url: "https://edu.soloceo.vn" },
  { host: "meeting.soloceo.vn", label: "Họp video", url: "https://meeting.soloceo.vn" },
  { host: "aff.soloceo.vn", label: "Affiliate", url: "https://aff.soloceo.vn" },
  { host: "news.soloceo.vn", label: "Tin tức", url: "https://news.soloceo.vn" },
  { host: "hub.soloceo.vn", label: "AI Hub", url: "https://hub.soloceo.vn" },
];

export type Res = Svc & { up: boolean; code: number };

async function ping(s: Svc): Promise<Res> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(s.url, { signal: c.signal, cache: "no-store" });
    clearTimeout(t);
    return { ...s, up: r.status >= 200 && r.status < 400, code: r.status };
  } catch {
    return { ...s, up: false, code: 0 };
  }
}

// Kiểm tra toàn bộ dịch vụ — dùng chung cho trang /trang-thai và API route /api/health.
export async function checkAll() {
  const [core, apps] = await Promise.all([
    Promise.all(CORE.map(ping)),
    Promise.all(APPS.map(ping)),
  ]);
  const all = [...core, ...apps];
  const upCount = all.filter((i) => i.up).length;
  const total = all.length;
  return { core, apps, all, upCount, total, allUp: upCount === total, pct: Math.round((upCount / total) * 100) };
}

function Board({ title, items }: { title: string; items: Res[] }) {
  const up = items.filter((i) => i.up).length;
  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-[#232326] bg-[#131315]">
      <div className="flex items-center justify-between border-b border-[#232326] px-5 py-3.5">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <span className="font-mono text-[12px] text-[#a2a2aa]"><b className="text-[#f5f5f6]">{up}</b>/{items.length} hoạt động</span>
      </div>
      <div>
        {items.map((i) => (
          <div key={i.host} className="flex items-center gap-3 border-t border-[#1c1c1f] px-5 py-3 first:border-t-0">
            <span className={"inline-block h-2.5 w-2.5 flex-none rounded-full " + (i.up ? "bg-[#3fb950] shadow-[0_0_0_3px_rgba(63,185,80,.15)]" : "bg-[#d0813c] shadow-[0_0_0_3px_rgba(208,129,60,.15)]")} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold">{i.label}</div>
              <div className="font-mono text-[11.5px] text-[#6b6b73]">{i.host}</div>
            </div>
            <span className={"font-mono text-[11px] " + (i.up ? "text-[#3fb950]" : "text-[#d0813c]")}>{i.up ? "HOẠT ĐỘNG" : "MẤT KẾT NỐI"}</span>
            <span className="w-10 text-right font-mono text-[12px] text-[#a2a2aa]">{i.code || "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function StatusPage() {
  const { core, apps, all, upCount, allUp, pct } = await checkAll();

  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-[6vw]">
        <section className="py-14 md:py-16">
          <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Tài nguyên · Trạng thái</div>
          <h1 className="text-[clamp(28px,5vw,50px)] leading-[1.05] font-extrabold tracking-[-.025em]">Trạng thái hệ sinh thái</h1>
          <div className="mt-6 flex items-center gap-4 rounded-2xl border px-5 py-4"
               style={{ borderColor: allUp ? "rgba(63,185,80,.35)" : "rgba(208,129,60,.35)", background: allUp ? "rgba(63,185,80,.06)" : "rgba(208,129,60,.06)" }}>
            <span className={"inline-block h-3.5 w-3.5 rounded-full " + (allUp ? "bg-[#3fb950]" : "bg-[#d0813c]")} />
            <div className="flex-1">
              <div className="text-[16px] font-bold">{allUp ? "Tất cả hệ thống đang hoạt động" : `${upCount}/${all.length} hệ thống đang hoạt động`}</div>
              <div className="font-mono text-[12px] text-[#a2a2aa]">Uptime tức thời {pct}% · cập nhật mỗi phút</div>
            </div>
          </div>
        </section>

        <Board title="Hệ thống lõi" items={core} />
        <Board title="Nền tảng cộng đồng" items={apps} />

        <p className="mt-4 mb-14 font-mono text-[11px] leading-relaxed text-[#6b6b73]">
          Kiểm tra HTTP thời gian thực từ máy chủ SoloCEO, làm mới mỗi 60 giây. Chuyển hướng đăng nhập (301/302/307) được tính là “hoạt động”. Đây là kiểm tra tầng ứng dụng, không thay thế giám sát nội bộ (Uptime Kuma).
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
