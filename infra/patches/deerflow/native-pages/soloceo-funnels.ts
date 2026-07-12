"use client";
// Phễu bán hàng — thư viện KHUNG PHỄU đóng gói (giải phẫu trang + luồng + KPI 5 khâu)
// dựa trên skill "tao-funnel" đã cài vào đội AI. CEO nhập sản phẩm/ngách/link/tài liệu,
// chọn khung, rồi giao từng khâu cho đội AI (agent dùng skill thiết kế + thi công).
// Nguồn tri thức: Bộ công cụ Tạo Funnel (bản công khai 2.0). Diễn giải trong sản phẩm.

export type FunnelStageType = "traffic" | "lead_magnet" | "lead_page" | "email" | "sale_page" | "oto" | "thankyou" | "backend";

export const STAGE_META: Record<FunnelStageType, { ten: string; vaiTro: string; mau: string }> = {
  traffic: { ten: "Nguồn traffic", vaiTro: "Kéo người lạ vào phễu (SEO/blog/ads/video/cộng đồng)", mau: "text-sky-600" },
  lead_magnet: { ten: "Mồi câu (lead magnet)", vaiTro: "Quà miễn phí đổi lấy email — bìa quan trọng hơn ruột", mau: "text-amber-600" },
  lead_page: { ten: "Trang bắt email (lead page)", vaiTro: "MỘT việc: đổi mồi câu lấy email. Chỉ xin email. Double opt-in", mau: "text-emerald-600" },
  email: { ten: "Chuỗi email nuôi dưỡng", vaiTro: "Dẫn từ lead → khách. Viết email BÁN trước rồi viết ngược lên", mau: "text-violet-600" },
  sale_page: { ten: "Trang bán (sale page)", vaiTro: "MỘT việc: chốt tiền 1 sản phẩm. Không gộp với lead page", mau: "text-rose-600" },
  oto: { ten: "OTO / Upsell", vaiTro: "Ưu đãi 1 lần ngay sau khi mua — tăng giá trị đơn (AOV)", mau: "text-orange-600" },
  thankyou: { ten: "Trang cảm ơn", vaiTro: "Gắn pixel/sự kiện đo, giao mồi câu, đặt OTO, dẫn bước tiếp", mau: "text-teal-600" },
  backend: { ten: "Backend / Membership", vaiTro: "Sản phẩm mua lại — nơi lợi nhuận thật (khách quay lại)", mau: "text-indigo-600" },
};

export type FunnelFramework = {
  id: string;
  ten: string;
  tagline: string;
  hopVoi: string;
  doKho: "Dễ" | "Vừa" | "Khó";
  soDo: string; // sơ đồ mũi tên
  stages: FunnelStageType[];
  luuY: string;
};

