# Hệ thống thực — Data Engine & Xưởng ý tưởng SoloCEO

Bản đồ toàn bộ những gì đang chạy thật (26/07/2026), nơi lưu mã nguồn và cách deploy.
Mục đích: **chấm dứt vá tay trên máy chủ** — mọi thay đổi từ nay đi qua repo.

## 1. Dịch vụ và nơi lưu mã

| Dịch vụ | Chạy tại | Mã nguồn trong repo | Deploy |
|---|---|---|---|
| **bigdata.soloceo.vn** — Bộ não thứ 2 + Data Engine | tenant-03, container `bigdata` | `platform/bigdata/` | `bash platform/bigdata/deploy.sh` |
| **dkkd.crm.soloceo.vn** — Lập doanh nghiệp | tenant-03, container `dkkd-svc` | `platform/dkkd-svc/` | build + run (xem README) |
| **thue.crm.soloceo.vn** — Hoá đơn & Thuế | tenant-03, container `thue-svc` | `platform/thue-svc/` | build + run |
| **data-mcp.crm.soloceo.vn** — MCP dữ liệu cho agent | tenant-03, container `bigdata-mcp` | `platform/bigdata-mcp/` | build + run |
| **soloceo.vn** (landing + workspace) | tenant-02, DeerFlow | `infra/patches/deerflow/native-pages/` | `deploy.sh build && start` |

## 2. Luồng dữ liệu (một vòng khép kín)

```
Lớp Việt Nam (26/07/2026):
  OpenStreetMap VN — cơ sở kinh doanh, địa điểm, đường phố  (ODbL, © OSM contributors)
  GeoNames VN      — địa danh có toạ độ                      (CC BY 4.0)
  Wikidata VN      — doanh nghiệp, tổ chức, hạ tầng, sự kiện (CC0)
  Wikipedia tiếng Việt — tri thức nền                        (CC BY-SA 4.0)
  OpenAlex         — nghiên cứu & tổ chức khoa học có yếu tố VN (CC0)
Lớp quốc tế: YC · GitHub · Hacker News · dev.to · World Bank · Nobel · OpenFlights · NASDAQ/NYSE
        │  ingest hàng giờ + full hằng ngày
        ▼
items  ──►  edges (mạng tri thức)
        │
        ├─► [7] phát hiện VẤN ĐỀ      (JTBD · POV · 5 Whys · tần suất×mức độ)
        ├─► đúc lại GIẢI PHÁP          ← technology / startup thật
        ├─► đúc lại MÔ HÌNH KINH DOANH ← startup đã thành công
        ├─► đúc lại SẢN PHẨM           ← hồ sơ startup thật
        └─► đúc lại SỰ KIỆN            ← tin tức thật
                    │
                    ▼
        [8] ghép cơ hội → [9] đúc Ý TƯỞNG (BMC 9 khối + lộ trình)
                    │
                    ├─► hiển thị trên bigdata (tab ⭐ Ý tưởng)
                    ├─► hiển thị trong workspace soloceo.vn
                    └─► [10] Solo CEO chấm sao + nhận thực thi → phản hồi lại bước 7
```

Ngoài vòng tự động, **Solo CEO tự khởi tạo ý tưởng** qua `POST /api/khoi-tao`:
ý tưởng của CEO được đối chiếu với cả 5 kho rồi trả về BMC riêng, lưu chung để CEO khác tham khảo.

## 3. Giao diện

### bigdata.soloceo.vn — 8 tab theo đúng luồng tư duy
🧠 Dữ liệu (bộ não sống) → 🔧 Data Engine (phương pháp + **🔒 dữ liệu độc quyền** + phân bố ngành)
→ ❗ Vấn đề → 💡 Giải pháp → 💼 Mô hình KD → 📦 Sản phẩm → 📡 Sự kiện → ⭐ Ý tưởng

### soloceo.vn — thanh khởi tạo ý tưởng ở hero (component `soloceo-idea-composer.tsx`)

### workspace — chip gọi subagent qua MCP, bấm chip hiện **mẫu dữ liệu thật** bên dưới
(`soloceo-chip-gallery.tsx` + proxy `/workspace/api/gallery`)

