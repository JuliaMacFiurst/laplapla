import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), ensure: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/supabase", () => ({ createServerSupabaseClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/server/commerce/receipts/artifacts", () => ({ ensureReceiptArtifacts: mocks.ensure }));

import { findReceiptArtifactRecoveryCandidateIds, recoverReceiptArtifacts } from "@/lib/server/commerce/receipts/artifactRecovery";

describe("receipt artifact recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the service-only bounded candidate RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ receipt_id: "a" }], error: null });
    await expect(findReceiptArtifactRecoveryCandidateIds(999)).resolves.toEqual(["a"]);
    expect(mocks.rpc).toHaveBeenCalledWith("list_receipt_artifact_recovery_candidates", { target_limit: 25 });
  });

  it("continues after one incomplete receipt", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ receipt_id: "a" }, { receipt_id: "b" }], error: null });
    mocks.ensure.mockResolvedValueOnce({ complete: false }).mockResolvedValueOnce({ complete: true });
    await expect(recoverReceiptArtifacts()).resolves.toEqual({ scanned: 2, complete: 1, incomplete: 1, failedReceiptIds: ["a"] });
    expect(mocks.ensure).toHaveBeenCalledTimes(2);
  });
});
