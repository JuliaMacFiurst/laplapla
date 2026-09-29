import { createClient } from "@supabase/supabase-js";

const getServerSupabaseUrl = () =>
  process.env["SUPABASE_URL"] || "";

const getServerAnonKey = () =>
  process.env["SUPABASE_ANON_KEY"] || "";

const getServerServiceRoleKey = () =>
  process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

export function createServerSupabaseClient(options?: {
  serviceRole?: boolean;
  accessToken?: string;
}) {
  const supabaseUrl = getServerSupabaseUrl();
  const key = options?.serviceRole ? getServerServiceRoleKey() : getServerAnonKey();

  if (!supabaseUrl || !key) {
    throw new Error("Supabase server env is not configured");
  }

  if (options?.serviceRole && options.accessToken) {
    throw new Error("A user access token cannot be combined with the service role");
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(options?.accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${options.accessToken}`,
            },
          },
        }
      : {}),
  });
}
