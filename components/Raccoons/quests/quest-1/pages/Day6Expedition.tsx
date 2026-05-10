"use client";

import Image from "next/image";
import type { PageId } from "../QuestEngine";
import { useQuest1I18n } from "../i18n";
import QuestTextBlocks from "../QuestTextBlocks";

export default function Day6Expedition({ go }: { go: (id: PageId) => void }) {
  const { t } = useQuest1I18n();
  return (
    <div className="quest-page-bg">
      <div className="polar-scenery" aria-hidden />

      {/* Заголовок */}
      <div className="quest-title-wrapper">
        <Image
          src="/quests/assets/banners/ribbon.webp"
          alt=""
          className="quest-title-banner"
          width={650}
          height={160}
          unoptimized
        />
        <h1 className="quest-title-text">{t.day6.title}</h1>
      </div>

      {/* ВИДЕО */}
      <div className="quest-video-wrapper ice-window">
        <div className="ice-window">
          <video className="quest-video" autoPlay muted loop playsInline>
            <source
              src="/supabase-storage/quests/1_quest/images/expedition.webm"
              type="video/webm"
            />
          </video>
        </div>
      </div>

      {/* Текстовые плитки */}
      <QuestTextBlocks blocks={t.day6.blocks} style={{ marginTop: "24px" }} />

      {/* Кнопка дальше */}
      <footer className="quest-footer">
        <div
          className="quest-center ice-button-wrapper"
          style={{ marginTop: "60px" }}
        >
          <div
            className="ice-button"
            onClick={() => go("day7_treasure_of_times")}
          >
            <Image
              className="ice"
              src="/quests/assets/buttons/ice-button-bg.svg"
              alt=""
              width={720}
              height={180}
              unoptimized
            />
            <div className="ice-text">{t.day6.nextButton}</div>
            <Image
              className="penguin"
              src="/supabase-storage/characters/other/penguin.gif"
              alt=""
              width={92}
              height={92}
              unoptimized
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
