// Gói Workspace SoloCEO + hosting đi kèm.
//
// Ý tưởng nền: giống Google Workspace — trả một khoản hằng tháng, được cả hạ tầng lẫn bộ
// phần mềm. Khác ở chỗ Google cho bạn công cụ văn phòng, còn ở đây bạn được một chỗ đứng
// trên Internet (hosting + tên miền riêng) và bộ nền tảng để vận hành doanh nghiệp thật.
//
// Vì sao hosting nằm TRONG gói chứ không bán riêng: một Solo CEO mua phần mềm CRM về mà
// không có chỗ chạy thì phần mềm đó vô dụng. Bán riêng hai thứ nghĩa là đẩy phần khó
// (dựng hạ tầng) về phía người ít có khả năng làm nhất.

export type GoiHosting = {
  ma: string;
  ten: string;
  cpu: number;
  ram: number;          // GB
  dia: number;          // GB NVMe
  bang_thong: string;
  ten_mien_chinh: number;   // số website chính gắn tên miền riêng
  subdomain: number | "khong-gioi-han";
  ghi_chu: string;
};

/**
 * Ba mức hạ tầng, cấp trên node PaaS đăng ký qua platform.soloceo.vn.
 *
 * Cách chia dung lượng: mỗi nền tảng mã nguồn mở chạy nền tốn khoảng 0,5–1 GB RAM (đo từ
 * các tenant đang chạy: Perfex ~600MB, Support Board ~500MB, Academy ~900MB). Nên số
 * subdomain cho phép được tính từ RAM thật chứ không phải con số cho đẹp quảng cáo.
 */
export const HOSTING: GoiHosting[] = [
  {
    ma: "H1", ten: "Hosting Khởi đầu",
    cpu: 2, ram: 4, dia: 60, bang_thong: "2 TB/tháng",
    ten_mien_chinh: 1, subdomain: 3,
    ghi_chu: "Đủ cho 1 website chính + 3 nền tảng chạy nền (vd: CRM, chat, cộng đồng).",
  },
  {
    ma: "H2", ten: "Hosting Tăng trưởng",
    cpu: 4, ram: 8, dia: 120, bang_thong: "4 TB/tháng",
    ten_mien_chinh: 1, subdomain: 8,
    ghi_chu: "Thêm dung lượng cho nền tảng nặng như học viện, video, kho dữ liệu.",
  },
  {
    ma: "H3", ten: "Hosting Bứt phá",
    cpu: 8, ram: 16, dia: 240, bang_thong: "8 TB/tháng",
    ten_mien_chinh: 3, subdomain: "khong-gioi-han",
    ghi_chu: "Ba website chính riêng tên miền; subdomain không giới hạn trong hạn tài nguyên.",
  },
];

export type GoiWorkspace = {
  ma: string;
  ten: string;
  gia: number;              // VND/tháng
  hosting: string;          // mã gói hosting đi kèm
  y_tuong: number | "khong-gioi-han";  // số ý tưởng được triển khai thành doanh nghiệp
  nen_tang_kem: string[];   // phần mềm dùng miễn phí trong gói
  ngan_sach_ai: string;
  phi_giao_dich: string;
  ma_uu_diem: string[];
  noi_bat?: boolean;
};

/**
 * Ba gói Workspace. Giá do chủ đề án ấn định: 3 / 5 / 9 triệu mỗi tháng.
 *
 * Nguyên tắc đóng gói: gói thấp nhất phải ĐỦ CHẠY THẬT một doanh nghiệp một người — có
 * hosting, có tên miền riêng, có CRM + chat + cộng đồng. Gói dùng thử mà thiếu một trong
 * ba thứ đó thì người dùng không chạy nổi và bỏ ngay tháng đầu.
 */
export const WORKSPACE: GoiWorkspace[] = [
  {
    ma: "KHOI_DAU", ten: "Khởi đầu", gia: 3_000_000, hosting: "H1", y_tuong: 1,
    nen_tang_kem: ["CRM", "Chat đa kênh", "Cộng đồng"],
    ngan_sach_ai: "500K token-credit/tháng",
    phi_giao_dich: "3%",
    ma_uu_diem: [
      "Hosting riêng + gắn tên miền của bạn",
      "Chọn 1 ý tưởng từ kho dữ liệu để triển khai thành doanh nghiệp",
      "Đội AI dựng website bán hàng và vận hành",
      "3 nền tảng cộng đồng dùng miễn phí, chạy trên subdomain của bạn",
      "Mọi việc chi tiền đều cần bạn duyệt",
    ],
  },
  {
    ma: "TANG_TRUONG", ten: "Tăng trưởng", gia: 5_000_000, hosting: "H2", y_tuong: 3,
    nen_tang_kem: ["CRM", "Chat đa kênh", "Cộng đồng", "Đào tạo", "Video", "Nhóm chat", "Họp video"],
    ngan_sach_ai: "2 triệu token-credit/tháng",
    phi_giao_dich: "2%",
    noi_bat: true,
    ma_uu_diem: [
      "Mọi thứ ở gói Khởi đầu, hosting gấp đôi",
      "Triển khai 3 ý tưởng song song",
      "7 nền tảng cộng đồng dùng miễn phí",
      "Niêm yết bán lại doanh nghiệp trên Sàn M&A (phí thành công 8%)",
      "Ưu tiên hàng đợi khi Đội AI dựng sản phẩm",
    ],
  },
  {
    ma: "BUT_PHA", ten: "Bứt phá", gia: 9_000_000, hosting: "H3", y_tuong: "khong-gioi-han",
    nen_tang_kem: ["Toàn bộ 9 nền tảng cộng đồng", "Ưu tiên tài nguyên hạ tầng"],
    ngan_sach_ai: "6 triệu token-credit/tháng, mua thêm theo nhu cầu",
    phi_giao_dich: "1,5%",
    ma_uu_diem: [
      "Ba website chính riêng tên miền, subdomain không giới hạn",
      "Triển khai không giới hạn số ý tưởng",
      "Toàn bộ nền tảng cộng đồng + ưu tiên tài nguyên",
      "Sàn M&A phí thành công 5%",
      "Hỗ trợ trực tiếp từ kiến trúc sư đề án",
    ],
  },
];

/** Định dạng tiền cho giao diện: 3.000.000 → "3 triệu". */
export function tienGon(v: number): string {
  if (v >= 1_000_000) {
    const t = v / 1_000_000;
    return (Number.isInteger(t) ? String(t) : t.toFixed(1).replace(".", ",")) + " triệu";
  }
  return v.toLocaleString("vi-VN") + "đ";
}
