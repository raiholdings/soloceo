#!/usr/bin/env bash
# Đội AI viết báo cáo nghiên cứu — mỗi ngày một bản.
#
# Cài trên core-01: /opt/bao-cao-hang-ngay.sh, cron `25 6 * * *` (06:25 giờ VN).
#
# Báo cáo ra ở trạng thái NHÁP, KHÔNG tự xuất bản và KHÔNG tự đăng Facebook. Lý do ghi
# đầy đủ trong apps/api-core/src/admin/bao-cao.service.ts (mục dangFacebook): báo cáo do
# AI viết, đăng thẳng lên trang chính thức nghĩa là một con số sai ra thẳng công chúng
# dưới tên thương hiệu, mà Facebook không cho rút lại êm.
#
# Người vận hành mở admin.soloceo.vn → Báo cáo nghiên cứu → đọc → Xuất bản → Đăng FB.
set -uo pipefail

C=mosccddhkscicwdjapqlmuaw-111600023302
AT=$(docker inspect "$C" --format '{{range .Config.Env}}{{println .}}{{end}}' \
     | grep '^ADMIN_TOKEN=' | cut -d= -f2-)
[ -z "$AT" ] && { echo "$(date +%F\ %T) LOI: không lấy được ADMIN_TOKEN" >> /var/log/bao-cao.log; exit 1; }

r=$(curl -s --max-time 280 -X POST https://api.soloceo.vn/v1/admin/eco/bao-cao/sinh \
     -H "X-Admin-Token: $AT" -H 'Content-Type: application/json' -d '{}')
echo "$(date +%F\ %T) $r" >> /var/log/bao-cao.log
