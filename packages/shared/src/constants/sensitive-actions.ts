// SoloCEO OS v2 (PHA 3) — Danh mục hành động nhạy cảm cần qua HITL gate (arishem).
// Nguồn sự thật duy nhất; api-core SensitiveActionGuard + rules-engine + DeerFlow
// guardrail đều đọc từ đây. Ref research/R6-report.md §3.

/** Mã hành động nhạy cảm — khớp Rule.actionType trong DB. */
export const SENSITIVE_ACTIONS = [
  "spend_money", // tạo payment, chi tiền, mua credit AI
  "send_bulk_email", // gửi email/SMS hàng loạt
  "submit_application", // nộp hồ sơ (ĐKKD, đối tác, cổng công)
  "sign_document", // ký hợp đồng/tài liệu điện tử
  "publish_public", // đăng công khai (feed, listing M&A, website)
  "delete_data", // xóa dữ liệu (venture, transaction, tenant)
  "deploy_infra", // provision/gỡ app qua Coolify / mở domain egress
  "transfer_ownership", // chuyển org_id sở hữu venture (M&A)
  "export_pii", // xuất dữ liệu chứa PII ra ngoài
] as const;

export type SensitiveAction = (typeof SENSITIVE_ACTIONS)[number];

/** Phán quyết mặc định (fallback khi chưa có Rule cụ thể trong DB). Fail-safe:
 *  hành động không-đảo-ngược mặc định cần người duyệt (tier 2). */
export type RuleDecisionKey = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export interface DefaultPolicy {
  decision: RuleDecisionKey;
  /** 1 = policy tự động (log lại); 2 = người thật phê duyệt. */
  tier?: 1 | 2;
}

export const DEFAULT_ACTION_POLICY: Record<SensitiveAction, DefaultPolicy> = {
  spend_money: { decision: "REQUIRE_APPROVAL", tier: 2 },
  send_bulk_email: { decision: "REQUIRE_APPROVAL", tier: 1 },
  submit_application: { decision: "REQUIRE_APPROVAL", tier: 2 },
  sign_document: { decision: "REQUIRE_APPROVAL", tier: 2 },
  publish_public: { decision: "REQUIRE_APPROVAL", tier: 1 },
  delete_data: { decision: "REQUIRE_APPROVAL", tier: 2 },
  deploy_infra: { decision: "REQUIRE_APPROVAL", tier: 1 },
  transfer_ownership: { decision: "REQUIRE_APPROVAL", tier: 2 },
  export_pii: { decision: "REQUIRE_APPROVAL", tier: 2 },
};

export function isSensitiveAction(x: string): x is SensitiveAction {
  return (SENSITIVE_ACTIONS as readonly string[]).includes(x);
}
