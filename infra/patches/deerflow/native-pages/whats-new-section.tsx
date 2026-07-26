"use client";

import MagicBento, { type BentoCardProps } from "@/components/ui/magic-bento";
import { cn } from "@/lib/utils";

import { Section } from "../section";

const COLOR = "#0a0a0a";

// Icon lớn hiển thị đầu mỗi thẻ (dùng emoji làm "hình ảnh" nhẹ, không cần asset ngoài).
function Ico({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      style={{
        fontSize: "34px",
        lineHeight: 1,
        display: "inline-block",
        marginBottom: "10px",
      }}
    >
      {children}
    </span>
  );
}

const features: BentoCardProps[] = [
  {
    color: COLOR,
    label: "Bộ nhớ thông minh",
    title: (
      <>
        <Ico>🧠</Ico>
        <br />
        Ghi nhớ ngắn hạn &amp; dài hạn
      </>
    ),
    description:
      "Trợ lý ngày càng hiểu rõ anh/chị và doanh nghiệp qua từng lần trò chuyện — không phải nhắc lại từ đầu.",
  },
  {
    color: COLOR,
    label: "Chạy việc dài hơi",
    title: (
      <>
        <Ico>🗺️</Ico>
        <br />
        Lập kế hoạch &amp; chia nhỏ việc
      </>
    ),
    description:
      "Suy nghĩ trước, phân tích việc phức tạp rồi thực thi tuần tự hoặc song song cho tới khi xong.",
  },
  {
    color: COLOR,
    label: "Mở rộng linh hoạt",
    title: (
      <>
        <Ico>🧩</Ico>
        <br />
        Kỹ năng &amp; Công cụ
      </>
    ),
    description:
      "Cắm thêm, hoán đổi công cụ tuỳ ý. Tự tạo trợ lý AI đúng nhu cầu của doanh nghiệp bạn.",
  },
  {
    color: COLOR,
    label: "Môi trường thực thi",
    title: (
      <>
        <Ico>🖥️</Ico>
        <br />
        Sandbox có hệ thống tệp
      </>
    ),
    description:
      "Đọc, ghi, chạy lệnh — như một máy tính thật, chạy trong môi trường cô lập an toàn.",
  },
  {
    color: COLOR,
    label: "Đa mô hình AI",
    title: (
      <>
        <Ico>🔀</Ico>
        <br />
        Nhiều mô hình mạnh
      </>
    ),
    description:
      "Claude, GPT, Gemini… chọn mô hình phù hợp từng tác vụ, chi phí đo được minh bạch.",
  },
  {
    color: COLOR,
    label: "Tự chủ hoàn toàn",
    title: (
      <>
        <Ico>🔓</Ico>
        <br />
        Mã nguồn mở, tự vận hành
      </>
    ),
    description:
      "Toàn quyền kiểm soát dữ liệu, tự lưu trữ trên hạ tầng của chính bạn.",
  },
];

export function WhatsNewSection({ className }: { className?: string }) {
  return (
    <Section
      className={cn("", className)}
      title="Trợ lý AI SoloCEO mạnh ở điểm nào?"
      subtitle="Không chỉ trả lời — trợ lý thực sự lập kế hoạch, dùng công cụ và làm việc cho doanh nghiệp một người của bạn."
    >
      <div className="flex w-full items-center justify-center">
        <MagicBento data={features} />
      </div>
    </Section>
  );
}
