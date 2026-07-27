# Đánh giá hệ thống SoloCEO — 27/07/2026

Rà soát toàn bộ trước khi chuyển phiên. Mọi con số dưới đây đo trực tiếp từ production,
không lấy lại từ tài liệu cũ.

---

## 1. Hạ tầng — 17/17 dịch vụ sống

| Máy chủ | IP | Vai trò |
|---|---|---|
| core-01 | 194.233.72.150 | Coolify controller, api-core, Supabase, LiteLLM, giám sát |
| tenant-01 | 62.146.235.177 | WoWonder, Support Board, Flame |
| tenant-02 | 194.233.85.255 | DeerFlow (workspace), lớp dữ liệu, ClawHub |
| tenant-03 | 82.197.71.41 | bigdata, sandbox, Perfex, WHMCS, Academy, MagicAI, AffiliatePRO |

Kiểm tra HTTP toàn bộ: soloceo.vn · my · bigdata · sandbox · marketplace · api · admin ·
crm · chat · edu · news · platform · crawl (401 đúng thiết kế) · hub · aff · meeting ·
status — **tất cả phản hồi**.

`ai.soloceo.vn` không có bản ghi DNS. Đây là subdomain dự kiến chưa dùng, **không phải
hỏng** — workspace chạy tại `soloceo.vn/workspace`.

---

## 2. Bộ não dữ liệu (bigdata.soloceo.vn)

| Chỉ số | Giá trị |
|---|---|
| Tổng bản ghi | ~963.500 |
| Cạnh mạng tri thức | ~1,24 triệu |
| Vấn đề đã đúc | 273 |
| Giải pháp đã đúc | 305 |
| Mô hình kinh doanh | 301 |
| Ý tưởng hoàn chỉnh | 37 |

**Hai bộ đúc chạy xen kẽ mỗi giờ** (`/opt/duc.sh` phút 10, `/opt/duc-vn.sh` phút 40):
World Bank cho bài học có số tiền thật; cụm cơ sở kinh doanh Việt Nam cho thị trường
đếm được. Bộ thứ hai là bắt buộc — chạy một mình bộ World Bank thì máy đẻ ra "trợ lý tài
chính cho người Argentina".

### ⚠️ Sự cố mất dữ liệu phát hiện hôm nay

Loại `company` tụt **49.702 → 15.122** sau lượt refresh đêm, không một dòng cảnh báo.
Nguyên nhân: `ingestByCountry()` gọi `delType("company")` ngay dòng đầu rồi mới lần lượt
hỏi Wikidata SPARQL từng nước — nước nào lỗi 429/504 thì dữ liệu nước đó mất vĩnh viễn.

Đã thêm `thayAnToan(loai, rows, nguong=0.8)`: mẻ mới nhỏ hơn 80% số đang có thì chỉ
upsert, không xoá, và ghi cảnh báo. Áp cho 5 điểm: company, ingestVN (nguy hơn — xoá vô
điều kiện, toàn dữ liệu Việt Nam), founder/ceo, technology, news.

**Bài học:** nguồn ngoài LUÔN có ngày hỏng. Thiết kế phải chịu được điều đó thay vì tin nó.

---

## 3. Dây chuyền ý tưởng → MVP → sàn

```
bigdata: đúc từ dữ liệu thật
   ↓ generateIdea (ưu tiên vấn đề nguồn Việt Nam)
sandbox: cổng 6 tiêu chí, ngưỡng 65 + PHỦ QUYẾT      ← trượt thì dừng
   ↓ xay_mvp.py (subagent, mạng --internal, giới hạn CPU/RAM/pids)
sandbox: nghiệm thu /health=200 và /=200             ← trượt thì xoá container
   ↓ projects/import (bắt buộc demoUrl + định giá có căn cứ)
marketplace: hàng bấm vào chạy được
```

**Phủ quyết** (thêm hôm nay): thị trường VN < 45 hoặc một-người-dựng-nổi < 50 thì trượt
bất kể tổng điểm. Lý do: "BridgeAid — viện trợ xuyên biên giới cho Ukraine" đạt 66/65 và
suýt lên sàn dù tiêu chí thị trường VN chỉ 10/100 — nó lọt vì tiêu chí đó chỉ nặng 10%.

Chạy `bash platform/xuong-y-tuong/day-chuyen.sh <số_ý_tưởng>` cho một vòng đầy đủ.

### Kết quả 3 vòng

| Vòng | Ý tưởng | Đạt cổng | Lên sàn |
|---|---|---|---|
| 1 | 5 (3 hỏng JSON) | 2 | 0 — khâu dựng hụt vì lỗi đếm |
| 2 | 6 (4 hỏng JSON) | 2 | **2** |
| 3 | 8 | — | — |

---

## 4. Marketplace — đã dọn

