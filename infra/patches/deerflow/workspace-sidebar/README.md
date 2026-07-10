# Patch: nền tảng SoloCEO vào sidebar workspace DeerFlow

Thêm các nền tảng phục vụ người dùng vào thanh nav trái của workspace
(soloceo.vn/workspace) — DeerFlow deploy ở tenant-02 `/opt/deerflow/frontend/src`.

## Thay đổi
- `components/workspace/workspace-nav-chat-list.tsx`: thêm 3 mục nav:
  - **Tạo doanh nghiệp** → /workspace/tao-doanh-nghiep (embed app.soloceo.vn/bat-dau)
  - **Gói cước** → /workspace/goi-cuoc (embed app.soloceo.vn/goi)
  - **Danh bạ** → /workspace/danh-ba (embed app.soloceo.vn/danh-ba)
  (giữ Cộng đồng/Video/Nhóm chat = WoWonder/PlayTube/Grupo)
- 3 trang `app/workspace/{tao-doanh-nghiep,goi-cuoc,danh-ba}/page.tsx` dùng
  `<EmbeddedSite>` (iframe cùng eTLD soloceo.vn → cookie đăng nhập chảy vào).

## Áp dụng lại (nếu rebuild DeerFlow từ đầu)
Copy file trong patch này đè lên frontend/src tương ứng, rồi:
```
cd /opt/deerflow && DEER_FLOW_CONFIG_PATH=/opt/deerflow/config.yaml ... \
  docker compose --env-file .env -p deer-flow -f docker/docker-compose.yaml build frontend
docker compose ... up -d frontend
```
Backup live: /opt/deerflow-backup-<timestamp>/.
