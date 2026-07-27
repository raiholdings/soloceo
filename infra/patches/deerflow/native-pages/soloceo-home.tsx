"use client";
// Trang chủ soloceo.vn — landing chuẩn brand SoloCEO (đen #0b0b0c + xanh #3fb950 + vàng
// #e3b341 + nhãn mono). Kể câu chuyện "một người vận hành cả doanh nghiệp bằng AI" và
// phản ánh đúng nền tảng đang có, kèm SỐ LIỆU THỜI GIAN THỰC (fetch pitchdeck stats.json).
import { useEffect, useState } from "react";

import { SoloceoIdeaComposer } from "@/components/workspace/soloceo-idea-composer";

const WORKSPACE = "/workspace";
const STATS = "https://pitchdeck.soloceo.vn/stats.json";

type Stats = {
  platforms: number; platformsLive: number; projects: number;
  ceos: number; revenueVnd: number; revenue30dVnd: number; venturesLive: number;
};
const DEFAULTS: Stats = { platforms: 110, platformsLive: 62, projects: 100, ceos: 7, revenueVnd: 260000000, revenue30dVnd: 33000000, venturesLive: 1 };

function money(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(".0", "") + " tỷ";
  if (n >= 1e6) return Math.round(n / 1e6) + "tr";
  return new Intl.NumberFormat("vi-VN").format(n);
}