export const FRAMEWORKS: FunnelFramework[] = [
  {
    id: "co-ban", ten: "① Phễu cơ bản", tagline: "Mặc định cho hầu hết doanh nghiệp nhỏ: nội dung + ads cùng đổ về trang bán.",
    hopVoi: "Đã có chút nội dung/SEO hoặc ngân sách ads nhỏ", doKho: "Dễ",
    soDo: "Blog/SEO ─┐\n            ├─→ Lead page → [~5 email] → Sale page → $\nAds ────────┘ (ads có thể dẫn thẳng sale page)",
    stages: ["traffic", "lead_magnet", "lead_page", "email", "sale_page", "thankyou"],
    luuY: "Hai đường vào (miễn phí + trả phí) cùng về trang bán.",
  },
  {
    id: "g-top1", ten: "② Phễu G→Top1 (SEO-first, vốn 0đ)", tagline: "Không có tiền ads, mạnh viết bài — sống nhờ Top 1 Google trong ngách hẹp.",
    hopVoi: "Không ngân sách ads, giỏi SEO/viết bài", doKho: "Vừa",
    soDo: "Google [Top 1] → (CR% cao) → Lead page → email → Sale page",
    stages: ["traffic", "lead_page", "email", "sale_page", "thankyou"],
    luuY: "Điều kiện sống còn: PHẢI Top 1 (Top 3 gần như hết click). Chọn ngách vừa đủ hẹp để làm Top 1.",
  },
  {
    id: "tofu-mofu-bofu", ten: "③ Phễu 3 tầng TOFU/MOFU/BOFU", tagline: "Bản đồ chiến lược theo độ nóng của tệp khách. Người mới bắt đầu từ BOFU.",
    hopVoi: "Muốn phân bổ nội dung theo tệp lạnh → nóng", doKho: "Vừa",
    soDo: "TOFU (khách lạnh): ads/YouTube/viral → nhận biết\nMOFU (cân nhắc): chuỗi email → tin tưởng\nBOFU (sẵn mua): từ khoá người mua → sale page → chốt",
    stages: ["traffic", "lead_magnet", "lead_page", "email", "sale_page"],
    luuY: "Người mới ít nguồn lực → LÀM TỪ BOFU TRƯỚC (từ khoá buyer-intent → blog thẳng sale page), có tiền mới xây ngược lên.",
  },
  {
    id: "da-nguon", ten: "④ Phễu đầy đủ đa nguồn", tagline: "Khi phễu đã chạy ổn, cần nhân quy mô — nhiều nguồn hội tụ + liên minh.",
    hopVoi: "Phễu lõi đã có tỷ lệ chuyển đổi ổn, muốn scale", doKho: "Khó",
    soDo: "Mạng XH · YouTube · Ads A/B · Cộng đồng → chuỗi BLOG liên kết chéo → LEAD MAGNET\n→ chuỗi EMAIL (→ email BÁN) → $   |   PR đi trước tạo uy tín",
    stages: ["traffic", "lead_magnet", "lead_page", "email", "sale_page", "oto", "thankyou", "backend"],
    luuY: "Đòn bẩy cuối: phân phối đa kênh liên minh (nhiều chủ kênh góp email, chia % theo khách mang đến).",
  },
  {
    id: "info-vatly-membership", ten: "⑤ Info + Vật lý + Membership", tagline: "Mô hình acquire lead rẻ nhất — lợi nhuận đến từ khách mua lại/membership.",
    hopVoi: "Đào tạo/coaching/sản phẩm số, hoặc có backend vật lý", doKho: "Khó",
    soDo: "① Info product (livestream hỏi–đáp → LEAD, KHÔNG bán ở live) → Membership phí thấp/tháng\n② Trong membership dạy → chạm nhu cầu sâu\n③ Sản phẩm vật lý backend (PHẢI tốt hàng đầu → khách quay lại = lợi nhuận thật)",
    stages: ["traffic", "lead_magnet", "email", "backend"],
    luuY: "Chi phí acquire 1 khách rất đắt → khâu đầu gần như hoà/lỗ, lợi nhuận nằm ở khách quay lại. Bắt buộc có sản phẩm tiêu dùng liên tục.",
  },
];

// 5 khâu KPI đo sức khỏe phễu
export const KPI_5 = [
  { khau: "① Web visit", chiSo: "Lượt truy cập/tháng", doO: "Google Analytics 4" },
  { khau: "①→② Opt-in rate", chiSo: "% visit để lại email", doO: "GA4 sự kiện + form" },
  { khau: "② Lead", chiSo: "Số email thu/tháng", doO: "Công cụ email/CRM" },
  { khau: "②→③ Sale conversion", chiSo: "% lead thành khách", doO: "Pixel/đơn hàng" },
  { khau: "③ Khách hàng", chiSo: "Số khách/tháng · AOV", doO: "Đơn hàng" },
  { khau: "④ Doanh thu", chiSo: "Khách × AOV", doO: "Kế toán" },
  { khau: "⑤ Lợi nhuận", chiSo: "Doanh thu − chi phí", doO: "Kế toán" },
];

