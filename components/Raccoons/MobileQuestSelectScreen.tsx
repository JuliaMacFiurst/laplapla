import Image from "next/image";
import { useRouter } from "next/router";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { buildLocalizedHref } from "@/lib/i18n/routing";
import type { Quest } from "@/components/Raccoons/QuestSection";
import { getRecipeCardImage, getRecipeExportImage, type Recipe } from "@/lib/recipes";

type MobileQuestSelectScreenProps = {
  lang: Lang;
  quests: Quest[];
  recipes: Recipe[];
  onBackToMap: () => void;
  onGoHome: () => void;
};

const MOBILE_KITCHEN_UI: Record<Lang, { title: string; subtitle: string; open: string }> = {
  ru: {
    title: "Кухня енотиков",
    subtitle: "Листай рецепты вбок и открывай любимые карточки.",
    open: "Открыть рецепт",
  },
  en: {
    title: "Raccoon Kitchen",
    subtitle: "Swipe sideways through recipes and open your favorite cards.",
    open: "Open recipe",
  },
  he: {
    title: "מטבח הדביבונים",
    subtitle: "דפדפו לצדדים בין המתכונים ופתחו את הכרטיסים האהובים.",
    open: "לפתוח מתכון",
  },
};

export default function MobileQuestSelectScreen({
  lang,
  quests,
  recipes,
  onBackToMap,
  onGoHome,
}: MobileQuestSelectScreenProps) {
  const router = useRouter();
  const t = dictionaries[lang].raccoons.quests;
  const kitchenUi = MOBILE_KITCHEN_UI[lang];
  const exploreLabel = lang === "ru" ? "Исследовать" : lang === "he" ? "לחקור" : "Explore";
  const getMobileQuestImage = (quest: Quest) =>
    quest.id === "quest-1"
      ? "https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/quests/1_quest/images/quest-1-mobile.webp"
      : quest.image || "/images/quest-placeholder.webp";

  const openQuest = (quest: Quest) => {
    if (quest.status !== "active") {
      return;
    }

    void router.push(buildLocalizedHref(`/quests/${quest.id}`, lang), undefined, {
      locale: lang,
    });
  };

  const openRecipe = (recipe: Recipe) => {
    void router.push(buildLocalizedHref(`/raccoons/kitchen/${recipe.slug}`, lang), undefined, {
      locale: lang,
    });
  };

  return (
    <main className="raccoons-mobile-quests-screen" dir={lang === "he" ? "rtl" : "ltr"}>
      <header className="raccoons-mobile-quests-topbar">
        <div className="raccoons-mobile-quests-topbar-actions">
          <button
            type="button"
            className="raccoons-mobile-quests-back"
            onClick={onBackToMap}
            aria-label={lang === "ru" ? "Назад к карте" : lang === "he" ? "חזרה למפה" : "Back to map"}
          >
            {lang === "he" ? "→" : "←"}
          </button>
          <button
            type="button"
            className="capybara-mobile-topbar-button raccoons-mobile-home-button"
            onClick={onGoHome}
            aria-label={lang === "ru" ? "На главную" : lang === "he" ? "חזרה למסך הראשי" : "Go to home screen"}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>
      </header>

      <div className="raccoons-mobile-adventure-snap">
        <section className="raccoons-mobile-adventure-panel" aria-label={t.title}>
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
                    aria-label={isActive ? exploreLabel : quest.title}
                  >
                    <Image
                      src={getMobileQuestImage(quest)}
                      alt={quest.title || ""}
                      fill
                      priority={index === 0}
                      unoptimized
                      className="raccoons-mobile-quest-poster-image"
                    />
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
                      {isActive ? exploreLabel : t.upcomingTitle}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </section>

        <section className="raccoons-mobile-adventure-panel raccoons-mobile-kitchen-panel" aria-labelledby="raccoons-mobile-kitchen-title">
          <div className="raccoons-mobile-kitchen-heading">
            <h2 id="raccoons-mobile-kitchen-title">{kitchenUi.title}</h2>
            <p>{kitchenUi.subtitle}</p>
          </div>
          <div className="raccoons-mobile-recipe-carousel" aria-label={kitchenUi.title}>
            {recipes.map((recipe, index) => {
              const image = getRecipeExportImage(recipe, lang) || getRecipeCardImage(recipe, lang) || recipe.image_url;
              return (
                <article key={recipe.id} className="raccoons-mobile-recipe-card">
                  <button
                    type="button"
                    className="raccoons-mobile-recipe-poster"
                    onClick={() => openRecipe(recipe)}
                    aria-label={`${kitchenUi.open}: ${recipe.title}`}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={recipe.title}
                        fill
                        sizes="82vw"
                        priority={index === 0}
                        unoptimized
                      />
                    ) : null}
                  </button>
                  <div className="raccoons-mobile-recipe-copy">
                    <h3>{recipe.title}</h3>
                    <p>{[recipe.country, recipe.cooking_time].filter(Boolean).join(" · ")}</p>
                    <button type="button" onClick={() => openRecipe(recipe)}>
                      {kitchenUi.open}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
