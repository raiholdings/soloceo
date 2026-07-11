"use client";
// Thư viện "Mô hình kinh doanh" — mỗi gói là một mô hình ĐÓNG GÓI TRỌN:
// công thức (tạo–trao–giữ giá trị), các hướng triển khai, lộ trình 90 ngày,
// và MAP 8 NỀN TẢNG của SoloCEO OS cho từng bước. CEO bấm "Giao cho đội AI"
// → lời nhắc nạp vào thread DeerFlow mới (cơ chế KICKOFF_KEY có sẵn).
//
// Nguồn tri thức gói web3: chưng cất từ "Super Guide: Web 3.0 Business Models"
// (Daniel Pereira — The Business Model Analyst, 2022) — diễn giải lại, không chép.
// Trợ lý mặc định đi kèm: co-van-mo-hinh-web3 (agents layout chung).

export type PlatformKey =
  | "deerflow" | "sandbox" | "flowgram" | "midscene"
  | "dolphin" | "arishem" | "godlp" | "g3";

export const PLATFORMS: Record<PlatformKey, { ten: string; vaiTro: string }> = {
  deerflow: { ten: "DeerFlow", vaiTro: "Bộ não điều phối — lead agent nhận việc, chia cho 6 nhân sự AI" },
  sandbox: { ten: "AIO Sandbox", vaiTro: "Máy tính của doanh nghiệp — agent dựng web, soạn tài liệu, chạy lệnh (xem live)" },
  flowgram: { ten: "FlowGram", vaiTro: "Quy trình tái dùng — biến việc lặp thành flow (chốt sổ, đăng bài, nuôi lead)" },
  midscene: { ten: "Midscene", vaiTro: "Thao tác web hộ (Assist) — tra cứu, điền form trang không có API; cấm CAPTCHA/ký số" },
  dolphin: { ten: "Dolphin", vaiTro: "Đọc giấy tờ — CCCD/GPKD/hoá đơn → dữ liệu có cấu trúc, tự điền hồ sơ" },
  arishem: { ten: "arishem", vaiTro: "Cổng dừng HITL — chi tiền/ký/gửi hợp đồng phải qua Phê duyệt của CEO" },
  godlp: { ten: "godlp", vaiTro: "Che dữ liệu cá nhân (CCCD/SĐT/STK) trước khi prompt rời hệ thống — Nghị định 13" },
  g3: { ten: "g3proxy", vaiTro: "Canh cửa internet — sandbox chỉ ra ngoài qua allowlist, dữ liệu org tách biệt" },
};

export type BmStep = {
  id: string;
  ten: string;
  moTa: string;
  team: string; // sub-agent phụ trách
  platforms: PlatformKey[];
  /** Lời nhắc giao cho lead_agent khi CEO bấm "Giao cho đội AI" */
  prompt?: string;
  /** Liên kết nội bộ thay cho giao việc (vd mở Chợ ứng dụng) */
  link?: { href: string; label: string };
};

export type BmPhase = { id: string; ten: string; tuan: string; steps: BmStep[] };

export type BmVariant = {
  id: string;
  ten: string;
  hopVoi: string;
  doKho: "Dễ" | "Vừa" | "Khó";
  ruiRo: string;
  moTa: string;
};

export type BusinessModel = {
  id: string;
  ten: string;
  tagline: string;
  nhom: string;
  planMin: "STARTER" | "GROWTH" | "SCALE";
  trangThai: "SẴN SÀNG" | "SẮP RA MẮT";
  gioiThieu: string;
  /** Công thức 3 câu: TẠO – TRAO – GIỮ giá trị + doanh thu + chi phí + rủi ro */
  congThuc: {
    tao: string; trao: string; giu: string;
    doanhThu: string[]; chiPhi: string[]; ruiRoPhapLy: string;
  };
  variants: BmVariant[];
  loTrinh: BmPhase[];
  /** Trợ lý mặc định + app chợ liên quan */
  troLy?: { agent: string; ten: string };
  appLienQuan?: { key: string; ten: string }[];
  canhBao: string[];
  chiSo: string[];
};

