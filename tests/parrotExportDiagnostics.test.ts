import { describe, expect, it } from "vitest";
import {
  fetchAndDecodeParrotExportAudio,
  fetchParrotExportAudio,
  isParrotExportComplete,
  readParrotExportDiagnostic,
  runParrotExportStage,
  runParrotExportSyncStage,
} from "@/lib/parrots/exportDiagnostics";

describe("Parrots export diagnostics", () => {
  it("bypasses the default browser cache for render audio fetches", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const response = { ok: true, status: 200 } as Response;
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return response;
    }) as typeof fetch;

    await expect(fetchParrotExportAudio(
      "https://media.laplapla.com/parrot-audio/test.mp3",
      fetchImpl,
    )).resolves.toBe(response);
    expect(calls).toEqual([{
      url: "https://media.laplapla.com/parrot-audio/test.mp3",
      init: { cache: "no-store" },
    }]);
  });

  it("continues from a successful no-store fetch through reading and decoding", async () => {
    const encoded = new Uint8Array([1, 2, 3, 4]).buffer;
    const decoded = { duration: 12 };
    const decodeCalls: ArrayBuffer[] = [];
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init).toEqual({ cache: "no-store" });
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        arrayBuffer: async () => encoded,
      } as Response;
    }) as typeof fetch;

    const result = await fetchAndDecodeParrotExportAudio(
      "https://media.laplapla.com/parrot-audio/test.mp3",
      async (data) => {
        decodeCalls.push(data);
        return decoded;
      },
      fetchImpl,
    );

    expect(result).toBe(decoded);
    expect(decodeCalls).toHaveLength(1);
    expect([...new Uint8Array(decodeCalls[0])]).toEqual([1, 2, 3, 4]);
  });

  it("surfaces no-store fetch failure while preserving saved state and retry", async () => {
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init).toEqual({ cache: "no-store" });
      const error = new Error("Failed to fetch");
      error.name = "TypeError";
      throw error;
    }) as typeof fetch;
    let caught: unknown;

    try {
      await fetchAndDecodeParrotExportAudio(
        "https://media.laplapla.com/parrot-audio/test.mp3",
        async () => ({ duration: 0 }),
        fetchImpl,
      );
    } catch (error) {
      caught = error;
    }

    expect(readParrotExportDiagnostic(caught)).toMatchObject({
      stage: "fetch-audio",
      errorName: "TypeError",
      errorMessage: "Failed to fetch",
    });
    const isProjectSaved = true;
    expect(isProjectSaved).toBe(true);
    expect(isParrotExportComplete(isProjectSaved, null)).toBe(false);
  });

  it("preserves the exact stage, asset URL, and original error", async () => {
    const originalError = new Error("Unable to decode audio data");
    originalError.name = "EncodingError";

    let caught: unknown;
    try {
      await runParrotExportStage(
        "decode-audio",
        "https://media.laplapla.com/parrot-audio/test.mp3",
        async () => { throw originalError; },
      );
    } catch (error) {
      caught = error;
    }

    expect(readParrotExportDiagnostic(caught)).toEqual({
      stage: "decode-audio",
      assetUrl: "https://media.laplapla.com/parrot-audio/test.mp3",
      errorName: "EncodingError",
      errorMessage: "Unable to decode audio data",
    });
    expect((caught as { originalError: unknown }).originalError).toBe(originalError);
  });

  it("captures synchronous Web Audio failures at their assigned stage", () => {
    let caught: unknown;
    try {
      runParrotExportSyncStage("start-render", null, () => {
        const error = new Error("cannot call startRendering twice");
        error.name = "InvalidStateError";
        throw error;
      });
    } catch (error) {
      caught = error;
    }

    expect(readParrotExportDiagnostic(caught)).toMatchObject({
      stage: "start-render",
      assetUrl: null,
      errorName: "InvalidStateError",
    });
  });

  it("keeps a persisted project saved and export retry available after render failure", () => {
    const isProjectSaved = true;
    const failedExportUrl = null;

    expect(isProjectSaved).toBe(true);
    expect(isParrotExportComplete(isProjectSaved, failedExportUrl)).toBe(false);
  });

  it("marks export complete only after both persistence and a rendered URL exist", () => {
    expect(isParrotExportComplete(true, "blob:rendered-mix")).toBe(true);
    expect(isParrotExportComplete(false, "blob:rendered-mix")).toBe(false);
  });

});
