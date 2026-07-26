# bigdata.soloceo.vn — Bộ não thứ 2 & Data Engine

Nguồn thật của dịch vụ đang chạy tại **bigdata.soloceo.vn** (tenant-03 `82.197.71.41`,
container `bigdata`, volume `bigdata-data-v3`, image `bigdata-soloceo:<n>`).

> Từ 26/07/2026 mọi thay đổi đi qua thư mục này rồi mới deploy — không sửa tay trên máy chủ.

## Kiến trúc

| Thành phần | Mô tả |
|---|---|
| `server.js` | Toàn bộ backend: ingest dữ liệu nền, mạng tri thức, Data Engine 10 bước, xưởng đúc, API |
| `public/index.html` | Giao diện 8 tab (SPA thuần, không build) |
| `public/test.html` | Kịch bản test cho người dùng |
| SQLite `/data/bigdata.db` | `items` (dữ liệu nền + FTS5) · `edges` (mạng tri thức) · `problems` · `solutions` · `biz_models` · `products` · `mkt_events` · `ideas` + `idea_votes` + `idea_execs` |

## Data Engine — 10 bước

1–6. Thu thập → Chuẩn hoá → Làm giàu → Đánh giá → Phục vụ → Vòng lặp *(nền: 133K+ bản ghi, 345K+ liên kết)*
7. **Phát hiện vấn đề** — JTBD + POV Statement + 5 Whys + tần suất × mức độ
8. **Ghép cơ hội** — vấn đề × giải pháp × mô hình × sản phẩm × nền tảng SoloCEO
9. **Đúc ý tưởng** — BMC 9 khối + lộ trình, dẫn nốt dữ liệu thật
10. **Kiểm chứng cộng đồng** — Solo CEO chấm sao + nhận thực thi

**Nguyên tắc bất biến:** các kho *đúc lại* (distill) từ dữ liệu có thật trong `items`
(lưu `nguon_id` truy vết ngược), **không sáng tác dữ liệu mới**. Khi không có dữ liệu khớp,
API trả lời thẳng "chưa có trong kho".

## API chính

| Nhóm | Endpoint |
|---|---|
| Dữ liệu nền | `/api/search` · `/api/item/:id` · `/api/stats` · `/api/facets` · `/api/insights` · `/api/engine` |
| Mạng tri thức | `/api/graph/stats` · `/api/graph/node/:id` · `/api/graph/path` · `/api/lo-trinh` |
| Kho đúc | `/api/van-de` · `/api/giai-phap` · `/api/mo-hinh-kd` · `/api/san-pham` · `/api/su-kien` |
| Ý tưởng | `/api/ideas` · `/api/ideas/:id` · `/api/ideas/:id/vote` · `/api/ideas/:id/thuc-thi` |
| Khởi tạo (CEO) | `POST /api/khoi-tao {y_tuong, tac_gia}` — chạy qua toàn bộ engine |
| Quản trị (token) | `/api/admin/refresh?scope=hourly\|full\|datasets\|datasets2\|soloceo` · `/api/admin/build-graph` · `/api/admin/gen-problem` · `/api/admin/gen-idea` · `/api/admin/gen-distill` · `/api/admin/bulk-distill?n=` · `/api/admin/import` |

## Lịch tự động (cron trên tenant-03)

```
0  * * * *  refresh hourly      # tin tức + công nghệ
5  * * * *  gen-problem         # phát hiện vấn đề
20 * * * *  gen-idea            # đúc ý tưởng giải vấn đề đau nhất
35 * * * *  gen-distill         # đúc lại 4 kho từ dữ liệu thật
50 * * * *  gen-distill
30 4 * * *  refresh full        # ingest toàn bộ nguồn
30 5 * * *  build-graph         # dựng lại mạng tri thức
```

## Deploy

```bash
bash platform/bigdata/deploy.sh
```

Script đồng bộ thư mục này lên `/opt/bigdata`, build image mới và chạy lại container
với đúng nhãn Traefik + biến môi trường hiện có (không cần nhập lại khoá).
