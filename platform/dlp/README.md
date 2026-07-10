# platform/dlp — svc-dlp (godlp PII masking)

Ref: research/R6 §B. Microservice **Go** bọc `bytedance/godlp`, expose HTTP cho
LiteLLM guardrail (Python) — mask PII trong PROMPT trước khi rời hệ thống (Nghị định 13).

## Chức năng
- `POST /mask {text}` → `{masked, findings:[{type,count}]}`.
- Nạp ruleset built-in (godlp) + ruleset VN `rules-vn.yaml` (CCCD/SĐT/biển số/MST...).
- Trả findings dạng loại+số lượng (KHÔNG trả giá trị PII).

## Điểm cắm
- LiteLLM pre_call hook `infra/litellm/guardrails/dlp_guardrail.py` gọi `SVC_DLP_URL/mask`.
- Langfuse nhận metadata `dlp_findings` (loại+count) — bằng chứng tuân thủ, không lộ PII.

## Cần làm khi deploy
1. Xác minh định dạng ruleset godlp + license (giả định Apache-2.0 — mở LICENSE).
2. Test regex PII VN với dữ liệu thật (giảm false-positive/negative).
3. Build image `localhost:5000/soloceo/svc-dlp`; bật guardrail trong litellm config.yaml.

> Trạng thái: SPEC + ruleset (rules-vn.yaml) + guardrail (dlp_guardrail.py). Bật khi
> svc-dlp deploy; guardrail fail-open có kiểm soát (không treo tenant nếu svc-dlp lỗi).
