# ADR-004 — Pilot chạy trên 1 node Contabo Cloud VDS S

**Trạng thái:** Đề xuất — cần Phạm Văn Thư phê duyệt.
**Ngày:** 08/07/2026

## Bối cảnh
CLAUDE.md Phần 2.2 thiết kế 2 VPS (VPS-CORE 16GB + VPS-TENANT-01 32GB).
Thực tế mua 1 máy: Contabo Cloud VDS S — 3 core AMD EPYC 7282, 24GB RAM,
180GB NVMe, 250 Mbit/s (~€27.52/tháng, cam kết 12 tháng).

## Quyết định
Pilot (≤ ~5–8 tenant) chạy TOÀN BỘ trên 1 node:
- Coolify controller + core stack (api-core, 2 web, 2 svc, Postgres, Redis,
  LiteLLM) ≈ 4–6GB RAM.
- Tenant stack deploy vào CHÍNH node này (Coolify "localhost" server),
  vẫn mỗi tenant 1 project riêng như Phần 7.
- Dify (~2–3GB/instance) là hạng mục ngốn RAM chính → pilot giới hạn
  số tenant GROWTH có Dify theo RAM còn trống (ngưỡng 70% giữ nguyên).

## Hệ quả & lối thoát
- Khi RAM >70% ổn định: mua VPS-TENANT-01 (32GB) thêm vào Coolify qua SSH
  — svc-provision đã chọn node theo tải, không cần đổi code.
- Single point of failure: chấp nhận ở pilot; backup đêm bắt buộc (GĐ7).
- Supabase self-host (~2GB) cân nhắc đặt cùng node hoặc dùng Supabase Cloud
  free tier cho pilot để tiết kiệm RAM (khuyến nghị: Cloud cho pilot).
