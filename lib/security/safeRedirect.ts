const CONTROL_OR_BACKSLASH_PATTERN = /[\u0000-\u001f\u007f\\]/;

export function getSafeRelativeRedirect(
  value: unknown,
  fallback = "/",
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  let candidate = value.trim();
  if (!candidate) {
    return fallback;
  }

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    CONTROL_OR_BACKSLASH_PATTERN.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://www.laplapla.com");
    if (parsed.origin !== "https://www.laplapla.com") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
