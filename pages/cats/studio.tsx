import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import CatsLayout from "@/components/Cats/CatsLayout";
import SEO from "@/components/SEO";
import { Lang, dictionaries } from "@/i18n";
import { useEffect, useState } from "react";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { buildStudioRoute } from "@/lib/studioRouting";
import type { Track } from "@/components/studio/MusicPanel";
import { PARROT_PRESETS } from "@/utils/parrot-presets";
import { loadProject } from "@/lib/studioStorage";
import { buildSupabaseStorageUrl } from "@/lib/publicAssetUrls";
import type { StudioProject } from "@/types/studio";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobilePortraitLock from "@/components/mobile/MobilePortraitLock";

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

function buildTracksFromParrotImport(data: ParrotImportPayload): Track[] {
  const styleSlug = data.musicConfig?.styleSlug || data.styleSlug;
  const preset = PARROT_PRESETS.find((item) => item.id === styleSlug);
  if (!preset || !data.musicConfig?.layers) return [];

  return Object.entries(data.musicConfig.layers).flatMap(([layerKey, layerConfig]) => {
    const loop = preset.loops.find((item) => item.id === (layerConfig.loopId || layerKey));
    if (!loop) return [];

    const variant = loop.variants[layerConfig.variantId];
    if (!variant) return [];

    const baseVolume = data.musicConfig?.volumes?.[layerKey];
    const masterVolume = data.musicConfig?.masterVolume ?? 1;

    return [{
      id: `${styleSlug}:${loop.id}:${variant.id}`,
      label: variant.label || loop.label,
      src: variant.src,
      volume:
        typeof baseVolume === "number"
          ? Math.max(0, Math.min(1, baseVolume * masterVolume))
          : Math.max(0, Math.min(1, masterVolume)),
    }];
  });
}

// Dynamically load StudioRoot (important later when ffmpeg is added)
const StudioRoot = dynamic(
  () => import("@/components/studio/StudioRoot"),
  { ssr: false }
);

const PROJECT_ID = "current-studio-project";

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

function getOverwriteMessage(lang: Lang) {
  if (lang === "he") {
    return "יש כבר מצגת שנשמרה בסטודיו. להחליף אותה במצגת החדשה?";
  }

  if (lang === "en") {
    return "There is already an editable slideshow saved in Studio. Do you want to replace it with the new one?";
  }

  return "В студии уже есть сохранённое редактируемое слайдшоу. Заменить его новым?";
}

export function CatsStudioPageContent({ lang: providedLang }: { lang?: Lang }) {
  const router = useRouter();
  const currentLang = getCurrentLang(router);
  const lang = providedLang ?? currentLang;
  const isMobile = useIsMobile();
  const t = dictionaries[lang].cats;
  const seo = dictionaries[lang].seo.cats.studio;
  const seoPath = router.asPath.split("#")[0]?.split("?")[0] || "/cats/studio";
  const isUnifiedMobileStudioRoute = router.pathname === "/studio" && isMobile;

  const [initialSlides, setInitialSlides] = useState<
    ImportedSlide[] | undefined
  >(undefined);
  const [initialTracks, setInitialTracks] = useState<Track[] | undefined>(undefined);
  const [isImportReady, setIsImportReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrapImport = async () => {
      try {
        const parrotStored = sessionStorage.getItem("parrot_import");
        const catsStored = sessionStorage.getItem("catsSlides");

        let nextSlides: ImportedSlide[] | undefined;
        let nextTracks: Track[] | undefined;
        let shouldConsumeParrot = false;
        let shouldConsumeCats = false;

        if (parrotStored) {
          const parsed = JSON.parse(parrotStored) as ParrotImportPayload;

          if (parsed?.type === "parrot_import") {
            nextSlides = Array.isArray(parsed.slides)
                ? parsed.slides.map((slide) => ({
                  text: slide.text,
                  image: slide.mediaUrl,
                  mediaType: slide.mediaType === "gif" ? "image" : slide.mediaType,
                  mediaFit: "contain",
                  mediaPosition: "center",
                  textPosition: "bottom",
                  textAlign: "center",
                  voiceUrl: slide.voiceUrl,
                  voiceDuration: slide.voiceDuration,
                  voiceBaseUrl: slide.voiceBaseUrl,
                  voiceBaseDuration: slide.voiceBaseDuration,
                  activeVoiceEffects: slide.activeVoiceEffects,
                }))
              : [];
            nextTracks = parsed.tracks ?? buildTracksFromParrotImport(parsed);
            shouldConsumeParrot = true;
          }
        }

        if (!nextSlides && catsStored) {
          const parsed = JSON.parse(catsStored) as ImportedSlide[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            nextSlides = parsed;
            nextTracks = undefined;
            shouldConsumeCats = true;
          }
        }

        if (nextSlides && nextSlides.length > 0) {
          const savedProject = await loadProject(PROJECT_ID);
          const shouldOverwrite =
            !hasMeaningfulStudioProject(savedProject) ||
            window.confirm(getOverwriteMessage(lang));

          if (shouldOverwrite && !cancelled) {
            setInitialSlides(nextSlides);
            setInitialTracks(nextTracks);
          }
        }

        if (shouldConsumeParrot) {
          sessionStorage.removeItem("parrot_import");
        }

        if (shouldConsumeCats) {
          sessionStorage.removeItem("catsSlides");
        }
      } catch {
        console.error("Failed to parse slides from sessionStorage");
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
  }, [lang]);

  useEffect(() => {
    if (!router.isReady) return;

    const { data } = router.query;
    if (!data || typeof data !== "string") return;

    try {
      const decoded = JSON.parse(decodeURIComponent(data));
      setInitialSlides(decoded);
    } catch {
      console.error("Failed to parse slides from query");
    }
  }, [router.isReady, router.query]);

  return (
    <>
      <SEO title={seo.title} description={seo.description} path={seoPath} />
      <MobilePortraitLock lang={lang} enabled={isMobile} />
      {isUnifiedMobileStudioRoute ? (
        isImportReady ? (
          <StudioRoot
            lang={lang}
            expectedStudioType="cats"
            initialSlides={initialSlides}
            initialTracks={initialTracks}
          />
        ) : null
      ) : (
        <CatsLayout active="studio" lang={lang}>
          <div style={{ marginBottom: 24 }}>
            
          </div>
          {isImportReady ? (
            <StudioRoot
              lang={lang}
              expectedStudioType={router.pathname === "/studio" ? "cats" : undefined}
              initialSlides={initialSlides}
              initialTracks={initialTracks}
            />
          ) : null}

          <button
              className="back-to-cats-button"
              onClick={() =>
                router.push(
                  { pathname: "/cats", query: buildLocalizedQuery(currentLang) },
                  undefined,
                  { locale: currentLang },
                )
              }
            >
              ← {t.backButton}
            </button>
          <video
            className="cat-paw-video"
            src={buildSupabaseStorageUrl("characters/cats/cap-paw.webm")}
            autoPlay
            loop
            muted
            playsInline
          />
        </CatsLayout>
      )}
    </>
  );
}

export default function LegacyCatsStudioPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);

  useEffect(() => {
    if (!router.isReady) return;

    void router.replace(
      buildStudioRoute("cats", lang, {
        data: typeof router.query.data === "string" ? router.query.data : undefined,
      }),
      undefined,
      { locale: lang },
    );
  }, [lang, router]);

  return null;
}
