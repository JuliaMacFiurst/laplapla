import type { User } from "@supabase/supabase-js";
import type { NextApiRequest } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";

export type CustomerAccess =
  | { isAuthenticated: false; accessToken: null; user: null }
  | { isAuthenticated: true; accessToken: string; user: User };

export function extractCustomerBearerToken(req: Pick<NextApiRequest, "headers">) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}
export async function resolveCustomerAccess(req: NextApiRequest): Promise<CustomerAccess> {
  const accessToken = extractCustomerBearerToken(req);
  if (!accessToken) {
    return { isAuthenticated: false, accessToken: null, user: null };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return { isAuthenticated: false, accessToken: null, user: null };
    }

    return {
      isAuthenticated: true,
      accessToken,
      user: data.user,
    };
  } catch {
    return { isAuthenticated: false, accessToken: null, user: null };
  }
}
