import { getProductById } from "@/lib/shop/catalog";

export type ProductReceiptSnapshot = {
  title: string;
  description: string;
};

export function resolveProductReceiptSnapshot(productId: string): ProductReceiptSnapshot {
  const product = getProductById(productId);
  const title = product?.receipt.title.trim() ?? "";
  const description = product?.receipt.description.trim() ?? "";

  if (!title || !description) {
    throw new Error("Product receipt snapshot is unavailable");
  }

  return { title, description };
}
