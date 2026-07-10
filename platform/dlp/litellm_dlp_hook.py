"""
godlp pre-call hook cho LiteLLM (C1) — mask PII trước khi prompt rời hệ thống.

Chế độ (env DLP_HOOK_MODE):
  off     — không làm gì (đường TẮT tức thì / rollback).
  shadow  — TÍNH mask + log findings, NHƯNG KHÔNG sửa prompt (canary pha 1, 24h).
  enforce — thực sự thay prompt bằng bản đã mask (pha 2).

An toàn (fail-open — chủ dự án duyệt 10/07):
  - svc-dlp lỗi/timeout (800ms) → CHO call đi qua, KHÔNG mask, log cảnh báo
    `dlp_bypass`. Hook KHÔNG được làm chết LLM call.
  - Circuit breaker: N lỗi liên tiếp → tạm bỏ qua svc-dlp trong COOLDOWN giây
    (không đập vào service đang hỏng), tự thử lại sau.

Cắm vào LiteLLM qua config:
  litellm_settings:
    callbacks: ["litellm_dlp_hook.dlp_guardrail_instance"]
KHÔNG log giá trị PII — chỉ loại + số lượng (findings) về Langfuse metadata.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

from litellm.integrations.custom_logger import CustomLogger

try:
    # Logger của LiteLLM proxy — dòng log đi vào docker logs (audit shadow 24h).
    from litellm._logging import verbose_proxy_logger as _log
except Exception:  # pragma: no cover
    import logging

    _log = logging.getLogger("litellm_dlp_hook")

SVC_DLP_URL = os.environ.get("SVC_DLP_URL", "http://svc-dlp:8080")
TIMEOUT = float(os.environ.get("DLP_HOOK_TIMEOUT", "0.8"))  # 800ms
CB_THRESHOLD = int(os.environ.get("DLP_CB_THRESHOLD", "5"))
CB_COOLDOWN = float(os.environ.get("DLP_CB_COOLDOWN", "30"))


def _mode() -> str:
    return (os.environ.get("DLP_HOOK_MODE", "off") or "off").lower()


class _Breaker:
    """Circuit breaker đơn giản, in-process."""

    def __init__(self) -> None:
        self.fails = 0
        self.open_until = 0.0

    def allow(self) -> bool:
        return time.monotonic() >= self.open_until

    def ok(self) -> None:
        self.fails = 0

    def fail(self) -> None:
        self.fails += 1
        if self.fails >= CB_THRESHOLD:
            self.open_until = time.monotonic() + CB_COOLDOWN
            self.fails = 0


class DlpGuardrail(CustomLogger):
    def __init__(self) -> None:
        super().__init__()
        self.breaker = _Breaker()

    # LiteLLM gọi hook này TRƯỚC khi gửi request tới model.
    async def async_pre_call_hook(self, user_api_key_dict, cache, data, call_type):
        mode = _mode()
        if mode == "off":
            return data
        try:
            self._process(data, mode)
        except Exception as e:  # tuyệt đối không để hook làm hỏng call
            self._warn(data, f"dlp_hook_error: {type(e).__name__}")
        return data

    def _process(self, data: dict, mode: str) -> None:
        messages = data.get("messages")
        if not isinstance(messages, list):
            return
        if not self.breaker.allow():
            self._warn(data, "dlp_bypass: circuit_open")
            return

        total: dict[str, int] = {}
        changed = False
        for msg in messages:
            content = msg.get("content")
            if not isinstance(content, str) or not content:
                continue
            res = self._mask(content)  # có thể ném → fail-open ở async_pre_call_hook
            for f in res.get("findings", []):
                total[f["type"]] = total.get(f["type"], 0) + int(f.get("count", 0))
            if mode == "enforce" and res.get("masked") and res["masked"] != content:
                msg["content"] = res["masked"]
                changed = True

        self.breaker.ok()
        meta = data.setdefault("metadata", {})
        meta["dlp_mode"] = mode
        meta["dlp_findings"] = total  # loại + số lượng, KHÔNG có giá trị PII
        if mode == "shadow":
            meta["dlp_shadow"] = True  # ghi rõ: chưa thực sự mask
        if changed:
            meta["dlp_masked"] = True

        # Audit trail (docker logs) — chỉ loại + số lượng, KHÔNG có giá trị PII.
        # Đây là nguồn dữ liệu để tổng hợp findings sau 24h shadow.
        if total or mode == "enforce":
            model = data.get("model", "?")
            _log.info(
                "[DLP-%s] model=%s findings=%s masked=%s",
                mode.upper(),
                model,
                json.dumps(total, ensure_ascii=True),
                changed,
            )

    def _mask(self, text: str) -> dict:
        try:
            req = urllib.request.Request(
                f"{SVC_DLP_URL}/mask",
                data=json.dumps({"text": text}).encode("utf-8"),
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception:
            self.breaker.fail()
            raise

    @staticmethod
    def _warn(data: dict, msg: str) -> None:
        meta = data.setdefault("metadata", {})
        meta["dlp_warning"] = msg


# Instance để LiteLLM tham chiếu trong config: "litellm_dlp_hook.dlp_guardrail_instance"
dlp_guardrail_instance = DlpGuardrail()
