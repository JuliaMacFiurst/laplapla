import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import CapybaraTypingAnimation from "@/components/CapybaraTypingAnimation";
import StoryCarousel from "@/components/StoryCarousel";
import TranslationWarning from "@/components/TranslationWarning";
import type { Lang } from "@/i18n";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { STORY_STEP_KEYS, type StoryHeroOption, type StoryStepKey } from "@/lib/story/story-service";
import { useStoryGenerator } from "@/hooks/useStoryGenerator";

const buildTexts = (lang: Lang) => {
  if (lang === "en") {
    return {
      title: "Make Your Own Story!",
      subtitle: "The capybara will help you co-write a story of your own",
      selectLabel: "Choose a hero from the story library",
      customLabel: "Or invent your own hero",
      selectPlaceholder: "Choose a hero",
      customPlaceholder: "Write your hero's name",
      customWinsHint: "If you type your own hero, the custom story mode wins.",
      templateIntroPrompt: "Choose how the story begins.",
      templateIntroQuestion: "How did the story begin?",
      choosePathButton: "Start with this hero",
      coWriteButton: "Start co-writing",
      nextButton: "Next",
      tryAnotherButton: "Try another story",
      saveButton: "Save my story",
      openEditorButton: "Open in the cat editor",
      previewTitle: "Your story so far",
      storyReadyTitle: "Your capybara story is ready",
      saving: "Saving...",
      pendingMessage: "The capybara will review your story 🧐",
      narrationAuto: (hero: string) => `Once upon a time, ${hero} opened a new story and invited the capybara to narrate it.`,
      customStepTitles: {
        narration: "Narrator voice",
        intro: "Beginning",
        journey: "Journey",
        problem: "Problem",
        solution: "Solution",
        ending: "Ending",
      } satisfies Record<StoryStepKey, string>,
      customStepPrompts: {
        narration: (hero: string) => `How should the narrator open the story about ${hero}? You can leave it empty and the capybara will start.`,
        intro: (hero: string) => `What happens first to ${hero}?`,
        journey: (hero: string) => `Where does ${hero} go next?`,
        problem: (hero: string) => `What challenge appears for ${hero}?`,
        solution: (hero: string) => `How does ${hero} solve it?`,
        ending: (hero: string) => `How does the story end for ${hero}?`,
      } satisfies Record<StoryStepKey, (hero: string) => string>,
      validationChooseHero: "Choose a template hero or write your own.",
      validationTemplateIntro: "Choose one beginning option.",
      validationAnswerShort: "Keep the story going with at least 3 characters.",
      templatePreviewError: "The capybara could not prepare the story preview right now.",
      progressLabel: "Step",
      backButton: "Back to capybaras",
      chooseHeroButton: "Open hero library",
      heroPickerTitle: "Choose a hero",
      heroPickerHint: "Choose a hero: with some heroes, you can choose how the story unfolds, while with others you can open a ready-made story created by site users.",
      heroSearchPlaceholder: "Search hero by name",
      heroPreviewFallback: "Preview is loading",
      heroReadyFromLibrary: "Ready story from the library",
      closePickerButton: "Close",
    };
  }

  if (lang === "he") {
    return {
      title: "להמציא את הסיפור שלך!",
      subtitle: "הקפיברה תעזור לכם לכתוב יחד סיפור משלכם",
      selectLabel: "בחרו גיבור מספריית הסיפורים",
      customLabel: "או המציאו גיבור משלכם",
      selectPlaceholder: "בחרו גיבור",
      customPlaceholder: "כתבו את שם הגיבור",
      customWinsHint: "אם כתבתם גיבור משלכם, מצב הסיפור האישי מקבל עדיפות.",
      templateIntroPrompt: "בחרו איך הסיפור מתחיל.",
      templateIntroQuestion: "איך הסיפור התחיל?",
      choosePathButton: "להתחיל עם הגיבור הזה",
      coWriteButton: "להתחיל לכתוב יחד",
      nextButton: "הבא",
      tryAnotherButton: "לנסות סיפור אחר",
      saveButton: "לשמור את הסיפור שלי",
      openEditorButton: "לפתוח בעורך החתולים",
      previewTitle: "הסיפור שלכם עד עכשיו",
      storyReadyTitle: "סיפור הקפיברה שלכם מוכן",
      saving: "שומר...",
      pendingMessage: "הקפיברה תבדוק את הסיפור שלכם 🧐",
      narrationAuto: (hero: string) => `פעם אחת ${hero} פתח סיפור חדש, והקפיברה התחילה לספר אותו.`,
      customStepTitles: {
        narration: "קול המספר",
        intro: "התחלה",
        journey: "מסע",
        problem: "בעיה",
        solution: "פתרון",
        ending: "סיום",
      } satisfies Record<StoryStepKey, string>,
      customStepPrompts: {
        narration: (hero: string) => `איך המספר צריך לפתוח את הסיפור על ${hero}? אפשר גם להשאיר ריק והקפיברה תתחיל.`,
        intro: (hero: string) => `מה קורה קודם ל-${hero}?`,
        journey: (hero: string) => `לאן ${hero} ממשיך מכאן?`,
        problem: (hero: string) => `איזה קושי מופיע ל-${hero}?`,
        solution: (hero: string) => `איך ${hero} פותר את זה?`,
        ending: (hero: string) => `איך הסיפור של ${hero} מסתיים?`,
      } satisfies Record<StoryStepKey, (hero: string) => string>,
      validationChooseHero: "בחרו גיבור מתבנית או כתבו גיבור משלכם.",
      validationTemplateIntro: "בחרו אפשרות אחת להתחלה.",
      validationAnswerShort: "המשיכו את הסיפור עם לפחות 3 תווים.",
      templatePreviewError: "הקפיברה לא הצליחה להכין עכשיו תצוגה מקדימה של הסיפור.",
      progressLabel: "שלב",
      backButton: "חזרה לקפיברות",
      chooseHeroButton: "לפתוח את ספריית הגיבורים",
      heroPickerTitle: "בחרו גיבור",
      heroPickerHint: "בחרו גיבור: עם חלק מהגיבורים תוכלו לבחור איך הסיפור יתפתח, ועם אחרים תוכלו לפתוח מיד סיפור מוכן שנוצר על ידי משתמשי האתר.",
      heroSearchPlaceholder: "חפשו גיבור לפי שם",
      heroPreviewFallback: "התצוגה נטענת",
      heroReadyFromLibrary: "סיפור מוכן מהספרייה",
      closePickerButton: "סגור",
    };
  }

  return {
    title: "Придумай свою историю!",
    subtitle: "Капибара поможет тебе сочинить свою собственную историю",
    selectLabel: "Выбери героя из библиотеки историй",
    customLabel: "Или придумай своего героя",
    selectPlaceholder: "Выбери героя",
    customPlaceholder: "Напиши имя героя",
    customWinsHint: "Если ты пишешь своего героя, включается режим собственной истории.",
    templateIntroPrompt: "Выбери, с чего начнётся история.",
    templateIntroQuestion: "С чего началась история?",
    choosePathButton: "Начать с этим героем",
    coWriteButton: "Начать сочинять вместе",
    nextButton: "Дальше",
    tryAnotherButton: "Попробовать другую историю",
    saveButton: "Сохрани мою историю",
    openEditorButton: "Открыть в редакторе котиков",
    previewTitle: "История уже звучит так",
    storyReadyTitle: "Твоя история с капибарой готова",
    saving: "Сохраняем...",
    pendingMessage: "Капибара проверит твою историю 🧐",
    narrationAuto: (hero: string) => `Жила-была капибара, и однажды ${hero} позвал её сочинить новую историю.`,
    customStepTitles: {
      narration: "Голос рассказчика",
      intro: "Завязка",
      journey: "Путешествие",
      problem: "Проблема",
      solution: "Решение",
      ending: "Финал",
    } satisfies Record<StoryStepKey, string>,
    customStepPrompts: {
      narration: (hero: string) => `Как рассказчик начнёт историю про ${hero}? Можно оставить пустым, и капибара начнёт сама.`,
      intro: (hero: string) => `Что первым случается с ${hero}?`,
      journey: (hero: string) => `Куда ${hero} отправляется дальше?`,
      problem: (hero: string) => `Какое испытание встречает ${hero}?`,
      solution: (hero: string) => `Как ${hero} справляется с этим?`,
      ending: (hero: string) => `Чем заканчивается история ${hero}?`,
    } satisfies Record<StoryStepKey, (hero: string) => string>,
    validationChooseHero: "Выбери героя из шаблона или напиши своего.",
    validationTemplateIntro: "Выбери один вариант начала.",
    validationAnswerShort: "Продолжи историю хотя бы тремя символами.",
    templatePreviewError: "Капибара не смогла подготовить предпросмотр истории прямо сейчас.",
    progressLabel: "Шаг",
    backButton: "Назад к капибарам",
    chooseHeroButton: "Открыть библиотеку героев",
    heroPickerTitle: "Выбери героя",
    heroPickerHint: "Выбери героя: с одними героями ты можешь выбрать варианты развития истории, а с другими — сразу открыть готовую историю, придуманную пользователями сайта.",
    heroSearchPlaceholder: "Поиск по имени героя",
    heroPreviewFallback: "Превью загружается",
    heroReadyFromLibrary: "Готовая история из библиотеки",
    closePickerButton: "Закрыть",
  };
};

