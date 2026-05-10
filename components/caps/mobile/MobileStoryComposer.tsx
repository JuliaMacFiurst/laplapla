import Image from "next/image";
import { useEffect, useState } from "react";
import CapybaraTypingAnimation from "@/components/CapybaraTypingAnimation";
import TranslationWarning from "@/components/TranslationWarning";
import type { Lang } from "@/i18n";
import type { StoryHeroOption, StoryStepKey } from "@/lib/story/story-shared";

type CreateStoryTexts = {
  title: string;
  selectLabel: string;
  customLabel: string;
  selectPlaceholder: string;
  customPlaceholder: string;
  customWinsHint: string;
  templateIntroQuestion: string;
  chooseHeroButton: string;
  coWriteButton: string;
  choosePathButton: string;
  previewTitle: string;
  nextButton: string;
  progressLabel: string;
  heroPickerTitle: string;
  heroPickerHint: string;
  heroSearchPlaceholder: string;
  heroPreviewFallback: string;
  closePickerButton: string;
  customStepTitles: Record<StoryStepKey, string>;
};

type StoryDraftLike = {
  mode: "template" | "custom" | "user_story" | null;
  selectedTemplateId: string | null;
  selectedUserStoryId: string | null;
  heroInput: string;
  currentStep: StoryStepKey | null;
  loading: {
    template: boolean;
    generating: boolean;
    assembling: boolean;
  };
  error: string | null;
};

interface MobileStoryComposerProps {
  lang: Lang;
  t: CreateStoryTexts;
  draft: StoryDraftLike;
  currentPrompt: string;
  previewText: string;
  customAnswer: string;
  activeStep: StoryStepKey | null;
  activeStepIndex: number;
  templateIntroChoices: Array<{ id: string; index: number; text: string }>;
  filteredHeroOptions: StoryHeroOption[];
  selectedHeroOption: StoryHeroOption | null;
  heroPreviewMap: Record<string, string>;
  heroSearchQuery: string;
  activeUserStoryTranslated: boolean;
  getHeroCardMeta: (option: StoryHeroOption) => string;
  makeHeroPreviewKey: (heroName: string) => string;
  setHeroSearchQuery: (value: string) => void;
  setIsHeroPickerOpen: (value: boolean) => void;
  setSelectedHeroOption: (option: StoryHeroOption) => void;
  setHeroInput: (value: string) => void;
  setCustomAnswer: (value: string) => void;
  onStart: () => void | Promise<void>;
  onChooseTemplateIntro: (choiceIndex: 0 | 1 | 2) => void | Promise<void>;
  onSubmitCustom: () => void;
  isHeroPickerOpen: boolean;
}

