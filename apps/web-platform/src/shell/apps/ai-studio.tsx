"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface Venture {
  id: string;
  installs: Array<{
    status: string;
    url?: string | null;
    catalogApp?: { key: string };
  }>;
}

interface UsageSummary {
  totalCostUsd: number;
  totalTokens: number;
  budgetUsd: number;
  budgetUsedPct: number;
}

export default function AiStudioApp() {
  const [difyUrl, setDifyUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const ventures = await api<Venture[]>("/ventures");
      const first = ventures[0];
      if (first) {
        const installs = await api<
          Array<{ status: string; url?: string | null; catalogApp: { key: string } }>
        >(`/ventures/${first.id}/installs`);
        const dify = installs.find(
          (i) => i.catalogApp.key === "dify" && i.status === "RUNNING",
        );
        setDifyUrl(dify?.url ?? null);
      }
      setSummary(await api<UsageSummary>("/ai/usage/summary"));
    } catch {
      // chưa có dữ liệu
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function simulate() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<{ costUsd: number }>("/ai/dev-simulate-usage", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage(`✓ Đã mô phỏng 1 lời gọi AI (~$${r.costUsd.toFixed(4)})`);
      await reload();
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 429) {
        setMessage(`⚠️ ${e.message}`);
      } else {
        setMessage(e instanceof Error ? e.message : "Lỗi");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dify của bạn</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          {difyUrl ? (
            <>
              <p className="text-sm text-[#A0A0B8]">
                Trợ lý AI đang chạy trên hạ tầng riêng của bạn.
              </p>
              <a href={difyUrl} target="_blank" rel="noreferrer">
                <Button size="sm">Mở AI Studio ↗</Button>
              </a>
            </>
          ) : (
            <p className="text-sm text-[#A0A0B8]">
              Chưa cài AI Studio — vào App Store cài Dify (cần gói Tăng trưởng
              trở lên). Sau khi cài, 2 trợ lý mẫu tiếng Việt (Trợ lý bán hàng,
              Trợ lý nội dung) được seed sẵn.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ngân sách AI tháng này</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {summary ? (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-2xl font-bold text-accent-soft">
                  ${summary.totalCostUsd.toFixed(2)}
                </span>
                <span className="text-[#A0A0B8]">
                  / ${summary.budgetUsd.toFixed(2)} ngân sách gói
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className={`h-full rounded-full ${
                    summary.budgetUsedPct >= 100
                      ? "bg-red-500"
                      : summary.budgetUsedPct >= 80
                        ? "bg-amber-400"
                        : "bg-accent"
                  }`}
                  style={{ width: `${Math.min(100, summary.budgetUsedPct)}%` }}
                />
              </div>
              <p className="text-xs text-[#A0A0B8]">
                {summary.totalTokens.toLocaleString("vi-VN")} tokens ·{" "}
                {summary.budgetUsedPct.toFixed(0)}% ngân sách
                {summary.budgetUsedPct >= 80 && summary.budgetUsedPct < 100 && (
                  <span className="text-amber-400"> — sắp chạm ngưỡng!</span>
                )}
                {summary.budgetUsedPct >= 100 && (
                  <span className="text-red-400"> — đã vượt, AI tạm khóa</span>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-[#A0A0B8]">Chưa có dữ liệu.</p>
          )}
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" disabled={busy} onClick={simulate}>
              {busy ? "Đang gọi..." : "Demo: mô phỏng 1 lời gọi AI"}
            </Button>
            {message && <span className="text-xs text-[#A0A0B8]">{message}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
