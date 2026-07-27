#!/usr/bin/env bash
# Nạp tài khoản/mật khẩu hệ thống vào kho Ghi nhớ của admin console.
#
# Chạy TRÊN core-01. Lý do: nó phải đọc mật khẩu từ các máy chủ rồi đẩy sang api-core;
# nếu chạy ở máy cá nhân thì mọi giá trị đi qua đó, in ra terminal và nằm lại trong lịch
# sử shell. Ở đây giá trị chỉ đi giữa các máy chủ và không bao giờ được echo.
#
# Dùng: bash nap-kho-ghi-nho.sh
set -uo pipefail

API=${API_CORE_URL:-https://api.soloceo.vn}
AT=$(docker inspect mosccddhkscicwdjapqlmuaw-111600023302 \
      --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^ADMIN_TOKEN=' | cut -d= -f2-)
[ -z "$AT" ] && { echo "LOI: không lấy được ADMIN_TOKEN"; exit 1; }

KEY=/root/.ssh/soloceo_deploy
T1=root@62.146.235.177   # tenant-01
T3=root@82.197.71.41     # tenant-03

luu(){  # luu <khoa> <gia_tri> <ghi_chu> <loai>
  local k="$1" v="$2" n="$3" l="$4"
  [ -z "$v" ] && { printf "  ✗ %-40s (không đọc được)\n" "$k"; return 1; }
  local ma
  ma=$(python3 -c "
import json,urllib.request,sys
d=json.dumps({'khoa':sys.argv[1],'gia_tri':sys.argv[2],'ghi_chu':sys.argv[3],'loai':sys.argv[4]}).encode()
r=urllib.request.Request('$API/v1/admin/eco/ghi-nho',data=d,
  headers={'Content-Type':'application/json','X-Admin-Token':'$AT'})
try:
  urllib.request.urlopen(r,timeout=25); print('ok')
except Exception as e: print('loi')
" "$k" "$v" "$n" "$l")
  [ "$ma" = "ok" ] && printf "  ✓ %-40s %s\n" "$k" "$n" || printf "  ✗ %-40s LỖI GỬI\n" "$k"
}

# Đọc mật khẩu từ file config PHP trên máy từ xa. Hai kiểu: $sql_db_pass và mảng 'password'.
doc_php(){ ssh -i $KEY -o StrictHostKeyChecking=no "$1" \
  "grep -oE \"\\\\\\\$sql_db_pass\s*=\s*['\\\"][^'\\\"]*|['\\\"]password['\\\"]\s*=>\s*['\\\"][^'\\\"]*\" '$2' 2>/dev/null | head -1 | sed -E \"s/.*['\\\"]//\"" 2>/dev/null; }

doc_env(){ ssh -i $KEY -o StrictHostKeyChecking=no "$1" \
  "docker inspect '$2' --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -E '^$3=' | head -1 | cut -d= -f2-" 2>/dev/null; }

echo "▸ CSDL tenant-01 (đã xoay 27/07/2026)"
luu "tenant-01/wowonder/db"  "$(doc_php $T1 /opt/wowonder/src/config.php)"        "my.soloceo.vn · user wowonder"     csdl
luu "tenant-01/playtube/db"  "$(doc_php $T1 /opt/playtube/src/config.php)"        "video.soloceo.vn · user playtube"  csdl
luu "tenant-01/grupo/db"     "$(doc_php $T1 /opt/grupo/src/include/config.php)"   "groupchat.soloceo.vn · user grupo" csdl
luu "tenant-01/flame/db"     "$(doc_php $T1 /opt/flame/www/config.php)"           "news.soloceo.vn · user flame"      csdl

echo "▸ Khoá hạ tầng lõi"
luu "core-01/api-core/admin-token" "$AT" "X-Admin-Token cho /v1/admin/*" dich-vu
luu "core-01/api-core/master-key" \
  "$(docker inspect mosccddhkscicwdjapqlmuaw-111600023302 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^MASTER_KEY=' | cut -d= -f2-)" \
  "⚠ KHOÁ GỐC — mất là không giải mã được kho này nữa" ha-tang
luu "tenant-03/bigdata/refresh-token" "$(doc_env $T3 bigdata REFRESH_TOKEN)" "bigdata.soloceo.vn admin API" dich-vu
luu "tenant-03/sandbox/token"         "$(doc_env $T3 xuong-y-tuong SANDBOX_TOKEN)" "sandbox.soloceo.vn admin API" dich-vu

echo
echo "LƯU Ý: master-key nằm trong chính kho mà nó mã hoá — mất key thì mọi mục khác thành"
echo "rác không cứu được. Hãy chép riêng nó ra một nơi ngoài hệ thống (giấy, password manager)."
