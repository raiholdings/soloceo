"""
ArishemGuardrailProvider — HITL gate tầng 1 cho DeerFlow (research/R1 §6, R6 §A).
Chặn MỌI tool-call nhạy cảm TRƯỚC khi thực thi: gọi svc-rules-engine.evaluate();
ALLOW → cho chạy; DENY/REQUIRE_APPROVAL → chặn (allow=False). Với REQUIRE_APPROVAL,
đăng ký ApprovalRequest ở api-core (best-effort) để CEO duyệt → resume (interrupt-resume).

Đặt trong backend DeerFlow, trỏ config:
    guardrails:
      use: soloceo.guardrails.arishem:ArishemGuardrailProvider

[CẦN KIỂM CHỨNG] Đường import + chữ ký GuardrailProvider/GuardrailRequest/
GuardrailDecision đối chiếu backend/.../guardrails/provider.py của bytedance/deer-flow.
"""
from __future__ import annotations

import os
import httpx

try:
    from deerflow.guardrails.provider import (  # type: ignore
        GuardrailProvider,
        GuardrailRequest,
        GuardrailDecision,
    )
except Exception:  # pragma: no cover - seam khi lint ngoài DeerFlow
    class GuardrailProvider:  # type: ignore
        ...

    class GuardrailRequest:  # type: ignore
        tool_name: str
        tool_input: dict
        agent_id: str | None
        thread_id: str | None
        metadata: dict

    class GuardrailDecision:  # type: ignore
        def __init__(self, allow: bool, reasons=None, policy_id: str | None = None):
            self.allow = allow
            self.reasons = reasons or []
            self.policy_id = policy_id


RULES_ENGINE_URL = os.environ.get("RULES_ENGINE_URL", "http://svc-rules-engine:8080")
APPROVAL_SINK_URL = os.environ.get("APPROVAL_SINK_URL", "")  # api-core, best-effort

# Ánh xạ tên tool DeerFlow → actionType nhạy cảm (SENSITIVE_ACTIONS).
# Mở rộng theo tool thực tế của agent. Tool không có trong map = không nhạy cảm.
TOOL_TO_ACTION: dict[str, str] = {
    "create_payment": "spend_money",
    "buy_ai_credit": "spend_money",
    "send_bulk_email": "send_bulk_email",
    "send_bulk_message": "send_bulk_email",
    "submit_application": "submit_application",
    "sign_document": "sign_document",
    "publish_post": "publish_public",
    "create_listing": "publish_public",
    "delete_venture": "delete_data",
    "delete_records": "delete_data",
    "deploy_app": "deploy_infra",
    "transfer_ownership": "transfer_ownership",
    "export_data": "export_pii",
}


class ArishemGuardrailProvider(GuardrailProvider):  # type: ignore[misc]
    def evaluate(self, request: "GuardrailRequest") -> "GuardrailDecision":
        action = TOOL_TO_ACTION.get(getattr(request, "tool_name", ""))
        if not action:
            return GuardrailDecision(allow=True)
        decision, rule_id, tier = self._call(action, request)
        return self._to_decision(action, decision, rule_id, tier, request)

    async def aevaluate(self, request: "GuardrailRequest") -> "GuardrailDecision":
        action = TOOL_TO_ACTION.get(getattr(request, "tool_name", ""))
        if not action:
            return GuardrailDecision(allow=True)
        decision, rule_id, tier = await self._acall(action, request)
        return self._to_decision(action, decision, rule_id, tier, request)

    # --- gọi svc-rules-engine ---
    def _payload(self, action: str, request: "GuardrailRequest") -> dict:
        meta = getattr(request, "metadata", {}) or {}
        return {
            "action": action,
            "context": {
                "orgId": meta.get("org_id"),
                "ventureId": meta.get("venture_id"),
                **(getattr(request, "tool_input", {}) or {}),
            },
        }

    def _call(self, action, request):
        try:
            r = httpx.post(f"{RULES_ENGINE_URL}/evaluate", json=self._payload(action, request), timeout=2.5)
            d = r.json()
            return d.get("decision", "REQUIRE_APPROVAL"), d.get("ruleId"), d.get("tier")
        except Exception:
            return "REQUIRE_APPROVAL", None, 2  # fail-closed

    async def _acall(self, action, request):
        try:
            async with httpx.AsyncClient(timeout=2.5) as c:
                r = await c.post(f"{RULES_ENGINE_URL}/evaluate", json=self._payload(action, request))
                d = r.json()
            return d.get("decision", "REQUIRE_APPROVAL"), d.get("ruleId"), d.get("tier")
        except Exception:
            return "REQUIRE_APPROVAL", None, 2

    def _to_decision(self, action, decision, rule_id, tier, request):
        if decision == "ALLOW":
            return GuardrailDecision(allow=True, policy_id=rule_id)
        if decision == "REQUIRE_APPROVAL":
            self._register_approval(action, tier, rule_id, request)
            return GuardrailDecision(
                allow=False,
                reasons=[{"code": "require_approval", "message": "Chờ CEO phê duyệt"}],
                policy_id=rule_id,
            )
        # DENY
        return GuardrailDecision(
            allow=False,
            reasons=[{"code": "deny", "message": "Hành động bị chặn bởi chính sách"}],
            policy_id=rule_id,
        )

    def _register_approval(self, action, tier, rule_id, request):
        """Best-effort: báo api-core tạo ApprovalRequest gắn thread/run → CEO duyệt
        → resume (POST /api/threads/{id}/state). Không chặn nếu api-core lỗi."""
        if not APPROVAL_SINK_URL:
            return
        meta = getattr(request, "metadata", {}) or {}
        try:
            httpx.post(
                APPROVAL_SINK_URL,
                json={
                    "orgId": meta.get("org_id"),
                    "ventureId": meta.get("venture_id"),
                    "actionType": action,
                    "tier": tier or 2,
                    "matchedRuleId": rule_id,
                    "threadId": getattr(request, "thread_id", None),
                    "payloadJson": getattr(request, "tool_input", {}) or {},
                },
                timeout=2.0,
            )
        except Exception:
            pass
