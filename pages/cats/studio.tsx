import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import CatsLayout from "@/components/Cats/CatsLayout";
import { Lang, dictionaries } from "@/i18n";
import { useEffect, useState } from "react";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import type { Track } from "@/components/studio/MusicPanel";
import { PARROT_PRESETS } from "@/utils/parrot-presets";

type ImportedSlide = {
  text: string;
  image?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "gif";
  mediaFit?: "cover" | "contain";
  mediaPosition?: "top" | "center" | "bottom";
  textPosition?: "top" | "center" | "bottom";
  textAlign?: "left" | "center" | "right";
  textBgEnabled?: boolean;
  textBgOpacity?: number;
};

type ParrotImportPayload = {
  type: "parrot_import";
  styleSlug: string;
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

export default function CatsStudioPage({ lang }: { lang: Lang }) {
    const t = dictionaries[lang].cats;
  const router = useRouter();
  const currentLang = getCurrentLang(router);

  const [initialSlides, setInitialSlides] = useState<
    ImportedSlide[] | undefined
  >(undefined);
  const [initialTracks, setInitialTracks] = useState<Track[] | undefined>(undefined);

  useEffect(() => {
    try {
      const parrotStored = sessionStorage.getItem("parrot_import");
      if (parrotStored) {
        const parsed = JSON.parse(parrotStored) as ParrotImportPayload;

        if (parsed?.type === "parrot_import") {
          const mappedSlides: ImportedSlide[] = Array.isArray(parsed.slides)
            ? parsed.slides.map((slide) => ({
                text: slide.text,
                image: slide.mediaUrl,
                mediaType: slide.mediaType === "gif" ? "image" : slide.mediaType,
                mediaFit: "contain",
                mediaPosition: "center",
                textPosition: "bottom",
                textAlign: "center",
              }))
            : [];

          setInitialSlides(mappedSlides);
          setInitialTracks(buildTracksFromParrotImport(parsed));
          sessionStorage.removeItem("parrot_import");
          return;
        }
      }

      const stored = sessionStorage.getItem("catsSlides");
      if (!stored) return;

      const parsed = JSON.parse(stored) as ImportedSlide[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setInitialSlides(parsed);
      }

      // Optional: clear after consumption to avoid stale data
      sessionStorage.removeItem("catsSlides");
    } catch {
      console.error("Failed to parse slides from sessionStorage");
    }
  }, []);

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
    <CatsLayout active="studio" lang={lang}>
      <div style={{ marginBottom: 24 }}>
        
      </div>
      <StudioRoot 
      lang={lang}
      initialSlides={initialSlides}
      initialTracks={initialTracks} />

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
        src="https://wazoncnmsxbjzvbjenpw.supabase.co/storage/v1/object/public/characters/cats/cap-paw.webm"
        autoPlay
        loop
        muted
        playsInline
      />
    </CatsLayout>
  );
}
