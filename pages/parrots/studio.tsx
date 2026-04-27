import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import SEO from "@/components/SEO";
import { useIsMobile } from "@/hooks/useIsMobile";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";
import { loadProject } from "@/lib/studioStorage";
import type { StudioProject } from "@/types/studio";
import type { Track } from "@/components/studio/MusicPanel";
import ParrotStudioRoot from "@/components/parrots/studio/ParrotStudioRoot";
import { fetchParrotMusicStyles } from "@/lib/parrots/client";
import { getHardcodedParrotStyleRecords, type ParrotStyleRecord } from "@/lib/parrots/catalog";
import type { StudioSlide } from "@/types/studio";
import MobilePortraitLock from "@/components/mobile/MobilePortraitLock";

const StudioRoot = dynamic(() => import("@/components/studio/StudioRoot"), { ssr: false });

const PROJECT_ID = "parrot-studio-project";

type ImportedSlide = {
  text: string;
  image?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaFit?: "cover" | "contain";
  mediaPosition?: "top" | "center" | "bottom";
  textPosition?: "top" | "center" | "bottom";
  textAlign?: "left" | "center" | "right";
  textBgEnabled?: boolean;
  textBgColor?: string;
  textBgOpacity?: number;
  introLayout?: "book-meta";
  voiceUrl?: string;
  voiceDuration?: number;
  voiceBaseUrl?: string;
  voiceBaseDuration?: number;
  activeVoiceEffects?: Partial<Record<"enhance" | "louder" | "child", boolean>>;
};

type ParrotImportPayload = {
  type: "parrot_import";
  styleSlug: string;
  preset?: ParrotStyleRecord;
  tracks?: Track[];
  musicConfig?: {
    styleSlug?: string;
    layers?: Record<
      string,
      {
        loopId: string;
        variantId: number;
        variantKey?: string;
      }
    >;
    volumes?: Record<string, number>;
    masterVolume?: number;
  };
  slides?: Array<{
    text: string;
    mediaUrl: string;
    mediaType: "gif" | "image" | "video";
    voiceUrl?: string;
    voiceDuration?: number;
    voiceBaseUrl?: string;
    voiceBaseDuration?: number;
    activeVoiceEffects?: Partial<Record<"enhance" | "louder" | "child", boolean>>;
  }>;
};

function buildTracksFromParrotImport(
  data: ParrotImportPayload,
  presets: ParrotStyleRecord[],
): Track[] {
  const importStyleSlug = data.musicConfig?.styleSlug || data.styleSlug;
  const preset = data.preset ?? presets.find((item) => item.id === importStyleSlug) ?? null;
  if (!preset || !data.musicConfig?.layers) return [];

  return Object.entries(data.musicConfig.layers).flatMap(([layerKey, layerConfig]) => {
    const loop = preset.loops.find((item) => item.id === (layerConfig.loopId || layerKey));
    if (!loop) return [];

    const variant = loop.variants[layerConfig.variantId];
    if (!variant) return [];

    const baseVolume = data.musicConfig?.volumes?.[layerKey];
    const masterVolume = data.musicConfig?.masterVolume ?? 1;

    return [{
      id: `${importStyleSlug}:${loop.id}:${variant.id}`,
      label: variant.label || loop.label,
      src: variant.src,
      volume:
        typeof baseVolume === "number"
          ? Math.max(0, Math.min(1, baseVolume * masterVolume))
          : Math.max(0, Math.min(1, masterVolume)),
    }];
  });
}

function hasMeaningfulStudioProject(project: StudioProject | null | undefined) {
  if (!project) return false;
  if (project.musicTracks.length > 0) return true;

  return project.slides.some((slide) => {
    return Boolean(
      slide.text?.trim() ||
      slide.mediaUrl ||
      slide.voiceUrl ||
      slide.audioUrl,
    );
  });
}

