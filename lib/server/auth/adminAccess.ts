import type { NextApiRequest } from "next";
import { createServerSupabaseClient } from "@/lib/server/supabase";

type AdminAccessResult = {
  isAdmin: boolean;
  userEmail: string | null;
};

const warnedInvalidTokens = new Set<string>();

function normalizeEmail(value: string | null | undefined) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : null;
}

function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return [] as Array<{ name: string; value: string }>;
  }

  return cookieHeader
    .split(";")
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        name: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((cookie): cookie is { name: string; value: string } => Boolean(cookie));
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized.padEnd(normalized.length + paddingLength, "="), "base64").toString("utf8");
}

function extractAccessTokenFromCookieValue(cookieValue: string): string | null {
  const decodedValue = decodeURIComponent(cookieValue);
  const candidates = [
    decodedValue,
    decodedValue.startsWith("base64-") ? decodeBase64Url(decodedValue.slice("base64-".length)) : null,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (candidate.split(".").length === 3) {
      return candidate;
    }

    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].split(".").length === 3) {
        return parsed[0];
      }

      if (parsed && typeof parsed === "object") {
        const accessToken = (parsed as { access_token?: unknown }).access_token;
        if (typeof accessToken === "string" && accessToken.split(".").length === 3) {
          return accessToken;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractBearerToken(req: NextApiRequest) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    const bearerToken = authorization.slice("Bearer ".length).trim();
    if (bearerToken) {
      return bearerToken;
    }
  }

  return null;
}

function extractCookieAccessToken(req: NextApiRequest) {
  const matchingCookies = parseCookieHeader(req.headers.cookie)
    .filter((cookie) => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (matchingCookies.length === 0) {
    return null;
  }

  const combinedValue = matchingCookies.map((cookie) => cookie.value).join("");
  return extractAccessTokenFromCookieValue(combinedValue);
}

function warnInvalidTokenOnce(token: string) {
  const tokenFingerprint = token.slice(0, 12);
  if (warnedInvalidTokens.has(tokenFingerprint)) {
    return;
  }

  warnedInvalidTokens.add(tokenFingerprint);
  console.warn("[admin-access] invalid token (ignored)");
}

export async function resolveAdminAccess(req: NextApiRequest): Promise<AdminAccessResult> {
  const adminEmail = normalizeEmail(process.env["ADMIN_EMAIL"]);
  const accessToken = extractBearerToken(req) ?? extractCookieAccessToken(req);

  if (!adminEmail || !accessToken) {
    return { isAdmin: false, userEmail: null };
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) {
      throw error;
    }

    const userEmail = normalizeEmail(data.user?.email);
    const isAdmin = Boolean(userEmail && userEmail === adminEmail);
    return {
      isAdmin,
      userEmail,
    };
  } catch {
    warnInvalidTokenOnce(accessToken);
    return { isAdmin: false, userEmail: null };
  }
}
