"use client";
// Chợ ứng dụng (Marketplace) — CEO "đi chợ" mua nền tảng/tài nguyên cho doanh
// nghiệp. Nguồn dữ liệu: api-core /v1/store/apps (catalog + quyền theo gói),
// /v1/ventures/:id/installs (trạng thái cài). Cài → svc-provision deploy lên
// node PaaS (tenant-03) qua Coolify. Thiết kế chịu lỗi: poll trạng thái, gỡ
// 2 bước, 402 → CTA nâng gói, retry khi lỗi mạng.
import {
  AlertTriangle,
  Bot,
  Boxes,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Rocket,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";

type CatalogApp = { id: string; key: string; name: string; category: string; planMin: string; allowed: boolean };
type Venture = { id: string; name: string; slug: string; status: string };
type Install = { id: string; catalogAppId?: string; catalogAppKey?: string; status: string; url?: string | null; catalogApp?: { key: string } };

const CATEGORY_LABEL: Record<string, string> = {
  ai: "Trí tuệ nhân tạo", automation: "Tự động hoá", web: "Website",
  crm: "Quản lý khách hàng", commerce: "Bán hàng", erp: "Quản trị doanh nghiệp",
};
const PLAN_LABEL: Record<string, string> = { STARTER: "Khởi đầu", GROWTH: "Tăng trưởng", SCALE: "Bứt phá" };

// Mô tả + điểm bán của từng mã nguồn (client-side; catalog chỉ có name/category).
const APP_META: Record<string, { desc: string; highlight?: string; icon: "bot" | "store" | "boxes" }> = {
  openclaw: {
    desc: "Bộ nhân sự AI đầy đủ phòng ban (kinh doanh, nội dung, kế toán…) chạy trên hạ tầng riêng của doanh nghiệp bạn — kèm Control UI điều khiển.",
    highlight: "Mã nguồn AI được dùng nhiều nhất",
    icon: "bot",
  },
  "commerce-starter": {
    desc: "Website bán hàng khởi đầu (Next.js) — trang sản phẩm, giỏ hàng, form liên hệ, nối thẳng sổ cái doanh thu.",
    icon: "store",
  },
  erpnext: {
    desc: "ERPNext trọn bộ: kho, mua bán, kế toán, nhân sự — chuẩn doanh nghiệp, mã nguồn mở.",
    icon: "boxes",
  },
};

const TRANSITIONAL = new Set(["QUEUED", "DEPLOYING"]);
const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Đang xếp hàng…", DEPLOYING: "Đang triển khai…", RUNNING: "Đang chạy",
  FAILED: "Lỗi triển khai", REMOVED: "Đã gỡ", ARCHIVED: "Đã lưu trữ",
};

function AppIcon({ kind }: { kind: "bot" | "store" | "boxes" }) {
  const cls = "h-8 w-8 text-emerald-600";
  if (kind === "bot") return <Bot className={cls} />;
  if (kind === "store") return <Store className={cls} />;
  return <Boxes className={cls} />;
}

