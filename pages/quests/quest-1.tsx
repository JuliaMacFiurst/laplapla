import QuestEngine from "@/components/Raccoons/quests/quest-1/QuestEngine";
import Quest1MobileEngine from "@/components/Raccoons/quests/quest-1/Quest1MobileEngine";
import SEO from "@/components/SEO";
import { useIsMobile } from "@/hooks/useIsMobile";
import { dictionaries, type Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { useRouter } from "next/router";

export default function Quest1Page() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const seo = dictionaries[lang].seo.raccoons.quest1;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/quests/quest-1";
  const isMobile = useIsMobile();

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      {isMobile ? <Quest1MobileEngine /> : <QuestEngine />}
    </>
  );
}
