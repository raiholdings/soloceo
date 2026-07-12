"use client";
// Thị trường — HUB kết nối nền tảng ra thị trường (omnichannel). ~50 nền tảng
// VN + quốc tế theo nhóm. CEO đánh dấu nền tảng đang dùng, nhờ đội AI kết nối/
// đồng bộ (đội AI dùng API/Midscene trong sandbox). apiStatus khai thật khả năng.

export type Region = "VN" | "Quốc tế";
export type ApiStatus = "api" | "web" | "sap"; // api=có API mở · web=qua thao tác web (Midscene) · sap=sắp hỗ trợ

export type Platform = {
  id: string;
  ten: string;
  nhom: string;
  region: Region;
  moTa: string;
  apiStatus: ApiStatus;
  ketNoiHint: string; // cần gì để kết nối
};

export const NHOM_ICON: Record<string, string> = {
  "Sàn TMĐT": "🛒", "Mạng xã hội & Bán hàng social": "📣", "Quảng cáo": "🎯",
  "Thanh toán": "💳", "Vận chuyển": "🚚", "Bán hàng đa kênh & POS": "🏪",
  "Kế toán & Hoá đơn": "🧾", "Email · CRM · Đo lường": "📊", "Chăm sóc khách hàng": "💬",
};

const P = (id: string, ten: string, nhom: string, region: Region, apiStatus: ApiStatus, moTa: string, ketNoiHint: string): Platform =>
  ({ id, ten, nhom, region, apiStatus, moTa, ketNoiHint });