| Chip | MCP | Gallery hiển thị |
|---|---|---|
| ⭐ Khởi tạo ý tưởng | soloceo-bigdata | ý tưởng đã đúc (có điểm cộng đồng) |
| 🏢 CRM | soloceo-crm | 4 tác vụ CRM thực thi ngay |
| 🛒 Thị trường | soloceo-marketplace | tác vụ kênh bán |
| 🧩 Hệ sinh thái | soloceo-ecosystem | nền tảng đang chạy thật (catalog LIVE) |
| 📊 Dữ liệu | soloceo-bigdata | 6 kho + số mục thật |
| 🚀 Tạo doanh nghiệp | — | 101 dự án AI mẫu (marketplace LIVE) |

## 4. Ranh giới bất biến

- **Đúc lại, không sáng tác.** Mọi mục trong kho đều có `nguon_id` trỏ về nốt dữ liệu thật.
- **Không bịa khớp.** Khi kho chưa có gì liên quan, hệ thống nói thẳng "chưa có trong kho".
- **Không bịa số liệu thị trường.** Ước lượng phải ghi rõ là ước lượng.
- **Pháp lý:** lập doanh nghiệp / hoá đơn / thuế chỉ soạn thảo và hướng dẫn; phát hành hoá đơn
  qua nhà cung cấp được cấp phép, nộp hồ sơ bằng chữ ký số của chính CEO.
- **Dữ liệu cá nhân:** không thu thập PII để chào hàng (Nghị định 13/2023/NĐ-CP).

## 4b. Nạp dữ liệu quy mô lớn (`platform/bigdata/ingest/`)

Các bộ nạp ghi **thẳng vào SQLite** (nhanh hơn nhiều so với gọi HTTP `/api/admin/import`),
chạy trong container `python:3.12-slim` gắn volume `bigdata-data-v3`.

| Tệp | Nguồn | Ghi chú |
|---|---|---|
| `osm_vietnam.py` | `vietnam-latest.osm.pbf` (Geofabrik) | cần `libexpat1 libbz2-1.0 zlib1g` trước khi `pip install osmium` |
| `osm_vietnam_duongpho.py` | cùng tệp .pbf | lượt 2: đường có tên |
| `geonames_vn.py` | `VN.zip` GeoNames | |
| `wikidata_vn.py` | SPARQL Wikidata | máy chủ chặn tốc độ: trang 3000, nghỉ 4s, gặp 429 chờ 60s; `CHI_NHOM=` để chạy lại từng nhóm |
| `viwiki.py` | `viwiki-latest-pages-articles.xml.bz2` | đọc theo luồng, bỏ trang đổi hướng, lấy đoạn mở đầu |
| `openalex_vn.py` | api.openalex.org | phân trang cursor; chặn tốc độ bằng 429 — một lần 429 KHÔNG được phép giết cả lượt nạp (lùi 30s×n rồi trả None để dừng êm) |
| `worldbank_vn.py` | api.worldbank.org | API không nhận `indicator=all`: phải lấy danh mục nguồn 2 rồi truy vấn lô 30; một mã chỉ số đã ngừng cũng đủ làm hỏng cả truy vấn nhiều chỉ số |
| `chuan_hoa_markdown.py` | — | viết lại mô tả sang Markdown tiếng Việt, chạy lại nhiều lần vẫn an toàn |
| `hoan_tat.py` | — | **bắt buộc chạy cuối**: dựng lại FTS5 (external-content không tự cập nhật khi ghi thẳng SQLite) |

Sau `hoan_tat.py`, gọi `/api/admin/build-graph?token=…` để dựng lại mạng tri thức.

**Chỉ mục toàn văn:** bộ nạp ghi thẳng SQLite nên FTS5 (external-content) không tự cập nhật.
Có hai đường: `/api/admin/fts-bosung?token=` chỉ nạp dòng mới (vài giây, các bộ thu thập tự gọi
sau mỗi lượt) và `rebuildFts()` dựng lại toàn bộ (~80 giây, cron 5:30 hằng ngày).
Đường bù nhanh **không** cập nhật bản ghi bị sửa — chậm nhất sau một ngày mới đúng.
Mốc `fts_moc` phải khởi tạo bằng `max(id)`; để 0 thì lần bù đầu nạp lại cả bảng và sinh bản ghi trùng.

