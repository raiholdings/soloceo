# KỊCH BẢN TEST — bigdata.soloceo.vn ("Bộ não thứ 2" của SoloCEO OS)

**Phiên bản:** v9 · 26/07/2026 · **Người test:** 2 người (1 người thao tác, 1 người ghi nhận)
**Thời lượng:** ~35–45 phút · **Cần:** trình duyệt, không cần đăng nhập

## Hệ thống đang có gì (để đối chiếu khi test)

| Số liệu | Giá trị lúc bàn giao |
|---|---|
| Tổng bản ghi | **133.352** |
| Liên kết mạng tri thức (cạnh) | **345.035** |
| Loại dữ liệu | 25 loại: doanh nghiệp (42k), thành phố (34k), địa phương VN (9.4k), đại học (10k), sân bay (7.7k), founder/CEO/Nobel, luật & kế toán VN, ngành VSIC, BĐS VN, đặc sản, du lịch, quốc gia (GDP/nông nghiệp), tiền tệ… |
| Tri thức SoloCEO | **358 nốt**: 104 nền tảng · 101 dự án AI · 94 khoá học · 38 mô hình KD · 21 dịch vụ hệ sinh thái |
| Cập nhật | Tự động: hàng giờ (tin tức/công nghệ) · 4:30 full · 5:30 dựng lại đồ thị |

**Giá trị cần kiểm chứng:** (1) TRA CỨU nhanh đúng; (2) MỖI SỰ VẬT LÀ MỘT NỐT có mạng lưới liên kết; (3) TÌM ĐƯỜNG giữa 2 nốt bất kỳ ≤6 bậc; (4) AI LẬP LỘ TRÌNH kinh doanh từ dữ liệu thật; (5) Tri thức SoloCEO đã hoà vào cùng một mạng.

---

## PHẦN A — Tra cứu & dữ liệu thật (10 phút)

**A1. Mở trang** → https://bigdata.soloceo.vn
- ✅ Đạt khi: trang tải < 3s, thấy ô tìm kiếm + dãy chip loại dữ liệu (có cả nhóm SoloCEO 🧩🛠️🚀💼📚).

**A2. Tìm tiếng Việt** → gõ `Sabeco` (hoặc `Viettel`, `Hòa Phát`)
- ✅ Đạt khi: ra doanh nghiệp VN tên tiếng Việt, có ngành + vùng. Bấm vào → trang chi tiết có mô tả + nút "Xem nguồn ↗".

**A3. Dữ liệu quốc tế thật (không phải link)** → chip **🌐 Quốc gia** → tìm `Nhật Bản`
- ✅ Đạt khi: trang chi tiết có **thủ đô, GDP, dân số, tiền tệ, % đất nông nghiệp, sản lượng ngũ cốc** (số cụ thể, không phải đường dẫn).

**A4. Nhân vật** → tìm `Einstein`
- ✅ Đạt khi: ra "Albert Einstein — Nobel Vật lý 1921" kèm nơi sinh.

**A5. Việt Nam chuyên sâu** → chip **📍 Địa phương VN** tìm `Đà Lạt`; chip **🍜 Đặc sản** xem vài món; chip **⚖️ Luật VN** xem danh mục luật.
- ✅ Đạt khi: mỗi loại đều có kết quả tiếng Việt, bấm vào ra chi tiết.
- ✍️ Ghi nhận: loại nào thấy MỎNG nhất? (đây là input cho đợt làm giàu sau)

## PHẦN B — Mạng tri thức: mỗi sự vật là một nốt (10 phút)

**B1. Mạng lưới của một nốt** → mở chi tiết `Sabeco` → cuộn xuống **"🕸 Mạng lưới liên kết"**
- ✅ Đạt khi: thấy các nhóm quan hệ (hoạt động trong → lĩnh vực; thuộc vùng → Việt Nam…), bấm 1 nốt kề → nhảy sang trang nốt đó (du hành trong mạng).

**B2. Nốt gốc hệ điều hành** → tìm `SoloCEO OS` (chip 🧩 Hệ sinh thái SoloCEO)
- ✅ Đạt khi: mạng lưới hiện **← thuộc hệ sinh thái**: Workspace, Cộng đồng, CRM, Học tập… (~40 nốt kề). Đây là bằng chứng tri thức nội bộ đã hoà vào mạng.

