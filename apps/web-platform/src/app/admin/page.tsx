"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface AdminOrg {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: string;
  _count: { ventures: number };
}

interface PendingListing {
  id: string;
  askPrice: string | number;
  ttmRevenue?: string | number | null;
  summary: string;
  venture: { name: string; org: { name: string } };
}

interface AiUsageRow {
  org?: { name: string; plan: string };
  costUsd: number;
  tokens: number;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

// Admin Console (Phần GĐ6) — role platform_admin
export default function AdminPage() {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [pending, setPending] = useState<PendingListing[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageRow[]>([]);
  const [denied, setDenied] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [o, p, u] = await Promise.all([
        api<AdminOrg[]>("/admin/orgs"),
        api<PendingListing[]>("/admin/listings/pending"),
        api<AiUsageRow[]>("/admin/ai-usage"),
      ]);
      setOrgs(o);
      setPending(p);
      setAiUsage(u);
    } catch (e) {
      if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
        setDenied(true);
      }
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (denied) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#A0A0B8]">
          Chỉ dành cho quản trị nền tảng (role platform_admin).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-bold text-accent-soft">
        SoloCEO — Admin Console
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Listing chờ duyệt ({pending.length}) — SLA 24h
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-[#A0A0B8]">Không có listing chờ.</p>
          ) : (
            pending.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between border-t border-surface-border py-2 text-sm first:border-t-0"
              >
                <div>
                  <p className="font-semibold">
                    {l.venture.name}{" "}
                    <span className="font-normal text-[#A0A0B8]">
                      ({l.venture.org.name})
                    </span>
                  </p>
                  <p className="text-xs text-[#A0A0B8]">
                    Giá {formatVnd(Number(l.askPrice))} · TTM{" "}
                    {formatVnd(Number(l.ttmRevenue ?? 0))}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await api(`/admin/listings/${l.id}/approve`, {
                      method: "POST",
                    });
                    await reload();
                  }}
                >
                  Duyệt → LIVE
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-xs">
            <thead className="text-[#A0A0B8]">
              <tr>
                <th className="pb-2">Org</th>
                <th className="pb-2">Gói</th>
                <th className="pb-2">Ventures</th>
                <th className="pb-2">Trạng thái</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-t border-surface-border">
                  <td className="py-2">{o.name}</td>
                  <td>{o.plan}</td>
                  <td>{o._count.ventures}</td>
                  <td
                    className={
                      o.status === "ACTIVE" ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {o.status}
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await api(
                          `/admin/orgs/${o.id}/${o.status === "ACTIVE" ? "suspend" : "activate"}`,
                          { method: "PATCH" },
                        );
                        await reload();
                      }}
                    >
                      {o.status === "ACTIVE" ? "Suspend" : "Kích hoạt"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi phí AI tháng này theo org</CardTitle>
        </CardHeader>
        <CardContent>
          {aiUsage.length === 0 ? (
            <p className="text-sm text-[#A0A0B8]">Chưa có usage.</p>
          ) : (
            aiUsage.map((r, i) => (
              <div
                key={i}
                className="flex justify-between border-t border-surface-border py-2 text-sm first:border-t-0"
              >
                <span>
                  {r.org?.name ?? "?"}{" "}
                  <span className="text-xs text-[#A0A0B8]">({r.org?.plan})</span>
                </span>
                <span className="font-mono">
                  ${r.costUsd.toFixed(2)} · {r.tokens.toLocaleString("vi-VN")} tok
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
