// pages/raccoons.tsx
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import MapWrapper from "@/components/Raccoons/MapWrapper";
import MapTabs from "@/components/Raccoons/MapTabs";
import { RaccoonGuide } from "@/components/Raccoons/RaccoonGuide";
import { QuestSection } from "@/components/Raccoons/QuestSection";
import type { Quest } from "@/components/Raccoons/QuestSection";
import { quests } from "@/utils/quests.config";
import { dictionaries } from "@/i18n";
import { getCurrentLang } from "@/lib/i18n/routing";

export default function RaccoonsPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons;
  const [activeTab, setActiveTab] = useState<
    "country" | "river" | "sea" | "physic" | "flag" | "animal" | "culture" | "weather" | "food"
  >("country");
  const localizedQuests: Quest[] = [
    {
      ...quests.featured,
      title: t.quests.featuredTitle,
      subtitle: t.quests.featuredSubtitle,
    },
    ...quests.upcoming.map((quest) => ({
      ...quest,
      title: t.quests.upcomingTitle,
      subtitle: t.quests.upcomingSubtitle,
    })),
  ];

  return (
    <>
      <Head>
        <title>{t.page.headTitle}</title>
        <meta name="description" content={t.page.metaDescription} />
      </Head>

      <main className="min-h-screen">
        <div className="raccoons-home-wrapper">
          <div className="raccoons-header-container">
            <div className="raccoons-title-with-raccoon">
              <div className="raccoon-guide-block">
                <RaccoonGuide wiggle={false} raccoonLine="" alt={t.page.guideAlt} />
              </div>

              <div className="raccoon-text-block">
                <h1 className="page-title">{t.page.title}</h1>
                <p className="page-subtitle">{t.page.subtitle}</p>
              </div>
            </div>
            <MapTabs selectedTab={activeTab} setSelectedTab={setActiveTab} />
          </div>
          <MapWrapper type={activeTab} />
          <QuestSection quests={localizedQuests} />
        </div>
      </main>
    </>
  );
}
