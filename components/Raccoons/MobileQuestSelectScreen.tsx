import { useRouter } from "next/router";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { buildLocalizedHref } from "@/lib/i18n/routing";
import type { Quest } from "@/components/Raccoons/QuestSection";

type MobileQuestSelectScreenProps = {
  lang: Lang;
  quests: Quest[];
  onBackToMap: () => void;
};

export default function MobileQuestSelectScreen({
  lang,
  quests,
  onBackToMap,
}: MobileQuestSelectScreenProps) {
  const router = useRouter();
  const t = dictionaries[lang].raccoons.quests;

  const openQuest = (quest: Quest) => {
    if (quest.status !== "active") {
      return;
    }

    void router.push(buildLocalizedHref(`/quests/${quest.id}`, lang), undefined, {
      locale: lang,
    });
  };

  return (
    <main className="raccoons-mobile-quests-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <header className="raccoons-mobile-quests-topbar">
        <button
          type="button"
          className="raccoons-mobile-quests-back"
          onClick={onBackToMap}
          aria-label={lang === "ru" ? "Назад к карте" : lang === "he" ? "חזרה למפה" : "Back to map"}
        >
          {lang === "he" ? "→" : "←"}
        </button>
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      <section className="raccoons-mobile-quest-carousel" aria-label={t.title}>
        {quests.map((quest, index) => {
          const isActive = quest.status === "active";
          return (
            <article
              key={quest.id}
              className={`raccoons-mobile-quest-card ${isActive ? "is-active" : "is-locked"}`}
            >
              <button
                type="button"
                className="raccoons-mobile-quest-poster"
                onClick={() => openQuest(quest)}
                disabled={!isActive}
                aria-label={isActive ? t.playQuest : quest.title}
              >
                <img src={quest.image} alt={quest.title || ""} />
                <span className="raccoons-mobile-quest-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </button>

              <div className="raccoons-mobile-quest-copy">
                <h2>{quest.title}</h2>
                <p>{quest.subtitle}</p>
                <button
                  type="button"
                  className="raccoons-mobile-quest-play"
                  onClick={() => openQuest(quest)}
                  disabled={!isActive}
                >
                  {isActive ? t.playQuest : t.upcomingTitle}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
