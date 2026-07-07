"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface Venture {
  id: string;
}

interface OpenclawAccess {
  ready: boolean;
  url: string | null;
  token: string | null;
}

interface UsageSummary {
  totalCostUsd: number;
  totalTokens: number;
  budgetUsd: number;
  budgetUsedPct: number;
}

/** Ghép token vào fragment (#token=) — Control UI đọc client-side, không gửi lên server */
function controlUiSrc(url: string, token: string | null): string {
  const base = url.replace(/\/$/, "");
  return token ? `${base}/#token=${encodeURIComponent(token)}` : `${base}/`;
}

export default function AiStudioApp() {
  const [access, setAccess] = useState<OpenclawAccess | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const ventures = await api<Venture[]>("/ventures");
      const first = ventures[0];
      if (first) {
        setAccess(
          await api<OpenclawAccess>(`/ventures/${first.id}/openclaw-access`),
        );
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
    <div className="flex h-full flex-col gap-4">
      {access?.ready && access.url ? (
        <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 bg-surface px-3 py-2">
            <span className="text-sm font-medium text-white">
              Trợ lý AI OpenClaw — ra lệnh cho doanh nghiệp của bạn
            </span>
            <a href={controlUiSrc(access.url, access.token)} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">
                Mở tab mới ↗
              </Button>
            </a>
          </div>
          <iframe
            src={controlUiSrc(access.url, access.token)}
            title="OpenClaw Control UI"
            className="h-full w-full flex-1 border-0"
            allow="clipboard-read; clipboard-write; microphone"
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trợ lý AI OpenClaw</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#A0A0B8]">
              OpenClaw đang được khởi tạo trên hạ tầng riêng của bạn. Nếu vừa tạo
              doanh nghiệp, quá trình cài đặt mất vài phút — cửa sổ sẽ tự hiện khi
              sẵn sàng.
            </p>
          </CardContent>
        </Card>
      )}

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
