"use client";
import {
  TrendingUp, ShieldCheck, Bot, Store, Users, Workflow,
  Wallet, Rocket, CheckCircle2, Quote,
} from "lucide-react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";

// Tài liệu tham chiếu của hệ điều hành: chân dung một Solo CEO điển hình thành công
// (OpenClawOS) — dựng từ dữ liệu thật trên nền tảng. Dùng cho onboarding + demo.

const KPI = [
  { icon: TrendingUp, label: "Doanh thu định kỳ", value: "≈ 39 triệu ₫", sub: "mỗi tháng, tăng đều" },
  { icon: Wallet, label: "Doanh thu 12 tháng", value: "260 triệu ₫", sub: "402 giao dịch đã xác thực" },
  { icon: ShieldCheck, label: "Định giá tham chiếu", value: "1,4 tỷ ₫", sub: "niêm yết Sàn M&A (~3× doanh thu năm)" },
  { icon: Bot, label: "Chi phí đội AI", value: "< 15 USD", sub: "mỗi tháng cho cả đội trợ lý" },
];

const TIMELINE = [
  { t: "Tháng 0", h: "Khởi động từ số 0", d: "Dựng website + CRM + trợ lý AI trong vài phút. Ra mắt sớm thay vì chờ hoàn hảo." },
  { t: "Tháng 2", h: "5 khách hàng đầu tiên", d: "Doanh thu đầu tiên vào sổ cái. Khách trả tiền định hướng sản phẩm nhanh hơn mọi cuộc họp." },
  { t: "Tháng 4", h: "Bàn giao vận hành cho AI", d: "Đội trợ lý AI chăm sóc khách 24/7; CEO chỉ phê duyệt việc rủi ro (chi tiền, gửi hàng loạt)." },
  { t: "Tháng 7", h: "20 khách trả phí", d: "Phễu bán hàng tự động + nội dung do AI viết. Ngừng bán hàng thủ công, tập trung sản phẩm." },
  { t: "Tháng 9", h: "100% doanh thu xác thực", d: "Mỗi đồng đi qua cổng thanh toán, có dấu vết — nền tảng cho định giá minh bạch." },
  { t: "Tháng 11", h: "≈ 39 triệu ₫/tháng", d: "Một người + một đội AI. Biên lợi nhuận của mô hình solo bộc lộ rõ." },
  { t: "Tháng 13", h: "Đủ điều kiện Sàn M&A", d: "Badge 'doanh thu đã xác thực', định giá tham chiếu ~1,4 tỷ ₫. Doanh nghiệp có thể chuyển nhượng." },
];

const PLATFORMS = [
  { icon: Rocket, name: "Workspace + Trợ lý AI", d: "Trung tâm điều hành: bộ 6 nhân sự AI (bán hàng, nội dung, CSKH, vận hành…) làm việc 24/7, CEO giữ quyền phê duyệt." },
  { icon: Store, name: "Chợ ứng dụng", d: "Cài nền tảng lõi (OpenClaw workspace) 1-chạm, provisioning tự động lên hạ tầng riêng dưới 5 phút." },
  { icon: Users, name: "CRM", d: "Quản lý toàn bộ khách thuê bao: lead dùng thử → khách trả phí → nâng gói. Đồng bộ đúng dữ liệu từng CEO." },
  { icon: Bot, name: "Chat đa kênh", d: "Hộp thư gộp WhatsApp/Telegram/Messenger/Zalo… trợ lý AI trả lời trước, người chỉ xử lý ca khó." },
  { icon: Workflow, name: "Phễu & Mô hình KD", d: "Chọn mô hình 'SaaS thuê bao', dựng phễu bán hàng theo bước, giao từng việc cho đội AI." },
  { icon: Wallet, name: "Thanh toán PayOS", d: "Thu tiền QUA cổng → mọi giao dịch tự xác thực vào sổ cái, không còn 'doanh thu kể miệng'." },
  { icon: ShieldCheck, name: "Sàn M&A", d: "Khi đủ 90 ngày + doanh thu xác thực + ttm>0: tự đủ điều kiện niêm yết, có hồ sơ định giá." },
];

const LESSONS = [
  "Ra mắt sớm — khách trả tiền là người thầy tốt nhất.",
  "Giao việc lặp lại cho AI, giữ lại quyền phê duyệt việc rủi ro (human-in-the-loop).",
  "Thu tiền qua cổng ngay từ đầu: doanh thu xác thực là tài sản, không chỉ con số.",
  "Đo chi phí AI theo ngày — mô hình solo chỉ lời khi chi phí biên gần bằng 0.",
  "Doanh nghiệp một người vẫn có thể định giá & chuyển nhượng nếu số liệu minh bạch.",
];

