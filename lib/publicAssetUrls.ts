const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, "");

const resolveSupabasePublicOrigin = () => {
  const publicUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  if (typeof publicUrl === "string" && publicUrl.trim()) {
    return normalizeOrigin(publicUrl);
  }

  const serverUrl = process.env["SUPABASE_URL"];
  if (typeof serverUrl === "string" && serverUrl.trim()) {
    return normalizeOrigin(serverUrl);
  }

  throw new Error("Supabase URL is not configured");
};

const SUPABASE_PUBLIC_ORIGIN = resolveSupabasePublicOrigin();

const normalizeStoragePath = (value: string) =>
  value
    .replace(/^\/+/, "")
    .replace(/^public\//, "");

const SUPABASE_STORAGE_PROXY_PREFIX = "/supabase-storage";

export function buildSupabaseStorageUrl(path: string) {
  return `${SUPABASE_STORAGE_PROXY_PREFIX}/${normalizeStoragePath(path)}`;
}

export function buildSupabasePublicUrl(bucket: string, path: string) {
  return buildSupabaseStorageUrl(`${bucket}/${path}`);
}

export function buildSupabaseSignedUrl(path: string) {
  return `${SUPABASE_PUBLIC_ORIGIN}/storage/v1/object/sign/${normalizeStoragePath(path)}`;
}

export { SUPABASE_PUBLIC_ORIGIN };