const COPY = {
  ru: {
    title: "Музыкальная студия попугайчиков",
    subtitle:
      "Статичная страница-редактор для мобильной версии: здесь ты собираешь стиль, записываешь голос и готовишь композицию для редактора котиков.",
    openCats: "Открыть в редакторе котиков",
    loading: "Подготавливаем студию...",
    overwrite: "В попугайской студии уже есть сохранённый проект. Заменить его новым?",
    dock: {
      title: "Редактор треков и голоса",
      subtitle:
        "Нижняя панель привязана к студийным инструментам. Основной сценарий: loops, voice, effects, save и отдельный preview перед переносом в слайд-шоу.",
      cta: "Перейти к редактированию ниже",
      tipsTitle: "Архитектура мобильной студии",
      creditTitle: "Loop credits",
      creditBody:
        "Лупы взяты с Looperman и используются как royalty free материалы. Мы благодарим авторов за возможность включить их в эту студию.",
      extraHint:
        "Preview оставлен как пятый пункт нижней панели: он помогает быстро проверить баланс перед экспортом в редактор котиков.",
      tabs: {
        loops: "Loops",
        voice: "Voice",
        effects: "Effects",
        save: "Save",
        preview: "Preview",
      },
      tabDescriptions: {
        loops: "Здесь ребёнок выбирает лупы только для активного стиля и комбинирует их между собой.",
        voice: "Здесь записывается собственное пение или голосовой комментарий.",
        effects: "Здесь включается обработка дорожек и детский голос для записи.",
        save: "Здесь живёт сохранение черновика и подготовка передачи в редактор.",
        preview: "Здесь удобно быстро прослушать композицию перед открытием в котиках.",
      },
    },
  },
  en: {
    title: "Parrot Music Studio",
    subtitle:
      "A static mobile editor page where kids combine style-based loops, record their voice, and prepare a composition for the cat editor.",
    openCats: "Open in Cat Editor",
    loading: "Preparing studio...",
    overwrite: "There is already a saved parrot studio project. Replace it with the new one?",
    dock: {
      title: "Track and voice editor",
      subtitle:
        "The bottom bar is mapped to studio tools: loops, voice, effects, save, plus a preview tab before moving into the slideshow editor.",
      cta: "Jump to the editor below",
      tipsTitle: "Mobile studio structure",
      creditTitle: "Loop credits",
      creditBody:
        "These loops come from Looperman and are used as royalty free material. We thank the authors for making them available.",
      extraHint:
        "Preview is the fifth control because it gives the fastest confidence check before export.",
      tabs: {
        loops: "Loops",
        voice: "Voice",
        effects: "Effects",
        save: "Save",
        preview: "Preview",
      },
      tabDescriptions: {
        loops: "Open only the loops that belong to the active music style.",
        voice: "Record voice or singing directly in the editor.",
        effects: "Apply child voice and other browser-friendly processing.",
        save: "Keep the draft ready for the next editor step.",
        preview: "Quick listening pass before exporting the story.",
      },
    },
  },
  he: {
    title: "אולפן המוזיקה של התוכים",
    subtitle:
      "עמוד עורך סטטי למובייל שבו בונים קומפוזיציה מלופים, מקליטים קול ומכינים אותה לעורך החתולים.",
    openCats: "לפתוח בעורך החתולים",
    loading: "מכינים את האולפן...",
    overwrite: "כבר יש פרויקט שמור באולפן התוכים. להחליף אותו בפרויקט החדש?",
    dock: {
      title: "עורך לופים וקול",
      subtitle:
        "הסרגל התחתון קשור לכלי האולפן: loops, voice, effects, save וגם preview לפני המעבר לעורך השקופיות.",
      cta: "לעבור לעורך למטה",
      tipsTitle: "מבנה האולפן במובייל",
      creditTitle: "Loop credits",
      creditBody:
        "הלופים נלקחו מ-Looperman ומשמשים כחומרי royalty free. אנחנו מודים ליוצרים שאפשרו להשתמש בהם.",
      extraHint:
        "Preview נשמר כלשונית חמישית כדי לבדוק מהר את האיזון לפני הייצוא.",
      tabs: {
        loops: "Loops",
        voice: "Voice",
        effects: "Effects",
        save: "Save",
        preview: "Preview",
      },
      tabDescriptions: {
        loops: "כאן נפתחים רק הלופים של הסגנון הפעיל.",
        voice: "כאן מקליטים קול או שירה מהטלפון.",
        effects: "כאן מפעילים קול ילדי ועיבוד ידידותי לדפדפן.",
        save: "כאן שומרים את הטיוטה לקראת מעבר לעורך הבא.",
        preview: "כאן בודקים מהר את התוצאה לפני הייצוא.",
      },
    },
  },
} as const;

