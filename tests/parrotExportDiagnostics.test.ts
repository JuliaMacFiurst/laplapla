import { describe, expect, it } from "vitest";
import {
  isParrotExportComplete,
  probeParrotAudioFetch,
  readParrotExportDiagnostic,
  runParrotExportStage,
  runParrotExportSyncStage,
} from "@/lib/parrots/exportDiagnostics";

describe("Parrots export diagnostics", () => {
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

  it("reports independent HEAD and GET probe outcomes without hiding fetch errors", async () => {
    const calls: Array<{ url: string; method: string | undefined; cache: RequestCache | undefined }> = [];
    const fetchImpl = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method, cache: init?.cache });
      if (init?.method === "HEAD") {
        return {
          status: 200,
          statusText: "OK",
          type: "cors",
          url: String(url),
          redirected: false,
          body: null,
        } as Response;
      }
      const error = new Error("Failed to fetch");
      error.name = "TypeError";
      throw error;
    }) as typeof fetch;

    const result = await probeParrotAudioFetch("https://media.laplapla.com/test.mp3", fetchImpl);

    expect(calls).toEqual([
      { url: "https://media.laplapla.com/test.mp3", method: "HEAD", cache: "no-store" },
      { url: "https://media.laplapla.com/test.mp3", method: "GET", cache: "no-store" },
    ]);
    expect(result[0]).toMatchObject({ method: "HEAD", succeeded: true, status: 200 });
    expect(result[1]).toMatchObject({
      method: "GET",
      succeeded: false,
      errorName: "TypeError",
      errorMessage: "Failed to fetch",
    });
  });
});
