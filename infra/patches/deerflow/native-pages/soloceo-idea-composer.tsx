"use client";
// ⭐ Thanh khởi tạo ý tưởng — CEO gõ ý tưởng, Data Engine (bigdata.soloceo.vn) đối chiếu
// 5 kho dữ liệu đã đúc (vấn đề · giải pháp · mô hình · sản phẩm · sự kiện) rồi trả về
// mô hình kinh doanh chuẩn của riêng họ. Dùng ở trang chủ và trong workspace.
import { ArrowUpIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

const DOI_LBL: Record<string, string> = {
  van_de: "❗ Vấn đề đang xảy ra",
  giai_phap: "💡 Giải pháp đã có",
  mo_hinh: "💼 Mô hình đã có",
  san_pham: "📦 Sản phẩm đã có",
  su_kien: "📡 Sự kiện đang diễn ra",
};
const BMC_LBL: Record<string, string> = {
  phan_khuc_khach_hang: "👥 Phân khúc khách hàng",
  gia_tri_cot_loi: "💎 Giá trị cốt lõi",
  kenh_phan_phoi: "📣 Kênh phân phối",
  quan_he_khach_hang: "🤝 Quan hệ khách hàng",
  dong_doanh_thu: "💰 Dòng doanh thu",
  nguon_luc_chinh: "🧱 Nguồn lực chính",
  hoat_dong_chinh: "⚙️ Hoạt động chính",
  doi_tac_chinh: "🔗 Đối tác chính",
  co_cau_chi_phi: "📉 Cơ cấu chi phí",
};
const GOI_Y = [
  "Dịch vụ AI viết mô tả sản phẩm cho shop online",
  "Nền tảng đặt tour trải nghiệm nông nghiệp Tây Bắc",
  "Trợ lý AI làm sổ sách cho hộ kinh doanh",
];

type KetQua = {
  id: number; ten: string; tom_tat?: string; van_de?: string; giai_phap?: string; thi_truong?: string;
  doi_chieu?: Record<string, string>; bmc?: Record<string, string>;
  lo_trinh?: { giai_doan?: string; viec?: string[]; muc_tieu?: string }[];
  soloceo_stack?: string[]; luu?: string; error?: string;
};

export function SoloceoIdeaComposer({ className, dark = false, tenMacDinh = "" }:
  { className?: string; dark?: boolean; tenMacDinh?: string }) {
  const [y, setY] = useState("");
  const [ten, setTen] = useState(tenMacDinh);
  const [busy, setBusy] = useState(false);
  const [kq, setKq] = useState<KetQua | null>(null);
  const [err, setErr] = useState("");

  const chay = useCallback(async () => {
    const v = y.trim();
    if (v.length < 8) { setErr("Mô tả ý tưởng dài hơn chút nhé."); return; }
    setBusy(true); setErr(""); setKq(null);
    try {
      const r = await fetch("/workspace/api/khoi-tao", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ y_tuong: v, tac_gia: ten }),
      });
      const d = (await r.json()) as KetQua;
      if (d.error) setErr(d.error); else setKq(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Engine không phản hồi");
    } finally { setBusy(false); }
  }, [y, ten]);

  const card = dark
    ? "rounded-2xl border border-[#232326] bg-[#131315] p-4"
    : "bg-card rounded-2xl border p-4";
  const muted = dark ? "text-[#a2a2aa]" : "text-muted-foreground";

  return (
    <div className={cn("w-full", className)}>
      <div className={cn(dark ? "rounded-2xl border border-[#232326] bg-[#131315] p-3" : "bg-card rounded-2xl border p-3")}>
        <textarea
          value={y} onChange={(e) => setY(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void chay(); }}
          placeholder="Gõ ý tưởng kinh doanh của bạn — Data Engine sẽ đối chiếu vấn đề, giải pháp, mô hình, sản phẩm và sự kiện đã có để dựng mô hình kinh doanh cho riêng bạn…"
          className={cn("min-h-[84px] w-full resize-none bg-transparent px-2 py-1.5 text-[15px] outline-none",
            dark ? "text-[#f5f5f6] placeholder:text-[#6b6b73]" : "placeholder:text-muted-foreground")}
        />
        <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
          <input value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Tên bạn"
            className={cn("w-32 rounded-lg border px-2.5 py-1.5 text-[13px] outline-none",
              dark ? "border-[#232326] bg-[#0b0b0c] text-[#f5f5f6] placeholder:text-[#6b6b73]" : "bg-background")} />
          <span className={cn("text-[12px]", muted)}>{busy ? "Engine đang chạy qua 5 kho dữ liệu… (60–120 giây)" : "⌘/Ctrl + Enter để chạy"}</span>
          <button onClick={() => void chay()} disabled={busy}
            className={cn("ml-auto flex items-center gap-1.5 rounded-xl px-4 py-2 text-[14px] font-bold transition disabled:opacity-60",
              dark ? "bg-[#3fb950] text-[#0b0b0c] hover:opacity-90" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : <SparklesIcon className="size-4" />}
            {busy ? "Đang đúc…" : "Khởi tạo ý tưởng"}
            {!busy && <ArrowUpIcon className="size-3.5" />}
          </button>
        </div>
      </div>

      {!kq && !busy && (
        <div className="mt-2 flex flex-wrap gap-2">
          {GOI_Y.map((g) => (
            <button key={g} onClick={() => setY(g)}
              className={cn("rounded-full border px-3 py-1.5 text-[12.5px] transition",
                dark ? "border-[#232326] text-[#a2a2aa] hover:border-[#33333a] hover:text-[#f5f5f6]" : "hover:bg-muted text-muted-foreground")}>
              {g}
            </button>
          ))}
        </div>
      )}
      {err ? <div className="mt-2 text-[13px] text-red-500">{err}</div> : null}

      {kq ? (
        <div className="mt-5 space-y-4 text-left">
          <div>
            <div className={cn("text-[19px] font-bold", dark && "text-[#f5f5f6]")}>⭐ {kq.ten}</div>
            {kq.tom_tat ? <div className={cn("mt-1 text-[14px]", muted)}>{kq.tom_tat}</div> : null}
          </div>
          <div>
            <div className={cn("mb-2 text-[13px] font-semibold", dark && "text-[#f5f5f6]")}>🔍 Đối chiếu qua Data Engine</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(DOI_LBL).map(([k, l]) => (
                <div key={k} className={card}>
                  <div className={cn("text-[12px] font-semibold", dark && "text-[#f5f5f6]")}>{l}</div>
                  <div className={cn("mt-1 text-[12.5px] leading-relaxed", muted)}>{kq.doi_chieu?.[k] ?? "—"}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className={cn("mb-2 text-[13px] font-semibold", dark && "text-[#f5f5f6]")}>🗂 Business Model Canvas của bạn</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(BMC_LBL).map(([k, l]) => (
                <div key={k} className={card}>
                  <div className={cn("text-[12px] font-semibold", dark && "text-[#f5f5f6]")}>{l}</div>
                  <div className={cn("mt-1 text-[12.5px] leading-relaxed", muted)}>{kq.bmc?.[k] ?? "—"}</div>
                </div>
              ))}
            </div>
          </div>
          {kq.lo_trinh?.length ? (
            <div>
              <div className={cn("mb-2 text-[13px] font-semibold", dark && "text-[#f5f5f6]")}>🗺 Lộ trình triển khai</div>
              <div className="space-y-2">
                {kq.lo_trinh.map((g, i) => (
                  <div key={i} className={card}>
                    <div className={cn("text-[13px] font-semibold", dark && "text-[#f5f5f6]")}>📍 {g.giai_doan}</div>
                    <ul className={cn("mt-1 list-disc space-y-0.5 pl-5 text-[12.5px]", muted)}>
                      {(g.viec ?? []).map((v, k) => <li key={k}>{v}</li>)}
                    </ul>
                    <div className="mt-1.5 text-[12.5px] text-emerald-500">🎯 {g.muc_tieu}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className={cn("flex flex-wrap items-center gap-3 text-[13px]", muted)}>
            <span>💾 {kq.luu ?? "Đã lưu vào kho ý tưởng chung."}</span>
            <a href={`https://bigdata.soloceo.vn/#idea-${kq.id}`} target="_blank" rel="noopener"
              className="font-semibold text-emerald-500 hover:underline">Xem bản đầy đủ ↗</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
