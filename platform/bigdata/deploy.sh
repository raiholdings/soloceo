#!/usr/bin/env bash
# Deploy bigdata.soloceo.vn từ REPO (không sửa tay trên máy chủ).
# Dùng: bash platform/bigdata/deploy.sh [tag]
set -euo pipefail

HOST="${BIGDATA_HOST:-82.197.71.41}"
KEY="${SSH_KEY:-$HOME/.ssh/soloceo_deploy}"
SSH=(ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=25 -o ConnectionAttempts=3 -i "$KEY" "root@$HOST")
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAG="${1:-$(date +%s)}"

echo "▸ Đồng bộ nguồn → /opt/bigdata"
rsync -az --delete-after -e "ssh -o StrictHostKeyChecking=no -o BatchMode=yes -i $KEY" \
  --exclude 'node_modules' --exclude '*.bak*' \
  "$HERE/server.js" "$HERE/Dockerfile" "$HERE/package.json" "root@$HOST:/opt/bigdata/"
rsync -az -e "ssh -o StrictHostKeyChecking=no -o BatchMode=yes -i $KEY" \
  "$HERE/public/" "root@$HOST:/opt/bigdata/public/"

echo "▸ Kiểm tra cú pháp + build image bigdata-soloceo:$TAG"
"${SSH[@]}" bash -s <<EOF
set -e
cd /opt/bigdata
docker build -t bigdata-soloceo:$TAG . >/tmp/bd_build_$TAG.log 2>&1 || { tail -5 /tmp/bd_build_$TAG.log; exit 1; }

# giữ nguyên biến môi trường & nhãn Traefik của container đang chạy
LLMKEY=\$(docker inspect bigdata --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^LLM_API_KEY=' | cut -d= -f2-)
RTOKEN=\$(docker inspect bigdata --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^REFRESH_TOKEN=' | cut -d= -f2-)
docker rm -f bigdata >/dev/null 2>&1 || true
docker run -d --name bigdata --restart unless-stopped --network coolify -v bigdata-data-v3:/data \
  -e LLM_BASE_URL=https://llm.soloceo.vn/v1 -e LLM_API_KEY="\$LLMKEY" \
  -e LLM_MODEL_NAME=soloceo-smart -e REFRESH_TOKEN="\$RTOKEN" \
  -l traefik.enable=true -l "traefik.http.routers.bigdata.rule=Host(\\\`bigdata.soloceo.vn\\\`)" \
  -l traefik.http.routers.bigdata.entrypoints=https -l traefik.http.routers.bigdata.tls=true \
  -l traefik.http.routers.bigdata.tls.certresolver=letsencrypt \
  -l traefik.http.services.bigdata.loadbalancer.server.port=8080 \
  bigdata-soloceo:$TAG >/dev/null
sleep 25
docker ps --filter name=bigdata --format '  {{.Image}} · {{.Status}}'
EOF

echo "▸ Kiểm tra dịch vụ"
curl -s --max-time 20 https://bigdata.soloceo.vn/api/engine \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print("  bản ghi:", f"{d[\"tong_ban_ghi\"]:,}", "| kho độc quyền:", d.get("doc_quyen"))'
echo "✓ Xong"