**Xếp hạng tìm kiếm:** `ORDER BY` phải đặt `bm25()` TRƯỚC `score`. `score` mang nghĩa khác nhau
theo loại (số trích dẫn với bài nghiên cứu, dân số với địa danh) nên nếu để trước, một bài
trích dẫn cao sẽ đè mọi kết quả đúng nghĩa.

## 4c. Thu thập tự động bằng Crawl4AI (`platform/crawl-sync/`)

`crawl.soloceo.vn` (Crawl4AI 0.9.2, tenant-03) là **cỗ máy thu thập chung** của Data Engine.
Trước đây mỗi nguồn phải viết một hàm nạp riêng; từ nay bất kỳ nguồn nào có RSS chỉ cần
thêm một dòng vào `nguon.json`.

```
nguon.json (5 nhóm · 27 nguồn)  →  RSS  →  Crawl4AI /md  →  Markdown tiếng Việt
        →  bảng tai_lieu (toàn văn, gom theo nguồn)  +  items type `tai-lieu` (vào tìm kiếm & đồ thị)
```

| Nhóm | Phục vụ bước nào của Engine |
|---|---|
| `chinh-sach` | rủi ro & tuân thủ trong mô hình kinh doanh |
| `thi-truong` | phát hiện vấn đề (tín hiệu cầu, giá, cạnh tranh) |
| `cong-nghe` | kho giải pháp |
| `khoi-nghiep` | kho mô hình kinh doanh |
| `so-lieu-mo` | định cỡ thị trường |

API: `/api/tai-lieu/nguon` (cây nguồn + số lượng) · `/api/tai-lieu?nguon=&nhom=&q=` · `/api/tai-lieu/:id` (toàn văn).
Lịch: cron `15 */3` nhóm Việt Nam, `45 */6` nhóm quốc tế (`/opt/crawl-sync/chay.sh`).

**Xác thực Crawl4AI:** `security.enabled: true` mà `api_token` rỗng thì server chặn mọi truy vấn
và `/token` cũng tắt. Cần đủ ba thứ: `api_token` trong `config.yml`, biến `SECRET_KEY`, và
`GUNICORN_BIND=0.0.0.0:11235` (mặc định chỉ nghe loopback nên container khác không gọi được).
`/token` nhận `{"email","api_token"}` và **kiểm tra bản ghi MX của tên miền email**.
soloceo.vn đã trỏ MX Google Workspace (26/07/2026) nên dùng `info@soloceo.vn`.

**Chuẩn hoá Markdown:** `platform/bigdata/ingest/chuan_hoa_markdown.py` viết lại mô tả của mọi
bản ghi theo một khuôn Markdown tiếng Việt (tên · định danh · lĩnh vực/khu vực/năm/nguồn/giấy phép ·
nội dung gốc). Dựng từ chính các trường đã có, **không gọi AI** — với ~900 nghìn bản ghi thì
gọi AI vừa không khả thi vừa dễ sinh nội dung bịa.

## 5. Quy trình thay đổi từ nay

1. Sửa mã trong repo (`platform/bigdata/`, `infra/patches/deerflow/native-pages/`).
2. Chạy script deploy tương ứng.
3. Kiểm chứng bằng API thật, ghi lại số liệu.
4. Commit với mô tả rõ ràng.

Không sửa trực tiếp `/opt/...` trên máy chủ; nếu buộc phải xử lý sự cố nóng thì
đồng bộ ngược về repo ngay sau đó.

## 6. Hạ tầng dữ liệu workspace (cập nhật 26/07/2026)

Tài khoản và hội thoại workspace đã chuyển từ SQLite sang **PostgreSQL** trong hệ thống
dữ liệu riêng của SoloCEO (`supabase-db`, CSDL `deerflow`, tenant-02).

