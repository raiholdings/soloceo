import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify chữ ký webhook Stripe (header Stripe-Signature: t=...,v1=...).
 * v1 = HMAC-SHA256(`${t}.${payload}`, webhookSecret)
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const parts = new Map(
    signatureHeader.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k?.trim() ?? "", v.join("=")] as const;
    }),
  );
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1) return false;
  if (Math.abs(nowSeconds - Number(t)) > toleranceSeconds) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${t}.${payload}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verify checksum PayOS: HMAC-SHA256 trên chuỗi key=value của `data`
 * sort theo alphabet, ký bằng PAYOS_CHECKSUM_KEY.
 */
export function verifyPayosChecksum(
  data: Record<string, unknown>,
  signature: string,
  checksumKey: string,
): boolean {
  const sorted = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k] ?? ""}`)
    .join("&");
  const expected = createHmac("sha256", checksumKey)
    .update(sorted)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tạo chữ ký PayOS (dùng cho test + mô phỏng dev) */
export function signPayos(
  data: Record<string, unknown>,
  checksumKey: string,
): string {
  const sorted = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k] ?? ""}`)
    .join("&");
  return createHmac("sha256", checksumKey).update(sorted).digest("hex");
}

/** Tạo header Stripe-Signature (dùng cho test + mô phỏng dev) */
export function signStripe(
  payload: string,
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const v1 = createHmac("sha256", webhookSecret)
    .update(`${nowSeconds}.${payload}`)
    .digest("hex");
  return `t=${nowSeconds},v1=${v1}`;
}
