"use client";
import { SiteHeader } from "@/components/landing/soloceo-nav";
// Bộ trang TÍNH NĂNG public /tinh-nang/<slug> (kiểu Manus) — mỗi nền tảng LÕI (lớp n0,
// engine AI + hạ tầng vận hành an toàn) 1 trang giới thiệu riêng, brand SoloCEO
// (đen+xanh+gold+mono). Đọc slug từ đường dẫn. Song song với /giai-phap.
import { usePathname } from "next/navigation";

const WORKSPACE = "/workspace";

export type Feat = {
  slug: string; icon: string; name: string; tagline: string; lead: string;
  route: string; features: [string, string][]; cases: string[];
};

// 8 nền tảng lõi (N0–N7) — trình bày dưới dạng NĂNG LỰC của Đội AI SoloCEO.
export const FEATURES: Record<string, Feat> = {
  "doi-ai": {
    slug: "doi-ai", icon: "🤖", name: "Đội AI tự hành", tagline: "Nhân sự AI làm việc thay bạn.",
    lead: "Bộ máy agent tự lập kế hoạch và thực thi nhiều bước để vận hành doanh nghiệp — không chỉ trả lời, mà thực sự làm việc: gọi công cụ, thao tác nền tảng, hoàn thành mục tiêu.",
    route: "",
    features: [["Lập kế hoạch đa bước","Tự chia mục tiêu lớn thành các bước và thực hiện tuần tự đến khi xong."],["Gọi công cụ thật","Duyệt web, đọc/ghi file, gọi API và thao tác trực tiếp trên nền tảng của bạn."],["6 trợ lý chuyên môn","Điều hành, Kinh doanh, Marketing, Nội dung, Vận hành, Kế toán — phối hợp như một đội."],["Human-in-the-loop","Việc rủi ro (chi tiền, gửi hàng loạt, xoá dữ liệu) dừng lại chờ bạn phê duyệt."]],
    cases: ["Vận hành doanh nghiệp một người","Tự động hoá công việc lặp lại","Trợ lý điều hành 24/7"],
  },
  sandbox: {
    slug: "sandbox", icon: "🧪", name: "Sandbox an toàn", tagline: "Nơi AI chạy code mà không chạm dữ liệu thật.",
    lead: "Mọi tác vụ AI cần thực thi — chạy code, xử lý dữ liệu, mở trình duyệt — đều diễn ra trong môi trường cô lập, không ảnh hưởng hệ thống chính và tự dọn sạch sau khi xong.",
    route: "",
    features: [["Môi trường cô lập","Mỗi tác vụ chạy trong hộp cát riêng, không rò rỉ ra ngoài."],["Chạy code & shell","AI thực thi script, xử lý dữ liệu, dựng file an toàn theo yêu cầu."],["Trình duyệt ảo","Mở web, thu thập dữ liệu trong không gian tách biệt khỏi máy chủ."],["Tự dọn sau khi xong","Không để lại dấu vết, không ảnh hưởng dữ liệu vận hành của bạn."]],
    cases: ["Xử lý dữ liệu nhạy cảm","Tự động hoá cần chạy code","Thử nghiệm an toàn"],
  },
  "quy-trinh": {
    slug: "quy-trinh", icon: "🧩", name: "Canvas quy trình", tagline: "Vẽ quy trình, AI chạy theo.",
    lead: "Dựng luồng công việc tự động bằng cách kéo-thả các nút trên canvas trực quan — nối CRM, chat, thanh toán, email thành một quy trình chạy 24/7 không cần code.",
    route: "",
    features: [["Kéo-thả trực quan","Dựng luồng công việc bằng các nút nối nhau, không cần lập trình."],["Kết nối nền tảng","Nối CRM, chat đa kênh, thanh toán, email vào cùng một luồng."],["Kích hoạt tự động","Chạy theo lịch, theo sự kiện, hoặc khi Đội AI quyết định."],["Lưu & tái dùng","Đóng gói quy trình thành mẫu dùng lại cho nhiều dự án."]],
    cases: ["Phễu bán hàng tự động","Chăm sóc khách theo kịch bản","Đồng bộ dữ liệu giữa nền tảng"],
  },
  "trinh-duyet": {
    slug: "trinh-duyet", icon: "🖱️", name: "Điều khiển trình duyệt AI", tagline: "AI nhìn màn hình và thao tác như người.",
    lead: "Với thị giác AI, hệ thống hiểu giao diện web bằng hình ảnh và thao tác thay bạn — điền form, bấm nút, lấy dữ liệu — kể cả trên những cổng không có API.",
    route: "",
    features: [["Thị giác AI","Hiểu giao diện web bằng hình ảnh, không phụ thuộc API sẵn có."],["Thao tác thay bạn","Điền form, bấm nút, trích dữ liệu trên trang web thật."],["Tự động lặp lại","Làm hàng loạt tác vụ web nhàm chán thay cho bạn."],["An toàn có ranh giới","Cấm tự vượt CAPTCHA và ký số — luôn có kiểm soát của con người."]],
    cases: ["Nhập liệu web hàng loạt","Thu thập thông tin thị trường","Thao tác cổng không có API"],
  },
  "ky-nang": {
    slug: "ky-nang", icon: "🛠️", name: "Kỹ năng & Đội agent", tagline: "Trang bị kỹ năng chuyên biệt cho AI.",
    lead: "Không chỉ một trợ lý — bạn có cả một đội. Cài thêm kỹ năng chuyên môn và tách việc lớn cho nhiều sub-agent làm song song, mở rộng năng lực khi doanh nghiệp lớn lên.",
    route: "",
    features: [["Thư viện kỹ năng","Cài thêm kỹ năng: viết bài, dựng phễu, tạo chiến dịch, phân tích…"],["Sub-agent chuyên trách","Tách việc lớn cho nhiều agent làm song song, nhanh hơn."],["Trợ lý mặc định","Bộ trợ lý dựng sẵn theo mô hình kinh doanh của bạn."],["Mở rộng không giới hạn","Thêm kỹ năng mới bất cứ khi nào nhu cầu phát sinh."]],
    cases: ["Đội marketing AI","Sản xuất nội dung quy mô","Chuyên môn hoá theo phòng ban"],
  },
  "bao-mat-du-lieu": {
    slug: "bao-mat-du-lieu", icon: "🛡️", name: "Chống rò rỉ dữ liệu", tagline: "Dữ liệu của bạn không rời khỏi tầm kiểm soát.",
    lead: "Lớp bảo vệ dữ liệu (DLP) tự phát hiện và che thông tin nhạy cảm trước khi bất kỳ lời gọi AI nào đi ra ngoài — bật sẵn mặc định cho mọi tác vụ.",
    route: "",
    features: [["Lọc dữ liệu nhạy cảm","Tự phát hiện & che số CCCD, thẻ, mật khẩu trước khi gửi đi."],["Chính sách DLP","Đặt quy tắc dữ liệu nào được ra ngoài, dữ liệu nào phải giữ lại."],["Nhật ký kiểm toán","Ghi lại mọi lần dữ liệu đi qua để đối soát và tuân thủ."],["Bảo vệ mặc định","Bật sẵn cho mọi lời gọi AI, không cần cấu hình thủ công."]],
    cases: ["Xử lý dữ liệu cá nhân","Tuân thủ Nghị định 13/2023","Bảo mật thông tin khách hàng"],
  },
  "doc-tai-lieu": {
    slug: "doc-tai-lieu", icon: "📄", name: "Đọc tài liệu & OCR", tagline: "Biến giấy tờ, ảnh chụp thành dữ liệu.",
    lead: "Trích xuất chính xác nội dung từ hoá đơn, hợp đồng, CCCD, bảng biểu — kể cả ảnh chụp và chữ Việt có dấu — rồi đưa thẳng vào CRM, kế toán hay quy trình của bạn.",
    route: "",
    features: [["Đọc mọi tài liệu","Hoá đơn, hợp đồng, CCCD, bảng biểu — trích xuất đúng trường dữ liệu."],["OCR tiếng Việt","Nhận dạng chữ Việt có dấu và văn bản viết tay cơ bản."],["Cấu trúc hoá","Chuyển tài liệu lộn xộn thành dữ liệu có trường rõ ràng."],["Nối vào quy trình","Đưa dữ liệu đọc được thẳng vào CRM, kế toán, quy trình."]],
    cases: ["Số hoá hoá đơn / chứng từ","Xác minh giấy tờ khách (KYC)","Nhập liệu từ ảnh chụp"],
  },
  "kiem-soat-mang": {
    slug: "kiem-soat-mang", icon: "🌐", name: "Kiểm soát mạng", tagline: "Kiểm soát mọi kết nối AI ra internet.",
    lead: "Lớp kiểm soát egress đảm bảo Đội AI chỉ truy cập những đích được phép — chặn domain rủi ro, giám sát lưu lượng và ngăn agent bị lợi dụng gọi ra ngoài trái phép.",
    route: "",
    features: [["Kiểm soát egress","Chỉ cho AI truy cập đúng các đích đến được cho phép."],["Danh sách trắng/đen","Chặn domain rủi ro, mở đúng dịch vụ thực sự cần thiết."],["Giám sát lưu lượng","Theo dõi AI kết nối đi đâu, khi nào, làm gì."],["Chống lạm dụng","Ngăn agent bị lợi dụng gọi ra ngoài ngoài phạm vi cho phép."]],
    cases: ["Bảo mật hạ tầng AI","Tuân thủ chính sách nội bộ","Kiểm soát chi phí & rủi ro mạng"],
  },
};