| Hạng mục | Chi tiết |
|---|---|
| Vì sao chuyển | SQLite khoá ghi tuần tự, không sao lưu nóng an toàn, không phục hồi theo thời điểm, hỏng file mất sạch — không hợp hệ nhiều CEO |
| Cấu hình | `infra/deerflow/config.yaml` → `database.backend: postgres`; biến `DEERFLOW_DATABASE_URL` trong `.env` + compose |
| Điều kiện | image phải build với `UV_EXTRAS=postgres` (driver `asyncpg`) |
| Đã chuyển | 1 tài khoản · 22 hội thoại · 1.366 checkpoint · 30 lượt chạy (29 MB) |
| Sao lưu | `infra/deerflow/backup-deerflow-pg.sh` — cron 03:25 hằng đêm, giữ 14 bản, cảnh báo nếu dump lỗi |
| Đường lùi | SQLite cũ còn nguyên tại `/opt/deerflow/backend/.deer-flow/data/deerflow.db*` — đổi `backend: sqlite` là quay lại |
| Script di trú | `infra/deerflow/migrate-sqlite-to-postgres.py` + `migrate-checkpoints.py` (ép kiểu thời gian/JSON/bool, lọc ký tự NUL) |

## 7. Kho đúc & dây chuyền ý tưởng (cập nhật 26/07/2026)

### 7.1 Hai bộ đúc, cố ý đối trọng nhau

| Bộ | Nguồn | Cho ra | Cron |
|---|---|---|---|
| `ingest/duc_tu_du_an.py` | 28.062 dự án World Bank (194 nước, 1996–2027) | Bài học có **số tiền thật** và bề dày nhiều năm | `/opt/duc.sh` — phút 10 mỗi giờ |
| `ingest/duc_tu_vn.py` | 44.728 cơ sở kinh doanh Việt Nam (OSM/Trang Vàng) + số liệu kinh tế VN | Thị trường **đếm được** đúng tầm một người | `/opt/duc-vn.sh` — phút 40 mỗi giờ |

**Vì sao phải có bộ thứ hai.** Chạy một mình, bộ World Bank kéo cả kho lệch sang tài chính
công và viện trợ phát triển. Hệ quả đo được: máy sinh ý tưởng đẻ ra *"trợ lý tài chính cho
người Argentina"*, *"nền tảng duy trì dịch vụ công trong khủng hoảng"* — vô dụng với một
Solo CEO Việt Nam. Bộ VN đúc theo cụm (phân ngành × địa bàn) nên mỗi mục kèm một con số
thị trường có thật: 7.720 nhà hàng, 5.946 quán cà phê, 5.366 cửa hàng tiện lợi, 1.177 khách
sạn. Chạy xen kẽ mỗi giờ để kho không lệch lại.

### 7.2 Cổng kiểm chứng ở sandbox — hai lỗi đã sửa

1. **Chấm mù.** `doiChieuKho()` gọi `/api/van-de`, `/api/giai-phap`, `/api/mo-hinh-kd`
   **không kèm từ khoá**, nên nhận về 40 mục đầu bảng chẳng liên quan gì tới ý tưởng đang
   chấm. Mọi ý tưởng đều 0 điểm, và tôi đã quy sai nguyên nhân cho "kho quá mỏng".
   → Sửa: lấy **toàn bộ** kho đúc dạng rút gọn (vài chục mục, rẻ hơn lọc sai).
2. **Bộ lọc `?q=` tách tiếng Việt theo âm tiết.** "bất **động** sản" khớp trúng "hoạt
   **động**", "lao **động**". Endpoint `?q=` vẫn còn để dùng khi kho vượt ~300 mục, nhưng
   khi đó phải chuyển sang FTS chứ không dùng LIKE.

### 7.3 Khớp ý tưởng tức thì — `GET /api/khop-nhanh?q=`

