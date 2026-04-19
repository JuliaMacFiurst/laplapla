import type { GetServerSideProps } from "next";
import { buildLocalizedPublicPath, isLang } from "@/lib/i18n/routing";
import { buildCanonicalMapEntityPath, normalizeSlug } from "@/lib/mapEntityRouting";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const rawSlug = typeof context.params?.slug === "string" ? context.params.slug : "";
  const lang = isLang(context.locale) ? context.locale : isLang(context.query.lang) ? context.query.lang : "ru";
  const slug = normalizeSlug(rawSlug);

  if (!slug) {
    return { notFound: true };
  }

  const destination = buildLocalizedPublicPath(buildCanonicalMapEntityPath("animal", slug), lang);

  return {
    redirect: {
      destination,
      permanent: true,
    },
  };
};

export default function AnimalSeoPageRedirect() {
  return null;
}
