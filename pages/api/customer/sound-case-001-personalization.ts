import type { NextApiRequest, NextApiResponse } from "next";
import { getProductById } from "@/lib/shop/catalog";
import { resolveCustomerAccess } from "@/lib/server/auth/customerAccess";
import { parseSoundCasePersonalizationPayload } from "@/lib/server/questPersonalizationPayload";
import {
  getActiveCustomerProductEntitlement,
  loadQuestPersonalization,
  saveQuestPersonalization,
} from "@/lib/server/questPersonalizations";

const PRODUCT_ID = "sound-case-001";

function getRequestPersonalization(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !("personalization" in record)) return undefined;
  return record.personalization;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const access = await resolveCustomerAccess(req);
  if (!access.isAuthenticated) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (!getProductById(PRODUCT_ID)) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  try {
    const entitlement = await getActiveCustomerProductEntitlement(
      access.accessToken,
      access.user.id,
      PRODUCT_ID,
    );
    if (!entitlement) {
      res.status(403).json({ error: "Active entitlement required" });
      return;
    }

    if (req.method === "GET") {
      const saved = await loadQuestPersonalization(access.accessToken, entitlement);
      if (!saved) {
        res.status(200).json({ personalization: null, updatedAt: null });
        return;
      }
      const parsed = parseSoundCasePersonalizationPayload(saved.personalization);
      if (!parsed.ok) throw new Error("Stored personalization is invalid");
      res.status(200).json({ personalization: parsed.value, updatedAt: saved.updatedAt });
      return;
    }

    const parsed = parseSoundCasePersonalizationPayload(getRequestPersonalization(req.body));
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const saved = await saveQuestPersonalization(entitlement, parsed.value);
    res.status(200).json(saved);
  } catch (error) {
    console.error("[sound-case-personalization] request failed", error);
    res.status(500).json({ error: "Unable to process personalization" });
  }
}
