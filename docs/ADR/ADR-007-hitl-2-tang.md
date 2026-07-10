# ADR-007 — HITL 2 tầng: arishem gate + interrupt (fail-closed)

**Trạng thái:** Chấp nhận · **Ngày:** 10/07/2026 · **Liên quan:** research/R1 §6, R6 §A, nguyên tắc #4

## Bối cảnh
Nguyên tắc bất biến #4: mọi hành động không đảo ngược (chi tiền, ký, chuyển tiền,
gửi hợp đồng, đăng công khai, xóa dữ liệu) phải có checkpoint phê duyệt. v2 dùng
agent tự chủ (DeerFlow) → cần lớp gác cứng bằng luật, không phụ thuộc agent tự giác.

## Quyết định
HITL **2 tầng**:
- **Tầng 1 — arishem gate (policy tự động):** trước MỌI tool-call nhạy cảm
  (`SENSITIVE_ACTIONS`, packages/shared), gọi `rules-engine.evaluate(action, context)`.
  Cắm 2 nơi: (a) DeerFlow guardrail middleware (`guardrails/provider.py`,
  `evaluate→GuardrailDecision.allow`); (b) api-core `SensitiveActionGuard` (`RulesService`).
- **Tầng 2 — người thật duyệt:** `decision=REQUIRE_APPROVAL` → tạo `ApprovalRequest`
  (bảng DB), luồng DeerFlow **interrupt** (giữ checkpoint). CEO/admin duyệt qua
  `/v1/approvals` → **resume** run (`POST /api/threads/{id}/state` + run mới).

**Fail-closed:** rules-engine không phản hồi → mặc định theo `DEFAULT_ACTION_POLICY`
(hành động không-đảo-ngược = REQUIRE_APPROVAL tier 2). KHÔNG bao giờ fail-open với
chi tiền/ký/xóa. api-core đã hiện thực fallback này (an toàn kể cả khi svc-rules-engine
chưa deploy).

## Ánh xạ mức nhạy cảm (mặc định, có thể override bằng Rule per-org)
| actionType | Mặc định |
|---|---|
| spend_money, submit_application, sign_document, delete_data, transfer_ownership, export_pii | REQUIRE_APPROVAL **tier 2** |
| send_bulk_email, publish_public, deploy_infra | REQUIRE_APPROVAL **tier 1** |

Cổng dịch vụ công VN: ký số / VNeID / CAPTCHA / OTP / thanh toán = **Human-only**
(research R4) — agent KHÔNG tự làm kể cả khi rule cho phép.

## Hệ quả
- 4 bảng DB mới: `Rule`, `RuleDecisionLog` (audit — context mask PII qua godlp),
  `ApprovalRequest`, `EgressAllowlist`.
- Mọi phán quyết ghi audit (Nghị định 13 + đối soát trách nhiệm).