export function SoloceoMarketplace() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [apps, setApps] = useState<CatalogApp[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [ventureId, setVentureId] = useState<string>("");
  const [installs, setInstalls] = useState<Install[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null); // gỡ 2 bước
  const [notice, setNotice] = useState<{ kind: "ok" | "warn" | "err"; text: string; upgrade?: boolean } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      const [vs, as] = await Promise.all([
        soloceoApi<Venture[]>("/ventures"),
        soloceoApi<CatalogApp[]>("/store/apps"),
      ]);
      setVentures(vs);
      setApps(as);
      const vid = vs[0]?.id ?? "";
      setVentureId((cur) => (cur && vs.some((v) => v.id === cur) ? cur : vid));
    } catch (e) {
      setErr((e as Error).message || "Không tải được Chợ ứng dụng");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstalls = useCallback(async (vid: string) => {
    if (!vid) return;
    try {
      const list = await soloceoApi<Install[]>(`/ventures/${vid}/installs`);
      setInstalls(Array.isArray(list) ? list : []);
    } catch {
      // giữ danh sách cũ — poll lần sau thử lại (không phá UI vì 1 nhịp lỗi)
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => { void loadInstalls(ventureId); }, [ventureId, loadInstalls]);

  // Poll 5s khi còn install đang chuyển trạng thái (QUEUED/DEPLOYING)
  const hasTransitional = installs.some((i) => TRANSITIONAL.has(i.status));
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (hasTransitional && ventureId) {
      pollRef.current = setInterval(() => { void loadInstalls(ventureId); }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasTransitional, ventureId, loadInstalls]);

  const installByKey = useMemo(() => {
    const m = new Map<string, Install>();
    for (const i of installs) {
      const key = i.catalogApp?.key ?? i.catalogAppKey;
      // giữ bản ghi "mạnh" nhất: RUNNING > DEPLOYING/QUEUED > FAILED > REMOVED
      if (!key || i.status === "REMOVED" || i.status === "ARCHIVED") continue;
      const cur = m.get(key);
      const rank = (s: string) => (s === "RUNNING" ? 3 : TRANSITIONAL.has(s) ? 2 : 1);
      if (!cur || rank(i.status) >= rank(cur.status)) m.set(key, i);
    }
    return m;
  }, [installs]);

  async function doInstall(app: CatalogApp) {
    if (!ventureId || busyKey) return;
    setBusyKey(app.key); setNotice(null);
    try {
      await soloceoApi(`/ventures/${ventureId}/installs`, {
        method: "POST",
        body: JSON.stringify({ catalogAppKey: app.key }),
      });
      setNotice({ kind: "ok", text: `Đã đưa "${app.name}" vào hàng triển khai — thường xong trong vài phút.` });
      await loadInstalls(ventureId);
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg.includes("402") || msg.toLowerCase().includes("gói cao hơn") || msg.includes("upgrade")) {
        setNotice({ kind: "warn", text: `"${app.name}" cần gói cao hơn.`, upgrade: true });
      } else {
        setNotice({ kind: "err", text: `Cài "${app.name}" thất bại: ${msg}` });
      }
    } finally { setBusyKey(null); }
  }

  async function doRemove(app: CatalogApp, install: Install) {
    if (busyKey) return;
    if (confirmKey !== app.key) { setConfirmKey(app.key); return; } // bước 1: hỏi
    setBusyKey(app.key); setConfirmKey(null); setNotice(null);
    try {
      await soloceoApi(`/installs/${install.id}?confirm=true`, { method: "DELETE" });
      // backend yêu cầu 2 lần gọi: lần 1 không confirm trả hướng dẫn — gọi thẳng confirm=true sau khi CEO đã bấm xác nhận trên UI
      setNotice({ kind: "ok", text: `Đang gỡ "${app.name}"…` });
      await loadInstalls(ventureId);
    } catch (e) {
      setNotice({ kind: "err", text: `Gỡ "${app.name}" thất bại: ${(e as Error).message}` });
    } finally { setBusyKey(null); }
  }

  const grouped = useMemo(() => {
    const g = new Map<string, CatalogApp[]>();
    for (const a of apps) {
      const arr = g.get(a.category) ?? [];
      arr.push(a); g.set(a.category, arr);
    }
    return [...g.entries()];
  }, [apps]);

  const venture = ventures.find((v) => v.id === ventureId);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">Chợ ứng dụng</h1>
              <p className="text-muted-foreground text-sm">
                Mua nền tảng &amp; tài nguyên cho doanh nghiệp — cài 1 chạm, hạ tầng riêng, vài phút là chạy.
              </p>
            </div>
            {ventures.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <Building2 className="text-muted-foreground h-4 w-4" />
                <select value={ventureId} onChange={(e) => setVentureId(e.target.value)}
                  className="rounded-md border bg-transparent px-2 py-1.5 text-sm">
                  {ventures.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
            )}
          </div>

          {notice && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              notice.kind === "ok" ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
              : notice.kind === "warn" ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
              : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40"}`}>
              {notice.kind === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
              <span className="min-w-0 flex-1">{notice.text}</span>
              {notice.upgrade && (
                <a href="/workspace/goi-cuoc" className="shrink-0 rounded-md bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-700">Nâng gói</a>
              )}
              <button onClick={() => setNotice(null)} className="text-muted-foreground shrink-0 hover:underline">Đóng</button>
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-muted/40 h-44 animate-pulse rounded-xl border" />)}
            </div>
          ) : err ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm">{err}</p>
              <button onClick={() => { setLoading(true); void loadAll(); }}
                className="mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                <RefreshCw className="h-4 w-4" /> Thử lại
              </button>
            </div>
          ) : ventures.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <Rocket className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-medium">Bạn chưa có doanh nghiệp</p>
              <p className="text-muted-foreground text-sm">Tạo doanh nghiệp trước, rồi quay lại đi chợ cho nó.</p>
              <a href="/workspace/tao-doanh-nghiep" className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                <Rocket className="h-4 w-4" /> Tạo doanh nghiệp
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([cat, list]) => (
                <section key={cat}>
                  <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {list.map((app) => {
                      const meta = APP_META[app.key];
                      const inst = installByKey.get(app.key);
                      const transitional = inst ? TRANSITIONAL.has(inst.status) : false;
                      return (
                        <div key={app.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <AppIcon kind={meta?.icon ?? "boxes"} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{app.name}</h3>
                                {meta?.highlight && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{meta.highlight}</span>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                Từ gói {PLAN_LABEL[app.planMin] ?? app.planMin}
                                {venture ? ` · cài cho ${venture.name}` : ""}
                              </p>
                            </div>
                          </div>
                          <p className="text-muted-foreground mt-2 flex-1 text-sm">{meta?.desc ?? "Ứng dụng mã nguồn mở đóng gói sẵn, hạ tầng riêng cho doanh nghiệp bạn."}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {inst?.status === "RUNNING" ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Đang chạy
                                </span>
                                {inst.url && (
                                  <a href={inst.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                                    Mở ứng dụng <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                <button onClick={() => void doRemove(app, inst)} disabled={busyKey === app.key}
                                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${confirmKey === app.key ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40" : "hover:bg-muted"}`}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {confirmKey === app.key ? "Bấm lần nữa để gỡ" : "Gỡ"}
                                </button>
                              </>
                            ) : transitional ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {STATUS_LABEL[inst!.status]}
                              </span>
                            ) : inst?.status === "FAILED" ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Lỗi triển khai
                                </span>
                                <button onClick={() => void doInstall(app)} disabled={busyKey === app.key}
                                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                                  <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                                </button>
                              </>
                            ) : app.allowed ? (
                              <button onClick={() => void doInstall(app)} disabled={busyKey === app.key || !ventureId}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                                {busyKey === app.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
                                Cài đặt
                              </button>
                            ) : (
                              <a href="/workspace/goi-cuoc"
                                className="inline-flex items-center gap-1.5 rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300">
                                Cần gói {PLAN_LABEL[app.planMin] ?? app.planMin} — nâng gói
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
              {apps.length === 0 && (
                <p className="text-muted-foreground text-center text-sm">Chợ đang được bổ sung mã nguồn — quay lại sau nhé.</p>
              )}
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
