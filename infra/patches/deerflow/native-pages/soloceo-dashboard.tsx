"use client";
// Bảng điều hành "Doanh nghiệp của tôi" — thay cho màn 1 dòng "DRAFT".
// Tổng hợp từ api-core: /ventures (danh sách + trạng thái), /ventures/:id/revenue
// (doanh thu tháng/12 tháng), /approvals/pending (hàng chờ phê duyệt HITL).
import { Building2, CheckCircle2, Clock, Loader2, Rocket, ShieldAlert, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceBody, WorkspaceContainer, WorkspaceHeader } from "@/components/workspace/workspace-container";
import { soloceoApi } from "@/components/workspace/soloceo-api";

type Venture = { id: string; name: string; slug: string; industry?: string; status: string; revenueVerified?: boolean };
type Revenue = { mtdRevenue: number; ttmRevenue: number; revenueVerified: boolean; status: string };
type Approval = { id: string; action?: string; summary?: string; ventureId?: string; createdAt?: string; status?: string };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp", PROVISIONING: "Đang khởi tạo", LIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng", LISTED: "Đang niêm yết", SOLD: "Đã bán",
};
const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";

export function SoloceoDashboard() {
  const [loading, setLoading] = useState(true);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [rev, setRev] = useState<Record<string, Revenue>>({});
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const vs = await soloceoApi<Venture[]>("/ventures").catch(() => []);
        setVentures(vs);
        const ap = await soloceoApi<Approval[]>("/approvals/pending").catch(() => []);
        setApprovals(Array.isArray(ap) ? ap : []);
        const revs: Record<string, Revenue> = {};
        await Promise.all(
          vs.map(async (v) => {
            const r = await soloceoApi<Revenue>(`/ventures/${v.id}/revenue`).catch(() => null);
            if (r) revs[v.id] = r;
          }),
        );
        setRev(revs);
      } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
    })();
  }, []);

  const totalMtd = Object.values(rev).reduce((s, r) => s + (r.mtdRevenue || 0), 0);
  const totalTtm = Object.values(rev).reduce((s, r) => s + (r.ttmRevenue || 0), 0);
  const liveCount = ventures.filter((v) => v.status === "LIVE").length;

  return (
    <WorkspaceContainer>
      <WorkspaceHeader />
      <WorkspaceBody>
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <div className="mb-6 flex items-center gap-3">
            <Building2 className="h-6 w-6 text-emerald-600" />
            <div>
              <h1 className="text-xl font-semibold">Doanh nghiệp của tôi</h1>
              <p className="text-muted-foreground text-sm">Bảng điều hành — tiến độ, việc đang chạy, hàng chờ duyệt, doanh thu.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</div>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : ventures.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <Rocket className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-medium">Chưa có doanh nghiệp nào</p>
              <p className="text-muted-foreground text-sm">Tạo doanh nghiệp đầu tiên để đội ngũ AI bắt đầu làm việc.</p>
              <a href="/workspace/tao-doanh-nghiep" className="mt-4 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                <Rocket className="h-4 w-4" /> Tạo doanh nghiệp
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Thẻ tổng quan */}
              <div className="grid gap-3 sm:grid-cols-4">
                <StatCard icon={<Building2 className="h-4 w-4" />} label="Doanh nghiệp" value={String(ventures.length)} sub={`${liveCount} đang hoạt động`} />
                <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Doanh thu tháng" value={vnd(totalMtd)} />
                <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Doanh thu 12 tháng" value={vnd(totalTtm)} />
                <StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Chờ phê duyệt" value={String(approvals.length)} sub={approvals.length ? "cần bạn quyết" : "không có"} accent={approvals.length > 0} />
              </div>

              {/* Hàng chờ phê duyệt */}
              {approvals.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="mb-2 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                    <ShieldAlert className="h-4 w-4" /> {approvals.length} việc đang chờ bạn phê duyệt
                  </div>
                  <ul className="space-y-1 text-sm">
                    {approvals.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span className="truncate">{a.summary || a.action || "Yêu cầu phê duyệt"}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/workspace/phe-duyet" className="mt-2 inline-block text-sm font-medium text-amber-800 hover:underline dark:text-amber-300">Mở trang Phê duyệt →</a>
                </div>
              )}

              {/* Danh sách doanh nghiệp */}
              <div className="space-y-3">
                {ventures.map((v) => {
                  const r = rev[v.id];
                  const verified = r?.revenueVerified ?? v.revenueVerified;
                  return (
                    <div key={v.id} className="rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{v.name}</h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${v.status === "LIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                              {STATUS_LABEL[v.status] ?? v.status}
                            </span>
                            {verified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                <CheckCircle2 className="h-3 w-3" /> Doanh thu đã xác thực
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">mã {v.slug}</p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{vnd(r?.mtdRevenue ?? 0)}<span className="text-muted-foreground text-xs font-normal"> tháng này</span></div>
                          <div className="text-muted-foreground text-xs">{vnd(r?.ttmRevenue ?? 0)} / 12 tháng</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "bg-card"}`}>
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}
