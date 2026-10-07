import type { ReceiptDocumentSnapshot } from "@/lib/server/commerce/receipts/documentTemplate";

const base: ReceiptDocumentSnapshot = {
  receiptId: "synthetic-receipt-rendering-spike",
  displayNumber: "WEB-000001",
  issuedAt: "2026-10-07T12:30:00.000Z",
  seller: {
    profileVersion: 1,
    legalName: "אומנצ׳קים",
    ownerName: "יוליה נואה מכלין",
    businessStatus: "עוסק פטור",
    businessNumber: "337738868",
    address: "אחדות 18, חריש",
    contactEmail: "omanchikim@gmail.com",
    accountantApprovedFooter: null,
  },
  customer: { name: "לקוחה לדוגמה", email: "hebrew.customer@example.test" },
  lineItems: [{
    productId: "sound-case-001",
    title: "Sound Case #001 - LapLapLa",
    description: "A personalized printable quest for a birthday or group.",
    quantity: 1,
    unitPriceMinor: 4900,
    currency: "ILS",
    priceSource: "catalog",
    offerCode: null,
  }],
  payment: {
    method: "PayPal",
    providerOrderId: "SYNTHETIC-PAYPAL-ORDER",
    providerCaptureId: "SYNTHETIC-CAPTURE-001",
    paidAt: "2026-10-07T12:29:00.000Z",
    environment: "live",
    amountMinor: 4900,
    currency: "ILS",
  },
  totalMinor: 4900,
  currency: "ILS",
  documentVersion: 1,
};

export const syntheticReceiptFixtures: ReceiptDocumentSnapshot[] = [
  base,
  {
    ...base,
    receiptId: "synthetic-receipt-russian",
    customer: { name: "Анна Тестова", email: "russian.customer@example.test" },
  },
  {
    ...base,
    receiptId: "synthetic-receipt-mixed",
    customer: { name: "נועה Example Тест", email: "mixed.customer@example.test" },
    lineItems: [{
      ...base.lineItems[0],
      description: "Printable quest - ערכת משחק להדפסה - персонализированный квест.",
    }],
  },
];
