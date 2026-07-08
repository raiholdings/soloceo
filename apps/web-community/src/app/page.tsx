import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Globe,
  LineChart,
  Rocket,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  Wallet,
  Workflow,
  Zap,
} from "lucide-react";
import { PLANS } from "@soloceo/shared";
import { HeroChat } from "@/components/hero-chat";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

const MODULES = [
  {
    icon: Globe,
    title: "Website & CRM",
    description:
      "Website bán hàng chuẩn SEO + CRM quản lý khách hàng, cài đặt tự động trong 5 phút trên hạ tầng riêng của bạn.",
  },
  {
    icon: Bot,
    title: "AI Studio",
    description:
      "Trợ lý bán hàng trả lời khách 24/7, trợ lý nội dung viết bài đăng — AI riêng, học từ tài liệu của chính bạn.",
  },
  {
    icon: Workflow,
    title: "Automation",
    description:
      "Tự động hóa quy trình lặp lại: lead vào CRM, gửi email chăm sóc, nhắc đơn hàng — không cần biết code.",
  },
  {
    icon: Wallet,
    title: "Thanh toán & Sổ cái",
    description:
      "Nhận tiền qua QR chuyển khoản (PayOS) và thẻ quốc tế (Stripe). Mỗi đồng doanh thu đều được ghi sổ và xác thực.",
  },
  {
    icon: Users,
    title: "Cộng đồng Solo CEO",
    description:
      "Kết nối những người dám đi một mình: chia sẻ kinh nghiệm, tìm đối tác, học từ người đi trước.",
  },
  {
    icon: TrendingUp,
    title: "Sàn M&A",
    description:
      "Doanh nghiệp có sổ sách minh bạch là doanh nghiệp bán được. Niêm yết, định giá và chuyển nhượng ngay trên nền tảng.",
  },
];

const JOURNEY = [
  {
    step: "01",
    icon: Rocket,
    title: "Khởi tạo",
    description:
      "Đăng ký, đặt tên doanh nghiệp, bấm Khởi chạy. Website + CRM + tên miền riêng của bạn sống sau chưa đầy 5 phút.",
  },
  {
    step: "02",
    icon: Zap,
    title: "Vận hành & tăng trưởng",
    description:
      "AI trả lời khách, automation chạy quy trình, tiền về qua payment link. Bạn tập trung vào sản phẩm — hệ thống lo phần còn lại.",
  },
  {
    step: "03",
    icon: Building2,
    title: "Tích lũy giá trị & thoái vốn",
    description:
      "Mọi giao dịch được xác thực tạo thành hồ sơ doanh thu minh bạch. Đến lúc muốn bán, doanh nghiệp của bạn đã có giá trên Sàn M&A.",
  },
];

const AUDIENCES = [
  "Chuyên gia tư vấn muốn đóng gói dịch vụ thành sản phẩm",
  "Người bán hàng online muốn thoát phụ thuộc sàn TMĐT",
  "Freelancer muốn xây thương hiệu và nguồn thu riêng",
  "Chủ quán F&B, môi giới BĐS, giáo viên mở lớp riêng",
  "Người đi làm muốn khởi sự tay trái ít rủi ro",
  "Nhà đầu tư săn mua doanh nghiệp nhỏ có dòng tiền thật",
];

const FAQS = [
  {
    q: "Tôi không biết công nghệ, có dùng được không?",
    a: "Được. Mọi thứ cài đặt tự động — bạn chỉ đặt tên, chọn ngành và bấm Khởi chạy. Nếu dùng được Facebook, bạn dùng được SoloCEO.",
  },
  {
    q: "Dữ liệu và website có thuộc về tôi không?",
    a: "Có. Mỗi doanh nghiệp chạy trên một không gian hạ tầng riêng biệt, tên miền riêng (ten-ban.app.soloceo.vn hoặc tên miền của bạn), dữ liệu tách biệt hoàn toàn với người khác.",
  },
  {
    q: "“Doanh thu đã xác thực” nghĩa là gì?",
    a: "Mọi giao dịch chảy qua cổng thanh toán của nền tảng được ghi vào sổ cái tự động, không sửa tay được. Đây là bằng chứng doanh thu khi bạn niêm yết bán doanh nghiệp trên Sàn M&A.",
  },
  {
    q: "Muốn bán doanh nghiệp thì cần điều kiện gì?",
    a: "Doanh nghiệp hoạt động tối thiểu 90 ngày, có ít nhất 10 giao dịch xác thực và doanh thu 12 tháng dương. Đội ngũ RAI hỗ trợ định giá, kết nối người mua và escrow chuyển nhượng.",
  },
];

