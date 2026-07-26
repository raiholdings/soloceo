#!/usr/bin/env bash
# Thu thập tài nguyên 4 máy chủ (RAM · ổ đĩa · CPU · tải · container) cho Admin Console.
#
# Vì sao cần: trang "Hạ tầng & Coolify" trước đây chỉ liệt kê IP và mã máy chủ lấy từ
# Coolify API — Coolify KHÔNG trả số liệu tài nguyên, nên không có cách nào biết máy nào
# sắp đầy ổ hay cạn RAM. Script này chạy trên core-01 (nơi giữ khoá SSH của Coolify),
# hỏi từng node rồi ghi ra JSON để api-core đọc.
#
# Chạy: cron mỗi 5 phút, cùng nhịp với check.sh.
set -u

BASE="/opt/soloceo-monitor"
WWW="$BASE/www"
OUT="$WWW/tai-nguyen.json"
KEY="${COOLIFY_SSH_KEY:-/data/coolify/ssh/keys/ssh_key@u9qjeofddbnohmdksvi4zne1}"
mkdir -p "$WWW"

# Ngưỡng cảnh báo (%)
NGUONG_CANH_BAO=80
NGUONG_NGUY_CAP=90

TG_TOKEN="${TG_TOKEN:-8862991031:AAHZRgQ3uo_2dxCBVYLDjDvM-QfQ71flkNY}"
TG_CHAT="${TG_CHAT:-6546594763}"
STATE="$BASE/state"; mkdir -p "$STATE"

# ten|ip  (core-01 đo tại chỗ, các node còn lại qua SSH)
MAY_CHU=(
  "core-01|local"
  "tenant-01|62.146.235.177"
  "tenant-02|194.233.85.255"
  "tenant-03|82.197.71.41"
)

# Lệnh đo — in ra một dòng: ram_dung ram_tong dia_dung_kb dia_tong_kb cpu tai1 container_chay container_tong
DO='free -m | awk "/Mem:/{printf \"%d %d \", \$3, \$2}";
    df -k --output=used,size / | tail -1 | awk "{printf \"%d %d \", \$1, \$2}";
    nproc | tr -d "\n"; echo -n " ";
    cut -d" " -f1 /proc/loadavg | tr -d "\n"; echo -n " ";
    docker ps -q 2>/dev/null | wc -l | tr -d "\n"; echo -n " ";
    docker ps -aq 2>/dev/null | wc -l'

canh_bao() {  # $1=tên máy  $2=nội dung  $3=khoá trạng thái
  local f="$STATE/tainguyen-$3"
  local moi="$2"
  [ -f "$f" ] && [ "$(cat "$f")" = "$moi" ] && return   # chỉ báo khi ĐỔI trạng thái
  echo "$moi" > "$f"
  [ "$moi" = "ok" ] && return
  curl -s --max-time 15 -X POST "https://api.telegram.org/bot$TG_TOKEN/sendMessage" \
    -d chat_id="$TG_CHAT" -d parse_mode=HTML \
    --data-urlencode text="⚠️ <b>Tài nguyên máy chủ</b>%0A$1: $moi" >/dev/null 2>&1
}

echo "{" > "$OUT.tmp"
echo "  \"cap_nhat\": \"$(date -Is)\"," >> "$OUT.tmp"
echo "  \"nguong\": {\"canh_bao\": $NGUONG_CANH_BAO, \"nguy_cap\": $NGUONG_NGUY_CAP}," >> "$OUT.tmp"
echo "  \"may_chu\": [" >> "$OUT.tmp"

dau=1
for m in "${MAY_CHU[@]}"; do
  ten="${m%%|*}"; ip="${m##*|}"
  if [ "$ip" = "local" ]; then
    d=$(eval "$DO" 2>/dev/null)
  else
    d=$(ssh -i "$KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=8 -o BatchMode=yes \
        "root@$ip" "$DO" 2>/dev/null)
  fi
  [ $dau -eq 0 ] && echo "," >> "$OUT.tmp"
  dau=0
  if [ -z "$d" ]; then
    printf '    {"ten":"%s","ip":"%s","ket_noi":false}' "$ten" "$ip" >> "$OUT.tmp"
    canh_bao "$ten" "không kết nối được" "$ten-net"
    continue
  fi
  set -- $d
  ram_d=$1; ram_t=$2; dia_d=$3; dia_t=$4; cpu=$5; tai=$6; ct_chay=$7; ct_tong=$8
  ram_pc=$(( ram_d * 100 / (ram_t > 0 ? ram_t : 1) ))
  dia_pc=$(( dia_d * 100 / (dia_t > 0 ? dia_t : 1) ))
  dia_dgb=$(( dia_d / 1048576 )); dia_tgb=$(( dia_t / 1048576 ))

  muc="ok"
  [ "$ram_pc" -ge $NGUONG_CANH_BAO ] || [ "$dia_pc" -ge $NGUONG_CANH_BAO ] && muc="canh-bao"
  [ "$ram_pc" -ge $NGUONG_NGUY_CAP ] || [ "$dia_pc" -ge $NGUONG_NGUY_CAP ] && muc="nguy-cap"

  printf '    {"ten":"%s","ip":"%s","ket_noi":true,"muc":"%s",' "$ten" "$ip" "$muc" >> "$OUT.tmp"
  printf '"ram_dung_mb":%d,"ram_tong_mb":%d,"ram_phan_tram":%d,' "$ram_d" "$ram_t" "$ram_pc" >> "$OUT.tmp"
  printf '"dia_dung_gb":%d,"dia_tong_gb":%d,"dia_phan_tram":%d,' "$dia_dgb" "$dia_tgb" "$dia_pc" >> "$OUT.tmp"
  printf '"cpu_loi":%d,"tai_1phut":%s,"container_chay":%d,"container_tong":%d}' \
    "$cpu" "$tai" "$ct_chay" "$ct_tong" >> "$OUT.tmp"

  if [ "$muc" = "ok" ]; then
    canh_bao "$ten" "ok" "$ten-res"
  else
    canh_bao "$ten" "RAM ${ram_pc}% · ổ đĩa ${dia_pc}% (${dia_dgb}/${dia_tgb} GB)" "$ten-res"
  fi
  canh_bao "$ten" "ok" "$ten-net"
done

echo "" >> "$OUT.tmp"
echo "  ]" >> "$OUT.tmp"
echo "}" >> "$OUT.tmp"

python3 -c "import json,sys; json.load(open('$OUT.tmp'))" 2>/dev/null \
  && mv "$OUT.tmp" "$OUT" \
  || { echo "JSON hỏng, giữ bản cũ"; rm -f "$OUT.tmp"; exit 1; }
echo "đã ghi $OUT"