function StatCard({ icon: Icon, label, value, sub }: (typeof KPI)[number]) {
  return (
    <div className="rounded-xl border p-4">
      <Icon className="h-5 w-5 text-emerald-600" />
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-muted-foreground text-xs">{sub}</div>
    </div>
  );
}

export function SoloceoCaseStudy() {
  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            Tài liệu tham chiếu · Solo CEO điển hình
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">OpenClawOS — chân dung một Solo CEO thành công</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Từ số 0 đến một doanh nghiệp có doanh thu định kỳ đã xác thực và có thể định giá — trong hơn 13 tháng,
            vận hành bởi <b>một người + một đội trợ lý AI</b>. Đây là hình mẫu tham chiếu để mọi Solo CEO trên hệ
            điều hành noi theo.
          </p>

          {/* KPI */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {KPI.map((k) => <StatCard key={k.label} {...k} />)}
          </div>

          {/* Chân dung */}
          <div className="mt-8 rounded-xl border bg-muted/30 p-5">
            <h2 className="text-lg font-semibold">Chân dung</h2>
            <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex justify-between border-b py-1"><dt className="text-muted-foreground">Ngành</dt><dd className="font-medium">SaaS / Dịch vụ phần mềm</dd></div>
              <div className="flex justify-between border-b py-1"><dt className="text-muted-foreground">Sản phẩm</dt><dd className="font-medium">Hệ điều hành cho DN một người</dd></div>
              <div className="flex justify-between border-b py-1"><dt className="text-muted-foreground">Mô hình</dt><dd className="font-medium">Thuê bao (299k/990k/2,9tr)</dd></div>
              <div className="flex justify-between border-b py-1"><dt className="text-muted-foreground">Gói nền tảng</dt><dd className="font-medium">Bứt phá (SCALE)</dd></div>
              <div className="flex justify-between border-b py-1"><dt className="text-muted-foreground">Nhân sự</dt><dd className="font-medium">1 người + 6 trợ lý AI</dd></div>
              <div className="flex justify-between border-b py-1"><dt className="text-muted-foreground">Thời gian</dt><dd className="font-medium">13 tháng tới điểm định giá</dd></div>
            </dl>
          </div>

          {/* Hành trình */}
          <h2 className="mt-8 text-lg font-semibold">Hành trình 13 tháng</h2>
          <ol className="mt-3 space-y-3 border-l-2 border-emerald-200 pl-5">
            {TIMELINE.map((s) => (
              <li key={s.t} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <div className="text-xs font-semibold text-emerald-700">{s.t}</div>
                <div className="font-medium">{s.h}</div>
                <div className="text-muted-foreground text-sm">{s.d}</div>
              </li>
            ))}
          </ol>

          {/* Dùng nền tảng thế nào */}
          <h2 className="mt-8 text-lg font-semibold">Đã dùng hệ điều hành thế nào</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <p.icon className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{p.name}</span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{p.d}</p>
              </div>
            ))}
          </div>

          {/* Bài học */}
          <h2 className="mt-8 text-lg font-semibold">5 bài học rút ra</h2>
          <ul className="mt-3 space-y-2">
            {LESSONS.map((l) => (
              <li key={l} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{l}
              </li>
            ))}
          </ul>

          <blockquote className="mt-8 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/50 p-5">
            <Quote className="h-5 w-5 text-emerald-600" />
            <p className="mt-2 text-base italic">
              “Từ 0 tới một doanh nghiệp có thể định giá & chuyển nhượng, trong hơn một năm, một mình.
              Điều làm được điều đó không phải làm nhiều hơn — mà là để hệ điều hành và đội AI làm phần lặp lại,
              còn mình chỉ quyết định.”
            </p>
            <footer className="text-muted-foreground mt-2 text-sm">— Nhà sáng lập OpenClawOS</footer>
          </blockquote>

          <p className="text-muted-foreground mt-8 text-xs">
            Số liệu lấy từ dữ liệu vận hành thực trên nền tảng (sổ cái doanh thu đã xác thực, sổ chi phí AI, niêm yết
            M&A). OpenClawOS là tài khoản tham chiếu chính thức của hệ điều hành SoloCEO.
          </p>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
