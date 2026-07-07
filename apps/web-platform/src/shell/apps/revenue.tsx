"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface Venture {
  id: string;
  name: string;
}

interface Tx {
  id: string;
  direction: "IN" | "OUT" | "PLATFORM_FEE";
  grossAmount: string;
  currency: string;
  provider: string;
  customerRef?: string | null;
  occurredAt: string;
  verified: boolean;
}

interface Revenue {
  mtdRevenue: number;
  ttmRevenue: number;
  revenueVerified: boolean;
  monthly: Array<{ month: string; revenue: number }>;
}

interface CheckoutResult {
  checkoutUrl: string;
  orderCode: string;
  devSimulate?: { url: string; body: Record<string, unknown> };
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

const DIRECTION_LABELS: Record<string, string> = {
  IN: "Tiền vào",
  OUT: "Tiền ra",
  PLATFORM_FEE: "Phí nền tảng",
};

export default function RevenueApp() {
  const [venture, setVenture] = useState<Venture | null>(null);
  const [ledger, setLedger] = useState<Tx[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [amount, setAmount] = useState(500000);
  const [link, setLink] = useState<CheckoutResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const ventures = await api<Venture[]>("/ventures");
    const v = ventures[0] ?? null;
    setVenture(v);
    if (v) {
      setLedger(await api<Tx[]>(`/revenue/ledger?ventureId=${v.id}`));
      setRevenue(await api<Revenue>(`/ventures/${v.id}/revenue`));
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  async function createLink() {
    if (!venture) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await api<CheckoutResult>("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({
          type: "venture_payment",
          ventureId: venture.id,
          amount,
          provider: "payos",
        }),
      });
      setLink(r);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi tạo link");
    } finally {
      setBusy(false);
    }
  }

  async function simulatePayment() {
    if (!link?.devSimulate) return;
    setBusy(true);
    try {
      const res = await fetch(link.devSimulate.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(link.devSimulate.body),
      });
      const body = await res.json();
      setMessage(
        body.applied
          ? "✓ Khách đã thanh toán — tiền vào sổ cái!"
          : "Webhook đã nhận (trùng — idempotent, không ghi lại)",
      );
      setLink(null);
      await reload();
    } catch {
      setMessage("Không gọi được svc-billing-webhooks — service có đang chạy?");
    } finally {
      setBusy(false);
    }
  }

  if (!venture) {
    return (
      <p className="py-16 text-center text-sm text-[#A0A0B8]">
        Chưa có venture.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-[#A0A0B8]">
              Tháng này
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-emerald-400">
              {revenue ? formatVnd(revenue.mtdRevenue) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm text-[#A0A0B8]">
              12 tháng
              {revenue?.revenueVerified && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                  ✓ Doanh thu đã xác thực
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {revenue ? formatVnd(revenue.ttmRevenue) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tạo payment link bán hàng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1000}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-9 w-40 rounded-xl border border-surface-border bg-transparent px-3 text-sm outline-none focus:border-accent"
            />
            <span className="text-xs text-[#A0A0B8]">VND</span>
            <Button size="sm" disabled={busy} onClick={createLink}>
              Tạo link
            </Button>
          </div>
          {link && (
            <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-black/20 p-3 text-xs">
              <p className="break-all font-mono text-accent-soft">
                {link.checkoutUrl}
              </p>
              {link.devSimulate && (
                <Button size="sm" variant="outline" disabled={busy} onClick={simulatePayment}>
                  🧪 Demo: mô phỏng khách thanh toán
                </Button>
              )}
            </div>
          )}
          {message && <p className="text-xs text-[#A0A0B8]">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sổ cái giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#A0A0B8]">
              Chưa có giao dịch.
            </p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-[#A0A0B8]">
                <tr>
                  <th className="pb-2">Thời gian</th>
                  <th className="pb-2">Loại</th>
                  <th className="pb-2">Nguồn</th>
                  <th className="pb-2 text-right">Số tiền</th>
                  <th className="pb-2 text-center">Xác thực</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((tx) => (
                  <tr key={tx.id} className="border-t border-surface-border">
                    <td className="py-2">
                      {new Date(tx.occurredAt).toLocaleString("vi-VN")}
                    </td>
                    <td
                      className={
                        tx.direction === "IN"
                          ? "text-emerald-400"
                          : tx.direction === "PLATFORM_FEE"
                            ? "text-amber-400"
                            : "text-red-400"
                      }
                    >
                      {DIRECTION_LABELS[tx.direction]}
                    </td>
                    <td className="text-[#A0A0B8]">{tx.provider}</td>
                    <td className="text-right font-mono">
                      {formatVnd(Number(tx.grossAmount))}
                    </td>
                    <td className="text-center">{tx.verified ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
