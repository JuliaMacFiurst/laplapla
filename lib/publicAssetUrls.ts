const SUPABASE_PUBLIC_ORIGIN = "https://wazoncnmsxbjzvbjenpw.supabase.co";

const normalizeStoragePath = (value: string) =>
  value
    .replace(/^\/+/, "")
    .replace(/^public\//, "");

export function buildSupabasePublicUrl(bucket: string, path: string) {
  return `${SUPABASE_PUBLIC_ORIGIN}/storage/v1/object/public/${bucket}/${normalizeStoragePath(path)}`;
}

export function buildSupabaseSignedUrl(path: string) {
  return `${SUPABASE_PUBLIC_ORIGIN}/storage/v1/object/sign/${normalizeStoragePath(path)}`;
}

export { SUPABASE_PUBLIC_ORIGIN };
