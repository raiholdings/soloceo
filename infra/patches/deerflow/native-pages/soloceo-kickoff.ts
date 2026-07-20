"use client";
// SoloCEO OS v2 — "Khởi động doanh nghiệp": biến việc tạo DN thành hành trình
// có dẫn dắt. Sau khi tạo Org+Venture, CEO thấy BẢNG KHỞI ĐỘNG (các bước theo
// ngành). Mỗi bước là 1 thẻ → bấm "Bắt đầu" → nạp lời nhắc vào 1 thread mới của
// DeerFlow (lead_agent + 6 sub-agent chạy trong sandbox live, có HITL khi cần).
//
// Cơ chế: lưu lời nhắc vào sessionStorage rồi điều hướng sang /workspace/chats/new.
// ChatPage đọc key này 1 lần và tự gửi (xem patch trong app/workspace/chats/[thread_id]/page.tsx).

export const KICKOFF_KEY = "deer-flow:soloceo-kickoff";

export type KickoffStep = {
  id: string;
  title: string;
  team: string; // sub-agent phụ trách
  desc: string;
  /** Lời nhắc gửi lead_agent khi CEO bấm "Bắt đầu". */
  prompt: (ventureName: string, industryLabel: string) => string;
};

const COMMON_STEPS: KickoffStep[] = [
  {
    id: "landing",
    title: "Dựng nhận diện + landing bán hàng",
    team: "Nội dung + Vận hành",
    desc: "Đội AI dựng trang bán hàng đầu tiên trong sandbox: bố cục, nội dung, nút liên hệ.",
    prompt: (name, ind) =>
      `Hãy khởi động doanh nghiệp "${name}" (ngành: ${ind}). Bước 1 — DỰNG LANDING BÁN HÀNG: ` +
      `phân công sub-agent Nội dung viết tiêu đề + mô tả + 3 lợi ích + lời kêu gọi hành động bằng tiếng Việt; ` +
      `sub-agent Vận hành dựng 1 trang HTML tĩnh trong sandbox (index.html có form liên hệ) và cho tôi xem kết quả. ` +
      `Làm từng bước, giải thích ngắn gọn bằng tiếng Việt.`,
  },
  {
    id: "plan30",
    title: "Kế hoạch bán hàng 30 ngày",
    team: "Kinh doanh",
    desc: "Lập lộ trình 30 ngày: mục tiêu tuần, kênh, hành động, chỉ số cần theo dõi.",
    prompt: (name, ind) =>
      `Doanh nghiệp "${name}" (ngành: ${ind}). Bước 2 — KẾ HOẠCH BÁN HÀNG 30 NGÀY: ` +
      `sub-agent Kinh doanh lập bảng kế hoạch 4 tuần (mục tiêu, kênh, hành động mỗi tuần, chỉ số đo). ` +
      `Trình bày dạng bảng tiếng Việt, đề xuất 1 việc làm ngay hôm nay.`,
  },
  {
    id: "channel",
    title: "Chuẩn bị kênh bán (Zalo / mạng xã hội)",
    team: "Marketing",
    desc: "Xác định kênh chính, soạn bài giới thiệu đầu tiên, lịch đăng tuần đầu.",
    prompt: (name, ind) =>
      `Doanh nghiệp "${name}" (ngành: ${ind}). Bước 3 — CHUẨN BỊ KÊNH BÁN: ` +
      `sub-agent Marketing đề xuất kênh chính phù hợp ngành, soạn 1 bài giới thiệu ra mắt (tiếng Việt) và ` +
      `lịch đăng 7 ngày đầu. Nếu cần thao tác web công khai để khảo sát, dùng chế độ Assist (tôi xác nhận).`,
  },
  {
    id: "accounting",
    title: "Thiết lập kế toán cơ bản + dòng tiền",
    team: "Kế toán",
    desc: "Khung theo dõi thu–chi, phân loại chi phí, chuẩn bị ghi sổ doanh thu.",
    prompt: (name, ind) =>
      `Doanh nghiệp "${name}" (ngành: ${ind}). Bước 4 — KẾ TOÁN CƠ BẢN: ` +
      `sub-agent Kế toán lập khung theo dõi thu–chi tháng đầu (các nhóm chi phí, cách ghi nhận doanh thu), ` +
      `giải thích cách nối vào sổ cái doanh thu của nền tảng. Bảng tiếng Việt, đơn giản để tôi dùng ngay.`,
  },
];

