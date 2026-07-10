"""
ArishemGuardrailProvider — HITL gate tầng AGENT cho DeerFlow (P1/B2).

Khớp contract THẬT của DeerFlow (đã đọc source 11/07/2026):
  deerflow.guardrails.provider:
    GuardrailProvider  = Protocol (không cần kế thừa), yêu cầu thuộc tính `name`
    GuardrailRequest   = tool_name, tool_input, agent_id, thread_id, is_subagent,
                         timestamp, user_id, user_role, oauth_*, run_id, tool_call_id
                         (KHÔNG có `metadata`)
    GuardrailDecision  = allow, reasons: list[GuardrailReason(code,message)],
                         policy_id, metadata
  config.yaml:
    guardrails:
      enabled: true
      fail_closed: true            # DeerFlow tự chặn khi provider lỗi
      provider:
        use: "soloceo_guardrail.arishem:ArishemGuardrailProvider"
        config: { gate_url: "...", timeout: 3.0 }   # → kwargs của __init__

THIẾT KẾ AN TOÀN:
- **Short-circuit cục bộ**: tool KHÔNG nằm trong TOOL_TO_ACTION → allow ngay,
  KHÔNG gọi mạng. Vậy tool thường (bash/browser/file…) không thêm độ trễ và
  không phụ thuộc api-core. Chỉ tool nhạy cảm mới đi qua gate.
- **Fail-closed** cho tool nhạy cảm: gate lỗi/timeout → raise → DeerFlow chặn
  (theo `fail_closed: true`). Tiền/pháp lý thà chặn nhầm còn hơn lọt.
- DeerFlow (tenant-02) KHÔNG tới được svc-rules-engine (network core-01) nên gọi
  api-core qua HTTPS: POST /v1/rules/evaluate-internal (header X-Internal-Token).
  api-core mới nói chuyện với engine → dùng lại audit log + ApprovalRequest.
- Chỉ dùng thư viện chuẩn (urllib) — không thêm dependency vào image DeerFlow.
"""
from __future__ import annotations

import asyncio
import json
import os
import urllib.error
import urllib.request

from deerflow.guardrails.provider import (  # type: ignore[import-not-found]
    GuardrailDecision,
    GuardrailReason,
    GuardrailRequest,
)

# Tên tool DeerFlow/MCP → actionType nhạy cảm (packages/shared SENSITIVE_ACTIONS).
# Tool KHÔNG có trong bảng này = không nhạy cảm → allow, không gọi mạng.
TOOL_TO_ACTION: dict[str, str] = {
    "create_payment": "spend_money",
    "buy_ai_credit": "spend_money",
    "checkout": "spend_money",
    "send_bulk_email": "send_bulk_email",
    "send_bulk_message": "send_bulk_email",
    "submit_application": "submit_application",
    "sign_document": "sign_document",
    "publish_post": "publish_public",
    "create_listing": "publish_public",
    "publish_website": "publish_public",
    "delete_venture": "delete_data",
    "delete_records": "delete_data",
    "deploy_app": "deploy_infra",
    "transfer_ownership": "transfer_ownership",
    "export_data": "export_pii",
}

DEFAULT_GATE_URL = "https://api.soloceo.vn/v1/rules/evaluate-internal"


class ArishemGuardrailProvider:
    """Gate mọi tool-call nhạy cảm của agent trước khi thực thi."""

    name = "arishem"

    def __init__(
        self,
        gate_url: str | None = None,
        timeout: float = 3.0,
        **_: object,
    ) -> None:
        self.gate_url = gate_url or os.environ.get("RULES_GATE_URL", DEFAULT_GATE_URL)
        self.timeout = float(timeout)
        self.token = os.environ.get("INTERNAL_API_TOKEN", "")

    # --- Protocol ---
    def evaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        action = TOOL_TO_ACTION.get(request.tool_name)
        if not action:
            return GuardrailDecision(allow=True)  # short-circuit, không gọi mạng
        data = self._call_gate(action, request)
        return self._to_decision(data)

    async def aevaluate(self, request: GuardrailRequest) -> GuardrailDecision:
        action = TOOL_TO_ACTION.get(request.tool_name)
        if not action:
            return GuardrailDecision(allow=True)
        data = await asyncio.to_thread(self._call_gate, action, request)
        return self._to_decision(data)

    # --- nội bộ ---
    def _call_gate(self, action: str, request: GuardrailRequest) -> dict:
        """Gọi api-core. Lỗi/timeout → raise → DeerFlow fail_closed chặn."""
        if not self.token:
            raise RuntimeError("INTERNAL_API_TOKEN chưa cấu hình — không thể gate")
        payload = json.dumps(
            {
                "action": action,
                "userId": request.user_id,
                "threadId": request.thread_id,
                "runId": request.run_id,
                "context": request.tool_input or {},
            }
        ).encode("utf-8")
        req = urllib.request.Request(
            self.gate_url,
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-Internal-Token": self.token,
            },
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    @staticmethod
    def _to_decision(data: dict) -> GuardrailDecision:
        decision = str(data.get("decision", "")).upper()
        policy_id = data.get("ruleId")
        meta = {
            k: v
            for k, v in (
                ("approvalId", data.get("approvalId")),
                ("tier", data.get("tier")),
                ("fallback", data.get("fallback")),
            )
            if v is not None
        }
        if decision == "ALLOW":
            return GuardrailDecision(allow=True, policy_id=policy_id, metadata=meta)
        if decision == "REQUIRE_APPROVAL":
            return GuardrailDecision(
                allow=False,
                reasons=[
                    GuardrailReason(
                        code="require_approval",
                        message="Hành động cần CEO phê duyệt — xem mục Phê duyệt trong workspace.",
                    )
                ],
                policy_id=policy_id,
                metadata=meta,
            )
        # DENY hoặc phản hồi lạ → chặn (fail-closed)
        return GuardrailDecision(
            allow=False,
            reasons=[
                GuardrailReason(
                    code="deny",
                    message="Hành động bị chặn bởi chính sách an toàn.",
                )
            ],
            policy_id=policy_id,
            metadata=meta,
        )