export const PLATFORMS: Platform[] = [
  // ── Sàn TMĐT ──
  P("shopee", "Shopee", "Sàn TMĐT", "VN", "api", "Sàn TMĐT số 1 VN — đồng bộ sản phẩm, đơn, tồn kho, khuyến mãi.", "Shopee Open Platform: Partner ID + Key (cửa hàng đã đăng ký)"),
  P("tiktok-shop", "TikTok Shop", "Sàn TMĐT", "VN", "api", "Bán hàng trực tiếp trên TikTok — livestream + video mua ngay.", "TikTok Shop Partner: App key/secret + uỷ quyền shop"),
  P("lazada", "Lazada", "Sàn TMĐT", "VN", "api", "Sàn TMĐT khu vực Đông Nam Á (Alibaba).", "Lazada Open Platform: App Key/Secret"),
  P("tiki", "Tiki", "Sàn TMĐT", "VN", "api", "Sàn TMĐT VN — mạnh hàng chính hãng.", "Tiki Seller API: token đối tác"),
  P("sendo", "Sendo", "Sàn TMĐT", "VN", "web", "Sàn TMĐT nội địa.", "Tài khoản người bán Sendo (kết nối qua thao tác web)"),
  P("amazon", "Amazon", "Sàn TMĐT", "Quốc tế", "api", "Sàn TMĐT lớn nhất thế giới — bán ra toàn cầu (FBA/FBM).", "Amazon SP-API: seller account + LWA app"),
  P("ebay", "eBay", "Sàn TMĐT", "Quốc tế", "api", "Sàn đấu giá & bán lẻ toàn cầu.", "eBay Developers: App ID + OAuth"),
  P("etsy", "Etsy", "Sàn TMĐT", "Quốc tế", "api", "Sàn hàng thủ công/sáng tạo.", "Etsy Open API v3: keystring + OAuth"),
  P("alibaba", "Alibaba", "Sàn TMĐT", "Quốc tế", "api", "Sàn B2B bán sỉ toàn cầu.", "Alibaba Open Platform: App Key"),
  P("shopify", "Shopify", "Sàn TMĐT", "Quốc tế", "api", "Nền tảng dựng cửa hàng riêng — bán DTC.", "Shopify Admin API: shop + access token"),

  // ── Mạng xã hội & Bán hàng social ──
  P("facebook", "Facebook (Trang/Shop)", "Mạng xã hội & Bán hàng social", "VN", "api", "Đăng bài, quản Fanpage, Facebook Shop.", "Meta Graph API: Page token"),
  P("instagram", "Instagram", "Mạng xã hội & Bán hàng social", "VN", "api", "Đăng bài/reels, Instagram Shopping.", "Meta Graph API (IG Business)"),
  P("tiktok", "TikTok", "Mạng xã hội & Bán hàng social", "VN", "api", "Đăng video, gắn giỏ hàng.", "TikTok for Developers: Content Posting API"),
  P("youtube", "YouTube", "Mạng xã hội & Bán hàng social", "VN", "api", "Kênh video dài, review sản phẩm.", "YouTube Data API: OAuth"),
  P("zalo-oa", "Zalo Official Account", "Mạng xã hội & Bán hàng social", "VN", "api", "Kênh chạm khách #1 VN — tin nhắn, broadcast, Zalo Shop.", "Zalo OA: App ID + Secret + OA token"),
  P("threads", "Threads", "Mạng xã hội & Bán hàng social", "Quốc tế", "sap", "Mạng xã hội văn bản của Meta.", "Threads API (đang mở dần)"),
  P("x-twitter", "X (Twitter)", "Mạng xã hội & Bán hàng social", "Quốc tế", "api", "Đăng tin nhanh, xây thương hiệu cá nhân.", "X API v2: OAuth 2.0"),
  P("linkedin", "LinkedIn", "Mạng xã hội & Bán hàng social", "Quốc tế", "api", "Mạng B2B, xây uy tín chuyên gia.", "LinkedIn Marketing/Share API"),
  P("pinterest", "Pinterest", "Mạng xã hội & Bán hàng social", "Quốc tế", "api", "Khám phá hình ảnh, dẫn traffic bán hàng.", "Pinterest API: OAuth"),

  // ── Quảng cáo ──
  P("meta-ads", "Meta Ads (FB/IG)", "Quảng cáo", "VN", "api", "Quảng cáo Facebook & Instagram.", "Meta Marketing API: ad account + token"),
  P("google-ads", "Google Ads", "Quảng cáo", "VN", "api", "Quảng cáo tìm kiếm/hiển thị/YouTube.", "Google Ads API: developer token + OAuth"),
  P("tiktok-ads", "TikTok Ads", "Quảng cáo", "VN", "api", "Quảng cáo trên TikTok.", "TikTok Marketing API"),
  P("zalo-ads", "Zalo Ads", "Quảng cáo", "VN", "web", "Quảng cáo trong hệ sinh thái Zalo.", "Tài khoản Zalo Ads"),
  P("coccoc-ads", "Cốc Cốc Ads", "Quảng cáo", "VN", "web", "Quảng cáo trên trình duyệt/tìm kiếm nội địa.", "Tài khoản Cốc Cốc Ads"),

  // ── Thanh toán ──
  P("vnpay", "VNPay", "Thanh toán", "VN", "api", "Cổng thanh toán QR/thẻ phổ biến VN.", "VNPay: TmnCode + HashSecret"),
  P("momo", "MoMo", "Thanh toán", "VN", "api", "Ví điện tử lớn nhất VN.", "MoMo Business: Partner Code + Key"),
  P("zalopay", "ZaloPay", "Thanh toán", "VN", "api", "Ví điện tử trong hệ Zalo.", "ZaloPay: App ID + Key"),
  P("payos", "PayOS", "Thanh toán", "VN", "api", "Cổng nhận chuyển khoản QR tự đối soát.", "PayOS: Client ID + API Key + Checksum"),
  P("vietqr", "VietQR", "Thanh toán", "VN", "api", "Chuẩn QR chuyển khoản liên ngân hàng.", "VietQR/napas: thông tin tài khoản"),
  P("stripe", "Stripe", "Thanh toán", "Quốc tế", "api", "Cổng thanh toán quốc tế mạnh nhất.", "Stripe: Secret key + webhook"),
  P("paypal", "PayPal", "Thanh toán", "Quốc tế", "api", "Ví/cổng thanh toán toàn cầu.", "PayPal: Client ID + Secret"),
  P("paddle", "Paddle", "Thanh toán", "Quốc tế", "api", "Merchant of Record cho sản phẩm số/SaaS.", "Paddle: API key"),

  // ── Vận chuyển ──
  P("ghn", "Giao Hàng Nhanh (GHN)", "Vận chuyển", "VN", "api", "Đơn vị vận chuyển TMĐT hàng đầu.", "GHN API: token + shop ID"),
  P("ghtk", "Giao Hàng Tiết Kiệm", "Vận chuyển", "VN", "api", "Vận chuyển giá tốt toàn quốc.", "GHTK API: token"),
  P("viettel-post", "Viettel Post", "Vận chuyển", "VN", "api", "Mạng lưới bưu chính rộng.", "ViettelPost API: token"),
  P("jt-express", "J&T Express", "Vận chuyển", "VN", "api", "Chuyển phát nhanh phủ rộng.", "J&T API: customer code + key"),
  P("ninjavan", "Ninja Van", "Vận chuyển", "VN", "api", "Giao hàng khu vực ĐNA.", "Ninja Van API: OAuth"),
  P("ahamove", "Ahamove", "Vận chuyển", "VN", "api", "Giao hàng nội thành nhanh 2h.", "Ahamove API: token"),
  P("vnpost", "VNPost (EMS)", "Vận chuyển", "VN", "web", "Bưu điện Việt Nam.", "Hợp đồng khách hàng VNPost"),

  // ── Bán hàng đa kênh & POS ──
  P("kiotviet", "KiotViet", "Bán hàng đa kênh & POS", "VN", "api", "Phần mềm quản lý bán hàng/POS phổ biến VN.", "KiotViet Public API: retailer + token"),
  P("sapo", "Sapo", "Bán hàng đa kênh & POS", "VN", "api", "Nền tảng bán hàng đa kênh (web+POS+sàn).", "Sapo Open API: API key"),
  P("nhanh-vn", "Nhanh.vn", "Bán hàng đa kênh & POS", "VN", "api", "Quản lý bán hàng & kết nối sàn.", "Nhanh.vn API: business ID + token"),
  P("haravan", "Haravan", "Bán hàng đa kênh & POS", "VN", "api", "Nền tảng bán hàng đa kênh + omnichannel.", "Haravan API: access token"),
  P("pancake", "Pancake POS", "Bán hàng đa kênh & POS", "VN", "web", "Quản lý bán hàng qua chat/social.", "Tài khoản Pancake"),

  // ── Kế toán & Hoá đơn ──
  P("misa", "MISA", "Kế toán & Hoá đơn", "VN", "api", "Phần mềm kế toán/hoá đơn điện tử phổ biến nhất VN.", "MISA API/meInvoice: tài khoản DN"),
  P("viettel-invoice", "Viettel Invoice", "Kế toán & Hoá đơn", "VN", "api", "Hoá đơn điện tử Viettel.", "SInvoice API: tài khoản"),
  P("vnpt-invoice", "VNPT Invoice", "Kế toán & Hoá đơn", "VN", "api", "Hoá đơn điện tử VNPT.", "VNPT Invoice API"),
  P("fast", "Fast Accounting", "Kế toán & Hoá đơn", "VN", "web", "Phần mềm kế toán doanh nghiệp.", "Tài khoản Fast"),

  // ── Email · CRM · Đo lường ──
  P("ga4", "Google Analytics 4", "Email · CRM · Đo lường", "VN", "api", "Đo lưu lượng & hành vi khách (miễn phí).", "GA4: Measurement ID + Data API"),
  P("meta-pixel", "Meta Pixel", "Email · CRM · Đo lường", "VN", "api", "Đo chuyển đổi cho quảng cáo Facebook.", "Pixel ID + Conversions API token"),
  P("mailchimp", "Mailchimp", "Email · CRM · Đo lường", "Quốc tế", "api", "Email marketing & automation.", "Mailchimp API key"),
  P("hubspot", "HubSpot", "Email · CRM · Đo lường", "Quốc tế", "api", "CRM + marketing all-in-one.", "HubSpot: private app token"),
  P("getresponse", "GetResponse", "Email · CRM · Đo lường", "Quốc tế", "api", "Email + landing page + autoresponder.", "GetResponse API key"),

  // ── Chăm sóc khách hàng ──
  P("messenger", "Facebook Messenger", "Chăm sóc khách hàng", "VN", "api", "Chat CSKH + chatbot trên Fanpage.", "Meta Messenger API: Page token"),
  P("telegram", "Telegram", "Chăm sóc khách hàng", "VN", "api", "Bot & kênh thông báo.", "Telegram Bot API: bot token"),
  P("whatsapp", "WhatsApp Business", "Chăm sóc khách hàng", "Quốc tế", "api", "Chat CSKH khách quốc tế.", "WhatsApp Cloud API: token"),
  P("viber", "Viber", "Chăm sóc khách hàng", "VN", "api", "Kênh chat phổ biến VN.", "Viber Bot API: token"),
];

