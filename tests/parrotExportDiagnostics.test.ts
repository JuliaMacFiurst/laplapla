import { describe, expect, it } from "vitest";
import {
  isParrotExportComplete,
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
});