const IND = [
  "🤖 Trợ lý AI","⚙️ Tự động hoá","🏢 Quản trị DN","🛒 Thương mại điện tử","📣 Marketing",
  "🤝 Cộng tác","✈️ Du lịch & F&B","🏠 Bất động sản","🏥 Y tế","💬 Bán hàng & CSKH",
  "🎓 Giáo dục & Nhân sự","💰 Tài chính","🚚 Logistics",
];
const STEPS = [
  ["01","Chọn ý tưởng","Từ 100 dự án AI nghiên cứu từ startup thành công thật trên thế giới."],
  ["02","Cấu hình nền tảng","Bó công cụ từ 110 nền tảng mã nguồn mở — giá minh bạch theo tháng."],
  ["03","Đội AI dựng","DeerFlow dựng landing, kế hoạch bán hàng, kênh, kế toán theo ý tưởng."],
  ["04","Vận hành & bán","Doanh thu đo được → niêm yết Sàn M&A khi muốn thoái vốn."],
];
const AGENTS = [
  ["🧭","Lãnh đạo"],["✍️","Nội dung"],["📈","Kinh doanh"],["📣","Marketing"],
  ["🧾","Kế toán"],["🛠️","Vận hành"],["🔎","Nghiên cứu"],["🔒","An toàn (HITL)"],
];
const DOMAINS = [
  ["soloceo.vn","Workspace + Đội AI"],["platform.soloceo.vn","110 nền tảng"],
  ["marketplace.soloceo.vn","100 dự án AI"],["my.soloceo.vn","Cộng đồng"],
  ["edu.soloceo.vn","Đào tạo · 94 khoá"],["crm.soloceo.vn","CRM"],
  ["chat.soloceo.vn","Chat đa kênh"],["news.soloceo.vn","Tin tức"],
  ["meeting.soloceo.vn","Họp video"],["pitchdeck.soloceo.vn","Pitch deck"],
];
const PLANS = [
  ["Starter","299.000đ","1 venture · Web + CRM · 50K token AI · phí 3%", false],
  ["Growth","990.000đ","+ AI Studio + Tự động hoá · 500K token · phí 2% · niêm yết M&A", true],
  ["Scale","2.900.000đ","3 venture · tất cả nền tảng · 2M token · phí 1.5%", false],
];
// 8 nền tảng cộng đồng đi kèm mọi Solo CEO (nhúng trong workspace).
const COMMUNITY: [string, string, string, string][] = [
  ["CRM", "Quản lý khách hàng, báo giá, hoá đơn", "/giai-phap/crm", "📊"],
  ["Chat đa kênh", "Chăm sóc khách hàng đa kênh + chatbot", "/giai-phap/chat", "💬"],
  ["Đào tạo", "Học viện online: khoá học & chứng chỉ", "/giai-phap/dao-tao", "🎓"],
  ["Cộng đồng", "Mạng xã hội & feed nội bộ của bạn", "/giai-phap/cong-dong", "👥"],
  ["Video", "Nền tảng video của riêng bạn", "/giai-phap/video", "🎬"],
  ["Nhóm chat", "Nhóm & hội nhóm khách hàng", "/giai-phap/nhom-chat", "💭"],
  ["Họp video", "Họp trực tuyến chất lượng cao", "/giai-phap/hop-video", "📹"],
  ["Affiliate", "Tiếp thị liên kết đa merchant", "/giai-phap/aff", "🤝"],
  ["Tin tức", "Nền tảng media & tin tức của bạn", "/giai-phap/tin-tuc", "📰"],
  ["Công nghệ mã nguồn mở", "Hơn 100 nền tảng — giới thiệu, demo & khoá học", "/giai-phap/nen-tang", "🧱"],
];
// 8 nền tảng lõi (lớp n0) — năng lực engine AI + hạ tầng vận hành an toàn.
// Ba khâu của một dây chuyền: dữ liệu → kiểm chứng → bán.
// LƯU Ý NỢ KỸ THUẬT: thanh điều hướng ở đây LẶP LẠI soloceo-nav.tsx. Sửa một chỗ không
// ăn chỗ kia (đã mắc lỗi đúng vậy). Nên gộp về dùng chung <SiteHeader /> khi có dịp.
const SAN_PHAM: [string, string, string, string][] = [
  ["Bộ não dữ liệu", "Gần 1 triệu bản ghi thật, trọng tâm Việt Nam", "/san-pham/du-lieu", "🧠"],
  ["Xưởng kiểm chứng", "Ý tưởng phải chạy được thật mới đi tiếp", "/san-pham/xuong-kiem-chung", "🧪"],
  ["Sàn sản phẩm", "Mua doanh nghiệp đã chạy, có demo bấm được", "/san-pham/san-giao-dich", "🛒"],
];
const CORE: [string, string, string, string][] = [
  ["Đội AI tự hành", "Agent tự lập kế hoạch & thực thi", "/tinh-nang/doi-ai", "🤖"],
  ["Sandbox an toàn", "AI chạy code trong hộp cát cô lập", "/tinh-nang/sandbox", "🧪"],
  ["Canvas quy trình", "Kéo-thả luồng tự động hoá", "/tinh-nang/quy-trinh", "🧩"],
  ["Điều khiển trình duyệt AI", "Thao tác web bằng thị giác AI", "/tinh-nang/trinh-duyet", "🖱️"],
  ["Kỹ năng & Đội agent", "Cài kỹ năng, chia việc song song", "/tinh-nang/ky-nang", "🛠️"],
  ["Chống rò rỉ dữ liệu", "DLP che dữ liệu nhạy cảm", "/tinh-nang/bao-mat-du-lieu", "🛡️"],
  ["Đọc tài liệu & OCR", "Giấy tờ, ảnh chụp thành dữ liệu", "/tinh-nang/doc-tai-lieu", "📄"],
  ["Kiểm soát mạng", "Kiểm soát mọi kết nối AI ra ngoài", "/tinh-nang/kiem-soat-mang", "🌐"],
];
// Tài nguyên — nội dung, tài liệu (Sự kiện tách thành thanh riêng; bỏ Cộng đồng).
// ⚠ NỢ KỸ THUẬT: hai mảng COMMUNITY và RESOURCES ở đây TRÙNG với soloceo-nav.tsx.
// Thêm một mục menu phải sửa hai chỗ, và đã có lần quên chỗ này nên menu trang chủ
// thiếu mục trong khi các trang khác đã có. Nên đổi trang chủ sang dùng <SiteHeader />.
const RESOURCES: [string, string, string, string][] = [
  ["Báo cáo", "Nghiên cứu thị trường & công nghệ, mỗi ngày một bản", "/bao-cao", "📊"],
  ["Tin tức", "Bài viết & góc nhìn từ Đội AI SoloCEO", "/tin-tuc", "📰"],
  ["Tài liệu", "Hướng dẫn sử dụng & tài liệu", "/en/docs", "📚"],
  ["Solo CEO điển hình", "Chân dung thành viên tiêu biểu", "/solo-ceo-dien-hinh", "🏆"],
  ["Trạng thái", "Sức khoẻ hệ sinh thái thời gian thực", "/trang-thai", "🟢"],
  ["Pitch deck", "Giới thiệu toàn cảnh nền tảng", "https://pitchdeck.soloceo.vn", "🎯"],
];

function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="none" stroke="#f5f5f6" strokeWidth="7"/><circle cx="50" cy="50" r="12" fill="#e3b341"/></svg>
      <span className="text-[15px] font-semibold text-[#f5f5f6]">SoloCEO</span>
    </a>
  );
}