Kiểm tra 100 mẫu đang đăng: **cả 100 dùng chung một `demoUrl`** — `dify.app.soloceo.vn`,
một instance Dify chung không liên quan gì tới sản phẩm đang rao. Đã chuyển tất cả về
`DRAFT` (không xoá; bật lại bằng `POST /v1/admin/eco/projects/:id/publish {"publish":true}`).

Sàn còn **4 sản phẩm**, mỗi cái có demo riêng bấm vào chạy:

| Sản phẩm | Điểm khả thi |
|---|---|
| BankBot AI — Trợ lý Zalo cho chi nhánh ngân hàng | 87 |
| ReviewMate — Trợ lý phản hồi đánh giá khách sạn | 69 |
| HomestayBot — Trợ lý đặt chỗ AI | 66 |
| OpenClawOS | (sản phẩm thật, không qua xưởng) |

### Định giá

Ba MVP đầu lên sàn với **giá 0 đồng** vì tôi quên hẳn khâu này. Đã thêm `dinhGia()`: suy
từ mô hình kinh doanh đã đúc và quy mô thị trường, có trần cứng (mua đứt ≤50 triệu, phí
tháng ≤5 triệu), và **bắt buộc nêu căn cứ**. Không đủ căn cứ thì để giá 0 và ghi rõ
"chưa định giá" — thà thiếu giá còn hơn bịa số cho trông chuyên nghiệp.

Ba sản phẩm cũ cần định giá lại (xem mục 6).

---

## 5. Khớp ý tưởng tức thì

`GET /api/khop-nhanh?q=` trả ý tưởng đã đúc trong **~10ms** thay vì 60–120 giây suy luận.
Workspace thử đường nhanh trước, không có mẫu mới rơi xuống đường chậm.

Đặc trưng khớp là **đôi âm tiết (bigram)**, không phải âm tiết đơn — dùng âm tiết đơn thì
"phần mềm **quản** lý **quán** ăn" khớp 91 điểm với app dự toán xây dựng.

Hiệu chuẩn 6 câu thử: khớp đúng 91/82/73 · không có mẫu 44/14/11 → **ngưỡng 60**.

---

## 6. Việc còn tồn — ưu tiên cho phiên sau

### Cần bạn làm (tôi không làm thay được)
1. **DNS `sandbox` → 82.197.71.41** (DNS only). Hiện chạy nhờ Traefik nhưng chưa có bản ghi riêng.
2. **Thay token Cloudflare đã thu hồi** trước ~11/09/2026.
3. **Đổi mật khẩu DB tenant-01** — hậu sự cố mã độc đào tiền ảo 26/07.
4. **Bấm Deploy cho api-core trong Coolify** khi có thay đổi — Coolify không tự theo nhánh
   `soloceo-mvp`; tôi phải build tay 30 phút trên core-01, rất tốn tài nguyên.
5. **Quyết định có báo cho 7 CEO** về cửa sổ lộ OIDC hay không.

### Tôi làm tiếp được ngay
6. **Định giá lại 3 MVP đang có giá 0** — code đã xong, chỉ cần xuất bản lại.
7. **Kiểm tra `company` đã hồi phục** về ~49.700 sau lượt refresh có bản vá.
8. **Chạy thêm vòng dây chuyền** để sàn dày lên. Tỉ lệ hiện tại ~2 MVP / 6-8 ý tưởng.
9. **Tỉ lệ hỏng JSON khi sinh ý tưởng** — đã vá (vá JSON cắt + nâng token 3000→4800),
   cần đo lại ở vòng sau xem còn hỏng không.

### Nợ kỹ thuật đã ghi trong mã
10. Trang chủ có **nav trùng lặp** — `soloceo-home.tsx` chứa một bản nav riêng, phải sửa
    hai chỗ mỗi lần đổi menu. Nên gộp về `SiteHeader`.
11. `buildGraph()` nối mọi mục có vùng vào nút "Việt Nam", tạo siêu nút 1,24 triệu cạnh
    giá trị điều hướng thấp.
12. Kho đúc vượt 300 mục — bộ xếp hạng bigram hiện quét toàn bảng mỗi lần gọi. Đến vài
    nghìn mục thì cần chỉ mục thật.

---

## 7. Đánh giá thẳng

**Đã thật:** hạ tầng 17 dịch vụ, gần 1 triệu bản ghi có nguồn, dây chuyền chạy đầu-cuối
và **đã tự sản xuất 3 MVP bấm vào chạy được**, cổng chất lượng chặn thật (đã chặn 2 sản
phẩm sai thị trường trong chính phiên này).

**Chưa thật:** sàn mới 4 sản phẩm, chưa có giao dịch nào. Chưa có CEO nào ngoài đội dùng
dây chuyền này. Ba MVP là ứng dụng một tệp dựng trong vài phút — chạy được, nhưng còn xa
một sản phẩm bán được giá cao.

**Rủi ro lớn nhất:** không phải kỹ thuật mà là **chưa có người dùng thật**. Mọi con số ở
trên là năng lực sản xuất, không phải nhu cầu thị trường đã kiểm chứng.
