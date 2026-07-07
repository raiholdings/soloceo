"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@soloceo/ui";

interface PublicListing {
  id: string;
  venture: { name: string; industry?: string | null; revenueVerified: boolean };
  summary: string;
  askPrice: number;
  ttmRevenueRange: string;
}

interface ListingDetail {
  id: string;
  status: string;
  venture: { name: string };
  askPrice: number;
  ttmRevenue: number;
  isOwner: boolean;
  offers: Array<{
    id: string;
    amount: string | number;
    status: string;
    message?: string | null;
    buyerOrg?: { name: string };
  }>;
}

interface Eligibility {
  eligible: boolean;
  ttmRevenue: number;
  checks: Record<
    string,
    { pass: boolean; actual: number; required: number; label: string }
  >;
}

interface Venture {
  id: string;
  name: string;
  status: string;
}

function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

const NDA_TEXT = `THỎA THUẬN BẢO MẬT (NDA)
Bằng việc bấm "Đồng ý", bạn cam kết: (1) chỉ dùng số liệu doanh thu/định giá
của venture này cho mục đích đánh giá mua lại; (2) không tiết lộ cho bên thứ ba;
(3) vi phạm sẽ chịu trách nhiệm theo pháp luật Việt Nam.`;

export default function MarketplaceApp() {
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [ndaFor, setNdaFor] = useState<string | null>(null);
  const [venture, setVenture] = useState<Venture | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [askPrice, setAskPrice] = useState(100_000_000);
  const [summary, setSummary] = useState("");
  const [offerAmount, setOfferAmount] = useState(50_000_000);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setListings(await api<PublicListing[]>("/marketplace/listings"));
    const vs = await api<Venture[]>("/ventures");
    const v = vs[0] ?? null;
    setVenture(v);
    if (v) {
      setEligibility(
        await api<Eligibility>(`/ventures/${v.id}/listing-eligibility`),
      );
    }
  }, []);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  async function openDetail(listingId: string) {
    setMessage(null);
    try {
      setDetail(await api<ListingDetail>(`/marketplace/listings/${listingId}`));
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 403) {
        setNdaFor(listingId); // cần NDA
      } else {
        setMessage(e instanceof Error ? e.message : "Lỗi");
      }
    }
  }

  async function acceptNda() {
    if (!ndaFor) return;
    await api(`/marketplace/listings/${ndaFor}/nda`, { method: "POST" });
    const id = ndaFor;
    setNdaFor(null);
    await openDetail(id);
  }

  async function createListing() {
    if (!venture) return;
    setMessage(null);
    try {
      await api("/listings", {
        method: "POST",
        body: JSON.stringify({ ventureId: venture.id, askPrice, summary }),
      });
      setMessage("✓ Đã gửi niêm yết — chờ admin duyệt (SLA 24h)");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi");
    }
  }

  async function placeOffer() {
    if (!detail) return;
    try {
      await api(`/listings/${detail.id}/offers`, {
        method: "POST",
        body: JSON.stringify({ amount: offerAmount }),
      });
      setMessage("✓ Đã gửi offer cho người bán");
      await openDetail(detail.id);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi");
    }
  }

  async function acceptOffer(offerId: string) {
    await api(`/offers/${offerId}/accept`, { method: "POST" });
    setMessage("✓ Deal chuyển sang IN_ESCROW — deal-room đã mở, admin RAI sẽ liên hệ làm escrow");
    if (detail) await openDetail(detail.id);
  }

  // ---------- render ----------
  if (ndaFor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ký NDA trước khi xem số liệu</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <pre className="whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-xs text-[#D0D0E0]">
            {NDA_TEXT}
          </pre>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNdaFor(null)}>
              Hủy
            </Button>
            <Button onClick={acceptNda}>Tôi đồng ý</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (detail) {
    return (
      <div className="flex flex-col gap-4">
        <button
          className="self-start text-xs text-[#A0A0B8] hover:text-white"
          onClick={() => setDetail(null)}
        >
          ← Quay lại sàn
        </button>
        <Card>
          <CardHeader>
            <CardTitle>{detail.venture.name}</CardTitle>
            <p className="text-xs text-[#A0A0B8]">Trạng thái: {detail.status}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#A0A0B8]">Giá chào bán</p>
                <p className="text-lg font-bold">{formatVnd(detail.askPrice)}</p>
              </div>
              <div>
                <p className="text-[#A0A0B8]">Doanh thu 12 tháng (đã xác thực)</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatVnd(detail.ttmRevenue)}
                </p>
              </div>
            </div>

            {!detail.isOwner && detail.status === "LIVE" && (
              <div className="flex items-center gap-2 border-t border-surface-border pt-3">
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(Number(e.target.value))}
                  className="h-9 w-44 rounded-xl border border-surface-border bg-transparent px-3 text-sm outline-none focus:border-accent"
                />
                <Button size="sm" onClick={placeOffer}>
                  Đặt offer
                </Button>
              </div>
            )}

            {detail.offers.length > 0 && (
              <div className="border-t border-surface-border pt-3">
                <p className="mb-2 text-xs font-semibold text-[#A0A0B8]">
                  Offers
                </p>
                {detail.offers.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <span>
                      {o.buyerOrg?.name ?? "Bạn"} — {formatVnd(Number(o.amount))}{" "}
                      <span className="text-xs text-[#A0A0B8]">({o.status})</span>
                    </span>
                    {detail.isOwner && o.status === "open" && (
                      <Button size="sm" onClick={() => acceptOffer(o.id)}>
                        Chấp nhận
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {message && <p className="text-xs text-accent-soft">{message}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {venture && eligibility && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Niêm yết {venture.name} lên Sàn M&A
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.values(eligibility.checks).map((c) => (
                <div
                  key={c.label}
                  className={`rounded-lg border px-3 py-2 ${
                    c.pass
                      ? "border-emerald-500/40 text-emerald-400"
                      : "border-surface-border text-[#A0A0B8]"
                  }`}
                >
                  {c.pass ? "✓" : "✗"} {c.label}: {c.actual.toLocaleString("vi-VN")}/
                  {c.required.toLocaleString("vi-VN")}
                </div>
              ))}
            </div>
            {eligibility.eligible ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A0A0B8]">Giá chào bán</span>
                  <input
                    type="number"
                    value={askPrice}
                    onChange={(e) => setAskPrice(Number(e.target.value))}
                    className="h-9 w-48 rounded-xl border border-surface-border bg-transparent px-3 text-sm outline-none focus:border-accent"
                  />
                  <span className="text-xs text-[#A0A0B8]">VND</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="Tóm tắt về doanh nghiệp cho người mua..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="rounded-xl border border-surface-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <Button
                  size="sm"
                  className="self-start"
                  disabled={!summary.trim()}
                  onClick={createListing}
                >
                  Niêm yết
                </Button>
              </div>
            ) : (
              <p className="text-xs text-[#A0A0B8]">
                Cần: ≥90 ngày tuổi, ≥10 giao dịch xác thực, doanh thu 12 tháng
                &gt; 0. Tiếp tục bán hàng qua nền tảng để đủ điều kiện!
              </p>
            )}
            {message && <p className="text-xs text-accent-soft">{message}</p>}
          </CardContent>
        </Card>
      )}

      <p className="text-sm font-semibold">Doanh nghiệp đang niêm yết</p>
      {listings.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#A0A0B8]">
          Chưa có niêm yết nào trên sàn.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {listings.map((l) => (
            <Card
              key={l.id}
              className="cursor-pointer transition hover:border-accent/50"
              onClick={() => openDetail(l.id)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {l.venture.name}
                  {l.venture.revenueVerified && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400">
                      ✓ Doanh thu xác thực
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#A0A0B8]">
                <p className="mb-2 line-clamp-2">{l.summary}</p>
                <p>
                  Doanh thu 12T:{" "}
                  <span className="text-white">{l.ttmRevenueRange}</span> · Giá:{" "}
                  <span className="text-accent-soft">{formatVnd(l.askPrice)}</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
