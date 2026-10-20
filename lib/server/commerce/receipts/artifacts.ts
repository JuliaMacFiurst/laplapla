import { createHash } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/server/supabase";
import { captureAndAlertServerError } from "@/lib/monitoring/captureAndAlertServerError";
import { RECEIPT_TEMPLATE_VERSION, type ReceiptDocumentCopy } from "./documentConfig";
import { renderReceiptPdf } from "./pdfRenderer";
import type { ReceiptDocumentSnapshot } from "./documentTemplate";

export const RECEIPT_PDF_ARTIFACT_TYPE = "receipt_pdf" as const;
export const RECEIPT_ARTIFACT_COPIES = ["original", "copy"] as const satisfies readonly ReceiptDocumentCopy[];
export const RECEIPT_ARTIFACT_LEASE_SECONDS = 300;

export type ReceiptArtifactClaimRow = {
  result: "claimed" | "ready" | "processing" | "receipt_not_found" | "configuration_mismatch";
  artifact_id: string | null;
  claim_token: string | null;
  storage_bucket: string | null;
  storage_key: string | null;
  existing_sha256: string | null;
  existing_byte_size: number | null;
};

export type ReceiptArtifactCopyResult = {
  documentCopy: ReceiptDocumentCopy;
  status: "generated" | "ready" | "processing" | "failed";
  artifactId?: string;
  code?: string;
};

export type ReceiptArtifactsResult = {
  receiptId: string;
  complete: boolean;
  copies: ReceiptArtifactCopyResult[];
};

type ArtifactDependencies = {
  claim(receiptId: string, documentCopy: ReceiptDocumentCopy): Promise<ReceiptArtifactClaimRow>;
  loadSnapshot(receiptId: string): Promise<ReceiptDocumentSnapshot>;
  render(snapshot: ReceiptDocumentSnapshot, documentCopy: ReceiptDocumentCopy): Promise<Buffer>;
  upload(bucket: string, key: string, bytes: Buffer): Promise<"uploaded" | "exists">;
  downloadIfExists(bucket: string, key: string): Promise<Buffer | null>;
  stage(artifactId: string, token: string, bytes: Buffer, sha256: string): Promise<boolean>;
  complete(artifactId: string, token: string, bytes: Buffer, sha256: string): Promise<boolean>;
  fail(artifactId: string, token: string, code: string): Promise<void>;
};

