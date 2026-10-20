import type { NextApiRequest, NextApiResponse } from "next";
import type { CustomerBillingIdentityResponse } from "@/lib/customer/billingIdentity";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import {
  BillingIdentityError,
  getTrustedBillingIdentity,
  saveTrustedBillingIdentity,
} from "@/lib/server/customerBillingIdentity";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import { withApiHandler } from "@/utils/apiHandler";

type ErrorResponse = { error: "authentication_required" | "invalid_request" | "verified_email_required" | "unavailable" };

export async function customerBillingIdentityHandler(
  req: NextApiRequest,
  res: NextApiResponse<CustomerBillingIdentityResponse | ErrorResponse>,
) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method === "PUT" && !enforceSameOrigin(req, res)) return;
  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ error: "authentication_required" });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json(await getTrustedBillingIdentity(access.user));
      return;
    }
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)
      || Object.keys(body).length !== 1 || !("billingName" in body)) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    res.status(200).json(await saveTrustedBillingIdentity(access.user, (body as { billingName: unknown }).billingName));
  } catch (error) {
    if (error instanceof BillingIdentityError) {
      res.status(400).json({ error: error.code === "verified_email_required" ? error.code : "invalid_request" });
      return;
    }
    res.status(503).json({ error: "unavailable" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "2kb" } } };

export default withApiHandler(
  { guard: { methods: ["GET", "PUT"], limit: 30, windowMs: 60_000, maxBodyBytes: 2 * 1024, keyPrefix: "billing-identity" } },
  customerBillingIdentityHandler,
);
