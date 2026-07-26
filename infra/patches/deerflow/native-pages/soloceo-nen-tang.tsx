"use client";
// Nền tảng dùng ngay — đồng bộ toàn bộ mã nguồn mở từ platform.soloceo.vn (WHMCS).
// CEO xem danh sách nền tảng + BẤM "Dùng bản demo" để trải nghiệm ngay, hoặc "Đăng ký"
// để tự cấp hạ tầng riêng. Dữ liệu lấy LIVE từ platform.soloceo.vn/paas-catalog.php
// nên thêm/bớt sản phẩm bên WHMCS là tự đồng bộ về đây.
import {
  AlertCircle, Bot, BrainCircuit, Boxes, ExternalLink, Globe, Loader2,
  MessagesSquare, RefreshCw, Rocket, Sparkles, Bug, Store, Star, Github,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";

const CATALOG_URL = "https://platform.soloceo.vn/paas-catalog.php";
const STORE_URL = "https://platform.soloceo.vn/store/nen-tang-paas";

type Platform = {
  id: number; name: string; slug: string; description: string; category?: string;
  demoUrl: string | null; priceVnd: number; signupUrl: string;
  stars?: number | null; necessity?: number | null; github?: string | null;
};

// Mức cần thiết cho Solo CEO (1-5) → nhãn + màu.
function necessityBadge(n?: number | null) {
  switch (n) {
    case 5: return { label: "Thiết yếu", cls: "bg-rose-100 text-rose-700" };
    case 4: return { label: "Rất nên có", cls: "bg-orange-100 text-orange-700" };
    case 3: return { label: "Nên có", cls: "bg-sky-100 text-sky-700" };
    case 2: return { label: "Tuỳ chọn", cls: "bg-slate-100 text-slate-600" };
    case 1: return { label: "Chuyên biệt", cls: "bg-slate-100 text-slate-500" };
    default: return null;
  }
}
// Quy đổi sao GitHub (nghìn) → xếp hạng 1-5 sao chất lượng.
function qualityStars(k?: number | null) {
  if (k == null) return 0;
  if (k >= 30) return 5;
  if (k >= 10) return 4.5;
  if (k >= 3) return 4;
  if (k >= 1) return 3.5;
  return 3;
}

// Chọn icon + màu theo tên nền tảng (không có thì mặc định).
function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("crawl")) return { Icon: Bug, color: "text-emerald-600", bg: "bg-emerald-50" };
  if (n.includes("openhands") || n.includes("lập trình")) return { Icon: Bot, color: "text-sky-600", bg: "bg-sky-50" };
  if (n.includes("mirofish") || n.includes("dự báo")) return { Icon: BrainCircuit, color: "text-fuchsia-600", bg: "bg-fuchsia-50" };
  if (n.includes("chatbot")) return { Icon: MessagesSquare, color: "text-indigo-600", bg: "bg-indigo-50" };
  if (n.includes("openclaw")) return { Icon: Sparkles, color: "text-violet-600", bg: "bg-violet-50" };
  if (n.includes("erpnext") || n.includes("odoo")) return { Icon: Boxes, color: "text-orange-600", bg: "bg-orange-50" };
  if (n.includes("hermes")) return { Icon: Rocket, color: "text-rose-600", bg: "bg-rose-50" };
  return { Icon: Globe, color: "text-slate-600", bg: "bg-slate-100" };
}

function formatVnd(v: number) {
  if (!v) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(v) + "đ/tháng";
}

