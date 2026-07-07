import { describe, expect, it } from "vitest";
import {
  signPayos,
  signStripe,
  verifyPayosChecksum,
  verifyStripeSignature,
} from "../src/verify";

describe("verifyStripeSignature", () => {
  const secret = "whsec_test_123";
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });

  it("chấp nhận chữ ký hợp lệ", () => {
    const header = signStripe(payload, secret);
    expect(verifyStripeSignature(payload, header, secret)).toBe(true);
  });

  it("từ chối sai secret", () => {
    const header = signStripe(payload, "whsec_khac");
    expect(verifyStripeSignature(payload, header, secret)).toBe(false);
  });

  it("từ chối payload bị sửa", () => {
    const header = signStripe(payload, secret);
    expect(verifyStripeSignature(payload + "x", header, secret)).toBe(false);
  });

  it("từ chối timestamp quá cũ (chống replay)", () => {
    const old = Math.floor(Date.now() / 1000) - 3600;
    const header = signStripe(payload, secret, old);
    expect(verifyStripeSignature(payload, header, secret)).toBe(false);
  });
});

describe("verifyPayosChecksum", () => {
  const key = "payos_checksum_test";
  const data = { orderCode: 12345, amount: 500000, description: "test" };

  it("chấp nhận checksum hợp lệ", () => {
    const sig = signPayos(data, key);
    expect(verifyPayosChecksum(data, sig, key)).toBe(true);
  });

  it("từ chối khi data bị sửa", () => {
    const sig = signPayos(data, key);
    expect(verifyPayosChecksum({ ...data, amount: 999 }, sig, key)).toBe(false);
  });

  it("từ chối sai key", () => {
    const sig = signPayos(data, "key_khac");
    expect(verifyPayosChecksum(data, sig, key)).toBe(false);
  });
});
