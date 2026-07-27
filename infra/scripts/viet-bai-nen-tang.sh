#!/usr/bin/env bash
# Viết bài giới thiệu nền tảng theo lô — chạy đến khi hết 111 nền tảng.
#
# Cài trên core-01: /opt/viet-bai-nen-tang.sh, cron mỗi 20 phút.
# Mỗi lô 3 bài (~2 phút). Cron dừng tự động khi con_lai = 0, nên cứ để chạy.
#
# Vì sao chạy nền theo lô thay vì một lượt: 111 lượt gọi mô hình mất hơn một giờ liên
# tục. Một cú ngắt mạng giữa chừng là mất cả lượt. Chạy lô nhỏ thì hỏng lô nào làm lại
# lô đó, và không chiếm CPU core-01 quá lâu một lúc.
set -uo pipefail

C=mosccddhkscicwdjapqlmuaw-111600023302
AT=$(docker inspect "$C" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^ADMIN_TOKEN=' | cut -d= -f2-)
[ -z "$AT" ] && exit 1

r=$(curl -s --max-time 900 -X POST https://api.soloceo.vn/v1/admin/eco/nen-tang/sinh-lo \
     -H "X-Admin-Token: $AT" -H 'Content-Type: application/json' -d "{\"so_luong\":${1:-3}}")
con_lai=$(echo "$r" | grep -oE '"con_lai":[0-9]+' | cut -d: -f2)
da_viet=$(echo "$r" | grep -oE '"da_viet":[0-9]+' | cut -d: -f2)
echo "$(date +%F\ %T) viết ${da_viet:-0} · còn ${con_lai:-?}" >> /var/log/nen-tang.log

# Hết việc thì tự gỡ cron — để nó chạy mãi chỉ tốn tiền gọi mô hình vô ích.
if [ "${con_lai:-1}" = "0" ]; then
  crontab -l 2>/dev/null | grep -v viet-bai-nen-tang | crontab -
  echo "$(date +%F\ %T) XONG toàn bộ — đã gỡ cron" >> /var/log/nen-tang.log
fi
