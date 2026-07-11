"use client";
import { Loader2, Rocket, Check, Play, ArrowRight } from "lucide-react";
import { useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";
import { startKickoff, stepsForIndustry } from "@/components/workspace/soloceo-kickoff";

const NGANH = [
  { v: "fnb", l: "Ăn uống / F&B" }, { v: "real_estate", l: "Bất động sản" },
  { v: "education", l: "Giáo dục" }, { v: "services", l: "Dịch vụ" }, { v: "other", l: "Khác" },
];
const nganhLabel = (v: string) => NGANH.find((n) => n.v === v)?.l ?? v;

export function SoloceoTaoDN() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("fnb");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ slug: string; name: string; industry: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      // Đảm bảo có Org (1 CEO = 1 Org). /orgs/me trả 404 nếu chưa có.
      let org = await soloceoApi<{ id: string }>("/orgs/me").catch(() => null);
      if (!org) org = await soloceoApi<{ id: string }>("/orgs", { method: "POST", body: JSON.stringify({ name: name.trim(), plan: "STARTER" }) });
      const slug = name.trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const v = await soloceoApi<{ slug: string }>("/ventures", { method: "POST", body: JSON.stringify({ name: name.trim(), slug, industry, description: desc.trim() || undefined }) });
      setDone({ slug: v.slug, name: name.trim(), industry });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Rocket className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-semibold">{done ? `Khởi động ${done.name}` : "Tạo doanh nghiệp"}</h1>
              <p className="text-muted-foreground text-sm">
                {done ? "Chọn bước đầu tiên — đội ngũ AI sẽ bắt tay làm ngay trong phiên chat." : "Khởi tạo doanh nghiệp của bạn — trợ lý AI sẽ đồng hành từ đây."}
              </p>
            </div>
          </div>

          {done ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/40">
                <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                <span>Đã tạo doanh nghiệp <b>{done.name}</b> (mã {done.slug}). Đây là <b>bảng khởi động</b> gợi ý theo ngành {nganhLabel(done.industry)}.</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {stepsForIndustry(done.industry).map((step, i) => (
                  <div key={step.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{i + 1}</span>
                      <span className="text-xs font-medium text-emerald-600">{step.team}</span>
                    </div>
                    <h3 className="font-semibold leading-snug">{step.title}</h3>
                    <p className="text-muted-foreground mt-1 flex-1 text-sm">{step.desc}</p>
                    <button
                      onClick={() => startKickoff(step, done.name, nganhLabel(done.industry))}
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <Play className="h-3.5 w-3.5" /> Bắt đầu
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-1 text-sm">
                <a href="/workspace/doanh-nghiep" className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline dark:text-emerald-400">
                  Xem bảng điều hành doanh nghiệp <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => { setDone(null); setName(""); setDesc(""); }} className="text-muted-foreground hover:underline">
                  Tạo doanh nghiệp khác
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-lg space-y-4">
              <div>
                <label className="text-sm font-medium">Tên doanh nghiệp</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tiệm bánh ngọt An"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-medium">Ngành</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm">
                  {NGANH.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Mô tả (tuỳ chọn)</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button disabled={busy || !name.trim()} onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Tạo doanh nghiệp
              </button>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
