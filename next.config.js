const isProduction = process.env.NODE_ENV === "production";

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "https://api.giphy.com",
  "https://api.pexels.com",
];

if (!isProduction) {
  connectSrc.push("http://127.0.0.1:5050");
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src " + connectSrc.join(" "),
  "media-src 'self' data: blob: https:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const supabaseStorageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  i18n: {
    locales: ["ru", "en", "he"],
    defaultLocale: "ru",
    localeDetection: false,
  },
  skipTrailingSlashRedirect: true,
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    if (!supabaseStorageOrigin) {
      return [];
    }

    return [
      {
        source: "/supabase-storage/:path*",
        destination: `${supabaseStorageOrigin.replace(/\/+$/, "")}/storage/v1/object/public/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
