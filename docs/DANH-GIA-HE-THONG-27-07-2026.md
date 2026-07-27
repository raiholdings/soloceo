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

**Đã khôi phục:** chạy lại `refresh?scope=full` với bản vá — logic an toàn xác nhận thu
hoạch trọn vẹn rồi mới cho thay mới: **15.122 → 47.752** doanh nghiệp, tổng về 990.995.

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
| 3 | 8 | **5/5** | **4** (1 bị chặn vì mã lỗi cú pháp) |

Vòng 3 nhảy vọt nhờ hai bản vá: ưu tiên sinh ý tưởng từ cụm Việt Nam, và vá JSON bị cắt.
Cả 5 ý tưởng đều là doanh nghiệp nhỏ Việt Nam — đặt bánh qua Zalo, bán hải sản, tồn kho
cửa hàng tiện lợi, văn phòng số, tổng đài hành chính xã.

---

## 4. Marketplace — đã dọn

Kiểm tra 100 mẫu đang đăng: **cả 100 dùng chung một `demoUrl`** — `dify.app.soloceo.vn`,
một instance Dify chung không liên quan gì tới sản phẩm đang rao. Đã chuyển tất cả về
`DRAFT` (không xoá; bật lại bằng `POST /v1/admin/eco/projects/:id/publish {"publish":true}`).

Sàn còn **8 sản phẩm**, mỗi cái có demo riêng bấm vào chạy:

| Sản phẩm | Điểm | Giá |
|---|---|---|
| BankBot AI — Trợ lý Zalo cho chi nhánh ngân hàng | 87 | 5tr + 1tr/tháng |
| ReviewMate — Trợ lý phản hồi đánh giá khách sạn | 69 | 5tr + 500k/tháng |
| Tổng đài AI Hành chính Cơ sở — VoiceGov | 74 | 5tr + 500k/tháng |
| Trợ Lý Ảo Văn Phòng Zalo | 79 | 5tr |
| Đặt Bánh Zalo | 89 | Liên hệ báo giá |
| BOT BÀN HẢI SẢN – ZALO AI | 88 | Liên hệ báo giá |
| HomestayBot — Trợ lý đặt chỗ AI | 66 | Liên hệ báo giá |
| OpenClawOS | — | 1,4 tỷ + 15tr/tháng |

Ba sản phẩm hiện "Liên hệ báo giá" vì bộ định giá trả "chưa đủ căn cứ" — đúng thiết kế,
thà thiếu giá còn hơn bịa số.

**Lỗi hiển thị đã sửa:** `isFree()` coi mọi sản phẩm giá 0 là miễn phí, nên hàng chưa định
giá hiện thành **"Miễn phí" màu xanh** — người mua tưởng được cho không. Nay phân biệt qua
`components.can_cu_gia`: có thì "Liên hệ báo giá", không có thì mới là mẫu miễn phí thật.

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

### Sao lưu mã nguồn (làm xong hôm nay)
Nhánh `hoan-thien-v2` đã đẩy lên GitHub, và **bản mirror trên core-01** tại
`/opt/backup-repo/soloceo.git` (86MB) tự đồng bộ mỗi 6 giờ qua `/opt/backup-repo/dong-bo.sh`.
Khôi phục: `git clone /opt/backup-repo/soloceo.git`.

### Cần bạn làm (tôi không làm thay được)
1. **DNS `sandbox` → 82.197.71.41** (DNS only). Hiện chạy nhờ Traefik nhưng chưa có bản ghi riêng.
2. **Thay token Cloudflare đã thu hồi** trước ~11/09/2026.
3. **Đổi mật khẩu DB tenant-01** — hậu sự cố mã độc đào tiền ảo 26/07.
4. **Bấm Deploy cho api-core trong Coolify** khi có thay đổi — Coolify không tự theo nhánh
   `soloceo-mvp`; tôi phải build tay 30 phút trên core-01, rất tốn tài nguyên.
5. **Quyết định có báo cho 7 CEO** về cửa sổ lộ OIDC hay không.

### Tôi làm tiếp được ngay
6. **Bổ sung mô hình kinh doanh cho 3 sản phẩm "Liên hệ báo giá"** rồi xuất bản lại. Bộ
   định giá trả "chưa đủ căn cứ" — cần dữ liệu, không phải chỉnh mã.
7. ~~Kiểm tra `company` hồi phục~~ — **xong**: 47.752, tổng 990.995.
8. **Chạy thêm vòng dây chuyền** để sàn dày lên. Tỉ lệ vòng 3: 5/5 ý tưởng đạt cổng,
   4 lên sàn — tốt hơn hẳn hai vòng đầu (2/5 và 2/6).
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
và **đã tự sản xuất 7 MVP bấm vào chạy được**, cổng chất lượng chặn thật — trong chính
phiên này nó đã chặn 2 sản phẩm sai thị trường và 1 MVP có mã lỗi cú pháp.

