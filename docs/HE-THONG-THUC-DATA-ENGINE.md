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
Nguồn mở (Wikidata · GitHub · YC · HN · World Bank · GeoNames · Nobel · OpenFlights · NASDAQ/NYSE)
        │  ingest hàng giờ + full hằng ngày
        ▼
items (133K+ bản ghi)  ──►  edges (345K+ liên kết, mạng tri thức)
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
