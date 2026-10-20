import {
  getReceiptDocumentTitle,
  RECEIPT_TEMPLATE_VERSION,
  type ReceiptDocumentCopy,
} from "@/lib/server/commerce/receipts/documentConfig";

export type ReceiptSellerSnapshot = {
  profileVersion: number;
  legalName: string;
  ownerName: string;
  businessStatus: string;
  businessNumber: string;
  address: string;
  contactEmail: string;
  accountantApprovedFooter: string | null;
};

export type ReceiptCustomerSnapshot = { name: string; email: string };

export type ReceiptLineItemSnapshot = {
  productId: string;
  title: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  currency: string;
  priceSource: string;
  offerCode: string | null;
};

export type ReceiptPaymentSnapshot = {
  method: string;
  providerOrderId: string;
  providerCaptureId: string;
  paidAt: string;
  environment: "live";
  amountMinor: number;
  currency: string;
};

export type ReceiptDocumentSnapshot = {
  receiptId: string;
  displayNumber: string;
  issuedAt: string;
  seller: ReceiptSellerSnapshot;
  customer: ReceiptCustomerSnapshot;
  lineItems: ReceiptLineItemSnapshot[];
  payment: ReceiptPaymentSnapshot;
  totalMinor: number;
  currency: string;
  documentVersion: number;
};

export type ReceiptFontAssets = { hebrew: string; global: string };

function escapeHtml(value: string) {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

function safeText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing receipt snapshot field: ${field}`);
  return escapeHtml(value.trim());
}

export function formatReceiptMoney(amountMinor: number, currency: string) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new Error("Invalid receipt amount");
  const amount = (amountMinor / 100).toFixed(2);
  return currency === "ILS" ? `₪${amount}` : `${amount} ${currency}`;
}

export function formatReceiptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid receipt timestamp");
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}.${values.month}.${values.year}`;
}

function validateSnapshot(snapshot: ReceiptDocumentSnapshot) {
  if (!snapshot.lineItems.length) throw new Error("Receipt requires at least one immutable line item");
  const calculated = snapshot.lineItems.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error("Invalid receipt quantity");
    if (!Number.isSafeInteger(item.unitPriceMinor) || item.unitPriceMinor <= 0) throw new Error("Invalid receipt unit price");
    if (item.currency !== snapshot.currency) throw new Error("Receipt line currency mismatch");
    return sum + item.quantity * item.unitPriceMinor;
  }, 0);
  if (calculated !== snapshot.totalMinor || snapshot.payment.amountMinor !== snapshot.totalMinor
    || snapshot.payment.currency !== snapshot.currency || snapshot.payment.environment !== "live") {
    throw new Error("Receipt immutable totals are inconsistent");
  }
}

function renderReceipt(snapshot: ReceiptDocumentSnapshot, documentCopy: ReceiptDocumentCopy) {
  validateSnapshot(snapshot);
  const seller = snapshot.seller;
  const customer = snapshot.customer;
  const rows = snapshot.lineItems.map((item) => `
    <tr>
      <td class="description-cell">
        <bdi dir="ltr">${safeText(item.title, "lineItems.title")}</bdi>
      </td>
      <td class="number-cell"><bdi dir="ltr">${item.quantity}</bdi></td>
      <td class="money-cell"><bdi dir="ltr">${formatReceiptMoney(item.unitPriceMinor * item.quantity, item.currency)}</bdi></td>
    </tr>`).join("");
  const footer = seller.accountantApprovedFooter
    ? `<footer><bdi dir="auto">${safeText(seller.accountantApprovedFooter, "seller.accountantApprovedFooter")}</bdi></footer>`
    : "";
  return `<article class="receipt-page" dir="rtl" data-template-version="${RECEIPT_TEMPLATE_VERSION}">
    <header class="seller-header">
      <h1><bdi dir="rtl">${safeText(seller.legalName, "seller.legalName")}</bdi></h1>
      <div class="business-status"><bdi dir="rtl">${safeText(seller.businessStatus, "seller.businessStatus")}</bdi></div>
      <h2><bdi class="document-title" dir="rtl">${getReceiptDocumentTitle(documentCopy)}</bdi></h2>
      <bdi class="receipt-number" dir="ltr">${safeText(snapshot.displayNumber, "displayNumber")}</bdi>
    </header>

    <section class="seller-details">
      <bdi dir="rtl">${safeText(seller.ownerName, "seller.ownerName")}</bdi>
      <bdi dir="ltr">${safeText(seller.businessNumber, "seller.businessNumber")}</bdi>
      <bdi dir="rtl">${safeText(seller.address, "seller.address")}</bdi>
      <bdi dir="ltr">${safeText(seller.contactEmail, "seller.contactEmail")}</bdi>
    </section>

    <section class="document-details">
      <div><span>לכבוד:</span> <bdi dir="auto">${safeText(customer.name, "customer.name")}</bdi></div>
      <div><span>תאריך:</span> <bdi dir="ltr">${formatReceiptDate(snapshot.issuedAt)}</bdi></div>
    </section>

    <table>
      <thead><tr><th>תיאור</th><th>כמות</th><th>סה״כ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="total-row"><span>סה״כ:</span> <strong><bdi dir="ltr">${formatReceiptMoney(snapshot.totalMinor, snapshot.currency)}</bdi></strong></section>

    <section class="payment-details">
      <span>פרטי תשלום:</span> <bdi dir="ltr">${safeText(snapshot.payment.method, "payment.method")}</bdi>
    </section>
    ${footer}
  </article>`;
}