CEO gõ ý tưởng, nếu kho đã có mẫu đủ gần thì trả bản đầy đủ trong **~10ms** thay vì bắt chờ
`/api/khoi-tao` suy luận 60–120 giây. `/workspace/api/khoi-tao` thử đường nhanh trước rồi
mới rơi xuống đường chậm; giao diện hiện băng ⚡ nói rõ đây là mẫu có sẵn, không phải bản
vừa nghĩ riêng cho họ.

**Đặc trưng khớp là ĐÔI ÂM TIẾT (bigram), không phải âm tiết đơn.** Dùng âm tiết đơn thì
"phần mềm **quản** lý **quán** ăn" khớp 91 điểm với một app dự toán xây dựng — cùng gốc bệnh
với mục 7.2. Bigram phân biệt được `quan_ly` với `quan_an`.

Hiệu chuẩn thực nghiệm (6 câu thử): khớp đúng 91/82/73 · không có mẫu 44/14/11 → **ngưỡng 60**.

Chỉ mục `khop_mau` tự dựng lại khi lệch số lượng với bảng `ideas` hoặc khi `KHOP_PHIEN_BAN`
đổi, nên không có chuyện quên đồng bộ.

### 7.4 Đường lên marketplace — chỉ nhận thứ chạy được

Trước đây sandbox gọi `POST /v1/admin/eco/project-templates`, **một endpoint không tồn tại**,
nên bước xuất bản luôn 404 mà không ai biết. api-core chỉ có `projects/generate`: AI đọc một
câu ý tưởng rồi bịa ra mẫu dự án — đó chính là cách 100 mẫu cũ trên marketplace ra đời.

Nay có `POST /v1/admin/eco/projects/import`:

| Ràng buộc | Vì sao |
|---|---|
| `demoUrl` bắt buộc | Bằng chứng duy nhất cho "chạy thật". Không có thì không lên sàn. |
| Không gọi AI | Dữ liệu đã đi hết dây chuyền rồi, AI xen vào chỉ làm sai lệch. |
| Trùng slug thì cập nhật | Xưởng dựng lại nhiều lần cho tới khi nghiệm thu đạt; mỗi lần đẻ một mẫu là rác. |
| Gửi kèm bảng chấm 6 tiêu chí | Người mua tự đọc căn cứ thay vì phải tin lời quảng cáo. |

Dây chuyền đầy đủ, mỗi khâu đều chặn được:

```
bigdata: đúc từ dữ liệu thật (World Bank + cơ sở kinh doanh VN)
   ↓ generateIdea
sandbox: cổng 6 tiêu chí, ngưỡng 65   ← trượt thì dừng
   ↓ xay_mvp.py (subagent sinh mã, build, chạy trong mạng --internal)
sandbox: nghiệm thu /health=200 và /=200  ← trượt thì xoá container, lưu log
   ↓ projects/import (bắt buộc demoUrl)
marketplace: hàng có demo bấm vào chạy được
```

**Deploy api-core:** Coolify không tự deploy khi push nhánh `soloceo-mvp`. Xem
[[soloceo-deploy-api-core]] trong bộ nhớ — kèm cảnh báo về worktree `/private/tmp/mvp-wt`.

### 7.5 Dọn marketplace (27/07/2026)

Kiểm tra 100 mẫu dự án đang đăng: **cả 100 đều dùng chung một `demoUrl`** —
`https://dify.app.soloceo.vn`, một instance Dify chung, không liên quan gì tới sản phẩm
đang rao. Tức là con số "100% có demo" hoàn toàn ảo.

Đã chuyển cả 100 về `DRAFT` (không xoá — đảo ngược được bằng
`POST /v1/admin/eco/projects/:id/publish {"publish":true}`). Giữ lại:

| Sản phẩm | Vì sao giữ |
|---|---|
| OpenClawOS | Sản phẩm thật, `openclawos.vn` chạy được |
| Trợ Lý Đặt Chỗ AI – HomestayBot | MVP đầu tiên đi hết dây chuyền, demo riêng bấm vào chạy |

Sàn từ 100 mẫu xuống 2 sản phẩm. Ít hơn nhưng không còn bán thứ không tồn tại.
`platform/xuong-y-tuong/day-chuyen.sh` chạy trọn 5 khâu để bù dần.
