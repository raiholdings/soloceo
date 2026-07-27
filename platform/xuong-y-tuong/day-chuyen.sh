#!/usr/bin/env bash
# Chạy trọn dây chuyền: sinh ý tưởng → hút về xưởng → kiểm chứng → dựng MVP → lên sàn.
#
# Dùng: bash day-chuyen.sh [số_ý_tưởng_sinh_mới]
#
# Vì sao gộp thành một script thay vì gõ từng bước: mỗi vòng có 5 khâu, mỗi khâu vài phút,
# và bỏ sót một khâu thì khâu sau im lặng không có đầu vào (đã xảy ra: xuất bản 404 suốt
# mà không ai biết vì chẳng có gì đi tới đó). Ở đây mỗi khâu đều in số liệu ra.
#
# Chạy được nhiều lần liên tiếp: mọi khâu đều bỏ qua thứ đã xử lý.
set -uo pipefail

MAY=${MAY:-82.197.71.41}
SSH="ssh -i $HOME/.ssh/soloceo_deploy -o StrictHostKeyChecking=no root@$MAY"
BD=https://bigdata.soloceo.vn
SB=https://sandbox.soloceo.vn
SO_Y_TUONG=${1:-4}

TOK_BD=$($SSH 'docker inspect bigdata --format "{{range .Config.Env}}{{println .}}{{end}}" | grep "^REFRESH_TOKEN=" | cut -d= -f2-')
TOK_SB=$($SSH 'docker inspect xuong-y-tuong --format "{{range .Config.Env}}{{println .}}{{end}}" | grep "^SANDBOX_TOKEN=" | cut -d= -f2-')
[ -z "$TOK_BD" ] || [ -z "$TOK_SB" ] && { echo "✗ không lấy được token"; exit 1; }

echo "═══ 1. Sinh $SO_Y_TUONG ý tưởng mới từ kho đúc"
for i in $(seq 1 "$SO_Y_TUONG"); do
  curl -s --max-time 280 "$BD/api/admin/gen-idea?token=$TOK_BD" \
  | python3 -c "import sys,json
try:
  d=json.load(sys.stdin); i=d.get('idea') or {}
  print('  %-5s %s'%(d.get('status'),(i.get('ten') or d.get('error') or '')[:74]))
except Exception: print('  (không đọc được phản hồi)')"
done

echo "═══ 2. Hút về xưởng"
curl -s --max-time 120 "$SB/api/admin/hut?token=$TOK_SB&limit=60" | head -c 120; echo

echo "═══ 3. Kiểm chứng dự án chưa chấm"
DS=$(curl -s --max-time 30 "$SB/api/du-an" | python3 -c "
import sys,json;d=json.load(sys.stdin)
print(' '.join(str(r['id']) for r in d['results'] if r['trang_thai']=='moi'))")
[ -z "$DS" ] && echo "  (không có dự án mới)" || for id in $DS; do
  # Chấm song song: mỗi lượt gọi mô hình mất 2-4 phút, chạy tuần tự thì một vòng mất cả giờ.
  ( r=$(curl -s --max-time 300 "$SB/api/admin/kiem-chung/$id?token=$TOK_SB")
    echo "  #$id $(echo "$r" | head -c 90)" ) &
done
wait

echo "═══ 4. Dựng MVP cho dự án đạt ngưỡng"
N_DAT=$(curl -s --max-time 30 "$SB/api/du-an" | python3 -c "
import sys,json;print(sum(1 for r in json.load(sys.stdin)['results'] if r['trang_thai']=='dat'))")
echo "  số dự án đạt: $N_DAT"
[ "${N_DAT:-0}" -gt 0 ] && $SSH "/opt/xay-mvp.sh $N_DAT" 2>&1 | sed 's/^/  /'

echo "═══ 5. Đưa MVP đã nghiệm thu lên sàn"
DS=$(curl -s --max-time 30 "$SB/api/du-an" | python3 -c "
import sys,json;d=json.load(sys.stdin)
print(' '.join(str(r['id']) for r in d['results'] if r['trang_thai']=='nghiem-thu'))")
[ -z "$DS" ] && echo "  (chưa có MVP nào nghiệm thu đạt)" || for id in $DS; do
  echo "  #$id $(curl -s --max-time 250 "$SB/api/admin/xuat-ban/$id?token=$TOK_SB" | head -c 160)"
done

echo "═══ Kết quả"
curl -s --max-time 25 "$SB/api/tong-quan" | python3 -c "
import sys,json;print('  xưởng:',json.load(sys.stdin)['theo_trang_thai'])"
curl -s --max-time 25 "https://api.soloceo.vn/v1/marketplace/project-templates" | python3 -c "
import sys,json;d=json.load(sys.stdin);print('  trên sàn: %d sản phẩm'%len(d))"
