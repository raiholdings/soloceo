# godlp — RUNBOOK bật ENFORCE (C1) sau canary 24h

**Trạng thái:** shadow từ **18:28 CEST 10/07/2026** → **24h đủ lúc ~18:28 CEST 11/07/2026**.
KHÔNG rút ngắn 24h (ràng buộc chủ dự án). Lệnh dưới chạy KHI đủ 24h.

## Findings (battery FP đã chạy 11/07)
| Detector | Kết quả | Ghi chú |
|---|---|---|
| `cccd_12` (12 số, mở đầu 0) | ✅ đúng | không FP |
| `phone_vn` (+84/0 + đầu số 3/5/7/8/9) | ✅ đúng | không FP |
| `bank_account` | ✅ đúng | neo keyword STK/tài khoản — an toàn |
| `email` | ✅ đúng | — |
| `cmnd_9` (cũ = mọi dãy 9 số) | 🔴 **FP nặng → ĐÃ SỬA** | che nhầm "doanh thu **250000000**", "đơn hàng **123456789**" |
| `mst` (cũ = mọi dãy 10 số) | 🔴 **FP nặng → ĐÃ SỬA** | che nhầm "giá **3500000000**", "mã vận đơn **1234567890**" |
| `bien_so_xe` (cũ = 2 số + chữ) | 🟡 FP nhẹ → ĐÃ SỬA | che nhầm SKU "12AB3456" |

**Sửa (đã deploy `soloceo/svc-dlp:v1`, verify lại sạch):** neo `cmnd_9`/`mst`/`bien_so_xe` theo keyword
(CMND/CMT, mã số thuế/MST, biển số/BKS). Sau sửa: PII có nhãn vẫn mask đúng; số tiền/giá/mã đơn KHÔNG còn bị che.

## Bật enforce (chạy tại core-01 khi đủ 24h)
```bash
T=$(cat /root/.coolify_token_new); U=in0rczajeip1r7y4081msker
# 1) đổi env shadow → enforce (durable, Coolify lưu)
curl -s -X PATCH -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  http://localhost:8000/api/v1/services/$U/envs \
  -d '{"key":"DLP_HOOK_MODE","value":"enforce"}'
# 2) restart service (LiteLLM boot ~2 phút — ĐỪNG rollback sớm)
curl -s -X POST -H "Authorization: Bearer $T" http://localhost:8000/api/v1/services/$U/restart
```

## Verify sau enforce
```bash
# chờ ~2 phút cho LiteLLM boot, rồi bắn 1 prompt có PII qua gateway:
docker exec litellm-in0rczajeip1r7y4081msker python3 -c "
import json,urllib.request
b=json.dumps({'text':'CMND 123456789, gọi 0912345678'}).encode()
r=json.load(urllib.request.urlopen(urllib.request.Request('http://svc-dlp:8080/mask',data=b,headers={'Content-Type':'application/json'}),timeout=5))
print(r)"
# log LiteLLM phải thấy [DLP-ENFORCE] ... masked=True
docker logs --tail 50 litellm-in0rczajeip1r7y4081msker 2>&1 | grep DLP-ENFORCE | tail
```

## Rollback (fail-open — an toàn tuyệt đối)
```bash
T=$(cat /root/.coolify_token_new); U=in0rczajeip1r7y4081msker
curl -s -X PATCH -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
  http://localhost:8000/api/v1/services/$U/envs -d '{"key":"DLP_HOOK_MODE","value":"off"}'
curl -s -X POST -H "Authorization: Bearer $T" http://localhost:8000/api/v1/services/$U/restart
```
`off` = hook không đụng prompt (đường tắt tức thì). Hook vốn fail-open: svc-dlp lỗi/timeout 800ms → cho call đi qua, không mask, log `dlp_bypass`. KHÔNG bao giờ làm chết LLM call.

Backup source svc-dlp cũ: `/opt/soloceo-v2/dlp/main.go.bak-*` trên core-01.
