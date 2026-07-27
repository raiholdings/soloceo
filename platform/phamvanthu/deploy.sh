#!/usr/bin/env bash
# Deploy website cá nhân phamvanthu.com — nginx tĩnh trên tenant-03.
#
# Vì sao trang tĩnh chứ không phải app: toàn bộ nội dung động (số liệu, báo cáo, nền tảng)
# lấy từ api.soloceo.vn ngay trên trình duyệt. Không có gì cần máy chủ tính toán, nên
# thêm một tầng ứng dụng chỉ tăng chỗ hỏng mà không thêm giá trị.
set -euo pipefail
cd "$(dirname "$0")"

MAY=${MAY:-82.197.71.41}
SSH="ssh -i $HOME/.ssh/soloceo_deploy -o StrictHostKeyChecking=no root@$MAY"
TEN=phamvanthu

echo "▸ Đẩy mã lên $MAY"
$SSH "mkdir -p /opt/$TEN/html/anh"
rsync -az --delete -e "ssh -i $HOME/.ssh/soloceo_deploy -o StrictHostKeyChecking=no" \
  --exclude deploy.sh --exclude '*.md' ./ "root@$MAY:/opt/$TEN/html/"

echo "▸ Dựng nginx + Traefik"
$SSH bash -s "$TEN" <<'CHAY'
set -euo pipefail
TEN=$1
cat > /opt/$TEN/default.conf <<'CONF'
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  # Trang tĩnh nhưng số liệu lấy động — cache HTML ngắn để sửa nội dung là thấy ngay,
  # cache ảnh dài vì chúng gần như không đổi.
  location ~* \.(jpg|jpeg|png|svg|webp|ico)$ { expires 30d; add_header Cache-Control "public"; }
  location / { try_files $uri $uri/ /index.html; add_header Cache-Control "public, max-age=300"; }
}
CONF

docker rm -f "$TEN" >/dev/null 2>&1 || true
docker run -d --name "$TEN" --restart unless-stopped --network coolify \
  -v /opt/$TEN/html:/usr/share/nginx/html:ro \
  -v /opt/$TEN/default.conf:/etc/nginx/conf.d/default.conf:ro \
  --label traefik.enable=true \
  --label 'traefik.http.routers.pvt.rule=Host(`phamvanthu.com`) || Host(`www.phamvanthu.com`)' \
  --label traefik.http.routers.pvt.entrypoints=https \
  --label traefik.http.routers.pvt.tls=true \
  --label traefik.http.routers.pvt.tls.certresolver=letsencrypt \
  --label traefik.http.services.pvt.loadbalancer.server.port=80 \
  nginx:alpine >/dev/null

sleep 4
docker ps --filter "name=^${TEN}$" --format '  {{.Image}} · {{.Status}}'
CHAY

echo "▸ Kiểm tra qua mạng nội bộ (DNS có thể chưa trỏ)"
$SSH "docker run --rm --network coolify curlimages/curl:latest -s -o /dev/null -w '  nội bộ: %{http_code}\n' --max-time 10 http://$TEN:80/"
echo "✓ Xong — trỏ DNS A: phamvanthu.com → $MAY (và www nếu muốn)"
