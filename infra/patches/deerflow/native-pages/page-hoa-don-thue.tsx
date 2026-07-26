import crypto from "crypto";
import { EmbeddedSite } from "@/components/workspace/embedded-site";
import { getServerSideUser } from "@/core/auth/server";

// Hoá đơn & Thuế (Phần B+C) — nhúng thue-svc (tenant-03). Ký X-Ceo-Token server-side
// (đồng dạng crm-mcp: base64url(user_id|exp|hmac_sha256(CRM_MCP_SECRET))) và truyền qua
// ?ceo= để thue-svc tự nhận diện CRM Perfex của CEO (nối doanh thu đối chiếu).
function ceoToken(userId: string): string {
  const secret = process.env.CRM_MCP_SECRET ?? "";
  if (!secret) return "";
  const exp = Math.floor(Date.now() / 1000) + 900; // 15 phút
  const sig = crypto.createHmac("sha256", secret).update(`${userId}|${exp}`).digest("hex");
  return Buffer.from(`${userId}|${exp}|${sig}`).toString("base64url");
}

export default async function HoaDonThuePage() {
  let ceo = "";
  try {
    const auth = await getServerSideUser();
    if ((auth.tag === "authenticated" || auth.tag === "needs_setup") && auth.user) {
      ceo = ceoToken((auth.user as { id: string }).id);
    }
  } catch { /* chưa đăng nhập — trang vẫn dùng được, chỉ thiếu nối CRM tự động */ }
  const src = "https://thue.crm.soloceo.vn/" + (ceo ? "?ceo=" + encodeURIComponent(ceo) : "");
  return <EmbeddedSite src={src} title="Hoá đơn & Thuế" />;
}
