"use client";
import { Loader2, Rocket, Check } from "lucide-react";
import { useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";

const NGANH = [
  { v: "fnb", l: "Ăn uống / F&B" }, { v: "real_estate", l: "Bất động sản" },
  { v: "education", l: "Giáo dục" }, { v: "services", l: "Dịch vụ" }, { v: "other", l: "Khác" },
];

export function SoloceoTaoDN() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("fnb");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ slug: string } | null>(null);
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
      setDone({ slug: v.slug });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-lg px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Rocket className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-semibold">Tạo doanh nghiệp</h1>
              <p className="text-muted-foreground text-sm">Khởi tạo doanh nghiệp của bạn — trợ lý AI sẽ đồng hành từ đây.</p>
            </div>
          </div>
          {done ? (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center">
              <Check className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-medium">Đã tạo doanh nghiệp!</p>
              <p className="text-muted-foreground text-sm">Mã: {done.slug}. Quay lại khung chat để giao việc cho đội ngũ AI.</p>
            </div>
          ) : (
            <div className="space-y-4">
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
