# C1 godlp hook — trạng thái pha SHADOW

- **Bắt đầu shadow:** 2026-07-10 ~16:30 (giờ VPS core-01, +07).
- **Đủ 24h:** ~2026-07-11 16:30 → khi đó DỪNG, tổng hợp findings trình chủ dự án
  TRƯỚC khi chuyển enforce (cam kết, không rút ngắn).
- **Mode hiện tại:** `DLP_HOOK_MODE=shadow` (log-only, KHÔNG sửa prompt).
- **Fail-open:** svc-dlp lỗi/timeout 800ms → call vẫn qua + log `dlp_bypass`.

## Cách tổng hợp findings sau 24h (chạy trên core-01):
```bash
L=litellm-in0rczajeip1r7y4081msker
docker logs $L --since 24h 2>&1 | grep -oE '\[DLP-SHADOW\].*' \
  | grep -oE 'findings=\{[^}]*\}' | sort | uniq -c | sort -rn
# đếm dlp_bypass (svc-dlp lỗi) — phải ~0
docker logs $L --since 24h 2>&1 | grep -c dlp_bypass
```

## Chuyển ENFORCE (sau khi chủ dự án duyệt findings):
```bash
# set env qua Coolify + restart
DLP_HOOK_MODE=enforce  → prompt thực sự được mask trước khi rời hệ thống
```

## ROLLBACK tức thì (đường tắt C1):
```bash
# set DLP_HOOK_MODE=off (Coolify env) rồi restart litellm (~2 phút)
docker exec litellm-... : hoặc khôi phục litellm-config.yaml.bak-c1-*
```

## LƯU Ý HẠ TẦNG (phải giữ):
- svc-dlp + svc-rules-engine ĐÃ nối thêm network `in0rczajeip1r7y4081msker`
  (network của LiteLLM) — nếu recreate service, chạy lại:
    docker network connect in0rczajeip1r7y4081msker svc-dlp
    docker network connect in0rczajeip1r7y4081msker svc-rules-engine
