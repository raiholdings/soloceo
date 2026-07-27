"use client";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";

// Gói Workspace — mỗi gói KÈM MỘT HOSTING riêng, giống Google Workspace: trả một khoản
// hằng tháng là có cả hạ tầng lẫn bộ phần mềm. Khác ở chỗ Google cho công cụ văn phòng,
// còn đây cho một chỗ đứng thật trên Internet (tên miền riêng) và bộ nền tảng vận hành.
//
// Vì sao hosting nằm TRONG gói: một Solo CEO mua CRM về mà không có chỗ chạy thì phần mềm
// đó vô dụng. Bán riêng hai thứ là đẩy phần khó nhất về phía người ít khả năng làm nhất.
//
// Số subdomain tính từ RAM THẬT của các nền tảng đang chạy (Perfex ~600MB, Support Board
// ~500MB, Academy ~900MB), không phải con số cho đẹp quảng cáo.
const PLANS = [
  {
    key: "STARTER", label: "Khởi đầu", price: "3.000.000",
    hosting: "2 vCPU · 4 GB RAM · 60 GB NVMe",
    pitch: [
      "Hosting riêng + gắn tên miền của bạn",
      "3 subdomain cho nền tảng bạn chọn",
      "Triển khai 1 ý tưởng thành doanh nghiệp thật",
      "Dùng miễn phí: CRM · Chat đa kênh · Cộng đồng",
      "Đội AI dựng website bán hàng và vận hành",
      "Mọi việc chi tiền đều cần bạn duyệt · phí giao dịch 3%",
    ],
  },
  {
    key: "GROWTH", label: "Tăng trưởng", price: "5.000.000", noiBat: true,
    hosting: "4 vCPU · 8 GB RAM · 120 GB NVMe",
    pitch: [
      "Mọi thứ ở Khởi đầu, hosting gấp đôi",
      "8 subdomain · triển khai 3 ý tưởng song song",
      "Thêm miễn phí: Đào tạo · Video · Nhóm chat · Họp video",
      "Ngân sách AI gấp 4 lần",
      "Niêm yết bán lại trên Sàn M&A (phí thành công 8%)",
      "Ưu tiên hàng đợi khi Đội AI dựng sản phẩm · phí giao dịch 2%",
    ],
  },
  {
    key: "SCALE", label: "Bứt phá", price: "9.000.000",
    hosting: "8 vCPU · 16 GB RAM · 240 GB NVMe",
    pitch: [
      "3 website chính riêng tên miền · subdomain không giới hạn",
      "Triển khai không giới hạn số ý tưởng",
      "Toàn bộ 9 nền tảng cộng đồng + ưu tiên tài nguyên",
      "Ngân sách AI cao nhất, mua thêm theo nhu cầu",
      "Sàn M&A phí thành công 5% · phí giao dịch 1,5%",
      "Hỗ trợ trực tiếp từ kiến trúc sư đề án",
    ],
  },
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
                  {/* Cấu hình hosting hiện ngay dưới giá: đây là thứ phân biệt gói rõ nhất
                      và cũng là thứ người mua so sánh đầu tiên. Giấu xuống dưới thì họ
                      tưởng ba gói chỉ khác nhau ở số tính năng. */}
                  <div className="mt-1.5 rounded-lg border border-emerald-600/25 bg-emerald-600/5 px-2.5 py-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    Hosting kèm theo · {p.hosting}
                  </div>
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
