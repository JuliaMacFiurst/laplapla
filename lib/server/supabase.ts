import { createClient } from "@supabase/supabase-js";

const getServerSupabaseUrl = () =>
  process.env["SUPABASE_URL"] || "";

const getServerAnonKey = () =>
  process.env["SUPABASE_ANON_KEY"] || "";

const getServerServiceRoleKey = () =>
  process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

export function createServerSupabaseClient(options?: { serviceRole?: boolean }) {
  const supabaseUrl = getServerSupabaseUrl();
  const key = options?.serviceRole ? getServerServiceRoleKey() : getServerAnonKey();

  if (!supabaseUrl || !key) {
    throw new Error("Supabase server env is not configured");
  }

  return createClient(supabaseUrl, key);
}