// 5 luật vàng (hiện cảnh báo)
export const LUAT_VANG = [
  "Mỗi trang làm ĐÚNG MỘT việc, MỘT hành động. Lead page (bắt email) ≠ sale page (chốt tiền) — chọn vai trước.",
  "Không bịa số. KPI/tỷ lệ mẫu là giả định lập kế hoạch (🔶) — số thật phải đo.",
  "YMYL (tiền/sức khỏe/pháp lý/BĐS): KHÔNG cam kết lợi nhuận/lãi/khỏi bệnh. Khoá vào E-E-A-T.",
  "Double opt-in cho mọi lead page thu email (trừ khách đã trả tiền).",
  "Bản thiết kế, không tự công bố. Ra sơ đồ + đặc tả để CEO duyệt rồi mới thi công.",
];

// Lời nhắc giao đội AI cho từng khâu — dùng skill tao-funnel
export function promptForStage(stage: FunnelStageType, fw: FunnelFramework, ctx: string): string {
  const base =
    `Bạn là đội marketing của tôi trên SoloCEO. DÙNG SKILL "tao-funnel" (trong /mnt/skills) để làm chuẩn. ` +
    `BỐI CẢNH SẢN PHẨM: ${ctx || "[CEO chưa nhập — hãy hỏi tôi: bán gì, cho ai, ngách nào, có link/tài liệu gì]"}. ` +
    `Khung phễu đã chọn: ${fw.ten}. Ràng buộc 5 luật vàng của skill (mỗi trang 1 việc, không bịa số, YMYL không cam kết, double opt-in, không tự công bố). `;
  const spec: Record<FunnelStageType, string> = {
    traffic: `NHIỆM VỤ — NGUỒN TRAFFIC: đề xuất 2-3 nguồn traffic phù hợp khung này + ý tưởng nội dung/từ khoá đầu phễu cho ĐÚNG ngách của tôi.`,
    lead_magnet: `NHIỆM VỤ — MỒI CÂU: thiết kế 1 lead magnet (chọn video/PDF+tài liệu/ảnh), đặt tên + lời hứa + đổi lấy email; nếu tôi có link/tài liệu đính kèm hãy tận dụng.`,
    lead_page: `NHIỆM VỤ — TRANG BẮT EMAIL: đặc tả lead page (chỉ xin email, double opt-in), tiêu đề + 3 gạch lợi ích + nút; dựng bản HTML mẫu trong sandbox nếu được.`,
    email: `NHIỆM VỤ — CHUỖI EMAIL: đặc tả số email + nhịp + mục tiêu từng email; VIẾT EMAIL BÁN (email cuối) TRƯỚC rồi viết ngược lên.`,
    sale_page: `NHIỆM VỤ — TRANG BÁN: đặc tả sale page bán 1 sản phẩm (không gộp lead page), theo 12 khối copywriting; nêu offer + bảo đảm.`,
    oto: `NHIỆM VỤ — OTO/UPSELL: thiết kế 1 ưu đãi 1 lần ngay sau mua để tăng AOV; đặc tả như sale page mini + bậc thang neo giá.`,
    thankyou: `NHIỆM VỤ — TRANG CẢM ƠN: đặc tả trang cảm ơn (gắn pixel/sự kiện đo, giao mồi câu, đặt OTO, dẫn bước tiếp).`,
    backend: `NHIỆM VỤ — BACKEND/MEMBERSHIP: đề xuất sản phẩm mua lại/membership nối tiếp để tạo lợi nhuận thật; cách chuyển khách từ phễu đầu vào backend.`,
  };
  return base + spec[stage] + " Trả lời tiếng Việt, cụ thể cho sản phẩm của tôi, KHÔNG nói chung chung. Việc chạm tiền/đăng công khai phải dừng chờ tôi duyệt.";
}
