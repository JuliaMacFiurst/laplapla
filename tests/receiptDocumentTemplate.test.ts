import { describe, expect, it } from "vitest";
import {
  BUSINESS_RECEIPT_DOCUMENT_COPY,
  CUSTOMER_RECEIPT_DOCUMENT_COPY,
  getReceiptDocumentTitle,
} from "@/lib/server/commerce/receipts/documentConfig";
import { formatReceiptDate, formatReceiptMoney, renderReceiptHtml } from "@/lib/server/commerce/receipts/documentTemplate";
import { syntheticReceiptFixtures } from "@/lib/server/commerce/receipts/syntheticFixtures";

const fonts = { hebrew: "data:font/ttf;base64,HEBREW", global: "data:font/ttf;base64,GLOBAL" };

describe("immutable receipt HTML template", () => {
  it("renders centralized Hebrew title and explicit BiDi boundaries", () => {
    const html = renderReceiptHtml({
      snapshots: syntheticReceiptFixtures,
      fonts,
      documentCopy: "original",
      syntheticLabel: "SYNTHETIC",
    });
    expect(getReceiptDocumentTitle("original")).toBe("קבלה מקור");
    expect(getReceiptDocumentTitle("copy")).toBe("קבלה העתק");
    expect(html.match(/קבלה מקור/gu)).toHaveLength(4); // HTML title plus three receipt pages.
    expect(html).toContain('<html lang="he" dir="rtl">');
    expect(html).toContain('<bdi dir="ltr">Sound Case #001 - LapLapLa</bdi>');
    expect(html).toContain('<bdi class="receipt-number" dir="ltr">WEB-000001</bdi>');
    expect(html).toContain("Анна Тестова");
    expect(html).toContain("נועה Example Тест");
  });

  it("renders the sparse customer-facing accounting fields from immutable snapshots", () => {
    const html = renderReceiptHtml({ snapshots: [syntheticReceiptFixtures[0]], fonts, documentCopy: "original" });
    expect(html).toContain("אומנצ׳קים");
    expect(html).toContain("עוסק פטור");
    expect(html).toContain("קבלה מקור");
    expect(html).toContain("WEB-000001");
    expect(html).toContain("יוליה נואה מכלין");
    expect(html).toContain("337738868");
    expect(html).toContain("אחדות 18, חריש");
    expect(html).toContain("omanchikim@gmail.com");
    expect(html).toContain("לקוחה לדוגמה");
    expect(html).toContain("07.10.2026");
    expect(html).toContain("Sound Case #001 - LapLapLa");
    expect(html).toContain('<td class="number-cell"><bdi dir="ltr">1</bdi></td>');
    expect(html).toContain("₪49.00");
    expect(html).toContain("PayPal");
    expect(formatReceiptDate(syntheticReceiptFixtures[0].issuedAt)).toBe("07.10.2026");
  });

  it("omits operational and verbose ledger data from the customer-facing body", () => {
    const html = renderReceiptHtml({
      snapshots: [syntheticReceiptFixtures[0]],
      fonts,
      documentCopy: "original",
      syntheticLabel: "SYNTHETIC RENDERING SPIKE - NOT AN ISSUED RECEIPT",
    });
    const body = html.slice(html.indexOf("<body>"));
    expect(body).not.toContain("SYNTHETIC RENDERING SPIKE");
    expect(body).not.toContain("hebrew.customer@example.test");
    expect(body).not.toContain("A personalized printable quest for a birthday or group.");
    expect(body).not.toContain("SYNTHETIC-CAPTURE-001");
    expect(body).not.toContain("SYNTHETIC-PAYPAL-ORDER");
    expect(body).not.toContain("2026-10-07T12:29:00.000Z");
    expect(body).not.toContain("שם בעלים");
    expect(body).not.toContain("מספר עוסק");
    expect(body).not.toContain("כתובת");
    expect(body).not.toContain("דוא״ל");
    expect(body).not.toContain("חתימה");
  });

  it("escapes every snapshot value used in HTML", () => {
    const malicious = structuredClone(syntheticReceiptFixtures[0]);
    malicious.customer.name = '<img src=x onerror="alert(1)">';
    malicious.lineItems[0].title = "<script>alert(2)</script>";
    const html = renderReceiptHtml({ snapshots: [malicious], fonts, documentCopy: "original" });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(2)&lt;/script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("formats immutable currency and rejects inconsistent snapshots", () => {
    expect(formatReceiptMoney(4900, "ILS")).toBe("₪49.00");
    const inconsistent = structuredClone(syntheticReceiptFixtures[0]);
    inconsistent.totalMinor = 3900;
    expect(() => renderReceiptHtml({ snapshots: [inconsistent], fonts, documentCopy: "original" })).toThrow("immutable totals");
  });

  it("contains no unapproved legal wording, real customer PII, or remote assets", () => {
    const html = renderReceiptHtml({ snapshots: syntheticReceiptFixtures, fonts, documentCopy: "original" });
    expect(html).not.toContain("מסמך ממוחשב");
    expect(html).not.toContain("סעיף 31");
    expect(html).not.toMatch(/מע[״"]?מ/u);
    expect(html).not.toMatch(/https?:\/\//u);
    expect(html).not.toMatch(/payer|billing address|card number/iu);
  });

  it("renders original and retained copy from one immutable receipt without implying a second number", () => {
    const snapshot = syntheticReceiptFixtures[0];
    const original = renderReceiptHtml({ snapshots: [snapshot], fonts, documentCopy: "original" });
    const copy = renderReceiptHtml({ snapshots: [snapshot], fonts, documentCopy: "copy" });
    const originalBody = original.slice(original.indexOf("<body>"));
    const copyBody = copy.slice(copy.indexOf("<body>"));

    expect(CUSTOMER_RECEIPT_DOCUMENT_COPY).toBe("original");
    expect(BUSINESS_RECEIPT_DOCUMENT_COPY).toBe("copy");
    expect(originalBody).toContain("קבלה מקור");
    expect(originalBody).not.toContain("קבלה העתק");
    expect(copyBody).toContain("קבלה העתק");
    expect(copyBody).not.toContain("קבלה מקור");
    expect(originalBody.match(/WEB-000001/gu)).toHaveLength(1);
    expect(copyBody.match(/WEB-000001/gu)).toHaveLength(1);
    expect(originalBody.replace("קבלה מקור", "קבלה VARIANT")).toBe(
      copyBody.replace("קבלה העתק", "קבלה VARIANT"),
    );
  });
});
