// Chính sách bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP) — trang công khai.
export const metadata = { title: "Chính sách bảo vệ dữ liệu cá nhân — SoloCEO.vn" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed">
      <a href="/" className="text-muted-foreground text-sm hover:underline">← Về trang chủ</a>
      <h1 className="mt-4 mb-2 text-2xl font-bold">Chính sách bảo vệ dữ liệu cá nhân</h1>
      <p className="text-muted-foreground mb-8">Cập nhật: 12/07/2026 · Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</p>

      <Section title="1. Bên kiểm soát dữ liệu">
        SoloCEO.vn (RAI Holdings) là bên kiểm soát và xử lý dữ liệu cá nhân của người dùng. Liên hệ về dữ liệu: <a className="underline" href="mailto:info@fbgproperty.vn">info@fbgproperty.vn</a>.
      </Section>
      <Section title="2. Dữ liệu chúng tôi thu thập">
        (a) Dữ liệu bạn cung cấp: email, tên hiển thị, thông tin doanh nghiệp, nội dung bạn nhập/tải lên. (b) Dữ liệu vận hành: nhật ký sử dụng, thiết bị, địa chỉ IP để đảm bảo an ninh. (c) Giấy tờ bạn chủ động tải lên (CCCD, GPKD, hoá đơn) để trợ lý AI trích xuất — chỉ xử lý theo yêu cầu của bạn.
      </Section>
      <Section title="3. Mục đích & căn cứ xử lý">
        Cung cấp và vận hành dịch vụ, cá nhân hoá trải nghiệm, xử lý thanh toán, bảo mật hệ thống, tuân thủ pháp luật. Căn cứ: sự đồng ý của bạn khi đăng ký và hợp đồng cung cấp dịch vụ.
      </Section>
      <Section title="4. Che & giảm thiểu dữ liệu nhạy cảm">
        Trước khi gửi dữ liệu tới mô hình AI, hệ thống <b>tự động che (masking)</b> các dữ liệu cá nhân nhạy cảm như số CCCD/CMND, số điện thoại, số tài khoản, mã số thuế (lớp godlp) — mô hình chỉ nhận bản đã che. Đây là biện pháp giảm thiểu rủi ro rò rỉ.
      </Section>
      <Section title="5. Chia sẻ dữ liệu với bên thứ ba">
        Chúng tôi <b>không bán</b> dữ liệu cá nhân. Chỉ chia sẻ với: nhà cung cấp hạ tầng/AI cần thiết để vận hành (theo hợp đồng bảo mật), cổng thanh toán (khi bạn giao dịch), và cơ quan nhà nước khi pháp luật yêu cầu. Lưu lượng truy cập internet của môi trường AI đi qua lớp kiểm soát an ninh, chỉ tới các đích được cho phép.
      </Section>
      <Section title="6. Lưu trữ & bảo mật">
        Dữ liệu lưu trên máy chủ đặt tại các trung tâm dữ liệu có kiểm soát truy cập. Áp dụng mã hoá khi truyền (HTTPS), phân quyền theo tổ chức (mỗi doanh nghiệp cô lập dữ liệu), sao lưu định kỳ. Bí mật (khoá, token) được mã hoá AES-256.
      </Section>
      <Section title="7. Quyền của chủ thể dữ liệu (theo Nghị định 13)">
        Bạn có quyền: được biết, đồng ý/rút lại đồng ý, truy cập, chỉnh sửa, xoá, hạn chế/phản đối xử lý, yêu cầu cung cấp và khiếu nại. Để thực hiện: gửi yêu cầu tới <a className="underline" href="mailto:info@fbgproperty.vn">info@fbgproperty.vn</a>; chúng tôi phản hồi trong thời hạn luật định. Chức năng <b>xoá tài khoản</b> có sẵn — dữ liệu được xoá sau 30 ngày lưu dự phòng.
      </Section>
      <Section title="8. Thời gian lưu trữ">
        Dữ liệu được lưu trong thời gian tài khoản hoạt động và tối đa 30 ngày sau khi bạn yêu cầu xoá/chấm dứt, trừ khi pháp luật yêu cầu lưu lâu hơn (vd chứng từ giao dịch).
      </Section>
      <Section title="9. Trẻ vị thành niên">
        Dịch vụ dành cho người từ 18 tuổi trở lên hoặc có năng lực hành vi dân sự đầy đủ. Chúng tôi không cố ý thu thập dữ liệu trẻ em.
      </Section>
      <Section title="10. Thay đổi chính sách">
        Chính sách có thể cập nhật để phù hợp pháp luật và dịch vụ; thay đổi quan trọng sẽ được thông báo trước khi có hiệu lực.
      </Section>

      <p className="text-muted-foreground mt-8">Xem thêm: <a className="underline" href="/dieu-khoan">Điều khoản dịch vụ</a>.</p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
