"use client";

import { useMemo, useState } from "react";
import { formatVnd, type Product } from "@/lib/store";

interface CartLine {
  product: Product;
  qty: number;
}

export default function Storefront({
  products,
  storeName,
}: {
  products: Product[];
  storeName: string;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "" });

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({
          product: products.find((p) => p.id === id)!,
          qty,
        }))
        .filter((l) => l.product),
    [cart, products],
  );
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const add = (id: string) =>
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  async function checkout() {
    if (!customer.name || !customer.phone) {
      setMessage("Vui lòng nhập tên và số điện thoại.");
      return;
    }
    setCheckingOut(true);
    setMessage(null);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items: lines.map((l) => ({
            id: l.product.id,
            name: l.product.name,
            price: l.product.price,
            qty: l.qty,
          })),
          total,
        }),
      });
      const data = await r.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl; // chuyển sang cổng thanh toán
        return;
      }
      setMessage(
        data.message ??
          "Đã ghi nhận đơn hàng! Chúng tôi sẽ liên hệ xác nhận sớm.",
      );
      setCart({});
    } catch {
      setMessage("Có lỗi khi đặt hàng, vui lòng thử lại.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main className="container" style={{ marginTop: -32, paddingBottom: 60 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 24,
        }}
      >
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 20,
            }}
          >
            {products.map((p) => (
              <div key={p.id} className="card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  style={{ width: "100%", height: 200, objectFit: "cover" }}
                />
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 16 }}>{p.name}</h3>
                  <p
                    style={{
                      color: "#8a8aa0",
                      fontSize: 13,
                      margin: "6px 0 12px",
                      minHeight: 34,
                    }}
                  >
                    {p.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <b style={{ color: "var(--accent)", fontSize: 17 }}>
                      {formatVnd(p.price)}
                    </b>
                    <button className="btn" onClick={() => add(p.id)}>
                      Thêm
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {count > 0 && (
          <aside
            className="card"
            style={{
              position: "sticky",
              bottom: 16,
              padding: 20,
              maxWidth: 460,
              marginLeft: "auto",
            }}
          >
            <h3 style={{ marginBottom: 12 }}>Giỏ hàng ({count})</h3>
            {lines.map((l) => (
              <div
                key={l.product.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                <span style={{ flex: 1 }}>{l.product.name}</span>
                <button onClick={() => dec(l.product.id)}>−</button>
                <span style={{ margin: "0 10px" }}>{l.qty}</span>
                <button onClick={() => add(l.product.id)}>+</button>
                <b style={{ width: 90, textAlign: "right" }}>
                  {formatVnd(l.product.price * l.qty)}
                </b>
              </div>
            ))}
            <div
              style={{
                borderTop: "1px solid #eee",
                margin: "12px 0",
                paddingTop: 12,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
              }}
            >
              <b>Tổng</b>
              <b style={{ color: "var(--accent)" }}>{formatVnd(total)}</b>
            </div>
            <input
              placeholder="Họ tên người nhận"
              value={customer.name}
              onChange={(e) =>
                setCustomer((c) => ({ ...c, name: e.target.value }))
              }
              style={inputStyle}
            />
            <input
              placeholder="Số điện thoại"
              value={customer.phone}
              onChange={(e) =>
                setCustomer((c) => ({ ...c, phone: e.target.value }))
              }
              style={inputStyle}
            />
            <button
              className="btn"
              style={{ width: "100%", marginTop: 8 }}
              disabled={checkingOut}
              onClick={checkout}
            >
              {checkingOut ? "Đang xử lý..." : "Đặt hàng & thanh toán"}
            </button>
            {message && (
              <p style={{ marginTop: 10, fontSize: 14, color: "#333" }}>
                {message}
              </p>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #e0e0ec",
  borderRadius: 8,
  marginTop: 8,
  fontSize: 14,
};
