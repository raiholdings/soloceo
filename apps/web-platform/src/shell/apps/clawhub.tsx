"use client";

// Chợ kỹ năng — ClawHub (openclaw/clawhub): kho skill cho OpenClaw của bạn.
// ClawHub là registry dùng chung (clawhub.ai), nhúng iframe để CEO duyệt + cài
// skill vào trợ lý OpenClaw của mình.
const CLAWHUB_URL = process.env.NEXT_PUBLIC_CLAWHUB_URL ?? "https://clawhub.ai";

export default function ClawHubApp() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-[#A0A0B8]">
          Kho kỹ năng cho trợ lý OpenClaw — cài thêm khả năng cho AI của bạn.
        </p>
        <a
          href={CLAWHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent-soft hover:underline"
        >
          Mở tab mới ↗
        </a>
      </div>
      <iframe
        src={CLAWHUB_URL}
        title="Chợ kỹ năng ClawHub"
        className="min-h-0 flex-1 rounded-xl border border-surface-border bg-white"
      />
    </div>
  );
}
