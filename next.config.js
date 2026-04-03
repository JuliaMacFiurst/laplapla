/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["ru", "en", "he"],
    defaultLocale: "ru",
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

module.exports = nextConfig;
