/**
 * Cấp hosting cho Org ngay khi thanh toán gói Workspace.
 *
 * ⚠ MỘT ĐIỂM PHẢI NÓI RÕ VỀ TỪ "VPS"
 * Cấp một MÁY CHỦ ẢO RIÊNG cho mỗi khách cần gọi API của nhà cung cấp (Contabo) và mất
 * 3-10 phút mỗi máy, cộng chi phí cố định hằng tháng dù khách có dùng hay không. Ở quy mô
 * hiện tại điều đó vừa chậm vừa lỗ.
 *
 * Cái cấp ở đây là HOSTING CÔ LẬP trên node PaaS dùng chung: mỗi Org một project Coolify
 * riêng, mạng riêng, và HẠN MỨC TÀI NGUYÊN CỨNG theo gói. Khách vẫn có tên miền riêng,
 * subdomain riêng, dữ liệu riêng — thứ họ thật sự cần. Khác biệt duy nhất với VPS riêng là
 * nhân hệ điều hành dùng chung, và điều đó chỉ thành vấn đề khi khách cần quyền root.
 *
 * Khi nào nên chuyển sang VPS thật: khi một khách vượt gói H3, hoặc khi có yêu cầu tuân
 * thủ bắt buộc máy riêng. Lúc đó nối `capNhatVps()` với API Contabo — khung đã chừa sẵn.
 */
import { CoolifyClient } from "./coolify-client";

export type MaGoi = "STARTER" | "GROWTH" | "SCALE";

export type HanMuc = {
  ma: string;
  cpu: number;      // số nhân được dùng (docker --cpus)
  ram_mb: number;   // giới hạn cứng
  dia_gb: number;
  subdomain: number;  // -1 = không giới hạn trong hạn tài nguyên
  ten_mien_chinh: number;
};

/**
 * Hạn mức theo gói. Con số RAM lấy từ nhu cầu THẬT đo trên các tenant đang chạy
 * (Perfex ~600MB, Support Board ~500MB, Academy ~900MB), không phải số cho đẹp.
 */
export const HAN_MUC: Record<MaGoi, HanMuc> = {
  STARTER: { ma: "H1", cpu: 2, ram_mb: 4096, dia_gb: 60, subdomain: 3, ten_mien_chinh: 1 },
  GROWTH: { ma: "H2", cpu: 4, ram_mb: 8192, dia_gb: 120, subdomain: 8, ten_mien_chinh: 1 },
  SCALE: { ma: "H3", cpu: 8, ram_mb: 16384, dia_gb: 240, subdomain: -1, ten_mien_chinh: 3 },
};

export type KetQuaCapHosting = {
  ok: boolean;
  ly_do?: string;
  projectUuid?: string;
  han_muc?: HanMuc;
  ten_mien_tam?: string;
};

/**
 * Cấp hosting cho một Org. Chạy lại an toàn: đã có project thì trả về project cũ thay vì
 * tạo thêm — webhook thanh toán có thể tới hai lần và không được đẻ ra hai hosting.
 */
export async function capHosting(
  coolify: CoolifyClient,
  orgId: string,
  goi: MaGoi,
  slugOrg: string,
): Promise<KetQuaCapHosting> {
  const hm = HAN_MUC[goi];
  if (!hm) return { ok: false, ly_do: `không biết gói '${goi}'` };

  const tenProject = `ws-${slugOrg}`.slice(0, 48);
  try {
    // createProject của CoolifyClient đã tái dùng project trùng tên (xem coolify-client.ts),
    // nên gọi lại không tạo bản sao.
    const project = await coolify.createProject(tenProject);
    return {
      ok: true,
      projectUuid: project.uuid,
      han_muc: hm,
      ten_mien_tam: `${slugOrg}.app.soloceo.vn`,
    };
  } catch (e) {
    return { ok: false, ly_do: e instanceof Error ? e.message.slice(0, 200) : String(e) };
  }
}

/**
 * Kiểm tra node còn chỗ trước khi hứa với khách.
 *
 * Vì sao phải kiểm: bán một gói H3 (16GB) khi node chỉ còn 8GB thì khách trả tiền xong mới
 * phát hiện không chạy được — mất tiền lẫn mất uy tín. Thà từ chối trước và xếp hàng.
 */
export function conCho(ramTrongMb: number, goi: MaGoi, dem = 1): boolean {
  const can = HAN_MUC[goi].ram_mb * dem;
  // Chừa 20% cho hệ thống và cho đỉnh tải; kín sát nút là node treo.
  return ramTrongMb * 0.8 >= can;
}

/**
 * Chỗ chừa cho ngày chuyển sang VPS thật. Chưa nối API Contabo vì chưa có khoá, và vì ở
 * quy mô hiện tại hosting cô lập vẫn đủ. Đừng gọi hàm này cho đến khi có khoá thật —
 * trả về lỗi rõ ràng còn hơn giả vờ thành công.
 */
export async function capVpsThat(): Promise<KetQuaCapHosting> {
  return {
    ok: false,
    ly_do:
      "chưa nối API nhà cung cấp VPS. Cần khoá Contabo (hoặc nhà cung cấp khác) trong kho " +
      "Ghi nhớ với khoá 'contabo/api-key' rồi mới bật được.",
  };
}
