import type { NextApiRequest, NextApiResponse } from "next";
import { enforceSameOrigin } from "@/lib/server/security/requestOrigin";
import {
  isValidPreorderEmail,
  registerSoundCasePreorder,
} from "@/lib/server/productPreorders";
import {
  MAX_PREORDER_EMAIL_LENGTH,
  isPreorderLocale,
  type PreorderSignupResponse,
} from "@/lib/shop/preorders";
import { withApiHandler } from "@/utils/apiHandler";

const MAX_BODY_BYTES = 4 * 1024;
const EXPECTED_BODY_KEYS = ["consent", "email", "locale"];

function hasAllowedBodyShape(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => EXPECTED_BODY_KEYS.includes(key));
}

export async function preorderSignupHandler(
  req: NextApiRequest,
  res: NextApiResponse<PreorderSignupResponse>,
) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");

  if (!enforceSameOrigin(req, res)) return;
  if (!hasAllowedBodyShape(req.body)) {
    res.status(400).json({ ok: false, code: "invalid_request" });
    return;
  }

  const { consent, email, locale } = req.body;
  if (consent !== true) {
    res.status(400).json({ ok: false, code: "consent_required" });
    return;
  }
  if (typeof email !== "string" || email.length > MAX_PREORDER_EMAIL_LENGTH || !isValidPreorderEmail(email)) {
    res.status(400).json({ ok: false, code: "invalid_email" });
    return;
  }
  if (!isPreorderLocale(locale)) {
    res.status(400).json({ ok: false, code: "unsupported_locale" });
    return;
  }

  try {
    const result = await registerSoundCasePreorder({ email, locale });
    if (result.status === "closed") {
      res.status(409).json({ ok: false, code: "preorder_closed" });
      return;
    }

    // New and duplicate registrations intentionally have the same public result.
    res.status(200).json({ ok: true, status: "registered" });
  } catch {
    res.status(503).json({ ok: false, code: "unavailable" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4kb",
    },
  },
};

export default withApiHandler<PreorderSignupResponse>(
  {
    guard: {
      methods: ["POST"],
      limit: 10,
      windowMs: 60_000,
      maxBodyBytes: MAX_BODY_BYTES,
      keyPrefix: "shop-preorder",
    },
  },
  preorderSignupHandler,
);
