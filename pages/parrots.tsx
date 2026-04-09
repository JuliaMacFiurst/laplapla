import {useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import ParrotMixer, { type MusicConfig } from "../components/ParrotMixer";
import ParrotStoryCard, { type Slide as ParrotSlide } from "../components/ParrotStoryCard";
import { PARROT_PRESETS } from "../utils/parrot-presets";
import { dictionaries } from "../i18n";
import { getMusicStyle } from "../content/parrots/musicStyles";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { useIsMobile } from "@/hooks/useIsMobile";

type ExportSlide = {
  text: string;
  mediaUrl: string;
  mediaType: "gif" | "image" | "video";
};

type ParrotImportPayload = {
  type: "parrot_import";
  musicConfig: MusicConfig;
  slides: ExportSlide[];
  styleSlug: string;
};

const imageForPreset = (id: string) => {
  const k = (id || "").toLowerCase();
  if (k.includes("lo") && k.includes("fi")) return "/icons/music-styles-icons/lo-fi.webp";
  if (k.includes("bosa") || k.includes("bossa")) return "/icons/music-styles-icons/bosa-nova.webp";
  if (k.includes("synthwave") || k.includes("synth")) return "/icons/music-styles-icons/synthwave.webp";
  if (k.includes("funk") || k.includes("disco")) return "/icons/music-styles-icons/funk.webp";
  if (k.includes("house")) return "/icons/music-styles-icons/house.webp";
  if (k.includes("reggae") || k.includes("dub")) return "/icons/music-styles-icons/reggae.webp";
  if (k.includes("rock")) return "/icons/music-styles-icons/rock.webp";
  if (k.includes("classic")) return "/icons/music-styles-icons/classic.webp";
  if (k.includes("dance")) return "/icons/music-styles-icons/dance.webp";
  if (k.includes("classical")) return "/icons/music-styles-icons/classical.webp";
  if (k.includes("jazzhop")) return "/icons/music-styles-icons/jazzhop.webp";
  if (k.includes("jazz")) return "/icons/music-styles-icons/jazz.webp";
  if (k.includes("metal")) return "/icons/music-styles-icons/metal.webp";
  if (k.includes("ambient")) return "/icons/music-styles-icons/ambient.webp";
  if (k.includes("chill")) return "/icons/music-styles-icons/chill.webp";
  if (k.includes("electronic")) return "/icons/music-styles-icons/electronic.webp";
  if (k.includes("indie")) return "/icons/music-styles-icons/indie.webp";
  if (k.includes("experimental")) return "/icons/music-styles-icons/experimental.webp";
  if (k.includes("country")) return "/icons/music-styles-icons/country.webp";
  if (k.includes("spiritual")) return "/icons/music-styles-icons/spiritual.webp";
  if (k.includes("chiptune")) return "/icons/music-styles-icons/chiptune.webp";
  if (k.includes("kpop")) return "/icons/music-styles-icons/kpop.webp";
  if (k.includes("afroperc")) return "/icons/music-styles-icons/afroperc.webp";
  if (k.includes("celtic")) return "/icons/music-styles-icons/celtic.webp";
  if (k.includes("latin")) return "/icons/music-styles-icons/latin.webp";
  if (k.includes("cartoon")) return "/icons/music-styles-icons/cartoon.webp";

  return "/icons/music-styles-icons/lo-fi.webp"; // fallback
};

export default function ParrotsPage() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const dict = dictionaries[lang] || dictionaries.ru;
  const t = dict.parrots;
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState(PARROT_PRESETS[0].id);
  const preset = useMemo(() => PARROT_PRESETS.find(p => p.id === activeId)!, [activeId]);
  const activeStyle = useMemo(
    () => getMusicStyle(lang, activeId),
    [activeId, lang],
  );
  const localizedPresets = useMemo(
    () =>
      PARROT_PRESETS.map((presetItem) => ({
        ...presetItem,
        localizedTitle: getMusicStyle(lang, presetItem.id)?.title || presetItem.title,
      })),
    [lang],
  );
  const storySlides = activeStyle?.slides ?? [{ text: t.story.fallbackSilent }];
  const [musicConfig, setMusicConfig] = useState<MusicConfig>({
    styleSlug: activeId,
    layers: {},
    volumes: {},
    masterVolume: 0.9,
  });
  const [resolvedSlides, setResolvedSlides] = useState<ParrotSlide[]>(storySlides);

  useEffect(() => {
    setMusicConfig({
      styleSlug: activeId,
      layers: {},
      volumes: {},
      masterVolume: 0.9,
    });
  }, [activeId]);

  useEffect(() => {
    setResolvedSlides(storySlides);
  }, [storySlides]);

  const getCurrentMusicConfig = useCallback((): MusicConfig => {
    return {
      ...musicConfig,
      styleSlug: activeId,
    };
  }, [activeId, musicConfig]);

  const getCurrentSlides = useCallback((): ExportSlide[] => {
    return resolvedSlides
      .filter((slide): slide is Required<Pick<ParrotSlide, "text" | "mediaUrl" | "mediaType">> & ParrotSlide =>
        Boolean(slide.mediaUrl && slide.mediaType),
      )
      .map((slide) => ({
        text: slide.text,
        mediaUrl: slide.mediaUrl,
        mediaType: slide.mediaType,
      }));
  }, [resolvedSlides]);

  const buildParrotExport = useCallback((): ParrotImportPayload => {
    return {
      type: "parrot_import",
      musicConfig: getCurrentMusicConfig(),
      slides: getCurrentSlides(),
      styleSlug: activeId,
    };
  }, [activeId, getCurrentMusicConfig, getCurrentSlides]);

  useEffect(() => {
    const exportPayload = buildParrotExport();
    sessionStorage.setItem("parrot_import", JSON.stringify(exportPayload));
  }, [buildParrotExport]);

  const handleOpenStudio = useCallback(() => {
    const exportPayload = buildParrotExport();
    sessionStorage.setItem("parrot_import", JSON.stringify(exportPayload));
    router.push(
      { pathname: "/cats/studio", query: buildLocalizedQuery(lang) },
      undefined,
      { locale: lang },
    );
  }, [buildParrotExport, lang, router]);

  return (
    <>
      <Head><title>{t.page.headTitle}</title></Head>
      <main className={`home-wrapper parrots-page force-ltr-layout ${lang === "he" ? "parrots-page-he" : ""}`}>
        <div className="parrots-mobile-hero">
          <h1 className="title page-title">{t.page.title}</h1>
          <p className="subtitle">{t.page.subtitle}</p>

          <div className="style-presets-row" style={{ marginBottom: "1rem", justifyContent: "center", gap: 12, maxWidth: "100%" }}>
            {localizedPresets.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={`style-preset-btn ${p.id === activeId ? 'is-active' : ''}`}
                style={{ backgroundImage: `url(${imageForPreset(p.id)})` }}
                aria-pressed={p.id === activeId}
                title={p.localizedTitle}
              >
                <span className="style-preset-label">{p.localizedTitle}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid parrots-main-grid"
          style={{
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: isMobile ? 24 : 50,
            justifyItems: "stretch",
            alignItems: "start",
            maxWidth: "1024px",
            margin: "0 auto"
          }}
        >
          <div className="parrots-section parrots-mixer-section" style={{ width: "100%" }}>
            <ParrotMixer
              styleSlug={activeId}
              loops={preset.loops}
              lang={lang}
              onConfigChange={setMusicConfig}
              ui={t.mixer}
            />
          </div>
          <div className="parrots-section parrots-story-section" style={{ width: "100%" }}>
            <ParrotStoryCard
              lang={lang}
              styleSlug={activeId}
              title={activeStyle?.title ?? preset.title}
              description={activeStyle?.description ?? preset.description}
              searchArtist={preset.searchArtist}
              searchGenre={preset.searchGenre}
              slides={storySlides}
              onResolvedSlidesChange={setResolvedSlides}
              onOpenStudio={handleOpenStudio}
              ui={t.story}
            />
          </div>
        </div>
        <style jsx global>{`
          /* Preset buttons row */
          .style-presets-row { display: flex; flex-wrap: wrap; justify-content: center; }

          .parrots-mobile-hero {
            width: 100%;
            max-width: 100%;
          }

          .parrots-main-grid,
          .parrots-section {
            width: 100%;
          }

          /* Square full-cover preset buttons (page-scoped, no .card) */
          .style-preset-btn {
            width: 140px;
            height: 140px;
            aspect-ratio: 1 / 1;
            box-sizing: border-box;
            border-radius: 18px;
            border: 1px solid rgba(0,0,0,0.12);
            background: #fff center/cover no-repeat;
            box-shadow: 0 4px 12px rgba(0,0,0,0.10);
            display: inline-flex;
            align-items: flex-end;
            justify-content: center;
            padding: 10px;
            margin: 6px;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
            font-family: 'Amatic SC', cursive;
          }
          .style-preset-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.12); }
          .style-preset-btn.is-active {
            border: 3px solid #b388ff; /* kawaii lavender */
            box-shadow: 0 0 0 6px rgba(179,136,255,0.18), 0 10px 24px rgba(179,136,255,0.25);
          }

          /* Readable label overlay */
          .style-preset-label {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #111;
            background: rgba(255,255,255,0.45);
            border-radius: 12px;
            padding: 4px 10px;
            backdrop-filter: blur(4px);
          }

          .parrots-page.force-ltr-layout,
          .parrots-page.force-ltr-layout .grid,
          .parrots-page.force-ltr-layout .style-presets-row,
          .parrots-page.force-ltr-layout .style-preset-btn {
            direction: ltr;
          }

          .parrots-page-he .page-title,
          .parrots-page-he .subtitle,
          .parrots-page-he .style-preset-label {
            direction: rtl;
          }

          .parrots-page-he .page-title,
          .parrots-page-he .subtitle {
            text-align: right;
          }

          .parrots-page-he .style-preset-label {
            text-align: center;
          }

          @media (max-width: 640px) {
            .parrots-page {
              padding-left: 0;
              padding-right: 0;
              width: 100%;
              max-width: 100%;
              overflow-x: clip;
            }

            .parrots-mobile-hero {
              width: 100%;
              max-width: 100%;
              padding: 0 0.75rem;
              box-sizing: border-box;
            }

            .style-presets-row {
              width: 100%;
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 0.75rem;
              padding: 0;
              margin-left: 0;
              margin-right: 0;
              box-sizing: border-box;
            }

            .style-preset-btn {
              width: 100%;
              height: auto;
              min-height: 124px;
              border-radius: 16px;
              margin: 0;
            }

            .style-preset-label {
              font-size: 16px;
              padding: 4px 8px;
            }

            .parrots-main-grid {
              width: 100%;
              max-width: none !important;
              padding: 0;
              box-sizing: border-box;
              gap: 1rem !important;
              justify-items: center !important;
            }

            .parrots-mixer-section,
            .parrots-story-section {
              width: 100%;
              max-width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 0;
              margin: 0;
              box-sizing: border-box;
            }
          }
        `}</style>
      </main>
    </>
  );
}
