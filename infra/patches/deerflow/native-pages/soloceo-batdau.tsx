"use client";
// "Bắt đầu" — cổng phân nhập dữ liệu ý tưởng sau đăng nhập (từ nút Bắt đầu ngay
// trang chủ): khai báo doanh nghiệp → tạo Org+Venture → AI đánh giá ý tưởng →
// ghép gói Mô hình kinh doanh + trợ lý AI + nền tảng PHÙ HỢP → chỉ setup phần
// liên quan vào workspace của CEO (lưu soloceo-setup để dashboard cá nhân hoá).
import { ArrowRight, Bot, CheckCircle2, Lightbulb, Loader2, Rocket, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";
import { KICKOFF_KEY } from "@/components/workspace/soloceo-kickoff";
import { useSearchParams } from "next/navigation";
import { PLATFORMS, type PlatformKey } from "@/components/workspace/soloceo-business-models";

const NGANH = [
  { v: "fnb", l: "Ăn uống / F&B" }, { v: "real_estate", l: "Bất động sản" },
  { v: "education", l: "Giáo dục" }, { v: "services", l: "Dịch vụ" },
  { v: "commerce", l: "Bán lẻ / TMĐT" }, { v: "tech", l: "Công nghệ" }, { v: "other", l: "Khác" },
];

type KetQua = {
  danhGia: string; diem: number;
  goiPhuHop: { id: string; lyDo: string }[];
  troLyPhuHop: { name: string; lyDo: string }[];
  nenTang: { key: string; vaiTro: string }[];
  buocDauTien: string;
};

export function SoloceoBatDau() {
  const [step, setStep] = useState<"form" | "danh-gia" | "ket-qua">("form");
  const [f, setF] = useState({ tenDN: "", nganh: "services", yTuong: "", vonKhoiDiem: "", kenhBan: "", mucTieu: "" });
  const [kq, setKq] = useState<KetQua | null>(null);
  const [goiTen, setGoiTen] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [tplName, setTplName] = useState<string | null>(null);
  const tplRef = useRef<{ name: string; demoUrl?: string } | null>(null);
  const sp = useSearchParams();
  useEffect(() => {
    const slug = sp.get("tpl");
    if (!slug) return;
    fetch("https://api.soloceo.vn/v1/marketplace/project-templates/" + encodeURIComponent(slug))
      .then((r) => r.json())
      .then((t) => {
        if (!t || !t.slug) return;
        tplRef.current = { name: t.name, demoUrl: t.demoUrl };
        setTplName(t.name);
        const MAP: Record<string, string> = { "du-lich": "services", fnb: "fnb", "giao-duc": "education", "bat-dong-san": "real_estate", "ban-le": "commerce", "dich-vu": "services", "tai-chinh": "services", "cong-nghe": "tech", "thuong-mai": "commerce", khac: "other" };
        setF((c) => ({ ...c, tenDN: c.tenDN || t.name, nganh: MAP[t.industry as string] ?? "services", yTuong: c.yTuong || ((t.summary ?? "") + (t.demoUrl ? "\n\nDựng theo mẫu: " + t.name + " (" + t.demoUrl + ")" : "")) }));
      })
      .catch(() => { /* bỏ qua */ });
  }, [sp]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((c) => ({ ...c, [k]: e.target.value }));

  async function submit() {
    if (!f.tenDN.trim() || f.yTuong.trim().length < 20) {
      setErr("Điền tên doanh nghiệp và mô tả ý tưởng (ít nhất 1-2 câu) nhé."); return;
    }
    setErr(null); setStep("danh-gia");
    try {
      // 1) Org + Venture (idempotent: đã có org thì dùng lại)
      let org = await soloceoApi<{ id: string }>("/orgs/me").catch(() => null);
      if (!org) org = await soloceoApi<{ id: string }>("/orgs", { method: "POST", body: JSON.stringify({ name: f.tenDN.trim(), plan: "STARTER" }) });
      const slug = f.tenDN.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      await soloceoApi("/ventures", { method: "POST", body: JSON.stringify({ name: f.tenDN.trim(), slug, industry: f.nganh, description: f.yTuong.trim().slice(0, 900) }) }).catch(() => null);
      // 2) catalog gói BM (động)
      const bm = await fetch("/workspace/api/bm", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ models: [] }));
      const cacGoi = (bm.models ?? []).map((m: { id: string; ten: string; tagline?: string }) => ({ id: m.id, ten: m.ten, tagline: m.tagline }));
      cacGoi.unshift({ id: "web3-business-models", ten: "Web 3.0 Business Models", tagline: "Token hoá, NFT, truy xuất nguồn gốc" });
      setGoiTen(Object.fromEntries(cacGoi.map((g: { id: string; ten: string }) => [g.id, g.ten])));
      // 3) đánh giá
      const r = await soloceoApi<{ ok: boolean; ketQua?: KetQua; loi?: string }>("/onboard/danh-gia", {
        method: "POST",
        body: JSON.stringify({ ...f, cacGoi }),
      });
      if (!r.ok || !r.ketQua) throw new Error(r.loi ?? "Đánh giá thất bại");
      setKq(r.ketQua);
      // 4) lưu setup cá nhân hoá cho workspace
      try { localStorage.setItem("soloceo-setup", JSON.stringify({ ...r.ketQua, tenDN: f.tenDN, luc: Date.now() })); } catch { /* bỏ qua */ }
      setStep("ket-qua");
    } catch (e) {
      setErr((e as Error).message); setStep("form");
    }
  }

  function giaoViecDau() {
    if (!kq) return;
    try {
      sessionStorage.setItem(KICKOFF_KEY, JSON.stringify({
        text: `Doanh nghiệp của tôi: "${f.tenDN}" (${f.nganh}). Ý tưởng: ${f.yTuong.slice(0, 500)}. ` +
          (tplRef.current ? `Tôi muốn DỰNG THEO MẪU "${tplRef.current.name}"${tplRef.current.demoUrl ? " (mã nguồn tham khảo: " + tplRef.current.demoUrl + ")" : ""}. ` : "") +
          `Việc đầu tiên: ${kq.buocDauTien} — hãy bắt tay làm ngay, phân công sub-agent phù hợp, kết quả cụ thể dùng được, tiếng Việt.`,
      }));
    } catch { /* bỏ qua */ }
    window.location.assign("/workspace/chats/new");
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          {step === "form" && (
            <>
              <div className="mb-6 flex items-center gap-3">
                <Rocket className="h-6 w-6 text-emerald-600" />
                <div>
                  <h1 className="text-xl font-semibold">Bắt đầu — kể ý tưởng của bạn</h1>
                  <p className="text-muted-foreground text-sm">AI sẽ đánh giá và setup workspace đúng thứ bạn cần: mô hình, trợ lý, công cụ.</p>
                  {tplName && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✦ Đang dựng theo mẫu: {tplName}</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tên doanh nghiệp *</label>
                  <input value={f.tenDN} onChange={set("tenDN")} placeholder="Tiệm bánh ngọt An"
                    className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Ngành</label>
                    <select value={f.nganh} onChange={set("nganh")} className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm">
                      {NGANH.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Vốn khởi điểm (ước)</label>
                    <input value={f.vonKhoiDiem} onChange={set("vonKhoiDiem")} placeholder="vd: 50 triệu"
                      className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ý tưởng kinh doanh * <span className="text-muted-foreground font-normal">(bán gì, cho ai, khác gì người khác)</span></label>
                  <textarea value={f.yTuong} onChange={set("yTuong")} rows={4} placeholder="vd: Bánh ngọt healthy giao tận nhà cho dân văn phòng quận 1, đặt trước qua Zalo, nguyên liệu organic..."
                    className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Kênh bán dự kiến</label>
                    <input value={f.kenhBan} onChange={set("kenhBan")} placeholder="vd: Zalo, Facebook, cửa hàng"
                      className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mục tiêu 6 tháng</label>
                    <input value={f.mucTieu} onChange={set("mucTieu")} placeholder="vd: 100 đơn/tháng"
                      className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm" />
                  </div>
                </div>
                {err && <p className="text-sm text-red-600">{err}</p>}
                <button onClick={() => void submit()}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
                  <Sparkles className="h-4 w-4" /> Tạo doanh nghiệp & đánh giá ý tưởng
                </button>
              </div>
            </>
          )}

          {step === "danh-gia" && (
            <div className="py-20 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
              <p className="mt-4 font-medium">Đội cố vấn AI đang đánh giá ý tưởng của bạn…</p>
              <p className="text-muted-foreground mt-1 text-sm">Ghép mô hình kinh doanh, chọn trợ lý, sắp công cụ (~20 giây)</p>
            </div>
          )}

          {step === "ket-qua" && kq && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <h1 className="text-xl font-semibold">Workspace của {f.tenDN} đã sẵn sàng</h1>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="mb-1 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">Đánh giá ý tưởng: {kq.diem}/10</span>
                </div>
                <p className="text-sm leading-relaxed">{kq.danhGia}</p>
              </div>

              {kq.goiPhuHop.length > 0 && (
                <div>
                  <h2 className="mb-2 flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-emerald-600" /> Mô hình kinh doanh hợp với bạn</h2>
                  <div className="space-y-2">
                    {kq.goiPhuHop.map((g) => (
                      <a key={g.id} href="/workspace/mo-hinh-kinh-doanh" className="block rounded-lg border bg-card p-3 text-sm transition hover:border-emerald-400">
                        <span className="font-medium">{goiTen[g.id] ?? g.id}</span>
                        <span className="text-muted-foreground"> — {g.lyDo}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {kq.troLyPhuHop.length > 0 && (
                <div>
                  <h2 className="mb-2 flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-emerald-600" /> Đội trợ lý AI cho ý tưởng này</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {kq.troLyPhuHop.map((t) => (
                      <a key={t.name} href="/workspace/agents" className="rounded-lg border bg-card p-3 text-sm transition hover:border-emerald-400">
                        <span className="font-medium">{t.name.replace(/^cv-/, "").replace(/-/g, " ")}</span>
                        <p className="text-muted-foreground mt-0.5 text-xs">{t.lyDo}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {kq.nenTang.length > 0 && (
                <div>
                  <h2 className="mb-2 font-semibold">Công cụ nền tảng sẽ phục vụ bạn</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {kq.nenTang.map((n) => (
                      <div key={n.key} className="rounded-lg border bg-card p-3 text-sm">
                        <span className="font-semibold text-violet-700 dark:text-violet-300">{PLATFORMS[n.key as PlatformKey]?.ten ?? n.key}</span>
                        <span className="text-muted-foreground"> — {n.vaiTro}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-sm"><b>Việc nên giao cho đội AI ngay:</b> {kq.buocDauTien}</p>
                <button onClick={giaoViecDau}
                  className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                  Giao cho đội AI làm ngay <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
