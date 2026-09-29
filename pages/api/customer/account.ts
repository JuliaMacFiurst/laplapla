import type { NextApiRequest, NextApiResponse } from "next";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { getCustomerAccountData } from "@/lib/server/customerEntitlements";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const account = await getCustomerAccountData(access.accessToken, access.user.id);
    res.status(200).json(account);
  } catch (error) {
    console.error("[customer-account] failed to load account", error);
    res.status(500).json({ error: "Unable to load account" });
  }
}
