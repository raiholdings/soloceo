# DeerFlow (SoloCEO AI) — trang chủ soloceo.vn

DeerFlow 2.0 (bytedance/deer-flow) làm trang chủ soloceo.vn — chi tiết deploy ở
memory soloceo-deerflow. Thư mục gốc trên tenant-02: /opt/deerflow.

## Việt hoá landing (chạy trên server, rồi rebuild frontend prod)
- `vn-landing.py`: hero (HERO_WORDS, mô tả, nút), header/footer (Star on GitHub
  → "Cộng đồng Solo CEO" → https://my.soloceo.vn/).
- `vn-sections.py`: title/subtitle các section.
- Rebrand tên: sed "DeerFlow"→"SoloCEO AI" toàn frontend/src.
- Sau khi sửa src PHẢI rebuild (prod mode, không hot-reload):
  `docker compose -p deer-flow -f docker/docker-compose.yaml up -d --build frontend`

## Auth (OIDC WoWonder) + config: xem memory soloceo-deerflow.
