export type ParrotExportStage =
  | "fetch-audio"
  | "read-array-buffer"
  | "decode-audio"
  | "create-offline-context"
  | "prepare-sources"
  | "start-render"
  | "complete-render"
  | "encode-audio"
  | "create-object-url"
  | "finalize-export";

export type ParrotExportDiagnostic = {
  stage: ParrotExportStage;
  assetUrl: string | null;
  errorName: string;
  errorMessage: string;
};

export class ParrotExportStageError extends Error {
  readonly diagnostic: ParrotExportDiagnostic;
  readonly originalError: unknown;

  constructor(diagnostic: ParrotExportDiagnostic, cause: unknown) {
    super(`${diagnostic.stage}: ${diagnostic.errorName}: ${diagnostic.errorMessage}`);
    this.name = "ParrotExportStageError";
    this.diagnostic = diagnostic;
    this.originalError = cause;
  }
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      errorMessage: error.message || String(error),
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: typeof error === "string" ? error : String(error),
  };
}

function wrapStageError(stage: ParrotExportStage, assetUrl: string | null, error: unknown): never {
  if (error instanceof ParrotExportStageError) throw error;
  throw new ParrotExportStageError({ stage, assetUrl, ...getErrorDetails(error) }, error);
}

export async function runParrotExportStage<T>(
  stage: ParrotExportStage,
  assetUrl: string | null,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    return wrapStageError(stage, assetUrl, error);
  }
}

export function runParrotExportSyncStage<T>(
  stage: ParrotExportStage,
  assetUrl: string | null,
  operation: () => T,
): T {
  try {
    return operation();
  } catch (error) {
    return wrapStageError(stage, assetUrl, error);
  }
}

export function readParrotExportDiagnostic(error: unknown): ParrotExportDiagnostic | null {
  return error instanceof ParrotExportStageError ? error.diagnostic : null;
}

export function isParrotExportComplete(isProjectSaved: boolean, exportUrl: string | null) {
  return isProjectSaved && Boolean(exportUrl);
}

export function fetchParrotExportAudio(assetUrl: string, fetchImpl: typeof fetch = fetch) {
  return fetchImpl(assetUrl, { cache: "no-store" });
}

export async function fetchAndDecodeParrotExportAudio<T>(
  assetUrl: string,
  decodeAudioData: (data: ArrayBuffer) => Promise<T>,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const response = await runParrotExportStage("fetch-audio", assetUrl, async () => {
    const result = await fetchParrotExportAudio(assetUrl, fetchImpl);
    if (!result.ok) throw new Error(`HTTP ${result.status} ${result.statusText}`.trim());
    return result;
  });
  const arrayBuffer = await runParrotExportStage(
    "read-array-buffer",
    assetUrl,
    () => response.arrayBuffer(),
  );
  return runParrotExportStage(
    "decode-audio",
    assetUrl,
    () => decodeAudioData(arrayBuffer.slice(0)),
  );
}