// ── Helper sinh lời nhắc chuẩn cho mọi bước ────────────────────────────────
const nhac = (mission: string, teams: string, ketQua: string) =>
  `Bạn là đội vận hành doanh nghiệp của tôi trên SoloCEO (mô hình Web 3.0 Business Models). ` +
  `NHIỆM VỤ: ${mission} PHÂN CÔNG: ${teams}. ` +
  `KẾT QUẢ CẦN CÓ: ${ketQua} ` +
  `Ràng buộc: tiếng Việt, hướng hành động cho doanh nghiệp nhỏ VN; việc dính tiền/pháp lý phải dừng chờ tôi phê duyệt; ` +
  `KHÔNG tự đặt giá; khi cần kiến thức sâu về Web3 hãy vận dụng khung của Cố vấn Mô hình Web3 (12 mô hình, tạo–trao–giữ giá trị).`;

export const BUSINESS_MODELS: BusinessModel[] = [
  {
    id: "web3-business-models",
    ten: "Web 3.0 Business Models",
    tagline: "Token hoá lòng trung thành, NFT membership, truy xuất nguồn gốc — đưa doanh nghiệp truyền thống lên Web3 đúng cách, không đầu cơ.",
    nhom: "Công nghệ & Đổi mới",
    planMin: "STARTER",
    trangThai: "SẴN SÀNG",
    gioiThieu:
      "Gói này đóng gói toàn bộ khung mô hình kinh doanh Web3 (12 mô hình gốc: native asset, work token, burn token, BaaS, DAO, social token, NFT ticketing…) thành lộ trình 90 ngày mà một doanh nghiệp nhỏ Việt Nam áp dụng được. Nguyên tắc xuyên suốt: sản phẩm và vòng lặp thói quen TRƯỚC, token SAU; mọi bước chạm tiền/pháp lý đều có điểm dừng phê duyệt.",
    congThuc: {
      tao: "TẠO giá trị: giải một việc khách đang đau bằng đặc tính Web3 (sở hữu số, minh bạch, chuyển nhượng được) — không phải 'gắn mác blockchain'.",
      trao: "TRAO giá trị: qua kênh khách đã quen (web/Zalo/cửa hàng) + ví/QR đơn giản — mỗi bước bắt khách 'học' làm mất một nửa khách.",
      giu: "GIỮ giá trị: phí giao dịch/thành viên + giá trị token quy về hoạt động thật (không phải giá đầu cơ) + cộng đồng làm hào phòng thủ.",
      doanhThu: [
        "Phí thành viên / membership NFT (thu định kỳ)",
        "Phí giao dịch trên marketplace/dịch vụ (kiểu Eventbrite Web3)",
        "Bán dịch vụ truy xuất nguồn gốc / chứng thực cho đối tác (BaaS)",
        "Doanh thu sản phẩm gốc tăng nhờ vòng lặp trung thành token",
      ],
      chiPhi: ["Nền tảng & hạ tầng (thuê BaaS/no-code trước, chưa thuê dev)", "Marketing cộng đồng", "Phí giao dịch on-chain (chọn chain rẻ)", "Tư vấn pháp lý (bắt buộc trước khi thu tiền qua token)"],
      ruiRoPhapLy:
        "Việt Nam chưa có khung pháp lý hoàn chỉnh cho tài sản mã hoá. KHÔNG gọi vốn công khai bằng token; token thưởng nội bộ (không quy đổi tiền mặt trực tiếp) an toàn hơn; mọi thiết kế thu tiền thật cần tư vấn luật — bước này lộ trình đã chặn HITL.",
    },
    variants: [
      { id: "loyalty-token", ten: "Tích điểm token hoá", hopVoi: "F&B, bán lẻ, spa — có khách quay lại", doKho: "Dễ", ruiRo: "Thấp (token thưởng nội bộ)", moTa: "Điểm trung thành thành token chuyển nhượng được giữa khách — khách rủ nhau tiêu, cộng đồng tự lớn." },
      { id: "nft-membership", ten: "Membership / vé NFT", hopVoi: "Cộng đồng, sự kiện, lớp học, câu lạc bộ", doKho: "Dễ", ruiRo: "Thấp-vừa", moTa: "Thẻ thành viên/vé là NFT: chống giả, bán lại được (bạn thu % phí bán lại), quyền lợi theo hạng." },
      { id: "traceability", ten: "Truy xuất nguồn gốc (BaaS)", hopVoi: "Nông sản, thực phẩm, hàng thủ công xuất khẩu", doKho: "Vừa", ruiRo: "Thấp", moTa: "Mỗi lô hàng một 'hộ chiếu số' trên chain — tăng giá bán, mở cửa xuất khẩu; thuê hạ tầng BaaS, không tự vận hành chain." },
      { id: "creator-dao", ten: "Cộng đồng creator / social token", hopVoi: "KOL, nghệ sĩ, người dạy học có fan", doKho: "Vừa", ruiRo: "Vừa (quản trị cộng đồng)", moTa: "Fan giữ token được quyền lợi + tiếng nói; fan trở thành người quảng bá vì giá trị token gắn với cộng đồng." },
      { id: "tokenized-asset", ten: "Token hoá tài sản (BĐS…)", hopVoi: "Chủ tài sản lớn, quỹ", doKho: "Khó", ruiRo: "CAO — pháp lý chứng khoán", moTa: "Chia nhỏ quyền lợi tài sản thành token. CHỈ làm khi có tư vấn pháp lý chuyên sâu — lộ trình khoá bước này sau HITL." },
    ],
    loTrinh: [
      {
        id: "pha-1", ten: "Khám phá & chọn hướng", tuan: "Tuần 1–2",
        steps: [
          {
            id: "p1-khao-sat", ten: "Khảo sát khách + đối thủ Web3 trong ngành", team: "Nghiên cứu",
            moTa: "Đội AI khảo sát hành vi khách của bạn và 3–5 case Web3 cùng ngành (trong & ngoài nước), chỉ ra cái nào sống/chết và vì sao.",
            platforms: ["deerflow", "sandbox", "g3", "midscene"],
            prompt: nhac(
              "khảo sát nhanh: (1) khách hàng hiện tại của tôi có hành vi nào phù hợp token/NFT (quay lại, sưu tầm, cộng đồng)? (2) 3-5 case Web3 cùng ngành — mô hình gì, sống hay chết, bài học.",
              "sub-agent Nghiên cứu chủ trì; cần tra web công khai thì dùng chế độ Assist",
              "1 báo cáo ngắn có bảng so sánh case + 3 khuyến nghị hướng đi xếp theo độ phù hợp.",
            ),
          },
          {
            id: "p1-chon-huong", ten: "Chốt 1 hướng bằng bài kiểm tra 1 câu", team: "Kinh doanh",
            moTa: "Điền được câu: “Web3 giúp khách của tôi ______ mà cách cũ không làm được” — không điền nổi thì DỪNG gói này (tiết kiệm 3 tháng).",
            platforms: ["deerflow"],
            prompt: nhac(
              "cùng tôi chốt hướng Web3: hỏi tôi 5 câu về nghề gốc + khách gốc, rồi cùng điền câu 'Web3 giúp khách của tôi ______ mà cách cũ không làm được' cho 2-3 hướng khả thi; chấm điểm từng hướng theo độ khó/rủi ro/pháp lý VN.",
              "sub-agent Kinh doanh chủ trì, Nghiên cứu bổ trợ",
              "1 hướng được chọn kèm lý do, 2 hướng loại kèm lý do.",
            ),
          },
          {
            id: "p1-hoi-covan", ten: "Tham vấn Cố vấn Mô hình Web3", team: "Cố vấn",
            moTa: "Trợ lý mặc định nắm trọn 12 mô hình Web3 — hỏi sâu về mô hình con bạn định theo trước khi xuống tiền.",
            platforms: ["deerflow"],
            link: { href: "/workspace/agents", label: "Mở Cố vấn Mô hình Web3" },
          },
        ],
      },
      {
        id: "pha-2", ten: "Dựng nền", tuan: "Tuần 3–6",
        steps: [
          {
            id: "p2-landing", ten: "Landing giải thích + thu danh sách chờ", team: "Nội dung + Vận hành",
            moTa: "Trang một-trang nói bằng ngôn ngữ khách thường (không thuật ngữ chain), form đăng ký sớm — đo cầu THẬT trước khi xây.",
            platforms: ["deerflow", "sandbox", "godlp", "g3"],
            prompt: nhac(
              "dựng landing 1 trang cho hướng Web3 đã chọn: sub-agent Nội dung viết theo ngôn ngữ khách thường (cấm thuật ngữ blockchain khó); sub-agent Vận hành dựng HTML tĩnh trong sandbox kèm form đăng ký sớm.",
              "Nội dung + Vận hành",
              "file index.html xem được + 3 biến thể tiêu đề để A/B.",
            ),
          },
          {
            id: "p2-flow", ten: "Quy trình nuôi danh sách chờ (lặp hằng tuần)", team: "Marketing",
            moTa: "Biến việc lặp (đăng bài, gửi cập nhật, chăm cộng đồng) thành quy trình tái dùng — không phụ thuộc trí nhớ CEO.",
            platforms: ["flowgram", "deerflow"],
            prompt: nhac(
              "thiết kế quy trình nuôi danh sách chờ hằng tuần: lịch nội dung 4 tuần, mẫu tin nhắn cập nhật tiến độ, tiêu chí chuyển 'người chờ' thành 'khách trả tiền'.",
              "sub-agent Marketing chủ trì, Nội dung soạn mẫu",
              "1 quy trình từng bước tôi duyệt xong là chạy lặp lại được (sẽ đưa vào FlowGram).",
            ),
          },
          {
            id: "p2-chon-nen", ten: "Chọn hạ tầng: BaaS / no-code, chưa thuê dev", team: "Vận hành",
            moTa: "So sánh 2–3 nhà cung cấp (phí, chain, xuất dữ liệu, khoá chân) — nguyên tắc sách: thuê hạ tầng trước, tự xây sau.",
            platforms: ["deerflow", "sandbox", "g3", "midscene"],
            prompt: nhac(
              "lập bảng so sánh 2-3 nền tảng BaaS/no-code Web3 phù hợp hướng đã chọn cho doanh nghiệp VN: phí khởi tạo + phí giao dịch, chain hỗ trợ, dễ tích hợp, rủi ro bị khoá chân (lock-in), có xuất dữ liệu không.",
              "sub-agent Vận hành chủ trì, Nghiên cứu tra cứu",
              "bảng so sánh + 1 khuyến nghị kèm chi phí dự kiến tháng (KHÔNG tự ký hợp đồng — tôi duyệt).",
            ),
          },
          {
            id: "p2-phap-ly", ten: "⛔ Rà pháp lý trước khi đụng tiền", team: "CEO + luật sư",
            moTa: "Checklist pháp lý VN: token có giống chứng khoán? có nhận tiền công chúng? Điểm dừng BẮT BUỘC — arishem chặn mọi bước thu tiền cho tới khi xong.",
            platforms: ["arishem", "dolphin"],
            prompt: nhac(
              "chuẩn bị bộ câu hỏi làm việc với luật sư về hướng Web3 đã chọn: token của tôi có đặc điểm nào giống chứng khoán, có huy động tiền công chúng không, nghĩa vụ thuế, mẫu điều khoản người dùng. Nếu tôi upload giấy tờ doanh nghiệp thì trích xuất thông tin cần cho hồ sơ.",
              "sub-agent Kế toán + Vận hành; Dolphin đọc giấy tờ tôi upload",
              "1 bộ câu hỏi + checklist giấy tờ mang đi gặp luật sư. LƯU Ý: đây là chuẩn bị, không thay tư vấn luật.",
            ),
          },
        ],
      },
      {
        id: "pha-3", ten: "Ra mắt thử (pilot)", tuan: "Tuần 7–10",
        steps: [
          {
            id: "p3-pilot", ten: "Pilot 20–50 khách thân thiết", team: "Kinh doanh + Marketing",
            moTa: "Phát hành lô đầu (token thưởng/NFT membership) cho nhóm nhỏ; đo vòng lặp thói quen — bài học Stepn: thói quen trước, token sau.",
            platforms: ["deerflow", "flowgram", "arishem"],
            prompt: nhac(
              "lập kế hoạch pilot cho 20-50 khách thân thiết: tiêu chí chọn khách, kịch bản mời (tin nhắn mẫu), quyền lợi lô đầu, cách đo vòng lặp thói quen 4 tuần (khách quay lại vì token hay vì sản phẩm?).",
              "Kinh doanh chủ trì, Marketing soạn kịch bản mời",
              "kế hoạch pilot 4 tuần + bảng theo dõi. Mọi ưu đãi có giá trị tiền phải liệt kê để tôi duyệt trước.",
            ),
          },
          {
            id: "p3-onboard", ten: "Onboard khách không-ma-sát", team: "Vận hành + Nội dung",
            moTa: "Hướng dẫn bằng hình cho người chưa từng dùng ví; mục tiêu: khách vào được trong <3 phút, không cần hiểu blockchain.",
            platforms: ["sandbox", "deerflow", "godlp"],
            prompt: nhac(
              "soạn bộ onboard khách pilot: hướng dẫn từng bước có hình (dựng trang hướng dẫn trong sandbox), câu trả lời cho 10 câu khách chắc chắn hỏi, kịch bản hỗ trợ khi khách kẹt. Mục tiêu: khách vào <3 phút.",
              "Vận hành dựng trang, Nội dung viết",
              "trang hướng dẫn + FAQ 10 câu + kịch bản hỗ trợ.",
            ),
          },
        ],
      },
      {
        id: "pha-4", ten: "Đo & mở rộng", tuan: "Tuần 11–13",
        steps: [
          {
            id: "p4-doc-so", ten: "Đọc số pilot — quyết định 1 trong 3", team: "Kế toán + Kinh doanh",
            moTa: "Nhân rộng / sửa / dừng — quyết bằng số, không bằng cảm xúc. Doanh thu ghi vào sổ cái verified của SoloCEO.",
            platforms: ["deerflow", "flowgram", "dolphin"],
            prompt: nhac(
              "tổng kết pilot: dựng khung báo cáo (người dùng thật, giữ chân theo tuần, doanh thu phí thật quy VND, chi phí/khách, giao dịch lặp) và tiêu chí quyết định NHÂN RỘNG / SỬA / DỪNG. Nếu tôi upload hoá đơn chi phí thì bóc số liệu vào báo cáo.",
              "Kế toán chủ trì, Kinh doanh đánh giá",
              "mẫu báo cáo + ngưỡng quyết định rõ ràng cho từng lựa chọn.",
            ),
          },
          {
            id: "p4-mo-rong", ten: "Kế hoạch mở rộng + hào phòng thủ", team: "Kinh doanh",
            moTa: "Web3 không khoá được dữ liệu khách — hào của bạn là thanh khoản, thương hiệu, cộng đồng. Kế hoạch 90 ngày tiếp theo xoay quanh 3 thứ đó.",
            platforms: ["deerflow", "flowgram"],
            prompt: nhac(
              "nếu pilot đạt: lập kế hoạch 90 ngày mở rộng xoay quanh 3 hào phòng thủ của Web3 (thanh khoản, thương hiệu, cộng đồng) — mục tiêu quý, kênh, ngân sách dự kiến (chờ tôi duyệt), rủi ro khi mở rộng.",
              "Kinh doanh chủ trì, cả đội góp",
              "kế hoạch quý dạng bảng, kèm 3 chỉ số sống còn.",
            ),
          },
        ],
      },
    ],
    // troLy web3 đã gỡ (12/07): tri thức sách nằm trọn trong gói này — tránh trùng.
    appLienQuan: [
      { key: "openclaw", ten: "Trợ lý ra lệnh AI (OpenClaw)" },
      { key: "commerce-starter", ten: "Web bán hàng" },
    ],
    canhBao: [
      "Làm token trước khi có sản phẩm có người dùng thật — sai thứ tự chết người.",
      "Bắt khách trả bằng token riêng (ma sát) — mô hình đã chết từ 2017.",
      "Nhầm 'giá token tăng' với 'doanh nghiệp có doanh thu'.",
      "Gọi vốn công khai bằng token khi chưa có tư vấn luật — rủi ro pháp lý cao nhất.",
    ],
    chiSo: [
      "Người dùng hoạt động thật (loại ví rác)", "Giữ chân theo tuần", "Doanh thu phí thật (quy VND)",
      "Chi phí thu hút 1 khách", "Giao dịch lặp lại", "Thanh khoản (nếu có token)",
    ],
  },
  // Các gói khác sinh động từ factory (kho ~45 sách Business Models) —
  // trang tự merge từ /workspace/api/bm, không hardcode thêm ở đây.
];
