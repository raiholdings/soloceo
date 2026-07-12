"use client";
// Thị trường — hub kết nối ~50 nền tảng ra thị trường. CEO đánh dấu nền tảng đang
// dùng (localStorage per-org) + "Nhờ đội AI kết nối/đồng bộ" (KICKOFF). Trạng thái
// API khai thật (api/web/sắp có). Không hứa 50 tích hợp sẵn — đội AI hỗ trợ kết nối.
import { CheckCircle2, Link2, Plug, Search, Sparkles, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { KICKOFF_KEY } from "@/components/workspace/soloceo-kickoff";
import {
  API_LABEL, NHOM_ICON, NHOM_LIST, PLATFORMS, promptConnect,
  type Platform, type Region,
} from "@/components/workspace/soloceo-market-data";

const USING_KEY = "soloceo-market-using";

function useUsing() {
  const [using, setUsing] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setUsing(JSON.parse(localStorage.getItem(USING_KEY) ?? "{}")); } catch { /* */ } }, []);
  const toggle = useCallback((id: string) => setUsing((c) => {
    const n = { ...c, [id]: !c[id] }; try { localStorage.setItem(USING_KEY, JSON.stringify(n)); } catch { /* */ } return n;
  }), []);
  return { using, toggle };
}

function connect(p: Platform) {
  try { sessionStorage.setItem(KICKOFF_KEY, JSON.stringify({ text: promptConnect(p), platform: p.id })); } catch { /* */ }
  window.location.assign("/workspace/chats/new");
}

export function SoloceoMarket() {
  const { using, toggle } = useUsing();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<"" | Region>("");
  const [nhom, setNhom] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PLATFORMS.filter((p) =>
      (!region || p.region === region) &&
      (!nhom || p.nhom === nhom) &&
      (!needle || `${p.ten} ${p.moTa} ${p.nhom}`.toLowerCase().includes(needle)));
  }, [q, region, nhom]);

  const byNhom = useMemo(() => {
    const order = nhom ? [nhom] : NHOM_LIST;
    return order.map((n) => [n, filtered.filter((p) => p.nhom === n)] as const).filter(([, arr]) => arr.length);
  }, [filtered, nhom]);

  const usingCount = Object.values(using).filter(Boolean).length;

  return (
    <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-2 flex items-center gap-3">
          <Store className="h-6 w-6 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">Thị trường <span className="text-muted-foreground text-sm font-normal">({PLATFORMS.length} nền tảng)</span></h1>
            <p className="text-muted-foreground text-sm">Kết nối doanh nghiệp bạn với sàn TMĐT, mạng xã hội, quảng cáo, thanh toán, vận chuyển, kế toán — bán & vận hành đa kênh.</p>
          </div>
          {usingCount > 0 && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{usingCount} đang dùng</span>}
        </div>

        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/20">
          <b>Cách dùng:</b> đánh dấu nền tảng bạn <b>đang dùng</b>, rồi bấm <b>Nhờ đội AI kết nối</b> — đội AI hướng dẫn lấy khoá kết nối và đồng bộ (sản phẩm/đơn/tồn kho/tin nhắn). Nền tảng có API kết nối trực tiếp; nền tảng chưa mở API thì đội AI hỗ trợ qua thao tác web (chế độ Assist, bạn tự nhập bước bảo mật).
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-2.5 h-4 w-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nền tảng… (Shopee, TikTok, GHN, MoMo…)"
              className="w-full rounded-md border bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <select value={region} onChange={(e) => setRegion(e.target.value as "" | Region)} className="rounded-md border bg-transparent px-2 py-2 text-sm">
            <option value="">Mọi khu vực</option><option value="VN">Việt Nam</option><option value="Quốc tế">Quốc tế</option>
          </select>
          <select value={nhom} onChange={(e) => setNhom(e.target.value)} className="rounded-md border bg-transparent px-2 py-2 text-sm">
            <option value="">Tất cả nhóm</option>
            {NHOM_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="space-y-7">
          {byNhom.map(([n, arr]) => (
            <section key={n}>
              <h2 className="text-muted-foreground mb-3 text-sm font-semibold uppercase tracking-wide">{NHOM_ICON[n] ?? "•"} {n} <span className="normal-case">({arr.length})</span></h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {arr.map((p) => {
                  const on = using[p.id]; const api = API_LABEL[p.apiStatus];
                  return (
                    <div key={p.id} className={`flex flex-col rounded-xl border bg-card p-4 ${on ? "border-emerald-300" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{p.ten}</h3>
                          <span className="text-muted-foreground text-xs">{p.region}</span>
                        </div>
                        <button onClick={() => toggle(p.id)} title="Đánh dấu đang dùng"
                          className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${on ? "border-emerald-500 bg-emerald-500 text-white" : "hover:bg-muted"}`}>
                          {on ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Đang dùng</span> : "Đang dùng?"}
                        </button>
                      </div>
                      <p className="text-muted-foreground mt-1 flex-1 text-sm">{p.moTa}</p>
                      <span className={`mt-2 inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${api.mau}`}>{api.text}</span>
                      <button onClick={() => connect(p)} disabled={p.apiStatus === "sap"}
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <Plug className="h-3.5 w-3.5" /> {p.apiStatus === "sap" ? "Sắp có" : "Nhờ đội AI kết nối"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {byNhom.length === 0 && <p className="text-muted-foreground py-8 text-center text-sm">Không có nền tảng khớp — thử từ khoá khác.</p>}
        </div>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          <Sparkles className="mr-1 inline h-3.5 w-3.5" /> Danh mục mở rộng liên tục. Đội AI hỗ trợ kết nối từng nền tảng theo nhu cầu — không phải bật sẵn 50 tích hợp.
        </p>
      </div>
    </WorkspaceBody></WorkspaceContainer>
  );
}
