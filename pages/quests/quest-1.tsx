import QuestEngine from "@/components/Raccoons/quests/quest-1/QuestEngine";
import MobileDesktopNotice from "@/components/MobileDesktopNotice";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Lang } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";
import { useRouter } from "next/router";

export default function Quest1Page() {
  const router = useRouter();
  const lang = getCurrentLang(router) as Lang;
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileDesktopNotice lang={lang || "ru"} />;
  }

  return <QuestEngine />;
}
