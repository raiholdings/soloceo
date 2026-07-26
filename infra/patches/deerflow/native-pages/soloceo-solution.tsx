"use client";
import { SiteHeader } from "@/components/landing/soloceo-nav";
// Bộ trang giải pháp public /giai-phap/<slug> (kiểu Manus) — mỗi nền tảng cộng đồng 1
// trang marketing riêng, brand SoloCEO (đen+xanh+gold+mono). Đọc slug từ đường dẫn.
import { usePathname } from "next/navigation";

const WORKSPACE = "/workspace";

export type Sol = {
  slug: string; icon: string; name: string; tagline: string; lead: string;
  route: string; features: [string, string][]; cases: string[];
  ext?: string; // nếu có: nền tảng chạy trên domain riêng (mở tab mới)
};

export const SOLUTIONS: Record<string, Sol> = {
  crm: {
    slug: "crm", icon: "📊", name: "CRM", tagline: "Biến mọi liên hệ thành doanh thu.",
    lead: "Quản lý toàn bộ khách hàng, lead, cơ hội, báo giá và hoá đơn trong một nơi — trợ lý AI tự nhập liệu và nhắc chăm sóc đúng lúc.",
    route: "/crm",
    features: [["Khách hàng & Lead","Hồ sơ 360°, phân nhóm, chấm điểm tự động."],["Cơ hội & Pipeline","Theo dõi deal qua từng giai đoạn, dự báo doanh số."],["Báo giá & Hoá đơn","Tạo báo giá, hoá đơn, thu tiền — nối cổng thanh toán."],["Nhắc chăm sóc AI","Trợ lý AI tự tóm tắt hội thoại và nhắc việc theo lịch."]],
    cases: ["Dịch vụ tư vấn 1 người","Spa / phòng khám / agency","Môi giới bất động sản"],
  },
  chat: {
    slug: "chat", icon: "💬", name: "Chat đa kênh", tagline: "Chăm sóc khách 24/7, một hộp thư duy nhất.",
    lead: "Gom mọi kênh liên hệ (web, mạng xã hội, Zalo) về một hộp thư, thêm chatbot AI trả lời tự động và live chat trên website của bạn.",
    route: "/chat",
    features: [["Hộp thư hợp nhất","Web chat, email, mạng xã hội — trả lời một chỗ."],["Chatbot AI","Bot trả lời tự động, bàn giao cho người khi cần."],["Live chat website","Nhúng khung chat lên trang bán hàng của bạn."],["Báo cáo & SLA","Đo thời gian phản hồi, mức hài lòng khách."]],
    cases: ["Cửa hàng online","Dịch vụ số / SaaS","Tổng đài CSKH tinh gọn"],
  },
  "dao-tao": {
    slug: "dao-tao", icon: "🎓", name: "Đào tạo", tagline: "Biến chuyên môn thành khoá học bán được.",
    lead: "Học viện online của riêng bạn: tạo khoá học, bài giảng, quiz, cấp chứng chỉ mang thương hiệu SoloCEO và bán thu học phí.",
    route: "/dao-tao",
    features: [["Khoá học & chương","Bài giảng video/tài liệu, lộ trình học rõ ràng."],["Quiz & chứng chỉ","Kiểm tra, chấm điểm, cấp chứng chỉ branded."],["Bán khoá học","Thu học phí, gói membership, mã giảm giá."],["Theo dõi học viên","Tiến độ, hoàn thành, tương tác của từng học viên."]],
    cases: ["Chuyên gia / coach","Trung tâm đào tạo nhỏ","Bán khoá học kỹ năng"],
  },
  "cong-dong": {
    slug: "cong-dong", icon: "👥", name: "Cộng đồng", tagline: "Mạng xã hội của riêng thương hiệu bạn.",
    lead: "Xây cộng đồng khách hàng với feed, bài viết, nhóm, hồ sơ và nhắn tin — giữ chân người dùng trong không gian bạn sở hữu.",
    route: "/cong-dong",
    features: [["Feed & bài viết","Đăng bài, ảnh, video; tương tác thích/bình luận."],["Hồ sơ & kết nối","Trang cá nhân, theo dõi, kết bạn, nhắn tin."],["Nhóm & sự kiện","Tạo nhóm chủ đề, sự kiện, thông báo."],["Thương hiệu của bạn","Tên miền, logo, giao diện theo brand riêng."]],
    cases: ["Cộng đồng thành viên trả phí","Fanbase / khách hàng thân thiết","Mạng nội bộ tổ chức"],
  },
  video: {
    slug: "video", icon: "🎬", name: "Video", tagline: "Nền tảng video của riêng bạn.",
    lead: "Đăng tải, tổ chức và phát video theo kênh riêng — cho khoá học, marketing hay giải trí, không phụ thuộc nền tảng bên thứ ba.",
    route: "/video",
    features: [["Kênh & danh sách phát","Tổ chức video theo kênh, playlist, chủ đề."],["Phát mượt","Trình phát tối ưu, chất lượng thích ứng."],["Tương tác","Thích, bình luận, đăng ký kênh."],["Kiếm tiền","Gắn khoá học, membership, quảng cáo."]],
    cases: ["Kênh nội dung / creator","Khoá học video","Thư viện video sản phẩm"],
  },
  "nhom-chat": {
    slug: "nhom-chat", icon: "💭", name: "Nhóm chat", tagline: "Nơi khách hàng của bạn trò chuyện.",
    lead: "Tạo các nhóm chat và hội nhóm theo chủ đề để khách hàng thảo luận, hỏi đáp và gắn kết quanh sản phẩm của bạn.",
    route: "/nhom-chat",
    features: [["Nhóm theo chủ đề","Mở nhóm công khai/riêng tư, phân quyền."],["Trò chuyện thời gian thực","Nhắn tin, chia sẻ file, phản hồi nhanh."],["Kênh thông báo","Phát thông báo tới cả cộng đồng."],["Kiểm duyệt","Quản trị viên, lọc nội dung, chặn spam."]],
    cases: ["Nhóm khách hàng VIP","Cộng đồng học viên","Hỗ trợ theo nhóm"],
  },
  "hop-video": {
    slug: "hop-video", icon: "📹", name: "Họp video", tagline: "Phòng họp trực tuyến của riêng bạn.",
    lead: "Họp, tư vấn và dạy học trực tuyến chất lượng cao ngay trên thương hiệu của bạn — chia sẻ màn hình, phòng chờ, không giới hạn nền tảng ngoài.",
    route: "/hop-video",
    features: [["Họp HD","Video/âm thanh ổn định, nhiều người tham gia."],["Chia sẻ màn hình","Trình chiếu, dạy học, demo sản phẩm."],["Phòng theo tên bạn","Link họp trên tên miền & thương hiệu riêng."],["Bảo mật","Phòng chờ, mật khẩu, kiểm soát người vào."]],
    cases: ["Tư vấn 1-1 / bán hàng","Lớp học trực tuyến","Họp nội bộ nhóm nhỏ"],
  },
  aff: {
    slug: "aff", icon: "🤝", name: "Affiliate", tagline: "Đội ngũ bán hàng không cần trả lương.",
    lead: "Xây chương trình tiếp thị liên kết đa merchant: cộng tác viên quảng bá, bạn chỉ trả hoa hồng khi có đơn — theo dõi minh bạch từng click và giao dịch.",
    route: "/aff",
    features: [["Chương trình hoa hồng","Thiết lập tỷ lệ, cấp bậc, thưởng theo đơn."],["Link & mã theo dõi","Mỗi cộng tác viên một link/mã riêng, đo chính xác."],["Bảng điều khiển CTV","Cộng tác viên tự xem hiệu suất & thu nhập."],["Đối soát & chi trả","Thống kê đơn, duyệt hoa hồng, chi trả rõ ràng."]],
    cases: ["Bán sản phẩm số / khoá học","Cửa hàng TMĐT","Giới thiệu dịch vụ"],
  },
  "tin-tuc": {
    slug: "tin-tuc", icon: "📰", name: "Tin tức", tagline: "Nền tảng media & tin tức của riêng bạn.",
    lead: "Xuất bản tin tức, bài viết và nội dung lan truyền trên một nền tảng media mang thương hiệu của bạn — thu hút độc giả, xây kênh truyền thông riêng, không phụ thuộc mạng xã hội bên thứ ba.",
    route: "", ext: "https://news.soloceo.vn",
    features: [["Xuất bản bài viết","Soạn, đăng và quản lý tin bài với trình biên tập trực quan."],["Lan truyền mạng xã hội","Tối ưu chia sẻ, phản ứng, bình luận để nội dung lan xa."],["Chuyên mục & xu hướng","Sắp xếp theo chủ đề, đẩy bài nổi bật và tin nóng."],["Thương hiệu của bạn","Tên miền, logo, giao diện theo brand riêng."]],
    cases: ["Trang tin / tạp chí số","Kênh truyền thông thương hiệu","Blog nội dung chuyên sâu"],
  },
};