export function ParrotsStudioPageContent() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const isMobile = useIsMobile();
  const [hasMounted, setHasMounted] = useState(false);
  const copy = COPY[lang] ?? COPY.ru;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/parrots/studio";
  const fallbackPresets = useMemo(() => getHardcodedParrotStyleRecords(lang), [lang]);
  const [styleRecords, setStyleRecords] = useState<ParrotStyleRecord[]>(fallbackPresets);
  const [initialSlides, setInitialSlides] = useState<ImportedSlide[] | undefined>(undefined);
  const [initialTracks, setInitialTracks] = useState<Track[] | undefined>(undefined);
  const [isImportReady, setIsImportReady] = useState(false);
  const [styleSlug, setStyleSlug] = useState(fallbackPresets[0]?.id ?? "lofi");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setStyleRecords(fallbackPresets);
  }, [fallbackPresets]);

  useEffect(() => {
    let cancelled = false;

    const loadStyles = async () => {
      try {
        const loaded = await fetchParrotMusicStyles(lang);
        if (!cancelled && loaded.length > 0) {
          setStyleRecords(loaded);
        }
      } catch (error) {
        console.warn("[parrots/studio] failed to load DB music styles; using fallback", error);
      }
    };

    void loadStyles();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (styleRecords.length === 0) {
      return;
    }

    if (!styleRecords.some((item) => item.id === styleSlug)) {
      setStyleSlug(styleRecords[0].id);
    }
  }, [styleRecords, styleSlug]);

  useEffect(() => {
    if (!isMobile) return;

    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100dvh";

    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.height = previousBodyHeight;
    };
  }, [isMobile]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapImport = async () => {
      try {
        const styleFromQuery = typeof router.query.style === "string" ? router.query.style : null;
        const stored = sessionStorage.getItem("parrot_import");
        if (!stored) {
          if (styleFromQuery && styleRecords.some((preset) => preset.id === styleFromQuery)) {
            setStyleSlug(styleFromQuery);
          }
          return;
        }

        const parsed = JSON.parse(stored) as ParrotImportPayload;
        if (parsed?.type !== "parrot_import") {
          if (styleFromQuery && styleRecords.some((preset) => preset.id === styleFromQuery)) {
            setStyleSlug(styleFromQuery);
          }
          return;
        }

        const mappedSlides = Array.isArray(parsed.slides)
          ? parsed.slides.map((slide) => ({
              text: slide.text,
              image: slide.mediaUrl,
              mediaType: slide.mediaType === "gif" ? "image" : slide.mediaType,
              mediaFit: "contain" as const,
              mediaPosition: "center" as const,
              textPosition: "bottom" as const,
              textAlign: "center" as const,
              voiceUrl: slide.voiceUrl,
              voiceDuration: slide.voiceDuration,
              voiceBaseUrl: slide.voiceBaseUrl,
              voiceBaseDuration: slide.voiceBaseDuration,
              activeVoiceEffects: slide.activeVoiceEffects,
            }))
          : [];

        const savedProject = await loadProject(PROJECT_ID);
        const shouldOverwrite =
          !hasMeaningfulStudioProject(savedProject) ||
          window.confirm(copy.overwrite);

        if (!shouldOverwrite || cancelled) return;

        setInitialSlides(mappedSlides);
        setInitialTracks(parsed.tracks ?? buildTracksFromParrotImport(parsed, styleRecords));
        setStyleSlug(
          styleFromQuery ||
          parsed.musicConfig?.styleSlug ||
          parsed.styleSlug ||
          styleRecords[0]?.id ||
          "lofi",
        );
        sessionStorage.removeItem("parrot_import");
      } catch {
        console.error("Failed to bootstrap parrot studio import");
      } finally {
        if (!cancelled) {
          setIsImportReady(true);
        }
      }
    };

    void bootstrapImport();

    return () => {
      cancelled = true;
    };
  }, [copy.overwrite, router.query.style, styleRecords]);

  const activePreset = useMemo(
    () => styleRecords.find((preset) => preset.id === styleSlug) ?? styleRecords[0] ?? null,
    [styleRecords, styleSlug],
  );

  const openCatsStudio = async () => {
    const project = await loadProject(PROJECT_ID);
    if (!project) return;

    const payload: ParrotImportPayload = {
      type: "parrot_import",
      styleSlug,
      preset: activePreset ?? undefined,
      tracks: project.musicTracks,
      slides: project.slides
        .filter((slide: StudioSlide) => slide.mediaUrl)
        .map((slide: StudioSlide) => ({
          text: slide.text,
          mediaUrl: slide.mediaUrl ?? "",
          mediaType: slide.mediaType === "video" ? "video" : "image",
          voiceUrl: slide.voiceUrl,
          voiceDuration: slide.voiceDuration,
          voiceBaseUrl: slide.voiceBaseUrl,
          voiceBaseDuration: slide.voiceBaseDuration,
          activeVoiceEffects: slide.activeVoiceEffects,
        })),
    };

    sessionStorage.setItem("parrot_import", JSON.stringify(payload));
    await router.push(
      buildStudioRoute("cats", lang),
      undefined,
      { locale: lang },
    );
  };

  const openCatsStudioFromMobile = async (composition: {
    activeLoops: string[];
    voice: {
      audioUrl: string | null;
    };
    effects: {
      activeCategory: "voice" | "loops";
      voice: {
        child: boolean;
        echo: boolean;
        reverb: boolean;
        robot: boolean;
        whisper: boolean;
        mega: boolean;
        radio: boolean;
      };
      loops: {
        speed: boolean;
        targetLoopId: string | null;
        byLoop: Record<
          string,
          {
            echo: boolean;
            reverb: boolean;
            boost: boolean;
            soft: boolean;
          }
        >;
      };
    };
    loopsVolume: number;
    voiceVolume: number;
  }) => {
    const preset = activePreset;
    if (!preset) {
      return;
    }
    const tracks: Track[] = composition.activeLoops.flatMap((loopId) => {
      const loop = preset.loops.find((item) => item.id === loopId);
      const variant = loop?.variants[loop?.defaultIndex ?? 0] ?? loop?.variants[0];
      if (!loop || !variant) return [];

      return [{
        id: `${styleSlug}:${loop.id}:${variant.id}`,
        label: variant.label || loop.label,
        src: variant.src,
        volume: composition.loopsVolume,
      }];
    });

    const slides = (initialSlides ?? []).map((slide, index) => ({
      text: slide.text,
      mediaUrl: slide.image ?? slide.mediaUrl ?? "",
      mediaType: (slide.mediaType === "video" ? "video" : "image") as "image" | "video",
      voiceUrl: index === 0 ? composition.voice.audioUrl ?? undefined : slide.voiceUrl,
      voiceDuration: slide.voiceDuration,
      voiceBaseUrl: slide.voiceBaseUrl,
      voiceBaseDuration: slide.voiceBaseDuration,
      activeVoiceEffects: index === 0 && composition.effects.voice.child
        ? {
            ...(slide.activeVoiceEffects ?? {}),
            child: true,
          }
        : slide.activeVoiceEffects,
    })).filter((slide) => slide.mediaUrl);

    sessionStorage.setItem("parrot_import", JSON.stringify({
      type: "parrot_import",
      styleSlug,
      preset,
      tracks,
      slides,
      mobileComposition: {
        effects: composition.effects,
        loopsVolume: composition.loopsVolume,
        voiceVolume: composition.voiceVolume,
      },
    }));

    await router.push(
      buildStudioRoute("cats", lang),
      undefined,
      { locale: lang },
    );
  };

  const handleCloseMobileStudio = () => {
    void router.push(
      { pathname: "/parrots", query: buildLocalizedQuery(lang) },
      undefined,
      { locale: lang },
    );
  };

  const handleSwitchMobileLanguage = (nextLang: "ru" | "en" | "he") => {
    void router.push(
      buildStudioRoute("parrot", nextLang, {
        style: styleSlug,
      }),
      undefined,
      { locale: nextLang },
    );
  };

  if (!hasMounted) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <SEO
          title={`${copy.title} — capybara_tales`}
          description={copy.subtitle}
          path={seoPath}
        />
        <MobilePortraitLock lang={lang} enabled={isMobile} />
        <style jsx global>{`
          .top-bar,
          .footer-stack,
          .unified-footer {
            display: none !important;
          }

          .app-layout {
            padding-top: 0 !important;
          }
        `}</style>
        {isImportReady ? (
          <ParrotStudioRoot
            lang={lang}
            initialStyleSlug={styleSlug}
            presets={styleRecords}
            expectedStudioType={router.pathname === "/studio" ? "parrot" : undefined}
            storySlides={(initialSlides ?? []).map((slide) => ({
              text: slide.text,
              mediaUrl: slide.image ?? slide.mediaUrl,
              mediaType: slide.mediaType === "video" ? "video" : "image",
            }))}
            onClose={handleCloseMobileStudio}
            onSwitchLanguage={handleSwitchMobileLanguage}
            onOpenStory={openCatsStudioFromMobile}
          />
        ) : (
          <main
            className="parrot-studio-page"
            style={{
              minHeight: "100dvh",
              display: "grid",
              placeItems: "center",
              background:
                "radial-gradient(circle at top left, rgba(255, 227, 176, 0.72), transparent 26%), linear-gradient(180deg, #fff8ef 0%, #fffdf9 100%)",
            }}
          >
            <div
              className="parrot-studio-page__loading"
              style={{
                padding: "1rem 1.2rem",
                borderRadius: "24px",
                background: "rgba(255, 255, 255, 0.86)",
                color: "#4b331b",
              }}
            >
              {copy.loading}
            </div>
          </main>
        )}
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${copy.title} — capybara_tales`}
        description={copy.subtitle}
        path={seoPath}
      />
      <MobilePortraitLock lang={lang} enabled={isMobile} />
      <main className={`parrot-studio-page ${lang === "he" ? "is-rtl" : ""}`}>
        <section className="parrot-studio-page__hero">
          <div className="parrot-studio-page__hero-copy">
            <span className="parrot-studio-page__eyebrow">{activePreset?.title ?? styleSlug}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
            <button type="button" onClick={() => void openCatsStudio()}>
              {copy.openCats}
            </button>
          </div>
        </section>

        <section id="parrot-studio-root" className="parrot-studio-page__editor">
          {isImportReady ? (
            <StudioRoot
              lang={lang}
              projectId={PROJECT_ID}
              initialSlides={initialSlides}
              initialTracks={initialTracks}
            />
          ) : (
            <div className="parrot-studio-page__loading">{copy.loading}</div>
          )}
        </section>
      </main>

      <style jsx>{`
        .parrot-studio-page {
          min-height: 100vh;
          padding: 0 0 4rem;
          background:
            radial-gradient(circle at top left, rgba(255, 227, 176, 0.72), transparent 26%),
            linear-gradient(180deg, #fff8ef 0%, #fffdf9 100%);
        }

        .parrot-studio-page.is-rtl {
          direction: rtl;
        }

        .parrot-studio-page__hero {
          padding: 1rem 0.75rem 0.5rem;
        }

        .parrot-studio-page__hero-copy {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.15rem 1rem;
          border-radius: 30px;
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 18px 36px rgba(117, 76, 22, 0.12);
        }

        .parrot-studio-page__eyebrow {
          display: inline-block;
          margin-bottom: 0.55rem;
          color: #b26a16;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .parrot-studio-page__hero-copy :global(h1) {
          margin: 0;
          font-size: clamp(2.4rem, 7vw, 4rem);
          line-height: 0.92;
          font-family: var(--font-amatic-sc), cursive;
          color: #2f2419;
        }

        .parrot-studio-page__hero-copy :global(p) {
          margin: 0.7rem 0 0;
          max-width: 48rem;
          font-size: 1rem;
          line-height: 1.55;
          color: rgba(47, 36, 25, 0.8);
        }

        .parrot-studio-page__hero-copy :global(button) {
          margin-top: 0.95rem;
          min-height: 50px;
          padding: 0.8rem 1rem;
          border: none;
          border-radius: 18px;
          background: #ff934f;
          color: #fff;
          font-family: var(--font-amatic-sc), cursive;
          font-size: 1.55rem;
        }

        .parrot-studio-page__dock {
          padding: 0 0.75rem;
        }

        .parrot-studio-page__editor {
          padding: 1rem 0.75rem 0;
        }

        .parrot-studio-page__loading {
          max-width: 720px;
          margin: 0 auto;
          padding: 1rem;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.84);
          color: #4b331b;
        }
      `}</style>
    </>
  );
}

export default function LegacyParrotsStudioPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);

  useEffect(() => {
    if (!router.isReady) return;

    void router.replace(
      buildStudioRoute("parrot", lang, {
        style: typeof router.query.style === "string" ? router.query.style : undefined,
        slides: typeof router.query.slides === "string" ? router.query.slides : undefined,
      }),
      undefined,
      { locale: lang },
    );
  }, [lang, router]);

  return null;
}
