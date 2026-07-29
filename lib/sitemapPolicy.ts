export const CORE_SITEMAP_PAGES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/cats", priority: "0.86", changefreq: "weekly" },
  { path: "/dog", priority: "0.86", changefreq: "weekly" },
  { path: "/capybara", priority: "0.86", changefreq: "weekly" },
  { path: "/books/kladbishenskaya-kniga", priority: "0.78", changefreq: "monthly" },
  { path: "/parrots", priority: "0.84", changefreq: "weekly" },
  { path: "/raccoons", priority: "0.84", changefreq: "weekly" },
  { path: "/about", priority: "0.82", changefreq: "monthly" },
  { path: "/author", priority: "0.8", changefreq: "monthly" },
  { path: "/privacy", priority: "0.42", changefreq: "monthly" },
  { path: "/terms", priority: "0.42", changefreq: "monthly" },
  { path: "/licenses", priority: "0.42", changefreq: "monthly" },
] as const;

export function sitemapContainsOnlyCanonicalPublicUrls(xml: string) {
  return (
    !xml.includes("?lang=") &&
    !/\/(?:api|admin|admin-login|studio|cats\/export|cats\/studio|parrots\/studio)(?:\/|<|\?)/.test(xml)
  );
}
