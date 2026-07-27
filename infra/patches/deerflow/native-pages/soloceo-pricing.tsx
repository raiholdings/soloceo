"use client";
import { SiteHeader } from "@/components/landing/soloceo-nav";
// Trang Gói cước public /goi-cuoc — giới thiệu 3 gói nền tảng, brand SoloCEO.
// CTA đăng ký → /workspace/goi-cuoc (checkout PayOS thật trong workspace).

const WORKSPACE = "/workspace";
const CHECKOUT = "/workspace/goi-cuoc";

type Plan = {
  key: string; name: string; price: string; unit: string; tagline: string;
  hosting: string;
  highlight?: boolean; cta: string; points: string[];
};

// Gói Workspace — mỗi gói KÈM MỘT HOSTING riêng, mô hình như Google Workspace: trả một
// khoản hằng tháng là có cả hạ tầng lẫn bộ phần mềm. Khác ở chỗ Google cho công cụ văn
// phòng, còn đây cho một chỗ đứng thật trên Internet (tên miền riêng) và bộ nền tảng để
// vận hành doanh nghiệp.
//
// Vì sao hosting nằm TRONG gói chứ không bán riêng: một Solo CEO mua CRM về mà không có
// chỗ chạy thì phần mềm đó vô dụng. Bán riêng hai thứ là đẩy phần khó nhất về phía người
// ít khả năng làm nhất.
//
// Cấu hình hosting lấy từ nhu cầu RAM THẬT của các nền tảng đang chạy (Perfex ~600MB,
// Support Board ~500MB, Academy ~900MB) — số subdomain cho phép suy từ đó, không phải con
// số cho đẹp quảng cáo.
const PLANS: Plan[] = [
  {
    key: "starter", name: "Khởi đầu", price: "3.000.000đ", unit: "/tháng",
    tagline: "Đủ để một người chạy thật một doanh nghiệp.",
    hosting: "2 vCPU · 4 GB RAM · 60 GB NVMe",
    cta: "Bắt đầu với Khởi đầu",
    points: [
      "Hosting riêng + gắn tên miền của bạn",
      "3 subdomain cho nền tảng bạn chọn",
      "Triển khai 1 ý tưởng thành doanh nghiệp thật",
      "Dùng miễn phí: CRM · Chat đa kênh · Cộng đồng",
      "Đội AI + 8 nền tảng lõi",
      "500K token-credit AI / tháng · phí giao dịch 3%",
    ],
  },
  {
    key: "growth", name: "Tăng trưởng", price: "5.000.000đ", unit: "/tháng",
    tagline: "Nhiều ý tưởng chạy song song, thêm nền tảng.", highlight: true,
    hosting: "4 vCPU · 8 GB RAM · 120 GB NVMe",
    cta: "Chọn gói Tăng trưởng",
    points: [
      "Mọi thứ ở Khởi đầu, hosting gấp đôi",
      "8 subdomain · triển khai 3 ý tưởng song song",
      "Thêm miễn phí: Đào tạo · Video · Nhóm chat · Họp video",
      "AI Studio riêng + tự động hoá quy trình",
      "2 triệu token-credit AI / tháng · phí giao dịch 2%",
      "Niêm yết Sàn M&A (phí thành công 8%)",
    ],
  },
  {
    key: "scale", name: "Bứt phá", price: "9.000.000đ", unit: "/tháng",
    tagline: "Nhiều thương hiệu, subdomain không giới hạn.",
    hosting: "8 vCPU · 16 GB RAM · 240 GB NVMe",
    cta: "Chọn gói Bứt phá",
    points: [
      "3 website chính riêng tên miền · subdomain không giới hạn",
      "Triển khai không giới hạn số ý tưởng",
      "Toàn bộ 9 nền tảng cộng đồng + ưu tiên tài nguyên",
      "6 triệu token-credit AI (mua thêm được)",
      "Phí giao dịch 1,5% · Sàn M&A phí thành công 5%",
      "Hỗ trợ trực tiếp từ kiến trúc sư đề án",
    ],
  },
];

// So sánh chi tiết
const COMPARE: [string, string, string, string][] = [
  ["Hosting kèm theo", "2vCPU·4GB·60GB", "4vCPU·8GB·120GB", "8vCPU·16GB·240GB"],
  ["Website chính (tên miền riêng)", "1", "1", "3"],
  ["Subdomain cho nền tảng", "3", "8", "không giới hạn"],
  ["Ý tưởng triển khai", "1", "3", "không giới hạn"],
  ["Nền tảng cộng đồng miễn phí", "3", "7", "toàn bộ 9"],
  ["Website + CRM", "✓", "✓", "✓"],
  ["Đội AI + 8 nền tảng lõi", "✓", "✓", "✓"],
  ["AI Studio (chatbot/RAG)", "—", "✓", "✓"],
  ["Tự động hoá quy trình", "—", "✓", "✓"],
  ["Token-credit AI / tháng", "500K", "2 triệu", "6 triệu (+mua thêm)"],
  ["Phí giao dịch Payments", "3%", "2%", "1,5%"],
  ["Niêm yết Sàn M&A", "—", "phí 8%", "phí 5%"],
  ["Ưu tiên tài nguyên", "—", "—", "✓"],
];

