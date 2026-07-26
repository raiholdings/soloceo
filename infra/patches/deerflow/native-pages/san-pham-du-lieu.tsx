// /san-pham/du-lieu — giới thiệu bigdata.soloceo.vn
// Số liệu lấy LIVE từ /api/engine, không viết cứng: trang giới thiệu mà số liệu cũ
// thì chính nó phản bội thông điệp "dữ liệu thật, cập nhật liên tục".
import { KhungSanPham, Muc, TheBuoc, NutMo } from "@/components/landing/san-pham-shared";

export const revalidate = 600;

const BIGDATA = "https://bigdata.soloceo.vn";

async function laySoLieu() {
  try {
    const r = await fetch(`${BIGDATA}/api/engine`, { next: { revalidate: 600 } });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as {
      tong_ban_ghi: number;
      nguon: { nguon: string; so_luong: number; ten?: string; license?: string }[];
      chat_luong: { diem_trung_binh: number; co_mo_ta: number };
      doc_quyen: Record<string, number>;
    };
  } catch {
    return null;
  }
}

const so = (n?: number) => (n == null ? "—" : n.toLocaleString("vi-VN"));

export default async function Page() {
  const d = await laySoLieu();
  const dq = d?.doc_quyen || {};

  return (
    <KhungSanPham
      dang="du-lieu"
      nhan="Sản phẩm · Khâu 1"
      tieu_de={<>Bộ não dữ liệu<br />của doanh nghiệp một người</>}
      dan_nhap="Gần một triệu bản ghi có thật, trọng tâm Việt Nam, mỗi bản ghi đều truy được về nguồn gốc và giấy phép. Đây là nơi ý tưởng kinh doanh được đúc ra — từ dữ liệu, không phải từ tưởng tượng."
      so_lieu={[
        { nhan: "Bản ghi thật", so: so(d?.tong_ban_ghi), chu_thich: "cập nhật hằng giờ" },
        { nhan: "Nguồn dữ liệu", so: so(d?.nguon?.length), chu_thich: "đều ghi rõ giấy phép" },
        { nhan: "Điểm chất lượng", so: d ? `${d.chat_luong.diem_trung_binh}%` : "—", chu_thich: `${d?.chat_luong.co_mo_ta ?? "—"}% có mô tả` },
        { nhan: "Liên kết tri thức", so: so(dq.canh_mang), chu_thich: "mạng lưới các nốt" },
      ]}
    >
      <Muc tieu_de="Vì sao dữ liệu này khác">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Có thật, có nguồn", "Mỗi bản ghi đến từ một nguồn mở cụ thể — OpenStreetMap, GeoNames, Wikidata, World Bank, OpenAlex — và mang theo giấy phép của nguồn đó. Không có số liệu nào do AI bịa ra."],
            ["Trọng tâm Việt Nam", "Cơ sở kinh doanh, đường phố, địa danh, doanh nghiệp theo ngành, chuyên gia, số liệu kinh tế — phần lớn khối lượng nằm ở Việt Nam, nơi dữ liệu mở vốn mỏng nhất."],
            ["Đúc lại, không sáng tác", "Giải pháp, mô hình kinh doanh, sản phẩm mẫu đều được chuẩn hoá lại TỪ dữ liệu có sẵn và giữ liên kết về nốt gốc. Kho nào chưa có thì hệ thống nói thẳng là chưa có."],
          ].map(([t, m]) => (
            <div key={t} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
              <div className="text-[14px] font-medium">{t}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8b8b92]">{m}</p>
            </div>
          ))}
        </div>
      </Muc>

      <Muc tieu_de="Mười bước của cỗ máy dữ liệu">
        <TheBuoc
          cac={[
            { ten: "Thu thập", mo_ta: "Kết nối nguồn mở trong và ngoài nước; tin tức và công nghệ cập nhật hằng giờ." },
            { ten: "Chuẩn hoá", mo_ta: "Mọi nguồn về một lược đồ chung, chống trùng theo khoá duy nhất, mô tả viết lại bằng tiếng Việt có bố cục." },
            { ten: "Làm giàu", mo_ta: "Bổ sung ngành, vùng, năm, từ khoá; nối vào mạng tri thức." },
            { ten: "Đánh giá chất lượng", mo_ta: "Chấm điểm độ đầy đủ và độ tươi từng bản ghi, gắn nguồn gốc và giấy phép." },
            { ten: "Phục vụ", mo_ta: "Mở API cho trợ lý AI của Solo CEO tra cứu trực tiếp." },
            { ten: "Phát hiện vấn đề", mo_ta: "Quét dữ liệu để rút ra vấn đề thị trường theo phương pháp JTBD, POV và 5 Whys." },
            { ten: "Đúc giải pháp", mo_ta: "Chuẩn hoá lại các công nghệ và startup có thật thành hồ sơ giải pháp." },
            { ten: "Đúc mô hình kinh doanh", mo_ta: "Từ startup đã thành công, không phải mô hình tự nghĩ." },
            { ten: "Ghép thành ý tưởng", mo_ta: "Vấn đề × giải pháp × mô hình × sản phẩm × sự kiện → bản ý tưởng có đủ 9 khối BMC và lộ trình." },
            { ten: "Cộng đồng kiểm chứng", mo_ta: "Solo CEO chấm sao và nhận thực thi; phản hồi quay lại bước phát hiện vấn đề." },
          ]}
        />
      </Muc>

      {d?.nguon?.length ? (
        <Muc tieu_de="Nguồn lớn nhất và giấy phép">
          <div className="overflow-hidden rounded-2xl border border-[#232326] bg-[#131315]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#232326] text-left text-[11px] text-[#6b6b73]">
                  <th className="px-4 py-2.5 font-normal">Nguồn</th>
                  <th className="px-4 py-2.5 font-normal">Bản ghi</th>
                  <th className="px-4 py-2.5 font-normal">Giấy phép</th>
                </tr>
              </thead>
              <tbody>
                {d.nguon.slice(0, 8).map((n) => (
                  <tr key={n.nguon} className="border-b border-[#1c1c1f] last:border-0">
                    <td className="px-4 py-2.5">{n.ten || n.nguon}</td>
                    <td className="px-4 py-2.5 font-mono text-[#8b8b92]">{so(n.so_luong)}</td>
                    <td className="px-4 py-2.5 text-[12px] text-[#6b6b73]">{n.license || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Muc>
      ) : null}

      <Muc tieu_de="Kho do hệ thống tự đúc ra">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["Vấn đề", dq.van_de], ["Giải pháp", dq.giai_phap], ["Mô hình KD", dq.mo_hinh],
            ["Sản phẩm", dq.san_pham], ["Sự kiện", dq.su_kien], ["Ý tưởng", dq.y_tuong],
          ].map(([t, n]) => (
            <div key={t as string} className="rounded-xl border border-[#232326] bg-[#131315] px-4 py-3">
              <div className="font-mono text-[20px]">{so(n as number)}</div>
              <div className="text-[12px] text-[#8b8b92]">{t as string}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#6b6b73]">
          Đây là phần dữ liệu riêng của SoloCEO — không tải được ở đâu khác, vì nó là kết quả
          đúc lại từ dữ liệu mở qua đúng phương pháp luận trên.
        </p>
      </Muc>

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <NutMo href={BIGDATA} chu="Mở bộ não dữ liệu" />
        <a href="/san-pham/xuong-kiem-chung" className="text-[13.5px] text-[#8b8b92] hover:text-[#e6e6e6]">
          Bước tiếp theo: ý tưởng được kiểm chứng thế nào →
        </a>
      </div>
    </KhungSanPham>
  );
}
