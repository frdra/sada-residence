import { describe, it, expect } from "vitest";
import { verifyWebhookToken, mapXenditPaymentMethod } from "@/lib/payments/xendit";

describe("verifyWebhookToken", () => {
  it("returns true for matching token", () => {
    const originalToken = process.env.XENDIT_WEBHOOK_TOKEN;
    process.env.XENDIT_WEBHOOK_TOKEN = "test-token-123";

    expect(verifyWebhookToken("test-token-123")).toBe(true);

    process.env.XENDIT_WEBHOOK_TOKEN = originalToken;
  });

  it("returns false for non-matching token", () => {
    const originalToken = process.env.XENDIT_WEBHOOK_TOKEN;
    process.env.XENDIT_WEBHOOK_TOKEN = "test-token-123";

    expect(verifyWebhookToken("wrong-token")).toBe(false);

    process.env.XENDIT_WEBHOOK_TOKEN = originalToken;
  });

  it("returns false for empty token", () => {
    expect(verifyWebhookToken("")).toBe(false);
  });
});

describe("mapXenditPaymentMethod", () => {
  it("maps QRIS to qris", () => {
    expect(mapXenditPaymentMethod("QRIS")).toBe("qris");
  });

  it("maps QR_CODE to qris", () => {
    expect(mapXenditPaymentMethod("QR_CODE")).toBe("qris");
  });

  it("maps CREDIT_CARD to credit_card", () => {
    expect(mapXenditPaymentMethod("CREDIT_CARD")).toBe("credit_card");
  });

  it("maps bank channels to bank_transfer", () => {
    expect(mapXenditPaymentMethod("BCA")).toBe("bank_transfer");
    expect(mapXenditPaymentMethod("BNI")).toBe("bank_transfer");
    expect(mapXenditPaymentMethod("BRI")).toBe("bank_transfer");
    expect(mapXenditPaymentMethod("MANDIRI")).toBe("bank_transfer");
    expect(mapXenditPaymentMethod("PERMATA")).toBe("bank_transfer");
  });

  it("defaults to bank_transfer for unknown channels", () => {
    expect(mapXenditPaymentMethod("UNKNOWN")).toBe("bank_transfer");
  });
});
