const STUDIO_PROXY_HOSTS = new Set([
  "images.pexels.com",
  "videos.pexels.com",
  "player.vimeo.com",
]);
const MAX_PROXY_URL_LENGTH = 1200;

function isRelativeUrl(url: string) {
  return url.startsWith("/") || url.startsWith("./") || url.startsWith("../");
}

export function toStudioMediaUrl(url?: string | null) {
  if (!url) return undefined;
  if (isRelativeUrl(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return url;
    }

    if (!STUDIO_PROXY_HOSTS.has(parsed.hostname)) {
      return url;
    }

    // Long signed CDN URLs can exceed GET URI limits once encoded in `?url=...`.
    // In that case, prefer direct loading over a guaranteed 414 from the proxy route.
    if (url.length > MAX_PROXY_URL_LENGTH) {
      return url;
    }

    return `/api/media-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