export function SoloceoHome() {
  const [s, setS] = useState<Stats>(DEFAULTS);
  useEffect(() => {
    let ok = true;
    fetch(STATS + "?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (ok && d) setS({ ...DEFAULTS, ...d }); })
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#1a1a1d] bg-[#0b0b0c]/85 px-[6vw] py-3.5 backdrop-blur">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {/* Sản phẩm — dây chuyền dữ liệu → kiểm chứng → bán */}
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition group-hover:bg-[#1a1a1d] group-hover:text-[#f5f5f6]">Sản phẩm<span className="text-[10px]">▾</span></button>
            <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="w-[480px] rounded-2xl border border-[#232326] bg-[#131315] p-3 shadow-2xl shadow-black/50">
                <div className="mb-2 px-2 font-mono text-[10px] tracking-[.14em] text-[#6b6b73] uppercase">Dây chuyền: dữ liệu → kiểm chứng → bán</div>
                <div className="grid grid-cols-1 gap-0.5">
                  {SAN_PHAM.map(([t,d,h,e]) => (
                    <a key={t} href={h} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#1a1a1d]">
                      <span className="mt-0.5 text-lg">{e}</span>
                      <span><span className="block text-[13.5px] text-[#f5f5f6]">{t}</span><span className="block text-[12px] text-[#8b8b92]">{d}</span></span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Tính năng — mega-menu 8 nền tảng lõi (engine AI) */}
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition group-hover:bg-[#1a1a1d] group-hover:text-[#f5f5f6]">Tính năng<span className="text-[10px]">▾</span></button>
            <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="w-[560px] rounded-2xl border border-[#232326] bg-[#131315] p-3 shadow-2xl shadow-black/50">
                <div className="mb-2 px-2 font-mono text-[10px] tracking-[.14em] text-[#6b6b73] uppercase">8 nền tảng lõi · engine AI vận hành an toàn</div>
                <div className="grid grid-cols-2 gap-0.5">
                  {CORE.map(([t,d,h,e]) => (
                    <a key={t} href={h} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#1a1a1d]">
                      <span className="mt-0.5 text-lg">{e}</span>
                      <div><div className="text-[13.5px] font-semibold text-[#f5f5f6]">{t}</div><div className="text-[11.5px] leading-snug text-[#a2a2aa]">{d}</div></div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Giải pháp — mega-menu 9 nền tảng cộng đồng */}
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition group-hover:bg-[#1a1a1d] group-hover:text-[#f5f5f6]">Giải pháp<span className="text-[10px]">▾</span></button>
            <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="w-[560px] rounded-2xl border border-[#232326] bg-[#131315] p-3 shadow-2xl shadow-black/50">
                <div className="mb-2 px-2 font-mono text-[10px] tracking-[.14em] text-[#6b6b73] uppercase">9 nền tảng cộng đồng · đi kèm mọi Solo CEO</div>
                <div className="grid grid-cols-2 gap-0.5">
                  {COMMUNITY.map(([t,d,h,e]) => (
                    <a key={t} href={h} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#1a1a1d]">
                      <span className="mt-0.5 text-lg">{e}</span>
                      <div><div className="text-[13.5px] font-semibold text-[#f5f5f6]">{t}</div><div className="text-[11.5px] leading-snug text-[#a2a2aa]">{d}</div></div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Tài nguyên — mega-menu (nội dung, tài liệu) */}
          <div className="group relative">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition group-hover:bg-[#1a1a1d] group-hover:text-[#f5f5f6]">Tài nguyên<span className="text-[10px]">▾</span></button>
            <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="w-[520px] rounded-2xl border border-[#232326] bg-[#131315] p-3 shadow-2xl shadow-black/50">
                <div className="mb-2 px-2 font-mono text-[10px] tracking-[.14em] text-[#6b6b73] uppercase">Tin tức · chân dung · tài liệu</div>
                <div className="grid grid-cols-2 gap-0.5">
                  {RESOURCES.map(([t,d,h,e]) => (
                    <a key={t} href={h} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#1a1a1d]">
                      <span className="mt-0.5 text-lg">{e}</span>
                      <div><div className="text-[13.5px] font-semibold text-[#f5f5f6]">{t}</div><div className="text-[11.5px] leading-snug text-[#a2a2aa]">{d}</div></div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <a href="/su-kien" className="rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition hover:bg-[#1a1a1d] hover:text-[#f5f5f6]">Sự kiện</a>
          <a href="/goi-cuoc" className="rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition hover:bg-[#1a1a1d] hover:text-[#f5f5f6]">Gói cước</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <a href={WORKSPACE} className="hidden rounded-lg border border-[#33333a] px-3.5 py-2 text-[13px] text-[#f5f5f6] transition hover:border-[#f5f5f6] sm:inline-block">Đăng nhập</a>
          <a href={WORKSPACE} className="rounded-lg bg-[#f5f5f6] px-4 py-2 text-[13px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace</a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-[6vw]">
        {/* HERO */}
        <section className="flex flex-col items-center py-20 text-center md:py-28">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#232326] bg-[#131315] px-3.5 py-1.5 font-mono text-[11px] tracking-[.14em] text-[#a2a2aa] uppercase">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3fb950] shadow-[0_0_0_3px_#3fb95026]" /> Hệ điều hành doanh nghiệp một người
          </div>
          <h1 className="max-w-4xl text-[clamp(38px,7vw,74px)] leading-[1.03] font-extrabold tracking-[-.025em]">
            Một người.<br />Cả một doanh nghiệp.<br /><span className="text-[#e3b341]">Vận hành bằng AI.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(16px,2vw,21px)] leading-relaxed text-[#a2a2aa]">
            Khởi tạo, vận hành và bán lại doanh nghiệp của riêng bạn — với <b className="font-semibold text-[#f5f5f6]">Đội AI</b> làm thay việc của cả một công ty, đứng trên <b className="font-semibold text-[#f5f5f6]">{s.platforms} nền tảng mã nguồn mở</b> đã dựng sẵn.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={WORKSPACE} className="rounded-xl bg-[#f5f5f6] px-6 py-3 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Bắt đầu — miễn phí →</a>
            <a href="https://marketplace.soloceo.vn" className="rounded-xl border border-[#33333a] px-6 py-3 text-[15px] font-semibold text-[#f5f5f6] transition hover:border-[#f5f5f6]">Xem 100 dự án AI</a>
          </div>
          {/* ⭐ Thanh khởi tạo ý tưởng — chạy qua Data Engine */}
          <div className="mt-10 w-full max-w-3xl text-left">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-[.14em] text-[#a2a2aa] uppercase">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#e3b341]" /> Khởi tạo ý tưởng · chạy qua Data Engine 133K+ bản ghi
            </div>
            <SoloceoIdeaComposer dark />
          </div>
          {/* live stats */}
          <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[[s.platforms,"nền tảng OSS","#e3b341"],[s.projects,"dự án AI","#e3b341"],[s.platformsLive,"demo LIVE","#3fb950"],[s.ceos,"Solo CEO","#e3b341"]].map(([v,l,c],i) => (
              <div key={i} className="rounded-2xl border border-[#232326] bg-[#131315] px-4 py-5">
                <div className="text-[clamp(26px,4vw,40px)] font-extrabold tabular-nums" style={{ color: c as string }}>{v as number}</div>
                <div className="mt-1 font-mono text-[10px] tracking-wide text-[#a2a2aa] uppercase">{l as string}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <Section kick="Cách hoạt động" title={<>Đăng ký là chạy. <span className="text-[#e3b341]">Không cần kỹ thuật.</span></>}>
          <div className="grid gap-3 md:grid-cols-4">
            {STEPS.map(([n,t,d]) => (
              <div key={n} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                <div className="font-mono text-[12px] font-bold tracking-wider text-[#e3b341]">{n}</div>
                <h3 className="mt-2 text-[16px] font-bold">{t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#a2a2aa]">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* AI TEAM */}
        <Section kick="Đội AI · DeerFlow" title={<>Một đội ngũ AI <span className="text-[#e3b341]">làm thay cả công ty.</span></>} sub="Lead agent điều phối 6 sub-agent chạy trong sandbox, có phê duyệt của con người ở các bước rủi ro. Mọi lời gọi AI đi qua cổng LiteLLM, chi phí đo được trên Langfuse.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AGENTS.map(([e,t]) => (
              <div key={t} className="rounded-xl border border-[#232326] bg-[#131315] p-4 text-center">
                <div className="text-2xl">{e}</div>
                <div className="mt-2 text-[14px] font-semibold">{t}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* CORE PLATFORMS — 8 nền tảng lõi */}
        <Section kick="Tính năng lõi" title={<>8 nền tảng lõi <span className="text-[#e3b341]">vận hành doanh nghiệp của bạn.</span></>} sub="Bộ engine AI và hạ tầng vận hành an toàn chạy ngầm dưới mọi tài khoản — để Đội AI làm việc thật, an toàn và trong tầm kiểm soát của bạn.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CORE.map(([t,d,h,e]) => (
              <a key={t} href={h} className="group rounded-2xl border border-[#232326] bg-[#131315] p-5 transition hover:border-[#33333a]">
                <div className="text-2xl">{e}</div>
                <h3 className="mt-3 text-[15px] font-bold">{t}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#a2a2aa]">{d}</p>
                <div className="mt-3 text-[12px] font-semibold text-[#e3b341] opacity-0 transition group-hover:opacity-100">Xem chi tiết →</div>
              </a>
            ))}
          </div>
          <a href="/tinh-nang" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#e3b341] hover:underline">Xem tất cả 8 tính năng lõi →</a>
        </Section>

        {/* PLATFORMS */}
        <Section kick="Nền tảng" title={<>{s.platforms} nền tảng mã nguồn mở, <span className="text-[#3fb950]">{s.platformsLive} đang chạy thật.</span></>} sub="13 nhóm ngành — mỗi Solo CEO tự bó thành stack riêng cho doanh nghiệp mình. Dùng thử demo ngay, không cần cài đặt.">
          <div className="flex flex-wrap gap-2">
            {IND.map((t) => (
              <span key={t} className="rounded-lg border border-[#232326] bg-[#1a1a1d] px-3 py-2 text-[12.5px] text-[#a2a2aa]">{t}</span>
            ))}
          </div>
          <a href="https://platform.soloceo.vn" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#e3b341] hover:underline">Khám phá {s.platforms} nền tảng →</a>
        </Section>

        {/* COMMUNITY PLATFORMS */}
        <Section kick="Nền tảng cộng đồng" title={<>9 nền tảng vận hành <span className="text-[#e3b341]">đi kèm mọi Solo CEO.</span></>} sub="Không chỉ AI — mỗi tài khoản SoloCEO có sẵn trọn bộ nền tảng cộng đồng, CRM, đào tạo, video, họp, tin tức và tiếp thị liên kết, đăng nhập một lần, dùng ngay trong workspace.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {COMMUNITY.map(([t,d,h,e]) => (
              <a key={t} href={h} className="group rounded-2xl border border-[#232326] bg-[#131315] p-5 transition hover:border-[#33333a]">
                <div className="text-2xl">{e}</div>
                <h3 className="mt-3 text-[15px] font-bold">{t}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#a2a2aa]">{d}</p>
                <div className="mt-3 text-[12px] font-semibold text-[#e3b341] opacity-0 transition group-hover:opacity-100">Mở trong workspace →</div>
              </a>
            ))}
          </div>
        </Section>

        {/* PROJECTS */}
        <Section kick="Dự án AI vận hành sẵn" title={<>{s.projects} doanh nghiệp AI — <span className="text-[#e3b341]">chọn là chạy.</span></>} sub="Mỗi dự án nghiên cứu từ startup thành công thật (Nomad List, HeadshotPro, Day AI, Mindtrip…), map sẵn vào stack nền tảng. Thuê bao theo tháng, Đội AI triển khai.">
          <div className="grid gap-3 md:grid-cols-3">
            {[["Trợ lý Tài chính AI","Dify + Firefly III + n8n"],["Học viện AI cá nhân hoá","Đào tạo + Dify + Typebot"],["Trợ lý bán BĐS AI","EspoCRM + Chatwoot + Documenso"]].map(([t,d]) => (
              <div key={t} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                <h3 className="text-[16px] font-bold">{t}</h3>
                <p className="mt-1.5 font-mono text-[12px] text-[#a2a2aa]">{d}</p>
              </div>
            ))}
          </div>
          <a href="https://marketplace.soloceo.vn" className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#e3b341] hover:underline">Xem tất cả {s.projects} dự án · từ 580.000đ/tháng →</a>
        </Section>

        {/* REVENUE + M&A (live) */}
        <Section kick={<>Doanh thu & Thanh khoản <span className="ml-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#3fb950]"><span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3fb950] shadow-[0_0_0_3px_#3fb95026]" />LIVE</span></>} title={<>Doanh thu <span className="text-[#3fb950]">đo được</span> → tài sản <span className="text-[#e3b341]">bán được.</span></>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[[money(s.revenueVnd),"Doanh thu qua nền tảng","#e3b341"],[money(s.revenue30dVnd),"30 ngày gần nhất","#3fb950"],[s.ceos,"Solo CEO đang vận hành","#f5f5f6"],[s.venturesLive,"Venture đang LIVE","#f5f5f6"]].map(([v,l,c],i) => (
              <div key={i} className="rounded-2xl border border-[#232326] bg-[#131315] px-4 py-5">
                <div className="text-[clamp(22px,3.4vw,34px)] font-extrabold tabular-nums" style={{ color: c as string }}>{v}</div>
                <div className="mt-1 font-mono text-[10px] tracking-wide text-[#a2a2aa] uppercase">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[14px] text-[#a2a2aa]">Mọi giao dịch đi qua Payments (PayOS + Stripe) → sổ cái doanh thu <b className="text-[#f5f5f6]">xác thực</b>. Venture đủ điều kiện niêm yết <b className="text-[#e3b341]">Sàn M&A</b> với badge doanh thu đã kiểm chứng.</p>
        </Section>

        {/* ECOSYSTEM LIVE */}
        <Section kick="Hệ sinh thái · Đang chạy thật" title={<>Không phải slide — <span className="text-[#3fb950]">đã LIVE.</span></>}>
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {DOMAINS.map(([d,l]) => (
              <a key={d} href={"https://" + d} target="_blank" rel="noopener" className="flex items-center justify-between gap-3 border-b border-dashed border-[#232326] py-2.5 transition hover:border-[#33333a]">
                <span className="font-mono text-[13px] font-semibold text-[#f5f5f6]">{d}</span>
                <span className="text-[13px] text-[#a2a2aa]">{l}</span>
              </a>
            ))}
          </div>
        </Section>

        {/* PRICING */}
        <Section kick="Gói cước" title={<>Minh bạch, <span className="text-[#e3b341]">mở rộng theo bạn.</span></>}>
          <div className="grid gap-3 md:grid-cols-3">
            {PLANS.map(([n,p,d,feat]) => (
              <div key={n as string} className={"flex flex-col rounded-2xl border p-6 " + (feat ? "border-[#e3b34155] bg-gradient-to-b from-[#e3b3410d] to-[#131315]" : "border-[#232326] bg-[#131315]")}>
                <div className="font-mono text-[11px] tracking-[.14em] text-[#a2a2aa] uppercase">{n}{feat ? " · phổ biến" : ""}</div>
                <div className="mt-2.5 text-[28px] font-extrabold">{p}<span className="text-[14px] font-normal text-[#a2a2aa]">/tháng</span></div>
                <p className="mt-2 text-[13px] text-[#a2a2aa]">{d}</p>
                <a href={WORKSPACE + "/goi-cuoc"} className={"mt-5 rounded-lg py-2.5 text-center text-[14px] font-bold transition " + (feat ? "bg-[#f5f5f6] text-[#0b0b0c] hover:opacity-90" : "border border-[#33333a] text-[#f5f5f6] hover:border-[#f5f5f6]")}>Chọn gói</a>
              </div>
            ))}
          </div>
        </Section>

        {/* FINAL CTA */}
        <section className="my-16 rounded-3xl border border-[#232326] bg-gradient-to-b from-[#131315] to-[#0b0b0c] px-6 py-16 text-center">
          <h2 className="text-[clamp(28px,4.5vw,48px)] font-extrabold tracking-[-.02em]">Biến <span className="text-[#e3b341]">chính bạn</span> thành một doanh nghiệp.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] text-[#a2a2aa]">Bắt đầu miễn phí. Đội AI + {s.platforms} nền tảng đã sẵn sàng cho ý tưởng đầu tiên của bạn.</p>
          <a href={WORKSPACE} className="mt-7 inline-block rounded-xl bg-[#f5f5f6] px-7 py-3.5 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace ngay →</a>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1a1a1d] px-[6vw] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo />
          <p className="font-mono text-[11px] tracking-wide text-[#6b6b73]">© SoloCEO · RAI Holdings — Hệ điều hành cho doanh nghiệp một người · 2026</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ kick, title, sub, children }: { kick: React.ReactNode; title: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#1a1a1d] py-16">
      <div className="mb-3 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase">
        <span className="h-px w-5 bg-[#e3b341]" /> {kick}
      </div>
      <h2 className="max-w-3xl text-[clamp(24px,3.6vw,40px)] leading-tight font-extrabold tracking-[-.02em]">{title}</h2>
      {sub && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#a2a2aa]">{sub}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}
