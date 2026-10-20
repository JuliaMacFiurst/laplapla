import { describe, expect, it } from "vitest";
import { resolveProductReceiptSnapshot } from "@/lib/server/commerce/productReceiptSnapshots";

describe("product receipt snapshots", () => {
  it("resolves the approved immutable Sound Case receipt copy", () => {
    expect(resolveProductReceiptSnapshot("sound-case-001")).toEqual({
      title: "Sound Case #001 - LapLapLa",
      description: "A personalized printable quest for a birthday or group.",
    });
  });

  it("fails closed instead of inventing copy for an unknown legacy product", () => {
    expect(() => resolveProductReceiptSnapshot("legacy-product")).toThrow(
      "Product receipt snapshot is unavailable",
    );
  });
});
