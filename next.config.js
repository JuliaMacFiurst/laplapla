/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  i18n: {
    locales: ["ru", "en", "he"],
    defaultLocale: "ru",
  },
};

module.exports = nextConfig;