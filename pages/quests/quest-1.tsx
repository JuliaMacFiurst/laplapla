import QuestEngine from "@/components/Raccoons/quests/quest-1/QuestEngine";
import Quest1MobileEngine from "@/components/Raccoons/quests/quest-1/Quest1MobileEngine";
import SEO from "@/components/SEO";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useIsTabletViewport } from "@/hooks/useIsTabletViewport";
import { dictionaries, type Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function useIsPhoneLandscapeViewport() {
  const [isPhoneLandscape, setIsPhoneLandscape] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(
      "(pointer: coarse) and (hover: none) and (max-width: 1024px) and (max-height: 767px)",
    );

    const sync = () => {
      setIsPhoneLandscape(mediaQuery.matches);
    };

    sync();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync);
      return () => mediaQuery.removeEventListener("change", sync);
    }

    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  return isPhoneLandscape;
}

export default function Quest1Page() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const seo = dictionaries[lang].seo.raccoons.quest1;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/quests/quest-1";
  const isMobile = useIsMobile();
  const isTablet = useIsTabletViewport();
  const isPhoneLandscape = useIsPhoneLandscapeViewport();
  const useMobileQuest = isMobile || isTablet || isPhoneLandscape;

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      {useMobileQuest ? <Quest1MobileEngine /> : <QuestEngine />}
    </>
  );
}