export default function MobileStoryComposer({
  lang,
  t,
  draft,
  currentPrompt,
  previewText,
  customAnswer,
  activeStep,
  activeStepIndex,
  templateIntroChoices,
  filteredHeroOptions,
  selectedHeroOption,
  heroPreviewMap,
  heroSearchQuery,
  activeUserStoryTranslated,
  getHeroCardMeta,
  makeHeroPreviewKey,
  setHeroSearchQuery,
  setIsHeroPickerOpen,
  setSelectedHeroOption,
  setHeroInput,
  setCustomAnswer,
  onStart,
  onChooseTemplateIntro,
  onSubmitCustom,
  isHeroPickerOpen,
}: MobileStoryComposerProps) {
  const [typedPreviewText, setTypedPreviewText] = useState("");
  const [selectedIntroIndex, setSelectedIntroIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!previewText) {
      setTypedPreviewText("");
      return;
    }

    let frame = 0;
    setTypedPreviewText("");

    const interval = window.setInterval(() => {
      frame += 1;
      setTypedPreviewText(previewText.slice(0, frame));

      if (frame >= previewText.length) {
        window.clearInterval(interval);
      }
    }, 18);

    return () => window.clearInterval(interval);
  }, [previewText]);

  useEffect(() => {
    if (draft.currentStep !== "intro") {
      setSelectedIntroIndex(null);
    }
  }, [draft.currentStep]);

  return (
    <div className="mobile-story-composer">
      <section className="mobile-story-intro-card">
        <div className="mobile-story-intro-visual">
          <CapybaraTypingAnimation />
        </div>
        <div className="mobile-story-intro-copy">
          <h1 className="mobile-story-intro-title">{t.title as string}</h1>
          <p className="mobile-story-intro-subtitle">{currentPrompt}</p>
        </div>
      </section>

      <section className="mobile-story-builder-card">
        {!draft.currentStep ? (
          <>
            <div className="mobile-story-field-group">
              <label className="story-field-label">{t.selectLabel as string}</label>
              <button
                type="button"
                className="story-field story-hero-picker-trigger mobile-story-field-button"
                onClick={() => setIsHeroPickerOpen(true)}
              >
                <span className="story-hero-picker-trigger-label">
                  {selectedHeroOption?.heroName || (t.selectPlaceholder as string)}
                </span>
                <span className="story-hero-picker-trigger-action">{t.chooseHeroButton as string}</span>
              </button>
            </div>

            <div className="mobile-story-field-group">
              <label className="story-field-label" htmlFor="mobile-story-hero-input">{t.customLabel as string}</label>
              <input
                id="mobile-story-hero-input"
                className="story-field"
                type="text"
                value={draft.heroInput}
                onChange={(event) => setHeroInput(event.target.value)}
                placeholder={t.customPlaceholder as string}
              />
              <p className="story-inline-hint">{t.customWinsHint as string}</p>
            </div>

            {draft.mode !== "user_story" ? (
              <button
                type="button"
                className="mobile-action-pill mobile-action-pill-primary mobile-story-submit"
                disabled={draft.loading.template}
                onClick={() => void onStart()}
              >
                {draft.mode === "custom" ? (t.coWriteButton as string) : (t.choosePathButton as string)}
              </button>
            ) : null}

            {draft.mode === "user_story" && currentLangNeedsTranslationWarning(lang, activeUserStoryTranslated) ? (
              <TranslationWarning lang={lang} subject="story" />
            ) : null}
          </>
        ) : null}

        {draft.mode === "template" && draft.currentStep === "intro" ? (
          <>
            <div className="story-progress-chip mobile-story-progress">{t.progressLabel as string} 2 / 6</div>
            <h2 className="story-question-title mobile-story-question-title">{t.templateIntroQuestion as string}</h2>
            <div className="story-choice-list mobile-story-choice-list">
              {templateIntroChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`story-choice-button ${selectedIntroIndex === choice.index ? "story-choice-button-selected" : ""}`}
                  onClick={() => {
                    setSelectedIntroIndex(choice.index);
                    void onChooseTemplateIntro((choice.index === 1 || choice.index === 2 ? choice.index : 0) as 0 | 1 | 2);
                  }}
                >
                  {choice.text}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {draft.mode === "custom" && activeStep ? (
          <>
            <div className="story-progress-chip mobile-story-progress">
              {t.progressLabel as string} {activeStepIndex} / 6
            </div>
            <h2 className="story-question-title mobile-story-question-title">
              {(t.customStepTitles as Record<StoryStepKey, string>)[activeStep]}
            </h2>
            {previewText ? (
              <div className="story-preview-card mobile-story-preview-card">
                <div className="story-preview-title">{t.previewTitle as string}</div>
                <p className="story-preview-text mobile-story-preview-typed">{typedPreviewText}</p>
              </div>
            ) : null}
            <textarea
              className="story-field story-textarea mobile-story-textarea"
              rows={5}
              value={customAnswer}
              onChange={(event) => setCustomAnswer(event.target.value)}
              placeholder={currentPrompt}
            />
            <button
              type="button"
              className="mobile-action-pill mobile-action-pill-primary mobile-story-submit"
              disabled={draft.loading.generating || draft.loading.assembling}
              onClick={onSubmitCustom}
            >
              {t.nextButton as string}
            </button>
          </>
        ) : null}

        {draft.error ? <p className="story-generator-error">{draft.error}</p> : null}
      </section>

      {isHeroPickerOpen ? (
        <div
          className="story-hero-picker-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={t.heroPickerTitle as string}
          onClick={() => setIsHeroPickerOpen(false)}
        >
          <div className="story-hero-picker-modal" onClick={(event) => event.stopPropagation()}>
            <div className="story-hero-picker-header">
              <div>
                <div className="story-hero-picker-title">{t.heroPickerTitle as string}</div>
                <p className="story-hero-picker-hint">{t.heroPickerHint as string}</p>
              </div>
              <button
                type="button"
                className="story-hero-picker-close"
                aria-label={t.closePickerButton as string}
                onClick={() => setIsHeroPickerOpen(false)}
              >
                ×
              </button>
            </div>

            <input
              className="story-field story-hero-picker-search"
              type="text"
              value={heroSearchQuery}
              onChange={(event) => setHeroSearchQuery(event.target.value)}
              placeholder={t.heroSearchPlaceholder as string}
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
                        <Image src={previewUrl} alt={option.heroName} width={160} height={160} unoptimized />
                      ) : (
                        <div className="story-hero-card-fallback">{option.heroName.slice(0, 1).toUpperCase()}</div>
                      )}
                    </div>
                    <div className="story-hero-card-copy">
                      <div className="story-hero-card-name">{option.heroName}</div>
                      <div className="story-hero-card-meta">{meta || (t.heroPreviewFallback as string)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function currentLangNeedsTranslationWarning(lang: Lang, activeUserStoryTranslated: boolean) {
  return lang !== "ru" && !activeUserStoryTranslated;
}