export function SoloceoSolution({ slug: propSlug }: { slug?: string } = {}) {
  const path = usePathname();
  const slug = propSlug ?? path.split("/").filter(Boolean).pop() ?? "";
  const s = SOLUTIONS[slug];

  if (!s) {
    return <SolutionsIndex />;
  }
  const others = Object.values(SOLUTIONS).filter((x) => x.slug !== s.slug).slice(0, 4);
  const primaryHref = s.ext ?? (WORKSPACE + s.route);
  const extProps = s.ext ? { target: "_blank", rel: "noopener" } : {};
  const primaryLabel = s.ext ? `Mở nền tảng ${s.name} →` : "Dùng ngay trong workspace →";
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw]">
        {/* HERO */}
        <section className="py-20 md:py-24">
          <a href="/giai-phap" className="mb-6 inline-flex items-center gap-1 font-mono text-[11px] tracking-[.14em] text-[#a2a2aa] uppercase hover:text-[#f5f5f6]">← Giải pháp</a>
          <div className="text-4xl">{s.icon}</div>
          <h1 className="mt-4 text-[clamp(34px,6vw,64px)] leading-[1.04] font-extrabold tracking-[-.025em]">{s.name}<br /><span className="text-[#e3b341]">{s.tagline}</span></h1>
          <p className="mt-5 max-w-2xl text-[clamp(16px,2vw,20px)] leading-relaxed text-[#a2a2aa]">{s.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={primaryHref} {...extProps} className="rounded-xl bg-[#f5f5f6] px-6 py-3 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">{primaryLabel}</a>
            <a href={WORKSPACE} className="rounded-xl border border-[#33333a] px-6 py-3 text-[15px] font-semibold transition hover:border-[#f5f5f6]">Bắt đầu miễn phí</a>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t border-[#1a1a1d] py-16">
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Tính năng chính</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.features.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                <h3 className="text-[16px] font-bold">{t}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#a2a2aa]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* USE CASES */}
        <section className="border-t border-[#1a1a1d] py-16">
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Phù hợp với</div>
          <div className="flex flex-wrap gap-2">
            {s.cases.map((c) => <span key={c} className="rounded-lg border border-[#232326] bg-[#1a1a1d] px-3.5 py-2 text-[13px] text-[#a2a2aa]">{c}</span>)}
          </div>
        </section>

        {/* PART OF ECOSYSTEM */}
        <section className="border-t border-[#1a1a1d] py-16">
          <div className="mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Nằm trong hệ điều hành SoloCEO</div>
          <p className="max-w-2xl text-[15px] text-[#a2a2aa]">{s.name} đi kèm sẵn mọi tài khoản SoloCEO, đăng nhập một lần cùng Đội AI và {"110"} nền tảng khác. Khám phá các giải pháp còn lại:</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {others.map((o) => (
              <a key={o.slug} href={"/giai-phap/" + o.slug} className="group rounded-2xl border border-[#232326] bg-[#131315] p-4 transition hover:border-[#33333a]">
                <div className="text-2xl">{o.icon}</div>
                <div className="mt-2 text-[15px] font-bold">{o.name}</div>
                <div className="mt-0.5 text-[12px] text-[#a2a2aa]">{o.tagline}</div>
              </a>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="my-16 rounded-3xl border border-[#232326] bg-gradient-to-b from-[#131315] to-[#0b0b0c] px-6 py-14 text-center">
          <h2 className="text-[clamp(26px,4vw,42px)] font-extrabold tracking-[-.02em]">Sẵn sàng dùng {s.name}?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-[#a2a2aa]">Đăng ký miễn phí — có sẵn ngay trong workspace của bạn.</p>
          <a href={primaryHref} {...extProps} className="mt-6 inline-block rounded-xl bg-[#f5f5f6] px-7 py-3.5 text-[15px] font-bold text-[#0b0b0c] transition hover:opacity-90">Mở {s.name} →</a>
        </section>
      </main>
      <Foot />
    </div>
  );
}

export function SolutionsIndex() {
  const all = Object.values(SOLUTIONS);
  return (
    <div className="min-h-screen w-full bg-[#0b0b0c] font-sans text-[#f5f5f6] [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-[6vw] py-20">
        <div className="mb-3 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[.2em] text-[#e3b341] uppercase"><span className="h-px w-5 bg-[#e3b341]" /> Giải pháp</div>
        <h1 className="max-w-3xl text-[clamp(30px,5vw,56px)] leading-tight font-extrabold tracking-[-.025em]">9 nền tảng vận hành <span className="text-[#e3b341]">đi kèm mọi Solo CEO.</span></h1>
        <p className="mt-4 max-w-2xl text-[17px] text-[#a2a2aa]">Mỗi tài khoản SoloCEO có sẵn trọn bộ nền tảng cộng đồng — đăng nhập một lần, dùng ngay trong workspace.</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {all.map((o) => (
            <a key={o.slug} href={"/giai-phap/" + o.slug} className="group rounded-2xl border border-[#232326] bg-[#131315] p-5 transition hover:border-[#33333a]">
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
