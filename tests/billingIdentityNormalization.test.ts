import { describe, expect, it } from "vitest";
import { BillingIdentityError, normalizeBillingName } from "@/lib/server/customerBillingIdentity";

describe("billing identity normalization", () => {
  it.each([
    ["  Julia   Noah-Makhlin  ", "Julia Noah-Makhlin"],
    ["יוליה נועה מכלין", "יוליה נועה מכלין"],
    ["Юлия О’Нилл", "Юлия О’Нилл"],
    ["שָׁלוֹם לוי", "שָׁלוֹם לוי"],
  ])("normalizes legitimate Unicode name %s", (input, expected) => {
    expect(normalizeBillingName(input)).toBe(expected.normalize("NFC"));
  });

  it("normalizes canonically equivalent Unicode to NFC", () => {
    expect(normalizeBillingName("Jose\u0301 Silva")).toBe("José Silva");
  });

  it.each(["A", "1234 -", "Julia\nMakhlin", "Julia\u200bMakhlin", "Julia\u0000Makhlin", "x".repeat(161)])(
    "rejects invalid input",
    (input) => expect(() => normalizeBillingName(input)).toThrow(BillingIdentityError),
  );
});