**B3. Tìm đường 2 nốt (six degrees)** → tab **🕸 Lộ trình**, khung "Tìm đường giữa 2 nốt":
- Thử 1: `Hà Nội` → `Sabeco` (kỳ vọng ≤ 3 bậc)
- Thử 2: `Đà Lạt` → `cà phê`
- Thử 3 (khó): một đại học bất kỳ → một công ty S&P 500
- ✅ Đạt khi: trả về chuỗi nốt có nhãn quan hệ từng bước, mỗi nốt bấm được.
- ✍️ Ghi nhận: cặp nào KHÔNG tìm thấy đường (giới hạn thật của mạng hiện tại).

## PHẦN C — AI khai thác mạng (10 phút)

**C1. Lộ trình kinh doanh** → tab **🕸 Lộ trình**, nhập:
> "Tôi muốn khởi nghiệp nông nghiệp thông minh tại Việt Nam — vùng nguyên liệu nào tốt, ai đã làm, cần quen ai, bắt đầu từng bước thế nào?"
- ✅ Đạt khi: AI trả kế hoạch ≤7 bước, **dẫn nốt thật #id** (bấm được ở lưới bên dưới), và **nói thẳng chỗ dữ liệu còn thiếu** thay vì bịa.
- ✍️ Chấm điểm 1–10: tính hành động được của kế hoạch.

**C2. Phân tích ý tưởng** → tab **🧠 Hỏi bộ não AI**, nhập 1 ý tưởng thật của người test (vd "app quản lý phòng gym").
- ✅ Đạt khi: liệt kê startup tương tự thật (tên + trạng thái thành/bại) + khuyến nghị.

**C3. Dịch** → mở 1 nốt tiếng Anh (vd 1 công nghệ GitHub) → bấm **"🇻🇳 Dịch sang tiếng Việt"**
- ✅ Đạt khi: mô tả/README được dịch tự nhiên.

## PHẦN D — Tri thức SoloCEO phục vụ CEO (8 phút)

**D1.** Chip **🛠️ Nền tảng SoloCEO** → tìm `CRM` → ✅ ra nền tảng có giá VNĐ/tháng + demo LIVE, bấm "Xem nguồn ↗" mở đúng demo.
**D2.** Chip **🚀 Dự án AI SoloCEO** → xem 3 dự án bất kỳ → ✅ mỗi dự án có tóm tắt mô hình kinh doanh rõ.
**D3.** Chip **💼 Mô hình KD** → mở "Dịch vụ hóa (Services Shift)" → ✅ có công thức + biến thể.
**D4.** Chip **📚 Khoá học** → mở 1 khoá → ✅ bấm nguồn ra đúng trang edu.soloceo.vn.
**D5. Bài kiểm tra giá trị tổng hợp:** hỏi tab Lộ trình:
> "Tôi là CEO mới trên SoloCEO, muốn bán đặc sản Tây Bắc online — dùng nền tảng nào của SoloCEO, học khoá nào, theo mô hình KD nào?"
- ✅ Đạt khi: kế hoạch trộn ĐƯỢC cả 3 lớp: nền tảng SoloCEO + khoá học + dữ liệu đặc sản/vùng.

## PHẦN E — Data Engine & độ tin cậy (5 phút)

**E1.** Tab **🔧 Data Engine** → ✅ thấy tổng bản ghi (≥133k), 6 giai đoạn flywheel, nguồn + giấy phép từng nguồn (provenance), % chất lượng trường.
**E2.** Tab **📊 Thống kê** → ✅ biểu đồ ngành/ngách/vùng/năm có số.
**E3. Kiểm tra "không bịa":** tìm 1 thứ chắc chắn không có (vd `công ty ABC XYZ 999`) → ✅ trả "không có kết quả" chứ không sinh dữ liệu giả.

---

## PHIẾU CHẤM (mỗi người tự chấm 1–10)

| Tiêu chí | Điểm | Ghi chú |
|---|---|---|
| Tra cứu nhanh, đúng, tiếng Việt | /10 | |
| Mạng liên kết & tìm đường có ích thật | /10 | |
| AI lộ trình: hành động được, trung thực | /10 | |
| Tri thức SoloCEO đủ để 1 CEO mới bắt đầu | /10 | |
| Điều THIẾU nhất muốn bổ sung | (ghi tự do) | |

**Giá trị thật của hệ thống nằm ở câu hỏi cuối:** *"Nếu ngày mai bạn khởi nghiệp thật, trang này tiết kiệm cho bạn bao nhiêu giờ nghiên cứu?"* — ghi con số ước lượng của mỗi người.

> Gửi phiếu chấm + ghi nhận về cho Thư để lên kế hoạch làm giàu dữ liệu đợt tiếp (ưu tiên phần bị chấm thấp).
