import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  `${process.cwd()}/supabase/migrations/202610070002_create_receipt_ledger_foundation.sql`,
  "utf8",
);

describe("receipt ledger migration", () => {
  it("uses a locked counter row and allocates only after validation", () => {
    const functionStart = migration.indexOf("create function public.issue_receipt_for_paid_order");
    const issuance = migration.slice(functionStart);
    expect(issuance).toContain("for update;");
    expect(issuance).not.toMatch(/max\s*\(\s*receipt_number\s*\)/iu);
    expect(issuance.indexOf("if found then")).toBeLessThan(issuance.indexOf("select * into series_row"));
    expect(issuance.indexOf("insert into public.receipts")).toBeLessThan(
      issuance.indexOf("update public.receipt_series set next_number = next_number + 1"),
    );
  });

  it("keeps issuance service-role-only with a fixed search path", () => {
    expect(migration).toContain("security definer\nset search_path = public, pg_temp");
    expect(migration).toContain(
      "revoke all on function public.issue_receipt_for_paid_order(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.issue_receipt_for_paid_order(uuid) to service_role",
    );
  });

  it("contains no PDF, email, storage, Takbull, or automatic finalizer integration", () => {
    expect(migration).not.toMatch(/takbull|pdf|storage|email_delivery|smtp|sendgrid|resend/iu);
    const existingFinalizer = readFileSync(
      `${process.cwd()}/supabase/migrations/202610010001_create_commerce_order_foundation.sql`,
      "utf8",
    );
    expect(existingFinalizer).not.toContain("issue_receipt_for_paid_order");
  });

  it("uses the approved seller spelling and does not invent legal footer text", () => {
    expect(migration).toContain("אומנצ׳קים");
    expect(migration).not.toContain("אומנצ״קים");
    expect(migration).not.toContain("סעיף 31(3)");
    expect(migration).toContain("accountant_approved_footer");
  });
});