export function SoloceoFeature({ slug: propSlug }: { slug?: string } = {}) {
  const path = usePathname();
  const slug = propSlug ?? path.split("/").filter(Boolean).pop() ?? "";
  const f = FEATURES[slug];

  if (!f) {
    return <FeaturesIndex />;
  }
  const others = Object.values(FEATURES).filter((x) => x.slug !== f.slug).slice(0, 4);
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw]">
        {/* HERO */}
        <section className="py-20 md:py-24">
          <a href="/tinh-nang" className="mb-6 inline-flex items-center gap-1 font-mono text-[11px] tracking-[.14em] text-[#a2a2aa] uppercase hover:text-[#f5f5f6]">← Tính năng</a>
          <div className="text-4xl">{f.icon}</div>
          <h1 className="mt-4 text-[clamp(34px,6vw,64px)] leading-[1.04] font-extrabold tracking-[-.025em]">{f.name}<br /><span className="text-[#e3b341]">{f.tagline}</span></h1>
          <p className="mt-5 max-w-2xl text-[clamp(16px,2vw,20px)] leading-relaxed text-[#a2a2aa]">{f.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={WORKSPACE + f.route} className="rounded-xl bg-[#f5f5f6] px-6 py-3 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Trải nghiệm trong workspace →</a>
            <a href="/tinh-nang" className="rounded-xl border border-[#33333a] px-6 py-3 text-[15px] font-semibold transition hover:border-[#f5f5f6]">Xem tất cả tính năng</a>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t border-[#1a1a1d] py-16">
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Bên trong tính năng</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {f.features.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                <h3 className="text-[16px] font-bold">{t}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#a2a2aa]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASES */}
        <section className="border-t border-[#1a1a1d] py-16">
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Hữu ích khi</div>
          <div className="flex flex-wrap gap-2">
            {f.cases.map((c) => <span key={c} className="rounded-lg border border-[#232326] bg-[#1a1a1d] px-3.5 py-2 text-[13px] text-[#a2a2aa]">{c}</span>)}
          </div>
        </section>

        {/* PART OF ENGINE */}
        <section className="border-t border-[#1a1a1d] py-16">
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> 8 nền tảng lõi vận hành SoloCEO</div>
          <p className="max-w-2xl text-[15px] text-[#a2a2aa]">Tính năng này là một phần của bộ engine AI + hạ tầng vận hành an toàn chạy ngầm dưới mọi tài khoản SoloCEO. Khám phá các năng lực lõi còn lại:</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <a key={o.slug} href={"/tinh-nang/" + o.slug} className="group rounded-2xl border border-[#232326] bg-[#131315] p-4 transition hover:border-[#33333a]">
                <div className="text-2xl">{o.icon}</div>
                <div className="mt-2 text-[15px] font-bold">{o.name}</div>
                <div className="mt-0.5 text-[12px] text-[#a2a2aa]">{o.tagline}</div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="my-16 rounded-3xl border border-[#232326] bg-gradient-to-b from-[#131315] to-[#0b0b0c] px-6 py-14 text-center">
          <h2 className="text-[clamp(26px,4vw,42px)] font-extrabold tracking-[-.02em]">Để Đội AI vận hành cùng bạn</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#a2a2aa]">Toàn bộ 8 nền tảng lõi bật sẵn — bắt đầu miễn phí ngay trong workspace của bạn.</p>
          <a href={WORKSPACE} className="mt-6 inline-block rounded-xl bg-[#f5f5f6] px-7 py-3.5 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace →</a>
        </section>
      </main>
      <Foot />
    </div>
  );
}

export function FeaturesIndex() {
  const all = Object.values(FEATURES);
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw] py-20">
        <div className="mb-3 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Tính năng lõi</div>
        <h1 className="max-w-3xl text-[clamp(30px,5vw,56px)] leading-tight font-extrabold tracking-[-.025em]">8 nền tảng lõi <span className="text-[#e3b341]">vận hành doanh nghiệp của bạn.</span></h1>
        <p className="mt-4 max-w-2xl text-[17px] text-[#a2a2aa]">Bộ engine AI và hạ tầng vận hành an toàn chạy ngầm dưới mọi tài khoản SoloCEO — để Đội AI làm việc thật, an toàn và trong tầm kiểm soát của bạn.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {all.map((o) => (
            <a key={o.slug} href={"/tinh-nang/" + o.slug} className="group rounded-2xl border border-[#232326] bg-[#131315] p-5 transition hover:border-[#33333a]">
              <div className="text-2xl">{o.icon}</div>
              <h3 className="mt-3 text-[16px] font-bold">{o.name}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#a2a2aa]">{o.tagline}</p>
              <div className="mt-3 text-[12px] font-semibold text-[#e3b341] opacity-0 transition group-hover:opacity-100">Xem chi tiết →</div>
            </a>
          ))}
        </div>
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