export function renderReceiptHtml(input: {
  snapshots: ReceiptDocumentSnapshot[];
  fonts: ReceiptFontAssets;
  documentCopy: ReceiptDocumentCopy;
  syntheticLabel?: string;
}) {
  if (!input.snapshots.length) throw new Error("At least one receipt snapshot is required");
  const documentTitle = getReceiptDocumentTitle(input.documentCopy);
  const pages = input.snapshots.map((snapshot) => renderReceipt(snapshot, input.documentCopy)).join("\n");
  return `<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${input.syntheticLabel ? `${escapeHtml(input.syntheticLabel)} — ` : ""}${documentTitle}</title>
<style>
@font-face{font-family:"Receipt Hebrew";src:url("${input.fonts.hebrew}") format("truetype");font-weight:400;font-style:normal;font-display:block}
@font-face{font-family:"Receipt Global";src:url("${input.fonts.global}") format("truetype");font-weight:200 1000;font-style:normal;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#eceff1;color:#182026;font-family:"Receipt Hebrew","Receipt Global",sans-serif}
body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
.receipt-page{position:relative;width:210mm;min-height:297mm;margin:12mm auto;background:#fff;padding:19mm 21mm 17mm;overflow:hidden}
.seller-header{text-align:center;padding:4mm 0 7mm}
h1{font-size:23pt;margin:0 0 1mm;font-weight:700}.business-status{font-size:11.5pt;color:#44515a}
h2{font-size:19pt;margin:5mm 0 1.5mm;font-weight:700}.document-title{direction:rtl;unicode-bidi:isolate}.receipt-number{display:block;direction:ltr;unicode-bidi:isolate;font:600 11pt "Receipt Global",sans-serif;color:#34414a}
.seller-details{display:flex;flex-direction:column;align-items:flex-start;gap:1.1mm;padding:5mm 0 8mm;font-size:10.5pt;line-height:1.35}
.document-details{display:flex;justify-content:space-between;gap:12mm;padding:7mm 0;border-top:1px solid #bfc8cd;border-bottom:1px solid #bfc8cd;font-size:10.5pt}
.document-details>div{min-width:0}
bdi{unicode-bidi:isolate;overflow-wrap:anywhere}
table{width:100%;border-collapse:collapse;margin-top:10mm;table-layout:fixed}
th,td{border-bottom:1px solid #aeb8bf;padding:3.5mm 2mm;text-align:right;vertical-align:top;font-size:10pt}
th{font-size:9pt;color:#3d4a52;font-weight:700}
th:first-child,.description-cell{width:70%}.description-cell{direction:ltr;text-align:left;font-weight:700}.number-cell{width:12%;text-align:center}.money-cell{width:18%;text-align:left;direction:ltr}
.total-row{display:flex;justify-content:flex-start;align-items:baseline;gap:2mm;margin-top:5mm;padding-top:3mm;font-size:14pt}
.payment-details{margin-top:15mm;padding-top:4mm;border-top:1px solid #d5dce0;font-size:10.5pt}
footer{margin-top:10mm;padding-top:5mm;border-top:1px solid #d5dce0;font-size:9pt;color:#56636b;text-align:center}
@media print{
  html,body{background:#fff}
  .receipt-page{height:297mm;min-height:0;margin:0;box-shadow:none;break-inside:avoid;page-break-inside:avoid}
  .receipt-page+.receipt-page{break-before:page;page-break-before:always}
}
</style></head><body>${pages}</body></html>`;
}
