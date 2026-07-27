// Thanh điều hướng dùng CHUNG cho mọi trang landing/chi tiết (giải pháp, tính năng,
// tin tức, sự kiện, gói cước, solo-ceo...) — để bấm vào 1 trang vẫn thấy đủ tab trên.
// Không dùng hook client (mega-menu chạy bằng CSS group-hover) → dùng được ở cả
// server component lẫn client component.
const WORKSPACE = "/workspace";

// Ba sản phẩm đứng riêng — chúng là ba khâu nối tiếp của một dây chuyền:
// dữ liệu thật → kiểm chứng thành MVP chạy được → bán trên sàn.
const PRODUCTS: [string, string, string, string][] = [
  ["Bộ não dữ liệu", "Gần 1 triệu bản ghi thật, trọng tâm Việt Nam — nơi ý tưởng được đúc ra", "/san-pham/du-lieu", "🧠"],
  ["Xưởng kiểm chứng", "Ý tưởng bị chấm điểm rồi dựng thành MVP — chỉ thứ chạy được mới đi tiếp", "/san-pham/xuong-kiem-chung", "🧪"],
  ["Sàn sản phẩm", "Mua bán doanh nghiệp đã chạy thật, có demo bấm vào được ngay", "/san-pham/san-giao-dich", "🛒"],
];
// 9 nền tảng cộng đồng (Giải pháp).
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
];
// 8 nền tảng lõi (Tính năng).
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
// Tài nguyên.
const RESOURCES: [string, string, string, string][] = [
  ["Báo cáo", "Nghiên cứu thị trường & công nghệ, mỗi ngày một bản", "/bao-cao", "📊"],
  ["Tin tức", "Bài viết & góc nhìn từ Đội AI SoloCEO", "/tin-tuc", "📰"],
  ["Solo CEO điển hình", "Chân dung thành viên tiêu biểu", "/solo-ceo-dien-hinh", "🏆"],
  ["Tài liệu", "Hướng dẫn sử dụng & tài liệu", "/en/docs", "📚"],
  ["Trạng thái", "Sức khoẻ hệ sinh thái thời gian thực", "/trang-thai", "🟢"],
  ["Pitch deck", "Giới thiệu toàn cảnh nền tảng", "https://pitchdeck.soloceo.vn", "🎯"],
];

function Mega({ label, items, cols = 2, width = "w-[520px]", note }: { label: string; items: [string, string, string, string][]; cols?: number; width?: string; note?: string }) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition group-hover:bg-[#1a1a1d] group-hover:text-[#f5f5f6]">{label}<span className="text-[10px]">▾</span></button>
      <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
        <div className={`${width} rounded-2xl border border-[#232326] bg-[#131315] p-3 shadow-2xl shadow-black/50`}>
          {note && <div className="mb-2 px-2 font-mono text-[10px] tracking-[.14em] text-[#6b6b73] uppercase">{note}</div>}
          <div className={`grid gap-0.5 ${cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {items.map(([t, d, h, e]) => (
              <a key={t} href={h} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-[#1a1a1d]">
                <span className="mt-0.5 text-lg">{e}</span>
                <div><div className="text-[13.5px] font-semibold text-[#f5f5f6]">{t}</div><div className="text-[11.5px] leading-snug text-[#a2a2aa]">{d}</div></div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#1a1a1d] bg-[#0b0b0c]/85 px-[6vw] py-3.5 backdrop-blur">
      <a href="/" className="flex items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="none" stroke="#f5f5f6" strokeWidth="7" /><circle cx="50" cy="50" r="12" fill="#e3b341" /></svg>
        <span className="text-[15px] font-semibold text-[#f5f5f6]">SoloCEO</span>
      </a>
      <nav className="hidden items-center gap-1 md:flex">
        <Mega label="Sản phẩm" items={PRODUCTS} cols={1} width="w-[480px]" note="Dây chuyền: dữ liệu → kiểm chứng → bán" />
        <Mega label="Tính năng" items={CORE} width="w-[560px]" note="8 nền tảng lõi · engine AI vận hành an toàn" />
        <Mega label="Giải pháp" items={COMMUNITY} width="w-[560px]" note="9 nền tảng cộng đồng · đi kèm mọi Solo CEO" />
        <Mega label="Tài nguyên" items={RESOURCES} width="w-[520px]" note="Tin tức · chân dung · tài liệu" />
        <a href="/su-kien" className="rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition hover:bg-[#1a1a1d] hover:text-[#f5f5f6]">Sự kiện</a>
        <a href="/goi-cuoc" className="rounded-lg px-3 py-2 text-[13.5px] text-[#a2a2aa] transition hover:bg-[#1a1a1d] hover:text-[#f5f5f6]">Gói cước</a>
      </nav>
      <div className="flex items-center gap-2.5">
        <a href={WORKSPACE} className="hidden rounded-lg border border-[#33333a] px-3.5 py-2 text-[13px] text-[#f5f5f6] transition hover:border-[#f5f5f6] sm:inline-block">Đăng nhập</a>
        <a href={WORKSPACE} className="rounded-lg bg-[#f5f5f6] px-4 py-2 text-[13px] font-bold text-[#0b0b0c] transition hover:opacity-90">Vào Workspace</a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1a1a1d] px-[6vw] py-8 text-center">
      <p className="font-mono text-[11px] tracking-wide text-[#6b6b73]">© SoloCEO — Hệ điều hành cho doanh nghiệp một người · 2026</p>
    </footer>
  );
}
