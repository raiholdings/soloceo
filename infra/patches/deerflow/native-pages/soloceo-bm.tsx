"use client";
// "Mô hình kinh doanh" — thư viện mô hình đóng gói trọn (công thức + hướng đi
// + lộ trình 90 ngày + map 8 nền tảng). CEO chọn mô hình → giao từng bước cho
// đội AI (KICKOFF_KEY → thread DeerFlow mới), tick tiến độ lưu localStorage.
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Bot, Check, CheckCircle2,
  ChevronDown, ExternalLink, Landmark, LineChart, Lightbulb, Play, ShieldCheck,
  ShoppingBag, Sparkles, Target,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { KICKOFF_KEY } from "@/components/workspace/soloceo-kickoff";
import {
  BUSINESS_MODELS, PLATFORMS,
  type BmStep, type BusinessModel, type PlatformKey,
} from "@/components/workspace/soloceo-business-models";

const PLAN_LABEL: Record<string, string> = { STARTER: "Khởi đầu", GROWTH: "Tăng trưởng", SCALE: "Bứt phá" };

// ── tiến độ lộ trình: localStorage per model ────────────────────────────────
function useProgress(modelId: string) {
  const key = `soloceo-bm-progress:${modelId}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(key) ?? "{}")); } catch { /* bỏ qua */ }
  }, [key]);
  const toggle = useCallback((stepId: string) => {
    setDone((cur) => {
      const next = { ...cur, [stepId]: !cur[stepId] };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* bỏ qua */ }
      return next;
    });
  }, [key]);
  return { done, toggle };
}

/** Giao 1 bước cho đội AI: nạp prompt vào thread mới (cơ chế kickoff có sẵn).
 * Gói sinh từ factory không có prompt viết tay → dựng prompt chuẩn từ dữ liệu bước. */
function giaoChoDoiAI(step: BmStep, modelTen: string) {
  const text =
    step.prompt ??
    `Bạn là đội vận hành doanh nghiệp của tôi trên SoloCEO (mô hình kinh doanh "${modelTen}"). ` +
      `NHIỆM VỤ: ${step.ten} — ${step.moTa} PHÂN CÔNG: sub-agent ${step.team} chủ trì. ` +
      `KẾT QUẢ CẦN CÓ: sản phẩm cụ thể dùng được ngay (bảng/kế hoạch/nội dung), kèm 1-3 việc tôi nên làm tuần này. ` +
      `Ràng buộc: tiếng Việt, hướng hành động cho doanh nghiệp nhỏ VN; việc chạm tiền/pháp lý phải dừng chờ tôi phê duyệt; KHÔNG tự đặt giá.`;
  try {
    sessionStorage.setItem(KICKOFF_KEY, JSON.stringify({ text, stepId: step.id, model: modelTen }));
  } catch { /* sessionStorage bị chặn thì CEO tự dán */ }
  window.location.assign("/workspace/chats/new");
}

function PlatformChips({ keys }: { keys: PlatformKey[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <span key={k} title={PLATFORMS[k].vaiTro}
          className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
          {PLATFORMS[k].ten}
        </span>
      ))}
    </div>
  );
}

// ── Chi tiết một mô hình ────────────────────────────────────────────────────
function ModelDetail({ model, onBack }: { model: BusinessModel; onBack: () => void }) {
  const { done, toggle } = useProgress(model.id);
  const [openPhase, setOpenPhase] = useState<string | null>(model.loTrinh[0]?.id ?? null);
  const [variantId, setVariantId] = useState<string | null>(null);

  const totalSteps = useMemo(() => model.loTrinh.reduce((s, p) => s + p.steps.length, 0), [model]);
  const doneCount = useMemo(
    () => model.loTrinh.reduce((s, p) => s + p.steps.filter((st) => done[st.id]).length, 0),
    [model, done],
  );
  const pct = totalSteps ? Math.round((doneCount / totalSteps) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <button onClick={onBack} className="text-muted-foreground mb-4 inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> Thư viện mô hình
      </button>

      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Lightbulb className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-semibold">{model.ten}</h1>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          Từ gói {PLAN_LABEL[model.planMin]}
        </span>
      </div>
      <p className="text-muted-foreground mb-5 text-sm">{model.tagline}</p>

      {/* thanh tiến độ tổng */}
      <div className="mb-6 rounded-xl border bg-card p-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">Tiến độ thực thi</span>
          <span className="text-muted-foreground">{doneCount}/{totalSteps} bước · {pct}%</span>
        </div>
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {model.troLy && (
            <Link href="/workspace/agents" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 hover:bg-muted">
              <Bot className="h-4 w-4 text-emerald-600" /> Hỏi {model.troLy.ten}
            </Link>
          )}
          {model.appLienQuan?.length ? (
            <Link href="/workspace/cho-ung-dung" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 hover:bg-muted">
              <ShoppingBag className="h-4 w-4 text-emerald-600" /> App liên quan trong Chợ
            </Link>
          ) : null}
        </div>
      </div>

      {/* giới thiệu + công thức */}
      <section className="mb-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><BookOpen className="h-5 w-5 text-emerald-600" /> Mô hình này là gì</h2>
        <p className="text-sm leading-relaxed">{model.gioiThieu}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Target className="h-5 w-5 text-emerald-600" /> Công thức giá trị</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[model.congThuc.tao, model.congThuc.trao, model.congThuc.giu].map((t, i) => (
            <div key={i} className="rounded-xl border bg-card p-3 text-sm">{t}</div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-1.5 text-sm font-semibold">Dòng doanh thu</p>
            <ul className="space-y-1 text-sm">{model.congThuc.doanhThu.map((d, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{d}</li>)}</ul>
          </div>
          <div className="rounded-xl border bg-card p-3">
            <p className="mb-1.5 text-sm font-semibold">Cấu trúc chi phí</p>
            <ul className="space-y-1 text-sm">{model.congThuc.chiPhi.map((d, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{d}</li>)}</ul>
          </div>
        </div>
        <div className="mt-3 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span><b>Pháp lý:</b> {model.congThuc.ruiRoPhapLy}</span>
        </div>
      </section>

      {/* chọn hướng */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-emerald-600" /> Chọn hướng triển khai</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {model.variants.map((v) => (
            <button key={v.id} onClick={() => setVariantId(variantId === v.id ? null : v.id)}
              className={`rounded-xl border p-3 text-left transition ${variantId === v.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "bg-card hover:border-emerald-300"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{v.ten}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${v.doKho === "Dễ" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : v.doKho === "Vừa" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>{v.doKho}</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">Hợp với: {v.hopVoi} · Rủi ro: {v.ruiRo}</p>
              <p className="mt-1 text-sm">{v.moTa}</p>
              {variantId === v.id && <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ Đang chọn hướng này — các bước lộ trình bên dưới áp dụng cho nó</p>}
            </button>
          ))}
        </div>
      </section>

      {/* lộ trình 90 ngày */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><LineChart className="h-5 w-5 text-emerald-600" /> Lộ trình 90 ngày</h2>
        <div className="space-y-3">
          {model.loTrinh.map((phase, pi) => {
            const open = openPhase === phase.id;
            const phaseDone = phase.steps.filter((s) => done[s.id]).length;
            return (
              <div key={phase.id} className="overflow-hidden rounded-xl border bg-card">
                <button onClick={() => setOpenPhase(open ? null : phase.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{pi + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{phase.ten}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{phase.tuan} · {phaseDone}/{phase.steps.length} bước</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="space-y-3 border-t px-4 py-3">
                    {phase.steps.map((step) => (
                      <div key={step.id} className={`rounded-lg border p-3 ${done[step.id] ? "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20" : ""}`}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggle(step.id)} aria-label="Đánh dấu xong"
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${done[step.id] ? "border-emerald-500 bg-emerald-500 text-white" : "hover:border-emerald-400"}`}>
                            {done[step.id] && <Check className="h-3.5 w-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`font-medium ${done[step.id] ? "line-through opacity-70" : ""}`}>{step.ten}</p>
                            <p className="text-muted-foreground mt-0.5 text-sm">{step.moTa}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="text-muted-foreground text-xs">Đội: <b>{step.team}</b></span>
                              <PlatformChips keys={step.platforms} />
                            </div>
                          </div>
                          <div className="shrink-0">
                            {step.link ? (
                              <Link href={step.link.href}
                                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                                {step.link.label} <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            ) : (
                              <button onClick={() => giaoChoDoiAI(step, model.ten)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                                <Play className="h-3.5 w-3.5" /> Giao cho đội AI
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8 nền tảng kết nối thế nào */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-emerald-600" /> 8 nền tảng SoloCEO phối hợp cho mô hình này</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PLATFORMS) as PlatformKey[]).map((k) => (
            <div key={k} className="flex gap-2 rounded-lg border bg-card p-3 text-sm">
              <span className="shrink-0 font-semibold text-violet-700 dark:text-violet-300">{PLATFORMS[k].ten}</span>
              <span className="text-muted-foreground">{PLATFORMS[k].vaiTro}</span>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Luồng chuẩn của một bước: bạn bấm <b>Giao cho đội AI</b> → DeerFlow phân công sub-agent → agent làm trong AIO Sandbox
          (ra internet qua g3, dữ liệu cá nhân được godlp che) → việc lặp đưa vào FlowGram → cần thao tác web thì Midscene Assist →
          giấy tờ do Dolphin đọc → mọi bước chạm tiền/pháp lý bị arishem chặn lại chờ bạn ở trang <Link className="underline" href="/workspace/phe-duyet">Phê duyệt</Link>.
        </p>
      </section>

      {/* cảnh báo + chỉ số */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300"><AlertTriangle className="h-4 w-4" /> Sai lầm cần tránh</p>
          <ul className="space-y-1 text-sm">{model.canhBao.map((c, i) => <li key={i}>• {c}</li>)}</ul>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><LineChart className="h-4 w-4 text-emerald-600" /> Chỉ số theo dõi</p>
          <ul className="space-y-1 text-sm">{model.chiSo.map((c, i) => <li key={i}>• {c}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}

// ── Trang thư viện: gói tĩnh (web3 viết tay) + gói động từ factory ──────────
type CatalogEntry = { id: string; ten: string; tagline: string; nhom: string; planMin: string; trangThai: string };

export function SoloceoBusinessModels() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [remoteList, setRemoteList] = useState<CatalogEntry[]>([]);
  const [remoteModel, setRemoteModel] = useState<BusinessModel | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [q, setQ] = useState("");
  const [nhomFilter, setNhomFilter] = useState<string>("");

  useEffect(() => {
    fetch("/workspace/api/bm", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { models: [] }))
      .then((d: { models: CatalogEntry[] }) => setRemoteList(d.models ?? []))
      .catch(() => setRemoteList([]));
  }, []);

  const staticSel = BUSINESS_MODELS.find((m) => m.id === selectedId);
  useEffect(() => {
    setRemoteModel(null);
    if (!selectedId || staticSel) return;
    setLoadingDetail(true);
    fetch(`/workspace/api/bm?slug=${selectedId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BusinessModel | null) => setRemoteModel(d))
      .catch(() => setRemoteModel(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId, staticSel]);

  const catalog: CatalogEntry[] = useMemo(() => {
    const staticEntries = BUSINESS_MODELS.map((m) => ({
      id: m.id, ten: m.ten, tagline: m.tagline, nhom: m.nhom, planMin: m.planMin, trangThai: m.trangThai,
    }));
    const ids = new Set(staticEntries.map((e) => e.id));
    return [...staticEntries, ...remoteList.filter((e) => !ids.has(e.id))];
  }, [remoteList]);

  const nhoms = useMemo(() => [...new Set(catalog.map((c) => c.nhom))].sort(), [catalog]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((c) =>
      (!nhomFilter || c.nhom === nhomFilter) &&
      (!needle || `${c.ten} ${c.tagline}`.toLowerCase().includes(needle)));
  }, [catalog, q, nhomFilter]);

  const detail = staticSel ?? remoteModel;

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        {selectedId && loadingDetail ? (
          <div className="text-muted-foreground mx-auto max-w-4xl px-4 py-16 text-sm">Đang mở gói mô hình…</div>
        ) : selectedId && detail ? (
          <ModelDetail model={detail} onBack={() => setSelectedId(null)} />
        ) : (
          <div className="mx-auto w-full max-w-4xl px-4 py-8">
            <div className="mb-4 flex items-center gap-3">
              <Lightbulb className="h-6 w-6 text-emerald-600" />
              <div>
                <h1 className="text-xl font-semibold">Mô hình kinh doanh <span className="text-muted-foreground text-sm font-normal">({catalog.length} gói)</span></h1>
                <p className="text-muted-foreground text-sm">
                  Mô hình đóng gói trọn: công thức, hướng đi, lộ trình 90 ngày — chọn xong, đội AI bắt tay thực thi từng bước.
                </p>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mô hình… (vd: subscription, nhượng quyền, SaaS)"
                className="min-w-56 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              <select value={nhomFilter} onChange={(e) => setNhomFilter(e.target.value)}
                className="rounded-md border bg-transparent px-2 py-2 text-sm">
                <option value="">Tất cả nhóm</option>
                {nhoms.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((m) => (
                <button key={m.id} onClick={() => setSelectedId(m.id)}
                  className="flex flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{m.nhom}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Sẵn sàng</span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{m.ten}</h3>
                  <p className="text-muted-foreground mt-1 flex-1 text-sm">{m.tagline}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Xem công thức & lộ trình <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-muted-foreground col-span-2 py-8 text-center text-sm">Không có mô hình khớp — thử từ khoá khác.</p>
              )}
            </div>
            <p className="text-muted-foreground mt-6 text-center text-xs">
              Đóng gói từ kho sách mô hình kinh doanh bản quyền của SoloCEO — thư viện tiếp tục lớn.
            </p>
          </div>
        )}
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
