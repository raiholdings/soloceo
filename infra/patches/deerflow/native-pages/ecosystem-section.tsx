"use client";

import MagicBento, { type BentoCardProps } from "@/components/ui/magic-bento";
import { cn } from "@/lib/utils";

import { Section } from "../section";

const COLOR = "#0a0a0a";

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      style={{ fontSize: "34px", lineHeight: 1, display: "inline-block", marginBottom: "10px" }}
    >
      {children}
    </span>
  );
}

function Dom({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        marginTop: "10px",
        fontSize: "12px",
        fontWeight: 600,
        color: "#a78bfa",
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </span>
  );
}

const platforms: BentoCardProps[] = [
  {
    color: COLOR,
    label: "Cộng đồng",
    title: (
      <>
        <Ico>🤝</Ico>
        <br />
        Cộng đồng Solo CEO
      </>
    ),
    description: (
      <>
        Mạng xã hội của các nhà sáng lập: kết nối, đăng bài, nhắn tin &amp; chat nhóm, học hỏi lẫn nhau.
        <br />
        <Dom>my.soloceo.vn</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Đào tạo",
    title: (
      <>
        <Ico>🎓</Ico>
        <br />
        Học tập &amp; Đào tạo
      </>
    ),
    description: (
      <>
        Khoá học, ebook và chứng chỉ vận hành doanh nghiệp — nền tảng LMS riêng cho Solo CEO.
        <br />
        <Dom>edu.soloceo.vn</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Họp video",
    title: (
      <>
        <Ico>🎥</Ico>
        <br />
        Họp video &amp; Hội thảo
      </>
    ),
    description: (
      <>
        Họp trực tuyến HD, chia sẻ màn hình, bảng trắng, ghi hình — không cần cài đặt, gửi 1 liên kết là họp.
        <br />
        <Dom>meeting.soloceo.vn</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Chăm sóc khách hàng",
    title: (
      <>
        <Ico>💬</Ico>
        <br />
        Chatbot &amp; CSKH
      </>
    ),
    description: (
      <>
        Hộp thoại hỗ trợ khách hàng đa kênh (web, mạng xã hội) với chatbot tự động 24/7.
        <br />
        <Dom>chat.soloceo.vn</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Quản lý khách hàng",
    title: (
      <>
        <Ico>📇</Ico>
        <br />
        CRM khách hàng
      </>
    ),
    description: (
      <>
        Quản lý khách hàng, lead, hoá đơn, dự án và công việc — trợ lý AI thao tác trực tiếp trên CRM của bạn.
        <br />
        <Dom>crm.soloceo.vn</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Nhân sự AI",
    title: (
      <>
        <Ico>🧑‍💼</Ico>
        <br />
        Đội ngũ AI vận hành
      </>
    ),
    description: (
      <>
        Kinh doanh, Marketing, Nội dung, Vận hành, Kế toán — cả một đội nhân sự AI làm việc thật cho bạn.
        <br />
        <Dom>soloceo.vn/workspace</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Bán hàng đa kênh",
    title: (
      <>
        <Ico>🛒</Ico>
        <br />
        Thị trường 53 kênh
      </>
    ),
    description: (
      <>
        Kết nối TMĐT, mạng xã hội, quảng cáo, thanh toán, vận chuyển, POS, kế toán — vận hành bán hàng một chỗ.
        <br />
        <Dom>trong Workspace</Dom>
      </>
    ),
  },
  {
    color: COLOR,
    label: "Tăng trưởng",
    title: (
      <>
        <Ico>🚀</Ico>
        <br />
        Mô hình KD &amp; Phễu bán hàng
      </>
    ),
    description: (
      <>
        Thư viện mô hình kinh doanh và công cụ dựng phễu bán hàng — biến ý tưởng thành doanh thu.
        <br />
        <Dom>trong Workspace</Dom>
      </>
    ),
  },
];

export function EcosystemSection({ className }: { className?: string }) {
  return (
    <Section
      className={cn("", className)}
      title="Hệ sinh thái nền tảng SoloCEO"
      subtitle="Một tài khoản — trọn bộ nền tảng để một mình vận hành cả một doanh nghiệp."
    >
      <div className="flex w-full items-center justify-center">
        <MagicBento data={platforms} />
      </div>
    </Section>
  );
}
