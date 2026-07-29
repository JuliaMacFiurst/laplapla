export type SlidesLoadStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error";

interface ResolveSlidesLoadStatusOptions {
  hasBook: boolean;
  loading: boolean;
  error: string | null;
  slideCount: number;
}

export function resolveSlidesLoadStatus({
  hasBook,
  loading,
  error,
  slideCount,
}: ResolveSlidesLoadStatusOptions): SlidesLoadStatus {
  if (loading) {
    return "loading";
  }

  if (error) {
    return "error";
  }

  if (!hasBook) {
    return "idle";
  }

  return slideCount > 0 ? "success" : "empty";
}
