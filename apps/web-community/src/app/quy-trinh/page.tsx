"use client";
import dynamic from "next/dynamic";

// FlowGram thao tác DOM/canvas → CSR-only.
const FlowCanvas = dynamic(() => import("./FlowCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-[#A0A0B8]">
      Đang tải canvas quy trình…
    </div>
  ),
});

export default function QuyTrinhPage() {
  return <FlowCanvas />;
}
