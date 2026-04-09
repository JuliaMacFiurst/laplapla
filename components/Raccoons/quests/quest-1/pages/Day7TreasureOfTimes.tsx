"use client";

import { useRouter } from "next/router";
import { buildLocalizedQuery, getCurrentLang } from "@/lib/i18n/routing";
import { buildSupabaseStorageUrl } from "@/lib/publicAssetUrls";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";

export default function Day7TreasureOfTimes() {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const { t } = useQuest1I18n();

  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      {/* Заголовок */}
      <div className="quest-title-wrapper">
        <img
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
        />
        <h1 className="quest-title-text">{t.day7.title}</h1>
      </div>

      {/* ВИДЕО */}
      <div className="ice-window">
        <div className="youtube-wrapper">
          <iframe
            className="quest-video"
            src="https://www.youtube.com/embed/sE2jxOVG8kU"
            title={t.day7.videoTitle}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
      {lang !== "ru" && t.day7.videoTranslationNotice && (
        <p className="quest-map-translation-note">{t.day7.videoTranslationNotice}</p>
      )}

      {/* Текстовые плитки */}
      <QuestTextBlocks blocks={t.day7.blocks} style={{ marginTop: "24px" }} />

        <footer className="quest-footer">
        <div
          className="quest-center ice-button-wrapper"
          style={{ marginTop: "60px" }}
        >
          <div
            className="ice-button"
            onClick={() => {
              router.push(
                { pathname: "/raccoons", query: buildLocalizedQuery(lang) },
                undefined,
                { locale: lang },
              );
            }}
          >
            {/* льдина */}
            <img
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt=""
            />

            {/* текст */}
            <div className="ice-text">{t.day7.backButton}</div>

            {/* пингвин */}
            <img
              className="penguin"
              src={buildSupabaseStorageUrl("characters/other/penguin.gif")}
              alt=""
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
