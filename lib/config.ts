const DEFAULT_SITE_URL = "https://www.laplapla.com";

export function normalizeSiteUrl(value?: string) {
  const fallback = DEFAULT_SITE_URL;
  const rawValue = (value || fallback).trim().replace(/\/+$/, "") || fallback;

  try {
    const url = new URL(rawValue);

    if (url.hostname === "laplapla.com") {
      url.hostname = "www.laplapla.com";
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

export const BASE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
