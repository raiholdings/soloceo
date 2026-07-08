"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

// Cửa sổ Tên miền: tìm + mua tên miền ngay trên OS (đại lý Nhân Hòa).
// Luồng: tìm → chọn đuôi còn trống → điền chủ thể → đặt mua → admin duyệt
// (human-in-the-loop vì chi tiền số dư đại lý) → ACTIVE.

interface SearchRow {
  domain: string;
  name: string;
  ext: string;
  available: boolean | null;
  priceVnd: number | null;
  renewVnd: number | null;
}

interface DomainOrder {
  id: string;
  domain: string;
  ext: string;
  years: number;
  priceVnd: string;
  status: string;
  providerMsg?: string | null;
  createdAt: string;
}

const STATUS_VI: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: "Chờ thanh toán", color: "#f59e0b" },
  PENDING_APPROVAL: { label: "Chờ duyệt", color: "#f59e0b" },
  REGISTERING: { label: "Đang đăng ký", color: "#38bdf8" },
  ACTIVE: { label: "Đã kích hoạt", color: "#4ade80" },
  FAILED: { label: "Thất bại", color: "#f87171" },
  CANCELED: { label: "Đã hủy", color: "#8a8aa0" },
};

function vnd(v: number | string | null): string {
  if (v == null) return "—";
  return Number(v).toLocaleString("vi-VN") + "₫";
}

export default function DomainsApp() {
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [buying, setBuying] = useState<SearchRow | null>(null);
  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [contact, setContact] = useState({
    realname: "",
    phone: "",
    email: "",
    city: "",
    company: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadOrders = useCallback(() => {
    api<DomainOrder[]>("/domains/orders").then(setOrders).catch(() => {});
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    setMessage(null);
    setRows([]);
    try {
      const r = await api<{ results: SearchRow[] }>(
        `/domains/search?q=${encodeURIComponent(q.trim())}`,
      );
      setRows(r.results);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  }

  async function order() {
    if (!buying) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await api("/domains/orders", {
        method: "POST",
        body: JSON.stringify({
          domain: buying.name,
          ext: buying.ext,
          years: 1,
          contact,
        }),
      });
      setMessage(
        `✓ Đã đặt mua ${buying.domain} — SoloCEO sẽ duyệt và kích hoạt trong vòng 24h.`,
      );
      setBuying(null);
      loadOrders();
    } catch (e) {
      setMessage(
        e instanceof ApiRequestError ? e.message : "Lỗi đặt mua, thử lại sau",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tìm tên miền cho doanh nghiệp</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="vd: cuahangcuatoi"
              className="flex-1 rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
            <Button size="sm" disabled={searching} onClick={search}>
              {searching ? "Đang kiểm tra..." : "Kiểm tra"}
            </Button>
          </div>
          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <div
                  key={r.domain}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-canvas px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-white">
                      {r.domain}
                    </span>
                    <span
                      className="ml-3 text-xs"
                      style={{
                        color:
                          r.available === true
                            ? "#4ade80"
                            : r.available === false
                              ? "#f87171"
                              : "#8a8aa0",
                      }}
                    >
                      {r.available === true
                        ? "Còn trống"
                        : r.available === false
                          ? "Đã có người mua"
                          : "Không kiểm tra được"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-accent-soft">
                      {vnd(r.priceVnd)}/năm
                    </span>
                    <Button
                      size="sm"
                      disabled={r.available !== true}
                      onClick={() => setBuying(r)}
                    >
                      Mua
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {message && <p className="text-xs text-[#A0A0B8]">{message}</p>}
        </CardContent>
      </Card>

      {buying && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Thông tin chủ thể — {buying.domain} ({vnd(buying.priceVnd)}/năm)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Họ tên chủ thể *"
                value={contact.realname}
                onChange={(e) =>
                  setContact((c) => ({ ...c, realname: e.target.value }))
                }
                className="rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="SĐT (+84...) *"
                value={contact.phone}
                onChange={(e) =>
                  setContact((c) => ({ ...c, phone: e.target.value }))
                }
                className="rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="Email *"
                value={contact.email}
                onChange={(e) =>
                  setContact((c) => ({ ...c, email: e.target.value }))
                }
                className="rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="Tỉnh/Thành phố *"
                value={contact.city}
                onChange={(e) =>
                  setContact((c) => ({ ...c, city: e.target.value }))
                }
                className="rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="Công ty (nếu có)"
                value={contact.company}
                onChange={(e) =>
                  setContact((c) => ({ ...c, company: e.target.value }))
                }
                className="col-span-2 rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={submitting} onClick={order}>
                {submitting ? "Đang gửi..." : `Xác nhận mua ${buying.domain}`}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBuying(null)}>
                Hủy
              </Button>
            </div>
            <p className="text-xs text-[#8a8aa0]">
              Sau khi đặt mua, SoloCEO xác nhận và kích hoạt trong vòng 24h. Phí
              ghi nhận vào chi phí doanh nghiệp của bạn.
            </p>
          </CardContent>
        </Card>
      )}

      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tên miền của bạn</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {orders.map((o) => {
              const st = STATUS_VI[o.status] ?? {
                label: o.status,
                color: "#8a8aa0",
              };
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-canvas px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">
                    {o.domain}
                    {o.ext}
                  </span>
                  <span className="text-[#A0A0B8]">{vnd(o.priceVnd)}</span>
                  <span style={{ color: st.color }}>{st.label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
