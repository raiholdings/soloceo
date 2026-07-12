// Điều khoản dịch vụ — trang công khai (blocker go-live). Không cần đăng nhập.
export const metadata = { title: "Điều khoản dịch vụ — SoloCEO.vn" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-relaxed">
      <a href="/" className="text-muted-foreground text-sm hover:underline">← Về trang chủ</a>
      <h1 className="mt-4 mb-2 text-2xl font-bold">Điều khoản dịch vụ</h1>
      <p className="text-muted-foreground mb-8">Cập nhật: 12/07/2026 · Áp dụng cho nền tảng SoloCEO.vn (RAI Holdings).</p>

      <Section title="1. Chấp nhận điều khoản">
        Bằng việc đăng ký, truy cập hoặc sử dụng SoloCEO.vn (“Nền tảng”), bạn (“Người dùng”) đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng.
      </Section>
      <Section title="2. Dịch vụ cung cấp">
        SoloCEO.vn là hệ điều hành AI cho doanh nghiệp một người: trợ lý AI, thư viện mô hình kinh doanh, phễu bán hàng, chợ ứng dụng (cài đặt nền tảng mã nguồn mở), quy trình, họp video, cộng đồng và các công cụ vận hành. Một số tính năng do đội ngũ AI thực hiện tự động; mọi hành động chi tiền, ký kết, gửi hàng loạt hoặc không thể hoàn tác đều yêu cầu bạn phê duyệt trước (cơ chế Human-in-the-loop).
      </Section>
      <Section title="3. Tài khoản & trách nhiệm người dùng">
        Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động dưới tài khoản của mình. Bạn cam kết cung cấp thông tin chính xác, không dùng Nền tảng cho mục đích vi phạm pháp luật Việt Nam (lừa đảo, spam, xâm phạm sở hữu trí tuệ, phát tán nội dung cấm).
      </Section>
      <Section title="4. Nội dung do AI tạo ra">
        Trợ lý AI hỗ trợ soạn thảo, phân tích, đề xuất — <b>không thay thế tư vấn chuyên môn</b> (pháp lý, thuế, y tế, đầu tư). Bạn tự chịu trách nhiệm rà soát trước khi sử dụng. SoloCEO không cam kết kết quả kinh doanh, lợi nhuận hay tỷ lệ chuyển đổi cụ thể; mọi con số minh hoạ là giả định để lập kế hoạch.
      </Section>
      <Section title="5. Thanh toán & gói cước">
        Các gói cước và phí giao dịch được niêm yết tại trang Gói cước. Phí đã thanh toán không hoàn lại trừ khi pháp luật quy định khác hoặc có thoả thuận riêng. Giao dịch bán hàng của doanh nghiệp bạn đi qua cổng thanh toán tích hợp; SoloCEO thu phí nền tảng theo tỷ lệ của gói.
      </Section>
      <Section title="6. Ứng dụng mã nguồn mở cài qua Chợ">
        Các ứng dụng cài từ Chợ ứng dụng là phần mềm mã nguồn mở của bên thứ ba, cung cấp theo giấy phép tương ứng. SoloCEO cung cấp dịch vụ đóng gói & vận hành; bạn tuân thủ giấy phép của từng phần mềm khi sử dụng.
      </Section>
      <Section title="7. Sở hữu trí tuệ">
        Bạn giữ quyền với dữ liệu và nội dung do bạn tạo. SoloCEO giữ quyền với nền tảng, mã nguồn lõi, thương hiệu. Tri thức trong trợ lý/mô hình được tổng hợp từ tài liệu có bản quyền thương mại, diễn giải lại — không phân phối nguyên bản tài liệu gốc.
      </Section>
      <Section title="8. Giới hạn trách nhiệm">
        Nền tảng cung cấp “nguyên trạng”. Trong phạm vi pháp luật cho phép, SoloCEO không chịu trách nhiệm cho thiệt hại gián tiếp, mất doanh thu, mất dữ liệu phát sinh từ việc sử dụng. Tổng trách nhiệm (nếu có) không vượt phí bạn đã trả trong 3 tháng gần nhất.
      </Section>
      <Section title="9. Tạm ngưng & chấm dứt">
        SoloCEO có thể tạm ngưng tài khoản vi phạm điều khoản hoặc gây rủi ro cho hệ thống, có thông báo hợp lý. Bạn có thể chấm dứt bất kỳ lúc nào; dữ liệu được giữ 30 ngày trước khi xoá theo yêu cầu.
      </Section>
      <Section title="10. Thay đổi điều khoản & liên hệ">
        Điều khoản có thể được cập nhật; thay đổi quan trọng sẽ được thông báo. Mọi thắc mắc: <a className="underline" href="mailto:info@fbgproperty.vn">info@fbgproperty.vn</a>. Điều khoản này chịu sự điều chỉnh của pháp luật Việt Nam.
      </Section>

      <p className="text-muted-foreground mt-8">Xem thêm: <a className="underline" href="/bao-mat">Chính sách bảo vệ dữ liệu cá nhân</a>.</p>
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