// Bổ sung bước đặc thù theo ngành (đặt lên đầu bảng).
const INDUSTRY_EXTRA: Record<string, KickoffStep> = {
  fnb: {
    id: "menu",
    title: "Dựng thực đơn + bảng giá",
    team: "Nội dung",
    desc: "Soạn thực đơn mẫu, mô tả món hấp dẫn, gợi ý combo bán chạy.",
    prompt: (name) =>
      `Quán "${name}" (F&B). Bước đặc thù — DỰNG THỰC ĐƠN: sub-agent Nội dung soạn thực đơn mẫu 8–12 món ` +
      `kèm mô tả hấp dẫn và 2 combo gợi ý, định dạng bảng tiếng Việt.`,
  },
  real_estate: {
    id: "listing",
    title: "Mẫu tin đăng bất động sản",
    team: "Nội dung",
    desc: "Khung tin đăng chuẩn: tiêu đề, điểm nổi bật, pháp lý, lời kêu gọi.",
    prompt: (name) =>
      `Doanh nghiệp BĐS "${name}". Bước đặc thù — MẪU TIN ĐĂNG: sub-agent Nội dung tạo khung tin đăng chuẩn ` +
      `(tiêu đề, 5 điểm nổi bật, ghi chú pháp lý, lời kêu gọi liên hệ) để tái dùng cho mọi sản phẩm.`,
  },
  education: {
    id: "course",
    title: "Khung chương trình / khoá học",
    team: "Nội dung",
    desc: "Phác thảo lộ trình học, buổi học, kết quả đầu ra cho học viên.",
    prompt: (name) =>
      `Doanh nghiệp giáo dục "${name}". Bước đặc thù — KHUNG KHOÁ HỌC: sub-agent Nội dung phác thảo 1 khoá học ` +
      `(mục tiêu, 6–8 buổi, kết quả đầu ra) trình bày bảng tiếng Việt.`,
  },
};

export function stepsForIndustry(industry: string): KickoffStep[] {
  const extra = INDUSTRY_EXTRA[industry];
  return extra ? [extra, ...COMMON_STEPS] : COMMON_STEPS;
}

/** Lưu lời nhắc và điều hướng sang thread mới để lead_agent chạy bước này. */
export function startKickoff(
  step: KickoffStep,
  ventureName: string,
  industryLabel: string,
) {
  try {
    sessionStorage.setItem(
      KICKOFF_KEY,
      JSON.stringify({
        text: step.prompt(ventureName, industryLabel),
        ventureName,
        stepId: step.id,
      }),
    );
  } catch {
    // sessionStorage có thể bị chặn — vẫn điều hướng, CEO tự gõ.
  }
  // Dùng location thay router.push để chắc chắn ChatPage mount lại và đọc key.
  window.location.assign("/workspace/chats/new");
}

// ── Mẫu dự án (marketplace) → dựng trong workspace ──────────────────────────
export type ProjectTemplate = {
  slug: string;
  name: string;
  summary?: string;
  industry?: string;
  priceVnd: string | number;
  monthlyFeeVnd?: string | number;
  demoUrl?: string;
  components?: Record<string, unknown>;
};

/** Nạp lời nhắc "dựng dự án theo mẫu" vào 1 thread mới của DeerFlow. */
export function startTemplateKickoff(t: ProjectTemplate) {
  const free = Number(t.priceVnd) === 0;
  const src = t.demoUrl ? ` (mã nguồn tham khảo: ${t.demoUrl})` : "";
  const text = free
    ? `Tôi muốn dựng dự án theo mẫu "${t.name}"${src}. Mô tả: ${t.summary ?? ""}. ` +
      `Hãy: (1) tóm tắt mẫu này giúp doanh nghiệp một người làm được gì; (2) hỏi tôi các thông tin doanh nghiệp cần thiết; ` +
      `(3) phân công sub-agent dựng phiên bản chạy được, nối vào cổng AI LiteLLM của SoloCEO; (4) hướng dẫn tôi từng bước bằng tiếng Việt.`
    : `Tôi quan tâm mẫu doanh nghiệp "${t.name}"${src}. Mô tả: ${t.summary ?? ""}. ` +
      `Hãy phân tích mô hình, liệt kê thành phần cần có và lập kế hoạch dựng/tiếp quản, hướng dẫn tôi bằng tiếng Việt.`;
  try {
    sessionStorage.setItem(KICKOFF_KEY, JSON.stringify({ text, templateSlug: t.slug }));
  } catch {
    /* sessionStorage bị chặn — vẫn điều hướng, CEO tự gõ */
  }
  window.location.assign("/workspace/chats/new");
}