**Chưa thật:** sàn 8 sản phẩm nhưng **chưa có giao dịch nào**. Chưa có CEO nào ngoài đội
dùng dây chuyền này. Các MVP là ứng dụng một tệp dựng trong vài phút — chạy được, nhưng
còn xa một sản phẩm bán được giá cao. Giá 5 triệu là mô hình đề xuất, chưa ai trả.

**Rủi ro lớn nhất:** không phải kỹ thuật mà là **chưa có người dùng thật**. Mọi con số ở
trên là năng lực sản xuất, không phải nhu cầu thị trường đã kiểm chứng.

---

## 8. Việc lớn cho phiên sau — khoá học + trang nền tảng (đặt hàng 27/07)

Làm nhiều phiên, nhiều giờ, đến khi xong. **Chuẩn SEO là bắt buộc, không phải tuỳ chọn.**

### 8.1 Ba đầu việc song song cho MỖI nền tảng mã nguồn mở

| Nơi | Sản phẩm | Đường dẫn |
|---|---|---|
| soloceo.vn | Bài HTML giới thiệu nền tảng | `/giai-phap/nen-tang/<slug>` |
| platform.soloceo.vn | Trang bán/triển khai nền tảng | (đã có, cần liên kết chéo) |
| edu.soloceo.vn | Khoá học đầy đủ về nền tảng đó | Academy LMS |

Trang chủ hiện quảng cáo **110 nền tảng mã nguồn mở** — đó là quy mô công việc. Phải lấy
danh sách thật từ platform.soloceo.vn (WHMCS) chứ không tự bịa ra.

### 8.2 Yêu cầu SEO cho mỗi trang `/giai-phap/nen-tang/<slug>`

- `<title>` và meta description riêng, viết cho người tìm kiếm tiếng Việt
- Dữ liệu có cấu trúc `SoftwareApplication` + `BreadcrumbList` (JSON-LD)
- Thẻ Open Graph + ảnh xem trước riêng từng nền tảng
- Liên kết nội bộ ba chiều: bài giới thiệu ↔ trang platform ↔ khoá học edu
- Trang mục lục `/giai-phap/nen-tang` liệt kê toàn bộ, có phân nhóm
- Thêm vào sitemap.xml

### 8.3 ĐÃ LÀM (27/07) — phần trang giới thiệu

| Hạng mục | Trạng thái |
|---|---|
| Model `PlatformArticle` + migration | ✅ |
| 111 nền tảng đã nạp vào bảng từ `PLATFORM_CATALOG` | ✅ |
| `/giai-phap/nen-tang` + `/giai-phap/nen-tang/<slug>` | ✅ 200 |
| SEO: metadata riêng · JSON-LD · canonical · OG · generateStaticParams | ✅ |
| Mục "Công nghệ mã nguồn mở" trong menu Giải pháp | ✅ |
| Cron viết 3 bài / 20 phút, tự gỡ khi xong | ✅ `/opt/viet-bai-nen-tang.sh` |

Chất lượng bài mẫu (Activepieces): tiêu đề SEO 55 ký tự, mô tả 162, 8 từ khoá tiếng Việt,
11,7KB nội dung với bảng so sánh, 4 câu hỏi thường gặp, và mục "không hợp với ai".

### 8.4 CHƯA LÀM — khoá học trên edu.soloceo.vn

`courseUrl` hiện chỉ trỏ tới trang tìm kiếm của Academy, **chưa có khoá học thật cho từng
nền tảng**. Đây là khối lượng ngang phần trang giới thiệu và cần phiên riêng:

- Tạo khoá học trong Academy LMS cho từng nền tảng (bài giảng, bài kiểm tra, chứng chỉ)
- Cập nhật `courseUrl` trỏ đúng khoá học thật thay vì trang tìm kiếm
- Liên kết ngược từ khoá học về bài giới thiệu và trang platform

Đừng để trang giới thiệu hứa "có khoá học đi kèm" trong khi bấm vào chỉ ra ô tìm kiếm rỗng.

### 8.5 Cách làm đề xuất

Giống dây chuyền MVP: một script điều phối chạy theo lô, mỗi nền tảng một vòng
(lấy dữ liệu thật → sinh nội dung → dựng HTML từ khuôn cố định → kiểm tra → xuất bản).
Đừng viết tay 110 lần, và đừng để mô hình sinh cả HTML — dùng lại bài học ở mục 7.