const FAQ: [string, string][] = [
  ["Token-credit AI là gì?", "Là ngân sách gọi AI mỗi tháng đi kèm gói. Mọi lời gọi AI đi qua cổng LiteLLM và được đo chi phí minh bạch; hết credit có thể mua thêm."],
  ["Thanh toán thế nào?", "Đăng ký và nâng gói trực tiếp bằng PayOS (quét mã QR chuyển khoản VN) ngay trong workspace. Kích hoạt tức thì sau khi thanh toán."],
  ["Có được đổi gói không?", "Có. Bạn có thể nâng hoặc hạ gói bất cứ lúc nào; quyền lợi áp dụng ngay theo gói mới."],
  ["Phí giao dịch tính trên gì?", "Là phần trăm nền tảng thu trên mỗi giao dịch bán hàng của venture đi qua module Payments — nguồn dữ liệu cho badge \"doanh thu đã xác thực\"."],
];

export function SoloceoPricing() {
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw]">
        {/* HERO */}
        <section className="py-16 text-center md:py-20">
          <div className="mb-4 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Gói cước</div>
          <h1 className="mx-auto max-w-3xl text-[clamp(30px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-.025em]">Một mức phí, <span className="text-[#e3b341]">cả một công ty vận hành bằng AI.</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-[#a2a2aa]">Đội AI, 8 nền tảng lõi và trọn bộ nền tảng vận hành đi kèm mọi gói. Không phí ẩn — nâng/hạ gói bất cứ lúc nào.</p>
        </section>

        {/* PLAN CARDS */}
        <section className="grid gap-4 pb-8 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.key} className={"relative flex flex-col rounded-3xl border p-6 " + (p.highlight ? "border-[#e3b341] bg-[#15140f]" : "border-[#232326] bg-[#131315]")}>
              {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-[#e3b341] px-3 py-1 font-mono text-[10px] font-bold tracking-wide text-[#0b0b0c] uppercase">Phổ biến nhất</span>}
              <div className="text-[15px] font-bold">{p.name}</div>
              <div className="mt-2 flex items-end gap-1"><span className="text-[32px] font-extrabold tracking-[-.02em]">{p.price}</span><span className="mb-1.5 text-[13px] text-[#a2a2aa]">{p.unit}</span></div>
              {/* Cấu hình hosting đặt NGAY dưới giá: đây là thứ phân biệt ba gói rõ nhất
                  và cũng là thứ người mua so sánh đầu tiên. Giấu xuống cuối thẻ thì họ
                  tưởng ba gói chỉ khác nhau ở số tính năng. */}
              <div className="mt-2.5 rounded-lg border border-[#3fb950]/30 bg-[#3fb950]/8 px-3 py-2 font-mono text-[11.5px] text-[#3fb950]">
                Hosting kèm theo · {p.hosting}
              </div>
              <p className="mt-1 text-[13px] text-[#a2a2aa]">{p.tagline}</p>
              <a href={CHECKOUT} className={"mt-5 rounded-xl px-5 py-3 text-center text-[14px] font-bold transition " + (p.highlight ? "bg-[#e3b341] text-[#0b0b0c] hover:opacity-90" : "bg-[#f5f5f6] text-[#0b0b0c] hover:opacity-90")}>{p.cta}</a>
              <ul className="mt-5 space-y-2.5">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-[13px] leading-snug text-[#d4d4d8]"><span className="mt-0.5 text-[#3fb950]">✓</span>{pt}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* COMPARE TABLE */}
        <section className="border-t border-[#1a1a1d] py-14">
          <h2 className="mb-6 text-[22px] font-bold">So sánh chi tiết</h2>
          <div className="overflow-x-auto rounded-2xl border border-[#232326]">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="bg-[#131315]">
                  <th className="px-4 py-3 text-[12px] font-mono tracking-wide text-[#6b6b73] uppercase">Tính năng</th>
                  <th className="px-4 py-3 text-[13px] font-bold">Starter</th>
                  <th className="px-4 py-3 text-[13px] font-bold text-[#e3b341]">Growth</th>
                  <th className="px-4 py-3 text-[13px] font-bold">Scale</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([f, a, b, c], i) => (
                  <tr key={f} className={i % 2 ? "bg-[#0e0e10]" : "bg-[#0b0b0c]"}>
                    <td className="px-4 py-3 text-[13px] text-[#a2a2aa]">{f}</td>
                    <td className="px-4 py-3 text-[13px]">{a}</td>
                    <td className="px-4 py-3 text-[13px] text-[#f5f5f6]">{b}</td>
                    <td className="px-4 py-3 text-[13px]">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-[#1a1a1d] py-14">
          <h2 className="mb-6 text-[22px] font-bold">Câu hỏi thường gặp</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                <h3 className="text-[14.5px] font-bold">{q}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#a2a2aa]">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="my-14 rounded-3xl border border-[#232326] bg-gradient-to-b from-[#131315] to-[#0b0b0c] px-6 py-14 text-center">
          <h2 className="text-[clamp(26px,4vw,42px)] font-extrabold tracking-[-.02em]">Bắt đầu miễn phí hôm nay</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#a2a2aa]">Tạo tài khoản, khám phá workspace, nâng gói khi bạn sẵn sàng.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={WORKSPACE} className="rounded-xl bg-[#f5f5f6] px-7 py-3.5 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace →</a>
            <a href={CHECKOUT} className="rounded-xl border border-[#33333a] px-7 py-3.5 text-[15px] font-semibold transition hover:border-[#f5f5f6]">Đăng ký gói cước</a>
          </div>
        </section>
      </main>
      <Foot />
    </div>
  );
}

function Foot() {
  return (
    <footer className="border-t border-[#1a1a1d] px-[6vw] py-8 text-center">
      <p className="font-mono text-[11px] tracking-wide text-[#6b6b73]">© SoloCEO — Hệ điều hành cho doanh nghiệp một người · 2026</p>
    </footer>
  );
}
