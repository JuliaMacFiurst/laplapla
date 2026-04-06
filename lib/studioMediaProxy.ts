const STUDIO_PROXY_HOSTS = new Set([
  "images.pexels.com",
  "images.pexels.com",
  "player.vimeo.com",
  "media.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
  "i.giphy.com",
]);

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

    return `/api/media-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