export default function HomePage() {
  const plans = [PLANS.STARTER, PLANS.GROWTH, PLANS.SCALE];

  return (
    <main>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden px-6 pb-20 pt-24 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
          <span className="rounded-full border border-surface-border bg-surface px-4 py-1.5 text-sm text-accent-soft">
            🇻🇳 Nền tảng khởi nghiệp một người đầu tiên tại Việt Nam
          </span>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            Nơi doanh nghiệp một người
            <span className="bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-transparent">
              {" "}
              được xây dựng
            </span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[#A0A0B8]">
            Kể ý tưởng của bạn — Lễ tân AI tư vấn và khởi tạo cả không gian
            doanh nghiệp (văn phòng 3D + trợ lý AI + web bán hàng) trong vài
            phút. Khi đến lúc, bán lại doanh nghiệp đó với giá xứng đáng.
          </p>

          {/* Lễ tân AI — chat khởi tạo doanh nghiệp (kiểu manus.im) */}
          <HeroChat />

          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://ai.soloceo.vn" target="_blank" rel="noreferrer">
              <Button size="lg" className="gap-2">
                <Bot className="h-4 w-4" /> Mở SoloCEO AI — trợ lý siêu năng lực
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/danh-ba">
              <Button size="lg" variant="outline">
                Xem doanh nghiệp đang chạy
              </Button>
            </Link>
          </div>
          {/* stats strip */}
          <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ["< 5 phút", "từ đăng ký đến website sống"],
              ["299K/tháng", "chi phí khởi điểm — rẻ hơn 1 nhân sự part-time"],
              ["100%", "doanh thu ghi sổ tự động, sẵn sàng định giá"],
            ].map(([big, small]) => (
              <div
                key={big}
                className="rounded-glass border border-surface-border bg-surface px-6 py-5 backdrop-blur-glass"
              >
                <p className="text-2xl font-bold text-accent-soft">{big}</p>
                <p className="mt-1 text-sm text-[#A0A0B8]">{small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BỘ CÔNG CỤ ============ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-accent-soft">
            Tất cả trong một
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold md:text-4xl">
            Cả một phòng ban, trong một màn hình
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#A0A0B8]">
            Không phải chắp vá chục công cụ rời rạc. SoloCEO OS là bàn làm việc
            duy nhất — mở lên là thấy doanh thu, khách hàng, AI và automation
            của bạn.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <Card key={m.title} className="transition hover:border-accent/40">
                <CardHeader>
                  <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15">
                    <m.icon className="h-5 w-5 text-accent-soft" />
                  </span>
                  <CardTitle className="text-lg">{m.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-[#A0A0B8]">
                  {m.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HÀNH TRÌNH ============ */}
      <section className="border-y border-surface-border bg-surface/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Hành trình của một Solo CEO
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {JOURNEY.map((j) => (
              <div key={j.step} className="relative">
                <span className="text-6xl font-black text-accent/20">
                  {j.step}
                </span>
                <div className="-mt-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <j.icon className="h-5 w-5 text-accent-soft" />
                  </span>
                  <h3 className="text-xl font-semibold">{j.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#A0A0B8]">
                  {j.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ĐIỂM KHÁC BIỆT: SÀN M&A ============ */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-soft">
              Khác biệt lớn nhất
            </p>
            <h2 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Doanh nghiệp của bạn không chỉ để nuôi sống bạn.
              <br />
              Nó là <span className="text-accent-soft">tài sản bán được</span>.
            </h2>
            <p className="mt-4 leading-relaxed text-[#A0A0B8]">
              Hầu hết doanh nghiệp nhỏ ở Việt Nam đóng cửa là mất trắng — vì
              không có sổ sách chứng minh giá trị. Trên SoloCEO, mỗi giao dịch
              đều được xác thực tự động ngay từ ngày đầu. Ba năm sau, bạn không
              chỉ có thu nhập — bạn có một hồ sơ định giá.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm">
              {[
                "Sổ cái doanh thu tự động, không sửa tay được",
                "Huy hiệu “Doanh thu đã xác thực” cho người mua tin tưởng",
                "Định giá theo doanh thu 12 tháng thực tế",
                "Deal-room chuyển nhượng có RAI làm trung gian escrow",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between border-b border-surface-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 font-bold text-accent-soft">
                    C
                  </span>
                  <div>
                    <p className="font-semibold">Cà phê Sáng — ví dụ</p>
                    <p className="text-xs text-emerald-400">
                      ✓ Doanh thu đã xác thực
                    </p>
                  </div>
                </div>
                <LineChart className="h-5 w-5 text-[#A0A0B8]" />
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 text-sm">
                <div>
                  <p className="text-[#A0A0B8]">Doanh thu 12 tháng</p>
                  <p className="text-lg font-bold">500tr – 1 tỷ</p>
                </div>
                <div>
                  <p className="text-[#A0A0B8]">Giá chào bán</p>
                  <p className="text-lg font-bold text-accent-soft">1,2 tỷ</p>
                </div>
              </div>
              <div className="flex h-20 items-end gap-1">
                {[35, 42, 38, 55, 61, 58, 70, 66, 78, 85, 82, 96].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-accent/60"
                      style={{ height: `${h}%` }}
                    />
                  ),
                )}
              </div>
              <p className="mt-3 text-center text-xs text-[#A0A0B8]">
                Hồ sơ niêm yết minh họa trên Sàn M&A
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============ DÀNH CHO AI ============ */}
      <section className="border-y border-surface-border bg-surface/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            SoloCEO dành cho ai?
          </h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {AUDIENCES.map((a) => (
              <div
                key={a}
                className="flex items-start gap-3 rounded-xl border border-surface-border bg-canvas/60 px-4 py-3 text-sm"
              >
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
                {a}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BẢNG GIÁ ============ */}
      <section className="px-6 py-20" id="bang-gia">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Bảng giá minh bạch
          </h2>
          <p className="mt-3 text-center text-[#A0A0B8]">
            Không phí ẩn. Nâng hoặc hạ gói bất cứ lúc nào.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map((p, idx) => (
              <Card
                key={p.key}
                className={
                  idx === 1
                    ? "relative border-accent/60 shadow-lg shadow-accent/10"
                    : ""
                }
              >
                {idx === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-semibold">
                    Phổ biến nhất
                  </span>
                )}
                <CardHeader>
                  <CardTitle>{p.label}</CardTitle>
                  <p className="mt-2">
                    <span className="text-3xl font-black">
                      {formatVnd(p.priceVndMonthly)}₫
                    </span>
                    <span className="text-sm text-[#A0A0B8]"> /tháng</span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5 text-sm">
                  {[
                    `${p.maxVentures} doanh nghiệp`,
                    p.allowedAppKeys === "*"
                      ? "Toàn bộ App Store + ưu tiên tài nguyên"
                      : p.allowedAppKeys.includes("dify")
                        ? "Website + CRM + AI Studio + Automation"
                        : "Website + CRM",
                    `${formatVnd(p.aiTokenCredit)} token AI mỗi tháng`,
                    `Phí giao dịch ${p.paymentFeePct}%`,
                    p.maListingAllowed
                      ? `Niêm yết Sàn M&A (phí thành công ${p.maSuccessFeePct}%)`
                      : "—",
                  ]
                    .filter((f) => f !== "—")
                    .map((f) => (
                      <span key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {f}
                      </span>
                    ))}
                  <Link href="/dang-nhap" className="mt-4">
                    <Button
                      className="w-full"
                      variant={idx === 1 ? "default" : "outline"}
                    >
                      Bắt đầu với {p.label}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-t border-surface-border px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold">Câu hỏi thường gặp</h2>
          <div className="mt-10 flex flex-col gap-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-glass border border-surface-border bg-surface px-6 py-4"
              >
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-[#A0A0B8]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA CUỐI ============ */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-black leading-tight md:text-5xl">
            Một người là đủ.
            <br />
            <span className="bg-gradient-to-r from-accent-soft to-accent bg-clip-text text-transparent">
              Bắt đầu hôm nay.
            </span>
          </h2>
          <p className="mt-4 text-[#A0A0B8]">
            5 phút nữa, doanh nghiệp của bạn sẽ có website, CRM và sổ cái doanh
            thu riêng.
          </p>
          <Link href="/dang-nhap" className="mt-8 inline-block">
            <Button size="lg" className="gap-2">
              Khởi tạo doanh nghiệp miễn phí tư vấn{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-surface-border px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 text-sm text-[#A0A0B8] md:flex-row">
          <div>
            <p className="font-bold text-accent-soft">SoloCEO</p>
            <p className="mt-1">
              Sản phẩm của RAI Holdings — hệ điều hành cho doanh nghiệp một
              người.
            </p>
          </div>
          <nav className="flex gap-6">
            <Link href="/danh-ba" className="hover:text-white">
              Danh bạ
            </Link>
            <Link href="/cong-dong" className="hover:text-white">
              Cộng đồng
            </Link>
            <Link href="/dang-nhap" className="hover:text-white">
              Đăng nhập
            </Link>
          </nav>
          <p>© 2026 RAI Holdings. Bảo lưu mọi quyền.</p>
        </div>
      </footer>
    </main>
  );
}
