// /san-pham/xuong-kiem-chung — giới thiệu sandbox.soloceo.vn
// Thông điệp trung tâm: đây là cái CỔNG. Trước khi có nó, sàn đầy "dự án mẫu" chỉ có mô tả.
import { KhungSanPham, Muc, TheBuoc, NutMo } from "@/components/landing/san-pham-shared";

export const revalidate = 300;

const XUONG = "https://sandbox.soloceo.vn";

async function layTongQuan() {
  try {
    const r = await fetch(`${XUONG}/api/tong-quan`, { next: { revalidate: 300 } });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as {
      tong: number;
      theo_trang_thai: Record<string, number>;
      nguong_dat: number;
      tieu_chi: { ma: string; ten: string; trong_so: number; mo_ta: string }[];
    };
  } catch {
    return null;
  }
}

const so = (n?: number) => (n == null ? "0" : n.toLocaleString("vi-VN"));

export default async function Page() {
  const d = await layTongQuan();
  const t = d?.theo_trang_thai || {};

  return (
    <KhungSanPham
      dang="xuong"
      nhan="Sản phẩm · Khâu 2"
      tieu_de={<>Ý tưởng phải chạy được<br />thì mới được đi tiếp</>}
      dan_nhap="Xưởng kiểm chứng là cái cổng giữa ý tưởng và sản phẩm. Mỗi ý tưởng từ bộ não dữ liệu bị chấm điểm theo sáu tiêu chí có căn cứ, rồi mới được giao cho subagent dựng thành MVP. Chỉ khi gọi thử mà nó thật sự trả về kết quả, dự án mới được lên sàn."
      so_lieu={[
        { nhan: "Dự án trong xưởng", so: so(d?.tong), chu_thich: "hút từ bộ não dữ liệu" },
        { nhan: "Đang dựng MVP", so: so(t["dang-xay"]), chu_thich: "subagent thực thi" },
        { nhan: "Nghiệm thu đạt", so: so(t["nghiem-thu"]), chu_thich: "đã gọi thử, chạy thật" },
        { nhan: "Điểm sàn", so: String(d?.nguong_dat ?? 65), chu_thich: "dưới mức này thì dừng" },
      ]}
    >
      <Muc tieu_de="Vấn đề mà xưởng này sinh ra để giải">
        <div className="rounded-2xl border border-[#5c2b2b] bg-[#1b0f0f] p-5">
          <div className="text-[14px] font-medium text-[#f85149]">Trước khi có xưởng</div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#c9c9d0]">
            Sàn từng có 100 “dự án mẫu” — nhưng cả 100 mục dùng chung một khối thành phần y hệt nhau,
            tên gọi chung chung, và <b>không có gì chạy được đằng sau</b>. Đó là danh mục ý niệm,
            không phải sản phẩm. Người mua không có gì để bấm vào thử.
          </p>
          <div className="mt-4 text-[14px] font-medium text-[#3fb950]">Từ khi có xưởng</div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#c9c9d0]">
            Một dự án chỉ lên sàn khi <b>địa chỉ demo của nó trả về kết quả thật</b> và qua được
            kiểm thử khói. Không đạt thì nằm lại xưởng, ghi rõ hỏng ở đâu.
          </p>
        </div>
      </Muc>

      <Muc tieu_de="Năm bước trong xưởng">
        <TheBuoc
          cac={[
            { ten: "Hút ý tưởng", mo_ta: "Lấy các ý tưởng điểm cao nhất từ bộ não dữ liệu, kèm nguyên bản 9 khối BMC." },
            { ten: "Kiểm chứng sáu tiêu chí", mo_ta: "Đối chiếu với kho vấn đề, giải pháp, mô hình kinh doanh có thật. Tiêu chí nào không tìm được căn cứ thì bị điểm thấp — không suy đoán rồi cho điểm cao." },
            { ten: "Giao subagent dựng MVP", mo_ta: "Ý tưởng qua điểm sàn mới được dựng thành mã chạy được và triển khai lên một địa chỉ riêng." },
            { ten: "Nghiệm thu", mo_ta: "Gọi thử địa chỉ đó: phải trả mã 2xx, có nội dung thật, không phải trang lỗi mặc định, phản hồi dưới 15 giây." },
            { ten: "Xuất bản", mo_ta: "Chỉ khi nghiệm thu đạt, dự án mới được đẩy sang sàn kèm liên kết demo bấm vào được." },
          ]}
        />
      </Muc>

      {d?.tieu_chi?.length ? (
        <Muc tieu_de="Sáu tiêu chí chấm điểm">
          <div className="grid gap-2.5 md:grid-cols-2">
            {d.tieu_chi.map((c) => (
              <div key={c.ma} className="rounded-xl border border-[#232326] bg-[#131315] p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-medium">{c.ten}</span>
                  <span className="font-mono text-[11px] text-[#e3b341]">{c.trong_so}%</span>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#8b8b92]">{c.mo_ta}</p>
              </div>
            ))}
          </div>
        </Muc>
      ) : null}

      <Muc tieu_de="Kiểm thử khói — điều kiện không thể bỏ qua">
        <div className="grid gap-2.5 md:grid-cols-4">
          {[
            ["Trả về 2xx", "Địa chỉ demo phải thật sự phản hồi"],
            ["Có nội dung", "Trên 500 ký tự — không phải trang trắng"],
            ["Không phải trang lỗi", "Loại 502, no available server, Cannot GET"],
            ["Dưới 15 giây", "Chậm quá thì coi như chưa dùng được"],
          ].map(([t, m]) => (
            <div key={t} className="rounded-xl border border-[#1e4620] bg-[#0f2413] p-4">
              <div className="text-[13px] font-medium text-[#3fb950]">✓ {t}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-[#8b8b92]">{m}</p>
            </div>
          ))}
        </div>
      </Muc>

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <NutMo href={XUONG} chu="Xem xưởng đang làm gì" />
        <a href="/san-pham/san-giao-dich" className="text-[13.5px] text-[#8b8b92] hover:text-[#e6e6e6]">
          Bước tiếp theo: sản phẩm đã chạy được thì bán thế nào →
        </a>
      </div>
    </KhungSanPham>
  );
}
