export type ReceiptDocumentCopy = "original" | "copy";

const RECEIPT_DOCUMENT_TITLES: Readonly<Record<ReceiptDocumentCopy, string>> = {
  original: "קבלה מקור",
  copy: "קבלה העתק",
};

export const CUSTOMER_RECEIPT_DOCUMENT_COPY: ReceiptDocumentCopy = "original";
export const BUSINESS_RECEIPT_DOCUMENT_COPY: ReceiptDocumentCopy = "copy";
export const RECEIPT_TEMPLATE_VERSION = "receipt-html-v2";

export function getReceiptDocumentTitle(documentCopy: ReceiptDocumentCopy) {
  return RECEIPT_DOCUMENT_TITLES[documentCopy];
}
