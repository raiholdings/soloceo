"use client";
// Catalog "Kho dự án" — đồng bộ 100 dự án từ marketplace.soloceo.vn về /workspace/du-an.
// CEO chọn dự án → "Cấu hình & Khởi động": xem giá ý tưởng + giá TỪNG nền tảng, chọn/bỏ,
// thấy tổng/tháng, bấm "Khởi động dự án" → thanh toán PayOS (tổng) → webhook provision stack.
import {
  AlertCircle, Boxes, Check, CreditCard, ExternalLink, Layers, Loader2, Rocket,
  RefreshCw, Sparkles, Users2, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { soloceoApi } from "@/components/workspace/soloceo-api";
import { type ProjectTemplate } from "@/components/workspace/soloceo-kickoff";

const API = "https://api.soloceo.vn/v1";
const CATALOG = "https://platform.soloceo.vn/paas-catalog.php";
const INDNAME: Record<string, string> = {
  "du-lich": "Du lịch", fnb: "F&B", "giao-duc": "Giáo dục", "bat-dong-san": "Bất động sản",
  "ban-le": "Bán lẻ", "dich-vu": "Dịch vụ", "tai-chinh": "Tài chính",
  "cong-nghe": "Công nghệ & AI", "thuong-mai": "Thương mại", khac: "Khác",
};
const ICON: Record<string, string> = {
  "du-lich": "✈️", fnb: "🍜", "giao-duc": "🎓", "bat-dong-san": "🏠", "ban-le": "🛍️",
  "dich-vu": "🧰", "tai-chinh": "💰", "cong-nghe": "🤖", "thuong-mai": "🛒", khac: "📦",
};
const CORE_LABEL: Record<string, string> = {
  deerflow: "DeerFlow — Đội AI vận hành", litellm: "LiteLLM — Cổng AI", payos: "Thanh toán PayOS",
  crmmcp: "CRM-MCP", mktmcp: "Marketplace-MCP", ecomcp: "Ecosystem-MCP", coolify: "Coolify hạ tầng", langfuse: "Langfuse",
};
const COMM_LABEL: Record<string, string> = {
  wowonder: "Cộng đồng WoWonder", academy: "Academy LMS", perfex: "Perfex CRM", supportboard: "Support Board",
  playtube: "PlayTube", grupo: "Grupo", news: "News Flame", livesmart: "LiveSmart họp video",
};
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
type Stack = { oss?: string[]; core?: string[]; community?: string[] };
type PlatPrice = Record<string, { name: string; price: number }>;

export function SoloceoProjectCatalog() {
  const [all, setAll] = useState<ProjectTemplate[] | null>(null);
  const [prices, setPrices] = useState<PlatPrice>({});
  const [ind, setInd] = useState("all");
  const [open, setOpen] = useState<ProjectTemplate | null>(null);

  const load = useCallback(async () => {
    try {
      const [pt, cat] = await Promise.all([
        fetch(`${API}/marketplace/project-templates`, { cache: "no-store" }).then((r) => r.json()),
        fetch(CATALOG, { cache: "no-store" }).then((r) => r.json()).catch(() => ({ platforms: [] })),
      ]);
      const pm: PlatPrice = {};
      for (const p of cat?.platforms ?? []) {
        pm[String(p.slug).replace("oss-", "")] = { name: p.name, price: Number(p.priceVnd) || 0 };
      }
      setPrices(pm);
      setAll(Array.isArray(pt) ? pt.filter((t: ProjectTemplate) => Number(t.priceVnd) === 0) : []);
    } catch {
      setAll([]);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Mở sẵn modal cấu hình khi tới từ marketplace (?tpl=<slug>).
  useEffect(() => {
    if (!all || all.length === 0) return;
    try {
      const tpl = new URLSearchParams(window.location.search).get("tpl");
      if (tpl) {
        const m = all.find((t) => t.slug === tpl);
        if (m) setOpen(m);
      }
    } catch { /* bỏ qua */ }
  }, [all]);

  const inds = useMemo(
    () => (all ? ([...new Set(all.map((t) => t.industry).filter(Boolean))] as string[]) : []),
    [all],
  );

  if (!all) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> Đang tải kho dự án…
      </div>
    );
  }
  const list = ind === "all" ? all : all.filter((t) => t.industry === ind);

  return (
    <div className="mt-2">
      <div className="mb-3 flex items-center gap-2">
        <Boxes className="h-5 w-5 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Kho dự án — vận hành sẵn 1 người</div>
          <div className="text-muted-foreground text-xs">
            {all.length} dự án AI · chọn nền tảng → khởi động → thanh toán theo tháng
          </div>
        </div>
        <button onClick={() => void load()} className="hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Tải lại
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Chip on={ind === "all"} onClick={() => setInd("all")}>Tất cả ({all.length})</Chip>
        {inds.map((i) => (
          <Chip key={i} on={ind === i} onClick={() => setInd(i)}>{ICON[i] ?? "📦"} {INDNAME[i] ?? i}</Chip>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((t) => {
          const st = ((t.components as { stackSlugs?: Stack } | undefined)?.stackSlugs) ?? {};
          const nOss = st.oss?.length ?? 0;
          const nComm = st.community?.length ?? 0;
          return (
            <div key={t.slug} className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg">
                  {ICON[t.industry ?? "khac"] ?? "📦"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">{INDNAME[t.industry ?? "khac"] ?? t.industry}</div>
                  <h3 className="line-clamp-1 text-sm font-semibold">{t.name}</h3>
                </div>
              </div>
              <p className="text-muted-foreground mt-2 line-clamp-2 flex-1 text-xs leading-relaxed">{t.summary}</p>
              <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-indigo-500" /> {nOss} nền tảng</span>
                <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Đội AI</span>
                <span className="inline-flex items-center gap-1"><Users2 className="h-3.5 w-3.5 text-fuchsia-500" /> {nComm} cộng đồng</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-muted-foreground text-[11px]">từ</span>
                <span className="text-base font-bold text-indigo-600">{fmt(Number(t.monthlyFeeVnd) || 0)}đ</span>
                <span className="text-muted-foreground text-xs">/tháng</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setOpen(t)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700">
                  <Rocket className="h-3.5 w-3.5" /> Cấu hình & Khởi động
                </button>
                {t.demoUrl && (
                  <a href={t.demoUrl} target="_blank" rel="noopener" title="Xem demo"
                    className="inline-flex items-center justify-center rounded-lg border px-2 py-2 text-xs hover:bg-muted">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && <Configurator t={open} prices={prices} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ---- Modal cấu hình & khởi động ----
function Configurator({ t, prices, onClose }: { t: ProjectTemplate; prices: PlatPrice; onClose: () => void }) {
  const st = ((t.components as { stackSlugs?: Stack } | undefined)?.stackSlugs) ?? {};
  const oss = st.oss ?? [];
  const core = st.core ?? [];
  const comm = st.community ?? [];
  const base = Number(t.monthlyFeeVnd) || 0;
  const [picks, setPicks] = useState<Set<string>>(new Set(oss));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addon = useMemo(
    () => oss.reduce((s, k) => s + (picks.has(k) ? (prices[k]?.price ?? 0) : 0), 0),
    [picks, oss, prices],
  );
  const total = base + addon;

  function toggle(k: string) {
    setPicks((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  }

  async function launch() {
    setErr(null); setBusy(true);
    try {
      const chosen = oss.filter((k) => picks.has(k));
      const stackNames = chosen.map((k) => prices[k]?.name ?? k);
      // 1) Tạo DỰ ÁN trong workspace + đồng bộ toàn bộ stack (đội AI, nền tảng, cộng đồng)
      try {
        await soloceoApi("/projects", {
          method: "POST",
          body: JSON.stringify({
            name: t.name,
            description: (t.summary ?? "").slice(0, 1900),
            instructions:
              `Dự án khởi động từ Sàn dự án SoloCEO (ngành: ${t.industry ?? "khác"}). ` +
              `Ý tưởng: ${t.name}. Nền tảng vận hành đã chọn: ${stackNames.join(", ") || "(chỉ nền tảng lõi)"}. ` +
              `Nền tảng lõi kèm sẵn: Đội AI DeerFlow, LiteLLM, PayOS. ` +
              `Tổng phí vận hành: ${fmt(total)}đ/tháng. ` +
              `Nhiệm vụ đội AI: dựng landing bán hàng, kế hoạch 30 ngày, kênh bán, kế toán cơ bản — bám ý tưởng và nối các nền tảng trên.`,
            links: {
              marketplace: true, projectSlug: t.slug,
              stack: { oss: chosen, core, community: comm },
              monthlyFeeVnd: total,
            },
          }),
        });
      } catch { /* nếu chưa đăng nhập/nhánh lỗi vẫn tới thanh toán */ }
      // 2) Thanh toán PayOS theo tháng (tổng = ý tưởng + nền tảng đã chọn)
      const r = await soloceoApi<{ checkoutUrl?: string }>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({
          type: "ai_credit",
          amount: total,
          provider: "payos",
          description: `Khởi động dự án: ${t.name} | ${fmt(total)}đ/th | stack=${chosen.join(",")}`,
        }),
      });
      if (r?.checkoutUrl) window.location.href = r.checkoutUrl;
      else setErr("Đã tạo dự án trong workspace. Chưa mở được cổng thanh toán — thử lại ở mục Doanh thu.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi khởi động");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <div className="text-muted-foreground text-[11px] uppercase">{INDNAME[t.industry ?? "khac"] ?? t.industry}</div>
            <h3 className="text-base font-semibold">{t.name}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-muted rounded-md p-1"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* giá ý tưởng */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-sm dark:bg-indigo-950/30">
            <span className="flex items-center gap-1.5 font-medium"><Sparkles className="h-4 w-4 text-indigo-600" /> Ý tưởng + Đội AI dựng</span>
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">{fmt(base)}đ/th</span>
          </div>

          {/* nền tảng chọn/bỏ */}
          <div className="mb-2 text-xs font-semibold text-foreground">Nền tảng vận hành — chọn/bỏ theo nhu cầu</div>
          <div className="space-y-1.5">
            {oss.map((k) => {
              const p = prices[k]; const on = picks.has(k);
              return (
                <button key={k} onClick={() => toggle(k)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${on ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20" : "border-border opacity-70 hover:opacity-100"}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-indigo-600 bg-indigo-600 text-white" : "border-muted-foreground/40"}`}>
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p?.name ?? k}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{fmt(p?.price ?? 0)}đ</span>
                </button>
              );
            })}
            {oss.length === 0 && <div className="text-muted-foreground text-xs">Dự án dùng nền tảng lõi, không cần add-on.</div>}
          </div>

          {/* đã bao gồm */}
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="mb-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Đã bao gồm (miễn phí trong nền tảng SoloCEO)</div>
            <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
              {core.map((c) => <span key={c}>• {CORE_LABEL[c] ?? c}</span>)}
              {comm.map((c) => <span key={c}>• {COMM_LABEL[c] ?? c}</span>)}
            </div>
          </div>

          {err && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0" /> {err}
            </div>
          )}
        </div>

        {/* footer tổng + khởi động */}
        <div className="border-t px-5 py-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-muted-foreground text-xs">Tổng thanh toán mỗi tháng</div>
              <div className="text-2xl font-bold text-indigo-600">{fmt(total)}đ<span className="text-muted-foreground text-sm font-normal">/tháng</span></div>
            </div>
            <div className="text-muted-foreground text-right text-[11px]">
              Ý tưởng {fmt(base)}đ<br />+ {picks.size} nền tảng {fmt(addon)}đ
            </div>
          </div>
          <button onClick={() => void launch()} disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Khởi động dự án · Thanh toán {fmt(total)}đ/tháng
          </button>
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            Thanh toán qua PayOS. Sau khi thanh toán, hệ thống tự cấp & đồng bộ các nền tảng đã chọn cho dự án của bạn.
          </p>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-foreground bg-foreground text-background font-medium" : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"}`}>
      {children}
    </button>
  );
}
