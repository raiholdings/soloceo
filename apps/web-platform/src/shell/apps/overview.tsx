"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface Venture {
  id: string;
  name: string;
  slug: string;
  status: string;
  installs: Array<{ id: string; status: string; url?: string | null }>;
}

interface Revenue {
  mtdRevenue: number;
  ttmRevenue: number;
  revenueVerified: boolean;
  monthly: Array<{ month: string; revenue: number }>;
}

interface AiUsageSummary {
  totalCostUsd: number;
  totalTokens: number;
  budgetUsd: number | null;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Đang chuẩn bị",
  PROVISIONING: "Đang khởi tạo",
  LIVE: "Đang hoạt động",
  PAUSED: "Tạm dừng",
  LISTED: "Đang niêm yết",
  SOLD: "Đã bán",
  QUEUED: "Chờ cài",
  DEPLOYING: "Đang cài",
  RUNNING: "Đang chạy",
  FAILED: "Lỗi",
};

export default function OverviewApp() {
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [aiUsage, setAiUsage] = useState<AiUsageSummary | null>(null);

  useEffect(() => {
    api<Venture[]>("/ventures").then(async (vs) => {
      setVentures(vs);
      const first = vs[0];
      if (first) {
        api<Revenue>(`/ventures/${first.id}/revenue`)
          .then(setRevenue)
          .catch(() => {});
      }
    });
    api<AiUsageSummary>("/ai/usage/summary")
      .then(setAiUsage)
      .catch(() => setAiUsage(null));
  }, []);

  const venture = ventures[0];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-[#A0A0B8]">
            Doanh thu tháng này
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-400">
            {revenue ? formatVnd(revenue.mtdRevenue) : "—"}
          </p>
          <p className="mt-1 text-xs text-[#A0A0B8]">
            12 tháng: {revenue ? formatVnd(revenue.ttmRevenue) : "—"}
            {revenue?.revenueVerified && " · ✓ đã xác thực"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-[#A0A0B8]">
            Ứng dụng đang chạy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {venture
              ? venture.installs.filter((i) => i.status === "RUNNING").length
              : 0}
            <span className="text-sm font-normal text-[#A0A0B8]">
              {" "}
              / {venture?.installs.length ?? 0} app
            </span>
          </p>
          <p className="mt-1 text-xs text-[#A0A0B8]">
            {venture
              ? `${venture.name} — ${STATUS_LABELS[venture.status] ?? venture.status}`
              : "Chưa có venture"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-[#A0A0B8]">
            Chi phí AI tháng này
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-accent-soft">
            {aiUsage ? `$${aiUsage.totalCostUsd.toFixed(2)}` : "$0.00"}
          </p>
          <p className="mt-1 text-xs text-[#A0A0B8]">
            {aiUsage
              ? `${aiUsage.totalTokens.toLocaleString("vi-VN")} tokens`
              : "Chưa có dữ liệu"}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm text-[#A0A0B8]">
            Doanh thu 12 tháng
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenue && revenue.monthly.length > 0 ? (
            <div className="flex h-32 items-end gap-1">
              {revenue.monthly.map((m) => {
                const max = Math.max(...revenue.monthly.map((x) => x.revenue));
                return (
                  <div
                    key={m.month}
                    className="group relative flex-1 rounded-t bg-accent/60 transition hover:bg-accent"
                    style={{
                      height: `${max > 0 ? Math.max(4, (m.revenue / max) * 100) : 4}%`,
                    }}
                  >
                    <span className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#14141f] px-2 py-1 text-[10px] group-hover:block">
                      {m.month}: {formatVnd(m.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#A0A0B8]">
              Chưa có giao dịch nào — tạo payment link trong cửa sổ Doanh thu để
              bắt đầu.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
