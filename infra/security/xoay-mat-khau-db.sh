#!/usr/bin/env bash
# Xoay mật khẩu CSDL cho một ứng dụng PHP trên tenant-01, an toàn từng bước.
#
# Dùng: bash xoay-mat-khau-db.sh <ten_app> <file_config> <container_db> <container_app> <domain>
#
# Vì sao phải cẩn thận đến mức này: mật khẩu nằm trong file PHP, đổi sai một ký tự là cả
# nền tảng chết mà không có thông báo gì — người dùng chỉ thấy trang trắng. Nên script:
#   1. sao lưu file config trước khi động vào
#   2. đổi mật khẩu trong CSDL rồi mới sửa file
#   3. khởi động lại app và KIỂM TRA HTTP thật
#   4. hỏng thì TỰ LÙI cả file lẫn mật khẩu về như cũ
#
# Mật khẩu mới KHÔNG bao giờ được in ra màn hình hay ghi vào log — chỉ ghi vào kho khoá
# mã hoá qua stdout dạng dòng "KHOA=<giá trị>" để bên gọi hứng, và bên gọi phải nạp thẳng
# vào kho chứ không hiển thị.
set -uo pipefail

TEN=${1:?thiếu tên app}
CFG=${2:?thiếu đường dẫn config}
DB=${3:?thiếu container CSDL}
APP=${4:?thiếu container app}
DOMAIN=${5:?thiếu domain kiểm tra}

luc=$(date +%Y%m%d-%H%M%S)
sao_luu="$CFG.truoc-xoay-$luc"

# Đọc thông tin hiện tại. $sql_db_user / $sql_db_pass / $sql_db_name là quy ước của
# WoWonder và các sản phẩm cùng dòng (PlayTube, Grupo, Flame đều fork từ đó).
doc(){ grep -oE "\\\$$1\s*=\s*[\"'][^\"']*[\"']" "$CFG" | head -1 | sed -E "s/.*[\"']([^\"']*)[\"'].*/\1/"; }
# Kiểu mảng: $config->database = ['username' => '...', 'password' => '...']
# Grupo dùng kiểu này thay vì $sql_db_* như WoWonder/PlayTube/Flame. Đọc nhầm kiểu thì
# script sẽ dừng ngay ở bước kiểm tra bên dưới chứ không phá gì.
doc_mang(){ grep -oE "['\"]$1['\"]\s*=>\s*['\"][^'\"]*['\"]" "$CFG" | head -1 | sed -E "s/.*=>\s*['\"]([^'\"]*)['\"].*/\1/"; }

NGUOI=$(doc sql_db_user); CU=$(doc sql_db_pass); TEN_DB=$(doc sql_db_name)
if [ -z "$NGUOI" ]; then
  NGUOI=$(doc_mang username); CU=$(doc_mang password); TEN_DB=$(doc_mang database)
fi

if [ -z "$NGUOI" ] || [ -z "$CU" ] || [ -z "$TEN_DB" ]; then
  echo "LOI: không đọc được thông tin CSDL từ $CFG — dừng, không đụng gì cả"; exit 1
fi

# 32 byte ngẫu nhiên, chỉ chữ và số: tránh ký tự làm hỏng cú pháp PHP hoặc SQL
MOI=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
[ ${#MOI} -lt 24 ] && { echo "LOI: không sinh đủ độ dài mật khẩu"; exit 1; }

echo "▸ $TEN — người dùng '$NGUOI', CSDL '$TEN_DB'"
cp -p "$CFG" "$sao_luu" || { echo "LOI: không sao lưu được config"; exit 1; }
echo "  đã sao lưu: $sao_luu"

lui(){
  echo "  ⟲ LÙI LẠI: khôi phục config và mật khẩu cũ"
  cp -p "$sao_luu" "$CFG"
  docker exec -i "$DB" mariadb -uroot -p"$ROOT_MK" -e \
    "ALTER USER '$NGUOI'@'%' IDENTIFIED BY '$CU'; FLUSH PRIVILEGES;" 2>/dev/null
  docker restart "$APP" >/dev/null 2>&1
  sleep 8
}

# Mật khẩu root của MariaDB lấy từ env của chính container CSDL
ROOT_MK=$(docker inspect "$DB" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^(MARIADB|MYSQL)_ROOT_PASSWORD=' | head -1 | cut -d= -f2-)
[ -z "$ROOT_MK" ] && { echo "LOI: không lấy được mật khẩu root CSDL"; exit 1; }

echo "  đổi mật khẩu trong CSDL..."
if ! docker exec -i "$DB" mariadb -uroot -p"$ROOT_MK" -e \
     "ALTER USER '$NGUOI'@'%' IDENTIFIED BY '$MOI'; FLUSH PRIVILEGES;" 2>/dev/null; then
  echo "LOI: đổi mật khẩu thất bại — chưa sửa file, không cần lùi"; exit 1
fi

echo "  cập nhật file config..."
python3 - "$CFG" "$CU" "$MOI" <<'PY'
import sys,io
cfg,cu,moi=sys.argv[1],sys.argv[2],sys.argv[3]
s=io.open(cfg,encoding='utf-8',errors='surrogateescape').read()
if cu not in s:
    print("LOI: không tìm thấy mật khẩu cũ trong file"); sys.exit(1)
io.open(cfg,'w',encoding='utf-8',errors='surrogateescape').write(s.replace(cu,moi))
PY
[ $? -ne 0 ] && { lui; exit 1; }

echo "  khởi động lại $APP..."
docker restart "$APP" >/dev/null 2>&1
sleep 10

ma=""
for i in 1 2 3 4 5 6; do
  ma=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$DOMAIN/" 2>/dev/null)
  case "$ma" in 200|301|302|307|308) break;; esac
  sleep 6
done

case "$ma" in
  200|301|302|307|308)
    echo "  ✓ $DOMAIN trả $ma — xoay thành công"
    echo "KHOA=$MOI"      # bên gọi hứng dòng này để nạp vào kho khoá, KHÔNG hiển thị
    exit 0;;
  *)
    echo "  ✗ $DOMAIN trả '$ma' — coi như hỏng"
    lui
    ma2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$DOMAIN/")
    echo "  sau khi lùi: $ma2"
    exit 1;;
esac