function storageBucket() {
  const value = process.env.RECEIPT_PDF_STORAGE_BUCKET?.trim();
  if (!value) throw new Error("receipt_storage_not_configured");
  return value;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_${field}`);
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`invalid_${field}`);
  return value;
}

function integer(value: unknown, field: string) {
  if (!Number.isSafeInteger(value)) throw new Error(`invalid_${field}`);
  return value as number;
}

export function mapReceiptRowToDocumentSnapshot(row: Record<string, unknown>): ReceiptDocumentSnapshot {
  const seller = asObject(row.seller_snapshot, "seller_snapshot");
  const customer = asObject(row.customer_snapshot, "customer_snapshot");
  const payment = asObject(row.payment_snapshot, "payment_snapshot");
  const lines = row.line_items_snapshot;
  const series = asObject(row.receipt_series, "receipt_series");
  if (!Array.isArray(lines) || !lines.length) throw new Error("invalid_line_items_snapshot");
  return {
    receiptId: text(row.id, "receipt_id"),
    displayNumber: `${text(series.series_code, "series_code")}-${integer(row.receipt_number, "receipt_number").toString().padStart(6, "0")}`,
    issuedAt: text(row.issued_at, "issued_at"),
    seller: {
      profileVersion: integer(seller.profileVersion, "seller_profile_version"),
      legalName: text(seller.legalName, "seller_legal_name"), ownerName: text(seller.ownerName, "seller_owner_name"),
      businessStatus: text(seller.businessStatus, "seller_business_status"), businessNumber: text(seller.businessNumber, "seller_business_number"),
      address: text(seller.address, "seller_address"), contactEmail: text(seller.contactEmail, "seller_contact_email"),
      accountantApprovedFooter: seller.accountantApprovedFooter == null ? null : text(seller.accountantApprovedFooter, "seller_footer"),
    },
    customer: { name: text(customer.name, "customer_name"), email: text(customer.email, "customer_email") },
    lineItems: lines.map((candidate, index) => {
      const item = asObject(candidate, `line_${index}`);
      return {
        productId: text(item.productId, "product_id"), title: text(item.title, "product_title"),
        description: text(item.description, "product_description"), quantity: integer(item.quantity, "quantity"),
        unitPriceMinor: integer(item.unitPriceMinor, "unit_price_minor"), currency: text(item.currency, "line_currency"),
        priceSource: text(item.priceSource, "price_source"), offerCode: item.offerCode == null ? null : text(item.offerCode, "offer_code"),
      };
    }),
    payment: {
      method: text(payment.method, "payment_method"), providerOrderId: text(payment.providerOrderId, "provider_order_id"),
      providerCaptureId: text(payment.providerCaptureId, "provider_capture_id"), paidAt: text(payment.paidAt, "paid_at"),
      environment: text(payment.environment, "payment_environment") as "live",
      amountMinor: integer(payment.amountMinor, "payment_amount"), currency: text(payment.currency, "payment_currency"),
    },
    totalMinor: integer(row.total_minor, "total_minor"), currency: text(row.currency, "currency"),
    documentVersion: integer(row.document_version, "document_version"),
  };
}

function productionDependencies(): ArtifactDependencies {
  const supabase = createServerSupabaseClient({ serviceRole: true });
  return {
    async claim(receiptId, documentCopy) {
      const { data, error } = await supabase.rpc("claim_receipt_pdf_artifact", {
        target_receipt_id: receiptId, target_document_copy: documentCopy,
        target_storage_bucket: storageBucket(), target_template_version: RECEIPT_TEMPLATE_VERSION,
        target_lease_seconds: RECEIPT_ARTIFACT_LEASE_SECONDS,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("empty_artifact_claim");
      return row as ReceiptArtifactClaimRow;
    },
    async loadSnapshot(receiptId) {
      const { data, error } = await supabase.from("receipts").select("id,receipt_number,issued_at,seller_snapshot,customer_snapshot,line_items_snapshot,payment_snapshot,total_minor,currency,document_version,receipt_series!inner(series_code)").eq("id", receiptId).single();
      if (error || !data) throw error ?? new Error("receipt_not_found");
      return mapReceiptRowToDocumentSnapshot(data as unknown as Record<string, unknown>);
    },
    render: (snapshot, documentCopy) => renderReceiptPdf({ snapshot, documentCopy }),
    async upload(bucket, key, bytes) {
      const { error } = await supabase.storage.from(bucket).upload(key, bytes, { contentType: "application/pdf", upsert: false });
      if (!error) return "uploaded";
      if (/already exists|duplicate/i.test(error.message)) return "exists";
      throw error;
    },
    async downloadIfExists(bucket, key) {
      const { data, error } = await supabase.storage.from(bucket).download(key);
      if (error && /not found|does not exist/i.test(error.message)) return null;
      if (error || !data) throw error ?? new Error("artifact_download_failed");
      return Buffer.from(await data.arrayBuffer());
    },
    async stage(artifactId, token, bytes, sha256) {
      const { data, error } = await supabase.rpc("stage_receipt_pdf_artifact", {
        target_artifact_id: artifactId, target_claim_token: token,
        target_byte_size: bytes.byteLength, target_sha256: sha256,
      });
      if (error) throw error;
      return data === "staged";
    },
    async complete(artifactId, token, bytes, sha256) {
      const { data, error } = await supabase.rpc("complete_receipt_pdf_artifact", {
        target_artifact_id: artifactId, target_claim_token: token, target_content_type: "application/pdf",
        target_byte_size: bytes.byteLength, target_sha256: sha256,
      });
      if (error) throw error;
      return data === "ready";
    },
    async fail(artifactId, token, code) {
      await supabase.rpc("fail_receipt_pdf_artifact", { target_artifact_id: artifactId, target_claim_token: token, target_failure_code: code });
    },
  };
}

function safeCode(error: unknown) {
  return error instanceof Error && /^[a-z0-9_]{1,120}$/u.test(error.message) ? error.message : "artifact_generation_failed";
}

async function reportArtifactFailure(receiptId: string, documentCopy: ReceiptDocumentCopy, code: string, source: string) {
  console.error(JSON.stringify({ level: "error", message: "Receipt artifact generation failed", receiptId, documentCopy, stage: "receipt_pdf_artifact", source, code }));
  try {
    await captureAndAlertServerError(new Error(`Receipt artifact failed code=${code} receipt=${receiptId} copy=${documentCopy}`), {
      route: source === "recovery" ? "/api/cron/recover-receipt-artifacts" : "post_payment_receipt_artifacts",
      method: source === "recovery" ? "GET" : "POST", runtime: "server", statusCode: 503,
    });
  } catch { /* observability is non-fatal */ }
}

export async function ensureReceiptArtifacts(
  receiptId: string,
  options: { source?: string; dependencies?: ArtifactDependencies } = {},
): Promise<ReceiptArtifactsResult> {
  const dependencies = options.dependencies ?? productionDependencies();
  const results: ReceiptArtifactCopyResult[] = [];
  let snapshot: ReceiptDocumentSnapshot | undefined;
  for (const documentCopy of RECEIPT_ARTIFACT_COPIES) {
    let claim: ReceiptArtifactClaimRow;
    try {
      claim = await dependencies.claim(receiptId, documentCopy);
    } catch {
      await reportArtifactFailure(receiptId, documentCopy, "artifact_claim_failed", options.source ?? "issuance");
      results.push({ documentCopy, status: "failed", code: "artifact_claim_failed" });
      continue;
    }
    if (claim.result === "ready") {
      results.push({ documentCopy, status: "ready", artifactId: claim.artifact_id ?? undefined });
      continue;
    }
    if (claim.result === "processing") {
      results.push({ documentCopy, status: "processing", artifactId: claim.artifact_id ?? undefined });
      continue;
    }
    if (claim.result !== "claimed" || !claim.artifact_id || !claim.claim_token || !claim.storage_bucket || !claim.storage_key) {
      const code = claim.result || "invalid_claim";
      await reportArtifactFailure(receiptId, documentCopy, code, options.source ?? "issuance");
      results.push({ documentCopy, status: "failed", code });
      continue;
    }
    try {
      if (claim.existing_sha256 && claim.existing_byte_size) {
        const existing = await dependencies.downloadIfExists(claim.storage_bucket, claim.storage_key);
        if (existing) {
          const existingHash = createHash("sha256").update(existing).digest("hex");
          if (existingHash !== claim.existing_sha256 || existing.byteLength !== claim.existing_byte_size) {
            throw new Error("artifact_object_conflict");
          }
          if (!await dependencies.complete(claim.artifact_id, claim.claim_token, existing, existingHash)) throw new Error("artifact_fence_lost");
          results.push({ documentCopy, status: "generated", artifactId: claim.artifact_id });
          continue;
        }
      }
      snapshot ??= await dependencies.loadSnapshot(receiptId);
      const bytes = await dependencies.render(snapshot, documentCopy);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (!await dependencies.stage(claim.artifact_id, claim.claim_token, bytes, sha256)) throw new Error("artifact_fence_lost");
      const upload = await dependencies.upload(claim.storage_bucket, claim.storage_key, bytes);
      if (upload === "exists") {
        const existing = await dependencies.downloadIfExists(claim.storage_bucket, claim.storage_key);
        if (!existing) throw new Error("artifact_object_missing");
        const existingHash = createHash("sha256").update(existing).digest("hex");
        if (existingHash !== sha256 || existing.byteLength !== bytes.byteLength) throw new Error("artifact_object_conflict");
      }
      if (!await dependencies.complete(claim.artifact_id, claim.claim_token, bytes, sha256)) throw new Error("artifact_fence_lost");
      results.push({ documentCopy, status: "generated", artifactId: claim.artifact_id });
    } catch (error) {
      const code = safeCode(error);
      try { await dependencies.fail(claim.artifact_id, claim.claim_token, code); } catch { /* recovery can reclaim after lease */ }
      await reportArtifactFailure(receiptId, documentCopy, code, options.source ?? "issuance");
      results.push({ documentCopy, status: "failed", artifactId: claim.artifact_id, code });
    }
  }
  return { receiptId, complete: results.every((result) => result.status === "generated" || result.status === "ready"), copies: results };
}

export type { ArtifactDependencies };
