"use client";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";

const PLANS = [
  { key: "STARTER", label: "Khởi đầu", price: "299.000", pitch: ["1 doanh nghiệp + trợ lý AI điều hành", "Bộ 6 nhân sự AI đầy đủ phòng ban", "Web bán hàng + danh bạ", "Phê duyệt an toàn: bạn chốt mọi việc chi tiền"] },
  { key: "GROWTH", label: "Tăng trưởng", price: "990.000", pitch: ["Mọi thứ ở Khởi đầu", "Ngân sách AI gấp 10 lần", "Niêm yết bán lại trên Sàn M&A", "Phí giao dịch 2%"] },
  { key: "SCALE", label: "Bứt phá", price: "2.900.000", pitch: ["Tối đa 3 doanh nghiệp", "Ưu tiên tài nguyên", "Ngân sách AI cao nhất", "Phí giao dịch 1.5% · M&A 5%"] },
];

export function SoloceoGoi() {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => { void soloceoApi<{ plan: string }>("/orgs/me").then((o) => setCurrent(o.plan)).catch(() => {}); }, []);
  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Gói cước</h1>
          <p className="text-muted-foreground text-sm">Đội ngũ 6 nhân sự AI làm việc 24/7, bạn giữ quyền phê duyệt mọi việc chi tiền.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.key} className={`rounded-lg border p-4 ${current === p.key ? "border-emerald-500 ring-1 ring-emerald-500" : ""}`}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{p.label}</span>
                  {current === p.key && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Đang dùng</span>}
                </div>
                <div className="mt-1 text-2xl font-bold">{p.price}<span className="text-muted-foreground text-sm font-normal">đ/tháng</span></div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {p.pitch.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{x}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4 text-xs">Thanh toán kích hoạt sẽ mở khi go-live. Liên hệ để nâng gói.</p>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
