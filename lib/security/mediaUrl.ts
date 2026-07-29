const TRUSTED_MEDIA_HOSTS = new Set([
  "images.pexels.com",
  "videos.pexels.com",
  "media.giphy.com",
  "i.giphy.com",
  "media0.giphy.com",
  "media1.giphy.com",
  "media2.giphy.com",
  "media3.giphy.com",
  "media4.giphy.com",
  "cdn.pixabay.com",
  "pixabay.com",
  "upload.wikimedia.org",
  "media.laplapla.com",
  "i.vimeocdn.com",
  "preview.redd.it",
  "i.redd.it",
  "v.redd.it",
  "i.imgflip.com",
]);

export function isTrustedMediaUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const candidate = value.trim();
  if (
    candidate.startsWith("/supabase-storage/") &&
    !candidate.includes("..") &&
    !candidate.includes("\\")
  ) {
    return true;
  }

  try {
    const url = new URL(candidate);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      TRUSTED_MEDIA_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
