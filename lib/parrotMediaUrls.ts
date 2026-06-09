const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, "");

const normalizeObjectPath = (value: string) =>
  value
    .trim()
    .replace(/[?#].*$/, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

function getR2MediaOrigin() {
  const publicUrl = process.env.NEXT_PUBLIC_R2_MEDIA_URL;
  if (typeof publicUrl === "string" && publicUrl.trim()) {
    return normalizeOrigin(publicUrl);
  }

  const serverUrl = process.env.R2_PUBLIC_URL;
  if (typeof serverUrl === "string" && serverUrl.trim()) {
    return normalizeOrigin(serverUrl);
  }

  return "";
}

function buildParrotR2Url(bucket: "parrot-audio" | "parrot-style-media", path: string) {
  const objectPath = normalizeObjectPath(path);
  if (!objectPath) {
    return "";
  }

  const origin = getR2MediaOrigin();
  return origin ? `${origin}/${bucket}/${objectPath}` : "";
}

export function getParrotAudioUrl(path: string): string {
  return buildParrotR2Url("parrot-audio", path);
}

export function getParrotStyleMediaUrl(path: string): string {
  return buildParrotR2Url("parrot-style-media", path);
}
