// Gói cước & logic kinh doanh — CLAUDE.md Phần 5. Đây là nguồn sự thật duy nhất
// cho quyền hạn theo gói; api-core và frontend đều đọc từ đây.

export type PlanKey = "STARTER" | "GROWTH" | "SCALE";

export interface PlanDefinition {
  key: PlanKey;
  /** Tên hiển thị tiếng Việt */
  label: string;
  /** Giá tháng, VND */
  priceVndMonthly: number;
  /** Số venture tối đa */
  maxVentures: number;
  /** Key catalog app được phép cài; "*" = tất cả */
  allowedAppKeys: string[] | "*";
  /** Ngân sách AI kèm gói (token-credit) */
  aiTokenCredit: number;
  /** Phí giao dịch Payments (%) */
  paymentFeePct: number;
  /** Được niêm yết Sàn M&A? */
  maListingAllowed: boolean;
  /** Phí thành công M&A (%) — null nếu không được niêm yết */
  maSuccessFeePct: number | null;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  STARTER: {
    key: "STARTER",
    label: "Khởi đầu",
    priceVndMonthly: 299_000,
    maxVentures: 1,
    // C8 (v2 cleanup): claw3d/openclaw đã sang openclawos.vn. App v2 tạm thời:
    // web bán hàng mẫu + ERPNext. AI (DeerFlow/AIO) sẽ nối ở PHA 3.
    allowedAppKeys: ["commerce-starter", "erpnext"],
    aiTokenCredit: 50_000,
    paymentFeePct: 3,
    maListingAllowed: false,
    maSuccessFeePct: null,
  },
  GROWTH: {
    key: "GROWTH",
    label: "Tăng trưởng",
    priceVndMonthly: 990_000,
    maxVentures: 1,
    // C8 (v2 cleanup): claw3d/openclaw → openclawos.vn. Tạm: web + ERPNext.
    allowedAppKeys: ["commerce-starter", "erpnext"],
    aiTokenCredit: 500_000,
    paymentFeePct: 2,
    maListingAllowed: true,
    maSuccessFeePct: 8,
  },
  SCALE: {
    key: "SCALE",
    label: "Bứt phá",
    priceVndMonthly: 2_900_000,
    maxVentures: 3,
    allowedAppKeys: "*",
    aiTokenCredit: 2_000_000,
    paymentFeePct: 1.5,
    maListingAllowed: true,
    maSuccessFeePct: 5,
  },
};

export function canInstallApp(plan: PlanKey, appKey: string): boolean {
  const allowed = PLANS[plan].allowedAppKeys;
  return allowed === "*" || allowed.includes(appKey);
}