export function SoloceoNenTang() {
  const [items, setItems] = useState<Platform[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(CATALOG_URL, { cache: "no-store" });
      const d = await r.json();
      const list: Platform[] = Array.isArray(d?.platforms) ? d.platforms : [];
      setItems(list);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const liveCount = useMemo(() => items.filter((p) => p.demoUrl).length, [items]);
  const grouped = useMemo(() => {
    const map = new Map<string, Platform[]>();
    for (const p of items) {
      const c = p.category || "Khác";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="flex h-full min-h-0 flex-col">
          {/* Thanh tiêu đề */}
          <div className="flex items-center gap-3 border-b px-4 py-2.5">
            <Store className="h-5 w-5 text-indigo-600" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Nền tảng dùng ngay</div>
              <div className="text-muted-foreground truncate text-xs">
                {status === "ready"
                  ? `${items.length} nền tảng mã nguồn mở · ${liveCount} có bản demo trải nghiệm ngay`
                  : "Đồng bộ từ platform.soloceo.vn"}
              </div>
            </div>
            <button onClick={() => void load()} title="Tải lại"
              className="hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Tải lại
            </button>
            <a href={STORE_URL} target="_blank" rel="noopener"
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700">
              <ExternalLink className="h-3.5 w-3.5" /> Cổng đăng ký
            </a>
          </div>

          {status === "loading" && (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" /> Đang đồng bộ nền tảng…
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <AlertCircle className="h-7 w-7 text-amber-500" />
              <div className="text-muted-foreground max-w-md">Chưa tải được danh sách nền tảng. Bấm <b>Tải lại</b>.</div>
              <button onClick={() => void load()}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          )}

          {status === "ready" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {grouped.map(([cat, list]) => (
                <div key={cat} className="mb-7">
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">{cat}</h2>
                    <span className="text-muted-foreground text-xs">({list.length})</span>
                    <div className="ml-2 h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => {
                  const { Icon, color, bg } = iconFor(p.name);
                  return (
                    <div key={p.id}
                      className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                            {p.demoUrl ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">demo</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">sắp có</span>
                            )}
                            {(() => { const nb = necessityBadge(p.necessity); return nb ? (
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${nb.cls}`}>{nb.label}</span>
                            ) : null; })()}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {qualityStars(p.stars) > 0 && (
                              <span className="inline-flex items-center gap-0.5" title={`Đánh giá ${qualityStars(p.stars)}/5 · ${p.stars}k sao GitHub`}>
                                {[1,2,3,4,5].map((i) => {
                                  const q = qualityStars(p.stars);
                                  return <Star key={i} className={`h-3 w-3 ${i <= q ? "fill-amber-400 text-amber-400" : (i - 0.5 === q ? "fill-amber-400 text-amber-400 opacity-60" : "text-slate-300")}`} />;
                                })}
                                {p.stars != null && <span className="text-muted-foreground ml-0.5 text-[10px]">{p.stars}k</span>}
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs font-medium">{formatVnd(p.priceVnd)}</div>
                        </div>
                      </div>
                      <p className="text-muted-foreground mt-3 line-clamp-3 flex-1 text-xs leading-relaxed">{p.description}</p>
                      <div className="mt-4 flex items-center gap-2">
                        {p.demoUrl ? (
                          <a href={p.demoUrl} target="_blank" rel="noopener"
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-indigo-700">
                            <Rocket className="h-3.5 w-3.5" /> Dùng bản demo
                          </a>
                        ) : (
                          <button disabled
                            className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                            Demo sắp có
                          </button>
                        )}
                        <a href={p.signupUrl} target="_blank" rel="noopener"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted">
                          Đăng ký
                        </a>
                        {p.github && (
                          <a href={`https://github.com/${p.github}`} target="_blank" rel="noopener" title={`Mã nguồn: ${p.github}`}
                            className="inline-flex items-center justify-center rounded-lg border px-2 py-2 text-xs hover:bg-muted">
                            <Github className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>
              ))}
              <div className="text-muted-foreground mt-6 text-center text-xs">
                Nền tảng đồng bộ trực tiếp từ <a className="text-indigo-600 underline" href={STORE_URL} target="_blank" rel="noopener">platform.soloceo.vn</a>.
                Bấm <b>Đăng ký</b> để hệ thống tự cấp hạ tầng riêng cho doanh nghiệp của bạn.
              </div>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
