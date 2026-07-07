// Điều kiện niêm yết Sàn M&A — CLAUDE.md Phần 5, mục 4.

export const LISTING_ELIGIBILITY = {
  /** Venture phải tồn tại tối thiểu (ngày) */
  minVentureAgeDays: 90,
  /** Số Transaction IN verified tối thiểu */
  minVerifiedInboundTx: 10,
  /** ttmRevenue phải > 0 */
  minTtmRevenue: 0,
} as const;

/**
 * Dải doanh thu hiển thị public trên Sàn M&A (ẩn số chính xác — Phần 4.1).
 * Trả về chuỗi dạng "500 triệu – 1 tỷ".
 */
export function revenueRangeLabel(ttmRevenueVnd: number): string {
  const BANDS: Array<[number, string]> = [
    [100_000_000, "Dưới 100 triệu"],
    [500_000_000, "100 – 500 triệu"],
    [1_000_000_000, "500 triệu – 1 tỷ"],
    [5_000_000_000, "1 – 5 tỷ"],
    [Infinity, "Trên 5 tỷ"],
  ];
  for (const [max, label] of BANDS) {
    if (ttmRevenueVnd < max) return label;
  }
  return "Trên 5 tỷ";
}
