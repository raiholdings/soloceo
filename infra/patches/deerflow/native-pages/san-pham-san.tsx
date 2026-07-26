// /san-pham/san-giao-dich — giới thiệu marketplace.soloceo.vn
// Nguyên tắc trình bày: chỉ đếm những dự án CÓ demo thật. Nếu đếm cả mục không có demo
// thì trang này lặp lại đúng cái sai mà xưởng kiểm chứng sinh ra để sửa.
import { KhungSanPham, Muc, TheBuoc, NutMo } from "@/components/landing/san-pham-shared";

export const revalidate = 600;

const SAN = "https://marketplace.soloceo.vn";
const API = "https://api.soloceo.vn";

type Mau = { id: string; name: string; slug: string; industry?: string; summary?: string; demoUrl?: string };

async function layMau() {
  try {
    const r = await fetch(`${API}/v1/marketplace/project-templates`, { next: { revalidate: 600 } });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const ds: Mau[] = Array.isArray(d) ? d : d.templates || d.items || [];
    return { tong: ds.length, co_demo: ds.filter((x) => x.demoUrl), ds };
  } catch {
    return null;
  }
}

const so = (n?: number) => (n == null ? "0" : n.toLocaleString("vi-VN"));

export default async function Page() {
  const d = await layMau();
  const coDemo = d?.co_demo || [];
  const nganh = new Set((d?.ds || []).map((x) => x.industry).filter(Boolean));

  return (
    <KhungSanPham
      dang="san"
      nhan="Sản phẩm · Khâu 3"
      tieu_de={<>Mua một doanh nghiệp<br />đã chạy được rồi</>}
      dan_nhap="Sàn không bán ý tưởng và không bán mô tả. Mỗi mục ở đây là một sản phẩm đã đi qua xưởng kiểm chứng, có địa chỉ demo bấm vào được và được gọi thử định kỳ để bảo đảm vẫn còn sống."
      so_lieu={[
        { nhan: "Đang niêm yết", so: so(d?.tong), chu_thich: "tổng số mục trên sàn" },
        { nhan: "Có demo chạy thật", so: so(coDemo.length), chu_thich: "bấm vào dùng thử ngay" },
        { nhan: "Ngành nghề", so: so(nganh.size), chu_thich: "phân theo lĩnh vực" },
        { nhan: "Nguồn gốc", so: "100%", chu_thich: "từ dữ liệu thật, qua kiểm chứng" },
      ]}
    >
      <Muc tieu_de="Người mua nhận được gì">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Sản phẩm chạy được", "Không phải bản mô tả hay bộ slide. Có địa chỉ demo, bấm vào là thấy nó hoạt động."],
            ["Hồ sơ đầy đủ phía sau", "Vấn đề nó giải, giải pháp dựa trên công nghệ nào, mô hình doanh thu, chín khối BMC và lộ trình — tất cả truy được về dữ liệu gốc."],
            ["Đội AI vận hành sẵn", "Chuyển giao xong là đưa thẳng vào workspace; subagent tiếp quản việc vận hành hằng ngày."],
          ].map(([t, m]) => (
            <div key={t} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
              <div className="text-[14px] font-medium">{t}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8b8b92]">{m}</p>
            </div>
          ))}
        </div>
      </Muc>

      <Muc tieu_de="Một sản phẩm lên sàn bằng cách nào">
        <TheBuoc
          cac={[
            { ten: "Sinh ra từ dữ liệu", mo_ta: "Ý tưởng được đúc từ gần một triệu bản ghi thật trong bộ não dữ liệu, không phải từ suy đoán." },
            { ten: "Qua sáu tiêu chí", mo_ta: "Chấm điểm dựa trên căn cứ có thật; không đủ điểm sàn thì dừng ở xưởng." },
            { ten: "Dựng thành MVP", mo_ta: "Subagent viết mã và triển khai lên một địa chỉ chạy được." },
            { ten: "Nghiệm thu", mo_ta: "Gọi thử: phải trả 2xx, có nội dung thật, không phải trang lỗi, phản hồi dưới 15 giây." },
            { ten: "Niêm yết", mo_ta: "Lên sàn kèm liên kết demo; sau đó vẫn bị gọi thử định kỳ — hỏng thì gỡ xuống." },
          ]}
        />
      </Muc>

      {coDemo.length ? (
        <Muc tieu_de={`Đang có demo chạy thật (${coDemo.length})`}>
          <div className="grid gap-3 md:grid-cols-2">
            {coDemo.slice(0, 6).map((m) => (
              <div key={m.id} className="rounded-2xl border border-[#232326] bg-[#131315] p-5">
                <div className="text-[14px] font-medium">{m.name}</div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#8b8b92]">{m.summary}</p>
                <a
                  href={m.demoUrl}
                  target="_blank"
                  rel="noopener"
                  className="mt-3 inline-block text-[12.5px] text-[#3fb950] hover:underline"
                >
                  Mở demo ↗
                </a>
              </div>
            ))}
          </div>
        </Muc>
      ) : (
        <Muc tieu_de="Chưa có sản phẩm nào qua được cổng">
          <div className="rounded-2xl border border-dashed border-[#2f2f34] bg-[#131315] p-8 text-center">
            <p className="text-[14px] text-[#c9c9d0]">Sàn đang được dựng lại theo tiêu chuẩn mới.</p>
            <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-[#8b8b92]">
              Các mục cũ chỉ có mô tả mà không có gì chạy được nên đã bị gỡ khỏi diện niêm yết.
              Sản phẩm mới sẽ xuất hiện ở đây ngay khi đi qua xưởng kiểm chứng và
              chứng minh được là nó thật sự chạy.
            </p>
            <a
              href="/san-pham/xuong-kiem-chung"
              className="mt-5 inline-block rounded-xl border border-[#2f2f34] px-4 py-2.5 text-[13px] text-[#e6e6e6] hover:border-[#3fb950] hover:text-[#3fb950]"
            >
              Xem xưởng đang dựng gì →
            </a>
          </div>
        </Muc>
      )}

      <div className="mt-14 flex flex-wrap items-center gap-3">
        <NutMo href={SAN} chu="Mở sàn sản phẩm" />
        <a href="/san-pham/du-lieu" className="text-[13.5px] text-[#8b8b92] hover:text-[#e6e6e6]">
          Quay lại đầu dây chuyền: bộ não dữ liệu →
        </a>
      </div>
    </KhungSanPham>
  );
}
