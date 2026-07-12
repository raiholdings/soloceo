"use client";
// Phễu bán hàng — feature ngang Mô hình kinh doanh. CEO nhập bối cảnh sản phẩm +
// link/tài liệu → chọn khung phễu → sơ đồ node từng trang → giao đội AI từng khâu
// (đội AI dùng skill tao-funnel) → bảng KPI 5 khâu. Tiến độ lưu localStorage per-org.
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, BarChart3, Check, Filter,
  ListChecks, Play, Rocket, Target, Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { KICKOFF_KEY } from "@/components/workspace/soloceo-kickoff";
import {
  FRAMEWORKS, KPI_5, LUAT_VANG, STAGE_META, promptForStage,
  type FunnelFramework, type FunnelStageType,
} from "@/components/workspace/soloceo-funnels";

const CTX_KEY = "soloceo-funnel-context";

function giaoDoiAI(stage: FunnelStageType, fw: FunnelFramework, ctx: string) {
  try {
    sessionStorage.setItem(KICKOFF_KEY, JSON.stringify({ text: promptForStage(stage, fw, ctx), stage, framework: fw.id }));
  } catch { /* bỏ qua */ }
  window.location.assign("/workspace/chats/new");
}

function useContext() {
  const [ctx, setCtx] = useState("");
  useEffect(() => { try { setCtx(localStorage.getItem(CTX_KEY) ?? ""); } catch { /* */ } }, []);
  const save = useCallback((v: string) => { setCtx(v); try { localStorage.setItem(CTX_KEY, v); } catch { /* */ } }, []);
  return { ctx, save };
}

