export const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com").replace(/\/+$/, "") ||
  "https://yourdomain.com";
