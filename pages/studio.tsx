import { useEffect } from "react";
import { useRouter } from "next/router";
import type { Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { CatsStudioPageContent } from "@/pages/cats/studio";
import { ParrotsStudioPageContent } from "@/pages/parrots/studio";

function normalizeType(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function StudioRouterPage() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const type = normalizeType(router.query.type);

  useEffect(() => {
    if (!router.isReady || type !== "dogs") return;

    const slug = normalizeType(router.query.slug);
    if (slug) {
      void router.replace(
        {
          pathname: "/dog/lessons/[slug]",
          query: {
            slug,
            lang,
          },
        },
        `/dog/lessons/${slug}?lang=${lang}`,
        { locale: lang },
      );
      return;
    }

    void router.replace(
      {
        pathname: "/dog/lessons",
        query: { lang },
      },
      undefined,
      { locale: lang },
    );
  }, [lang, router, type]);

  if (type === "parrot") {
    return <ParrotsStudioPageContent />;
  }

  if (type === "cats") {
    return <CatsStudioPageContent lang={lang} />;
  }

  return null;
}
