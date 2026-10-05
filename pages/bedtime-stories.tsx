import type { GetServerSideProps } from "next";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/routing";
import { buildLocalizedPublicPath } from "@/lib/i18n/routing";

export default function LegacyBedtimeStoriesPage() { return null; }

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const lang = isLang(locale) ? locale : DEFAULT_LANG;
  return {
    redirect: { destination: buildLocalizedPublicPath("/library", lang), permanent: true },
  };
};
