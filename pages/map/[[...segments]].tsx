import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import SeoEntityPage, { type GroupedStories, type SeoEntityType } from "@/components/SeoEntityPage";
import {
  buildCanonicalMapEntityPath,
  buildCanonicalMapEntityPathFromUnknown,
  normalizeMapEntityType,
  normalizeSlug,
} from "@/lib/mapEntityRouting";
import { buildLocalizedPublicPath, isLang } from "@/lib/i18n/routing";
import { loadSeoEntityPageData, resolveCanonicalEntityRouteBySlug } from "@/lib/server/seoEntityPage";
import type { Lang } from "@/i18n";

type Props = {
  entityType: SeoEntityType;
  slug: string;
  title: string;
  groupedStories: GroupedStories;
  lang: Lang;
  hasAnyStories: boolean;
  rawTargetId: string;
};

function readFirstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildCanonicalDestination(path: string, lang: Lang) {
  return buildLocalizedPublicPath(path, lang);
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const lang = isLang(context.locale) ? context.locale : isLang(context.query.lang) ? context.query.lang : "ru";
  const segments = Array.isArray(context.params?.segments)
    ? context.params.segments.filter((segment): segment is string => typeof segment === "string")
    : [];

  try {
    if (segments.length === 0) {
      const rawType =
        readFirstQueryValue(context.query.type) ||
        readFirstQueryValue(context.query.mapType) ||
        readFirstQueryValue(context.query.target_type) ||
        readFirstQueryValue(context.query.entityType) ||
        "";
      const rawSlug =
        readFirstQueryValue(context.query.target) ||
        readFirstQueryValue(context.query.target_id) ||
        readFirstQueryValue(context.query.slug) ||
        "";

      const slug = normalizeSlug(rawSlug);
      if (!slug) {
        return { notFound: true };
      }

      const canonicalType = normalizeMapEntityType(rawType);
      if (canonicalType) {
        return {
          redirect: {
            destination: buildCanonicalDestination(buildCanonicalMapEntityPath(canonicalType, slug), lang),
            permanent: true,
          },
        };
      }

      const resolvedRoute = await resolveCanonicalEntityRouteBySlug(slug, lang);
      if (!resolvedRoute) {
        return { notFound: true };
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn(`[canonical-routes] redirecting query route /map?target=${rawSlug} -> ${resolvedRoute.canonicalPath}`);
      }

      return {
        redirect: {
          destination: buildCanonicalDestination(resolvedRoute.canonicalPath, lang),
          permanent: true,
        },
      };
    }

    if (segments.length === 1) {
      const slug = normalizeSlug(segments[0] || "");
      if (!slug) {
        return { notFound: true };
      }

      const resolvedRoute = await resolveCanonicalEntityRouteBySlug(slug, lang);
      if (!resolvedRoute) {
        return { notFound: true };
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn(`[canonical-routes] redirecting legacy /map/${segments[0]} -> ${resolvedRoute.canonicalPath}`);
      }

      return {
        redirect: {
          destination: buildCanonicalDestination(resolvedRoute.canonicalPath, lang),
          permanent: true,
        },
      };
    }

    if (segments.length === 2) {
      const rawType = segments[0] || "";
      const rawSlug = segments[1] || "";
      const entityType = normalizeMapEntityType(rawType);
      const slug = normalizeSlug(rawSlug);

      if (!entityType || !slug) {
        return { notFound: true };
      }

      const canonicalPath = buildCanonicalMapEntityPathFromUnknown(rawType, rawSlug);
      if (!canonicalPath) {
        return { notFound: true };
      }

      const rawPath = `/map/${rawType}/${rawSlug}`;
      if (rawPath !== canonicalPath) {
        return {
          redirect: {
            destination: buildCanonicalDestination(canonicalPath, lang),
            permanent: true,
          },
        };
      }

      const pageData = await loadSeoEntityPageData(entityType, slug, lang);
      const {
        title,
        groupedStories,
        hasAnyStories,
        entityExists,
      } = pageData;
      if (!entityExists) {
        return { notFound: true };
      }

      const rawTargetId = pageData.rawTargetId || slug;

      return {
        props: {
          entityType,
          slug,
          title,
          groupedStories,
          lang,
          hasAnyStories,
          rawTargetId,
        },
      };
    }

    return { notFound: true };
  } catch (error) {
    console.error("[canonical-routes] map route lookup failed", {
      segments,
      query: context.query,
      lang,
      error,
    });
    return { notFound: true };
  }
};

export default function MapEntityPage({
  entityType,
  slug,
  title,
  groupedStories,
  lang,
  hasAnyStories,
  rawTargetId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <SeoEntityPage
      entityType={entityType}
      slug={slug}
      title={title}
      groupedStories={groupedStories}
      lang={lang}
      hasAnyStories={hasAnyStories}
      rawTargetId={rawTargetId}
    />
  );
}
