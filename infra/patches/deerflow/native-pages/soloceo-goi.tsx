"use client";
import { Check, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  const loadOrg = () =>
    soloceoApi<{ plan: string }>("/orgs/me").then((o) => setCurrent(o.plan)).catch(() => {});

  useEffect(() => {
    void loadOrg();
    // Quay lại từ PayOS: ?paid=1 (đã trả) | ?cancel=1 (huỷ).
    const q = new URLSearchParams(window.location.search);
    if (q.get("paid") === "1") {
      setNotice({ kind: "ok", text: "Đã nhận thanh toán. Gói của bạn sẽ kích hoạt trong giây lát." });
      let n = 0;
      const t = setInterval(() => { n += 1; void loadOrg(); if (n >= 6) clearInterval(t); }, 2500);
    } else if (q.get("cancel") === "1") {
      setNotice({ kind: "warn", text: "Bạn đã huỷ thanh toán. Có thể thử lại bất cứ lúc nào." });
    }
    if (q.get("paid") || q.get("cancel")) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function subscribe(planKey: string) {
    setNotice(null);
    setLoading(planKey);
    try {
      const r = await soloceoApi<{ checkoutUrl?: string }>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ type: "subscription", plan: planKey, provider: "payos" }),
      });
      if (r?.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
      setNotice({ kind: "warn", text: "Không tạo được phiên thanh toán. Vui lòng thử lại." });
    } catch (e) {
      setNotice({ kind: "warn", text: (e as Error).message || "Lỗi tạo thanh toán." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 className="text-xl font-semibold">Gói cước</h1>
          <p className="text-muted-foreground text-sm">Đội ngũ 6 nhân sự AI làm việc 24/7, bạn giữ quyền phê duyệt mọi việc chi tiền. Thanh toán trực tiếp bằng PayOS (QR chuyển khoản ngân hàng).</p>
          {notice && (
            <div className={`mt-4 rounded-md px-3 py-2 text-sm ${notice.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{notice.text}</div>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => {
              const isCurrent = current === p.key;
              return (
                <div key={p.key} className={`flex flex-col rounded-lg border p-4 ${isCurrent ? "border-emerald-500 ring-1 ring-emerald-500" : ""}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{p.label}</span>
                    {isCurrent && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Đang dùng</span>}
                  </div>
                  <div className="mt-1 text-2xl font-bold">{p.price}<span className="text-muted-foreground text-sm font-normal">đ/tháng</span></div>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                    {p.pitch.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{x}</li>)}
                  </ul>
                  <button
                    type="button"
                    disabled={isCurrent || loading !== null}
                    onClick={() => subscribe(p.key)}
                    className={`mt-4 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${isCurrent ? "cursor-default bg-emerald-50 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"}`}
                  >
                    {loading === p.key && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isCurrent ? "Đang sử dụng" : loading === p.key ? "Đang tạo QR…" : "Đăng ký / Nâng gói"}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-muted-foreground mt-4 text-xs">Thanh toán qua PayOS — quét QR bằng app ngân hàng. Gói tự kích hoạt ngay sau khi chuyển khoản thành công, không cần dùng gói Pro của my.soloceo.vn.</p>
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
