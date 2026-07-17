# Solo CEO điển hình — OpenClawOS

> Tài liệu tham chiếu của hệ điều hành SoloCEO. Chân dung một Solo CEO thành công,
> dựng từ dữ liệu vận hành thực trên nền tảng, dùng cho onboarding, bán hàng và demo.
> Trang trong hệ điều hành: **/workspace/solo-ceo-dien-hinh**.

## Tóm tắt

**OpenClawOS** — "hệ điều hành cho doanh nghiệp một người" — là tài khoản tham chiếu
chính thức. Từ số 0, một nhà sáng lập cùng đội trợ lý AI đã xây một SaaS thuê bao đạt
**doanh thu định kỳ ~39 triệu ₫/tháng**, **260 triệu ₫ doanh thu 12 tháng đã xác thực**,
và **đủ điều kiện niêm yết Sàn M&A với định giá tham chiếu ~1,4 tỷ ₫** — trong hơn 13 tháng,
vận hành **một mình + 6 trợ lý AI**.

| Chỉ số | Giá trị |
|---|---|
| Ngành / mô hình | SaaS thuê bao (299k / 990k / 2,9tr mỗi tháng) |
| Gói nền tảng | Bứt phá (SCALE) |
| Doanh thu định kỳ (MRR) | ≈ 39.000.000 ₫/tháng, tăng đều |
| Doanh thu 12 tháng (TTM) | 260.177.000 ₫ · 402 giao dịch **đã xác thực** |
| Định giá tham chiếu (M&A) | 1.400.000.000 ₫ (~3× doanh thu năm) |
| Chi phí đội AI | < 15 USD/tháng (≈ 0,36 USD/ngày) |
| Nhân sự | 1 người + 6 trợ lý AI |
| Thời gian tới điểm định giá | 13 tháng |

## Hành trình 13 tháng

| Mốc | Sự kiện | Ý nghĩa |
|---|---|---|
| Tháng 0 | Khởi động từ số 0 | Dựng website + CRM + trợ lý AI trong vài phút; ra mắt sớm thay vì chờ hoàn hảo. |
| Tháng 2 | 5 khách hàng đầu tiên | Doanh thu đầu tiên vào sổ cái; khách trả tiền định hướng sản phẩm. |
| Tháng 4 | Bàn giao vận hành cho AI | Đội trợ lý AI chăm sóc khách 24/7; CEO chỉ phê duyệt việc rủi ro. |
| Tháng 7 | 20 khách trả phí | Phễu tự động + nội dung AI; ngừng bán hàng thủ công. |
| Tháng 9 | 100% doanh thu xác thực | Mọi đồng đi qua cổng thanh toán, có dấu vết. |
| Tháng 11 | ≈ 39 triệu ₫/tháng | Biên lợi nhuận mô hình solo bộc lộ rõ. |
| Tháng 13 | Đủ điều kiện Sàn M&A | Badge "doanh thu đã xác thực", định giá ~1,4 tỷ ₫. |

## Đã dùng hệ điều hành thế nào

- **Workspace + Trợ lý AI** — trung tâm điều hành; bộ 6 nhân sự AI (bán hàng, nội dung,
  CSKH, vận hành…) làm việc 24/7, CEO giữ quyền phê duyệt (human-in-the-loop).
- **Chợ ứng dụng** — cài nền tảng lõi 1-chạm, provisioning tự động dưới 5 phút.
- **CRM** — quản lý khách thuê bao: lead dùng thử → khách trả phí → nâng gói.
- **Chat đa kênh** — hộp thư gộp WhatsApp/Telegram/Messenger/Zalo…; AI trả lời trước.
- **Mô hình KD + Phễu bán hàng** — chọn mô hình "SaaS thuê bao", dựng phễu theo bước,
  giao từng việc cho đội AI.
- **Thanh toán PayOS** — thu tiền qua cổng → mọi giao dịch tự xác thực vào sổ cái.
- **Sàn M&A** — đủ 90 ngày + doanh thu xác thực + ttm>0 → tự đủ điều kiện niêm yết,
  có hồ sơ định giá.

## 5 bài học

1. Ra mắt sớm — khách trả tiền là người thầy tốt nhất.
2. Giao việc lặp lại cho AI, giữ quyền phê duyệt việc rủi ro.
3. Thu tiền qua cổng ngay từ đầu — doanh thu xác thực là tài sản.
4. Đo chi phí AI theo ngày — mô hình solo chỉ lời khi chi phí biên gần 0.
5. Doanh nghiệp một người vẫn định giá & chuyển nhượng được nếu số liệu minh bạch.

## Nguồn dữ liệu (kiểm chứng)

Toàn bộ số liệu lấy từ dữ liệu vận hành thực của tài khoản OpenClawOS trên nền tảng:

- **Org** `ba2b9dae-…` (owner `openclawos-ai`, gói SCALE), **Venture** `42d6cfe2-…`
  (slug `openclawos`, LIVE, `revenueVerified=true`).
- Sổ cái: 402 bản ghi `Transaction` IN đã xác thực (12 tháng) → API `GET /v1/ventures/:id/revenue`.
- Niêm yết: `Listing` LIVE, `askPrice=1.400.000.000`, `ttmRevenue` tự tính → `GET /v1/marketplace/listings`.
- Chi phí AI: 90 ngày `AiUsage` → thẻ chi phí trên Tổng quan.
- Cộng đồng: 7 bài đăng hành trình trên `my.soloceo.vn/openclawos`.
- Hệ sinh thái sản phẩm: website **openclawos.vn** (SaaS chính) + **hub.openclawos.vn**
  (chợ kỹ năng/skill registry của sản phẩm — self-host, SSL hợp lệ).

_Cập nhật: 17/07/2026._
