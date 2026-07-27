#!/usr/bin/env bash
# Nạp bí mật của CHÍNH máy đang chạy vào kho Ghi nhớ (api.soloceo.vn).
#
# Dùng: ADMIN_TOKEN=... bash nap-tu-may.sh <ten_may>
#   ten_may: tenant-01 | tenant-03 | core-01
#
# Vì sao mỗi máy tự nạp thay vì một máy đọc hết: core-01 KHÔNG có khoá SSH sang các node
# tenant, và tenant-01 còn từ chối kết nối SSH từ core-01. Nhưng mọi máy đều gọi được
# api.soloceo.vn qua HTTPS — nên để mỗi máy tự đọc bí mật của mình rồi đẩy lên là đường
# ngắn nhất, và giá trị không phải đi vòng qua máy thứ ba.
set -uo pipefail

MAY=${1:?thiếu tên máy}
API=${API_CORE_URL:-https://api.soloceo.vn}
: "${ADMIN_TOKEN:?thiếu ADMIN_TOKEN}"

luu(){  # luu <khoa> <gia_tri> <ghi_chu> <loai>
  local k="$1" v="$2" n="$3" l="$4"
  if [ -z "$v" ]; then printf "  ✗ %-38s (không đọc được)\n" "$k"; return 1; fi
  local kq
  kq=$(ADMIN_TOKEN="$ADMIN_TOKEN" API="$API" python3 -c "
import json,os,sys,urllib.request
d=json.dumps({'khoa':sys.argv[1],'gia_tri':sys.argv[2],'ghi_chu':sys.argv[3],'loai':sys.argv[4]}).encode()
r=urllib.request.Request(os.environ['API']+'/v1/admin/eco/ghi-nho',data=d,
  headers={'Content-Type':'application/json','X-Admin-Token':os.environ['ADMIN_TOKEN']})
try:
    urllib.request.urlopen(r,timeout=25); print('ok')
except Exception as e:
    print('loi:'+str(e)[:60])
" "$k" "$v" "$n" "$l")
  case "$kq" in ok) printf "  ✓ %-38s %s\n" "$k" "$n";; *) printf "  ✗ %-38s %s\n" "$k" "$kq";; esac
}

# Đọc mật khẩu CSDL từ file config PHP. Hỗ trợ cả hai kiểu đã gặp:
#   $sql_db_pass = '...'            (WoWonder, PlayTube, Flame)
#   'password' => '...'             (Grupo)
doc_php(){
  [ -f "$1" ] || return 0
  python3 - "$1" <<'PY'
import re,sys,io
try: s=io.open(sys.argv[1],encoding='utf-8',errors='surrogateescape').read()
except Exception: sys.exit(0)
for pat in (r"\$sql_db_pass\s*=\s*['\"]([^'\"]*)['\"]", r"['\"]password['\"]\s*=>\s*['\"]([^'\"]*)['\"]"):
    m=re.search(pat,s)
    if m and m.group(1): print(m.group(1)); break
PY
}
doc_env(){ docker inspect "$1" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null \
           | grep -E "^$2=" | head -1 | cut -d= -f2-; }

case "$MAY" in
  tenant-01)
    echo "▸ CSDL tenant-01 (đã xoay 27/07/2026)"
    luu "tenant-01/wowonder/db" "$(doc_php /opt/wowonder/src/config.php)"      "my.soloceo.vn · user wowonder"     csdl
    luu "tenant-01/playtube/db" "$(doc_php /opt/playtube/src/config.php)"      "video.soloceo.vn · user playtube"  csdl
    luu "tenant-01/grupo/db"    "$(doc_php /opt/grupo/src/include/config.php)" "groupchat.soloceo.vn · user grupo" csdl
    luu "tenant-01/flame/db"    "$(doc_php /opt/flame/www/config.php)"         "news.soloceo.vn · user flame"      csdl
    luu "tenant-01/wowonder/db-root" "$(doc_env wowonder-wowonder-db-1 MARIADB_ROOT_PASSWORD)" "root MariaDB WoWonder" csdl
    luu "tenant-01/playtube/db-root" "$(doc_env playtube-playtube-db-1 MARIADB_ROOT_PASSWORD)" "root MariaDB PlayTube" csdl
    luu "tenant-01/grupo/db-root"    "$(doc_env grupo-grupo-db-1 MARIADB_ROOT_PASSWORD)"       "root MariaDB Grupo"    csdl
    luu "tenant-01/flame/db-root"    "$(doc_env flame-flame-db-1 MARIADB_ROOT_PASSWORD)"       "root MariaDB Flame"    csdl
    ;;
  tenant-03)
    echo "▸ Dịch vụ tenant-03"
    luu "tenant-03/bigdata/refresh-token" "$(doc_env bigdata REFRESH_TOKEN)"        "bigdata.soloceo.vn admin API"  dich-vu
    luu "tenant-03/sandbox/token"         "$(doc_env xuong-y-tuong SANDBOX_TOKEN)"  "sandbox.soloceo.vn admin API"  dich-vu
    luu "tenant-03/bigdata/llm-key"       "$(doc_env bigdata LLM_API_KEY)"          "khoá LiteLLM cho bộ đúc"       dich-vu
    ;;
  core-01)
    echo "▸ Hạ tầng lõi core-01"
    C=mosccddhkscicwdjapqlmuaw-111600023302
    luu "core-01/api-core/admin-token" "$(doc_env $C ADMIN_TOKEN)" "X-Admin-Token cho /v1/admin/*" dich-vu
    luu "core-01/api-core/master-key"  "$(doc_env $C MASTER_KEY)"  "⚠ KHOÁ GỐC giải mã chính kho này" ha-tang
    luu "core-01/api-core/database-url" "$(doc_env $C DATABASE_URL)" "Postgres của api-core" csdl
    ;;
  *) echo "Không biết máy '$MAY'"; exit 1;;
esac