const makeHeroPreviewKey = (heroName: string) => heroName.trim().toLowerCase();

const HERO_GIPHY_PREVIEWS_ENABLED = false;
const heroPreviewCache: Record<string, string> = {};
const heroPreviewStatusCache: Record<string, "pending" | "done" | "failed"> = {};

export default function CreateCapybaraStoryPage({ lang }: { lang: Lang }) {
  const router = useRouter();
  const currentLang = getCurrentLang(router) || lang;
  const t = useMemo(() => buildTexts(currentLang), [currentLang]);
  const [customAnswer, setCustomAnswer] = useState("");
  const [isHeroPickerOpen, setIsHeroPickerOpen] = useState(false);
  const [heroSearchQuery, setHeroSearchQuery] = useState("");
  const [heroPreviewMap, setHeroPreviewMap] = useState<Record<string, string>>(() => ({ ...heroPreviewCache }));
  const {
    currentSlideIndex,
    draft,
    heroName,
    mediaCache,
    previewText,
    saveMessage,
    template,
    templateIntroChoices,
    activeUserStoryTranslated,
    heroOptions,
    beginCustomFlow,
    beginTemplateFlow,
    chooseTemplateIntro,
    openInEditor,
    reset,
    saveStory,
    setCurrentSlideIndex,
    setHeroInput,
    setSelectedHeroOption,
    submitCustomStep,
  } = useStoryGenerator(currentLang, {
    narrationAuto: t.narrationAuto,
    templateIntroPrompt: t.templateIntroPrompt,
    customStepTitles: t.customStepTitles,
    customStepPrompts: t.customStepPrompts,
    validationChooseHero: t.validationChooseHero,
    validationTemplateIntro: t.validationTemplateIntro,
    validationAnswerShort: t.validationAnswerShort,
    savePendingLabel: t.pendingMessage,
    templatePreviewError: t.templatePreviewError,
  });

  const carouselStory = useMemo(() => ({
    id: `caps-story-${heroName}`,
    title: heroName,
    slides: draft.slideshow.map((slide) => ({ text: slide.text, keywords: slide.keywords })),
  }), [draft.slideshow, heroName]);

  const handleStart = async () => {
    if (draft.mode === "custom") {
      beginCustomFlow();
      return;
    }

    if (draft.mode === "user_story") {
      return;
    }

    await beginTemplateFlow();
  };

  const handleSubmitCustom = () => {
    submitCustomStep(customAnswer);
    setCustomAnswer("");
  };

  const activeStep = draft.currentStep;
  const activeStepIndex = activeStep ? STORY_STEP_KEYS.indexOf(activeStep) + 1 : STORY_STEP_KEYS.length;
  const isCompleted = draft.currentStep === null && draft.slideshow.length > 0;
  const deferredHeroSearchQuery = useDeferredValue(heroSearchQuery);
  const heroNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    heroOptions.forEach((item) => {
      const key = item.heroName.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [heroOptions]);
  const filteredHeroOptions = useMemo(() => {
    const query = deferredHeroSearchQuery.trim().toLowerCase();
    if (!query) {
      return heroOptions;
    }

    return heroOptions.filter((item) => {
      const label = item.heroName.toLowerCase();
      const detail = item.type === "template" ? item.title.toLowerCase() : "";
      return label.includes(query) || detail.includes(query);
    });
  }, [deferredHeroSearchQuery, heroOptions]);
  const selectedHeroOption = useMemo(() => heroOptions.find((item) =>
    item.type === "user_story"
      ? item.id === draft.selectedUserStoryId
      : item.id === draft.selectedTemplateId,
  ) || null, [draft.selectedTemplateId, draft.selectedUserStoryId, heroOptions]);

  useEffect(() => {
    if (!HERO_GIPHY_PREVIEWS_ENABLED || !isHeroPickerOpen) {
      return;
    }

    const previewCandidates = filteredHeroOptions
      .slice(0, 18)
      .map((item) => item.heroName)
      .filter((heroName, index, list) => list.indexOf(heroName) === index)
      .filter((heroName) => {
        const previewKey = makeHeroPreviewKey(heroName);
        return heroPreviewStatusCache[previewKey] == null;
      });

    if (previewCandidates.length === 0) {
      return;
    }

    previewCandidates.forEach((heroName) => {
      heroPreviewStatusCache[makeHeroPreviewKey(heroName)] = "pending";
    });

    let cancelled = false;

    void Promise.all(previewCandidates.map(async (heroName) => {
      const previewKey = makeHeroPreviewKey(heroName);

      try {
        const response = await fetch("/api/search-giphy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: heroName }),
        });

        if (!response.ok) {
          heroPreviewStatusCache[previewKey] = "failed";
          return [heroName, ""] as const;
        }

        const payload = await response.json() as { gifs?: string[] };
        heroPreviewStatusCache[previewKey] = payload.gifs?.[0] ? "done" : "failed";
        return [heroName, payload.gifs?.[0] || ""] as const;
      } catch {
        heroPreviewStatusCache[previewKey] = "failed";
        return [heroName, ""] as const;
      }
    })).then((results) => {
      if (cancelled) {
        return;
      }

      setHeroPreviewMap((prev) => {
        const next = { ...prev };
        results.forEach(([heroName, previewUrl]) => {
          if (previewUrl) {
            const previewKey = makeHeroPreviewKey(heroName);
            heroPreviewCache[previewKey] = previewUrl;
            next[previewKey] = previewUrl;
          }
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [filteredHeroOptions, isHeroPickerOpen]);

  const getHeroCardMeta = (option: StoryHeroOption) => {
    const duplicateCount = heroNameCounts.get(option.heroName.trim().toLowerCase()) || 0;

    if (option.type === "template") {
      if (duplicateCount > 1) {
        return option.title;
      }

      return option.title !== option.heroName ? option.title : "";
    }

    if (duplicateCount > 1) {
      return t.heroReadyFromLibrary;
    }

    return "";
  };

  return (
    <div className="capybara-page-container story-generator-page">
      <header className="capybara-page-header story-generator-header">
        <button
          type="button"
          className="story-generator-back"
          onClick={() => router.push({ pathname: "/capybara", query: buildLocalizedQuery(currentLang) }, undefined, { locale: currentLang })}
        >
          ← {t.backButton}
        </button>
        <h1 className="page-title">{t.title}</h1>
        <p className="page-subtitle">{t.subtitle}</p>
      </header>

      <main className="story-generator-main">
        <section className="story-generator-stage">
          <div className="story-capybara-card">
            <div className="story-capybara-portrait">
              <CapybaraTypingAnimation />
            </div>
            <div className="story-capybara-bubble">
              {isCompleted ? t.storyReadyTitle : (
                activeStep
                  ? t.customStepPrompts[activeStep](heroName)
                  : draft.mode === "template" && template
                    ? t.templateIntroPrompt
                    : t.subtitle
              )}
            </div>
          </div>

          {!draft.currentStep && !isCompleted ? (
            <section className="story-entry-card">
              <label className="story-field-label">{t.selectLabel}</label>
              <button
                type="button"
                className="story-field story-hero-picker-trigger"
                onClick={() => setIsHeroPickerOpen(true)}
              >
                <span className="story-hero-picker-trigger-label">
                  {selectedHeroOption?.heroName || t.selectPlaceholder}
                </span>
                <span className="story-hero-picker-trigger-action">{t.chooseHeroButton}</span>
              </button>

              <label className="story-field-label" htmlFor="story-hero-input">{t.customLabel}</label>
              <input
                id="story-hero-input"
                className="story-field"
                type="text"
                value={draft.heroInput}
                onChange={(event) => setHeroInput(event.target.value)}
                placeholder={t.customPlaceholder}
              />

              <p className="story-inline-hint">{t.customWinsHint}</p>

              {draft.mode !== "user_story" ? (
                <button
                  type="button"
                  className="feed-action-button story-primary-button"
                  disabled={draft.loading.template}
                  onClick={() => void handleStart()}
                >
                  {draft.mode === "custom" ? t.coWriteButton : t.choosePathButton}
                </button>
              ) : null}
            </section>
          ) : null}

          {isHeroPickerOpen ? (
            <div
              className="story-hero-picker-overlay"
              role="dialog"
              aria-modal="true"
              aria-label={t.heroPickerTitle}
              onClick={() => setIsHeroPickerOpen(false)}
            >
              <div className="story-hero-picker-modal" onClick={(event) => event.stopPropagation()}>
                <div className="story-hero-picker-header">
                  <div>
                    <div className="story-hero-picker-title">{t.heroPickerTitle}</div>
                    <p className="story-hero-picker-hint">{t.heroPickerHint}</p>
                  </div>
                  <button
                    type="button"
                    className="story-hero-picker-close"
                    onClick={() => setIsHeroPickerOpen(false)}
                  >
                    {t.closePickerButton}
                  </button>
                </div>

                <input
                  className="story-field story-hero-picker-search"
                  type="text"
                  value={heroSearchQuery}
                  onChange={(event) => setHeroSearchQuery(event.target.value)}
                  placeholder={t.heroSearchPlaceholder}
                />

                <div className="story-hero-picker-grid">
                  {filteredHeroOptions.map((option) => {
                    const previewUrl = heroPreviewMap[makeHeroPreviewKey(option.heroName)] || "";
                    const meta = getHeroCardMeta(option);
                    const isSelected = selectedHeroOption?.id === option.id && selectedHeroOption?.type === option.type;

                    return (
                      <button
                        key={`${option.type}:${option.id}`}
                        type="button"
                        className={`story-hero-card${isSelected ? " is-selected" : ""}`}
                        onClick={() => {
                          setSelectedHeroOption(option);
                          setIsHeroPickerOpen(false);
                        }}
                      >
                        <div className="story-hero-card-media">
                          {previewUrl ? (
                            // Giphy previews are only decorative here; selection still relies on the canonical hero name.
                            <img src={previewUrl} alt={option.heroName} />
                          ) : (
                            <div className="story-hero-card-fallback">{option.heroName.slice(0, 1).toUpperCase()}</div>
                          )}
                        </div>
                        <div className="story-hero-card-copy">
                          <div className="story-hero-card-name">{option.heroName}</div>
                          <div className="story-hero-card-meta">{meta || t.heroPreviewFallback}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {draft.mode === "template" && draft.currentStep === "intro" ? (
            <section className="story-question-card">
              <div className="story-progress-chip">{t.progressLabel} 2 / 6</div>
              <h2 className="story-question-title">{t.templateIntroQuestion}</h2>
              <div className="story-choice-list">
                {templateIntroChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="story-choice-button"
                    onClick={() => void chooseTemplateIntro((choice.index === 1 || choice.index === 2 ? choice.index : 0) as 0 | 1 | 2)}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {draft.mode === "custom" && activeStep ? (
            <section className="story-question-card">
              <div className="story-progress-chip">{t.progressLabel} {activeStepIndex} / 6</div>
              <h2 className="story-question-title">{t.customStepTitles[activeStep]}</h2>
              {previewText ? (
                <div className="story-preview-card">
                  <div className="story-preview-title">{t.previewTitle}</div>
                  <p className="story-preview-text">{previewText}</p>
                </div>
              ) : null}
              <textarea
                className="story-field story-textarea"
                rows={5}
                value={customAnswer}
                onChange={(event) => setCustomAnswer(event.target.value)}
                placeholder={t.customStepPrompts[activeStep](heroName)}
              />
              <button
                type="button"
                className="feed-action-button story-primary-button"
                disabled={draft.loading.generating || draft.loading.assembling}
                onClick={handleSubmitCustom}
              >
                {t.nextButton}
              </button>
            </section>
          ) : null}

          {draft.error ? <p className="story-generator-error">{draft.error}</p> : null}
          {saveMessage ? <p className="story-generator-success">{saveMessage}</p> : null}

          {isCompleted ? (
            <section className="story-result-card">
              {draft.mode === "user_story" && currentLang !== "ru" && !activeUserStoryTranslated ? (
                <TranslationWarning lang={currentLang} subject="story" />
              ) : null}
              <StoryCarousel
                story={carouselStory}
                currentSlideIndex={currentSlideIndex}
                onSlideIndexChange={setCurrentSlideIndex}
                textClassName="story-carousel-text"
                mediaCache={mediaCache}
              />

              <div className="story-result-actions">
                {draft.mode !== "user_story" ? (
                  <button
                    type="button"
                    className="feed-action-button story-primary-button"
                    disabled={draft.loading.saving}
                    onClick={async () => {
                      console.log("[CLICK SAVE]");
                      try {
                        await saveStory();
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                  >
                    {draft.loading.saving ? t.saving : t.saveButton}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="feed-action-button"
                  onClick={openInEditor}
                >
                  {t.openEditorButton}
                </button>
                <button
                  type="button"
                  className="feed-action-button"
                  onClick={reset}
                >
                  {t.tryAnotherButton}
                </button>
              </div>
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}
