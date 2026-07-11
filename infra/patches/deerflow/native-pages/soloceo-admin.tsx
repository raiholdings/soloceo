"use client";
// Cockpit quản trị /workspace/admin — vế "code riêng" của hướng Appsmith + code riêng.
// Chỉ tài khoản trong ADMIN_EMAILS (api-core) thấy dữ liệu; user thường bị 403 từ guard.
// Nguồn: api-core /v1/admin/* (audit đầy đủ) — token nội bộ DeerFlow KHÔNG xuống browser.
import {
  Activity, AlertTriangle, Bot, Building2, CheckCircle2, Landmark, LineChart,
  Loader2, Package, PauseCircle, PlayCircle, RefreshCw, ShieldAlert, ShieldCheck, Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { getSoloceoAuth, soloceoApi } from "@/components/workspace/soloceo-api";

type Overview = {
  orgs: Record<string, number>; ventures: Record<string, number>; installs: Record<string, number>;
  revenue30d: number; pendingApprovals: number; pendingListings: number;
};
type Org = { id: string; name: string; plan: string; status: string; createdAt: string };
type Venture = { id: string; name: string; slug: string; status: string; revenueVerified: boolean; org: { name: string; plan: string } };
type Install = { id: string; status: string; url?: string | null; venture: { name: string }; catalogApp: { key: string; name: string } };
type Approval = { id: string; action?: string; summary?: string; status: string; createdAt: string };
type Agent = { name: string; description: string };

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";
const TABS = ["Tổng quan", "Org & Gói", "Venture & App", "Phê duyệt", "Trợ lý mặc định"] as const;

export function SoloceoAdmin() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tổng quan");
  const [ov, setOv] = useState<Overview | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [busyOrg, setBusyOrg] = useState<string | null>(null);
  const [confirmOrg, setConfirmOrg] = useState<string | null>(null); // suspend 2 bước
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      const auth = await getSoloceoAuth();
      if (!auth.platformAdmin) { setAllowed(false); return; }
      setAllowed(true);
      const [o, og, vs, ins, ap, ag] = await Promise.all([
        soloceoApi<Overview>("/admin/overview"),
        soloceoApi<Org[]>("/admin/orgs"),
        soloceoApi<Venture[]>("/admin/ventures"),
        soloceoApi<Install[]>("/admin/installs"),
        soloceoApi<Approval[]>("/admin/approvals"),
        soloceoApi<{ agents: Agent[] }>("/admin/agents"),
      ]);
      setOv(o); setOrgs(og); setVentures(vs); setInstalls(ins); setApprovals(ap);
      setAgents(ag.agents ?? []);
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes("admin") || m.includes("403") || m.toLowerCase().includes("forbidden")) setAllowed(false);
      else setErr(m);
    }
  }, []);
  useEffect(() => { void loadAll(); }, [loadAll]);

  async function toggleOrg(org: Org) {
    if (busyOrg) return;
    if (confirmOrg !== org.id) { setConfirmOrg(org.id); return; }
    setBusyOrg(org.id); setConfirmOrg(null);
    try {
      await soloceoApi(`/admin/orgs/${org.id}/${org.status === "SUSPENDED" ? "activate" : "suspend"}`, { method: "PATCH" });
      await loadAll();
    } catch (e) { setErr((e as Error).message); } finally { setBusyOrg(null); }
  }

  if (allowed === false) {
    return (
      <WorkspaceContainer><WorkspaceHeader /><WorkspaceBody>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold">Khu vực quản trị</h1>
          <p className="text-muted-foreground mt-1 text-sm">Tài khoản của bạn không có quyền quản trị nền tảng.</p>
        </div>
      </WorkspaceBody></WorkspaceContainer>
    );
  }

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">Quản trị SoloCEO</h1>
              <p className="text-muted-foreground text-sm">Cockpit vận hành — mọi hành động đều ghi audit log.</p>
            </div>
            <a href="https://admin.soloceo.vn" target="_blank" rel="noopener noreferrer"
              className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">Mở Appsmith ↗</a>
            <button onClick={() => void loadAll()} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              <RefreshCw className="h-3.5 w-3.5" /> Tải lại
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-1 rounded-lg border bg-card p-1">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                {t}{t === "Phê duyệt" && ov?.pendingApprovals ? ` (${ov.pendingApprovals})` : ""}
              </button>
            ))}
          </div>

          {err && <p className="mb-3 text-sm text-red-600">{err}</p>}
          {allowed === null ? (
            <div className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</div>
          ) : tab === "Tổng quan" && ov ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Card icon={<Users className="h-4 w-4" />} label="Org" value={String(Object.values(ov.orgs).reduce((a, b) => a + b, 0))}
                sub={Object.entries(ov.orgs).map(([k, v]) => `${v} ${k}`).join(" · ")} />
              <Card icon={<Building2 className="h-4 w-4" />} label="Venture" value={String(Object.values(ov.ventures).reduce((a, b) => a + b, 0))}
                sub={Object.entries(ov.ventures).map(([k, v]) => `${v} ${k}`).join(" · ")} />
              <Card icon={<LineChart className="h-4 w-4" />} label="Doanh thu 30 ngày (verified)" value={vnd(ov.revenue30d)} />
              <Card icon={<Package className="h-4 w-4" />} label="App đã cài" value={String(Object.values(ov.installs).reduce((a, b) => a + b, 0))}
                sub={Object.entries(ov.installs).map(([k, v]) => `${v} ${k}`).join(" · ")} />
              <Card icon={<ShieldAlert className="h-4 w-4" />} label="Chờ phê duyệt HITL" value={String(ov.pendingApprovals)} accent={ov.pendingApprovals > 0} />
              <Card icon={<Landmark className="h-4 w-4" />} label="Listing M&A chờ duyệt" value={String(ov.pendingListings)} accent={ov.pendingListings > 0} />
            </div>
          ) : tab === "Org & Gói" ? (
            <Table head={["Org", "Gói", "Trạng thái", "Hành động"]}>
              {orgs.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{o.name}</td>
                  <td className="px-3 py-2">{o.plan}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${o.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>{o.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => void toggleOrg(o)} disabled={busyOrg === o.id}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${confirmOrg === o.id ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40" : "hover:bg-muted"}`}>
                      {o.status === "SUSPENDED" ? <PlayCircle className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                      {confirmOrg === o.id ? "Bấm lần nữa xác nhận" : o.status === "SUSPENDED" ? "Kích hoạt lại" : "Tạm ngưng"}
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          ) : tab === "Venture & App" ? (
            <div className="space-y-6">
              <Table head={["Venture", "Org (gói)", "Trạng thái", "DT verified"]}>
                {ventures.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{v.name} <span className="text-muted-foreground text-xs">({v.slug})</span></td>
                    <td className="px-3 py-2">{v.org.name} <span className="text-muted-foreground text-xs">({v.org.plan})</span></td>
                    <td className="px-3 py-2">{v.status}</td>
                    <td className="px-3 py-2">{v.revenueVerified ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : "—"}</td>
                  </tr>
                ))}
              </Table>
              <Table head={["App", "Venture", "Trạng thái", "URL"]}>
                {installs.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{i.catalogApp.name}</td>
                    <td className="px-3 py-2">{i.venture.name}</td>
                    <td className="px-3 py-2">{i.status}</td>
                    <td className="px-3 py-2">{i.url ? <a className="text-emerald-700 hover:underline dark:text-emerald-400" href={i.url} target="_blank" rel="noopener noreferrer">mở ↗</a> : "—"}</td>
                  </tr>
                ))}
              </Table>
            </div>
          ) : tab === "Phê duyệt" ? (
            approvals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Không có yêu cầu nào đang chờ. <Activity className="inline h-4 w-4" /></p>
            ) : (
              <div className="space-y-2">
                {approvals.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1">{a.summary || a.action || a.id}</span>
                    <span className="text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                ))}
                <p className="text-muted-foreground text-xs">Chủ org tự quyết trong trang <a className="underline" href="/workspace/phe-duyet">Phê duyệt</a> — cockpit chỉ giám sát.</p>
              </div>
            )
          ) : (
            <div>
              <p className="text-muted-foreground mb-3 text-sm">
                <Bot className="mr-1 inline h-4 w-4" /> {agents.length} trợ lý mặc định — user thường không xoá/sửa được (409).
                Xoá thật: xoá thư mục trên máy chủ hoặc qua Appsmith.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {agents.map((a) => (
                  <div key={a.name} className="rounded-lg border bg-card p-3 text-sm">
                    <p className="font-medium">{a.description.split(" — ")[0] || a.name}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{a.name} · {a.description.split(" — ").slice(1).join(" — ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}

function Card({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "bg-card"}`}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">{icon}{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="text-muted-foreground mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead><tr className="text-muted-foreground text-left text-xs uppercase">
          {head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
