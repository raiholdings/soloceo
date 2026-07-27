#!/usr/bin/env bash
# Deploy xưởng kiểm chứng ý tưởng → sandbox.soloceo.vn (tenant-03).
#
# Vì sao có script này thay vì gõ tay: dựng lại container bằng tay đã một lần làm mất sạch
# biến môi trường của một dịch vụ khác (Crawl4AI) vì tôi chỉ chép lại nhãn Traefik. Ở đây
# env được ĐỌC LẠI TỪ CHÍNH CONTAINER ĐANG CHẠY rồi truyền nguyên vẹn sang container mới,
# nên không thể rơi rớt. Container chưa tồn tại thì script dừng và yêu cầu tạo lần đầu
# bằng tay — thà báo lỗi còn hơn tự dựng thiếu khoá.
set -euo pipefail
cd "$(dirname "$0")"

MAY=${MAY:-82.197.71.41}
SSH="ssh -i $HOME/.ssh/soloceo_deploy -o StrictHostKeyChecking=no root@$MAY"
TEN=xuong-y-tuong
THE=$(date +%s)

echo "▸ Kiểm tra cú pháp"
node --check server.js
python3 -m py_compile xay_mvp.py

echo "▸ Đẩy mã lên $MAY"
$SSH "mkdir -p /opt/$TEN"
rsync -az --delete -e "ssh -i $HOME/.ssh/soloceo_deploy -o StrictHostKeyChecking=no" \
  --exclude node_modules --exclude .git ./ "root@$MAY:/opt/$TEN/"

echo "▸ Build + thay container (giữ nguyên env và volume cũ)"
$SSH bash -s "$TEN" "$THE" <<'CHAY'
set -euo pipefail
TEN=$1; THE=$2
cd "/opt/$TEN"
docker build -q -t "$TEN:$THE" . >/dev/null

if ! docker inspect "$TEN" >/dev/null 2>&1; then
  echo "  ✗ Chưa có container '$TEN'. Lần đầu phải tạo bằng tay (kèm env + nhãn Traefik)."
  exit 1
fi

# Bê nguyên env cũ sang: không đoán, không điền lại bằng tay
mapfile -t ENVS < <(docker inspect "$TEN" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -Ev '^(PATH|NODE_VERSION|YARN_VERSION)=' | grep -v '^$')
DOI_ENV=(); for e in "${ENVS[@]}"; do DOI_ENV+=(-e "$e"); done

docker rm -f "$TEN" >/dev/null 2>&1 || true
docker run -d --name "$TEN" --restart unless-stopped --network coolify \
  -v xuong-data:/data \
  "${DOI_ENV[@]}" \
  --label traefik.enable=true \
  --label 'traefik.http.routers.xuong.rule=Host(`sandbox.soloceo.vn`)' \
  --label traefik.http.routers.xuong.entrypoints=https \
  --label traefik.http.routers.xuong.tls=true \
  --label traefik.http.routers.xuong.tls.certresolver=letsencrypt \
  --label traefik.http.services.xuong.loadbalancer.server.port=8080 \
  "$TEN:$THE" >/dev/null

# Nối lại mạng MVP. Container mới KHÔNG tự vào mvp-net (docker run chỉ nhận một --network),
# mà thiếu nó thì proxy /mvp/:slug không tới được MVP nào — trả 502 và mọi dự án đã nghiệm
# thu bỗng "hỏng". Đã sập một lần đúng kiểu này sau khi nạp thêm biến môi trường.
docker network inspect mvp-net >/dev/null 2>&1 || docker network create --internal mvp-net >/dev/null
docker network connect mvp-net "$TEN" 2>/dev/null || true

sleep 4
docker ps --filter "name=^${TEN}$" --format '  {{.Image}} · {{.Status}}'
docker inspect "$TEN" --format '  mạng: {{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
docker image prune -f --filter "label!=keep" >/dev/null 2>&1 || true
CHAY

echo "▸ Kiểm tra dịch vụ"
for i in 1 2 3 4 5 6; do
  if r=$(curl -s --max-time 15 https://sandbox.soloceo.vn/api/tong-quan) && [ -n "$r" ]; then
    echo "  $(echo "$r" | head -c 300)"; break
  fi
  sleep 5
done
echo "✓ Xong"