function useProgress(fwId: string) {
  const key = `soloceo-funnel-progress:${fwId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) ?? "{}")); } catch { /* */ } }, [key]);
  const toggle = useCallback((s: string) => setDone((c) => {
    const n = { ...c, [s]: !c[s] }; try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* */ } return n;
  }), [key]);
  return { done, toggle };
}

function Detail({ fw, onBack }: { fw: FunnelFramework; onBack: () => void }) {
  const { ctx, save } = useContext();
  const { done, toggle } = useProgress(fw.id);
  const pct = Math.round((fw.stages.filter((s) => done[s]).length / fw.stages.length) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <button onClick={onBack} className="text-muted-foreground mb-4 inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> Thư viện khung phễu
      </button>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Filter className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-semibold">{fw.ten}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${fw.doKho === "Dễ" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : fw.doKho === "Vừa" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>{fw.doKho}</span>
      </div>
      <p className="text-muted-foreground mb-5 text-sm">{fw.tagline}</p>

      {/* bối cảnh sản phẩm */}
      <section className="mb-5 rounded-xl border bg-card p-4">
        <label className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-emerald-600" /> Bối cảnh sản phẩm của bạn</label>
        <p className="text-muted-foreground mb-2 text-xs">Bán gì · cho ai (1 chân dung) · ngách · kênh/ngân sách · dán link landing/tài liệu mồi câu nếu có. Đội AI dùng đúng bối cảnh này, không nói chung chung.</p>
        <textarea value={ctx} onChange={(e) => save(e.target.value)} rows={3}
          placeholder="vd: Bán khoá học làm bánh online 1.5tr cho mẹ bỉm 25-35t muốn kiếm thêm tại nhà; có sẵn fanpage 5k + file PDF 10 công thức (link…)"
          className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
      </section>

      {/* sơ đồ khung */}
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><Workflow className="h-4 w-4 text-emerald-600" /> Sơ đồ luồng</h2>
        <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed">{fw.soDo}</pre>
        <p className="text-muted-foreground mt-1 text-xs">💡 {fw.luuY}</p>
      </section>

      {/* giải phẫu từng trang + giao đội AI */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><ListChecks className="h-4 w-4 text-emerald-600" /> Các khâu của phễu</h2>
          <span className="text-muted-foreground text-xs">{fw.stages.filter((s) => done[s]).length}/{fw.stages.length} · {pct}%</span>
        </div>
        <div className="space-y-1">
          {fw.stages.map((s, i) => {
            const M = STAGE_META[s];
            return (
              <div key={s}>
                <div className={`rounded-xl border bg-card p-3 ${done[s] ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggle(s)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${done[s] ? "border-emerald-500 bg-emerald-500 text-white" : "hover:border-emerald-400"}`}>
                      {done[s] && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-medium ${M.mau}`}>{M.ten}</span>
                      <p className="text-muted-foreground text-sm">{M.vaiTro}</p>
                    </div>
                    <button onClick={() => giaoDoiAI(s, fw, ctx)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                      <Play className="h-3.5 w-3.5" /> Giao đội AI
                    </button>
                  </div>
                </div>
                {i < fw.stages.length - 1 && <div className="flex justify-center py-0.5"><ArrowDown className="text-muted-foreground h-4 w-4" /></div>}
              </div>
            );
          })}
        </div>
      </section>

      {/* KPI 5 khâu */}
      <section className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-emerald-600" /> Bảng KPI phễu 5 khâu</h2>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead><tr className="text-muted-foreground text-left text-xs uppercase"><th className="px-3 py-2">Khâu</th><th className="px-3 py-2">Chỉ số</th><th className="px-3 py-2">Đo ở đâu</th></tr></thead>
            <tbody>{KPI_5.map((k) => (
              <tr key={k.khau} className="border-t"><td className="px-3 py-2 font-medium">{k.khau}</td><td className="px-3 py-2">{k.chiSo} <span className="text-amber-600">🔶</span></td><td className="text-muted-foreground px-3 py-2 text-xs">{k.doO}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">🔶 = số giả định để lập kế hoạch, phải đo thật. Soi khâu rơi rụng nhiều nhất để sửa trước.</p>
      </section>

      {/* 5 luật vàng */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> 5 luật không được vi phạm</p>
        <ul className="space-y-1 text-sm">{LUAT_VANG.map((l, i) => <li key={i}>{i + 1}. {l}</li>)}</ul>
      </div>
    </div>
  );
}

export function SoloceoFunnel() {
  const [id, setId] = useState<string | null>(null);
  const fw = useMemo(() => FRAMEWORKS.find((f) => f.id === id), [id]);

  if (fw) return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody><Detail fw={fw} onBack={() => setId(null)} /></WorkspaceBody></WorkspaceContainer>
  );

  return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="mb-2 flex items-center gap-3">
          <Filter className="h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-xl font-semibold">Phễu bán hàng</h1>
            <p className="text-muted-foreground text-sm">Chọn khung phễu theo nguồn lực, đội AI thiết kế + thi công từng khâu: mồi câu → bắt email → email → trang bán → chốt.</p>
          </div>
        </div>
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <b>Cách dùng:</b> chọn 1 khung bên dưới → nhập bối cảnh sản phẩm + dán link/tài liệu → bấm <b>Giao đội AI</b> ở từng khâu. Đội AI dùng bộ kỹ năng <b>tạo-funnel</b> để làm chuẩn (giải phẫu trang, double opt-in, KPI 5 khâu). Người mới ít nguồn lực → bắt đầu khung ② hoặc ③ (từ BOFU).
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FRAMEWORKS.map((f) => (
            <button key={f.id} onClick={() => setId(f.id)}
              className="flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs font-medium">{f.hopVoi}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${f.doKho === "Dễ" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : f.doKho === "Vừa" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>{f.doKho}</span>
              </div>
              <h3 className="mt-1 font-semibold">{f.ten}</h3>
              <p className="text-muted-foreground mt-1 flex-1 text-sm">{f.tagline}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">Mở khung phễu <ArrowRight className="h-4 w-4" /></span>
            </button>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">Dựa trên Bộ công cụ Tạo Funnel (bản công khai) — đội AI diễn giải theo sản phẩm của bạn.</p>
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
