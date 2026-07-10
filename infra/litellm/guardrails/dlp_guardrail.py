"""
godlp DLP guardrail cho LiteLLM — SoloCEO OS v2 (research/R6 §7).

Mask PII trong PROMPT TRƯỚC khi rời hệ thống SoloCEO (đi tới Anthropic ở nước
ngoài) → tuân Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

Kiến trúc (Phương án A — sidecar HTTP): godlp là thư viện Go → bọc trong
microservice `svc-dlp` expose POST /mask {text} -> {masked, findings}. Guardrail
Python này gọi HTTP nội bộ. Langfuse chỉ nhận SỐ LƯỢNG phát hiện (không giá trị).

[CẦN KIỂM CHỨNG] Tên hook (async_pre_call_hook) và cách khai báo trong config.yaml
thay đổi theo version LiteLLM — đối chiếu version đang pin trước khi bật.
"""
import os
import httpx
from litellm.integrations.custom_guardrail import CustomGuardrail

SVC_DLP_URL = os.environ.get("SVC_DLP_URL", "http://svc-dlp:8080")


class GodlpGuardrail(CustomGuardrail):
    async def async_pre_call_hook(self, user_api_key_dict, cache, data, call_type):
        messages = data.get("messages", [])
        findings_total: dict[str, int] = {}
        for msg in messages:
            content = msg.get("content")
            if not isinstance(content, str) or not content:
                continue
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    r = await client.post(f"{SVC_DLP_URL}/mask", json={"text": content})
                    res = r.json()
                msg["content"] = res.get("masked", content)
                for f in res.get("findings", []):
                    t = f.get("type", "unknown")
                    findings_total[t] = findings_total.get(t, 0) + int(f.get("count", 1))
            except Exception:
                # FAIL-OPEN có kiểm soát: nếu svc-dlp lỗi, KHÔNG chặn cuộc gọi
                # (tránh treo tenant) nhưng ghi cảnh báo để giám sát. Với dữ liệu
                # cực nhạy có thể đổi sang fail-closed tuỳ chính sách.
                findings_total["_dlp_error"] = findings_total.get("_dlp_error", 0) + 1
        if findings_total:
            data.setdefault("metadata", {})["dlp_findings"] = findings_total
        return data
