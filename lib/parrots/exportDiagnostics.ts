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

export type ParrotFetchProbeAttempt = {
  method: "HEAD" | "GET";
  succeeded: boolean;
  status: number | null;
  statusText: string | null;
  responseType: string | null;
  responseUrl: string | null;
  redirected: boolean | null;
  errorName: string | null;
  errorMessage: string | null;
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

export async function probeParrotAudioFetch(
  assetUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ParrotFetchProbeAttempt[]> {
  const runAttempt = async (method: "HEAD" | "GET"): Promise<ParrotFetchProbeAttempt> => {
    try {
      const response = await fetchImpl(assetUrl, { method, cache: "no-store" });
      if (method === "GET") {
        try {
          await response.body?.cancel();
        } catch {
          // The response metadata is still useful when body cancellation is unsupported.
        }
      }
      return {
        method,
        succeeded: true,
        status: response.status,
        statusText: response.statusText,
        responseType: response.type,
        responseUrl: response.url,
        redirected: response.redirected,
        errorName: null,
        errorMessage: null,
      };
    } catch (error) {
      const details = getErrorDetails(error);
      return {
        method,
        succeeded: false,
        status: null,
        statusText: null,
        responseType: null,
        responseUrl: null,
        redirected: null,
        errorName: details.errorName,
        errorMessage: details.errorMessage,
      };
    }
  };

  return [await runAttempt("HEAD"), await runAttempt("GET")];
}
