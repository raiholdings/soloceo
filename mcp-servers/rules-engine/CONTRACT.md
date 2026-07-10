# MCP `rules-engine` — hợp đồng cố định (arishem gate)

Ref: research/R6 §4. Bọc `svc-rules-engine` (Go + arishem). Đổi engine không đổi contract.

## Tool: `evaluate`
```jsonc
evaluate(
  action: string,        // actionType ∈ SENSITIVE_ACTIONS (packages/shared)
  context: object        // { orgId, ventureId?, amount?, recipients?, ... }
) -> {
  decision: "allow" | "deny" | "require_approval",
  ruleId: string | null, // rule đã khớp (audit/giải thích)
  tier?: 1 | 2,          // khi require_approval (2 = người thật duyệt)
  reason?: string
}
```

## Bất biến
- **Fail-closed**: engine không phản hồi → `deny` cho action nhạy cảm (api-core đã
  hiện thực fallback DEFAULT_ACTION_POLICY — xem `apps/api-core/src/rules`).
- Context log qua **godlp** mask trước khi lưu `RuleDecisionLog`.
- MCP chỉ **quyết định**, không thực thi. Gọi TRƯỚC mọi tool nhạy cảm, tại
  guard tập trung (không tin agent tự giác gọi).

## HTTP nội bộ (svc-rules-engine)
`POST /evaluate` body `{action, context}` → `{decision, ruleId, tier}`.
Load rules từ Postgres bảng `Rule` mỗi N giây. Env `RULES_ENGINE_URL` (api-core).