export const NHOM_LIST = [
  "Sàn TMĐT", "Mạng xã hội & Bán hàng social", "Quảng cáo", "Thanh toán",
  "Vận chuyển", "Bán hàng đa kênh & POS", "Kế toán & Hoá đơn",
  "Email · CRM · Đo lường", "Chăm sóc khách hàng",
];

export const API_LABEL: Record<ApiStatus, { text: string; mau: string }> = {
  api: { text: "Có API — kết nối trực tiếp", mau: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  web: { text: "Kết nối qua thao tác web (đội AI)", mau: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  sap: { text: "Sắp hỗ trợ", mau: "bg-muted text-muted-foreground" },
};

export function promptConnect(p: Platform): string {
  return (
    `Bạn là đội vận hành của tôi trên SoloCEO. Hãy giúp tôi KẾT NỐI & ĐỒNG BỘ nền tảng "${p.ten}" (${p.nhom}, ${p.region}). ` +
    `Cần: ${p.ketNoiHint}. ` +
    `Việc cần làm: (1) hướng dẫn tôi lấy thông tin/khoá kết nối theo từng bước; (2) nếu nền tảng có API, đề xuất cách đồng bộ (sản phẩm/đơn/tồn kho/tin nhắn) phù hợp việc kinh doanh của tôi; ` +
    `(3) nếu cần thao tác web (không có API mở), dùng chế độ Assist để hỗ trợ (KHÔNG tự nhập OTP/mật khẩu — tôi tự làm bước bảo mật). ` +
    `Nhắc tôi mọi thao tác chạm tiền/đăng công khai đều dừng chờ tôi duyệt. Trả lời tiếng Việt, thực chiến.`
  );
}
