import { getProducts, store } from "@/lib/store";
import Storefront from "./storefront";

// Trang chủ cửa hàng (SSR): lấy sản phẩm rồi giao cho phần client (giỏ hàng).
export default async function Home() {
  const products = await getProducts();
  return (
    <>
      <header
        style={{
          background: "var(--accent)",
          color: "#fff",
          padding: "56px 0 64px",
        }}
      >
        <div className="container">
          <p style={{ opacity: 0.85, fontWeight: 600, letterSpacing: 1 }}>
            {store.name.toUpperCase()}
          </p>
          <h1 style={{ fontSize: 40, margin: "10px 0", maxWidth: 620 }}>
            {store.slogan}
          </h1>
          <p style={{ opacity: 0.9, fontSize: 17 }}>
            Đặt hàng nhanh — thanh toán an toàn qua SoloCEO.
          </p>
        </div>
      </header>
      <Storefront products={products} storeName={store.name} />
      <footer
        style={{
          textAlign: "center",
          padding: "40px 0",
          color: "#8a8aa0",
          fontSize: 14,
        }}
      >
        © {store.name} · Vận hành trên SoloCEO OS
      </footer>
    </>
  );
}
